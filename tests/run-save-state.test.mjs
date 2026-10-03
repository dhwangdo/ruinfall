import assert from "node:assert/strict";
import test from "node:test";

import { createRunSaveSnapshot, prepareRunRestore } from "../app/game/runSaveState.ts";

test("run save snapshots serialize set-backed state without changing the source", () => {
  const seenRooms = new Set(["1:2", "3:4"]);
  const snapshot = createRunSaveSnapshot({
    seenRooms,
    safeAreaEntrySeenRooms: null,
    defeatedBossRegions: new Set([0, 2]),
    destroyedShopRooms: new Set(["5:6"]),
    collapsedShrineRooms: new Set(["7:8"]),
    collapsedRecoveryShrineRooms: new Set(),
    collapsedVitalityShrineRooms: new Set(),
    collapsedMindEyeShrineRooms: new Set(),
    collapsedTransformShrineRooms: new Set(),
    collapsedCombinationShrineRooms: new Set(),
    collapsedTreasureChestRooms: new Set(),
    usedHealRooms: new Set(["9:10"]),
    usedBlessingRooms: new Set(["11:12"]),
    blessingSeenOfferIds: new Set(["ironWill"]),
    playerName: "Tester",
    runPlayerHp: 20,
    mapSeed: 5,
    mapPosition: { x: 0, y: 0 },
    mapEnemyWorld: { enemies: [] },
    mapEnemyCellMemory: {},
    mapBombs: [],
    vitalityShrineMaxHpBonus: 0,
    rockBombHits: {},
    mindEyeMovesRemaining: 0,
    godsLamentCharges: 3,
    darkTicketTurnsRemaining: 0,
    ownedDecks: [],
    activeDeckId: "deck-1",
    inventoryCards: [],
    inventoryConsumables: [],
    roomDrops: {},
    roomConsumableDrops: {},
    roomDeckDrops: {},
    roomShops: {},
    blessingOffers: [],
    blessings: [],
    blessingRerollCost: 5,
    oneUpUsed: false,
    gold: 0,
    nextCardId: 1,
    nextConsumableId: 1,
    deckDropChance: 0.25,
    rareCardDropChance: 0.05,
    deckPityBattlesRemaining: 3,
  });

  assert.deepEqual(snapshot.seenRooms, ["1:2", "3:4"]);
  assert.equal(snapshot.safeAreaEntrySeenRooms, null);
  assert.deepEqual(snapshot.defeatedBossRegions, [0, 2]);
  assert.deepEqual(snapshot.blessingSeenOfferIds, ["ironWill"]);
  seenRooms.add("13:14");
  assert.deepEqual(snapshot.seenRooms, ["1:2", "3:4"]);
});

test("restore preparation fills legacy fields and normalizes saved values", () => {
  const prepared = prepareRunRestore({
    mapPosition: { x: 0, y: 0 },
    mapSeed: 5,
    collapsedHealthShrineRooms: ["1:2"],
    blessingRerollCost: 6,
    blessings: ["luck", "ironWill"],
    godsLamentCharges: 9,
    deckPityBattlesRemaining: 8,
  }, () => false);

  assert.deepEqual(prepared.collapsedRecoveryShrineRooms, ["1:2"]);
  assert.deepEqual(prepared.collapsedVitalityShrineRooms, ["1:2"]);
  assert.deepEqual(prepared.collapsedMindEyeShrineRooms, []);
  assert.equal(prepared.vitalityShrineMaxHpBonus, 0);
  assert.equal(prepared.darkTicketTurnsRemaining, 0);
  assert.deepEqual(prepared.blessingOffers, []);
  assert.deepEqual(prepared.blessingSeenOfferIds, []);
  assert.deepEqual(prepared.blessings, ["ironWill"]);
  assert.equal(prepared.blessingRerollCost, 7);
  assert.equal(prepared.godsLamentCharges, 3);
  assert.equal(prepared.oneUpUsed, false);
  assert.equal(prepared.deckPityBattlesRemaining, 3);
});

test("restore preparation removes God's Lament charges in a safe area", () => {
  const prepared = prepareRunRestore({
    mapPosition: { x: 0, y: 0 },
    mapSeed: 5,
    blessings: [],
  }, () => true);

  assert.equal(prepared.godsLamentCharges, 0);
});
