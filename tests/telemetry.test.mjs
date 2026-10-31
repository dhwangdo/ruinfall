import assert from "node:assert/strict";
import test from "node:test";

import {
  beginTelemetryRun,
  beginTelemetryBattle,
  finishTelemetryBattle,
  createTelemetryRecorder,
  finishTelemetryRun,
  hasActiveTelemetryRun,
  flushTelemetry,
  recordTelemetryDamage,
  recordTelemetryEnemyDamage,
  registerTelemetryEnemies,
  resetTelemetryRecorder,
} from "../app/game/telemetry.ts";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
}

test("summoned enemies are registered once so their damage keeps its enemy identity", () => {
  const previousWindow = globalThis.window;
  const storage = createStorage();
  globalThis.window = { localStorage: storage };
  const recorder = createTelemetryRecorder();
  try {
    beginTelemetryRun(recorder, { playerName: "test", mapSeed: "seed", startingDecks: [], activeDeckId: "starter" });
    beginTelemetryBattle(recorder, { region: 1, deck: { cards: [] }, enemies: [], startingPlayerHp: 50 });
    const child = { id: "brood-hatchling-1", name: "새끼 바퀴", variant: "roachHatchling", hp: 12, maxHp: 12, isBoss: false };
    registerTelemetryEnemies(recorder, [child, child]);
    registerTelemetryEnemies(recorder, [child]);
    recordTelemetryEnemyDamage(recorder, child.id, 4);
    flushTelemetry(recorder);
    const battle = JSON.parse(storage.getItem("down-to-the-stars.telemetry.v2")).runs[0].battles[0];
    assert.equal(battle.enemies.length, 1);
    assert.equal(battle.enemies[0].name, "새끼 바퀴");
    assert.equal(battle.damageByEnemy[child.id], 4);
  } finally {
    flushTelemetry(recorder);
    globalThis.window = previousWindow;
  }
});

test("many damage events share one write and reset cancels the queued write", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const previousWindow = globalThis.window;
  const storage = createStorage();
  let writes = 0;
  globalThis.window = { localStorage: { ...storage, setItem: (key, value) => {
    writes++;
    storage.setItem(key, value);
  } } };
  try {
    const recorder = createTelemetryRecorder();
    beginTelemetryRun(recorder, { playerName: "test", mapSeed: "seed", startingDecks: [], activeDeckId: "starter" });
    beginTelemetryBattle(recorder, { region: 1, deck: { cards: [] }, enemies: [], startingPlayerHp: 50 });
    const initialWrites = writes;
    for (let index = 0; index < 100; index++) recordTelemetryDamage(recorder, 2, 1);
    assert.equal(writes, initialWrites);
    context.mock.timers.tick(250);
    assert.equal(writes, initialWrites + 1);
    const saved = JSON.parse(storage.getItem("down-to-the-stars.telemetry.v2"));
    assert.equal(saved.runs[0].battles[0].damageDealt, 200);
    flushTelemetry(recorder);
    assert.equal(writes, initialWrites + 1);
    recordTelemetryDamage(recorder, 2, 1);
    resetTelemetryRecorder(recorder);
    context.mock.timers.tick(250);
    flushTelemetry(recorder);
    assert.equal(storage.has("down-to-the-stars.telemetry.v2"), false);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("battle completion immediately flushes damage still waiting for storage", () => {
  const previousWindow = globalThis.window;
  const storage = createStorage();
  globalThis.window = { localStorage: storage };
  const recorder = createTelemetryRecorder();
  try {
    beginTelemetryRun(recorder, { playerName: "test", mapSeed: "seed", startingDecks: [], activeDeckId: "starter" });
    beginTelemetryBattle(recorder, { region: 1, deck: { cards: [] }, enemies: [], startingPlayerHp: 50 });
    recordTelemetryDamage(recorder, 12, 3);
    finishTelemetryBattle(recorder, "won", 2, 47);
    const saved = JSON.parse(storage.getItem("down-to-the-stars.telemetry.v2"));
    assert.equal(saved.runs[0].battles[0].damageTaken, 3);
    assert.equal(saved.runs[0].battles[0].result, "won");
    assert.equal(saved.runs[0].battles[0].endingPlayerHp, 47);
  } finally {
    flushTelemetry(recorder);
    globalThis.window = previousWindow;
  }
});

test("telemetry resumes an active run after a page reload", () => {
  const previousWindow = globalThis.window;
  const storage = createStorage();
  globalThis.window = { localStorage: storage };

  try {
    const firstRecorder = createTelemetryRecorder();
    beginTelemetryRun(firstRecorder, {
      playerName: "테스트",
      mapSeed: "seed",
      startingDecks: [],
      activeDeckId: "starter",
    });
    const runId = firstRecorder.activeRunId;

    const reloadedRecorder = createTelemetryRecorder();
    assert.equal(reloadedRecorder.activeRunId, runId);
    assert.equal(hasActiveTelemetryRun(reloadedRecorder), true);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("finished telemetry stays until the next run or explicit reset", () => {
  const previousWindow = globalThis.window;
  const storage = createStorage();
  globalThis.window = { localStorage: storage };

  try {
    const recorder = createTelemetryRecorder();
    beginTelemetryRun(recorder, {
      playerName: "테스트",
      mapSeed: "seed",
      startingDecks: [],
      activeDeckId: "starter",
    });
    finishTelemetryRun(recorder, "abandoned");
    assert.equal(storage.has("down-to-the-stars.telemetry.v2"), true);

    const nextRecorder = createTelemetryRecorder();
    beginTelemetryRun(nextRecorder, {
      playerName: "새 런",
      mapSeed: "next-seed",
      startingDecks: [],
      activeDeckId: "starter",
    });
    assert.equal(nextRecorder.store.runs.length, 1);
    resetTelemetryRecorder(nextRecorder);
    assert.equal(storage.has("down-to-the-stars.telemetry.v2"), false);
  } finally {
    globalThis.window = previousWindow;
  }
});
