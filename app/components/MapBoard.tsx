"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { MapDebugToolbar } from "./MapDebugToolbar";
import { MapEntityMarkers } from "./MapEntityMarkers";
import { MapRoomButton } from "./MapRoomButton";
import { MapMinimap } from "./MapMinimap";
import { MapDeckVaultPreview, type MapDeckVaultPreviewControls } from "./MapDeckVaultPreview";
import {
  MAP_CELL_GAP,
  MAP_PADDING,
  MAP_ROOM_HEIGHT,
  MAP_ROOM_WIDTH,
  MAP_WORLD_MARGIN_X,
  MAP_WORLD_MARGIN_Y,
  type MapCamera,
} from "../hooks/useMapCamera";
import { chebyshevDistance, type MapEnemyCellMemory, type MapEnemyWorld } from "../game/mapEnemies";
import type { MapBomb } from "../game/mapEffects";
import { mapRenderSurface, mapViewportBounds } from "../game/mapViewport";
import {
  DUNGEON_MAX_X,
  DUNGEON_MIN_X,
  MAP_ROWS,
  buildKnownRoomRoutes,
  findKnownRoomRoute,
  getDungeonRegionIndex,
  getRoomType,
  getSafeAreaRegionIndex,
  isSafeAreaBoundaryPosition,
  isWalkableRoom,
  mapRoomKey,
  parseMapRoomKey,
  visibleMapRoomKeys,
  type MapPosition,
  type RoomType,
} from "../game/mapRules";
import type { Card } from "../game/cards";
import type { Consumable, DeckCase } from "../game/rewards";

type MapBoardProps = {
  world: {
    position: MapPosition;
    seed: number;
    seenRooms: Set<string>;
    enemyWorld: MapEnemyWorld;
    enemyCellMemory: MapEnemyCellMemory;
    bombs: MapBomb[];
    collisionEnemyIds: string[];
    battleFlash: boolean;
    waitNoticeNonce: number;
    goldNotice: { nonce: number; amount: number } | null;
    travelLocked: boolean;
    travelStepMs: number;
    debugMode: boolean;
    safeAreaRegionIndex: number | null;
    safeAreaMemoryRestricted: boolean;
    visionHorizontalRadius: number;
    visionVerticalRadius: number;
    roomDrops: Record<string, Card[]>;
    roomConsumableDrops: Record<string, Consumable[]>;
    roomDeckDrops: Record<string, DeckCase[]>;
    roomGoldPiles: Record<string, number>;
    roomDeckVaults: Record<string, DeckCase>;
    highlightedRoomKey?: string | null;
    bloodstainedRooms: ReadonlySet<string>;
  };
  camera: MapCamera;
  debugTools: {
    spawnSelection: string;
    deckRegion: string;
    deckCount: string;
    onSpawnSelectionChange: (value: string) => void;
    onDeckRegionChange: (value: string) => void;
    onDeckCountChange: (value: string) => void;
    onSpawnItem: () => void;
    onGenerateDecks: () => void;
    onCreateStickerDeck: () => void;
    onAddDebugKeys: () => void;
      onAddDebugGold: () => void;
    onOpenCardStats: () => void;
  };
  effectiveRoomType: (position: MapPosition) => RoomType;
  onClearMessage: () => void;
  onInteractCurrentRoom?: () => void;
  onPickUpCurrentRoom?: () => void;
  onMove: (deltaX: number, deltaY: number) => void;
  onDebugTeleport: (position: MapPosition) => void;
  onTravel: (path: MapPosition[]) => void;
  children?: ReactNode;
};

export function MapBoard({
  world,
  camera,
  debugTools,
  effectiveRoomType,
  onClearMessage,
  onInteractCurrentRoom,
  onPickUpCurrentRoom,
  onMove,
  onDebugTeleport,
  onTravel,
  children,
}: MapBoardProps) {
  const {
    position: mapPosition,
    seed: mapSeed,
    seenRooms,
    enemyWorld: mapEnemyWorld,
    enemyCellMemory: mapEnemyCellMemory,
    bombs: mapBombs,
    collisionEnemyIds: mapCollisionEnemyIds,
    battleFlash: mapBattleFlash,
    waitNoticeNonce: mapWaitNoticeNonce,
    goldNotice: mapGoldNotice,
    travelLocked: mapTraveling,
    travelStepMs: mapTravelStepMs,
    debugMode,
    safeAreaRegionIndex,
    safeAreaMemoryRestricted,
    visionHorizontalRadius,
    visionVerticalRadius,
    roomDrops,
    roomConsumableDrops,
    roomDeckDrops,
    roomGoldPiles,
    roomDeckVaults,
    highlightedRoomKey,
    bloodstainedRooms,
  } = world;
  const {
    pan: mapPan,
    zoom: mapZoom,
    viewportSize: mapViewportSize,
    isFocusing: mapCameraFocusing,
    viewportRef: mapViewportRef,
    wasDraggedRef: mapWasDraggedRef,
    focusOnPlayer: focusMapOnPlayer,
    onWheel: zoomMap,
    beginDrag: beginMapDrag,
    moveDrag: moveMapDrag,
    finishDrag: finishMapDrag,
  } = camera;
  const vaultPreviewRef = useRef<MapDeckVaultPreviewControls | null>(null);
  const interactionRef = useRef({ mapPosition, mapTraveling, debugMode, seenRooms, roomDeckVaults,
    effectiveRoomType, onClearMessage, onInteractCurrentRoom, onPickUpCurrentRoom, onMove, onDebugTeleport, onTravel });
  useLayoutEffect(() => {
    interactionRef.current = { mapPosition, mapTraveling, debugMode, seenRooms, roomDeckVaults,
      effectiveRoomType, onClearMessage, onInteractCurrentRoom, onPickUpCurrentRoom, onMove, onDebugTeleport, onTravel };
  }, [mapPosition, mapTraveling, debugMode, seenRooms, roomDeckVaults,
    effectiveRoomType, onClearMessage, onInteractCurrentRoom, onPickUpCurrentRoom, onMove, onDebugTeleport, onTravel]);
  const showVaultPreview = useCallback((element: HTMLElement, position: MapPosition) => {
    const deck = interactionRef.current.roomDeckVaults[mapRoomKey(position)];
    if (deck) vaultPreviewRef.current?.show(deck, element);
  }, []);
  const hideVaultPreview = useCallback((nextTarget: EventTarget | null, pointerLeave: boolean) => {
    vaultPreviewRef.current?.hide(nextTarget, pointerLeave);
  }, []);
  const clickRoom = useCallback((position: MapPosition, pickUpItems = false) => {
    const latest = interactionRef.current;
    vaultPreviewRef.current?.clear();
    if (mapWasDraggedRef.current) { mapWasDraggedRef.current = false; return; }
    if (latest.mapTraveling) return;
    latest.onClearMessage();
    const distance = chebyshevDistance(position, latest.mapPosition);
    if (distance === 0) {
      if (pickUpItems || !latest.onInteractCurrentRoom) latest.onPickUpCurrentRoom?.();
      else latest.onInteractCurrentRoom();
      return;
    }
    const walkable = isWalkableRoom(latest.effectiveRoomType(position));
    if (latest.debugMode && walkable && distance > 1) { latest.onDebugTeleport(position); return; }
    if (distance === 1 && walkable) {
      latest.onMove(position.x - latest.mapPosition.x, position.y - latest.mapPosition.y);
      return;
    }
    const path = findKnownRoomRoute(latest.mapPosition, position, latest.seenRooms, latest.effectiveRoomType);
    if (path && path.length > 1) latest.onTravel(path);
  }, [mapWasDraggedRef]);
  useEffect(() => {
    vaultPreviewRef.current?.clear();
  }, [mapPan.x, mapPan.y, mapZoom, mapPosition.x, mapPosition.y, mapTraveling]);

  const mapStrideX = MAP_ROOM_WIDTH + MAP_CELL_GAP;
  const mapStrideY = MAP_ROOM_HEIGHT + MAP_CELL_GAP;
  const bounds = mapViewportBounds(mapPan, mapZoom, mapViewportSize, {
    minX: DUNGEON_MIN_X, maxX: DUNGEON_MAX_X, minY: -MAP_WORLD_MARGIN_Y, maxY: MAP_ROWS - 1,
    marginX: MAP_WORLD_MARGIN_X, marginY: MAP_WORLD_MARGIN_Y, padding: MAP_PADDING,
    strideX: mapStrideX, strideY: mapStrideY,
  });
  const surface = mapRenderSurface(bounds);
  const surfaceColumns = surface.maxX - surface.minX + 1;
  const surfaceRows = surface.maxY - surface.minY + 1;
  const canvasRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Rebasing changes local grid coordinates, not the camera's world position.
    // Do not interpolate between the old and new coordinate origins.
    canvas.dataset.rebasing = "true";
    // Commit the new origin for the canvas and every marker before transitions resume.
    void canvas.getBoundingClientRect();
    const frame = window.requestAnimationFrame(() => canvas.removeAttribute("data-rebasing"));
    return () => window.cancelAnimationFrame(frame);
  }, [surface.minX, surface.minY]);
  const currentVisibleRoomKeys = useMemo(() => visibleMapRoomKeys(
    mapPosition,
    mapSeed,
    visionHorizontalRadius,
    visionVerticalRadius,
  ), [mapPosition, mapSeed, visionHorizontalRadius, visionVerticalRadius]);
  const knownRoomRoutes = useMemo(() => debugMode ? new Map<string, MapPosition>()
    : buildKnownRoomRoutes(mapPosition, seenRooms, mapSeed, effectiveRoomType),
    [debugMode, mapPosition, seenRooms, mapSeed, effectiveRoomType]);
  const mapCellMap = useMemo(() => {
    const cells = new Map<string, MapPosition>();
    seenRooms.forEach((seenRoomKey) => {
      const position = parseMapRoomKey(seenRoomKey);
      if (safeAreaMemoryRestricted
        && safeAreaRegionIndex !== null
        && getSafeAreaRegionIndex(position, mapSeed) !== safeAreaRegionIndex
        && !isSafeAreaBoundaryPosition(position, safeAreaRegionIndex, mapSeed)) {
        return;
      }
      cells.set(seenRoomKey, position);
    });
    currentVisibleRoomKeys.forEach((roomKey) => cells.set(roomKey, parseMapRoomKey(roomKey)));
    return cells;
  }, [seenRooms, currentVisibleRoomKeys, safeAreaMemoryRestricted, safeAreaRegionIndex, mapSeed]);
  const { minX, maxX, minY, maxY } = bounds;
  const retainKnownCells = mapCameraFocusing || mapViewportSize.width === 0 || mapViewportSize.height === 0;
  const mapCells = useMemo(() => {
    // A focus animation crosses the space between the old and new viewport.
    // Keep explored cells mounted until that transition has finished.
    const cells = new Map<string, MapPosition>();
    if (retainKnownCells) mapCellMap.forEach((position, key) => {
      if (position.x >= surface.minX && position.x <= surface.maxX
        && position.y >= surface.minY && position.y <= surface.maxY) cells.set(key, position);
    });
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const position = { x, y };
        const known = mapCellMap.get(mapRoomKey(position));
        if (known) cells.set(mapRoomKey(position), known);
        else if (debugMode && getRoomType(position, mapSeed) !== "void") cells.set(mapRoomKey(position), position);
      }
    }
    return Array.from(cells.values());
  }, [minX, maxX, minY, maxY, surface.minX, surface.maxX, surface.minY, surface.maxY,
    mapCellMap, debugMode, mapSeed, retainKnownCells]);
  const renderedMapCellKeys = useMemo(() => new Set(mapCells.map(mapRoomKey)), [mapCells]);
  const hasMinimapItems = useCallback((key: string) => !!(roomDrops[key]?.length
    || roomConsumableDrops[key]?.length || roomDeckDrops[key]?.length || (roomGoldPiles[key] ?? 0) > 0),
  [roomDrops, roomConsumableDrops, roomDeckDrops, roomGoldPiles]);
  const visibleMapEnemies = mapEnemyWorld.enemies.filter((enemy) =>
    renderedMapCellKeys.has(mapRoomKey(enemy.position))
    && (debugMode || currentVisibleRoomKeys.has(mapRoomKey(enemy.position))));
  const rememberedEnemyCells = debugMode
    ? []
    : Object.entries(mapEnemyCellMemory)
      .filter(([roomKey]) => renderedMapCellKeys.has(roomKey) && !currentVisibleRoomKeys.has(roomKey))
      .map(([roomKey, memory]) => ({ roomKey, position: parseMapRoomKey(roomKey), ...memory }));
  const playerMapCanvasX = MAP_PADDING
    + (mapPosition.x - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X) * (MAP_ROOM_WIDTH + MAP_CELL_GAP)
    + MAP_ROOM_WIDTH / 2;
  const playerMapCanvasY = MAP_PADDING
    + (mapPosition.y + MAP_WORLD_MARGIN_Y) * (MAP_ROOM_HEIGHT + MAP_CELL_GAP)
    + MAP_ROOM_HEIGHT / 2;
  const playerViewportX = mapPan.x + playerMapCanvasX * mapZoom;
  const playerViewportY = mapPan.y + playerMapCanvasY * mapZoom;
  const playerVisibleInViewport = mapViewportSize.width > 0 && mapViewportSize.height > 0
    && playerViewportX >= 0
    && playerViewportX <= mapViewportSize.width
    && playerViewportY >= 0
    && playerViewportY <= mapViewportSize.height;
  const edgeInset = 20;
  const viewportCenterX = mapViewportSize.width / 2;
  const viewportCenterY = mapViewportSize.height / 2;
  const edgeDx = playerViewportX - viewportCenterX;
  const edgeDy = playerViewportY - viewportCenterY;
  const edgeHalfWidth = Math.max(1, viewportCenterX - edgeInset);
  const edgeHalfHeight = Math.max(1, viewportCenterY - edgeInset);
  const edgeScale = Math.max(1, Math.abs(edgeDx) / edgeHalfWidth, Math.abs(edgeDy) / edgeHalfHeight);
  const edgeIndicatorX = viewportCenterX + edgeDx / edgeScale;
  const edgeIndicatorY = viewportCenterY + edgeDy / edgeScale;
  const edgeIndicatorAngle = Math.atan2(edgeDy, edgeDx) * 180 / Math.PI;

  return (
    <section className="map-board" aria-label="탐험 지도">
      {debugMode && (
        <MapDebugToolbar
          spawnSelection={debugTools.spawnSelection}
          deckRegion={debugTools.deckRegion}
          deckCount={debugTools.deckCount}
          onSpawnSelectionChange={debugTools.onSpawnSelectionChange}
          onDeckRegionChange={debugTools.onDeckRegionChange}
          onDeckCountChange={debugTools.onDeckCountChange}
          onSpawnItem={debugTools.onSpawnItem}
          onGenerateDecks={debugTools.onGenerateDecks}
          onCreateStickerDeck={debugTools.onCreateStickerDeck}
          onAddDebugKeys={debugTools.onAddDebugKeys}
            onAddDebugGold={debugTools.onAddDebugGold}
          onOpenCardStats={debugTools.onOpenCardStats}
        />
      )}
      <div
        className="map-viewport"
        ref={mapViewportRef}
        onPointerDown={beginMapDrag}
        onPointerMove={moveMapDrag}
        onPointerUp={finishMapDrag}
        onPointerCancel={finishMapDrag}
        onWheel={zoomMap}
      >
        <div
          ref={canvasRef}
            className={`map-canvas ${mapTraveling ? "is-traveling" : ""} ${mapCameraFocusing ? "is-camera-focusing" : ""}`}
          style={{
            width: surfaceColumns * mapStrideX,
            height: surfaceRows * mapStrideY,
            padding: 0,
            gap: MAP_CELL_GAP,
            gridTemplateColumns: `repeat(${surfaceColumns}, ${MAP_ROOM_WIDTH}px)`,
            gridAutoRows: `${MAP_ROOM_HEIGHT}px`,
            transform: `translate3d(${mapPan.x + (MAP_PADDING + (surface.minX - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X) * mapStrideX) * mapZoom}px, ${mapPan.y + (MAP_PADDING + (surface.minY + MAP_WORLD_MARGIN_Y) * mapStrideY) * mapZoom}px, 0) scale(${mapZoom})`,
            transformOrigin: "0 0",
            "--map-travel-step": `${mapTravelStepMs}ms`,
          } as CSSProperties}
        >
          {mapCells.map((position) => {
            const roomKey = mapRoomKey(position);
            const roomType = effectiveRoomType(position);
            const dungeonRegionIndex = getDungeonRegionIndex(position);
            const current = position.x === mapPosition.x && position.y === mapPosition.y;
            const inVision = debugMode || currentVisibleRoomKeys.has(roomKey);
            const distance = chebyshevDistance(position, mapPosition);
            const walkable = isWalkableRoom(roomType);
            const wallEdges = roomType === "rock" ? [
              [0, -1, "inset 0 2px 0 #75858d"], [1, 0, "inset -2px 0 0 #75858d"],
              [0, 1, "inset 0 -2px 0 #75858d"], [-1, 0, "inset 2px 0 0 #75858d"],
            ].flatMap(([dx, dy, shadow]) => {
              const neighbor = { x: position.x + Number(dx), y: position.y + Number(dy) };
              // Outline discovered floor boundaries only, without revealing unexplored terrain.
              return (debugMode || mapCellMap.has(mapRoomKey(neighbor))) && isWalkableRoom(effectiveRoomType(neighbor))
                ? [String(shadow)] : [];
            }).join(", ") : undefined;
            const adjacent = distance === 1 && walkable;
            const reachable = !current && (debugMode ? walkable : knownRoomRoutes.has(roomKey));
            const itemCount = (roomDrops[roomKey]?.length ?? 0)
              + (roomConsumableDrops[roomKey]?.length ?? 0)
              + (roomDeckDrops[roomKey]?.length ?? 0)
              + Number((roomGoldPiles[roomKey] ?? 0) > 0);
            const roomItemNames = [
              ...(roomDrops[roomKey] ?? []).map((card) => card.name),
              ...(roomConsumableDrops[roomKey] ?? []).map((consumable) => consumable.name),
              ...(roomDeckDrops[roomKey] ?? []).map((deck) => `덱 '${deck.name}'`),
              ...((roomGoldPiles[roomKey] ?? 0) > 0 ? ["골드"] : []),
            ];
            const roomItemsTitle = roomItemNames.length > 0
              ? `떨어진 아이템: ${roomItemNames.join(", ")}`
              : undefined;
            return (
              <MapRoomButton
                key={roomKey}
                position={position}
                roomType={roomType}
                dungeonRegionIndex={dungeonRegionIndex}
                current={current}
                interactable={current && (onInteractCurrentRoom !== undefined || onPickUpCurrentRoom !== undefined)}
                inVision={inVision}
                adjacent={adjacent}
                reachable={reachable}
                walkable={walkable}
                wallEdges={wallEdges}
                mapTraveling={mapTraveling}
                searchHighlighted={highlightedRoomKey === roomKey}
                bloodstained={bloodstainedRooms.has(roomKey)}
                itemCount={itemCount}
                floorDeck={roomDeckDrops[roomKey]?.[0]}
                floorCard={roomDrops[roomKey]?.[0]}
                floorTicket={roomConsumableDrops[roomKey]?.[0]}
                floorGold={roomGoldPiles[roomKey]}
                roomItemsTitle={roomItemsTitle}
                deckName={roomType === "deckVault" ? roomDeckVaults[roomKey]?.name : undefined}
                onPreview={roomType === "deckVault" && roomDeckVaults[roomKey] ? showVaultPreview : undefined}
                onClearPreview={hideVaultPreview}
                gridColumn={position.x - surface.minX + 1}
                gridRow={position.y - surface.minY + 1}
                onClick={clickRoom}
              />
            );
          })}
          <MapEntityMarkers
            bombs={mapBombs.filter((bomb) => renderedMapCellKeys.has(mapRoomKey(bomb.position)))}
            rememberedEnemies={rememberedEnemyCells}
            visibleEnemies={visibleMapEnemies}
            mapSeed={mapSeed}
            collisionEnemyIds={mapCollisionEnemyIds}
            battleFlash={mapBattleFlash}
            playerPosition={mapPosition}
            waitNoticeNonce={mapWaitNoticeNonce}
            goldNotice={mapGoldNotice}
            showPlayer={mapPosition.x >= surface.minX && mapPosition.x <= surface.maxX
              && mapPosition.y >= surface.minY && mapPosition.y <= surface.maxY}
            layout={{
              originX: surface.minX,
              originY: surface.minY,
              roomWidth: MAP_ROOM_WIDTH,
              roomHeight: MAP_ROOM_HEIGHT,
              cellGap: MAP_CELL_GAP,
            }}
          />
        </div>
        <div className="map-depth-fade" aria-hidden="true" />
        <MapMinimap viewportRef={mapViewportRef} playerPosition={mapPosition} knownRooms={mapCellMap}
          visibleRoomKeys={currentVisibleRoomKeys} enemies={mapEnemyWorld.enemies} enemyMemory={mapEnemyCellMemory}
          roomTypeAt={effectiveRoomType} hasItemsAt={hasMinimapItems} debugMode={debugMode} />
        {!playerVisibleInViewport && mapViewportSize.width > 0 && mapViewportSize.height > 0 && (
          <button
            type="button"
            className="map-player-edge-indicator"
            style={{
              left: edgeIndicatorX,
              top: edgeIndicatorY,
              transform: `translate(-50%, -50%) rotate(${edgeIndicatorAngle}deg)`,
            }}
            aria-label="현재 위치로 카메라 이동"
            title="현재 위치로 이동"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              focusMapOnPlayer();
            }}
          >➤</button>
        )}
      </div>
      {children}
      <MapDeckVaultPreview controlsRef={vaultPreviewRef} />
    </section>
  );
}
