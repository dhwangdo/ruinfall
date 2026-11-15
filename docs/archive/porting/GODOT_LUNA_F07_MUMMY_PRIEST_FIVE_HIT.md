# F07 미라 사제 가호와 5연격 대조

작성일: 2026-11-13

실제 특수 카드 `5연격`을 미라 사제 가호 1과 5 조건에서 한 번씩 사용했다. 두 사례에서 카드 사용 뒤 상태가 웹과 Godot에서 일치했다. 생산 코드는 수정하지 않았다.

| 사례 | 실행 결과: 웹 = Godot |
|---|---|
| 가호 1 | 첫 타격이 가호를 소모하고 나머지 네 타격이 각각 피해 2를 줘 적 HP 87→79, 가호 0 |
| 가호 5 | 다섯 타격이 모두 가호를 소모해 적 HP 87 유지, 가호 0 |

두 경우 모두 에너지 3→2, 손패의 방어 카드 유지, 5연격은 버린 카드로 이동했다. 플레이어 HP·별·턴·적 행동, 입력 불변성도 일치했다. Godot 4.7.2 headless 종료 코드 0이다.

## 실행 방법과 근거

- 웹: `SPECIAL_CARD_POOL`의 실제 `fourHit` 5연격과 `resolveCardPlay()` 사용 경로.
- Godot: `PortCardCatalog.SPECIAL_CARDS`의 실제 `five_hit` 5연격을 생성해 `PortBattleRules.play_card()` 사용 경로.
- 카드의 효과 키는 웹 `fourHit`, Godot `five_hit`으로 다르지만 현재 데이터 정의와 실제 처리에서 모두 5회 공격이다. 비교에서는 이 이름만 동등한 5회 반복 공격으로 정규화하고, 이름·종류·희귀도·비용·피해 값과 결과 상태는 대조했다.
- Godot의 전투 규칙·카드·적·보조 규칙 6개 생산 파일과 격리본, 브라우저 규칙 파일 7개의 해시를 기록했다. 카드·적 정의를 다른 쪽 코드에 주입하지 않았다.
- 표준 오류에는 Windows 인증서 저장소 경고가 있었지만 Godot 스크립트·파싱·로딩 오류는 없었다.

[비교 보고서](../outputs/godot-validation/2026-11-13-ui/mummy-priest-five-hit-luna/comparison-report.json), [웹 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-five-hit-luna/web-results.json), [Godot 결과](../outputs/godot-validation/2026-11-13-ui/mummy-priest-five-hit-luna/godot-results.json).

재현: 원본 작업공간에서 `rtk test node outputs/godot-validation/2026-11-13-ui/mummy-priest-five-hit-luna/compare-five-hit.mjs`. 브라우저 서버·GUI·전체 테스트는 실행하지 않았다.

## 남은 범위

5연격의 가호 소모 두 조건에 한정된다. 다른 다단 카드, 피해 증가/저항/방어·가시 조합, 의도 UI와 전체 F06/F07은 미확인이다.
