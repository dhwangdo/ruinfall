import type { EnemyAction, EnemyBlueprint, EnemyVariant } from "./enemies.ts";

function enemy(name: string, hp: number, variant: EnemyVariant, actions: EnemyAction[],
  passives: Partial<EnemyBlueprint> = {}): EnemyBlueprint {
  return {
    name, hp, maxHp: hp, variant, actions, strength: 0, physicalBlock: 0,
    sturdyThreshold: 0, quicknessReady: false, nextAttackMagic: false, trait: null,
    ...passives,
  };
}

export const ROACH_HATCHLING = enemy("새끼 바퀴", 18, "roachHatchling", [
  { name: "물기", attacks: [{ type: "physical", value: 4 }], cycle: true },
]);

/** Mixed encounters contain one member of each of two different families. */
export const REGION_ONE_PAIR_CANDIDATES: EnemyBlueprint[] = [
  enemy("굶주린 들개", 24, "hungryDog", [
    { name: "돌진 준비", attacks: [{ type: "physical", value: 5 }], cycle: true, preview: "다음 턴 돌진 12" },
    { name: "돌진", attacks: [{ type: "physical", value: 12 }], cycle: true },
    { name: "물어뜯기", attacks: [{ type: "physical", value: 5 }], cycle: true, loopTo: 2 },
  ]),
  enemy("칼잡이", 20, "knifeFighter", [
    { name: "칼질", attacks: [{ type: "physical", value: 6 }], nextTurnPlayerAmplificationChange: -1, randomNoRepeat: true },
    { name: "연속 베기", attacks: [{ type: "physical", value: 4, hits: 2 }], randomNoRepeat: true },
    { name: "기세 올리기", attacks: [{ type: "physical", value: 6 }], strengthGain: 3, randomNoRepeat: true },
  ]),
  enemy("눈치보는 산적", 26, "opportunist", [
    { name: "기습", attacks: [{ type: "physical", value: 4 }], nextTurnPlayerAmplificationChange: -1, randomNoRepeat: true },
    { name: "연속 베기", attacks: [{ type: "physical", value: 3, hits: 2 }], randomNoRepeat: true },
    { name: "강타", attacks: [{ type: "physical", value: 6 }], randomNoRepeat: true },
  ], { emptyEnergyStrengthGain: 5, trait: "플레이어의 에너지가 0 이하이면 이번 행동에만 힘 5를 얻습니다." }),
  enemy("화약 두꺼비", 26, "powderToad", [
    { name: "도화선 점화", attacks: [{ type: "physical", value: 4 }], cycle: true, preview: "두 행동 뒤 자폭" },
    { name: "타오르는 도화선", attacks: [{ type: "physical", value: 4 }], cycle: true, preview: "다음 턴 자폭" },
    { name: "자폭", attacks: [{ type: "physical", value: 12 }], selfDestruct: true, cycle: true, loopTo: 2 },
  ]),
  enemy("하수구 쥐", 28, "rat", [
    { name: "물어뜯기", attacks: [{ type: "physical", value: 3, hits: 2 }], discardCount: 1, discardPriority: "rarity", randomNoRepeat: true },
    { name: "웅크리기", attacks: [{ type: "physical", value: 6 }], discardCount: 1, discardPriority: "rarity", randomNoRepeat: true },
    { name: "흉포화", attacks: [{ type: "physical", value: 3 }], strengthGain: 3, discardCount: 1, discardPriority: "rarity", randomNoRepeat: true },
  ], { trait: "버리기: 파일 맨 위 카드 중 희귀도가 높은 카드를 우선해 턴 종료 시 버립니다." }),
];

export const REGION_ONE_BOSS = enemy("청소부", 150, "scavenger", [
  { name: "약화와 취약", attacks: [], nextTurnPlayerAmplificationChange: -2, nextTurnPlayerResistanceChange: -2, cycle: true },
  { name: "내리치기", attacks: [{ type: "physical", value: 15 }], cycle: true },
  { name: "쌍타", attacks: [{ type: "physical", value: 6, hits: 2 }], cycle: true },
  { name: "힘을 실은 쓸기", attacks: [{ type: "physical", value: 10 }], strengthGain: 3, cycle: true },
], { isBoss: true });

/** Stable append-only order; retired encounters keep their null slot. */
export const REGION_ONE_ENCOUNTERS: Array<EnemyBlueprint[] | null> = [
  null, // Old dog-pair encounter 17 migrates to a stable mixed encounter.
  null, // Old knife-fighter encounter 18.
  [enemy("진흙 인형", 50, "clayDoll", [
    { name: "내려치기", attacks: [{ type: "physical", value: 12 }], randomNoRepeat: true },
    { name: "진흙 메우기", attacks: [{ type: "physical", value: 9 }], healGain: 6, randomNoRepeat: true },
    { name: "진흙 응축", attacks: [], amplificationGain: 2, randomNoRepeat: true },
  ])],
  [enemy("꼭두각시 거병", 62, "puppetColossus", [
    { name: "거병의 주먹", attacks: [{ type: "physical", value: 9 }], nextTurnPlayerAmplificationChange: -1, randomNoRepeat: true },
    { name: "마력 응축", attacks: [{ type: "physical", value: 11 }], amplificationGain: 1, randomNoRepeat: true },
    { name: "강타", attacks: [{ type: "physical", value: 13 }], nextTurnPlayerResistanceChange: -1, randomNoRepeat: true },
  ]), enemy("인형술사", 12, "puppeteer", [
    { name: "조종 유지", attacks: [] },
  ], { fixedMaxHp: true, stunAllyOnDeath: "puppetColossus", trait: "쓰러지면 함께 나온 꼭두각시 거병의 다음 행동을 한 번 취소합니다." })],
  null, // Old opportunist encounter 21.
  [enemy("실을 짜는 거미", 60, "weaverSpider", [
    { name: "물기", attacks: [{ type: "physical", value: 8 }], nextTurnPlayerResistanceChange: -1, randomNoRepeat: true },
    { name: "송곳니 연타", attacks: [{ type: "physical", value: 6, hits: 2 }], randomNoRepeat: true },
    { name: "포식 준비", attacks: [], strengthGain: 4, randomNoRepeat: true },
  ], { solitaireHitBonus: 6, trait: "매 턴 첫 솔리테어 행동 후 받는 다음 한 타격의 피해가 6 증가합니다. 턴 종료 시 사라집니다." })],
  null, // Old powder-toad encounter 23.
  null, // Retired chain prisoner, encounter 24. Do not shift later IDs.
  [enemy("알집 바퀴", 48, "broodRoach", [
    { name: "물기", attacks: [{ type: "physical", value: 10 }], randomNoRepeat: true },
    { name: "새끼 부화", attacks: [], summon: "roachHatchling", randomNoRepeat: true },
    { name: "부식액", attacks: [], nextTurnPlayerResistanceChange: -2, randomNoRepeat: true },
  ], { openingIntentIndex: 1, trait: "첫 행동은 새끼 소환으로 고정하고 이후 3랜덤1로 행동합니다. 새끼는 최대 2마리이며 소환된 턴에는 행동하지 않습니다." })],
];

export const REGION_ONE_PAIR_FIRST_INDEX = 66;
export const REGION_ONE_MIXED_ENCOUNTERS = REGION_ONE_PAIR_CANDIDATES.flatMap((first, i) =>
  REGION_ONE_PAIR_CANDIDATES.flatMap((second, j) => i === j ? [] : [[first, second]]));
export const REGION_ONE_PAIR_INDICES = REGION_ONE_MIXED_ENCOUNTERS.map((_, i) => REGION_ONE_PAIR_FIRST_INDEX + i);

/** Save migration must keep a marker, its memory and the eventual fight identical. */
export function normalizeRegionOneEncounterIndex(index: number) {
  const member = [17, 18, 21, 23, 3].indexOf(index);
  if (member < 0) return index;
  const partner = (member + 1) % REGION_ONE_PAIR_CANDIDATES.length;
  return REGION_ONE_PAIR_FIRST_INDEX + member * 4 + (partner < member ? partner : partner - 1);
}
