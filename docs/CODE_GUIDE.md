# Godot 코드 안내

현재 게임은 Godot 4와 GDScript로 구현한다. `godot/project.godot`이 프로젝트 설정이고 `godot/scenes/main.tscn`이 시작 장면이다. 웹과 Windows 빌드가 같은 장면과 스크립트를 사용한다.

## 주요 폴더

- `godot/scenes/`: 시작 장면과 장면 구성
- `godot/scripts/`: 게임 규칙, 입력, 화면과 애니메이션 스크립트
- `godot/assets/`: 폰트, 카드 뒷면, 스티커와 UI 자산
- `godot/shaders/`: 화면 효과 셰이더
- `godot/tests/`: Godot에서 직접 실행하는 규칙·입력 probe
- `godot/export_presets.cfg`: Windows와 Web 내보내기 설정
- `.github/workflows/deploy-pages.yml`: Godot Web 빌드와 Pages 배포

게임 화면 우측 하단에는 빌드에 포함된 Git 커밋 해시와 커밋 시각(KST)이 표시된다. 웹·Windows 내보내기는 `scripts/generate_build_info.gd`가 빌드 직전 정보를 생성하며, 편집기 실행은 현재 저장소에서 직접 읽는다.

## 코드 읽는 순서

전투 배경은 화면 가장자리까지 녹색으로 채운다. `battle_board_layout.gd`는 적들을 오른쪽 두 열에 엇갈리게 배치하고 덱·파일·버린 카드 버튼을 좌측 상단에 세로로 쌓고, 에너지와 별을 좌측 하단에 둔다. 위쪽 공간을 파일에 사용하고, 파일과 손패를 화면 가로 중앙에 맞춘다. `battle_files_layout.gd`는 파일 묶음을 가로·세로 공간과 플레이어 영역에 맞춰 전체 비율로 축소한다. 파일 배치가 확정된 뒤 적이 파일 영역을 피해 이동하며, 적의 위치나 수 때문에 파일이 축소되지는 않는다. 좌우 캐릭터 열 전체를 파일 영역에서 제외하지 않는다. 파일 묶음이 기본 크기의 60%로도 들어가지 않을 때만 스크롤을 사용한다.

`main.gd`는 현재 게임 상태와 화면을 연결하는 진입점이다. 카드 사용 분류는 `card_use.gd`, 지도 규칙은 `map_*.gd`, 전투 동작과 표현은 `battle_*.gd`, 카드 정의와 시각화는 `card_*.gd` 및 `deck_*.gd`에서 찾는다. 가능한 경우 입력 연결, 순수 규칙, 애니메이션 표현을 각각 담당하는 스크립트를 따라가며 읽는다.

텍스트는 MSDF를 켠 Godot 기본 렌더링을 사용한다. 일반형 카드는 이름 Pretendard 18/800, 효과 마루 부리 13/400, 효과의 키워드·숫자 마루 부리 13/700으로 고정한다. card_visual_scale.gd가 동일한 카드 전체를 비율로 확대·축소하며 화면별 폰트 크기를 별도로 지정하지 않는다. 간소화 카드는 기존 Pretendard 글꼴·크기·굵기를 독립적으로 유지한다. 툴팁은 제목 마루 부리 700, 본문 Pretendard 500, 크기 14로 고정하며 설정에서 변경하지 않는다. 글꼴은 card_typefaces.gd, 라이선스는 assets/fonts/licenses/에 있다.

GDScript의 `Dictionary`와 `Array`는 실행 중 바뀌는 게임 데이터를 담고, `Control` 노드는 화면의 UI 요소다. signal은 버튼·드래그·애니메이션 완료처럼 한 노드에서 일어난 일을 다른 코드에 전달한다. `preload("res://...")`는 Godot 프로젝트 안의 자원을 미리 연결한다.

`battle_play_queue.gd`는 카드 사용 연출 중 다음 카드 사용 입력을 FIFO로 보관한다. 카드 ID·지정한 적·놓은 위치만 예약하며, 실제 차례에 손패·비용·대상 생존 여부를 다시 검사한다. 같은 카드의 중복 예약을 막고 유효하지 않은 예약은 취소한다. 앞 카드가 추가 선택을 요구하더라도 사용 연출 중에는 다음 입력들을 접수하고, 강제 드로우·버리기·파일 선택은 실행만 대기시킨다. 전투·턴이 바뀌면 남은 예약을 버린다. 연출이 끝날 때 다음 카드를 들고 있다면 놓거나 취소할 때까지 손패 재생성을 기다린다. 규칙은 한 장씩 처리하며 파일 이동·턴 종료는 함께 예약하지 않는다. 카드 사용 연출은 캡처한 pose·size에서 시작하며 투명한 ReleasedCardSource 노드를 만들지 않는다. 예약 카드는 손패에서 즉시 빠져 battle_play_queue_view.gd의 중앙 대기열에 22px씩 겹쳐 쌓인다. 처리 후 남은 카드가 함께 한 칸 올라오는 Tween이 완료되면 다음 카드를 처리한다. 우측 하단 퇴장 구간은 90ms다. 대기열과 복귀 연출 노드는 입력을 받지 않는다. `tests/battle_play_queue_probe.gd`는 순서·재검증을, `tests/battle_play_queue_pointer_probe.gd`는 첫 연출 완료 전 실제 드래그·놓기 5회 접수를 검사한다(`--untargeted`, `--discard-first` 변형 포함).

## 실행

Godot 4.7.2 이상에서 `godot/project.godot`을 열거나 저장소 루트의 `godot/Run RUINFALL.cmd`를 사용한다. 내보내기는 `godot/README.md`의 Web·Windows 안내와 `godot/export_presets.cfg`를 따른다.

과거 React 구현의 설명은 [legacy-web 보관본](../archive/legacy-web/docs/CODE_GUIDE.md)에 남아 있다. 그것은 현재 구조 안내가 아니다.

숫자키 선택은 누른 시점부터 150ms 동안 키를 먼저 떼어도 클릭 사용을 허용한다. 기한까지 클릭하지 않으면 자동 복귀하며, 오래 누른 뒤 떼기와 우클릭·Esc 취소는 즉시 처리한다. battle_keyboard_drag.gd의 KEY_CLICK_GRACE_MS가 유예 시간이며 tests/battle_keyboard_grace_probe.gd에서 실제 키·클릭 입력과 이전 타이머의 간섭을 검사한다.
