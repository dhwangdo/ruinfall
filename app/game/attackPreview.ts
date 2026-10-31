import type { EnemyState } from "./enemies";

/** Shared target context; rounding belongs to the final damage calculation. */
export function attackPreview(amplification: number, target?: EnemyState, bossSlayer = false) {
  return {
    attackModifiers: {
      amplification,
      resistance: target?.resistance ?? 0,
      multiplier: target?.isBoss && bossSlayer ? 2 : 1,
    },
  };
}
