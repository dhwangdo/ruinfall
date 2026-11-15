# RUINFALL 개발 인수인계

마지막 갱신: 2026-11-15

## 현재 기준

- 게임의 유일한 현행 구현은 `godot/`의 Godot 4 프로젝트다.
- 웹판과 Windows판은 같은 프로젝트에서 내보낸다.
- 이전 React/Electron 코드는 `archive/legacy-web/`에 보존한다. 현재 동작을 고치거나 설명하는 기준으로 삼지 않는다.
- 포팅 체크리스트와 작업 기록은 `docs/archive/porting/`에 보존한다. 기록의 완료 표시는 현재 플레이 동작을 보증하지 않으므로, 실제 코드를 기준으로 판단한다.

## 실행·배포

- 프로젝트: `godot/project.godot`
- Windows 실행: `godot/Run RUINFALL.cmd`
- Windows 내보내기: `godot/Export Windows.cmd`
- 공개 웹판: https://dhwangdo.github.io/ruinfall/
- `main`에 push하면 `.github/workflows/deploy-pages.yml`이 Godot Web 빌드와 Pages 배포를 수행한다.

## 작업 원칙

- 규칙·입력·UI 코드는 `godot/scripts/`, 장면은 `godot/scenes/`, 게임에 포함되는 자산은 `godot/assets/`에서 찾는다.
- 웹판과 Windows판이 같은 Godot 코드를 쓰도록 유지한다.
- 기존 작업 트리의 변경을 보존한다. 포팅 전 코드와 미커밋 변경은 `archive/legacy-web/` 및 작업 백업을 확인한 뒤 다룬다.
- 사용자 플레이 확인이 필요한 미해결 메모는 [포팅 보관 자료](archive/porting/GODOT_PLAYTEST_NOTES.md)를 확인한다.
- 사용자가 명시적으로 요청하지 않으면 커밋하거나 push하지 않는다.

## 문서

- [게임 규칙](GAME_DESIGN.md)
- [코드 안내](CODE_GUIDE.md)
- [Godot 실행 안내](../godot/README.md)
- [아카이브 안내](archive/README.md)
