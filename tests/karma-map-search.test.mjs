import assert from "node:assert/strict";
import test from "node:test";
import { applyKarmaToEnemy, karmaStageForWins } from "../app/game/karmaRules.ts";
import { buildMapSearchEntries, filterMapSearchEntries } from "../app/game/mapSearch.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { spawnEnemyMinions } from "../app/game/enemyPassives.ts";
import { ROACH_HATCHLING } from "../app/game/regionOneEnemies.ts";
import { createBattleSessionActions } from "../app/controllers/battleSessionActions.ts";
import { createPortalActions } from "../app/controllers/portalActions.ts";
import { createStarterDeck } from "../app/game/rewards.ts";
import { RARE_CARD_POOL, BASIC_CARD_POOL } from "../app/game/cards.ts";
import { prepareRunRestore } from "../app/game/runSaveState.ts";
import { makeRunFixture } from "./helpers/run-state.mjs";

test("karma starts after twelve victories, increases linearly, and carries to summons", () => {
  assert.deepEqual([0, 11, 12, 13, 20].map(karmaStageForWins), [0, 0, 1, 2, 9]);
  const enemy = { ...createSewerEncounterByIndex(2)[0], hp: 55, maxHp: 55, strength: 2 };
  const buffed = applyKarmaToEnemy(enemy, 2);
  assert.equal(buffed.strength, 4);
  assert.equal(buffed.hp, 66);
  assert.equal(buffed.maxHp, 66);
  assert.equal(enemy.hp, 55);
  const child = spawnEnemyMinions([buffed], new Set([buffed.id])).at(-1);
  assert.equal(child.karmaStage, 2);
  assert.equal(child.strength, ROACH_HATCHLING.strength + 2);
  assert.equal(child.maxHp, Math.floor(ROACH_HATCHLING.maxHp * 12 / 10));
});

test("a victory counts once and the next encounter immediately uses the new karma stage", () => {
  const ctx = makeRunFixture();
  ctx.player.setRegionBattleWins(11);
  const actions = createBattleSessionActions(ctx.options());
  actions.grantBattleReward(1);
  actions.grantBattleReward(1);
  assert.equal(ctx.player.regionBattleWins, 12);
  actions.startBattleNow([{ encounterIndex: 2 }], 40, "starter");
  assert.ok(ctx.battle.game.enemies.every(enemy => enemy.karmaStage === 1));
  actions.grantBattleReward(1);
  assert.equal(ctx.player.regionBattleWins, 13);
});

test("portal warnings preserve karma until actual travel; travel clears wins and karma", () => {
  const ctx = makeRunFixture();
  ctx.world.roomType = "portal";
  ctx.player.setRegionBattleWins(14);
  ctx.inventory.setKeys(3);
  const actions = createPortalActions(ctx.options());
  actions.useCurrentPortal();
  assert.equal(ctx.player.regionBattleWins, 14);
  assert.ok(ctx.dialogs.portalKeyWarningRoom);
  actions.confirmPortalTravel(false);
  assert.equal(ctx.player.regionBattleWins, 0);
  assert.equal(karmaStageForWins(ctx.player.regionBattleWins), 0);
});

test("run restoration preserves karma progress and defaults legacy saves to zero", () => {
  const state = { mapPosition: { x: 0, y: 0 }, mapSeed: 1, blessings: [] };
  assert.equal(prepareRunRestore(state, () => false).regionBattleWins, 0);
  assert.equal(prepareRunRestore({ ...state, regionBattleWins: 14 }, () => false).regionBattleWins, 14);
  assert.equal(prepareRunRestore({ ...state, regionBattleWins: -2 }, () => false).regionBattleWins, 0);
});

test("map search indexes discovered vault contents and editions without revealing hidden rooms", () => {
  const deck = { ...createStarterDeck(), name: "빛의 서고", editions: ["quickHammer"],
    cards: [{ ...RARE_CARD_POOL.find(card => card.effect === "evolutionTheory"), id: 100 }] };
  const card = { ...BASIC_CARD_POOL[0], id: 1 };
  const inspected = [];
  const entries = buildMapSearchEntries({ seenRooms: new Set(["0:0", "1:0", "2:0"]), seed: 1,
    roomTypeAt: position => { inspected.push(`${position.x}:${position.y}`); return position.x === 2 ? "shop" : "empty"; },
    openedVaultRooms: new Set(), vaults: { "0:0": deck, "100:10": { ...deck, name: "비밀 금고" } },
    cards: { "1:0": [card, { ...card, id: 2 }] }, decks: {}, consumables: {} });
  const filter = query => filterMapSearchEntries(entries, { query, kind: "vault", region: 1, includeOpened: false });
  assert.equal(filter("").length, 1);
  for (const query of ["빛의서고", "진화론", "빠른 망치"]) assert.equal(filter(query)[0].deck.name, deck.name);
  assert.equal(filter("비밀").length, 0);
  assert.equal(inspected.includes("100:10"), false);
  assert.equal(entries.find(entry => entry.card)?.count, 2);
  assert.equal(entries.find(entry => entry.kind === "place")?.label, "상점");
  const opened = entries.map(entry => entry.kind === "vault" ? { ...entry, opened: true } : entry);
  assert.equal(filterMapSearchEntries(opened, { query: "", kind: "vault", region: "all", includeOpened: false }).length, 0);
  assert.equal(filterMapSearchEntries(opened, { query: "", kind: "vault", region: "all", includeOpened: true }).length, 1);
});
