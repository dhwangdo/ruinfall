import assert from "node:assert/strict";
import test from "node:test";

import { chooseNextIntent, createSewerEncounter } from "../app/game/enemies.ts";

test("orange slime alternates a 9-damage attack with block and 6 damage", () => {
  const slime = createSewerEncounter(() => 0)[0];
  const actions = slime.actions;
  assert.equal(slime.hp, 28);
  assert.equal(slime.intentIndex, 0);
  assert.equal(actions.length, 2);
  assert.equal(actions[0].attacks[0].value, 9);
  assert.equal(actions[0].blockGain, undefined);
  assert.equal(actions[1].attacks[0].value, 6);
  assert.equal(actions[1].blockGain, 7);
  assert.equal(chooseNextIntent(actions, 0), 1);
  assert.equal(chooseNextIntent(actions, 1), 0);
});

test("golem waits twice, then repeats a 24-damage attack", () => {
  const golem = createSewerEncounter(() => 0.25)[0];
  assert.equal(golem.name, "골렘");
  assert.equal(golem.hp, 52);
  assert.equal(golem.intentIndex, 0);
  assert.deepEqual(golem.actions.map((action) => action.name), ["...", "...!", "공격"]);
  assert.equal(golem.actions[2].attacks[0].value, 24);
  assert.equal(chooseNextIntent(golem.actions, 0), 1);
  assert.equal(chooseNextIntent(golem.actions, 1), 2);
  assert.equal(chooseNextIntent(golem.actions, 2), 0);
});

test("sewer rat alternates discard attacks and marks a target pile", () => {
  const rat = createSewerEncounter(() => 0.5)[0];
  assert.equal(rat.name, "하수구 쥐");
  assert.equal(rat.hp, 32);
  assert.equal(rat.actions[0].attacks[0].value, 11);
  assert.equal(rat.actions[0].discardCount, 1);
  assert.equal(rat.actions[1].blockGain, 10);
  assert.equal(rat.actions[1].discardCount, 1);
  assert.equal(rat.actions[2].attacks[0].value, 6);
  assert.equal(rat.actions[2].strengthGain, 3);
  assert.equal(rat.discardPileIndex, undefined);
});

test("goblin repeats its three escalating attack patterns", () => {
  const goblin = createSewerEncounter(() => 0.999)[0];
  assert.equal(goblin.name, "도깨비");
  assert.equal(goblin.hp, 48);
  assert.equal(goblin.actions[0].attacks[0].value, 4);
  assert.equal(goblin.actions[0].attacks[0].hits, 3);
  assert.equal(goblin.actions[1].attacks[0].value, 6);
  assert.equal(goblin.actions[1].attacks[0].hits, 2);
  assert.equal(goblin.actions[2].attacks[0].value, 8);
  assert.equal(goblin.actions[2].strengthGain, 2);
  assert.equal(chooseNextIntent(goblin.actions, 2), 0);
});
