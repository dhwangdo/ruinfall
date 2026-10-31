import type { Card } from "./cards.ts";
import type { GameState } from "./battleState.ts";
import { addResistance } from "./statuses.ts";

/** Status effects resolve after the card's attack; negative durations cancel their positive counterpart. */
export function applyCardStatuses(game: GameState, card: Card, targetId?: string, gainBlocked = false) {
  let resistance = 0, amplification = 0, enemyResistance = 0, enemyAmplification = 0;
  switch (card.effect) {
    case "battleCry": amplification = 1; break;
    case "shatter": enemyResistance = -2; break;
    case "kneeStrike": enemyAmplification = -1; break;
    case "resistanceWard": resistance = 2; break;
    case "scaleArmor": enemyAmplification = -2; break;
    case "fourSeasons": resistance = 2; amplification = 2; enemyResistance = -2; enemyAmplification = -2; break;
    case "unyielding": resistance = 5; break;
    case "demolish": enemyResistance = -3; enemyAmplification = -3; break;
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
