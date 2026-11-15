export type RegionDeckSum = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export type RegionDeckShape = {
  x: number;
  y: number;
  z: number;
  sum: RegionDeckSum;
  capacity: number;
  rareSlotCapacity: number;
  editionBudget: number;
};

type WeightedShape = { shape: RegionDeckShape; weight: number };
const shapeCandidates = new Map<string, { candidates: WeightedShape[]; totalWeight: number }>();
const SUM_WAYS = [1, 3, 6, 7, 6, 3, 1] as const;
const FILLER_KINDS = ["empty", "starter", "basic", "special"] as const;
const WEIGHT_BASE = 1.75;
const SPREAD_GROWTH = 0.2;

function rollUnit(random: () => number) {
  return Math.max(0, Math.min(0.999999999, random()));
}

function getShapeCandidates(k: number, sum: RegionDeckSum) {
  const key = `${k}:${sum}`;
  const cached = shapeCandidates.get(key);
  if (cached) return cached;
  const candidates: WeightedShape[] = [];
  let totalWeight = 0;
  const distanceScale = Math.sqrt(1 + SPREAD_GROWTH * (k - 1));
  // k+x >= -1; k+y and k+z remain nonnegative.
  for (let x = -k - 1; x <= sum + 2 * k; x++) {
    for (let y = -k; y <= sum - x + k; y++) {
      const z = sum - x - y;
      const capacity = 20 + 5 * (k + x);
      const rareSlotCapacity = k + y;
      if (rareSlotCapacity > capacity) continue;
      const r = Math.hypot(x, y, z);
      const weight = WEIGHT_BASE ** (-r / distanceScale);
      candidates.push({ shape: { x, y, z, sum, capacity, rareSlotCapacity, editionBudget: 10 * (k + z) }, weight });
      totalWeight += weight;
    }
  }
  const result = { candidates, totalWeight };
  if (shapeCandidates.size >= 64) shapeCandidates.delete(shapeCandidates.keys().next().value!);
  shapeCandidates.set(key, result);
  return result;
}

export function rollRegionDeckShape(regionNumber: number, random: () => number = Math.random): RegionDeckShape {
  const k = Math.max(1, Math.floor(regionNumber));
  const d3 = () => 1 + Math.floor(rollUnit(random) * 3);
  const sum = (d3() + d3() + d3() - 6) as RegionDeckSum;
  const { candidates, totalWeight } = getShapeCandidates(k, sum);
  let cursor = rollUnit(random) * totalWeight;
  for (const candidate of candidates) {
    cursor -= candidate.weight;
    if (cursor < 0) return { ...candidate.shape };
  }
  return { ...candidates.at(-1)!.shape };
}

/** The same shape probabilities used by gameplay, exposed for exact balance reports. */
export function regionDeckShapeDistribution(regionNumber: number) {
  const k = Math.max(1, Math.floor(regionNumber));
  return SUM_WAYS.flatMap((ways, index) => {
    const sum = (index - 3) as RegionDeckSum;
    const { candidates, totalWeight } = getShapeCandidates(k, sum);
    return candidates.map(({ shape, weight }) => ({
      shape: { ...shape }, probability: ways / 27 * weight / totalWeight,
    }));
  });
}

export function rollRegionFillerKind(random: () => number = Math.random) {
  return FILLER_KINDS[Math.floor(rollUnit(random) * FILLER_KINDS.length)];
}
