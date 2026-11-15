# C07 부분 점검: 지도 검색 카드 미리보기 정리 경로

상태: **Sol 후속 GUI 17/17 확인 · 스크롤/Esc 수정 완료 · C07 전체 미완료**

## Sol 후속 결과

Luna의 초기 기록은 아래에 보존한다. Sol은 덱 상세의 실제 카드 행을 사용하는 다중 행 fixture로 검사를 보완했다. 새 스크롤 연결만 끈 대조군에서는 실제 휠 입력으로 오프셋이 0→7px 바뀌어도 같은 카드 안에 포인터가 남고 미리보기도 남았다. 연결한 경우 같은 입력에서 미리보기가 사라졌다. 소스의 결과·상세 세로 스크롤바 변경 연결을 확인했다.

검색 입력칸이 포커스를 가진 경우 기존 `_unhandled_key_input()`에는 Esc가 도달하지 않아 창이 닫히지 않았다. Esc만 GUI 처리 전 `_input()`에서 소비해 닫도록 고쳤다. 일반 텍스트 입력을 가로채지 않는다. 실제 호버·이탈·7px 휠 이동·재호버·포커스 상태 Esc·바깥 클릭을 **17/17**, Godot 종료 코드 0으로 확인했다. 소스/격리 파일 해시는 일치했다.

[최종 보고](../outputs/godot-validation/2026-11-13-ui/c07-search-preview-sol/report.json), [재현 스크립트](../outputs/godot-validation/2026-11-13-ui/c07-search-preview-sol/preview-probe.gd). 합성 덱 데이터와 수동 입력을 받지 않는 단순 큰 미리보기 builder를 사용했으며, 작은 카드·검색창·스크롤 컨트롤과 입력 경로는 생산 코드다. 실제 물리 마우스·브라우저 렌더 비교·전체 화면 전환·다른 종류 툴팁은 미검증이다.

## Luna 초기 기록

## 확인 범위와 결과

1280×820 Godot 4.7.2 GUI probe에서 한 개의 검색 결과 카드를 실제로 가리키자 큰 미리보기가 생겼고, 마우스를 카드 바깥으로 옮기자 사라졌다. 미리보기와 모든 자식 Control은 `MOUSE_FILTER_IGNORE`였다. 같은 위치에 wheel-down 입력을 넣었을 때 미리보기는 남았다.

이 fixture에는 한 줄만 있어 스크롤 오프셋이 바뀌지 않았다. 따라서 wheel 입력 관찰은 실제 스크롤 정리 실패의 재현이 아니다. 후속 fixture에서 여러 결과 행을 만들었지만 harness가 실제 카드 Control을 찾지 못해, 수정 후 `ScrollContainer` 오프셋 변화와 미리보기 제거를 검증하지 못했다.

생산 코드는 결과 목록과 상세 패널의 세로 스크롤바 `value_changed`에 미리보기 정리를 연결했다. 당시에는 실제 스크롤 입력 검증 전이었으며, 위 Sol 후속 검사에서 보완했다.

## 남은 GUI 확인

- 실제 wheel/스크롤바 입력 뒤 세로 스크롤 오프셋이 바뀌고 미리보기가 사라지는지
- 결과 갱신·상세 교체 뒤 미리보기 정리
- Escape 및 backdrop 클릭으로 닫기

probe는 한 결과 카드가 있는 실제 패널에서 `Viewport.push_input`을 사용했다. post-change 다중 행 fixture는 `result_list`에서 카드 컨트롤을 찾지 못해 중단했다. 기록: [`c07-report.json`](../outputs/godot-validation/2026-11-13-ui/c07-search-preview-luna/c07-report.json).
