import { useMemo, type MouseEvent } from "react";
import type { Card } from "../game/cards";
import type { DeckCase } from "../game/rewards";
import { createDeckCardView } from "../game/deckEditorViews";
import { CardVisual } from "./CardVisual";
import { DeckSlotPlaceholder } from "./DeckSlotPlaceholder";

export function DeckVaultCards({ deck, onCardHover, onCardLeave }: {
  deck: DeckCase;
  onCardHover: (event: MouseEvent<HTMLElement>, card: Card) => void;
  onCardLeave: () => void;
}) {
  const view = useMemo(() => createDeckCardView(deck), [deck]);
  return (
    <div className="deck-vault-cards">
      {view.items.map((item) => item.kind === "card"
        ? <CardVisual key={item.key} card={item.group.card} variant="compact" count={item.group.cardIds.length}
          onMouseEnter={(event) => onCardHover(event, item.group.card)}
          onMouseMove={(event) => onCardHover(event, item.group.card)}
          onMouseLeave={onCardLeave} />
        : <DeckSlotPlaceholder key={item.key} kind={item.kind} />)}
    </div>
  );
}
