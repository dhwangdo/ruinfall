import { CardVisual } from "./CardVisual";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { CardKeywordPopover } from "./CardKeywordPopover";
import type { DeckEditorPreviewActions } from "./deck-editor/types";
import { DECK_EDITION_INFO } from "../game/rewards";
import { useFloatingPreviews } from "../hooks/useFloatingPreviews";
import { ConsumableCardPreview } from "./ConsumableCardPreview";

export function DeckEditorPreviews({ controlsRef, suppressed }: {
  controlsRef: Ref<DeckEditorPreviewActions | null>;
  suppressed: boolean;
}) {
  const keywordRef = useRef<HTMLElement | null>(null);
  const preview = useFloatingPreviews({
    deckCardPreviewsSuppressed: suppressed,
    consumablePreviewSuppressed: suppressed,
    cardKeywordPopoverRef: keywordRef,
  });
  const { clearFloatingTooltips } = preview;
  useImperativeHandle(controlsRef, () => ({
    moveDeckCardPreview: preview.moveDeckCardPreview,
    showDeckCardPreview: preview.showDeckCardPreview,
    clearCardPreview: clearFloatingTooltips,
    consumablePreview: {
      show: preview.showConsumablePreview,
      clear: clearFloatingTooltips,
    },
    editionTooltip: {
      show: preview.showDeckEditionTooltip,
      clear: () => preview.setHoveredDeckEditionTooltip(null),
    },
  }));
  useEffect(() => {
    window.addEventListener("scroll", clearFloatingTooltips, true);
    window.addEventListener("resize", clearFloatingTooltips);
    window.addEventListener("blur", clearFloatingTooltips);
    document.addEventListener("visibilitychange", clearFloatingTooltips);
    return () => {
      window.removeEventListener("scroll", clearFloatingTooltips, true);
      window.removeEventListener("resize", clearFloatingTooltips);
      window.removeEventListener("blur", clearFloatingTooltips);
      document.removeEventListener("visibilitychange", clearFloatingTooltips);
    };
  }, [clearFloatingTooltips]);
  if (suppressed) return null;
  const { hoveredDeckCard: card, hoveredConsumable: consumable, deckPreviewPosition: position,
    hoveredCardKeywords, hoveredDeckEditionTooltip: edition } = preview;
  return (
    <>
      {card && <aside className="deck-card-preview-floating" style={{ left: position.x, top: position.y }} aria-live="polite">
        <CardVisual
          card={card}
        />
      </aside>}
      {consumable && <ConsumableCardPreview item={consumable} position={position} />}
      <CardKeywordPopover popover={hoveredCardKeywords} popoverRef={keywordRef} onDismiss={preview.clearCardKeywordHover} />
      {edition && <aside className="deck-edition-tooltip-floating" style={{ left: edition.x, top: edition.y, width: edition.width }} role="tooltip">
        <strong>{DECK_EDITION_INFO[edition.edition].name}</strong>
        <span>{DECK_EDITION_INFO[edition.edition].description}</span>
      </aside>}
    </>
  );
}
