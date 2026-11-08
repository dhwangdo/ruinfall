"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { STICKERS, type StickerId } from "../game/stickers";
import stickerAtlas from "../assets/sticker-atlas.png";

export const CARD_STICKER_HOVER_EVENT = "ruinfall:card-sticker-hover";

type TooltipPosition = { left: number; top: number; below: boolean };
type HoverSources = { pointer: boolean; focus: boolean };

const STICKER_ATLAS_CELL: Record<StickerId, readonly [number, number]> = {
  bookmark: [0, 0],
  moonstone: [1, 0],
  clockwork: [2, 0],
  kite: [3, 0],
  anchor: [4, 0],
  glowDinosaur: [0, 1],
  bluebird: [1, 1],
  hook: [2, 1],
  parachute: [3, 1],
  comet: [4, 1],
};
const STICKER_ART_ADJUSTMENT: Record<StickerId, { scale: number; x: number }> = {
  bookmark: { scale: 1.24, x: -10 },
  moonstone: { scale: 1.14, x: 0 },
  clockwork: { scale: 1.1, x: 0 },
  kite: { scale: 1.1, x: 3 },
  anchor: { scale: 1, x: 12 },
  glowDinosaur: { scale: .94, x: -5 },
  bluebird: { scale: .94, x: -10 },
  hook: { scale: .98, x: -2 },
  parachute: { scale: 1.05, x: 10 },
  comet: { scale: .9, x: 10 },
};

export function CardStickerMark({ sticker, preview = false, disableTooltip = false }: {
  sticker?: StickerId; preview?: boolean; disableTooltip?: boolean;
}) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const hoverSourcesRef = useRef<HoverSources>({ pointer: false, focus: false });
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  useEffect(() => () => {
    const { pointer, focus } = hoverSourcesRef.current;
    if ((pointer || focus) && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CARD_STICKER_HOVER_EVENT, { detail: false }));
    }
  }, []);
  if (!sticker) return null;
  const info = STICKERS[sticker];
  const [column, row] = STICKER_ATLAS_CELL[sticker];
  const adjustment = STICKER_ART_ADJUSTMENT[sticker];
  const stickerArtStyle = {
    backgroundImage: `url(${stickerAtlas.src})`,
    backgroundSize: "500% 200%",
    backgroundPosition: `${column * 25}% ${row * 100}%`,
    transform: `translateX(${adjustment.x}%) scale(${adjustment.scale})`,
  };

  const showTooltip = () => {
    if (disableTooltip) return;
    const marker = markerRef.current;
    if (!marker || typeof window === "undefined") return;
    const rect = marker.getBoundingClientRect();
    const width = Math.min(260, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    setTooltipPosition({ left, top: rect.top < 120 ? rect.bottom + 8 : rect.top - 8, below: rect.top < 120 });
  };
  const updateHoverSource = (source: keyof HoverSources, active: boolean) => {
    if (disableTooltip) return;
    hoverSourcesRef.current[source] = active;
    const isActive = hoverSourcesRef.current.pointer || hoverSourcesRef.current.focus;
    if (isActive) showTooltip();
    else setTooltipPosition(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CARD_STICKER_HOVER_EVENT, { detail: isActive }));
    }
  };

  return <>
    <span ref={markerRef} className={`card-sticker-mark ${preview ? "is-pending" : ""}`} role="img"
      aria-label={`${info.name}: ${info.description}`} tabIndex={disableTooltip ? undefined : 0}
      style={disableTooltip ? { pointerEvents: "none" } : undefined}
      onMouseEnter={() => updateHoverSource("pointer", true)}
      onMouseLeave={() => updateHoverSource("pointer", false)}
      onFocus={() => updateHoverSource("focus", true)}
      onBlur={() => updateHoverSource("focus", false)}>
      <span className="card-sticker-art" data-sticker={sticker} style={stickerArtStyle} aria-hidden="true" />
    </span>
    {!disableTooltip && tooltipPosition && typeof document !== "undefined" && createPortal(
      <aside className={`card-sticker-tooltip ${tooltipPosition.below ? "is-below" : ""}`}
        style={{ left: tooltipPosition.left, top: tooltipPosition.top }} role="tooltip">
        <strong>{info.name}</strong>
        <span>{info.description}</span>
      </aside>,
      document.body,
    )}
  </>;
}

export function CardStickerMarks({ stickers, previewSticker, disableTooltip = false }: {
  stickers: readonly StickerId[];
  previewSticker?: StickerId;
  disableTooltip?: boolean;
}) {
  const items = previewSticker
    ? [...stickers.filter(sticker => sticker !== previewSticker), previewSticker]
    : [...stickers];
  if (!items.length) return null;
  return <span className="card-sticker-marks">
    {items.map(sticker => <CardStickerMark key={sticker} sticker={sticker} preview={sticker === previewSticker}
      disableTooltip={disableTooltip} />)}
  </span>;
}
