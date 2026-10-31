"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import { MapDebugToolbar } from "./MapDebugToolbar";
import { MapEntityMarkers } from "./MapEntityMarkers";
import { MapRoomButton } from "./MapRoomButton";
import {
  MAP_CELL_GAP,
  MAP_PADDING,
  MAP_RENDER_COLUMNS,
  MAP_RENDER_ROWS,
  MAP_ROOM_HEIGHT,
  MAP_ROOM_WIDTH,
  MAP_WORLD_MARGIN_X,
  MAP_WORLD_MARGIN_Y,
  type MapCamera,
} from "../hooks/useMapCamera";
import { chebyshevDistance, type MapEnemyCellMemory, type MapEnemyWorld } from "../game/mapEnemies";
import type { MapBomb } from "../game/mapEffects";
import { mapViewportBounds } from "../game/mapViewport";
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
    onOpenCardStats: () => void;
  };
  effectiveRoomType: (position: MapPosition) => RoomType;
  onClearMessage: () => void;
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

  const mapWidth = MAP_PADDING * 2
    + MAP_RENDER_COLUMNS * MAP_ROOM_WIDTH
    + (MAP_RENDER_COLUMNS - 1) * MAP_CELL_GAP;
  const mapHeight = MAP_PADDING * 2
    + MAP_RENDER_ROWS * MAP_ROOM_HEIGHT
    + (MAP_RENDER_ROWS - 1) * MAP_CELL_GAP;
  const mapStrideX = MAP_ROOM_WIDTH + MAP_CELL_GAP;
  const mapStrideY = MAP_ROOM_HEIGHT + MAP_CELL_GAP;
  const bounds = mapViewportBounds(mapPan, mapZoom, mapViewportSize, {
    minX: DUNGEON_MIN_X, maxX: DUNGEON_MAX_X, minY: -MAP_WORLD_MARGIN_Y, maxY: MAP_ROWS - 1,
    marginX: MAP_WORLD_MARGIN_X, marginY: MAP_WORLD_MARGIN_Y, padding: MAP_PADDING,
    strideX: mapStrideX, strideY: mapStrideY,
  });
  const currentVisibleRoomKeys = useMemo(() => visibleMapRoomKeys(
    mapPosition,
    mapSeed,
    visionHorizontalRadius,
    visionVerticalRadius,
  ), [mapPosition, mapSeed, visionHorizontalRadius, visionVerticalRadius]);
  const knownRoomRoutes = useMemo(() => buildKnownRoomRoutes(mapPosition, seenRooms, mapSeed, effectiveRoomType),
    [mapPosition, seenRooms, mapSeed, effectiveRoomType]);
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
    const cells = retainKnownCells ? new Map(mapCellMap) : new Map<string, MapPosition>();
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const position = { x, y };
        const known = mapCellMap.get(mapRoomKey(position));
        if (known) cells.set(mapRoomKey(position), known);
        else if (debugMode && getRoomType(position, mapSeed) !== "void") cells.set(mapRoomKey(position), position);
      }
    }
    return Array.from(cells.values());
  }, [minX, maxX, minY, maxY, mapCellMap, debugMode, mapSeed, retainKnownCells]);
  const renderedMapCellKeys = useMemo(() => new Set(mapCells.map(mapRoomKey)), [mapCells]);
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
          className={`map-canvas ${mapTraveling ? "is-traveling" : ""} ${mapCameraFocusing ? "is-camera-focusing" : ""}`}
          style={{
            width: mapWidth,
            height: mapHeight,
            padding: MAP_PADDING,
            gap: MAP_CELL_GAP,
            gridTemplateColumns: `repeat(${MAP_RENDER_COLUMNS}, ${MAP_ROOM_WIDTH}px)`,
            gridAutoRows: `${MAP_ROOM_HEIGHT}px`,
            transform: `translate3d(${mapPan.x}px, ${mapPan.y}px, 0) scale(${mapZoom})`,
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
            const adjacent = distance === 1 && walkable;
            const reachable = !current && (debugMode ? walkable : knownRoomRoutes.has(roomKey));
            const hasItems = (roomDrops[roomKey]?.length ?? 0) > 0
              || (roomConsumableDrops[roomKey]?.length ?? 0) > 0
              || (roomDeckDrops[roomKey]?.length ?? 0) > 0;
            const roomItemNames = [
              ...(roomDrops[roomKey] ?? []).map((card) => card.name),
              ...(roomConsumableDrops[roomKey] ?? []).map((consumable) => consumable.name),
              ...(roomDeckDrops[roomKey] ?? []).map((deck) => `덱 '${deck.name}'`),
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
                inVision={inVision}
                adjacent={adjacent}
                reachable={reachable}
                walkable={walkable}
                mapTraveling={mapTraveling}
                hasItems={hasItems}
                roomItemsTitle={roomItemsTitle}
                gridColumn={position.x - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X + 1}
                gridRow={position.y + MAP_WORLD_MARGIN_Y + 1}
                onClick={() => {
                  if (mapWasDraggedRef.current) {
                    mapWasDraggedRef.current = false;
                    return;
                  }
                  if (mapTraveling) return;
                  onClearMessage();
                  if (debugMode && walkable && !current) {
                    if (adjacent) {
                      onMove(position.x - mapPosition.x, position.y - mapPosition.y);
                      return;
                    }
                    onDebugTeleport(position);
                    return;
                  }
                  if (adjacent) {
                    onMove(position.x - mapPosition.x, position.y - mapPosition.y);
                    return;
                  }
                  const safePath = findKnownRoomRoute(
                    mapPosition,
                    position,
                    seenRooms,
                    effectiveRoomType,
                  );
                  if (safePath && safePath.length > 1) onTravel(safePath);
                }}
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
            layout={{
              padding: MAP_PADDING,
              roomWidth: MAP_ROOM_WIDTH,
              roomHeight: MAP_ROOM_HEIGHT,
              cellGap: MAP_CELL_GAP,
              worldMarginX: MAP_WORLD_MARGIN_X,
              worldMarginY: MAP_WORLD_MARGIN_Y,
            }}
          />
        </div>
        <div className="map-depth-fade" aria-hidden="true" />
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
    </section>
  );
}
