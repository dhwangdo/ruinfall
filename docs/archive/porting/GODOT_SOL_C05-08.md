# C05-08 작업 기록: 덱 카드에서 현재 바닥으로 드래그

상태: **해당 경로 구현·검증 완료 · C05 전체는 미완료** (2026-11-13)

## 웹 기준과 수정

웹 `app/controllers/deckEditorMoves.ts`는 덱→바닥 요청을 `validateDeckEditorCardMove`로 검사한 뒤 실제 바닥 이동 또는 제거 예약으로 나눈다. 안전 구역에서는 실제 바닥으로 이동한다. 일반 지역에서 편집 시작 당시 해당 덱에 있던 일반·희귀 카드는 제거 예약으로 들어가며, 편집창을 닫으면 바닥에 놓인다. 임시로 넣은 희귀 카드는 기억한 인벤토리 또는 바닥으로 돌아가고, 기억한 인벤토리가 가득 찼으면 바닥으로 간다. 원래 덱과 현재 덱이 다른 희귀 카드의 일반 추출은 허용하지 않는다.

Godot에서는 `battle_card_drag_source.gd::_can_drop_run_card()`가 덱→바닥을 거부했고, `main.gd::_on_run_card_dropped()`에도 해당 분기가 없었다. 두 연결을 추가하고 `_move_deck_card_to_floor()`에서 원래 덱 ID·희귀 카드 임시 삽입 출처·안전 구역을 검사한다. 예약은 기존 `deck_editor_pending_removals` 목록과 화면 행을 사용한다. `run_state.get("blessings", [])`에 `forbiddenKnowledge`가 있으면 웹처럼 안전 구역 규칙을 적용한다.

## 확인

- Godot 4.7.2 격리 프로젝트의 headless editor import/parse에서 GDScript 오류가 없었다. RTK test의 종료 코드만이 아니라 출력을 확인했다. Windows 루트 인증서 저장소 경고는 남았다.
- 1280×820 Godot GUI `Viewport.push_input` 드래그로 안전 구역의 일반 카드 덱 A→현재 바닥 이동과 일반 지역의 원래 덱 카드→제거 예약을 확인했다. 두 경우 드래그 payload의 ID와 출발 덱을 확인했다. 예약 중 바닥에는 아직 카드가 없고 예약 카드 위젯과 안내가 표시되며, 편집 종료 뒤 한 번 놓였다. 소유 카드 ID와 활성 덱 mirror도 확인했다.
- 같은 probe에서 희귀 카드의 임시 인벤토리 삽입→인벤토리 복귀, 인벤토리 포화 시 바닥 복귀, 임시 바닥 삽입→바닥 복귀, 원래 덱 희귀 카드→제거 예약을 직접 callback으로 확인했다. `forbiddenKnowledge`를 합성 상태로 주입한 일반 지역 즉시 바닥 이동도 직접 callback으로 확인했다. 최종 [보고](../outputs/godot-validation/2026-11-12-ui/c05-08-sol/c05-08-report.json)는 **21/21 통과**다.
- 첫 GUI probe는 드래그 자체는 시작했지만 바닥 슬롯의 허용 규칙에서 거부되어 이동하지 않았다. 허용 규칙을 수정한 뒤 최종 probe를 재실행했다.

## 범위와 남은 확인

Godot에는 현재 축복 획득·보유·저장 상태가 구현되지 않았다. `forbiddenKnowledge` 분기 자체는 합성 주입으로 확인했지만 실제 게임에서 그 축복을 얻고 유지하는 흐름의 동등성을 주장하지 않는다. 이는 별도 축복 시스템 포팅 범위다. `deckEditorReleasedCardIds`처럼 웹의 티켓 변환이 유효 원본을 해제하는 세션 상태도 Godot에는 없으며, 해당 티켓 경로는 C05-08 범위 밖이다. 물리 마우스 조작감, 드래그 이외의 다른 덱 편집 경로와 전체 C05 화면 배치는 미확인이다. 저장 구조는 변경하지 않았고 commit/push하지 않았다.
