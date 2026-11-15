# C05-02 작업 기록: 덱 사이 카드 한 장 옮기기

상태: **C05-02 완료 · C05 전체는 미완료**

현재 원본: `C:\Users\kdh03\Documents\Codex\2026-07-25\solitaire-deckbattle-enemies\solitaire-deckbattle-prototype`

## 이번 작업 하나

Godot 덱 편집 화면에서 일반 카드 한 장을 실제 GUI 드래그로 덱 A에서 B로 옮긴다. 카드 소유와 활성 덱이 보존되는지, 성공한 드롭 뒤 편집 대상이 B로 맞춰지는지 웹과 비교한다. C05 전체 편집 검증이나 카드 규칙 개편은 범위 밖이다.

## 현재 코드 대조

- 웹 `DeckEditorModal.tsx`: 덱 B에 드래그하는 동안 편집 대상 B와 드롭 표시를 설정하고, 드롭 후 `dropDeckEditorCard()`를 호출한다.
- 웹 `useDeckEditorInput.ts`: 실제 드래그 원본/덱 ID와 대상 덱 ID로 `onMoveCard()`를 호출한다.
- 웹 `controllers/deckEditorMoves.ts`: 이동을 검증하고 컬렉션 전환을 적용한 뒤 `setDeckEditorDeckId(target.deckId)`를 호출한다.
- Godot `run_card_drop_area.gd`: 다른 덱으로 가는 카드 드롭을 받는다.
- Godot `main.gd::_move_card_between_decks_by_id()`: 카드를 옮기고 저장 상태를 동기화한다. 현재 성공한 이동 뒤 `deck_editor_selected_deck_id`가 B로 바뀌는지는 GUI 경로로 확인되지 않았다.

CodeGraph auto-sync는 잠겨 있어 위 Godot 소스는 RTK로 현재 디스크 내용을 확인했다. 이 문서와 체크리스트의 범위를 지킨다.

## 기대 결과

생성 지도 안전 구역에서 다음 fixture 하나만 사용한다.

- 사용 덱 A, 편집창 시작 대상 A, 보유 덱 B.
- 중복 표시로 묶이지 않는 서로 다른 일반 카드 ID. 카드 이름/등급을 확인하고 희귀·전설은 쓰지 않는다.
- A에 카드 2장 이상, B에도 카드 1장 이상. 활성 덱 A의 `run_state["deck"]`은 A 카드 미러와 일치한다.
- 티켓 없음, 인벤토리 초과 없음, 제거 예정 카드 없음, 대상 덱은 용량/희귀 슬롯 여유가 있다.
- `safe_area_entries`의 실제 좌표를 사용하고 `MapRules.is_safe_area_tile()`가 true임을 먼저 assert한다.

실제 카드 위젯에서 B 덱의 카드 영역으로 `Viewport.push_input` 드래그/드롭을 보낸다. 직접 callback 호출은 GUI 검증으로 세지 않는다. 예전 성공 probe의 입력 순서(마우스 이동, 버튼 누름, 누른 채 이동, 버튼 뗌)를 따른다. 화면이 다시 만들어지면 새 카드 위젯을 다시 찾는다.

통과 조건:

1. 카드 ID가 A에서 사라지고 B에는 정확히 한 번 추가된다. 전체 덱 소유 ID 집합은 전후 동일하다.
2. 사용 덱 A는 그대로이고 `run_state["deck"]`은 이동 후 A 카드와 일치한다.
3. 성공적으로 B에 놓은 뒤 편집 대상 ID가 B가 된다. 이는 웹 `setDeckEditorDeckId(target.deckId)`에 대응한다.
4. 드롭이 입력 한 번에 한 번만 적용된다.

안전 구역 밖, 희귀 카드, 포화된 대상 덱, 티켓, 바닥/인벤토리 이동은 이번에 다루지 않는다. 검증에서 차이가 재현되면 위의 단일 동작을 맞추는 좁은 수정만 한다. 전역 드래그 구조, 저장 형식, 카드 제한 규칙을 바꾸게 되면 Sol에게 인계한다.

## 비용과 실행

- 작업 전 실제 cwd와 `rtk git status`를 확인하고 기존 미커밋 변경을 보존한다. 파일 읽기·검색·Git은 RTK를 사용한다.
- Godot 코드 탐색은 CodeGraph가 auto-sync DISABLED인 동안 RTK를 사용한다.
- C05-01에서 남은 격리본 프로세스를 강제 종료하지 않는다. 기존에 만들어진 유휴 격리 프로젝트를 사용하고 현재 `main.gd` 및 꼭 필요한 소스만 동기화한다. 프로젝트 전체를 반복 복사/가져오기 하지 않는다. `APPDATA`, `LOCALAPPDATA`, `TEMP`는 검증 출력 아래로 둔다.
- Godot 4.7.2 GUI probe는 성공 결과/구체적 장애가 생기면 멈춘다. 반복 설치나 전체 테스트/빌드는 하지 않는다. production `main.gd`는 수정 전에 별도 출력으로 보관한다.
- 수정 또는 검증 후 체크리스트에 결과를 남긴다. C05 전체 체크박스는 채우지 않는다. commit/push는 하지 않는다.
- 약 20분이 지나거나 같은 입력/수정 두 번 실패, 환경 문제가 되풀이되거나 규칙 범위가 넓어지면 근거와 남은 확인을 기록하고 **Sol에게 인계한 뒤 멈춘다**.

## 완료 결과 (2026-11-13)

- 실제 GUI 드래그로 카드 ID 1을 안전 구역에서 덱 A에서 B로 옮기는 것을 재현했다. 처음에는 카드 이동·소유 ID 보존·활성 덱 A 유지가 모두 맞았지만 편집 대상이 A에 남았다. 웹 `createDeckEditorMoves()`는 성공한 드롭 뒤 대상 덱 ID를 편집 대상으로 설정한다.
- `godot/scripts/main.gd::_move_card_between_decks_by_id()`에서 성공적으로 두 덱의 카드를 갱신한 뒤 `deck_editor_selected_deck_id = target_deck_id` 한 줄을 추가했다.
- 동일 GUI 경로 재검증 8/8 통과: 카드 이동 1회, 전체 ID `{1,2,3}` 보존, A 활성 및 A 카드 mirror 유지, B 대상 선택.
- 입력은 마우스 이동·누름·누른 채 이동·뗌을 `Viewport.push_input`으로 전송한 GUI probe다. 실제 물리 마우스 플레이를 대신하지 않는다. [최종 보고](../outputs/godot-validation/2026-11-12-ui/c05-02-luna/c05-02-report.json), [수정 전 실패 재현](../outputs/godot-validation/2026-11-12-ui/c05-02-luna/c05-02-baseline-report.json), [수정 전 원본](../outputs/godot-validation/2026-11-12-ui/c05-02-luna/main-before-c05-02.gd).
- 안전 구역 밖 이동, 희귀 카드, 포화 덱, 인벤토리/바닥 이동과 C05 전체 배치는 확인하지 않았다. commit/push는 하지 않았다.
