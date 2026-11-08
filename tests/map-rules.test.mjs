import assert from "node:assert/strict";
import test from "node:test";
import { getRoomType, regionStartY, REGION_HEIGHT, MAP_COLUMNS, DUNGEON_MIN_X, DUNGEON_MAX_X } from "../app/game/mapRules.ts";
import { SPECIAL_NODE_DEFINITION_WEIGHTS, TEMPORARILY_DISABLED_ROOM_TYPES, safeAreaCenterX, safeAreaCenterY, isMapEnemySpawnCell, createMapFloorDropsForPositions } from "../app/game/mapRules.ts";
import { advanceMapEnemies } from "../app/game/mapEnemies.ts";
import { getGeneratedDungeonRegion } from "../app/game/mapRules.ts";
import { REGION_LOCATION_COUNTS } from "../app/game/mapLocationPlacement.ts";
import { createMapEnemyWorldForPositions } from "../app/game/mapRules.ts";
import { getEncounterRegionNumber } from "../app/game/enemies.ts";

test("region proportions gain roughly half the height while keeping the same area", () => {
  assert.ok(Math.abs(REGION_HEIGHT / 31 - 1.5) < .02);
  assert.ok(Math.abs(MAP_COLUMNS / 321 - 2 / 3) < .01);
  assert.ok(Math.abs(MAP_COLUMNS * REGION_HEIGHT / (321 * 31) - 1) < .002);
  assert.equal(MAP_COLUMNS, DUNGEON_MAX_X - DUNGEON_MIN_X + 1);
});

test("every region start reserves its centered nine-by-nine square from enemy spawning", () => {
  for (let region = 0; region < 3; region++) {
    for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
      assert.equal(isMapEnemySpawnCell({ x, y: regionStartY(region) + y }, 173), false);
    }
    // The first row beyond the square still has eligible floor cells.
    assert.ok(Array.from({ length: 81 }, (_, index) => ({ x: index - 40, y: regionStartY(region) + 5 }))
      .some(position => isMapEnemySpawnCell(position, 173)));
  }
});

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
  let lowerHalf = 0, count = 0;
  for (const seed of [173, 291, 418, 173]) {
    for (let region = 0; region < 7; region++) {
      const y = regionStartY(region) + REGION_HEIGHT - 1;
      const map = getGeneratedDungeonRegion(seed, region);
      const portals = [...map.landmarks]
        .filter(([, kind]) => kind === "portal").map(([index]) => ({
          x: index % MAP_COLUMNS + DUNGEON_MIN_X, y: regionStartY(region) + Math.floor(index / MAP_COLUMNS),
        }));
      assert.ok(portals.length > 0, `region ${region}, seed ${seed}`);
      assert.equal(portals.length, map.locationCounts.portal);
      assert.ok(portals.length >= 14 && portals.length <= 18);
      assert.ok(portals.some(position => position.y < y), "portals are not confined to the last row");
      for (const position of portals) {
        assert.equal(getRoomType(position, seed), "portal");
        if (position.y - regionStartY(region) >= REGION_HEIGHT / 2) lowerHalf++;
        count++;
      }
    }
  }
  assert.ok(lowerHalf / count > .7, "portals favor the lower half");
});

test("future-region encounters do not spawn", () => {
  const positions = Array.from({ length: MAP_COLUMNS * REGION_HEIGHT }, (_, index) => ({
    x: index % MAP_COLUMNS + DUNGEON_MIN_X, y: Math.floor(index / MAP_COLUMNS),
  }));
  const world = createMapEnemyWorldForPositions(173, positions);
  assert.ok(world.enemies.filter(enemy => !enemy.isBoss)
    .every(enemy => getEncounterRegionNumber(enemy.encounterIndex) <= 1));
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

test("ordinary location quotas replace chance rolls while paused definitions are retained", () => {
  assert.deepEqual(REGION_LOCATION_COUNTS, {
    deckVault: { min: 30, max: 35 }, shop: { min: 0, max: 0 },
    bloodShop: { min: 0, max: 0 }, portal: { min: 14, max: 18 },
    stickerAltar: { min: 4, max: 4 }, tinkerer: { min: 8, max: 8 }, cardTransmuter: { min: 4, max: 4 },
  });
  assert.ok(SPECIAL_NODE_DEFINITION_WEIGHTS.some(entry => entry.type === "extractionShrine"));
  assert.ok(SPECIAL_NODE_DEFINITION_WEIGHTS.some(entry => entry.type === "treasureChest"));
});

test("paused locations are absent in dungeon terrain and fixed safe-area facilities", () => {
  const seed = 173;
  for (let x = -50; x <= 50; x++) {
    for (let y = 1; y <= 12; y++) {
      assert.equal(TEMPORARILY_DISABLED_ROOM_TYPES.has(getRoomType({ x, y }, seed)), false);
    }
  }
  for (let region = 0; region < 3; region++) {
    const center = { x: safeAreaCenterX(region, seed), y: safeAreaCenterY(region, seed) };
    const types = [];
    for (let x = center.x - 10; x <= center.x + 10; x++) {
      for (let y = center.y - 3; y <= center.y + 3; y++) {
        const type = getRoomType({ x, y }, seed);
        assert.ok(!TEMPORARILY_DISABLED_ROOM_TYPES.has(type) || ["heal", "partialHeal", "blessing"].includes(type));
        types.push(type);
      }
    }
    assert.ok(!types.includes("shop") && !types.includes("bloodShop"));
    assert.ok(types.includes("boss"));
    assert.ok(types.includes("safePortal"));
    assert.ok(types.includes("heal"));
    assert.ok(types.includes("blessing"));
    assert.equal(types.includes("extractionShrine"), false);
  }
});

test("safe areas do not generate extraction tickets on their former shrine floors", () => {
  const seed = 173;
  for (let region = 0; region < 7; region++) {
    const x = safeAreaCenterX(region, seed), y = safeAreaCenterY(region, seed);
    const positions = [-1, 1].map(offset => ({ x: x - 4, y: y + offset }));
    for (const position of positions) assert.equal(getRoomType(position, seed), "empty");
    const drops = createMapFloorDropsForPositions(seed, positions);
    assert.deepEqual(drops, createMapFloorDropsForPositions(seed, positions));
    assert.deepEqual(drops, { cards: {}, consumables: {} });
  }
});

test("field cards and tickets do not spawn naturally on generated regions", () => {
  const positions = Array.from({ length: MAP_COLUMNS * REGION_HEIGHT }, (_, index) =>
    ({ x: index % MAP_COLUMNS + DUNGEON_MIN_X, y: Math.floor(index / MAP_COLUMNS) }));
  for (const seed of [1, 7, 173]) {
    assert.deepEqual(createMapFloorDropsForPositions(seed, positions), { cards: {}, consumables: {} });
  }
});

test("vault terrain is deterministic and cannot also spawn an enemy or loose loot", () => {
  let vaultCount = 0;
  for (let index = 0; index < MAP_COLUMNS * REGION_HEIGHT; index++) {
    const position = { x: index % MAP_COLUMNS + DUNGEON_MIN_X, y: Math.floor(index / MAP_COLUMNS) };
    if (getRoomType(position, 173) !== "deckVault") continue;
    vaultCount++;
    assert.equal(getRoomType(position, 173), "deckVault");
    assert.equal(isMapEnemySpawnCell(position, 173), false);
    assert.deepEqual(createMapFloorDropsForPositions(173, [position]), { cards: {}, consumables: {} });
  }
  assert.ok(vaultCount > 0);
});
