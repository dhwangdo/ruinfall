import assert from "node:assert/strict";
import test from "node:test";

import { cardsForNextShuffle } from "../app/game/cardRules.ts";

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
