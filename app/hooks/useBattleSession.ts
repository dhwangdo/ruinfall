import { useCallback, useEffect, useEffectEvent, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { waitingState, type GameState } from "../game/battleState";
import type { DamagePopup, Phase } from "../game/battleUiTypes";
import type { Card } from "../game/cards";
import type { Consumable, DeckCase } from "../game/rewards";
import type { MapBattleEnemy, PendingBattleStart } from "../game/runTypes";
import { createBattleAnimationLifecycle } from "../components/battleAnimationLifecycle";
import { useGameSettings } from "./useGameSettings";
import type { BattleRewardRoulette } from "../game/rewardRoulette";
type Screen = "map" | "battle";

/** Owns a battle's state, encounter queue, rewards, and cancellable timers/animations. */
export function useBattleSession() {
  const [screen, setScreen] = useState<Screen>("map");

  const [activeMapEnemyIds, setActiveMapEnemyIds] = useState<string[]>([]);

  const [activeBattleRoom, setActiveBattleRoom] = useState<string | null>(null);

  const mapBattleQueueRef = useRef<MapBattleEnemy[]>([]);

  const previousBattleDeckIdRef = useRef<string | null>(null);

  const [pendingBattleStart, setPendingBattleStart] = useState<PendingBattleStart | null>(null);

  const { battleDeckCheckEnabled, setBattleDeckCheckEnabled } = useGameSettings();

  const [battleDeckPreviewId, setBattleDeckPreviewId] = useState<string | null>(null);

  const [battleRewards, setBattleRewards] = useState<Card[]>([]);

  const [battleRewardDecks, setBattleRewardDecks] = useState<DeckCase[]>([]);

  const [battleRewardConsumables, setBattleRewardConsumables] = useState<Consumable[]>([]);

  const [battleRewardGold, setBattleRewardGold] = useState(0);
  const [battleRewardKeys, setBattleRewardKeys] = useState(0);
  const [battleRewardRoulette, setRenderedRoulette] = useState<BattleRewardRoulette | null>(null);
  const battleRewardRouletteRef = useRef<BattleRewardRoulette | null>(null);
  const setBattleRewardRoulette = useCallback<Dispatch<SetStateAction<BattleRewardRoulette | null>>>(update => {
    const next = typeof update === "function" ? update(battleRewardRouletteRef.current) : update;
    battleRewardRouletteRef.current = next;
    setRenderedRoulette(next);
  }, []);

  const [game, setRenderedGame] = useState<GameState>(waitingState);
  const gameRef = useRef(game);
  // Delayed card flights and successive actions must see all updates already dispatched this turn.
  const setGame = useCallback<Dispatch<SetStateAction<GameState>>>((update) => {
    const next = typeof update === "function" ? update(gameRef.current) : update;
    gameRef.current = next;
    setRenderedGame(next);
  }, []);
  const getGame = useCallback(() => gameRef.current, []);
  const telemetryPreviousGameRef = useRef<GameState | null>(null);

  const [phase, setPhase] = useState<Phase>("drawing");

  const [attackingEnemyId, setAttackingEnemyId] = useState<string | null>(null);

  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);

  const [enemyPopups, setEnemyPopups] = useState<Record<string, DamagePopup>>({});

  const [animatedEnemyHp, setAnimatedEnemyHp] = useState<Record<string, number>>({});

  const enemyPopupKeyRef = useRef(0);

  const rewardGrantedRef = useRef(false);
  const rewardCollectedRef = useRef(false);
  const battleRewardRegionRef = useRef(1);

  const battleRewardIsBossRef = useRef(false);

  const [dyingEnemyIds, setDyingEnemyIds] = useState<Set<string>>(() => new Set());

  const [battleCardView, setBattleCardView] = useState<"deck" | "piles" | "discard" | null>(null);

  const pendingOriginsRef = useRef(new Map<number, DOMRect>());

  const pendingEnemyTokenIdsRef = useRef(new Set<number>());

  const pendingPileTokenSourcesRef = useRef(new Map<number, string>());

  const handCardRefs = useRef(new Map<number, HTMLButtonElement>());

  const [pendingDiscardPlay, setPendingDiscardPlay] = useState<{ card: Card; targetEnemyId?: string } | null>(null);

  const timersRef = useRef<number[]>([]);
  const [{ trackAnimation, afterAnimations, clearAnimations }] = useState(createBattleAnimationLifecycle);

  const later = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  }, []);

  const clearBattleTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    clearAnimations();
  }, [clearAnimations]);

  const showEnemyPopup = useCallback((enemyId: string, text: string, kind: "damage" | "buff" | "debuff" = "damage") => {
    enemyPopupKeyRef.current += 1;
    const popup = { key: `${enemyId}-${enemyPopupKeyRef.current}`, text, kind };
    setEnemyPopups((current) => ({ ...current, [enemyId]: popup }));
    later(() => setEnemyPopups((current) => {
      if (current[enemyId]?.key !== popup.key) return current;
      const remaining = { ...current };
      delete remaining[enemyId];
      return remaining;
    }), 1150);
  }, [later]);

  useEffect(() => clearBattleTimers, [clearBattleTimers]);
  return {
    screen, setScreen, activeMapEnemyIds, setActiveMapEnemyIds, activeBattleRoom,
    setActiveBattleRoom, mapBattleQueueRef, previousBattleDeckIdRef, pendingBattleStart,
    setPendingBattleStart, battleDeckCheckEnabled, setBattleDeckCheckEnabled, battleDeckPreviewId,
    setBattleDeckPreviewId, battleRewards, setBattleRewards, battleRewardDecks,
    setBattleRewardDecks, battleRewardConsumables, setBattleRewardConsumables, battleRewardGold,
    setBattleRewardGold, battleRewardKeys, setBattleRewardKeys, game, setGame, telemetryPreviousGameRef, phase, setPhase,
    battleRewardRoulette, battleRewardRouletteRef, setBattleRewardRoulette,
    attackingEnemyId, setAttackingEnemyId, damagePopup, setDamagePopup, enemyPopups,
    setEnemyPopups, animatedEnemyHp, setAnimatedEnemyHp, enemyPopupKeyRef, battleRewardRegionRef,
    battleRewardIsBossRef, dyingEnemyIds, setDyingEnemyIds,
    battleCardView, setBattleCardView, pendingOriginsRef, pendingEnemyTokenIdsRef,
    pendingPileTokenSourcesRef, handCardRefs, pendingDiscardPlay, setPendingDiscardPlay, timersRef,
    rewardGrantedRef, rewardCollectedRef, getGame, later, clearBattleTimers, showEnemyPopup, trackAnimation, afterAnimations,
  };
}
export type BattleSession = ReturnType<typeof useBattleSession>;

/** Recovery path for victory transitions that don't directly grant a reward. */
export function useBattleRewardFallback(battle: BattleSession, grantReward: (region: number) => void) {
  const grant = useEffectEvent(grantReward);
  const { screen, game, battleRewardGold, battleRewards, battleRewardDecks,
    battleRewardConsumables, battleRewardRegionRef } = battle;
  useEffect(() => {
    if (screen === "battle" && game.status === "won" && battleRewardGold === 0
      && battleRewards.length === 0 && battleRewardDecks.length === 0 && battleRewardConsumables.length === 0) {
      grant(battleRewardRegionRef.current);
    }
  }, [screen, game.status, battleRewardGold, battleRewards.length, battleRewardDecks.length,
    battleRewardConsumables.length, battleRewardRegionRef]);
}
