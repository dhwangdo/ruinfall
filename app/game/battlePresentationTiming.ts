/** Shared by the controller and the CSS animation on each enemy. */
export const ENEMY_STRIKE_DURATION_MS = 350;

export function enemyStepTiming(attack: boolean, reducedMotion: boolean) {
  if (reducedMotion) return { duration: 50, impact: 20, gap: 30 };
  return attack
    ? { duration: ENEMY_STRIKE_DURATION_MS, impact: Math.round(ENEMY_STRIKE_DURATION_MS * .55), gap: 30 }
    : { duration: 195, impact: 105, gap: 25 };
}
