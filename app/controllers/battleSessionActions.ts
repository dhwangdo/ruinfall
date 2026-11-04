import type { RunInventory } from "../hooks/useRunInventory";
import type { RunWorld } from "../hooks/useRunWorld";
import type { RunPlayer } from "../hooks/useRunPlayer";
import type { BattleSession } from "../hooks/useBattleSession";
import type { useBattleInteractionState } from "../hooks/useBattleInteractionState";
import type { useRunMapContent } from "../hooks/useRunMapContent";
import type { BattleEncounter, MapBattleEnemy } from "../game/runTypes";
import { prepareBattleStart } from "../game/battleSetup.ts";
import { createBattleReward, createBossBattleReward } from "../game/rewards.ts";
import { nextRareCardDropChance } from "../game/rewardRules.ts";
import { isHigherRegionMapEnemy } from "../game/mapRules.ts";
import { getEncounterRegionNumber } from "../game/enemies.ts";
import { RUN_SAVE_POLICY } from "../game/saveGame.ts";
import { karmaStageForWins } from "../game/karmaRules.ts";
import {
  beginTelemetryBattle, finishTelemetryBattle,
  recordTelemetryCardAcquired, recordTelemetryDeckAcquired, recordTelemetryConsumableAcquired,
  recordTelemetryGoldAcquired, type createTelemetryRecorder
} from "../game/telemetry.ts";
import { telemetryCardSnapshot, telemetryDeckSnapshot, telemetryConsumableSnapshot, telemetryEnemySnapshot } from "../game/telemetrySnapshots.ts";

type Options = {
  battle: BattleSession; inventory: RunInventory; world: RunWorld; player: RunPlayer;
  interaction: ReturnType<typeof useBattleInteractionState>;
  telemetry: ReturnType<typeof createTelemetryRecorder>;
  ensureTelemetryRun: () => void;
  clearMapTravel: () => void;
  closeMapOverlays: () => void;
  clearCardPreview: () => void;
  drawCards: () => void;
  rememberPlayerVision: ReturnType<typeof useRunMapContent>["rememberPlayerVision"];
  queueRunSave: (delay?: number) => void;
};

/** Coordinates encounter entry, chained encounters, rewards, and return to exploration. */
export function createBattleSessionActions({
  battle, inventory, world, player, interaction, telemetry, ensureTelemetryRun,
  clearMapTravel, closeMapOverlays, clearCardPreview,
  drawCards, rememberPlayerVision, queueRunSave,
}: Options) {
  const { activeMapEnemyIds, setActiveMapEnemyIds, activeBattleRoom, setActiveBattleRoom, mapBattleQueueRef, previousBattleDeckIdRef, pendingBattleStart, setPendingBattleStart, battleDeckCheckEnabled, setBattleDeckPreviewId, battleRewards, setBattleRewards, battleRewardDecks, setBattleRewardDecks, battleRewardConsumables, setBattleRewardConsumables, battleRewardGold, setBattleRewardGold, battleRewardKeys, setBattleRewardKeys, game, setGame, telemetryPreviousGameRef, setPhase, setAttackingEnemyId, setDamagePopup, setAnimatedEnemyHp, battleRewardRegionRef, battleRewardIsBossRef, setDyingEnemyIds, setBattleCardView, setScreen, clearBattleTimers, later,
    pendingEnemyTokenIdsRef, pendingPileTokenSourcesRef, battleRewardIsOutOfDepthRef } = battle;
  const { ownedDecks, activeDeckId, setActiveDeckId, nextCardIdRef, nextConsumable,
    rareCardDropChanceRef, setKeys,
    roomDrops, setRoomDrops, setRoomDeckDrops, setRoomConsumableDrops, setGold } = inventory;
  const { mapPosition, mapSeed, mapEnemyWorld, setMapEnemyWorld, setDefeatedBossRegions } = world;
  const { blessings, godsLamentChargesRef, setGodsLamentCharges, runPlayerHp, runPlayerHpRef, setRunPlayerHp } = player;
  const { setPileClearNotice, setDragging, setSelectedHandCardId } = interaction;
  const activeDeck = ownedDecks.find(deck => deck.id === activeDeckId) ?? ownedDecks[0];
  const grantBattleReward = (regionNumber: number) => {
    if (battle.rewardGrantedRef.current) return;
    battle.rewardGrantedRef.current = true;
    player.setRegionBattleWins(wins => wins + 1);
    ensureTelemetryRun();
    const reward = battleRewardIsBossRef.current
      ? createBossBattleReward(
        nextCardIdRef.current,
        blessings.includes("bossSlayer") ? regionNumber + 1 : undefined,
        blessings.includes("deckSize") ? 5 : 0,
      )
      : createBattleReward(
        regionNumber,
        nextCardIdRef.current,
        blessings.includes("deckSize") ? 5 : 0,
        rareCardDropChanceRef.current,
        battleRewardIsOutOfDepthRef.current,
      );
    [...reward.cards, ...reward.decks.flatMap((deck) => deck.cards)].forEach((card) => {
      recordTelemetryCardAcquired(telemetry, telemetryCardSnapshot(card), "battle-reward");
    });
    const rewardConsumables = reward.consumableTypes.map((type) => nextConsumable(type));
    const generatedCardCount = reward.cards.length + reward.decks.reduce((total, deck) => total + deck.cards.length, 0);
    nextCardIdRef.current += generatedCardCount;
    if (!battleRewardIsBossRef.current) {
      rareCardDropChanceRef.current = nextRareCardDropChance(rareCardDropChanceRef.current, reward.cards);
    }
    if (activeBattleRoom) world.setBloodstainedRooms(current => new Set([...current, activeBattleRoom]));
    const rewardGold = reward.gold * (blessings.includes("greed") ? 2 : 1);
    setBattleRewardGold(rewardGold);
    setBattleRewardKeys(reward.keys);
    setBattleRewards(reward.cards);
    setBattleRewardDecks(reward.decks);
    setBattleRewardConsumables(rewardConsumables);
  };

  const startBattleNow = (
    encounters: BattleEncounter[],
    playerHp: number,
    battleDeckId: string,
  ) => {
    battle.rewardGrantedRef.current = false;
    battle.rewardCollectedRef.current = false;
    const battleDeck = ownedDecks.find((deck) => deck.id === battleDeckId) ?? activeDeck;
    ensureTelemetryRun();
    previousBattleDeckIdRef.current = battleDeck?.id ?? null;
    setPendingBattleStart(null);
    setBattleDeckPreviewId(null);
    battleRewardRegionRef.current = Math.max(
      1,
      ...encounters.map((encounter) => getEncounterRegionNumber(encounter.encounterIndex)),
    );
    clearBattleTimers();
    setPileClearNotice(false);
    clearMapTravel();
    closeMapOverlays();
    setDragging(null);
    setBattleCardView(null);
    setSelectedHandCardId(null);
    setDyingEnemyIds(new Set());
    setAnimatedEnemyHp({});
    clearCardPreview();
    setAttackingEnemyId(null);
    setDamagePopup(null);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    setBattleRewardKeys(0);
    pendingEnemyTokenIdsRef.current.clear();
    pendingPileTokenSourcesRef.current.clear();
    const prepared = prepareBattleStart({
      encounters, playerHp, battleDeck, blessings, godsLamentCharges: godsLamentChargesRef.current,
      nextCardId: nextCardIdRef.current,
      karmaStage: karmaStageForWins(player.regionBattleWinsRef.current),
    });
    const { game: battleStartState, battleEnemies, defeatedByBomb, relicSource } = prepared;
    godsLamentChargesRef.current = prepared.remainingGodsLamentCharges;
    setGodsLamentCharges(prepared.remainingGodsLamentCharges);
    nextCardIdRef.current = prepared.nextCardId;
    if (!battleDeck) {
      telemetryPreviousGameRef.current = battleStartState;
      setPhase("playing");
      setGame(battleStartState);
      setScreen("battle");
      return;
    }
    if (relicSource) pendingPileTokenSourcesRef.current.set(relicSource.cardId, relicSource.enemyId);
    beginTelemetryBattle(telemetry, {
      region: battleRewardRegionRef.current,
      deck: telemetryDeckSnapshot(battleDeck),
      enemies: battleEnemies.map(telemetryEnemySnapshot),
      startingPlayerHp: playerHp,
    });
    if (defeatedByBomb) finishTelemetryBattle(telemetry, "won", battleStartState.turn, battleStartState.playerHp);
    telemetryPreviousGameRef.current = battleStartState;
    setPhase(defeatedByBomb ? "playing" : "drawing");
    setGame(battleStartState);
    setScreen("battle");
    if (defeatedByBomb) grantBattleReward(battleRewardRegionRef.current);
    else later(drawCards, 360);
  };


  const startBattle = (
    encounters: BattleEncounter[],
    playerHp = runPlayerHp,
  ) => {
    battleRewardIsBossRef.current = encounters.some((encounter) => encounter.isBoss === true);
    battleRewardIsOutOfDepthRef.current = encounters.some((encounter) =>
      encounter.isBoss !== true && isHigherRegionMapEnemy(encounter.encounterIndex, mapPosition, mapSeed));
    if (battleDeckCheckEnabled && ownedDecks.length >= 2) {
      setPendingBattleStart({ encounters, playerHp });
      setBattleDeckPreviewId(activeDeckId);
      return;
    }
    startBattleNow(encounters, playerHp, activeDeckId);
  };


  const confirmBattleDeck = (battleDeckId: string) => {
    if (!pendingBattleStart) return;
    const battleDeck = ownedDecks.find((deck) => deck.id === battleDeckId);
    if (!battleDeck) return;
    setActiveDeckId(battleDeckId);
    startBattleNow(pendingBattleStart.encounters, pendingBattleStart.playerHp, battleDeckId);
  };


  const returnToMap = () => {
    if (battle.rewardCollectedRef.current) return;
    battle.rewardCollectedRef.current = true;
    const battleRoom = activeBattleRoom;
    if (battleRoom) {
      const landingDrops = [...(roomDrops[battleRoom] ?? []), ...battleRewards];
      setRoomDrops((current) => ({
        ...current,
        [battleRoom]: landingDrops,
      }));
      ensureTelemetryRun();
      recordTelemetryGoldAcquired(telemetry, battleRewardGold, "battle-reward");
      battleRewardDecks.forEach((deck) => recordTelemetryDeckAcquired(
        telemetry,
        telemetryDeckSnapshot(deck),
        "battle-reward",
      ));
      battleRewardConsumables.forEach((consumable) => recordTelemetryConsumableAcquired(
        telemetry,
        telemetryConsumableSnapshot(consumable),
        "battle-reward",
      ));
      setGold((current) => current + battleRewardGold);
      setKeys((current) => current + battleRewardKeys);
      if (battleRewardDecks.length > 0) setRoomDeckDrops((current) => ({
        ...current,
        [battleRoom]: [...(current[battleRoom] ?? []), ...battleRewardDecks],
      }));
      if (battleRewardConsumables.length > 0) setRoomConsumableDrops((current) => ({
        ...current,
        [battleRoom]: [...(current[battleRoom] ?? []), ...battleRewardConsumables],
      }));
    }

    const nextEnemy = mapBattleQueueRef.current.shift();
    if (nextEnemy && battleRoom) {
      const nextPlayerHp = game.playerHp;
      runPlayerHpRef.current = nextPlayerHp;
      setRunPlayerHp(nextPlayerHp);
      setBattleRewards([]);
      setBattleRewardDecks([]);
      setBattleRewardConsumables([]);
      setBattleRewardGold(0);
      setBattleRewardKeys(0);
      battleRewardIsBossRef.current = nextEnemy.isBoss === true;
      battleRewardIsOutOfDepthRef.current = nextEnemy.isBoss !== true
        && isHigherRegionMapEnemy(nextEnemy.encounterIndex, mapPosition, mapSeed);
      startBattleNow(
        [nextEnemy],
        nextPlayerHp,
        previousBattleDeckIdRef.current ?? activeDeckId,
      );
      return;
    }

    if (activeMapEnemyIds.length > 0 && battleRoom) {
      const defeatedBossRegionIndices = mapEnemyWorld.enemies
        .filter((enemy) => activeMapEnemyIds.includes(enemy.id) && enemy.isBoss)
        .map((enemy) => getEncounterRegionNumber(enemy.encounterIndex) - 1);
      if (defeatedBossRegionIndices.length > 0) {
        setDefeatedBossRegions((current) => new Set([...current, ...defeatedBossRegionIndices]));
      }
      const remainingEnemies = mapEnemyWorld.enemies.filter((enemy) => !activeMapEnemyIds.includes(enemy.id));
      setMapEnemyWorld({ ...mapEnemyWorld, enemies: remainingEnemies });
      rememberPlayerVision(mapPosition, mapSeed, remainingEnemies);
    }
    runPlayerHpRef.current = game.playerHp;
    setRunPlayerHp(game.playerHp);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    setBattleRewardKeys(0);
    setActiveMapEnemyIds([]);
    setActiveBattleRoom(null);
    mapBattleQueueRef.current = [];
    setScreen("map");
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };


  const beginMapEnemyBattle = (
    enemies: MapBattleEnemy[],
    roomKey: string,
  ) => {
    const [firstEnemy, ...remainingEnemies] = enemies;
    if (!firstEnemy) return;
    mapBattleQueueRef.current = remainingEnemies;
    setActiveMapEnemyIds(enemies.map((enemy) => enemy.id));
    setActiveBattleRoom(roomKey);
    startBattle([firstEnemy], runPlayerHpRef.current);
  };


  return { grantBattleReward, startBattleNow, startBattle, confirmBattleDeck, returnToMap, beginMapEnemyBattle };
}
