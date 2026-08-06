import assert from "node:assert/strict";
import test from "node:test";

import { chooseNextIntent, createSewerEncounter } from "../app/game/enemies.ts";

test("orange slime alternates a 10-damage attack with block and 7 damage", () => {
  const slime = createSewerEncounter(() => 0)[0];
  const actions = slime.actions;
  assert.equal(slime.intentIndex, 0);
  assert.equal(actions.length, 2);
  assert.equal(actions[0].attacks[0].value, 10);
  assert.equal(actions[0].blockGain, undefined);
  assert.equal(actions[1].attacks[0].value, 7);
  assert.equal(actions[1].blockGain, 7);
  assert.equal(chooseNextIntent(actions, 0), 1);
  assert.equal(chooseNextIntent(actions, 1), 0);
});

test("golem waits twice, then repeats a 25-damage attack", () => {
  const golem = createSewerEncounter(() => 0.25)[0];
  assert.equal(golem.name, "골렘");
  assert.equal(golem.hp, 65);
  assert.equal(golem.intentIndex, 0);
  assert.deepEqual(golem.actions.map((action) => action.name), ["...", "...!", "공격"]);
  assert.equal(golem.actions[2].attacks[0].value, 25);
  assert.equal(chooseNextIntent(golem.actions, 0), 1);
  assert.equal(chooseNextIntent(golem.actions, 1), 2);
  assert.equal(chooseNextIntent(golem.actions, 2), 0);
});

test("sewer rat alternates discard attacks and marks a target pile", () => {
  const rat = createSewerEncounter(() => 0.5)[0];
  assert.equal(rat.name, "하수구 쥐");
  assert.equal(rat.hp, 40);
  assert.equal(rat.actions[0].attacks[0].value, 12);
  assert.equal(rat.actions[0].discardCount, 1);
  assert.equal(rat.actions[1].blockGain, 10);
  assert.equal(rat.actions[1].discardCount, 1);
  assert.equal(rat.actions[2].attacks[0].value, 7);
  assert.equal(rat.actions[2].strengthGain, 3);
  assert.equal(rat.discardPileIndex, undefined);
});

test("goblin repeats its three escalating attack patterns", () => {
  const goblin = createSewerEncounter(() => 0.999)[0];
  assert.equal(goblin.name, "도깨비");
  assert.equal(goblin.hp, 60);
  assert.equal(goblin.actions[0].attacks[0].value, 5);
  assert.equal(goblin.actions[0].attacks[0].hits, 3);
  assert.equal(goblin.actions[1].attacks[0].value, 7);
  assert.equal(goblin.actions[1].attacks[0].hits, 2);
  assert.equal(goblin.actions[2].attacks[0].value, 9);
  assert.equal(goblin.actions[2].strengthGain, 2);
  assert.equal(chooseNextIntent(goblin.actions, 2), 0);
});
