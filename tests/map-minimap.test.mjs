import assert from "node:assert/strict";
import test from "node:test";
import { buildMinimapCells, MINIMAP_COLORS as colors } from "../app/game/mapMinimap.ts";

const position = x => ({ x, y: 0 });
const key = x => `${x}:0`;
const known = (...xs) => new Map(xs.map(x => [key(x), position(x)]));
const enemy = x => ({ id: `enemy-${x}`, position: position(x), encounterIndex: 0, awareness: "awake" });
const source = overrides => ({
  player: position(0), knownRooms: known(0), visibleRoomKeys: new Set([key(0)]),
  enemies: [], enemyMemory: {}, roomTypeAt: () => "empty", hasItemsAt: () => false,
  ...overrides,
});
const colorAt = (data, x) => data.cells.find(cell => cell.x === x && cell.y === 0)?.color;

test("minimap never queries undiscovered terrain or reveals hidden live enemies", () => {
  const queries = [];
  const data = buildMinimapCells(source({
    knownRooms: known(0, 1, 2), visibleRoomKeys: new Set([key(0), key(1)]),
    enemies: [enemy(0), enemy(1), enemy(2), enemy(3)],
    enemyMemory: { [key(4)]: { encounterIndex: 0, awareness: "awake" } },
    roomTypeAt: p => { queries.push(p.x); return "empty"; },
  }));
  assert.deepEqual(queries, [1, 2]);
  assert.equal(data.cells.length, 3);
  assert.equal(colorAt(data, 0), colors.player);
  assert.equal(colorAt(data, 1), colors.enemy);
  assert.equal(colorAt(data, 2), colors.floor);
  assert.equal(colorAt(data, 3), undefined);
  assert.equal(colorAt(data, 4), undefined);
});

test("minimap uses last seen enemy positions only outside current vision", () => {
  const memory = { encounterIndex: 0, awareness: "awake" };
  const data = buildMinimapCells(source({
    knownRooms: known(0, 1, 2, 3), visibleRoomKeys: new Set([key(0), key(1)]),
    enemies: [enemy(3)], enemyMemory: { [key(1)]: memory, [key(2)]: memory },
  }));
  assert.equal(colorAt(data, 1), colors.floor);
  assert.equal(colorAt(data, 2), colors.rememberedEnemy);
  assert.equal(colorAt(data, 3), colors.floor);
});

test("minimap distinguishes facilities and floor items, with enemies taking priority", () => {
  const types = ["empty", "deckVault", "empty", "heal", "partialHeal", "blessing", "portal", "empty", "deckVault"];
  const data = buildMinimapCells(source({
    knownRooms: known(...types.map((_, x) => x)), visibleRoomKeys: new Set([key(8)]),
    roomTypeAt: p => types[p.x], hasItemsAt: room => room === key(1) || room === key(2),
    enemies: [enemy(8)],
  }));
  assert.deepEqual(types.map((_, x) => colorAt(data, x)), [colors.player, colors.vault, colors.item,
    colors.recovery, colors.recovery, colors.blessing, colors.portal, colors.floor, colors.enemy]);
});
