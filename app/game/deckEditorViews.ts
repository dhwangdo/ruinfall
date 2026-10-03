import type { Card } from "./cards.ts";
import { UNPLAYABLE_CARD_EFFECTS } from "./cards.ts";
import { IRON_WALL_COST } from "./cardEffects.ts";

export type DeckEditorCardGroup = { card: Card; cardIds: number[] };

const rarityOrder: Record<Card["rarity"], number> = {
  status: 0,
  starter: 1,
  basic: 2,
  special: 3,
  rare: 4,
  legendary: 5,
};

function cardSortCost(card: Card) {
  return UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    ? -1
    : card.effect === "ironWall" ? IRON_WALL_COST : card.cost ?? -1;
}

export function groupAndSortDeckEditorCards(
  cards: Card[],
  sort: "cost" | "rarity",
  transformedCardNewIds: Set<number>,
): DeckEditorCardGroup[] {
  const groups = new Map<string, DeckEditorCardGroup>();
  for (const card of cards) {
    const groupKey = [
      card.name,
      card.effect,
      card.damageType,
      card.cost,
      card.value,
      card.rarity,
      card.colored ? "painted" : "plain",
      card.forged ? "forged" : "normal",
      card.enemyToken ? "token" : "card",
      card.forgeCostsCompleted?.join(",") ?? "",
      transformedCardNewIds.has(card.id) ? "transformed-new" : "regular",
    ].join(":");
    const current = groups.get(groupKey);
    if (current) current.cardIds.push(card.id);
    else groups.set(groupKey, { card, cardIds: [card.id] });
  }
  return [...groups.values()].sort((left, right) => {
    const primary = sort === "cost"
      ? cardSortCost(left.card) - cardSortCost(right.card)
      : rarityOrder[left.card.rarity] - rarityOrder[right.card.rarity];
    const secondary = sort === "cost"
      ? rarityOrder[left.card.rarity] - rarityOrder[right.card.rarity]
      : cardSortCost(left.card) - cardSortCost(right.card);
    return primary || secondary || left.card.name.localeCompare(right.card.name, "ko");
  });
}
