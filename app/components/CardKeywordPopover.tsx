"use client";

import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { CardKeywordSections } from "./CardKeywordSections";
import type { CardKeywordPopoverState } from "./overlayTypes";
import { getCardKeywordInfos } from "../game/cardEffects";
import { CARD_KEYWORD_HOVER_DELAY_MS, CARD_MECHANIC_HOVER_DELAY_MS, cardKeywordPopoverWidth } from "./cardPreviewLayout";
import { getCardMechanicExamples } from "./cardMechanicExamples";
import { CardMechanicExamplePopover } from "./CardMechanicExamplePopover";
import { useGameSettings } from "../hooks/useGameSettings";

export function CardKeywordPopover({
  popover,
  popoverRef,
  onDismiss,
}: {
  popover: CardKeywordPopoverState | null;
  popoverRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
}) {
  const { animationTooltipsEnabled } = useGameSettings();
  if (!popover) return null;
  return <CardKeywordContent key={`${popover.card.id}-${popover.card.effect}-${popover.card.forged}-${animationTooltipsEnabled}`} popover={popover} popoverRef={popoverRef} onDismiss={onDismiss} animationTooltipsEnabled={animationTooltipsEnabled} />;
}

function CardKeywordContent({ popover, popoverRef, onDismiss, animationTooltipsEnabled }: {
  popover: CardKeywordPopoverState;
  popoverRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  animationTooltipsEnabled: boolean;
}) {
  const keywords = getCardKeywordInfos(popover.card);
  const examples = animationTooltipsEnabled ? getCardMechanicExamples(popover.card) : [];
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (examples.length === 0) return;
    const timer = window.setTimeout(() => setExpanded(true), CARD_MECHANIC_HOVER_DELAY_MS - CARD_KEYWORD_HOVER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [examples.length]);
  useEffect(() => {
    const dismissWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onDismiss(); };
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("blur", onDismiss);
    window.addEventListener("pointerdown", onDismiss, true);
    window.addEventListener("keydown", dismissWithEscape);
    document.addEventListener("visibilitychange", onDismiss);
    return () => {
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("blur", onDismiss);
      window.removeEventListener("pointerdown", onDismiss, true);
      window.removeEventListener("keydown", dismissWithEscape);
      document.removeEventListener("visibilitychange", onDismiss);
    };
  }, [onDismiss]);
  return (
    <>
    <aside
      className="card-keyword-popover"
      ref={popoverRef}
      style={{ left: popover.x, top: popover.y, width: cardKeywordPopoverWidth(keywords) }}
      role="tooltip"
      aria-label={`${popover.card.name} 키워드 설명`}
    >
      <CardKeywordSections keywords={keywords} />
      {!expanded && examples.length > 0 && <div className="card-mechanic-hover-progress"
        role="progressbar" aria-label="3초 동안 머무르면 애니메이션 예시 표시"
        style={{ "--mechanic-hover-duration": `${CARD_MECHANIC_HOVER_DELAY_MS - CARD_KEYWORD_HOVER_DELAY_MS}ms` } as CSSProperties}>
        <i />
      </div>}
    </aside>
    {expanded && examples.length > 0 && <CardMechanicExamplePopover examples={examples} anchorRef={popoverRef} anchorX={popover.x} anchorY={popover.y} />}
    </>
  );
}
