"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RarityText } from "./RarityText";

type Anchor = { left: number; top: number; bottom: number; width: number };

export function BattleStatusBadge({ children, description, kind = "buff", tooltipTitle, className, ariaLabel, onClick }: {
  children: ReactNode;
  description: string;
  kind?: "buff" | "debuff";
  tooltipTitle?: ReactNode;
  className?: string;
  ariaLabel?: string;
  onClick?: (event: ReactMouseEvent<HTMLSpanElement>) => void;
}) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const tooltipRef = useRef<HTMLElement>(null);
  const tooltipId = useId();

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;
    const { width, height } = tooltip.getBoundingClientRect();
    const left = Math.max(8, Math.min(anchor.left + anchor.width / 2 - width / 2, window.innerWidth - width - 8));
    const above = anchor.top - height - 8;
    const top = above >= 8 ? above : Math.max(8, Math.min(anchor.bottom + 8, window.innerHeight - height - 8));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.visibility = "visible";
  }, [anchor, description, children]);

  useEffect(() => {
    if (!anchor) return;
    const hide = () => setAnchor(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("blur", hide);
    window.addEventListener("pointerdown", hide);
    window.addEventListener("keydown", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("blur", hide);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("keydown", hide);
    };
  }, [anchor]);

  return <>
    <span
      className={`battle-status-badge is-${kind} ${className ?? ""}`}
      aria-describedby={anchor ? tooltipId : undefined}
      aria-label={ariaLabel}
      onMouseEnter={event => setAnchor(event.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setAnchor(null)}
      onFocus={event => setAnchor(event.currentTarget.getBoundingClientRect())}
      onBlur={() => setAnchor(null)}
      onClick={onClick}
    >{children}</span>
    {anchor && createPortal(
      <aside ref={tooltipRef} id={tooltipId} role="tooltip" className="battle-status-tooltip"
        style={{ left: 0, top: 0, visibility: "hidden" }}>
        <strong>{tooltipTitle ?? children}</strong>
        <div><RarityText>{description}</RarityText></div>
      </aside>, document.body,
    )}
  </>;
}
