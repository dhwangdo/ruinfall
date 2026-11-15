import type { GameState } from "./battleState";
import type { Card } from "./cards";
import type { BlessingId } from "./blessingRules";
import type { EnemyState } from "./enemies";
import { isAttackCard } from "./cards.ts";
import { applyPlayerAttack, playerAttackThornHits } from "./enemies.ts";
import { calculateCardDamage } from "./combatEconomy.ts";
import { calculateAttackDamage } from "./statuses.ts";
import { attackPreview } from "./attackPreview.ts";
import { resolveEnemyDefeats } from "./enemyDefeatRules.ts";
import { applyCardStatuses } from "./cardStatusEffects.ts";

export type CardHit = { enemyId: string; damage: number; remainingHp: number };

/** One hit sequence drives both enemy state and the displayed damage numbers. */
export function resolveCardAttack(
  state: GameState, card: Card, targetEnemyId: string | undefined,
  blessings: readonly BlessingId[], randomRolls: readonly number[],
  deathOptions: { maxPlayerHp?: number; oneUpUsed?: boolean } = {},
) {
  const isDamageCard = isAttackCard(card);
  const isAttackAll = ["ironRampage", "shockwave", "sweep", "odinSpear"].includes(card.effect);
  const randomTarget = card.effect === "meteor" || card.effect === "hydra";
  const targetEnemy = card.effect === "magicStrike"
    ? state.enemies.filter(enemy => enemy.hp > 0).reduce<EnemyState | undefined>(
      (lowest, enemy) => !lowest || enemy.hp < lowest.hp ? enemy : lowest, undefined)
    : randomTarget ? state.enemies.find(enemy => enemy.hp > 0)
      : state.enemies.find(enemy => enemy.id === targetEnemyId);
  if (isDamageCard && !isAttackAll && !targetEnemy) return null;
  if (isDamageCard && !isAttackAll && targetEnemy!.hp === 0) return null;
  const photonCannonOvercharged = card.effect === "photonCannon" && state.playerAmplification >= 4;
  const repetitions = (card.effect === "hydra" ? 9 : card.effect === "meteor" ? state.stars
    : card.effect === "photonCannon" && photonCannonOvercharged ? 3
    : card.effect === "fourHit" ? 5 : card.effect === "doubleHit" && card.forged ? 2 : 1)
    * (isDamageCard && state.doubleNextAttack ? 2 : 1);
  const combatManualBonus = state.hand
    .filter(item => item.effect === "combatManual" || item.effect === "strategyBook")
    .reduce((sum, item) => sum + item.value, 0)
    + (blessings.includes("backToBasics") && ["starter", "basic"].includes(card.rarity) ? 4 : 0);
  const rawDamagePerHit = isDamageCard
    ? calculateCardDamage(photonCannonOvercharged ? { ...card, value: 8 } : card, state.strength, combatManualBonus, state.radiancePlayedThisTurn) : 0;
  const preview = attackPreview(state.playerAmplification, targetEnemy, blessings.includes("bossSlayer"));
  const damagePerHit = isDamageCard
    ? calculateAttackDamage(rawDamagePerHit, preview.attackModifiers) : 0;
  let nextEnemies = state.enemies;
  let sideEffects = state;
  let oneUpUsed = deathOptions.oneUpUsed ?? false;
  const hitPopups: CardHit[] = [];
  const thornHits: number[] = [];
  const hitEnemy = (enemyId: string) => {
    if (sideEffects.playerHp === 0) return;
    nextEnemies = nextEnemies.map(enemy => {
      if (enemy.id !== enemyId) return enemy;
      const { attackModifiers } = attackPreview(state.playerAmplification, enemy, blessings.includes("bossSlayer"));
      thornHits.push(...playerAttackThornHits(enemy, rawDamagePerHit, 1, attackModifiers));
      const next = applyPlayerAttack(enemy, rawDamagePerHit, 1, undefined, attackModifiers);
      const dealt = enemy.hp - next.hp;
      if (dealt > 0) hitPopups.push({ enemyId, damage: dealt, remainingHp: next.hp });
      return next;
    });
    const deaths = resolveEnemyDefeats({ ...sideEffects, enemies: nextEnemies }, { ...deathOptions, blessings, oneUpUsed });
    sideEffects = deaths.state;
    nextEnemies = sideEffects.enemies;
    oneUpUsed = deaths.oneUpUsed;
    if (["shatter", "kneeStrike", "demolish"].includes(card.effect)) {
      sideEffects = applyCardStatuses(sideEffects, card, enemyId);
      nextEnemies = sideEffects.enemies;
    }
  };
  if (isDamageCard) {
    if (randomTarget) {
      for (let index = 0; index < repetitions; index += 1) {
        const living = nextEnemies.filter(enemy => enemy.hp > 0);
        if (living.length === 0 || sideEffects.playerHp === 0) break;
        hitEnemy(living[Math.floor((randomRolls[index] ?? 0) * living.length)].id);
      }
    } else if (isAttackAll) {
      state.enemies.filter(enemy => enemy.hp > 0).forEach(enemy => {
        for (let index = 0; index < repetitions; index += 1) hitEnemy(enemy.id);
      });
    } else if (targetEnemy) {
      for (let index = 0; index < repetitions; index += 1) hitEnemy(targetEnemy.id);
    }
  } else if (card.effect === "relic") {
    nextEnemies = state.enemies.map(enemy => enemy.variant === "goblin"
      ? { ...enemy, strength: enemy.strength - card.value } : enemy);
  }
  return {
    targetEnemy, repetitions, combatManualBonus, damagePerHit,
    damage: damagePerHit * repetitions, nextEnemies, hitPopups, thornHits, sideEffects, oneUpUsed
  };
}
