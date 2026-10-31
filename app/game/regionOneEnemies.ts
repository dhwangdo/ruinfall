import type { EnemyAction, EnemyBlueprint, EnemyVariant } from "./enemies.ts";

function enemy(name: string, hp: number, variant: EnemyVariant, actions: EnemyAction[],
  passives: Partial<EnemyBlueprint> = {}): EnemyBlueprint {
  return {
    name, hp, maxHp: hp, variant, actions, strength: 0, physicalBlock: 0,
    sturdyThreshold: 0, quicknessReady: false, nextAttackMagic: false, trait: null,
    ...passives,
  };
}

export const ROACH_HATCHLING = enemy("새끼 바퀴", 12, "roachHatchling", [
  { name: "물기", attacks: [{ type: "physical", value: 4 }], cycle: true },
]);

/** Nine additional region-one encounters, in stable append-only order. */
export const REGION_ONE_ENCOUNTERS: EnemyBlueprint[][] = [
  Array.from({ length: 2 }, () => enemy("굶주린 들개", 22, "hungryDog", [
    { name: "돌진 준비", attacks: [{ type: "physical", value: 3 }], cycle: true, preview: "다음 턴 돌진 9" },
    { name: "돌진", attacks: [{ type: "physical", value: 9 }], cycle: true },
    { name: "물어뜯기", attacks: [{ type: "physical", value: 3 }], cycle: true, loopTo: 2 },
  ])),
  [enemy("칼잡이", 30, "knifeFighter", [
    { name: "칼질", attacks: [{ type: "physical", value: 12 }], nextTurnPlayerAmplificationChange: -1, randomNoRepeat: true },
    { name: "연속 베기", attacks: [{ type: "physical", value: 8, hits: 2 }], randomNoRepeat: true },
    { name: "기세 올리기", attacks: [{ type: "physical", value: 11 }], strengthGain: 3, randomNoRepeat: true },
  ])],
  [enemy("진흙 인형", 50, "clayDoll", [
    { name: "내려치기", attacks: [{ type: "physical", value: 12 }], randomNoRepeat: true },
    { name: "진흙 메우기", attacks: [{ type: "physical", value: 6 }], healGain: 6, randomNoRepeat: true },
    { name: "진흙 응축", attacks: [], amplificationGain: 2, randomNoRepeat: true },
  ])],
  [enemy("금 간 수호상", 44, "crackedGuardian", [
    { name: "균열의 주먹", attacks: [{ type: "physical", value: 7 }], nextTurnPlayerAmplificationChange: -1, randomNoRepeat: true },
    { name: "마력 응축", attacks: [{ type: "physical", value: 9 }], amplificationGain: 1, randomNoRepeat: true },
    { name: "강타", attacks: [{ type: "physical", value: 11 }], nextTurnPlayerResistanceChange: -1, randomNoRepeat: true },
  ], { armor: 12, trait: "갑옷 12가 피해를 대신 받습니다. 갑옷이 깨지면 다음 행동을 한 번 취소합니다." })],
  [enemy("눈치보는 산적", 42, "opportunist", [
    { name: "기습", attacks: [{ type: "physical", value: 7 }], nextTurnPlayerAmplificationChange: -1, randomNoRepeat: true },
    { name: "연속 베기", attacks: [{ type: "physical", value: 5, hits: 2 }], randomNoRepeat: true },
    { name: "강타", attacks: [{ type: "physical", value: 10 }], randomNoRepeat: true },
  ], { emptyEnergyStrengthGain: 5, trait: "플레이어의 에너지가 0 이하이면 이번 행동에만 힘 5를 얻습니다." })],
  [enemy("실을 짜는 거미", 60, "weaverSpider", [
    { name: "물기", attacks: [{ type: "physical", value: 8 }], nextTurnPlayerResistanceChange: -1, randomNoRepeat: true },
    { name: "송곳니 연타", attacks: [{ type: "physical", value: 6, hits: 2 }], randomNoRepeat: true },
    { name: "포식 준비", attacks: [], strengthGain: 4, randomNoRepeat: true },
  ], { solitaireHitBonus: 6, trait: "매 턴 첫 솔리테어 행동 후 받는 다음 한 타격의 피해가 6 증가합니다. 턴 종료 시 사라집니다." })],
  [enemy("화약 두꺼비", 48, "powderToad", [
    { name: "도화선 점화", attacks: [{ type: "physical", value: 6 }], cycle: true, preview: "두 행동 뒤 폭발 24" },
    { name: "타오르는 도화선", attacks: [{ type: "physical", value: 6 }], cycle: true, preview: "다음 턴 폭발 24" },
    { name: "폭발", attacks: [{ type: "physical", value: 24 }], selfDestruct: true, cycle: true, loopTo: 2 },
  ])],
  [enemy("쇠사슬 죄수", 64, "chainPrisoner", [
    { name: "분노의 난타", attacks: [{ type: "physical", value: 2, hits: 3 }], strengthGain: 1, cycle: true },
  ])],
  [enemy("알집 바퀴", 54, "broodRoach", [
    { name: "물기", attacks: [{ type: "physical", value: 10 }], randomNoRepeat: true },
    { name: "새끼 부화", attacks: [], summon: "roachHatchling", randomNoRepeat: true },
    { name: "부식액", attacks: [], nextTurnPlayerResistanceChange: -2, randomNoRepeat: true },
  ], { openingIntentIndex: 1, trait: "첫 행동은 새끼 소환으로 고정하고 이후 3랜덤1로 행동합니다. 새끼는 최대 2마리이며 소환된 턴에는 행동하지 않습니다." })],
];
