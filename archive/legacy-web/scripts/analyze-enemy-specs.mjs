import fs from "node:fs";
import { getEnemyCodexEntries, applyPlayerTurnStart } from "../app/game/enemies.ts";
import { REGION_ONE_PAIR_INDICES } from "../app/game/regionOneEnemies.ts";
import { REGION_TWO_PAIR_INDICES } from "../app/game/regionTwoEnemies.ts";
import { waitingState } from "../app/game/battleState.ts";
import { resolveEnemyTurn } from "../app/game/enemyTurnResolution.ts";
import { STARTER_CARD_POOL } from "../app/game/cards.ts";
import { rareSlotFillDistribution } from "../app/game/rareSlotRules.ts";
import { regionDeckShapeDistribution } from "../app/game/regionDeckRules.ts";

const turns = 6;
const number = n => n.toFixed(2);
const entries = getEnemyCodexEntries().filter(entry => entry.regions[0] <= 2);

function recurringActions(enemy) {
  if (!enemy.actions[0].cycle || enemy.actions.some(action => action.selfDestruct)) return enemy.actions;
  const visited = [], seen = new Map();
  let index = enemy.openingIntentIndex ?? 0;
  while (!seen.has(index)) {
    seen.set(index, visited.length); visited.push(index);
    index = enemy.actions[index].loopTo ?? (index + 1) % enemy.actions.length;
  }
  return visited.slice(seen.get(index)).map(i => enemy.actions[i]);
}

function rates(enemy) {
  const actions = recurringActions(enemy);
  const mean = fn => actions.reduce((sum, action) => sum + fn(action), 0) / actions.length;
  return {
    damage: mean(action => action.attacks.reduce((sum, hit) => sum + hit.value * (hit.hits ?? 1), 0)),
    strength: mean(action => action.strengthGain ?? 0) + (enemy.turnEndStrengthGain ?? 0) + (enemy.sharedTurnEndStrengthGain ?? 0),
    resistance: mean(action => Math.max(0, action.resistanceGain ?? 0)),
    amplification: mean(action => Math.max(0, action.amplificationGain ?? 0)),
    selfVulnerable: mean(action => Math.max(0, -(action.resistanceGain ?? 0))),
    selfWeak: mean(action => Math.max(0, -(action.amplificationGain ?? 0))),
    vulnerable: mean(action => Math.max(0, -(action.nextTurnPlayerResistanceChange ?? 0))),
    weak: mean(action => Math.max(0, -(action.nextTurnPlayerAmplificationChange ?? 0))),
    block: mean(action => (action.blockGain ?? 0) + (action.allyBlockGain ?? 0)),
    heal: mean(action => action.healGain ?? 0),
    discard: mean(action => action.discardCount ?? 0),
    powder: mean(action => action.powderGain ?? 0),
  };
}

// Enumerate joint intent branches, including a partner's attacks under shared player vulnerability.
function pressure(blueprints, conditional = false) {
  let states = [{ probability: 1, enemies: [], resistance: 0, amplification: 0 }];
  blueprints.forEach((blueprint, index) => {
    const enemy = { ...structuredClone(blueprint), id: "spec-" + index, intentIndex: 0 };
    if (conditional && enemy.halfHpStrengthGain) {
      enemy.strength += enemy.halfHpStrengthGain; enemy.enraged = true;
    }
    const openings = enemy.openingIntentIndex !== undefined ? [enemy.openingIntentIndex]
      : enemy.actions[0].cycle ? [0] : enemy.actions.map((_, i) => i);
    states = states.flatMap(state => openings.map(intentIndex => ({ ...state,
      probability: state.probability / openings.length,
      enemies: [...state.enemies, applyPlayerTurnStart({ ...enemy, intentIndex })] })));
  });
  const damage = [];
  for (let turn = 0; turn < turns; turn++) {
    let expected = 0;
    const next = [];
    for (const state of states) {
      const game = { ...waitingState(10000, state.enemies), playerResistance: state.resistance,
        playerAmplification: state.amplification, turn: turn + 1, energy: conditional ? 0 : 3,
        hand: conditional ? [{ ...STARTER_CARD_POOL[0], id: 1 }] : [] };
      const result = resolveEnemyTurn(game, { blessings: [], maxPlayerHp: 10000, oneUpUsed: false,
        randomRolls: state.enemies.map(() => .5) });
      expected += state.probability * (10000 - result.remainingHp);
      if (turn === turns - 1) continue;
      let branches = [{ probability: state.probability, enemies: [] }];
      for (const future of result.nextEnemies) {
        const previous = state.enemies.find(unit => unit.id === future.id);
        const choices = !previous || future.hp <= 0 || previous.stunned || previous.actions[0].cycle
          ? [future.intentIndex] : previous.actions.map((_, i) => i)
            .filter(i => previous.actions[0].randomEachTurn || i !== previous.intentIndex);
        branches = branches.flatMap(branch => choices.map(intentIndex => ({
          probability: branch.probability / choices.length,
          enemies: [...branch.enemies, applyPlayerTurnStart({ ...future, intentIndex })] })));
      }
      next.push(...branches.map(branch => ({ ...branch,
        resistance: result.nextPlayerResistance, amplification: result.nextPlayerAmplification })));
    }
    damage.push(expected); states = next;
  }
  return { damage, mean: damage.reduce((sum, n) => sum + n, 0) / turns };
}

const rows = entries.map(entry => {
  const rate = Object.fromEntries(Object.keys(rates(entry.enemies[0].enemy)).map(key => [key, 0]));
  let hp = 0, minHp = 0;
  const units = entry.enemies.flatMap(({ count, enemy }) => Array.from({ length: count }, () => enemy));
  for (const { count, enemy } of entry.enemies) {
    hp += count * enemy.maxHp;
    minHp += count * (enemy.isBoss ? enemy.maxHp : enemy.name === "쥐" ? enemy.maxHp - 1 : Math.floor(enemy.maxHp * .9));
    for (const [key, value] of Object.entries(rates(enemy))) rate[key] += count * value;
  }
  const normal = pressure(units);
  const conditional = units.some(unit => unit.emptyEnergyStrengthGain || unit.handStrengthGain || unit.halfHpStrengthGain)
    ? pressure(units, true) : normal;
  return { id: entry.encounterIndex, region: entry.regions[0], boss: units.some(unit => unit.isBoss),
    name: entry.label, hp, minHp, rate, pressureMean: normal.mean, conditionalMean: conditional.mean, damage: normal.damage };
});

function deckShapeExpectation(region) {
  const result = { capacity: 0, rareSlots: 0, rares: 0, editionBudget: 0, cards: 0, rareProbabilities: {} };
  for (const { shape, probability: p } of regionDeckShapeDistribution(region)) {
    const item = { ...shape, rareSlots: shape.rareSlotCapacity, rares: shape.rareSlotCapacity * .8 };
    for (const key of ["capacity", "rareSlots", "rares", "editionBudget"]) result[key] += p * item[key];
    result.cards += p * (item.rares + (item.capacity - item.rareSlots) * .75);
    rareSlotFillDistribution(item.rareSlots).forEach((chance, count) => { result.rareProbabilities[count] = (result.rareProbabilities[count] ?? 0) + p * chance; });
  }
  return result;
}

const regionMeans = [1, 2].map(region => {
  const items = rows.filter(row => row.region === region && !row.boss);
  const mixedIds = new Set(region === 1 ? REGION_ONE_PAIR_INDICES : REGION_TWO_PAIR_INDICES);
  const mixedCount = items.filter(row => mixedIds.has(row.id)).length;
  const weight = row => mixedIds.has(row.id) ? .5 / mixedCount : .5 / (items.length - mixedCount);
  return { region, encounters: items.length, hp: items.reduce((sum, row) => sum + row.hp * weight(row), 0),
    pressureMean: items.reduce((sum, row) => sum + row.pressureMean * weight(row), 0),
    rates: Object.fromEntries(Object.keys(items[0].rate).map(key => [key, items.reduce((sum, row) => sum + row.rate[key] * weight(row), 0)])) };
});
const deckShapes = [1, 2].map(region => ({ region, ...deckShapeExpectation(region) }));
const lines = ["# 1·2지역 적 스펙 분석 — 혼합전·희귀 슬롯 개편 후", "",
  "2026-11-01 작업 트리 기준. 이전 `2026-11-01.md`의 승률 실험은 변경 전 `dfc84dc`의 기록이며 이번 수치에 재사용하지 않는다.", "",
  "## 계산 기준", "",
  "- 조우 단위로 합산하고 보스는 별도로 표시한다. 지역 평균에서는 보스를 뺀다. 여러 마리 조우의 HP·공격·상태 부여량은 살아 있는 시작 적 전체의 합이다.",
  "- 기본 평균 공격은 공격하지 않는 행동도 0으로 포함한다. 3랜덤1은 장기적으로 각 행동이 1/3이므로 단순 평균이 맞는다. 고정 패턴은 실제 반복 구간을 평균내며 들개는 장기 반복 공격 3, 저주술사는 첫 저주 뒤 공격 20을 사용한다. 두꺼비는 자폭까지 3행동 평균이다.",
  "- 상태 수치는 턴당 새로 부여하는 지속시간의 평균이다. 저항 2를 얻는 행동이 셋 중 하나면 0.67턴/턴이며 20% 피해 감소라는 뜻이 아니다. 자연 감소와 상쇄 후 남는 상태량과는 다르다. 성장 힘은 매턴 패시브를 포함하지만 조건부 일회성 획득은 별도로 설명한다.",
  "- 6턴 공격 압력은 플레이어가 공격·방어하지 않고 기본 에너지 3·빈 손패로 끝내며, 적을 첫 6행동 동안 살려 두었을 때의 평균 피해다. 실제 적 턴 계산으로 모든 의도 분기를 열거해 힘·증폭·취약·소환·타격별 버림을 포함한다. 두꺼비는 자폭 뒤 피해 0이다. 다수전에서는 시작 적을 쓰러뜨리지 않는다.",
  "- 조건부 압력은 산적에게 에너지 0, 수색견에게 남은 손패, 광전사에게 처음부터 반피 힘 7을 준 별도 경우다. 이 적들이 실제로 매번 이 조건을 만족한다는 뜻은 아니다.",
  "- 6턴 압력에는 플레이어 공격을 방해하는 약화·저항·갑옷·봉인·압수·에너지 감소, 점액 잔류 피해와 화약 사망 폭발은 반영되지 않는다. 회복·방어 획득은 표에 별도로 제시한다. 적 강함 전체를 하나의 점수로 환산한 값은 아니다.",
  "- 골렘은 체력 상한 112를 유지한다. 약화 2 → 저항 2 → 물리 25+힘 5를 반복한다. 힘은 공격 뒤 얻으므로 실제 공격 턴은 25→30→35다. 죄수의 24번 조우는 비워 두어 이후 조우 번호와 저장 호환성을 유지한다.", ""];
const rateText = rate => Object.entries(rate).filter(([key, value]) => value > 0 && key !== "damage")
  .map(([key, value]) => `${({ strength: "힘", resistance: "저항", amplification: "증폭", selfVulnerable: "자신 취약", selfWeak: "자신 약화", vulnerable: "취약 부여", weak: "약화 부여", block: "방어(아군 포함)", heal: "회복", discard: "버리기", powder: "화약" })[key]} ${number(value)}`).join(" · ") || "없음";
for (const region of [1, 2]) {
  lines.push(`## ${region}지역`, "", "| 조우 | 생성 HP 범위 합계 | 기본 평균 공격 | 6턴 평균 압력 | 조건부 압력 | 평균 획득·부여/턴 |", "|---|---:|---:|---:|---:|---|");
  for (const row of rows.filter(row => row.region === region)) lines.push(`| ${row.boss ? "**보스** " : ""}${row.name} | ${row.minHp === row.hp ? row.hp : `${row.minHp}~${row.hp}`} | ${number(row.rate.damage)} | ${number(row.pressureMean)} | ${row.conditionalMean !== row.pressureMean ? number(row.conditionalMean) : "—"} | ${rateText(row.rate)} |`);
  lines.push("");
}
lines.push("## 지역 평균", "", "| 지역 | 일반 조우 수 | HP 상한 합계의 평균 | 6턴 평균 압력 | 평균 획득·부여/턴 |", "|---|---:|---:|---:|---|");
for (const row of regionMeans) lines.push(`| ${row.region} | ${row.encounters} | ${number(row.hp)} | ${number(row.pressureMean)} | ${rateText(row.rates)} |`);
lines.push("", "두 지역 모두 혼합전 합계 50%·나머지 조우 합계 50%로 가중했다. 1지역은 혼합 20레시피·나머지 6조우, 2지역은 혼합 30레시피·단독 7종이다. 혼합은 두 적의 의도와 플레이어 취약을 함께 열거한다.", "",
  "## 현재 희귀 슬롯 생성", "",
  "지역 k에 대해 s=3d3−6과 거리 가중치 1.75^(−√(x²+y²+z²)/√(1+0.2(k−1)))로 덱 구조를 추첨한다. 희귀 슬롯 C=k+y는 각각 독립적으로 80% 확률로 채우며 0장도 허용한다. 나머지 칸은 각각 빈칸·시작·일반·특별을 25%씩 뽑는다.", "",
  "| 지역 | 평균 용량 | 평균 희귀 슬롯 | 평균 희귀 카드 | 평균 에디션 예산 | 평균 총 장수 |",
  "|---|---:|---:|---:|---:|---:|");
for (const row of deckShapes) lines.push(`| ${row.region} | ${number(row.capacity)} | ${number(row.rareSlots)} | ${number(row.rares)} | ${number(row.editionBudget)} | ${number(row.cards)} |`);
lines.push("", "회복·자원 방해·압수·봉인·사망 폭발은 공격 압력 이외의 효과이며 별도로 고려한다. 이 분석으로 추가 수치 변경은 하지 않았다.", "",
  "재현: `rtk proxy node --experimental-strip-types scripts/analyze-enemy-specs.mjs`", "");
fs.mkdirSync("docs/balance", { recursive: true });
fs.writeFileSync("docs/balance/2026-11-01-specs.md", lines.join("\n"));
fs.writeFileSync("docs/balance/2026-11-01-specs.json", JSON.stringify({ turns, rows, regionMeans, deckShapes }, null, 2));
for (const row of rows) console.log(`${row.name}: HP ${row.hp}, base ${number(row.rate.damage)}, pressure ${number(row.pressureMean)}, conditional ${number(row.conditionalMean)}`);
console.log(JSON.stringify({ regionMeans, deckShapes }, null, 2));
