import { useMemo, useRef } from "react";
import type { DeckEditorPreviewActions } from "../components/deck-editor/types";

/** Hover state stays in the preview layer, outside the map and card lists. */
export function useDeckEditorPreviews() {
  const controlsRef = useRef<DeckEditorPreviewActions | null>(null);
  const actions = useMemo<DeckEditorPreviewActions>(() => ({
    moveDeckCardPreview: (...args) => controlsRef.current?.moveDeckCardPreview(...args),
    showDeckCardPreview: (...args) => controlsRef.current?.showDeckCardPreview(...args),
    clearCardPreview: () => controlsRef.current?.clearCardPreview(),
    consumablePreview: {
      show: (...args) => controlsRef.current?.consumablePreview.show(...args),
      clear: () => controlsRef.current?.consumablePreview.clear(),
    },
    editionTooltip: {
      show: (...args) => controlsRef.current?.editionTooltip.show(...args),
      clear: () => controlsRef.current?.editionTooltip.clear(),
    },
  }), []);
  return { controlsRef, actions };
}
