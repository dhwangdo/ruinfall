import { RARE_CARD_POOL, SPECIAL_CARD_POOL, type Card } from "./cards.ts";
import { rollBattleRewardGold } from "./rewardRules.ts";
import { TICKET_TIERS, TICKET_TYPES, type TicketType } from "./shopRules.ts";

export const REWARD_ROULETTE_SLOTS = [
  { id: "special-a", label: "무작위 특별 카드", shortLabel: "특별\n카드", color: "#356b91" },
  { id: "special-b", label: "무작위 특별 카드", shortLabel: "특별\n카드", color: "#477c9b" },
  { id: "rare", label: "무작위 희귀 카드", shortLabel: "희귀\n카드", color: "#8549ad", jackpot: true },
  { id: "extract", label: "추출 티켓", shortLabel: "추출\n티켓", color: "#8b7543" },
  { id: "extract-plus", label: "추출 티켓+", shortLabel: "추출\n티켓+", color: "#85739d" },
  { id: "ticket-1", label: "무작위 티어 1 티켓", shortLabel: "티어 1\n티켓", color: "#557766" },
  { id: "ticket-2", label: "무작위 티어 2 티켓", shortLabel: "티어 2\n티켓", color: "#6c6294" },
  { id: "ticket-3", label: "무작위 티어 3 티켓", shortLabel: "티어 3\n티켓", color: "#b18127", jackpot: true },
  { id: "gold", label: "골드", shortLabel: "골드\n×3", color: "#997331" },
] as const;

export type RewardRouletteSlot = typeof REWARD_ROULETTE_SLOTS[number]["id"];
export type BattleRewardRoulette = {
  remaining: RewardRouletteSlot[];
  selected: RewardRouletteSlot | null;
  phase: "ready" | "spinning" | "settled" | "empty";
};

export const freshRewardRoulette = (): RewardRouletteSlot[] => REWARD_ROULETTE_SLOTS.map(slot => slot.id);

export function normalizeRewardRoulette(value: unknown): RewardRouletteSlot[] {
  if (!Array.isArray(value)) return freshRewardRoulette();
  const known = new Set<string>(freshRewardRoulette());
  return [...new Set(value.filter((id): id is RewardRouletteSlot => typeof id === "string" && known.has(id)))];
}

const pick = <T>(items: readonly T[], random: () => number): T =>
  items[Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))];

/** Every remaining wedge has equal probability. A used wedge stays unavailable until a portal. */
export function rollRewardRoulette(remaining: readonly RewardRouletteSlot[], random = Math.random) {
  if (remaining.length === 0) return null;
  const selected = pick(remaining, random);
  return { selected, remaining: remaining.filter(id => id !== selected) };
}

export function createRoulettePrize(slot: RewardRouletteSlot, region: number, cardId: number,
  random = Math.random): { card?: Card; consumableType?: TicketType; gold: number } {
  if (slot === "special-a" || slot === "special-b" || slot === "rare") {
    const pool = slot === "rare" ? RARE_CARD_POOL : SPECIAL_CARD_POOL;
    return { card: { ...pick(pool, random), id: cardId, revealed: false }, gold: 0 };
  }
  if (slot === "gold") return { gold: rollBattleRewardGold(region, random) * 3 };
  const tier = slot === "ticket-3" ? 3 : slot === "ticket-2" ? 2 : 1;
  const consumableType = slot === "extract" ? "extractTicket"
    : slot === "extract-plus" ? "extractPlusTicket"
    : pick(TICKET_TYPES.filter(type => TICKET_TIERS[type] === tier), random);
  return { consumableType, gold: 0 };
}
