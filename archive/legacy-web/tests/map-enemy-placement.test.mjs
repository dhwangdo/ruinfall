import assert from "node:assert/strict";
import test from "node:test";
import { createMapEnemyWorld, chebyshevDistance } from "../app/game/mapEnemies.ts";
import { createMapEnemyWorldForPositions } from "../app/game/mapRules.ts";

const cells = Array.from({ length: 30 }, (_, y) =>
  Array.from({ length: 41 }, (_, x) => ({ x: x - 20, y }))).flat();

test("enemy counts fluctuate moderately around the old mean, with reproducible positions", () => {
  const counts = [];
  const mean = cells.length * .045;
  for (let seed = 0; seed < 32; seed += 1) {
    const world = createMapEnemyWorld(cells, seed, 5);
    counts.push(world.enemies.length);
    assert.ok(Math.abs(world.enemies.length - mean) < mean * .1 + 1);
    assert.deepEqual(createMapEnemyWorld([...cells].reverse(), seed, 5), world);
    assert.equal(new Set(world.enemies.map(enemy => enemy.id)).size, world.enemies.length);
  }
  assert.ok(Math.max(...counts) - Math.min(...counts) > 2);
  assert.ok(counts.some(count => count < mean) && counts.some(count => count > mean));
  assert.equal(createMapEnemyWorld([], 1, 5).enemies.length, 0);
  assert.equal(createMapEnemyWorld(cells, 1, 5, 0).enemies.length, 0);
  assert.equal(createMapEnemyWorld(cells, 1, 5, 1).enemies.length, cells.length);
});

test("adjacent enemies remain possible but are uncommon across seeds", () => {
  let adjacentPairs = 0;
  let total = 0;
  for (let seed = 0; seed < 64; seed += 1) {
    const enemies = createMapEnemyWorld(cells, seed, 5).enemies;
    total += enemies.length;
    enemies.forEach((enemy, index) => {
      for (const other of enemies.slice(index + 1)) {
        if (chebyshevDistance(enemy.position, other.position) === 1) adjacentPairs += 1;
      }
    });
  }
  assert.ok(adjacentPairs > 0, "nearby placement is allowed");
  assert.ok(adjacentPairs / total < .12, "clusters should be rarer than independent placement");
});

test("exploration order and chunk boundaries do not change planned enemies", () => {
  const seed = 927;
  const whole = createMapEnemyWorldForPositions(seed, cells).enemies;
  const left = cells.filter(position => position.x < 0);
  const right = cells.filter(position => position.x >= 0);
  const chunks = [right, left].flatMap(chunk => createMapEnemyWorldForPositions(seed, chunk).enemies);
  const byId = enemies => [...enemies].sort((a, b) => a.id.localeCompare(b.id));
  assert.deepEqual(byId(chunks), byId(whole));
  createMapEnemyWorldForPositions(seed + 1, cells);
  assert.deepEqual(createMapEnemyWorldForPositions(seed, cells).enemies, whole);
});
