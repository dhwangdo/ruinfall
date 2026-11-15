import type { Consumable } from "../game/rewards";
import { ConsumableTicketTierMark, consumableTicketTierClassName } from "./ConsumableTicketTierMark";
import { VisualSurface, type VisualSurfaceProps } from "./VisualSurface";
import { itemStackStyle } from "./itemStackStyle";
import { RarityText } from "./RarityText";

type Props = VisualSurfaceProps & {
  item: Consumable;
  variant?: "compact" | "full";
  description?: string;
  count?: number;
};

/** Both sizes share one palette, tier border, title and description definition. */
export function ConsumableVisual({ as, item, variant = "compact", description = item.description,
  count = 1, className = "", children, style, ...attributes }: Props) {
  return <VisualSurface {...attributes} as={as}
    className={`consumable-visual consumable-visual-${variant} consumable-ticket ${item.type} ${consumableTicketTierClassName(item.type)} ${className}`.trim()}
    style={variant === "compact" ? { ...itemStackStyle(count), ...style } : style}>
    <ConsumableTicketTierMark type={item.type} />
    <strong className="consumable-title">{item.name}</strong>
    {variant === "full" && <p className="consumable-effect"><RarityText>{description}</RarityText></p>}
    {count > 1 && <span className="inventory-card-count">x{count}</span>}
    {children}
  </VisualSurface>;
}
