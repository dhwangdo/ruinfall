import assert from "node:assert/strict";
import test from "node:test";
import { ALL_CARD_BLUEPRINTS, SPECIAL_CARD_POOL } from "../app/game/cards.ts";
import { mapRoomKey, MAP_START } from "../app/game/mapRules.ts";
import { createShopActions } from "../app/controllers/shopActions.ts";
import { createBlessingActions } from "../app/controllers/blessingActions.ts";
import { createLocationActions } from "../app/controllers/locationActions.ts";
import { makeRunFixture } from "./helpers/run-state.mjs";

test("a full inventory sends a purchase to its shop floor and charges it only once", () => {
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  const card = { ...SPECIAL_CARD_POOL[0], id: 9 };
  ctx.dialogs.setActiveShopRoom(key);
  ctx.inventory.setInventoryCards([card, { ...card, id: 10 }]);
  ctx.inventory.setRoomShops({ [key]: [{ id: "offer", price: 25, card, sold: false }] });
  createShopActions(ctx.options()).buyShopOffer("offer");
  assert.equal(ctx.inventory.gold, 975);
  assert.equal(ctx.inventory.inventoryCards.length, 2);
  assert.equal(ctx.inventory.roomDrops[key][0].id, 9);
  createShopActions(ctx.options()).buyShopOffer("offer");
  assert.equal(ctx.inventory.gold, 975);
  assert.equal(ctx.inventory.roomDrops[key].length, 1);
});

test("an unaffordable purchase leaves the stock, inventory and gold unchanged", () => {
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  ctx.dialogs.setActiveShopRoom(key);
  ctx.inventory.setGold(0);
  ctx.inventory.setRoomShops({ [key]: [{ id: "offer", price: 25, card: { id: 9 }, sold: false }] });
  createShopActions(ctx.options()).buyShopOffer("offer");
  assert.equal(ctx.inventory.roomShops[key][0].sold, false);
  assert.equal(ctx.inventory.inventoryCards.length, 0);
  assert.equal(ctx.inventory.gold, 0);
});

test("reopening a shop keeps its generated stock and card identities", (t) => {
  t.mock.method(Math, "random", () => .5);
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  createShopActions(ctx.options()).openShop(key, 2);
  const stock = ctx.inventory.roomShops[key], nextId = ctx.inventory.nextCardIdRef.current;
  assert.equal(stock.length, 9);
  assert.equal(new Set(stock.filter(offer => offer.card?.rarity === "special").map(offer => offer.card.name)).size, 3);
  createShopActions(ctx.options()).openShop(key, 2);
  assert.equal(ctx.inventory.roomShops[key], stock);
  assert.equal(ctx.inventory.nextCardIdRef.current, nextId);
});

test("claiming a blessing cannot grant it a second time", () => {
  const ctx = makeRunFixture();
  ctx.player.setBlessingOffers(["goldRush"]);
  createBlessingActions(ctx.options()).chooseBlessing("goldRush");
  createBlessingActions(ctx.options()).chooseBlessing("goldRush");
  assert.equal(ctx.inventory.gold, 1300);
  assert.deepEqual(ctx.player.blessings, ["goldRush"]);
  assert.equal(ctx.world.usedBlessingRooms.has(mapRoomKey(MAP_START)), true);
});

test("a lethal blessing reroll spends 1UP once or ends the run", () => {
  const ctx = makeRunFixture();
  ctx.player.runPlayerHpRef.current = 5;
  ctx.player.setBlessings(["oneUp"]);
  createBlessingActions(ctx.options()).rerollBlessings();
  assert.equal(ctx.player.runPlayerHpRef.current, 25);
  assert.equal(ctx.player.oneUpUsedRef.current, true);
  assert.equal(ctx.player.blessingRerollCost, 7);
  const lost = makeRunFixture();
  lost.player.runPlayerHpRef.current = 5;
  createBlessingActions(lost.options()).rerollBlessings();
  assert.equal(lost.battle.game.status, "lost");
  assert.equal(lost.battle.screen, "battle");
});

test("free tickets fit alongside a full card inventory while ordinary tickets spill to the floor", () => {
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  ctx.inventory.setInventoryCards([{ id: 1 }, { id: 2 }]);
  createBlessingActions(ctx.options()).grantConsumables("mapTicket", 2);
  assert.equal(ctx.inventory.roomConsumableDrops[key].length, 2);
  createBlessingActions(ctx.options()).grantConsumables("mapTicket", 2, true);
  assert.equal(ctx.inventory.inventoryConsumables.length, 2);
});

test("recovery respects forbidden knowledge and still applies the shrine pilgrim bonus", () => {
  const ctx = makeRunFixture();
  ctx.world.roomType = "recoveryShrine";
  ctx.player.setBlessings(["forbiddenKnowledge", "shrinePilgrim"]);
  ctx.player.runPlayerHpRef.current = 15;
  createLocationActions(ctx.options({ maxPlayerHp: 20 })).useCurrentRecoveryShrine();
  assert.equal(ctx.player.runPlayerHpRef.current, 17);
  assert.equal(ctx.player.vitalityShrineMaxHpBonus, 0);
  assert.equal(ctx.world.collapsedRecoveryShrineRooms.has(mapRoomKey(MAP_START)), true);
});

test("transforming at a shrine preserves both card identities and consumes the node", (t) => {
  t.mock.method(Math, "random", () => .5);
  const ctx = makeRunFixture();
  ctx.world.roomType = "transformShrine";
  const cards = [1, 2].map(id => ({ ...SPECIAL_CARD_POOL[0], id, revealed: true }));
  ctx.inventory.setInventoryCards(cards);
  const result = createLocationActions(ctx.options()).transformCardsAtShrine([1, 2]);
  assert.deepEqual(result.after.map(card => card.id), [1, 2]);
  assert.equal(result.after.every(card => card.name !== cards[0].name), true);
  assert.equal(ctx.world.collapsedTransformShrineRooms.has(mapRoomKey(MAP_START)), true);
});

test("combining five specials sends the rare result to the floor if the remaining inventory is full", (t) => {
  t.mock.method(Math, "random", () => .1);
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  ctx.world.roomType = "combinationShrine";
  const special = Array.from({ length: 5 }, (_, i) => ({ ...SPECIAL_CARD_POOL[0], id: i }));
  const extra = [9, 10].map(id => ({ ...ALL_CARD_BLUEPRINTS[0], id }));
  ctx.inventory.setInventoryCards([...special, ...extra]);
  const result = createLocationActions(ctx.options()).combineCardsAtShrine([0, 1, 2, 3, 4]);
  assert.equal(result.destination, "floor");
  assert.deepEqual(ctx.inventory.inventoryCards.map(card => card.id), [9, 10]);
  assert.equal(ctx.inventory.roomDrops[key][0].rarity, "rare");
  assert.equal(ctx.inventory.nextCardIdRef.current, 1001);
});

test("archaeologist can preserve a vitality shrine without changing current HP", (t) => {
  t.mock.method(Math, "random", () => .1);
  const ctx = makeRunFixture();
  ctx.world.roomType = "vitalityShrine";
  ctx.player.setBlessings(["archaeologist"]);
  createLocationActions(ctx.options()).useCurrentVitalityShrine();
  assert.equal(ctx.player.vitalityShrineMaxHpBonus, 5);
  assert.equal(ctx.player.runPlayerHpRef.current, 40);
  assert.equal(ctx.world.collapsedVitalityShrineRooms.size, 0);
});
