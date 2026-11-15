import { useMemo, type MouseEvent } from "react";
import type { Card } from "../game/cards";
import type { DeckCase } from "../game/rewards";
import { createDeckCardView } from "../game/deckEditorViews";
import { CardVisual } from "./CardVisual";
import { DeckSlotPlaceholder } from "./DeckSlotPlaceholder";

export function DeckVaultCards({ deck, onCardHover, onCardLeave, showEmptySlots = true }: {
  deck: DeckCase;
  onCardHover: (event: MouseEvent<HTMLElement>, card: Card) => void;
  onCardLeave: () => void;
  showEmptySlots?: boolean;
}) {
  const view = useMemo(() => createDeckCardView(deck), [deck]);
  return (
    <div className="deck-vault-cards">
      {view.items.map((item) => item.kind === "card"
        ? <CardVisual key={item.key} card={item.group.card} variant="compact" count={item.group.cardIds.length}
          onMouseEnter={(event) => onCardHover(event, item.group.card)}
          onMouseMove={(event) => onCardHover(event, item.group.card)}
          onMouseLeave={onCardLeave} />
        : (showEmptySlots || (item.kind === "divider" && view.rareSlotCount > 0 && view.normalCardCount > 0))
          ? <DeckSlotPlaceholder key={item.key} kind={item.kind} /> : null)}
    </div>
  );
}
