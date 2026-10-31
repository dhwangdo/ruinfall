import assert from "node:assert/strict";
import test from "node:test";
import { getRoomType, regionStartY, REGION_HEIGHT, DUNGEON_MIN_X, DUNGEON_MAX_X } from "../app/game/mapRules.ts";
import { advanceMapEnemies } from "../app/game/mapEnemies.ts";

test("terrain remains deterministic after other seeds evict its cache", () => {
  const positions = Array.from({ length: 120 }, (_, index) => ({ x: index - 60, y: index % 15 }));
  const original = positions.map((position) => getRoomType(position, 173));
  for (const seed of [291, 418, 173]) {
    const actual = positions.map((position) => getRoomType(position, seed));
    if (seed === 173) assert.deepEqual(actual, original);
    else assert.notDeepEqual(actual, original);
  }
});

test("every region keeps at least one portal, including after cache eviction", () => {
  for (const seed of [173, 291, 418, 173]) {
    for (let region = 0; region < 7; region++) {
      const y = regionStartY(region) + REGION_HEIGHT - 1;
      const portals = Array.from({ length: DUNGEON_MAX_X - DUNGEON_MIN_X + 1 }, (_, index) => DUNGEON_MIN_X + index)
        .filter((x) => getRoomType({ x, y }, seed) === "portal");
      assert.ok(portals.length > 0, `region ${region}, seed ${seed}`);
    }
  }
});

test("inactive enemies skip pathfinding while boss collisions are preserved", () => {
  const enemies = [
    { id: "boss", position: { x: 0, y: 0 }, isBoss: true, awareness: "alerted", encounterIndex: 1 },
    { id: "far", position: { x: 30, y: 0 }, awareness: "awake", encounterIndex: 1 },
  ];
  const result = advanceMapEnemies(enemies, { x: 0, y: 0 }, { x: 0, y: 0 }, () => {
    throw new Error("pathfinding should not run without active movable enemies");
  });
  assert.deepEqual(result.enemies, enemies);
  assert.deepEqual(result.collisionEnemyIds, ["boss"]);
});
