import { STARTER_CARD_POOL, BASIC_CARD_POOL, SPECIAL_CARD_POOL, RARE_CARD_POOL, type Card } from "./cards.ts";

export function transformedCard(card: Card, random = Math.random): Card | null {
  if (card.rarity === "legendary") return null;
  const pool = card.rarity === "starter" ? STARTER_CARD_POOL
    : card.rarity === "basic" ? BASIC_CARD_POOL : card.rarity === "special" ? SPECIAL_CARD_POOL : RARE_CARD_POOL;
  const candidates = pool.filter(blueprint => blueprint.name !== card.name);
  if (candidates.length === 0) return null;
  return { ...candidates[Math.floor(random() * candidates.length)], id: card.id, revealed: card.revealed };
}
