import assert from "node:assert/strict";
import test from "node:test";
import { applyPlayerAttack, applyPlayerTurnStart, createSewerEncounterByIndex, getEnemyCodexEntries, getEncounterIndicesForRegion } from "../app/game/enemies.ts";
import { enemyTemporaryStrength, applySolitaireEnemyPassives } from "../app/game/enemyPassives.ts";
import { resolveEnemyTurn } from "../app/game/enemyTurnResolution.ts";
import { resolveCardAttack } from "../app/game/cardAttackResolution.ts";
import { createMoveCardToPile } from "../app/game/pileActions.ts";
import { waitingState } from "../app/game/battleState.ts";
import { STARTER_CARD_POOL } from "../app/game/cards.ts";
import { resolveEnemyDefeats } from "../app/game/enemyDefeatRules.ts";

const options = { blessings: [], maxPlayerHp: 500, oneUpUsed: false, randomRolls: [.5] };
const enemy = index => ({ ...createSewerEncounterByIndex(index, () => 1)[0], intentIndex: 0 });
const gameFor = index => ({ ...waitingState(500, [enemy(index)]), status: "playing", energy: 3 });
const advance = game => {
  const result = resolveEnemyTurn(game, options);
  return { ...game, enemies: result.nextEnemies.map(applyPlayerTurnStart), playerHp: result.remainingHp };
};

test("four fixed physical encounters keep retired prisoner and boss IDs stable", () => {
  const entries = getEnemyCodexEntries().filter(entry => entry.encounterIndex >= 17 && entry.encounterIndex <= 25);
  assert.equal(entries.length, 4);
  assert.ok(entries.every(entry => entry.regions[0] === 1 && getEncounterIndicesForRegion(0).includes(entry.encounterIndex)));
  assert.ok(entries.every(entry => entry.enemies.every(({ enemy }) => enemy.actions.every(action => action.attacks.every(hit => hit.type === "physical")))));
  assert.ok(!entries.some(entry => entry.label.includes("사냥꾼")));
  assert.equal(createSewerEncounterByIndex(14, () => 0).length, 1);
});

test("one dog joins a different family and telegraphs its second action", () => {
  const pair = createSewerEncounterByIndex(17, () => 1);
  assert.equal(pair.length, 2);
  assert.notEqual(pair[0].variant, pair[1].variant);
  assert.equal(pair[0].maxHp, 24);
  let game = { ...waitingState(500, [pair[0]]), energy: 3 };
  assert.match(game.enemies[0].actions[0].preview, /다음 턴.*12/);
  const damage = [];
  for (let turn = 0; turn < 5; turn += 1) {
    const next = advance(game);
    damage.push(game.playerHp - next.playerHp);
    game = next;
  }
  assert.deepEqual(damage, [5, 12, 5, 5, 5]);
  game = { ...game, enemies: [{ ...game.enemies[0], hp: 0 }] };
  assert.equal(game.playerHp - advance(game).playerHp, 0);
});

test("brood always opens by summoning and then uses non-repeating random actions", () => {
  for (const roll of [0, .5, .999]) {
    const brood = createSewerEncounterByIndex(25, () => roll)[0];
    assert.equal(brood.actions[brood.intentIndex].summon, "roachHatchling");
    const result = resolveEnemyTurn(waitingState(500, [brood]), { ...options, randomRolls: [roll] });
    assert.equal(result.remainingHp, 500);
    assert.equal(result.nextEnemies.filter(enemy => enemy.summonerId).length, 1);
    assert.notEqual(result.nextEnemies[0].intentIndex, brood.intentIndex);
  }
});

test("clay doll heals while attacking and gains amplification on its separate action", () => {
  const doll = { ...enemy(19), hp: 32, intentIndex: 1 };
  const healed = resolveEnemyTurn({ ...gameFor(19), enemies: [doll] }, options);
  assert.equal(healed.remainingHp, 491);
  assert.equal(healed.nextEnemies[0].hp, 38);
  assert.equal(healed.nextEnemies[0].strength, 0);
  const amplified = resolveEnemyTurn({ ...gameFor(19), enemies: [{ ...doll, intentIndex: 2 }] }, options);
  assert.equal(amplified.nextEnemies[0].amplification, 2);
});

test("puppeteer has fixed HP and never attacks, even after gaining strength", () => {
  for (const roll of [0, .5, .999]) {
    const pair = createSewerEncounterByIndex(20, () => roll);
    assert.deepEqual(pair.map(enemy => enemy.name), ["꼭두각시 거병", "인형술사"]);
    assert.equal(pair[1].hp, 12);
    assert.equal(pair[1].maxHp, 12);
    assert.equal(pair[1].deathStunTargetId, pair[0].id);
    assert.equal(pair[0].armor, undefined);
    const result = resolveEnemyTurn(waitingState(500, [{ ...pair[1], strength: 20 }]), options);
    assert.equal(result.remainingHp, 500);
    assert.equal(result.steps.length, 0);
  }
});

test("killing the puppeteer cancels its colossus attack and status gain exactly once", () => {
  const pair = createSewerEncounterByIndex(20, () => 1);
  const initial = waitingState(500, [{ ...pair[0], intentIndex: 1 }, pair[1]]);
  const attackCard = { ...STARTER_CARD_POOL[0], id: 999, value: 11 };
  const wounded = resolveCardAttack(initial, attackCard, pair[1].id, [], []);
  assert.equal(wounded.nextEnemies[1].hp, 1);
  assert.equal(wounded.nextEnemies[0].stunned, undefined);
  const killed = resolveCardAttack({ ...initial, enemies: wounded.nextEnemies },
    { ...attackCard, value: 1 }, pair[1].id, [], []);
  assert.equal(killed.nextEnemies[1].hp, 0);
  assert.equal(killed.nextEnemies[0].stunned, true);
  assert.equal(killed.nextEnemies[0].hp, 62);
  assert.equal(pair[1].hp, 12);
  const game = { ...initial, enemies: killed.nextEnemies };
  assert.equal(resolveEnemyTurn({ ...game, extraTurns: 1 }, options).nextEnemies[0].stunned, true);
  const skipped = advance(game);
  assert.equal(skipped.playerHp, game.playerHp);
  assert.equal(skipped.enemies[0].amplification ?? 0, 0);
  assert.equal(skipped.enemies[0].stunned, false);
  const resumed = advance(skipped);
  assert.equal(skipped.playerHp - resumed.playerHp, 11);
  assert.equal(resumed.enemies[0].amplification, 1);
  assert.equal(resolveEnemyDefeats(resumed).state.enemies[0].stunned, false);
});

test("each puppeteer only stuns the colossus from its own encounter", () => {
  const first = createSewerEncounterByIndex(20, () => 1);
  const second = createSewerEncounterByIndex(20, () => 1);
  const result = resolveEnemyDefeats(waitingState(500, [first[0], { ...first[1], hp: 0 }, ...second]));
  assert.equal(result.state.enemies[0].stunned, true);
  assert.equal(result.state.enemies[2].stunned, undefined);
  const deadBody = resolveEnemyDefeats(waitingState(500, first.map(enemy => ({ ...enemy, hp: 0 }))));
  assert.ok(deadBody.state.enemies.every(enemy => enemy.hp === 0 && !enemy.stunned));
});

test("explosions can kill the puppeteer and trigger the same one-time cancellation", () => {
  const pair = createSewerEncounterByIndex(20, () => 1);
  const carrier = { ...enemy(26), hp: 0, powder: 12 };
  const result = resolveEnemyDefeats(waitingState(500, [carrier, ...pair]));
  assert.equal(result.state.enemies[1].hp, 50);
  assert.equal(result.state.enemies[1].stunned, true);
  assert.equal(result.state.enemies[2].hp, 0);
});

test("opportunist preview and actual damage use conditional temporary strength without accumulation", () => {
  for (const energy of [3, 1, 0, -1]) {
    const game = { ...gameFor(21), energy };
    const temporary = enemyTemporaryStrength(game.enemies[0], energy);
    const next = advance(game);
    assert.equal(game.playerHp - next.playerHp, 4 + temporary);
    assert.equal(temporary, energy <= 0 ? 5 : 0);
    assert.equal(next.enemies[0].strength, 0);
    const guarded = advance({ ...next, enemies: next.enemies.map(enemy => ({ ...enemy, intentIndex: 1 })) });
    assert.equal(next.playerHp - guarded.playerHp, (3 + temporary) * 2);
    assert.equal(guarded.enemies[0].physicalBlock, 0);
    assert.equal(guarded.enemies[0].strength, 0);
  }
});

test("selected region-one enemies choose another action after every turn", () => {
  for (const index of [1, 18, 19, 20, 21, 22, 25]) {
    let game = gameFor(index);
    for (let turn = 0; turn < 8; turn++) {
      const previous = game.enemies[0].intentIndex;
      game = advance(game);
      assert.notEqual(game.enemies[0].intentIndex, previous);
    }
  }
});

test("spider passive is triggered by a valid move only and cannot rearm in the same turn", () => {
  const card = { ...STARTER_CARD_POOL[0], id: 101, revealed: true };
  let game = { ...gameFor(22), hand: [card], piles: [[]], stars: 0 };
  const move = () => createMoveCardToPile({
    setGame: update => { game = update(game); }, phase: "playing", blessings: [],
    grantBattleReward: () => {}, battleRewardRegionRef: { current: 1 },
    lowestHealthEnemy: enemies => enemies.find(enemy => enemy.hp > 0),
  })({ card, cards: [card], source: { type: "hand" } }, 0);
  move();
  assert.equal(game.enemies[0].solitaireHitBonusReady, undefined);
  game = { ...game, stars: 2 };
  move();
  assert.equal(game.stars, 1);
  assert.equal(game.enemies[0].solitaireHitBonusReady, true);
  const attack = resolveCardAttack(game, card, game.enemies[0].id, [], []);
  assert.equal(attack.nextEnemies[0].hp, 48);
  const spent = attack.nextEnemies[0];
  assert.equal(spent.solitaireHitBonusReady, false);
  assert.equal(applySolitaireEnemyPassives([spent])[0].solitaireHitBonusReady, false);
  assert.equal(applyPlayerAttack(applySolitaireEnemyPassives([enemy(22)])[0], 2, 3).hp, 48);
  const reset = applyPlayerTurnStart(spent);
  assert.equal(applySolitaireEnemyPassives([reset])[0].solitaireHitBonusReady, true);
  const expired = resolveEnemyTurn({ ...game, extraTurns: 1 }, options);
  assert.equal(expired.nextEnemies[0].solitaireHitBonusReady, false);
});

test("toad explodes on action three, consumes physical defense and dies after the hit", () => {
  assert.match(enemy(23).actions[0].preview, /자폭/);
  assert.match(enemy(23).actions[1].preview, /자폭/);
  let game = advance(advance(gameFor(23)));
  const result = resolveEnemyTurn({ ...game, playerPhysicalBlock: 3, playerMagicBlock: 30 }, options);
  assert.equal(game.playerHp - result.remainingHp, 9);
  assert.equal(result.remainingMagicBlock, 30);
  assert.equal(result.nextEnemies[0].hp, 0);
  const killed = resolveEnemyTurn({ ...game, enemies: [applyPlayerAttack(game.enemies[0], 100, 1)] }, options);
  assert.equal(killed.remainingHp, game.playerHp);
  assert.equal(killed.steps.length, 0);
});

test("golem applies status actions and gains strength only after each third-turn attack", () => {
  let game = gameFor(2);
  const damage = [];
  for (let turn = 0; turn < 6; turn += 1) {
    const result = resolveEnemyTurn(game, options);
    if (turn % 3 === 0) assert.equal(result.nextPlayerAmplification, -2);
    if (turn % 3 === 1) assert.equal(result.nextEnemies[0].resistance, 2);
    const next = { ...game, enemies: result.nextEnemies.map(applyPlayerTurnStart), playerHp: result.remainingHp };
    damage.push(game.playerHp - next.playerHp);
    game = next;
  }
  assert.deepEqual(damage, [0, 0, 25, 0, 0, 30]);
  assert.equal(game.enemies[0].strength, 10);
});

test("brood summons at most two living children and newborns wait until the next enemy turn", () => {
  assert.equal(enemy(25).maxHp, 48);
  let game = gameFor(25);
  const damage = [];
  for (let turn = 0; turn < 6; turn += 1) {
    game = { ...game, enemies: game.enemies.map(enemy => enemy.summonerId ? enemy : { ...enemy, intentIndex: 1 }) };
    const next = advance(game);
    damage.push(game.playerHp - next.playerHp);
    assert.ok(next.enemies.filter(enemy => enemy.summonerId && enemy.hp > 0).length <= 2);
    game = next;
  }
  assert.deepEqual(damage, [0, 4, 8, 8, 8, 8]);
  const previousIds = game.enemies.map(enemy => enemy.id);
  game.enemies = game.enemies.map((enemy, index) => index === 1 ? { ...enemy, hp: 0 } : enemy);
  game = advance(advance(game));
  assert.equal(game.enemies.filter(enemy => enemy.summonerId).length, 2);
  assert.ok(game.enemies.some(enemy => !previousIds.includes(enemy.id)));
  game.enemies = game.enemies.map(enemy => enemy.summonerId ? enemy : { ...enemy, hp: 0, intentIndex: 1 });
  const survivors = advance(game);
  assert.equal(survivors.enemies.filter(enemy => enemy.summonerId).length, 2);
  assert.ok(survivors.enemies.some(enemy => enemy.hp > 0));
});

test("reflection killing a brood prevents its pending summon", () => {
  const base = enemy(25);
  const brood = { ...base, hp: 1, intentIndex: 1, actions: base.actions.map((action, index) => index === 1 ? { ...action, attacks: [{ type: "physical", value: 5 }] } : action) };
  const result = resolveEnemyTurn({ ...gameFor(25), enemies: [brood], playerPhysicalBlock: 5, reflectDamage: 1 }, options);
  assert.equal(result.nextEnemies.length, 1);
  assert.equal(result.nextEnemies[0].hp, 0);
});
