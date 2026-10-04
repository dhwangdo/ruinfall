import assert from "node:assert/strict";
import test from "node:test";

import {
  createCardOriginDeckIds,
  validateDeckEditorCardMove,
} from "../app/game/deckEditorRules.ts";
import { swapRareCardCollections, transitionDeckEditorCardCollections } from "../app/game/deckEditorTransitions.ts";
import { groupAndSortDeckEditorCards } from "../app/game/deckEditorViews.ts";
import { sortBattleHandByCost } from "../app/game/battleHandRules.ts";
import { createDeckEditorSnapshot } from "../app/hooks/useDeckEditorSession.ts";

const baseRequest = {
  source: { area: "deck", deckId: "A" },
  target: { area: "deck", deckId: "B" },
  safeArea: false,
  originalOriginDeckId: "A",
  effectiveOriginDeckId: "A",
  targetDeckCardCount: 0,
  targetDeckCapacity: 10,
  inventoryItemCount: 0,
  inventoryCapacity: 10,
  isRare: false,
};

test("editor snapshot records origins by card id and deck id", () => {
  const origins = createCardOriginDeckIds(
    [{ id: "A", cards: [{ id: 1 }] }],
    [{ id: "floor-deck", cards: [{ id: 2 }] }],
    [{ id: 3 }],
    [{ id: 4 }],
  );
  assert.deepEqual(origins, { 1: "A", 2: "floor-deck", 3: null, 4: null });
});

test("outside a safe area an original deck card stays bound to its origin deck", () => {
  assert.deepEqual(validateDeckEditorCardMove(baseRequest), {
    allowed: false,
    reason: "origin-locked",
  });
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    target: { area: "inventory" },
  }), { allowed: false, reason: "origin-locked" });
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    target: { area: "floor" },
  }), { allowed: true, action: "schedule-removal" });
});

test("a pending removal can return only to its original deck", () => {
  const pending = { ...baseRequest, source: { area: "pendingRemoval" } };
  assert.deepEqual(validateDeckEditorCardMove({
    ...pending,
    target: { area: "deck", deckId: "A" },
  }), { allowed: true, action: "restore-removal" });
  assert.deepEqual(validateDeckEditorCardMove(pending), {
    allowed: false,
    reason: "origin-locked",
  });
});

test("temporary cards can move freely outside a safe area", () => {
  const temporary = {
    ...baseRequest,
    originalOriginDeckId: null,
    effectiveOriginDeckId: null,
  };
  assert.deepEqual(validateDeckEditorCardMove(temporary), { allowed: true, action: "move" });
  assert.deepEqual(validateDeckEditorCardMove({
    ...temporary,
    target: { area: "inventory" },
  }), { allowed: true, action: "move" });
  assert.deepEqual(validateDeckEditorCardMove({
    ...temporary,
    target: { area: "floor" },
  }), { allowed: true, action: "move" });
});

test("safe-area editing ignores origin deck restrictions", () => {
  assert.deepEqual(validateDeckEditorCardMove({ ...baseRequest, safeArea: true }), {
    allowed: true,
    action: "move",
  });
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    safeArea: true,
    target: { area: "inventory" },
  }), { allowed: true, action: "move" });
});

test("rare cards cannot move, extract, or schedule removal in any area", () => {
  for (const request of [
    { ...baseRequest, safeArea: true },
    { ...baseRequest, source: { area: "inventory" }, target: { area: "deck", deckId: "A" } },
    { ...baseRequest, target: { area: "floor" } },
    { ...baseRequest, target: { area: "inventory" }, viaExtractionTicket: true },
  ]) {
    assert.deepEqual(validateDeckEditorCardMove({ ...request, isRare: true }), {
      allowed: false,
      reason: "rare-locked",
    });
  }
});

test("swap ticket exchanges rare cards across deck, inventory, and floor", () => {
  const deckCard = { id: 1, rarity: "rare" };
  const inventoryCard = { id: 2, rarity: "rare" };
  const floorCard = { id: 3, rarity: "rare" };
  const collections = {
    ownedDecks: [{ id: "A", capacity: 1, cards: [deckCard] }],
    inventoryCards: [inventoryCard],
    floorCards: [floorCard],
    pendingRemovedCards: [],
    pendingRemovedCardAreas: {},
  };
  const first = swapRareCardCollections(collections,
    { cardId: 1, location: { area: "deck", deckId: "A" } },
    { cardId: 2, location: { area: "inventory" } });
  assert.equal(first.collections.ownedDecks[0].cards[0].id, 2);
  assert.equal(first.collections.inventoryCards[0].id, 1);
  const second = swapRareCardCollections(first.collections,
    { cardId: 1, location: { area: "inventory" } },
    { cardId: 3, location: { area: "floor" } });
  assert.equal(second.collections.inventoryCards[0].id, 3);
  assert.equal(second.collections.floorCards[0].id, 1);
  const third = swapRareCardCollections(collections,
    { cardId: 1, location: { area: "deck", deckId: "A" } },
    { cardId: 3, location: { area: "floor" } });
  assert.equal(third.collections.ownedDecks[0].cards[0].id, 3);
  assert.equal(third.collections.floorCards[0].id, 1);
  assert.equal(swapRareCardCollections(collections,
    { cardId: 1, location: { area: "deck", deckId: "A" } },
    { cardId: 1, location: { area: "deck", deckId: "A" } }), null);
});

test("rare cards in the same location cannot be swapped", () => {
  const rareA = { id: 1, rarity: "rare" };
  const rareB = { id: 2, rarity: "rare" };
  for (const area of ["inventory", "floor", "deck"]) {
    const location = area === "deck" ? { area, deckId: "A" } : { area };
    const collections = {
      ownedDecks: [{ id: "A", cards: area === "deck" ? [rareA, rareB] : [], capacity: 10 }],
      inventoryCards: area === "inventory" ? [rareA, rareB] : [],
      floorCards: area === "floor" ? [rareA, rareB] : [],
      pendingRemovedCards: [],
      pendingRemovedCardAreas: {},
    };
    assert.equal(swapRareCardCollections(collections,
      { cardId: 1, location }, { cardId: 2, location }), null);
    assert.deepEqual(collections.ownedDecks[0].cards, area === "deck" ? [rareA, rareB] : []);
  }
});

test("extraction accepts only an unreleased card recorded in a deck at session start", () => {
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    target: { area: "inventory" },
    viaExtractionTicket: true,
  }), { allowed: true, action: "move" });
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    target: { area: "inventory" },
    originalOriginDeckId: null,
    effectiveOriginDeckId: null,
    viaExtractionTicket: true,
  }), { allowed: false, reason: "extract-original-only" });
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    target: { area: "inventory" },
    effectiveOriginDeckId: null,
    viaExtractionTicket: true,
  }), { allowed: false, reason: "extract-original-only" });
});

test("empty decks are allowed while capacities remain enforced", () => {
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    target: { area: "floor" },
  }), { allowed: true, action: "schedule-removal" });
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    originalOriginDeckId: null,
    effectiveOriginDeckId: null,
    targetDeckCardCount: 10,
  }), { allowed: false, reason: "deck-full" });
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    target: { area: "inventory" },
    inventoryItemCount: 10,
    viaExtractionTicket: true,
  }), { allowed: false, reason: "inventory-full" });
});

test("an inventory extraction ticket can free its occupied slot", () => {
  assert.deepEqual(validateDeckEditorCardMove({
    ...baseRequest,
    target: { area: "inventory" },
    inventoryItemCount: 10,
    inventoryCapacity: 10,
    inventorySlotsFreed: 1,
    viaExtractionTicket: true,
  }), { allowed: true, action: "move" });
});

test("card collection transition moves a card between deck, inventory, and floor", () => {
  const card = { id: 7, name: "Test card" };
  const initial = {
    ownedDecks: [
      { id: "A", cards: [card], capacity: 10 },
      { id: "B", cards: [], capacity: 10 },
    ],
    inventoryCards: [],
    floorCards: [],
    pendingRemovedCards: [],
    pendingRemovedCardAreas: {},
  };

  const toInventory = transitionDeckEditorCardCollections(initial, {
    cardId: card.id,
    source: { area: "deck", deckId: "A" },
    target: { area: "inventory" },
    action: "move",
  });
  assert.equal(toInventory.card, card);
  assert.deepEqual(toInventory.collections.ownedDecks[0].cards, []);
  assert.deepEqual(toInventory.collections.inventoryCards, [card]);

  const toFloor = transitionDeckEditorCardCollections(toInventory.collections, {
    cardId: card.id,
    source: { area: "inventory" },
    target: { area: "floor" },
    action: "move",
  });
  assert.deepEqual(toFloor.collections.inventoryCards, []);
  assert.deepEqual(toFloor.collections.floorCards, [card]);

  const toOtherDeck = transitionDeckEditorCardCollections(toFloor.collections, {
    cardId: card.id,
    source: { area: "floor" },
    target: { area: "deck", deckId: "B" },
    action: "move",
  });
  assert.deepEqual(toOtherDeck.collections.floorCards, []);
  assert.deepEqual(toOtherDeck.collections.ownedDecks[1].cards, [card]);
});

test("collection transition schedules and restores a pending removal", () => {
  const card = { id: 8, name: "Bound card" };
  const initial = {
    ownedDecks: [{ id: "A", cards: [card], capacity: 10 }],
    inventoryCards: [],
    floorCards: [],
    pendingRemovedCards: [],
    pendingRemovedCardAreas: {},
  };
  const scheduled = transitionDeckEditorCardCollections(initial, {
    cardId: card.id,
    source: { area: "deck", deckId: "A" },
    target: { area: "floor" },
    action: "schedule-removal",
  });
  assert.deepEqual(scheduled.collections.ownedDecks[0].cards, []);
  assert.deepEqual(scheduled.collections.pendingRemovedCards, [card]);
  assert.deepEqual(scheduled.collections.pendingRemovedCardAreas, { [card.id]: "floor" });

  const restored = transitionDeckEditorCardCollections(scheduled.collections, {
    cardId: card.id,
    source: { area: "pendingRemoval" },
    target: { area: "deck", deckId: "A" },
    action: "restore-removal",
  });
  assert.deepEqual(restored.collections.ownedDecks[0].cards, [card]);
  assert.deepEqual(restored.collections.pendingRemovedCards, []);
  assert.deepEqual(restored.collections.pendingRemovedCardAreas, {});
});

test("opening an editor session snapshots card collections and origin deck ids", () => {
  const card = { id: 9, name: "Snapshot card" };
  const deck = { id: "A", cards: [card], capacity: 10 };
  const snapshot = createDeckEditorSnapshot({
    roomKey: "room-1",
    decks: [deck],
    activeDeckId: "A",
    inventory: [],
    consumables: [],
    floorCards: [],
    floorConsumables: [],
    floorDecks: [],
  });

  assert.notEqual(snapshot.decks[0], deck);
  assert.notEqual(snapshot.decks[0].cards, deck.cards);
  assert.deepEqual(snapshot.originDeckIdsByCardId, { [card.id]: "A" });
  snapshot.decks[0].cards.pop();
  assert.deepEqual(deck.cards, [card]);
});

test("newly transformed cards stay separate from their matching stack", () => {
  const cards = [
    { id: 10, name: "Test", effect: "attack", damageType: "physical", cost: 1, rarity: "basic" },
    { id: 11, name: "Test", effect: "attack", damageType: "physical", cost: 1, rarity: "basic" },
  ];
  const groups = groupAndSortDeckEditorCards(cards, "rarity", new Set([11]));
  assert.deepEqual(groups.map((group) => group.cardIds), [[10], [11]]);
});

test("rarity sorting puts higher rarities first, including equal-cost ties", () => {
  const cards = [
    { id: 1, name: "Basic", effect: "strike", damageType: "physical", cost: 1, rarity: "basic" },
    { id: 2, name: "Rare", effect: "strike", damageType: "physical", cost: 1, rarity: "rare" },
    { id: 3, name: "Legendary", effect: "strike", damageType: "physical", cost: 2, rarity: "legendary" },
  ];
  assert.deepEqual(groupAndSortDeckEditorCards(cards, "rarity", new Set()).map(({ card }) => card.id), [3, 2, 1]);
  assert.deepEqual(groupAndSortDeckEditorCards(cards, "cost", new Set()).map(({ card }) => card.id), [2, 1, 3]);
  assert.deepEqual(sortBattleHandByCost(cards, 0, 0).map((card) => card.id), [2, 1, 3]);
});
