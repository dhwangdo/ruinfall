import assert from "node:assert/strict";
import test from "node:test";

import {
  nextRareCardDropChance,
} from "../app/game/rewardRules.ts";
import {
  calculateDeckCapacityScore,
  calculateDeckScore,
  getAvailableDeckEditions,
  createRegionDeck,
  rollRegionDeckShape,
  createBattleReward,
} from "../app/game/rewards.ts";
import {
  TICKET_TYPES,
  TICKET_TIERS,
  ticketBasePrice,
} from "../app/game/shopRules.ts";

test("deck rewards leave the rare-card pity chance unchanged", () => {
  assert.equal(nextRareCardDropChance(0.17, []), 0.17);
});

test("card rewards update the rare-card pity chance", () => {
  assert.equal(nextRareCardDropChance(0.17, [{ rarity: "rare" }]), 0.05);
  assert.equal(nextRareCardDropChance(0.17, [{ rarity: "special" }]), 0.19);
});

test("out-of-depth battle rewards always include a deck", () => {
  const reward = createBattleReward(2, 0, 0, 0, 0, true);
  assert.equal(reward.decks.length, 1);
  assert.equal(reward.cards.length, 0);
  assert.equal(reward.consumableType, null);
  assert.deepEqual(reward.consumableTypes, []);
});

test("ticket tiers and base prices match the shop rules", () => {
  assert.deepEqual(TICKET_TIERS, {
    paintTicket: 1,
    bombTicket: 1,
    extractTicket: 1,
    swapTicket: 1,
    mapTicket: 2,
    mindEyeTicket: 1,
    darkTicket: 1,
    transformTicket: 2,
    cloneTicket: 3,
  });
  for (const type of TICKET_TYPES) {
    assert.equal(ticketBasePrice(type), 30 + (TICKET_TIERS[type] - 1) * 50);
  }
});

test("deck capacity scores follow the five-card growth sequence", () => {
  assert.equal(calculateDeckCapacityScore(15), 0);
  assert.equal(calculateDeckCapacityScore(20), 13);
  assert.equal(calculateDeckCapacityScore(25), 26);
  assert.equal(calculateDeckCapacityScore(30), 39);
});

test("deck score sums editions, rare cards, and capacity", () => {
  const score = calculateDeckScore({
    capacity: 20,
    editions: ["clever", "fantastic"],
    cards: [{ rarity: "special" }, { rarity: "rare" }, { rarity: "basic" }],
  });
  assert.deepEqual(score, {
    editionScore: 70,
    cardScore: 8,
    capacityScore: 13,
    total: 91,
  });
});

test("deck edition scores do not use a progressive surcharge", () => {
  const score = calculateDeckScore({
    capacity: 15,
    editions: ["clever", "roomy", "lively"],
    cards: [],
  });
  assert.equal(score.editionScore, 65);
});

test("recycling editions are mutually exclusive", () => {
  assert.equal(getAvailableDeckEditions(["frugal"]).includes("frugalPlus"), false);
  assert.equal(getAvailableDeckEditions(["frugalPlus"]).includes("frugal"), false);
  assert.equal(getAvailableDeckEditions([]).includes("frugal"), true);
  assert.equal(getAvailableDeckEditions([]).includes("frugalPlus"), true);
});

test("region deck shape keeps the chosen sum and rejects rare overflow", () => {
  for (const [roll, expectedSum] of [[0.79, 0], [0.85, 1], [0.95, 2]]) {
    const values = [roll, 0.37];
    const shape = rollRegionDeckShape(7, () => values.shift());
    assert.equal(shape.sum, expectedSum);
    assert.equal(shape.x + shape.y + shape.z, expectedSum);
    assert.ok([shape.x, shape.y, shape.z].every((value) => value >= -7));
    assert.ok(shape.rareCount <= shape.capacity);
    assert.equal(shape.editionBudget, (7 + shape.z) * 10);
  }
});

test("region deck uses its shape and adds deck-size blessing capacity last", () => {
  const shape = rollRegionDeckShape(2, () => 0.5);
  const base = createRegionDeck(2, 100, 0, () => 0.5);
  const blessed = createRegionDeck(2, 100, 5, () => 0.5);
  assert.equal(base.capacity, shape.capacity);
  assert.equal(blessed.capacity, shape.capacity + 5);
  assert.equal(base.cards.filter((card) => card.rarity === "rare").length, shape.rareCount);
  assert.deepEqual(blessed.cards, base.cards);
  assert.deepEqual(blessed.editions, base.editions);
});

test("region filler bags still leave three eighths of slots empty", () => {
  const deck = createRegionDeck(0, 200, 0, () => 0);
  assert.equal(deck.capacity, 15);
  assert.equal(deck.cards.length, 6);
});
