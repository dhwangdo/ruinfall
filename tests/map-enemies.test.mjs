import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceMapEnemies,
  chebyshevDistance,
  createMapEnemyWorld,
  isInPlayerVision,
  MAP_ENEMY_SPAWN_CHANCE,
} from "../app/game/mapEnemies.ts";

const alwaysWalkable = () => true;

function randomValues(...values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

test("Chebyshev distance uses the larger axis difference", () => {
  assert.equal(chebyshevDistance({ x: 0, y: 0 }, { x: 3, y: -2 }), 3);
});

test("player vision has a 5 by 3 rectangle with 15 cells", () => {
  const center = { x: 0, y: 0 };
  const visible = Array.from({ length: 3 }, (_, y) => y - 1).flatMap((y) =>
    Array.from({ length: 5 }, (_, x) => x - 2).filter((x) =>
      isInPlayerVision({ x, y }, center)));
  assert.equal(visible.length, 15);
  assert.equal(isInPlayerVision({ x: 0, y: 2 }, center), false);
  assert.equal(isInPlayerVision({ x: 1, y: 1 }, center), true);
  assert.equal(isInPlayerVision({ x: 2, y: 1 }, center), true);
});

test("pre-generation can reserve the start cell and its eight neighbors from spawning", () => {
  const spawnCells = Array.from({ length: 9 }, (_, y) => y - 4).flatMap((y) =>
    Array.from({ length: 9 }, (_, x) => x - 4)
      .map((x) => ({ x, y }))
      .filter((position) => chebyshevDistance(position, { x: 0, y: 0 }) > 1));
  const world = createMapEnemyWorld(
    spawnCells,
    1,
    5,
    1,
  );
  assert.equal(MAP_ENEMY_SPAWN_CHANCE, 0.08);
  assert.equal(world.enemies.length, 72);
  assert.ok(world.enemies.every((enemy) => enemy.awareness === "sleeping"));
  assert.ok(world.enemies.every((enemy) =>
    chebyshevDistance(enemy.position, { x: 0, y: 0 }) > 1));
});

test("waking up consumes a sleeping enemy's move", () => {
  const enemy = {
    id: "sleeper",
    position: { x: 0, y: 0 },
    encounterIndex: 0,
    awareness: "sleeping",
  };
  const result = advanceMapEnemies(
    [enemy],
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    alwaysWalkable,
    () => 0,
  );
  assert.equal(result.enemies[0].awareness, "awake");
  assert.deepEqual(result.enemies[0].position, { x: 0, y: 0 });
});

test("an alerted enemy moves diagonally when that lowers L infinity distance", () => {
  const enemy = {
    id: "hunter",
    position: { x: 0, y: 0 },
    encounterIndex: 0,
    awareness: "alerted",
  };
  const result = advanceMapEnemies(
    [enemy],
    { x: 0, y: 0 },
    { x: 2, y: 2 },
    alwaysWalkable,
    randomValues(0, 0),
  );
  assert.deepEqual(result.enemies[0].position, { x: 1, y: 1 });
  assert.equal(chebyshevDistance(result.enemies[0].position, { x: 2, y: 2 }), 1);
});

test("an alerted enemy has a 90 percent chance to move closer", () => {
  const enemy = {
    id: "hunter",
    position: { x: 0, y: 0 },
    encounterIndex: 0,
    awareness: "alerted",
  };
  const moving = advanceMapEnemies(
    [enemy],
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    alwaysWalkable,
    randomValues(0.9, 0.89, 0),
  );
  const resting = advanceMapEnemies(
    [enemy],
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    alwaysWalkable,
    randomValues(0.9, 0.9),
  );
  assert.equal(chebyshevDistance(moving.enemies[0].position, { x: 2, y: 0 }), 1);
  assert.deepEqual(resting.enemies[0].position, { x: 0, y: 0 });
});

test("an alerted enemy at distance four becomes awake and does not move", () => {
  const enemy = {
    id: "lost-hunter",
    position: { x: 0, y: 0 },
    encounterIndex: 0,
    awareness: "alerted",
  };
  const result = advanceMapEnemies(
    [enemy],
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    alwaysWalkable,
    () => 0,
  );
  assert.equal(result.enemies[0].awareness, "awake");
  assert.deepEqual(result.enemies[0].position, { x: 0, y: 0 });
});

test("an enemy moving onto the player reports a collision", () => {
  const enemy = {
    id: "hunter",
    position: { x: 0, y: 0 },
    encounterIndex: 0,
    awareness: "alerted",
  };
  const result = advanceMapEnemies(
    [enemy],
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    alwaysWalkable,
    randomValues(0, 0),
  );
  assert.deepEqual(result.collisionEnemyIds, ["hunter"]);
});

test("an enemy already collided with by the player stays in place for this enemy phase", () => {
  const enemy = {
    id: "occupied-room",
    position: { x: 1, y: 1 },
    encounterIndex: 0,
    awareness: "awake",
  };
  const result = advanceMapEnemies(
    [enemy],
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    alwaysWalkable,
    () => 0,
    new Set(["occupied-room"]),
  );
  assert.deepEqual(result.enemies[0].position, { x: 1, y: 1 });
  assert.deepEqual(result.collisionEnemyIds, ["occupied-room"]);
});

test("multiple enemies can move onto the player in the same turn", () => {
  const enemies = [
    { id: "first", position: { x: 0, y: 0 }, encounterIndex: 0, awareness: "alerted" },
    { id: "second", position: { x: 0, y: 2 }, encounterIndex: 1, awareness: "alerted" },
  ];
  const result = advanceMapEnemies(
    enemies,
    { x: 0, y: 1 },
    { x: 1, y: 1 },
    alwaysWalkable,
    randomValues(0.9, 0, 0, 0.9, 0, 0),
  );
  assert.deepEqual(result.collisionEnemyIds, ["first", "second"]);
  assert.deepEqual(result.enemies.map((enemy) => enemy.position), [{ x: 1, y: 1 }, { x: 1, y: 1 }]);
});
