export function nextRareCardDropChance(
  currentChance: number,
  cards: ReadonlyArray<{ rarity: string }>,
) {
  const card = cards[0];
  if (!card) return currentChance;
  return card.rarity === "rare" ? 0.05 : Math.min(1, currentChance + 0.02);
}
export function rollBattleRewardGold(regionNumber: number, random = Math.random) {
  const multiplier = 1.3 ** Math.max(0, regionNumber - 1);
  const minimum = Math.floor(10 * multiplier), maximum = Math.floor(15 * multiplier);
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

