import {
  advanceMapEnemies,
  type GridBounds,
  type MapEnemyWorld,
} from "./mapEnemies.ts";
import type { MapPosition } from "./mapRules";

export type ResolveMapTurnInput = {
  currentPosition: MapPosition;
  nextPosition: MapPosition;
  world: MapEnemyWorld;
  isWalkable: (position: MapPosition) => boolean;
  detectionMultiplier: number;
  movementBounds: GridBounds;
  detectionDistanceReduction: number;
  random?: () => number;
};

export function resolveMapTurn({
  currentPosition,
  nextPosition,
  world,
  isWalkable,
  detectionMultiplier,
  movementBounds,
  detectionDistanceReduction,
  random = Math.random,
}: ResolveMapTurnInput) {
  const enemyTurn = advanceMapEnemies(
    world.enemies,
    currentPosition,
    nextPosition,
    isWalkable,
    random,
    new Set(),
    detectionMultiplier,
    movementBounds,
    detectionDistanceReduction,
  );
  const nextWorld = { ...world, enemies: enemyTurn.enemies };
  return {
    world: nextWorld,
    collisionEnemies: enemyTurn.enemies.filter((enemy) =>
      enemy.position.x === nextPosition.x && enemy.position.y === nextPosition.y),
  };
}
