import {
  EIGHT_DIRECTIONS, MAP_ENEMY_ALERT_RESET_DISTANCE,
  MAP_PLAYER_VISION_HORIZONTAL_RADIUS, MAP_PLAYER_VISION_VERTICAL_RADIUS,
  mapEnemyDetectionRadius, rememberedMapEnemies, type GridBounds, type MapEnemy, type MapEnemyCellMemory,
} from "./mapEnemies.ts";
import { DUNGEON_MIN_X, DUNGEON_MAX_X, MAP_ROWS, ROCK_BARRIER_HEIGHT,
  isWalkableRoom, mapRoomKey, parseMapRoomKey, type MapPosition, type RoomType } from "./mapRules.ts";

/** Enemies are visible observations or remembered snapshots, never hidden live positions. */
export function createAutoExploreBlockedRooms(
  enemies: readonly MapEnemy[],
  knownRooms: ReadonlySet<string>,
  roomTypeAt: (position: MapPosition) => RoomType,
  detectionDistanceReduction = 0,
  canEnemyEnter: (position: MapPosition) => boolean = () => true,
) {
  const blocked = new Set<string>();
  for (const enemy of enemies) {
    const radius = enemy.isBoss || enemy.permanentSleep ? 0
      : enemy.awareness === "alerted" ? MAP_ENEMY_ALERT_RESET_DISTANCE - 1
        : mapEnemyDetectionRadius(detectionDistanceReduction) + (enemy.awareness === "awake" ? 1 : 0);
    const startKey = mapRoomKey(enemy.position);
    const visited = new Set([startKey]);
    const queue = [{ position: enemy.position, distance: 0 }];
    blocked.add(startKey);
    for (let index = 0; index < queue.length; index++) {
      const { position, distance } = queue[index];
      if (distance >= radius) continue;
      for (const direction of EIGHT_DIRECTIONS) {
        const next = { x: position.x + direction.x, y: position.y + direction.y };
        const key = mapRoomKey(next);
        // Unknown terrain is conservatively passable for threat estimates.
        if (visited.has(key) || (knownRooms.has(key) && !isWalkableRoom(roomTypeAt(next)))) continue;
        visited.add(key);
        blocked.add(key);
        // Safe-area cells can be a player endpoint, but enemies cannot cross them.
        if (!knownRooms.has(key) || canEnemyEnter(next)) queue.push({ position: next, distance: distance + 1 });
      }
    }
  }
  return blocked;
}

export type AutoExploreProgress = {
  threatHistory: Map<string, MapEnemy>;
  surveyedRooms: Set<string>;
  avoidedRooms: Set<string>;
  targetKey: string | null;
  route: MapPosition[];
  stopReason: "complete" | "blocked" | "unsafe" | null;
};

export function createAutoExploreProgress(): AutoExploreProgress {
  return { threatHistory: new Map(), surveyedRooms: new Set(), avoidedRooms: new Set(), targetKey: null, route: [], stopReason: null };
}

/** Retain observed threats, but recalculate their reach when newly discovered walls change it. */
export function createRememberedAutoExploreBlockedRooms(
  memory: MapEnemyCellMemory,
  knownRooms: ReadonlySet<string>,
  roomTypeAt: (position: MapPosition) => RoomType,
  progress?: AutoExploreProgress,
  detectionDistanceReduction = 0,
  canEnemyEnter: (position: MapPosition) => boolean = () => true,
) {
  const observed = rememberedMapEnemies(memory);
  if (progress) {
    const rememberedIds = new Set(observed.map(enemy => enemy.id));
    for (const [key, enemy] of progress.threatHistory) {
      if (!rememberedIds.has(enemy.id)) progress.threatHistory.delete(key);
    }
    for (const enemy of observed) {
      const key = JSON.stringify([enemy.id, enemy.position, enemy.awareness, enemy.isBoss, enemy.permanentSleep]);
      progress.threatHistory.set(key, enemy);
    }
  }
  const blocked = createAutoExploreBlockedRooms(progress ? [...progress.threatHistory.values()] : observed,
    knownRooms, roomTypeAt, detectionDistanceReduction, canEnemyEnter);
  if (progress) progress.avoidedRooms = new Set(blocked);
  return blocked;
}

type AutoExploreOptions = {
  blockedRooms?: ReadonlySet<string>;
  goldPiles?: Readonly<Record<string, number>>;
  horizontalRadius?: number;
  verticalRadius?: number;
  bounds?: GridBounds;
  progress?: AutoExploreProgress;
};

/** Count unseen boundary cells without consulting or walking through hidden terrain. */
function countUnseenBoundary(
  center: MapPosition,
  knownRooms: ReadonlySet<string>,
  roomTypeAt: (position: MapPosition) => RoomType,
  horizontalRadius: number,
  verticalRadius: number,
  bounds: GridBounds,
) {
  const visited = new Set([mapRoomKey(center)]);
  const unseen = new Set<string>();
  const queue = [{ position: center, distance: 0 }];
  for (let index = 0; index < queue.length; index++) {
    const { position, distance } = queue[index];
    if (distance >= Math.max(horizontalRadius, verticalRadius)) continue;
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: position.x + direction.x, y: position.y + direction.y };
      const key = mapRoomKey(next);
      if (visited.has(key) || Math.abs(next.x - center.x) > horizontalRadius
        || Math.abs(next.y - center.y) > verticalRadius
        || next.x < bounds.minX || next.x > bounds.maxX
        || next.y < bounds.minY || next.y > bounds.maxY) continue;
      visited.add(key);
      if (!knownRooms.has(key)) unseen.add(key);
      else if (isWalkableRoom(roomTypeAt(next))) queue.push({ position: next, distance: distance + 1 });
    }
  }
  return unseen.size;
}

/** A diagnostic search may cross danger to explain why exploration stopped; it never supplies a move. */
function hasBlockedFrontier(
  start: MapPosition,
  knownRooms: ReadonlySet<string>,
  safeReachable: ReadonlyMap<string, unknown>,
  roomTypeAt: (position: MapPosition) => RoomType,
  horizontalRadius: number,
  verticalRadius: number,
  bounds: GridBounds,
  goldPiles: Readonly<Record<string, number>>,
) {
  const visited = new Set([mapRoomKey(start)]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const position = queue[index];
    const key = mapRoomKey(position);
    if (!safeReachable.has(key) && ((goldPiles[key] ?? 0) > 0
      || countUnseenBoundary(position, knownRooms, roomTypeAt, horizontalRadius, verticalRadius, bounds) > 0)) return true;
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: position.x + direction.x, y: position.y + direction.y };
      const key = mapRoomKey(next);
      if (visited.has(key) || next.x < bounds.minX || next.x > bounds.maxX
        || next.y < bounds.minY || next.y > bounds.maxY
        || !knownRooms.has(key) || !isWalkableRoom(roomTypeAt(next))) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}

/** Finish the reachable safe frontier, consuming a committed route between surveys. */
export function findAutoExploreRoute(
  start: MapPosition,
  knownRooms: ReadonlySet<string>,
  roomTypeAt: (position: MapPosition) => RoomType,
  { blockedRooms = new Set<string>(), goldPiles = {}, horizontalRadius = MAP_PLAYER_VISION_HORIZONTAL_RADIUS,
    verticalRadius = MAP_PLAYER_VISION_VERTICAL_RADIUS,
    progress, bounds = { minX: DUNGEON_MIN_X, maxX: DUNGEON_MAX_X,
      minY: -ROCK_BARRIER_HEIGHT, maxY: MAP_ROWS - 1 } }: AutoExploreOptions = {},
): MapPosition[] | null {
  const startKey = mapRoomKey(start);
  const avoidedRooms = progress?.avoidedRooms ?? blockedRooms;
  if (progress) {
    // Keep this journey conservative when moving threats make detours alternate.
    // The next O run starts with the latest observations retained by the caller.
    blockedRooms.forEach(key => progress.avoidedRooms.add(key));
    progress.stopReason = null;
    // Standing here completes this survey even if the predicted discovery did not materialize.
    // Completed viewpoints remain usable as transit cells to reach other branches.
    progress.surveyedRooms.add(startKey);
    if (progress.targetKey === startKey) {
      progress.targetKey = null;
      progress.route = [];
    }
  }
  if (avoidedRooms.has(startKey)) {
    if (progress) { progress.route = []; progress.stopReason = "unsafe"; }
    return null;
  }
  const isKnownSafe = (position: MapPosition) => {
    const key = mapRoomKey(position);
    return position.x >= bounds.minX && position.x <= bounds.maxX
      && position.y >= bounds.minY && position.y <= bounds.maxY
      && knownRooms.has(key) && !avoidedRooms.has(key) && isWalkableRoom(roomTypeAt(position));
  };
  if (progress?.targetKey) {
    const target = parseMapRoomKey(progress.targetKey);
    if ((goldPiles[progress.targetKey] ?? 0) <= 0
      && countUnseenBoundary(target, knownRooms, roomTypeAt, horizontalRadius, verticalRadius, bounds) === 0) {
      // The route may reveal the whole frontier before reaching its original endpoint.
      progress.targetKey = null;
      progress.route = [];
    } else {
      const index = progress.route.findIndex(position => mapRoomKey(position) === startKey);
      const remaining = index < 0 ? [] : progress.route.slice(index);
      if (remaining.length > 1 && mapRoomKey(remaining.at(-1)!) === progress.targetKey
        && remaining.every(isKnownSafe)) {
        // New shortcuts do not reverse an already safe route. Each move consumes one step.
        progress.route = remaining;
        return remaining;
      }
      // An unreachable old goal must not hide the other safe exploration branches.
      progress.targetKey = null;
      progress.route = [];
    }
  }
  const parents = new Map<string, string | null>([[startKey, null]]);
  const queue = [{ position: start, distance: 0 }];
  let best: { key: string; distance: number; gain: number; gold: boolean } | null = null;
  for (let index = 0; index < queue.length; index++) {
    const { position: current, distance } = queue[index];
    const currentKey = mapRoomKey(current);
    if (best && distance > best.distance) break;
    if (distance > 0 && (!best || distance <= best.distance)) {
      // BFS only visits known safe cells, so undiscovered materialized gold cannot influence routing.
      const gold = (goldPiles[currentKey] ?? 0) > 0;
      const gain = progress?.surveyedRooms.has(currentKey) ? 0
        : countUnseenBoundary(current, knownRooms, roomTypeAt, horizontalRadius, verticalRadius, bounds);
      if ((gold || gain > 0) && (!best || (gold && !best.gold)
        || (gold === best.gold && gain > best.gain))) best = { key: currentKey, distance, gain, gold };
    }
    if (best) continue;
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = mapRoomKey(next);
      if (parents.has(key) || !isKnownSafe(next)) continue;
      parents.set(key, mapRoomKey(current));
      queue.push({ position: next, distance: distance + 1 });
    }
  }
  if (progress) {
    progress.targetKey = best?.key ?? null;
    progress.route = [];
    if (!best) progress.stopReason = avoidedRooms.size > 0
      && hasBlockedFrontier(start, knownRooms, parents, roomTypeAt, horizontalRadius, verticalRadius, bounds, goldPiles)
      ? "blocked" : "complete";
  }
  if (!best) return null;
  const path: MapPosition[] = [];
  for (let cursor: string | null = best.key; cursor !== null; cursor = parents.get(cursor) ?? null) {
    path.push(parseMapRoomKey(cursor));
  }
  path.reverse();
  if (progress) progress.route = path;
  return path;
}
