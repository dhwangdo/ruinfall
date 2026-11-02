import assert from "node:assert/strict";
import test from "node:test";
import { mapRenderSurface, mapViewportBounds } from "../app/game/mapViewport.ts";

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

test("render surfaces stay local after distant travel and include every visible cell", () => {
  for (const offset of [-160, 0, 160, 10000]) {
    const bounds = { minX: offset, maxX: offset + 18, minY: offset - 3, maxY: offset + 9 };
    const surface = mapRenderSurface(bounds);
    assert.ok(surface.minX <= bounds.minX && surface.maxX >= bounds.maxX);
    assert.ok(surface.minY <= bounds.minY && surface.maxY >= bounds.maxY);
    assert.ok(surface.maxX - surface.minX < 50);
    assert.ok(surface.maxY - surface.minY < 50);
  }
});

test("an off-map camera still has a finite non-negative render surface", () => {
  const surface = mapRenderSurface({ minX: 100, maxX: -200, minY: 100, maxY: -200 });
  assert.ok(surface.maxX >= surface.minX && surface.maxY >= surface.minY);
  assert.ok(surface.maxX - surface.minX < 50 && surface.maxY - surface.minY < 50);
});
