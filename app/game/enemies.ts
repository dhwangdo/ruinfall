export type EnemyDamageType = "physical" | "magic";

export type EnemyHit = {
  type: EnemyDamageType;
  value: number;
  hits?: number;
};

export type EnemyAction = {
  name: string;
  attacks: EnemyHit[];
  strengthGain?: number;
  nextAttackMagic?: boolean;
};

export type EnemyVariant = "gargoyle" | "rat" | "slime" | "snake" | "scavenger";

export type EnemyState = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  actions: EnemyAction[];
  intentIndex: number;
  strength: number;
  variant: EnemyVariant;
  sturdyThreshold: number;
  quicknessReady: boolean;
  nextAttackMagic: boolean;
  trait: string | null;
};

type EnemyBlueprint = Omit<EnemyState, "id" | "intentIndex">;

const SEWER_ENCOUNTERS: EnemyBlueprint[][] = [
  [
    {
      name: "가고일 석상",
      hp: 6,
      maxHp: 6,
      actions: [
        { name: "내려찍기", attacks: [{ type: "physical", value: 6 }] },
        { name: "돌의 기세", attacks: [], strengthGain: 3 },
        { name: "파편 난사", attacks: [{ type: "physical", value: 2, hits: 3 }] },
      ],
      strength: 0,
      variant: "gargoyle",
      sturdyThreshold: 10,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: "단단함 · 10 이하의 피해를 1로 줄임",
    },
  ],
  [
    {
      name: "독성 점액",
      hp: 24,
      maxHp: 24,
      actions: [
        {
          name: "마력 오염",
          attacks: [{ type: "physical", value: 7 }],
          nextAttackMagic: true,
        },
        { name: "점액 충돌", attacks: [{ type: "physical", value: 7 }] },
      ],
      strength: 0,
      variant: "slime",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: null,
    },
  ],
  [
    {
      name: "하수구 뱀",
      hp: 13,
      maxHp: 13,
      actions: [
        { name: "재빠른 물기", attacks: [{ type: "physical", value: 6 }] },
      ],
      strength: 0,
      variant: "snake",
      sturdyThreshold: 0,
      quicknessReady: true,
      nextAttackMagic: false,
      trait: "재빠름 · 매 턴 처음 받는 공격을 무시",
    },
  ],
  [
    {
      name: "청소부",
      hp: 35,
      maxHp: 35,
      actions: [
        { name: "강타", attacks: [{ type: "physical", value: 11 }] },
        {
          name: "노획",
          attacks: [{ type: "physical", value: 8 }],
          strengthGain: 3,
        },
      ],
      strength: 0,
      variant: "scavenger",
      sturdyThreshold: 0,
      quicknessReady: false,
      nextAttackMagic: false,
      trait: null,
    },
  ],
  Array.from({ length: 4 }, () => ({
    name: "하수구 쥐",
    hp: 5,
    maxHp: 5,
    actions: [
      { name: "물기", attacks: [{ type: "physical" as const, value: 3 }] },
    ],
    strength: 0,
    variant: "rat" as const,
    sturdyThreshold: 0,
    quicknessReady: false,
    nextAttackMagic: false,
    trait: null,
  })),
];

function randomIndex(length: number, random: () => number) {
  return Math.min(length - 1, Math.floor(random() * length));
}

export function chooseNextIntent(
  actions: EnemyAction[],
  previousIndex: number,
  random: () => number = Math.random,
) {
  if (actions.length <= 1) return 0;
  const candidates = actions
    .map((_, index) => index)
    .filter((index) => index !== previousIndex);
  return candidates[randomIndex(candidates.length, random)];
}

export function createSewerEncounter(random: () => number = Math.random): EnemyState[] {
  return createSewerEncounterByIndex(
    randomIndex(SEWER_ENCOUNTERS.length, random),
    random,
  );
}

export const SEWER_ENCOUNTER_COUNT = SEWER_ENCOUNTERS.length;

export function createSewerEncounterByIndex(
  encounterIndex: number,
  random: () => number = Math.random,
): EnemyState[] {
  const safeIndex = Math.max(
    0,
    Math.min(SEWER_ENCOUNTERS.length - 1, Math.floor(encounterIndex)),
  );
  const encounter = SEWER_ENCOUNTERS[safeIndex];
  return encounter.map((enemy, index) => ({
    ...enemy,
    id: `sewer-enemy-${index}-${Math.random().toString(36).slice(2, 8)}`,
    actions: enemy.actions.map((action) => ({
      ...action,
      attacks: action.attacks.map((attack) => ({ ...attack })),
    })),
    intentIndex: randomIndex(enemy.actions.length, random),
  }));
}

export function getSewerEncounterLabel(encounterIndex: number) {
  const safeIndex = Math.max(
    0,
    Math.min(SEWER_ENCOUNTERS.length - 1, Math.floor(encounterIndex)),
  );
  const encounter = SEWER_ENCOUNTERS[safeIndex];
  return encounter.length > 1
    ? `${encounter[0].name} ${encounter.length}마리`
    : encounter[0].name;
}

export function actionSummary(
  action: EnemyAction,
  strength: number,
  forceMagic = false,
) {
  const parts = action.attacks.map((attack) => {
    const type = forceMagic ? "magic" : attack.type;
    const label = type === "magic" ? "마법 피해" : "피해";
    const total = attack.value + strength;
    return `${label} ${total}${(attack.hits ?? 1) > 1 ? `×${attack.hits}` : ""}`;
  });
  if (action.strengthGain) parts.push(`힘 ${action.strengthGain} 획득`);
  if (action.nextAttackMagic) parts.push("다음 공격이 마법 속성");
  return parts.join(" + ");
}

export function applyPlayerAttack(
  enemy: EnemyState,
  damage: number,
  repetitions: number,
) {
  let next = enemy;
  for (let hit = 0; hit < repetitions && next.hp > 0; hit += 1) {
    if (next.quicknessReady) {
      next = { ...next, quicknessReady: false };
      continue;
    }
    if (next.sturdyThreshold > 0 && damage > 0 && damage <= next.sturdyThreshold) {
      next = {
        ...next,
        hp: Math.max(0, next.hp - 1),
      };
      continue;
    }
    next = { ...next, hp: Math.max(0, next.hp - damage) };
  }
  return next;
}
