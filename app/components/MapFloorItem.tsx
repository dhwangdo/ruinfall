import type { Card } from "../game/cards";
import type { Consumable, DeckCase } from "../game/rewards";
import { CardVisual } from "./CardVisual";
import { ConsumableVisual } from "./ConsumableVisual";
import { DeckName } from "./DeckName";

export type MapFloorItemProps = { deck?: DeckCase; card?: Card; ticket?: Consumable };

export function MapFloorItem({ deck, card, ticket }: MapFloorItemProps) {
  return <div className="map-floor-item" aria-hidden="true">
    {deck ? <div className="floor-deck-item">
      <span className="floor-deck-icon" />
      <strong><DeckName deck={deck} showEditions={false} showGenerationDebug={false} /></strong>
      <span>{deck.cards.length} / {deck.capacity}</span>
    </div> : card ? <CardVisual card={card} variant="compact" />
      : ticket ? <ConsumableVisual item={ticket} variant="compact" /> : null}
  </div>;
}
