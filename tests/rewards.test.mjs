import assert from "node:assert/strict";
import test from "node:test";
import { rollFilledRareSlots } from "../app/game/rareSlotRules.ts";
import { regionDeckShapeDistribution } from "../app/game/regionDeckRules.ts";
import { STARTER_CARD_POOL, BASIC_CARD_POOL } from "../app/game/cards.ts";

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

test("enemy and boss battle rewards no longer grant gold", () => {
  const regular = createBattleReward(1, 0);
  const boss = createBossBattleReward(1);
  assert.equal(Object.hasOwn(regular, "gold"), false);
  assert.equal(Object.hasOwn(boss, "gold"), false);
});

test("ticket tiers and base prices match the shop rules", () => {
  assert.ok(!TICKET_TYPES.includes("mindEyeTicket"));
  assert.ok(!TICKET_TYPES.includes("darkTicket"));
  assert.deepEqual(TICKET_TIERS, {
    bombTicket: 1,
    extractTicket: 1,
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

test("removed editions are unavailable and quick hammer costs ten points", () => {
  const available = getAvailableDeckEditions([]);
  assert.equal(available.includes("frugal"), false);
  assert.equal(available.includes("greedy"), false);
  assert.equal(available.includes("frugalPlus"), true);
  assert.ok(available.includes("quickHammer"));
  assert.equal(calculateDeckScore({ capacity: 15, cards: [], editions: ["quickHammer"] }).editionScore, 10);
});

test("region deck shape keeps the chosen sum and rejects rare overflow", () => {
  for (let k = 1; k <= 7; k++) {
    const sumCounts = Array(7).fill(0);
    for (let a = 1; a <= 3; a++) for (let b = 1; b <= 3; b++) for (let c = 1; c <= 3; c++) {
      const values = [(a - .5) / 3, (b - .5) / 3, (c - .5) / 3, .37];
      const shape = rollRegionDeckShape(k, () => values.shift());
      assert.equal(shape.sum, a + b + c - 6);
      sumCounts[shape.sum + 3]++;
      assert.equal(shape.x + shape.y + shape.z, shape.sum);
    }
    assert.deepEqual(sumCounts, [1, 3, 6, 7, 6, 3, 1]);
    const distribution = regionDeckShapeDistribution(k);
    assert.ok(Math.abs(distribution.reduce((sum, entry) => sum + entry.probability, 0) - 1) < 1e-12);
    for (const { shape } of distribution) {
      assert.ok(shape.x >= -k - 1 && shape.y >= -k && shape.z >= -k);
      assert.ok(shape.capacity >= 15);
      assert.equal(shape.capacity, 20 + 5 * (k + shape.x));
      assert.equal(shape.rareSlotCapacity, k + shape.y);
      assert.ok(shape.rareSlotCapacity >= 0 && shape.rareSlotCapacity <= shape.capacity);
      assert.equal(shape.editionBudget, 10 * (k + shape.z));
    }
  }
});

test("shape sampling uses distance rather than squared distance within the rolled sum", () => {
  // The old ten candidates plus x=-2 with (y,z)=(-1,3),(0,2),(1,1),(2,0),(3,-1).
  const expectedOrigin = 1 / (1 + 6 * 1.75 ** -Math.SQRT2 + 4 * 1.75 ** -Math.sqrt(6)
    + 2 * 1.75 ** -Math.sqrt(8) + 2 * 1.75 ** -Math.sqrt(14));
  const origin = regionDeckShapeDistribution(1).find(({ shape }) => shape.x === 0 && shape.y === 0 && shape.z === 0);
  assert.ok(Math.abs(origin.probability / (7 / 27) - expectedOrigin) < 1e-12);
  let origins = 0;
  const samples = 10000;
  for (let index = 0; index < samples; index++) {
    const values = [.5, .5, .5, (index + .5) / samples];
    const shape = rollRegionDeckShape(1, () => values.shift());
    if (shape.x === 0 && shape.y === 0 && shape.z === 0) origins++;
  }
  assert.ok(Math.abs(origins / samples - expectedOrigin) < 1 / samples);
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
  assert.deepEqual(base.generation, { k: 2, s: shape.sum, x: shape.x, y: shape.y, z: shape.z });
  assert.deepEqual(blessed.generation, base.generation);
  assert.deepEqual(blessed.cards, base.cards);
  assert.deepEqual(blessed.editions, base.editions);
});

test("regional distance means match the chosen square-root spread", () => {
  for (const [region, expected] of [[1, 1.8766441344112121], [3, 3.0750308649403864], [7, 4.751383293438747]]) {
    const mean = regionDeckShapeDistribution(region).reduce((sum, { shape, probability }) =>
      sum + probability * Math.hypot(shape.x, shape.y, shape.z), 0);
    assert.ok(Math.abs(mean - expected) < 1e-10, `region ${region}: ${mean}`);
  }
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

test("independent filler slots can all pick the same kind without bag quotas", () => {
  for (const [roll, kind] of [[.125, "empty"], [.375, "starter"], [.625, "basic"], [.875, "special"]]) {
    const shapeRolls = [0, 0, 0, .999]; // Choose (-1,-1,-1), no rare slots or editions.
    const deck = createRegionDeck(1, 200, 0, () => shapeRolls.length ? shapeRolls.shift() : roll);
    assert.equal(deck.capacity, 20);
    assert.equal(deck.rareSlotCapacity, 0);
    assert.equal(deck.cards.length, kind === "empty" ? 0 : 20);
    assert.ok(deck.cards.every(card => card.rarity === kind));
  }
});

test("generated filler slots give empty, starter, basic, special equal shares", () => {
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
  for (const [kind, share] of Object.entries({ empty: .25, starter: .25, basic: .25, special: .25 })) {
    assert.ok(Math.abs(counts[kind] / slots - share) < .015, `${kind}: ${counts[kind] / slots}`);
  }
});

test("starter and basic slots can independently draw every type and repeat it", () => {
  for (const [kindRoll, pool] of [[.375, STARTER_CARD_POOL], [.625, BASIC_CARD_POOL]]) {
    const draws = Array.from({ length: 20 }, (_, index) => index % pool.length);
    const rolls = [0, 0, 0, .999, ...draws.flatMap(index => [kindRoll, (index + .5) / pool.length])];
    const deck = createRegionDeck(1, 200, 0, () => {
      assert.ok(rolls.length > 0, "each slot uses one independent kind and card draw");
      return rolls.shift();
    });
    assert.deepEqual(deck.cards.map(card => card.name), draws.map(index => pool[index].name));
    assert.equal(rolls.length, 0);
    assert.equal(new Set(deck.cards.map(card => card.name)).size, pool.length);
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
  assert.equal(reward.cards.length, 2);
  assert.ok(reward.cards.every(card => card.sticker && card.rarity === "rare"));
  assert.deepEqual(reward.consumableTypes, []);
});
