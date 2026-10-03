import type { CSSProperties } from "react";
import { getSewerEncounterLabel } from "../game/enemies";
import { DUNGEON_MIN_X, isHigherRegionMapEnemy, type MapPosition } from "../game/mapRules";
import {
  awarenessSymbol,
  type MapEnemy,
  type MapEnemyAwareness,
} from "../game/mapEnemies";
import type { MapBomb } from "../game/mapEffects";

type RememberedEnemyCell = {
  roomKey: string;
  position: MapPosition;
  encounterIndex: number;
  awareness: MapEnemyAwareness;
};

type MapEntityMarkersProps = {
  bombs: MapBomb[];
  rememberedEnemies: RememberedEnemyCell[];
  visibleEnemies: MapEnemy[];
  mapSeed: number;
  collisionEnemyIds: string[];
  battleFlash: boolean;
  playerPosition: MapPosition;
  waitNoticeNonce: number;
  layout: {
    padding: number;
    roomWidth: number;
    roomHeight: number;
    cellGap: number;
    worldMarginX: number;
    worldMarginY: number;
  };
};

export function MapEntityMarkers({
  bombs,
  rememberedEnemies,
  visibleEnemies,
  mapSeed,
  collisionEnemyIds,
  battleFlash,
  playerPosition,
  waitNoticeNonce,
  layout,
}: MapEntityMarkersProps) {
  const markerStyle = (position: MapPosition): CSSProperties => ({
    left: layout.padding
      + (position.x - DUNGEON_MIN_X + layout.worldMarginX) * (layout.roomWidth + layout.cellGap)
      + layout.roomWidth / 2,
    top: layout.padding
      + (position.y + layout.worldMarginY) * (layout.roomHeight + layout.cellGap)
      + layout.roomHeight / 2,
  });
  const playerMarkerStyle = markerStyle(playerPosition);

  return (
    <>
      {bombs.map((bomb) => (
        <span
          className="map-bomb"
          key={bomb.id}
          style={markerStyle(bomb.position)}
          title={`${bomb.movesRemaining}번 이동 후 폭발`}
          aria-label={`폭탄, ${bomb.movesRemaining}번 이동 후 폭발`}
        >
          <strong>●</strong>
          <small>{bomb.movesRemaining}</small>
        </span>
      ))}
      {rememberedEnemies.map((memory) => {
        const label = getSewerEncounterLabel(memory.encounterIndex);
        return (
          <span
            className={`map-enemy is-memory ${isHigherRegionMapEnemy(memory.encounterIndex, memory.position, mapSeed) ? "is-overlevel" : ""}`}
            key={`memory-${memory.roomKey}`}
            style={markerStyle(memory.position)}
            title={`${label} · 마지막 목격 위치`}
            aria-label={`${label}, 마지막 목격 위치`}
          >
            <strong>{awarenessSymbol(memory.awareness)}</strong>
            <small>{label}</small>
          </span>
        );
      })}
      {visibleEnemies.map((enemy) => {
        const label = getSewerEncounterLabel(enemy.encounterIndex);
        return (
          <span
            className={`map-enemy is-${enemy.awareness} ${isHigherRegionMapEnemy(enemy.encounterIndex, enemy.position, mapSeed) ? "is-overlevel" : ""} ${collisionEnemyIds.includes(enemy.id) ? "is-colliding" : ""}`}
            key={enemy.id}
            style={markerStyle(enemy.position)}
            title={`${label} · ${awarenessSymbol(enemy.awareness)}`}
            aria-label={`${label}, 상태 ${awarenessSymbol(enemy.awareness)}`}
          >
            <strong>{awarenessSymbol(enemy.awareness)}</strong>
            <small>{label}</small>
          </span>
        );
      })}
      {battleFlash && (
        <span className="map-battle-flash" style={playerMarkerStyle} aria-live="assertive">전투!</span>
      )}
      <span
        className="map-player map-player-marker"
        style={playerMarkerStyle}
        aria-hidden="true"
      >@</span>
      {waitNoticeNonce > 0 && (
        <span
          key={waitNoticeNonce}
          className="map-wait-notice"
          style={playerMarkerStyle}
          aria-live="polite"
        >한 턴 쉼</span>
      )}
    </>
  );
}
