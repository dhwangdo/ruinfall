"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MapSearchData } from "../game/mapSearch";
import { buildMinimapCells, MINIMAP_COLORS } from "../game/mapMinimap";
import { DUNGEON_MIN_X, MAP_COLUMNS, REGION_HEIGHT, getRegionNumber, mapRoomKey,
  parseMapRoomKey, regionStartY, type MapPosition } from "../game/mapRules";
import { useGameSettings } from "../hooks/useGameSettings";
import { MinimapPlayerMarker } from "./MinimapPlayerMarker";

export function SearchRegionMinimap({ data, region, target }: {
  data: MapSearchData; region: number; target: MapPosition;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 420, height: 260 });
  const { minimapPlayerMarker } = useGameSettings();
  const { bounds, cells } = useMemo(() => {
    const knownRooms = new Map([...data.seenRooms].flatMap(key => {
      const position = parseMapRoomKey(key);
      return getRegionNumber(position, data.seed) === region ? [[key, position] as const] : [];
    }));
    const center = { x: DUNGEON_MIN_X + Math.floor(MAP_COLUMNS / 2),
      y: regionStartY(region - 1) + Math.floor(REGION_HEIGHT / 2) };
    const minimap = buildMinimapCells({ player: data.playerPosition, knownRooms,
      visibleRoomKeys: new Set(knownRooms.keys()), enemies: [], enemyMemory: {},
      roomTypeAt: data.roomTypeAt, hasItemsAt: () => false }, MAP_COLUMNS, REGION_HEIGHT, center);
    const regionTop = regionStartY(region - 1);
    const regionRight = DUNGEON_MIN_X + MAP_COLUMNS - 1;
    const regionBottom = regionTop + REGION_HEIGHT - 1;
    const regionCells = minimap.cells.filter(cell => cell.x >= DUNGEON_MIN_X
      && cell.x <= regionRight && cell.y >= regionTop && cell.y <= regionBottom);
    let minX = target.x, maxX = target.x, minY = target.y, maxY = target.y;
    for (const cell of regionCells) {
      minX = Math.min(minX, cell.x); maxX = Math.max(maxX, cell.x);
      minY = Math.min(minY, cell.y); maxY = Math.max(maxY, cell.y);
    }
    minX = Math.max(DUNGEON_MIN_X, minX - 2); maxX = Math.min(regionRight, maxX + 2);
    minY = Math.max(regionTop, minY - 2); maxY = Math.min(regionBottom, maxY + 2);
    return {
      bounds: { minX, maxX, minY, maxY, columns: maxX - minX + 1, rows: maxY - minY + 1 },
      cells: regionCells.filter(cell => cell.x >= minX && cell.x <= maxX && cell.y >= minY && cell.y <= maxY),
    };
  }, [data, region, target.x, target.y]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const update = () => setFrameSize(current => {
      const width = frame.clientWidth, height = frame.clientHeight;
      return width === current.width && height === current.height ? current : { width, height };
    });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const ratio = bounds.columns / bounds.rows;
  const width = Math.max(1, Math.min(frameSize.width - 20, (frameSize.height - 20) * ratio));
  const height = width / ratio;
  const player = data.playerPosition;
  const playerInView = player.x >= bounds.minX && player.x <= bounds.maxX
    && player.y >= bounds.minY && player.y <= bounds.maxY;
  return <div className="map-search-region-preview">
    <div ref={frameRef} className="map-search-minimap-frame">
      <div className="map-search-region-minimap" role="img"
        aria-label={`${region}지역 발견 지도. 흰색 표식은 현재 위치, 금색 점멸 표식은 선택 위치입니다.`}
        style={{ backgroundColor: MINIMAP_COLORS.background, width, height }}>
        <svg className="map-search-region-tiles" viewBox={`0 0 ${bounds.columns} ${bounds.rows}`}
          shapeRendering="crispEdges" aria-hidden="true">
          {cells.map(cell => <rect key={mapRoomKey(cell)} x={cell.x - bounds.minX} y={cell.y - bounds.minY}
            width="1" height="1" fill={cell.color} />)}
        </svg>
        {playerInView && <MinimapPlayerMarker marker={minimapPlayerMarker} tilePixels={width / bounds.columns}
          style={{ left: `${(player.x - bounds.minX + .5) / bounds.columns * 100}%`,
            top: `${(player.y - bounds.minY + .5) / bounds.rows * 100}%` }} />}
        <span className="map-search-region-target" style={{
          left: `${(target.x - bounds.minX) / bounds.columns * 100}%`,
          top: `${(target.y - bounds.minY) / bounds.rows * 100}%`,
          width: `${100 / bounds.columns}%`, height: `${100 / bounds.rows}%`,
        }} />
      </div>
    </div>
  </div>;
}
