import type { RunInventory } from "../hooks/useRunInventory";
import type { RunWorld } from "../hooks/useRunWorld";
import type { RunPlayer } from "../hooks/useRunPlayer";
import type { RunDeckEditor } from "../hooks/useRunDeckEditor";
import type { Card } from "../game/cards.ts";
import type { DeckCase } from "../game/rewards.ts";
import { isSafeAreaPosition, isSafeAreaEditAllowed, mapRoomKey } from "../game/mapRules.ts";
import { countRareSlotCards, usesRareCardSlot, validateDeckEditorCardMove,
  type DeckEditorCardLocation, type DeckEditorMoveBlockReason } from "../game/deckEditorRules.ts";
import { transitionDeckEditorCardCollections } from "../game/deckEditorTransitions.ts";

type Options = {
  inventory: RunInventory;
  world: RunWorld;
  player: RunPlayer;
  editor: RunDeckEditor;
  inventoryCapacity: number;
  deckEditorInventoryItemCount: number;
  onFloorCardAcquired: (card: Card) => void;
  clearCardPreview: () => void;
};

/** Validates moves and commits the matching collection transition as one action. */
export function createDeckEditorMoves({
  inventory, world, player, editor, inventoryCapacity, deckEditorInventoryItemCount,
  onFloorCardAcquired, clearCardPreview,
}: Options) {
  const { ownedDecks, inventoryCards, roomDrops, setOwnedDecks, setInventoryCards, setRoomDrops } = inventory;
  const { mapPosition, mapSeed, defeatedBossRegions } = world;
  const { blessings } = player;
  const { pendingRemovedCards, pendingRemovedCardAreas, deckEditorHighRarityInsertionOriginsRef,
    originalDeckIdForCard, effectiveOriginDeckIdForCard, setDeckEditorMessage, setDeckEditorDeckId,
    setPendingRemovedCards, setPendingRemovedCardAreas } = editor;
  const deckEditorMoveErrorMessage = (reason: DeckEditorMoveBlockReason, targetDeck?: DeckCase) => {
    if (reason === "rare-locked") return "희귀·전설 카드는 덱끼리 직접 옮기거나 일반 이동으로 꺼낼 수 없습니다. 덱에 넣을 때는 인벤토리·바닥에서 옮기고, 추출할 때는 추출 티켓+를 사용하세요.";
    if (reason === "inventory-full") return "인벤토리가 가득 찼습니다.";
    if (reason === "deck-full") return `${targetDeck?.name ?? "현재 덱"}에는 더 이상 카드를 넣을 수 없습니다.`;
    if (reason === "rare-slots-full") return `${targetDeck?.name ?? "현재 덱"}의 희귀·전설 슬롯이 가득 찼습니다.`;
    if (reason === "extract-original-only") return "추출 티켓은 편집 시작 당시 덱에 있던 카드에만 사용할 수 있습니다.";
    if (reason === "origin-locked") return "현재 위치에서는 편집 시작 당시의 원래 덱으로만 되돌릴 수 있습니다.";
    return "이미 같은 위치에 있습니다.";
  };

  const moveDeckEditorCard = ({
    cardId,
    source,
    target: requestedTarget,
    viaExtractionTicket = false,
    allowsRareExtraction = false,
    inventorySlotsFreed = 0,
    beforeCommit,
  }: {
    cardId: number;
    source: DeckEditorCardLocation;
    target: DeckEditorCardLocation;
    viaExtractionTicket?: boolean;
    allowsRareExtraction?: boolean;
    inventorySlotsFreed?: number;
    beforeCommit?: () => boolean;
  }) => {
    const roomKey = mapRoomKey(mapPosition);
    const collections = {
      ownedDecks,
      inventoryCards,
      floorCards: roomDrops[roomKey] ?? [],
      pendingRemovedCards,
      pendingRemovedCardAreas,
    };
    const previewTransition = transitionDeckEditorCardCollections(collections, {
      cardId, source, target: requestedTarget, action: "move",
    });
    const card = previewTransition?.card;
    if (!card) return false;
    let target = requestedTarget;
    const temporaryRareReturnArea = deckEditorHighRarityInsertionOriginsRef.current[cardId];
    if (!viaExtractionTicket && usesRareCardSlot(card) && source.area === "deck"
      && target.area === "floor" && temporaryRareReturnArea) {
      target = temporaryRareReturnArea === "inventory" && deckEditorInventoryItemCount >= inventoryCapacity
        ? { area: "floor" }
        : { area: temporaryRareReturnArea };
    }
    const sourceDeck = source.area === "deck"
      ? ownedDecks.find((deck) => deck.id === source.deckId)
      : undefined;
    const targetDeck = target.area === "deck"
      ? ownedDecks.find((deck) => deck.id === target.deckId)
      : undefined;
    if (source.area === "deck" && !sourceDeck) return false;
    if (target.area === "deck" && !targetDeck) return false;
    const targetDeckRareCardCount = targetDeck
      ? countRareSlotCards(targetDeck.cards)
      : 0;
    const positionIsSafeArea = isSafeAreaPosition(mapPosition, mapSeed);
    const safeArea = positionIsSafeArea
      ? isSafeAreaEditAllowed(mapPosition, mapSeed, defeatedBossRegions)
      : blessings.includes("forbiddenKnowledge");
    const validation = validateDeckEditorCardMove({
      source,
      target,
      safeArea,
      originalOriginDeckId: originalDeckIdForCard(cardId),
      effectiveOriginDeckId: effectiveOriginDeckIdForCard(cardId),
      targetDeckCardCount: targetDeck?.cards.length,
      targetDeckCapacity: targetDeck?.capacity,
      targetDeckRareCardCount,
      targetDeckRareSlotCapacity: targetDeck
        ? Math.max(targetDeck.rareSlotCapacity ?? 0, countRareSlotCards(targetDeck.cards))
        : 0,
      inventoryItemCount: deckEditorInventoryItemCount,
      inventoryCapacity,
      inventorySlotsFreed,
      viaExtractionTicket,
      allowsRareExtraction,
      temporaryRareReturnArea: source.area === "deck" ? temporaryRareReturnArea : undefined,
      isRare: usesRareCardSlot(card),
    });
    if (!validation.allowed) {
      if (validation.reason !== "same-location") {
        setDeckEditorMessage(deckEditorMoveErrorMessage(validation.reason, targetDeck));
      }
      return false;
    }
    if (beforeCommit && !beforeCommit()) return false;

    const committedTransition = transitionDeckEditorCardCollections(collections, {
      cardId, source, target, action: validation.action,
    });
    if (!committedTransition) return false;
    const nextCollections = committedTransition.collections;
    if (source.area === "floor") {
      onFloorCardAcquired(card);
    }
    setOwnedDecks(nextCollections.ownedDecks);
    setInventoryCards(nextCollections.inventoryCards);
    setRoomDrops((current) => ({ ...current, [roomKey]: nextCollections.floorCards }));
    setPendingRemovedCards(nextCollections.pendingRemovedCards);
    setPendingRemovedCardAreas(nextCollections.pendingRemovedCardAreas);

    if (usesRareCardSlot(card)) {
      if ((source.area === "inventory" || source.area === "floor") && target.area === "deck") {
        deckEditorHighRarityInsertionOriginsRef.current[cardId] = source.area;
      } else if (source.area === "deck" && (target.area === "inventory" || target.area === "floor")) {
        delete deckEditorHighRarityInsertionOriginsRef.current[cardId];
      }
    }

    if (validation.action === "schedule-removal") {
      setDeckEditorMessage(`${card.name}을(를) 제거 예정 상태로 만들었습니다.`);
    } else if (target.area === "deck") {
      setDeckEditorDeckId(target.deckId!);
      setDeckEditorMessage(validation.action === "restore-removal"
        ? `${card.name} 제거를 취소하고 ${targetDeck!.name}(으)로 되돌렸습니다.`
        : `${card.name}을(를) ${targetDeck!.name}(으)로 옮겼습니다.`);
    } else if (target.area === "inventory") {
      setDeckEditorMessage(`${card.name}을(를) 인벤토리로 옮겼습니다.`);
    } else {
      setDeckEditorMessage(`${card.name}을(를) 실제 바닥으로 옮겼습니다.`);
    }
    clearCardPreview();
    return true;
  };


  return { moveDeckEditorCard };
}
