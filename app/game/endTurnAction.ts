import type { Dispatch, RefObject, SetStateAction } from "react";
import type { BlessingId } from "./blessingRules.ts";
import type { GameState } from "./battleState.ts";
import type { Card } from "./cards.ts";
import type { DamagePopup, DragState, Phase } from "./battleUiTypes.ts";
import type { TelemetryRecorder } from "./telemetry.ts";
import { recoverBattleEnergy } from "./combatEconomy.ts";
import { recordTelemetryEnemyDamage, registerTelemetryEnemies } from "./telemetry.ts";
import { telemetryEnemySnapshot } from "./telemetrySnapshots.ts";
import { cardsForNextShuffle } from "./cardRules.ts";
import { buildPiles, drawFromPileIndexes, drawRandomFromPiles, prepareDeckForPiles } from "./battleState.ts";
import { applyPlayerTurnStart, retainBlockAfterEnemyTurn } from "./enemies.ts";

import { blockedPileIndexes, preparePileSeals, enemyEnergyRecoveryPenalty, sharedTurnStrength } from "./enemyPassives.ts";

import { resolveEnemyTurn } from "./enemyTurnResolution.ts";

type EndTurnContext = {
  game: GameState;
  phase: Phase;
  handCardRefs: RefObject<Map<number, HTMLButtonElement>>;
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
  setAttackingEnemyId: Dispatch<SetStateAction<string | null>>;
  grantBattleReward: (regionNumber: number) => void;
  battleRewardRegionRef: RefObject<number>;
  maximumEnergyForGame: (game: Pick<GameState, "deckEditions" | "deckHighlanderActive">, glassCannon?: boolean) => number;
  animateCardToPlayer: (sourceCard: HTMLElement, source: DOMRect, target: HTMLElement, delay?: number, duration?: number) => Animation | null;
};

export function createEndTurn(context: EndTurnContext) {
  const {
    game,
    phase,
    handCardRefs,
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
    setAttackingEnemyId,
    grantBattleReward,
    battleRewardRegionRef,
    maximumEnergyForGame,
    animateCardToPlayer,
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
      return element ? [{ element, rect: element.getBoundingClientRect() }] : [];
    });
    setPhase("discarding");
    setDragging(null);

    const discardDelay = 180 + Math.max(0, game.hand.length - 1) * 25;
    later(() => {
      const result = resolveEnemyTurn(game, {
        blessings, maxPlayerHp, oneUpUsed: oneUpUsedRef.current,
        randomRolls: game.enemies.map(() => Math.random()),
      });
      const {
        enemiesAfterBlockDecay,
        toxicSlimeDamage,
        discarded,
        retainedHand,
        pilesAfterSlime,
        remainingPhysicalBlock,
        remainingMagicBlock,
        nextPlayerResistance,
        nextPlayerAmplification,
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
        const recyclingMultiplier = game.deckEditions.includes("frugalPlus")
          ? 2
          : game.deckEditions.includes("frugal")
            ? 1
            : 0;
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
          playerMagicBlock: retainBlockAfterEnemyTurn(remainingMagicBlock, game.preserveDefenseOnTurnEnd),
          strength: Math.max(0, game.strength - game.temporaryStrength) + sharedTurnStrength(nextEnemies),
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
      const stepDuration = reducedMotion ? 80 : 220;
      const hitAt = reducedMotion ? 20 : 105;
      const clearAt = reducedMotion ? 50 : 195;
      const slimeFlightGap = reducedMotion ? 20 : 50;
      const slimeFlightDuration = toxicSlimeFlights.length > 0
        ? (reducedMotion ? 120 : 460) + Math.max(0, toxicSlimeFlights.length - 1) * slimeFlightGap
        : 0;

      if (toxicSlimeDamage > 0) {
        const playerHealth = document.querySelector<HTMLElement>(".player-health-popup-anchor");
        if (playerHealth) {
          toxicSlimeFlights.forEach((flight, index) => {
            animateCardToPlayer(flight.element, flight.rect, playerHealth, index * slimeFlightGap, 460);
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

      steps.forEach((step, index) => {
        const base = slimeFlightDuration + index * stepDuration;
        later(() => setAttackingEnemyId(step.enemy.stunned ? null : step.enemy.id), base);
        later(() => {
          if (step.attack) {
            setDamagePopup({
              key: `${step.enemy.id}-${Date.now()}`,
              text: step.damage > 0 ? `-${step.damage}` : "막음",
              kind: "damage",
            });
          }
          setGame((current) => ({
            ...current,
            playerHp: step.hpAfter,
            playerPhysicalBlock: step.physicalBlockAfter,
            playerMagicBlock: step.magicBlockAfter,
          }));
        }, base + hitAt);
        later(() => setAttackingEnemyId(null), base + clearAt);
      });

      later(() => {
        setDamagePopup(null);
        setAttackingEnemyId(null);
        if (remainingHp === 0) {
          setGame({
            ...game,
            piles: pilesAfterSlime,
            hand: retainedHand,
            discard: discarded,
            playerHp: 0,
            playerPhysicalBlock: retainBlockAfterEnemyTurn(remainingPhysicalBlock, game.preserveDefenseOnTurnEnd),
            playerMagicBlock: retainBlockAfterEnemyTurn(remainingMagicBlock, game.preserveDefenseOnTurnEnd),
            playerResistance: nextPlayerResistance,
            playerAmplification: nextPlayerAmplification,
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
            playerMagicBlock: retainBlockAfterEnemyTurn(remainingMagicBlock, game.preserveDefenseOnTurnEnd),
            playerResistance: nextPlayerResistance,
            playerAmplification: nextPlayerAmplification,
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
        const willClearAfterNextDraw = pilesAfterSlime.every((pile, index) => pile.length === 0 || (pile.length === 1 && !blocked.includes(index)));
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
            };
          })()
          : null;
        const recyclingMultiplier = game.deckEditions.includes("frugalPlus")
          ? 2
          : game.deckEditions.includes("frugal")
            ? 1
            : 0;
        setGame({
          ...game,
          piles: pilesAfterSlime,
          clearPlan,
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
          playerMagicBlock: retainBlockAfterEnemyTurn(remainingMagicBlock, game.preserveDefenseOnTurnEnd),
          playerResistance: nextPlayerResistance,
          playerAmplification: nextPlayerAmplification,
          strength: remainingStrength + sharedTurnStrength(nextEnemies),
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
      }, slimeFlightDuration + steps.length * stepDuration + 260);
    }, discardDelay);
  }
}
