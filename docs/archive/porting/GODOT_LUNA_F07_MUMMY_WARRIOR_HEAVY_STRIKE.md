# F07 미라 전사 강타 대조

작성일: 2026-11-13

3지역 조우 11의 미라 전사 두 번째 행동인 강타를 양쪽 현재 정의에서 생성하고 실제 턴 계산을 실행했다. 물리 방어·저항 2사례, 총 2회 전이에서 비교 상태가 모두 일치했다. 생산 코드는 수정하지 않았다.

| 사례 | 실행 결과: 웹 = Godot |
|---|---|
| 저항 0·물리 방어 10 | 턴 시작 힘 1과 강타 16을 합한 17 피해에서 방어 10을 소모해 7 피해, HP 43 |
| 저항 2·물리 방어 0 | 저항의 30% 감소를 적용해 `floor(17×0.7)=11` 피해, HP 39. 다음 턴 시작에서 저항은 1 감소 |

두 경우 모두 턴 2, 적 힘 2, 다음 행동 인덱스 2, 첫 행동 완료, 진행 중 상태, 보존 손패 ID와 입력 불변성이 일치했다. Godot 4.7.2 headless 종료 코드 0이다.

## 실행 방법과 근거

- 웹: `createSewerEncounterByIndex(11)` → `applyPlayerTurnStart()` → `waitingState()` → `resolveEnemyTurn()`.
- Godot: 격리 프로젝트의 `PortEnemyCatalog.create_encounter(11)` → `PortBattleRules.start_battle()` → `end_turn()`.
- 실행 직전 격리된 `enemy_catalog.gd`와 `battle_rules.gd`의 SHA-256이 생산본과 일치하는지 확인했다. 빈 덱 승리 경로를 피하도록 양쪽에 보존 카드 1장을 뒀으며, 카드는 사용하지 않았다.

[비교 보고서](../outputs/godot-validation/2026-11-13-ui/mummy-warrior-heavy-strike-luna/comparison-report.json), [웹 결과](../outputs/godot-validation/2026-11-13-ui/mummy-warrior-heavy-strike-luna/web-results.json), [Godot 결과](../outputs/godot-validation/2026-11-13-ui/mummy-warrior-heavy-strike-luna/godot-results.json).

재현 명령은 원본 작업공간에서 `rtk test node outputs/godot-validation/2026-11-13-ui/mummy-warrior-heavy-strike-luna/compare-heavy-strike.mjs`다. 브라우저 서버와 GUI 실행은 하지 않았다.

## 남은 범위

세 가지 일반 행동의 실제 피해·방어·저항 계산은 이 사례들에서 일치했다. 의도 UI·연출, 다른 적과의 조우, 치명 피해·추가 턴·다수 적 조합은 포함하지 않아 F01·F07 전체는 미완료다.
