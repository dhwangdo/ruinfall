const ALL_TICKET_TYPES = [
  "mindEyeTicket",
  "darkTicket",
  "bombTicket",
  "extractTicket",
  "transformTicket",
  "cloneTicket",
  "expandTicket",
] as const;

export type TicketType = typeof ALL_TICKET_TYPES[number];

// Keep definitions so these tickets can return later; exclude every acquisition pool now.
export const TEMPORARILY_DISABLED_TICKETS: ReadonlySet<string> = new Set(["mindEyeTicket", "darkTicket", "extractPlusTicket"]);
export const TICKET_TYPES: readonly TicketType[] = ALL_TICKET_TYPES.filter(type => !TEMPORARILY_DISABLED_TICKETS.has(type));

export const TICKET_TIERS: Record<TicketType, 1 | 2 | 3> = {
  bombTicket: 1,
  extractTicket: 1,
  mindEyeTicket: 1,
  darkTicket: 1,
  transformTicket: 2,
  cloneTicket: 3,
  expandTicket: 3,
};

export function ticketBasePrice(type: TicketType) {
  return 30 + (TICKET_TIERS[type] - 1) * 50;
}
