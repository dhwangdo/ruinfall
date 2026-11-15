import { EnemyIntentIcons, enemyIntentEffectDescription } from "./EnemyIntentIcons";
import type { EnemyState } from "../game/enemies";
import { enemyTemporaryStrength } from "../game/enemyPassives";
import { BattleStatusBadge } from "./BattleStatusBadge";
import { BATTLE_STATUS_DESCRIPTION as STATUS } from "./battleStatusDescriptions";
import { statusLabel } from "../game/statuses";
import { ENEMY_STRIKE_DURATION_MS } from "../game/battlePresentationTiming";
import type { CSSProperties } from "react";

type BattleEnemyUnitProps = {
  enemy: EnemyState;
  playerEnergy: number;
  playerHandCount: number;
  dying: boolean;
  defeated: boolean;
  displayedHp: number;
  popup?: { key: string; text: string; kind?: "damage" | "buff" | "debuff" };
  attacking: boolean;
  resistance: number;
  ignoreNegativeResistance: boolean;
  onSelect: (enemyId: string) => void;
};

export function BattleEnemyUnit({
  enemy,
  playerEnergy,
  playerHandCount,
  dying,
  defeated,
  displayedHp,
  popup,
  attacking,
  resistance,
  ignoreNegativeResistance,
  onSelect,
}: BattleEnemyUnitProps) {
  const intent = enemy.actions[enemy.intentIndex];
  const temporaryStrength = enemyTemporaryStrength(enemy, playerEnergy, playerHandCount);
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
      style={{ "--enemy-strike-duration": `${ENEMY_STRIKE_DURATION_MS}ms` } as CSSProperties}
      data-drop-target={enemy.hp === 0 ? undefined : `enemy:${enemy.id}`}
      disabled={enemy.hp === 0}
      onClick={() => onSelect(enemy.id)}
      aria-label={`${enemy.name}${dying ? ", 쓰러지는 중" : defeated ? ", 격파됨" : ", 공격 대상"}`}
    >
      {enemy.hp > 0 && <div className="drop-prompt attack-prompt">이 적에게 사용</div>}
      <div className="monster" aria-label={enemy.name}>
        <div className={`intent intent-card ${defeated ? "is-defeated" : intentType}`}>
          {defeated ? (
            <strong>격파</strong>
          ) : enemy.stunned ? (
            <strong className="enemy-action-cancelled">행동 취소</strong>
          ) : (
            <EnemyIntentIcons
              action={intent}
              strength={enemy.strength + temporaryStrength}
              firstActionCompleted={enemy.firstActionCompleted ?? false}
              forceMagic={enemy.nextAttackMagic}
              resistance={resistance}
              amplification={enemy.amplification ?? 0}
              amplificationEffectiveness={(enemy.amplification ?? 0) > 0 ? enemy.statusEffectiveness ?? 30 : 30}
              ignoreNegativeResistance={ignoreNegativeResistance}
            />
          )}
        </div>
        <div className="monster-horns"><i /><i /></div>
        <div className="monster-face"><b /><b /><span /></div>
      </div>
      <div className="unit-stats enemy-stats">
        <strong>{enemy.name}</strong>
        <div className="enemy-health-row">
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
        {!defeated && !enemy.stunned && intentDescription && (
          <div className="enemy-intent-description" role="note">
            {intentDescription}
          </div>
        )}
        {enemy.hp > 0 && <div className="combat-buffs enemy-effects" aria-label="적 상태 효과">
          {(enemy.resistance ?? 0) !== 0 && <BattleStatusBadge kind={enemy.resistance! < 0 ? "debuff" : "buff"} description={STATUS.resistance(enemy.resistance!)}>{statusLabel("resistance", enemy.resistance!)}</BattleStatusBadge>}
          {(enemy.amplification ?? 0) !== 0 && <BattleStatusBadge kind={enemy.amplification! < 0 ? "debuff" : "buff"} description={STATUS.amplification(enemy.amplification!)}>{statusLabel("amplification", enemy.amplification!)}</BattleStatusBadge>}
          {(enemy.statusEffectiveness ?? 30) > 30 && <BattleStatusBadge description={enemy.trait ?? ""}>강화됨</BattleStatusBadge>}
          {enemy.physicalBlock > 0 && <BattleStatusBadge description={STATUS.enemyBlock}>방어 {enemy.physicalBlock}</BattleStatusBadge>}
          {enemy.stunned && <BattleStatusBadge kind="debuff" description={STATUS.stunned}>행동 불가 1</BattleStatusBadge>}
          {enemy.stunAllyOnDeath && <BattleStatusBadge description={enemy.trait ?? ""}>인형 조종</BattleStatusBadge>}
          {(enemy.emptyEnergyStrengthGain ?? 0) > 0 && <BattleStatusBadge description={enemy.trait ?? ""}>빈틈 노리기</BattleStatusBadge>}
          {(enemy.solitaireHitBonus ?? 0) > 0 && <BattleStatusBadge description={enemy.trait ?? ""}>거미줄</BattleStatusBadge>}
          {(enemy.turnEndStrengthGain ?? 0) > 0 && <BattleStatusBadge description={enemy.trait ?? ""}>성장 {enemy.turnEndStrengthGain}</BattleStatusBadge>}
          {enemy.halfHpStrengthGain && <BattleStatusBadge description={enemy.trait ?? ""}>{enemy.enraged ? "격노 발동" : "격노"}</BattleStatusBadge>}
          {enemy.powder !== undefined && <BattleStatusBadge description={enemy.trait ?? ""}>화약 {enemy.powder}</BattleStatusBadge>}
          {enemy.handStrengthGain && <BattleStatusBadge description={enemy.trait ?? ""}>추적</BattleStatusBadge>}
          {enemy.restsWhenBlocked && <BattleStatusBadge description={enemy.trait ?? ""}>묵직한 망치</BattleStatusBadge>}
          {enemy.energyRecoveryPenalty && <BattleStatusBadge description={enemy.trait ?? ""}>족쇄</BattleStatusBadge>}
          {enemy.sealsPile && <BattleStatusBadge description={enemy.trait ?? ""}>봉인{enemy.sealedPileIndex !== undefined ? ` · ${enemy.sealedPileIndex + 1}번 파일` : ""}</BattleStatusBadge>}
          {enemy.fermentedSlimeCount && <BattleStatusBadge description={enemy.trait ?? ""}>발효 점액</BattleStatusBadge>}
          {enemy.sharedTurnEndStrengthGain && <BattleStatusBadge description={enemy.trait ?? ""}>피의 공명 {enemy.sharedTurnEndStrengthGain}</BattleStatusBadge>}
          {enemy.confiscatesRare && <BattleStatusBadge description={(enemy.confiscatedCards ?? []).map(card => card.name).join(", ") || "압수한 카드가 없습니다."}>압수 {enemy.confiscatedCards?.length ?? 0}</BattleStatusBadge>}
          {enemy.strength !== 0 && <BattleStatusBadge kind={enemy.strength > 0 ? "buff" : "debuff"} description={STATUS.strength}>힘 {enemy.strength}</BattleStatusBadge>}
          {temporaryStrength > 0 && <BattleStatusBadge description={STATUS.temporaryStrength}>임시 힘 +{temporaryStrength}</BattleStatusBadge>}
          {enemy.solitaireHitBonusReady && <BattleStatusBadge kind="debuff" description={STATUS.webBroken}>실 끊김 {enemy.solitaireHitBonus}</BattleStatusBadge>}
          {(enemy.boon ?? 0) > 0 && <BattleStatusBadge description={STATUS.boon}>가호 {enemy.boon}</BattleStatusBadge>}
          {(enemy.berserk ?? 0) > 0 && <BattleStatusBadge description={STATUS.berserk}>광폭화 {enemy.berserk}</BattleStatusBadge>}
          {(enemy.thorns ?? 0) > 0 && <BattleStatusBadge description={STATUS.thorns}>가시 {enemy.thorns}</BattleStatusBadge>}
          {enemy.sturdyThreshold > 0 && <BattleStatusBadge description={STATUS.sturdy}>단단함 ≤{enemy.sturdyThreshold}</BattleStatusBadge>}
          {enemy.quicknessReady && <BattleStatusBadge description={STATUS.quickness}>재빠름 준비</BattleStatusBadge>}
          {enemy.nextAttackMagic && <BattleStatusBadge description={STATUS.nextAttackMagic}>다음 공격 마법</BattleStatusBadge>}
        </div>}
      </div>
    </button>
  );
}
