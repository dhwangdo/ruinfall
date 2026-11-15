import assert from "node:assert/strict";
import test from "node:test";
import { createAutoExploreBlockedRooms, createRememberedAutoExploreBlockedRooms,
  createAutoExploreProgress, findAutoExploreRoute } from "../app/game/mapAutoExplore.ts";
import { forgetEnemyCellMemory, rememberedMapEnemies, updateEnemyCellMemory } from "../app/game/mapEnemies.ts";
import { createMapEnemyWorldForPositions, DUNGEON_MIN_X, DUNGEON_MAX_X, REGION_HEIGHT, ROCK_BARRIER_HEIGHT,
  MAP_START, getRoomType, isSafeAreaPosition, mapRoomKey, visibleMapRoomKeys } from "../app/game/mapRules.ts";
import { prepareRunRestore } from "../app/game/runSaveState.ts";
import { collectMapGoldPile, createMapGoldPilesForPositions } from "../app/game/mapGold.ts";

const sleeper = { id: "sleeper", encounterIndex: 1, position: { x: 5, y: 0 }, awareness: "sleeping" };
const bounds = { minX: 0, maxX: 12, minY: 0, maxY: 0 };
const known = new Set(Array.from({ length: 12 }, (_, x) => `${x}:0`));
function routeFromMemory(memory) {
  const progress = createAutoExploreProgress();
  const blockedRooms = createAutoExploreBlockedRooms(rememberedMapEnemies(memory), known, () => "empty");
  const route = findAutoExploreRoute({ x: 1, y: 0 }, known, () => "empty",
    { progress, blockedRooms, bounds, horizontalRadius: 1, verticalRadius: 0 });
  return { route, reason: progress.stopReason };
}

test("hidden movement and awareness changes cannot overwrite the last observation", () => {
  const memory = updateEnemyCellMemory({}, [sleeper], new Set(["5:0"]));
  const hidden = { ...sleeper, awareness: "alerted", position: { x: 20, y: 10 } };
  const retained = updateEnemyCellMemory(memory, [hidden], new Set(["1:0"]));
  assert.deepEqual(rememberedMapEnemies(retained), [sleeper]);
  assert.deepEqual(routeFromMemory(retained), { route: null, reason: "blocked" });
});

test("reobserving a moved enemy replaces its old position and reopens the next O route", () => {
  const memory = updateEnemyCellMemory({}, [sleeper], new Set(["5:0"]));
  const hidden = { ...sleeper, position: { x: 15, y: 10 } };
  const retained = updateEnemyCellMemory(memory, [hidden], new Set(["1:0"]));
  const moved = { ...sleeper, awareness: "awake", position: { x: 20, y: 10 } };
  const observed = updateEnemyCellMemory(retained, [moved], new Set(["20:10"]), [hidden]);
  assert.equal(observed["5:0"], undefined);
  assert.deepEqual(rememberedMapEnemies(observed), [moved]);
  assert.deepEqual(routeFromMemory(observed).route.at(-1), { x: 11, y: 0 });
});

test("an observed empty cell and a confirmed defeat both release remembered danger", () => {
  const memory = updateEnemyCellMemory({}, [sleeper], new Set(["5:0"]));
  const emptyCell = updateEnemyCellMemory(memory, [], new Set(["5:0"]));
  const defeated = forgetEnemyCellMemory(memory, [sleeper.id]);
  for (const cleared of [emptyCell, defeated]) {
    assert.deepEqual(cleared, {});
    assert.deepEqual(routeFromMemory(cleared).route.at(-1), { x: 11, y: 0 });
  }
  assert.ok(memory["5:0"], "updates must not mutate a saved observation");
});

test("saved boss and permanent-sleep observations only block their occupied tile", () => {
  for (const flags of [{ isBoss: true }, { permanentSleep: true }]) {
    const observed = updateEnemyCellMemory({}, [{ ...sleeper, ...flags }], new Set(["5:0"]));
    const restored = prepareRunRestore(JSON.parse(JSON.stringify({ mapPosition: MAP_START, mapSeed: 7,
      blessings: [], mapEnemyCellMemory: observed })), () => false);
    assert.deepEqual(restored.mapEnemyCellMemory, observed);
    const blocked = createAutoExploreBlockedRooms(rememberedMapEnemies(restored.mapEnemyCellMemory), known, () => "empty");
    assert.deepEqual([...blocked], ["5:0"]);
  }
});

test("a remembered enemy does not turn a fully revealed map into partial exploration", () => {
  const progress = createAutoExploreProgress();
  const allKnown = new Set([...known, "12:0"]);
  const memory = updateEnemyCellMemory({}, [sleeper], new Set(["5:0"]));
  assert.equal(findAutoExploreRoute({ x: 1, y: 0 }, allKnown, () => "empty", { progress, bounds,
    blockedRooms: createAutoExploreBlockedRooms(rememberedMapEnemies(memory), allKnown, () => "empty"),
    horizontalRadius: 1, verticalRadius: 0 }), null);
  assert.equal(progress.stopReason, "complete");
});

test("newly discovered walls shrink remembered reach without forgetting the enemy", () => {
  const enemy = { ...sleeper, position: { x: 0, y: 0 } };
  const memory = updateEnemyCellMemory({}, [enemy], new Set(["0:0"]));
  const known = new Set(["0:0"]);
  const progress = createAutoExploreProgress();
  const terrain = p => p.x === 1 ? "rock" : "empty";
  assert.equal(createRememberedAutoExploreBlockedRooms(memory, known, terrain, progress).has("2:0"), true);
  for (let y = -2; y <= 2; y += 1) known.add(`1:${y}`);
  assert.equal(createRememberedAutoExploreBlockedRooms(memory, known, terrain, progress).has("2:0"), false);
  assert.equal(progress.threatHistory.size, 1);
  assert.equal(createRememberedAutoExploreBlockedRooms(forgetEnemyCellMemory(memory, [enemy.id]),
    known, terrain, progress).size, 0);
  assert.equal(progress.threatHistory.size, 0);
});

test("repeating O after a safe generated-region survey takes zero redundant steps, including after restore", () => {
  for (const seed of [1, 7]) {
    const regionBounds = { minX: DUNGEON_MIN_X, maxX: DUNGEON_MAX_X,
      minY: -ROCK_BARRIER_HEIGHT, maxY: REGION_HEIGHT - 1 };
    const cells = [];
    for (let y = 0; y < REGION_HEIGHT; y += 1) {
      for (let x = DUNGEON_MIN_X; x <= DUNGEON_MAX_X; x += 1) cells.push({ x, y });
    }
    const enemies = createMapEnemyWorldForPositions(seed, cells).enemies
      .filter(enemy => !enemy.isBoss).map(enemy => ({ ...enemy, awareness: "sleeping" }));
    let goldPiles = createMapGoldPilesForPositions(seed, cells);
    const views = new Map();
    const visibleAt = position => {
      const key = mapRoomKey(position);
      if (!views.has(key)) views.set(key, visibleMapRoomKeys(position, seed));
      return views.get(key);
    };
    const terrain = position => getRoomType(position, seed);
    let position = { ...MAP_START };
    const explored = new Set(visibleAt(position));
    let memory = {};
    for (let run = 0; run < 3; run += 1) {
      const progress = createAutoExploreProgress();
      const before = explored.size;
      let steps = 0;
      while (true) {
        memory = updateEnemyCellMemory(memory, enemies, visibleAt(position));
        const blockedRooms = createRememberedAutoExploreBlockedRooms(memory, explored,
          terrain, progress, 0, cell => !isSafeAreaPosition(cell, seed));
        const route = findAutoExploreRoute(position, explored, terrain, { progress, blockedRooms, goldPiles, bounds: regionBounds });
        if (!route) break;
        assert.ok(++steps < 2000, "exploration must finish on this finite region");
        position = route[1];
        assert.ok(explored.has(mapRoomKey(position)));
        assert.equal(blockedRooms.has(mapRoomKey(position)), false);
        goldPiles = collectMapGoldPile(goldPiles, mapRoomKey(position)).piles;
        visibleAt(position).forEach(key => explored.add(key));
      }
      assert.equal(progress.stopReason, "blocked");
      if (run === 0) assert.ok(steps > 0);
      else {
        assert.equal(steps, 0, `seed ${seed}, O press ${run + 1} repeated the completed survey`);
        assert.equal(explored.size, before);
      }
      memory = prepareRunRestore(JSON.parse(JSON.stringify({ mapPosition: position, mapSeed: seed,
        blessings: [], mapEnemyCellMemory: memory })), () => false).mapEnemyCellMemory;
    }
  }
});
