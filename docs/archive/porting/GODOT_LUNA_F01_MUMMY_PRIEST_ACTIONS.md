# F01 미라 사제 행동 정의·의도 순환 대조

작성일: 2026-11-13  
범위: 3지역 조우 ID 10의 미라 사제 blueprint, 첫 의도와 다음 의도 선택. 전투 행동의 실제 효과는 실행하지 않았다.

## 결과

웹과 Godot의 미라 사제 데이터와 의도 순환은 소스 수준에서 일치한다.

| 순서 | 행동 | 효과 |
|---:|---|---|
| 0 | 가호의 의식 | 가호 +2, 다음 턴 플레이어 저항 -1 |
| 1 | 마력의 저주 | 마법 피해 16 |
| 2 | 붕대 강타 | 물리 피해 20 |

두 구현 모두 전투 시작 가호 5, 시작 의도 0, 세 행동의 순환 표기를 가진다. 이전 행동 인덱스별 다음 인덱스는 `0→1`, `1→2`, `2→0`으로 같다.

웹은 `app/game/enemies.ts`의 조우 10 blueprint, `createSewerEncounterByIndex()`, `chooseNextIntent()`를 사용한다. Godot은 `enemy_catalog.gd::_single_encounter_blueprints(10)`, `_prepare_enemy()`, `battle_rules.gd::_choose_next_enemy_action_index()`를 사용한다. Godot headless에서 실제 초기화·다음 의도 선택 함수를 호출해 비교했다. 정규화한 6개 필드(조우 ID, 이름, 시작 가호, 초기 인덱스, 세 행동 정의, 다음 인덱스)가 **6/6 일치**, 차이 0건이다. [기계 비교 결과](../outputs/godot-validation/2026-11-13-ui/f01-card-data-luna/mummy-priest-action-comparison.json).

## 한계

이 비교는 행동 정의와 인덱스 선택까지만 확인한다. 플레이어 저항 감소·가호 소모·실제 피해 계산, 턴 경계 처리, UI 의도 표시와 전체 전투 결과는 검증하지 않았다. 따라서 F07을 완료 처리하지 않는다.
