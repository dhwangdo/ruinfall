# F07 미라 사제 가호와 시작 카드 타격 대조

작성일: 2026-11-13

실제 시작 카드 `타격`(비용 1·피해 6)을 미라 사제에게 한 번 사용하는 경로를 양쪽 현재 코드에서 실행했다. 가호 5와 가호 0 대조군의 2사례가 일치했다. 생산 코드 수정은 없다.

| 사례 | 웹 = Godot 결과 |
|---|---|
| 사제 기본 가호 5 | 가호 5→4, 사제 HP 87 유지 |
| 가호 0 대조군 | 가호 0 유지, 사제 HP 87→81 |

두 경우 모두 에너지 3→2, 손패의 타격 ID 100이 버린 카드로 이동하고 방어 ID 101은 손패에 남았다. 플레이어 HP 50·별 2·턴 1·사제 행동 인덱스 0과 진행 상태가 유지됐다. 초기/결과의 적 HP·가호·방어·행동, 자원, 손패/버린 카드/파일 ID, 대기 드로우를 비교했고 입력 불변성과 Godot 적 배열/별칭의 HP·가호 일치도 확인했다. Godot 4.7.2 headless 종료 코드 0이다.

## 실행 경로와 범위

- 웹은 `STARTER_CARD_POOL`의 타격·방어와 `createSewerEncounterByIndex(10)`의 사제를 생성하고 `resolveCardPlay()`를 호출했다. 카드 사용 성공도 별도로 확인했다.
- Godot은 `PortCardCatalog.create_starter_deck()`의 타격·방어와 `PortEnemyCatalog.create_encounter(10)`의 사제를 생성하고 `PortBattleRules.start_battle()` → `play_card()`를 호출했다. 웹 결과나 카드 정의를 Godot에 주입하지 않았다.
- 손패를 두 시작 카드로 고정하고 파일을 비운 상태에서 사용했다. 초기 파일 배치·드로우·GUI 입력은 이 대조의 범위가 아니다.
- 실행 직전 Godot 규칙·적/카드 목록·스티커·에디션·솔리테어의 격리본 6개가 생산본과 SHA-256이 같은지 확인했다. 실행 후에도 생산본 해시가 유지됐다. 주요 웹 파일 해시도 보고서에 남겼다.
- 표준 오류에는 Windows 인증서 저장소 읽기 오류가 있었으며, 스크립트·파싱·로딩 오류는 없었다.

[기계 비교 보고서](../outputs/godot-validation/2026-11-13-ui/mummy-priest-boon-strike-sol/comparison-report.json), [웹 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-boon-strike-sol/web-results.json), [Godot 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-boon-strike-sol/godot-results.json).

재현: 원본 작업공간에서 `rtk test node outputs/godot-validation/2026-11-13-ui/mummy-priest-boon-strike-sol/compare-boon-strike.mjs`. 브라우저 서버·GUI·전체 테스트는 실행하지 않았다.

## 남은 범위

가호 1→0 뒤 다음 공격이 통과하는 연속 사용, 다단 공격, 피해 0·저항/방어 조합, 반사·가시·솔리테어 반응, 의도 UI·연출은 미확인이다. 이 결과는 한 번의 타격 사용 두 조건에 한정되며 F07 전체는 미완료다.
