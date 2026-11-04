import assert from "node:assert/strict";
import test from "node:test";
import { prepareBattleStart } from "../app/game/battleSetup.ts";
import { createBattleSessionActions } from "../app/controllers/battleSessionActions.ts";
import { makeRunFixture } from "./helpers/run-state.mjs";
import { mapRoomKey, MAP_START } from "../app/game/mapRules.ts";
import { SPECIAL_CARD_POOL, RARE_CARD_POOL } from "../app/game/cards.ts";

test("one encounter grants rewards only once even when victory paths overlap", (t) => {
  t.mock.method(Math, "random", () => .9);
  const ctx = makeRunFixture(), actions = createBattleSessionActions(ctx.options());
  actions.grantBattleReward(1);
  const first = { gold: ctx.battle.battleRewardGold, nextId: ctx.inventory.nextCardIdRef.current,
    keys: ctx.battle.battleRewardKeys };
  actions.grantBattleReward(1);
  assert.ok(first.gold > 0);
  assert.deepEqual({ gold: ctx.battle.battleRewardGold, nextId: ctx.inventory.nextCardIdRef.current,
    keys: ctx.battle.battleRewardKeys }, first);
});

test("returning from chained encounters deposits rewards and carries HP into the next battle", () => {
  const ctx = makeRunFixture(), key = mapRoomKey(MAP_START);
  ctx.battle.setActiveBattleRoom(key);
  ctx.battle.setBattleRewardGold(12);
  ctx.battle.setBattleRewardKeys(1);
  ctx.battle.setBattleRewards([{ id: 999, name: "reward" }]);
  ctx.battle.setGame({ ...ctx.battle.game, playerHp: 23, status: "won" });
  ctx.battle.mapBattleQueueRef.current = [{ id: "next", encounterIndex: 2 }];
  createBattleSessionActions(ctx.options()).returnToMap();
  assert.equal(ctx.inventory.gold, 1012);
  assert.equal(ctx.inventory.keys, 1);
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

test("talismans grant one stat per copy and stack with other starting bonuses", () => {
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
  assert.equal(result.game.strength, 6);
  assert.equal(result.game.agility, 5);
});

test("quick hammer forges a battle copy, preserves it for reshuffles and triggers forge bonuses", () => {
  const ctx = makeRunFixture();
  const core = SPECIAL_CARD_POOL.find(card => card.name === "낡은 노심");
  const exchange = SPECIAL_CARD_POOL.find(card => card.effect === "exchange");
  const dagger = RARE_CARD_POOL.find(card => card.effect === "obsidianDagger");
  const battleDeck = { ...ctx.inventory.ownedDecks[0], editions: ["quickHammer", "hammering", "resistance"],
    cards: [core, exchange, dagger].map((card, index) => ({ ...card, id: index + 1 })) };
  const { game } = prepareBattleStart({ battleDeck, encounters: [{ encounterIndex: 2 }], playerHp: 40,
    blessings: ["blacksmith"], godsLamentCharges: 0, nextCardId: 100 });
  assert.equal(game.initialDeck.find(card => card.id === 1).forged, true);
  assert.equal(game.initialDeck.filter(card => card.forged).length, 1);
  assert.equal([...game.piles.flat(), ...game.hand].filter(card => card.forged).length, 1);
  assert.ok(battleDeck.cards.every(card => !card.forged));
  assert.equal(game.forgeCount, 1);
  assert.equal(game.stars, 4);
  assert.equal(game.blacksmithForgeUsedThisTurn, true);
  assert.equal(game.playerResistance, 2);
});

test("quick hammer skips decks without eligible cards and glass cannon blocks starting resistance", () => {
  const ctx = makeRunFixture();
  const battleDeck = { ...ctx.inventory.ownedDecks[0], editions: ["quickHammer", "resistance"],
    cards: [SPECIAL_CARD_POOL.find(card => card.effect === "exchange"),
      RARE_CARD_POOL.find(card => card.effect === "obsidianDagger")].map((card, id) => ({ ...card, id })) };
  const { game } = prepareBattleStart({ battleDeck, encounters: [{ encounterIndex: 2 }], playerHp: 40,
    blessings: ["glassCannon", "blacksmith"], godsLamentCharges: 0, nextCardId: 100 });
  assert.equal(game.forgeCount, 0);
  assert.equal(game.stars, 2);
  assert.equal(game.playerResistance, 0);
  assert.ok(game.initialDeck.every(card => !card.forged));
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

test("a puppeteer killed by map bomb damage cancels its colossus before the first turn", () => {
  const ctx = makeRunFixture();
  const result = prepareBattleStart({
    encounters: [{ encounterIndex: 20, damageTaken: 12 }],
    battleDeck: ctx.inventory.ownedDecks[0], playerHp: 40,
    blessings: [], godsLamentCharges: 0, nextCardId: 100,
  });
  const [colossus, puppeteer] = result.game.enemies;
  assert.ok(colossus.hp > 0);
  assert.equal(colossus.stunned, true);
  assert.equal(puppeteer.hp, 0);
  assert.equal(puppeteer.deathStunTargetId, undefined);
  assert.equal(result.game.status, "playing");
});

test("a multi-enemy encounter grants one key and continuing cannot collect it twice", () => {
  const ctx = makeRunFixture();
  ctx.battle.setActiveBattleRoom(mapRoomKey(MAP_START));
  const actions = createBattleSessionActions(ctx.options());
  actions.grantBattleReward(1);
  assert.equal(ctx.battle.battleRewardKeys, 1);
  assert.deepEqual(ctx.battle.battleRewardDecks, []);
  ctx.battle.setGame({ ...ctx.battle.game, status: "won" });
  const finished = createBattleSessionActions(ctx.options());
  finished.returnToMap();
  finished.returnToMap();
  assert.equal(ctx.inventory.keys, 1);
});

test("future-region encounters retain the deck plus one key", () => {
  const ctx = makeRunFixture();
  ctx.battle.battleRewardIsOutOfDepthRef.current = true;
  createBattleSessionActions(ctx.options()).grantBattleReward(2);
  assert.equal(ctx.battle.battleRewardDecks.length, 1);
  assert.equal(ctx.battle.battleRewardKeys, 1);
});
