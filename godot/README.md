# Godot 프로젝트 사용

RUINFALL의 현행 게임 프로젝트다. Windows와 공개 웹판 모두 이 Godot 프로젝트에서 만든다. 게임 규칙은 저장소 루트의 [현행 게임 규칙](../docs/GAME_DESIGN.md), 개발 상태는 [인수인계](../docs/HANDOFF.md)를 따른다.

## 실행

- Godot 4.7.2 이상에서 `project.godot`을 연다.
- 저장소 루트에서 `godot/Run RUINFALL.cmd`를 실행해도 된다. Godot 편집기가 실행 중인 코드를 자동 갱신하지 않으므로, 소스 변경 뒤에는 게임을 다시 시작한다.

## Windows 내보내기

1. Godot 4.7.2와 같은 버전의 Windows export templates를 설치한다.
2. 저장소 루트에서 `godot/Export Windows.cmd`를 실행한다.
3. 실행 파일은 `godot/build/RUINFALL.exe`에 생성된다.

설정은 [`export_presets.cfg`](export_presets.cfg)의 `Windows Desktop` 프리셋에 있다.

## 웹 내보내기 및 공개 배포

- Godot 4.7.2 export templates와 Compatibility 렌더러를 사용한다. Web은 단일 스레드로 설정되어 있다.
- Web 프리셋의 기본 산출물은 `godot/build/web/index.html`이다. Pages 자동화는 빌드 결과를 저장소 루트의 `out/`에 만든다.
- 공개 주소는 https://dhwangdo.github.io/ruinfall/ 이다.
- `main`에 push하면 [Pages 작업 흐름](../.github/workflows/deploy-pages.yml)이 Godot으로 Web 빌드를 내보내 배포한다. 구형 웹 구현은 배포 경로에 포함되지 않는다.

## 자주 쓰는 위치

- 시작 장면: `scenes/main.tscn`
- 런타임 코드: `scripts/`
- 포함 자산과 폰트: `assets/`
- 셰이더: `shaders/`
- Godot 검사 probe: `tests/`
- `export_presets.cfg`의 `Web`·`Windows Desktop` 프리셋을 사용한다.

모바일 웹 텍스트 입력은 Web preset의 `html/experimental_virtual_keyboard=true`를 사용한다. 디버그 지역·생성 개수 입력은 숫자 키패드를 요청하며, 입력 도중 값을 강제로 정수화하지 않고 생성 시 검증한다.
