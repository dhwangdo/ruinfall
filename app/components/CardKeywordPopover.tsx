import type { RefObject } from "react";
import { CardKeywordSections } from "./CardKeywordSections";
import type { CardKeywordPopoverState } from "./overlayTypes";
import { getCardKeywordInfos } from "../game/cardEffects";
import { cardKeywordPopoverWidth } from "./cardPreviewLayout";

export function CardKeywordPopover({
  popover,
  popoverRef,
}: {
  popover: CardKeywordPopoverState | null;
  popoverRef: RefObject<HTMLElement | null>;
}) {
  if (!popover) return null;
  const keywords = getCardKeywordInfos(popover.card);
  return (
    <aside
      className="card-keyword-popover"
      ref={popoverRef}
      style={{ left: popover.x, top: popover.y, width: cardKeywordPopoverWidth(keywords) }}
      role="tooltip"
      aria-label={`${popover.card.name} 키워드 설명`}
    >
      <CardKeywordSections keywords={keywords} />
    </aside>
  );
}
