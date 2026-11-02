export const BATTLE_STATUS_DESCRIPTION = {
  strength: "공격의 각 타격에 이 수치만큼 피해를 추가합니다.",
  agility: "카드로 방어 또는 마법 방어를 얻을 때 이 수치만큼 추가로 얻습니다.",
  defenseMultiplier: "카드로 얻는 방어와 마법 방어의 양이 표시된 배수만큼 증가합니다.",
  damageTakenMultiplier: "방어로 막지 못한 피해가 표시된 배수만큼 증가합니다.",
  invulnerable: "받는 피해를 막습니다. 체력을 지불하는 비용과는 별개입니다.",
  doubleNextAttack: "다음 공격 카드의 타격 횟수가 두 배가 됩니다. 공격할 때까지 턴이 지나도 유지됩니다.",
  resistance: (value: number, ignoreNegative = false) => {
    const effect = value < 0 && ignoreNegative
      ? "취약 보험으로 공격 피해 증가 효과를 받지 않습니다."
      : `받는 공격 피해가 30% ${value > 0 ? "감소" : "증가"}합니다.`;
    return `${effect}\n남은 시간: ${Math.abs(value)}턴. 추가 턴에는 줄지 않습니다.\n공격 외의 피해에는 적용되지 않습니다.`;
  },
  amplification: (value: number) =>
    `가하는 공격 피해가 30% ${value > 0 ? "증가" : "감소"}합니다.\n남은 시간: ${Math.abs(value)}턴. 추가 턴에는 줄지 않습니다.\n공격 외의 피해에는 적용되지 않습니다.`,
  enemyBlock: "받는 피해를 먼저 흡수합니다. 다음 적 행동이 시작될 때 남은 방어는 사라집니다.",
  stunned: "다음 행동을 한 번 건너뜁니다. 그 행동의 공격과 강화 효과도 발동하지 않습니다.",
  temporaryStrength: "이번 적 행동에만 추가되는 힘입니다. 영구적으로 누적되지 않습니다.",
  webBroken: "다음에 받는 한 타격의 피해가 이 수치만큼 증가합니다. 턴 종료 시 사라집니다.",
  boon: "받는 타격의 피해를 무효화합니다. 타격을 한 번 막을 때마다 가호를 1 소모합니다.",
  berserk: "플레이어의 턴이 시작될 때마다 이 수치만큼 힘을 얻습니다.",
  thorns: "공격받을 때마다 이 수치만큼 물리 피해로 반격합니다.",
  sturdy: "표시된 수치 이하의 타격 피해를 받으면 그 피해를 1로 줄입니다.",
  quickness: "다음 공격의 한 타격을 회피합니다. 회피하면 준비 상태가 사라집니다.",
  nextAttackMagic: "다음 공격이 마법 피해를 주며, 마법 방어로 막을 수 있습니다.",
} as const;
