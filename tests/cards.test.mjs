import assert from "node:assert/strict";
import test from "node:test";

import {
  ALL_CARD_BLUEPRINTS,
  BASIC_CARD_POOL,
  LEGENDARY_CARD_POOL,
  RARE_CARD_POOL,
  SPECIAL_CARD_POOL,
  STARTER_CARD_POOL,
  createAdrenalineCard,
  createRadianceCard,
  cardGivesMagicDefense,
  cardGivesPhysicalDefense,
  isAttackCard,
} from "../app/game/cards.ts";
import { getCardKeywordInfos } from "../app/game/cardEffects.ts";

test("card pools preserve the current content counts", () => {
  assert.equal(STARTER_CARD_POOL.length, 3);
  assert.equal(BASIC_CARD_POOL.length, 6);
  assert.equal(SPECIAL_CARD_POOL.length, 34);
  assert.equal(RARE_CARD_POOL.length, 15);
  assert.equal(LEGENDARY_CARD_POOL.length, 6);
  assert.equal(ALL_CARD_BLUEPRINTS.length, 65);
});

test("special card pool contains the updated cards and excludes sharpen cards", () => {
  const card = (name) => SPECIAL_CARD_POOL.find((item) => item.name === name);
  const fourHit = card("5연격");
  const backstep = card("백스텝");
  const silverSword = card("은검");

  assert.equal(fourHit?.value, 2);
  assert.equal(backstep?.cost, 0);
  assert.equal(backstep?.value, 5);
  assert.equal(cardGivesPhysicalDefense(backstep), true);
  assert.deepEqual(
    silverSword && { cost: silverSword.cost, value: silverSword.value, rarity: silverSword.rarity },
    { cost: 1, value: 12, rarity: "special" },
  );
  assert.equal(isAttackCard(silverSword), true);
  assert.equal(cardGivesMagicDefense(silverSword), true);
  assert.equal(card("불티"), undefined);
  assert.equal(card("잔바위"), undefined);
  assert.equal(SPECIAL_CARD_POOL.some((item) => ["무기 연마", "방어구 연마"].includes(item.name)), false);
});

test("radiance is treated as an attack card", () => {
  assert.equal(isAttackCard(createRadianceCard(100)), true);
});

test("new rare cards and the discard keyword carry their intended rules", () => {
  const evolutionTheory = RARE_CARD_POOL.find((card) => card.name === "진화론");
  assert.deepEqual(
    evolutionTheory && { cost: evolutionTheory.cost, rarity: evolutionTheory.rarity, rule: evolutionTheory.rule, exhaust: evolutionTheory.exhaust },
    { cost: 2, rarity: "rare", rule: true, exhaust: true },
  );
  const book = RARE_CARD_POOL.find((card) => card.name === "책 펼치기");
  assert.deepEqual(
    book && { cost: book.cost, rarity: book.rarity, effect: book.effect },
    { cost: 1, rarity: "rare", effect: "drawEachPile" },
  );
  const decision = SPECIAL_CARD_POOL.find((card) => card.name === "과감한 결단");
  const discardKeyword = decision && getCardKeywordInfos({ ...decision, id: 1, revealed: true })
    .find((keyword) => keyword.name === "버리기 X");
  assert.match(discardKeyword?.description ?? "", /손패에 버릴 카드가 X장보다 적으면 사용할 수 없습니다/);
});

test("current card data keeps key balance values and removed systems absent", () => {
  assert.equal(BASIC_CARD_POOL.find((card) => card.name === "자와 컴퍼스")?.value, 6);
  assert.equal(BASIC_CARD_POOL.find((card) => card.name === "별의 장막")?.value, 10);
  const combatManual = BASIC_CARD_POOL.find((card) => card.name === "전투 교본");
  assert.equal(combatManual?.rarity, "basic");
  assert.equal(combatManual?.value, 2);
  assert.equal(SPECIAL_CARD_POOL.some((card) => card.name === "전투 교본"), false);
  assert.deepEqual(
    STARTER_CARD_POOL.map(({ name, cost, value }) => ({ name, cost, value })),
    [
      { name: "타격", cost: 1, value: 6 },
      { name: "방어", cost: 1, value: 5 },
      { name: "마법 방어", cost: 1, value: 5 },
    ],
  );
  assert.equal(SPECIAL_CARD_POOL.find((card) => card.name === "별의 방주")?.value, 10);
  assert.deepEqual(
    SPECIAL_CARD_POOL.find((card) => card.name === "과감한 결단") && (() => {
      const card = SPECIAL_CARD_POOL.find((item) => item.name === "과감한 결단");
      return { cost: card.cost, value: card.value, rarity: card.rarity, discardCost: card.discardCost, discardEnergyGain: card.discardEnergyGain };
    })(),
    { cost: 0, value: 2, rarity: "special", discardCost: 2, discardEnergyGain: 2 },
  );
  const quickStep = SPECIAL_CARD_POOL.find((card) => card.name === "퀵스텝");
  assert.deepEqual(
    quickStep && { cost: quickStep.cost, rarity: quickStep.rarity, draw: quickStep.draw },
    { cost: 1, rarity: "special", draw: 2 },
  );
  assert.equal(SPECIAL_CARD_POOL.some((card) => card.name === "흑요석 단검"), false);
  const obsidianDagger = RARE_CARD_POOL.find((card) => card.name === "흑요석 단검");
  assert.deepEqual(
    obsidianDagger && {
      effect: obsidianDagger.effect,
      rarity: obsidianDagger.rarity,
      cost: obsidianDagger.cost,
      value: obsidianDagger.value,
    },
    { effect: "obsidianDagger", rarity: "rare", cost: 2, value: 1 },
  );
  assert.equal(RARE_CARD_POOL.find((card) => card.name === "초신성")?.value, 3);
  const oldCore = SPECIAL_CARD_POOL.find((card) => card.name === "낡은 노심");
  assert.equal(oldCore?.cost, 1);
  assert.equal(oldCore?.exhaust, undefined);
  assert.equal(RARE_CARD_POOL.find((card) => card.name === "유성우")?.value, 9);
  assert.deepEqual(
    SPECIAL_CARD_POOL.filter((card) => ["빛무리", "대형 프리즘", "성운"].includes(card.name)).map(({ name, cost, value }) => ({ name, cost, value })),
    [
      { name: "빛무리", cost: 0, value: 1 },
      { name: "대형 프리즘", cost: 3, value: 3 },
      { name: "성운", cost: 1, value: 2 },
    ],
  );
  assert.deepEqual(
    RARE_CARD_POOL.filter((card) => ["경제학 연구", "법학 연구", "광학 연구"].includes(card.name)).map(({ name, cost, rule }) => ({ name, cost, rule })),
    [
      { name: "법학 연구", cost: 0, rule: true },
      { name: "경제학 연구", cost: 2, rule: true },
      { name: "광학 연구", cost: 0, rule: true },
    ],
  );
  assert.equal(RARE_CARD_POOL.find((card) => card.name === "연사")?.cost, 1);
  assert.equal(RARE_CARD_POOL.some((card) => card.name === "강철심장"), false);
  assert.equal(RARE_CARD_POOL.find((card) => card.name === "연사")?.exhaust, true);
  assert.equal(RARE_CARD_POOL.find((card) => card.name === "견고한 태세")?.cost, 2);
  assert.equal(RARE_CARD_POOL.find((card) => card.name === "견고한 태세")?.value, 10);
  assert.equal(createAdrenalineCard().value, 2);
  const radiance = createRadianceCard(99);
  assert.deepEqual(
    { name: radiance.name, cost: radiance.cost, value: radiance.value, token: radiance.token },
    { name: "광채", cost: 0, value: 4, token: true },
  );
  assert.equal(RARE_CARD_POOL.find((card) => card.name === "오딘의 창")?.value, 40);
  assert.deepEqual(
    RARE_CARD_POOL.filter((card) => ["광행시간"].includes(card.name))
      .map(({ name, cost, value }) => ({ name, cost, value })),
    [
      { name: "광행시간", cost: 1, value: 3 },
    ],
  );
  assert.deepEqual(
    SPECIAL_CARD_POOL.filter((card) => ["늑대 부적", "거북이 부적"].includes(card.name))
      .map(({ name, rarity }) => ({ name, rarity })),
    [
      { name: "늑대 부적", rarity: "special" },
      { name: "거북이 부적", rarity: "special" },
    ],
  );
  assert.equal(ALL_CARD_BLUEPRINTS.some((card) => card.name === "발광"), false);
});
