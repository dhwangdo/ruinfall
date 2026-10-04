# 프로젝트 인수인계 보고서

마지막 갱신: 2026-10-04

기준: 이 문서는 갱신 당시의 **현재 작업 트리**를 기준으로 작성했다. 커밋된 `main`보다 미커밋 코드가 앞서 있을 수 있다. 문서와 코드가 충돌하면 `app/`의 현재 코드와 `tests/`의 검증을 우선한다.

## 한 줄 요약

**Ruinfall**은 여러 파일에 쌓인 카드를 솔리테어처럼 재배열하며 싸우고, 넓은 그리드 지도에서 움직이는 적을 피해 탐험하는 싱글 플레이 웹게임 프로토타입이다.

현재 지도 틀은 7지역까지 생성되며, 실제 적 풀과 고정 보스 콘텐츠는 **1~3지역까지** 구현되어 있다. 카드 전투, 재련, 룰 카드, 덱 케이스와 에디션, 보상, 상점, 축복, 여러 지도 노드, 티켓, 보스 진행, 맵 진행 자동 저장과 전투 텔레메트리가 브라우저 안에서 동작한다.

## 현재 구현 범위

### 탐험

- 가로 `-160~160`, 지역당 세로 15칸인 7개 지역을 생성한다.
- 지역 사이에는 단단한 바위 5줄이 있다.
- 플레이어는 상하좌우와 대각선 8방향으로 움직인다.
- 지나온 길은 자동 이동할 수 있으며 적이 시야에 들어오면 자동 이동을 멈춘다.
- 지도에는 상점, 추출·건강·심안·변환·조합의 성소, 보물 상자, 축복 노드, 바위 군집, 지역 포탈, 바닥 카드·티켓이 생성된다.
- 빈 지도 칸의 0.5%에 카드나 티켓이 놓이며, 카드가 80%, 티켓이 20%다.
- 지역 포탈은 해당 지역의 안전 지역으로, 안전 지역 포탈은 다음 지역 시작점으로 이동시킨다.
- 1~3지역 안전 지역에는 고정 보스가 있으며, 보스가 살아 있는 동안 해당 안전 지역의 덱 편집이 잠긴다.
- 4~7지역의 지도와 안전 지역 틀은 있지만, 현재 일반 적 풀과 보스는 없다.

### 오버맵 적

- 일반 적은 새 탐험 시작 시 빈칸마다 8% 확률로 미리 배치된다.
- 1~3지역에는 지역별 적 풀이 있으며, 3% 확률로 바로 다음 지역 적 풀이 조기 출현한다.
- 적은 `Zzz → ? → !` 인식 상태를 사용한다.
- `!` 적은 지형과 다른 적을 고려한 8방향 거리장으로 추적한다.
- 여러 적은 목적지를 예약한 뒤 동시에 움직이며, 겹치거나 자리를 교환하지 않는다.
- 적의 현재 위치를 직접 본 칸에는 기억이 남고, 다시 관측하면 갱신된다.
- 플레이어나 적이 상대 칸에 들어가면 전투가 시작된다.
- 보스는 안전 지역 연결부에 고정되며 처음부터 `!` 상태다.

### 전투

- 선택한 덱을 섞어 기본 5장씩 파일에 배치한다.
- 기본 전투 시작 자원은 에너지 3, 별 2다.
- 턴 시작마다 비어 있지 않은 각 파일 맨 위에서 한 장씩 손으로 가져온다.
- 손패 카드 또는 파일의 카드 묶음을 다른 파일로 옮기는 솔리테어 행동은 별 1개를 쓴다.
- 공격, 물리 방어, 마법 방어, 힘, 강인함, 물리·마법 저항과 취약, 추가 턴, 반사 등이 구현되어 있다.
- `룰` 카드는 사용 후 전투 동안 활성 상태로 남는다.
- `소멸` 카드는 사용한 전투의 다음 리셔플에서 빠진다.
- 조건에 맞는 카드 위에 카드를 놓아 전투 동안 강화하는 `재련`이 구현되어 있다.
- 적이 유독성 점액·흙·돌·유물 토큰을 손패나 파일에 넣을 수 있다.

### 성장과 보상

- 기본 최대 체력은 50, 기본 인벤토리는 12칸, 기본 덱 케이스 보유 한도는 3개다.
- 시작 덱은 16장이고 시작 덱 케이스 용량은 20장이다.
- 새 탐험을 시작할 때 추가 타격·방어 카드를 지급하지 않는다.
- 일반 전투 골드는 지역에 따라 증가한다. 1지역은 10~15이며, 이후 지역마다 약 1.3배로 오른다. 보스 전투는 80~100 골드를 준다.
- 카드 또는 덱 케이스를 얻고, 별도로 티켓이 나올 수 있다.
- 덱 케이스가 나오지 않을 때마다 다음 덱 케이스 확률이 10%p 증가하고, 나오면 25%로 돌아간다.
- 일반 카드 보상에서 희귀 카드가 나오지 않을 때마다 희귀 확률이 2%p 증가하고, 나오면 5%로 돌아간다.
- 발견한 덱 케이스에는 전투 시작 자원, 파일 배치, 카드 공개, 골드 등에 영향을 주는 에디션이 붙을 수 있다.
- 안전 지역의 축복 노드에서 세 후보 중 하나를 선택하며, 골드로 후보를 다시 굴릴 수 있다.

### 도구와 디버그

- 디버그 모드에서 모든 카드 덱, 카드 풀 통계, 17개 조우의 적 도감을 볼 수 있다.
- 디버그 모드의 덱 케이스 보유 한도는 10개다.
- 텔레메트리는 런·전투·턴·카드 사용·카드 획득·적별 받은 피해를 기록한다.
- 텔레메트리와 탐험 진행은 각각 브라우저 `localStorage`에 저장된다. 화면에서 피해 기록 TXT를 내보낼 수 있다.
- 탐험 진행은 맵 화면에서 자동 저장되어 새로고침 뒤 복원된다. 전투 중과 덱 편집 중의 상태는 저장하지 않으며, 패배하거나 새 탐험을 시작하면 진행 저장을 지운다.

## 1~3지역 적과 보스

| 지역 | 일반 조우 | 보스 |
|---|---|---|
| 1지역 | 작은 마법사, 주황 슬라임, 하수구 쥐, 쥐 3마리, 초록 슬라임 | 검은 슬라임 |
| 2지역 | 골렘, 도깨비, 저주술사, 마나 야수+도깨비불, 작은 마법사 2마리 | 광대 |
| 3지역 | 미라 사제, 미라 전사, 지룡, 가시 딱정벌레 2마리 | 거대 지룡 |

주요 적 규칙:

- 주황 슬라임은 유독성 점액을 넣고 공격과 방어 패턴을 번갈아 쓴다.
- 골렘은 예고 동작 뒤 큰 피해를 주는 고정 주기를 쓴다.
- 하수구 쥐와 광대는 파일의 카드를 강제로 버린다.
- 도깨비는 첫 번째 파일 아래에 유물 토큰을 넣는다.
- 저주술사와 도깨비불은 다음 턴 취약을 건다.
- 미라 사제는 피해 횟수를 무효화하는 가호를 사용한다.
- 미라 전사는 매 턴 힘이 증가한다.
- 지룡과 거대 지룡은 모든 파일에 흙 또는 돌을 놓는다.
- 가시 딱정벌레는 공격받을 때 반격한다.

## 카드와 덱의 현재 상태

- 카드 등급은 상태, 시작, 일반, 특별, 희귀, 전설이다.
- 시작 카드 3종, 일반 카드 6종, 특별 표시 카드 30종, 희귀 표시 카드 16종, 전설 카드 6종이 정의되어 있다.
- `무쇠 난동`은 레거시 카드 풀에 남아 디버그 전체 카드 목록에는 나타나지만 일반 획득 풀에는 연결되지 않는다.
- 전설 카드 6종도 구현과 디버그 목록에는 존재하지만, 현재 일반 전투 보상·덱 생성·상점의 획득 풀에는 연결되지 않는다.
- 발견한 덱은 지역 번호로 용량·희귀 카드 수·에디션 예산을 정한다. 편차가 큰 조합은 지수 가중치로 드물게 뽑히며, `덱 크기` 축복은 생성이 끝난 뒤 용량 5장을 더한다.
- 희귀 카드는 덱·인벤토리·바닥 사이에서 일반 이동·추출·제거할 수 없다. 티어 1 교환 티켓으로 서로 다른 위치의 희귀 카드 두 장을 맞바꿀 수 있다.
- 덱 편집 이동 판정은 `app/game/deckEditorRules.ts`에 분리되어 있고 카드 ID와 출발 덱 ID를 기준으로 검사한다.

## 기술 상태

| 항목 | 현재 상태 |
|---|---|
| 언어 | TypeScript, CSS |
| 화면 기술 | React 19 + Next.js 16 |
| 로컬 개발 실행기 | Vinext/Vite |
| 플레이 진행 저장 | 브라우저 `localStorage`; 맵 진행만 복원 |
| 텔레메트리 저장 | 진행 저장과 별도로 브라우저 `localStorage` 사용 |
| 서버/API | 게임 기능에는 사용하지 않음 |
| 데이터베이스 | 예제 골격만 있고 게임에는 사용하지 않음 |
| 앱 상태 연결과 화면 조립 | `app/page.tsx` |
| 지도판 계산과 표시 | `app/components/MapBoard.tsx` |
| 추출·변환·조합 성소 선택 UI | `app/components/ExtractionShrineModal.tsx`, `app/components/CardConversionShrineModal.tsx` |
| 전투 손패·파일 영역 표시와 입력 | `app/components/BattleHandArea.tsx`, `app/components/BattlePileZone.tsx` |
| 전투 손패 코스트 정렬 | `app/game/battleHandRules.ts` |
| 전투 선택·드래그 상태와 포인터 입력 | `app/hooks/useBattleInteractionState.ts`, `app/hooks/useBattlePointerInput.ts` |
| 탐험 진행 스냅샷 저장 주기와 타이머 | `app/hooks/useRunSaveLifecycle.ts` |
| 카드 앞면과 효과 문구 표시 | `app/components/CardFace.tsx` |
| 덱 이름·에디션 표시 컴포넌트 | `app/components/DeckName.tsx` |
| 지도 상단 체력·골드·덱 조작 UI | `app/components/MapTopbar.tsx` |
| 지도 카메라·뷰포트 상태와 동작 | `app/hooks/useMapCamera.ts` |
| 지도 키보드 이동과 입력 타이머 | `app/hooks/useMapKeyboardMovement.ts` |
| 지도 단축키와 방 행동 입력 | `app/hooks/useMapKeyboardShortcuts.ts` |
| 저장·새 탐험 키 입력과 초기화 진행 표시 | `app/hooks/useRunKeyboardControls.ts` |
| 덱 편집 세션의 스냅샷·열기·확정 상태 | `app/hooks/useDeckEditorSession.ts` |
| 카드 미리보기·키워드 팝오버·툴팁 동작 | `app/hooks/useFloatingPreviews.ts` |
| 지도 방 버튼·접근성 표기 | `app/components/MapRoomButton.tsx` |
| 지도 전투 덱 선택 메뉴 | `app/components/MapDeckSelector.tsx` |
| 지도 디버그 도구막대 | `app/components/MapDebugToolbar.tsx` |
| 지도 폭탄·적·플레이어 표식 | `app/components/MapEntityMarkers.tsx` |
| 방 행동 안내·바닥 아이템 빠른 줍기 | `app/components/MapRoomActions.tsx` |
| 덱 보기 모달 | `app/components/DeckViewerModal.tsx` |
| 전투 전 사용할 덱 확인 모달 | `app/components/BattleDeckCheckModal.tsx` |
| 카드 키워드 팝오버 | `app/components/CardKeywordPopover.tsx`와 `app/components/CardKeywordSections.tsx` |
| 적 의도 피해·상태 아이콘 | `app/components/EnemyIntentIcons.tsx` |
| 전투 중 적 유닛 표시 | `app/components/BattleEnemyUnit.tsx` |
| 전투 중 플레이어 상태 표시 | `app/components/BattlePlayerPanel.tsx` |
| 전투 결과·보상 표시 | `app/components/BattleResultOverlay.tsx` |
| 디버그 적 도감 | `app/components/DebugEnemyCodex.tsx` |
| 재사용 카드 요약 아이콘 | `app/components/DeckEditorCardIcon.tsx` |
| 카드 풀 통계 계산·패널 | `app/components/CardPoolStatsPanel.tsx` |
| 카드 이동 DOM 애니메이션 | `app/components/cardAnimations.ts` |
| 카드 타입·정의·획득 풀 | `app/game/cards.ts` |
| 카드 비용·재련·배치 규칙 | `app/game/cardEffects.ts` |
| 공통 방어 획득 계산 | `app/game/defenseRules.ts` |
| 티켓 존재·종류 확인과 소모 | `app/game/ticketRules.ts` |
| 티켓 가격과 등급 | `app/game/shopRules.ts` |
| 덱·보상·티켓 생성 | `app/game/rewards.ts` |
| 희귀 카드 누적 확률 | `app/game/rewardRules.ts` |
| 전투 초기 상태·파일 배치·드로우 | `app/game/battleState.ts` |
| 전투 단계·드래그·피해 팝업 타입 | `app/game/battleUiTypes.ts` |
| 카드 사용 효과 처리 | `app/game/cardPlayAction.ts` |
| 손패 드로우 처리 | `app/game/drawCards.ts` |
| 턴 종료와 적 행동 | `app/game/endTurnAction.ts` |
| 파일 이동·선택 드로우·연구 드로우 | `app/game/pileActions.ts` |
| 지도 노드·지역·안전 지대·바닥 드롭 | `app/game/mapRules.ts` |
| 지도 한 턴의 적 이동과 충돌 판정 | `app/game/mapTurn.ts` |
| 지도 폭탄 | `app/game/mapEffects.ts` |
| 적 전투 데이터 | `app/game/enemies.ts` |
| 오버맵 적 | `app/game/mapEnemies.ts` |
| 덱 편집 판정 | `app/game/deckEditorRules.ts` |
| 덱 편집 카드 이동 전이·보기 그룹화 | `app/game/deckEditorTransitions.ts`, `app/game/deckEditorViews.ts` |
| 화면·탐험 데이터 공유 타입 | `app/game/runTypes.ts`, `app/components/overlayTypes.ts` |
| 텔레메트리 스냅샷 생성 | `app/game/telemetrySnapshots.ts` |
| 탐험 진행 직렬화·복원 | `app/game/saveGame.ts` |
| 탐험 스냅샷 집합 직렬화와 구버전 복원값 정리 | `app/game/runSaveState.ts` |
| 전투 기록 | `app/game/telemetry.ts` |
| Pages 정적 경로·Turbopack 루트 | `next.config.ts` |
| 카드 설명 줄맞춤 | `app/cardTextLayout.ts` |
| 카드 워터마크 별자리 생성·이미지 변환 | `app/cardConstellations.ts` |
| 카드 테마의 별자리 미리보기 | `app/components/ConstellationPreview.tsx` |
| 배포 | GitHub Pages |

카드 데이터, 덱·보상 생성, 지도·안전 지대 생성, 전투 초기 상태, 카드 사용·드로우·턴 종료·파일 이동 로직은 `app/game/` 아래로 분리되었다. 지도 한 턴의 적 이동과 충돌 판정은 `mapTurn.ts`, 저장 스냅샷의 집합 직렬화와 구버전 필드 정리는 `runSaveState.ts`가 맡는다. 지도 카메라, 지도 키 입력, 카드 미리보기와 툴팁은 각각 `app/hooks/`의 전용 훅이 맡는다. 지도판 계산과 표시, 성소 카드 선택 UI, 전투 손패·파일 영역도 책임별 컴포넌트로 분리했다. 저장 직렬화는 `saveGame.ts`, 지연·주기 저장은 `useRunSaveLifecycle.ts`가 맡는다. 덱 편집 이동은 판정·컬렉션 전이·목록 보기로 나뉘며, DOM 드래그 입력은 `DeckEditorModal.tsx`에서 처리한다. 덱 편집 모달은 일곱 개의 책임별 입력 그룹에 총 42개 값을 받는다. `app/page.tsx`의 크기와 줄 수는 `CODE_GUIDE.md`의 현재 파일 지도를 따른다. 파일 크기는 유지보수 부담을 가늠하는 값이며, 실행 속도 저하를 뜻하지 않는다.

## 현재 주의점과 미완성 영역

- 이번 덱 편집·입력·미리보기 분리에서 `npx tsc --noEmit`, `npm run lint`, `npm test`, GitHub Pages 빌드가 통과했다. 린트에는 기존 미사용 코드·훅 의존성 경고가 남아 있다.
- 4~7지역은 지도 틀만 있고 적 풀과 보스가 없다.
- 전설 카드는 정의되어 있지만 일반 플레이 획득 경로가 없다.
- 진행 저장은 맵 화면만 포함한다. 전투 상태와 덱 편집 상태는 새로고침 뒤 복원되지 않는다.
- 저장 스냅샷 직렬화와 구버전 복원값 정규화는 `tests/run-save-state.test.mjs`에서 확인한다.
- 광범위한 카드 효과와 지도 노드 UI는 적·오버맵 규칙만큼 독립 테스트가 촘촘하지 않다.
- `tests/deck-editor-rules.test.mjs`는 `npm test`의 규칙 테스트 묶음에 포함되어 있다.
- 무작위 보상과 덱 생성은 `Math.random()` 의존 구간이 많아 재현 테스트가 어렵다.
- 이 문서는 2026-10-03 현재 작업 트리의 코드와 문서를 대조해 갱신했다.
- 작업 트리에 사용자 미커밋 변경이 많을 수 있으므로 파일을 수정하기 전에 반드시 상태와 diff를 확인한다.

## 권장 다음 순서

1. 현재 미커밋 코드 변경을 린트·테스트·Pages 빌드로 확인한다.
2. 1~3지역을 실제로 연속 플레이해 적별 승률, 턴 수, 받은 피해와 카드 사용 기록을 수집한다.
3. 1~3지역 보스 처치, 안전 지역 잠금 해제, 다음 지역 이동을 직접 확인한다.
4. 흙·돌·유독성 점액·파일 버리기·가호·가시가 리셔플과 애니메이션에서 일관적인지 확인한다.
5. 전설 카드의 일반 획득 경로를 넣을지, 디버그·미래 콘텐츠로 유지할지 결정한다.
6. 4지역을 추가하기 전에 카드 데이터와 전투 규칙 분리를 검토한다.
7. 지도·전투의 남은 이벤트 연결은 크기보다 상태와 동작의 소유권이 함께 이동하는지 살펴보고 분리한다.

## 확인 명령

```powershell
npm run lint
npm test
node --experimental-strip-types --test tests/deck-editor-rules.test.mjs
$env:GITHUB_ACTIONS='true'; npm run build:pages
```

## 주소

- 저장소: https://github.com/dhwangdo/ruinfall
- 공개 게임: https://dhwangdo.github.io/ruinfall/

- `main`에 push하면 GitHub Pages 배포를 시도한다.
- GitHub Actions가 runner `startup_failure`로 시작하지 못한 사례가 있으므로, 배포 실패 시 로컬 코드 실패와 GitHub 인프라 실패를 구분한다.
