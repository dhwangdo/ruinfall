import { enemyDamageBeforeBlock, type EnemyAction } from "../game/enemies";

export function enemyIntentEffectDescription(action: EnemyAction, firstActionCompleted = true) {
  const rockCount = action.firstActionRockCount !== undefined && !firstActionCompleted
    ? action.firstActionRockCount
    : action.rockCount;
  const describedEffects = [
    action.healGain && `체력 ${action.healGain} 회복`,
    action.strengthGain && `힘 ${action.strengthGain} 획득`,
    action.blockGain && `방어 ${action.blockGain} 획득`,
    action.boonGain && `가호 ${action.boonGain} 획득`,
    action.strengthLoss && `플레이어 힘 ${action.strengthLoss} 감소`,
    action.agilityLoss && `플레이어 강인함 ${action.agilityLoss} 감소`,
    action.soilCount && `모든 파일에 흙 ${action.soilCount}장 놓음`,
    rockCount && `모든 파일에 돌 ${rockCount}장 놓음`,
    action.nextAttackMagic && "다음 공격이 마법 피해",
    action.physicalVulnerabilityGain && `물리 취약 ${action.physicalVulnerabilityGain} 부여`,
    action.nextTurnPhysicalVulnerabilityGain && `다음 턴 시작 시 물리 취약 ${action.nextTurnPhysicalVulnerabilityGain} 부여`,
    action.nextTurnMagicVulnerabilityGain && `다음 턴 시작 시 마법 취약 ${action.nextTurnMagicVulnerabilityGain} 부여`,
    action.discardCount && `파일 맨 위 카드 ${action.discardCount}장 버리기${action.discardPriority === "rarity" ? " (희귀도 높은 카드 우선)" : ""}`,
  ].filter(Boolean).join(" · ");
  return describedEffects || (action.attacks.length === 0 ? action.name : "");
}

export function EnemyIntentIcons({
  action,
  strength,
  firstActionCompleted,
  forceMagic,
  physicalResistance,
  magicResistance,
  physicalVulnerability,
  magicVulnerability,
  vulnerabilityMultiplier,
}: {
  action: EnemyAction;
  strength: number;
  firstActionCompleted: boolean;
  forceMagic: boolean;
  physicalResistance: number;
  magicResistance: number;
  physicalVulnerability: number;
  magicVulnerability: number;
  vulnerabilityMultiplier: number;
}) {
  const effectDescriptions = enemyIntentEffectDescription(action, firstActionCompleted);
  const attackTypes = action.attacks.flatMap((attack) => Array.from(
    { length: attack.hits ?? 1 },
    () => forceMagic ? "magic" : attack.type,
  ));
  const hasRepeatedAttackType = attackTypes.length > 1 && new Set(attackTypes).size === 1;
  const attackIcons = [...action.attacks]
    .sort((leftAttack, rightAttack) => {
      const leftType = forceMagic ? "magic" : leftAttack.type;
      const rightType = forceMagic ? "magic" : rightAttack.type;
      return Number(leftType === "magic") - Number(rightType === "magic");
    })
    .flatMap((attack, attackIndex) => {
      const damageType = forceMagic ? "magic" : attack.type;
      const damage = enemyDamageBeforeBlock(
        attack.value + strength,
        damageType,
        physicalResistance,
        magicResistance,
        damageType === "physical" ? physicalVulnerability : magicVulnerability,
        vulnerabilityMultiplier,
      );
      return Array.from({ length: attack.hits ?? 1 }, (_, hitIndex) => (
        <span
          className={`intent-icon intent-icon-${damageType}`}
          key={`attack-${attackIndex}-${hitIndex}`}
          aria-label={`${damageType === "magic" ? "마법" : "물리"} 피해 ${damage}`}
        >
          {damageType === "physical" ? (
            <svg viewBox="4 1 56 76" aria-hidden="true">
              <path d="M32 2 53 16 45 51H59V61H39V76H25V61H5V51H19L11 16Z" />
            </svg>
          ) : <strong>{damage}</strong>}
          {damageType === "physical" && <strong>{damage}</strong>}
        </span>
      ));
    });
  const effectIcon = effectDescriptions && <>
    <span
      className={`intent-effect-icon ${attackIcons.length > 0 ? "is-superscript" : ""}`}
      aria-label={effectDescriptions}
    >*</span>
  </>;
  return (
    <span className={`intent-icons ${attackIcons.length === 0 ? "is-effect-only" : ""} ${attackIcons.length > 1 ? "is-multi-attack" : ""} ${hasRepeatedAttackType ? "is-same-type" : ""}`}>
      {attackIcons}
      {effectIcon}
    </span>
  );
}
