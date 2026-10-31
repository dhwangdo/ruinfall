import type { GameState } from "./battleState.ts";
import type { BlessingId } from "./blessingRules.ts";
import { resolveLethalDamage } from "./blessingRules.ts";
import { applyPlayerAttack, resolveEnemyHitAgainstPlayer } from "./enemies.ts";

/** Resolve each death once, including explosion chains and the return of confiscated cards. */
export function resolveEnemyDefeats(state: GameState, {
  blessings = [], maxPlayerHp = 50, oneUpUsed = false,
}: { blessings?: readonly BlessingId[]; maxPlayerHp?: number; oneUpUsed?: boolean } = {}) {
  let next = state;
  while (true) {
    const dead = next.enemies.find(enemy => enemy.hp <= 0 && !enemy.deathResolved);
    if (!dead) break;
    next = { ...next, enemies: next.enemies.map(enemy => enemy.id === dead.id
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
