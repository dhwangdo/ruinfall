import assert from "node:assert/strict";
import test from "node:test";

import {
  applyPlayerTurnStart,
  applyPlayerAttack,
  chooseNextIntent,
  createSewerEncounterByIndex,
  getEnemyCodexEntries,
  getEncounterIndicesForRegion,
  getEncounterRegionNumber,
  getEncounterSpawnPool,
  playerAttackThornHits,
  resolveEnemyHitAgainstPlayer,
  retainBlockAfterEnemyTurn,
} from "../app/game/enemies.ts";

test("unified resistance reduces physical and magic attacks before block", () => {
  for (const damageType of ["physical", "magic"]) {
    assert.deepEqual(resolveEnemyHitAgainstPlayer({ damage: 10, damageType, resistance: 1, block: 5 }),
      { transformedDamage: 7, blocked: 5, damageTaken: 2, remainingBlock: 0 });
  }
});

test("negative resistance transforms each hit before matching block is consumed", () => {
  assert.deepEqual(resolveEnemyHitAgainstPlayer({
    damage: 10,
    damageType: "physical",
    block: 7,
  }), { transformedDamage: 10, blocked: 7, damageTaken: 3, remainingBlock: 0 });
  assert.deepEqual(resolveEnemyHitAgainstPlayer({
    damage: 10,
    damageType: "physical",
    block: 7,
    resistance: -1,
  }), { transformedDamage: 13, blocked: 7, damageTaken: 6, remainingBlock: 0 });
  assert.deepEqual(resolveEnemyHitAgainstPlayer({
    damage: 12,
    damageType: "physical",
    block: 7,
    resistance: -1,
  }), { transformedDamage: 15, blocked: 7, damageTaken: 8, remainingBlock: 0 });
});

test("insurance ignores the negative resistance multiplier", () => {
  assert.deepEqual(resolveEnemyHitAgainstPlayer({
    damage: 11,
    damageType: "physical",
    block: 3,
    resistance: -1,
    ignoreNegativeResistance: true,
  }), { transformedDamage: 11, blocked: 3, damageTaken: 8, remainingBlock: 0 });
});

test("sturdy stance retains half of block remaining after the enemy turn", () => {
  const hit = resolveEnemyHitAgainstPlayer({ damage: 8, damageType: "physical", block: 11 });
  assert.equal(hit.damageTaken, 0);
  assert.equal(hit.remainingBlock, 3);
  assert.equal(retainBlockAfterEnemyTurn(hit.remainingBlock, true), 1);
  assert.equal(retainBlockAfterEnemyTurn(hit.remainingBlock, false), 0);
});

test("regions select only their assigned encounters", () => {
  assert.deepEqual(getEncounterIndicesForRegion(0), [1, 3, 5, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
  assert.deepEqual(getEncounterIndicesForRegion(1), [2, 4, 6, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);
  assert.deepEqual(getEncounterIndicesForRegion(2), [10, 11, 12, 13]);
});

test("debug enemy codex is derived from every encounter and its spawn regions", () => {
  const entries = getEnemyCodexEntries();
  assert.equal(entries.length, 32);
  assert.deepEqual(entries[0].regions, [1]);
  assert.deepEqual(entries.map((entry) => entry.regions[0]), [...Array(13).fill(1), ...Array(14).fill(2), ...Array(5).fill(3)]);
  const golem = entries.find((entry) => entry.label === "골렘");
  assert.deepEqual(golem.regions, [2]);
  const rats = entries.find((entry) => entry.label === "쥐 3마리");
  assert.equal(rats.enemies[0].count, 3);
  assert.equal(rats.enemies[0].enemy.maxHp, 13);
});

test("each region has a three-percent chance to use the next region enemy pool", () => {
  assert.deepEqual(getEncounterSpawnPool(0, 0.029), [2, 4, 6, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);
  assert.deepEqual(getEncounterSpawnPool(0, 0.03), [1, 3, 5, 17, 18, 19, 20, 21, 22, 23, 24, 25]);
  assert.deepEqual(getEncounterSpawnPool(1, 0), [10, 11, 12, 13]);
  assert.deepEqual(getEncounterSpawnPool(1, 0.03), [2, 4, 6, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);
  assert.equal(getEncounterRegionNumber(2), 2);
  assert.equal(getEncounterRegionNumber(1), 1);
  assert.equal(getEncounterRegionNumber(10), 3);
});

test("orange slime randomly attacks, weakens, or attacks and grows", () => {
  const slime = createSewerEncounterByIndex(1, () => 0)[0];
  assert.equal(slime.hp, 45);
  assert.equal(slime.intentIndex, 0);
  assert.equal(slime.actions.length, 3);
  assert.equal(slime.actions[0].attacks[0].value, 10);
  assert.equal(slime.actions[1].nextTurnPlayerAmplificationChange, -2);
  assert.equal(slime.actions[2].strengthGain, 3);
  for (let i = 0; i < 3; i++) assert.notEqual(chooseNextIntent(slime.actions, i), i);
});

test("golem deals 8 damage during its waits and 30 damage on attack turns", () => {
  const golem = createSewerEncounterByIndex(2, () => 1)[0];
  assert.equal(golem.name, "골렘");
  assert.equal(golem.hp, 112);
  assert.equal(golem.intentIndex, 0);
  assert.deepEqual(golem.actions.map((action) => action.name), ["...", "...!", "공격", "...", "공격"]);
  assert.deepEqual(golem.actions.slice(0, 2).map((action) => action.attacks[0].value), [8, 8]);
  assert.equal(golem.actions[2].attacks[0].value, 30);
  assert.equal(golem.actions[3].attacks[0].value, 8);
  assert.equal(golem.actions[4].attacks[0].value, 30);
  assert.equal(chooseNextIntent(golem.actions, 0), 1);
  assert.equal(chooseNextIntent(golem.actions, 1), 2);
  assert.equal(chooseNextIntent(golem.actions, 2), 3);
  assert.equal(chooseNextIntent(golem.actions, 3), 4);
  assert.equal(chooseNextIntent(golem.actions, 4), 3);
});

test("sewer rat uses the requested discard patterns", () => {
  const rat = createSewerEncounterByIndex(3, () => 1)[0];
  assert.equal(rat.name, "하수구 쥐");
  assert.equal(rat.hp, 50);
  assert.deepEqual(rat.actions[0].attacks, [{ type: "physical", value: 5, hits: 2 }]);
  assert.equal(rat.actions[0].discardCount, 1);
  assert.equal(rat.actions[0].discardPriority, "rarity");
  assert.deepEqual(rat.actions[1].attacks, [{ type: "physical", value: 10 }]);
  assert.equal(rat.actions[1].discardCount, 1);
  assert.equal(rat.actions[1].discardPriority, "rarity");
  assert.deepEqual(rat.actions[2].attacks, [{ type: "physical", value: 5 }]);
  assert.equal(rat.actions[2].healGain, undefined);
  assert.equal(rat.actions[2].strengthGain, 3);
  assert.equal(rat.actions[2].blockGain, undefined);
  assert.equal(rat.actions[2].discardCount, 1);
  assert.equal(rat.actions[2].discardPriority, "rarity");
  assert.equal(rat.discardPileIndex, undefined);
});

test("goblin has the selected three random attacks and a turn-end growth passive", () => {
  const goblin = createSewerEncounterByIndex(4, () => 0)[0];
  assert.deepEqual(goblin.actions.map(action => [action.attacks[0].value, action.attacks[0].hits ?? 1]), [[8, 2], [7, 3], [10, 1]]);
  assert.equal(goblin.actions[2].nextTurnPlayerAmplificationChange, -1);
  assert.equal(goblin.turnEndStrengthGain, 1);
});

test("removed wizards, mana beast and green slime never appear in encounters or the codex", () => {
  for (const encounterIndex of [0, 7, 8, 9]) {
    assert.deepEqual(createSewerEncounterByIndex(encounterIndex), []);
  }
  assert.ok(getEnemyCodexEntries().every((entry) =>
    entry.enemies.every(({ enemy }) => !["작은 마법사", "마나 야수", "도깨비불", "초록 슬라임"].includes(enemy.name))));
});

test("three rats roll 12 to 13 health and alternate four and eight damage", () => {
  const minimumRats = createSewerEncounterByIndex(5, () => 0);
  const maximumRats = createSewerEncounterByIndex(5, () => 1);
  assert.equal(minimumRats.length, 3);
  assert.ok(minimumRats.every((rat) => rat.hp === 12 && rat.intentIndex === 0));
  assert.ok(maximumRats.every((rat) => rat.hp === 13));
  for (const rat of maximumRats) {
    assert.deepEqual(rat.actions.map(action => action.attacks[0].value), [4, 8]);
    assert.equal(chooseNextIntent(rat.actions, 0), 1);
    assert.equal(chooseNextIntent(rat.actions, 1), 0);
  }
});

test("warlock returns at its old encounter ID while the mana beast and wisp are retired", () => {
  const warlock = createSewerEncounterByIndex(6, () => 0)[0];
  assert.equal(warlock.name, "저주술사");
  assert.equal(warlock.intentIndex, 0);
  assert.equal(warlock.actions[0].nextTurnPlayerResistanceChange, -3);
  assert.equal(warlock.actions[1].attacks[0].value, 20);
  assert.equal(chooseNextIntent(warlock.actions, 1), 1);
  assert.deepEqual(createSewerEncounterByIndex(8), []);
});

test("third-region mummy encounters have their starting statuses and patterns", () => {
  const priest = createSewerEncounterByIndex(10, () => 1)[0];
  assert.equal(priest.name, "미라 사제");
  assert.equal(priest.hp, 87);
  assert.equal(priest.boon, 5);
  assert.equal(priest.actions[0].boonGain, 2);
  assert.equal(priest.actions[0].nextTurnPlayerResistanceChange, -1);
  assert.deepEqual(priest.actions[1].attacks, [{ type: "magic", value: 16 }]);
  assert.deepEqual(priest.actions[2].attacks, [{ type: "physical", value: 20 }]);

  const warrior = createSewerEncounterByIndex(11, () => 1)[0];
  assert.equal(warrior.name, "미라 전사");
  assert.equal(warrior.hp, 125);
  assert.equal(warrior.berserk, 1);
  assert.deepEqual(warrior.actions[0].attacks, [{ type: "physical", value: 4, hits: 3 }]);
  assert.deepEqual(warrior.actions[1].attacks, [{ type: "physical", value: 16 }]);
  assert.deepEqual(warrior.actions[2].attacks, [{ type: "physical", value: 5, hits: 2 }]);
  assert.equal(warrior.actions[2].nextTurnPlayerResistanceChange, -1);
});

test("boon blocks one hit per stack and berserk grants strength at player turn start", () => {
  const priest = createSewerEncounterByIndex(10, () => 1)[0];
  const afterTwoHits = applyPlayerAttack(priest, 20, 2);
  assert.equal(afterTwoHits.hp, 87);
  assert.equal(afterTwoHits.boon, 3);
  const afterSixHits = applyPlayerAttack(priest, 20, 6);
  assert.equal(afterSixHits.hp, 67);
  assert.equal(afterSixHits.boon, 0);

  const warrior = createSewerEncounterByIndex(11, () => 1)[0];
  assert.equal(applyPlayerTurnStart(warrior).strength, 1);
});

test("third-region wyrm shows soil as its current intent", () => {
  const wyrm = createSewerEncounterByIndex(12, () => 1)[0];
  assert.equal(wyrm.name, "지룡");
  assert.equal(wyrm.hp, 118);
  assert.equal(wyrm.actions[0].soilCount, 1);
  assert.equal(wyrm.actions[0].nextTurnPlayerResistanceChange, -1);
  assert.deepEqual(wyrm.actions[1].attacks, [{ type: "physical", value: 15 }]);
  assert.deepEqual(wyrm.actions[2].attacks, [{ type: "magic", value: 20 }]);
});

test("boss encounters have fixed health and the requested repeating patterns", () => {
  const blackSlime = createSewerEncounterByIndex(14, () => 0)[0];
  assert.equal(blackSlime.name, "검은 슬라임");
  assert.equal(blackSlime.hp, 87);
  assert.equal(blackSlime.isBoss, true);
  assert.equal(blackSlime.toxicSlimeCount, 2);
  assert.deepEqual(blackSlime.actions.map((action) => action.attacks), [
    [{ type: "physical", value: 10 }],
    [],
  ]);
  assert.equal(blackSlime.actions[1].blockGain, 10);
  assert.equal(blackSlime.actions[1].strengthGain, 2);

  const clown = createSewerEncounterByIndex(15, () => 0)[0];
  assert.equal(clown.name, "광대");
  assert.equal(clown.hp, 137);
  assert.ok(clown.actions.every((action) => action.discardCount === 5));
  assert.deepEqual(clown.actions.map((action) => action.attacks), [
    [{ type: "physical", value: 20 }],
    [{ type: "magic", value: 20 }],
    [],
  ]);
  assert.equal(clown.actions[2].strengthGain, 3);

  const giantWyrm = createSewerEncounterByIndex(16, () => 0)[0];
  assert.equal(giantWyrm.name, "거대 지룡");
  assert.equal(giantWyrm.hp, 187);
  assert.equal(giantWyrm.actions[0].firstActionRockCount, 2);
  assert.equal(giantWyrm.actions[0].rockCount, 1);
  assert.equal(giantWyrm.actions[0].strengthGain, 4);
  assert.deepEqual(giantWyrm.actions[2].attacks, [{ type: "physical", value: 6, hits: 2 }]);
});

test("thorn beetles start with four thorns and choose non-repeating patterns", () => {
  const beetles = createSewerEncounterByIndex(13, () => 1);
  assert.equal(beetles.length, 2);
  assert.ok(beetles.every((beetle) => beetle.name === "가시 딱정벌레" && beetle.hp === 56 && beetle.thorns === 4));
  assert.equal(beetles[0].actions[0].randomNoRepeat, true);
  assert.equal(beetles[0].actions[2].strengthLoss, 2);
  assert.equal(beetles[0].actions[2].agilityLoss, 2);
  assert.equal(chooseNextIntent(beetles[0].actions, 0, () => 0), 1);
  assert.equal(chooseNextIntent(beetles[0].actions, 1, () => 0), 0);
  assert.deepEqual(playerAttackThornHits(beetles[0], 10, 3), [4, 4, 4]);
});

test("enemy health rolls from floor 90 percent through full base health", () => {
  assert.equal(createSewerEncounterByIndex(2, () => 0)[0].hp, 100);
  assert.equal(createSewerEncounterByIndex(2, () => 0.999)[0].hp, 112);
});
