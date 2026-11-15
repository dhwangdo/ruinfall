import assert from "node:assert/strict";
import test from "node:test";
import { resolveEnemyTurn } from "../app/game/enemyTurnResolution.ts";
import { waitingState } from "../app/game/battleState.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { createSlimeCard } from "../app/game/cards.ts";

const enemy = (attacks, extra = {}) => ({ ...createSewerEncounterByIndex(2)[0], id: "enemy", hp: 100, maxHp: 100,
  strength: 0, actions: [{ name: "test", attacks }], intentIndex: 0, ...extra });
const options = extra => ({ blessings: [], maxPlayerHp: 50, oneUpUsed: false, randomRolls: [.5], ...extra });

test("successive enemy hits consume the matching shield in order", () => {
  const game = { ...waitingState(50, [enemy([{ type: "physical", value: 4, hits: 2 }])]),
    playerPhysicalBlock: 5, playerMagicBlock: 7 };
  const result = resolveEnemyTurn(game, options());
  assert.deepEqual(result.steps.map(step => step.damage), [0, 3]);
  assert.equal(result.remainingHp, 47);
  assert.equal(result.remainingPhysicalBlock, 0);
  assert.equal(result.remainingMagicBlock, 7);
});

test("an extra turn still pays toxic slime damage but skips enemy actions", () => {
  const game = { ...waitingState(50, [enemy([{ type: "physical", value: 99 }])]),
    hand: [createSlimeCard(1)], extraTurns: 1 };
  const result = resolveEnemyTurn(game, options());
  assert.equal(result.remainingHp, 38);
  assert.equal(result.steps.length, 0);
  assert.equal(result.discarded.length, 1);
});

test("toxic slime uses physical block but ignores resistance and amplification", () => {
  for (const statuses of [
    { playerResistance: 1, playerAmplification: -2 },
    { playerResistance: -1, playerAmplification: 2 },
  ]) {
    const game = { ...waitingState(50, []), hand: [createSlimeCard(1)], extraTurns: 1,
      playerPhysicalBlock: 2, playerMagicBlock: 20, ...statuses };
    const result = resolveEnemyTurn(game, options());
    assert.equal(result.remainingHp, 40);
    assert.equal(result.remainingPhysicalBlock, 0);
    assert.equal(result.remainingMagicBlock, 20);
  }
});

test("1UP is consumed at the lethal hit and remaining hits continue normally", () => {
  const game = waitingState(1, [enemy([{ type: "physical", value: 4, hits: 2 }])]);
  const result = resolveEnemyTurn(game, options({ blessings: ["oneUp"] }));
  assert.equal(result.oneUpUsed, true);
  assert.deepEqual(result.steps.map(step => step.hpAfter), [25, 21]);
});

test("blocked attacks reflect their blocked damage and receive player thorns", () => {
  const game = { ...waitingState(50, [enemy([{ type: "physical", value: 4 }])]),
    playerPhysicalBlock: 10, reflectDamage: 1, playerThorns: 5 };
  const result = resolveEnemyTurn(game, options());
  assert.equal(result.remainingHp, 50);
  assert.equal(result.nextEnemies[0].hp, 91);
});

test("enemy turn calculations apply next-turn resistance after natural decay without mutating input", () => {
  const game = { ...waitingState(50, [enemy([], { actions: [{ name: "curse", attacks: [], nextTurnPlayerResistanceChange: -2 }] })]), playerResistance: 1 };
  const snapshot = structuredClone(game);
  const result = resolveEnemyTurn(game, options());
  assert.equal(result.nextPlayerResistance, -2);
  assert.deepEqual(game, snapshot);
});

test("signed statuses decay on normal turns and survive extra turns; insurance ignores only the negative effect", () => {
  const opponent = enemy([{ type: "magic", value: 10 }], { amplification: -2, resistance: 2 });
  const game = { ...waitingState(50, [opponent]), playerResistance: -2, playerAmplification: 2 };
  const result = resolveEnemyTurn(game, options({ blessings: ["vulnerabilityInsurance", "glassCannon"] }));
  assert.equal(result.remainingHp, 43);
  assert.equal(result.nextPlayerResistance, -1);
  assert.equal(result.nextPlayerAmplification, 1);
  assert.equal(result.nextEnemies[0].resistance, 1);
  assert.equal(result.nextEnemies[0].amplification, -1);
  const extra = resolveEnemyTurn({ ...game, extraTurns: 1 }, options());
  assert.equal(extra.nextPlayerResistance, -2);
  assert.equal(extra.nextPlayerAmplification, 2);
  assert.equal(extra.nextEnemies[0].resistance, 2);
  assert.equal(extra.nextEnemies[0].amplification, -2);
});

test("new enemy status gains survive their first turn and reflection bypasses attack modifiers", () => {
  const opponent = enemy([{ type: "physical", value: 10 }], {
    resistance: 2, amplification: 2,
    actions: [{ name: "grow", attacks: [{ type: "physical", value: 10 }], resistanceGain: 1, amplificationGain: 1 }],
  });
  const game = { ...waitingState(50, [opponent]), playerResistance: 2, playerAmplification: 2,
    playerPhysicalBlock: 20, reflectDamage: 1, playerThorns: 5 };
  const result = resolveEnemyTurn(game, options());
  assert.equal(result.nextEnemies[0].hp, 86);
  assert.equal(result.nextEnemies[0].resistance, 2);
  assert.equal(result.nextEnemies[0].amplification, 2);
});
