import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject, type WheelEvent } from "react";
import type { MapEnemy, MapEnemyCellMemory } from "../game/mapEnemies";
import type { MapPosition, RoomType } from "../game/mapRules";
import { buildMinimapCells, MINIMAP_COLORS, MINIMAP_COLUMNS, MINIMAP_ROWS, MINIMAP_TILE_SIZE } from "../game/mapMinimap";

type Props = {
  viewportRef: RefObject<HTMLDivElement | null>;
  playerPosition: MapPosition;
  knownRooms: ReadonlyMap<string, MapPosition>;
  visibleRoomKeys: ReadonlySet<string>;
  enemies: readonly MapEnemy[];
  enemyMemory: MapEnemyCellMemory;
  roomTypeAt: (position: MapPosition) => RoomType;
  hasItemsAt: (roomKey: string) => boolean;
  debugMode: boolean;
};

const WIDTH = MINIMAP_COLUMNS * MINIMAP_TILE_SIZE;
const HEIGHT = MINIMAP_ROWS * MINIMAP_TILE_SIZE;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
type MinimapSize = { width: number; height: number };
const DEFAULT_SIZE: MinimapSize = { width: WIDTH + 2, height: HEIGHT + 2 };
const MIN_SIZE = 140;
const MAX_SIZE = 640;
const SIZE_STORAGE_KEY = "ruinfall:minimap-size:v2";
const LEGACY_SIZE_STORAGE_KEY = "ruinfall:minimap-size:v1";

type DragState = { pointerId: number; startX: number; startY: number; origin: MapPosition; tilePixels: number };
type ResizeState = { pointerId: number; startX: number; startY: number; origin: MinimapSize };

export function MapMinimap({ viewportRef, playerPosition, knownRooms, visibleRoomKeys, enemies,
  enemyMemory, roomTypeAt, hasItemsAt, debugMode }: Props) {
  const [zoom, setZoom] = useState(1);
  const [viewOffset, setViewOffset] = useState<MapPosition>({ x: 0, y: 0 });
  const [size, setSize] = useState<MinimapSize>(DEFAULT_SIZE);
  const sizeRef = useRef<MinimapSize>(DEFAULT_SIZE);
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapDragRef = useRef<DragState | null>(null);
  const resizeDragRef = useRef<ResizeState | null>(null);
  const tileSize = MINIMAP_TILE_SIZE * zoom;
  const columns = Math.max(1, Math.floor((size.width - 2) / tileSize));
  const rows = Math.max(1, Math.floor((size.height - 2) / tileSize));
  const canvasWidth = columns * tileSize;
  const canvasHeight = rows * tileSize;
  const viewCenter = useMemo(() => ({ x: playerPosition.x + viewOffset.x, y: playerPosition.y + viewOffset.y }),
    [playerPosition.x, playerPosition.y, viewOffset.x, viewOffset.y]);
  const data = useMemo(() => buildMinimapCells({ player: playerPosition, knownRooms, visibleRoomKeys,
    enemies, enemyMemory, roomTypeAt, hasItemsAt, debugMode }, columns, rows, viewCenter),
  [playerPosition, knownRooms, visibleRoomKeys, enemies, enemyMemory, roomTypeAt, hasItemsAt, debugMode, columns, rows, viewCenter]);

  const clampSize = useCallback((value: MinimapSize) => {
    const viewport = viewportRef.current;
    const availableWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE,
      (viewport?.clientWidth ?? MAX_SIZE + 40) - 40));
    const availableHeight = Math.max(MIN_SIZE, Math.min(MAX_SIZE,
      (viewport?.clientHeight ?? MAX_SIZE + 32) - 32));
    return {
      width: Math.max(Math.min(MIN_SIZE, availableWidth), Math.min(availableWidth, value.width)),
      height: Math.max(Math.min(MIN_SIZE, availableHeight), Math.min(availableHeight, value.height)),
    };
  }, [viewportRef]);
  const updateSize = useCallback((value: MinimapSize) => {
    const bounded = clampSize(value);
    sizeRef.current = bounded;
    setSize(current => current.width === bounded.width && current.height === bounded.height ? current : bounded);
  }, [clampSize]);

  useEffect(() => {
    let initialResizeFrame: number | null = null;
    try {
      const saved = window.localStorage.getItem(SIZE_STORAGE_KEY);
      if (saved) {
        let parsed: Partial<MinimapSize> | null = null;
        try { parsed = JSON.parse(saved) as Partial<MinimapSize>; } catch { /* Ignore invalid saved dimensions. */ }
        if (parsed && Number.isFinite(parsed.width) && (parsed.width ?? 0) > 0
          && Number.isFinite(parsed.height) && (parsed.height ?? 0) > 0) {
          initialResizeFrame = window.requestAnimationFrame(() => updateSize({ width: parsed.width!, height: parsed.height! }));
        }
      } else {
        const legacy = Number(window.localStorage.getItem(LEGACY_SIZE_STORAGE_KEY));
        if (Number.isFinite(legacy) && legacy > 0) {
          const migrated = clampSize({ width: legacy, height: legacy });
          sizeRef.current = migrated;
          window.localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(migrated));
          initialResizeFrame = window.requestAnimationFrame(() => updateSize(migrated));
        }
      }
    } catch { /* Resizing remains available when storage is unavailable. */ }
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => updateSize(sizeRef.current));
    observer.observe(viewport);
    const onWindowResize = () => updateSize(sizeRef.current);
    window.addEventListener("resize", onWindowResize);
    return () => {
      if (initialResizeFrame !== null) window.cancelAnimationFrame(initialResizeFrame);
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [viewportRef, updateSize, clampSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasWidth * ratio);
    canvas.height = Math.round(canvasHeight * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.imageSmoothingEnabled = false;
    context.fillStyle = MINIMAP_COLORS.background;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    for (const cell of data.cells) {
      context.fillStyle = cell.color;
      const x = (cell.x - viewCenter.x + Math.floor(columns / 2)) * tileSize;
      const y = (cell.y - viewCenter.y + Math.floor(rows / 2)) * tileSize;
      context.fillRect(x, y, tileSize, tileSize);
    }
    const playerX = (playerPosition.x - viewCenter.x + Math.floor(columns / 2)) * tileSize;
    const playerY = (playerPosition.y - viewCenter.y + Math.floor(rows / 2)) * tileSize;
    if (playerX + tileSize >= 0 && playerX <= canvasWidth && playerY + tileSize >= 0 && playerY <= canvasHeight) {
      context.strokeStyle = MINIMAP_COLORS.player;
      context.lineWidth = 1;
      context.strokeRect(playerX - 1, playerY - 1, tileSize + 2, tileSize + 2);
    }
  }, [data, playerPosition, viewCenter, columns, rows, tileSize, canvasWidth, canvasHeight]);

  const onMapPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!event.isPrimary || event.button !== 0 || !canvasRef.current) return;
    const tilePixels = canvasRef.current.clientWidth / columns;
    mapDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      origin: viewOffset, tilePixels };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onMapPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const drag = mapDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    setViewOffset({ x: drag.origin.x - (event.clientX - drag.startX) / drag.tilePixels,
      y: drag.origin.y - (event.clientY - drag.startY) / drag.tilePixels });
  };
  const onMapPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (mapDragRef.current?.pointerId !== event.pointerId) return;
    mapDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onResizePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!event.isPrimary || event.button !== 0) return;
    resizeDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      origin: { ...sizeRef.current } };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onResizePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const drag = resizeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    updateSize({ width: drag.origin.width + dx, height: drag.origin.height + dy });
  };
  const onResizePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (resizeDragRef.current?.pointerId !== event.pointerId) return;
    resizeDragRef.current = null;
    try { window.localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(sizeRef.current)); } catch { /* Resizing remains available without storage. */ }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onResizeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const horizontal = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const vertical = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!horizontal && !vertical) return;
    event.preventDefault();
    const step = event.shiftKey ? 24 : 8;
    const next = {
      width: sizeRef.current.width + horizontal * step,
      height: sizeRef.current.height + vertical * step,
    };
    updateSize(next);
    try { window.localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(sizeRef.current)); } catch { /* Keyboard resizing works without storage. */ }
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.deltaY === 0) return;
    setZoom(current => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current * Math.exp(-event.deltaY * 0.0015))));
  };

  return (
    <div ref={panelRef} className="map-minimap" role="group" aria-label="미니맵"
      style={{ width: size.width, height: size.height }}
      onPointerDown={onMapPointerDown} onPointerMove={onMapPointerMove} onPointerUp={onMapPointerEnd}
      onPointerCancel={onMapPointerEnd} onLostPointerCapture={onMapPointerEnd}
      onClick={event => event.stopPropagation()} onWheel={onWheel}>
      <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight}
        style={{ width: canvasWidth, height: canvasHeight }} role="img"
        aria-label="플레이어 주변의 발견한 지도. 빨강은 적, 갈색은 덱 금고, 흰색은 현재 위치입니다." />
      <button type="button" className="map-minimap-resize" aria-label="미니맵 크기 조절"
        onKeyDown={onResizeKeyDown}
        onPointerDown={onResizePointerDown} onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerEnd} onPointerCancel={onResizePointerEnd}
        onLostPointerCapture={onResizePointerEnd} />
    </div>
  );
}
