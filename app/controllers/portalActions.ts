import type { RunInventory } from "../hooks/useRunInventory";
import type { RunWorld } from "../hooks/useRunWorld";
import type { RunPlayer } from "../hooks/useRunPlayer";
import type { LocationDialogs } from "../hooks/useLocationDialogs";
import type { useRunMapContent } from "../hooks/useRunMapContent";
import { freshRewardRoulette } from "../game/rewardRoulette.ts";
import { clearMapEnemiesNear } from "../game/mapEnemies.ts";
import { getDungeonRegionIndex, getSafeAreaRegionIndex, mapRoomKey, nextRegionEntry,
  REGION_COUNT, safeAreaEntry, type MapPosition } from "../game/mapRules.ts";

type Options = {
  inventory: RunInventory; world: RunWorld; player: RunPlayer; dialogs: LocationDialogs;
  isSafeAreaSealed: (region: number) => boolean;
  focusMapOn: (position: MapPosition) => void;
  materializeVisibleMapContent: ReturnType<typeof useRunMapContent>["materializeVisibleMapContent"];
  rememberPlayerVision: ReturnType<typeof useRunMapContent>["rememberPlayerVision"];
  queueRunSave: (delay?: number) => void;
};

export function createPortalActions({ inventory, world, player, dialogs, isSafeAreaSealed,
  focusMapOn, materializeVisibleMapContent, rememberPlayerVision, queueRunSave }: Options) {
  const currentPortal = () => {
    const type = world.effectiveRoomType(world.mapPosition);
    const region = type === "portal" ? getDungeonRegionIndex(world.mapPosition)
      : type === "safePortal" ? getSafeAreaRegionIndex(world.mapPosition, world.mapSeed) : null;
    if (region === null || (type === "safePortal" && region >= REGION_COUNT - 1)) return null;
    return { type, region };
  };
  const travel = () => {
    const portal = currentPortal();
    if (!portal) return;
    const { type, region } = portal;
    const destination = type === "portal" ? safeAreaEntry(region, world.mapSeed) : nextRegionEntry(region);
    const revealed = materializeVisibleMapContent(destination, world.mapSeed, world.mapEnemyWorld);
    const nextWorld = clearMapEnemiesNear(revealed, destination);
    const baseSeenRooms = type === "safePortal" && world.safeAreaEntrySeenRooms !== null && isSafeAreaSealed(region)
      ? world.safeAreaEntrySeenRooms : null;
    inventory.setKeys(0);
    player.setRegionBattleWins(0);
    player.setRewardRouletteRemaining(freshRewardRoulette());
    if (type === "portal") world.setSafeAreaEntrySeenRooms(new Set(world.seenRooms));
    else world.setSafeAreaEntrySeenRooms(null);
    player.godsLamentChargesRef.current = type === "portal" ? 0 : 3;
    player.setGodsLamentCharges(player.godsLamentChargesRef.current);
    world.setMapPosition(destination);
    rememberPlayerVision(destination, world.mapSeed, nextWorld.enemies, revealed.enemies, baseSeenRooms);
    world.setMapEnemyWorld(nextWorld);
    dialogs.setPortalKeyWarningRoom(null);
    focusMapOn(destination);
    queueRunSave();
  };
  const useCurrentPortal = () => {
    if (!currentPortal()) return;
    if (inventory.keysRef.current > 0 && !inventory.skipPortalKeyWarning) {
      dialogs.setPortalKeyWarningRoom(mapRoomKey(world.mapPosition));
      return;
    }
    travel();
  };
  const confirmPortalTravel = (skipWarning: boolean) => {
    const key = dialogs.portalKeyWarningRoom;
    dialogs.setPortalKeyWarningRoom(null);
    if (key === null || key !== mapRoomKey(world.mapPosition) || !currentPortal()) return;
    inventory.setSkipPortalKeyWarning(skipWarning);
    travel();
  };
  return { useCurrentPortal, confirmPortalTravel };
}
