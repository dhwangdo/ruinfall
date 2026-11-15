import type { RunInventory } from "../hooks/useRunInventory";
import type { RunWorld } from "../hooks/useRunWorld";
import type { RunPlayer } from "../hooks/useRunPlayer";
import type { RunDeckEditor } from "../hooks/useRunDeckEditor";
import type { LocationDialogs } from "../hooks/useLocationDialogs";
import { createBattleRewardCard } from "../game/rewards.ts";
import { RARE_CARD_POOL } from "../game/cards.ts";
import { mapRoomKey } from "../game/mapRules.ts";
import { recordTelemetryCardAcquired, type createTelemetryRecorder } from "../game/telemetry.ts";
import { telemetryCardSnapshot } from "../game/telemetrySnapshots.ts";

export function createCardPackActions({ inventory, world, player, editor, dialogs, telemetry, ensureTelemetryRun, inventoryCapacity, inventoryItemCount }: {
  inventory: RunInventory; world: RunWorld; player: RunPlayer; editor: RunDeckEditor; dialogs: LocationDialogs;
  telemetry: ReturnType<typeof createTelemetryRecorder>; ensureTelemetryRun: () => void;
  inventoryCapacity: number; inventoryItemCount: number; queueRunSave: (delay?: number) => void;
}) {
  const { inventoryConsumables, setInventoryConsumables, setInventoryCards, setRoomDrops, nextCardIdRef, rareCardDropChanceRef } = inventory;
  const { mapPosition } = world;
  const { blessings } = player;
  const { setOpenedCardPack } = dialogs;
  const { setDeckEditorMessage } = editor;
  const randomItem = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
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

  return { openCardPack };
}
