import assert from "node:assert/strict";
import test from "node:test";
import { BASIC_CARD_POOL, RARE_CARD_POOL, LEGENDARY_CARD_POOL } from "../app/game/cards.ts";
import { createConsumable } from "../app/game/rewards.ts";
import { MAP_START, mapRoomKey } from "../app/game/mapRules.ts";
import { createDeckEditorMoves } from "../app/controllers/deckEditorMoves.ts";
import { createTicketActions } from "../app/controllers/ticketActions.ts";

const card = (id, blueprint = BASIC_CARD_POOL[0]) => ({ ...blueprint, id, revealed: true });
const noop = () => {};

// Synchronous state cells model one action, then render() reads the new state again.
function field(owner, name, initial) {
  let value = initial;
  Object.defineProperty(owner, name, { get: () => value, configurable: true });
  owner[`set${name[0].toUpperCase()}${name.slice(1)}`] = (update) => {
    value = typeof update === "function" ? update(value) : update;
  };
}

function setup({ type = "extractTicket", blessings = [], capacity = 2, target = card(1) } = {}) {
  const ticket = createConsumable(type, "ticket");
  const inventory = {};
  field(inventory, "ownedDecks", [{
    id: "deck", name: "test", cards: [target, card(2)], capacity: 5,
    rareSlotCapacity: 1, editions: [], editionColors: {},
  }]);
  field(inventory, "inventoryCards", [card(3)]);
  field(inventory, "inventoryConsumables", [ticket]);
  field(inventory, "roomDrops", {});
  field(inventory, "roomConsumableDrops", {});
  inventory.inventoryConsumablesRef = { current: [ticket] };
  inventory.nextCardIdRef = { current: 4 };
  inventory.updateDeckCards = (id, update) => inventory.setOwnedDecks((decks) =>
    decks.map((deck) => deck.id === id ? { ...deck, cards: update(deck.cards) } : deck));
  inventory.nextConsumable = (kind) => createConsumable(kind, "new-ticket");
  const player = { blessings, runPlayerHpRef: { current: 49 }, darkTicketTurnsRemainingRef: { current: 0 } };
  field(player, "runPlayerHp", 49);
  field(player, "darkTicketTurnsRemaining", 0);
  const world = { mapPosition: MAP_START, mapSeed: 1, seenRooms: new Set(), mapBombsRef: { current: [] } };
  field(world, "mapEnemyWorld", { enemies: [] });
  world.effectiveRoomType = () => "empty";
  world.setMapBombsSynced = (bombs) => { world.mapBombsRef.current = bombs; };
  const editor = {
    deckEditorHighRarityInsertionOriginsRef: { current: {} },
    originalDeckIdForCard: (id) => id === target.id || id === 2 ? "deck" : null,
    effectiveOriginDeckIdForCard: (id) => id === target.id || id === 2 ? "deck" : null,
    finishDeckEditorSession: noop,
  };
  for (const [name, value] of Object.entries({
    pendingRemovedCards: [], pendingRemovedCardAreas: {}, deckEditorReleasedCardIds: new Set(),
    pendingPaintTicketId: null, pendingCloneTicketId: null, pendingExtractTicketId: null,
    pendingTransformTicketId: null, armedBombTicketIds: new Set(), deckEditorMessage: "",
    transformedCardNewIds: new Set(), deckEditorDeckId: "deck",
  })) field(editor, name, value);
  const render = () => {
    const inventoryItemCount = inventory.inventoryCards.length + inventory.inventoryConsumables.length;
    const { moveDeckEditorCard } = createDeckEditorMoves({
      inventory, player, world, editor, inventoryCapacity: capacity,
      deckEditorInventoryItemCount: inventoryItemCount,
      onFloorCardAcquired: noop, clearCardPreview: noop,
    });
    return createTicketActions({
      inventory, player, world, editor, inventoryCapacity: capacity, inventoryItemCount,
      deckEditorInventoryItemCount: inventoryItemCount, maxPlayerHp: 50,
      editingDeck: inventory.ownedDecks[0], moveDeckEditorCard, clearCardPreview: noop,
      queueRunSave: noop, showMapMessage: noop, activateMindEye: noop, grantConsumables: noop,
      openCardPack: noop, materializeMapContent: (_positions, _seed, existing) => existing,
      startMapTicketCameraTour: noop,
    });
  };
  return { inventory, player, world, editor, render, target, ticket };
}

test("extraction uses the inventory slot freed by consuming its ticket", () => {
  const ctx = setup();
  ctx.render().applyTicketToCard("ticket", ctx.target, "deck", ctx.inventory.ownedDecks[0]);
  assert.equal(ctx.inventory.inventoryConsumables.length, 0);
  assert.deepEqual(ctx.inventory.inventoryCards.map((item) => item.id), [3, 1]);
  assert.deepEqual(ctx.inventory.ownedDecks[0].cards.map((item) => item.id), [2]);
  assert.equal(ctx.editor.deckEditorReleasedCardIds.has(1), true);
});

test("a basic extraction ticket cannot consume itself on a rare card", () => {
  const ctx = setup({ target: card(1, RARE_CARD_POOL[0]) });
  ctx.render().applyTicketToCard("ticket", ctx.target, "deck", ctx.inventory.ownedDecks[0]);
  assert.equal(ctx.inventory.inventoryConsumables.length, 1);
  assert.equal(ctx.inventory.ownedDecks[0].cards.length, 2);
  assert.equal(ctx.inventory.inventoryCards.length, 1);
});

test("a preserved extraction ticket does not promise an inventory slot", (t) => {
  t.mock.method(Math, "random", () => 0);
  const ctx = setup({ blessings: ["oneMore"] });
  ctx.render().applyTicketToCard("ticket", ctx.target, "deck", ctx.inventory.ownedDecks[0]);
  assert.equal(ctx.inventory.inventoryConsumables.length, 1);
  assert.equal(ctx.inventory.inventoryCards.length, 1);
  assert.equal(ctx.inventory.roomDrops[mapRoomKey(MAP_START)][0].id, 1);
});

test("cloning consumes the ticket before filling the inventory slot", () => {
  const ctx = setup({ type: "cloneTicket" });
  ctx.render().applyTicketToCard("ticket", ctx.target, "deck", ctx.inventory.ownedDecks[0]);
  assert.equal(ctx.inventory.inventoryConsumables.length, 0);
  assert.deepEqual(ctx.inventory.inventoryCards.map((item) => item.id), [3, 4]);
  assert.equal(ctx.inventory.inventoryCards[1].revealed, false);
  assert.equal(ctx.inventory.roomDrops[mapRoomKey(MAP_START)], undefined);
});

test("painting retains the card identity and caps ticket healing at maximum HP", () => {
  const ctx = setup({ type: "paintTicket", blessings: ["healingMileage"] });
  ctx.render().applyTicketToCard("ticket", ctx.target, "deck", ctx.inventory.ownedDecks[0]);
  assert.equal(ctx.inventory.ownedDecks[0].cards[0].id, 1);
  assert.equal(ctx.inventory.ownedDecks[0].cards[0].colored, true);
  assert.equal(ctx.player.runPlayerHp, 50);
  assert.equal(ctx.player.runPlayerHpRef.current, 50);
});

test("card transformation preserves rarity, identity and reveal state", () => {
  const ctx = setup({ type: "transformTicket" });
  ctx.render().applyTicketToCard("ticket", ctx.target, "deck", ctx.inventory.ownedDecks[0]);
  const transformed = ctx.inventory.ownedDecks[0].cards[0];
  assert.notEqual(transformed.name, ctx.target.name);
  assert.equal(transformed.rarity, ctx.target.rarity);
  assert.equal(transformed.id, ctx.target.id);
  assert.equal(transformed.revealed, ctx.target.revealed);
  assert.equal(ctx.editor.transformedCardNewIds.has(1), true);
  assert.equal(ctx.inventory.inventoryConsumables.length, 0);
});

test("legendary card transformation leaves both the card and ticket intact", () => {
  const ctx = setup({ type: "transformTicket", target: card(1, LEGENDARY_CARD_POOL[0]) });
  ctx.render().applyTicketToCard("ticket", ctx.target, "deck", ctx.inventory.ownedDecks[0]);
  assert.equal(ctx.inventory.ownedDecks[0].cards[0], ctx.target);
  assert.equal(ctx.inventory.inventoryConsumables.length, 1);
});

test("confirming armed floor bombs installs only bombs on the current floor", () => {
  const ctx = setup({ type: "bombTicket" });
  const key = mapRoomKey(MAP_START);
  const armed = { ...createConsumable("bombTicket", "floor-bomb"), armedMovesRemaining: 3 };
  const untouched = createConsumable("extractTicket", "other");
  ctx.inventory.setRoomConsumableDrops({ [key]: [armed, untouched], elsewhere: [armed] });
  ctx.render().installArmedFloorBombs();
  assert.equal(ctx.world.mapBombsRef.current.length, 1);
  assert.deepEqual(ctx.world.mapBombsRef.current[0].position, MAP_START);
  assert.equal(ctx.world.mapBombsRef.current[0].movesRemaining, 3);
  assert.deepEqual(ctx.inventory.roomConsumableDrops[key], [untouched]);
  assert.deepEqual(ctx.inventory.roomConsumableDrops.elsewhere, [armed]);
});
