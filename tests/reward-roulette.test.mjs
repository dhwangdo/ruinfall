import assert from "node:assert/strict";
import test from "node:test";
import { freshRewardRoulette, normalizeRewardRoulette, rollRewardRoulette, createRoulettePrize } from "../app/game/rewardRoulette.ts";
import { TICKET_TIERS } from "../app/game/shopRules.ts";
import { createBattleSessionActions } from "../app/controllers/battleSessionActions.ts";
import { createPortalActions } from "../app/controllers/portalActions.ts";
import { createRunSaveSnapshot, prepareRunRestore } from "../app/game/runSaveState.ts";
import { RARE_CARD_POOL } from "../app/game/cards.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { waitingState } from "../app/game/battleState.ts";
import { makeRunFixture } from "./helpers/run-state.mjs";
import { mapRoomKey, MAP_START } from "../app/game/mapRules.ts";

test("nine draws exhaust every wedge once, including two special cards; each remaining wedge is equally selectable", () => {
  let remaining = freshRewardRoulette();
  const drawn = [];
  while (remaining.length) {
    for (let i = 0; i < remaining.length; i++) {
      assert.equal(rollRewardRoulette(remaining, () => (i + .5) / remaining.length).selected, remaining[i]);
    }
    const result = rollRewardRoulette(remaining, () => .61);
    drawn.push(result.selected); remaining = result.remaining;
  }
  assert.equal(new Set(drawn).size, 9);
  assert.equal(drawn.filter(id => id.startsWith("special-")).length, 2);
  assert.equal(rollRewardRoulette(remaining), null);
  assert.deepEqual(normalizeRewardRoulette([]), []);
  assert.equal(normalizeRewardRoulette(undefined).length, 9);
  assert.deepEqual(normalizeRewardRoulette(["rare", "rare", "unknown"]), ["rare"]);
});

test("roulette prizes use exact card rarities, ticket tiers, fixed extraction tickets and triple regional gold", () => {
  for (const slot of ["special-a", "special-b", "rare"]) {
    const prize = createRoulettePrize(slot, 1, 700, () => .5);
    assert.equal(prize.card.rarity, slot === "rare" ? "rare" : "special");
    assert.equal(prize.card.id, 700);
  }
  assert.equal(createRoulettePrize("extract", 1, 0).consumableType, "extractTicket");
  assert.equal(createRoulettePrize("extract-plus", 1, 0).consumableType, "extractPlusTicket");
  for (const tier of [1, 2, 3]) for (const roll of [0, .4, .999]) {
    assert.equal(TICKET_TIERS[createRoulettePrize(`ticket-${tier}`, 1, 0, () => roll).consumableType], tier);
  }
  assert.equal(createRoulettePrize("gold", 1, 0, () => 0).gold, 30);
  assert.equal(createRoulettePrize("gold", 2, 0, () => 0).gold, 39);
});

test("a victory requires one manual spin, cannot spin/award twice, leaves blood, and deposits the prize", t => {
  t.mock.method(Math, "random", () => 0);
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  ctx.battle.setActiveBattleRoom(key);
  ctx.battle.setGame({ ...ctx.battle.game, status: "won" });
  let actions = createBattleSessionActions(ctx.options());
  actions.grantBattleReward(1);
  assert.equal(ctx.battle.battleRewardGold, 10);
  assert.equal(ctx.battle.battleRewards.length, 0);
  assert.ok(ctx.world.bloodstainedRooms.has(key));
  actions.returnToMap();
  assert.equal(ctx.inventory.gold, 1000);
  actions.spinBattleReward(); actions.spinBattleReward();
  assert.equal(ctx.player.rewardRouletteRemaining.length, 8);
  actions.returnToMap();
  assert.equal(ctx.inventory.gold, 1000);
  actions.finishBattleRewardSpin(); actions.finishBattleRewardSpin();
  assert.equal(ctx.battle.battleRewards.length, 1);
  assert.equal(ctx.inventory.nextCardIdRef.current, 1001);
  assert.equal(ctx.battle.battleRewards[0].rarity, "special");
  actions = createBattleSessionActions(ctx.options());
  actions.returnToMap(); actions.returnToMap();
  assert.equal(ctx.inventory.gold, 1010);
  assert.equal(ctx.inventory.keys, 1);
  assert.equal(ctx.inventory.roomDrops[key].length, 1);
});

test("after exhaustion gold and keys continue, bosses keep old rewards, and only actual portal travel resets the wheel", () => {
  const ctx = makeRunFixture();
  ctx.player.setRewardRouletteRemaining([]);
  ctx.battle.setActiveBattleRoom(mapRoomKey(MAP_START));
  ctx.battle.setGame({ ...ctx.battle.game, status: "won" });
  let actions = createBattleSessionActions(ctx.options());
  actions.grantBattleReward(1); actions.spinBattleReward();
  assert.equal(ctx.battle.battleRewardRoulette.phase, "empty");
  assert.equal(ctx.battle.battleRewardKeys, 1);
  assert.ok(ctx.battle.battleRewardGold >= 10);
  assert.deepEqual(ctx.battle.battleRewards, []);
  createBattleSessionActions(ctx.options()).returnToMap();
  ctx.battle.rewardGrantedRef.current = false;
  ctx.battle.battleRewardIsBossRef.current = true;
  actions = createBattleSessionActions(ctx.options()); actions.grantBattleReward(1);
  assert.equal(ctx.battle.battleRewardRoulette, null);
  assert.equal(ctx.battle.battleRewards[0].rarity, "rare");
  assert.equal(ctx.battle.battleRewardConsumables.length, 2);
  assert.equal(ctx.battle.battleRewardKeys, 0);
  ctx.world.roomType = "portal";
  ctx.inventory.setKeys(1);
  createPortalActions(ctx.options()).useCurrentPortal();
  assert.equal(ctx.player.rewardRouletteRemaining.length, 0);
  createPortalActions(ctx.options()).confirmPortalTravel(false);
  assert.equal(ctx.player.rewardRouletteRemaining.length, 9);
});

test("roulette progress, blood, and new wish rules restore without resetting an exhausted wheel", () => {
  const wish = { ...RARE_CARD_POOL.find(card => card.effect === "wish"), id: 7, value: 0, exhaust: false };
  const state = prepareRunRestore({ mapSeed: 1, mapPosition: MAP_START, blessings: [], rewardRouletteRemaining: [],
    bloodstainedRooms: ["1:2"], inventoryCards: [wish] }, () => false);
  assert.deepEqual(state.rewardRouletteRemaining, []);
  assert.deepEqual(state.bloodstainedRooms, ["1:2"]);
  assert.equal(state.inventoryCards[0].value, 3);
  assert.equal(state.inventoryCards[0].exhaust, true);
  const sets = { seenRooms: new Set(), defeatedBossRegions: new Set(), destroyedShopRooms: new Set(),
    collapsedExtractionShrineRooms: new Set(), collapsedRecoveryShrineRooms: new Set(), collapsedVitalityShrineRooms: new Set(),
    collapsedMindEyeShrineRooms: new Set(), collapsedTransformShrineRooms: new Set(), collapsedTreasureChestRooms: new Set(),
    usedHealRooms: new Set(), usedBlessingRooms: new Set(), blessingSeenOfferIds: new Set(), bloodstainedRooms: new Set(["1:2"]) };
  const snapshot = createRunSaveSnapshot({ ...state, ...sets });
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)).bloodstainedRooms, ["1:2"]);
  assert.deepEqual(prepareRunRestore({ ...state, rewardRouletteRemaining: ["gold", "rare"] }, () => false).rewardRouletteRemaining, ["gold", "rare"]);
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
