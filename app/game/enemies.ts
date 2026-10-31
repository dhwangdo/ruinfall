import { REGION_ONE_ENCOUNTERS } from "./regionOneEnemies.ts";
import { REGION_TWO_ENCOUNTERS, WARLOCK } from "./regionTwoEnemies.ts";
import type { Card } from "./cards.ts";
import { statusLabel, calculateAttackDamage, type AttackModifiers } from "./statuses.ts";

export type EnemyDamageType = "physical" | "magic";

export function resolveEnemyHitAgainstPlayer({
  damage,
  block,
  resistance = 0,
  amplification = 0,
  ignoreNegativeResistance = false,
  isAttack = true,
  damageTakenMultiplier = 1,
  invulnerable = false,
}: {
  damage: number;
  damageType: EnemyDamageType;
  block: number;
  resistance?: number;
  amplification?: number;
  ignoreNegativeResistance?: boolean;
  isAttack?: boolean;
  damageTakenMultiplier?: number;
  invulnerable?: boolean;
}) {
  const transformedDamage = isAttack
    ? calculateAttackDamage(damage, { resistance, amplification, ignoreNegativeResistance, multiplier: damageTakenMultiplier })
    : Math.max(0, Math.floor(damage));
  const blocked = invulnerable ? 0 : Math.min(transformedDamage, block);
  return {
    transformedDamage,
    blocked,
    damageTaken: invulnerable ? 0 : Math.floor((transformedDamage - blocked) * (isAttack ? 1 : damageTakenMultiplier)),
    remainingBlock: invulnerable ? block : block - blocked,
  };
}

export function retainBlockAfterEnemyTurn(block: number, preserveDefense: boolean) {
  return preserveDefense ? Math.floor(block / 2) : 0;
}

export type EnemyHit = {
  type: EnemyDamageType;
  value: number;
  hits?: number;
};

export type EnemyAction = {
  name: string;
  attacks: EnemyHit[];
  /** Listed actions advance in order instead of being selected randomly. */
  cycle?: boolean;
  /** Select every action independently, including the action used last turn. */
  randomEachTurn?: boolean;
  /** Select a random action other than the one used last turn. */
  randomNoRepeat?: boolean;
  strengthGain?: number;
  blockGain?: number;
  healGain?: number;
  boonGain?: number;
  strengthLoss?: number;
  agilityLoss?: number;
  soilCount?: number;
  rockCount?: number;
  /** Special first use count for a file-token action. */
  firstActionRockCount?: number;
  nextAttackMagic?: boolean;
  resistanceGain?: number;
  amplificationGain?: number;
  powderGain?: number;
  allyBlockGain?: number;
  /** Applied after status decay when the player's next normal turn begins. */
  nextTurnPlayerResistanceChange?: number;
  nextTurnPlayerAmplificationChange?: number;
  discardCount?: number;
  discardPriority?: "rarity";
  /** After this action, continue from this zero-based action index. */
  loopTo?: number;
  /** Public warning about a later action, visible before the player ends their turn. */
  preview?: string;
  selfDestruct?: boolean;
  summon?: "roachHatchling";
};

export type EnemyVariant = "slime" | "golem" | "goblin" | "rat" | "beast" | "wisp" | "mummyPriest" | "mummyWarrior" | "wyrm" | "thornBeetle" | "blackSlime" | "clown" | "giantWyrm"
  | "warlock" | "powderCarrier" | "bloodBerserker" | "searchHound" | "hammerGuard" | "shackleJailer" | "sealWarden" | "fermentedSlime" | "voidJellyfish" | "bloodRider" | "confiscator" | "escortGuard"
  | "hungryDog" | "knifeFighter" | "clayDoll" | "crackedGuardian" | "opportunist" | "weaverSpider" | "powderToad" | "chainPrisoner" | "broodRoach" | "roachHatchling";

export type EnemyState = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  actions: EnemyAction[];
  intentIndex: number;
  /** Use this opening once, then follow the actions' usual selection rules. */
  openingIntentIndex?: number;
  strength: number;
  resistance?: number;
  amplification?: number;
  /** Count-based damage immunity. Each successful hit consumes one stack. */
  boon?: number;
  /** Gains strength by this amount when the player's next turn starts. */
  berserk?: number;
  /** Physical damage dealt back whenever this enemy is attacked. */
  thorns?: number;
  /** 속성이 없는 적 방어도. 레거시 상태 키 이름은 호환을 위해 유지한다. */
  physicalBlock: number;
  variant: EnemyVariant;
  sturdyThreshold: number;
  quicknessReady: boolean;
  nextAttackMagic: boolean;
  /** Adds a toxic slime token to the player's hand at battle start. */
  givesToxicSlime?: boolean;
  /** Number of toxic slime tokens this enemy gives at battle start. */
  toxicSlimeCount?: number;
  /** Bosses are fixed on the map and start in the alerted state. */
  isBoss?: boolean;
  /** Used for first-use-only boss actions. */
  firstActionCompleted?: boolean;
  /** The pile chosen for the next discard action. */
  discardPileIndex?: number;
  /** Persistent damage absorption. Breaking it cancels one enemy action. */
  armor?: number;
  stunned?: boolean;
  /** Conditional strength for one action only; never added to permanent strength. */
  emptyEnergyStrengthGain?: number;
  /** Passive: the first successful solitaire move arms one bonus hit each player turn. */
  solitaireHitBonus?: number;
  solitaireHitBonusReady?: boolean;
  solitaireBonusUsedThisTurn?: boolean;
  summonerId?: string;
  summonsCreated?: number;
  turnEndStrengthGain?: number;
  handStrengthGain?: number;
  halfHpStrengthGain?: number;
  enraged?: boolean;
  powder?: number;
  deathResolved?: boolean;
  fermentedSlimeCount?: number;
  sharedTurnStrengthGain?: number;
  energyRecoveryPenalty?: number;
  sealsPile?: boolean;
  sealedPileIndex?: number;
  sealedTurn?: number;
  confiscatesRare?: boolean;
  confiscatedCards?: Card[];
  restsWhenBlocked?: boolean;
  trait: string | null;
};

export type EnemyBlueprint = Omit<EnemyState, "id" | "intentIndex">;

export type EnemyCodexEntry = {
  encounterIndex: number;
  label: string;
  regions: number[];
  enemies: Array<{
    count: number;
    enemy: EnemyBlueprint;
  }>;
};

// Retired entries stay null so existing saves keep the same encounter IDs.
const SEWER_ENCOUNTERS: Array<EnemyBlueprint[] | null> = [
  null,
  [
    {
      name: "주황 슬라임",
      hp: 50,
      maxHp: 50,
      actions: [
        { name: "점액 충돌", attacks: [{ type: "physical", value: 10 }], randomNoRepeat: true },
        { name: "무기력 점액", attacks: [], nextTurnPlayerAmplificationChange: -2, randomNoRepeat: true },
        { name: "몸통 내려찍기", attacks: [{ type: "physical", value: 7 }], strengthGain: 3, randomNoRepeat: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "slime",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      givesToxicSlime: true,
      trait: "점액투성이 · 전투 시작 시 유독성 점액을 손패에 넣음",
    },
  ],
  [
    {
      name: "골렘",
      hp: 112,
      maxHp: 112,
      actions: [
        { name: "...", attacks: [{ type: "physical", value: 8 }], cycle: true },
        { name: "...!", attacks: [{ type: "physical", value: 8 }], cycle: true },
        { name: "공격", attacks: [{ type: "physical", value: 30 }], cycle: true },
        { name: "...", attacks: [{ type: "physical", value: 8 }], cycle: true },
        { name: "공격", attacks: [{ type: "physical", value: 30 }], cycle: true, loopTo: 3 },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "golem",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: null,
    },
  ],
  [
    {
      name: "하수구 쥐",
      hp: 50,
      maxHp: 50,
      actions: [
        { name: "물어뜯기", attacks: [{ type: "physical", value: 5, hits: 2 }], discardCount: 1, discardPriority: "rarity", cycle: true },
        { name: "웅크리기", attacks: [{ type: "physical", value: 10 }], discardCount: 1, discardPriority: "rarity", cycle: true },
        { name: "흉포화", attacks: [{ type: "physical", value: 5 }], strengthGain: 3, discardCount: 1, discardPriority: "rarity", cycle: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "rat",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: "버리기: 파일 맨 위 카드 중 희귀도가 높은 카드를 우선해 턴 종료 시 버립니다.",
    },
  ],
  [
    {
      name: "도깨비",
      hp: 82,
      maxHp: 82,
      actions: [
        { name: "연타", attacks: [{ type: "physical", value: 8, hits: 2 }], randomNoRepeat: true },
        { name: "난타", attacks: [{ type: "physical", value: 7, hits: 3 }], randomNoRepeat: true },
        { name: "견제", attacks: [{ type: "physical", value: 10 }], nextTurnPlayerAmplificationChange: -1, randomNoRepeat: true },
      ],
      turnEndStrengthGain: 1,
      strength: 0,
      physicalBlock: 0,
      variant: "goblin",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: "전투 시작 시 가장 왼쪽 파일 맨 아래에 앞면 유물을 추가합니다. 턴 종료 시 힘 1을 얻습니다.",
    },
  ],
  Array.from({ length: 3 }, () => ({
    name: "쥐",
    hp: 13,
    maxHp: 13,
    actions: [
      { name: "물기", attacks: [{ type: "physical" as const, value: 4 }], cycle: true },
      { name: "달려들기", attacks: [{ type: "physical" as const, value: 8 }], cycle: true },
    ],
    strength: 0,
    physicalBlock: 0,
    variant: "rat" as const,
    sturdyThreshold: 0,
    quicknessReady: false,
    nextAttackMagic: false,
    trait: null,
  })),
  [WARLOCK],
  null,
  null,
  null,
  [
    {
      name: "미라 사제",
      hp: 87,
      maxHp: 87,
      actions: [
        { name: "가호의 의식", attacks: [], boonGain: 2, cycle: true, nextTurnPlayerResistanceChange: -1 },
        { name: "마력의 저주", attacks: [{ type: "magic", value: 16 }], cycle: true },
        { name: "붕대 강타", attacks: [{ type: "physical", value: 20 }], cycle: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "mummyPriest",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      boon: 5,
      trait: "전투 시작 시 가호 5 · 피해를 5회 무효화",
    },
  ],
  [
    {
      name: "미라 전사",
      hp: 125,
      maxHp: 125,
      actions: [
        { name: "삼연격", attacks: [{ type: "physical", value: 4, hits: 3 }], cycle: true },
        { name: "강타", attacks: [{ type: "physical", value: 16 }], cycle: true },
        { name: "약화 연타", attacks: [{ type: "physical", value: 5, hits: 2 }], cycle: true, nextTurnPlayerResistanceChange: -1 },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "mummyWarrior",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      berserk: 1,
      trait: "전투 시작 시 광폭화 1 · 턴 시작 시 힘 1 획득",
    },
  ],
  [
    {
      name: "지룡",
      hp: 118,
      maxHp: 118,
      actions: [
        { name: "흙", attacks: [], soilCount: 1, cycle: true, nextTurnPlayerResistanceChange: -1 },
        { name: "지각 강타", attacks: [{ type: "physical", value: 15 }], cycle: true },
        { name: "대지 마력", attacks: [{ type: "magic", value: 20 }], cycle: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "wyrm",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: "흙: 모든 파일 맨 위에 흙을 놓음",
    },
  ],
  Array.from({ length: 2 }, () => ({
    name: "가시 딱정벌레",
    hp: 56,
    maxHp: 56,
    actions: [
      { name: "가시 돋치기", attacks: [], nextTurnPlayerResistanceChange: -1, randomNoRepeat: true },
      { name: "가시 강타", attacks: [{ type: "physical", value: 10 }], randomNoRepeat: true },
      { name: "약화 독", attacks: [], strengthLoss: 2, agilityLoss: 2, randomNoRepeat: true },
    ],
    strength: 0,
    physicalBlock: 0,
    variant: "thornBeetle" as const,
    sturdyThreshold: 0,
    quicknessReady: false,
    nextAttackMagic: false,
    thorns: 4,
    trait: "전투 시작 시 가시 4 · 공격받을 때마다 물리 피해 4로 반격",
  })),
  [
    {
      name: "검은 슬라임",
      hp: 87,
      maxHp: 87,
      actions: [
        { name: "검은 점액 충돌", attacks: [{ type: "physical", value: 10 }], cycle: true },
        { name: "검은 점액 방어", attacks: [], blockGain: 10, strengthGain: 2, cycle: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "blackSlime",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      givesToxicSlime: true,
      toxicSlimeCount: 2,
      isBoss: true,
      trait: "전투 시작 시 유독성 점액 2장",
    },
  ],
  [
    {
      name: "광대",
      hp: 137,
      maxHp: 137,
      actions: [
        { name: "광대의 강타", attacks: [{ type: "physical", value: 20 }], discardCount: 5, cycle: true },
        { name: "광대의 마법", attacks: [{ type: "magic", value: 20 }], discardCount: 5, cycle: true },
        { name: "광대의 강화", attacks: [], strengthGain: 3, discardCount: 5, cycle: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "clown",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      isBoss: true,
      trait: "비어 있지 않은 무작위 파일의 카드 5장 버림",
    },
  ],
  [
    {
      name: "거대 지룡",
      hp: 187,
      maxHp: 187,
      actions: [
        { name: "돌 깔기", attacks: [], rockCount: 1, firstActionRockCount: 2, strengthGain: 4, cycle: true },
        { name: "지룡 강타", attacks: [{ type: "physical", value: 12 }], cycle: true },
        { name: "지룡 연타", attacks: [{ type: "physical", value: 6, hits: 2 }], cycle: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "giantWyrm",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      isBoss: true,
      firstActionCompleted: false,
      trait: "첫 행동은 모든 파일에 돌 2장, 이후 돌 1장 · 힘 4 획득",
    },
  ],
];

// Append new content without renumbering old encounters or retired save IDs.
const REGION_ONE_NEW_INDICES = REGION_ONE_ENCOUNTERS.map((_, index) => SEWER_ENCOUNTERS.length + index);
SEWER_ENCOUNTERS.push(...REGION_ONE_ENCOUNTERS);

const REGION_TWO_NEW_INDICES = REGION_TWO_ENCOUNTERS.map((_, index) => SEWER_ENCOUNTERS.length + index);
SEWER_ENCOUNTERS.push(...REGION_TWO_ENCOUNTERS);

const ENCOUNTER_INDICES_BY_REGION = [
  [1, 3, 5, ...REGION_ONE_NEW_INDICES],
  [2, 4, 6, ...REGION_TWO_NEW_INDICES],
  [10, 11, 12, 13],
] as const;

const BOSS_ENCOUNTER_INDICES_BY_REGION = [14, 15, 16] as const;

export const NEXT_REGION_ENCOUNTER_CHANCE = 0.03;

export function getBossEncounterIndex(regionIndex: number) {
  return BOSS_ENCOUNTER_INDICES_BY_REGION[regionIndex] ?? null;
}

function randomIndex(length: number, random: () => number) {
  return Math.min(length - 1, Math.floor(random() * length));
}

export function chooseNextIntent(
  actions: EnemyAction[],
  previousIndex: number,
  random: () => number = Math.random,
) {
  if (actions.length <= 1) return 0;
  if (actions[previousIndex]?.loopTo !== undefined) return actions[previousIndex].loopTo;
  if (actions[0]?.cycle) return (previousIndex + 1) % actions.length;
  if (actions[0]?.randomNoRepeat) {
    const candidates = actions
      .map((_, index) => index)
      .filter((index) => index !== previousIndex);
    return candidates[randomIndex(candidates.length, random)];
  }
  if (actions[0]?.randomEachTurn) return randomIndex(actions.length, random);
  const candidates = actions
    .map((_, index) => index)
    .filter((index) => index !== previousIndex);
  return candidates[randomIndex(candidates.length, random)];
}

export function applyPlayerTurnStart(enemy: EnemyState) {
  const berserk = enemy.berserk ?? 0;
  if (enemy.hp <= 0) return enemy;
  return {
    ...enemy,
    strength: enemy.strength + berserk + (enemy.sharedTurnStrengthGain ?? 0),
    ...(enemy.solitaireHitBonus ? { solitaireHitBonusReady: false, solitaireBonusUsedThisTurn: false } : {}),
  };
}

export function createSewerEncounter(random: () => number = Math.random): EnemyState[] {
  const normalEncounterIndices = ENCOUNTER_INDICES_BY_REGION.flat();
  return createSewerEncounterByIndex(normalEncounterIndices[randomIndex(normalEncounterIndices.length, random)], random);
}

export const SEWER_ENCOUNTER_COUNT = SEWER_ENCOUNTERS.filter((encounter) => encounter !== null).length;

export function isEncounterAvailable(encounterIndex: number) {
  return Boolean(SEWER_ENCOUNTERS[encounterIndex]?.length);
}

export function getEncounterIndicesForRegion(regionIndex: number) {
  return ENCOUNTER_INDICES_BY_REGION[regionIndex] ?? [];
}

export function getEncounterRegionNumber(encounterIndex: number) {
  const bossRegionIndex = BOSS_ENCOUNTER_INDICES_BY_REGION.findIndex((index) => index === encounterIndex);
  if (bossRegionIndex >= 0) return bossRegionIndex + 1;
  const regionIndex = ENCOUNTER_INDICES_BY_REGION.findIndex((indices) =>
    indices.some((index) => index === encounterIndex));
  return regionIndex >= 0 ? regionIndex + 1 : 1;
}

export function getEncounterSpawnPool(regionIndex: number, rareRoll: number) {
  const currentRegionPool = getEncounterIndicesForRegion(regionIndex);
  const nextRegionPool = getEncounterIndicesForRegion(regionIndex + 1);
  return rareRoll < NEXT_REGION_ENCOUNTER_CHANCE && nextRegionPool.length > 0
    ? nextRegionPool
    : currentRegionPool;
}

/**
 * Builds the debug encyclopedia directly from the live encounter and region tables.
 * Adding or removing an encounter therefore updates the encyclopedia without a
 * second hand-maintained enemy list.
 */
export function getEnemyCodexEntries(): EnemyCodexEntry[] {
  return SEWER_ENCOUNTERS.flatMap((encounter, encounterIndex) => {
    if (!encounter) return [];
    const groupedEnemies = new Map<string, EnemyCodexEntry["enemies"][number]>();
    encounter.forEach((enemy) => {
      const signature = JSON.stringify(enemy);
      const existing = groupedEnemies.get(signature);
      if (existing) existing.count += 1;
      else groupedEnemies.set(signature, { count: 1, enemy });
    });

    const regions = ENCOUNTER_INDICES_BY_REGION.flatMap((indices, regionIndex) =>
      (indices.some((index) => index === encounterIndex)
        || BOSS_ENCOUNTER_INDICES_BY_REGION[regionIndex] === encounterIndex)
        ? [regionIndex + 1]
        : []);
    return [{
      encounterIndex,
      label: encounter.length > 1 && encounter.every((enemy) => enemy.name === encounter[0].name)
        ? `${encounter[0].name} ${encounter.length}마리`
        : encounter[0].name,
      regions,
      enemies: Array.from(groupedEnemies.values()),
    }];
  }).sort((left, right) =>
    (left.regions[0] ?? Number.MAX_SAFE_INTEGER) - (right.regions[0] ?? Number.MAX_SAFE_INTEGER)
    || left.encounterIndex - right.encounterIndex);
}

export function createSewerEncounterByIndex(
  encounterIndex: number,
  random: () => number = Math.random,
): EnemyState[] {
  const safeIndex = Math.max(0, Math.min(SEWER_ENCOUNTERS.length - 1, Math.floor(encounterIndex)));
  const encounter = SEWER_ENCOUNTERS[safeIndex];
  if (!encounter) return [];
  return encounter.map((enemy, index) => {
    const minimumHp = enemy.name === "쥐"
      ? enemy.maxHp - 1
      : Math.floor(enemy.maxHp * 0.9);
    const rolledMaxHp = Math.min(
      enemy.maxHp,
      enemy.isBoss ? enemy.maxHp : minimumHp + Math.floor(random() * (enemy.maxHp - minimumHp + 1)),
    );
    return {
      ...enemy,
      hp: rolledMaxHp,
      maxHp: rolledMaxHp,
      id: `sewer-enemy-${index}-${Math.random().toString(36).slice(2, 8)}`,
      actions: enemy.actions.map((action) => ({
        ...action,
        attacks: action.attacks.map((attack) => ({ ...attack })),
      })),
      intentIndex: enemy.openingIntentIndex ?? (enemy.actions[0]?.cycle ? 0 : randomIndex(enemy.actions.length, random)),
      discardPileIndex: undefined,
      firstActionCompleted: enemy.firstActionCompleted ?? false,
    };
  });
}

export function getSewerEncounterLabel(encounterIndex: number) {
  const safeIndex = Math.max(0, Math.min(SEWER_ENCOUNTERS.length - 1, Math.floor(encounterIndex)));
  const encounter = SEWER_ENCOUNTERS[safeIndex];
  if (!encounter) return "삭제된 조우";
  return encounter.length > 1 && encounter.every((enemy) => enemy.name === encounter[0].name)
    ? `${encounter[0].name} ${encounter.length}마리`
    : encounter[0].name;
}

export function actionSummary(action: EnemyAction, strength: number, forceMagic = false) {
  const parts = action.attacks.flatMap((attack) => {
    const type = forceMagic ? "magic" : attack.type;
    const label = type === "magic" ? "마법 피해" : "피해";
    const total = attack.value + strength;
    return Array.from({ length: attack.hits ?? 1 }, () => `${label} ${total}`);
  });
  if (action.strengthGain) parts.push(`힘 ${action.strengthGain} 획득`);
  if (action.blockGain) parts.push(`방어 ${action.blockGain} 획득`);
  if (action.boonGain) parts.push(`가호 ${action.boonGain} 획득`);
  if (action.strengthLoss) parts.push(`플레이어 힘 ${action.strengthLoss} 감소`);
  if (action.agilityLoss) parts.push(`플레이어 강인함 ${action.agilityLoss} 감소`);
  if (action.soilCount) parts.push(`모든 파일에 흙 ${action.soilCount}장 놓음`);
  if (action.rockCount) parts.push(`모든 파일에 돌 ${action.rockCount}장 놓음`);
  if (action.nextAttackMagic) parts.push("다음 공격은 마법 속성");
  if (action.resistanceGain) parts.push(`${statusLabel("resistance", action.resistanceGain)} 획득`);
  if (action.amplificationGain) parts.push(`${statusLabel("amplification", action.amplificationGain)} 획득`);
  if (action.nextTurnPlayerResistanceChange) parts.push(`다음 턴 플레이어 ${statusLabel("resistance", action.nextTurnPlayerResistanceChange)}`);
  if (action.nextTurnPlayerAmplificationChange) parts.push(`다음 턴 플레이어 ${statusLabel("amplification", action.nextTurnPlayerAmplificationChange)}`);
  if (action.healGain) parts.push(`체력 ${action.healGain} 회복`);
  if (action.selfDestruct) parts.push("공격 후 자폭");
  if (action.summon) parts.push("새끼 바퀴 1마리 소환 (최대 2마리)");
  if (action.powderGain) parts.push(`화약 ${action.powderGain} 증가`);
  if (action.allyBlockGain) parts.push(`다른 아군 방어 ${action.allyBlockGain}`);
  if (action.preview) parts.push(action.preview);
  if (action.discardCount) {
    parts.push(`버리기 ${action.discardCount}`);
  }
  return parts.join("\n");
}

export function applyPlayerAttack(
  enemy: EnemyState,
  damage: number,
  repetitions: number,
  onThornsHit?: (damage: number) => void,
  modifiers: AttackModifiers & { isAttack?: boolean } = {},
) {
  let next = enemy;
  for (let hit = 0; hit < repetitions && next.hp > 0; hit += 1) {
    const rawDamage = damage > 0 && next.solitaireHitBonusReady
      ? damage + (next.solitaireHitBonus ?? 0)
      : damage;
    const hitDamage = modifiers.isAttack === false ? rawDamage
      : calculateAttackDamage(rawDamage, { ...modifiers, resistance: next.resistance });
    if (damage > 0 && next.solitaireHitBonusReady) next = { ...next, solitaireHitBonusReady: false };
    if (next.quicknessReady) {
      next = { ...next, quicknessReady: false };
      continue;
    }
    if (damage > 0 && (next.thorns ?? 0) > 0) onThornsHit?.(next.thorns!);
    if ((next.boon ?? 0) > 0 && damage > 0) {
      next = { ...next, boon: (next.boon ?? 0) - 1 };
      continue;
    }
    if (next.sturdyThreshold > 0 && hitDamage > 0 && hitDamage <= next.sturdyThreshold) {
      next = { ...next, hp: Math.max(0, next.hp - 1) };
      continue;
    }
    // 적 방어는 속성이 없는 단일 방어도다. 플레이어의 모든 공격이 같은 방어를 소모한다.
    const blocked = Math.min(hitDamage, next.physicalBlock);
    const armorDamage = Math.min(hitDamage - blocked, next.armor ?? 0);
    next = {
      ...next,
      hp: Math.max(0, next.hp - (hitDamage - blocked - armorDamage)),
      physicalBlock: next.physicalBlock - blocked,
      ...(next.armor !== undefined ? { armor: next.armor - armorDamage } : {}),
      ...(armorDamage > 0 && armorDamage === next.armor ? { stunned: true } : {}),
    };
  }
  if (next.hp > 0 && next.halfHpStrengthGain && !next.enraged && next.hp * 2 <= next.maxHp) {
    next = { ...next, enraged: true, strength: next.strength + next.halfHpStrengthGain };
  }
  return next;
}

export function playerAttackThornHits(enemy: EnemyState, damage: number, repetitions: number, modifiers: AttackModifiers = {}) {
  const thornHits: number[] = [];
  applyPlayerAttack(enemy, damage, repetitions, (thornDamage) => thornHits.push(thornDamage), modifiers);
  return thornHits;
}
