import type { Card } from "./cards.ts";
import type { GameState } from "./battleState.ts";
import { addResistance } from "./statuses.ts";

/** Status effects resolve after the card's attack; negative durations cancel their positive counterpart. */
export function applyCardStatuses(game: GameState, card: Card, targetId?: string, gainBlocked = false) {
  let resistance = 0, amplification = 0, enemyResistance = 0, enemyAmplification = 0;
  switch (card.effect) {
    case "battleCry": amplification = card.value; break;
    case "atField": amplification = 2; break;
    case "shatter": enemyResistance = -2; break;
    case "kneeStrike": enemyAmplification = -1; break;
    case "resistanceWard": resistance = 2; break;
    case "scaleArmor": enemyAmplification = -2; break;
    case "fourSeasons": resistance = 2; amplification = 2; enemyResistance = -2; enemyAmplification = -2; break;
    case "unyielding": resistance = 5; break;
    case "demolish": enemyResistance = -3; enemyAmplification = -3; break;
    case "sandToss": enemyAmplification = -card.value; break;
    case "battlePreparation": return { ...game, pendingBattlePreparation: (game.pendingBattlePreparation ?? 0) + 2 };
    default: return game;
  }
  return { ...game,
    playerResistance: addResistance(game.playerResistance, resistance, gainBlocked),
    playerAmplification: game.playerAmplification + amplification,
    enemies: game.enemies.map(enemy => enemy.hp > 0 && (card.effect === "fourSeasons" || enemy.id === targetId)
      ? { ...enemy, resistance: (enemy.resistance ?? 0) + enemyResistance,
        amplification: (enemy.amplification ?? 0) + enemyAmplification } : enemy),
  };
}

export function applyScheduledPreparation(game: GameState) {
  const amount = game.pendingBattlePreparation ?? 0;
  return amount ? { ...game, pendingBattlePreparation: 0, energy: game.energy + amount,
    playerAmplification: game.playerAmplification + amount } : game;
}

export function resolveAmplificationThresholdEffects(previous: GameState, next: GameState) {
  const hasOvercharge = next.activeRuleCards.some((card) => card.effect === "overcharge");
  const hadOvercharge = previous.activeRuleCards.some((card) => card.effect === "overcharge");
  const hasCriticalReaction = next.activeRuleCards.some((card) => card.effect === "criticalReaction");
  const hadCriticalReaction = previous.activeRuleCards.some((card) => card.effect === "criticalReaction");
  const overchargeTriggered = next.status === "playing"
    && !next.overchargeTriggeredThisTurn
    && next.playerAmplification >= 4
    && (previous.playerAmplification < 4 || (!hadOvercharge && hasOvercharge));
  const criticalReactionTriggered = next.status === "playing"
    && !next.criticalReactionTriggeredThisTurn
    && next.playerAmplification >= 8
    && (previous.playerAmplification < 8 || (!hadCriticalReaction && hasCriticalReaction));
  return {
    state: {
      ...next,
      energy: next.energy + (criticalReactionTriggered ? 2 : 0),
      overchargeTriggeredThisTurn: next.overchargeTriggeredThisTurn || overchargeTriggered,
      criticalReactionTriggeredThisTurn: next.criticalReactionTriggeredThisTurn || criticalReactionTriggered,
    },
    overchargeTriggered,
    criticalReactionTriggered,
    randomDrawCount: overchargeTriggered ? 2 : 0,
  };
}
