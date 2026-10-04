import assert from "node:assert/strict";
import test from "node:test";

import { createRunSaveSnapshot, prepareRunRestore } from "../app/game/runSaveState.ts";
import { RARE_CARD_POOL } from "../app/game/cards.ts";

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

test("old saves discard removed cards and restore changed cards everywhere", () => {
  const oldSteelHeart = {
    id: 1, kind: "skill", effect: "steelHeart", rarity: "rare", name: "강철의 계약",
    cost: 1, value: 2, draw: 0, damageType: "physical", revealed: false, ritualCost: 1,
  };
  const crystal = {
    ...oldSteelHeart, id: 2, effect: "magicCrystal", name: "마력 결정 II", magicCrystalStage: 2,
  };
  const spark = { ...oldSteelHeart, id: 3, effect: "strike", name: "불티", spellRank: 1 };
  const oldEconomics = {
    ...RARE_CARD_POOL.find((card) => card.effect === "economicsResearch"),
    id: 4, revealed: false, name: "영혼담보대출", cost: 1, ritualCost: 2,
  };
  const deck = { id: "deck-1", name: "deck", capacity: 20, editions: [], editionColors: {}, cards: [oldSteelHeart, crystal, oldEconomics] };
  const prepared = prepareRunRestore({
    mapPosition: { x: 0, y: 0 }, mapSeed: 5, blessings: [],
    ownedDecks: [deck], inventoryCards: [spark, crystal], roomDrops: { "1:1": [crystal, oldSteelHeart] },
    roomDeckDrops: { "2:2": [deck] },
    roomShops: { "3:3": [
      { id: "removed", price: 1, card: spark, sold: false },
      { id: "restored", price: 1, card: oldEconomics, sold: false },
    ] },
  }, () => false);

  assert.deepEqual(prepared.ownedDecks[0].cards.map((card) => [card.name, card.cost, card.value]), [
    ["경제학 연구", 2, 3],
  ]);
  assert.equal(prepared.ownedDecks[0].cards[0].ritualCost, undefined);
  assert.deepEqual(prepared.inventoryCards, []);
  assert.deepEqual(prepared.roomDrops["1:1"], []);
  assert.deepEqual(prepared.roomDeckDrops["2:2"][0].cards.map((card) => card.name), ["경제학 연구"]);
  assert.deepEqual(prepared.roomShops["3:3"].map((offer) => offer.card?.name), ["경제학 연구"]);
});
