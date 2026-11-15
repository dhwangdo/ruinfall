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

## 코드 읽는 순서

`main.gd`는 현재 게임 상태와 화면을 연결하는 진입점이다. 카드 사용 분류는 `card_use.gd`, 지도 규칙은 `map_*.gd`, 전투 동작과 표현은 `battle_*.gd`, 카드 정의와 시각화는 `card_*.gd` 및 `deck_*.gd`에서 찾는다. 가능한 경우 입력 연결, 순수 규칙, 애니메이션 표현을 각각 담당하는 스크립트를 따라가며 읽는다.

툴팁과 고정 UI는 Godot 기본 텍스트 렌더링을 사용한다. 픽셀 정렬 비교 실험은 `scenes/tooltip_text_comparison.tscn`에서만 실행하며, 게임 UI에 일괄 적용하지 않는다.

GDScript의 `Dictionary`와 `Array`는 실행 중 바뀌는 게임 데이터를 담고, `Control` 노드는 화면의 UI 요소다. signal은 버튼·드래그·애니메이션 완료처럼 한 노드에서 일어난 일을 다른 코드에 전달한다. `preload("res://...")`는 Godot 프로젝트 안의 자원을 미리 연결한다.

## 실행

Godot 4.7.2 이상에서 `godot/project.godot`을 열거나 저장소 루트의 `godot/Run RUINFALL.cmd`를 사용한다. 내보내기는 `godot/README.md`의 Web·Windows 안내와 `godot/export_presets.cfg`를 따른다.

과거 React 구현의 설명은 [legacy-web 보관본](../archive/legacy-web/docs/CODE_GUIDE.md)에 남아 있다. 그것은 현재 구조 안내가 아니다.
