# C05-04 작업 기록: 인벤토리에서 덱으로 카드 넣기

상태: **완료 · C05 전체는 미완료**

## 범위

안전 구역에서 일반 카드 한 장을 인벤토리 위젯에서 보유 덱 B로 실제 GUI 드래그한다. 인벤토리에서 카드가 한 번 빠지고 B에 한 번 들어가는지, 카드 ID 총합과 활성 덱 A의 mirror가 보존되는지 확인한다. 성공한 드롭 뒤 편집 대상은 B가 되어야 한다.

웹 `createDeckEditorMoves()`는 카드 이동에 성공하고 대상이 덱이면 `setDeckEditorDeckId(target.deckId)`를 호출한다. Godot은 `_on_run_card_dropped()`에서 `_move_external_card_to_deck()`로 위임한다. 이 경로에서 편집 대상도 바뀌는지 GUI 드롭으로 확인한다.

## 검증 조건

- 일반 카드 ID 1은 인벤토리, ID 2는 활성 덱 A, ID 3은 보유 덱 B에 둔다. 희귀 카드, 티켓, 제거 예정 카드는 사용하지 않는다.
- 지도 데이터의 `safe_area_entries`에서 좌표를 골라 `MapRules.is_safe_area_tile()`로 안전 구역을 assert한다.
- `Viewport.push_input`으로 마우스 이동 → 누름 → 누른 채 이동 → 뗌 순서의 실제 GUI 드래그를 보낸다. 콜백 직접 호출로 대체하지 않는다.
- 확인: ID 1이 인벤토리에서 빠져 B에 정확히 한 번 들어감, 소유 ID 집합 `{1,2,3}` 보존, 활성 덱 A와 `run_state["deck"]` mirror는 A 유지, 편집 대상은 B.
- 불일치가 재현되면 대상 편집 선택을 갱신하는 최소 수정만 검토한다. 저장/용량/희귀 카드 규칙이 얽히면 여기서 멈추고 Sol에게 인계한다.

## 실행 제약

- `rtk`로 status·검색·읽기·Git을 확인하고 기존 미커밋 변경은 보존한다. CodeGraph auto-sync가 비활성인 동안 GDScript의 최신 내용은 `rtk`로 확인한다.
- 기존 격리 GUI 프로젝트를 재사용하고 현재 `main.gd`만 동기화한다. `main.gd` 사본과 결과 보고서를 출력 폴더에 남긴다.
- 실행 전용 `APPDATA`, `LOCALAPPDATA`, `TEMP`를 출력 폴더 아래에 둔다. 다른 Godot 프로세스는 종료하지 않는다.
- 20분 또는 두 번의 GUI 시도 안에 끝내고, 생산 코드 수정이 있으면 GUI 검증을 한 번 재실행한다.
- 체크리스트와 `HANDOFF.md`에는 실제 결과만 기록한다. commit/push는 하지 않는다.

## 결과 (2026-11-13)

- 첫 GUI 드래그에서 카드 ID 1이 인벤토리에서 덱 B로 한 번 이동하고 소유 ID `{1,2,3}`·활성 덱 A·A의 `run_state["deck"]` mirror가 보존됐지만, 편집 선택이 A에 남는 차이를 재현했다.
- `_move_external_card_to_deck()`에 성공한 대상 덱을 편집 대상으로 선택하는 한 줄을 추가했다. 같은 GUI 경로 재검증은 8/8 통과했다. 카드 이동·소유 ID·활성 덱 A 보존과 편집 대상 B를 확인했다.
- 입력은 `Viewport.push_input`의 마우스 이동·누름·누른 채 이동·뗌이다. 물리 마우스 조작감은 사용자의 플레이 확인 범위다. [최종 보고](../outputs/godot-validation/2026-11-12-ui/c05-04-luna/c05-04-report.json)와 [수정 전 재현](../outputs/godot-validation/2026-11-12-ui/c05-04-luna/c05-04-baseline-report.json)를 따른다.
