import { mapRandom, shuffleMapItems, type GridPoint, type MapRandom } from "./mapGenerationMath.ts";
import type { GeneratedMapRegion } from "./mapRegionGenerator.ts";

/** Inclusive counts of ordinary locations. Authored prefab locations are additional. */
export const REGION_LOCATION_COUNTS = {
  deckVault: { min: 40, max: 46 },
  shop: { min: 3, max: 4 },
  bloodShop: { min: 3, max: 4 },
  portal: { min: 14, max: 18 },
} as const;
export type RegionLocationKind = keyof typeof REGION_LOCATION_COUNTS;
export type RegionLocationCounts = Record<RegionLocationKind, number>;
type OrdinaryLocationKind = Exclude<RegionLocationKind, "portal">;

export function rollRegionLocationCounts(seed: number, region: number): RegionLocationCounts {
  const random = mapRandom(seed ^ Math.imul(region + 1, 0x127ae39));
  return Object.fromEntries(Object.entries(REGION_LOCATION_COUNTS).map(([kind, range]) =>
    [kind, range.min + Math.floor(random() * (range.max - range.min + 1))])) as RegionLocationCounts;
}

const squaredDistance = (a: number, b: number, width: number) =>
  (a % width - b % width) ** 2 + (Math.floor(a / width) - Math.floor(b / width)) ** 2;

/** One portal per horizontal band, with the existing downward depth bias. */
export function placeRegionPortals({ width, height, blocked, count, random }: {
  width: number; height: number; blocked: Uint8Array; count: number; random: MapRandom;
}): GridPoint[] {
  if (count > width || height < 3) throw new Error("Portal quota exceeds the region dimensions");
  const portals: GridPoint[] = [];
  for (let band = 0; band < count; band++) {
    const x = Math.floor((band + .2 + random() * .6) * width / count);
    let rows = Array.from({ length: height - 2 }, (_, index) => index + 2)
      .filter(y => !blocked[y * width + x]);
    const separated = rows.filter(y => portals.every(point => (point.x - x) ** 2 + (point.y - y) ** 2 >= 64));
    if (separated.length) rows = separated;
    if (!rows.length) throw new Error("No free floor for a required portal");
    let cursor = random() * rows.reduce((sum, y) => sum + (y + 1) ** 2, 0);
    const y = rows.find(row => { cursor -= (row + 1) ** 2; return cursor < 0; }) ?? rows[rows.length - 1];
    portals.push({ x, y });
  }
  return portals;
}

/** Spread each kind across the region; keep authored locations and nearby space intact. */
export function placeRegionLocations(map: GeneratedMapRegion, counts: RegionLocationCounts, seed: number) {
  const { width, main, protectedCells, landmarks } = map;
  const random = mapRandom(seed ^ 0x153ab29), occupied = [...landmarks.keys()];
  const result = new Map<number, OrdinaryLocationKind>();
  const available = Array.from({ length: main.length }, (_, index) => index)
    .filter(index => main[index] && !protectedCells[index] && !landmarks.has(index) && index !== Math.floor(width / 2));
  // Give the less frequent facilities a place first; denser vaults fit around them.
  for (const kind of ["shop", "bloodShop", "deckVault"] as const) {
    const count = counts[kind];
    const sameKind = [...landmarks].filter(([, type]) => type === kind).map(([index]) => index);
    const bands = Array.from({ length: count }, () => [] as number[]);
    for (const index of available) if (!result.has(index)) {
      bands[Math.min(count - 1, Math.floor(index % width * count / width))]?.push(index);
    }
    const order = Array.from({ length: count }, (_, index) => index);
    shuffleMapItems(order, random);
    for (const band of order) {
      let candidates = bands[band].filter(index => !result.has(index));
      const hasSpace = (index: number) => sameKind.every(other => squaredDistance(index, other, width) >= 36)
        && occupied.every(other => squaredDistance(index, other, width) >= 9);
      // A crowded band may borrow nearby floor before relaxing the spacing preference.
      if (!candidates.some(hasSpace)) candidates = available.filter(index => !result.has(index) && hasSpace(index));
      if (!candidates.length) candidates = available.filter(index => !result.has(index));
      const targetX = (band + .2 + random() * .6) * width / count;
      let best = -1, bestTier = -1, bestScore = -Infinity;
      for (const index of candidates) {
        if (result.has(index)) continue;
        const nearestSame = sameKind.reduce((distance, other) => Math.min(distance, squaredDistance(index, other, width)), Infinity);
        const nearestAny = occupied.reduce((distance, other) => Math.min(distance, squaredDistance(index, other, width)), Infinity);
        const tier = Number(nearestSame >= 36 && nearestAny >= 9);
        const score = Math.min(nearestSame, 144) * .15 + Math.min(nearestAny, 36) * .25
          - Math.abs(index % width - targetX) * count / width * 8 + random() * 8;
        if (tier > bestTier || (tier === bestTier && score > bestScore)) {
          best = index; bestTier = tier; bestScore = score;
        }
      }
      if (best < 0) throw new Error(`Not enough main-continent floor for ${kind} quota`);
      result.set(best, kind); sameKind.push(best); occupied.push(best);
    }
  }
  return result;
}
