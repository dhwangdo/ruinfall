# Godot 코드 안내

현재 게임은 Godot 4와 GDScript로 구현한다. `godot/project.godot`이 프로젝트 설정이고 `godot/scenes/main.tscn`이 시작 장면이다. 웹과 Windows 빌드가 같은 장면과 스크립트를 사용한다.

## 주요 폴더

O 탐사 시작/중지·일반 이동·클릭 자동이동·이동 불가·한 턴 쉼은 main의 `_refresh_map_after_turn`으로 기존 지도·미니맵·HUD·버튼을 유지한 채 데이터와 그리기만 갱신한다. `_map_hud`는 체력·골드·열쇠와 레이아웃 키를 보관하며 `_clear_screen`에서 비운다. 지도 시드·디버그 표시·최대 체력·상태 배지 구성이 달라지거나 다른 화면에서 돌아오면 기존 `_show_map`으로 새 화면을 만든다. `map_incremental_refresh_probe.gd`에서 이동/O/대기 중 같은 노드 유지, 수치/미니맵 갱신, 전투 충돌과 화면 복귀를 검사한다.

둥근 덱 선택 버튼은 `map_deck_selector_trigger.gd`에서 6px 이상 포인터 이동 시 위치 드래그로 처리하고 단순 클릭은 기존 덱 메뉴를 연다. 버튼은 지도 영역 안으로 제한하며 드래그 후 메뉴가 열리지 않게 한다. main은 위치를 지도 내 가용 영역의 상대 좌표로 `deck_selector_position_ratio` 설정에 저장해 화면 재생성·재실행·창 크기 변경 후 복원한다. `map_deck_selector_drag_probe.gd`에서 클릭 구분·화면 경계·저장 좌표·크기 변경·클릭 메뉴를 검사한다.

제단(`stickerAltar`)은 DCSS CC0의 `assets/terrain/dcss/makhleb_flame1.png`를 사용한다. 지도와 검색 타일은 `map_tile_appearance.gd.draw_altar`를 공유하며 제단 글자 배지를 대신한다. 불꽃 타일 한 프레임을 정적으로 표시하며 지도에서는 nearest 개체 레이어에 그린다.

검색 결과 행은 종류와 관계없이 같은 배경·선택 테두리, 106px 기본 높이, 10px 안쪽 여백, 우측 82×82 미리보기 칸을 사용한다. 금고·바닥 덱·카드·티켓·장소는 이 칸 안에서 각각의 그림을 표시한다. 목록의 세로 스크롤 공간은 항상 확보해 탭마다 행 너비가 달라지지 않게 한다. 에디션 표시는 목록에서 최대 두 줄 영역으로 제한하고 전체 내용은 오른쪽 상세 영역에서 확인한다.

덱 금고는 `deck_icon_art.gd`의 검은 정사각형 판·주황 테두리·은회색 덱 그림으로 표시한다. 원본 덱 PNG에서 흑백 팔레트 텍스처를 한 번 생성해 캐시하며 자물쇠는 추가하지 않는다. 지도와 검색 타일이 `map_tile_appearance.gd.draw_vault_symbol`을 공유한다. 지도에서는 nearest 필터를 쓰는 개체 레이어에 그려 다른 지도 자산의 필터에는 영향을 주지 않는다.

맵 바닥 덱·실제 덱 선택 버튼(`map_deck_selector_trigger.gd`)·소지/바닥 덱 머리글·양방향 드래그 미리보기는 `deck_icon_art.gd`의 DCSS 희귀 덱 PNG를 공유한다. 구형 `map_deck_selector.gd`는 현행 main의 버튼이 아니다. `shaders/deck_palette.gdshader`로 검은 표지·주황 테두리·낮은 대비의 문양을 표시하며 원본 PNG는 보존한다. 지도는 전용 FloorDeckIcons 레이어에만 셰이더와 nearest 필터를 적용하고 그림/클릭 범위는 같은 floor_rect(타일 폭 60%)를 사용한다. 둥근 선택 버튼의 외부 그림자는 제거했다. 머리글은 자물쇠가 있으면 36px, 없으면 44px 아이콘을 왼쪽에 놓고 글자 공간을 확보한다. 출처는 `godot/assets/ui/dcss/PROVENANCE.md`에 있다.

몬스터 타일은 `enemy_tile_art.gd`의 이름별 매핑으로 관리한다. 현행 카탈로그 적 28종과 소환되는 새끼 바퀴에 DCSS 공식 CC0 배포본 PNG를 사용한다. 출처·원본 경로는 `godot/assets/enemies/dcss/PROVENANCE.md`에 기록한다. `battle_enemy_portrait.gd`는 기존 의도/행동 연출 안에서 그림만 교체하고, 향후 추가되는 미매핑 적은 기존 그림을 사용한다. 지도는 조우의 모든 적을 마릿수대로 겹쳐 그리며 세 마리 이상은 타일 좌우로 약간 돌출될 수 있다. 지도 이름은 표시하지 않고 인지 상태(Zzz/!/?)만 작은 배지에 표시하며 기억 속 적은 흐리게 그린다. 픽셀 그림에만 nearest 필터를 적용하고 다른 지도 자산이나 글꼴에는 적용하지 않는다. `enemy_tile_art_probe.gd`가 전체 조우의 매핑·다수 표시·겹침·필터를 검사하며 `enemy_tile_gallery.gd`는 전체 그림 미리보기를 생성한다.

- `godot/scenes/`: 시작 장면과 장면 구성
- `godot/scripts/`: 게임 규칙, 입력, 화면과 애니메이션 스크립트
- `godot/assets/`: 폰트, 카드 뒷면, 스티커와 UI 자산
- `godot/shaders/`: 화면 효과 셰이더
- `godot/tests/`: Godot에서 직접 실행하는 규칙·입력 probe
- `godot/export_presets.cfg`: Windows와 Web 내보내기 설정
- `.github/workflows/deploy-pages.yml`: Godot Web 빌드와 Pages 배포

게임 화면 우측 하단에는 빌드에 포함된 Git 커밋 해시와 커밋 시각(KST)이 표시된다. 웹·Windows 내보내기는 `scripts/generate_build_info.gd`가 빌드 직전 정보를 생성하며, 편집기 실행은 현재 저장소에서 직접 읽는다.

## 코드 읽는 순서

전투 배경은 화면 가장자리까지 녹색으로 채운다. `battle_board_layout.gd`는 파일·손패의 공통 가로 중심을 화면 폭 46%에 두고, 오른쪽 25%(200~320px)를 적 전용으로 분리한다. 파일 영역과 적 영역 사이에는 24px 간격을 두며 높이가 달라도 가로 범위가 겹치지 않는다. 적은 좁힌 두 열과 엇갈린 행에 배치한다. 덱·파일·버린 카드 버튼은 좌측 상단, 에너지와 별은 좌측 하단에 둔다. `battle_files_layout.gd`는 확보된 영역 안에서 파일을 비율 축소하고 60%로도 들어가지 않을 때 스크롤한다. 파일에서 스크롤로 가려진 부분은 적 영역에 표시되지 않는다.

`battle_enemy_target_area.gd`는 몬스터 그림 중심의 96×96 논리 픽셀 정사각형을 반환한다. 적 배치의 축소율과 함께 줄어들며 클릭·드래그·숫자키 카드 사용이 같은 판정을 쓴다. 이름·체력바·상태 배지와 빈 버튼 공간은 공격 대상 범위를 넓히지 않는다. 호버 테두리도 이 정사각형에 그린다. `battle_enemy_spacing_probe.gd`가 여러 창 크기/적 수에서 가로 분리·공통 중심·판정 비중첩·그림 클릭 허용/체력바 클릭 배제를 검사한다. 손패 카드를 파일로 옮기는 연출은 최종 파일 배치를 먼저 계산하고 그 위치로 이동해 동적 크기 변경 뒤 착지 점프를 방지한다.

`main.gd`는 현재 게임 상태와 화면을 연결하는 진입점이다. 카드 사용 분류는 `card_use.gd`, 지도 규칙은 `map_*.gd`, 전투 동작과 표현은 `battle_*.gd`, 카드 정의와 시각화는 `card_*.gd` 및 `deck_*.gd`에서 찾는다. 가능한 경우 입력 연결, 순수 규칙, 애니메이션 표현을 각각 담당하는 스크립트를 따라가며 읽는다.

`battle_rules.gd`의 `_resolve_enemies_turn`은 모든 적의 공격을 먼저 처리하고 기존 약화·취약을 감소시킨 뒤 공격 외 효과를 실행한다. 단일 적과 다중 적이 같은 처리 경로를 사용한다. 저장된 행동 데이터의 `next_turn_player_weak_gain`·`next_turn_player_vulnerable_gain` 키는 유지하지만 현재 의미는 공격 후 효과 단계에서 즉시 부여다. `battle_turn_presentation.gd`는 이 순서의 steps를 재생하며, `battle_enemy_strike.gd`는 공격·플레이어 디버프에 왼쪽 28px 전진과 복귀(350ms), 버프에 108% 확대와 복귀(180ms)를 적용한다. 자신에게 거는 디버프와 행동 취소는 전진하지 않는다. `tests/battle_enemy_phases_probe.gd`에서 단계 순서·지속시간·행동 취소·자폭·소환·전체 조우를 검사한다.

방어 수치는 `player_block` 하나만 사용한다. 카드의 방어 획득은 `_resolve_card_play`의 명시적 효과 목록에서 판정한다. `_discard_card`는 명시적인 버리기에서만 탁월수(내부 effect `saeongjima`)와 이계의 힘(`recycling`)을 발동하며 손패의 버리기 비용·파일 버리기·적의 파일 버리기가 같은 경로를 사용한다. 턴 종료 손패 정리는 이 발동 플래그를 전달하지 않는다. 소원은 `wish_random_state`에 난수 상태를 보관한다. `tests/card_rebalance_probe.gd`에서 카드 효과·재련 반복·버리기 경로·소원 연속 사용·삭제 풀을 검사한다.

`battle_status_rules.gd`는 플레이어 디버프 5종과 마법 저항의 부여·해제·감소·마비 제한을 담당한다. 카드의 `remove_player_debuffs`는 공격 계산 전에 적용하며, `grants_block`은 방어 획득, `magic_resistance`·`temporary_magic_resistance`는 각각 전투 지속·이번 턴 저항이다. 일반 턴과 추가 턴 모두 `begin_turn`에서 임시 저항과 사용 횟수를 초기화한다. 적 행동의 `player_<kind>_gain` 필드를 공통 부여 경로로 처리하며 기존 `next_turn_player_<kind>_gain` 필드도 읽는다.

적 패턴은 `enemy_catalog.gd`에 정의한다. 저주술사는 기본 피해 12와 각 디버프 2를 조합한 행동 5개를 가지며 `random_each_turn`으로 다음 의도를 미리 결정한다. `_spawn_enemy_minions`는 공격·효과 단계 이후에 한 번에 2마리를 제한 없이 추가한다. 새끼 기본 수치는 카탈로그의 `ROACH_SUMMON_COUNT`·`ROACH_BASE_HP`·`ROACH_BASE_DAMAGE`로 공유하며 의도와 디버그 설명도 같은 값을 읽는다. 산적 삭제 후 1지역 조우 선택은 `REGION_ONE_PAIR_IDS`의 유효한 12개 번호만 사용한다. `_region_one_pair_blueprints`는 생존 적의 기존 번호를 유지하고 삭제 조우 번호는 현재 조우로 대체한다. `tests/enemy_pattern_rework_probe.gd`에서 패턴, 저주 의도/부여 일치, 소환 제한 해제, 소환 턴 행동 금지, 보정과 조우 풀을 검사한다.

`pending_after_play_card_id`는 강제 선택까지 완료한 뒤 실행할 혼란을 지연한다. `_finish_card_effects`는 최종 혼란 유무를 재검사하고 실제 손패 전체(예약 카드 포함)에서 선택하며, 사용한 카드는 제외한다. `confusion_sequence`와 `last_confusion_discard_id`를 큐가 관찰해 예약 카드가 버려졌을 때 실행 중인 항목을 제외한 예약을 모두 해제한다. 남은 카드의 효과·비용을 미리 적용하지 않으므로 롤백은 필요하지 않다. `tests/battle_status_rework_probe.gd`는 규칙을, `tests/battle_status_queue_probe.gd`는 실제 전투 UI에서 혼란 예약 취소와 마비 제한을 검사한다.

텍스트는 MSDF를 켠 Godot 기본 렌더링을 사용한다. 일반형 카드는 이름 Pretendard 18/800, 효과 마루 부리 13/400, 효과의 키워드·숫자 마루 부리 13/700으로 고정한다. card_visual_scale.gd가 동일한 카드 전체를 비율로 확대·축소하며 화면별 폰트 크기를 별도로 지정하지 않는다. 간소화 카드는 기존 Pretendard 글꼴·크기·굵기를 독립적으로 유지한다. 툴팁은 제목 마루 부리 700, 본문 Pretendard 500, 크기 14로 고정하며 설정에서 변경하지 않는다. 글꼴은 card_typefaces.gd, 라이선스는 assets/fonts/licenses/에 있다.

`keyword_colors.gd`는 승인된 카드 키워드 고정 색상을 관리한다. 방어 #a65416, ★ #89601e, 마법 저항 #345e9b, 나머지 #242620이며 예전 저장 설정은 읽지 않는다. `card_description_text.gd`는 원문을 한 번 토큰화해 숫자 강조·별 글꼴·리터럴 괄호를 보존하며 이 색을 적용한다. 색상 설정 UI는 제거했다.

GDScript의 `Dictionary`와 `Array`는 실행 중 바뀌는 게임 데이터를 담고, `Control` 노드는 화면의 UI 요소다. signal은 버튼·드래그·애니메이션 완료처럼 한 노드에서 일어난 일을 다른 코드에 전달한다. `preload("res://...")`는 Godot 프로젝트 안의 자원을 미리 연결한다.

`battle_play_queue.gd`는 카드 사용 연출 중 다음 카드 사용 입력을 FIFO로 보관한다. 카드 ID·지정한 적·놓은 위치만 예약하며, 실제 차례에 손패·비용·대상 생존 여부를 다시 검사한다. 같은 카드의 중복 예약을 막고 유효하지 않은 예약은 취소한다. 앞 카드가 추가 선택을 요구하더라도 사용 연출 중에는 다음 입력들을 접수하고, 강제 드로우·버리기·파일 선택은 실행만 대기시킨다. 전투·턴이 바뀌면 남은 예약을 버린다. 연출이 끝날 때 다음 카드를 들고 있다면 놓거나 취소할 때까지 손패 재생성을 기다린다. 규칙은 한 장씩 처리하며 파일 이동·턴 종료는 함께 예약하지 않는다. 카드 사용 연출은 캡처한 pose·size에서 시작하며 투명한 ReleasedCardSource 노드를 만들지 않는다. 예약 카드는 손패에서 즉시 빠져 battle_play_queue_view.gd의 중앙 대기열에 22px씩 겹쳐 쌓인다. 처리 후 남은 카드가 함께 한 칸 올라오는 Tween이 완료되면 다음 카드를 처리한다. 우측 하단 퇴장 구간은 90ms다. 대기열과 복귀 연출 노드는 입력을 받지 않는다. `tests/battle_play_queue_probe.gd`는 순서·재검증을, `tests/battle_play_queue_pointer_probe.gd`는 첫 연출 완료 전 실제 드래그·놓기 5회 접수를 검사한다(`--untargeted`, `--discard-first` 변형 포함).

## 실행

상위 지역 금고 배경은 `future_vault.gdshader`가 밝은 파랑~남색 대각 그라데이션을 18초 주기로 이동시킨다. 지도는 별도 `FutureVaultBackgrounds` 레이어, 검색 타일은 배경 자식 레이어에서 같은 재질을 사용한다. 아이콘·금색 테두리는 고정 레이어에 두며 애니메이션 때문에 지도 전체를 매 프레임 다시 그리지 않는다.

`deck_vault_rules.gd`는 금고의 위치·지도 시드 기반 지역 보너스(각 1.5%로 +1/+2)와 열쇠 비용(3/6/9), 실제 덱 생성을 공유한다. `map_vault_preview_data.gd`와 main의 최초 방문이 같은 생성 함수를 사용한다. 저장된 덱의 `vault_region_offset`은 비용·외형을 유지하며 기존 저장에 이 필드가 없으면 일반 금고로 취급한다. 지도·검색은 동일 규칙으로 남색/금색 타일을 선택한다. `future_deck_vault_probe.gd`는 미리보기·저장·개방 비용·중복 보상을 검사한다.

에디션 갱신(2026-11-18): `DeckEditions.rare_slot_capacity`가 로열의 최종 용량 슬롯 전환을 편집·검색·금고 미리보기에서 공유한다. 생성 시에는 원래 y1/y2에 따른 카드 구성을 만든 뒤 슬롯만 전환한다. `main._deck_allows_free_edit`는 해당 덱의 제거·이동·열린 자물쇠에만 적용한다. `battle_rules.effective_card_cost`는 거인의 대상을 `base_cost`(없으면 `cost`)로 판단한다. 금속학은 솔리테어 재련과 전투 시작 자동망치에 연결하며 후자는 파일 수를 유지한 채 재련 카드를 회수한다. 에디션 목록 변경에 맞춰 최대 엔트로피 계수표도 재생성했다. `battle_editions_rework_probe.gd`, `deck_edit_editions_probe.gd`, `deck_generation_editions_probe.gd`가 각각 전투 효과·편집/UI·생성을 검사한다.

무작위 덱 생성은 `card_catalog.gd`의 `roll_region_shape`와 `create_region_deck`에서 예산·슬롯·스티커·용량 재생성을 처리한다. `deck_editions.gd`가 1·2·3점 등급 우선 추첨과 이름·설명·색상을 공유한다. 전투 효과는 `battle_rules.gd`에 연결되며 광채 생성은 `_create_battle_radiance`를 거친다. `solitaire_rules.gd`가 표시·검증·소모에 같은 에디션 할인을 적용한다. `battle_status_rules.gd`는 마법 저항 판정과 매 턴 에디션 사용 플래그 초기화를 함께 처리한다. 귀속 카드의 `edition_bound` 필드는 `deck_editor_rules.gd`, `main.gd`, `sticker_services.gd`에서 편집 제한에 사용한다. `deck_generation_editions_probe.gd`, `battle_editions_rework_probe.gd`, `deck_bound_edit_probe.gd`로 생성·전투·편집 경로를 검사한다.

Godot 4.7.2 이상에서 `godot/project.godot`을 열거나 저장소 루트의 `godot/Run RUINFALL.cmd`를 사용한다. 내보내기는 `godot/README.md`의 Web·Windows 안내와 `godot/export_presets.cfg`를 따른다.

과거 React 구현의 설명은 [legacy-web 보관본](../archive/legacy-web/docs/CODE_GUIDE.md)에 남아 있다. 그것은 현재 구조 안내가 아니다.

숫자키 선택은 누른 시점부터 300ms 동안 키를 먼저 떼어도 클릭 사용을 허용한다. 기한까지 클릭하지 않으면 자동 복귀하며, 오래 누른 뒤 떼기와 우클릭·Esc 취소는 즉시 처리한다. battle_keyboard_drag.gd의 KEY_CLICK_GRACE_MS가 유예 시간이며 tests/battle_keyboard_grace_probe.gd에서 실제 키·클릭 입력과 이전 타이머의 간섭을 검사한다.

디버그 도구 모음의 카드 선택은 고정 폭이며 `fit_to_longest_item=false`로 둔다. 닫힌 선택창의 너비를 정하려고 전체 카드 이름을 미리 측정하면 첫 진입이 느려진다. ALL 덱은 `map_debug_actions.gd`의 명시적 생성 버튼으로만 지급한다. 덱 습득 경로는 `_register_acquired_deck_origins`로 열린 편집 세션의 카드 출처를 등록하며 기존 임시 추가 기록은 보존한다. `debug_entry_and_pickup_probe.gd`에서 이 동작을 검사한다.

덱 생성 분포는 `deck_generation_model.gd`와 `assets/data/deck_maxent.json`이 담당한다. `tools/build_deck_maxent.py`가 1~10지역의 유한 정수 격자에서 최대 엔트로피 계수를 맞추고 `docs/data/deck-maxent-validation.json`에 정확한 모멘트·주변분포·경계 질량을 기록한다. 실행 시 독립 제안 분포와 Young 부등식으로 만든 상계를 사용해 정확히 기각 추출한다. 평균 주변 두 정수/0·큰 값 혼합 및 교환은 검증 지역에서 제거했다. 다른 방향 분산 여유는 5%이며 최소 방향은 (12,8,6,15,5)다. 11지역부터는 교환 없는 기존 정수 모멘트 추첨으로 대체하므로 동일 분포 보장은 없다.

`card_catalog.gd`는 결정된 벡터를 유지하며 실제 카드와 스티커를 배치한다. 귀속 전설 슬롯은 y1·y2의 목표와 점수에 포함하지 않는다. `deck_maxent_probe.gd`는 실제 기각 추출 10만 회의 평균·공분산·점수 편차와 유효성을 검사한다. `deck_generation_editions_probe.gd`는 실제 카드 배치·에디션 정확한 점수 사용·ID·스티커·결정성을 검사한다. 두 export preset의 include_filter가 JSON 계수표를 포함한다.

모바일 웹의 LineEdit 입력은 Web export의 가상 키보드 브리지가 필요하다. `export_presets.cfg`에서 `html/experimental_virtual_keyboard=true`를 유지하고 디버그 숫자 입력의 `virtual_keyboard_type`은 NUMBER로 설정한다. `debug_number_input_probe.gd`는 설정·Unicode 입력·포커스 유지·생성 payload를 검사한다. 실제 모바일 OS 키보드의 브라우저 전달은 기기 확인이 필요하다.

`map_rules.gd`의 `display_visibility`는 일반 모드에서는 기존 시야를 반환하고 디버그에서는 벽을 무시한 반경 9의 19×19 표시 시야를 만든다. 저장 데이터는 수정하지 않는다. `map_view.gd`, `map_minimap.gd`, `map_vault_preview_data.gd`가 공유하며 `debug_vision_probe.gd`에서 경계·벽·이동·적·금고 표시 및 탐색 기록 보존을 검사한다.

`map_rules.gd.remember_visible_vaults`는 지도 표시 시 최초 관측한 금고 위치를 `known_deck_vaults`에 기록한다. 전체 디버그 시야를 seen에 영구 반영하지 않는다. 검색은 이 기록과 seen을 합치고, 방문 전 금고도 `map_vault_preview_data.gd`로 위치 시드 기반 내용을 조회한다. 실제 deck_vaults나 next_card_id는 수정하지 않는다. `map_search_panel.gd`는 결과를 24개씩 페이지로 표시하고 검색 필터는 전체 데이터에 적용한다. 정렬 키와 행 식별자는 인덱스 작성 때 계산해 반복 문자열 작업을 줄인다. `map_search_discovery_probe.gd`가 발견·저장복원·ID 비소모·500개 전체 검색과 페이지 제한을 검사한다.

`main.gd.auto_explore_surveyed_rooms`는 O 호출 사이 조사 기록을 보관한다. `_start_auto_travel`은 새 progress의 surveyed_rooms에 이 사전을 연결하고 경로·위험 이력만 재생성한다. progress.clear()는 조사 기록 사전을 지우지 않는다. 새 게임·불러오기·지도 시드 변경과 함께 호출되는 `_reset_auto_explore_capture`에서 기록을 초기화한다. `auto_explore_memory_probe.gd`는 캡처에서 축소한 두 칸 왕복 지도에서 O 6회 재시작·중단·골드 생성·지도 초기화를 검사한다. 탐사 이득 추정의 시야 계산은 별도 로직으로 유지한다.

변환기는 DCSS 루의 제단(ru.png), 포탈·안전 포탈은 지구라트 문(zig_portal.png)을 표시한다. ROOM_TEXTURES와 draw_room_art를 통해 지도 nearest 개체 레이어와 검색 타일에서 같은 그림을 타일 폭 90%로 그린다.

간소화 카드는 CompactCardView.create의 단일 82×82 크기·글꼴·희귀도 띠 서식을 사용한다. 서비스 창 카드 목록도 인벤토리와 같은 크기이며 컨테이너가 카드를 늘리지 않는다. 지도에 떨어진 카드는 이 서식을 지도 배율에 맞춰 그린다. 30% 회복 타일은 blue_fountain.png, 100% 회복 타일은 sparkling_fountain2.png를 지도·검색에서 공유한다.
