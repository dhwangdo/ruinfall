import assert from "node:assert/strict";
import test from "node:test";
import { RUN_SAVE_KEY, RUN_SAVE_VERSION, readRunSave, writeRunSave } from "../app/game/saveGame.ts";

test("map overhaul ignores the old development save and restores a new save", (context) => {
  const values = new Map();
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  context.after(() => {
    if (original) Object.defineProperty(globalThis, "window", original);
    else delete globalThis.window;
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } } });
  values.set(RUN_SAVE_KEY, JSON.stringify({ version: RUN_SAVE_VERSION - 1, state: { mapSeed: 173 } }));
  assert.equal(readRunSave(), null);
  const state = { mapSeed: 123, mapPosition: { x: 0, y: 1 }, playerHp: 42 };
  writeRunSave(state);
  assert.equal(readRunSave().version, RUN_SAVE_VERSION);
  assert.deepEqual(readRunSave().state, state);
});
