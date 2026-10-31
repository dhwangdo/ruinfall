import assert from "node:assert/strict";
import test from "node:test";
import { applyPlayerAttack, applyPlayerTurnStart, createSewerEncounterByIndex, getEnemyCodexEntries, getEncounterIndicesForRegion } from "../app/game/enemies.ts";
import { enemyTemporaryStrength, applySolitaireEnemyPassives } from "../app/game/enemyPassives.ts";
import { resolveEnemyTurn } from "../app/game/enemyTurnResolution.ts";
import { resolveCardAttack } from "../app/game/cardAttackResolution.ts";
import { createMoveCardToPile } from "../app/game/pileActions.ts";
import { waitingState } from "../app/game/battleState.ts";
import { STARTER_CARD_POOL } from "../app/game/cards.ts";

const options = { blessings: [], maxPlayerHp: 500, oneUpUsed: false, randomRolls: [.5] };
const enemy = index => ({ ...createSewerEncounterByIndex(index, () => 1)[0], intentIndex: 0 });
const gameFor = index => ({ ...waitingState(500, [enemy(index)]), status: "playing", energy: 3 });
const advance = game => {
  const result = resolveEnemyTurn(game, options);
  return { ...game, enemies: result.nextEnemies.map(applyPlayerTurnStart), playerHp: result.remainingHp };
};

test("nine new physical encounters join region one without renumbering existing bosses", () => {
  const entries = getEnemyCodexEntries().filter(entry => entry.encounterIndex >= 17 && entry.encounterIndex <= 25);
  assert.equal(entries.length, 9);
  assert.ok(entries.every(entry => entry.regions[0] === 1 && getEncounterIndicesForRegion(0).includes(entry.encounterIndex)));
  assert.ok(entries.every(entry => entry.enemies.every(({ enemy }) => enemy.actions.every(action => action.attacks.every(hit => hit.type === "physical")))));
  assert.ok(!entries.some(entry => entry.label.includes("사냥꾼")));
  assert.equal(enemy(14).name, "검은 슬라임");
});

test("two dogs telegraph their second action and then repeat only three damage", () => {
  const dogs = createSewerEncounterByIndex(17, () => 1);
  assert.equal(dogs.length, 2);
  assert.ok(dogs.every(dog => dog.maxHp === 22));
  let game = { ...waitingState(500, dogs), energy: 3 };
  assert.match(game.enemies[0].actions[0].preview, /다음 턴.*9/);
  const damage = [];
  for (let turn = 0; turn < 5; turn += 1) {
    const next = advance(game);
    damage.push(game.playerHp - next.playerHp);
    game = next;
  }
  assert.deepEqual(damage, [6, 18, 6, 6, 6]);
  game = { ...game, enemies: game.enemies.map((dog, index) => index === 0 ? { ...dog, hp: 0 } : dog) };
  assert.equal(game.playerHp - advance(game).playerHp, 3);
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
  assert.equal(healed.remainingHp, 494);
  assert.equal(healed.nextEnemies[0].hp, 38);
  assert.equal(healed.nextEnemies[0].strength, 0);
  const amplified = resolveEnemyTurn({ ...gameFor(19), enemies: [{ ...doll, intentIndex: 2 }] }, options);
  assert.equal(amplified.nextEnemies[0].amplification, 2);
});

test("guardian armor persists and breaking it cancels the pending attack and status gain once", () => {
  const damaged = applyPlayerAttack({ ...enemy(20), intentIndex: 1 }, 15, 1);
  assert.equal(damaged.hp, 41);
  assert.equal(damaged.armor, 0);
  assert.equal(damaged.stunned, true);
  const game = { ...gameFor(20), enemies: [damaged] };
  assert.equal(resolveEnemyTurn({ ...game, extraTurns: 1 }, options).nextEnemies[0].stunned, true);
  const skipped = advance(game);
  assert.equal(skipped.playerHp, game.playerHp);
  assert.equal(skipped.enemies[0].amplification ?? 0, 0);
  assert.equal(skipped.enemies[0].stunned, false);
  const resumed = advance(skipped);
  assert.equal(skipped.playerHp - resumed.playerHp, 9);
  assert.equal(resumed.enemies[0].amplification, 1);
});

test("opportunist preview and actual damage use conditional temporary strength without accumulation", () => {
  for (const energy of [3, 1, 0, -1]) {
    const game = { ...gameFor(21), energy };
    const temporary = enemyTemporaryStrength(game.enemies[0], energy);
    const next = advance(game);
    assert.equal(game.playerHp - next.playerHp, 7 + temporary);
    assert.equal(temporary, energy <= 0 ? 5 : 0);
    assert.equal(next.enemies[0].strength, 0);
    const guarded = advance({ ...next, enemies: next.enemies.map(enemy => ({ ...enemy, intentIndex: 1 })) });
    assert.equal(next.playerHp - guarded.playerHp, (5 + temporary) * 2);
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
  assert.match(enemy(23).actions[0].preview, /폭발 24/);
  assert.match(enemy(23).actions[1].preview, /폭발 24/);
  let game = advance(advance(gameFor(23)));
  const result = resolveEnemyTurn({ ...game, playerPhysicalBlock: 15, playerMagicBlock: 30 }, options);
  assert.equal(game.playerHp - result.remainingHp, 9);
  assert.equal(result.remainingMagicBlock, 30);
  assert.equal(result.nextEnemies[0].hp, 0);
  const killed = resolveEnemyTurn({ ...game, enemies: [applyPlayerAttack(game.enemies[0], 100, 1)] }, options);
  assert.equal(killed.remainingHp, game.playerHp);
  assert.equal(killed.steps.length, 0);
});

test("prisoner strength applies to every hit starting on the following action", () => {
  let game = gameFor(24);
  const damage = [];
  for (let turn = 0; turn < 6; turn += 1) {
    const next = advance(game);
    damage.push(game.playerHp - next.playerHp);
    game = next;
  }
  assert.deepEqual(damage, [6, 9, 12, 15, 18, 21]);
});

test("brood summons at most two living children and newborns wait until the next enemy turn", () => {
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
