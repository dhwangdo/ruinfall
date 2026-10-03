import type { Dispatch, RefObject, SetStateAction } from "react";
import type { BlessingId } from "./blessingRules";
import type { GameState } from "./battleState";
import type { EnemyAction, EnemyState } from "./enemies";
import type { Card } from "./cards";
import type { DamagePopup, DragState, Phase } from "./battleUiTypes";
import type { TelemetryRecorder } from "./telemetry";
import { resolveLethalDamage } from "./blessingRules";
import { recoverBattleEnergy } from "./combatEconomy";
import { addVulnerability, decayThenAddVulnerability } from "./statuses";
import { recordTelemetryEnemyDamage } from "./telemetry";
import { cardsForNextShuffle } from "./cardRules";
import { buildPiles, drawFromPileIndexes, drawRandomFromPiles, prepareDeckForPiles } from "./battleState";
import { applyPlayerAttack, applyPlayerTurnStart, chooseNextIntent, resolveEnemyHitAgainstPlayer, retainBlockAfterEnemyTurn } from "./enemies";

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

    const discardDelay = game.preserveHandOnTurnEnd ? 0 : 180 + Math.max(0, game.hand.length - 1) * 25;
    later(() => {
      const enemiesAfterBlockDecay = game.enemies.map((enemy) => ({ ...enemy, physicalBlock: 0 }));
      const livingEnemies = enemiesAfterBlockDecay.filter((enemy) => enemy.hp > 0);
      const toxicSlimeDamage = game.hand.filter((card) => card.effect === "slime").length * 12;
      const retainedHand = game.preserveHandOnTurnEnd ? game.hand : [];
      const discarded = [
        ...game.discard,
        ...(game.preserveHandOnTurnEnd ? [] : game.hand),
      ];
      const pilesAfterSlime = game.piles.map((pile) => [...pile]);
      let remainingPhysicalBlock = game.playerPhysicalBlock;
      let remainingMagicBlock = game.playerMagicBlock;
      let physicalStatus = {
        resistance: game.playerPhysicalResistance,
        vulnerability: game.playerPhysicalVulnerability,
      };
      const magicStatus = {
        resistance: game.playerMagicResistance,
        vulnerability: game.playerMagicVulnerability,
      };
      let remainingStrength = Math.max(0, game.strength - game.temporaryStrength);
      let remainingAgility = game.agility;
      let nextTurnPhysicalVulnerabilityGain = 0;
      let nextTurnMagicVulnerabilityGain = 0;
      const toxicSlimeHit = resolveEnemyHitAgainstPlayer({
        damage: toxicSlimeDamage,
        damageType: "magic",
        block: remainingMagicBlock,
        physicalResistance: game.playerPhysicalResistance,
        magicResistance: game.playerMagicResistance,
        vulnerability: game.playerMagicVulnerability,
        invulnerable: game.invulnerable,
        vulnerabilityMultiplier: blessings.includes("vulnerabilityInsurance") ? 1.5 : 2,
      });
      const toxicSlimeDamageTaken = toxicSlimeHit.damageTaken;
      remainingMagicBlock = toxicSlimeHit.remainingBlock;
      let oneUpAvailable = blessings.includes("oneUp") && !oneUpUsedRef.current;
      const toxicSlimeLife = resolveLethalDamage(game.playerHp, toxicSlimeDamageTaken, maxPlayerHp, oneUpAvailable);
      let remainingHp = toxicSlimeLife.hp;
      if (toxicSlimeLife.usedOneUp) {
        oneUpAvailable = false;
        oneUpUsedRef.current = true;
        setOneUpUsed(true);
      }
      const hpAfterToxicSlime = remainingHp;
      const physicalBlockAfterToxicSlime = remainingPhysicalBlock;
      const magicBlockAfterToxicSlime = remainingMagicBlock;
      const steps: Array<{
        enemy: EnemyState;
        action: EnemyAction;
        attack: EnemyAction["attacks"][number] | null;
        damage: number;
        hpAfter: number;
        physicalBlockAfter: number;
        magicBlockAfter: number;
        message?: string;
      }> = [];
      const actedEnemyIds = new Set<string>();
      const reflectedDamage = new Map<string, number>();
      const enemyDamageTaken = new Map<string, number>();

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
          energy: recoverBattleEnergy(game.energy, maximumEnergyForGame(game, blessings.includes("glassCannon"))),
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
          strength: Math.max(0, game.strength - game.temporaryStrength),
          temporaryStrength: 0,
          defenseMultiplier: 1,
          damageTakenMultiplier: 1,
          invulnerable: false,
          doubleNextAttack: game.doubleNextAttack,
          preserveHandOnTurnEnd: false,
          enemies: enemiesAfterBlockDecay.map(applyPlayerTurnStart),
          status: remainingHp === 0 ? "lost" : "playing",
          message: remainingHp === 0 ? "유독성 점액의 마법 피해로 쓰러졌습니다." : "추가 턴을 시작합니다.",
        });
        setPhase(remainingHp === 0 ? "playing" : "drawing");
        if (remainingHp > 0) later(drawCards, 120);
        return;
      }

      for (const enemy of livingEnemies) {
        if (remainingHp === 0) break;
        const action = enemy.actions[enemy.intentIndex];
        actedEnemyIds.add(enemy.id);
        for (const attack of action.attacks) {
          const resolvedAttack = enemy.nextAttackMagic
            ? { ...attack, type: "magic" as const }
            : attack;
          for (let hit = 0; hit < (attack.hits ?? 1); hit += 1) {
            if (remainingHp === 0) break;
            const matchingBlock = resolvedAttack.type === "physical" ? remainingPhysicalBlock : remainingMagicBlock;
            const resolvedHit = resolveEnemyHitAgainstPlayer({
              damage: attack.value + enemy.strength,
              damageType: resolvedAttack.type,
              block: matchingBlock,
              physicalResistance: physicalStatus.resistance,
              magicResistance: magicStatus.resistance,
              vulnerability: resolvedAttack.type === "physical" ? physicalStatus.vulnerability : magicStatus.vulnerability,
              damageTakenMultiplier: game.damageTakenMultiplier,
              invulnerable: game.invulnerable,
              vulnerabilityMultiplier: blessings.includes("vulnerabilityInsurance") ? 1.5 : 2,
            });
            if (game.reflectDamage > 0 && resolvedHit.blocked > 0) {
              reflectedDamage.set(enemy.id, (reflectedDamage.get(enemy.id) ?? 0) + resolvedHit.blocked * game.reflectDamage);
            }
            const damage = resolvedHit.damageTaken;
            if (resolvedAttack.type === "physical") remainingPhysicalBlock = resolvedHit.remainingBlock;
            else remainingMagicBlock = resolvedHit.remainingBlock;
            const life = resolveLethalDamage(remainingHp, damage, maxPlayerHp, oneUpAvailable);
            remainingHp = life.hp;
            if (life.usedOneUp) {
              oneUpAvailable = false;
              oneUpUsedRef.current = true;
              setOneUpUsed(true);
            }
            if (game.playerThorns > 0 && resolvedHit.transformedDamage > 0) {
              reflectedDamage.set(enemy.id, (reflectedDamage.get(enemy.id) ?? 0) + game.playerThorns);
            }
            if (damage > 0) enemyDamageTaken.set(enemy.id, (enemyDamageTaken.get(enemy.id) ?? 0) + damage);
            steps.push({
              enemy,
              action,
              attack: resolvedAttack,
              damage,
              hpAfter: remainingHp,
              physicalBlockAfter: remainingPhysicalBlock,
              magicBlockAfter: remainingMagicBlock,
            });
          }
        }
        if (action.physicalVulnerabilityGain) {
          physicalStatus = addVulnerability(physicalStatus, action.physicalVulnerabilityGain);
          steps.push({
            enemy,
            action,
            attack: null,
            damage: 0,
            hpAfter: remainingHp,
            physicalBlockAfter: remainingPhysicalBlock,
            magicBlockAfter: remainingMagicBlock,
            message: `물리 취약 ${physicalStatus.vulnerability} 부여`,
          });
        }
        if (action.nextTurnPhysicalVulnerabilityGain) {
          nextTurnPhysicalVulnerabilityGain += action.nextTurnPhysicalVulnerabilityGain;
          steps.push({
            enemy,
            action,
            attack: null,
            damage: 0,
            hpAfter: remainingHp,
            physicalBlockAfter: remainingPhysicalBlock,
            magicBlockAfter: remainingMagicBlock,
            message: `다음 턴 시작 시 물리 취약 ${action.nextTurnPhysicalVulnerabilityGain} 부여`,
          });
        }
        if (action.nextTurnMagicVulnerabilityGain) {
          nextTurnMagicVulnerabilityGain += action.nextTurnMagicVulnerabilityGain;
          steps.push({
            enemy,
            action,
            attack: null,
            damage: 0,
            hpAfter: remainingHp,
            physicalBlockAfter: remainingPhysicalBlock,
            magicBlockAfter: remainingMagicBlock,
            message: `다음 턴 시작 시 마법 취약 ${action.nextTurnMagicVulnerabilityGain} 부여`,
          });
        }
        if (action.strengthLoss || action.agilityLoss) {
          remainingStrength = Math.max(0, remainingStrength - (action.strengthLoss ?? 0));
          remainingAgility = Math.max(0, remainingAgility - (action.agilityLoss ?? 0));
          steps.push({
            enemy,
            action,
            attack: null,
            damage: 0,
            hpAfter: remainingHp,
            physicalBlockAfter: remainingPhysicalBlock,
            magicBlockAfter: remainingMagicBlock,
            message: [
              action.strengthLoss ? `힘 ${action.strengthLoss} 감소` : "",
              action.agilityLoss ? `강인함 ${action.agilityLoss} 감소` : "",
            ].filter(Boolean).join(" · "),
          });
        }
        if (action.discardCount && enemy.discardPileIndex !== undefined) {
          const pileIndex = enemy.discardPileIndex % Math.max(1, pilesAfterSlime.length);
          const pile = pilesAfterSlime[pileIndex];
          const discardedCards = pile
            ? Array.from({ length: Math.min(action.discardCount, pile.length) }, () => pile.pop())
              .filter((card): card is Card => Boolean(card))
            : [];
          if (pile && discardedCards.length > 0) {
            discarded.push(...discardedCards);
            if (pile.length > 0) pile[pile.length - 1] = { ...pile[pile.length - 1], revealed: true };
          }
          steps.push({
            enemy,
            action,
            attack: null,
            damage: 0,
            hpAfter: remainingHp,
            physicalBlockAfter: remainingPhysicalBlock,
            magicBlockAfter: remainingMagicBlock,
            message: discardedCards.length > 0
              ? `${pileIndex + 1}번 파일: ${discardedCards.length}장 버림`
              : `${pileIndex + 1}번 파일은 비어 있음`,
          });
        }
        if (action.strengthGain || action.blockGain) {
          steps.push({
            enemy,
            action,
            attack: null,
            damage: 0,
            hpAfter: remainingHp,
            physicalBlockAfter: remainingPhysicalBlock,
            magicBlockAfter: remainingMagicBlock,
          });
        }
      }

      let nextEnemies = enemiesAfterBlockDecay.map((enemy) => {
        if (enemy.hp === 0 || !actedEnemyIds.has(enemy.id)) return enemy;
        const action = enemy.actions[enemy.intentIndex];
        const nextIntentIndex = chooseNextIntent(enemy.actions, enemy.intentIndex);
        return {
          ...enemy,
          strength: enemy.strength + (action.strengthGain ?? 0),
          physicalBlock: enemy.physicalBlock + (action.blockGain ?? 0),
          boon: (enemy.boon ?? 0) + (action.boonGain ?? 0),
          intentIndex: nextIntentIndex,
          discardPileIndex: undefined,
          firstActionCompleted: true,
          quicknessReady: false,
          nextAttackMagic: action.nextAttackMagic
            ? true
            : enemy.nextAttackMagic && action.attacks.length === 0,
        };
      });
      nextEnemies = nextEnemies.map((enemy) => {
        const reflected = reflectedDamage.get(enemy.id) ?? 0;
        const effectiveReflected = enemy.isBoss && blessings.includes("bossSlayer") ? reflected * 2 : reflected;
        return effectiveReflected > 0 ? applyPlayerAttack(enemy, effectiveReflected, 1) : enemy;
      });

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
        later(() => setAttackingEnemyId(step.enemy.id), base);
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
            hand: [],
            discard: discarded,
            playerHp: 0,
            playerPhysicalBlock: retainBlockAfterEnemyTurn(remainingPhysicalBlock, game.preserveDefenseOnTurnEnd),
            playerMagicBlock: retainBlockAfterEnemyTurn(remainingMagicBlock, game.preserveDefenseOnTurnEnd),
            playerPhysicalResistance: physicalStatus.resistance,
            playerPhysicalVulnerability: physicalStatus.vulnerability,
            playerMagicResistance: magicStatus.resistance,
            playerMagicVulnerability: magicStatus.vulnerability,
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
            hand: [],
            discard: discarded,
            playerHp: remainingHp,
            playerPhysicalBlock: retainBlockAfterEnemyTurn(remainingPhysicalBlock, game.preserveDefenseOnTurnEnd),
            playerMagicBlock: retainBlockAfterEnemyTurn(remainingMagicBlock, game.preserveDefenseOnTurnEnd),
            playerPhysicalResistance: physicalStatus.resistance,
            playerPhysicalVulnerability: physicalStatus.vulnerability,
            playerMagicResistance: magicStatus.resistance,
            playerMagicVulnerability: magicStatus.vulnerability,
            enemies: nextEnemies,
            status: "won",
            message: "응수로 모든 적을 쓰러뜨렸습니다.",
          });
          setPhase("playing");
          grantBattleReward(battleRewardRegionRef.current);
          return;
        }

        const willClearAfterNextDraw = pilesAfterSlime.every((pile) => pile.length <= 1);
        const turnStartExtraDrawCount = (game.deckEditions.includes("persistentDraw") ? 1 : 0)
          + (blessings.includes("starlessAge") ? 1 : 0);
        const clearPlan = willClearAfterNextDraw
          ? (() => {
            const emptyIndexes = pilesAfterSlime.map((pile, index) => pile.length === 0 ? index : -1).filter((index) => index >= 0);
            const cardsDrawnBeforeClear = new Set([
              ...pilesAfterSlime.flatMap((pile) => pile.map((card) => card.id)),
              ...retainedHand.map((card) => card.id),
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
            const redraw = drawFromPileIndexes(rebuilt, emptyIndexes);
            const additionalDraw = turnStartExtraDrawCount > 0
              ? drawRandomFromPiles(redraw.piles, turnStartExtraDrawCount)
              : { piles: redraw.piles, hand: [] as Card[] };
            return {
              pilesBeforeDraw: rebuilt,
              pilesAfterDraw: additionalDraw.piles,
              hand: [...redraw.hand, ...additionalDraw.hand],
            };
          })()
          : null;
        const nextTurnPhysicalStatus = decayThenAddVulnerability(physicalStatus, nextTurnPhysicalVulnerabilityGain);
      const nextTurnMagicStatus = decayThenAddVulnerability(magicStatus, nextTurnMagicVulnerabilityGain);
      const enemiesAtPlayerTurnStart = nextEnemies.map(applyPlayerTurnStart);
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
          energy: recoverBattleEnergy(game.energy, maximumEnergyForGame(game, blessings.includes("glassCannon"))),
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
          playerPhysicalResistance: nextTurnPhysicalStatus.resistance,
          playerMagicResistance: nextTurnMagicStatus.resistance,
          playerPhysicalVulnerability: nextTurnPhysicalStatus.vulnerability,
          playerMagicVulnerability: nextTurnMagicStatus.vulnerability,
          strength: remainingStrength,
          temporaryStrength: 0,
          agility: remainingAgility,
          defenseMultiplier: 1,
          damageTakenMultiplier: 1,
          invulnerable: false,
          doubleNextAttack: game.doubleNextAttack,
          preserveHandOnTurnEnd: false,
          enemies: enemiesAtPlayerTurnStart,
          message: "적의 턴이 끝났습니다.",
        });
        setPhase("drawing");
        later(drawCards, 120);
      }, slimeFlightDuration + steps.length * stepDuration + 260);
    }, discardDelay);
  }
}
