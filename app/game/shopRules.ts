export const TICKET_TYPES = [
  "paintTicket",
  "mindEyeTicket",
  "darkTicket",
  "bombTicket",
  "extractTicket",
  "extractPlusTicket",
  "transformTicket",
  "mapTicket",
  "cloneTicket",
  "expandTicket",
] as const;

export type TicketType = typeof TICKET_TYPES[number];

export const TICKET_TIERS: Record<TicketType, 1 | 2 | 3> = {
  paintTicket: 1,
  bombTicket: 1,
  extractTicket: 1,
  extractPlusTicket: 2,
  mapTicket: 1,
  mindEyeTicket: 1,
  darkTicket: 1,
  transformTicket: 2,
  cloneTicket: 3,
  expandTicket: 3,
};

export function ticketBasePrice(type: TicketType) {
  return 30 + (TICKET_TIERS[type] - 1) * 50;
}
