import type { Card } from "./cards.ts";
import { CARD_RARITY_SORT_RANK, UNPLAYABLE_CARD_EFFECTS } from "./cards.ts";
import { IRON_WALL_COST } from "./cardEffects.ts";

export type DeckEditorCardGroup = { card: Card; cardIds: number[] };

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
      : CARD_RARITY_SORT_RANK[left.card.rarity] - CARD_RARITY_SORT_RANK[right.card.rarity];
    const secondary = sort === "cost"
      ? CARD_RARITY_SORT_RANK[left.card.rarity] - CARD_RARITY_SORT_RANK[right.card.rarity]
      : cardSortCost(left.card) - cardSortCost(right.card);
    return primary || secondary || left.card.name.localeCompare(right.card.name, "ko");
  });
}
