# F07 미라 전사 약화 연타 대조

작성일: 2026-11-13

3지역 조우 11의 미라 전사 세 번째 행동인 약화 연타를 양쪽 현재 정의에서 생성하고 실제 턴 계산을 실행했다. 저항·방어 상태 2사례, 총 2회 전이에서 비교 상태가 모두 일치했다. 생산 코드는 수정하지 않았다.

| 사례 | 실행 결과: 웹 = Godot |
|---|---|
| 저항 0·물리 방어 4 | 힘 1이 적용되어 타격당 6 피해. 첫 타격에서 방어 4를 소모하고 둘째 타격까지 총 8 피해, HP 42. 다음 턴 저항은 -1 |
| 저항 2·방어 0 | 저항 2가 각 타격의 피해를 줄여 총 8 피해, HP 42. 턴 끝에서 기존 저항이 1 감소한 뒤 연타의 -1이 적용되어 다음 턴 저항은 0 |

두 경우 모두 턴 2, 적 힘 2, 다음 행동 인덱스 0, 첫 행동 완료, 진행 중 상태와 보존 손패 ID가 일치했다. 입력 상태도 바뀌지 않았다. Godot 4.7.2 headless 종료 코드 0이다.

## 실행 방법과 근거

- 웹: `createSewerEncounterByIndex(11)` → `applyPlayerTurnStart()` → `waitingState()` → `resolveEnemyTurn()`. `nextTurnPlayerResistanceChange`는 현재 타격 뒤 저항 감소와 다음 턴 경계에서의 기존 저항 감쇠를 확인했다.
- Godot: 격리 프로젝트의 `PortEnemyCatalog.create_encounter(11)` → `PortBattleRules.start_battle()` → `end_turn()`.
- 실행 직전 격리된 `enemy_catalog.gd`와 `battle_rules.gd`의 SHA-256이 생산본과 일치하는지 확인했다. 빈 덱 승리 경로를 피하도록 양쪽에 보존 카드 1장을 뒀으며, 카드는 사용하지 않았다.

[비교 보고서](../outputs/godot-validation/2026-11-13-ui/mummy-warrior-weakening-multi-hit-luna/comparison-report.json), [웹 결과](../outputs/godot-validation/2026-11-13-ui/mummy-warrior-weakening-multi-hit-luna/web-results.json), [Godot 결과](../outputs/godot-validation/2026-11-13-ui/mummy-warrior-weakening-multi-hit-luna/godot-results.json).

재현 명령은 원본 작업공간에서 `rtk test node outputs/godot-validation/2026-11-13-ui/mummy-warrior-weakening-multi-hit-luna/compare-weak-multi-hit.mjs`다. 브라우저 서버와 GUI 실행은 하지 않았다.

## 남은 범위

미라 전사의 16 피해 강타, 의도 UI·연출은 미확인이다. 다른 적·치명 피해·추가 턴·다수 적 조합은 포함하지 않아 F01·F07 전체는 미완료다.
