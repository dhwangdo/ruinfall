import {
  DUNGEON_MIN_X,
  MAP_COLUMNS,
  getDungeonRegionIndex,
  getGeneratedDungeonRegion,
  getRoomType,
  mapRoomKey,
  regionStartY,
  seededRoll,
  type MapPosition,
} from "./mapRules.ts";

export const REGION_GOLD_PILE_COUNT = { min: 96, max: 111 } as const;
export const REGION_GOLD_TOTAL = 1000;

type GoldPile = { position: MapPosition; key: string; score: number };

const goldPilesBySeed = new Map<number, Map<number, ReadonlyMap<string, number>>>();

function regionGoldPiles(seed: number, regionIndex: number) {
  let regions = goldPilesBySeed.get(seed);
  if (!regions) {
    if (goldPilesBySeed.size >= 2) goldPilesBySeed.delete(goldPilesBySeed.keys().next().value!);
    regions = new Map();
    goldPilesBySeed.set(seed, regions);
  }
  const cached = regions.get(regionIndex);
  if (cached) return cached;

  const layout = getGeneratedDungeonRegion(seed, regionIndex);
  const pileCount = REGION_GOLD_PILE_COUNT.min + Math.floor(seededRoll({ x: regionIndex, y: 0 }, seed, 7304)
    * (REGION_GOLD_PILE_COUNT.max - REGION_GOLD_PILE_COUNT.min + 1));
  const startY = regionStartY(regionIndex);
  const candidates: GoldPile[] = [];
  for (let index = 0; index < layout.main.length; index += 1) {
    if (!layout.main[index] || layout.protectedCells[index] || layout.landmarks.has(index)
      || layout.ordinarySites.has(index)) continue;
    const position = { x: DUNGEON_MIN_X + index % MAP_COLUMNS, y: startY + Math.floor(index / MAP_COLUMNS) };
    if (getRoomType(position, seed) !== "empty") continue;
    candidates.push({ position, key: mapRoomKey(position), score: seededRoll(position, seed, 7301) });
  }
  candidates.sort((left, right) => left.score - right.score || left.key.localeCompare(right.key));

  const selected: GoldPile[] = [];
  for (const candidate of candidates) {
    if (selected.length >= pileCount) break;
    if (selected.every((other) => Math.max(Math.abs(candidate.position.x - other.position.x),
      Math.abs(candidate.position.y - other.position.y)) >= 3)) selected.push(candidate);
  }
  // Relax spacing only if the shape of this region cannot fit the full quota.
  if (selected.length < pileCount) {
    for (const candidate of candidates) {
      if (selected.length >= pileCount) break;
      if (!selected.some((other) => other.key === candidate.key)) selected.push(candidate);
    }
  }
  if (selected.length !== pileCount) throw new Error(`Not enough floor cells for region ${regionIndex + 1} gold piles`);

  const weights = selected.map((pile) => {
    const roll = seededRoll(pile.position, seed, 7302);
    return { pile, weight: 0.2 + roll * roll * 2.4, tieBreak: seededRoll(pile.position, seed, 7303) };
  });
  const weightTotal = weights.reduce((sum, entry) => sum + entry.weight, 0);
  const distributableGold = REGION_GOLD_TOTAL - pileCount;
  const allocations = weights.map((entry) => {
    const exactShare = distributableGold * entry.weight / weightTotal;
    const wholeShare = Math.floor(exactShare);
    return { ...entry, amount: wholeShare + 1, remainder: exactShare - wholeShare };
  });
  const undistributedGold = REGION_GOLD_TOTAL - allocations.reduce((sum, entry) => sum + entry.amount, 0);
  allocations.sort((left, right) => right.remainder - left.remainder || left.tieBreak - right.tieBreak);
  allocations.slice(0, undistributedGold).forEach((entry) => { entry.amount += 1; });

  const piles = new Map<string, number>();
  allocations.forEach((entry) => piles.set(entry.pile.key, entry.amount));
  regions.set(regionIndex, piles);
  return piles;
}

/** Gold pile counts are rolled independently of vault quotas; each region totals 1,000 gold. */
export function createMapGoldPilesForPositions(seed: number, positions: readonly MapPosition[]) {
  const result: Record<string, number> = {};
  const visitedRegions = new Map<number, ReadonlyMap<string, number>>();
  for (const position of positions) {
    const regionIndex = getDungeonRegionIndex(position);
    if (regionIndex === null) continue;
    let piles = visitedRegions.get(regionIndex);
    if (!piles) {
      piles = regionGoldPiles(seed, regionIndex);
      visitedRegions.set(regionIndex, piles);
    }
    const roomKey = mapRoomKey(position);
    const amount = piles.get(roomKey);
    if (amount !== undefined) result[roomKey] = amount;
  }
  return result;
}

/** A zero amount is a saved pickup marker, so revisiting the room cannot respawn the pile. */
export function collectMapGoldPile(piles: Record<string, number>, roomKey: string) {
  const amount = piles[roomKey];
  if (!Number.isInteger(amount) || amount <= 0) return { amount: 0, piles };
  return { amount, piles: { ...piles, [roomKey]: 0 } };
}
