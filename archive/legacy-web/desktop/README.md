# 로컬 실행기

저장소 루트의 `Ruinfall.cmd` 또는 `outputs/desktop/Ruinfall-win32-x64/Ruinfall.exe`를 더블클릭한다.
`Ruinfall.cmd`는 현재 작업 폴더의 게임 소스가 패키지보다 최신이면 자동으로 다시 빌드한 뒤 실행한다. 소스가 그대로면 바로 열린다. 변경분을 자동으로 GitHub에서 내려받지는 않는다.
게임을 실행할 때는 인터넷, Node.js, 개발 서버가 필요하지 않다. F11로 전체 화면을 전환한다.
실행 파일을 옮길 때는 `Ruinfall-win32-x64` 폴더 전체를 함께 옮긴다.

수동으로 실행기를 갱신하려면 `npm run build:desktop`을 실행한다. 최초 빌드에는 Electron 런타임 다운로드가 필요하다. 자동 빌드에는 Node.js/npm과 프로젝트 의존성이 필요하며, 실행 중인 게임을 닫은 뒤 진행한다. GitHub Pages 배포와 개발 서버는 별도로 유지된다.

게임은 패키지 내부의 `ruinfall://game/` 주소로 파일을 읽고 localhost 포트를 열지 않는다.
진행 저장은 Windows 사용자 프로필의 Ruinfall 앱 데이터에 보관한다. 웹 브라우저에서 플레이하던 저장을 자동으로 옮기지 않는다.
업데이트해도 이 앱 데이터는 유지되며 전투 도중 상태 등 저장 범위는 웹 버전과 같다.
