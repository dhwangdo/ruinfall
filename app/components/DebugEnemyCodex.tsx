import { getEnemyCodexEntries, type EnemyAction } from "../game/enemies";

function debugEnemyActionText(action: EnemyAction) {
  const parts = action.attacks.map((attack) => {
    const damageType = attack.type === "magic" ? "마법 피해" : "물리 피해";
    return `${damageType} ${attack.value}${(attack.hits ?? 1) > 1 ? ` × ${attack.hits}` : ""}`;
  });
  if (action.strengthGain) parts.push(`힘 ${action.strengthGain} 획득`);
  if (action.blockGain) parts.push(`방어 ${action.blockGain} 획득`);
  if (action.boonGain) parts.push(`가호 ${action.boonGain} 획득`);
  if (action.strengthLoss) parts.push(`플레이어 힘 ${action.strengthLoss} 감소`);
  if (action.agilityLoss) parts.push(`플레이어 강인함 ${action.agilityLoss} 감소`);
  if (action.soilCount) parts.push(`모든 파일에 흙 ${action.soilCount}장 놓음`);
  if (action.nextAttackMagic) parts.push("다음 공격 마법화");
  if (action.physicalVulnerabilityGain) parts.push(`물리 취약 ${action.physicalVulnerabilityGain} 부여`);
  if (action.nextTurnPhysicalVulnerabilityGain) parts.push(`다음 턴 시작 시 물리 취약 ${action.nextTurnPhysicalVulnerabilityGain} 부여`);
  if (action.nextTurnMagicVulnerabilityGain) parts.push(`다음 턴 시작 시 마법 취약 ${action.nextTurnMagicVulnerabilityGain} 부여`);
  if (action.discardCount) parts.push(`파일 맨 위 ${action.discardCount}장 버리기`);
  return parts.length > 0 ? parts.join(" · ") : "대기";
}

function debugEnemyPatternText(actions: EnemyAction[]) {
  if (actions.length <= 1) return "고정 반복";
  const loopActionIndex = actions.findIndex((action) => action.loopTo !== undefined);
  if (loopActionIndex >= 0) return `처음부터 진행 후 ${actions[loopActionIndex].loopTo! + 1}번 행동부터 반복`;
  if (actions.every((action) => action.cycle)) return "순서대로 반복";
  if (actions.every((action) => action.randomEachTurn)) return "매 턴 무작위";
  if (actions.every((action) => action.randomNoRepeat)) return "직전 행동을 제외하고 무작위";
  return "직전 행동을 제외하고 무작위";
}

export function DebugEnemyCodex({ battle = false }: { battle?: boolean }) {
  const entries = getEnemyCodexEntries();
  return (
    <details className={`debug-enemy-codex ${battle ? "is-battle" : ""}`}>
      <summary>적 도감 ({entries.length})</summary>
      <div className="debug-enemy-codex-panel">
        {entries.map((entry) => (
          <article key={entry.encounterIndex} className="debug-enemy-codex-entry">
            <header>
              <strong>{entry.label}</strong>
              <span>
                {entry.regions.length > 0 ? `${entry.regions.join(", ")}지역` : "현재 미출현"}
              </span>
            </header>
            {entry.enemies.map(({ enemy, count }) => (
              <div className="debug-enemy-codex-member" key={`${enemy.name}-${JSON.stringify(enemy.actions)}`}>
                {entry.enemies.length > 1 && <strong>{enemy.name}{count > 1 ? ` × ${count}` : ""}</strong>}
                <p>체력 {Math.floor(enemy.maxHp * 0.9)}~{enemy.maxHp} · 힘 {enemy.strength} · 방어 {enemy.physicalBlock}</p>
                {(enemy.boon || enemy.berserk || enemy.thorns || enemy.sturdyThreshold > 0 || enemy.quicknessReady || enemy.nextAttackMagic) && (
                    <p>
                      {[
                      enemy.boon ? `가호 ${enemy.boon}` : "",
                      enemy.berserk ? `광폭화 ${enemy.berserk}` : "",
                      enemy.thorns ? `가시 ${enemy.thorns}` : "",
                      enemy.sturdyThreshold > 0 ? `단단함 ${enemy.sturdyThreshold}` : "",
                      enemy.quicknessReady ? "재빠름 준비" : "",
                      enemy.nextAttackMagic ? "첫 공격 마법화" : "",
                    ].filter(Boolean).join(" · ")}
                  </p>
                )}
                {enemy.trait && <p className="debug-enemy-trait">특성: {enemy.trait}</p>}
                <p className="debug-enemy-pattern">패턴: {debugEnemyPatternText(enemy.actions)}</p>
                <ol>
                  {enemy.actions.map((action, index) => (
                    <li key={`${action.name}-${index}`}>
                      <strong>{action.name}</strong><span>{debugEnemyActionText(action)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </article>
        ))}
      </div>
    </details>
  );
}
