# C05-03 작업 지시: 덱에서 인벤토리로 카드 옮기기

상태: **C05-03 완료 · C05 전체는 미완료**

## 범위 하나

안전 구역에서 일반 카드 한 장을 사용 덱 A의 카드 위젯에서 빈 인벤토리 슬롯으로 실제 GUI 드래그한다. 인벤토리에 카드가 한 번 들어가고, 전체 소유 카드 ID·활성 덱 A·A의 카드 mirror·편집 대상 A가 보존되는지 확인한다.

웹 `DeckEditorModal.tsx`는 인벤토리에 drop하면 `dropDeckEditorCard(event, "inventory")`를 부르고, `createDeckEditorMoves()`는 성공한 이동 뒤 inventory 메시지만 설정한다. 대상 덱을 선택하는 callback은 덱으로 옮길 때만 실행하므로 선택 대상은 A로 남아야 한다. Godot `main.gd::_move_deck_card_to_inventory()`가 동일하게 동작하는지 본다.

## Fixture / 확인

- 사용 덱 A에 서로 다른 두 일반 카드, 보유 덱 B에 일반 카드 하나. 이전 C05 fixture와 같이 기존 시작 카드 ID만 사용한다.
- 인벤토리 비어 있음(15칸 미만), 추출 티켓 없음, 제거 예정 카드 없음, 안전 구역 좌표는 생성 지도 `safe_area_entries`에서 얻어 `MapRules.is_safe_area_tile()`로 먼저 assert.
- 카드 위젯에서 인벤토리 `+` 슬롯까지 Godot GUI 경로로 드래그한다. `Viewport.push_input`을 쓰되 마우스 이동 → 누름 → 누른 채 이동 → 뗌 순서를 적용하고 callback 직접 호출로 대체하지 않는다.
- 확인: 카드 ID가 A에서 빠지고 인벤토리에 정확히 한 번 추가됨, 전체 소유 ID 집합 보존, active A/`run_state["deck"]`의 A mirror/편집 대상 A 유지. 다른 인벤토리·바닥·희귀 카드 제한은 건드리지 않는다.
- 차이가 있으면 같은 흐름을 맞추는 최소 수정만 한다. 저장/전역 drag·capacity 규칙이 얽히면 Sol에게 인계한다.

## 실행 제약

- RTK로 경로·status·파일 검색·읽기·Git을 확인하고 미커밋 변경을 보존한다. CodeGraph auto-sync가 비활성인 동안 GDScript는 RTK로 읽는다.
- 기존 유휴 격리 프로젝트를 재사용하고 `main.gd`와 필요한 소스만 동기화한다. 열린 Godot 프로세스는 강제 종료하지 않는다. `APPDATA`, `LOCALAPPDATA`, `TEMP`는 별도 출력 아래로 둔다.
- `main.gd`를 수정하기 전에 출력으로 복사한다. Godot GUI probe 1회 재현 후 좁은 수정이 있으면 1회 재검증. 20분/두 번 실패/범위 확장 시 결과와 blocker를 기록하고 멈춘다.
- 실행 결과와 미확인 사항을 체크리스트에 기록한다. C05 전체 미완료 상태를 유지하며 commit/push는 하지 않는다.

## 결과 (2026-11-13)

- Godot GUI에서 일반 카드 ID 1을 안전 구역에서 덱 A→빈 인벤토리로 드래그했다. A에서는 ID 1이 빠지고 인벤토리에 정확히 한 번 추가됐다. B의 ID 3은 유지됐고 전체 소유 ID `{1,2,3}`도 보존됐다.
- 활성 덱과 `run_state["deck"]`은 A의 남은 카드 ID 2를 유지했고 편집 대상도 A였다. 안전 구역 assert·실제 카드 payload·빈 인벤토리 drop slot을 포함해 8/8 통과.
- 입력은 `Viewport.push_input`으로 마우스 이동·누름·누른 채 이동·뗌을 보낸 GUI probe다. 실제 물리 마우스 평가는 아니다. [보고](../outputs/godot-validation/2026-11-12-ui/c05-03-luna/c05-03-report.json). 생산 코드 수정 없음.
