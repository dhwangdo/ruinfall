import assert from "node:assert/strict";
import test from "node:test";
import { rareSlotFillDistribution, rollFilledRareSlots } from "../app/game/rareSlotRules.ts";
import { getEncounterIndicesForRegion, getEnemyCodexEntries, pickEncounterIndex,
  createSewerEncounterByIndex, getSewerEncounterLabel, normalizeEncounterIndex } from "../app/game/enemies.ts";
import { prepareRunRestore } from "../app/game/runSaveState.ts";

test("uniform 50–90 percent targets keep a 70 percent mean with no empty rare deck", () => {
  for (let slots = 2; slots <= 12; slots++) {
    const distribution = rareSlotFillDistribution(slots);
    const sum = distribution.reduce((a, b) => a + b, 0);
    const mean = distribution.reduce((a, p, count) => a + p * count, 0);
    const variance = distribution.reduce((a, p, count) => a + p * (count - mean) ** 2, 0);
    assert.ok(Math.abs(sum - 1) < 1e-12);
    assert.ok(Math.abs(mean - slots * .7) < 1e-12);
    assert.equal(distribution[0], 0);
    assert.ok(variance < slots * .7 * .3);
  }
  assert.deepEqual(rareSlotFillDistribution(0), [1]);
  assert.deepEqual(rareSlotFillDistribution(1), [0, 1]);
});

test("actual two-roll sampling matches the analytic four-slot probabilities", () => {
  const counts = Array(5).fill(0);
  for (let ratio = 0; ratio < 200; ratio++) for (let round = 0; round < 200; round++) {
    const rolls = [(ratio + .5) / 200, (round + .5) / 200];
    counts[rollFilledRareSlots(4, () => rolls.shift())]++;
  }
  assert.deepEqual(counts, [0, 0, 12500, 23000, 4500]);
  assert.equal(rollFilledRareSlots(3, () => .999), 2);
  assert.equal(rollFilledRareSlots(0), 0);
});

test("region-two sampling is half mixed pairs and gives all fifteen combinations equal weight", () => {
  const pool = getEncounterIndicesForRegion(1), counts = new Map(), combinations = new Map();
  for (let i = 0; i < 4200; i++) {
    const index = pickEncounterIndex(pool, (i + .5) / 4200);
    counts.set(index, (counts.get(index) ?? 0) + 1);
    if (index >= 36) {
      const enemies = createSewerEncounterByIndex(index, () => .999);
      assert.equal(enemies.length, 2);
      assert.notEqual(enemies[0].variant, enemies[1].variant);
      assert.equal(getSewerEncounterLabel(index), `${enemies[0].name} 외 1마리`);
      const pair = enemies.map(enemy => enemy.variant).sort().join("+");
      combinations.set(pair, (combinations.get(pair) ?? 0) + 1);
    }
  }
  assert.equal([...counts].filter(([id]) => id >= 36).reduce((sum, [, n]) => sum + n, 0), 2100);
  assert.equal(combinations.size, 15);
  assert.ok([...combinations.values()].every(n => n === 140));
  assert.ok([...counts].every(([id, n]) => n === (id >= 36 ? 70 : 300)));
  assert.ok(getEnemyCodexEntries().every(entry => entry.enemies.every(({ enemy }) => enemy.name !== "호위병")));
});

test("region-one sampling is half mixed and gives all ten different-family pairs equal weight", () => {
  const pool = getEncounterIndicesForRegion(0), counts = new Map(), combinations = new Map();
  let multiEnemyCount = 0;
  for (let i = 0; i < 6000; i++) {
    const index = pickEncounterIndex(pool, (i + .5) / 6000);
    counts.set(index, (counts.get(index) ?? 0) + 1);
    const enemies = createSewerEncounterByIndex(index, () => .999);
    if (enemies.length > 1) multiEnemyCount++;
    if (index >= 66) {
      assert.equal(enemies.length, 2);
      assert.notEqual(enemies[0].variant, enemies[1].variant);
      assert.equal(getSewerEncounterLabel(index), `${enemies[0].name} 외 1마리`);
      const pair = enemies.map(enemy => enemy.variant).sort().join("+");
      combinations.set(pair, (combinations.get(pair) ?? 0) + 1);
    }
  }
  assert.equal([...counts].filter(([id]) => id >= 66).reduce((sum, [, n]) => sum + n, 0), 3000);
  assert.equal(combinations.size, 10);
  assert.ok([...combinations.values()].every(n => n === 300));
  assert.ok([...counts].every(([id, n]) => n === (id >= 66 ? 150 : 500)));
  assert.equal(multiEnemyCount, 4000); // Three rats and colossus + puppeteer are in the other 50%.
});

test("saved individual encounters and remembered markers upgrade to the same stable pairs", () => {
  const indices = [3, 17, 18, 21, 23, 26, 28, 29, 31, 32, 35];
  const saved = { mapPosition: { x: 0, y: 0 }, mapSeed: 5, blessings: [],
    mapEnemyWorld: { enemies: indices.map(encounterIndex => ({ id: String(encounterIndex), encounterIndex })) },
    mapEnemyCellMemory: Object.fromEntries(indices.map(encounterIndex => [String(encounterIndex), { encounterIndex }])) };
  const restored = prepareRunRestore(saved, () => false);
  const again = prepareRunRestore(restored, () => false);
  for (const [i, original] of indices.entries()) {
    const index = restored.mapEnemyWorld.enemies[i].encounterIndex;
    assert.equal(index, normalizeEncounterIndex(original));
    assert.equal(index, restored.mapEnemyCellMemory[String(original)].encounterIndex);
    assert.equal(index, again.mapEnemyWorld.enemies[i].encounterIndex);
    assert.equal(createSewerEncounterByIndex(index).length, 2);
    assert.deepEqual(createSewerEncounterByIndex(index, () => 0).map(enemy => enemy.name),
      createSewerEncounterByIndex(index, () => .999).map(enemy => enemy.name));
  }
  assert.deepEqual(saved.mapEnemyWorld.enemies.map(enemy => enemy.encounterIndex), indices);
});
