import { ConsumableVisual } from "./ConsumableVisual";
import type { CSSProperties } from "react";
import type { Consumable } from "../game/rewards";

export function ConsumableCardPreview({ item, position, description = item.description }: {
  item: Consumable;
  position: { x: number; y: number };
  description?: string;
}) {
  return (
    <aside
      className={`deck-card-preview-floating deck-consumable-preview-floating ${item.type}`}
      style={{ left: position.x, top: position.y } as CSSProperties}
      role="tooltip"
      aria-label={item.name}
    >
      <ConsumableVisual
        as="article"
        item={item}
        variant="full"
        description={description}
      />
    </aside>
  );
}
