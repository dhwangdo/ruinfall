import assert from "node:assert/strict";
import test from "node:test";
import { generateMapRegion } from "../app/game/mapRegionGenerator.ts";
import { MAP_PREFAB_DEFINITIONS } from "../app/game/mapPrefabDefinitions.ts";
import { transformMapPrefab, validateMapPrefab } from "../app/game/mapPrefabs.ts";
import { floodMapFloor } from "../app/game/mapGenerationMath.ts";
import { prepareMapRegions } from "../app/game/mapPreparation.ts";
import {
  getGeneratedDungeonRegion, getRoomType, isWalkableRoom, isMapEnemySpawnCell,
  createMapFloorDropsForPositions, regionStartY, REGION_HEIGHT, MAP_COLUMNS,
  DUNGEON_MIN_X,
} from "../app/game/mapRules.ts";

const toWorld = (index, region = 0) => ({
  x: index % MAP_COLUMNS + DUNGEON_MIN_X,
  y: Math.floor(index / MAP_COLUMNS) + regionStartY(region),
});

test("startup preparation yields between regions and leaves all seven geometries cached", async () => {
  const progress = [], seed = 3127;
  let frames = 0;
  assert.equal(await prepareMapRegions(seed, async () => { frames++; }, (done, total) => progress.push([done, total])), true);
  assert.equal(frames, 7);
  assert.deepEqual(progress.map(([done]) => done), [0, 1, 2, 3, 4, 5, 6, 7]);
  for (let region = 0; region < 7; region++) {
    const generated = getGeneratedDungeonRegion(seed, region);
    assert.equal(getGeneratedDungeonRegion(seed, region), generated);
  }
});

test("an abandoned preparation stops before generating further regions", async () => {
  const progress = [];
  let frames = 0;
  assert.equal(await prepareMapRegions(3128, async () => { frames++; },
    completed => progress.push(completed), () => frames >= 2), false);
  assert.deepEqual(progress, [0, 1]);
});

test("hybrid terrain keeps a dominant continent, protected prefabs and reachable real portals", () => {
  for (const seed of [1, 173, 20261102]) for (let region = 0; region < 7; region++) {
    const map = getGeneratedDungeonRegion(seed, region);
    const actualFloor = Uint8Array.from(map.floor, (_, index) => Number(isWalkableRoom(getRoomType(toWorld(index, region), seed))));
    const reached = floodMapFloor(actualFloor, MAP_COLUMNS, REGION_HEIGHT, -DUNGEON_MIN_X);
    assert.ok(map.mainFloorCount / map.floorCount >= .9);
    assert.ok(map.floorCount > MAP_COLUMNS * REGION_HEIGHT * .15);
    assert.ok(map.floorCount < MAP_COLUMNS * REGION_HEIGHT * .45);
    assert.ok(map.floorCount > map.mainFloorCount, "small disconnected pockets remain");
    assert.equal(map.prefabs.length, 2);
    assert.deepEqual(map.skippedPrefabs, []);
    for (const [index, kind] of map.landmarks) {
      assert.equal(getRoomType(toWorld(index, region), seed), kind);
      assert.equal(reached.cells[index], 1, `${kind} must be reachable in the actual game`);
    }
    for (const prefab of map.prefabs) {
      const expectedFloor = new Set(prefab.floorCells);
      for (const index of prefab.protectedCells) {
        assert.equal(map.floor[index], Number(expectedFloor.has(index)));
      }
      for (const index of prefab.requiredCells) assert.equal(reached.cells[index], 1);
    }
  }
});

test("ordinary location counts stay in range, spread across the map and add to prefab rewards", () => {
  for (const seed of [1, 173, 291, 418]) for (let region = 0; region < 7; region++) {
    const map = getGeneratedDungeonRegion(seed, region);
    assert.ok([...map.ordinarySites.values()].every(kind => kind !== "shop" && kind !== "bloodShop"));
    for (const [kind, min, max] of [["deckVault", 40, 46]]) {
      const locations = [...map.ordinarySites].filter(([, type]) => type === kind).map(([index]) => index);
      assert.equal(locations.length, map.locationCounts[kind]);
      assert.ok(locations.length >= min && locations.length <= max);
      // Shops cover their quota's bands; dense vaults may borrow nearby bands to preserve spacing.
      const bands = Array(kind === "deckVault" ? 3 : locations.length).fill(0);
      for (const index of locations) bands[Math.floor(index % MAP_COLUMNS * bands.length / MAP_COLUMNS)]++;
      assert.ok(bands.every(count => count > 0), `${kind} covers the region instead of clustering`);
      if (kind === "deckVault") for (let i = 0; i < locations.length; i++) for (let j = 0; j < i; j++) {
        const a = locations[i], b = locations[j];
        assert.ok(Math.hypot(a % MAP_COLUMNS - b % MAP_COLUMNS, Math.floor(a / MAP_COLUMNS) - Math.floor(b / MAP_COLUMNS)) >= 6);
      }
    }
    assert.equal([...map.landmarks.values()].filter(kind => kind === "deckVault").length, 2);
    for (const [index, kind] of map.ordinarySites) {
      assert.equal(map.main[index], 1);
      assert.equal(map.protectedCells[index], 0);
      assert.equal(map.landmarks.has(index), false);
      assert.ok(["deckVault", "shop", "bloodShop"].includes(kind));
    }
  }
});

test("disconnected floor cannot create unreachable enemies or loose loot", () => {
  const map = getGeneratedDungeonRegion(173, 0), pockets = [];
  for (let index = 0; index < map.floor.length; index++) {
    if (map.floor[index] && !map.main[index]) pockets.push(toWorld(index));
  }
  assert.ok(pockets.length > 0);
  for (const position of pockets) {
    assert.equal(getRoomType(position, 173), "empty");
    assert.equal(isMapEnemySpawnCell(position, 173), false);
  }
  assert.deepEqual(createMapFloorDropsForPositions(173, pockets), { cards: {}, consumables: {} });
});

test("new prefab data works without generator changes and transformations preserve entrance direction", () => {
  const definition = {
    id: "test-new-gallery", name: "테스트 회랑",
    grid: ["#####", "..S.#", "##.##", "##.##"],
    entrances: [{ x: 0, y: 1, direction: "W" }, { x: 2, y: 3, direction: "S" }],
    rotations: [0, 90, 180, 270], mirror: true, padding: 2,
  };
  for (const rotation of definition.rotations) for (const mirrored of [false, true]) {
    const transformed = transformMapPrefab(definition, rotation, mirrored);
    for (const port of transformed.ports) {
      assert.equal(transformed.grid[port.y][port.x], ".");
      const x = port.x + port.dx, y = port.y + port.dy;
      assert.ok(x < 0 || y < 0 || x >= transformed.grid[0].length || y >= transformed.grid.length);
    }
  }
  const options = { seed: 173, region: 1, width: 81, height: 41,
    start: { x: 40, y: 0 }, portals: [{ x: 15, y: 40 }], definitions: [definition], prefabCount: 1 };
  const first = generateMapRegion(options), second = generateMapRegion(options);
  assert.deepEqual(first, second);
  assert.equal(first.prefabs[0].id, definition.id);
  assert.equal([...first.landmarks.values()].filter(kind => kind === "shop").length, 1);
});

test("invalid and impossible prefabs fail clearly without carving their walls", () => {
  const base = MAP_PREFAB_DEFINITIONS[0];
  assert.throws(() => validateMapPrefab({ ...base, id: "bad-grid", grid: ["###", "#."] }), /bad-grid.*grid/);
  assert.throws(() => validateMapPrefab({ ...base, id: "bad-entry", entrances: [{ x: 0, y: 0, direction: "W" }] }), /bad-entry.*floor/);
  assert.throws(() => validateMapPrefab({ ...base, id: "disconnected", grid: ["#####", "..#V#", "#####"],
    entrances: [{ x: 0, y: 1, direction: "W" }] }), /disconnected.*connect/);
  const oversized = { ...base, id: "oversized", grid: Array.from({ length: 50 }, () => ".".repeat(60)),
    entrances: [{ x: 0, y: 0, direction: "W" }] };
  const map = generateMapRegion({ seed: 2, region: 1, width: 41, height: 25,
    start: { x: 20, y: 0 }, portals: [{ x: 20, y: 24 }], definitions: [oversized] });
  assert.deepEqual(map.skippedPrefabs, ["oversized"]);
  assert.equal(map.prefabs.length, 0);
});
