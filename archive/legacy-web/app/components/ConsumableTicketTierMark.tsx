import type { Consumable } from "../game/rewards";
import { TICKET_TIERS, type TicketType } from "../game/shopRules";

function ticketTier(type: Consumable["type"]) {
  return type === "cardPack" ? 0 : TICKET_TIERS[type as TicketType] ?? 0;
}

export function consumableTicketTierClassName(type: Consumable["type"]) {
  const tier = ticketTier(type);
  return tier > 0 ? `ticket-tier-${tier}` : "";
}

export function ConsumableTicketTierMark({ type }: { type: Consumable["type"] }) {
  const tier = ticketTier(type);
  if (tier < 1) return null;

  return (
    <span className="ticket-tier-mark" role="img" aria-label={`티어 ${tier}`}>
      {"★".repeat(tier)}
    </span>
  );
}
