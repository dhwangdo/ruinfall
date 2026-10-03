import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { DUNGEON_MIN_X, MAP_COLUMNS, MAP_ROWS, type MapPosition } from "../game/mapRules";

export const MAP_WORLD_MARGIN_X = 5;
export const MAP_WORLD_MARGIN_Y = 5;
export const MAP_RENDER_COLUMNS = MAP_COLUMNS + MAP_WORLD_MARGIN_X * 2;
export const MAP_RENDER_ROWS = MAP_ROWS + MAP_WORLD_MARGIN_Y * 2;
export const MAP_ROOM_WIDTH = 136;
export const MAP_ROOM_HEIGHT = 136;
export const MAP_CELL_GAP = 0;
export const MAP_PADDING = 42;

const MAP_DEFAULT_ZOOM = 0.625;
const MAP_MIN_ZOOM = 0.1875;
const MAP_MAX_ZOOM = 0.875;
const MAP_ZOOM_STEP = 0.125;

type MapCameraOptions = {
  enabled: boolean;
  position: MapPosition;
  travelLocked: boolean;
};

type MapDrag = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

export function useMapCamera({ enabled, position, travelLocked }: MapCameraOptions) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MAP_DEFAULT_ZOOM);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isFocusing, setIsFocusing] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const focusTimerRef = useRef<number | null>(null);
  const dragRef = useRef<MapDrag | null>(null);
  const wasDraggedRef = useRef(false);

  useLayoutEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateSize = () => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => () => {
    if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
  }, []);

  const clearFocusTimer = useCallback(() => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
  }, []);

  const centerOn = useCallback((target: MapPosition, targetZoom = zoom) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const roomCenterX = MAP_PADDING
      + (target.x - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X) * (MAP_ROOM_WIDTH + MAP_CELL_GAP)
      + MAP_ROOM_WIDTH / 2;
    const roomCenterY = MAP_PADDING
      + target.y * (MAP_ROOM_HEIGHT + MAP_CELL_GAP)
      + MAP_WORLD_MARGIN_Y * MAP_ROOM_HEIGHT
      + MAP_ROOM_HEIGHT / 2;
    setPan({
      x: viewport.clientWidth / 2 - roomCenterX * targetZoom,
      y: viewport.clientHeight / 2 - roomCenterY * targetZoom,
    });
  }, [zoom]);

  const focusOn = useCallback((target: MapPosition) => {
    window.requestAnimationFrame(() => centerOn(target));
  }, [centerOn]);

  const stopFocus = useCallback(() => {
    clearFocusTimer();
    setIsFocusing(false);
  }, [clearFocusTimer]);

  const focusOnPlayer = useCallback(() => {
    if (travelLocked) return;
    clearFocusTimer();
    setIsFocusing(true);
    focusOn(position);
    focusTimerRef.current = window.setTimeout(() => {
      setIsFocusing(false);
      focusTimerRef.current = null;
    }, 360);
  }, [clearFocusTimer, focusOn, position, travelLocked]);

  const startTicketCameraTour = useCallback((origin: MapPosition, revealed: MapPosition[]) => {
    clearFocusTimer();
    const route = [origin, ...revealed, origin];
    let stepIndex = 1;
    setIsFocusing(true);
    focusOn(origin);
    const advance = () => {
      const destination = route[stepIndex];
      if (!destination) {
        setIsFocusing(false);
        focusTimerRef.current = null;
        return;
      }
      focusOn(destination);
      const isRevealedLocation = stepIndex < route.length - 1;
      stepIndex += 1;
      focusTimerRef.current = window.setTimeout(advance, 360 + (isRevealedLocation ? 300 : 0));
    };
    focusTimerRef.current = window.setTimeout(advance, 40);
  }, [clearFocusTimer, focusOn]);

  const zoomAt = useCallback((direction: number, focalPoint?: { x: number; y: number }) => {
    if (travelLocked) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextZoom = Math.min(
      MAP_MAX_ZOOM,
      Math.max(MAP_MIN_ZOOM, Number((zoom + direction * MAP_ZOOM_STEP).toFixed(2))),
    );
    if (nextZoom === zoom) return;

    const pointerX = focalPoint?.x ?? viewport.clientWidth / 2;
    const pointerY = focalPoint?.y ?? viewport.clientHeight / 2;
    const mapX = (pointerX - pan.x) / zoom;
    const mapY = (pointerY - pan.y) / zoom;
    setPan({
      x: pointerX - mapX * nextZoom,
      y: pointerY - mapY * nextZoom,
    });
    setZoom(nextZoom);
  }, [pan.x, pan.y, travelLocked, zoom]);

  const changeZoom = useCallback((direction: number) => zoomAt(direction), [zoomAt]);

  const resetZoom = useCallback(() => {
    if (travelLocked) return;
    setZoom(MAP_DEFAULT_ZOOM);
    centerOn(position, MAP_DEFAULT_ZOOM);
  }, [centerOn, position, travelLocked]);

  const onWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    zoomAt(event.deltaY < 0 ? 1 : -1, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, [zoomAt]);

  const beginDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || travelLocked) return;
    wasDraggedRef.current = false;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };
  }, [pan.x, pan.y, travelLocked]);

  const moveDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const offsetX = event.clientX - drag.startX;
    const offsetY = event.clientY - drag.startY;
    const moved = drag.moved || Math.hypot(offsetX, offsetY) > 6;
    dragRef.current = { ...drag, moved };
    wasDraggedRef.current = moved;
    setPan({
      x: drag.originX + offsetX,
      y: drag.originY + offsetY,
    });
  }, []);

  const finishDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  return {
    pan,
    zoom,
    viewportSize,
    isFocusing,
    viewportRef,
    wasDraggedRef,
    centerOn,
    focusOn,
    focusOnPlayer,
    startTicketCameraTour,
    changeZoom,
    resetZoom,
    onWheel,
    beginDrag,
    moveDrag,
    finishDrag,
    stopFocus,
  };
}

export type MapCamera = ReturnType<typeof useMapCamera>;
