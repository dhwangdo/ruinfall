import { CardFace, type CardFaceProps } from "./CardFace";
import { VisualSurface, type VisualSurfaceProps } from "./VisualSurface";
import { UNPLAYABLE_CARD_EFFECTS, type Card } from "../game/cards";
import { cardForgeCount } from "../game/cardEffects";
import { cardEnergyCost } from "../game/cardEffects";
import { CardStickerMarks } from "./CardStickerMark";
import { itemStackStyle } from "./itemStackStyle";
import type { StickerId } from "../game/stickers";
import { cardStickerIds } from "../game/stickers";

type CompactCard = Pick<Card, "effect" | "name" | "rarity" | "cost" | "forged" | "sticker" | "stickers" | "clockworkTriggered" | "forgeCostsCompleted">;
type Props = VisualSurfaceProps & {
  count?: number;
  showNewBadge?: boolean;
  faceProps?: Omit<CardFaceProps, "card">;
  faceDown?: boolean;
  stickerPreview?: StickerId;
} & ({ variant: "compact"; card: CompactCard } | { variant?: "full"; card: Card });

export function CardVisual(props: Props) {
  const { as, card, variant = "full", count = 1, showNewBadge = false, faceProps, stickerPreview,
    faceDown = false, className = "", children, style, ...attributes } = props;
  const classes = props.variant === "compact"
    ? `card-visual card-visual-${variant} deck-editor-card rarity-${card.rarity} ${className}`
    : `card-visual card-visual-${variant} ${faceDown ? "face-down" : `card-face ${props.card.kind} ${props.card.damageType}`} ${className}`;
  const cost = UNPLAYABLE_CARD_EFFECTS.has(card.effect) ? undefined : cardEnergyCost(card);
  return <VisualSurface {...attributes} as={as} className={classes.trim()}
    style={variant === "compact" ? { ...itemStackStyle(count), ...style } : style}>
    {props.variant === "compact" ? <>
      {count > 1 && <span className="editor-card-stack-bands" aria-hidden="true" />}
      {cost !== undefined && <span className="editor-card-cost">{cost}</span>}
      <strong className="editor-card-name">{card.name}{card.effect === "obsidianDagger" && cardForgeCount(card) > 0 ? ` +${cardForgeCount(card)}` : card.forged && !["astronomyResearch", "necromancyResearch"].includes(card.effect) ? "+" : ""}</strong>
      <CardStickerMarks stickers={cardStickerIds(card)} previewSticker={stickerPreview} />
      {showNewBadge && <em className="deck-card-new">NEW!</em>}
      {count > 1 && <span className="inventory-card-count">x{count}</span>}
    </> : faceDown ? <><span className="card-back-pattern" /><CardStickerMarks stickers={cardStickerIds(card)} previewSticker={stickerPreview} /></>
      : <CardFace card={props.card} {...faceProps} stickerPreview={stickerPreview} />}
    {children}
  </VisualSurface>;
}
