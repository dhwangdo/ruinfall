export const OBSIDIAN_DAGGER_MAX_FORGES = 5;

export function obsidianDaggerForgesRemaining(completed: number) {
  return Math.max(0, OBSIDIAN_DAGGER_MAX_FORGES - completed);
}

export function cardCostAfterForgePlacement(
  card: { cost?: number },
  exchangedCost?: number,
) {
  return exchangedCost ?? card.cost;
}
