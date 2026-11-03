import assert from "node:assert/strict";
import test from "node:test";
import { findAutoExploreRoute, hasAutoExploreDiscovery } from "../app/game/mapAutoExplore.ts";
import { mapRoomKey } from "../app/game/mapRules.ts";
import { waitingState } from "../app/game/battleState.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { ALL_CARD_BLUEPRINTS } from "../app/game/cards.ts";
import { discardHandCard } from "../app/game/discardRules.ts";
import { resolvePendingPileOperation } from "../app/game/pileActions.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";

const key = (x, y) => mapRoomKey({ x, y });
const card = (effect, id) => ({ ...ALL_CARD_BLUEPRINTS.find(card => card.effect === effect), id, revealed: true });
const options = { phase: "playing", blessings: [], maxPlayerHp: 50, nextCardId: 100,
  oneUpUsed: false, randomRolls: Array(64).fill(.5) };

test("auto exploration follows known passages to the closest unexplored reachable cell", () => {
  const cells = new Set([key(0,0), key(1,0), key(2,0), key(3,0), key(0,2)]);
  const known = new Set([key(0,0), key(1,0), key(2,0)]);
  const terrain = position => cells.has(mapRoomKey(position)) ? "empty" : "rock";
  assert.deepEqual(findAutoExploreRoute({ x: 0, y: 0 }, known, terrain), [0,1,2,3].map(x => ({ x, y: 0 })));
  assert.equal(findAutoExploreRoute({ x: 0, y: 0 }, new Set([...known, key(3,0)]), terrain), null);
});

test("discovery stops on new items and special terrain but ignores walls, floor and old discoveries", () => {
  const visible = new Set([key(0,0), key(1,0)]), known = new Set([key(0,0)]);
  for (const type of ["empty", "rock", "void"]) {
    assert.equal(hasAutoExploreDiscovery(visible, known, () => type, () => false), false);
  }
  assert.equal(hasAutoExploreDiscovery(visible, known, () => "shop", () => false), true);
  assert.equal(hasAutoExploreDiscovery(visible, known, () => "empty", room => room === key(1,0)), true);
  assert.equal(hasAutoExploreDiscovery(visible, visible, () => "deckVault", () => true), false);
});

test("recycling activates as a one-cost rule; playing cards does not count as discarding", () => {
  const recycling = card("recycling", 1);
  assert.equal(recycling.rarity, "special");
  assert.equal(recycling.cost, 1);
  assert.equal(recycling.rule, true);
  const before = { ...waitingState(50, createSewerEncounterByIndex(2)), hand: [recycling], energy: 3, stars: 0 };
  const active = resolveCardPlay(before, { card: recycling }, options).state;
  assert.equal(active.energy, 2);
  assert.deepEqual(active.activeRuleCards.map(card => card.effect), ["recycling"]);
  assert.equal(active.stars, 0);
  const defense = card("defend", 3);
  const played = resolveCardPlay({ ...active, hand: [defense] }, { card: defense }, options);
  assert.equal(played.played, true);
  assert.equal(played.state.stars, 0);
});

test("direct hand discards gain one star per rule without repeating invalid selections", () => {
  const target = card("strike", 3);
  const state = { ...waitingState(50, []), hand: [target], pendingDiscards: 1, stars: 0,
    activeRuleCards: [card("recycling", 1), card("recycling", 2)] };
  const result = discardHandCard(state, target.id);
  assert.equal(result.stars, 2);
  assert.equal(result.pendingDiscards, 0);
  assert.equal(result.hand.length, 0);
  assert.equal(result.discard.at(-1).id, target.id);
  assert.equal(discardHandCard(result, target.id), result);
  assert.equal(discardHandCard({ ...state, pendingDiscards: 0 }, target.id).stars, 0);
});

test("discarding a file top triggers recycling, while rotating it does not", () => {
  const top = card("strike", 3), bottom = card("defend", 4);
  const state = { ...waitingState(50, []), piles: [[bottom, top]], pendingSweep: true,
    pendingPileOperation: "discardTop", stars: 0, activeRuleCards: [card("recycling", 1)] };
  const discarded = resolvePendingPileOperation(state, 0);
  assert.equal(discarded.stars, 1);
  assert.equal(discarded.discard.at(-1).id, top.id);
  assert.equal(resolvePendingPileOperation({ ...state, pendingPileOperation: "rotateTop" }, 0).stars, 0);
});
