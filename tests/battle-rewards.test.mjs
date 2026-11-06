import assert from "node:assert/strict";
import test from "node:test";
import { createBattleSessionActions } from "../app/controllers/battleSessionActions.ts";
import { createRunSaveSnapshot, prepareRunRestore } from "../app/game/runSaveState.ts";
import { createBattleReward } from "../app/game/rewards.ts";
import { RARE_CARD_POOL } from "../app/game/cards.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { waitingState } from "../app/game/battleState.ts";
import { makeRunFixture } from "./helpers/run-state.mjs";
import { mapRoomKey, MAP_START } from "../app/game/mapRules.ts";

test("ordinary victories immediately award a card, update pity, leave blood and collect only once", t => {
  t.mock.method(Math, "random", () => .9);
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  ctx.battle.setActiveBattleRoom(key);
  ctx.battle.setGame({ ...ctx.battle.game, status: "won" });
  const actions = createBattleSessionActions(ctx.options());
  actions.grantBattleReward(1);
  assert.equal(ctx.battle.battleRewards.length, 1);
  assert.equal(ctx.battle.battleRewards[0].rarity, "special");
  assert.equal(ctx.inventory.nextCardIdRef.current, 1001);
  assert.equal(ctx.inventory.rareCardDropChanceRef.current, .07);
  assert.ok(ctx.world.bloodstainedRooms.has(key));
  actions.grantBattleReward(1);
  assert.equal(ctx.inventory.nextCardIdRef.current, 1001);
  const finished = createBattleSessionActions(ctx.options());
  finished.returnToMap(); finished.returnToMap();
  assert.equal(ctx.inventory.gold, 1000);
  assert.equal(ctx.inventory.keys, 1);
  assert.equal(ctx.inventory.roomDrops[key].length, 1);
  assert.equal(ctx.battle.screen, "map");
});

test("tickets use the original 50 percent threshold and rare drops reset pity", t => {
  t.mock.method(Math, "random", () => .499);
  assert.equal(createBattleReward(1, 123).consumableTypes.length, 1);
  Math.random.mock.mockImplementation(() => .5);
  assert.equal(createBattleReward(1, 123).consumableTypes.length, 0);
  Math.random.mock.mockImplementation(() => 0);
  const ctx = makeRunFixture();
  ctx.inventory.rareCardDropChanceRef.current = .25;
  createBattleSessionActions(ctx.options()).grantBattleReward(1);
  assert.equal(ctx.battle.battleRewards[0].rarity, "rare");
  assert.equal(ctx.inventory.rareCardDropChanceRef.current, .05);
  assert.equal(ctx.battle.battleRewardConsumables.length, 1);
});

test("bosses keep their guaranteed rare card and two tickets without a key", () => {
  const ctx = makeRunFixture();
  ctx.battle.battleRewardIsBossRef.current = true;
  createBattleSessionActions(ctx.options()).grantBattleReward(1);
  assert.equal(ctx.battle.battleRewards[0].rarity, "rare");
  assert.equal(ctx.battle.battleRewardConsumables.length, 2);
  assert.equal(ctx.battle.battleRewardKeys, 0);
});

test("blood and wish rules remain restorable", () => {
  const wish = { ...RARE_CARD_POOL.find(card => card.effect === "wish"), id: 7, value: 0, exhaust: false };
  const state = prepareRunRestore({ mapSeed: 1, mapPosition: MAP_START, blessings: [],
    bloodstainedRooms: ["1:2"], inventoryCards: [wish] }, () => false);
  assert.deepEqual(state.bloodstainedRooms, ["1:2"]);
  assert.equal(state.inventoryCards[0].value, 3);
  assert.equal(state.inventoryCards[0].exhaust, true);
  const sets = { seenRooms: new Set(), defeatedBossRegions: new Set(), destroyedShopRooms: new Set(),
    collapsedExtractionShrineRooms: new Set(), collapsedRecoveryShrineRooms: new Set(), collapsedVitalityShrineRooms: new Set(),
    collapsedMindEyeShrineRooms: new Set(), collapsedTransformShrineRooms: new Set(), collapsedTreasureChestRooms: new Set(),
    usedHealRooms: new Set(), usedBlessingRooms: new Set(), blessingSeenOfferIds: new Set(), bloodstainedRooms: new Set(["1:2"]) };
  const snapshot = createRunSaveSnapshot({ ...state, ...sets });
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)).bloodstainedRooms, ["1:2"]);
});

test("wish generates three separate rare tokens and exhausts the played card", () => {
  const wish = { ...RARE_CARD_POOL.find(card => card.effect === "wish"), id: 7, revealed: true };
  const state = { ...waitingState(50, createSewerEncounterByIndex(0)), hand: [wish], initialDeck: [wish] };
  const result = resolveCardPlay(state, { card: wish }, { phase: "playing", maxPlayerHp: 50, blessings: [], oneUpUsed: false,
    nextCardId: 100, randomRolls: Array(40).fill(.5) });
  assert.equal(result.played, true);
  assert.equal(result.state.hand.length, 3);
  assert.deepEqual(result.state.hand.map(card => card.id), [100, 101, 102]);
  assert.ok(result.state.hand.every(card => card.rarity === "rare" && card.token));
  assert.ok(result.state.removedFromReshuffleIds.includes(7));
  assert.equal(result.state.discard.length, 0);
});
