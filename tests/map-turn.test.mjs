import assert from "node:assert/strict";
import test from "node:test";

import { resolveMapTurn } from "../app/game/mapTurn.ts";

test("map turn returns the moved world and enemies that meet the player", () => {
  const world = {
    seed: 17,
    enemies: [
      {
        id: "destination-enemy",
        position: { x: 2, y: 1 },
        encounterIndex: 4,
        awareness: "sleeping",
      },
      {
        id: "distant-enemy",
        position: { x: 5, y: 1 },
        encounterIndex: 2,
        awareness: "sleeping",
      },
    ],
  };

  const result = resolveMapTurn({
    currentPosition: { x: 1, y: 1 },
    nextPosition: { x: 2, y: 1 },
    world,
    isWalkable: () => true,
    detectionMultiplier: 1,
    movementBounds: { minX: 0, maxX: 6, minY: 0, maxY: 2 },
    detectionDistanceReduction: 0,
    random: () => 0.99,
  });

  assert.equal(result.world.seed, world.seed);
  assert.notEqual(result.world, world);
  assert.deepEqual(result.collisionEnemies.map((enemy) => enemy.id), ["destination-enemy"]);
  assert.equal(result.world.enemies[0].awareness, "sleeping");
  assert.equal(result.world.enemies[1].awareness, "sleeping");
  assert.deepEqual(world.enemies[0].position, { x: 2, y: 1 });
});

test("waiting advances enemy movement and can produce a collision", () => {
  const result = resolveMapTurn({
    currentPosition: { x: 1, y: 1 },
    nextPosition: { x: 1, y: 1 },
    world: {
      enemies: [{
        id: "approaching-enemy",
        position: { x: 0, y: 0 },
        encounterIndex: 0,
        awareness: "alerted",
      }],
    },
    isWalkable: () => true,
    detectionMultiplier: 1,
    movementBounds: { minX: -1, maxX: 2, minY: -1, maxY: 2 },
    detectionDistanceReduction: 0,
    random: () => 0,
  });

  assert.deepEqual(result.world.enemies[0].position, { x: 1, y: 1 });
  assert.deepEqual(result.collisionEnemies.map((enemy) => enemy.id), ["approaching-enemy"]);
});
