import type { EnemyState } from "./enemies";

export const KARMA_FIRST_WIN = 12;

export function normalizeBattleWins(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function karmaStageForWins(wins: number) {
  return Math.max(0, normalizeBattleWins(wins) - KARMA_FIRST_WIN + 1);
}

/** Stages add ten percentage points each, rather than compounding the HP multiplier. */
export function applyKarmaToEnemy(enemy: EnemyState, stage: number): EnemyState {
  stage = normalizeBattleWins(stage);
  if (stage === 0) return enemy;
  return { ...enemy, karmaStage: stage, strength: enemy.strength + stage,
    hp: Math.floor(enemy.hp * (10 + stage) / 10),
    maxHp: Math.floor(enemy.maxHp * (10 + stage) / 10) };
}

export function karmaDescription(stage: number) {
  return `적이 힘을 ${stage} 얻고 최대 체력이 ${stage * 10}% 증가합니다. 전투에서 승리할 때마다 1단계 올라가며 포탈을 타면 사라집니다.`;
}
