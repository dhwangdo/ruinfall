# C01 작업 기록: 웹 카드 글꼴 자산 사용

상태: **공유 카드·덱 편집·검색 결과·작은 미리보기의 해당 글꼴에 적용, C01 전체 미완료**

웹의 `app/globals.css`는 `app/assets/PretendardVariable.woff2`를 Pretendard로 등록하고, 카드 제목·본문은 이 글꼴을 지정한다. Godot은 이전에 설치된 시스템 글꼴 후보를 사용했으므로 같은 글꼴 파일 사용이 보장되지 않았다.

웹 자산을 `godot/assets/fonts/PretendardVariable.woff2`에 복사하고, `godot/scripts/main.gd`의 `_card_widget()`에서 쓰는 제목·본문·강조 글꼴을 이 파일의 `FontVariation`으로 연결했다. 굵기는 각각 700·400·600이다. 별도로 만드는 덱 편집 작은 카드와 검색 결과 작은 카드의 이름에도 700 굵기 글꼴을 연결했다. 전투 파일과 카드 효과 예시가 사용하는 `card_preview.gd`의 작은 카드에는 이름 700·설명 400을 적용하고 폰트 객체를 재사용한다. 카드 비용 숫자의 Arial 계열 설정은 유지했다. Godot의 전역 UI 글꼴은 이번 범위에 포함하지 않았다.

## 확인

- Godot 4.7.2 격리 프로젝트에서 폰트 가져오기와 실제 카드 GUI 생성이 성공했다. 자원 경로는 `res://assets/fonts/PretendardVariable.woff2`, 데이터 크기는 2,057,688바이트였고, 세 `FontVariation`이 같은 자원을 가리켰다. `wght` 축과 700·400·600 설정도 확인했다.
- 실제 전투 카드 위젯의 고유 정적 설명 86개에서 텍스트 불일치와 넘침은 각각 0건이었다. 최대 내용 높이는 105/143px, 최대 줄 폭은 120/120px이었다. `오딘의 창`을 포함해 1280×820과 작은 창 화면을 캡처했다.
- 덱 편집 작은 카드 `타격`의 실제 이름 `Label`에서 같은 파일 경로와 `wght` 700 설정을 확인했다. [덱 편집 이름 글꼴 보고](../outputs/godot-validation/2026-11-12-ui/c01-font-asset-sol/deck-editor-font-report.json).
- 검색 패널을 연 격리 Godot에서 검색 결과 작은 카드 `타격`의 실제 이름 `Label`도 같은 파일과 `wght` 700 설정을 사용했다. [검색 결과 카드 이름 글꼴 보고](../outputs/godot-validation/2026-11-12-ui/c01-font-asset-sol/search-card-font-report.json). 검증 스크립트 종료 중 `grab_focus` 경고가 발생했으므로 이 보고는 폰트 연결만 입증한다.
- `card_preview.gd`의 실제 작은 카드 `타격`에서 이름과 설명 `Label`이 같은 파일을 사용하고 각각 `wght` 700·400으로 설정된 것을 확인했다. [작은 미리보기 글꼴 보고](../outputs/godot-validation/2026-11-12-ui/c01-font-asset-sol/compact-preview-font-report.json)와 [캡처](../outputs/godot-validation/2026-11-12-ui/c01-font-asset-sol/compact-preview-font.png). 이 캡처는 독립 위젯의 폰트 연결 확인이며 웹 화면 배치 판정은 아니다.
- [실제 위젯 보고](../outputs/godot-validation/2026-11-12-ui/c01-font-asset-sol/card-description-integration-report.json), [1280×820 캡처](../outputs/godot-validation/2026-11-12-ui/c01-font-asset-sol/godot-long-text-word-wrap-1280.png), [작은 창 캡처](../outputs/godot-validation/2026-11-12-ui/c01-font-asset-sol/godot-long-text-word-wrap-800.png).

남은 확인: 덱 편집·검색·작은 미리보기의 나머지 표시와 다른 카드 화면의 글꼴, 실제 글리프 폴백, 긴 이름·동적 수치·사용자 물리 마우스 플레이. 따라서 C01 체크박스는 미완료로 유지한다.
