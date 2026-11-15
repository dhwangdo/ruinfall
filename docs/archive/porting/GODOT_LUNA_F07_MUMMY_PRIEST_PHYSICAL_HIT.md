# F07 미라 사제 물리 강타 대조

작성일: 2026-11-13

3지역 조우 10의 미라 사제 세 번째 행동인 붕대 강타를 양쪽 현재 정의에서 생성하고 실제 적 턴 계산을 실행했다. 물리 방어와 마법 방어 2조건, 총 2회 전이에서 비교 상태가 모두 일치했다. 생산 코드는 수정하지 않았다.

| 사례 | 실행 결과: 웹 = Godot |
|---|---|
| 물리 방어 5·마법 방어 5 | 물리 방어만 소모해 15 피해, HP 35 |
| 물리 방어 0·마법 방어 5 | 마법 방어는 물리 공격을 막지 않아 20 피해, HP 30 |

두 경우 모두 사제 가호 5가 유지되고 다음 행동 인덱스 0, 첫 행동 완료, 진행 중 상태, 보존 손패 ID와 입력 불변성이 일치했다. Godot 4.7.2 headless 종료 코드 0이다.

## 실행 방법과 근거

- 웹: `createSewerEncounterByIndex(10)` → `waitingState()` → `resolveEnemyTurn()`.
- Godot: 격리 프로젝트의 `PortEnemyCatalog.create_encounter(10)` → `PortBattleRules.start_battle()` → `end_turn()`.
- 실행 직전 격리된 `enemy_catalog.gd`와 `battle_rules.gd`의 SHA-256이 생산본과 일치하는지 확인했다. 빈 덱 승리 경로를 피하도록 양쪽에 보존 카드 1장을 뒀으며, 카드는 사용하지 않았다.

[비교 보고서](../outputs/godot-validation/2026-11-13-ui/mummy-priest-physical-hit-luna/comparison-report.json), [웹 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-physical-hit-luna/web-results.json), [Godot 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-physical-hit-luna/godot-results.json).

재현 명령은 원본 작업공간에서 `rtk test node outputs/godot-validation/2026-11-13-ui/mummy-priest-physical-hit-luna/compare-physical-hit.mjs`다. 브라우저 서버와 GUI 실행은 하지 않았다.

## 남은 범위

가호가 플레이어 공격을 막고 횟수를 소모하는 과정은 확인하지 않았다. 의도 UI·연출과 다른 적·치명 피해·추가 턴·다수 적 조합도 미확인이므로 F01·F07 전체는 미완료다.
