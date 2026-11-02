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
const MAP_ZOOM_STEP = 0.04;

type MapCameraOptions = {
  enabled: boolean;
  position: MapPosition;
  travelLocked: boolean;
};

type MapDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type MapPinch = {
  initialDistance: number;
  initialZoom: number;
  mapX: number;
  mapY: number;
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
  const touchPointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<MapPinch | null>(null);
  const pinchOccurredRef = useRef(false);
  const dragFrameRef = useRef<number | null>(null);
  const pendingCameraRef = useRef<{ pan: { x: number; y: number }; zoom?: number } | null>(null);

  const cancelDragFrame = useCallback(() => {
    if (dragFrameRef.current !== null) window.cancelAnimationFrame(dragFrameRef.current);
    dragFrameRef.current = null;
    pendingCameraRef.current = null;
  }, []);

  const flushDragFrame = useCallback(() => {
    const pending = pendingCameraRef.current;
    cancelDragFrame();
    if (!pending) return;
    setPan(pending.pan);
    if (pending.zoom !== undefined) setZoom(pending.zoom);
  }, [cancelDragFrame]);

  const queueDragFrame = useCallback((next: { pan: { x: number; y: number }; zoom?: number }) => {
    pendingCameraRef.current = next;
    if (dragFrameRef.current === null) dragFrameRef.current = window.requestAnimationFrame(flushDragFrame);
  }, [flushDragFrame]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateSize = () => {
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      setViewportSize((current) => current.width === width && current.height === height
        ? current : { width, height });
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => () => {
    if (focusTimerRef.current !== null) window.clearTimeout(focusTimerRef.current);
    cancelDragFrame();
  }, [cancelDragFrame]);

  const clearFocusTimer = useCallback(() => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
  }, []);

  const centerOn = useCallback((target: MapPosition, targetZoom = zoom) => {
    cancelDragFrame();
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
  }, [cancelDragFrame, zoom]);

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
    cancelDragFrame();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const nextZoom = Math.min(
      MAP_MAX_ZOOM,
      Math.max(MAP_MIN_ZOOM, Number((zoom + direction * MAP_ZOOM_STEP).toFixed(4))),
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
  }, [cancelDragFrame, pan.x, pan.y, travelLocked, zoom]);

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

  const startPinch = useCallback((viewport: HTMLDivElement) => {
    const [first, second] = Array.from(touchPointersRef.current.values()).slice(0, 2);
    if (!first || !second) return;
    const bounds = viewport.getBoundingClientRect();
    const centerX = (first.x + second.x) / 2 - bounds.left;
    const centerY = (first.y + second.y) / 2 - bounds.top;
    const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
    pinchRef.current = {
      initialDistance: distance,
      initialZoom: zoom,
      mapX: (centerX - pan.x) / zoom,
      mapY: (centerY - pan.y) / zoom,
    };
    pinchOccurredRef.current = true;
  }, [pan.x, pan.y, zoom]);

  const beginDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (travelLocked || (event.pointerType !== "touch" && event.button !== 0)) return;
    flushDragFrame();
    wasDraggedRef.current = false;

    if (event.pointerType === "touch") {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size >= 2) {
        dragRef.current = null;
        wasDraggedRef.current = true;
        if (!pinchRef.current) startPinch(event.currentTarget);
        return;
      }
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };
  }, [flushDragFrame, pan.x, pan.y, startPinch, travelLocked]);

  const moveDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const capturePointer = () => {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture may be unavailable in older mobile browsers.
      }
    };
    if (touchPointersRef.current.has(event.pointerId)) {
      touchPointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointersRef.current.size >= 2) {
        capturePointer();
        if (!pinchRef.current) startPinch(event.currentTarget);
        const pinch = pinchRef.current;
        const [first, second] = Array.from(touchPointersRef.current.values()).slice(0, 2);
        if (!pinch || !first || !second) return;

        const bounds = event.currentTarget.getBoundingClientRect();
        const centerX = (first.x + second.x) / 2 - bounds.left;
        const centerY = (first.y + second.y) / 2 - bounds.top;
        const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
        const nextZoom = Math.min(
          MAP_MAX_ZOOM,
          Math.max(MAP_MIN_ZOOM, pinch.initialZoom * distance / pinch.initialDistance),
        );
        queueDragFrame({ zoom: nextZoom, pan: { x: centerX - pinch.mapX * nextZoom, y: centerY - pinch.mapY * nextZoom } });
        wasDraggedRef.current = true;
        return;
      }
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const offsetX = event.clientX - drag.startX;
    const offsetY = event.clientY - drag.startY;
    const moved = drag.moved || Math.hypot(offsetX, offsetY) > 6;
    // Capturing on pointerdown retargets ordinary room clicks to the viewport.
    // Start capture only once the gesture has become an actual camera drag.
    if (moved && !drag.moved) capturePointer();
    dragRef.current = { ...drag, moved };
    wasDraggedRef.current = moved;
    queueDragFrame({ pan: {
      x: drag.originX + offsetX,
      y: drag.originY + offsetY,
    } });
  }, [queueDragFrame, startPinch]);

  const finishDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    flushDragFrame();
    if (event.pointerType === "touch") {
      touchPointersRef.current.delete(event.pointerId);
      dragRef.current = null;
      pinchRef.current = null;
      if (touchPointersRef.current.size === 0 && pinchOccurredRef.current) {
        wasDraggedRef.current = true;
        window.setTimeout(() => {
          wasDraggedRef.current = false;
          pinchOccurredRef.current = false;
        }, 0);
      }
    } else if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // The browser may release capture before dispatching pointercancel.
    }
  }, [flushDragFrame]);

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
