import assert from "node:assert/strict";
import test from "node:test";
import { ALL_CARD_BLUEPRINTS } from "../app/game/cards.ts";
import { STICKER_IDS, cardStickerIds, compatibleStickers, withRandomSticker, occupiedDeckSpace, placeStartingStickers } from "../app/game/stickers.ts";
import { cardEnergyCost, getCardKeywordInfos } from "../app/game/cardEffects.ts";
import { waitingState, dealtState, buildPiles, prepareDeckForPiles, drawFromPiles, drawFromPileIndexes, drawFromFirstPile, drawOneFromPiles, drawRandomFromPiles } from "../app/game/battleState.ts";
import { createMoveCardToPile, createDrawSelectedPile, createRetrieveBluebirdFromPile } from "../app/game/pileActions.ts";
import { discardHandCard } from "../app/game/discardRules.ts";
import { resolveEnemyTurn } from "../app/game/enemyTurnResolution.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { createBattleReward, createBossBattleReward, createDebugStickerDeck, createRegionDeck, createStarterDeck } from "../app/game/rewards.ts";
import { countRareSlotCards, validateDeckEditorCardMove } from "../app/game/deckEditorRules.ts";
import { createDeckCardView, groupAndSortDeckEditorCards } from "../app/game/deckEditorViews.ts";
import { prepareRunRestore } from "../app/game/runSaveState.ts";
import { TICKET_TYPES } from "../app/game/shopRules.ts";
import { createEndTurn } from "../app/game/endTurnAction.ts";
import { createTelemetryRecorder } from "../app/game/telemetry.ts";

const card = (name = "타격", id = 1, sticker) => ({ ...ALL_CARD_BLUEPRINTS.find(c => c.name === name), id, sticker, revealed: true });
const enemy = () => ({ ...createSewerEncounterByIndex(2, () => .99)[0], id: "enemy", hp: 1000, maxHp: 1000 });
const play = (c, extra = {}) => resolveCardPlay({ ...waitingState(50, [enemy()]), energy: 20, hand: [c], ...extra },
  { card: c, targetEnemyId: "enemy" }, { phase: "playing", blessings: [], maxPlayerHp: 50, oneUpUsed: false, nextCardId: 100, randomRolls: Array(30).fill(.1) });
const enemyTurn = state => resolveEnemyTurn(state, { blessings: [], maxPlayerHp: 50, oneUpUsed: false, randomRolls: [] });

test("ten uniformly chosen compatible stickers exclude ineffective cost and retain combinations", () => {
  assert.deepEqual([...STICKER_IDS].sort(), ["anchor", "bluebird", "bookmark", "clockwork", "comet", "glowDinosaur", "hook", "kite", "moonstone", "parachute"].sort());
  const defense = card("방어");
  assert.ok(!compatibleStickers({ ...defense, retain: true }).includes("bookmark"));
  const unplayable = card("새옹지마");
  assert.ok(!compatibleStickers(unplayable).includes("moonstone"));
  assert.ok(!compatibleStickers(unplayable).includes("clockwork"));
  for (const blueprint of ALL_CARD_BLUEPRINTS) {
    const c = { ...blueprint, id: 1, revealed: false };
    const candidates = compatibleStickers(c);
    const actual = candidates.map((_, i) => {
      const rolls = [0, (i + .5) / candidates.length];
        return cardStickerIds(withRandomSticker(c, 1, () => rolls.shift()))[0];
    });
    assert.deepEqual(actual, candidates);
  }
});

test("debug sticker catalog creates one compatible card for every sticker with unique IDs", () => {
  const { deck, nextCardId } = createDebugStickerDeck(700);
  assert.equal(deck.name, "스티커 도감");
  assert.equal(deck.cards.length, STICKER_IDS.length);
    assert.deepEqual(deck.cards.map(c => cardStickerIds(c)[0]).sort(), [...STICKER_IDS].sort());
  assert.equal(new Set(deck.cards.map(c => c.id)).size, deck.cards.length);
    assert.ok(deck.cards.every(c => compatibleStickers({ ...c, sticker: undefined, stickers: undefined })
      .includes(cardStickerIds(c)[0])));
  assert.equal(nextCardId, 700 + STICKER_IDS.length);
});

test("regular reward cards use an independent thirty-percent sticker roll; boss rares always have one and no tickets", t => {
  let rolls = [.9, .5, .5, .299, .5];
  t.mock.method(Math, "random", () => rolls.shift() ?? .5);
  assert.equal(cardStickerIds(createBattleReward(1, 10).cards[0]).length, 1);
  rolls = [.9, .5, .5, .3];
  assert.equal(cardStickerIds(createBattleReward(1, 10).cards[0]).length, 0);
  const boss = createBossBattleReward(10, 2);
  assert.deepEqual(boss.cards.map(c => c.id), [10, 11]);
  assert.ok(boss.cards.every(c => c.rarity === "rare" && cardStickerIds(c).length === 1
    && compatibleStickers({ ...c, sticker: undefined, stickers: undefined }).includes(cardStickerIds(c)[0])));
  assert.deepEqual(boss.consumableTypes, []);
  assert.ok(boss.decks.flatMap(d => d.cards).every(c => c.id >= 12));
});

test("vault cards independently carry stickers at two percent while starting cards have none", () => {
  let seed = 19397, count = 0, stickerCount = 0;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 600; i++) for (const c of createRegionDeck(2, i * 1000, 0, random, .02).cards) {
    count++;
      const sticker = cardStickerIds(c)[0];
      if (sticker) {
        stickerCount++;
        assert.ok(compatibleStickers({ ...c, sticker: undefined, stickers: undefined }).includes(sticker));
      }
  }
    assert.ok(Math.abs(stickerCount / count - .02) < .004, String(stickerCount / count));
    assert.ok(createStarterDeck().cards.every(c => cardStickerIds(c).length === 0));
});

function move(initial, source = { type: "hand" }, target = 0) {
  let state = initial;
  const c = source.type === "hand" ? state.hand[0] : state.piles[source.pileIndex][source.cardIndex];
  createMoveCardToPile({ setGame: update => { state = update(state); }, phase: "playing", blessings: [],
    grantBattleReward() {}, battleRewardRegionRef: { current: 1 }, lowestHealthEnemy: enemies => enemies[0] })(
    { card: c, cards: [c], source }, target);
  return state;
}

test("moonstone allows negative costs; clockwork fires once per battle, survives reshuffles, resets next battle", () => {
  assert.equal(cardEnergyCost(card("잽", 1, "moonstone")), -1);
  assert.equal(play(card("잽", 1, "moonstone")).state.energy, 21);
  const c = card("잽", 1, "clockwork");
  let state = move({ ...waitingState(50, []), hand: [c], piles: [[]], initialDeck: [c], stars: 3 });
  assert.equal(cardEnergyCost(state.piles[0][0]), -1);
  const redrawn = drawFromPiles(state.piles);
  state = move({ ...state, hand: redrawn.hand, piles: redrawn.piles });
  assert.equal(cardEnergyCost(state.piles[0][0]), -1);
  assert.equal(cardEnergyCost(buildPiles(prepareDeckForPiles(state.initialDeck))[0][0]), -1);
  assert.equal(cardEnergyCost(dealtState(50, state.initialDeck, []).piles[0][0]), 0);
});

test("bluebird can be moved from the top of a file to the hand for two stars", () => {
  const c = card("잽", 1, "bluebird");
  let state = { ...waitingState(50, []), hand: [], piles: [[c]], stars: 1 };
  const retrieve = createRetrieveBluebirdFromPile({
    phase: "playing",
    blessings: [],
    setGame: update => { state = update(state); },
  });
  retrieve(0);
  assert.equal(state.piles[0].length, 1);
  assert.equal(state.hand.length, 0);
  assert.equal(state.stars, 1);
  state = { ...state, stars: 2 };
  retrieve(0);
  assert.equal(state.hand.length, 1);
  assert.equal(state.piles[0].length, 0);
  assert.equal(state.stars, 0);
  assert.equal(state.starsSpent, 2);
});

test("initial kite and anchor placement spreads cards; comet is an extra hand card and never duplicated", () => {
  const cards = [card("잽", 1, "kite"), card("잽", 2, "kite"), card("방어", 3, "anchor"), card("방어", 4, "anchor"), card("방어", 5, "comet"), card("타격", 6)];
  const result = placeStartingStickers([cards.slice(0, 3), cards.slice(3)], () => 0);
  assert.ok(result.piles.every(pile => pile[0].sticker === "anchor" && pile.at(-1).sticker === "kite"));
  assert.ok(result.piles.every(pile => !pile[0].revealed));
  assert.deepEqual(result.hand.map(c => c.id), [5]);
  assert.equal(new Set([...result.piles.flat(), ...result.hand].map(c => c.id)).size, cards.length);
  const state = dealtState(50, cards, []);
  assert.deepEqual(state.hand.map(c => c.id), [5]);
  assert.equal(state.piles.flat().some(c => c.id === 5), false);
});

test("night-glow dinosaurs remain face up inside initial and reshuffled files", () => {
  const c = card("잽", 1, "glowDinosaur");
  const piles = buildPiles([c, card("방어", 2), card("방어", 3)]);
  assert.equal(piles[0][0].revealed, true);
  assert.equal(piles[0][1].revealed, false);
  assert.equal(dealtState(50, [c, card("방어", 2)], []).piles.flat().find(c => c.id === 1).revealed, true);
});

test("every file-draw entry point chains hooks without consuming an extra requested draw", () => {
  const piles = [[card("방어", 1), card("잽", 2, "hook"), card("잽", 3, "hook")]];
  for (const draw of [drawFromPiles, p => drawFromPileIndexes(p, [0]), drawFromFirstPile, drawOneFromPiles, p => drawRandomFromPiles(p, 1, () => 0)]) {
    const result = draw(piles);
    assert.deepEqual(result.hand.map(c => c.id), [3, 2, 1]);
    assert.equal(result.piles[0].length, 0);
  }
  assert.equal(piles[0].length, 3);
  assert.equal(drawRandomFromPiles(piles, 1, () => 0, [0]).hand.length, 0);
});

test("chosen-file and dash draws include hooks once without duplicate cards", () => {
  const previous = globalThis.document;
  globalThis.document = { querySelectorAll: () => [] };
  try {
    for (const dash of [0, 2]) {
      let state = { ...waitingState(50, []), pendingDraws: 1, pendingDashRandomDraws: dash,
        piles: [[card("방어", 1), card("잽", 2, "hook"), card("잽", 3, "hook")], [card("방어", 4), card("방어", 5)]] };
      createDrawSelectedPile({ game: state, phase: "playing", setGame: update => { state = update(state); },
        pendingOriginsRef: { current: new Map() }, setPhase() {} })(0);
      assert.deepEqual(state.hand.map(c => c.id), dash ? [3, 2, 1, 5, 4] : [3, 2, 1]);
      assert.equal(new Set([...state.hand, ...state.piles.flat()].map(c => c.id)).size, 5);
    }
  } finally { globalThis.document = previous; }
});

test("a hook chain that empties the last file schedules a clear without duplicating its cards", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  try {
    const c1 = card("방어", 1), c2 = card("잽", 2, "hook"), c3 = card("방어", 3);
    const idle = { ...enemy(), actions: [{ name: "대기", attacks: [] }], intentIndex: 0 };
    let state = { ...waitingState(50, [idle]), piles: [[c1, c2]], discard: [c3], initialDeck: [c1, c2, c3] };
    const callbacks = [];
    createEndTurn({ game: state, phase: "playing", handCardRefs: { current: new Map() },
      setPhase() {}, setDragging() {}, later: callback => { callbacks.push(callback); return callbacks.length; },
      blessings: [], oneUpUsedRef: { current: false }, maxPlayerHp: 50, setOneUpUsed() {},
      setGame: update => { state = typeof update === "function" ? update(state) : update; }, drawCards() {},
      telemetry: createTelemetryRecorder(), setDamagePopup() {}, showEnemyPopup() {}, setAttackingEnemyId() {},
      grantBattleReward() {}, battleRewardRegionRef: { current: 1 }, maximumEnergyForGame: () => 3,
      animateCardToPlayer: () => null })();
    while (callbacks.length) callbacks.shift()();
    assert.equal(state.turn, 2);
    assert.ok(state.clearPlan);
    assert.deepEqual(state.clearPlan.pilesBeforeDraw.flat().map(c => c.id), [3]);
    assert.deepEqual(drawFromPiles(state.piles).hand.map(c => c.id), [2, 1]);
  } finally { globalThis.window = previousWindow; }
});

test("bookmark retains a card; parachute replaces end-turn and discard-X discards with a face-up empty-file move", () => {
  const bookmarked = card("잽", 1, "bookmark"), parachute = card("방어", 2, "parachute");
  const initial = { ...waitingState(50, []), hand: [bookmarked, parachute], piles: [[]] };
  const end = enemyTurn(initial);
  assert.deepEqual(end.retainedHand.map(c => c.id), [1]);
  assert.deepEqual(end.pilesAfterSlime[0].map(c => c.id), [2]);
  assert.equal(end.discarded.length, 0);
  const discarded = discardHandCard({ ...initial, pendingDiscards: 1, pendingDiscardIsDiscardX: true }, 2);
  assert.equal(discarded.pendingDiscards, 0);
  assert.equal(discarded.discard.length, 0);
  assert.equal(discarded.piles[0][0].revealed, true);
  const blocked = discardHandCard({ ...initial, piles: [[card()]], pendingDiscards: 1 }, 2);
  assert.equal(blocked.discard[0].id, 2);
  assert.ok(getCardKeywordInfos(bookmarked).some(k => k.name === "보존"));
});

test("using or exhausting a parachute card does not send it to a file", () => {
  const c = { ...card("잽", 1, "parachute"), exhaust: true };
  const result = play(c, { piles: [[]] }).state;
  assert.equal(result.piles[0].length, 0);
  assert.ok(result.removedFromReshuffleIds.includes(c.id));
});

test("every card uses deck capacity and rare cards use rare slots", () => {
  const rare = card("초월", 2), normal = card();
  assert.equal(occupiedDeckSpace([normal, rare]), 2);
  assert.equal(countRareSlotCards([normal, rare]), 1);
  const validation = validateDeckEditorCardMove({ source: { area: "inventory" }, target: { area: "deck", deckId: "x" },
    safeArea: true, originalOriginDeckId: null, effectiveOriginDeckId: null, targetDeckCardCount: 1, targetDeckCapacity: 1,
    targetDeckRareCardCount: 0, targetDeckRareSlotCapacity: 0, inventoryItemCount: 1, inventoryCapacity: 15,
    isRare: true, consumesRareSlot: true, incomingCardSpace: 1 });
  assert.deepEqual(validation, { allowed: false, reason: "deck-full" });
  const view = createDeckCardView({ id: "x", cards: [normal, rare], capacity: 2, rareSlotCapacity: 1 });
  assert.equal(view.rareSlotCount, 1);
  assert.equal(view.normalCardCount, 1);
  assert.equal(groupAndSortDeckEditorCards([normal, { ...normal, id: 4, sticker: "moonstone" }], "cost", new Set()).length, 2);
});

test("save restore preserves stickers in every card location and removes old paint tickets and battle-only sticker flags", () => {
  const c = { ...card("잽", 1, "moonstone"), colored: true, clockworkTriggered: true, bluebirdUsedTurn: 1 };
  const oldFirefly = { ...card("잽", 2), sticker: "firefly" };
  const deck = { id: "x", cards: [c], capacity: 25, rareSlotCapacity: 1, editions: [] };
  const oldPaint = { id: "paint", type: "paintTicket", name: "색칠 티켓" };
  const result = prepareRunRestore({ mapPosition: { x: 0, y: 0 }, mapSeed: 1, blessings: [], ownedDecks: [deck],
    inventoryCards: [c, oldFirefly], roomDrops: { x: [c] }, roomDeckDrops: { x: [deck] }, roomDeckVaults: { x: deck },
    inventoryConsumables: [oldPaint], roomConsumableDrops: { x: [oldPaint] } }, () => false);
  for (const restored of [result.inventoryCards[0], result.ownedDecks[0].cards[0], result.roomDrops.x[0], result.roomDeckDrops.x[0].cards[0], result.roomDeckVaults.x.cards[0]]) {
      assert.deepEqual(cardStickerIds(restored), ["moonstone"]);
    assert.equal(Object.hasOwn(restored, "colored"), false);
    assert.equal(restored.clockworkTriggered, undefined);
  }
  assert.deepEqual(result.inventoryConsumables, []);
  assert.deepEqual(result.roomConsumableDrops.x, []);
  assert.equal(TICKET_TYPES.includes("paintTicket"), false);
    assert.deepEqual(cardStickerIds(result.inventoryCards[1]), ["glowDinosaur"]);
});
