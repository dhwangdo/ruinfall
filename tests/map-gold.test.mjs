import assert from "node:assert/strict";
import test from "node:test";

import {
  DUNGEON_MIN_X,
  MAP_COLUMNS,
  getGeneratedDungeonRegion,
  getRoomType,
  isMainDungeonFloor,
  mapRoomKey,
  parseMapRoomKey,
  regionStartY,
} from "../app/game/mapRules.ts";
import {
  collectMapGoldPile,
  createMapGoldPilesForPositions,
  REGION_GOLD_PILES_PER_DECK_VAULT,
  REGION_GOLD_TOTAL,
} from "../app/game/mapGold.ts";

test("each region has three gold piles per deck vault and a 1,000 gold total", () => {
  for (const [seed, regionIndex] of [[7, 0], [20261108, 2], [20261108, 6]]) {
    const layout = getGeneratedDungeonRegion(seed, regionIndex);
    const positions = Array.from({ length: layout.main.length }, (_, index) => ({
      x: DUNGEON_MIN_X + index % MAP_COLUMNS,
      y: regionStartY(regionIndex) + Math.floor(index / MAP_COLUMNS),
    }));
    const piles = createMapGoldPilesForPositions(seed, positions);
    const prefabDeckVaultCount = [...layout.landmarks.values()].filter(landmark => landmark === "deckVault").length;
    const expectedCount = (layout.locationCounts.deckVault + prefabDeckVaultCount) * REGION_GOLD_PILES_PER_DECK_VAULT;
    const entries = Object.entries(piles);
    const amounts = entries.map(([, amount]) => amount);

    assert.equal(entries.length, expectedCount);
    assert.equal(entries.reduce((sum, [, amount]) => sum + amount, 0), REGION_GOLD_TOTAL);
    for (const [key, amount] of entries) {
      const position = parseMapRoomKey(key);
      assert.equal(isMainDungeonFloor(position, seed), true);
      assert.equal(getRoomType(position, seed), "empty");
      assert.ok(amount > 0);
    }
    assert.ok(Math.min(...amounts) <= 6);
    assert.ok(Math.max(...amounts) >= 14);
    assert.ok(Math.max(...amounts) - Math.min(...amounts) >= 10);
    assert.deepEqual(createMapGoldPilesForPositions(seed, positions), piles);

    const evenColumns = positions.filter(position => position.x % 2 === 0);
    const partial = createMapGoldPilesForPositions(seed, evenColumns);
    const expectedPartial = Object.fromEntries(entries.filter(([key]) => parseMapRoomKey(key).x % 2 === 0));
    assert.deepEqual(partial, expectedPartial);
  }
});

test("collecting a floor pile grants it once and saves a zero-value pickup marker", () => {
  const key = mapRoomKey({ x: 3, y: 4 });
  const first = collectMapGoldPile({ [key]: 11 }, key);
  assert.equal(first.amount, 11);
  assert.equal(first.piles[key], 0);
  const second = collectMapGoldPile(first.piles, key);
  assert.equal(second.amount, 0);
  assert.equal(second.piles, first.piles);
});
