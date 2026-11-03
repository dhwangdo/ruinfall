import assert from "node:assert/strict";
import test from "node:test";
import { ALL_CARD_BLUEPRINTS, createFermentedSlimeCard } from "../app/game/cards.ts";
import { canForgeCardOnto, canPlaceBySolitaireRule, getCardKeywordInfos } from "../app/game/cardEffects.ts";
import { getCardMechanicExamples } from "../app/components/cardMechanicExamples.ts";

const cards = ALL_CARD_BLUEPRINTS.map((card, index) => ({ ...card, id: index }));

test("only forge and star keywords create animation examples", () => {
  for (const card of [...cards, createFermentedSlimeCard(999)]) {
    const supported = !["metallurgyResearch", "odinSpear"].includes(card.effect)
      && getCardKeywordInfos(card).some(keyword => keyword.name === "재련" || keyword.name === "★");
    const examples = getCardMechanicExamples(card);
    assert.equal(examples.length > 0, supported, card.name);
    assert.ok(examples.every(example => example.kind === "forge" || example.kind === "star"));
  }
});

test("every demonstrated forge uses real cards and a legally matching target", () => {
  for (const card of cards) {
    for (const example of getCardMechanicExamples(card).filter(example => example.kind === "forge")) {
      assert.ok(ALL_CARD_BLUEPRINTS.some(candidate => candidate.name === example.moving.name));
      assert.ok(canPlaceBySolitaireRule(example.moving, example.right), card.name);
      assert.ok(canForgeCardOnto(example.moving, example.right), card.name);
      assert.equal(example.result.forged, true);
      assert.equal(example.result.id, example.moving.id);
    }
  }
});

test("star examples can move from hand to the first pile and from that pile to the second", () => {
  for (const card of cards) {
    for (const example of getCardMechanicExamples(card).filter(example => example.kind === "star")) {
      assert.equal(example.moving.name, "타격");
      assert.equal(example.moving.effect, "strike");
      for (const target of [example.left, example.middle, example.right]) {
        assert.ok(canPlaceBySolitaireRule(example.moving, target), card.name);
        assert.equal(canForgeCardOnto(example.moving, target), false, card.name);
      }
    }
  }
});

test("forge observers show the keyword explanation without an animation; the dagger consumes its target", () => {
  for (const effect of ["odinSpear", "metallurgyResearch"]) {
    const card = cards.find(card => card.effect === effect);
    assert.ok(getCardKeywordInfos(card).some(keyword => keyword.name === "재련"));
    assert.deepEqual(getCardMechanicExamples(card), []);
  }
  const dagger = getCardMechanicExamples(cards.find(card => card.effect === "obsidianDagger"))[0];
  assert.equal(dagger.consumesTarget, true);
  assert.equal(dagger.result.value, dagger.moving.value + dagger.right.value);
  assert.deepEqual(dagger.result.forgeCostsCompleted, [1]);
});

test("exchange alloy demonstrates both cards swapping their costs", () => {
  const example = getCardMechanicExamples(cards.find(card => card.effect === "exchange"))[0];
  assert.notEqual(example.moving.cost, example.right.cost);
  assert.equal(example.result.cost, example.right.cost);
  assert.equal(example.targetResult.cost, example.moving.cost);
  assert.equal(example.targetResult.baseCost, example.right.cost);
});
