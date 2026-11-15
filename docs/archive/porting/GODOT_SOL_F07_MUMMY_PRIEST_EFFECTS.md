# F07 미라 사제 가호·마법 피해 실행 대조

작성일: 2026-11-13

3지역 조우 10의 미라 사제를 양쪽의 현재 적 정의에서 생성하고 실제 적 턴 계산을 실행했다. 고정 상태 4사례, 총 5회 턴 전이에서 비교한 상태가 모두 일치했다. 생산 코드 수정은 없다.

| 사례 | 실행 결과: 웹 = Godot |
|---|---|
| 의식 → 다음 마법, HP 50·저항 0 | 의식 후 가호 5→7, 플레이어 저항 -1·HP 50. 이어 마법 20 피해, HP 30·저항 0 |
| 저항 2에서 의식 | 기존 저항 감소 후 -1이 더해져 저항 0, 가호 7·HP 50 |
| 기본 마법, 방어·저항 0 | 16 피해, HP 34 |
| 물리 방어 20·마법 방어 5에서 마법 | 마법 방어만 5 소모하여 11 피해, HP 39 |

각 사례에서 초기 상태와 턴 처리 뒤 HP, 저항, 양쪽 방어, 턴 번호, 적 가호·HP·다음 행동 인덱스·첫 행동 완료 여부, 진행 상태와 보존 손패 ID를 대조했다. 모든 전이에서 입력 상태는 변하지 않았고 다음 행동은 실제 선택 함수를 통해 진행됐다. Godot 4.7.2 headless 종료 코드 0이다.

## 실행 방법과 근거

- 웹: `createSewerEncounterByIndex(10)` → `waitingState()` → `resolveEnemyTurn()`. 반환값을 `endTurnAction.ts`의 다음 플레이어 턴 경계에 맞춰 연결했다.
- Godot: native `PortEnemyCatalog.create_encounter(10)` → `PortBattleRules.start_battle()` → `end_turn()`.
- Godot에 웹 행동 정의를 주입하지 않았다. 격리 프로젝트의 `enemy_catalog.gd`와 `battle_rules.gd`는 실행 직전 원본과 SHA-256이 같은지 확인했으며 해시는 보고서에 기록했다.
- 빈 덱은 Godot의 카드 소진 승리 경로로 들어가므로, 보존 카드 1장으로 진행 중 상태를 유지했다. 웹은 `retain`, Godot은 `preserve` 필드를 사용한다. 이 카드는 플레이하지 않으며 미라 사제 효과에 관여하지 않는다.

[비교 보고서](../outputs/godot-validation/2026-11-13-ui/mummy-priest-effects-sol/comparison-report.json), [웹 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-effects-sol/web-results.json), [Godot 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-effects-sol/godot-results.json).

재현 명령은 원본 작업공간에서 `rtk test node outputs/godot-validation/2026-11-13-ui/mummy-priest-effects-sol/compare-effects.mjs`다. 전체 테스트·브라우저 서버·GUI 실행은 하지 않았다.

## 남은 범위

가호를 공격으로 소모하는 처리, 세 번째 물리 공격, 치명 피해·추가 턴·다수 적 조합, UI 의도 표시·연출은 미확인이다. 이 결과는 두 행동의 위 사례에 한정되며 F01·F07 전체는 미완료다.
