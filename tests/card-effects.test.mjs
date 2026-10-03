import assert from "node:assert/strict";
import test from "node:test";

import { RARE_CARD_POOL, SPECIAL_CARD_POOL, createMagicCrystalCard } from "../app/game/cards.ts";
import { getCardKeywordInfos } from "../app/game/cardEffects.ts";
import { calculateDefenseGain, getDefenseBaseValue } from "../app/game/defenseRules.ts";
import { cardCostAfterForgePlacement, obsidianDaggerForgesRemaining } from "../app/game/forgeRules.ts";

test("forging old core preserves its one energy cost and no exhaust", () => {
  const oldCore = SPECIAL_CARD_POOL.find((card) => card.name === "낡은 노심");
  assert.ok(oldCore);
  assert.equal(cardCostAfterForgePlacement(oldCore), 1);
  assert.equal(oldCore.exhaust, undefined);
});

test("obsidian dagger stays at three energy after every forge", () => {
  const dagger = RARE_CARD_POOL.find((card) => card.name === "흑요석 단검");
  assert.ok(dagger);
  assert.equal(cardCostAfterForgePlacement(dagger), 3);
  assert.equal(cardCostAfterForgePlacement({ ...dagger, forged: true }), 3);
  assert.equal(cardCostAfterForgePlacement({ ...dagger, forgeCostsCompleted: [1, 2, 3] }), 3);
});

test("obsidian dagger has exactly five forges", () => {
  assert.equal(obsidianDaggerForgesRemaining(0), 5);
  assert.equal(obsidianDaggerForgesRemaining(4), 1);
  assert.equal(obsidianDaggerForgesRemaining(5), 0);
  assert.equal(obsidianDaggerForgesRemaining(6), 0);
});

test("fixed defense gains add toughness before applying the defense multiplier", () => {
  const options = { agility: 3, defenseMultiplier: 2 };

  assert.equal(calculateDefenseGain({ effect: "defend", value: 5 }, options), 16);
  assert.equal(calculateDefenseGain({ effect: "iceShield", value: 11 }, options), 28);
  assert.equal(calculateDefenseGain({ effect: "waterWave", value: 5 }, options), 16);
});

test("iron wall no longer grants defense", () => {
  assert.equal(calculateDefenseGain({ effect: "ironWall", value: 2 }, { agility: 3, defenseMultiplier: 2 }), 0);
  assert.equal(getDefenseBaseValue({ effect: "ironWall", value: 2 }), 0);
});

test("fixed multi-purpose defense effects use the same calculation", () => {
  const options = { agility: 3, defenseMultiplier: 1 };

  assert.equal(calculateDefenseGain({ effect: "ironRampage", value: 8 }, options), 11);
  assert.equal(calculateDefenseGain({ effect: "starArk", value: 10 }, options), 13);
  assert.equal(calculateDefenseGain({ effect: "odinSpear", value: 40 }, options), 18);
});

test("cards without ordinary defense values stay at zero without a base override", () => {
  const options = { agility: 3, defenseMultiplier: 2 };

  assert.equal(calculateDefenseGain({ effect: "suppression", value: 15 }, options), 0);
  assert.equal(calculateDefenseGain({ effect: "sturdyStance", value: 0 }, options), 0);
});

test("sacrifice and rank spell tooltips keep the same explanation for every level", () => {
  const soulCollateralLoan = RARE_CARD_POOL.find((card) => card.name === "영혼담보대출");
  const sturdyStance = RARE_CARD_POOL.find((card) => card.name === "견고한 태세");
  assert.ok(soulCollateralLoan);
  assert.ok(sturdyStance);

  const sacrificeDescription = "손패에 제물이 X장 이상 있어야 사용할 수 있습니다. 사용 시 손패의 제물 X장을 소멸시킵니다.";
  const spellRankDescription = "손패에 X단계 이상의 마력 결정이 있어야 사용할 수 있습니다. 마력 결정은 소모되지 않습니다.";
  const sacrificeTooltip = { name: "희생 X", description: sacrificeDescription, preview: undefined };
  const spellRankTooltip = { name: "Lv.X 마법", description: spellRankDescription, preview: undefined };
  for (const ritualCost of [1, 2]) {
    assert.deepEqual(
      getCardKeywordInfos({ ...soulCollateralLoan, ritualCost }).find((keyword) => keyword.name === "희생 X"),
      sacrificeTooltip,
    );
  }
  for (const spellRank of [3, 4]) {
    assert.deepEqual(
      getCardKeywordInfos({ ...sturdyStance, spellRank }).find((keyword) => keyword.name === "Lv.X 마법"),
      spellRankTooltip,
    );
  }
  assert.equal(getCardKeywordInfos(createMagicCrystalCard(1, 2)).some((keyword) => keyword.name === "마력 결정"), true);
});

test("suppression uses the shared defense calculation with dealt damage as its base", () => {
  assert.equal(calculateDefenseGain(
    { effect: "suppression", value: 15 },
    { baseValue: 10, agility: 3, defenseMultiplier: 2 },
  ), 26);
  assert.equal(calculateDefenseGain(
    { effect: "suppression", value: 15 },
    { baseValue: 0, agility: 3, defenseMultiplier: 2 },
  ), 6);
});
