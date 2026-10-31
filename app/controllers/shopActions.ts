import type { RunInventory } from "../hooks/useRunInventory";
import type { RunWorld } from "../hooks/useRunWorld";
import type { RunPlayer } from "../hooks/useRunPlayer";
import type { RunDeckEditor } from "../hooks/useRunDeckEditor";
import type { LocationDialogs } from "../hooks/useLocationDialogs";
import type { createTelemetryRecorder } from "../game/telemetry";
import { RUN_SAVE_POLICY } from "../game/saveGame.ts";
import { recordTelemetryCardAcquired, recordTelemetryConsumableAcquired } from "../game/telemetry.ts";
import { telemetryCardSnapshot, telemetryConsumableSnapshot } from "../game/telemetrySnapshots.ts";
import type { ShopOffer } from "../game/rewards";
import { CONSUMABLE_TYPES, createBattleRewardCard } from "../game/rewards.ts";
import { SPECIAL_CARD_POOL, RARE_CARD_POOL } from "../game/cards.ts";
import { ticketBasePrice, type TicketType } from "../game/shopRules.ts";
import { mapRoomKey } from "../game/mapRules.ts";
type Options = {
  inventory: RunInventory; world: RunWorld; player: RunPlayer; editor: RunDeckEditor; dialogs: LocationDialogs;
  telemetry: ReturnType<typeof createTelemetryRecorder>; ensureTelemetryRun: () => void;
  queueRunSave: (delay?: number) => void;
  inventoryCapacity: number; inventoryItemCount: number;
};
export function createShopActions({
  inventory, world, player, editor, dialogs, telemetry, ensureTelemetryRun, queueRunSave, inventoryCapacity, inventoryItemCount,
}: Options) {
  const {
    setInventoryCards, inventoryConsumables, setInventoryConsumables, setRoomDrops,
    setRoomConsumableDrops, roomShops, setRoomShops, gold, setGold, nextCardIdRef, nextConsumable,
    rareCardDropChanceRef,
  } = inventory;
  const { mapPosition } = world;
  const { blessings } = player;
  const { setDeckEditorMessage } = editor;
  const { setShopOpen, activeShopRoom, setActiveShopRoom, setOpenedCardPack, setShopMessage } = dialogs;
  function randomItem<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)]; }
  const createShopStock = (depth: number): ShopOffer[] => {
    const regionPriceMultiplier = 1.3 ** Math.max(0, depth - 1);
    const variedPrice = (basePrice: number) => Math.floor(basePrice * (0.8 + Math.random() * 0.4) * regionPriceMultiplier);
    const specialBlueprints = [...SPECIAL_CARD_POOL];
    const specialCards = Array.from({ length: 3 }, (_, slot) => {
      const blueprintIndex = Math.floor(Math.random() * specialBlueprints.length);
      const blueprint = specialBlueprints.splice(blueprintIndex, 1)[0];
      const card = { ...blueprint, id: nextCardIdRef.current, revealed: false };
      nextCardIdRef.current += 1;
      return {
        id: `shop-special-${depth}-${slot}-${card.id}`,
        price: variedPrice(50),
        card,
        sold: false,
      };
    });
    const makeRareCardOffer = (slot: number): ShopOffer => {
      const blueprint = RARE_CARD_POOL[Math.floor(Math.random() * RARE_CARD_POOL.length)];
      const card = { ...blueprint, id: nextCardIdRef.current, revealed: false };
      nextCardIdRef.current += 1;
      return {
        id: `shop-card-${depth}-${slot}-${card.id}`,
        price: variedPrice(160),
        card,
        sold: false,
      };
    };
    const extractTicket = nextConsumable("extractTicket");
    const extractPlusTicket = nextConsumable("extractPlusTicket");
    const ticketTypes = CONSUMABLE_TYPES.filter((type) => type !== "extractTicket" && type !== "extractPlusTicket") as TicketType[];
    const randomTickets = Array.from({ length: 2 }, (_, slot) => {
      const typeIndex = Math.floor(Math.random() * ticketTypes.length);
      const type = ticketTypes.splice(typeIndex, 1)[0];
      const consumable = nextConsumable(type);
      return {
        id: `shop-ticket-${depth}-${slot}-${consumable.id}`,
        price: variedPrice(ticketBasePrice(type)),
        consumable,
        sold: false,
      };
    });
    const cardPack = nextConsumable("cardPack");
    return [
      ...specialCards,
      {
        id: `shop-ticket-${depth}-extract-${extractTicket.id}`,
        price: variedPrice(ticketBasePrice("extractTicket")),
        consumable: extractTicket,
        sold: false,
      },
      {
        id: `shop-ticket-${depth}-extract-plus-${extractPlusTicket.id}`,
        price: variedPrice(ticketBasePrice("extractPlusTicket")),
        consumable: extractPlusTicket,
        sold: false,
      },
      ...randomTickets,
      { id: `shop-pack-${depth}-${cardPack.id}`, price: variedPrice(120), consumable: cardPack, sold: false },
      makeRareCardOffer(7),
    ];
  };

  const openShop = (roomKey: string, depth: number) => {
    if (!roomShops[roomKey]) {
      const stock = createShopStock(depth);
      setRoomShops((current) => ({ ...current, [roomKey]: stock }));
    }
    setActiveShopRoom(roomKey);
    setShopMessage("필요한 물건을 골라보세요.");
    setShopOpen(true);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const buyShopOffer = (offerId: string) => {
    if (!activeShopRoom) return;
    const offer = (roomShops[activeShopRoom] ?? []).find((item) => item.id === offerId);
    if (!offer || offer.sold) return;
    if (gold < offer.price) {
      setShopMessage(`🪙 ${offer.price - gold}이 부족합니다.`);
      return;
    }
    setGold((current) => current - offer.price);
    const inventoryFull = inventoryItemCount >= inventoryCapacity;
    if (offer.card) {
      ensureTelemetryRun();
      recordTelemetryCardAcquired(telemetry, telemetryCardSnapshot(offer.card), "shop");
      if (inventoryFull) setRoomDrops((current) => ({ ...current, [activeShopRoom]: [...(current[activeShopRoom] ?? []), offer.card!] }));
      else setInventoryCards((current) => [...current, offer.card!]);
    }
    if (offer.consumable) {
      ensureTelemetryRun();
      recordTelemetryConsumableAcquired(telemetry, telemetryConsumableSnapshot(offer.consumable), "shop");
      if (inventoryFull) setRoomConsumableDrops((current) => ({ ...current, [activeShopRoom]: [...(current[activeShopRoom] ?? []), offer.consumable!] }));
      else setInventoryConsumables((current) => [...current, offer.consumable!]);
    }
    setRoomShops((current) => ({
      ...current,
      [activeShopRoom]: (current[activeShopRoom] ?? []).map((item) =>
        item.id === offerId ? { ...item, sold: true } : item),
    }));
    setShopMessage(`${offer.card?.name ?? offer.consumable?.name}을(를) 구매했습니다.${inventoryFull ? " 인벤토리가 가득 차 바닥에 놓았습니다." : ""}`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const openCardPack = (packId: string) => {
    const pack = inventoryConsumables.find((item) => item.id === packId && item.type === "cardPack");
    if (!pack) return;
    let rareChance = rareCardDropChanceRef.current;
    const cards = Array.from({ length: 5 }, () => {
      const card = createBattleRewardCard(nextCardIdRef.current, rareChance);
      nextCardIdRef.current += 1;
      rareChance = card.rarity === "rare"
        ? 0.05
        : Math.min(1, rareChance + 0.02);
      return card;
    });
    if (blessings.includes("packInsurance") && !cards.some((card) => card.rarity === "rare")) {
      const last = cards.at(-1)!;
      cards[cards.length - 1] = { ...randomItem(RARE_CARD_POOL), id: last.id, revealed: false };
      rareChance = .05;
    }
    ensureTelemetryRun();
    cards.forEach((card) => recordTelemetryCardAcquired(telemetry, telemetryCardSnapshot(card), "card-pack"));
    rareCardDropChanceRef.current = rareChance;
    const freeSlotsAfterPack = Math.max(0, inventoryCapacity - (inventoryItemCount - 1));
    const inventoryCardsFromPack = cards.slice(0, freeSlotsAfterPack);
    const floorCardsFromPack = cards.slice(freeSlotsAfterPack);
    setInventoryConsumables((current) => current.filter((item) => item.id !== packId));
    setInventoryCards((current) => [...current, ...inventoryCardsFromPack]);
    if (floorCardsFromPack.length > 0) {
      const roomKey = mapRoomKey(mapPosition);
      setRoomDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), ...floorCardsFromPack],
      }));
      setDeckEditorMessage(`인벤토리에 들어가지 못한 카드 ${floorCardsFromPack.length}장을 바닥에 놓았습니다.`);
    }
    setOpenedCardPack(cards);
  };

  return { openShop, buyShopOffer, openCardPack };
}
