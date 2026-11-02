export const RARE_SLOT_MIN_FILL_RATE = 0.5;
export const RARE_SLOT_MAX_FILL_RATE = 0.9;
export const RARE_SLOT_FILL_RATE = (RARE_SLOT_MIN_FILL_RATE + RARE_SLOT_MAX_FILL_RATE) / 2;

const distributions = new Map<number, readonly number[]>();

/** Exact probabilities for a uniform 50–90% target followed by stochastic rounding. */
export function rareSlotFillDistribution(slotCount: number): readonly number[] {
  const slots = Math.max(0, Math.floor(slotCount));
  const cached = distributions.get(slots);
  if (cached) return cached;
  if (slots <= 1) return Object.freeze(slots === 0 ? [1] : [0, 1]);
  const start = slots * RARE_SLOT_MIN_FILL_RATE, end = slots * RARE_SLOT_MAX_FILL_RATE;
  const probabilities = Array.from({ length: slots + 1 }, (_, count) => {
    const left = Math.max(start, count - 1), middle = Math.min(end, count);
    const right = Math.max(start, count), last = Math.min(end, count + 1);
    const rising = middle > left ? ((middle - count + 1) ** 2 - (left - count + 1) ** 2) / 2 : 0;
    const falling = last > right ? ((count + 1 - right) ** 2 - (count + 1 - last) ** 2) / 2 : 0;
    return (rising + falling) / (end - start);
  });
  const result = Object.freeze(probabilities);
  if (distributions.size >= 64) distributions.delete(distributions.keys().next().value!);
  distributions.set(slots, result);
  return result;
}

export function rollFilledRareSlots(slotCount: number, random: () => number = Math.random) {
  const slots = Math.max(0, Math.floor(slotCount));
  if (slots <= 1) return slots;
  const roll = () => Math.max(0, Math.min(0.999999999, random()));
  const ratio = RARE_SLOT_MIN_FILL_RATE + (RARE_SLOT_MAX_FILL_RATE - RARE_SLOT_MIN_FILL_RATE) * roll();
  const target = slots * ratio, lower = Math.floor(target);
  return lower + (roll() < target - lower ? 1 : 0);
}
