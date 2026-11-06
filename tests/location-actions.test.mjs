import assert from "node:assert/strict";
import test from "node:test";
import { SPECIAL_CARD_POOL } from "../app/game/cards.ts";
import { mapRoomKey, MAP_START } from "../app/game/mapRules.ts";
import { createBlessingActions } from "../app/controllers/blessingActions.ts";
import { createDeckVaultActions } from "../app/controllers/deckVaultActions.ts";
import { deckVaultUnlockHold } from "../app/game/deckVaultRules.ts";

test("vault holds require three keys and 2 seconds", () => {
  for (const keys of [0, 1, 2]) {
    assert.deepEqual(deckVaultUnlockHold(2000, keys), { progress: 0, complete: false });
  }
  assert.deepEqual(deckVaultUnlockHold(1999, 3), { progress: 1999 / 2000, complete: false });
  assert.deepEqual(deckVaultUnlockHold(2000, 3), { progress: 1, complete: true });
  assert.deepEqual(deckVaultUnlockHold(2100, 9), { progress: 1, complete: true });
});
import { createLocationActions } from "../app/controllers/locationActions.ts";
import { makeRunFixture } from "./helpers/run-state.mjs";

test("claiming a blessing cannot grant it a second time", () => {
  const ctx = makeRunFixture();
  ctx.player.setBlessingOffers(["vision"]);
  createBlessingActions(ctx.options()).chooseBlessing("vision");
  createBlessingActions(ctx.options()).chooseBlessing("vision");
  assert.equal(ctx.inventory.gold, 1000);
  assert.deepEqual(ctx.player.blessings, ["vision"]);
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

test("portals warn before destroying keys, and cancelling changes nothing", () => {
  const ctx = makeRunFixture();
  ctx.world.roomType = "portal";
  ctx.inventory.setKeys(5);
  const start = ctx.world.mapPosition;
  createLocationActions(ctx.options()).useCurrentPortal();
  assert.equal(ctx.dialogs.portalKeyWarningRoom, mapRoomKey(start));
  assert.equal(ctx.inventory.keys, 5);
  assert.deepEqual(ctx.world.mapPosition, start);
  ctx.dialogs.setPortalKeyWarningRoom(null);
  assert.equal(ctx.inventory.keys, 5);
  assert.deepEqual(ctx.world.mapPosition, start);
});

test("portal confirmation clears keys and remembers suppression across later portals", () => {
  const ctx = makeRunFixture();
  ctx.world.roomType = "portal";
  ctx.inventory.setKeys(5);
  createLocationActions(ctx.options()).useCurrentPortal();
  createLocationActions(ctx.options()).confirmPortalTravel(true);
  assert.equal(ctx.inventory.keys, 0);
  assert.equal(ctx.inventory.skipPortalKeyWarning, true);
  assert.equal(ctx.dialogs.portalKeyWarningRoom, null);
  const safePosition = ctx.world.mapPosition;
  assert.notDeepEqual(safePosition, MAP_START);
  ctx.world.roomType = "safePortal";
  ctx.inventory.setKeys(2);
  createLocationActions(ctx.options()).useCurrentPortal();
  assert.equal(ctx.dialogs.portalKeyWarningRoom, null);
  assert.equal(ctx.inventory.keys, 0);
  assert.notDeepEqual(ctx.world.mapPosition, safePosition);
});

test("portals need no warning with no keys and reject stale confirmations", () => {
  const ctx = makeRunFixture();
  ctx.world.roomType = "portal";
  createLocationActions(ctx.options()).useCurrentPortal();
  assert.equal(ctx.dialogs.portalKeyWarningRoom, null);
  assert.notDeepEqual(ctx.world.mapPosition, MAP_START);
  ctx.inventory.setKeys(4);
  ctx.dialogs.setPortalKeyWarningRoom(mapRoomKey(MAP_START));
  createLocationActions(ctx.options()).confirmPortalTravel(true);
  assert.equal(ctx.inventory.keys, 4);
  assert.equal(ctx.inventory.skipPortalKeyWarning, false);
});

test("a vault preview costs nothing; opening spends three keys and drops the exact preview once", () => {
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  const deck = { ...ctx.inventory.ownedDecks[0], id: "vault", name: "preview" };
  ctx.world.roomType = "deckVault";
  ctx.inventory.setRoomDeckVaults({ [key]: deck });
  ctx.inventory.setKeys(2);
  createDeckVaultActions(ctx.options()).openDeckVault();
  assert.equal(ctx.dialogs.deckVaultRoom, key);
  assert.equal(ctx.inventory.keys, 2);
  createDeckVaultActions(ctx.options()).unlockDeckVault();
  assert.equal(ctx.world.openedDeckVaultRooms.size, 0);
  assert.deepEqual(ctx.inventory.roomDeckDrops, {});
  ctx.inventory.setKeys(6);
  const actions = createDeckVaultActions(ctx.options());
  assert.equal(actions.unlockDeckVault(), deck);
  assert.equal(actions.unlockDeckVault(), undefined);
  assert.equal(ctx.inventory.keys, 3);
  assert.equal(ctx.inventory.roomDeckDrops[key].length, 1);
  assert.equal(ctx.inventory.roomDeckDrops[key][0], deck);
  assert.deepEqual(ctx.inventory.roomConsumableDrops[key].map(item => item.type), ["extractTicket"]);
  assert.equal(ctx.world.openedDeckVaultRooms.has(key), true);
  assert.equal(ctx.dialogs.deckVaultRoom, null);
});
