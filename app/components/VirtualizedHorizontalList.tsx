"use client";

import { useLayoutEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from "react";

export type VirtualizedHorizontalItem = {
  key: string;
  width: number;
};

type Viewport = {
  scrollLeft: number;
  width: number;
  paddingLeft: number;
  paddingRight: number;
  gap: number;
  measured: boolean;
};

type Props<Item extends VirtualizedHorizontalItem> = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  items: readonly Item[];
  renderItem: (item: Item) => ReactNode;
  pinnedKey?: string;
  overscan?: number;
};

const VIRTUALIZE_AFTER = 32;

function firstIndexWhoseEndIsAfter<Item extends VirtualizedHorizontalItem>(
  items: readonly Item[],
  offsets: readonly number[],
  position: number,
) {
  let low = 0;
  let high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (offsets[middle] + items[middle].width <= position) low = middle + 1;
    else high = middle;
  }
  return low;
}

function firstIndexStartingAtOrAfter(offsets: readonly number[], position: number) {
  let low = 0;
  let high = offsets.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (offsets[middle] < position) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function VirtualizedHorizontalList<Item extends VirtualizedHorizontalItem>({
  items,
  renderItem,
  pinnedKey,
  overscan = 8,
  className,
  style,
  onScroll,
  ...containerProps
}: Props<Item>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<Viewport>({
    scrollLeft: 0,
    width: 0,
    paddingLeft: 8,
    paddingRight: 8,
    gap: 8,
    measured: false,
  });
  const shouldVirtualize = items.length > VIRTUALIZE_AFTER;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !shouldVirtualize) return;

    const measure = () => {
      const computed = window.getComputedStyle(container);
      const readPixels = (value: string) => Number.parseFloat(value) || 0;
      const next = {
        scrollLeft: container.scrollLeft,
        width: container.clientWidth,
        paddingLeft: readPixels(computed.paddingLeft),
        paddingRight: readPixels(computed.paddingRight),
        gap: readPixels(computed.columnGap) || readPixels(computed.gap),
        measured: true,
      };
      setViewport((current) => Object.keys(next).every((key) =>
        current[key as keyof Viewport] === next[key as keyof typeof next]) ? current : next);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [shouldVirtualize]);

  const offsets = useMemo(() => {
    const result: number[] = [];
    let current = 0;
    for (const item of items) {
      result.push(current);
      current += item.width + viewport.gap;
    }
    return result;
  }, [items, viewport.gap]);

  const handleScroll: NonNullable<Props<Item>["onScroll"]> = (event) => {
    if (shouldVirtualize) {
      const scrollLeft = event.currentTarget.scrollLeft;
      setViewport((current) => current.scrollLeft === scrollLeft ? current : { ...current, scrollLeft });
    }
    onScroll?.(event);
  };

  let visibleIndices: number[] = [];
  let contentWidth = 0;
  if (shouldVirtualize) {
    const rightEdge = viewport.scrollLeft + Math.max(0, viewport.width - viewport.paddingLeft - viewport.paddingRight);
    const firstVisible = viewport.measured
      ? firstIndexWhoseEndIsAfter(items, offsets, viewport.scrollLeft)
      : 0;
    const afterLastVisible = viewport.measured
      ? firstIndexStartingAtOrAfter(offsets, rightEdge) + 1
      : Math.min(items.length, overscan * 2 + 4);
    const start = Math.max(0, firstVisible - overscan);
    const end = Math.min(items.length, afterLastVisible + overscan);
    const indices = new Set<number>();
    for (let index = start; index < end; index += 1) indices.add(index);
    if (pinnedKey) {
      const pinnedIndex = items.findIndex((item) => item.key === pinnedKey);
      if (pinnedIndex >= 0) indices.add(pinnedIndex);
    }
    visibleIndices = [...indices].sort((left, right) => left - right);
    contentWidth = items.length > 0 ? offsets.at(-1)! + items.at(-1)!.width : 0;
  }

  return (
    <div
      {...containerProps}
      ref={containerRef}
      className={className}
      style={shouldVirtualize ? { ...style, position: style?.position ?? "relative" } : style}
      onScroll={handleScroll}
    >
      {shouldVirtualize ? (
        <>
          <span
            className="deck-editor-virtual-track"
            style={{ width: contentWidth, flexBasis: contentWidth }}
            aria-hidden="true"
          />
          {visibleIndices.map((index) => {
            const item = items[index];
            return (
              <div
                className="deck-editor-virtual-item"
                key={item.key}
                style={{ left: viewport.paddingLeft + offsets[index], width: item.width }}
              >
                {renderItem(item)}
              </div>
            );
          })}
        </>
      ) : items.map(renderItem)}
    </div>
  );
}
