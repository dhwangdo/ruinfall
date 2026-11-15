import assert from "node:assert/strict";
import test from "node:test";
import { dealtState } from "../app/game/battleState.ts";
import { createStarterDeck } from "../app/game/rewards.ts";

test("battle starts with two base stars regardless of initial file count", (t) => {
  t.mock.method(Math, "random", () => 0.99);
  const deck = createStarterDeck();
  const ordinary = dealtState(50, deck.cards, [], []);
  const roomy = dealtState(50, deck.cards, [], ["roomy"]);
  assert.equal(ordinary.stars, 2);
  assert.equal(roomy.stars, 2);
  assert.equal(roomy.piles.length, ordinary.piles.length + 1);
});

test("turn-independent starting star editions still add their listed bonuses", (t) => {
  t.mock.method(Math, "random", () => 0.99);
  const deck = createStarterDeck();
  const game = dealtState(50, deck.cards, [], ["fantastic", "roomy", "starPlus"]);
  assert.equal(game.stars, 3);
});
