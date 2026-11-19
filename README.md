# RUINFALL

RUINFALL은 덱을 구성해 지도를 탐험하고, 적과 솔리테어 방식의 전투를 벌이는 게임입니다. 현재 게임 구현은 Godot 하나이며, Windows판과 웹판은 같은 프로젝트에서 내보냅니다.

## 시작하기

- Godot 4.7.2 이상에서 `godot/project.godot`을 엽니다.
- Windows에서는 저장소 루트의 `godot/Run RUINFALL.cmd`로 실행할 수 있습니다.
- Windows 실행 파일은 `godot/Export Windows.cmd`로 내보냅니다. Godot와 같은 버전의 Windows 내보내기 템플릿이 필요합니다.
- 공개 웹판: https://dhwangdo.github.io/ruinfall/

## 저장소 안내

- `godot/`: 유일한 현행 게임 코드, 장면, 자산, 웹·Windows 내보내기 설정
- `docs/GAME_DESIGN.md`: 현행 게임 규칙
- `docs/CODE_GUIDE.md`: Godot 코드 구조 안내
- `docs/HANDOFF.md`: 현재 개발 상태와 작업 시 참고사항

이전 React/Electron 웹 구현과 포팅 문서는 Git 히스토리(`legacy-web-archive` 태그)에 보존되어 있으며 현재 작업 트리에서는 분리했습니다.

## 웹 배포

`main`에 push하면 `.github/workflows/deploy-pages.yml`이 Godot 4.7.2로 Web 빌드를 만들고 GitHub Pages에 배포합니다. 구형 웹 프로젝트는 이 경로에서 사용하지 않습니다. 커밋과 push는 별도 요청이 있을 때만 합니다.
