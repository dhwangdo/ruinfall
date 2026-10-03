import { EnemyIntentIcons, enemyIntentEffectDescription } from "./EnemyIntentIcons";
import type { EnemyState } from "../game/enemies";

type BattleEnemyUnitProps = {
  enemy: EnemyState;
  dying: boolean;
  defeated: boolean;
  displayedHp: number;
  popup?: { key: string; text: string; kind?: "damage" | "buff" | "debuff" };
  attacking: boolean;
  physicalResistance: number;
  magicResistance: number;
  physicalVulnerability: number;
  magicVulnerability: number;
  vulnerabilityMultiplier: number;
  onSelect: (enemyId: string) => void;
};

export function BattleEnemyUnit({
  enemy,
  dying,
  defeated,
  displayedHp,
  popup,
  attacking,
  physicalResistance,
  magicResistance,
  physicalVulnerability,
  magicVulnerability,
  vulnerabilityMultiplier,
  onSelect,
}: BattleEnemyUnitProps) {
  const intent = enemy.actions[enemy.intentIndex];
  const intentType = enemy.nextAttackMagic ? "magic" : intent.attacks[0]?.type ?? "buff";
  const intentDescription = enemyIntentEffectDescription(
    intent,
    enemy.firstActionCompleted ?? false,
  );

  return (
    <button
      type="button"
      className={`enemy-unit ${enemy.variant} ${dying ? "is-dying" : ""} ${defeated ? "is-defeated" : ""} ${attacking ? "is-attacking" : ""}`}
      data-enemy-id={enemy.id}
      data-drop-target={enemy.hp === 0 ? undefined : `enemy:${enemy.id}`}
      disabled={enemy.hp === 0}
      onClick={() => onSelect(enemy.id)}
      aria-label={`${enemy.name}${dying ? ", 쓰러지는 중" : defeated ? ", 격파됨" : ", 공격 대상"}`}
    >
      {enemy.hp > 0 && <div className="drop-prompt attack-prompt">이 적을 공격</div>}
      <div className="monster" aria-label={enemy.name}>
        <div className={`intent intent-card ${defeated ? "is-defeated" : intentType}`}>
          {defeated ? (
            <strong>격파</strong>
          ) : (
            <EnemyIntentIcons
              action={intent}
              strength={enemy.strength}
              firstActionCompleted={enemy.firstActionCompleted ?? false}
              forceMagic={enemy.nextAttackMagic}
              physicalResistance={physicalResistance}
              magicResistance={magicResistance}
              physicalVulnerability={physicalVulnerability}
              magicVulnerability={magicVulnerability}
              vulnerabilityMultiplier={vulnerabilityMultiplier}
            />
          )}
        </div>
        <div className="monster-horns"><i /><i /></div>
        <div className="monster-face"><b /><b /><span /></div>
      </div>
      <div className="unit-stats enemy-stats">
        <strong>{enemy.name}</strong>
        <div className="enemy-health-row">
          {enemy.physicalBlock > 0 && (
            <div className="defense-shield physical enemy-defense-shield" aria-label={`방어 ${enemy.physicalBlock}`}>
              <strong>{enemy.physicalBlock}</strong>
            </div>
          )}
          <div className="enemy-health-popup-anchor">
            <div className="healthbar enemy-health">
              <i style={{ width: `${(displayedHp / enemy.maxHp) * 100}%` }} />
              <span>{displayedHp} / {enemy.maxHp}</span>
            </div>
            {popup && (
              <div className={`combat-popup enemy-combat-popup is-${popup.kind ?? "damage"}`} key={popup.key}>
                {popup.text}
              </div>
            )}
          </div>
        </div>
        {!defeated && intentDescription && (
          <div className="enemy-intent-description" role="note">
            {intentDescription}
          </div>
        )}
        <div className="combat-buffs enemy-effects" aria-label="적 상태 효과">
          {enemy.strength !== 0 && <span>힘 {enemy.strength}</span>}
          {(enemy.boon ?? 0) > 0 && <span>가호 {enemy.boon}</span>}
          {(enemy.berserk ?? 0) > 0 && <span>광폭화 {enemy.berserk}</span>}
          {(enemy.thorns ?? 0) > 0 && <span>가시 {enemy.thorns}</span>}
          {enemy.sturdyThreshold > 0 && <span>단단함 ≤{enemy.sturdyThreshold}</span>}
          {enemy.quicknessReady && <span>재빠름 준비</span>}
          {enemy.nextAttackMagic && <span>다음 공격 마법</span>}
        </div>
      </div>
    </button>
  );
}
