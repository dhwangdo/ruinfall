import assert from "node:assert/strict";
import test from "node:test";
import { findEnemyAvoidingRoute, knownTravelEnemyPositions } from "../app/game/mapTravelRoute.ts";

const key = ({ x, y }) => `${x}:${y}`;
const floor = () => "empty";
const start = { x: 0, y: 0 }, target = { x: 8, y: 0 };
const known = new Set(Array.from({ length: 13 }, (_, i) => i - 6)
  .flatMap(y => Array.from({ length: 9 }, (_, x) => key({ x, y }))));

test("fast travel takes a longer route to keep away from an enemy on the direct route", () => {
  const path = findEnemyAvoidingRoute(start, target, known, floor, [{ x: 4, y: 0 }]);
  assert.deepEqual(path[0], start);
  assert.deepEqual(path.at(-1), target);
  assert.ok(path.length > 9);
  assert.ok(path.every(p => Math.max(Math.abs(p.x - 4), Math.abs(p.y)) >= 4));
  assert.ok(path.every(p => known.has(key(p))));
  path.slice(1).forEach((p, i) => assert.equal(Math.max(
    Math.abs(p.x - path[i].x), Math.abs(p.y - path[i].y)), 1));
});

test("without nearby enemies fast travel keeps the shortest route", () => {
  for (const enemies of [[], [{ x: 80, y: 80 }]]) {
    assert.equal(findEnemyAvoidingRoute(start, target, known, floor, enemies).length, 9);
  }
});

test("walls prevent an isolated enemy from influencing the route", () => {
  const corridor = new Set(["0:0", "0:1", "0:2", "0:3", "0:4", "2:0"]);
  assert.equal(findEnemyAvoidingRoute(start, { x: 0, y: 4 }, corridor, floor,
    [{ x: 2, y: 0 }]).length, 5);
});

test("an unavoidable enemy or an enemy at the destination does not make travel impossible", () => {
  const corridor = new Set(Array.from({ length: 9 }, (_, x) => `${x}:0`));
  assert.equal(findEnemyAvoidingRoute(start, target, corridor, floor,
    [{ x: 4, y: 0 }, target]).length, 9);
  assert.equal(findEnemyAvoidingRoute(start, target, new Set(["0:0", "8:0"]), floor,
    [target]), null);
  assert.equal(findEnemyAvoidingRoute(start, { x: 9, y: 0 }, corridor, floor, [target]), null);
});

test("travel uses enemy memories, never unseen live positions, and clears visible empty cells", () => {
  const enemies = [
    { id: "moved", position: { x: 5, y: 5 }, awareness: "awake", encounterIndex: 0 },
    { id: "seen", position: { x: 1, y: 0 }, awareness: "awake", encounterIndex: 0 },
  ];
  const memory = {
    "3:3": { id: "moved", awareness: "sleeping", encounterIndex: 0 },
    "4:4": { id: "seen", awareness: "sleeping", encounterIndex: 0 },
    "0:1": { id: "gone", awareness: "sleeping", encounterIndex: 0 },
  };
  assert.deepEqual(knownTravelEnemyPositions(enemies, memory, new Set(["1:0", "0:1"])),
    [{ x: 3, y: 3 }, { x: 1, y: 0 }]);
});
