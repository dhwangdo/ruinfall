import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseNextIntent,
  createSewerEncounterByIndex,
  getEncounterIndicesForRegion,
} from "../app/game/enemies.ts";

test("region 1 and 2 each select only their assigned encounters", () => {
  assert.deepEqual(getEncounterIndicesForRegion(0), [0, 1, 3, 5, 7]);
  assert.deepEqual(getEncounterIndicesForRegion(1), [2, 4, 6]);
  assert.deepEqual(getEncounterIndicesForRegion(2), []);
});

test("orange slime has 35 health and its established alternating pattern", () => {
  const slime = createSewerEncounterByIndex(1, () => 0)[0];
  const actions = slime.actions;
  assert.equal(slime.hp, 35);
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
  const golem = createSewerEncounterByIndex(2, () => 0)[0];
  assert.equal(golem.name, "골렘");
  assert.equal(golem.hp, 70);
  assert.equal(golem.intentIndex, 0);
  assert.deepEqual(golem.actions.map((action) => action.name), ["...", "...!", "공격", "...", "공격"]);
  assert.equal(golem.actions[2].attacks[0].value, 24);
  assert.equal(chooseNextIntent(golem.actions, 0), 1);
  assert.equal(chooseNextIntent(golem.actions, 1), 2);
  assert.equal(chooseNextIntent(golem.actions, 2), 3);
  assert.equal(chooseNextIntent(golem.actions, 4), 0);
});

test("sewer rat alternates discard attacks and marks a target pile", () => {
  const rat = createSewerEncounterByIndex(3, () => 0)[0];
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
  const goblin = createSewerEncounterByIndex(4, () => 0)[0];
  assert.equal(goblin.name, "도깨비");
  assert.equal(goblin.hp, 60);
  assert.equal(goblin.actions[0].attacks[0].value, 4);
  assert.equal(goblin.actions[0].attacks[0].hits, 3);
  assert.equal(goblin.actions[1].attacks[0].value, 6);
  assert.equal(goblin.actions[1].attacks[0].hits, 2);
  assert.equal(goblin.actions[2].attacks[0].value, 8);
  assert.equal(goblin.actions[2].strengthGain, 2);
  assert.equal(chooseNextIntent(goblin.actions, 2), 0);
});

test("small wizard always attacks with 8 magic damage", () => {
  const wizard = createSewerEncounterByIndex(0)[0];
  assert.equal(wizard.hp, 25);
  assert.equal(wizard.actions.length, 1);
  assert.deepEqual(wizard.actions[0].attacks, [{ type: "magic", value: 8 }]);
});

test("three rats are 10-health enemies with fixed 4 damage", () => {
  const rats = createSewerEncounterByIndex(5);
  assert.equal(rats.length, 3);
  assert.ok(rats.every((rat) => rat.hp === 10 && rat.actions[0].attacks[0].value === 4));
});

test("warlock curses, then attacks twice", () => {
  const warlock = createSewerEncounterByIndex(6)[0];
  assert.equal(warlock.hp, 50);
  assert.equal(warlock.actions[0].physicalVulnerabilityGain, 3);
  assert.equal(warlock.actions[1].attacks[0].value, 10);
  assert.equal(warlock.actions[2].attacks[0].value, 10);
});

test("green slime randomly chooses either 8-damage pattern", () => {
  const slime = createSewerEncounterByIndex(7, () => 0)[0];
  assert.equal(slime.hp, 35);
  assert.equal(slime.actions[0].attacks[0].value, 8);
  assert.equal(slime.actions[1].attacks[0].value, 8);
  assert.equal(slime.actions[1].nextAttackMagic, true);
  assert.equal(chooseNextIntent(slime.actions, 0, () => 0), 0);
  assert.equal(chooseNextIntent(slime.actions, 0, () => 0.99), 1);
});
