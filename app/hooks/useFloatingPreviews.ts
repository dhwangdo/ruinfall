import { useCallback, useEffect, useLayoutEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { BlessingTooltipState, CardKeywordPopoverState, DeckEditionTooltipState } from "../components/overlayTypes";
import type { Card } from "../game/cards";
import { getCardKeywordInfos } from "../game/cardEffects";
import type { BlessingId } from "../game/blessingRules";
import { BLESSING_INFO } from "../game/blessingRules";
import type { Consumable, DeckEdition } from "../game/rewards";
import { CARD_PREVIEW_FRAME_WIDTH, CARD_PREVIEW_FRAME_HEIGHT, CONSUMABLE_PREVIEW_FRAME_WIDTH, CONSUMABLE_PREVIEW_FRAME_HEIGHT, CARD_KEYWORD_HOVER_DELAY_MS, cardKeywordPopoverWidth } from "../components/cardPreviewLayout";

const KEYWORD_POPOVER_GAP = 16;
type KeywordHoverRequest = { card: Card; right: number; top: number };

export function useFloatingPreviews({
  deckCardPreviewsSuppressed,
  consumablePreviewSuppressed,
  cardKeywordPopoverRef,
}: {
  deckCardPreviewsSuppressed: boolean;
  consumablePreviewSuppressed: boolean;
  cardKeywordPopoverRef: { current: HTMLElement | null };
}) {
  const [hoveredDeckCard, setHoveredDeckCard] = useState<Card | null>(null);
  const [hoveredCardKeywords, setHoveredCardKeywords] = useState<CardKeywordPopoverState | null>(null);
  const [keywordHoverRequest, setKeywordHoverRequest] = useState<KeywordHoverRequest | null>(null);
  const [hoveredDeckEditionTooltip, setHoveredDeckEditionTooltip] = useState<DeckEditionTooltipState | null>(null);
  const [hoveredBlessingTooltip, setHoveredBlessingTooltip] = useState<BlessingTooltipState | null>(null);
  const [hoveredConsumable, setHoveredConsumable] = useState<Consumable | null>(null);
  const [deckPreviewPosition, setDeckPreviewPosition] = useState({ x: 0, y: 0 });

  const clearCardKeywordHover = useCallback(() => {
    setKeywordHoverRequest(null);
    setHoveredCardKeywords(null);
  }, []);

  const clearFloatingTooltips = useCallback(() => {
    setHoveredDeckCard(null);
    clearCardKeywordHover();
    setHoveredDeckEditionTooltip(null);
    setHoveredBlessingTooltip(null);
    setHoveredConsumable(null);
  }, [clearCardKeywordHover]);

  useEffect(() => {
    if (!keywordHoverRequest) return;
    const timer = window.setTimeout(() => {
      const margin = 12;
      const left = keywordHoverRequest.right + KEYWORD_POPOVER_GAP;
      const anchorTop = Math.max(margin, keywordHoverRequest.top);
      setHoveredCardKeywords({
        card: keywordHoverRequest.card,
        x: left,
        y: anchorTop,
        anchorTop,
      });
    }, CARD_KEYWORD_HOVER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [keywordHoverRequest]);

  useLayoutEffect(() => {
    if (!hoveredCardKeywords || !cardKeywordPopoverRef.current) return;
    const margin = 12;
    const { height: actualHeight, width: actualWidth } = cardKeywordPopoverRef.current.getBoundingClientRect();
    const correctedLeft = Math.max(margin, Math.min(hoveredCardKeywords.x, window.innerWidth - actualWidth - margin));
    const correctedTop = Math.max(
      margin,
      Math.min(hoveredCardKeywords.anchorTop, window.innerHeight - actualHeight - margin),
    );
    if (Math.abs(correctedTop - hoveredCardKeywords.y) < 0.5 && Math.abs(correctedLeft - hoveredCardKeywords.x) < 0.5) return;
    setHoveredCardKeywords((current) => current && current.card.id === hoveredCardKeywords.card.id
      ? { ...current, x: correctedLeft, y: correctedTop }
      : current);
  }, [hoveredCardKeywords, cardKeywordPopoverRef]);

  const scheduleCardKeywordHover = (card: Card, cardRight: number, cardTop: number) => {
    if (getCardKeywordInfos(card).length === 0) {
      clearCardKeywordHover();
      return;
    }
    const requestChanged = keywordHoverRequest?.card.id !== card.id
      || keywordHoverRequest.right !== cardRight
      || keywordHoverRequest.top !== cardTop;
    if (requestChanged) {
      setKeywordHoverRequest({ card, right: cardRight, top: cardTop });
      // Position changes during a hand-card hover animation must not restart the long-hover timer.
      setHoveredCardKeywords(current => current?.card.id === card.id
        ? { card, x: cardRight + KEYWORD_POPOVER_GAP, y: current.y, anchorTop: Math.max(12, cardTop) }
        : null);
    }
  };

  const showCardKeywordOnly = (card: Card, cardRight: number, cardTop: number) => {
    if (deckCardPreviewsSuppressed) {
      clearCardKeywordHover();
      setHoveredDeckCard(null);
      setHoveredConsumable(null);
      return;
    }
    scheduleCardKeywordHover(card, cardRight, cardTop);
    setHoveredDeckCard(null);
    setHoveredConsumable(null);
  };

  const showDeckCardPreview = (
    card: Card,
    anchorRight: number,
    anchorTop: number,
    placement: "right" | "left" = "right",
    anchorLeft?: number,
  ) => {
    if (deckCardPreviewsSuppressed) {
      clearCardKeywordHover();
      setHoveredDeckCard(null);
      setHoveredConsumable(null);
      return;
    }
    const margin = 12;
    const offset = 18;
    const previewWidth = CARD_PREVIEW_FRAME_WIDTH;
    const previewHeight = CARD_PREVIEW_FRAME_HEIGHT;
    const previewLeft = placement === "left" && anchorLeft !== undefined
      ? anchorLeft - previewWidth - offset
      : anchorRight + offset;
    const previewTop = Math.max(margin, Math.min(anchorTop + offset, window.innerHeight - previewHeight - margin));
    const previewRight = previewLeft + previewWidth;
    const keywordWidth = cardKeywordPopoverWidth(getCardKeywordInfos(card));
    const keywordAnchorRight = placement === "left"
      ? previewLeft - keywordWidth - KEYWORD_POPOVER_GAP * 2
      : previewRight;
    scheduleCardKeywordHover(card, keywordAnchorRight, previewTop);
    setHoveredDeckCard(card);
    setHoveredConsumable(null);
    setDeckPreviewPosition(current => current.x === previewLeft && current.y === previewTop
      ? current : { x: previewLeft, y: previewTop });
  };

  const showConsumablePreview = (consumable: Consumable, anchorRight: number, anchorTop: number) => {
    if (consumablePreviewSuppressed) {
      clearCardKeywordHover();
      setHoveredDeckCard(null);
      setHoveredConsumable(null);
      return;
    }
    const margin = 12;
    const offset = 18;
    const previewHeight = CONSUMABLE_PREVIEW_FRAME_HEIGHT;
    const previewLeft = Math.max(margin, Math.min(anchorRight + offset,
      window.innerWidth - CONSUMABLE_PREVIEW_FRAME_WIDTH - margin));
    setHoveredDeckCard(null);
    clearCardKeywordHover();
    setHoveredConsumable(consumable);
    const previewTop = Math.max(margin, Math.min(anchorTop + offset, window.innerHeight - previewHeight - margin));
    setDeckPreviewPosition(current => current.x === previewLeft && current.y === previewTop
      ? current : { x: previewLeft, y: previewTop });
  };

  const moveDeckCardPreview = (
    event: ReactMouseEvent<HTMLElement>,
    card: Card,
    placement: "right" | "left" = "right",
  ) => {
    // Static previews need no layout reads until their card or hover state changes.
    if (hoveredDeckCard === card
      && (keywordHoverRequest?.card === card || getCardKeywordInfos(card).length === 0)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    showDeckCardPreview(card, bounds.right, bounds.top, placement, bounds.left);
  };

  const showDeckEditionTooltip = (event: ReactMouseEvent<HTMLElement>, edition: DeckEdition) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewportMargin = 12;
    const gap = 10;
    const preferredWidth = 310;
    const leftSpace = Math.max(0, bounds.left - gap - viewportMargin);
    const rightSpace = Math.max(0, window.innerWidth - bounds.right - gap - viewportMargin);
    const placeLeft = rightSpace < preferredWidth && leftSpace > rightSpace;
    const availableSpace = placeLeft ? leftSpace : rightSpace;
    const width = Math.min(preferredWidth, availableSpace);
    const x = placeLeft ? bounds.left - gap - width : bounds.right + gap;
    const y = Math.max(viewportMargin, Math.min(bounds.top + bounds.height / 2, window.innerHeight - viewportMargin));
    setHoveredDeckEditionTooltip(current => current?.edition === edition
      && current.x === x && current.y === y && current.width === width
      ? current : { edition, x, y, width });
  };

  const showBlessingTooltip = (
    event: { currentTarget: HTMLElement },
    blessing: BlessingId | { name: string; description: string },
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewportMargin = 12;
    const gap = 10;
    const preferredWidth = 310;
    const leftSpace = Math.max(0, bounds.left - gap - viewportMargin);
    const rightSpace = Math.max(0, window.innerWidth - bounds.right - gap - viewportMargin);
    const placeLeft = rightSpace < preferredWidth && leftSpace > rightSpace;
    const availableSpace = placeLeft ? leftSpace : rightSpace;
    const width = Math.min(preferredWidth, availableSpace);
    const x = placeLeft ? bounds.left - gap - width : bounds.right + gap;
    const y = Math.max(viewportMargin, Math.min(bounds.top + bounds.height / 2, window.innerHeight - viewportMargin));
    const info = typeof blessing === "string" ? BLESSING_INFO[blessing] : blessing;
    setHoveredBlessingTooltip(current => current?.name === info.name && current.description === info.description
      && current.x === x && current.y === y && current.width === width
      ? current : { name: info.name, description: info.description, x, y, width });
  };

  return {
    hoveredDeckCard,
    setHoveredDeckCard,
    hoveredCardKeywords,
    hoveredDeckEditionTooltip,
    setHoveredDeckEditionTooltip,
    hoveredBlessingTooltip,
    setHoveredBlessingTooltip,
    hoveredConsumable,
    setHoveredConsumable,
    deckPreviewPosition,
    clearCardKeywordHover,
    clearFloatingTooltips,
    showCardKeywordOnly,
    showDeckCardPreview,
    showConsumablePreview,
    moveDeckCardPreview,
    showDeckEditionTooltip,
    showBlessingTooltip,
  };
}
