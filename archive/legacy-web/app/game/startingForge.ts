import type { Card } from "./cards.ts";

/** An ordinary forge without a placement cost, limited to this battle's card copies. */
export function forgeRandomStartingCard(deck: Card[], random: () => number = Math.random) {
  const eligible = deck.filter(card => !card.forged && !card.enemyToken
    && !["exchange", "obsidianDagger", "astronomyResearch", "necromancyResearch", "massDeal"].includes(card.effect)
    && (card.forgeCost !== undefined || Boolean(card.forgeCosts?.length) || card.forgeTargetName || card.forgeAny));
  const selected = eligible[Math.min(eligible.length - 1, Math.floor(random() * eligible.length))];
  return {
    cards: selected ? deck.map(card => card.id === selected.id ? { ...card, forged: true } : card) : deck,
    forged: Boolean(selected),
  };
}
