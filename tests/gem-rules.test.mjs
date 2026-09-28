import assert from "node:assert/strict";
import test from "node:test";

import {
  GEM_FORMULAS,
  attachBattleGems,
  canPayGemFormula,
  gemFormulasConflict,
  instantiateCardBlueprint,
  pileContainsGemFormula,
  removeConsumedGems,
} from "../app/game/gemRules.ts";

const card = (id, fields = {}) => ({
  id,
  revealed: true,
  kind: "strike",
  effect: "strike",
  rarity: "basic",
  name: `카드 ${id}`,
  cost: 1,
  value: 1,
  draw: 0,
  damageType: "physical",
  ...fields,
});

test("gem formula pools have the designed sizes and no repeated color", () => {
  assert.deepEqual([GEM_FORMULAS[1].length, GEM_FORMULAS[2].length, GEM_FORMULAS[3].length], [5, 10, 20]);
  for (const size of [1, 2, 3]) {
    for (const formula of GEM_FORMULAS[size]) {
      assert.equal(formula.length, size);
      assert.equal(new Set(formula).size, size);
    }
  }
});

test("deck conflict ignores order and rejects subset formulas", () => {
  assert.equal(gemFormulasConflict(["red"], ["blue", "red"]), true);
  assert.equal(gemFormulasConflict(["red", "blue"], ["blue", "red"]), true);
  assert.equal(gemFormulasConflict(["red", "blue"], ["green", "white"]), false);
});

test("battle gems use unique required colors and only non-gem carriers", () => {
  const deck = [
    card(1, { gemRequirementSize: 3, gemFormula: ["red", "green", "blue"] }),
    card(2),
    card(3),
  ];
  const result = attachBattleGems(deck, () => 0);
  assert.equal(result[0].attachedGem, undefined);
  assert.equal(result.filter((item) => item.attachedGem).length, 2);
  assert.equal(new Set(result.flatMap((item) => item.attachedGem ? [item.attachedGem] : [])).size, 2);
});

test("pile formula matching preserves gem order while ignoring ordinary cards", () => {
  const pile = [
    card(1, { attachedGem: "red" }),
    card(2),
    card(3, { attachedGem: "blue" }),
    card(4),
    card(5, { attachedGem: "green" }),
  ];
  assert.equal(pileContainsGemFormula(pile, ["red", "blue", "green"]), true);
  assert.equal(pileContainsGemFormula(pile, ["red", "green", "blue"]), false);
});

test("direct payment sees hand and piles, then removes only gem markers", () => {
  const hand = [card(1, { attachedGem: "red" })];
  const piles = [[card(2, { attachedGem: "blue" })]];
  assert.equal(canPayGemFormula(["red", "blue"], hand, piles), true);
  const consumed = removeConsumedGems(hand, new Set(["red"]));
  assert.equal(consumed.length, 1);
  assert.equal(consumed[0].id, 1);
  assert.equal(consumed[0].attachedGem, undefined);
});

test("a generated gem card receives a concrete formula", () => {
  const generated = instantiateCardBlueprint({
    kind: "rule",
    effect: "economicsResearch",
    rarity: "rare",
    name: "경제학 연구",
    cost: 3,
    value: 5,
    draw: 0,
    damageType: "none",
    gemRequirementSize: 3,
  }, 10, false, () => 0);
  assert.deepEqual(generated.gemFormula, ["white", "blue", "black"]);
});
