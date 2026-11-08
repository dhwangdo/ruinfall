import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { MapEnemyWorld, MapEnemyCellMemory } from "../game/mapEnemies";
import type { MapBomb } from "../game/mapEffects";
import { MAP_START, getRoomType, getSafeAreaRegionIndex, mapRoomKey, type MapPosition } from "../game/mapRules";
import type { PreparedRunRestore } from "../game/runSaveState";

/** Terrain changes and exploration memory are owned together, independently of camera/UI state. */
export function useRunWorld() {
  const [mapSeed, setMapSeed] = useState(1);

  const [mapPosition, setMapPosition] = useState<MapPosition>(MAP_START);

  const [seenRooms, setSeenRooms] = useState<Set<string>>(
    () => new Set([mapRoomKey(MAP_START)]),
  );

  const [safeAreaEntrySeenRooms, setSafeAreaEntrySeenRooms] = useState<Set<string> | null>(null);

  const [bloodstainedRooms, setBloodstainedRooms] = useState<Set<string>>(() => new Set());

  const [mapEnemyWorld, setMapEnemyWorld] = useState<MapEnemyWorld>(() => ({
    enemies: [],
  }));

  const [defeatedBossRegions, setDefeatedBossRegions] = useState<Set<number>>(() => new Set());

  const [mapEnemyCellMemory, setRenderedMapEnemyCellMemory] = useState<MapEnemyCellMemory>({});
  const mapEnemyCellMemoryRef = useRef<MapEnemyCellMemory>({});
  const setMapEnemyCellMemory = useCallback<Dispatch<SetStateAction<MapEnemyCellMemory>>>((update) => {
    const next = typeof update === "function" ? update(mapEnemyCellMemoryRef.current) : update;
    mapEnemyCellMemoryRef.current = next;
    setRenderedMapEnemyCellMemory(next);
  }, []);

  const [mapBombs, setMapBombs] = useState<MapBomb[]>([]);

  const mapBombsRef = useRef<MapBomb[]>([]);

  const [destroyedShopRooms, setDestroyedShopRooms] = useState<Set<string>>(() => new Set());

  const [collapsedExtractionShrineRooms, setCollapsedExtractionShrineRooms] = useState<Set<string>>(() => new Set());

  const [collapsedRecoveryShrineRooms, setCollapsedRecoveryShrineRooms] = useState<Set<string>>(() => new Set());

  const [collapsedVitalityShrineRooms, setCollapsedVitalityShrineRooms] = useState<Set<string>>(() => new Set());

  const [collapsedMindEyeShrineRooms, setCollapsedMindEyeShrineRooms] = useState<Set<string>>(() => new Set());

  const [collapsedTransformShrineRooms, setCollapsedTransformShrineRooms] = useState<Set<string>>(() => new Set());


  const [collapsedTreasureChestRooms, setCollapsedTreasureChestRooms] = useState<Set<string>>(() => new Set());

  const [openedDeckVaultRooms, setRenderedOpenedDeckVaultRooms] = useState<Set<string>>(() => new Set());
  const openedDeckVaultRoomsRef = useRef<Set<string>>(new Set());
  const setOpenedDeckVaultRooms = useCallback<Dispatch<SetStateAction<Set<string>>>>((update) => {
    const next = typeof update === "function" ? update(openedDeckVaultRoomsRef.current) : update;
    openedDeckVaultRoomsRef.current = next;
    setRenderedOpenedDeckVaultRooms(next);
  }, []);

  const [usedHealRooms, setUsedHealRooms] = useState<Set<string>>(() => new Set());

  const [usedBlessingRooms, setUsedBlessingRooms] = useState<Set<string>>(() => new Set());

  const [rockBombHits, setRockBombHits] = useState<Record<string, number>>({});
  const [roomServiceUses, setRoomServiceUses] = useState<Record<string, number>>({});

  const generatedMapRoomKeysRef = useRef<Set<string>>(new Set([mapRoomKey(MAP_START)]));

  const setMapBombsSynced = (bombs: MapBomb[]) => {
    mapBombsRef.current = bombs;
    setMapBombs(bombs);
  };
  const effectiveRoomType = useCallback((position: MapPosition) => {
    const baseType = getRoomType(position, mapSeed);
    const roomKey = mapRoomKey(position);
    const safeRegion = getSafeAreaRegionIndex(position, mapSeed);
    if (baseType === "boss" && safeRegion !== null && defeatedBossRegions.has(safeRegion)) return "empty";
    if ((baseType === "shop" || baseType === "bloodShop") && destroyedShopRooms.has(roomKey)) return "empty";
    if (baseType === "extractionShrine" && collapsedExtractionShrineRooms.has(roomKey)) return "empty";
    if (baseType === "recoveryShrine" && collapsedRecoveryShrineRooms.has(roomKey)) return "empty";
    if (baseType === "vitalityShrine" && collapsedVitalityShrineRooms.has(roomKey)) return "empty";
    if (baseType === "mindEyeShrine" && collapsedMindEyeShrineRooms.has(roomKey)) return "empty";
    if (baseType === "transformShrine" && collapsedTransformShrineRooms.has(roomKey)) return "empty";
    if (baseType === "treasureChest" && collapsedTreasureChestRooms.has(roomKey)) return "empty";
    if (baseType === "deckVault" && openedDeckVaultRooms.has(roomKey)) return "empty";
    if ((baseType === "heal" || baseType === "partialHeal") && usedHealRooms.has(roomKey)) return "empty";
    if (baseType === "blessing" && usedBlessingRooms.has(roomKey)) return "empty";
    if (baseType === "rock" && (rockBombHits[roomKey] ?? 0) >= 3) return "empty";
    return baseType;
  }, [mapSeed, defeatedBossRegions, destroyedShopRooms, collapsedExtractionShrineRooms,
    collapsedRecoveryShrineRooms, collapsedVitalityShrineRooms, collapsedMindEyeShrineRooms,
    collapsedTransformShrineRooms, collapsedTreasureChestRooms, openedDeckVaultRooms,
    usedHealRooms, usedBlessingRooms, rockBombHits]);

  const saveState = useMemo(() => ({
    mapSeed, mapPosition, seenRooms, safeAreaEntrySeenRooms, mapEnemyWorld, defeatedBossRegions,
    mapEnemyCellMemory, mapBombs, destroyedShopRooms, collapsedExtractionShrineRooms,
    collapsedRecoveryShrineRooms, collapsedVitalityShrineRooms, collapsedMindEyeShrineRooms,
    collapsedTransformShrineRooms, collapsedTreasureChestRooms, openedDeckVaultRooms,
    usedHealRooms, usedBlessingRooms, rockBombHits, bloodstainedRooms, roomServiceUses,
  }), [
    mapSeed, mapPosition, seenRooms, safeAreaEntrySeenRooms, mapEnemyWorld, defeatedBossRegions,
    mapEnemyCellMemory, mapBombs, destroyedShopRooms, collapsedExtractionShrineRooms,
    collapsedRecoveryShrineRooms, collapsedVitalityShrineRooms, collapsedMindEyeShrineRooms,
    collapsedTransformShrineRooms, collapsedTreasureChestRooms, openedDeckVaultRooms,
    usedHealRooms, usedBlessingRooms, rockBombHits, bloodstainedRooms, roomServiceUses,
  ]);
  const restoreWorld = useCallback((state: PreparedRunRestore) => {
    setMapSeed(state.mapSeed);
    setMapPosition(state.mapPosition);
    setSeenRooms(new Set(state.seenRooms));
    setBloodstainedRooms(new Set(state.bloodstainedRooms));
    setSafeAreaEntrySeenRooms(state.safeAreaEntrySeenRooms ? new Set(state.safeAreaEntrySeenRooms) : null);
    setDefeatedBossRegions(new Set(state.defeatedBossRegions));
    setMapEnemyCellMemory(state.mapEnemyCellMemory);
    setMapBombs(state.mapBombs);
    setDestroyedShopRooms(new Set(state.destroyedShopRooms));
    setCollapsedExtractionShrineRooms(new Set(state.collapsedExtractionShrineRooms));
    setCollapsedRecoveryShrineRooms(new Set(state.collapsedRecoveryShrineRooms));
    setCollapsedVitalityShrineRooms(new Set(state.collapsedVitalityShrineRooms));
    setCollapsedMindEyeShrineRooms(new Set(state.collapsedMindEyeShrineRooms));
    setCollapsedTransformShrineRooms(new Set(state.collapsedTransformShrineRooms));
    setCollapsedTreasureChestRooms(new Set(state.collapsedTreasureChestRooms));
    setOpenedDeckVaultRooms(new Set(state.openedDeckVaultRooms));
    setUsedHealRooms(new Set(state.usedHealRooms));
    setUsedBlessingRooms(new Set(state.usedBlessingRooms));
    setRockBombHits(state.rockBombHits);
    setRoomServiceUses(state.roomServiceUses);
    mapBombsRef.current = state.mapBombs;
    generatedMapRoomKeysRef.current = new Set([
      ...state.seenRooms, ...Object.keys(state.roomDrops), ...Object.keys(state.roomConsumableDrops), ...Object.keys(state.roomDeckVaults),
      ...Object.keys(state.roomGoldPiles),
    ]);
  }, [setOpenedDeckVaultRooms, setMapEnemyCellMemory]);
  return {
    mapSeed, setMapSeed, mapPosition, setMapPosition, seenRooms, setSeenRooms,
    bloodstainedRooms, setBloodstainedRooms,
    safeAreaEntrySeenRooms, setSafeAreaEntrySeenRooms, mapEnemyWorld, setMapEnemyWorld,
    defeatedBossRegions, setDefeatedBossRegions, mapEnemyCellMemory, mapEnemyCellMemoryRef, setMapEnemyCellMemory,
    mapBombs, setMapBombs, mapBombsRef, destroyedShopRooms, setDestroyedShopRooms,
    collapsedExtractionShrineRooms, setCollapsedExtractionShrineRooms, collapsedRecoveryShrineRooms,
    setCollapsedRecoveryShrineRooms, collapsedVitalityShrineRooms, setCollapsedVitalityShrineRooms,
    collapsedMindEyeShrineRooms, setCollapsedMindEyeShrineRooms, collapsedTransformShrineRooms,
    setCollapsedTransformShrineRooms,
    collapsedTreasureChestRooms,
    openedDeckVaultRooms, openedDeckVaultRoomsRef, setOpenedDeckVaultRooms,
    setCollapsedTreasureChestRooms, usedHealRooms, setUsedHealRooms, usedBlessingRooms,
    setUsedBlessingRooms, rockBombHits, setRockBombHits, roomServiceUses, setRoomServiceUses, generatedMapRoomKeysRef,
    setMapBombsSynced, effectiveRoomType, saveState, restoreWorld,
  };
}
export type RunWorld = ReturnType<typeof useRunWorld>;
