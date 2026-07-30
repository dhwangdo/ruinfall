import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPlayerAttack,
  chooseNextIntent,
  createSewerEncounter,
} from "../app/game/enemies.ts";

test("an enemy with alternatives does not repeat its previous action", () => {
  const actions = createSewerEncounter(() => 0)[0].actions;
  assert.equal(chooseNextIntent(actions, 1, () => 0), 0);
  assert.equal(chooseNextIntent(actions, 1, () => 0.999), 2);
});

test("sturdy reduces every hit of 10 or less to one damage", () => {
  const gargoyle = createSewerEncounter(() => 0)[0];
  const damaged = applyPlayerAttack(gargoyle, 10, 2);
  assert.equal(gargoyle.hp, 6);
  assert.equal(damaged.hp, 4);
  assert.equal(damaged.sturdyThreshold, 10);
});

test("sturdy does not reduce damage above its threshold", () => {
  const gargoyle = createSewerEncounter(() => 0)[0];
  const damaged = applyPlayerAttack(gargoyle, 11, 1);
  assert.equal(damaged.hp, 0);
});

test("toxic slime has 24 health and primes its next attack as magic", () => {
  const slime = createSewerEncounter(() => 0.25)[0];
  assert.equal(slime.hp, 24);
  assert.equal(slime.actions[0].attacks[0].value, 7);
  assert.equal(slime.actions[0].nextAttackMagic, true);
  assert.equal(slime.actions[1].attacks[0].value, 7);
});

test("quickness ignores only the first attack each turn", () => {
  const snake = createSewerEncounter(() => 0.5)[0];
  const damaged = applyPlayerAttack(snake, 6, 2);
  assert.equal(damaged.hp, 7);
  assert.equal(damaged.quicknessReady, false);
});

test("the crowded sewer encounter contains four rats", () => {
  const rats = createSewerEncounter(() => 0.999);
  assert.equal(rats.length, 4);
  assert.ok(rats.every((enemy) => enemy.name === "하수구 쥐"));
  assert.ok(rats.every((enemy) => enemy.hp === 5));
});
