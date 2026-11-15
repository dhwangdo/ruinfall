import type { DeckEdition } from "./rewards.ts";

export function initialBattleStars(
  deckEditions: DeckEdition[],
  quickHammerForged = false,
) {
  return 2
    + (deckEditions.includes("clever") ? 2 : 0)
    + (deckEditions.includes("starPlus") ? 1 : 0)
    + (deckEditions.includes("starThree") ? 3 : 0)
    + (deckEditions.includes("starFive") ? 5 : 0)
    + (quickHammerForged && deckEditions.includes("hammering") ? 1 : 0);
}
