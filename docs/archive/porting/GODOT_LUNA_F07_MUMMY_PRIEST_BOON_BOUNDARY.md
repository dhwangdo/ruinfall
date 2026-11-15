# F07 미라 사제 가호 소모 경계 대조

작성일: 2026-11-13

가호가 1 또는 2 남은 미라 사제에게 실제 시작 카드 `타격`을 두 번 연속 사용했다. 두 조건에서 총 4회 카드 사용 뒤 웹과 Godot 상태가 모두 일치했다. 생산 코드는 수정하지 않았다.

| 사례 | 첫 타격 뒤 | 두 번째 타격 뒤 |
|---|---|---|
| 시작 가호 1 | 가호 0, HP 87 | 가호 0, HP 81 — 두 번째 타격 6 피해 통과 |
| 시작 가호 2 | 가호 1, HP 87 | 가호 0, HP 87 — 두 타격 모두 가호가 흡수 |

양쪽 모두 에너지 3→2→1, 타격 두 장은 버린 카드로 이동하고 방어는 손패에 남았다. 플레이어 HP·턴·별, 적 행동 인덱스, 대기 드로우와 입력 불변성도 일치했다. Godot 4.7.2 headless 종료 코드 0이다.

## 실행 방법과 근거

- 웹: `STARTER_CARD_POOL`의 실제 `타격` 정의와 미라 사제를 만들고 `resolveCardPlay()`를 두 번 호출했다.
- Godot: `PortCardCatalog.create_starter_deck()`·`PortEnemyCatalog.create_encounter(10)`으로 각각 시작 카드를 만들고 `PortBattleRules.play_card()`를 두 번 호출했다. 양쪽 모두 각 타격의 성공 여부와 전체 상태를 별도로 비교했다.
- 실행 전 Godot 카드·적·전투 규칙 등 6개 격리 파일이 생산본과 같은 해시인지 확인했다. 브라우저 규칙 파일 7개의 해시도 기록했다. 양쪽에 웹 카드 정의를 주입하지 않았다.
- 표준 오류에는 Windows 인증서 저장소 경고가 있었지만 Godot 스크립트·파싱·로딩 오류는 없었다.

[비교 보고서](../outputs/godot-validation/2026-11-13-ui/mummy-priest-boon-depletion-boundary-luna/comparison-report.json), [웹 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-boon-depletion-boundary-luna/web-results.json), [Godot 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-boon-depletion-boundary-luna/godot-results.json).

재현: 원본 작업공간에서 `rtk test node outputs/godot-validation/2026-11-13-ui/mummy-priest-boon-depletion-boundary-luna/compare-boon-boundary.mjs`. 브라우저 서버·GUI·전체 테스트는 실행하지 않았다.

## 남은 범위

한 번의 `타격` 두 장 경계만 확인했다. 한 카드 안의 다단 공격, 다른 공격 카드, 적 의도 UI·연출과 전체 F07은 미확인이다.
