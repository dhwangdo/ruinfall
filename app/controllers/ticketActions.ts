import { transformedCard } from "../game/cardTransforms.ts";
import type { Card } from "../game/cards.ts";
import { CONSUMABLE_TYPES, type Consumable, type ConsumableType, type DeckCase } from "../game/rewards.ts";
import { countRareSlotCards } from "../game/deckEditorRules.ts";
import { occupiedDeckSpace } from "../game/stickers.ts";
import {
  consumeTicketById as consumeTicketFromAreas,
  findTicketById as findTicketInAreas,
  setBombTicketArmed,
} from "../game/ticketRules.ts";
import { shouldPreserveTicket } from "../game/blessingRules.ts";
import { RUN_SAVE_POLICY } from "../game/saveGame.ts";
import { mapRoomKey } from "../game/mapRules.ts";
import type { RunInventory } from "../hooks/useRunInventory";
import type { RunWorld } from "../hooks/useRunWorld";
import type { RunPlayer } from "../hooks/useRunPlayer";
import type { RunDeckEditor } from "../hooks/useRunDeckEditor";
import type { createDeckEditorMoves } from "./deckEditorMoves";

type TicketDropArea = "deck" | "inventory" | "floor";
type Options = {
  inventory: RunInventory;
  world: RunWorld;
  player: RunPlayer;
  editor: RunDeckEditor;
  inventoryCapacity: number;
  inventoryItemCount: number;
  deckEditorInventoryItemCount: number;
  maxPlayerHp: number;
  editingDeck?: DeckCase;
  moveDeckEditorCard: ReturnType<typeof createDeckEditorMoves>["moveDeckEditorCard"];
  clearCardPreview: () => void;
  queueRunSave: (delayMs?: number) => void;
  showMapMessage: (message: string) => void;
  activateMindEye: () => void;
  grantConsumables: (type: ConsumableType, count: number) => void;
  openCardPack: (id: string) => void;
};

/** Ticket controller: selection, validation, consumption, and effects share the same current state. */
export function createTicketActions({
  inventory, world, player, editor, inventoryCapacity, inventoryItemCount, deckEditorInventoryItemCount,
  maxPlayerHp, moveDeckEditorCard, clearCardPreview, queueRunSave, showMapMessage,
  activateMindEye, grantConsumables, openCardPack,
}: Options) {
  const { ownedDecks, setOwnedDecks, inventoryCards, setInventoryCards,
    inventoryConsumables, setInventoryConsumables, inventoryConsumablesRef,
    roomDrops, setRoomDrops, roomConsumableDrops, setRoomConsumableDrops,
    nextCardIdRef, nextConsumable, updateDeckCards } = inventory;
  const { mapPosition, setMapBombsSynced, mapBombsRef } = world;
  const { blessings, runPlayerHpRef, setRunPlayerHp, setDarkTicketTurnsRemaining,
    darkTicketTurnsRemainingRef } = player;
  const {
    finishDeckEditorSession, deckEditorHighRarityInsertionOriginsRef, setPendingRemovedCards,
    setPendingRemovedCardAreas, setDeckEditorReleasedCardIds,
    pendingCloneTicketId, setPendingCloneTicketId, pendingExtractTicketId,
    setPendingExtractTicketId, pendingTransformTicketId, setPendingTransformTicketId,
    setArmedBombTicketIds, setDeckEditorMessage, setTransformedCardNewIds, originalDeckIdForCard,
    effectiveOriginDeckIdForCard,
  } = editor;

  function randomItem<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  const findTicketById = (ticketId: string, type?: ConsumableType) => {
    const roomKey = mapRoomKey(mapPosition);
    return findTicketInAreas(ticketId, type, {
      inventory: inventoryConsumablesRef.current,
      floor: roomConsumableDrops[roomKey] ?? [],
    });
  };

  const consumeTicketById = (ticketId: string, type: ConsumableType) => {
    const roomKey = mapRoomKey(mapPosition);
    const consumed = consumeTicketFromAreas(ticketId, type, {
      inventory: inventoryConsumablesRef.current,
      floor: roomConsumableDrops[roomKey] ?? [],
    });
    if (!consumed) return false;
    const preserved = shouldPreserveTicket(blessings.includes("oneMore"));
    if (blessings.includes("healingMileage")) {
      const nextHp = Math.min(maxPlayerHp, runPlayerHpRef.current + 2);
      runPlayerHpRef.current = nextHp;
      setRunPlayerHp(nextHp);
    }
    if (!preserved) {
      const nextInventory = [...consumed.inventory];
      inventoryConsumablesRef.current = nextInventory;
      setInventoryConsumables(nextInventory);
      setRoomConsumableDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).filter((item) => item.id !== ticketId),
      }));
    }
    return true;
  };

  const extractionTicketFreesInventorySlot = (ticket: Consumable | null) => Boolean(
    (ticket?.type === "extractTicket")
    && inventoryConsumablesRef.current.some((item) => item.id === ticket.id)
    && !blessings.includes("lightTicket")
    && !blessings.includes("oneMore"),
  );

  const canApplyTicketToCard = (
    ticket: Consumable | null,
    card: Card,
    area: TicketDropArea,
    deck?: DeckCase,
  ) => {
    if (!ticket || !["cloneTicket", "extractTicket", "transformTicket"].includes(ticket.type)) return false;
    if (ticket.type === "extractTicket") return area === "deck" && Boolean(
      deck
      && originalDeckIdForCard(card.id) !== null
      && effectiveOriginDeckIdForCard(card.id) !== null
      && deck.cards.some((item) => item.id === card.id),
    );
    return card.rarity !== "legendary";
  };

  const applyTicketToCard = (
    ticketId: string,
    card: Card,
    area: TicketDropArea,
    deck?: DeckCase,
    targetCardId = card.id,
  ) => {
    const ticket = findTicketById(ticketId);
    if (!ticket || !canApplyTicketToCard(ticket, card, area, deck)) return;
    const targetCard = card.id === targetCardId ? card : { ...card, id: targetCardId };
    if (ticket.type === "cloneTicket") {
      cloneCardWithTicket(targetCard, ticket.id);
    } else if ((ticket.type === "extractTicket") && area === "deck" && deck) {
      extractDeckCardWithTicket(targetCardId, deck.id, ticket.id);
    } else if (ticket.type === "transformTicket") {
      transformCardWithTicket(targetCard, area, deck?.id, ticket.id);
    }
  };

  const canApplyTicketToDeck = (ticketId: string, deck: DeckCase) => {
    const ticket = findTicketById(ticketId);
    return ticket?.type === "expandTicket" && ownedDecks.some((ownedDeck) => ownedDeck.id === deck.id);
  };

  const applyTicketToDeck = (ticketId: string, deck: DeckCase) => {
    const ticket = findTicketById(ticketId, "expandTicket");
    const targetDeck = ownedDecks.find((ownedDeck) => ownedDeck.id === deck.id);
    if (!ticket || !targetDeck || !consumeTicketById(ticket.id, "expandTicket")) return;
    setOwnedDecks((current) => current.map((ownedDeck) => ownedDeck.id !== targetDeck.id
      ? ownedDeck
      : {
        ...ownedDeck,
        rareSlotCapacity: Math.max(ownedDeck.rareSlotCapacity ?? 0, countRareSlotCards(ownedDeck.cards)) + 1,
      }));
    setDeckEditorMessage(`${targetDeck.name}의 희귀 슬롯이 1 늘었습니다.`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const closeDeckEditorAfterUtilityTicket = () => {
    finishDeckEditorSession();
    setPendingRemovedCards([]);
    setPendingRemovedCardAreas({});
    setDeckEditorReleasedCardIds(new Set());
    clearCardPreview();
    setPendingCloneTicketId(null);
    setPendingExtractTicketId(null);
    setPendingTransformTicketId(null);
    deckEditorHighRarityInsertionOriginsRef.current = {};
    setArmedBombTicketIds(new Set());
  };

  const consumeMindEyeTicket = (consumableId: string) => {
    const ticket = findTicketById(consumableId, "mindEyeTicket");
    if (!ticket || !consumeTicketById(ticket.id, "mindEyeTicket")) return;
    closeDeckEditorAfterUtilityTicket();
    activateMindEye();
    showMapMessage("심안: 20번 이동 동안 시야 거리 +2를 얻었습니다.");
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const consumeDarkTicket = (consumableId: string) => {
    const ticket = findTicketById(consumableId, "darkTicket");
    if (!ticket || !consumeTicketById(ticket.id, "darkTicket")) return;
    closeDeckEditorAfterUtilityTicket();
    setDarkTicketTurnsRemaining((current) => {
      const next = current + 20;
      darkTicketTurnsRemainingRef.current = next;
      return next;
    });
    showMapMessage("어둠: 20턴 동안 적의 인식 거리가 1 감소합니다.");
  };

  const installArmedFloorBombs = () => {
    const roomKey = mapRoomKey(mapPosition);
    const armedBombs = (roomConsumableDrops[roomKey] ?? []).filter((item) =>
      item.type === "bombTicket" && item.armedMovesRemaining !== undefined);
    if (armedBombs.length === 0) return;
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).filter((item) => !armedBombs.some((bomb) => bomb.id === item.id)),
    }));
    setMapBombsSynced([
      ...mapBombsRef.current,
      ...armedBombs.map((bomb) => ({
        id: `bomb-${bomb.id}`,
        ticketId: bomb.id,
        position: { ...mapPosition },
        movesRemaining: bomb.armedMovesRemaining!,
      })),
    ]);
  };

  const findCardByIdForTicket = (cardId: number) => {
    const roomKey = mapRoomKey(mapPosition);
    return ownedDecks.flatMap((deck) => deck.cards).find((card) => card.id === cardId)
      ?? inventoryCards.find((card) => card.id === cardId)
      ?? (roomDrops[roomKey] ?? []).find((card) => card.id === cardId);
  };

  const grantCardToInventoryOrFloor = (card: Card) => {
    const usedSlots = inventoryCards.length + inventoryConsumablesRef.current.filter((item) =>
      !blessings.includes("lightTicket") || item.type === "cardPack").length;
    if (usedSlots < inventoryCapacity) {
      setInventoryCards((current) => [...current, card]);
      return "inventory" as const;
    }
    const roomKey = mapRoomKey(mapPosition);
    setRoomDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), card],
    }));
    return "floor" as const;
  };

  const cloneCardWithTicket = (card: Card, ticketId = pendingCloneTicketId) => {
    if (!ticketId) return;
    const ticket = findTicketById(ticketId, "cloneTicket");
    const targetCard = findCardByIdForTicket(card.id);
    if (!ticket || !targetCard) return;
    if (targetCard.rarity === "legendary") {
      setDeckEditorMessage("전설 카드는 복제할 수 없습니다.");
      return;
    }
    if (!consumeTicketById(ticket.id, "cloneTicket")) return;
    const clone = { ...targetCard, id: nextCardIdRef.current, revealed: false };
    nextCardIdRef.current += 1;
    const destination = grantCardToInventoryOrFloor(clone);
    setPendingCloneTicketId(null);
    setDeckEditorMessage(`${targetCard.name}을(를) 복제했습니다.${destination === "floor" ? " 인벤토리가 가득 차 바닥에 놓았습니다." : ""}`);
  };

  const cloneConsumableWithTicket = (targetId: string, ticketId = pendingCloneTicketId) => {
    if (!ticketId) return;
    const sourceTicket = findTicketById(ticketId, "cloneTicket");
    const target = findTicketById(targetId);
    if (!sourceTicket || !target || target.id === sourceTicket.id || target.type === "cloneTicket") return;
    if (!consumeTicketById(sourceTicket.id, "cloneTicket")) return;
    grantConsumables(target.type, 1);
    setPendingCloneTicketId(null);
    setDeckEditorMessage(`${target.name}을(를) 복제했습니다.`);
  };

  const selectExtractionTicket = (consumable: Consumable) => {
    if (pendingTransformTicketId && consumable.id !== pendingTransformTicketId) {
      transformConsumableWithTicket(consumable.id);
      return;
    }
    if (pendingCloneTicketId && consumable.id !== pendingCloneTicketId) {
      cloneConsumableWithTicket(consumable.id);
      return;
    }
    if (consumable.type === "cardPack") {
      openCardPack(consumable.id);
      return;
    }
    if (consumable.type === "expandTicket") {
      setDeckEditorMessage("확장 티켓은 원하는 덱에 드래그해 사용합니다.");
      return;
    }
    if (consumable.type === "mindEyeTicket") {
      consumeMindEyeTicket(consumable.id);
      return;
    }
    if (consumable.type === "darkTicket") {
      consumeDarkTicket(consumable.id);
      return;
    }
    if (consumable.type === "bombTicket") {
      const cancelling = consumable.armedMovesRemaining !== undefined;
      const roomKey = mapRoomKey(mapPosition);
      const nextBombState = setBombTicketArmed(consumable.id, !cancelling, {
        inventory: inventoryConsumablesRef.current,
        floor: roomConsumableDrops[roomKey] ?? [],
      });
      setArmedBombTicketIds((current) => {
        const next = new Set(current);
        if (cancelling) next.delete(consumable.id);
        else next.add(consumable.id);
        return next;
      });
      inventoryConsumablesRef.current = nextBombState.inventory;
      setInventoryConsumables(nextBombState.inventory);
      setRoomConsumableDrops((current) => ({
        ...current,
        [roomKey]: setBombTicketArmed(consumable.id, !cancelling, {
          inventory: inventoryConsumablesRef.current,
          floor: current[roomKey] ?? [],
        }).floor,
      }));
      setPendingCloneTicketId(null);
      setPendingExtractTicketId(null);
      setPendingTransformTicketId(null);
      setDeckEditorMessage(cancelling
        ? "폭탄 점화를 취소했습니다."
        : "폭탄을 점화했습니다. 바닥에 내려놓고 편집을 확인하면 설치됩니다.");
      return;
    }
    if (consumable.type === "cloneTicket") {
      setArmedBombTicketIds(new Set());
      const cancelling = pendingCloneTicketId === consumable.id;
      setPendingCloneTicketId(cancelling ? null : consumable.id);
      setPendingExtractTicketId(null);
      setPendingTransformTicketId(null);
      setDeckEditorMessage(cancelling ? "복제를 취소했습니다." : "복제할 카드나 티켓을 클릭하세요.");
      return;
    }
    if (consumable.type === "extractTicket") {
      const cancelling = pendingExtractTicketId === consumable.id;
      setPendingExtractTicketId(cancelling ? null : consumable.id);
      setPendingCloneTicketId(null);
      setPendingTransformTicketId(null);
      setDeckEditorMessage(cancelling ? "추출을 취소했습니다." : `${consumable.name}을(를) 사용할 덱 카드를 클릭하세요.`);
      return;
    }
    if (consumable.type === "transformTicket") {
      const cancelling = pendingTransformTicketId === consumable.id;
      setPendingTransformTicketId(cancelling ? null : consumable.id);
      setPendingCloneTicketId(null);
      setPendingExtractTicketId(null);
      setDeckEditorMessage(cancelling ? "변환을 취소했습니다." : "변환할 카드나 티켓을 클릭하세요.");
      return;
    }
  };


  const extractDeckCardWithTicket = (cardId: number, deckId: string, ticketId = pendingExtractTicketId) => {
    if (!ticketId) return;
    const deck = ownedDecks.find((item) => item.id === deckId);
    const card = deck?.cards.find((item) => item.id === cardId);
    if (!deck || !card) return;
    const ticket = findTicketById(ticketId);
    if (!ticket || (ticket.type !== "extractTicket")) return;
    const ticketFreesInventorySlot = extractionTicketFreesInventorySlot(ticket);
    const targetArea = deckEditorInventoryItemCount - (ticketFreesInventorySlot ? 1 : 0) < inventoryCapacity
      ? "inventory"
      : "floor";
    const moved = moveDeckEditorCard({
      cardId,
      source: { area: "deck", deckId },
      target: { area: targetArea },
      viaExtractionTicket: true,
      allowsRareExtraction: true,
      inventorySlotsFreed: ticketFreesInventorySlot ? 1 : 0,
      beforeCommit: () => consumeTicketById(ticket.id, ticket.type),
    });
    if (!moved) return;
    setDeckEditorReleasedCardIds((current) => new Set(current).add(cardId));
    setPendingExtractTicketId(null);
    setDeckEditorMessage(`${card.name}을(를) 덱에서 추출했습니다.${targetArea === "floor" ? " 인벤토리가 가득 차 바닥에 놓았습니다." : ""}`);
  };

  const transformCardWithTicket = (card: Card, area: "deck" | "inventory" | "floor", deckId?: string, ticketId = pendingTransformTicketId) => {
    if (!ticketId) return;
    const ticket = findTicketById(ticketId, "transformTicket");
    const roomKey = mapRoomKey(mapPosition);
    const targetCard = area === "deck" && deckId
      ? ownedDecks.find((deck) => deck.id === deckId)?.cards.find((item) => item.id === card.id)
      : area === "inventory"
        ? inventoryCards.find((item) => item.id === card.id)
        : (roomDrops[roomKey] ?? []).find((item) => item.id === card.id);
    if (!ticket || !targetCard) return;
    const transformed = transformedCard(targetCard);
    if (!transformed) {
      setDeckEditorMessage(targetCard.rarity === "legendary" ? "전설 카드는 변화시킬 수 없습니다." : "변환할 다른 카드가 없습니다.");
      return;
    }
    const targetDeck = area === "deck" ? ownedDecks.find(item => item.id === deckId) : undefined;
    if (targetDeck) {
      const cards = targetDeck.cards.map(item => item.id === targetCard.id ? transformed : item);
      if (occupiedDeckSpace(cards) > targetDeck.capacity || countRareSlotCards(cards) > targetDeck.rareSlotCapacity) {
        setDeckEditorMessage("변환 후 카드가 들어갈 덱 용량 또는 희귀 슬롯이 부족합니다.");
        return;
      }
    }
    if (!consumeTicketById(ticket.id, "transformTicket")) return;
    if (area === "deck" && deckId) {
      updateDeckCards(deckId, (current) => current.map((item) => item.id === targetCard.id ? transformed : item));
    } else if (area === "inventory") {
      setInventoryCards((current) => current.map((item) => item.id === targetCard.id ? transformed : item));
    } else {
      setRoomDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).map((item) => item.id === targetCard.id ? transformed : item),
      }));
    }
    setTransformedCardNewIds((current) => new Set(current).add(targetCard.id));
    setPendingTransformTicketId(null);
    setDeckEditorMessage(`${targetCard.name}을(를) ${transformed.name}(으)로 변환했습니다.`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const applySelectedCardTicket = (
    card: Card,
    area: "inventory" | "floor" | "deck",
    deckId?: string,
    targetCardId = card.id,
  ) => {
    if (pendingCloneTicketId) {
      cloneCardWithTicket(card);
      return true;
    }
    if (pendingExtractTicketId && area === "deck" && deckId) {
      extractDeckCardWithTicket(targetCardId, deckId, pendingExtractTicketId);
      return true;
    }
    if (pendingTransformTicketId) {
      transformCardWithTicket(card, area, deckId);
      return true;
    }
    return false;
  };

  const transformConsumableWithTicket = (targetId: string, ticketId = pendingTransformTicketId) => {
    if (!ticketId || targetId === ticketId) return;
    const sourceTicket = findTicketById(ticketId, "transformTicket");
    const target = findTicketById(targetId);
    if (!sourceTicket || !target || target.id === sourceTicket.id || target.type === "cardPack") return;
    const candidates = CONSUMABLE_TYPES.filter((type) => type !== target.type);
    const transformed = nextConsumable(randomItem(candidates));
    if (!consumeTicketById(sourceTicket.id, "transformTicket")) return;
    if (inventoryConsumablesRef.current.some((item) => item.id === targetId)) {
      const nextInventory = inventoryConsumablesRef.current.map((item) => item.id === targetId ? transformed : item);
      inventoryConsumablesRef.current = nextInventory;
      setInventoryConsumables(nextInventory);
    }
    const roomKey = mapRoomKey(mapPosition);
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).map((item) => item.id === targetId ? transformed : item),
    }));
    setPendingTransformTicketId(null);
    setDeckEditorMessage(`${target.name}을(를) ${transformed.name}(으)로 변환했습니다.`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const canApplyTicketToConsumable = (ticketId: string, targetId: string) => {
    const ticket = findTicketById(ticketId);
    const target = findTicketById(targetId);
    if (!ticket || !target || ticket.id === target.id) return false;
    if (ticket.type === "cloneTicket") return target.type !== "cloneTicket";
    if (ticket.type === "transformTicket") return target.type !== "cardPack";
    return false;
  };

  const applyTicketToConsumable = (ticketId: string, targetId: string) => {
    if (!canApplyTicketToConsumable(ticketId, targetId)) return;
    const ticket = findTicketById(ticketId);
    if (ticket?.type === "cloneTicket") cloneConsumableWithTicket(targetId, ticketId);
    if (ticket?.type === "transformTicket") transformConsumableWithTicket(targetId, ticketId);
  };

  const moveFloorConsumableToInventory = (consumableId: string) => {
    if (inventoryItemCount >= inventoryCapacity) {
      showMapMessage("인벤토리가 가득찼습니다!");
      return;
    }
    const roomKey = mapRoomKey(mapPosition);
    const consumable = (roomConsumableDrops[roomKey] ?? []).find((item) => item.id === consumableId);
    if (!consumable) return;
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).filter((item) => item.id !== consumableId),
    }));
    setInventoryConsumables((current) => {
      const next = current.some((item) => item.id === consumable.id)
        ? current
        : [...current, consumable];
      inventoryConsumablesRef.current = next;
      return next;
    });
    setDeckEditorMessage(`${consumable.name}을(를) 인벤토리에 주웠습니다.`);
  };

  const moveInventoryConsumableToFloor = (consumableId: string) => {
    const consumable = inventoryConsumablesRef.current.find((item) => item.id === consumableId)
      ?? inventoryConsumables.find((item) => item.id === consumableId);
    if (!consumable) return;
    const roomKey = mapRoomKey(mapPosition);
    setInventoryConsumables((current) => {
      const next = current.filter((item) => item.id !== consumableId);
      inventoryConsumablesRef.current = next;
      return next;
    });
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), consumable],
    }));
    if (pendingCloneTicketId === consumableId) setPendingCloneTicketId(null);
    if (pendingExtractTicketId === consumableId) setPendingExtractTicketId(null);
    if (pendingTransformTicketId === consumableId) setPendingTransformTicketId(null);
    setArmedBombTicketIds((current) => {
      const next = new Set(current);
      next.delete(consumableId);
      return next;
    });
    setDeckEditorMessage(`${consumable.name}을(를) 바닥에 놓았습니다.`);
  };

  return {
    moveFloorConsumableToInventory, moveInventoryConsumableToFloor, findTicketById,
    canApplyTicketToCard, applyTicketToCard, canApplyTicketToDeck, applyTicketToDeck,
    installArmedFloorBombs, selectExtractionTicket, applySelectedCardTicket,
    canApplyTicketToConsumable, applyTicketToConsumable,
  };
}
