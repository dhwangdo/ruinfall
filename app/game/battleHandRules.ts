import { CARD_RARITY_SORT_RANK, UNPLAYABLE_CARD_EFFECTS, type Card } from "./cards.ts";
import { cardEnergyCost } from "./cardEffects.ts";

export function sortBattleHandByCost(hand: Card[], lawResearchCount: number, forgeCount: number): Card[] {
  const sortCost = (card: Card) => UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    ? -999
    : cardEnergyCost(card, lawResearchCount, forgeCount) ?? Number.POSITIVE_INFINITY;

  const displayedHand = [
    ...hand.filter((card) => card.drawSlot !== undefined).sort((left, right) => left.drawSlot! - right.drawSlot!),
    ...hand.filter((card) => card.drawSlot === undefined),
  ];

  return displayedHand
    .map((card, index) => ({ card, index }))
    .sort((left, right) => {
      const leftCost = sortCost(left.card);
      const rightCost = sortCost(right.card);
      const costOrder = leftCost === rightCost ? 0 : leftCost - rightCost;
      return costOrder
        || CARD_RARITY_SORT_RANK[left.card.rarity] - CARD_RARITY_SORT_RANK[right.card.rarity]
        || left.index - right.index;
    })
    .map(({ card }) => ({ ...card, drawSlot: undefined, drawSlotCount: undefined }));
}
