import assert from "node:assert/strict";
import test from "node:test";
import { ALL_CARD_BLUEPRINTS, TEMPORARILY_REMOVED_CARD_POOL } from "../app/game/cards.ts";
import { waitingState } from "../app/game/battleState.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";
import { resolvePendingPileOperation, createDrawSelectedPile } from "../app/game/pileActions.ts";
import { createDrawCards } from "../app/game/drawCards.ts";
import { prepareRunRestore } from "../app/game/runSaveState.ts";

const card = (name, id = 10) => ({ ...[...ALL_CARD_BLUEPRINTS, ...TEMPORARILY_REMOVED_CARD_POOL].find(card => card.name === name), id, revealed: true });
const enemy = () => ({ ...createSewerEncounterByIndex(2, () => .99)[0], id: "enemy", hp: 200, maxHp: 200 });
const options = { phase: "playing", blessings: [], maxPlayerHp: 50, oneUpUsed: false, nextCardId: 100, randomRolls: [] };

function turnStart(initial) {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  globalThis.document = { querySelectorAll: () => [] };
  globalThis.window = { requestAnimationFrame: callback => callback() };
  let state = initial;
  const scheduled = [];
  const setGame = update => { state = update(state); };
  try {
    createDrawCards({ pendingOriginsRef: { current: new Map() },
      pendingPileTokenSourcesRef: { current: new Map() }, pendingEnemyTokenIdsRef: { current: new Set() },
      nextCardIdRef: { current: 100 }, blessings: [], setPhase() {}, setGame,
      setPileClearNotice() {}, later: callback => { scheduled.push(callback); return scheduled.length; },
      pickRandom: items => items[0] })();
    scheduled.forEach(callback => callback());
    return state;
  } finally { globalThis.document = previousDocument; globalThis.window = previousWindow; }
}

test("temporary removals leave the generation catalog and librarian activates without an immediate draw", () => {
  for (const name of ["응수", "천문학 연구", "강령학 연구", "반전"]) {
    assert.equal(ALL_CARD_BLUEPRINTS.some(card => card.name === name), false);
    assert.ok(TEMPORARILY_REMOVED_CARD_POOL.some(card => card.name === name));
  }
  const result = play("사서의 특권", [[card("타격", 1), card("방어", 2)]]);
  assert.equal(result.played, true);
  assert.equal(result.state.energy, 1);
  assert.equal(result.state.pendingDraws, 0);
  assert.equal(result.state.activeRuleCards[0].effect, "librariansPrivilege");
  assert.ok(result.state.removedFromReshuffleIds.includes(card("사서의 특권").id));
});

test("librarian draws from chosen files after the normal draw and caps choices to unsealed cards", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { querySelectorAll: () => [] };
  try {
    let state = turnStart({ ...waitingState(50, [enemy()]),
      activeRuleCards: [card("사서의 특권", 20), card("사서의 특권", 21)],
      piles: [[card("타격", 1), card("방어", 2)], [card("잽", 3), card("기회 포착", 4)]] });
    assert.deepEqual(state.hand.map(card => card.id), [2, 4]);
    assert.equal(state.pendingDraws, 2);
    const choose = index => createDrawSelectedPile({ game: state, phase: "playing", setGame: update => {
      state = update(state);
    }, pendingOriginsRef: { current: new Map() }, setPhase() {} })(index);
    choose(1);
    assert.deepEqual(state.hand.map(card => card.id), [2, 4, 3]);
    assert.equal(state.pendingDraws, 1);
    choose(0);
    assert.deepEqual(state.hand.map(card => card.id), [2, 4, 3, 1]);
    assert.equal(state.pendingDraws, 0);
    const sealed = turnStart({ ...waitingState(50, [{ ...enemy(), sealsPile: true, sealedTurn: 1, sealedPileIndex: 0 }]),
      activeRuleCards: [card("사서의 특권")], piles: [[card("타격", 1)], [card("방어", 2)]] });
    assert.equal(sealed.pendingDraws, 0);
  } finally { globalThis.document = previousDocument; }
});

test("librarian choices survive a clear reshuffle and do not stall when files are empty", () => {
  const initial = { ...waitingState(50, [enemy()]), activeRuleCards: [card("사서의 특권")], piles: [[]] };
  assert.equal(turnStart(initial).pendingDraws, 0);
  const state = turnStart({ ...initial, clearPlan: {
    pilesBeforeDraw: [[card("타격", 1), card("방어", 2)]],
    pilesAfterDraw: [[card("타격", 1)]], hand: [card("방어", 2)],
  } });
  assert.equal(state.clearPlan, null);
  assert.equal(state.pendingDraws, 1);
  assert.deepEqual(state.hand.map(card => card.id), [2]);
  assert.equal(state.piles[0][0].id, 1);
});
function play(name, piles, paid = false) {
  const played = card(name);
  return resolveCardPlay({ ...waitingState(50, [enemy()]), energy: 3, hand: [played], piles },
    { card: played, targetEnemyId: "enemy", discardCostPaid: paid }, options);
}

test("opportunity cards keep damage/defense but choose a top-card discard without drawing", () => {
  for (const name of ["기회 포착", "기회 창출"]) {
    const piles = [[card("타격", 1), { ...card("방어", 2), revealed: false }], [card("잽", 3)]];
    const result = play(name, piles);
    assert.equal(result.played, true);
    assert.equal(result.state.pendingDraws, 0);
    assert.equal(result.state.pendingSweep, true);
    assert.equal(result.state.pendingPileOperation, "discardTop");
    assert.equal(result.state.enemies[0].hp, name === "기회 포착" ? 191 : 200);
    assert.equal(result.state.playerPhysicalBlock, name === "기회 창출" ? 5 : 0);
    const chosen = resolvePendingPileOperation(result.state, 0);
    assert.deepEqual(chosen.piles.map(pile => pile.map(card => card.id)), [[1], [3]]);
    assert.ok(chosen.discard.some(card => card.id === 2));
    assert.equal(chosen.piles[0][0].revealed, true);
    assert.equal(chosen.hand.length, 0);
    assert.equal(chosen.pendingSweep, false);
    assert.equal(piles[0].length, 2);
  }
});

test("cleanup strike cannot draw until its discard has resolved", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { querySelectorAll: () => [] };
  try {
    let state = play("정리 타격", [[card("타격", 1), card("방어", 2)]]).state;
    const draw = () => createDrawSelectedPile({ game: state, phase: "playing", setGame: update => {
      state = typeof update === "function" ? update(state) : update;
    }, pendingOriginsRef: { current: new Map() }, setPhase() {} })(0);
    assert.equal(state.pendingDraws, 1);
    draw();
    assert.equal(state.hand.length, 0);
    assert.deepEqual(state.piles[0].map(card => card.id), [1, 2]);
    state = resolvePendingPileOperation(state, 0);
    draw();
    assert.deepEqual(state.hand.map(card => card.id), [1]);
    assert.ok(state.discard.some(card => card.id === 2));
    assert.equal(state.pendingDraws, 0);
  } finally { globalThis.document = previousDocument; }
});

test("discarding the final pile card clears the unavailable follow-up draw", () => {
  const state = play("정리 타격", [[card("타격", 1)], []]).state;
  const next = resolvePendingPileOperation(state, 0);
  assert.equal(next.pendingSweep, false);
  assert.equal(next.pendingDraws, 0);
  assert.ok(next.piles.every(pile => pile.length === 0));
});

test("body-sparing defense requires its hand discard and then grants eight block", () => {
  assert.equal(card("몸 사리기").rarity, "basic");
  assert.equal(play("몸 사리기", []).played, false);
  const result = play("몸 사리기", [], true);
  assert.equal(result.played, true);
  assert.equal(result.state.energy, 2);
  assert.equal(result.state.playerPhysicalBlock, 8);
  assert.equal(result.state.pendingDiscards, 0);
});

test("basic charge requires a discard and deals fifteen damage for two energy", () => {
  const charge = card("돌진");
  assert.equal(charge.rarity, "basic");
  assert.equal(charge.discardCost, 1);
  assert.equal(play("돌진", []).played, false);
  const result = play("돌진", [], true);
  assert.equal(result.played, true);
  assert.equal(result.state.energy, 1);
  assert.equal(result.state.enemies[0].hp, 185);
  assert.equal(result.state.pendingDiscards, 0);
});

test("renamed cards migrate in every saved location while keeping identities and forge state", () => {
  const names = [
    ["비늘 갑옷", "위압"], ["갈라치기", "돌파구"], ["오시리스 선", "별의 샘"],
    ["거울상", "반전"], ["전술가", "대전략가"],
  ];
  const cards = names.map(([oldName, name], id) => ({ ...card(name, id), name: oldName, forged: true }));
  const deck = { id: "found", cards, capacity: 25, rareSlotCapacity: 1 };
  const restored = prepareRunRestore({
    mapPosition: { x: 0, y: 0 }, mapSeed: 1, blessings: [], ownedDecks: [deck],
    inventoryCards: cards, roomDrops: { here: cards }, roomDeckDrops: { here: [deck] },
    roomShops: { here: cards.map(card => ({ id: String(card.id), card, price: 2, currency: "hp", sold: false })) },
  }, () => false);
  for (const list of [restored.ownedDecks[0].cards, restored.inventoryCards, restored.roomDrops.here,
    restored.roomDeckDrops.here[0].cards, restored.roomShops.here.map(offer => offer.card)]) {
    assert.deepEqual(list.map(card => card.name), names.map(([, name]) => name));
    assert.deepEqual(list.map(card => card.id), cards.map(card => card.id));
    assert.ok(list.every(card => card.forged));
  }
  assert.equal(restored.roomShops.here[0].currency, "hp");
});

test("old saves update changed cards in every location and upgrade starter capacity without adding cards", () => {
  const oldCards = ["기회 포착", "기회 창출", "정리 타격", "과감한 회피", "싸움 준비", "몸 사리기"].map((name, id) => ({
    ...card(name, id), draw: name === "기회 포착" || name === "기회 창출" ? 1 : 0,
    rarity: name === "몸 사리기" ? "starter" : card(name).rarity,
    discardPileTop: undefined, cost: 1,
    value: name === "몸 사리기" ? 7 : name === "기회 포착" ? 6 : name === "과감한 회피" ? 15 : card(name).value,
    colored: true,
  }));
  const deck = { id: "starter", capacity: 20, cards: oldCards, editions: [], editionColors: {}, rareSlotCapacity: 0 };
  const state = prepareRunRestore({ mapPosition: { x: 0, y: 0 }, mapSeed: 1, blessings: [],
    ownedDecks: [deck], inventoryCards: oldCards, roomDrops: { here: oldCards }, roomDeckDrops: { here: [deck] },
    roomShops: { here: oldCards.map((card, i) => ({ id: String(i), price: 1, sold: false, card })) },
  }, () => false);
  for (const restored of [state.ownedDecks[0].cards, state.inventoryCards, state.roomDrops.here,
    state.roomDeckDrops.here[0].cards, state.roomShops.here.map(offer => offer.card)]) {
    assert.deepEqual(restored.map(card => [card.name, card.cost, card.value, card.draw, card.discardPileTop]),
      oldCards.map(old => { const current = card(old.name); return [current.name, current.cost, current.value, current.draw, current.discardPileTop]; }));
    assert.ok(restored.every(card => card.colored));
    assert.equal(restored.find(card => card.name === "몸 사리기").rarity, "basic");
  }
  assert.equal(state.ownedDecks[0].capacity, 25);
  assert.equal(state.ownedDecks[0].rareSlotCapacity, 1);
  assert.equal(state.roomDeckDrops.here[0].rareSlotCapacity, 1);
  assert.equal(state.ownedDecks[0].cards.length, oldCards.length);
});

test("starter rare-slot migration is idempotent and preserves purchased slots", () => {
  const deck = { id: "starter", capacity: 25, cards: [], editions: [], editionColors: {}, rareSlotCapacity: 0 };
  const state = { mapPosition: { x: 0, y: 0 }, mapSeed: 1, blessings: [],
    ownedDecks: [deck, { ...deck, id: "found" }] };
  const restored = prepareRunRestore(state, () => false);
  assert.deepEqual(restored.ownedDecks.map(item => item.rareSlotCapacity), [1, 0]);
  assert.equal(prepareRunRestore(restored, () => false).ownedDecks[0].rareSlotCapacity, 1);
  const expanded = { ...restored, ownedDecks: [{ ...restored.ownedDecks[0], rareSlotCapacity: 3 }] };
  assert.equal(prepareRunRestore(expanded, () => false).ownedDecks[0].rareSlotCapacity, 3);
  assert.equal(prepareRunRestore(expanded, () => false).ownedDecks[0].capacity, 25);
});
