import type { EnemyState } from "./enemies.ts";
import { ROACH_HATCHLING } from "./regionOneEnemies.ts";
import type { Card } from "./cards.ts";
import { applyKarmaToEnemy } from "./karmaRules.ts";

export function enemyTemporaryStrength(enemy: EnemyState, playerEnergy: number, handCount = 0) {
  return (playerEnergy <= 0 ? enemy.emptyEnergyStrengthGain ?? 0 : 0)
    + (handCount > 0 ? enemy.handStrengthGain ?? 0 : 0);
}

export function enemyEnergyRecoveryPenalty(enemies: readonly EnemyState[]) {
  return Math.max(0, ...enemies.filter(enemy => enemy.hp > 0).map(enemy => enemy.energyRecoveryPenalty ?? 0));
}

export function sharedTurnEndStrength(enemies: readonly EnemyState[]) {
  return enemies.reduce((total, enemy) => total + (enemy.hp > 0 ? enemy.sharedTurnEndStrengthGain ?? 0 : 0), 0);
}

export function blockedPileIndexes(enemies: readonly EnemyState[]) {
  return enemies.filter(enemy => enemy.hp > 0 && enemy.sealsPile && enemy.sealedPileIndex !== undefined)
    .map(enemy => enemy.sealedPileIndex!);
}

export function preparePileSeals(enemies: EnemyState[], piles: Card[][], turn: number, random = Math.random) {
  const candidates = piles.flatMap((pile, index) => pile.length > 0 ? [index] : []);
  return enemies.map(enemy => enemy.hp > 0 && enemy.sealsPile && enemy.sealedTurn !== turn
    ? { ...enemy, sealedTurn: turn, sealedPileIndex: candidates.length
      ? candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))] : undefined }
    : enemy);
}

/** Steal from dealt files without rebuilding, compacting or removing empty files. */
export function confiscatePileCards(enemies: EnemyState[], piles: Card[][], random = Math.random) {
  let available = piles.flat();
  const nextEnemies = enemies.map(enemy => {
    if (enemy.hp <= 0 || !enemy.confiscatesRare) return enemy;
    const candidates = available.filter(card => card.rarity === "rare");
    const card = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    if (!card) return enemy;
    available = available.filter(item => item.id !== card.id);
    return { ...enemy, confiscatedCards: [{ ...card }] };
  });
  const remainingIds = new Set(available.map(card => card.id));
  const nextPiles = piles.map(pile => {
    const remaining = pile.filter(card => remainingIds.has(card.id));
    return remaining.map((card, index) => index === remaining.length - 1
      ? { ...card, revealed: true } : card);
  });
  return { enemies: nextEnemies, piles: nextPiles };
}

/** Called only after a legal move/forge has spent its star. */
export function applySolitaireEnemyPassives(enemies: EnemyState[]) {
  return enemies.map(enemy => enemy.hp > 0 && enemy.solitaireHitBonus && !enemy.solitaireBonusUsedThisTurn
    ? { ...enemy, solitaireHitBonusReady: true, solitaireBonusUsedThisTurn: true }
    : enemy);
}

/** Resolve after existing actors and reflection; new children do not act this turn. */
export function spawnEnemyMinions(enemies: EnemyState[], summoningEnemyIds: ReadonlySet<string>) {
  const next = enemies.filter(enemy => !enemy.summonerId || enemy.hp > 0);
  for (const parent of enemies) {
    if (parent.hp <= 0 || !summoningEnemyIds.has(parent.id)) continue;
    if (next.filter(enemy => enemy.hp > 0 && enemy.summonerId === parent.id).length >= 2) continue;
    const count = (parent.summonsCreated ?? 0) + 1;
    const index = next.findIndex(enemy => enemy.id === parent.id);
    next[index] = { ...next[index], summonsCreated: count };
    next.push(applyKarmaToEnemy({
      ...ROACH_HATCHLING,
      id: `${parent.id}-hatchling-${count}`,
      intentIndex: 0,
      summonerId: parent.id,
      actions: ROACH_HATCHLING.actions.map(action => ({ ...action, attacks: action.attacks.map(attack => ({ ...attack })) })),
    }, parent.karmaStage ?? 0));
  }
  return next;
}
