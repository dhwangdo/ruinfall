import assert from "node:assert/strict";
import test from "node:test";
import { cardBoxPosition } from "../app/components/cardFlightGeometry.ts";
import { newlyForgedCardIds } from "../app/components/forgeAnimation.ts";
import { createBattleAnimationLifecycle } from "../app/components/battleAnimationLifecycle.ts";
import { ENEMY_STRIKE_DURATION_MS } from "../app/game/battlePresentationTiming.ts";
import { createEndTurn } from "../app/game/endTurnAction.ts";
import { waitingState } from "../app/game/battleState.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { createFermentedSlimeCard, STARTER_CARD_POOL } from "../app/game/cards.ts";
import { createTelemetryRecorder } from "../app/game/telemetry.ts";

const flush = () => new Promise(resolve => setImmediate(resolve));

test("forge bursts recognize new and repeated forges without treating discounts or rearrangement as forges", () => {
  const card = { ...STARTER_CARD_POOL[0], id: 1, revealed: true };
  const dagger = { ...card, id: 2, forged: true, forgeCostsCompleted: [1] };
  const odin = { ...card, id: 3, effect: "odinSpear", cost: 6 };
  const forged = { ...card, forged: true };
  assert.deepEqual(newlyForgedCardIds([card, dagger, odin], [
    forged, { ...dagger, forgeCostsCompleted: [1, 2] }, { ...odin, cost: 5 }, forged,
  ]), [1, 2]);
  assert.deepEqual(newlyForgedCardIds([forged, dagger], [dagger, forged]), []);
  assert.deepEqual(newlyForgedCardIds([forged, dagger], [card, { ...dagger, forged: false, forgeCostsCompleted: [] }]), []);
});
function flight() {
  let finish, reject;
  const animation = { cancelled: false, finished: new Promise((resolve, fail) => { finish = resolve; reject = fail; }),
    cancel() { this.cancelled = true; reject(new Error("cancelled")); } };
  return { animation, finish };
}

test("a ghost keeps the rendered box of an enlarged or rotated card", () => {
  const enlarged = cardBoxPosition({ left: 220.4, top: 243.9 }, 136, 191,
    { x: 68, y: 191 }, { a: 1.3, b: 0, c: 0, d: 1.3, e: 0, f: -10 });
  assert.ok(Math.abs(enlarged.left - 240.8) < 1e-9 && Math.abs(enlarged.top - 311.2) < 1e-9);
  const angle = .178, matrix = { a: Math.cos(angle), b: Math.sin(angle), c: -Math.sin(angle), d: Math.cos(angle), e: 3, f: 27 };
  const origin = { x: 68, y: 191 };
  const xs = [], ys = [];
  for (const [x, y] of [[0, 0], [136, 0], [0, 191], [136, 191]]) {
    xs.push(640 + origin.x + matrix.a * (x - origin.x) + matrix.c * (y - origin.y) + matrix.e);
    ys.push(310 + origin.y + matrix.b * (x - origin.x) + matrix.d * (y - origin.y) + matrix.f);
  }
  const box = cardBoxPosition({ left: Math.min(...xs), top: Math.min(...ys) }, 136, 191, origin, matrix);
  assert.ok(Math.abs(box.left - 640) < 1e-9 && Math.abs(box.top - 310) < 1e-9);
});

test("a staggered group commits only after its last flight, keeping earlier flights owned", async () => {
  const lifecycle = createBattleAnimationLifecycle(), first = flight(), last = flight();
  let committed = false;
  lifecycle.afterAnimations([first.animation, last.animation], () => { committed = true; });
  first.finish(); await flush();
  assert.equal(committed, false);
  assert.equal(first.animation.cancelled, false);
  last.finish(); await flush();
  assert.equal(committed, true);
  assert.equal(first.animation.cancelled && last.animation.cancelled, true);
});

test("reset cancels finished and unfinished members without running an old completion", async () => {
  const lifecycle = createBattleAnimationLifecycle(), first = flight(), last = flight();
  let committed = false;
  lifecycle.afterAnimations([first.animation, last.animation], () => { committed = true; });
  first.finish(); await flush(); lifecycle.clearAnimations(); await flush();
  assert.equal(committed, false);
  assert.equal(first.animation.cancelled && last.animation.cancelled, true);
  lifecycle.afterAnimations([], () => { committed = true; });
  await flush(); assert.equal(committed, true);
});

test("ending a turn waits for discard and allows every hit to return before the next", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  try {
    const enemy = { ...createSewerEncounterByIndex(3, () => .999)[0], intentIndex: 0 };
    const card = { ...STARTER_CARD_POOL[0], id: 1 };
    let state = { ...waitingState(50, [enemy]), hand: [card, createFermentedSlimeCard(2)], piles: [[{ ...card, id: 3 }]] };
    const discardElement = {}, retainedElement = {}, scheduled = [], attacks = [], hits = [];
    let completeDiscard, animated;
    createEndTurn({ game: state, phase: "playing", handCardRefs: { current: new Map([[1, discardElement], [2, retainedElement]]) },
      setPhase() {}, setDragging() {}, later: (callback, delay) => { scheduled.push({ callback, delay }); return scheduled.length; },
      blessings: [], oneUpUsedRef: { current: false }, maxPlayerHp: 50, setOneUpUsed() {},
      setGame: update => { state = typeof update === "function" ? update(state) : update; }, drawCards() {},
      telemetry: createTelemetryRecorder(), setDamagePopup: popup => { if (popup?.kind === "damage") hits.push(now); },
      showEnemyPopup() {}, setAttackingEnemyId: id => attacks.push({ id, at: now }), grantBattleReward() {},
      battleRewardRegionRef: { current: 1 }, maximumEnergyForGame: () => 3, animateCardToPlayer: () => null,
      animateDiscardedCards: elements => { animated = elements; return []; },
      afterAnimations: (_animations, callback) => { completeDiscard = callback; },
    })();
    assert.deepEqual(animated, [discardElement]);
    assert.equal(state.hand.length, 2);
    assert.equal(scheduled.length, 0);
    let now = 0;
    completeDiscard();
    assert.deepEqual(state.hand.map(card => card.id), [2]);
    for (const entry of scheduled.slice().sort((a, b) => a.delay - b.delay)) {
      now = entry.delay; entry.callback();
    }
    const starts = attacks.filter(entry => entry.id), ends = attacks.filter(entry => entry.id === null);
    assert.equal(starts.length, 2);
    assert.equal(hits.length, 2);
    for (let i = 0; i < starts.length; i++) {
      assert.equal(ends[i].at - starts[i].at, ENEMY_STRIKE_DURATION_MS);
      assert.equal(hits[i] - starts[i].at, Math.round(ENEMY_STRIKE_DURATION_MS * .55));
      if (i > 0) assert.ok(starts[i].at > ends[i - 1].at);
    }
  } finally { globalThis.window = previousWindow; }
});
