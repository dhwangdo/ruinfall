import { occupiedDeckSpace } from "../game/stickers";
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
import type { DeckCase } from "../game/rewards";
import { DECK_VAULT_KEY_COST } from "../game/deckVaultRules";
import { useDeckEditorPreviews } from "../hooks/useDeckEditorPreviews";
import { DeckEditorPreviews } from "./DeckEditorPreviews";
import { DeckName } from "./DeckName";
import { DeckVaultCards } from "./DeckVaultCards";

type Anchor = Pick<DOMRect, "left" | "right" | "top" | "bottom">;
type Preview = { deck: DeckCase; anchor: Anchor; side: "left" | "right" | "above" | "below"; width: number; maxHeight: number };
export type MapDeckVaultPreviewControls = {
  show: (deck: DeckCase, anchorElement: HTMLElement) => void;
  hide: (nextTarget: EventTarget | null, pointerLeave?: boolean) => void;
  clear: () => void;
};

export function MapDeckVaultPreview({ controlsRef }: { controlsRef: Ref<MapDeckVaultPreviewControls | null> }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [position, setPosition] = useState({ x: 12, y: 12 });
  const panelRef = useRef<HTMLElement | null>(null);
  const anchorElementRef = useRef<HTMLElement | null>(null);
  const cardPreviewsRef = useRef<HTMLDivElement | null>(null);
  const { controlsRef: cardControlsRef, actions: cardActions } = useDeckEditorPreviews();
  const clear = useCallback(() => {
    anchorElementRef.current = null;
    cardControlsRef.current?.clearCardPreview();
    setPreview(null);
  }, [cardControlsRef]);
  const hide = useCallback((nextTarget: EventTarget | null, pointerLeave = true) => {
    if (!anchorElementRef.current) return;
    if (nextTarget instanceof Node && [anchorElementRef.current, panelRef.current, cardPreviewsRef.current]
      .some(element => element?.contains(nextTarget))) return;
    // A focus change must not close a preview that is still under the pointer.
    if (!pointerLeave && (anchorElementRef.current.matches(":hover") || panelRef.current?.matches(":hover"))) return;
    clear();
  }, [clear]);
  useImperativeHandle(controlsRef, () => ({
    show: (deck, anchorElement) => {
      anchorElementRef.current = anchorElement;
      cardControlsRef.current?.clearCardPreview();
      const anchor = anchorElement.getBoundingClientRect();
      const leftSpace = Math.max(0, anchor.left - 11);
      const rightSpace = Math.max(0, window.innerWidth - anchor.right - 11);
      if (Math.max(leftSpace, rightSpace) >= 240) {
        const side = rightSpace >= 820 || rightSpace >= leftSpace ? "right" : "left";
        setPreview({ deck, anchor, side, width: Math.min(820, side === "right" ? rightSpace : leftSpace),
          maxHeight: window.innerHeight - 24 });
      } else {
        const aboveSpace = Math.max(0, anchor.top - 11);
        const belowSpace = Math.max(0, window.innerHeight - anchor.bottom - 11);
        const side = belowSpace >= aboveSpace ? "below" : "above";
        setPreview({ deck, anchor, side, width: Math.min(820, window.innerWidth - 24),
          maxHeight: side === "below" ? belowSpace : aboveSpace });
      }
    },
    hide,
    clear,
  }), [cardControlsRef, hide, clear]);

  useLayoutEffect(() => {
    if (!preview || !panelRef.current) return;
    const { width, height } = panelRef.current.getBoundingClientRect();
    const { anchor, side } = preview;
    // Share one pixel with the tile so the pointer can cross without a dead gap.
    const preferredX = side === "right" ? anchor.right - 1 : side === "left" ? anchor.left - width + 1 : anchor.left;
    const preferredY = side === "below" ? anchor.bottom - 1 : side === "above" ? anchor.top - height + 1 : anchor.top;
    setPosition({
      x: Math.max(12, Math.min(preferredX, window.innerWidth - width - 12)),
      y: Math.max(12, Math.min(preferredY, window.innerHeight - height - 12)),
    });
  }, [preview]);

  useEffect(() => {
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      clear();
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") clear(); };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", clear);
    window.addEventListener("blur", clear);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", clear);
      window.removeEventListener("blur", clear);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [clear]);

  if (!preview) return null;
  return <>
    <aside ref={panelRef} id="map-deck-vault-preview" className="map-deck-vault-preview deck-vault-panel"
      role="tooltip" style={{ left: position.x, top: position.y, width: preview.width, maxHeight: preview.maxHeight }}
      onMouseLeave={(event) => hide(event.relatedTarget)}>
      <header>
        <div>
          <h2><DeckName deck={preview.deck} /></h2>
          <p>{occupiedDeckSpace(preview.deck.cards)} / {preview.deck.capacity}장 · 열쇠 {DECK_VAULT_KEY_COST}개로 개방</p>
        </div>
      </header>
      <DeckVaultCards deck={preview.deck} onCardHover={cardActions.moveDeckCardPreview}
        onCardLeave={cardActions.clearCardPreview} />
    </aside>
    <div ref={cardPreviewsRef} onMouseLeave={(event) => hide(event.relatedTarget)}>
      <DeckEditorPreviews controlsRef={cardControlsRef} suppressed={false} />
    </div>
  </>;
}
