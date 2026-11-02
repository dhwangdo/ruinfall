import assert from "node:assert/strict";
import test from "node:test";
import { createSewerEncounterByIndex, chooseNextIntent, applyPlayerAttack, applyPlayerTurnStart, getEnemyCodexEntries } from "../app/game/enemies.ts";
import { waitingState, drawFromPiles, drawFromFirstPile, drawRandomFromPiles } from "../app/game/battleState.ts";
import { resolveEnemyTurn } from "../app/game/enemyTurnResolution.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";
import { resolveEnemyDefeats } from "../app/game/enemyDefeatRules.ts";
import { blockedPileIndexes, preparePileSeals, enemyTemporaryStrength, enemyEnergyRecoveryPenalty, confiscatePileCards } from "../app/game/enemyPassives.ts";
import { recoverBattleEnergy } from "../app/game/combatEconomy.ts";
import { prepareBattleStart } from "../app/game/battleSetup.ts";
import { createFermentedSlimeCard, STARTER_CARD_POOL, RARE_CARD_POOL } from "../app/game/cards.ts";
import { createEndTurn } from "../app/game/endTurnAction.ts";
import { createTelemetryRecorder } from "../app/game/telemetry.ts";
import { createDrawAstronomyResearchCard, createDrawSelectedPile } from "../app/game/pileActions.ts";
import { createDrawCards } from "../app/game/drawCards.ts";

const enemy = (id, intentIndex = 0) => ({ ...createSewerEncounterByIndex(id, () => .999)[0], intentIndex });
const options = { blessings: [], maxPlayerHp: 500, oneUpUsed: false, randomRolls: [.5] };
const card = (id = 1) => ({ ...STARTER_CARD_POOL[0], id, revealed: true });
const playOptions = { ...options, phase: "playing", nextCardId: 100 };

test("rider starts at 90 HP and grants both sides strength only after a surviving enemy turn", () => {
  const battleDeck = { id: "test", name: "", capacity: 20, rareSlotCapacity: 0,
    cards: [card()], editions: [], editionColors: {} };
  const start = prepareBattleStart({ battleDeck, encounters: [{ encounterIndex: 34 }], playerHp: 500,
    blessings: [], godsLamentCharges: 0, nextCardId: 100 }).game;
  assert.equal(enemy(34).maxHp, 90);
  assert.equal(start.strength, 0);
  assert.equal(start.enemies[0].strength, 0);
  const first = resolveEnemyTurn({ ...start, enemies: [{ ...start.enemies[0], intentIndex: 0 }] }, options);
  assert.equal(first.remainingHp, 488);
  assert.equal(first.remainingStrength, 2);
  assert.equal(first.nextEnemies[0].strength, 2);
  const next = { ...start, playerHp: first.remainingHp, strength: first.remainingStrength,
    enemies: first.nextEnemies.map(unit => ({ ...applyPlayerTurnStart(unit), intentIndex: 0 })) };
  assert.equal(next.enemies[0].strength, 2);
  const second = resolveEnemyTurn(next, options);
  assert.equal(first.remainingHp - second.remainingHp, 16);
  assert.equal(second.remainingStrength, 4);
  assert.equal(second.nextEnemies[0].strength, 4);
  const extra = resolveEnemyTurn({ ...next, extraTurns: 1 }, options);
  assert.equal(extra.remainingStrength, 2);
  assert.equal(extra.nextEnemies[0].strength, 2);
  const killed = resolveEnemyTurn({ ...start, playerPhysicalBlock: 20, reflectDamage: 1,
    enemies: [{ ...start.enemies[0], hp: 1, intentIndex: 0 }] }, options);
  assert.equal(killed.nextEnemies[0].hp, 0);
  assert.equal(killed.remainingStrength, 0);
});

test("selected random patterns never repeat and removed proposals are absent", () => {
  for (const index of [1, 4, 18, 19, 20, 21, 22, 25, 26, 27, 30, 31, 32, 34, 35]) {
    const actions = enemy(index).actions;
    assert.equal(actions.length, 3);
    for (let previous = 0; previous < 3; previous++) {
      for (const roll of [0, .3, .6, .999]) assert.notEqual(chooseNextIntent(actions, previous, () => roll), previous);
    }
  }
  assert.deepEqual(createSewerEncounterByIndex(8), []);
  assert.ok(!getEnemyCodexEntries().some(entry => /종지기|유리 가시상|마나 야수|도깨비불/.test(entry.label)));
});

test("a single fermented slime in a mixed pair grants one retained token and both statuses", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { querySelectorAll: () => [] };
  try {
    const slimes = createSewerEncounterByIndex(32, () => .999);
    assert.equal(slimes.length, 2);
    assert.equal(slimes[0].maxHp, 45);
    assert.equal(slimes.filter(slime => slime.fermentedSlimeCount === 1).length, 1);
    assert.deepEqual(slimes[0].actions.map(action => action.attacks[0]?.value), [10, 5, undefined]);
    assert.equal(slimes[0].actions[1].attacks[0].hits, 2);
    const charged = resolveEnemyTurn(waitingState(500, [{ ...slimes[0], intentIndex: 2 }]), options).nextEnemies[0];
    assert.equal(charged.amplification, 2);
    assert.equal(charged.resistance, 2);
    assert.equal(slimes[0].actions[2].healGain, undefined);
    slimes[0].actions[0].attacks[0].value = 99;
    assert.equal(slimes[1].actions[0].attacks[0].value, 7);
    let state = { ...waitingState(50, slimes), piles: [[card(1), card(2)]] };
    const draw = createDrawCards({ pendingOriginsRef: { current: new Map() },
      pendingPileTokenSourcesRef: { current: new Map() }, pendingEnemyTokenIdsRef: { current: new Set() },
      nextCardIdRef: { current: 100 }, blessings: [], setPhase() {},
      setGame: update => { state = update(state); }, setPileClearNotice() {}, later: () => 0,
      pickRandom: items => items[0] });
    draw();
    assert.equal(state.hand.filter(card => card.effect === "fermentedSlime" && card.retain).length, 1);
    draw();
    assert.equal(state.hand.filter(card => card.effect === "fermentedSlime").length, 1);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("goblin grows after its attack and warlock curses once before repeating physical attacks", () => {
  const goblin = enemy(4);
  const first = resolveEnemyTurn(waitingState(500, [goblin]), options);
  assert.equal(first.remainingHp, 484);
  assert.equal(first.nextEnemies[0].strength, 1);
  let state = waitingState(500, [enemy(6)]);
  let result = resolveEnemyTurn(state, options);
  assert.equal(result.remainingHp, 500);
  assert.equal(result.nextPlayerResistance, -3);
  state = { ...state, enemies: result.nextEnemies, playerResistance: -3 };
  result = resolveEnemyTurn(state, options);
  assert.equal(result.remainingHp, 474);
  assert.equal(result.nextEnemies[0].intentIndex, 1);
});

test("hound uses original end-of-turn hand including retained or unplayable cards", () => {
  const hound = enemy(28);
  assert.equal(enemyTemporaryStrength(hound, 3, 0), 0);
  assert.equal(enemyTemporaryStrength(hound, 3, 1), 4);
  const result = resolveEnemyTurn({ ...waitingState(500, [hound]), hand: [createFermentedSlimeCard(1)] }, options);
  assert.equal(result.remainingHp, 491);
  assert.equal(result.nextEnemies[0].strength, 0);
});

test("hammer rests and grows only after a completely blocked hit", () => {
  const state = waitingState(500, [enemy(29)]);
  assert.equal(resolveEnemyTurn(state, options).nextEnemies[0].intentIndex, 0);
  const blocked = resolveEnemyTurn({ ...state, playerPhysicalBlock: 20 }, options);
  assert.equal(blocked.nextEnemies[0].intentIndex, 1);
  const rest = resolveEnemyTurn({ ...state, enemies: blocked.nextEnemies }, options);
  assert.equal(rest.nextEnemies[0].strength, 1);
  assert.equal(rest.nextEnemies[0].intentIndex, 0);
});

test("powder grows by two, explosions chain once and bypass attack modifiers", () => {
  const grow = resolveEnemyTurn(waitingState(500, [enemy(26, 2)]), options);
  assert.equal(grow.nextEnemies[0].powder, 8);
  const first = { ...enemy(26), id: "first", hp: 0, powder: 17 };
  const second = { ...enemy(26), id: "second", hp: 10, powder: 12 };
  const state = { ...waitingState(100, [first, second]), playerPhysicalBlock: 5, playerResistance: 5 };
  const result = resolveEnemyDefeats(state);
  assert.equal(result.state.playerHp, 76);
  assert.ok(result.state.enemies.every(enemy => enemy.hp === 0 && enemy.deathResolved));
  assert.deepEqual(resolveEnemyDefeats(result.state).state, result.state);
  assert.equal(state.enemies[1].hp, 10);
});

test("berserker gains strength once at half health and self-weakness survives its action", () => {
  let berserker = enemy(27, 2);
  berserker = applyPlayerAttack(berserker, 44, 1);
  assert.equal(berserker.strength, 7);
  berserker = applyPlayerAttack(berserker, 1, 1);
  assert.equal(berserker.strength, 7);
  const result = resolveEnemyTurn(waitingState(500, [berserker]), options);
  assert.equal(result.nextEnemies[0].amplification, -1);
});

test("seal excludes automatic and effect draws, changes once per turn, and vanishes on death", () => {
  const piles = [[card(1)], [card(2)], []];
  const enemies = preparePileSeals([enemy(31)], piles, 1, () => 0);
  const blocked = blockedPileIndexes(enemies);
  assert.deepEqual(blocked, [0]);
  assert.equal(drawFromPiles(piles, blocked).hand.length, 1);
  assert.equal(drawFromFirstPile(piles, blocked).hand.length, 0);
  assert.deepEqual(drawRandomFromPiles(piles, 10, () => 0, blocked).hand.map(card => card.id), [2]);
  assert.equal(preparePileSeals(enemies, piles, 1, () => .9)[0].sealedPileIndex, 0);
  assert.equal(preparePileSeals(enemies, piles, 2, () => .9)[0].sealedPileIndex, 1);
  assert.deepEqual(blockedPileIndexes([{ ...enemies[0], hp: 0 }]), []);
});

test("jailer reduces only recovery, and retained slime grants energy without buffs or damage", () => {
  const jailer = enemy(30);
  assert.equal(recoverBattleEnergy(0, 3, enemyEnergyRecoveryPenalty([jailer])), 2);
  assert.equal(recoverBattleEnergy(1, 3, enemyEnergyRecoveryPenalty([jailer])), 3);
  assert.equal(enemyEnergyRecoveryPenalty([{ ...jailer, hp: 0 }]), 0);
  const slime = createFermentedSlimeCard(1);
  const state = { ...waitingState(500, [jailer]), hand: [slime], energy: 0 };
  const held = resolveEnemyTurn({ ...state, extraTurns: 1 }, options);
  assert.equal(held.retainedHand[0].id, 1);
  assert.equal(held.discarded.length, 0);
  assert.equal(held.remainingHp, 500);
  const used = resolveCardPlay(state, { card: slime }, playOptions);
  assert.equal(used.state.energy, 1);
  assert.equal(used.state.hand.length, 0);
  assert.equal(used.state.enemies[0].strength, 0);
});

test("confiscation removes one rare from play and death returns it immediately", () => {
  const rare = { ...RARE_CARD_POOL[0], id: 99, revealed: true };
  const deck = { id: "test", name: "test", cards: [rare, ...Array.from({ length: 15 }, (_, i) => card(i + 1))],
    capacity: 20, editions: ["drawPlus"] };
  const setup = prepareBattleStart({ encounters: [{ encounterIndex: 35 }], playerHp: 50,
    battleDeck: deck, blessings: [], godsLamentCharges: 0, nextCardId: 100 });
  assert.ok(!setup.game.piles.flat().some(card => card.id === 99));
  assert.ok(!setup.game.hand.some(card => card.id === 99));
  assert.equal(setup.game.piles.length, 4);
  assert.equal(setup.game.piles.flat().length + setup.game.hand.length, 15);
  assert.equal(setup.game.initialDeck.filter(card => card.id === 99).length, 1);
  const dead = { ...setup.game, enemies: setup.game.enemies.map(enemy => enemy.confiscatesRare ? { ...enemy, hp: 0 } : enemy) };
  const returned = resolveEnemyDefeats(dead).state;
  assert.equal(returned.hand.filter(card => card.id === 99).length, 1);
  assert.equal(resolveEnemyDefeats(returned).state.hand.filter(card => card.id === 99).length, 1);
});

test("confiscation leaves dealt files in place, reveals the exposed top and keeps empty files", () => {
  const confiscator = enemy(35);
  const rare = { ...RARE_CARD_POOL[0], id: 99, revealed: true };
  const hidden = { ...card(1), revealed: false };
  const source = [[hidden, rare], [card(2)]];
  const result = confiscatePileCards([confiscator], source, () => 0);
  assert.deepEqual(result.piles.map(pile => pile.map(card => card.id)), [[1], [2]]);
  assert.equal(result.piles[0][0].revealed, true);
  assert.equal(hidden.revealed, false);
  assert.equal(source[0].length, 2);
  assert.deepEqual(result.enemies[0].confiscatedCards.map(card => card.id), [99]);

  const withEmpty = confiscatePileCards([confiscator], [[card(1), card(2)], [rare]], () => 0);
  assert.deepEqual(withEmpty.piles.map(pile => pile.map(card => card.id)), [[1, 2], []]);
  const warden = preparePileSeals([enemy(31)], withEmpty.piles, 1, () => .999)[0];
  assert.equal(warden.sealedPileIndex, 0);

  const anotherRare = { ...rare, id: 100 };
  const multiple = confiscatePileCards([confiscator, { ...confiscator, id: "second" }], [[rare, anotherRare]], () => 0);
  assert.deepEqual(multiple.enemies.map(enemy => enemy.confiscatedCards[0].id), [99, 100]);
  assert.deepEqual(multiple.piles, [[]]);
});

test("confiscator curses the player instead of protecting an ally", () => {
  const enemies = createSewerEncounterByIndex(35, () => .999).map((enemy, index) => ({ ...enemy, intentIndex: index === 0 ? 2 : 0 }));
  const result = resolveEnemyTurn(waitingState(500, enemies), options);
  assert.equal(result.nextEnemies[0].physicalBlock, 0);
  assert.equal(result.nextEnemies[1].physicalBlock, 0);
  assert.equal(result.nextPlayerResistance, -1);
});

test("a lethal explosion cannot schedule victory or bypass 1UP", () => {
  const carrier = { ...enemy(26), hp: 1 };
  const strike = card();
  const state = { ...waitingState(5, [carrier]), hand: [strike] };
  const lost = resolveCardPlay(state, { card: strike, targetEnemyId: carrier.id }, playOptions);
  assert.equal(lost.state.status, "lost");
  assert.equal(lost.victoryDelay, null);
  const revived = resolveCardPlay(state, { card: strike, targetEnemyId: carrier.id },
    { ...playOptions, maxPlayerHp: 50, blessings: ["oneUp"] });
  assert.equal(revived.oneUpUsed, true);
  assert.equal(revived.state.playerHp, 25);
});

test("sealed research and chosen draws do not spend resources or remove cards", () => {
  let state = { ...waitingState(50, [{ ...enemy(31), sealedPileIndex: 0 }]),
    piles: [[card()]], pendingDraws: 1, stars: 3 };
  const setGame = update => { state = typeof update === "function" ? update(state) : update; };
  createDrawSelectedPile({ game: state, phase: "playing", setGame, pendingOriginsRef: { current: new Map() }, setPhase() {} })(0);
  assert.equal(state.hand.length, 0);
  assert.equal(state.piles[0].length, 1);
  state = { ...state, pendingDraws: 0, pendingResearchDraw: "astronomy" };
  createDrawAstronomyResearchCard({ game: state, phase: "playing", setGame, captureDrawOrigins: () => 0,
    setPhase() {}, canUseResearchDraw: () => true })(0);
  assert.equal(state.stars, 3);
  assert.equal(state.astronomyResearchUses, 0);
});

test("the complete turn transition preserves retained cards and applies recovery penalty", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  try {
    let state = { ...waitingState(50, [enemy(30, 2)]), hand: [createFermentedSlimeCard(1), card(2)],
      piles: [[card(3), card(4)]], energy: 0 };
    const callbacks = [];
    const effectPopups = [];
    createEndTurn({ game: state, phase: "playing", handCardRefs: { current: new Map() },
      setPhase() {}, setDragging() {}, later: callback => { callbacks.push(callback); return callbacks.length; },
      blessings: [], oneUpUsedRef: { current: false }, maxPlayerHp: 50, setOneUpUsed() {},
      setGame: update => { state = typeof update === "function" ? update(state) : update; }, drawCards() {},
      telemetry: createTelemetryRecorder(), setDamagePopup() {}, showEnemyPopup: (...args) => effectPopups.push(args), setAttackingEnemyId() {}, grantBattleReward() {},
      battleRewardRegionRef: { current: 2 }, maximumEnergyForGame: () => 3, animateCardToPlayer: () => null })();
    while (callbacks.length) callbacks.shift()();
    assert.deepEqual(state.hand.map(card => card.id), [1]);
    assert.deepEqual(state.discard.map(card => card.id), [2]);
    assert.equal(state.energy, 2);
    assert.equal(state.turn, 2);
    assert.ok(effectPopups.some(([, text, kind]) => text === "증폭 2 획득" && kind === "buff"));
  } finally {
    globalThis.window = previousWindow;
  }
});
