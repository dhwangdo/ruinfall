export const RARE_SLOT_FILL_RATE = 0.8;

const distributions = new Map<number, readonly number[]>();

/** Binomial probabilities from independently filling each slot with probability 0.8. */
export function rareSlotFillDistribution(slotCount: number): readonly number[] {
  const slots = Math.max(0, Math.floor(slotCount));
  const cached = distributions.get(slots);
  if (cached) return cached;
  const probabilities = Array<number>(slots + 1).fill(0);
  probabilities[0] = 1;
  for (let trial = 0; trial < slots; trial++) {
    for (let count = trial + 1; count >= 0; count--) {
      probabilities[count] = probabilities[count] * (1 - RARE_SLOT_FILL_RATE)
        + (count > 0 ? probabilities[count - 1] * RARE_SLOT_FILL_RATE : 0);
    }
  }
  const result = Object.freeze(probabilities);
  if (distributions.size >= 64) distributions.delete(distributions.keys().next().value!);
  distributions.set(slots, result);
  return result;
}

export function rollFilledRareSlots(slotCount: number, random: () => number = Math.random) {
  const slots = Math.max(0, Math.floor(slotCount));
  let filled = 0;
  for (let slot = 0; slot < slots; slot++) {
    if (Math.max(0, Math.min(0.999999999, random())) < RARE_SLOT_FILL_RATE) filled++;
  }
  return filled;
}
