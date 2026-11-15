import fs from "node:fs";
import path from "node:path";
const directory = process.argv[2] ?? "outputs/enemy-balance-2026-11-01";
const data = JSON.parse(fs.readFileSync(path.join(directory, "summary.json")));
const raw = JSON.parse(fs.readFileSync(path.join(directory, "trials.json")));
const offenseDirectory = process.argv[3] ?? "outputs/enemy-balance-offense";
const offensePath = path.join(offenseDirectory, "summary.json");
const offense = fs.existsSync(offensePath) ? JSON.parse(fs.readFileSync(offensePath)) : null;
const names = data.decks.map(item => item.name);
const number = value => value === null ? "—" : value.toFixed(1);
const percent = value => `${(value * 100).toFixed(1)}%`;
const label = value => value === "압수관" ? "압수관＋호위병" : value;
const balanced = data.results.filter(row => row.policy === "balanced");
const lines = ["# 1·2지역 몬스터 모의 전투 — 2026-11-01", "",
  `게임 코드 기준: \`${data.revision}\`. 기본 실험 ${raw.length.toLocaleString()}전, 조건·적·플레이 방식마다 ${data.runs}회.${offense ? ` 공격 위주 보강 비교 ${offense.results.reduce((n, row) => n + row.runs, 0).toLocaleString()}전을 추가했다.` : ""}`, "",
  "## 조건과 해석", "",
  "- 모든 전투는 체력 50에서 독립적으로 시작한다. 연속 탐험의 누적 피해·회복·보상 선택은 포함하지 않는다.",
  "- 시작덱은 실험 입력에 기록된 구성 그대로다. 비탄은 실제 준비 함수대로 적의 시작 현재 체력에 0.7을 곱하며 최대 체력은 유지한다.",
  "- 1지역 덱은 실제 생성기에서 얻은 12개 드롭 덱에 백스텝·파쇄·비늘 갑옷을 한 장씩 보강했다. 2지역은 12개 드롭 덱에 무릎차기·가호·비늘 갑옷·퀵스텝을 보강했다. 빈 용량에 넣고, 가득 차면 시작 타격부터 교체했다. 덱을 적별로 골라 쓰지 않았다.",
  "- 각 드롭 덱을 각 적에게 플레이 방식당 10회씩 사용했다. 실제 에디션, HP 편차, 셔플, 적 행동 무작위, 봉인, 압수, 폭발, 소환, 보존, 재련과 룰 효과를 사용했다. 화면에서 계산하던 여백의 미도 같은 식으로 동기화했다.",
  "- 방어 우선·공격 우선 두 고정 휴리스틱을 비교한다. 현재 공개된 카드와 적 의도만 사용하며 숨은 카드 정체나 다음 무작위 의도는 보지 않는다. 기본 카드 사용뿐 아니라 합법적인 솔리테어 이동·재련·천문학/강령학 연구를 사용한다.",
  "- 한 행동씩 고르는 자동 플레이이므로 여러 턴에 걸친 준비나 복잡한 콤보를 사람처럼 계획하지 못한다. 특히 봉인 대응·점액/마도서 처리·보스전 결과에는 이 한계가 있다. 사람의 승률이나 최적 플레이의 한계로 읽으면 안 된다.",
  "- 덱은 실제 생성 결과에 정해진 카드를 보강한 표본이다. 사람이 고르는 좋은 덱만 추린 표본이 아니며, 2지역에서도 축복은 넣지 않았다. 표본 승률을 실제 탐험 승률로 일반화하지 않는다.",
  "- 평균 소모 체력은 패배의 50 손실도 포함한다. 승리 시 소모는 승리한 경우만 평균낸다. 40턴 제한은 패배와 별도로 시간초과로 기록한다.", "",
  "일반 조우 평균은 각 조우에 같은 가중치를 준 값이다. 보스와 다음 지역 적의 3% 조기 출현은 일반전 평균에서 제외한다.", "",
  "## 전체 일반 조우 평균", "", "| 조건 | 방식 | 승률 | 평균 소모 체력 |", "|---|---|---:|---:|" ];
for (const name of names) for (const policy of ["balanced", "aggressive"]) {
  const rows = data.results.filter(row => row.scenario === name && row.policy === policy && !row.boss);
  lines.push(`| ${name} | ${policy === "balanced" ? "방어 우선" : "공격 우선"} | ${percent(rows.reduce((n, r) => n + r.winRate, 0) / rows.length)} | ${number(rows.reduce((n, r) => n + r.meanLoss, 0) / rows.length)} |`);
}
lines.push("", "## 1지역", "", "방어 우선 결과. 괄호 안은 승리 시 평균 소모 체력이다.", "",
  "| 적 | 시작덱＋비탄 승률 | 평균 소모 | 보강 드롭 덱 승률 | 평균 소모 |", "|---|---:|---:|---:|---:|");
for (const first of balanced.filter(row => row.scenario === names[0])) {
  const second = balanced.find(row => row.scenario === names[1] && row.encounter === first.encounter);
  lines.push(`| ${label(first.encounter)}${first.boss ? " **보스**" : ""} | ${percent(first.winRate)} | ${number(first.meanLoss)} (${number(first.winMeanLoss)}) | ${percent(second.winRate)} | ${number(second.meanLoss)} (${number(second.winMeanLoss)}) |`);
}
lines.push("", "## 2지역", "", "| 적 | 방어 우선 승률 | 평균 소모 | 승리 시 소모 | 승리 시 턴 | 공격 우선 승률 |", "|---|---:|---:|---:|---:|---:|");
for (const row of balanced.filter(row => row.scenario === names[2])) {
  const aggressive = data.results.find(item => item.scenario === row.scenario && item.encounter === row.encounter && item.policy === "aggressive");
  lines.push(`| ${label(row.encounter)}${row.boss ? " **보스**" : ""} | ${percent(row.winRate)} | ${number(row.meanLoss)} | ${number(row.winMeanLoss)} | ${number(row.winMeanTurns)} | ${percent(aggressive.winRate)} |`);
}
if (offense) {
  lines.push("", "## 2지역 공격 위주 보강 비교", "",
    "같은 12개 생성 덱에 넣는 네 장을 무릎차기·파쇄·청동 철퇴·백스텝으로 바꿨다. 기본 보강은 무릎차기·가호·비늘 갑옷·퀵스텝이다. 공격량과 저비용 행동의 효과를 함께 비교하며, 공격력 하나만 분리한 실험은 아니다.", "",
    `각 적·방식마다 ${offense.runs}회, 덱당 ${offense.runs / offense.bankSize}회다. 기본 실험의 앞 ${offense.runs}회만 추려 같은 생성 덱·시드로 비교했다. 아래는 방어 우선 방식이며 보스도 별도 행에 포함한다.`, "",
    "| 적 | 기본 보강 승률 | 공격 보강 승률 | 기본 평균 소모 | 공격 평균 소모 |", "|---|---:|---:|---:|---:|");
  for (const row of offense.results.filter(row => row.policy === "balanced")) {
    const control = raw.filter(trial => trial.scenario === row.scenario && trial.encounter === row.encounter
      && trial.policy === row.policy && trial.trial < offense.runs);
    lines.push(`| ${label(row.encounter)}${row.boss ? " **보스**" : ""} | ${percent(control.filter(trial => trial.won).length / control.length)} | ${percent(row.winRate)} | ${number(control.reduce((n, trial) => n + trial.hpLoss, 0) / control.length)} | ${number(row.meanLoss)} |`);
  }
  lines.push("", "공격 보강 덱의 일반 조우 평균:", "", "| 방식 | 승률 | 평균 소모 체력 |", "|---|---:|---:|");
  for (const policy of ["balanced", "aggressive"]) {
    const rows = offense.results.filter(row => row.policy === policy && !row.boss);
    lines.push(`| ${policy === "balanced" ? "방어 우선" : "공격 우선"} | ${percent(rows.reduce((n, row) => n + row.winRate, 0) / rows.length)} | ${number(rows.reduce((n, row) => n + row.meanLoss, 0) / rows.length)} |`);
  }
}
lines.push("", "## 덱별 편차", "", "일반 조우만 합친 방어 우선 결과. 덱 번호는 입력 JSON의 배열 순서와 같다.", "",
  "| 조건 | 덱 | 장수/용량 | 에디션 | 희귀 카드 | 일반전 승률 | 평균 소모 |", "|---|---:|---:|---|---|---:|---:|");
for (const scenario of data.decks.slice(1)) {
  scenario.decks.forEach((deck, index) => {
    const bosses = new Set(data.results.filter(row => row.scenario === scenario.name && row.boss).map(row => row.encounter));
    const trials = raw.filter(row => row.scenario === scenario.name && row.policy === "balanced" && !bosses.has(row.encounter) && row.trial % data.bankSize === index);
    const rareNames = Object.keys(deck.cards).filter(name => ["사계절", "불굴", "개박살", "병법서", "오딘의 창", "초신성", "광행시간", "소원", "마도서", "연사", "대분배", "광학 연구", "법학 연구", "경제학 연구", "견고한 태세", "진화론", "흑요석 단검", "전술가", "유성우", "책 펼치기"].includes(name));
    lines.push(`| ${scenario.name.startsWith("1") ? "1지역" : "2지역"} | ${index + 1} | ${Object.values(deck.cards).reduce((a, b) => a + b, 0)}/${deck.capacity} | ${deck.editions.join(", ") || "없음"} | ${rareNames.join(", ") || "없음"} | ${percent(trials.filter(row => row.won).length / trials.length)} | ${number(trials.reduce((n, row) => n + row.hpLoss, 0) / trials.length)} |`);
  });
}
lines.push("", "## 해석과 조정 우선순위", "",
  "- 1지역 일반전은 두 덱 조건 모두 평균 체력 소모가 한 자릿수다. 시작덱＋비탄은 일반전 전승이지만, 전투마다 체력 50으로 시작했으므로 연속 탐험이 무조건 쉽다는 뜻은 아니다.",
  "- 1지역 보강 덱에서는 쇠사슬 죄수(평균 소모 13.8), 실을 짜는 거미(10.7)가 다른 일반전보다 부담이 컸다. 들개 두 마리(4.8)는 비교적 약했다. 성장형 죄수와 두 번째 턴만 강한 들개의 의도는 반영되지만, 체력 소모 격차는 수동 플레이에서 확인할 후보이다.",
  "- 2지역 기본 보강 덱의 일반전 승률은 덱별 35.4~99.2%였다. 봉인 파수꾼은 덱에 따라 10전 전패와 전승으로 갈렸다. 모든 생성 덱을 적절한 전력이라고 가정하면 적 수치와 덱 품질을 혼동한다.",
  ...(offense ? [
    "- 같은 60회 비교에서 족쇄 간수는 공격 보강으로 60.0→90.0%, 봉인 파수꾼은 33.3→61.7%로 개선됐다. 간수는 저비용 행동·공격량으로 대응되는 성격이 크다. 봉인은 개선 후에도 일반전 하위권이므로 파일 수가 적거나 특정 파일에 의존하는 덱을 수동 점검할 우선 후보이다.",
    "- 골렘은 공격 보강 후에도 승률 71.7%, 평균 소모 32.5로 부담이 크다. 현재 112 체력과 고정 공격 30을 넘길 준비가 필요한지 확인할 우선 후보이다. 봉인이나 간수와 달리 큰 한 방을 견디는 문제도 남는다."
  ] : []),
  "- 화약 운반병은 기본 보강 승률 100%지만 평균 체력을 24.9 소모했다. 사망 폭발은 승리 여부와 별개로 누적 피해를 남긴다. 승률만으로 쉬운 전투로 분류하면 안 된다.",
  "- 발효 슬라임 두 마리·공허 해파리·압수관과 호위병은 상대적으로 체력 소모가 작았다. 발효 점액의 에너지 제공, 낮은 마법 적 체급, 먼저 압수관을 쓰러뜨리는 선택지가 자동 플레이에서도 유리하게 작동하는지 수동 기록과 비교한다.",
  "- 보스는 별도로 어렵다. 검은 슬라임 승률은 시작덱＋비탄 31.7%, 1지역 보강 덱 68.3%이고, 광대는 2지역 기본 보강 덱 19.2%였다. 복잡한 운영을 못 하는 자동 플레이의 영향과 보스용 성장·축복이 없는 조건을 감안한다. 사용자 요청대로 이번 작업에서 보스와 일반 적 수치를 바꾸지 않았다.", "",
  "## 시간초과와 재현", "",
  `시간초과: ${raw.filter(row => row.timeout).length}전. 시드 ${data.seed}, 턴 제한 ${data.maxTurns}. 최종 집계는 두 방식의 승리 ${raw.filter(row => row.won).length}전이며, 동일한 입력으로 재현할 수 있다.`, "",
  "```powershell", "rtk proxy node --experimental-strip-types scripts/simulate-enemy-balance.mjs --runs=120 --decks=12 --turns=40 --revision=dfc84dc",
  ...(offense ? ["rtk proxy node --experimental-strip-types scripts/simulate-enemy-balance.mjs --runs=60 --decks=12 --turns=40 --revision=dfc84dc --scenario=3 --build=offense --out=outputs/enemy-balance-offense"] : []),
  "rtk proxy node scripts/report-enemy-balance.mjs", "```", "",
  "입력 덱과 전체 요약은 같은 폴더의 `2026-11-01-summary.json`에 저장했다. 개별 전투 추적은 로컬 `outputs/enemy-balance-2026-11-01/trials.json`에 있다. 공격 보강 입력과 요약은 `2026-11-01-offense-summary.json`, 해당 전투 추적은 로컬 `outputs/enemy-balance-offense/trials.json`이다. 이번 분석에서는 적 수치를 변경하지 않았다.", "" );
const target = "docs/balance";
fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, "2026-11-01.md"), lines.join("\n"));
fs.writeFileSync(path.join(target, "2026-11-01-summary.json"), JSON.stringify(data, null, 2));
if (offense) fs.writeFileSync(path.join(target, "2026-11-01-offense-summary.json"), JSON.stringify(offense, null, 2));
console.log(`Wrote ${target}/2026-11-01.md`);
