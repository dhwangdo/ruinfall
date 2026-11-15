import type { RunWorld } from "./useRunWorld";
import type { RunInventory } from "./useRunInventory";
import type { RunPlayer } from "./useRunPlayer";
import { MAP_START, mapRoomKey, visibleMapRoomKeys, parseMapRoomKey,
  createMapEnemyWorldForPositions, createMapFloorDropsForPositions, getRoomType, getRegionNumber, type MapPosition } from "../game/mapRules";
import { positionsInSquare } from "../game/mapEffects";
import { MAP_PLAYER_VISION_HORIZONTAL_RADIUS, MAP_PLAYER_VISION_VERTICAL_RADIUS,
  updateEnemyCellMemory, type MapEnemyWorld } from "../game/mapEnemies";
import { createRandomSeed as createRandomMapSeed } from "../game/randomNames";
import { createMapGoldPilesForPositions } from "../game/mapGold";

type Options = {
  world: RunWorld;
  inventory: RunInventory;
  player: RunPlayer;
  visionHorizontalRadius: number;
  visionVerticalRadius: number;
};

/** Generates each visited room once and updates the player's exploration memory. */
export function useRunMapContent({ world, inventory, player, visionHorizontalRadius, visionVerticalRadius }: Options) {
  const { mapSeed, mapEnemyWorld, generatedMapRoomKeysRef, setSeenRooms,
    setMapEnemyCellMemory, setMapSeed, setMapEnemyWorld } = world;
  const { setRoomDrops, setRoomConsumableDrops, setRoomGoldPiles, ensureDeckVault } = inventory;
  const { blessings, mindEyeMovesRemainingRef } = player;
  const materializeMapContent = (
    positions: readonly MapPosition[],
    seed = mapSeed,
    world: MapEnemyWorld = mapEnemyWorld,
    seenPositions: readonly MapPosition[] = positions,
    deckCapacityBonus = blessings.includes("deckSize") ? 5 : 0,
  ) => {
    const uniquePositions = [...new Map(positions.map((position) => [mapRoomKey(position), position])).values()];
    const freshPositions = uniquePositions.filter((position) => !generatedMapRoomKeysRef.current.has(mapRoomKey(position)));
    const seenRoomKeys = seenPositions.map(mapRoomKey);
    if (seenRoomKeys.length > 0) {
      setSeenRooms((current) => new Set([...current, ...seenRoomKeys]));
    }
    // Also fill newly introduced vaults in previously explored legacy saves.
    uniquePositions.forEach((position) => {
      if (getRoomType(position, seed) === "deckVault") {
        ensureDeckVault(mapRoomKey(position), getRegionNumber(position, seed), deckCapacityBonus);
      }
    });
    const goldPiles = createMapGoldPilesForPositions(seed, uniquePositions);
    if (Object.keys(goldPiles).length > 0) setRoomGoldPiles((current) => {
      let next = current;
      Object.entries(goldPiles).forEach(([roomKey, amount]) => {
        if (current[roomKey] !== undefined) return;
        if (next === current) next = { ...current };
        next[roomKey] = amount;
      });
      return next;
    });
    if (freshPositions.length === 0) return world;

    const freshRoomKeys = freshPositions.map(mapRoomKey);
    freshRoomKeys.forEach((roomKey) => generatedMapRoomKeysRef.current.add(roomKey));
    const generatedEnemies = createMapEnemyWorldForPositions(seed, freshPositions);
    const existingEnemyIds = new Set(world.enemies.map((enemy) => enemy.id));
    const nextWorld = {
      ...world,
      enemies: [
        ...world.enemies,
        ...generatedEnemies.enemies.filter((enemy) => !existingEnemyIds.has(enemy.id)),
      ],
    };
    const floorDrops = createMapFloorDropsForPositions(seed, freshPositions);
    if (Object.keys(floorDrops.cards).length > 0) {
      setRoomDrops((current) => {
        const next = { ...current };
        Object.entries(floorDrops.cards).forEach(([roomKey, cards]) => {
          next[roomKey] = [...(next[roomKey] ?? []), ...cards];
        });
        return next;
      });
    }
    if (Object.keys(floorDrops.consumables).length > 0) {
      setRoomConsumableDrops((current) => {
        const next = { ...current };
        Object.entries(floorDrops.consumables).forEach(([roomKey, consumables]) => {
          next[roomKey] = [...(next[roomKey] ?? []), ...consumables];
        });
        return next;
      });
    }
    return nextWorld;
  };

  const materializeVisibleMapContent = (
    position: MapPosition,
    seed = mapSeed,
    world: MapEnemyWorld = mapEnemyWorld,
    horizontalRadius = visionHorizontalRadius,
    verticalRadius = visionVerticalRadius,
  ) => {
    const visibleKeys = visibleMapRoomKeys(position, seed, horizontalRadius, verticalRadius);
    const visiblePositions = [...visibleKeys].map(parseMapRoomKey);
    return materializeMapContent(
      [...visiblePositions, ...positionsInSquare(position, 5)],
      seed,
      world,
      visiblePositions,
    );
  };

  const rememberPlayerVision = (
    position: MapPosition,
    seed = mapSeed,
    enemies = mapEnemyWorld.enemies,
    previousEnemies: typeof mapEnemyWorld.enemies = [],
    baseSeenRooms?: ReadonlySet<string> | null,
  ) => {
    const blessingBonus = (blessings.includes("vision") ? 1 : 0) + (blessings.includes("bioluminescence") ? 2 : 0);
    const mindEyeBonus = mindEyeMovesRemainingRef.current > 0 ? 2 : 0;
    const horizontalRadius = MAP_PLAYER_VISION_HORIZONTAL_RADIUS + blessingBonus + mindEyeBonus;
    const verticalRadius = MAP_PLAYER_VISION_VERTICAL_RADIUS + blessingBonus + mindEyeBonus;
    const visibleKeys = visibleMapRoomKeys(position, seed, horizontalRadius, verticalRadius);
    setSeenRooms((current) => new Set([...(baseSeenRooms ?? current), ...visibleKeys]));
    setMapEnemyCellMemory((current) => updateEnemyCellMemory(current, enemies, visibleKeys, previousEnemies));
  };


  const initializeMap = (nextSeed = createRandomMapSeed()) => {
  const initialVisibleKeys = visibleMapRoomKeys(MAP_START, nextSeed);
  const initialVisiblePositions = [...initialVisibleKeys].map(parseMapRoomKey);
  generatedMapRoomKeysRef.current = new Set();
  const initialWorld = materializeMapContent(
    [...initialVisiblePositions, ...positionsInSquare(MAP_START, 5)],
    nextSeed,
    { enemies: [] },
    initialVisiblePositions,
  );
  setMapSeed(nextSeed);
  setMapEnemyWorld(initialWorld);
  setMapEnemyCellMemory({});
  setSeenRooms(initialVisibleKeys);
  };

  return { materializeMapContent, materializeVisibleMapContent, rememberPlayerVision, initializeMap };
}
