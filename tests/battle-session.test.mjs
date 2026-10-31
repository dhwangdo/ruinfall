import assert from "node:assert/strict";
import test from "node:test";
import { prepareBattleStart } from "../app/game/battleSetup.ts";
import { createBattleSessionActions } from "../app/controllers/battleSessionActions.ts";
import { makeRunFixture } from "./helpers/run-state.mjs";
import { mapRoomKey, MAP_START } from "../app/game/mapRules.ts";
import { SPECIAL_CARD_POOL } from "../app/game/cards.ts";

test("one encounter grants rewards only once even when victory paths overlap", (t) => {
  t.mock.method(Math, "random", () => .9);
  const ctx = makeRunFixture(), actions = createBattleSessionActions(ctx.options());
  actions.grantBattleReward(1);
  const first = { gold: ctx.battle.battleRewardGold, nextId: ctx.inventory.nextCardIdRef.current,
    chance: ctx.inventory.deckDropChanceRef.current, pity: ctx.inventory.deckPityBattlesRemainingRef.current };
  actions.grantBattleReward(1);
  assert.ok(first.gold > 0);
  assert.deepEqual({ gold: ctx.battle.battleRewardGold, nextId: ctx.inventory.nextCardIdRef.current,
    chance: ctx.inventory.deckDropChanceRef.current, pity: ctx.inventory.deckPityBattlesRemainingRef.current }, first);
});

test("returning from chained encounters deposits rewards and carries HP into the next battle", () => {
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  ctx.battle.setActiveBattleRoom(key);
  ctx.battle.setBattleRewardGold(12);
  ctx.battle.setBattleRewards([{ id: 999, name: "reward" }]);
  ctx.battle.setGame({ ...ctx.battle.game, playerHp: 23, status: "won" });
  ctx.battle.mapBattleQueueRef.current = [{ id: "next", encounterIndex: 2 }];
  createBattleSessionActions(ctx.options()).returnToMap();
  assert.equal(ctx.inventory.gold, 1012);
  assert.equal(ctx.inventory.roomDrops[key][0].id, 999);
  assert.equal(ctx.battle.game.playerHp, 23);
  assert.equal(ctx.player.runPlayerHpRef.current, 23);
  assert.equal(ctx.battle.screen, "battle");
  assert.equal(ctx.battle.mapBattleQueueRef.current.length, 0);
  assert.equal(ctx.battle.battleRewardGold, 0);
});

test("finishing the last encounter removes the fought enemies and unlocks the boss region", () => {
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  ctx.battle.setActiveBattleRoom(key);
  ctx.battle.setActiveMapEnemyIds(["boss"]);
  ctx.world.setMapEnemyWorld({ enemies: [{ id: "boss", encounterIndex: 5, isBoss: true }, { id: "survivor" }] });
  ctx.battle.setGame({ ...ctx.battle.game, playerHp: 31, status: "won" });
  createBattleSessionActions(ctx.options()).returnToMap();
  assert.deepEqual(ctx.world.mapEnemyWorld.enemies.map(enemy => enemy.id), ["survivor"]);
  assert.equal(ctx.world.defeatedBossRegions.size, 1);
  assert.equal(ctx.battle.screen, "map");
  assert.equal(ctx.player.runPlayerHp, 31);
  assert.equal(ctx.battle.activeBattleRoom, null);
});

test("talismans grant two stats per copy and stack with other starting bonuses", () => {
  const ctx = makeRunFixture();
  const wolf = SPECIAL_CARD_POOL.find((card) => card.effect === "wolfTalisman");
  const turtle = SPECIAL_CARD_POOL.find((card) => card.effect === "turtleTalisman");
  const battleDeck = {
    ...ctx.inventory.ownedDecks[0],
    editions: ["giant"],
    cards: [{ ...wolf, id: 1 }, { ...wolf, id: 2 }, { ...turtle, id: 3 }],
  };
  const result = prepareBattleStart({
    battleDeck, encounters: [{ encounterIndex: 2 }], playerHp: 40,
    blessings: ["swordShield"], godsLamentCharges: 0, nextCardId: 100,
  });
  assert.equal(result.game.strength, 8);
  assert.equal(result.game.agility, 6);
});

test("battle preparation handles missing decks and bomb-defeated encounters", () => {
  const ctx = makeRunFixture();
  const base = { encounters: [{ encounterIndex: 2 }], playerHp: 40, blessings: [], godsLamentCharges: 3, nextCardId: 100 };
  const missing = prepareBattleStart(base);
  assert.equal(missing.game.status, "lost");
  assert.equal(missing.game.playerHp, 0);
  assert.equal(missing.nextCardId, 100);
  const bomb = prepareBattleStart({ ...base, battleDeck: ctx.inventory.ownedDecks[0],
    encounters: [{ encounterIndex: 2, damageTaken: 999 }] });
  assert.equal(bomb.game.status, "won");
  assert.equal(bomb.defeatedByBomb, true);
  assert.equal(bomb.remainingGodsLamentCharges, 2);
});
