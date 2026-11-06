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
const DEFAULT_SIZE = WIDTH + 2;
const MIN_SIZE = 140;
const MAX_SIZE = 640;
const SIZE_STORAGE_KEY = "ruinfall:minimap-size:v1";

type DragState = { pointerId: number; startX: number; startY: number; origin: MapPosition; tilePixels: number };
type ResizeState = { pointerId: number; startX: number; startY: number; origin: number };

export function MapMinimap({ viewportRef, playerPosition, knownRooms, visibleRoomKeys, enemies,
  enemyMemory, roomTypeAt, hasItemsAt, debugMode }: Props) {
  const [zoom, setZoom] = useState(1);
  const [viewOffset, setViewOffset] = useState<MapPosition>({ x: 0, y: 0 });
  const [size, setSize] = useState(DEFAULT_SIZE);
  const sizeRef = useRef(DEFAULT_SIZE);
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapDragRef = useRef<DragState | null>(null);
  const resizeDragRef = useRef<ResizeState | null>(null);
  const columns = Math.max(1, Math.floor(MINIMAP_COLUMNS / zoom));
  const rows = Math.max(1, Math.floor(MINIMAP_ROWS / zoom));
  const tileSize = MINIMAP_TILE_SIZE * zoom;
  const offsetX = (WIDTH - columns * tileSize) / 2;
  const offsetY = (HEIGHT - rows * tileSize) / 2;
  const viewCenter = { x: playerPosition.x + viewOffset.x, y: playerPosition.y + viewOffset.y };
  const data = useMemo(() => buildMinimapCells({ player: playerPosition, knownRooms, visibleRoomKeys,
    enemies, enemyMemory, roomTypeAt, hasItemsAt, debugMode }, columns, rows, viewCenter),
  [playerPosition, knownRooms, visibleRoomKeys, enemies, enemyMemory, roomTypeAt, hasItemsAt, debugMode, columns, rows,
    viewCenter.x, viewCenter.y]);

  const clampSize = useCallback((value: number) => {
    const viewport = viewportRef.current;
    const available = Math.max(MIN_SIZE, Math.min(MAX_SIZE,
      (viewport?.clientWidth ?? MAX_SIZE + 40) - 40,
      (viewport?.clientHeight ?? MAX_SIZE + 32) - 32));
    return Math.max(Math.min(MIN_SIZE, available), Math.min(available, value));
  }, [viewportRef]);
  const updateSize = useCallback((value: number) => {
    const bounded = clampSize(value);
    sizeRef.current = bounded;
    setSize(current => current === bounded ? current : bounded);
  }, [clampSize]);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(SIZE_STORAGE_KEY));
      if (Number.isFinite(saved) && saved > 0) updateSize(saved);
    } catch { /* Resizing remains available when storage is unavailable. */ }
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => updateSize(sizeRef.current));
    observer.observe(viewport);
    const onWindowResize = () => updateSize(sizeRef.current);
    window.addEventListener("resize", onWindowResize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [viewportRef, updateSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(WIDTH * ratio);
    canvas.height = Math.round(HEIGHT * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.imageSmoothingEnabled = false;
    context.fillStyle = MINIMAP_COLORS.background;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    for (const cell of data.cells) {
      context.fillStyle = cell.color;
      const x = offsetX + (cell.x - viewCenter.x + Math.floor(columns / 2)) * tileSize;
      const y = offsetY + (cell.y - viewCenter.y + Math.floor(rows / 2)) * tileSize;
      context.fillRect(x, y, tileSize, tileSize);
    }
    const playerX = offsetX + (playerPosition.x - viewCenter.x + Math.floor(columns / 2)) * tileSize;
    const playerY = offsetY + (playerPosition.y - viewCenter.y + Math.floor(rows / 2)) * tileSize;
    if (playerX + tileSize >= 0 && playerX <= WIDTH && playerY + tileSize >= 0 && playerY <= HEIGHT) {
      context.strokeStyle = MINIMAP_COLORS.player;
      context.lineWidth = 1;
      context.strokeRect(playerX - 1, playerY - 1, tileSize + 2, tileSize + 2);
    }
  }, [data, playerPosition, viewCenter.x, viewCenter.y, columns, rows, tileSize, offsetX, offsetY]);

  const onMapPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!event.isPrimary || event.button !== 0 || !canvasRef.current) return;
    const tilePixels = canvasRef.current.clientWidth / WIDTH * tileSize;
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
    resizeDragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, origin: sizeRef.current };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  const onResizePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const drag = resizeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    updateSize(drag.origin + (Math.abs(dx) > Math.abs(dy) ? dx : dy));
  };
  const onResizePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (resizeDragRef.current?.pointerId !== event.pointerId) return;
    resizeDragRef.current = null;
    try { window.localStorage.setItem(SIZE_STORAGE_KEY, String(sizeRef.current)); } catch { /* Resizing remains available without storage. */ }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onResizeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const next = sizeRef.current + direction * (event.shiftKey ? 24 : 8);
    updateSize(next);
    try { window.localStorage.setItem(SIZE_STORAGE_KEY, String(sizeRef.current)); } catch { /* Keyboard resizing works without storage. */ }
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.deltaY === 0) return;
    setZoom(current => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current * Math.exp(-event.deltaY * 0.0015))));
  };

  return (
    <div ref={panelRef} className="map-minimap" role="group" aria-label="미니맵"
      style={{ width: size, height: size }}
      onPointerDown={onMapPointerDown} onPointerMove={onMapPointerMove} onPointerUp={onMapPointerEnd}
      onPointerCancel={onMapPointerEnd} onLostPointerCapture={onMapPointerEnd}
      onClick={event => event.stopPropagation()} onWheel={onWheel}>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} role="img"
        aria-label="플레이어 주변의 발견한 지도. 빨강은 적, 갈색은 덱 금고, 흰색은 현재 위치입니다." />
      <button type="button" className="map-minimap-resize" aria-label="미니맵 크기 조절"
        onKeyDown={onResizeKeyDown}
        onPointerDown={onResizePointerDown} onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerEnd} onPointerCancel={onResizePointerEnd}
        onLostPointerCapture={onResizePointerEnd} />
    </div>
  );
}
