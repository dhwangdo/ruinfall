import type { GameState } from "./battleState.ts";
import type { BlessingId } from "./blessingRules.ts";
import { resolveLethalDamage } from "./blessingRules.ts";
import { applyPlayerAttack, resolveEnemyHitAgainstPlayer } from "./enemies.ts";
import type { EnemyState } from "./enemies.ts";

/** Consume each controller's death effect, including deaths before battle starts. */
export function resolveEnemyDeathStuns(enemies: EnemyState[]) {
  const controllers = enemies.filter(enemy => enemy.hp <= 0 && enemy.deathStunTargetId);
  if (controllers.length === 0) return enemies;
  const targetIds = new Set(controllers.map(enemy => enemy.deathStunTargetId));
  return enemies.map(enemy => enemy.hp <= 0 && enemy.deathStunTargetId
    ? { ...enemy, deathStunTargetId: undefined }
    : enemy.hp > 0 && targetIds.has(enemy.id) ? { ...enemy, stunned: true } : enemy);
}

/** Resolve each death once, including explosion chains and the return of confiscated cards. */
export function resolveEnemyDefeats(state: GameState, {
  blessings = [], maxPlayerHp = 50, oneUpUsed = false,
}: { blessings?: readonly BlessingId[]; maxPlayerHp?: number; oneUpUsed?: boolean } = {}) {
  let next = state;
  while (true) {
    const dead = next.enemies.find(enemy => enemy.hp <= 0 && !enemy.deathResolved);
    if (!dead) break;
    next = { ...next, enemies: resolveEnemyDeathStuns(next.enemies).map(enemy => enemy.id === dead.id
      ? { ...enemy, deathResolved: true, confiscatedCards: [] } : enemy),
      hand: [...next.hand, ...(dead.confiscatedCards ?? []).map(card => ({ ...card, revealed: true }))] };
    if (!dead.powder) continue;
    const hit = resolveEnemyHitAgainstPlayer({ damage: dead.powder, damageType: "physical",
      block: next.playerPhysicalBlock, isAttack: false, invulnerable: next.invulnerable });
    const life = resolveLethalDamage(next.playerHp, hit.damageTaken, maxPlayerHp,
      blessings.includes("oneUp") && !oneUpUsed);
    oneUpUsed ||= life.usedOneUp;
    next = { ...next, playerHp: life.hp, playerPhysicalBlock: hit.remainingBlock,
      enemies: next.enemies.map(enemy => enemy.hp > 0
        ? applyPlayerAttack(enemy, dead.powder!, 1, undefined, { isAttack: false }) : enemy) };
  }
  return { state: next, oneUpUsed };
}
