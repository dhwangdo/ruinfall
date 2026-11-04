import assert from "node:assert/strict";
import test from "node:test";

import { createRunSaveSnapshot, prepareRunRestore } from "../app/game/runSaveState.ts";
import { RARE_CARD_POOL, SPECIAL_CARD_POOL } from "../app/game/cards.ts";

test("temporarily disabled tickets are removed from inventory, floor and shops on restore", () => {
  const tickets = ["mindEyeTicket", "darkTicket", "extractTicket"].map(type => ({ id: type, type }));
  const restored = prepareRunRestore({ mapSeed: 1, mapPosition: { x: 0, y: 0 }, blessings: [],
    inventoryConsumables: tickets, roomConsumableDrops: { "1:1": tickets }, darkTicketTurnsRemaining: 18,
    roomShops: { "2:2": tickets.map(consumable => ({ id: consumable.id, consumable, price: 30, sold: false })) } }, () => false);
  assert.deepEqual(restored.inventoryConsumables.map(item => item.type), ["extractTicket"]);
  assert.deepEqual(restored.roomConsumableDrops["1:1"].map(item => item.type), ["extractTicket"]);
  assert.deepEqual(restored.roomShops["2:2"].map(item => item.consumable.type), ["extractTicket"]);
  assert.equal(restored.darkTicketTurnsRemaining, 0);
  assert.equal(tickets.length, 3);
});

test("deleted editions are removed from owned decks, ground decks and unopened vaults", () => {
  const deck = { id: "old", name: "old", capacity: 25, cards: [], rareSlotCapacity: 1,
    editions: ["greedy", "frugal", "frugalPlus", "quickHammer"], editionColors: {} };
  const restored = prepareRunRestore({ mapSeed: 1, mapPosition: { x: 0, y: 0 }, blessings: [],
    ownedDecks: [deck], roomDeckDrops: { "1:1": [deck] }, roomDeckVaults: { "2:2": deck } }, () => false);
  for (const item of [restored.ownedDecks[0], restored.roomDeckDrops["1:1"][0], restored.roomDeckVaults["2:2"]]) {
    assert.deepEqual(item.editions, ["frugalPlus", "quickHammer"]);
    assert.deepEqual(Object.keys(item.editionColors), ["frugalPlus", "quickHammer"]);
  }
  assert.deepEqual(deck.editions, ["greedy", "frugal", "frugalPlus", "quickHammer"]);
});

test("run save snapshots serialize set-backed state without changing the source", () => {
  const seenRooms = new Set(["1:2", "3:4"]);
  const snapshot = createRunSaveSnapshot({
    seenRooms,
    safeAreaEntrySeenRooms: null,
    defeatedBossRegions: new Set([0, 2]),
    destroyedShopRooms: new Set(["5:6"]),
    collapsedExtractionShrineRooms: new Set(["7:8"]),
    collapsedRecoveryShrineRooms: new Set(),
    collapsedVitalityShrineRooms: new Set(),
    collapsedMindEyeShrineRooms: new Set(),
    collapsedTransformShrineRooms: new Set(),
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
    keys: 4,
    skipPortalKeyWarning: true,
    roomDeckVaults: {},
    openedDeckVaultRooms: new Set(["5:9"]),
    rareCardDropChance: 0.05,
  });

  assert.deepEqual(snapshot.seenRooms, ["1:2", "3:4"]);
  assert.equal(snapshot.keys, 4);
  assert.equal(snapshot.skipPortalKeyWarning, true);
  assert.deepEqual(snapshot.openedDeckVaultRooms, ["5:9"]);
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
    collapsedShrineRooms: ["7:8"],
    blessingRerollCost: 6,
    blessings: ["luck", "ironWill"],
    godsLamentCharges: 9,
    deckPityBattlesRemaining: 8,
  }, () => false);

  assert.deepEqual(prepared.collapsedRecoveryShrineRooms, ["1:2"]);
  assert.deepEqual(prepared.collapsedExtractionShrineRooms, ["7:8"]);
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
  assert.equal(prepared.keys, 0);
  assert.equal(prepared.skipPortalKeyWarning, false);
  assert.deepEqual(prepared.roomDeckVaults, {});
  assert.deepEqual(prepared.openedDeckVaultRooms, []);
});

test("blood-shop HP prices and sold state survive run restore without being converted again", () => {
  const offer = { id: "blood", price: 4, currency: "hp", sold: true, consumable: { type: "extractTicket" } };
  const prepared = prepareRunRestore({
    mapPosition: { x: 0, y: 0 }, mapSeed: 5, blessings: [],
    collapsedExtractionShrineRooms: ["9:10"], collapsedShrineRooms: ["7:8"],
    roomShops: { "0:0": [offer] },
  }, () => false);
  assert.deepEqual(prepared.roomShops["0:0"], [offer]);
  assert.deepEqual(prepared.collapsedExtractionShrineRooms, ["9:10"]);
});

test("restore preparation removes God's Lament charges in a safe area", () => {
  const prepared = prepareRunRestore({
    mapPosition: { x: 0, y: 0 },
    mapSeed: 5,
    blessings: [],
  }, () => true);

  assert.equal(prepared.godsLamentCharges, 0);
});

test("restoring a map removes retired encounters without renumbering surviving enemies", () => {
  const indices = [0, 1, 6, 7, 9, 14, 24, 25];
  const saved = {
    mapPosition: { x: 0, y: 0 }, mapSeed: 5, blessings: [],
    mapEnemyWorld: { enemies: indices.map((encounterIndex) => ({ id: `enemy-${encounterIndex}`, encounterIndex })) },
    mapEnemyCellMemory: Object.fromEntries(indices.map((encounterIndex) => [String(encounterIndex), { encounterIndex }])),
    inventoryCards: [{ id: 1, effect: "slime", name: "유독성 점액", damageType: "magic" }],
  };
  const prepared = prepareRunRestore(saved, () => false);
  assert.deepEqual(prepared.mapEnemyWorld.enemies.map((enemy) => enemy.encounterIndex), [1, 6, 14, 25]);
  assert.deepEqual(Object.values(prepared.mapEnemyCellMemory).map((memory) => memory.encounterIndex), [1, 6, 14, 25]);
  assert.equal(prepared.inventoryCards[0].damageType, "physical");
  assert.equal(saved.mapEnemyWorld.enemies.length, 8);
});

test("saved talismans use the current one-point value in decks and inventory", () => {
  const cards = SPECIAL_CARD_POOL.filter(card => ["wolfTalisman", "turtleTalisman"].includes(card.effect))
    .map((card, id) => ({ ...card, id, value: 2 }));
  const prepared = prepareRunRestore({ mapPosition: { x: 0, y: 0 }, mapSeed: 5, blessings: [],
    ownedDecks: [{ id: "talisman", capacity: 20, editions: [], cards }], inventoryCards: cards }, () => false);
  assert.deepEqual(prepared.ownedDecks[0].cards.map(card => card.value), [1, 1]);
  assert.deepEqual(prepared.inventoryCards.map(card => card.value), [1, 1]);
  assert.deepEqual(cards.map(card => card.value), [2, 2]);
});

test("restoring old resistance cards removes iron wall and blessing and updates plate armor in every storage", () => {
  const base = { id: 99, kind: "skill", rarity: "special", cost: 1, value: 8, draw: 0, damageType: "physical", revealed: false };
  const oldCards = ["ironWall", "blessing", "berserk"].map(effect => ({ ...base, effect, name: effect }));
  const plate = { ...base, effect: "plateArmorDefense", name: "판금 갑옷", forged: true };
  const deck = { id: "resistance-deck", name: "old", capacity: 20, editions: ["resistance"], editionColors: {}, cards: [...oldCards, plate] };
  const restored = prepareRunRestore({
    mapPosition: { x: 0, y: 0 }, mapSeed: 5, blessings: ["vulnerabilityInsurance", "glassCannon"],
    ownedDecks: [deck], inventoryCards: deck.cards, roomDrops: { "1:1": deck.cards },
    roomDeckDrops: { "1:1": [deck] }, roomShops: { "1:1": deck.cards.map(card => ({ card, id: card.effect, price: 1, sold: false })) },
  }, () => false);
  for (const cards of [restored.ownedDecks[0].cards, restored.inventoryCards, restored.roomDrops["1:1"],
    restored.roomDeckDrops["1:1"][0].cards, restored.roomShops["1:1"].map(offer => offer.card)]) {
    assert.deepEqual(cards.map(card => [card.effect, card.value, card.forged]), [["plateArmorDefense", 5, true]]);
  }
  assert.deepEqual(restored.ownedDecks[0].editions, ["resistance"]);
  assert.equal(deck.cards.length, 4);
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
  const oldSwapTicket = { id: "swap", type: "swapTicket", name: "교환 티켓", description: "legacy" };
  const prepared = prepareRunRestore({
    mapPosition: { x: 0, y: 0 }, mapSeed: 5, blessings: [],
    ownedDecks: [deck], inventoryCards: [spark, crystal], roomDrops: { "1:1": [crystal, oldSteelHeart] },
    inventoryConsumables: [oldSwapTicket],
    roomConsumableDrops: { "1:1": [oldSwapTicket] },
    roomDeckDrops: { "2:2": [deck] },
    roomShops: { "3:3": [
      { id: "removed", price: 1, card: spark, sold: false },
      { id: "restored", price: 1, card: oldEconomics, sold: false },
      { id: "swap", price: 80, consumable: oldSwapTicket, sold: false },
    ] },
  }, () => false);

  assert.deepEqual(prepared.ownedDecks[0].cards.map((card) => [card.name, card.cost, card.value]), [
    ["경제학 연구", 2, 3],
  ]);
  assert.equal(prepared.ownedDecks[0].rareSlotCapacity, 1);
  assert.equal(prepared.ownedDecks[0].cards[0].ritualCost, undefined);
  assert.deepEqual(prepared.inventoryCards, []);
  assert.deepEqual(prepared.roomDrops["1:1"], []);
  assert.deepEqual(prepared.roomDeckDrops["2:2"][0].cards.map((card) => card.name), ["경제학 연구"]);
  assert.equal(prepared.roomDeckDrops["2:2"][0].rareSlotCapacity, 1);
  assert.deepEqual(prepared.inventoryConsumables, []);
  assert.deepEqual(prepared.roomConsumableDrops["1:1"], []);
  assert.deepEqual(prepared.roomShops["3:3"].map((offer) => offer.card?.name), ["경제학 연구"]);
});

test("keys, warning preference, opened vaults and their exact contents survive JSON restore", () => {
  const deck = { id: "vault", name: "saved", capacity: 25, rareSlotCapacity: 2,
    generation: { k: 2, s: -1, x: -1, y: 0, z: 0 },
    editions: [], editionColors: {}, cards: [{ ...SPECIAL_CARD_POOL[0], id: 981 }] };
  const saved = JSON.parse(JSON.stringify({
    mapPosition: { x: 1, y: 2 }, mapSeed: 5, blessings: [], keys: 7, skipPortalKeyWarning: true,
    roomDeckVaults: { "1:2": deck }, openedDeckVaultRooms: ["1:2"],
  }));
  const restored = prepareRunRestore(saved, () => false);
  assert.equal(restored.keys, 7);
  assert.equal(restored.skipPortalKeyWarning, true);
  assert.deepEqual(restored.openedDeckVaultRooms, ["1:2"]);
  assert.deepEqual(restored.roomDeckVaults["1:2"], deck);
});
