import { useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

type Offset = { x: number; y: number };
type Drag = {
  pointerId: number;
  x: number;
  y: number;
  origin: Offset;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  moved: boolean;
};

const STORAGE_KEY = "ruinfall:map-deck-selector-offset:v1";
const MARGIN = 12;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const getViewportBounds = () => ({
  left: 0,
  top: 0,
  right: document.documentElement.clientWidth,
  bottom: window.innerHeight,
});

export function useMapDeckSelectorDrag() {
  const selectorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const offsetRef = useRef<Offset>({ x: 0, y: 0 });
  const dragRef = useRef<Drag | null>(null);
  const suppressClickRef = useRef(false);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const updateOffset = (next: Offset) => {
    offsetRef.current = next;
    setOffset(next);
  };

  useEffect(() => {
    const selector = selectorRef.current;
    const trigger = triggerRef.current;
    if (!selector || !trigger) return;

    const keepInBounds = (next = offsetRef.current) => {
      const area = getViewportBounds();
      const icon = trigger.getBoundingClientRect();
      const current = offsetRef.current;
      const bounded = {
        x: clamp(next.x, current.x + area.left + MARGIN - icon.left, current.x + area.right - MARGIN - icon.right),
        y: clamp(next.y, current.y + area.top + MARGIN - icon.top, current.y + area.bottom - MARGIN - icon.bottom),
      };
      offsetRef.current = bounded;
      setOffset(bounded);
    };
    const frame = window.requestAnimationFrame(() => {
      let saved: Offset | null = null;
      try {
        const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
        if (value && Number.isFinite(value.x) && Number.isFinite(value.y)) saved = value;
      } catch { /* Keep the default position when storage is unavailable. */ }
      if (saved) keepInBounds(saved);
    });
    const onResize = () => keepInBounds();
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.stopPropagation();
    const area = getViewportBounds();
    const icon = event.currentTarget.getBoundingClientRect();
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      origin: offsetRef.current, moved: false,
      minX: area.left + MARGIN - icon.left, maxX: area.right - MARGIN - icon.right,
      minY: area.top + MARGIN - icon.top, maxY: area.bottom - MARGIN - icon.bottom,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const x = event.clientX - drag.x;
    const y = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(x, y) < 5) return;
    event.preventDefault();
    event.stopPropagation();
    if (!drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    suppressClickRef.current = true;
    updateOffset({
      x: drag.origin.x + clamp(x, drag.minX, drag.maxX),
      y: drag.origin.y + clamp(y, drag.minY, drag.maxY),
    });
  };

  const onPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved) {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(offsetRef.current)); } catch { /* Moving still works without storage. */ }
    }
  };

  const allowClick = (event: MouseEvent<HTMLButtonElement>) => {
    const suppressed = event.detail !== 0 && suppressClickRef.current;
    suppressClickRef.current = false;
    if (suppressed) event.preventDefault();
    return !suppressed;
  };

  return { selectorRef, triggerRef, offset, dragging, onPointerDown, onPointerMove, onPointerEnd, allowClick };
}
