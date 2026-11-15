# F01 미라 전사 행동·턴 시작 힘 대조

작성일: 2026-11-13  
범위: 3지역 조우 ID 11의 세 행동, 시작 의도·순환, 광폭화의 힘 증가. 전체 적 턴 처리는 실행하지 않았다.

## 결과

| 순서 | 행동 | 효과 |
|---:|---|---|
| 0 | 삼연격 | 물리 피해 4 × 3회 |
| 1 | 강타 | 물리 피해 16 |
| 2 | 약화 연타 | 물리 피해 5 × 2회, 다음 턴 플레이어 저항 -1 |

웹과 Godot 모두 광폭화 1, 초기 행동 인덱스 0, 세 행동의 순환 표기가 일치한다. 양쪽 턴 시작 처리에서 살아 있는 적의 힘이 0에서 1로 오른다. 각 이전 행동의 다음 인덱스도 `0→1`, `1→2`, `2→0`으로 같다.

웹 기준은 `createSewerEncounterByIndex(11)`, `applyPlayerTurnStart()`, `chooseNextIntent()`다. Godot은 `PortEnemyCatalog.create_encounter(11)`, `PortBattleRules._apply_enemy_turn_start()`, `_choose_next_enemy_action_index()`다. Godot 4.7.2 headless에서 실제 생성·턴 시작·선택 함수를 호출해 정규화한 7개 필드를 비교했다. **7/7 일치**, 차이 0건이다. [기계 비교 결과](../outputs/godot-validation/2026-11-13-ui/f01-card-data-luna/mummy-warrior-action-comparison.json).

## 한계

행동 실행의 실제 피해·플레이어 저항 적용·턴 진행 연출은 확인하지 않았다. 이는 행동 데이터와 턴 시작/다음 인덱스 함수의 대조이며 F07 완료를 뜻하지 않는다.
