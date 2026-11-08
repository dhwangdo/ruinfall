import assert from "node:assert/strict";
import test from "node:test";
import { createAutoExploreProgress, findAutoExploreRoute } from "../app/game/mapAutoExplore.ts";
import { collectMapGoldPile } from "../app/game/mapGold.ts";

const line = length => new Set(Array.from({ length }, (_, x) => `${x}:0`));
const view = { bounds: { minX: 0, maxX: 6, minY: 0, maxY: 0 }, horizontalRadius: 1, verticalRadius: 0 };

test("O collects safe gold after surveying the whole map and leaves dangerous gold alone", () => {
  const known = line(7);
  const progress = createAutoExploreProgress();
  progress.surveyedRooms = new Set(known);
  const blockedRooms = new Set(["3:0"]);
  let goldPiles = { "2:0": 7, "5:0": 19 };
  let position = { x: 0, y: 0 };
  let gained = 0;
  let steps = 0;
  while (true) {
    const route = findAutoExploreRoute(position, known, () => "empty", { ...view, progress, blockedRooms, goldPiles });
    if (!route) break;
    assert.ok(++steps <= 6);
    position = route[1];
    assert.equal(blockedRooms.has(`${position.x}:0`), false);
    const picked = collectMapGoldPile(goldPiles, `${position.x}:0`);
    gained += picked.amount;
    goldPiles = picked.piles;
  }
  assert.equal(gained, 7);
  assert.equal(goldPiles["2:0"], 0);
  assert.equal(goldPiles["5:0"], 19);
  assert.equal(progress.stopReason, "blocked");
  assert.equal(findAutoExploreRoute(position, known, () => "empty", {
    ...view, progress: createAutoExploreProgress(), blockedRooms, goldPiles,
  }), null);
});

test("a gold target remains useful when all of its surrounding terrain is already visible", () => {
  const known = line(7);
  const progress = createAutoExploreProgress();
  const goldPiles = { "5:0": 11 };
  const route = findAutoExploreRoute({ x: 0, y: 0 }, known, () => "empty", { ...view, progress, goldPiles });
  assert.deepEqual(route.at(-1), { x: 5, y: 0 });
  assert.deepEqual(findAutoExploreRoute(route[1], known, () => "empty", { ...view, progress, goldPiles }), route.slice(1));
  assert.equal(findAutoExploreRoute(route[1], known, () => "empty", {
    ...view, progress, goldPiles: { "5:0": 0 },
  }), null);
  assert.equal(progress.stopReason, "complete");
});

test("hidden gold never influences exploration even if already materialized", () => {
  const known = line(3);
  const goldPiles = new Proxy({ "6:0": 9999 }, {
    get(target, key) {
      assert.ok(known.has(key), `planner consulted gold in unseen cell ${String(key)}`);
      return target[key];
    },
  });
  const planned = findAutoExploreRoute({ x: 0, y: 0 }, known, () => "empty", { ...view, goldPiles });
  const ordinary = findAutoExploreRoute({ x: 0, y: 0 }, known, () => "empty", view);
  assert.deepEqual(planned, ordinary);
});

test("safe gold is collected via a detour without crossing an unsafe tile", () => {
  const known = new Set();
  for (let y = 0; y <= 2; y += 1) for (let x = 0; x <= 4; x += 1) known.add(`${x}:${y}`);
  const blockedRooms = new Set(["2:1"]);
  const route = findAutoExploreRoute({ x: 0, y: 1 }, known, () => "empty", {
    bounds: { minX: 0, maxX: 4, minY: 0, maxY: 2 }, blockedRooms, goldPiles: { "4:1": 10 },
  });
  assert.deepEqual(route.at(-1), { x: 4, y: 1 });
  assert.ok(route.every(p => known.has(`${p.x}:${p.y}`) && !blockedRooms.has(`${p.x}:${p.y}`)));
});
