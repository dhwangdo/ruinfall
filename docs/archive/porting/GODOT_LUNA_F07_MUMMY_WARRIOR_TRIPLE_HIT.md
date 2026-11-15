# F07 미라 전사 삼연격 방어 계산 대조

작성일: 2026-11-13

3지역 조우 11의 미라 전사 첫 행동인 삼연격을 양쪽 현재 정의에서 생성하고 실제 턴 계산을 실행했다. 물리 방어 조건 2개, 총 2회 전이에서 비교 상태가 모두 일치했다. 생산 코드는 수정하지 않았다.

| 사례 | 실행 결과: 웹 = Godot |
|---|---|
| 물리 방어 7·마법 방어 5 | 힘 1이 적용된 5 피해 세 번에 물리 방어를 타격마다 소모했다. 첫 타격 5, 둘째 타격 2를 막고 HP 피해 8, 최종 HP 42 |
| 물리 방어 0·마법 방어 5 | 물리 공격은 마법 방어를 사용하지 않아 총 15 피해, 최종 HP 35 |

두 경우 모두 다음 플레이어 턴 상태에서 미라 전사 힘 2, 다음 행동 인덱스 1, 첫 행동 완료, 진행 중 상태가 일치했다. 보존 카드 ID와 입력 불변성도 일치했다. Godot 4.7.2 headless 종료 코드 0이다. 표준 오류에 Windows 인증서 저장소 경고가 있었지만 스크립트 오류·파싱 오류는 없었다.

## 실행 방법과 근거

- 웹: `createSewerEncounterByIndex(11)` → `applyPlayerTurnStart()` → `waitingState()` → `resolveEnemyTurn()`. 다음 턴 경계에서 방어 초기화와 적 턴 시작 힘 증가를 적용했다.
- Godot: 격리 프로젝트의 `PortEnemyCatalog.create_encounter(11)` → `PortBattleRules.start_battle()` → `end_turn()`.
- 웹 행동 정의를 Godot에 주입하지 않았다. 실행 직전 격리된 `enemy_catalog.gd`와 `battle_rules.gd`의 SHA-256이 생산본과 일치하는지 확인했다.
- 빈 덱이 Godot 승리 처리로 바뀌는 일을 막기 위해 양쪽에 보존 카드 1장을 두었다. 카드는 플레이하지 않는다.

[비교 보고서](../outputs/godot-validation/2026-11-13-ui/mummy-warrior-triple-hit-luna/comparison-report.json), [웹 결과](../outputs/godot-validation/2026-11-13-ui/mummy-warrior-triple-hit-luna/web-results.json), [Godot 결과](../outputs/godot-validation/2026-11-13-ui/mummy-warrior-triple-hit-luna/godot-results.json).

재현 명령은 원본 작업공간에서 `rtk test node outputs/godot-validation/2026-11-13-ui/mummy-warrior-triple-hit-luna/compare-mummy-warrior.mjs`다. 브라우저 서버와 GUI 실행은 하지 않았다.

## 남은 범위

미라 전사의 16 피해 강타와 저항 감소 연타, 의도 UI·연출은 미확인이다. 다른 적·치명 피해·추가 턴·다수 적 조합도 포함하지 않아 F01·F07 전체는 미완료다.
