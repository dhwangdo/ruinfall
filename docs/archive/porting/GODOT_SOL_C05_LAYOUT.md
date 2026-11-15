# C05 작업 기록: 덱 편집 패널 높이와 여백

## Sol 후속: 작은 카드 희귀도 띠 높이 (2026-11-13)

비용 Label의 최소 높이가 `PanelContainer`로 전파되어 CSS 19.6px 띠가 실제 GUI에서 23px로 늘어났다. 작은 카드 헤더만 `Panel`로 바꾸고 기존 비용 HBox를 좌우 5px inset의 anchored 자식으로 두어 글꼴 최소 높이와 띠 높이를 분리했다. 비용 글꼴·크기는 유지했으며 `line_spacing` override는 없다. 전투 공용 카드·드래그·규칙은 바꾸지 않았다.

격리 Godot 4.7.2 GUI probe **34/34**, 종료 코드 0. 헤더 최소 높이는 19.6px, 실제 띠는 82×20px로 측정됐다. `VBoxContainer`의 정수 픽셀 배치 때문에 CSS와 정확히 같은 19.6px 실측은 아니며, probe는 CSS 최소값 19.6px와 반올림 결과 20px를 모두 검사한다. 긴 이름·62px 폭·말줄임표, 1/2/6/9/25장 카드 크기, 배지 여백, 스티커 두 개와 x25 배지의 겹침, 호버·GUI 드래그·드롭 callback 1회도 통과했다. [최종 보고](../outputs/godot-validation/2026-11-13-ui/c05-header-band-luna/header-band-report.json), [갤러리 캡처](../outputs/godot-validation/2026-11-13-ui/c05-header-band-luna/header-band-gallery-1280.png)를 확인했다.

기존 `c05-card-name-luna/godot` 격리 프로젝트를 재사용했다. 첫 실행은 존재하지 않는 `c05-header-band-luna/godot` 경로 때문에 즉시 종료했고, 실제 GUI 검사는 기존 프로젝트에서 수행했다. 최종 PID 31908은 정상 종료했다. Windows 인증서 저장소 환경 경고가 있었으며 localhost·commit/push는 실행하지 않았다. 같은 상태의 웹 렌더 및 실제 픽셀 대조는 남아 있어 C05 전체는 미완료다.

상태: **부분 완료, C05 전체 미완료**

현재 웹과 Godot에서 새 탐험의 카드 20장짜리 덱, 빈 인벤토리, 보유 덱 1개를 1280×820 화면에 표시했다. 웹은 이 작업공간의 Vinext 개발 서버에서 이름을 확정하고 인벤토리를 연 뒤 DOM 영역을 측정했다. [웹 영역 보고](../outputs/godot-validation/2026-11-12-ui/c05-layout-sol/web-layout-report.json).

웹 패널은 `(x=14, y=108, 1252×604)`이고 바닥 행은 `y=608`이다. Godot의 이전 패널은 화면에 거의 가득 차서 `(x=24, y=20, 1232×780)`이었고 바닥 행은 약 `y=683`이었다. [Godot 변경 전 캡처](../outputs/godot-validation/2026-11-12-ui/c05-layout-sol/c05-deck-before-1280.png).

`godot/scripts/main.gd`에서 바깥 여백을 14px로 맞추고 패널의 세로 크기를 내용에 맞춰 가운데 배치했다. 수정 후 Godot 패널은 `(x=14, y=89, 1252×642)`, 바닥 행은 `y=614`다. [영역 보고](../outputs/godot-validation/2026-11-12-ui/c05-layout-sol/c05-layout-report.json), [1280×820 캡처](../outputs/godot-validation/2026-11-12-ui/c05-layout-sol/c05-deck-1280.png), [800×480 창 캡처](../outputs/godot-validation/2026-11-12-ui/c05-layout-sol/c05-deck-800.png). 작은 창에서도 전체 화면 축소 방식을 유지했다.

패널 이동 뒤 실제 Godot GUI 드래그로 25장 가득 찬 덱의 카드 거부를 다시 확인해 9/9 통과했다([드래그 보고](../outputs/godot-validation/2026-11-12-ui/c05-layout-sol/c05-layout-drag-report.json)). 검증은 격리 Godot 4.7.2에서 `Viewport.push_input`으로 했으며 물리 마우스 평가는 별도다.

2026-11-13 후속 확인에서 웹은 제목 행 없이 인벤토리에서 바로 시작하며 CSS 첫 행 높이도 `0`이다. Godot에서 제목·요약·닫기 버튼·구분선을 없애고 패널 안쪽 여백을 제거했다. 인벤토리와 덱 사이 간격은 32px로 두고 덱 목록 영역을 남은 높이에 맞췄다. 카드 행의 가로 스크롤은 유지하면서 스크롤바는 숨겨 웹과 같이 행 높이가 늘지 않게 했다. 닫기는 기존처럼 바깥 클릭과 Escape를 사용한다.

Godot 4.7.2의 격리 `APPDATA` headless SceneTree probe에서 1280×820 컨트롤 영역을 읽었다([측정 보고](../outputs/godot-validation/2026-11-13-ui/c05-layout-luna/c05-layout-report.json)). 패널 `(14,108,1252×604)`, 인벤토리 `(14,108,1252×104)`, 첫 덱 행 `(14,244,1252×104)`, 덱 목록 영역 높이 `364`, 바닥 `(14,608,1252×104)`로 웹 보고서와 일치한다. 가로 콘텐츠 폭을 강제로 2000px로 만들어 넘침을 준 probe에서도 스크롤 최대값이 양수였고 덱 행 높이는 104px로 유지됐다.

측정은 렌더링 캡처가 아닌 컨트롤 좌표라 색·카드 모양·실제 창의 시각 결과는 아직 직접 대조하지 않았다. Godot 실행은 종료 코드 0이었고 Windows 인증서 저장소를 읽지 못한다는 환경 경고가 남았다. 따라서 이 화면 배치 항목은 좌표상 맞았지만 C05 전체는 미완료다. 검증용 웹 서버는 종료했고 commit/push하지 않았다.

2026-11-13 기본 스타일 코드 정리에서 `godot/scripts/main.gd::_deck_editor_card_widget()`의 카드 테두리 색·두께, 희귀도 띠 높이와 좌우 여백, 카드 비용·이름 글꼴과 크기, 스티커 아이콘 크기를 웹 `item-visuals.css` 기준으로 조정했다. 중복 카드 수 배지는 소모품용 공용 배지에 영향을 주지 않도록 카드 전용 패널을 추가했다. 이 단계 당시에는 카드 스택 레이어와 7px 겹침을 반영하지 않았으며, 이후 아래 Sol 후속에서 구현했다.

이 기본 스타일 작업 당시에는 소스 코드만 반영했고 Godot 렌더 캡처와 GUI 비교를 하지 않았다. 이후 Godot 렌더·입력 확인은 아래 Sol 후속 기록을 따른다. 같은 상태의 웹 렌더와 글꼴 모양, 픽셀 배치, 배지 크기를 대조하는 작업은 남아 있으며 C05 전체는 계속 미완료다.

## Sol 후속: 작은 카드의 겹침 그림 (2026-11-13)

`CardVisual.tsx`와 `itemStackStyle.ts`, `item-visuals.css`를 기준으로 `min(5, max(0, count - 1))`개의 뒷면과 7px 간격, 상단의 4px 테두리/3px 희귀도 띠를 추가했다. `deck_editor_card_stack.gd`는 입력을 받지 않고 그림만 그린다. `main.gd`의 `_add_deck_editor_card()`는 묶음 카드의 왼쪽 여백만 확보하며, 기존 카드 자체의 82×82 드래그·호버·드롭 영역과 callback은 유지한다. 인벤토리·덱·제거 예약·바닥의 네 생성 지점을 확인했다. 공유 드래그 스크립트와 게임 규칙은 수정하지 않았다.

기존 격리 프로젝트에 변경한 두 스크립트와 누락되어 있던 현재 Pretendard 파일만 동기화했다. Godot 4.7.2 GUI 렌더와 `Viewport.push_input` probe는 **16/16** 통과했다([보고](../outputs/godot-validation/2026-11-13-ui/c05-card-stack-sol/stack-report.json)). 1·2·6·9장 카드의 전면은 모두 82×82이며, 묶음 전체 폭은 89/117/117px다. 9장도 뒷면은 5개로 제한된다. 카드 전면에서 호버 미리보기가 열리고 뒷면 위에서는 닫혔다. 전면의 GUI 드래그 시작과 대상 callback 1회 호출, 복제한 드래그 미리보기의 겹침 그림 유지를 확인했다. 이 드롭은 화면 연결만 확인하는 probe callback이며 실제 소유 카드 이동 규칙을 다시 검증한 것은 아니다.

[카드 묶음 렌더](../outputs/godot-validation/2026-11-13-ui/c05-card-stack-sol/stack-gallery-1280.png), [드래그 중 렌더](../outputs/godot-validation/2026-11-13-ui/c05-card-stack-sol/stack-drag-preview.png), [실제 편집 화면 렌더](../outputs/godot-validation/2026-11-13-ui/c05-card-stack-sol/deck-editor-stacks-1280.png)를 직접 확인했다. 첫 probe에서 드래그 복제 시 장식 상태가 빠지는 것을 발견해 장식 필드를 `@export`로 보존했다. 짧은 두 번 이동만 보내던 probe 입력은 기존 GUI 검증과 같은 8단계 이동으로 고쳐 최종 드롭을 확인했다.

이는 **Godot 렌더 확인**이며 같은 상태의 웹 렌더와 픽셀 대조를 완료한 것은 아니다. 기존 전면 카드의 상단 테두리·띠 위치, 이름의 세로 중앙/줄임표, 배지 위치, 전설 띠 색 등은 별도 비교가 남아 있다. 작은 창·스티커가 있는 카드·가로 넘침의 이번 변경 후 GUI 확인과 물리 마우스 평가는 하지 않았다. C05 전체는 미완료다. 실행은 종료 코드 0이며 Windows 인증서 저장소 경고가 있었다. 검증 프로세스는 종료했고 기존 Godot 창은 건드리지 않았다. 웹 서버·전체 빌드·commit/push는 실행하지 않았다.

## Luna 후속: 전설 작은 카드 띠 색 (2026-11-13)

현재 웹 CSS는 compact-card 전설 띠를 `#d5a928`으로 지정하지만 Godot의 공용 카드 헤더 스타일은 `#a87924`였다. 작은 카드 전용 헤더 스타일 함수를 추가해 전설의 전면 띠와 겹침 뒷면 띠를 웹 색으로 바꿨다. 공용 전투 카드 스타일은 그대로다. CSS와 기존 캡처에 따른 코드 변경이며, 이 색상 수정 뒤 Godot 렌더 및 같은 상태 웹 렌더 대조는 하지 않았다. 카드 상단 테두리 위치·이름 정렬/줄임표·배지 크기와 위치가 다음 비교 대상이다.

## Luna 후속: 작은 카드 이름 글꼴 폭과 말줄임표 (2026-11-13)

웹 compact-card 이름은 600 weight·13.2px/1.2, `letter-spacing: -0.65px`, 좌우 6px padding을 쓴다. Godot과 웹의 Pretendard WOFF2 파일 SHA-256은 같다. `main.gd::_deck_editor_card_widget()`에서 카드 이름 전용 FontVariation에 weight 600과 -1px glyph spacing을 주고, 4px 테두리 및 좌우 padding에 맞춰 MarginContainer 좌우를 10px로 설정해 Label 폭 62px를 만들었다. Godot의 폰트 크기와 자간은 정수 픽셀이라 CSS 수치의 근사치다. `TextServer.OVERRUN_TRIM_ELLIPSIS_FORCE`를 포함해 긴 한국어 카드 이름 캡처, Label 폭, 겹침·드래그 입력을 격리 Godot 4.7.2에서 처음 **21/21 통과**했고, 아래 배지 후속 검사를 추가한 현재 보고는 **24/24**다([보고](../outputs/godot-validation/2026-11-13-ui/c05-card-name-luna/card-name-report.json), [캡처](../outputs/godot-validation/2026-11-13-ui/c05-card-name-luna/long-card-name-ellipsis-1280.png)). 실행은 종료 코드 0이며 Windows 인증서 저장소 경고가 있었다. 같은 상태의 웹/Godot 대조와 이름의 수직 위치 확인은 남아 있다. 웹 서버는 사용자가 미뤄 현재 시작하지 않았다.

## Sol 후속: 작은 카드 중복 수 배지 (2026-11-13)

웹 CSS의 4px 테두리와 `right:3px; bottom:3px`, 세로 padding 1px 및 14.3px line-height를 기준으로 배지 외곽 여백 7px·높이 약 16px를 맞췄다. 카드 전용 배지를 고정 최소 높이 16px의 Panel로 만들고, Arial 글자 폭에 좌우 3px씩 더해 폭을 정한다. 마지막 GUI probe에서 가운데 정렬 때문에 하단 여백이 8px였으므로 `SIZE_SHRINK_END`와 하단 margin 7px로 바꿨다. 소모품 공용 배지와 게임 규칙은 바꾸지 않았다.

격리 Godot 4.7.2 GUI probe **24/24**, 종료 코드 0이다. 2장 카드 `(173,100,82×82)`의 배지는 `(223,159,25×16)`으로 우측·하단 여백이 모두 7px였다. 긴 이름·62px 텍스트 폭·말줄임표, 1/2/6/9장 크기, 호버·드래그·드롭 callback 1회도 통과했다. [최종 보고](../outputs/godot-validation/2026-11-13-ui/c05-card-name-luna/card-name-report.json), [최종 카드 캡처](../outputs/godot-validation/2026-11-13-ui/c05-card-name-luna/stack-gallery-1280.png)를 확인했다. 입력은 `Viewport.push_input`이다. 당시 같은 상태의 웹 렌더 대조·배지 글자 전체 모양·다른 자릿수·스티커 동시 배치는 미확인이었다. 이어진 검사 범위는 아래 Luna 기록을 따른다. C05 전체는 미완료다. 검증 프로세스는 정상 종료했으며 기존 Godot 창·localhost·commit/push는 건드리지 않았다.

## Luna 후속: 여러 자릿수 배지와 스티커 배치 (2026-11-13)

CSS 측정으로 배지와 스티커가 함께 있을 때의 배치를 정했다. `.inventory-card-count`는 card border 안쪽에서 right/bottom 3px, vertical padding 1px이고, 스티커 표시는 card padding box의 왼쪽·아래에 붙는다. Godot 카드 루트가 `PanelContainer`라 직접 자식 배지가 전체 카드 크기로 늘고, x25 배지와 스티커 2개를 한 행에 두면 카드 최소 폭도 92px로 커지는 문제가 probe에서 재현됐다.

`main.gd`는 카드 배지를 별도의 full-size `Control` overlay 아래에 배치하고, badge 폭은 Arial의 실제 숫자 문자열 폭에 좌우 3px씩 더해 계산한다. Panel은 높이 16px, card 끝에서 우측·하단 7px에 고정한다. 스티커 행은 MarginContainer로 테두리 안쪽 x=4px/y=4px, 스티커 간격 0을 반영한다. x25 배지와 스티커 2개가 함께 있는 카드도 82×82이며 badge는 CSS 순서와 같이 스티커 위에 겹친다.

격리 Godot 4.7.2 GUI 렌더/입력 probe **33/33**, 종료 코드 0이다. x2 배지는 25×16px, x25 배지는 35×16px, 두 배지 모두 외곽 기준 우측·하단 여백 7px다. 두 스티커는 25×25px, x 간격 25px, 카드 프레임 안쪽에 4px 위치하며 x25 배지의 겹침은 14px다. 앞선 21/21·24/24 확인 항목과 함께 긴 이름 말줄임, 카드 1/2/6/9/25장 너비, 레이어 장식, 호버·드래그·drop callback 1회도 통과했다. [보고](../outputs/godot-validation/2026-11-13-ui/c05-badge-range-luna/badge-range-report.json), [카드 캡처](../outputs/godot-validation/2026-11-13-ui/c05-badge-range-luna/badge-range-gallery-1280.png). 실행은 정상 종료했으며 Windows 인증서 저장소 경고가 남았다.

이 검사는 Godot의 정적 CSS 대응 수치와 입력을 확인한 것이다. 같은 상태의 웹 픽셀 비교, 배지 글자 모양, 스티커가 2개보다 많은 경우, 실제 물리 마우스 플레이는 미확인이다. C05 전체는 미완료이며 사용자가 미룬 localhost는 시작하지 않았다.
