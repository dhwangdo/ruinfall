import assert from "node:assert/strict";
import test from "node:test";
import { rollFilledRareSlots } from "../app/game/rareSlotRules.ts";

import {
  nextRareCardDropChance,
} from "../app/game/rewardRules.ts";
import {
  calculateDeckCapacityScore,
  calculateDeckScore,
  getAvailableDeckEditions,
  createConsumable,
  createRegionDeck,
  createStarterDeck,
  rollRegionDeckShape,
  createBattleReward,
  createBossBattleReward,
} from "../app/game/rewards.ts";
import {
  TICKET_TYPES,
  TICKET_TIERS,
  ticketBasePrice,
} from "../app/game/shopRules.ts";

test("cached region shapes cannot be changed by a previous caller", () => {
  const expected = rollRegionDeckShape(3, () => 0.5);
  const changed = rollRegionDeckShape(3, () => 0.5);
  changed.capacity = -100;
  assert.deepEqual(rollRegionDeckShape(3, () => 0.5), expected);
});

test("deck rewards leave the rare-card pity chance unchanged", () => {
  assert.equal(nextRareCardDropChance(0.17, []), 0.17);
});

test("card rewards update the rare-card pity chance", () => {
  assert.equal(nextRareCardDropChance(0.17, [{ rarity: "rare" }]), 0.05);
  assert.equal(nextRareCardDropChance(0.17, [{ rarity: "special" }]), 0.19);
});

test("out-of-depth battle rewards always include a deck", () => {
  const reward = createBattleReward(2, 0, 0, 0, true);
  assert.equal(reward.decks.length, 1);
  assert.equal(reward.keys, 1);
  assert.equal(reward.cards.length, 0);
  assert.equal(reward.consumableType, null);
  assert.deepEqual(reward.consumableTypes, []);
});

test("ticket tiers and base prices match the shop rules", () => {
  assert.deepEqual(TICKET_TIERS, {
    paintTicket: 1,
    bombTicket: 1,
    extractTicket: 1,
    extractPlusTicket: 2,
    mapTicket: 1,
    mindEyeTicket: 1,
    darkTicket: 1,
    transformTicket: 2,
    cloneTicket: 3,
    expandTicket: 3,
  });
  for (const type of TICKET_TYPES) {
    assert.equal(ticketBasePrice(type), 30 + (TICKET_TIERS[type] - 1) * 50);
  }
  assert.ok(TICKET_TYPES.includes("expandTicket"));
  assert.equal(ticketBasePrice("expandTicket"), 130);
  assert.equal(createConsumable("expandTicket", "test-expand").description, "덱에 드래그해 희귀 슬롯을 1 늘립니다.");
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
    assert.ok(shape.x >= -7);
    assert.ok(shape.y >= -(7 - 1));
    assert.ok(shape.z >= -7);
    assert.equal(shape.capacity, 20 + (7 + shape.x) * 5);
    assert.equal(shape.rareSlotCapacity, 8 + shape.y);
    assert.ok(shape.rareSlotCapacity >= 2);
    assert.ok(shape.rareSlotCapacity <= shape.capacity);
    assert.equal(shape.editionBudget, (7 + shape.z) * 10);
  }
});

test("region deck uses its shape and adds deck-size blessing capacity last", () => {
  const shape = rollRegionDeckShape(2, () => 0.5);
  const base = createRegionDeck(2, 100, 0, () => 0.5);
  const blessed = createRegionDeck(2, 100, 5, () => 0.5);
  assert.equal(base.capacity, shape.capacity);
  assert.equal(blessed.capacity, shape.capacity + 5);
  assert.equal(base.cards.filter((card) => card.rarity === "rare").length, rollFilledRareSlots(shape.rareSlotCapacity, () => .5));
  assert.ok(base.rareSlotCapacity >= base.cards.filter((card) => card.rarity === "rare").length);
  assert.equal(base.rareSlotCapacity, shape.rareSlotCapacity);
  assert.deepEqual(blessed.cards, base.cards);
  assert.deepEqual(blessed.editions, base.editions);
});

test("the starter deck has 20 cards, capacity 25, and every starter/basic type", () => {
  const deck = createStarterDeck();
  assert.equal(deck.rareSlotCapacity, 1);
  assert.equal(deck.capacity, 25);
  assert.equal(deck.cards.length, 20);
  assert.equal(new Set(deck.cards.map((card) => card.id)).size, 20);
  assert.equal(deck.cards.filter((card) => card.name === "타격").length, 6);
  assert.equal(deck.cards.filter((card) => card.name === "방어" && card.damageType === "physical").length, 6);
  for (const name of ["몸 사리기", "돌진", "잽", "자와 컴퍼스", "기회 포착", "기회 창출", "별의 장막", "전투 교본"]) {
    assert.equal(deck.cards.filter(card => card.name === name).length, 1, name);
  }
  assert.equal(deck.cards.some((card) => card.name === "마법 방어"), false);
});

test("region filler bags leave one quarter of bag entries empty", () => {
  const shape = rollRegionDeckShape(1, () => 0);
  const deck = createRegionDeck(1, 200, 0, () => 0);
  const remainingSlots = shape.capacity - shape.rareSlotCapacity;
  const bagSize = Math.max(Math.floor((remainingSlots * 2) / 8) * 8, 8);
  assert.equal(deck.capacity, shape.capacity);
  assert.equal(deck.cards.length, 1 + remainingSlots - bagSize / 4);
});

test("generated filler slots follow the requested 2:1:3:2 distribution", () => {
  let seed = 39471;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const counts = { empty: 0, starter: 0, basic: 0, special: 0 };
  let slots = 0;
  for (let index = 0; index < 2000; index++) {
    const deck = createRegionDeck(1, index * 100, 0, random);
    const fillerCards = deck.cards.filter(card => card.rarity !== "rare");
    const remainingSlots = deck.capacity - deck.rareSlotCapacity;
    slots += remainingSlots;
    counts.empty += remainingSlots - fillerCards.length;
    for (const card of fillerCards) counts[card.rarity]++;
  }
  for (const [kind, share] of Object.entries({ empty: .25, starter: .125, basic: .375, special: .25 })) {
    assert.ok(Math.abs(counts[kind] / slots - share) < .015, `${kind}: ${counts[kind] / slots}`);
  }
});

test("region deck draws rare cards without repeating before exhausting the pool", () => {
  const deck = createRegionDeck(7, 300, 0, () => 0.5);
  const rareNames = deck.cards.filter((card) => card.rarity === "rare").map((card) => card.name);
  assert.ok(rareNames.length > 1);
  assert.equal(new Set(rareNames).size, rareNames.length);
});

test("ordinary victories always add one key and never roll a deck", (t) => {
  t.mock.method(Math, "random", () => 0);
  for (let index = 0; index < 12; index++) {
    const reward = createBattleReward(1, index * 100);
    assert.equal(reward.keys, 1);
    assert.equal(reward.decks.length, 0);
    assert.equal(reward.cards.length, 1);
  }
});

test("bosses grant no key but retain the boss-slayer bonus deck", () => {
  assert.equal(createBossBattleReward(100).keys, 0);
  const reward = createBossBattleReward(100, 2);
  assert.equal(reward.keys, 0);
  assert.equal(reward.decks.length, 1);
  assert.equal(reward.cards.length, 1);
});
