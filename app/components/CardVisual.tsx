import { CardFace, type CardFaceProps } from "./CardFace";
import { VisualSurface, type VisualSurfaceProps } from "./VisualSurface";
import { UNPLAYABLE_CARD_EFFECTS, type Card } from "../game/cards";
import { cardForgeCount } from "../game/cardEffects";
import { itemStackStyle } from "./itemStackStyle";

type CompactCard = Pick<Card, "effect" | "name" | "rarity" | "cost" | "forged" | "colored" | "forgeCostsCompleted">;
type Props = VisualSurfaceProps & {
  count?: number;
  showNewBadge?: boolean;
  faceProps?: Omit<CardFaceProps, "card">;
  faceDown?: boolean;
} & ({ variant: "compact"; card: CompactCard } | { variant?: "full"; card: Card });

export function CardVisual(props: Props) {
  const { as, card, variant = "full", count = 1, showNewBadge = false, faceProps,
    faceDown = false, className = "", children, style, ...attributes } = props;
  const classes = props.variant === "compact"
    ? `card-visual card-visual-${variant} deck-editor-card rarity-${card.rarity} ${className}`
    : `card-visual card-visual-${variant} ${faceDown ? "face-down" : `card-face ${props.card.kind} ${props.card.damageType}`} ${className}`;
  const cost = UNPLAYABLE_CARD_EFFECTS.has(card.effect) ? undefined : card.cost;
  return <VisualSurface {...attributes} as={as} className={classes.trim()}
    style={variant === "compact" ? { ...itemStackStyle(count), ...style } : style}>
    {props.variant === "compact" ? <>
      {count > 1 && <span className="editor-card-stack-bands" aria-hidden="true" />}
      {cost !== undefined && <span className="editor-card-cost">{cost}</span>}
      <strong className="editor-card-name">{card.name}{card.effect === "obsidianDagger" && cardForgeCount(card) > 0 ? ` +${cardForgeCount(card)}` : card.forged && !["astronomyResearch", "necromancyResearch"].includes(card.effect) ? "+" : ""}</strong>
      {card.colored && <em className="deck-card-painted">색칠</em>}
      {showNewBadge && <em className="deck-card-new">NEW!</em>}
      {count > 1 && <span className="inventory-card-count">x{count}</span>}
    </> : faceDown ? <span className={`card-back-pattern ${"colored" in card && card.colored ? "is-painted" : ""}`} />
      : <CardFace card={props.card} {...faceProps} />}
    {children}
  </VisualSurface>;
}
