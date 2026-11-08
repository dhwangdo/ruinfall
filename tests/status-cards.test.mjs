import assert from "node:assert/strict";
import test from "node:test";
import { SPECIAL_CARD_POOL, RARE_CARD_POOL } from "../app/game/cards.ts";
import { waitingState } from "../app/game/battleState.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";
import { applyScheduledPreparation } from "../app/game/cardStatusEffects.ts";
import { prepareRunRestore } from "../app/game/runSaveState.ts";

const card = name => ({ ...[...SPECIAL_CARD_POOL, ...RARE_CARD_POOL].find(card => card.name === name), id: 100, revealed: true });
const target = () => ({ ...createSewerEncounterByIndex(2, () => .999)[0], id: "target", hp: 200, maxHp: 200 });
const play = (name, extra = {}, options = {}) => {
  const played = card(name);
  const state = { ...waitingState(50, [target()]), energy: 10, hand: [played], ...extra };
  return resolveCardPlay(state, { card: played, targetEnemyId: "target", discardCostPaid: options.paid ?? false },
    { phase: "playing", blessings: [], maxPlayerHp: 50, nextCardId: 200, oneUpUsed: false, randomRolls: [], ...options });
};

test("new cards resolve exact costs, damage, defense, and durations", () => {
  assert.equal(play("기합").state.playerAmplification, 2);
  assert.equal(play("기합").state.energy, 10);
  const shatter = play("파쇄").state;
  assert.equal(shatter.enemies[0].hp, 194);
  assert.equal(shatter.enemies[0].resistance, -2);
  const knee = play("무릎차기").state;
  assert.equal(knee.enemies[0].hp, 190);
  assert.equal(knee.enemies[0].amplification, -1);
  assert.equal(play("가호").state.playerResistance, 2);
  const scale = play("위압").state;
  assert.equal(scale.playerPhysicalBlock, 8);
  assert.equal(scale.enemies[0].amplification, -2);
  assert.equal(scale.energy, 8);
  const unyielding = play("불굴").state;
  assert.equal(unyielding.playerResistance, 5);
  assert.ok(unyielding.removedFromReshuffleIds.includes(100));
  const demolish = play("개박살").state;
  assert.equal(demolish.enemies[0].hp, 175);
  assert.equal(demolish.enemies[0].resistance, -3);
  assert.equal(demolish.enemies[0].amplification, -3);
});

test("four seasons exhausts without a discard cost and applies to every living enemy", () => {
  assert.equal(play("사계절").played, true);
  assert.ok(play("사계절").state.removedFromReshuffleIds.includes(100));
  const enemy2 = { ...target(), id: "other" };
  const state = play("사계절", { enemies: [target(), enemy2] }, { paid: true }).state;
  assert.equal(state.pendingDiscards, 0);
  assert.equal(state.playerResistance, 2);
  assert.equal(state.playerAmplification, 2);
  assert.ok(state.enemies.every(enemy => enemy.resistance === -2 && enemy.amplification === -2));
});

test("resistance gain cancels vulnerability except when glass cannon blocks that gain", () => {
  assert.equal(play("가호", { playerResistance: -3 }).state.playerResistance, -1);
  assert.equal(play("가호", { playerResistance: -3 }, { blessings: ["glassCannon"] }).state.playerResistance, -3);
});

test("battle preparation stacks, waits for next turn and grants energy above the normal maximum once", () => {
  const first = play("싸움 준비").state;
  assert.equal(first.energy, 8);
  assert.equal(first.playerAmplification, 0);
  const second = play("싸움 준비", { ...first, hand: [card("싸움 준비")] }).state;
  assert.equal(second.pendingBattlePreparation, 4);
  const started = applyScheduledPreparation({ ...second, energy: 3 });
  assert.equal(started.energy, 7);
  assert.equal(started.playerAmplification, 4);
  assert.equal(started.pendingBattlePreparation, 0);
  assert.deepEqual(applyScheduledPreparation(started), started);
});

test("repeated shatter applies vulnerability after each attack without doubling it again afterward", () => {
  const result = play("파쇄", { doubleNextAttack: true }).state;
  assert.equal(result.enemies[0].hp, 187);
  assert.equal(result.enemies[0].resistance, -4);
});

test("scale armor needs a living target and uses toughness for its defense", () => {
  const played = card("위압");
  const state = { ...waitingState(50, [target()]), hand: [played], energy: 3 };
  const rejected = resolveCardPlay(state, { card: played }, { phase: "playing", blessings: [], maxPlayerHp: 50,
    nextCardId: 200, oneUpUsed: false, randomRolls: [] });
  assert.equal(rejected.played, false);
  assert.equal(rejected.state.energy, 3);
  assert.equal(play("위압", { agility: 2 }).state.playerPhysicalBlock, 10);
});

test("new ward survives save migration while the retired blessing stays removed", () => {
  const saved = { blessings: [], blessingSeenOfferIds: [], inventoryCards: [card("가호")],
    decks: [], mapEnemyWorld: { enemies: [] }, mapEnemyCellMemory: {} };
  const restored = prepareRunRestore(saved, () => false);
  assert.equal(restored.inventoryCards[0].effect, "resistanceWard");
});
