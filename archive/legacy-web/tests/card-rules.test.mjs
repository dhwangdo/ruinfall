import assert from "node:assert/strict";
import test from "node:test";

import { cardsForNextShuffle, dealCardsToFixedPiles } from "../app/game/cardRules.ts";

test("token cards never enter the next shuffle", () => {
  const cards = [
    { id: 1, name: "normal" },
    { id: 2, name: "token", token: true },
    { id: 3, name: "removed" },
    { id: 4, name: "still in play" },
  ];

  assert.deepEqual(
    cardsForNextShuffle(cards, new Set([3]), new Set([4])).map((card) => card.id),
    [1],
  );
});

test("reshuffle keeps the existing pile count and deals from the left", () => {
  const cards = Array.from({ length: 12 }, (_, id) => ({ id }));
  const piles = dealCardsToFixedPiles(cards, 4, 5);

  assert.equal(piles.length, 4);
  assert.deepEqual(piles.map((pile) => pile.map((card) => card.id)), [
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11],
    [],
  ]);
});
