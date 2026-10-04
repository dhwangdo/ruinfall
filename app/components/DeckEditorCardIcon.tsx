import { UNPLAYABLE_CARD_EFFECTS, type Card } from "../game/cards";
import { cardForgeCount, IRON_WALL_COST } from "../game/cardEffects";

type DeckEditorCardIconData = Pick<Card, "effect" | "name" | "rarity" | "cost" | "forged" | "colored" | "forgeCostsCompleted"> & { id?: number };

export function DeckEditorCardIcon({ card, count = 1, showNewBadge = false }: {
  card: DeckEditorCardIconData;
  count?: number;
  showNewBadge?: boolean;
}) {
  const cost = UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    ? ""
    : card.effect === "ironWall" ? IRON_WALL_COST : card.cost;
  return (
    <>
      {cost !== "" && cost !== undefined && <span className="editor-card-cost">{cost}</span>}
      <strong className="editor-card-name">{card.name}{card.effect === "obsidianDagger" && cardForgeCount(card) > 0 ? ` +${cardForgeCount(card)}` : card.forged && !["astronomyResearch", "necromancyResearch"].includes(card.effect) ? "+" : ""}</strong>
      {card.colored && <em className="deck-card-painted">색칠</em>}
      {showNewBadge && <em className="deck-card-new">NEW!</em>}
      {count > 1 && <span className="inventory-card-count">x{count}</span>}
    </>
  );
}
