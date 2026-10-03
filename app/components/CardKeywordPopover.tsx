import type { RefObject } from "react";
import { CardKeywordSections } from "./CardKeywordSections";
import type { CardKeywordPopoverState } from "./overlayTypes";
import { getCardKeywordInfos } from "../game/cardEffects";

export function CardKeywordPopover({
  popover,
  popoverRef,
}: {
  popover: CardKeywordPopoverState | null;
  popoverRef: RefObject<HTMLElement | null>;
}) {
  if (!popover) return null;
  return (
    <aside
      className="card-keyword-popover"
      ref={popoverRef}
      style={{ left: popover.x, top: popover.y }}
      role="tooltip"
      aria-label={`${popover.card.name} 키워드 설명`}
    >
      <CardKeywordSections keywords={getCardKeywordInfos(popover.card)} />
    </aside>
  );
}
