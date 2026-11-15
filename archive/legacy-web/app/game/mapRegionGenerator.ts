import { MAP_PREFAB_DEFINITIONS } from "./mapPrefabDefinitions.ts";
import { placeMapPrefabs, type MapPrefabDefinition, type MapPrefabPlacement, type PrefabLandmark } from "./mapPrefabs.ts";
import { floodMapFloor, gridNoise, mapRandom, MapMinQueue, spatialNoise, type GridPoint } from "./mapGenerationMath.ts";
import { carveMapCorridor, mapConnectionEdges, type MapConnectionNode } from "./mapCorridors.ts";

export const HYBRID_MAP_CONFIG = {
  clearingFraction: .28,
  extraConnectionRate: .45,
  mainFractionTarget: .97,
  mainFractionMinimum: .90,
  prefabsPerRegion: 2,
} as const;

export type GeneratedMapRegion = {
  width: number; height: number;
  floor: Uint8Array;
  main: Uint8Array;
  protectedCells: Uint8Array;
  landmarks: ReadonlyMap<number, PrefabLandmark>;
  prefabs: readonly MapPrefabPlacement[];
  skippedPrefabs: readonly string[];
  floorCount: number;
  mainFloorCount: number;
};

export function generateMapRegion(options: {
  seed: number; region: number; width: number; height: number;
  start: GridPoint; portals: readonly GridPoint[];
  blocked?: Uint8Array; definitions?: readonly MapPrefabDefinition[]; prefabCount?: number;
}): GeneratedMapRegion {
  const { seed, region, width, height } = options, size = width * height;
  if (width < 15 || height < 15) throw new Error("Map region must be at least 15 by 15 cells");
  const random = mapRandom(seed ^ Math.imul(region, 0x45d9f3b));
  const floor = new Uint8Array(size), protectedCells = new Uint8Array(size), fixedFloor = new Uint8Array(size);
  const forbidden = options.blocked?.slice() ?? new Uint8Array(size);
  if (forbidden.length !== size) throw new Error("Map blocked mask has incorrect dimensions");
  const unavailable = forbidden.slice(), landmarks = new Map<number, PrefabLandmark>();
  const nodes: MapConnectionNode[] = [], roomCandidates: { center: number; cells: number[] }[] = [];
  const required = new Set<number>();
  const inside = (x: number, y: number) => x > 0 && x < width - 1 && y > 0 && y < height - 1;
  for (const point of [options.start, ...options.portals]) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = point.x + dx, y = point.y + dy;
      if (x >= 0 && x < width && y >= 0 && y < height) unavailable[y * width + x] = 1;
    }
  }
  const { placements, skipped } = placeMapPrefabs({
    definitions: options.definitions ?? MAP_PREFAB_DEFINITIONS, random: mapRandom(seed ^ Math.imul(region, 0x712e4a)),
    width, height, unavailable, region, count: options.prefabCount ?? HYBRID_MAP_CONFIG.prefabsPerRegion,
  });
  for (const placement of placements) {
    placement.protectedCells.forEach(index => { forbidden[index] = 1; protectedCells[index] = 1; });
    placement.floorCells.forEach(index => { floor[index] = 1; fixedFloor[index] = 1; });
    placement.requiredCells.forEach(index => required.add(index));
    placement.landmarks.forEach((kind, index) => landmarks.set(index, kind));
    nodes.push({ index: (placement.y + Math.floor(placement.height / 2)) * width + placement.x + Math.floor(placement.width / 2),
      exits: placement.exits, prefab: true });
  }

  const addNode = (x: number, y: number, rx = 2 + random() * 1.4, ry = 1.5 + random() * 1.2) => {
    const index = y * width + x, cells: number[] = [];
    if (!inside(x, y) || forbidden[index]) throw new Error("Required map connection is blocked");
    for (let yy = Math.floor(y - ry - 1); yy < Math.ceil(y + ry + 1); yy++) {
      for (let xx = Math.floor(x - rx - 1); xx < Math.ceil(x + rx + 1); xx++) {
        const cell = yy * width + xx;
        if (inside(xx, yy) && !forbidden[cell]
          && ((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2 < .9 + random() * .25) cells.push(cell);
      }
    }
    floor[index] = 1;
    roomCandidates.push({ center: index, cells });
    nodes.push({ index, exits: [index], prefab: false });
  };
  const addBoundaryConnection = (point: GridPoint, portal: boolean) => {
    const index = point.y * width + point.x;
    const x = Math.max(1, Math.min(width - 2, point.x)), y = Math.max(1, Math.min(height - 2, point.y));
    if (forbidden[index]) throw new Error("Map entrance or portal is blocked");
    floor[index] = 1; required.add(index);
    addNode(x, y, portal ? 2.4 : 2, portal ? 1.5 : 1.4);
    if (portal) landmarks.set(index, "portal");
  };
  addBoundaryConnection(options.start, false);
  options.portals.forEach(point => addBoundaryConnection(point, true));

  const target = Math.max(nodes.length, Math.floor(size / 95));
  for (let attempt = 0; nodes.length < target && attempt < target * 90; attempt++) {
    const x = 5 + Math.floor(random() * (width - 10)), y = 5 + Math.floor(random() * (height - 10));
    if (nodes.some(node => (node.index % width - x) ** 2 + (Math.floor(node.index / width) - y) ** 2 < 36)) continue;
    let blocked = false;
    for (let dy = -4; dy <= 4 && !blocked; dy++) for (let dx = -5; dx <= 5; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || xx >= width || yy < 0 || yy >= height || forbidden[yy * width + xx]) blocked = true;
    }
    if (!blocked) addNode(x, y);
  }
  const edges = mapConnectionEdges(nodes, width, random, HYBRID_MAP_CONFIG.extraConnectionRate);
  const costs = Float32Array.from({ length: size }, () => 1 + random() * 6);
  const routeOptions = { width, height, floor, forbidden, costs };
  const distanceSquared = (a: number, b: number) => (a % width - b % width) ** 2 + (Math.floor(a / width) - Math.floor(b / width)) ** 2;
  for (const [a, b] of edges) {
    let from = nodes[a].exits[0], to = nodes[b].exits[0], best = Infinity;
    for (const left of nodes[a].exits) for (const right of nodes[b].exits) {
      const distance = distanceSquared(left, right);
      if (distance < best) { best = distance; from = left; to = right; }
    }
    carveMapCorridor(from, to, routeOptions);
  }
  for (const node of nodes) if (node.prefab) for (const exit of node.exits) {
    const nearest = nodes.filter(other => !other.prefab).reduce((best, other) => distanceSquared(exit, other.index) < distanceSquared(exit, best.index) ? other : best);
    carveMapCorridor(exit, nearest.index, routeOptions);
  }

  // Width follows a spatial field, rather than a widening at every connection node.
  const distance = new Float64Array(size).fill(Infinity), queue = new MapMinQueue();
  for (let index = 0; index < size; index++) if (floor[index] && !forbidden[index]) {
    distance[index] = 0; queue.push({ index, cost: 0, priority: 0 });
  }
  while (queue.size) {
    const current = queue.pop();
    if (current.cost > distance[current.index]) continue;
    const x = current.index % width, y = Math.floor(current.index / width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy, index = yy * width + xx;
      if ((!dx && !dy) || !inside(xx, yy) || forbidden[index]) continue;
      const nextDistance = current.cost + (dx && dy ? Math.SQRT2 : 1);
      if (nextDistance > 2.8 || nextDistance >= distance[index]) continue;
      distance[index] = nextDistance;
      queue.push({ index, cost: nextDistance, priority: nextDistance });
    }
  }
  for (let index = 0; index < size; index++) if (Number.isFinite(distance[index])) {
    const x = index % width, y = Math.floor(index / width);
    const radius = .05 + 1.25 * spatialNoise(x, y, 8, seed + 13) + .30 * spatialNoise(x, y, 3, seed + 57)
      + .55 * (gridNoise(x, y, seed + 211) - .5);
    if (distance[index] <= radius) floor[index] = 1;
  }
  for (const candidate of roomCandidates) {
    if (gridNoise(candidate.center % width, Math.floor(candidate.center / width), seed + 417) < HYBRID_MAP_CONFIG.clearingFraction) {
      candidate.cells.forEach(index => { floor[index] = 1; });
    }
  }
  const roughRandom = mapRandom(seed ^ 0x356ead);
  const origins = Array.from({ length: size }, (_, index) => index).filter(index => floor[index] && !forbidden[index]);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  for (let branch = 0; branch < Math.floor(width / 5); branch++) {
    let index = origins[Math.floor(roughRandom() * origins.length)], direction = Math.floor(roughRandom() * 4);
    const length = 2 + Math.floor(roughRandom() * 7);
    for (let step = 0; step < length; step++) {
      if (roughRandom() < .35) direction = Math.floor(roughRandom() * 4);
      const x = index % width + directions[direction][0], y = Math.floor(index / width) + directions[direction][1];
      const next = y * width + x;
      if (!inside(x, y) || forbidden[next]) break;
      floor[next] = 1; index = next;
    }
  }
  const main = floodMapFloor(floor, width, height, options.start.y * width + options.start.x);
  if ([...required].some(index => !main.cells[index])) throw new Error("Map landmark or prefab entrance is not reachable");
  let floorCount = floor.reduce((sum, cell) => sum + cell, 0);
  const pocketRandom = mapRandom(seed ^ 0x56d3e9);
  const pocketTarget = Math.round(main.count * (1 - HYBRID_MAP_CONFIG.mainFractionTarget) / HYBRID_MAP_CONFIG.mainFractionTarget);
  const touches = (x: number, y: number, mask: Uint8Array) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < width && yy >= 0 && yy < height && mask[yy * width + xx]) return true;
    }
    return false;
  };
  for (let attempt = 0; floorCount - main.count < pocketTarget && attempt < 1200; attempt++) {
    let x = 2 + Math.floor(pocketRandom() * (width - 4)), y = 2 + Math.floor(pocketRandom() * (height - 4));
    if (forbidden[y * width + x] || touches(x, y, floor)) continue;
    const length = 2 + Math.floor(pocketRandom() * 13);
    for (let step = 0; step < length; step++) {
      const index = y * width + x;
      if (!inside(x, y) || forbidden[index] || touches(x, y, main.cells)) break;
      if (!floor[index]) { floor[index] = 1; floorCount++; }
      const direction = directions[Math.floor(pocketRandom() * 4)];
      x += direction[0]; y += direction[1];
    }
  }
  if (main.count / floorCount < HYBRID_MAP_CONFIG.mainFractionMinimum) throw new Error("Player continent is too small");
  for (let index = 0; index < size; index++) {
    if (protectedCells[index] && floor[index] !== fixedFloor[index]) throw new Error("Map generation changed protected prefab terrain");
    if (options.blocked?.[index] && floor[index]) throw new Error("Map generation entered the separate safe area");
  }
  return { width, height, floor, main: main.cells, protectedCells, landmarks, prefabs: placements,
    skippedPrefabs: skipped, floorCount, mainFloorCount: main.count };
}
