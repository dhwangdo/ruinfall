import { EIGHT_DIRECTIONS, type GridPosition, type MapEnemy, type MapEnemyCellMemory } from "./mapEnemies.ts";
import { findKnownRoomRoute, isWalkableRoom, mapRoomKey, parseMapRoomKey, type RoomType } from "./mapRules.ts";

/** Use observed positions only; live enemies outside vision must not reveal themselves. */
export function knownTravelEnemyPositions(
  enemies: readonly MapEnemy[], memory: MapEnemyCellMemory, visibleKeys: ReadonlySet<string>,
): GridPosition[] {
  const visible = enemies.filter(enemy => visibleKeys.has(mapRoomKey(enemy.position)));
  const visibleIds = new Set(visible.map(enemy => enemy.id));
  return [
    ...Object.entries(memory)
      .filter(([key, enemy]) => !visibleKeys.has(key) && (!enemy.id || !visibleIds.has(enemy.id)))
      .map(([key]) => parseMapRoomKey(key)),
    ...visible.map(enemy => enemy.position),
  ];
}

type Node = {
  position: GridPosition;
  key: string;
  exposure: number[];
  steps: number;
  turns: number;
  direction: number;
  previous: Node | null;
  order: number;
};

function compare(a: Node, b: Node) {
  for (let i = 0; i < a.exposure.length; i += 1) {
    if (a.exposure[i] !== b.exposure[i]) return a.exposure[i] - b.exposure[i];
  }
  return a.steps - b.steps || a.turns - b.turns || a.order - b.order;
}

/** Minimize time at distance 0, then 1, ... 5; beyond 5, prefer short routes.
 * Distances follow known walkable terrain, including diagonals and walls.
 */
export function findEnemyAvoidingRoute(
  start: GridPosition, target: GridPosition, known: Set<string>,
  roomTypeAt: (position: GridPosition) => RoomType, enemies: readonly GridPosition[],
): GridPosition[] | null {
  if (enemies.length === 0) return findKnownRoomRoute(start, target, known, roomTypeAt);
  const startKey = mapRoomKey(start), targetKey = mapRoomKey(target);
  if (startKey === targetKey) return [start];
  if (!known.has(targetKey) || !isWalkableRoom(roomTypeAt(target))) return null;
  const walkable = new Set([...known].filter(key => isWalkableRoom(roomTypeAt(parseMapRoomKey(key)))));
  walkable.add(startKey);
  const distance = new Map<string, number>();
  const cells: GridPosition[] = [];
  for (const enemy of enemies) {
    const key = mapRoomKey(enemy);
    if (walkable.has(key) && !distance.has(key)) {
      distance.set(key, 0);
      cells.push(enemy);
    }
  }
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i], nextDistance = distance.get(mapRoomKey(cell))! + 1;
    if (nextDistance >= 6) continue;
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: cell.x + direction.x, y: cell.y + direction.y }, key = mapRoomKey(next);
      if (!walkable.has(key) || distance.has(key)) continue;
      distance.set(key, nextDistance);
      cells.push(next);
    }
  }
  const first: Node = { position: start, key: startKey, exposure: [0, 0, 0, 0, 0, 0],
    steps: 0, turns: 0, direction: -1, previous: null, order: 0 };
  const best = new Map<string, Node>([[startKey, first]]);
  const heap: Node[] = [first];
  let order = 1;
  const push = (node: Node) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >>> 1;
      if (compare(heap[parent], node) <= 0) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = node;
  };
  while (heap.length > 0) {
    const current = heap[0], last = heap.pop()!;
    if (heap.length > 0) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && compare(heap[child + 1], heap[child]) < 0) child += 1;
        if (compare(last, heap[child]) <= 0) break;
        heap[i] = heap[child];
        i = child;
      }
      heap[i] = last;
    }
    if (best.get(current.key) !== current) continue;
    if (current.key === targetKey) {
      const path: GridPosition[] = [];
      for (let node: Node | null = current; node; node = node.previous) path.push(node.position);
      return path.reverse();
    }
    for (let direction = 0; direction < EIGHT_DIRECTIONS.length; direction += 1) {
      const offset = EIGHT_DIRECTIONS[direction];
      const position = { x: current.position.x + offset.x, y: current.position.y + offset.y };
      const key = mapRoomKey(position);
      if (!walkable.has(key)) continue;
      const exposure = [...current.exposure], d = distance.get(key);
      if (d !== undefined) exposure[d] += 1;
      const next: Node = { position, key, exposure, steps: current.steps + 1,
        turns: current.turns + (current.direction < 0 || current.direction === direction ? 0 : 1),
        direction, previous: current, order: order++ };
      const previous = best.get(key);
      if (previous && compare(previous, next) <= 0) continue;
      best.set(key, next);
      push(next);
    }
  }
  return null;
}
