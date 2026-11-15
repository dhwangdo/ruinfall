# C05-05 작업 기록: 인벤토리에서 바닥으로 카드 놓기

상태: **완료 · C05 전체는 미완료**

## 범위

안전 구역에서 일반 카드 한 장을 인벤토리 위젯에서 현재 타일의 바닥 슬롯으로 실제 GUI 드래그한다. 인벤토리에서 카드가 한 번 빠지고 현재 좌표의 바닥에 한 번 놓이는지, 카드 ID 총합과 활성 덱 A의 mirror 및 편집 대상 A가 보존되는지 확인한다.

웹 `createDeckEditorMoves()`는 안전 구역의 인벤토리→바닥 이동을 허용한다. Godot `_on_run_card_dropped()`는 `_move_inventory_card_to_floor()`로 처리한다. 이 제한된 일반 카드 흐름만 검증한다.

## 검증 조건

- 일반 카드 ID 1은 인벤토리, ID 2는 활성 덱 A, ID 3은 보유 덱 B에 둔다. 희귀 카드·티켓·제거 예정 카드 없이 진행한다.
- `safe_area_entries`에서 고른 현재 위치가 `MapRules.is_safe_area_tile()`을 통과해야 한다.
- `Viewport.push_input`으로 마우스 이동 → 누름 → 누른 채 이동 → 뗌 순서의 GUI 드래그를 보낸다.
- 확인: 인벤토리에서 ID 1이 빠지고 현재 좌표의 `floor_cards`에 한 번 추가됨, 전체 소유 ID `{1,2,3}` 보존, 활성 A와 `run_state["deck"]` mirror 및 편집 대상 A 유지.
- 불일치가 규칙/저장 구조 확장으로 번지면 Sol에게 인계한다. 20분 또는 두 번의 GUI 시도 안에 끝내고 commit/push는 하지 않는다.

## 결과 (2026-11-13)

- 안전 구역에서 일반 카드 ID 1을 인벤토리에서 현재 타일 바닥으로 GUI 드래그했다. 인벤토리에서는 빠지고 현재 좌표에 한 번 놓였으며 덱 A ID 2와 덱 B ID 3은 유지됐다.
- 전체 소유 ID `{1,2,3}`, 활성 덱 A와 `run_state["deck"]` mirror, 편집 대상 A를 확인해 8/8 통과했다. 생산 코드 수정은 없다.
- 입력은 `Viewport.push_input`의 마우스 이동·누름·누른 채 이동·뗌이다. 물리 마우스 평가는 별도다. [GUI 보고](../outputs/godot-validation/2026-11-12-ui/c05-05-luna/c05-05-report.json).
