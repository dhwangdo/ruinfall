# RUINFALL 개발 인수인계

마지막 갱신: 2026-11-19

## 현재 기준

- 게임의 유일한 현행 구현은 `godot/`의 Godot 4 프로젝트다.
- 웹판과 Windows판은 같은 프로젝트에서 내보낸다.
- 이전 React/Electron 코드와 포팅 기록은 `legacy-web-archive` Git 태그에 보존되어 있으며 현재 `main` 브랜치 작업 트리에서는 제거했다.
- 현행 규칙과 코드 구조는 [게임 규칙](GAME_DESIGN.md) 및 [코드 안내](CODE_GUIDE.md)에 `godot/scripts/` 기준으로 동기화되어 있으며, 동작 검증용 probe 스크립트는 `godot/tests/*_probe.gd`에 있다.

## 실행·배포

- 프로젝트: `godot/project.godot`
- Windows 실행: `godot/Run RUINFALL.cmd`
- Windows 내보내기: `godot/Export Windows.cmd`
- 공개 웹판: https://dhwangdo.github.io/ruinfall/
- `main`에 push하면 `.github/workflows/deploy-pages.yml`이 Godot Web 빌드와 Pages 배포를 수행한다.

## 작업 원칙

- 규칙·입력·UI 코드는 `godot/scripts/`, 장면은 `godot/scenes/`, 게임에 포함되는 자산은 `godot/assets/`에서 찾는다.
- 웹판과 Windows판이 같은 Godot 코드를 쓰도록 유지한다.
- 기존 작업 트리의 변경을 보존한다.
- 사용자가 명시적으로 요청하지 않으면 커밋하거나 push하지 않는다.

## 문서

- [게임 규칙](GAME_DESIGN.md)
- [코드 안내](CODE_GUIDE.md)
- [Godot 실행 안내](../godot/README.md)
