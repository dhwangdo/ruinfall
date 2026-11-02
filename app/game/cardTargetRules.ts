import { canTargetEnemy, isAttackCard, UNPLAYABLE_CARD_EFFECTS, type Card } from "./cards.ts";

export function canUseCardOnCenter(card: Card | undefined) {
  return Boolean(card && !UNPLAYABLE_CARD_EFFECTS.has(card.effect) && !canTargetEnemy(card));
}

/** Pointer release never supplies a substitute enemy when the player did not pick one. */
export function cardDropTarget(card: Card, dropZone: string | undefined) {
  if (UNPLAYABLE_CARD_EFFECTS.has(card.effect)) return null;
  if (dropZone?.startsWith("enemy:") && (canTargetEnemy(card) || isAttackCard(card))) {
    const targetEnemyId = dropZone.slice(6);
    return targetEnemyId ? { targetEnemyId } : null;
  }
  return dropZone === "defend" && canUseCardOnCenter(card) ? {} : null;
}
