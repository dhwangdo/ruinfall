import assert from "node:assert/strict";
import test from "node:test";
import { ALL_CARD_BLUEPRINTS, canTargetEnemy } from "../app/game/cards.ts";
import { cardDropTarget, canUseCardOnCenter } from "../app/game/cardTargetRules.ts";
import { waitingState } from "../app/game/battleState.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";

const card = name => ({ ...ALL_CARD_BLUEPRINTS.find(card => card.name === name), id: 100, revealed: true });
const options = { phase: "playing", blessings: [], maxPlayerHp: 50,
  nextCardId: 200, oneUpUsed: false, randomRolls: Array(30).fill(.5) };

test("scale armor dropped in the center cannot choose the first enemy or spend resources", () => {
  const armor = card("위압");
  const enemies = [createSewerEncounterByIndex(2)[0], createSewerEncounterByIndex(4)[0]]
    .map((enemy, i) => ({ ...enemy, id: `target-${i}` }));
  const game = { ...waitingState(50, enemies), hand: [armor], energy: 3 };
  assert.equal(cardDropTarget(armor, "defend"), null);
  assert.equal(canUseCardOnCenter(armor), false);
  const cancelled = resolveCardPlay(game, { card: armor }, options);
  assert.equal(cancelled.played, false);
  assert.equal(cancelled.state.energy, 3);
  assert.deepEqual(cancelled.state.hand, [armor]);
  assert.deepEqual(cancelled.state.enemies, game.enemies);
  const target = cardDropTarget(armor, "enemy:target-1");
  const played = resolveCardPlay(game, { card: armor, ...target }, options);
  assert.equal(played.played, true);
  assert.equal(played.state.energy, 1);
  assert.equal(played.state.playerPhysicalBlock, 8);
  assert.equal(played.state.enemies[0].amplification ?? 0, 0);
  assert.equal(played.state.enemies[1].amplification, -2);
});

test("single-target debuff attacks require a living target before paying or discarding", () => {
  for (const name of ["파쇄", "무릎차기", "개박살", "과감한 돌진"]) {
    const attack = card(name), enemies = createSewerEncounterByIndex(2);
    const game = { ...waitingState(50, enemies), hand: [attack], energy: 3 };
    assert.equal(canTargetEnemy(attack), true);
    assert.equal(cardDropTarget(attack, "defend"), null);
    const result = resolveCardPlay(game, { card: attack, targetEnemyId: "missing" }, options);
    assert.equal(result.played, false);
    assert.equal(result.state.energy, game.energy);
    assert.equal(result.state.pendingDiscards, 0);
  }
});

test("area, random and self effects remain usable without selecting an enemy", () => {
  for (const name of ["사계절", "휩쓸기", "오딘의 창", "유성우", "히드라", "가호"]) {
    const effect = card(name);
    assert.ok(effect.name);
    assert.equal(canTargetEnemy(effect), false);
    assert.equal(canUseCardOnCenter(effect), true);
    assert.deepEqual(cardDropTarget(effect, "defend"), {});
  }
});
