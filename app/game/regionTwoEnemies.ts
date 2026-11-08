import type { EnemyAction, EnemyBlueprint, EnemyVariant } from "./enemies.ts";

function enemy(name: string, hp: number, variant: EnemyVariant, actions: EnemyAction[],
  passives: Partial<EnemyBlueprint> = {}): EnemyBlueprint {
  return { name, hp, maxHp: hp, variant, actions, strength: 0, physicalBlock: 0,
    sturdyThreshold: 0, quicknessReady: false, nextAttackMagic: false, trait: null, ...passives };
}
const hit = (value: number, hits = 1) => [{ type: "physical" as const, value, hits }];
const random = (actions: EnemyAction[]) => actions.map(action => ({ ...action, randomNoRepeat: true }));

export const WARLOCK = enemy("저주술사", 68, "warlock", [
  { name: "쇠약의 저주", attacks: [], nextTurnPlayerResistanceChange: -3, cycle: true },
  { name: "저주의 일격", attacks: hit(20), cycle: true, loopTo: 1 },
]);

export const REGION_TWO_BOSS = enemy("간수", 250, "shackleJailer", [
  { name: "저항과 증폭", attacks: [], resistanceGain: 2, amplificationGain: 2, cycle: true },
  { name: "강타", attacks: hit(20), cycle: true },
  { name: "강타", attacks: hit(20), cycle: true },
  { name: "힘 모으기", attacks: [], strengthGain: 5, cycle: true },
], {
  isBoss: true,
  statusEffectiveness: 40,
  trait: "강화됨: 저항과 증폭의 효율이 30%에서 40%로 증가함.",
});

/** One member from each family may join a pair. The first member leads its map label. */
export const REGION_TWO_PAIR_CANDIDATES: EnemyBlueprint[] = [
  enemy("화약 운반병", 30, "powderCarrier", random([
    { name: "강타", attacks: hit(5) },
    { name: "연타", attacks: hit(3, 2) },
    { name: "화약 보충", attacks: hit(4), powderGain: 2 },
  ]), { powder: 6, trait: "사망 시 자신을 제외한 모두에게 화약 수치만큼 물리 피해를 줍니다." }),
  enemy("수색견", 35, "searchHound", [
    { name: "물어뜯기", attacks: hit(5), cycle: true },
  ], { handStrengthGain: 4, trait: "플레이어 손패에 카드가 남아 있는 동안 임시 힘 4를 얻습니다." }),
  enemy("대형 망치병", 44, "hammerGuard", [
    { name: "망치 내려찍기", attacks: hit(10), cycle: true, loopTo: 0 },
    { name: "휴식", attacks: [], strengthGain: 1, cycle: true, loopTo: 0 },
  ], { restsWhenBlocked: true, trait: "공격이 완전히 막히면 다음 행동은 휴식하며 힘 1을 얻습니다." }),
  enemy("봉인 파수꾼", 39, "sealWarden", random([
    { name: "강타", attacks: hit(5) },
    { name: "연속 타격", attacks: hit(3, 2) },
    { name: "봉인 응축", attacks: [], amplificationGain: 2 },
  ]), { sealsPile: true, trait: "매 플레이어 턴 시작 시 카드가 있는 무작위 파일 하나를 봉인합니다. 그 파일의 모든 드로우를 막지만 솔리테어 이동은 허용합니다." }),
  enemy("발효 슬라임", 45, "fermentedSlime", random([
    { name: "몸통 박치기", attacks: hit(10) },
    { name: "점액 연타", attacks: hit(5, 2) },
    { name: "발효 응축", attacks: [], amplificationGain: 2, resistanceGain: 2 },
  ]), { fermentedSlimeCount: 1, trait: "전투 시작 시 발효 점액 1장을 손패에 넣습니다. 발효 점액은 에너지 1을 주는 보존 토큰입니다." }),
  enemy("압수관", 35, "confiscator", random([
    { name: "타격", attacks: hit(7) },
    { name: "엄폐", attacks: [], blockGain: 8 },
    { name: "압수 명령", attacks: [], nextTurnPlayerResistanceChange: -1 },
  ]), { confiscatesRare: true, trait: "파일 배치 후 첫 드로우 전에 파일의 무작위 희귀 카드 1장을 압수합니다. 처치하면 즉시 손패로 돌려줍니다." }),
];

/** Preserve every old ID; individual pair candidates leave null slots. */
export const REGION_TWO_ENCOUNTERS: Array<EnemyBlueprint[] | null> = [
  null,
  [enemy("핏빛 광전사", 88, "bloodBerserker", random([
    { name: "도끼질", attacks: hit(11) },
    { name: "쌍도끼", attacks: hit(6, 2) },
    { name: "무모한 일격", attacks: hit(16), amplificationGain: -1 },
  ]), { halfHpStrengthGain: 7, trait: "체력이 절반 이하가 되면 한 번만 힘 7을 얻습니다." })],
  null,
  null,
  [enemy("족쇄 간수", 72, "shackleJailer", random([
    { name: "족쇄 연타", attacks: hit(5, 2) },
    { name: "제압", attacks: hit(6), nextTurnPlayerAmplificationChange: -1 },
    { name: "간수의 응축", attacks: [], amplificationGain: 2 },
  ]), { energyRecoveryPenalty: 1, trait: "살아 있는 동안 플레이어의 매 턴 기본 에너지 회복량이 1 감소합니다. 카드 효과에는 적용되지 않습니다." })],
  null,
  null,
  [enemy("공허 해파리", 60, "voidJellyfish", [
    { name: "공허의 파동", attacks: [{ type: "magic", value: 8 }], cycle: true },
  ])],
  [enemy("피의 기수", 90, "bloodRider", random([
    { name: "쌍격", attacks: hit(6, 2) },
    { name: "무모한 돌격", attacks: hit(3, 3), resistanceGain: -1 },
    { name: "피의 일격", attacks: hit(7), nextTurnPlayerResistanceChange: -1 },
  ]), { sharedTurnEndStrengthGain: 2, trait: "적 턴 종료 시 플레이어와 자신이 힘 2를 얻습니다." })],
  null,
];

export const REGION_TWO_PAIR_FIRST_INDEX = 36;
export const REGION_TWO_MIXED_ENCOUNTERS = REGION_TWO_PAIR_CANDIDATES.flatMap((first, i) =>
  REGION_TWO_PAIR_CANDIDATES.flatMap((second, j) => i === j ? [] : [[first, second]]));
export const REGION_TWO_PAIR_INDICES = REGION_TWO_MIXED_ENCOUNTERS.map((_, i) => REGION_TWO_PAIR_FIRST_INDEX + i);

/** Fixed upgrades keep a saved marker, its memory, and its battle on the same pair. */
export function normalizeRegionTwoEncounterIndex(index: number) {
  const member = [26, 28, 29, 31, 32, 35].indexOf(index);
  if (member < 0) return index;
  const partner = (member + 1) % REGION_TWO_PAIR_CANDIDATES.length;
  return REGION_TWO_PAIR_FIRST_INDEX + member * 5 + (partner < member ? partner : partner - 1);
}
