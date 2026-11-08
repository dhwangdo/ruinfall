import { BASIC_CARD_POOL, RARE_CARD_POOL, SPECIAL_CARD_POOL, type Card } from "./cards.ts";
import {
  SEWER_ENCOUNTER_COUNT,
  getBossEncounterIndex,
  getEncounterRegionNumber,
  getEncounterSpawnPool,
  pickEncounterIndex,
} from "./enemies.ts";
import {
  EIGHT_DIRECTIONS,
  MAP_ENEMY_START_SAFE_RADIUS,
  MAP_PLAYER_VISION_HORIZONTAL_RADIUS,
  MAP_PLAYER_VISION_VERTICAL_RADIUS,
  chebyshevDistance,
  createMapEnemyWorld,
  type MapEnemyWorld,
} from "./mapEnemies.ts";
import { consumableTypeFromRoll, createConsumable, type Consumable } from "./rewards.ts";
import { generateMapRegion, type GeneratedMapRegion } from "./mapRegionGenerator.ts";
import { mapRandom } from "./mapGenerationMath.ts";
import { placeRegionLocations, placeRegionPortals, rollRegionLocationCounts, type RegionLocationCounts } from "./mapLocationPlacement.ts";

export type MapPosition = { x: number; y: number };
export type RoomType =
  | "void"
  | "rock"
  | "empty"
  | "blessing"
  | "shop"
  | "extractionShrine"
  | "recoveryShrine"
  | "vitalityShrine"
  | "mindEyeShrine"
  | "transformShrine"
  | "bloodShop"
  | "treasureChest"
  | "deckVault"
  | "stickerAltar"
  | "tinkerer"
  | "cardTransmuter"
  | "boss"
  | "portal"
  | "heal"
  | "partialHeal"
  | "safePortal";

export const REGION_COUNT = 7;
export const ROCK_BARRIER_HEIGHT = 5;
// Keep the definitions available while these locations are temporarily paused.
export const TEMPORARILY_DISABLED_ROOM_TYPES: ReadonlySet<RoomType> = new Set([
  "extractionShrine", "recoveryShrine", "vitalityShrine", "mindEyeShrine",
  "transformShrine", "treasureChest", "blessing", "heal", "partialHeal", "shop", "bloodShop",
]);
// Historical definition data is retained; active locations now use per-region quotas.
export const SPECIAL_NODE_DEFINITION_WEIGHTS: ReadonlyArray<{ type: RoomType; weight: number }> = [
  { type: "shop", weight: 0 },
  { type: "bloodShop", weight: 0 },
  { type: "extractionShrine", weight: 2 },
  { type: "vitalityShrine", weight: 0.5 },
  { type: "mindEyeShrine", weight: 1 },
  { type: "transformShrine", weight: 1 },
  { type: "treasureChest", weight: 0.5 },
  { type: "blessing", weight: 0.01 },
];
// Field cards and tickets are currently disabled; rewards and player-dropped items use separate paths.
export const FLOOR_CARD_DROP_CHANCE = 0;
export const FLOOR_CARD_ITEM_CHANCE = 0.8;
export const FLOOR_CARD_RARITY_CHANCES = {
  rare: 0.05,
  basic: 0.3,
  special: 0.65,
} as const;
// 212 x 47 keeps the former 321 x 31 area within 0.14%, with roughly 1.5x the height.
export const DUNGEON_MIN_X = -106;
export const DUNGEON_MAX_X = 105;
export const BOSS_REGION_COUNT = 3;
const SAFE_AREA_HEAL_OFFSET_X = 0;
const SAFE_AREA_PORTAL_OFFSET_X = 1;
const SAFE_AREA_CONNECTOR_OFFSET_X = -2;
export const SAFE_AREA_LAYOUT_MIN_OFFSET_X = -6;
export const SAFE_AREA_LAYOUT_MAX_OFFSET_X = 2;
const SAFE_AREA_SPAWN_OFFSET_X = SAFE_AREA_LAYOUT_MIN_OFFSET_X + 1;
const SAFE_AREA_PARTIAL_HEAL_OFFSET_X = SAFE_AREA_SPAWN_OFFSET_X + 1;
const SAFE_AREA_LEFT_CROSS_CENTER_OFFSET_X = SAFE_AREA_PARTIAL_HEAL_OFFSET_X;
export const MAP_COLUMNS = DUNGEON_MAX_X - DUNGEON_MIN_X + 1;
export const REGION_HEIGHT = 47;
export const MAP_ROWS = REGION_COUNT * REGION_HEIGHT + (REGION_COUNT - 1) * ROCK_BARRIER_HEIGHT;
export const MAP_START: MapPosition = { x: 0, y: 0 };

export function mapRoomKey(position: MapPosition) {
  return `${position.x}:${position.y}`;
}

export function parseMapRoomKey(roomKey: string): MapPosition {
  const [x, y] = roomKey.split(":").map(Number);
  return { x, y };
}

export function seededRoll(position: MapPosition, seed: number, salt = 0) {
  let hash = Math.imul(position.x + 17 + salt, 374761393)
    ^ Math.imul(position.y + 29, 668265263)
    ^ Math.imul(seed + 11, 1442695041);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

export function regionStartY(regionIndex: number) {
  return regionIndex * (REGION_HEIGHT + ROCK_BARRIER_HEIGHT);
}

export function regionHeight(_regionIndex: number) {
  void _regionIndex;
  return REGION_HEIGHT;
}

export function getDungeonRegionIndex(position: MapPosition) {
  if (
    position.x < DUNGEON_MIN_X
    || position.x > DUNGEON_MAX_X
    || position.y < 0
  ) return null;
  for (let regionIndex = 0; regionIndex < REGION_COUNT; regionIndex += 1) {
    const startY = regionStartY(regionIndex);
    if (position.y >= startY && position.y < startY + regionHeight(regionIndex)) return regionIndex;
  }
  return null;
}

export function safeAreaCenterX(regionIndex: number, seed: number) {
  const leftSide = seededRoll({ x: regionIndex, y: 0 }, seed, 8201) < 0.5;
  const minX = leftSide ? DUNGEON_MIN_X - SAFE_AREA_LAYOUT_MIN_OFFSET_X : 57;
  const maxX = leftSide ? -53 : DUNGEON_MAX_X - SAFE_AREA_LAYOUT_MAX_OFFSET_X;
  return minX + Math.floor(seededRoll({ x: regionIndex, y: 0 }, seed, 8202) * (maxX - minX + 1));
}

export function safeAreaCenterY(regionIndex: number, seed: number) {
  const baseY = regionStartY(regionIndex) + Math.floor(regionHeight(regionIndex) / 2);
  const offsetY = Math.floor(seededRoll({ x: regionIndex, y: 0 }, seed, 8203) * 5) - 2;
  return baseY + offsetY;
}

export function getSafeAreaRegionIndex(position: MapPosition, seed: number) {
  for (let regionIndex = 0; regionIndex < REGION_COUNT; regionIndex += 1) {
    const centerX = safeAreaCenterX(regionIndex, seed);
    const centerY = safeAreaCenterY(regionIndex, seed);
    const isCenterRow = position.y === centerY
      && position.x >= centerX + SAFE_AREA_LAYOUT_MIN_OFFSET_X + 1
      && position.x <= centerX + SAFE_AREA_PORTAL_OFFSET_X;
    const isVerticalArm = (
      position.x === centerX + SAFE_AREA_LEFT_CROSS_CENTER_OFFSET_X
      || position.x === centerX + SAFE_AREA_HEAL_OFFSET_X
    ) && Math.abs(position.y - centerY) === 1;
    if (isCenterRow || isVerticalArm) return regionIndex;
  }
  return null;
}

export function isSafeAreaPosition(position: MapPosition, seed: number) {
  return getSafeAreaRegionIndex(position, seed) !== null;
}

export function isSafeAreaBoundaryPosition(position: MapPosition, regionIndex: number, seed: number) {
  return isSafeAreaBoundaryGeometryPosition(position, regionIndex, seed)
    && getRoomType(position, seed) === "rock";
}

export function isSafeAreaBoundaryGeometryPosition(position: MapPosition, regionIndex: number, seed: number) {
  if (
    getSafeAreaLayoutRegionIndex(position, seed) !== regionIndex
    || getSafeAreaRegionIndex(position, seed) === regionIndex
  ) return false;
  const offsetX = position.x - safeAreaCenterX(regionIndex, seed);
  const offsetY = position.y - safeAreaCenterY(regionIndex, seed);
  const isOuterCorner = (
    (offsetX === SAFE_AREA_LAYOUT_MIN_OFFSET_X || offsetX === SAFE_AREA_LAYOUT_MAX_OFFSET_X)
    && Math.abs(offsetY) === 2
  );
  const isUnusedCentralWall = offsetX === SAFE_AREA_CONNECTOR_OFFSET_X && Math.abs(offsetY) === 2;
  return !isOuterCorner && !isUnusedCentralWall;
}

export function getSafeAreaLayoutRegionIndex(position: MapPosition, seed: number) {
  for (let regionIndex = 0; regionIndex < REGION_COUNT; regionIndex += 1) {
    const centerX = safeAreaCenterX(regionIndex, seed);
    const centerY = safeAreaCenterY(regionIndex, seed);
    if (
      position.x >= centerX + SAFE_AREA_LAYOUT_MIN_OFFSET_X
      && position.x <= centerX + SAFE_AREA_LAYOUT_MAX_OFFSET_X
      && Math.abs(position.y - centerY) <= 2
    ) return regionIndex;
  }
  return null;
}

export function safeAreaEntry(regionIndex: number, seed: number): MapPosition {
  const centerX = safeAreaCenterX(regionIndex, seed);
  return { x: centerX + SAFE_AREA_SPAWN_OFFSET_X, y: safeAreaCenterY(regionIndex, seed) };
}

export function nextRegionEntry(regionIndex: number): MapPosition {
  return { x: 0, y: regionStartY(Math.min(REGION_COUNT - 1, regionIndex + 1)) };
}

// Base terrain depends only on the seed. Runtime changes (bombs, used shrines,
// defeated bosses) are applied by the caller and must not enter this cache.
const geometryBySeed = new Map<number, {
  rooms: Map<string, RoomType>;
  regions: Map<number, GeneratedDungeonRegion>;
}>();

export type GeneratedDungeonRegion = GeneratedMapRegion & {
  ordinarySites: ReadonlyMap<number, RoomType>;
  locationCounts: RegionLocationCounts;
};

function mapGeometry(seed: number) {
  let geometry = geometryBySeed.get(seed);
  if (!geometry) {
    if (geometryBySeed.size >= 2) geometryBySeed.delete(geometryBySeed.keys().next().value!);
    geometry = { rooms: new Map(), regions: new Map() };
    geometryBySeed.set(seed, geometry);
  }
  return geometry;
}

/** Region geometry is built once. Exploration, destruction and opened vaults stay outside it. */
export function getGeneratedDungeonRegion(seed: number, regionIndex: number): GeneratedDungeonRegion {
  if (!Number.isInteger(regionIndex) || regionIndex < 0 || regionIndex >= REGION_COUNT) throw new Error("Invalid dungeon region");
  const regions = mapGeometry(seed).regions;
  const existing = regions.get(regionIndex);
  if (existing) return existing;
  const startY = regionStartY(regionIndex), height = regionHeight(regionIndex);
  const blocked = new Uint8Array(MAP_COLUMNS * height);
  const centerX = safeAreaCenterX(regionIndex, seed), centerY = safeAreaCenterY(regionIndex, seed);
  for (let y = centerY - 2; y <= centerY + 2; y++) {
    for (let x = centerX + SAFE_AREA_LAYOUT_MIN_OFFSET_X; x <= centerX + SAFE_AREA_LAYOUT_MAX_OFFSET_X; x++) {
      blocked[(y - startY) * MAP_COLUMNS + x - DUNGEON_MIN_X] = 1;
    }
  }
  const locationCounts = rollRegionLocationCounts(seed, regionIndex);
  const portals = placeRegionPortals({ width: MAP_COLUMNS, height, blocked, count: locationCounts.portal,
    random: mapRandom(seed ^ Math.imul(regionIndex + 1, 0x217ad5)) });
  const layout = generateMapRegion({ seed: seed ^ Math.imul(regionIndex + 1, 0x9e3779b9), region: regionIndex + 1,
    width: MAP_COLUMNS, height, start: { x: -DUNGEON_MIN_X, y: 0 }, portals, blocked });
  const ordinarySites = placeRegionLocations(layout, locationCounts, seed ^ Math.imul(regionIndex + 1, 7302));
  const result = { ...layout, ordinarySites, locationCounts };
  regions.set(regionIndex, result);
  return result;
}

export function isMainDungeonFloor(position: MapPosition, seed: number) {
  const region = getDungeonRegionIndex(position);
  if (region === null) return false;
  const index = (position.y - regionStartY(region)) * MAP_COLUMNS + position.x - DUNGEON_MIN_X;
  return getGeneratedDungeonRegion(seed, region).main[index] === 1;
}

function getFixedRoomType(position: MapPosition, seed: number): RoomType | null {
  if (position.x === MAP_START.x && position.y === MAP_START.y) return "empty";
  const safeRegion = getSafeAreaRegionIndex(position, seed);
  if (safeRegion !== null) {
    const centerX = safeAreaCenterX(safeRegion, seed);
    const centerY = safeAreaCenterY(safeRegion, seed);
    if (position.x === centerX + SAFE_AREA_PARTIAL_HEAL_OFFSET_X && position.y === centerY) return "partialHeal";
    if (position.x === centerX + SAFE_AREA_HEAL_OFFSET_X && position.y === centerY - 1) return "blessing";
    if (position.x === centerX + SAFE_AREA_HEAL_OFFSET_X && position.y === centerY) return "heal";
    if (position.x === centerX + SAFE_AREA_HEAL_OFFSET_X && position.y === centerY + 1) return "empty";
    if (position.x === centerX + SAFE_AREA_PORTAL_OFFSET_X && position.y === centerY) return "safePortal";
    if (safeRegion < BOSS_REGION_COUNT
      && position.x === centerX + SAFE_AREA_CONNECTOR_OFFSET_X
      && position.y === centerY) return "boss";
    return "empty";
  }
  const safeLayoutRegion = getSafeAreaLayoutRegionIndex(position, seed);
  if (safeLayoutRegion !== null) {
    if (!isSafeAreaBoundaryGeometryPosition(position, safeLayoutRegion, seed)) return "empty";
    return "rock";
  }
  if (position.x >= DUNGEON_MIN_X && position.x <= DUNGEON_MAX_X) {
    if (position.y >= -ROCK_BARRIER_HEIGHT && position.y < 0) return "rock";
    const regionIndex = getDungeonRegionIndex(position);
    if (regionIndex !== null) {
      const localY = position.y - regionStartY(regionIndex);
      if (localY === 0 && position.x === 0) return "empty";
      return null;
    }
    for (let regionIndex = 0; regionIndex < REGION_COUNT - 1; regionIndex += 1) {
      const barrierStart = regionStartY(regionIndex) + regionHeight(regionIndex);
      if (position.y >= barrierStart && position.y < barrierStart + ROCK_BARRIER_HEIGHT) return "rock";
    }
  }
  return "void";
}

export function getRoomType(position: MapPosition, seed: number): RoomType {
  const rooms = mapGeometry(seed).rooms;
  const key = mapRoomKey(position);
  const cached = rooms.get(key);
  if (cached !== undefined) return cached;
  const type = generateRoomType(position, seed);
  if (type !== "void") rooms.set(key, type);
  return type;
}

function generateRoomType(position: MapPosition, seed: number): RoomType {
  const fixedType = getFixedRoomType(position, seed);
  // Only fixed safe-area facilities return these types; random nodes stay paused.
  if (fixedType === "heal" || fixedType === "partialHeal" || fixedType === "blessing") return fixedType;
  if (fixedType !== null) return TEMPORARILY_DISABLED_ROOM_TYPES.has(fixedType) ? "empty" : fixedType;
  const region = getDungeonRegionIndex(position)!;
  const layout = getGeneratedDungeonRegion(seed, region);
  const index = (position.y - regionStartY(region)) * MAP_COLUMNS + position.x - DUNGEON_MIN_X;
  if (!layout.floor[index]) return "rock";
  const type = layout.landmarks.get(index) ?? layout.ordinarySites.get(index) ?? "empty";
  return TEMPORARILY_DISABLED_ROOM_TYPES.has(type) ? "empty" : type;
}

export function isWalkableRoom(type: RoomType) {
  return type !== "rock" && type !== "void";
}

export function visibleMapRoomKeys(
  center: MapPosition,
  seed: number,
  horizontalRadius = MAP_PLAYER_VISION_HORIZONTAL_RADIUS,
  verticalRadius = MAP_PLAYER_VISION_VERTICAL_RADIUS,
) {
  const candidates = new Map<string, { position: MapPosition; type: RoomType }>();
  for (let offsetY = -verticalRadius; offsetY <= verticalRadius; offsetY += 1) {
    for (let offsetX = -horizontalRadius; offsetX <= horizontalRadius; offsetX += 1) {
      const position = { x: center.x + offsetX, y: center.y + offsetY };
      const type = getRoomType(position, seed);
      if (type !== "void") candidates.set(mapRoomKey(position), { position, type });
    }
  }
  const centerKey = mapRoomKey(center);
  const centerCell = candidates.get(centerKey);
  if (!centerCell) return new Set<string>();

  const visible = new Set<string>([centerKey]);
  const traversed = new Set<string>([centerKey]);
  const distanceByKey = new Map<string, number>([[centerKey, 0]]);
  const maximumDistance = Math.max(horizontalRadius, verticalRadius);
  const queue = [centerCell.position];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const currentKey = mapRoomKey(current);
    const currentDistance = distanceByKey.get(currentKey) ?? 0;
    if (currentDistance >= maximumDistance) continue;
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = mapRoomKey(next);
      const nextCell = candidates.get(nextKey);
      if (!nextCell) continue;
      const nextDistance = currentDistance + 1;
      if (
        nextDistance > maximumDistance
        || Math.abs(next.x - center.x) > horizontalRadius
        || Math.abs(next.y - center.y) > verticalRadius
      ) continue;
      visible.add(nextKey);
      if (!isWalkableRoom(nextCell.type) || traversed.has(nextKey)) continue;
      traversed.add(nextKey);
      distanceByKey.set(nextKey, nextDistance);
      queue.push(nextCell.position);
    }
  }
  return visible;
}

export function isMapEnemySpawnCell(position: MapPosition, seed: number) {
  const regionIndex = getDungeonRegionIndex(position);
  return regionIndex !== null
    && chebyshevDistance(position, { x: MAP_START.x, y: regionStartY(regionIndex) }) > MAP_ENEMY_START_SAFE_RADIUS
    && getEncounterSpawnPool(regionIndex, 1).length > 0
    && !isSafeAreaPosition(position, seed)
    && isMainDungeonFloor(position, seed)
    && getRoomType(position, seed) === "empty";
}

export function createMapEnemyWorldForPositions(
  seed: number,
  positions: readonly MapPosition[],
): MapEnemyWorld {
  const spawnCells = positions.filter((position) => isMapEnemySpawnCell(position, seed));
  const world = createMapEnemyWorld(spawnCells, seed, SEWER_ENCOUNTER_COUNT);
  const bosses = Array.from({ length: BOSS_REGION_COUNT }, (_, regionIndex) => {
    const centerX = safeAreaCenterX(regionIndex, seed);
    const centerY = safeAreaCenterY(regionIndex, seed);
    return {
      id: `map-boss-${regionIndex}`,
      position: { x: centerX + SAFE_AREA_CONNECTOR_OFFSET_X, y: centerY },
      encounterIndex: getBossEncounterIndex(regionIndex)!,
      awareness: "alerted" as const,
      isBoss: true,
    };
  }).filter((boss) => positions.some((position) => mapRoomKey(position) === mapRoomKey(boss.position)));
  return {
    enemies: [
      ...world.enemies.map((enemy) => {
        const regionIndex = getDungeonRegionIndex(enemy.position) ?? -1;
        const candidates = getEncounterSpawnPool(regionIndex, seededRoll(enemy.position, seed, 4000));
        const roll = seededRoll(enemy.position, seed, 4001);
        const encounterIndex = pickEncounterIndex(candidates, roll);
        return {
          ...enemy,
          encounterIndex,
          permanentSleep: getEncounterRegionNumber(encounterIndex) > regionIndex + 1,
        };
      }),
      ...bosses,
    ],
  };
}

export function createPreGeneratedMapEnemyWorld(seed: number): MapEnemyWorld {
  const allPositions: MapPosition[] = [];
  for (let y = 0; y < MAP_ROWS; y += 1) {
    for (let x = DUNGEON_MIN_X; x <= DUNGEON_MAX_X; x += 1) {
      allPositions.push({ x, y });
    }
  }
  return createMapEnemyWorldForPositions(seed, allPositions);
}

export function createMapFloorDropsForPositions(
  seed: number,
  positions: readonly MapPosition[],
) {
  const cards: Record<string, Card[]> = {};
  const consumables: Record<string, Consumable[]> = {};
  if (FLOOR_CARD_DROP_CHANCE <= 0) return { cards, consumables };
  for (const position of positions) {
    if (!isMainDungeonFloor(position, seed) || getRoomType(position, seed) !== "empty"
      || seededRoll(position, seed, 7201) >= FLOOR_CARD_DROP_CHANCE) continue;
    const roomKey = mapRoomKey(position);
    if (seededRoll(position, seed, 7202) < FLOOR_CARD_ITEM_CHANCE) {
      const rarityRoll = seededRoll(position, seed, 7203);
      const pool = rarityRoll < FLOOR_CARD_RARITY_CHANCES.rare
        ? RARE_CARD_POOL
        : rarityRoll < FLOOR_CARD_RARITY_CHANCES.rare + FLOOR_CARD_RARITY_CHANCES.basic
        ? BASIC_CARD_POOL
        : SPECIAL_CARD_POOL.filter((card) => card.rarity === "special");
      const blueprint = pool[Math.floor(seededRoll(position, seed, 7204) * pool.length)];
      const cellId = (position.y * MAP_COLUMNS) + (position.x - DUNGEON_MIN_X);
      cards[roomKey] = [{ ...blueprint, id: 1_000_000 + cellId, revealed: false }];
    } else {
      const ticketRoll = seededRoll(position, seed, 7203);
      const type = consumableTypeFromRoll(ticketRoll);
      consumables[roomKey] = [createConsumable(type, `map-ticket-${position.x}-${position.y}`)];
    }
  }
  return { cards, consumables };
}

export function createPreGeneratedMapFloorDrops(seed: number) {
  const allPositions: MapPosition[] = [];
  for (let y = 0; y < MAP_ROWS; y += 1) {
    for (let x = DUNGEON_MIN_X; x <= DUNGEON_MAX_X; x += 1) {
      allPositions.push({ x, y });
    }
  }
  return createMapFloorDropsForPositions(seed, allPositions);
}

export function buildKnownRoomRoutes(
  start: MapPosition,
  knownRooms: Set<string>,
  seed: number,
  roomTypeAt: (position: MapPosition) => RoomType = (position) => getRoomType(position, seed),
) {
  const startKey = mapRoomKey(start);
  const previous = new Map<string, string | null>([[startKey, null]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = mapRoomKey(next);
      if (previous.has(nextKey) || !knownRooms.has(nextKey)) continue;
      if (!isWalkableRoom(roomTypeAt(next))) continue;
      previous.set(nextKey, mapRoomKey(current));
      queue.push(next);
    }
  }
  return previous;
}

export function findKnownRoomRoute(
  start: MapPosition,
  target: MapPosition,
  knownRooms: Set<string>,
  roomTypeAt: (position: MapPosition) => RoomType,
) {
  const startKey = mapRoomKey(start);
  const targetKey = mapRoomKey(target);
  if (startKey === targetKey) return [start];
  if (!knownRooms.has(targetKey) || !isWalkableRoom(roomTypeAt(target))) return null;

  type RouteNode = {
    position: MapPosition;
    key: string;
    steps: number;
    turns: number;
    directionIndex: number | null;
    priority: number;
    order: number;
  };
  const previous = new Map<string, string | null>([[startKey, null]]);
  const bestSteps = new Map<string, number>([[startKey, 0]]);
  const bestTurns = new Map<string, number>([[startKey, 0]]);
  const queue: RouteNode[] = [{
    position: start,
    key: startKey,
    steps: 0,
    turns: 0,
    directionIndex: null,
    priority: chebyshevDistance(start, target),
    order: 0,
  }];
  let order = 1;

  while (queue.length > 0) {
    queue.sort((left, right) =>
      left.priority - right.priority
      || left.turns - right.turns
      || left.steps - right.steps
      || left.order - right.order);
    const current = queue.shift()!;
    if (current.key === targetKey) {
      const reversed: MapPosition[] = [];
      let cursor: string | null = targetKey;
      while (cursor) {
        reversed.push(parseMapRoomKey(cursor));
        cursor = previous.get(cursor) ?? null;
      }
      return reversed.reverse();
    }

    for (let directionIndex = 0; directionIndex < EIGHT_DIRECTIONS.length; directionIndex += 1) {
      const direction = EIGHT_DIRECTIONS[directionIndex];
      const next = { x: current.position.x + direction.x, y: current.position.y + direction.y };
      const nextKey = mapRoomKey(next);
      if (!knownRooms.has(nextKey) || !isWalkableRoom(roomTypeAt(next))) continue;
      const steps = current.steps + 1;
      const turns = current.turns
        + (current.directionIndex === null || current.directionIndex === directionIndex ? 0 : 1);
      const knownSteps = bestSteps.get(nextKey);
      const knownTurns = bestTurns.get(nextKey);
      if (
        knownSteps !== undefined
        && (steps > knownSteps || (steps === knownSteps && turns >= (knownTurns ?? Infinity)))
      ) continue;
      bestSteps.set(nextKey, steps);
      bestTurns.set(nextKey, turns);
      previous.set(nextKey, current.key);
      queue.push({
        position: next,
        key: nextKey,
        steps,
        turns,
        directionIndex,
        priority: steps + chebyshevDistance(next, target),
        order,
      });
      order += 1;
    }
  }
  return null;
}

export function routeToRoom(target: MapPosition, routes: Map<string, string | null>) {
  const targetKey = mapRoomKey(target);
  if (!routes.has(targetKey)) return null;
  const reversed: MapPosition[] = [];
  let cursor: string | null = targetKey;
  while (cursor) {
    reversed.push(parseMapRoomKey(cursor));
    cursor = routes.get(cursor) ?? null;
  }
  return reversed.reverse();
}

export function getRegionNumber(position: MapPosition, seed: number) {
  const dungeonRegion = getDungeonRegionIndex(position);
  if (dungeonRegion !== null) return dungeonRegion + 1;
  const safeRegion = getSafeAreaRegionIndex(position, seed);
  return (safeRegion ?? 0) + 1;
}

export function isHigherRegionMapEnemy(encounterIndex: number, position: MapPosition, seed: number) {
  return getEncounterRegionNumber(encounterIndex) > getRegionNumber(position, seed);
}
