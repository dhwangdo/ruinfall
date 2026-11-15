import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceBombs,
  applyBombDamage,
  positionsInSquare,
} from "../app/game/mapEffects.ts";

test("a bomb explodes after three movements", () => {
  let bombs = [{ id: "bomb", position: { x: 0, y: 0 }, movesRemaining: 3 }];
  let result = advanceBombs(bombs);
  assert.equal(result.explosions.length, 0);
  result = advanceBombs(result.bombs);
  assert.equal(result.explosions.length, 0);
  result = advanceBombs(result.bombs);
  assert.equal(result.explosions.length, 1);
});

test("a bomb affects exactly the centered three by three square", () => {
  const cells = positionsInSquare({ x: 5, y: 7 }, 1);
  assert.equal(cells.length, 9);
  assert.ok(cells.some((cell) => cell.x === 4 && cell.y === 6));
  assert.ok(cells.some((cell) => cell.x === 6 && cell.y === 8));
});

test("bomb damage accumulates on enemies in range", () => {
  const enemies = [
    { id: "near", position: { x: 1, y: 1 }, encounterIndex: 0, awareness: "awake" },
    { id: "far", position: { x: 2, y: 0 }, encounterIndex: 0, awareness: "awake" },
  ];
  const bombs = [{ id: "bomb", position: { x: 0, y: 0 }, movesRemaining: 0 }];
  const damaged = applyBombDamage(enemies, bombs);
  assert.equal(damaged[0].damageTaken, 20);
  assert.equal(damaged[1].damageTaken, undefined);
});

test("bombs on the same tile stack their damage", () => {
  const enemies = [
    { id: "target", position: { x: 0, y: 0 }, encounterIndex: 0, awareness: "awake" },
  ];
  const bombs = [
    { id: "bomb-a", position: { x: 0, y: 0 }, movesRemaining: 0 },
    { id: "bomb-b", position: { x: 0, y: 0 }, movesRemaining: 0 },
  ];
  assert.equal(applyBombDamage(enemies, bombs)[0].damageTaken, 40);
});
