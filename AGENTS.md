# 저장소 작업 지침

현재 게임의 유일한 현행 구현은 `godot/`의 Godot 4 프로젝트다. 공개 웹판과 Windows판은 이 프로젝트에서 내보낸다. 이전 React/Electron 구현은 포팅 기록이며 현재 게임을 수정할 때 기준으로 삼지 않는다.

## 읽을 문서

작업을 시작할 때 다음을 순서대로 확인한다.

1. `docs/HANDOFF.md`
2. `docs/GAME_DESIGN.md`
3. `docs/CODE_GUIDE.md`
4. `godot/README.md` (실행·내보내기 작업일 때)

## 작업 원칙

- 런타임 코드·규칙·화면은 `godot/scripts/`, `godot/scenes/`, `godot/assets/`에서 수정한다.
- Godot에서 참조하는 데이터나 공용 자산은 구형 구현 정리 중에도 보존한다.
- 문서와 현재 Godot 동작이 다르면 Godot 코드를 기준으로 문서를 갱신한다. 구현되지 않은 기능을 완료된 것처럼 쓰지 않는다.
- 사용자가 요청한 범위만 바꾸고 기존 작업 트리의 변경을 보존한다.
- 전투·지도·저장 규칙 변경은 영향에 맞춰 Godot 스크립트 검사와 관련 probe를 수행한다. 작은 UI 조정은 변경 부위와 diff를 확인한다.
- 저장 진행은 Godot `user://`에 보관한다. 저장 형식을 바꾸면 `godot/scripts/`의 저장·복원 코드를 함께 살펴본다.

## 실행 및 배포

- Godot 프로젝트 경로: `godot/`
- 실행: 저장소 루트의 `godot/Run RUINFALL.cmd` 또는 Godot 4.7.2 편집기에서 `godot/project.godot` 열기
- Windows 내보내기: `godot/Export Windows.cmd`
- 공개 주소: https://dhwangdo.github.io/ruinfall/
- `main` push는 `.github/workflows/deploy-pages.yml`을 통해 Godot Web 내보내기를 배포한다.
- 커밋과 push는 사용자가 명시적으로 요청했을 때만 한다.
