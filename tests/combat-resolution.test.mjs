import assert from "node:assert/strict";
import test from "node:test";
import { ALL_CARD_BLUEPRINTS, createAdrenalineCard } from "../app/game/cards.ts";
import { calculateAttackDamage } from "../app/game/statuses.ts";
import { attackPreview } from "../app/game/attackPreview.ts";
import { waitingState } from "../app/game/battleState.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";
import { createResolvePlayedCard } from "../app/game/cardPlayAction.ts";

const card = (effect, extra = {}) => {
  const blueprint = ALL_CARD_BLUEPRINTS.find(item => item.effect === effect);
  assert.ok(blueprint, effect);
  return { ...blueprint, id: 1, revealed: true, ...extra };
};
const enemy = (extra = {}) => ({ ...createSewerEncounterByIndex(2)[0], id: "enemy", hp: 100, maxHp: 100, ...extra });
const state = (played, extra = {}) => ({ ...waitingState(50, [enemy()]), hand: [played], ...extra });
const options = extra => ({ phase: "playing", blessings: [], maxPlayerHp: 50, nextCardId: 100,
  oneUpUsed: false, randomRolls: Array(64).fill(.25), ...extra });
const resolve = (played, extra = {}, opts = {}) => resolveCardPlay(state(played, extra), {
  card: played, targetEnemyId: "enemy", discardCostPaid: true,
}, options(opts));

test("five hits produce the same total damage as the presentation sequence", () => {
  const result = resolve(card("fourHit"));
  assert.equal(result.hitPopups.length, 5);
  assert.equal(result.state.enemies[0].hp, 90);
  assert.equal(result.hitPopups.reduce((sum, hit) => sum + hit.damage, 0), 10);
  assert.deepEqual(result.hitPopups.map(hit => hit.remainingHp), [98, 96, 94, 92, 90]);
});

test("suppression gains only damage actually dealt, then adds toughness", () => {
  const result = resolve(card("suppression"), { enemies: [enemy({ hp: 7 })], agility: 2 });
  assert.equal(result.state.enemies[0].hp, 0);
  assert.equal(result.state.playerPhysicalBlock, 9);
  assert.equal(result.victoryDelay, 500);
  assert.equal(result.state.status, "playing");
});

test("aggregate thorn damage consumes 1UP only once during a multi-hit card", () => {
  const result = resolve(card("fourHit"), { playerHp: 1, enemies: [enemy({ thorns: 4 })] },
    { blessings: ["oneUp"] });
  assert.equal(result.oneUpUsed, true);
  assert.equal(result.state.playerHp, 25);
});

test("random repeated attacks select only enemies still alive", () => {
  const result = resolve(card("hydra"), { enemies: [enemy({ hp: 1 }), enemy({ id: "second", hp: 1 })] });
  assert.deepEqual(result.hitPopups.map(hit => hit.enemyId), ["enemy", "second"]);
  assert.equal(result.state.enemies.every(item => item.hp === 0), true);
});

test("attack previews and applied damage include target resistance and every multiplier before rounding", () => {
  const target = enemy({ resistance: -2, isBoss: true });
  const played = card("strike");
  const preview = attackPreview(2, target, true);
  const predicted = calculateAttackDamage(played.value, preview.attackModifiers);
  const result = resolve(played, { enemies: [target], playerAmplification: 2 }, { blessings: ["bossSlayer"] });
  assert.equal(predicted, 20);
  assert.equal(result.state.enemies[0].hp, 100 - predicted);
  const resisted = resolve(played, { enemies: [enemy({ resistance: 2 })], playerAmplification: -2 });
  assert.equal(resisted.state.enemies[0].hp, 98);
});

test("plate armor grants five defense and signed resistance while glass cannon blocks every gain", () => {
  for (const forged of [false, true]) {
    const played = card("plateArmorDefense", { forged });
    const normal = resolve(played, { playerResistance: -2 });
    assert.equal(normal.state.playerPhysicalBlock, 5);
    assert.equal(normal.state.playerResistance, forged ? 0 : -1);
    const blocked = resolve(played, { playerResistance: -2 }, { blessings: ["glassCannon"] });
    assert.equal(blocked.state.playerPhysicalBlock, 5);
    assert.equal(blocked.state.playerResistance, -2);
  }
});

test("thorn and grimoire damage ignore the new modifiers while health costs remain separate", () => {
  const thorned = resolve(card("fourHit"), {
    enemies: [enemy({ thorns: 4, resistance: -2 })], playerResistance: 2, playerAmplification: -2,
  });
  assert.equal(thorned.state.playerHp, 30);
  const played = card("warmUp");
  const grimoire = resolve(played, { hand: [played, card("grimoire", { id: 2 })], playerResistance: 2, playerAmplification: 2 });
  assert.equal(grimoire.state.playerHp, 49);
  const paid = resolve({ ...createAdrenalineCard(), id: 1 }, { playerResistance: 2, playerAmplification: 2, invulnerable: true });
  assert.equal(paid.state.playerHp, 48);
});

test("generated cards use explicit consecutive identities", () => {
  const result = resolve(card("largePrism"));
  assert.deepEqual(result.state.hand.map(item => item.id), [100, 101, 102]);
  assert.equal(result.nextCardId, 103);
  assert.equal(result.state.hand.every(item => item.effect === "radiance"), true);
});

test("card results are repeatable and do not mutate the supplied game", () => {
  const played = card("dash"), input = state(played, { piles: [[card("strike", { id: 2 })], [card("defend", { id: 3 })]] });
  const snapshot = structuredClone(input);
  const request = { card: played };
  assert.deepEqual(resolveCardPlay(input, request, options()), resolveCardPlay(input, request, options()));
  assert.deepEqual(input, snapshot);
});

test("blocked and unpaid-discard actions preserve resources and generated identities", () => {
  const played = card("largePrism"), input = state(played, { energy: 0 });
  const blocked = resolveCardPlay(input, { card: played }, options());
  assert.equal(blocked.played, false);
  assert.equal(blocked.state.hand, input.hand);
  assert.equal(blocked.nextCardId, 100);
  const discard = card("strike", { discardCost: 1 });
  const unpaid = resolveCardPlay(state(discard), { card: discard }, options());
  assert.equal(unpaid.played, false);
  assert.equal(unpaid.state.energy, 3);
});

test("delayed victory and repeated calls use the latest game, not the captured render", () => {
  const first = card("strike"), second = card("strike", { id: 2 });
  let current = state(first, { energy: 2, hand: [first, second], enemies: [enemy({ hp: 12 })] });
  const timers = [], ids = { current: 100 }, life = { current: false };
  let rewards = 0;
  const play = createResolvePlayedCard({
    game: state(first, { energy: 99 }), getGame: () => current,
    setGame: update => { current = typeof update === "function" ? update(current) : update; },
    phase: "playing", blessings: [], maxPlayerHp: 50, nextCardIdRef: ids,
    oneUpUsedRef: life, setOneUpUsed() {}, setAnimatedEnemyHp() {}, setDyingEnemyIds() {}, setPhase() {},
    showEnemyPopup() {}, captureDrawOrigins: () => 0,
    later: (callback, delay) => { timers.push({ callback, delay }); return timers.length; },
    grantBattleReward: () => { rewards += 1; }, battleRewardRegionRef: { current: 1 },
  });
  play(first, "enemy");
  play(second, "enemy");
  assert.equal(current.energy, 0);
  assert.equal(current.enemies[0].hp, 0);
  assert.equal(current.status, "playing");
  assert.equal(rewards, 0);
  timers.sort((a, b) => a.delay - b.delay).forEach(timer => timer.callback());
  assert.equal(current.status, "won");
  assert.equal(rewards, 1);
});
