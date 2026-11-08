import { occupiedDeckSpace } from "../game/stickers";
import type { Card } from "../game/cards";
import type { Consumable, DeckCase } from "../game/rewards";
import { CardVisual } from "./CardVisual";
import { ConsumableVisual } from "./ConsumableVisual";
import { DeckName } from "./DeckName";
import { GoldPileVisual } from "./GoldPileVisual";

export type MapFloorItemProps = { deck?: DeckCase; card?: Card; ticket?: Consumable; gold?: number };

export function MapFloorItem({ deck, card, ticket, gold }: MapFloorItemProps) {
  const hasPrimaryItem = !!(deck || card || ticket);
  return <div className={`map-floor-item ${gold && !hasPrimaryItem ? "has-primary-gold" : ""}`} aria-hidden="true">
    {deck ? <div className="floor-deck-item">
      <span className="floor-deck-icon" />
      <strong><DeckName deck={deck} showEditions={false} showGenerationDebug={false} /></strong>
      <span>{occupiedDeckSpace(deck.cards)} / {deck.capacity}</span>
    </div> : card ? <CardVisual card={card} variant="compact" />
      : ticket ? <ConsumableVisual item={ticket} variant="compact" /> : null}
    {gold && gold > 0 && <span className={`floor-gold-pile ${hasPrimaryItem ? "is-secondary" : ""}`}>
      <GoldPileVisual amount={gold} />
    </span>}
  </div>;
}
