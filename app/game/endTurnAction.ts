import type { Dispatch, RefObject, SetStateAction } from "react";
import type { BlessingId } from "./blessingRules.ts";
import type { GameState } from "./battleState.ts";
import type { Card } from "./cards.ts";
import type { DamagePopup, DragState, Phase } from "./battleUiTypes.ts";
import type { TelemetryRecorder } from "./telemetry.ts";
import { recoverBattleEnergy } from "./combatEconomy.ts";
import { hasSticker, retainsCard } from "./stickers.ts";
import { recordTelemetryEnemyDamage, registerTelemetryEnemies } from "./telemetry.ts";
import { telemetryEnemySnapshot } from "./telemetrySnapshots.ts";
import { cardsForNextShuffle } from "./cardRules.ts";
import { buildPiles, drawFromPiles, drawFromPileIndexes, drawRandomFromPiles, prepareDeckForPiles } from "./battleState.ts";
import { applyPlayerTurnStart, retainBlockAfterEnemyTurn } from "./enemies.ts";

import { blockedPileIndexes, preparePileSeals, enemyEnergyRecoveryPenalty } from "./enemyPassives.ts";

import { resolveEnemyTurn } from "./enemyTurnResolution.ts";
import { enemyStepTiming } from "./battlePresentationTiming.ts";

type EndTurnContext = {
  game: GameState;
  phase: Phase;
  handCardRefs: RefObject<Map<number, HTMLButtonElement>>;
  pendingParachuteSourcesRef: RefObject<Map<number, DOMRect>>;
  setPhase: Dispatch<SetStateAction<Phase>>;
  setDragging: Dispatch<SetStateAction<DragState | null>>;
  later: (callback: () => void, delay: number) => number;
  blessings: BlessingId[];
  oneUpUsedRef: RefObject<boolean>;
  maxPlayerHp: number;
  setOneUpUsed: Dispatch<SetStateAction<boolean>>;
  setGame: Dispatch<SetStateAction<GameState>>;
  drawCards: () => void;
  telemetry: TelemetryRecorder;
  setDamagePopup: Dispatch<SetStateAction<DamagePopup | null>>;
  showEnemyPopup: (enemyId: string, text: string, kind?: "damage" | "buff" | "debuff") => void;
  setAttackingEnemyId: Dispatch<SetStateAction<string | null>>;
  grantBattleReward: (regionNumber: number) => void;
  battleRewardRegionRef: RefObject<number>;
  maximumEnergyForGame: (game: Pick<GameState, "deckEditions" | "deckHighlanderActive">, glassCannon?: boolean) => number;
  animateCardToPlayer: (sourceCard: HTMLElement, target: HTMLElement, delay?: number, duration?: number) => Animation | null;
  animateDiscardedCards?: (cards: HTMLElement[]) => Animation[];
  afterAnimations?: (animations: Array<Animation | null>, callback: () => void) => void;
  trackAnimation?: (animation: Animation | null) => void;
};

export function createEndTurn(context: EndTurnContext) {
  const {
    game,
    phase,
    handCardRefs,
    pendingParachuteSourcesRef,
    setPhase,
    setDragging,
    later,
    blessings,
    oneUpUsedRef,
    maxPlayerHp,
    setOneUpUsed,
    setGame,
    drawCards,
    telemetry,
    setDamagePopup,
    showEnemyPopup,
    setAttackingEnemyId,
    grantBattleReward,
    battleRewardRegionRef,
    maximumEnergyForGame,
    animateCardToPlayer,
    animateDiscardedCards,
    afterAnimations,
    trackAnimation,
  } = context;
  return () => {
    if (
      game.status !== "playing" ||
      game.pendingDraws > 0 ||
      game.pendingPileDrawCount > 0 ||
      game.pendingDiscards > 0 ||
      game.pendingSweep ||
      game.pendingResearchDraw !== null ||
      phase !== "playing"
    ) return;
    const toxicSlimeFlights = game.hand.flatMap((card) => {
      if (card.effect !== "slime") return [];
      const element = handCardRefs.current.get(card.id);
      return element ? [{ element }] : [];
    });
    const discardAnimations = animateDiscardedCards?.(game.hand.flatMap(card => {
      const element = handCardRefs.current.get(card.id);
      return !retainsCard(card) && card.effect !== "slime" && !hasSticker(card, "parachute") && element ? [element] : [];
    })) ?? [];
    setPhase("discarding");
    setDragging(null);

    const finishDiscard = () => {
      const result = resolveEnemyTurn(game, {
        blessings, maxPlayerHp, oneUpUsed: oneUpUsedRef.current,
        randomRolls: game.enemies.map(() => Math.random()),
      });
      const cardsMovedToPiles = new Set(result.pilesAfterSlime.flat().map(card => card.id));
      for (const card of game.hand) {
        if (!cardsMovedToPiles.has(card.id)) continue;
        const source = handCardRefs.current.get(card.id)?.getBoundingClientRect();
        if (source) pendingParachuteSourcesRef.current.set(card.id, source);
      }
      const {
        enemiesAfterBlockDecay,
        toxicSlimeDamage,
        discarded,
        retainedHand,
        pilesAfterSlime,
        remainingPhysicalBlock,
        nextPlayerResistance,
        nextPlayerAmplification,
        nextPlayerInvulnerability,
        remainingStrength,
        remainingAgility,
        toxicSlimeDamageTaken,
        hpAfterToxicSlime,
        physicalBlockAfterToxicSlime,
        magicBlockAfterToxicSlime,
        remainingHp,
        steps,
        enemyDamageTaken,
        nextEnemies,
      } = result;
      if (result.oneUpUsed !== oneUpUsedRef.current) {
        oneUpUsedRef.current = result.oneUpUsed;
        setOneUpUsed(result.oneUpUsed);
      }
      if (game.extraTurns > 0) {
        const recyclingMultiplier = game.deckEditions.includes("frugalPlus") ? 2 : 0;
        setGame({
          ...game,
          piles: pilesAfterSlime,
          hand: retainedHand,
          discard: discarded,
          energy: recoverBattleEnergy(game.energy, maximumEnergyForGame(game, blessings.includes("glassCannon")), enemyEnergyRecoveryPenalty(nextEnemies)),
          radiancePlayedThisTurn: 0,
          stars: game.stars + Math.max(0, game.energy) * recyclingMultiplier + (game.highlanderActive ? 1 : 0),
          blacksmithForgeUsedThisTurn: false,
          starsSpent: 0,
          reflectDamage: 0,
          extraTurns: game.extraTurns - 1,
          pendingResearchDraw: null,
          astronomyResearchUses: 0,
          necromancyResearchUses: 0,
          turn: game.turn + 1,
          playerHp: remainingHp,
          playerPhysicalBlock: retainBlockAfterEnemyTurn(remainingPhysicalBlock, game.preserveDefenseOnTurnEnd),
          playerMagicBlock: 0,
          strength: Math.max(0, game.strength - game.temporaryStrength),
          temporaryStrength: 0,
          defenseMultiplier: 1,
          damageTakenMultiplier: 1,
          invulnerable: false,
          doubleNextAttack: game.doubleNextAttack,
          enemies: enemiesAfterBlockDecay.map(applyPlayerTurnStart),
          status: remainingHp === 0 ? "lost" : "playing",
          message: remainingHp === 0 ? "유독성 점액의 물리 피해로 쓰러졌습니다." : "추가 턴을 시작합니다.",
        });
        setPhase(remainingHp === 0 ? "playing" : "drawing");
        if (remainingHp > 0) later(drawCards, 120);
        return;
      }

      registerTelemetryEnemies(telemetry, nextEnemies.filter(enemy => enemy.summonerId).map(telemetryEnemySnapshot));
      enemyDamageTaken.forEach((damage, enemyId) => recordTelemetryEnemyDamage(telemetry, enemyId, damage));

      setGame({
        ...game,
        piles: pilesAfterSlime,
        hand: retainedHand,
        discard: discarded,
        // 적이 행동하는 동안에는 방금 사용 중인 의도를 그대로 보여 준다.
        enemies: enemiesAfterBlockDecay,
      });
      setPhase("enemy-turn");

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const slimeFlightGap = reducedMotion ? 20 : 50;
      const slimeFlightDuration = toxicSlimeFlights.length > 0
        ? (reducedMotion ? 120 : 460) + Math.max(0, toxicSlimeFlights.length - 1) * slimeFlightGap
        : 0;

      if (toxicSlimeDamage > 0) {
        const playerHealth = document.querySelector<HTMLElement>(".player-health-popup-anchor");
        if (playerHealth) {
          toxicSlimeFlights.forEach((flight, index) => {
            const animation = animateCardToPlayer(flight.element, playerHealth, index * slimeFlightGap, 460);
            trackAnimation?.(animation);
          });
        }
        later(() => {
          setDamagePopup({
            key: `toxic-slime-${Date.now()}`,
            text: toxicSlimeDamageTaken > 0 ? `-${toxicSlimeDamageTaken}` : "막음",
            kind: "damage",
          });
          setGame((current) => ({
            ...current,
            playerHp: hpAfterToxicSlime,
            playerPhysicalBlock: physicalBlockAfterToxicSlime,
            playerMagicBlock: magicBlockAfterToxicSlime,
          }));
        }, toxicSlimeFlights.length > 0 ? (reducedMotion ? 60 : 380) + Math.max(0, toxicSlimeFlights.length - 1) * slimeFlightGap : 0);
      }

      let timeline = slimeFlightDuration;
      steps.forEach((step, index) => {
        const base = timeline;
        const timing = enemyStepTiming(Boolean(step.attack), reducedMotion);
        timeline += timing.duration + timing.gap;
        later(() => setAttackingEnemyId(step.attack ? step.enemy.id : null), base);
        later(() => {
          if (step.attack) {
            setDamagePopup({
              key: `${step.enemy.id}-${Date.now()}`,
              text: step.damage > 0 ? `-${step.damage}` : "막음",
              kind: "damage",
            });
          }
          if (step.message) {
            const kind = step.messageKind ?? "buff";
            if (step.messageTarget === "player") {
              const popup = { key: `${step.enemy.id}-effect-${game.turn}-${index}`, text: step.message, kind };
              setDamagePopup(popup);
              later(() => setDamagePopup(current => current?.key === popup.key ? null : current), 1150);
            } else {
              showEnemyPopup(step.enemy.id, step.message, kind);
            }
          }
          setGame((current) => ({
            ...current,
            playerHp: step.hpAfter,
            playerPhysicalBlock: step.physicalBlockAfter,
            playerMagicBlock: step.magicBlockAfter,
            message: step.message ? `${step.enemy.name}: ${step.message}` : current.message,
          }));
        }, base + timing.impact);
        later(() => setAttackingEnemyId(null), base + timing.duration);
      });

      later(() => {
        setDamagePopup(current => current?.kind === "buff" || current?.kind === "debuff" ? current : null);
        setAttackingEnemyId(null);
        if (remainingHp === 0) {
          setGame({
            ...game,
            piles: pilesAfterSlime,
            hand: retainedHand,
            discard: discarded,
            playerHp: 0,
            playerPhysicalBlock: retainBlockAfterEnemyTurn(remainingPhysicalBlock, game.preserveDefenseOnTurnEnd),
            playerMagicBlock: 0,
            playerResistance: nextPlayerResistance,
            playerAmplification: nextPlayerAmplification,
            invulnerabilityTurns: nextPlayerInvulnerability,
            enemies: nextEnemies,
            status: "lost",
            message: "적의 공격을 받고 쓰러졌습니다.",
          });
          setPhase("playing");
          return;
        }

        if (nextEnemies.every((enemy) => enemy.hp === 0)) {
          setGame({
            ...game,
            piles: pilesAfterSlime,
            hand: retainedHand,
            discard: discarded,
            playerHp: remainingHp,
            playerPhysicalBlock: retainBlockAfterEnemyTurn(remainingPhysicalBlock, game.preserveDefenseOnTurnEnd),
            playerMagicBlock: 0,
            playerResistance: nextPlayerResistance,
            playerAmplification: nextPlayerAmplification,
            invulnerabilityTurns: nextPlayerInvulnerability,
            enemies: nextEnemies,
            status: "won",
            message: "모든 적을 쓰러뜨렸습니다.",
          });
          setPhase("playing");
          grantBattleReward(battleRewardRegionRef.current);
          return;
        }

        const enemiesAtPlayerTurnStart = preparePileSeals(nextEnemies.map(applyPlayerTurnStart), pilesAfterSlime, game.turn + 1);
        const blocked = blockedPileIndexes(enemiesAtPlayerTurnStart);
        const willClearAfterNextDraw = drawFromPiles(pilesAfterSlime, blocked).piles.every(pile => pile.length === 0);
        const turnStartExtraDrawCount = (game.deckEditions.includes("persistentDraw") ? 1 : 0)
          + (blessings.includes("starlessAge") ? 1 : 0);
        const clearPlan = willClearAfterNextDraw
          ? (() => {
            const emptyIndexes = pilesAfterSlime.map((pile, index) => pile.length === 0 ? index : -1).filter((index) => index >= 0);
            const cardsDrawnBeforeClear = new Set([
              ...retainedHand.map(card => card.id),
              ...nextEnemies.filter(enemy => enemy.hp > 0).flatMap(enemy => (enemy.confiscatedCards ?? []).map(card => card.id)),
              ...pilesAfterSlime.flatMap((pile) => pile.map((card) => card.id)),
            ]);
            const cards = cardsForNextShuffle(
              game.initialDeck,
              new Set(game.removedFromReshuffleIds),
              cardsDrawnBeforeClear,
            );
            const rebuilt = buildPiles(
              prepareDeckForPiles(cards),
              game.deckEditions.includes("fantastic") ? 4 : 5,
              false,
              0,
              false,
              pilesAfterSlime.length,
              game.evenDealOnReshuffle,
              game.clairvoyanceActive ? .25 : 0,
            );
            const redraw = drawFromPileIndexes(rebuilt, emptyIndexes, blocked);
            const additionalDraw = turnStartExtraDrawCount > 0
              ? drawRandomFromPiles(redraw.piles, turnStartExtraDrawCount, Math.random, blocked)
              : { piles: redraw.piles, hand: [] as Card[] };
            return {
              pilesBeforeDraw: rebuilt,
              pilesAfterDraw: additionalDraw.piles,
              hand: [...redraw.hand, ...additionalDraw.hand],
              pendingDraws: game.pendingForesightDraws,
            };
          })()
          : null;
        const recyclingMultiplier = game.deckEditions.includes("frugalPlus") ? 2 : 0;
        setGame({
          ...game,
          piles: pilesAfterSlime,
          clearPlan,
          pendingForesightDraws: clearPlan ? 0 : game.pendingForesightDraws,
          hand: retainedHand,
          discard: discarded,
          energy: recoverBattleEnergy(game.energy, maximumEnergyForGame(game, blessings.includes("glassCannon")), enemyEnergyRecoveryPenalty(nextEnemies)),
          radiancePlayedThisTurn: 0,
          stars: game.stars + Math.max(0, game.energy) * recyclingMultiplier + (game.highlanderActive ? 1 : 0),
          blacksmithForgeUsedThisTurn: false,
          starsSpent: 0,
          reflectDamage: 0,
          pendingResearchDraw: null,
          astronomyResearchUses: 0,
          necromancyResearchUses: 0,
          turn: game.turn + 1,
          playerHp: remainingHp,
          playerPhysicalBlock: retainBlockAfterEnemyTurn(remainingPhysicalBlock, game.preserveDefenseOnTurnEnd),
          playerMagicBlock: 0,
          playerResistance: nextPlayerResistance,
          playerAmplification: nextPlayerAmplification,
          invulnerabilityTurns: nextPlayerInvulnerability,
          strength: remainingStrength,
          temporaryStrength: 0,
          agility: remainingAgility,
          defenseMultiplier: 1,
          damageTakenMultiplier: 1,
          invulnerable: false,
          doubleNextAttack: game.doubleNextAttack,
          enemies: enemiesAtPlayerTurnStart,
          message: "적의 턴이 끝났습니다.",
        });
        setPhase("drawing");
        later(drawCards, 120);
      }, timeline + 260);
    };
    if (afterAnimations) afterAnimations(discardAnimations, finishDiscard);
    else later(finishDiscard, 0);
  }
}
