import { EIGHT_DIRECTIONS } from "./mapEnemies.ts";
import { isWalkableRoom, mapRoomKey, parseMapRoomKey, type MapPosition, type RoomType } from "./mapRules.ts";

/** Walk only through explored cells, ending at the nearest reachable unexplored cell. */
export function findAutoExploreRoute(
  start: MapPosition,
  knownRooms: ReadonlySet<string>,
  roomTypeAt: (position: MapPosition) => RoomType,
): MapPosition[] | null {
  const startKey = mapRoomKey(start);
  const parents = new Map<string, string | null>([[startKey, null]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = mapRoomKey(next);
      if (parents.has(key) || !isWalkableRoom(roomTypeAt(next))) continue;
      parents.set(key, mapRoomKey(current));
      if (!knownRooms.has(key)) {
        const path: MapPosition[] = [];
        for (let cursor: string | null = key; cursor !== null; cursor = parents.get(cursor) ?? null) {
          path.push(parseMapRoomKey(cursor));
        }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}

export function hasAutoExploreDiscovery(
  visibleRooms: ReadonlySet<string>,
  knownRooms: ReadonlySet<string>,
  roomTypeAt: (position: MapPosition) => RoomType,
  hasFloorItems: (roomKey: string) => boolean,
) {
  for (const key of visibleRooms) {
    if (knownRooms.has(key)) continue;
    const type = roomTypeAt(parseMapRoomKey(key));
    if (hasFloorItems(key) || (type !== "empty" && isWalkableRoom(type))) return true;
  }
  return false;
}
