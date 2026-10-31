import assert from "node:assert/strict";
import test from "node:test";
import { mapViewportBounds } from "../app/game/mapViewport.ts";

const layout = { minX: 0, maxX: 100, maxY: 100, marginX: 0, marginY: 0, padding: 0, strideX: 100, strideY: 100 };

test("camera bounds keep visible cells and a small border but exclude distant cells", () => {
  assert.deepEqual(mapViewportBounds({ x: -500, y: -800 }, 1, { width: 300, height: 200 }, layout),
    { minX: 3, maxX: 10, minY: 6, maxY: 12 });
});

test("camera bounds follow actual viewport size, zoom, and world margins", () => {
  const bounds = mapViewportBounds({ x: -500, y: -800 }, 0.5, { width: 1800, height: 1000 }, layout);
  assert.ok(bounds.minX <= 10 && bounds.maxX >= 45);
  assert.ok(bounds.minY <= 16 && bounds.maxY >= 35);
  const shifted = mapViewportBounds({ x: 0, y: 0 }, 1, { width: 300, height: 200 },
    { ...layout, minX: -160, maxX: 160, marginX: 5, marginY: 5 });
  assert.ok(shifted.minX >= -160 && shifted.maxX <= 160 && shifted.minY >= 0);
});

test("camera outside the map produces an empty cell range", () => {
  const bounds = mapViewportBounds({ x: 50000, y: 50000 }, 1, { width: 300, height: 200 }, layout);
  assert.ok(bounds.minX > bounds.maxX && bounds.minY > bounds.maxY);
});

test("upper rock border remains visible at negative world coordinates", () => {
  const bounds = mapViewportBounds({ x: 0, y: -300 }, 1, { width: 300, height: 300 },
    { ...layout, minY: -5, marginY: 5 });
  assert.ok(bounds.minY <= -1 && bounds.maxY >= 0);
});
