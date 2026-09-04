export type EnemyDamageType = "physical" | "magic";

export function reduceEnemyDamageByResistance(
  damage: number,
  damageType: EnemyDamageType,
  physicalResistance = 0,
  magicResistance = 0,
) {
  const resistance = damageType === "physical" ? physicalResistance : magicResistance;
  return resistance > 0 ? Math.floor(damage / 2) : damage;
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
  strengthGain?: number;
  blockGain?: number;
  nextAttackMagic?: boolean;
  physicalVulnerabilityGain?: number;
  discardCount?: number;
};

export type EnemyVariant = "slime" | "golem" | "goblin" | "rat" | "mage" | "warlock";

export type EnemyState = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  actions: EnemyAction[];
  intentIndex: number;
  strength: number;
  physicalBlock: number;
  variant: EnemyVariant;
  sturdyThreshold: number;
  quicknessReady: boolean;
  nextAttackMagic: boolean;
  /** Adds a toxic slime token to the player's hand at battle start. */
  givesToxicSlime?: boolean;
  /** The pile chosen for the next discard action. */
  discardPileIndex?: number;
  trait: string | null;
};

type EnemyBlueprint = Omit<EnemyState, "id" | "intentIndex">;

const SEWER_ENCOUNTERS: EnemyBlueprint[][] = [
  [
    {
      name: "작은 마법사",
      hp: 30,
      maxHp: 30,
      actions: [{ name: "마법 화살", attacks: [{ type: "magic", value: 8 }] }],
      strength: 0,
      physicalBlock: 0,
      variant: "mage",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: null,
    },
  ],
  [
    {
      name: "주황 슬라임",
      hp: 35,
      maxHp: 35,
      actions: [
        { name: "점액 충돌", attacks: [{ type: "physical", value: 9 }], cycle: true },
        { name: "점액 방어", attacks: [{ type: "physical", value: 6 }], blockGain: 7, cycle: true },
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
      hp: 70,
      maxHp: 70,
      actions: [
        { name: "...", attacks: [], cycle: true },
        { name: "...!", attacks: [], cycle: true },
        { name: "공격", attacks: [{ type: "physical", value: 24 }], cycle: true },
        { name: "...", attacks: [], cycle: true },
        { name: "공격", attacks: [{ type: "physical", value: 24 }], cycle: true },
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
      hp: 32,
      maxHp: 32,
      actions: [
        { name: "물어뜯기", attacks: [{ type: "physical", value: 11 }], discardCount: 1, cycle: true },
        { name: "웅크리기", attacks: [], blockGain: 10, discardCount: 1, cycle: true },
        { name: "광폭 질주", attacks: [{ type: "physical", value: 6 }], strengthGain: 3, cycle: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "rat",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: "버리기: 지정된 파일의 맨 위 카드 1장을 턴 종료 시 버립니다.",
    },
  ],
  [
    {
      name: "도깨비",
      hp: 60,
      maxHp: 60,
      actions: [
        { name: "난타", attacks: [{ type: "physical", value: 4, hits: 3 }], cycle: true },
        { name: "연타", attacks: [{ type: "physical", value: 6, hits: 2 }], cycle: true },
        { name: "강습", attacks: [{ type: "physical", value: 8 }], strengthGain: 2, cycle: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "goblin",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: "전투 시작 시 가장 왼쪽 파일 맨 아래에 앞면 유물을 추가",
    },
  ],
  Array.from({ length: 3 }, () => ({
    name: "쥐",
    hp: 10,
    maxHp: 10,
    actions: [{ name: "물어뜯기", attacks: [{ type: "physical" as const, value: 5 }] }],
    strength: 0,
    physicalBlock: 0,
    variant: "rat" as const,
    sturdyThreshold: 0,
    quicknessReady: false,
    nextAttackMagic: false,
    trait: null,
  })),
  [
    {
      name: "저주술사",
      hp: 50,
      maxHp: 50,
      actions: [
        { name: "쇠약의 저주", attacks: [], cycle: true, physicalVulnerabilityGain: 3 },
        { name: "저주 화살", attacks: [{ type: "physical", value: 10 }], cycle: true },
        { name: "저주 화살", attacks: [{ type: "physical", value: 10 }], cycle: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "warlock",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: null,
    },
  ],
  [
    {
      name: "초록 슬라임",
      hp: 40,
      maxHp: 40,
      actions: [
        { name: "점액 충돌", attacks: [{ type: "physical", value: 8 }], randomEachTurn: true },
        { name: "점액 주입", attacks: [{ type: "physical", value: 8 }], nextAttackMagic: true, randomEachTurn: true },
      ],
      strength: 0,
      physicalBlock: 0,
      variant: "slime",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: null,
    },
  ],
];

const ENCOUNTER_INDICES_BY_REGION = [
  [0, 1, 3, 5, 7],
  [2, 4, 6],
] as const;

function randomIndex(length: number, random: () => number) {
  return Math.min(length - 1, Math.floor(random() * length));
}

export function chooseNextIntent(
  actions: EnemyAction[],
  previousIndex: number,
  random: () => number = Math.random,
) {
  if (actions.length <= 1) return 0;
  if (actions[0]?.cycle) return (previousIndex + 1) % actions.length;
  if (actions[0]?.randomEachTurn) return randomIndex(actions.length, random);
  const candidates = actions
    .map((_, index) => index)
    .filter((index) => index !== previousIndex);
  return candidates[randomIndex(candidates.length, random)];
}

export function createSewerEncounter(random: () => number = Math.random): EnemyState[] {
  return createSewerEncounterByIndex(randomIndex(SEWER_ENCOUNTERS.length, random), random);
}

export const SEWER_ENCOUNTER_COUNT = SEWER_ENCOUNTERS.length;

export function getEncounterIndicesForRegion(regionIndex: number) {
  return ENCOUNTER_INDICES_BY_REGION[regionIndex] ?? [];
}

export function createSewerEncounterByIndex(
  encounterIndex: number,
  random: () => number = Math.random,
): EnemyState[] {
  const safeIndex = Math.max(0, Math.min(SEWER_ENCOUNTERS.length - 1, Math.floor(encounterIndex)));
  const encounter = SEWER_ENCOUNTERS[safeIndex];
  return encounter.map((enemy, index) => ({
    ...enemy,
    id: `sewer-enemy-${index}-${Math.random().toString(36).slice(2, 8)}`,
    actions: enemy.actions.map((action) => ({
      ...action,
      attacks: action.attacks.map((attack) => ({ ...attack })),
    })),
    intentIndex: enemy.actions[0]?.cycle ? 0 : randomIndex(enemy.actions.length, random),
    discardPileIndex: undefined,
  }));
}

export function getSewerEncounterLabel(encounterIndex: number) {
  const safeIndex = Math.max(0, Math.min(SEWER_ENCOUNTERS.length - 1, Math.floor(encounterIndex)));
  const encounter = SEWER_ENCOUNTERS[safeIndex];
  return encounter.length > 1 ? `${encounter[0].name} ${encounter.length}마리` : encounter[0].name;
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
  if (action.nextAttackMagic) parts.push("다음 공격은 마법 속성");
  if (action.physicalVulnerabilityGain) parts.push(`물리 취약 ${action.physicalVulnerabilityGain} 부여`);
  if (action.discardCount) parts.push(`버리기 ${action.discardCount}`);
  return parts.join("\n");
}

export function applyPlayerAttack(
  enemy: EnemyState,
  damage: number,
  repetitions: number,
  damageType: EnemyDamageType = "physical",
) {
  let next = enemy;
  for (let hit = 0; hit < repetitions && next.hp > 0; hit += 1) {
    if (next.quicknessReady) {
      next = { ...next, quicknessReady: false };
      continue;
    }
    if (next.sturdyThreshold > 0 && damage > 0 && damage <= next.sturdyThreshold) {
      next = { ...next, hp: Math.max(0, next.hp - 1) };
      continue;
    }
    const blocked = damageType === "physical" ? Math.min(damage, next.physicalBlock) : 0;
    next = {
      ...next,
      hp: Math.max(0, next.hp - (damage - blocked)),
      physicalBlock: next.physicalBlock - blocked,
    };
  }
  return next;
}
