import type { RunInventory } from "../hooks/useRunInventory";
import type { RunWorld } from "../hooks/useRunWorld";
import type { RunPlayer } from "../hooks/useRunPlayer";
import type { LocationDialogs } from "../hooks/useLocationDialogs";
import { getRegionNumber, mapRoomKey } from "../game/mapRules.ts";
import { recordTelemetryDeckAcquired, type createTelemetryRecorder } from "../game/telemetry.ts";
import { telemetryDeckSnapshot } from "../game/telemetrySnapshots.ts";
import { canUnlockDeckVault, DECK_VAULT_KEY_COST } from "../game/deckVaultRules.ts";

export function createDeckVaultActions({ inventory, world, player, dialogs, queueRunSave, telemetry, ensureTelemetryRun }: {
  inventory: RunInventory; world: RunWorld; player: RunPlayer; dialogs: LocationDialogs;
  queueRunSave: (delay?: number) => void;
  telemetry: ReturnType<typeof createTelemetryRecorder>; ensureTelemetryRun: () => void;
}) {
  const openDeckVault = () => {
    if (world.effectiveRoomType(world.mapPosition) !== "deckVault") return;
    const key = mapRoomKey(world.mapPosition);
    inventory.ensureDeckVault(key, getRegionNumber(world.mapPosition, world.mapSeed),
      player.blessings.includes("deckSize") ? 5 : 0);
    dialogs.setDeckVaultRoom(key);
    queueRunSave();
  };
  const unlockDeckVault = () => {
    const key = mapRoomKey(world.mapPosition);
    if (dialogs.deckVaultRoom !== key || world.effectiveRoomType(world.mapPosition) !== "deckVault"
      || !canUnlockDeckVault(inventory.keysRef.current, world.openedDeckVaultRoomsRef.current.has(key))) return;
    const deck = inventory.roomDeckVaultsRef.current[key];
    if (!deck) return;
    // Mark and spend synchronously so a second click cannot duplicate a deck.
    world.setOpenedDeckVaultRooms((current) => new Set(current).add(key));
    inventory.setKeys((current) => current - DECK_VAULT_KEY_COST);
    inventory.setRoomDeckDrops((current) => ({
      ...current, [key]: [...(current[key] ?? []), deck],
    }));
    ensureTelemetryRun();
    recordTelemetryDeckAcquired(telemetry, telemetryDeckSnapshot(deck), "deck-vault");
    dialogs.setDeckVaultRoom(null);
    queueRunSave();
    return deck;
  };
  return { openDeckVault, unlockDeckVault };
}
