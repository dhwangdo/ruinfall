import type { DeckCase } from "./rewards.ts";
import { countRareSlotCards, isHighRarityCard } from "./deckEditorRules.ts";
import type { Card } from "./cards.ts";
import { CARD_RARITY_SORT_RANK, UNPLAYABLE_CARD_EFFECTS } from "./cards.ts";
import { cardEnergyCost } from "./cardEffects.ts";
import { cardStickerIds } from "./stickers.ts";

export type DeckEditorCardGroup = { card: Card; cardIds: number[] };

function cardSortCost(card: Card) {
  return UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    ? -1
    : cardEnergyCost(card) ?? -1;
}

export function groupAndSortDeckEditorCards(
  cards: Card[],
  sort: "cost" | "rarity",
  transformedCardNewIds: ReadonlySet<number>,
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
      cardStickerIds(card).join(",") || "plain",
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

export type DeckCardViewItem = { key: string; width: number } & (
  | { kind: "card"; group: DeckEditorCardGroup }
  | { kind: "rare-slot" | "normal-slot"; slot: number }
  | { kind: "divider" }
);

export type DeckCardView = {
  items: DeckCardViewItem[];
  rareSlotCount: number;
  rareSlotCapacity: number;
  normalSlotCapacity: number;
  normalCardCount: number;
};

/** One ordering and capacity calculation for editable inventories and read-only previews. */
export function createDeckCardView(
  deck: Pick<DeckCase, "id" | "cards" | "capacity" | "rareSlotCapacity">,
  sort: "cost" | "rarity" = "rarity",
  transformedCardNewIds: ReadonlySet<number> = new Set(),
  rareSlotCount = countRareSlotCards(deck.cards),
): DeckCardView {
  const groups = groupAndSortDeckEditorCards(deck.cards, sort, transformedCardNewIds);
  const rareSlotCapacity = Math.max(deck.rareSlotCapacity ?? 0, rareSlotCount);
  const normalSlotCapacity = Math.max(0, deck.capacity - rareSlotCapacity);
  const normalCardCount = deck.cards.filter((card) => !isHighRarityCard(card)).length;
  const cardItems = (rare: boolean): DeckCardViewItem[] => groups
    .filter(({ card }) => isHighRarityCard(card) === rare)
    .map((group) => ({
      kind: "card", key: `deck-card:${deck.id}:${group.cardIds.at(-1)}`,
      width: 82 + Math.min(5, Math.max(0, group.cardIds.length - 1)) * 7, group,
    }));
  const items: DeckCardViewItem[] = [
    ...cardItems(true),
    ...Array.from({ length: Math.max(0, rareSlotCapacity - rareSlotCount) }, (_, slot) => ({
      kind: "rare-slot" as const, key: `deck-rare-slot:${deck.id}:${slot}`, width: 82, slot,
    })),
    ...(rareSlotCapacity > 0 ? [{
      kind: "divider" as const, key: `deck-divider:${deck.id}`, width: 11,
    }] : []),
    ...cardItems(false),
    ...Array.from({ length: Math.max(0, normalSlotCapacity - normalCardCount) }, (_, slot) => ({
      kind: "normal-slot" as const, key: `deck-normal-slot:${deck.id}:${slot}`, width: 82, slot,
    })),
  ];
  return { items, rareSlotCount, rareSlotCapacity, normalSlotCapacity, normalCardCount };
}
