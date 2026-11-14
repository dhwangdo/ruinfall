extends Control

const CardUse = preload("res://scripts/card_use.gd")

const CardCatalog = preload("res://scripts/card_catalog.gd")
const DeckEditions = preload("res://scripts/deck_editions.gd")
const DeckEditorRules = preload("res://scripts/deck_editor_rules.gd")
const MapRules = preload("res://scripts/map_rules.gd")
const MapView = preload("res://scripts/map_view.gd")
const MapVisualMotion = preload("res://scripts/map_visual_motion.gd")
const MapDebugControllerScript = preload("res://scripts/map_debug_controller.gd")
const MapEncounterTransition = preload("res://scripts/map_encounter_transition.gd")
const BattleTurnPresentation = preload("res://scripts/battle_turn_presentation.gd")
const MapWaitNotice = preload("res://scripts/map_wait_notice.gd")
const MapStatusBadges = preload("res://scripts/map_status_badges.gd")
const MapDeckSelector = preload("res://scripts/map_deck_selector_trigger.gd")
const MapDeckVaultPreview = preload("res://scripts/map_deck_vault_preview.gd")
const MapVaultPreviewData = preload("res://scripts/map_vault_preview_data.gd")
const DeckVaultCardView = preload("res://scripts/deck_vault_card_view.gd")
const DeckVaultModal = preload("res://scripts/deck_vault_modal.gd")
const DeckCaseHeadingScript = preload("res://scripts/deck_case_heading.gd")
const DeckVaultReleaseNotice = preload("res://scripts/deck_vault_release_notice.gd")
const DeckEditorHeadingFont = preload("res://assets/fonts/PretendardVariable700.tres")
const MapTravel = preload("res://scripts/map_travel.gd")
const MapEnemies = preload("res://scripts/map_enemies.gd")
const BattleRules = preload("res://scripts/battle_rules.gd")
const EnemyCatalog = preload("res://scripts/enemy_catalog.gd")
const KarmaRules = preload("res://scripts/karma_rules.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const StickerServices = preload("res://scripts/sticker_services.gd")
const MapMinimap = preload("res://scripts/map_minimap.gd")
const MapSearchRules = preload("res://scripts/map_search_rules.gd")
const MapSearchPanel = preload("res://scripts/map_search_panel.gd")
const MapSettingsPanel = preload("res://scripts/map_settings_panel.gd")
const RunResetHoldScript = preload("res://scripts/run_reset_hold.gd")
const RunShortcutsScript = preload("res://scripts/run_shortcuts.gd")
const BattleDropButtonScript = preload("res://scripts/battle_drop_button.gd")
const BattleDropStyle = preload("res://scripts/battle_drop_style.gd")
const BattleCardDragSourceScript = preload("res://scripts/battle_card_drag_source.gd")
const CompactCardView = preload("res://scripts/compact_card_view.gd")
const DeckEditorEmptySlotScript = preload("res://scripts/deck_editor_empty_slot.gd")
const SolitaireRules = preload("res://scripts/solitaire_rules.gd")
const BattleSetup = preload("res://scripts/battle_setup.gd")
const BattleBoardLayoutScript = preload("res://scripts/battle_board_layout.gd")
const BattleEnemyView = preload("res://scripts/battle_enemy_view.gd")
const BattleHPBar = preload("res://scripts/battle_hp_bar.gd")
const CardBackTexture = preload("res://assets/card-back-basic.png")
const BattleFileDiscardWarning = preload("res://scripts/battle_file_discard_warning.gd")
const BattleHandFanScript = preload("res://scripts/battle_hand_fan.gd")
const BattleDrawPresentationScript = preload("res://scripts/battle_draw_presentation.gd")
const BattleCardPresentationScript = preload("res://scripts/battle_card_presentation.gd")
const BattleForgePresentationScript = preload("res://scripts/battle_forge_presentation.gd")
const PendingRemovalEffectScript = preload("res://scripts/pending_removal_effect.gd")
const CardTooltipControllerScript = preload("res://scripts/card_tooltip_controller.gd")
const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")
const StickerArtScript = preload("res://scripts/sticker_art.gd")
const DeckEditionList = preload("res://scripts/deck_edition_list.gd")
const BattleFreePlayDrop = preload("res://scripts/battle_free_play_drop.gd")
const BattleChoiceFocus = preload("res://scripts/battle_choice_focus.gd")
const BattleKeyboardDrag = preload("res://scripts/battle_keyboard_drag.gd")
const BattleHoldGuide = preload("res://scripts/battle_hold_guide.gd")
const StickerServiceSlotDropTarget = preload("res://scripts/sticker_service_slot_drop_target.gd")
const BattleEnergyOrbScript = preload("res://scripts/battle_energy_orb.gd")
const BattleEnemyPortraitScript = preload("res://scripts/battle_enemy_portrait.gd")
const BattleDefenseShieldScript = preload("res://scripts/battle_defense_shield.gd")
const ResultArrowScript = preload("res://scripts/result_arrow.gd")
const CardMechanicPreview = preload("res://scripts/card_mechanic_preview.gd")
const CardKeywords = preload("res://scripts/card_keywords.gd")
const ConsumableTicketVisual = preload("res://scripts/consumable_ticket_visual.gd")
const CardDescriptionText = preload("res://scripts/card_description_text.gd")
const CardHoverPreview = preload("res://scripts/card_hover_preview.gd")
const BattleCardPreview = preload("res://scripts/battle_card_preview.gd")
const RunCardDropAreaScript = preload("res://scripts/run_card_drop_area.gd")
const DeckCaseDragButtonScript = preload("res://scripts/deck_case_drag_button.gd")
const DeckCaseDropAreaScript = preload("res://scripts/deck_case_drop_area.gd")
const ServiceCardRemovalDropAreaScript = preload("res://scripts/service_card_removal_drop_area.gd")

const COLOR_BG := Color("#111512")
const COLOR_PANEL := Color("#1b201d")
const COLOR_PANEL_HIGHLIGHT := Color("#282e2a")
const COLOR_BATTLE_FELT := Color("#365b46")
const COLOR_BORDER := Color("#676a5a")
const COLOR_TEXT := Color("#e8e5dd")
const COLOR_MUTED := Color("#a7aa9f")
const COLOR_GOLD := Color("#f0c646")
const COLOR_ORANGE := Color("#ef8129")
const COLOR_RED := Color("#b43f4a")
const COLOR_CARD := Color("#e1dfd8")
const STICKER_SERVICE_FONT: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")
const WEB_UI_FONT: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")
const RUN_SAVE_PATH := "user://run_state.save"
const SETTINGS_PATH := "user://settings.cfg"
const INVENTORY_CAPACITY := 15
const MAX_OWNED_DECKS := 3
# Mirror the browser file cards: 120.9×170px cards with 27px exposed per layer.
const PILE_CARD_WIDTH := 121.0
const PILE_CARD_HEIGHT := 170.0
const PILE_CARD_SCALE := 0.89
const PILE_STACK_OFFSET := 27.0
var run_state: Dictionary = {}
var battle_state: Dictionary = {}
var screen_name := "title"
var selected_source: Dictionary = {}
var selected_battle_hand_card_id := -1
var battle_hand_card_widgets: Dictionary = {}
var battle_keyboard_drag := BattleKeyboardDrag.new()
var battle_draw_presentation := BattleDrawPresentationScript.new()
var battle_card_presentation := BattleCardPresentationScript.new()
var battle_forge_presentation := BattleForgePresentationScript.new()
var card_info_tooltip := CardTooltipControllerScript.new()
var battle_turn_resolving := false
var battle_session_generation := 0
var battle_turn_presentation := BattleTurnPresentation.new()
var battle_enemy_widgets: Dictionary = {}
var active_battle_player_hp: ProgressBar
var active_battle_player_hp_text: Label
var active_battle_defense_strip: VBoxContainer
var battle_pile_widgets: Array[Control] = []
var active_battle_hand_area: Control
var active_battle_play_area: Control
var active_battle_end_button: Button
var battle_free_play_drop := BattleFreePlayDrop.new()
var battle_piles_scroll: ScrollContainer
var active_card_hover_preview: Control
var extraction_ticket_mode := false
var extraction_ticket_source := "inventory"
var extraction_ticket_id := ""
var deck_editor_session_active := false
var deck_editor_selected_deck_id := ""
var deck_editor_origins_by_card_id: Dictionary = {}
var deck_editor_high_rarity_return_area_by_card_id: Dictionary = {}
var deck_editor_pending_removals: Array[Dictionary] = []
var deck_editor_effect_started_usec := -1
var safe_area_unlock_pending_animation := false
var notice := ""
var reward_cards: Array[Dictionary] = []
var reward_random := RandomNumberGenerator.new()
var map_camera_center := Vector2(106.5, 0.5)
var map_visual_motion: RefCounted = MapVisualMotion.new()
var map_debug_controller := MapDebugControllerScript.new()
var map_visual_motion_seed := -1
var pending_map_camera_duration_ms := 0.0
var map_zoom := 85.0
var active_map_view: Control
var active_map_surface: Control
var active_map_deck_selector_host: Control
var active_map_deck_selector: Button
var active_map_wait_button: Button
var active_map_search_button: Button
var active_map_wait_notice: Control
var active_vault_release_notice: Control
var active_map_vault_preview: Control
var map_vault_preview_position := Vector2i(-1, -1)
var map_vault_preview_anchor := Rect2()
var pointer_position := Vector2.ZERO
var map_encounter_generation := 0
var active_map_minimap: Control
var map_settings_overlay
var active_map_search_panel: Control
var run_reset_hold := RunResetHoldScript.new()
var active_restart_progress: Control
var player_name_setup_overlay: Control
var deck_editor_overlay: Control
var gold_popup_pending := 0
var auto_travel_active := false
var auto_travel_elapsed := 0.0
var auto_travel_step_interval := 0.023
var auto_travel_path: Array[Vector2i] = []
var auto_travel_route_needs_refresh := false
var auto_travel_step_in_progress := false
var auto_travel_progress: Dictionary = {}
var auto_explore_capture_history: Array[Dictionary] = []
var auto_explore_capture_session: Dictionary = {}
var auto_explore_capture_seed := -1
var auto_explore_capture_steps := 0
var auto_explore_capture_written := false
var auto_explore_capture_path := "user://auto_explore_cross_session_capture.save"
var map_travel_active := false
var map_travel_elapsed := 0.0
var map_travel_step_interval := 0.14
var map_travel_path: Array[Vector2i] = []
var map_travel_target := Vector2i(-1, -1)
var map_travel_step_in_progress := false
var map_ping_position := Vector2i(-1, -1)
var map_ping_label := ""
var active_service_kind := ""
var active_service_position := Vector2i.ZERO
var service_selected_card_ids: Array[int] = []
var service_transmuter_preview: Dictionary = {}
var service_preview_elapsed := 0.0
var service_preview_host: Container
var service_apply_button: Button
var sticker_service_overlay: Control
var service_feedback := ""
var pending_portal_type := ""
var minimap_player_marker := "cross"
var minimap_size := Vector2(245.0, 245.0)
var minimap_position := Vector2(20.0, 16.0)
var minimap_zoom := 1.0
var minimap_view_offset := Vector2.ZERO
var settings_return_screen := "map"
var battle_deck_check_enabled := true
var animation_tooltips_enabled := true
var pending_battle_deck_id := ""
var pending_battle_enemy_position := Vector2i(-1, -1)
var battle_card_ledger_open := ""
var blue_tooltip_theme: Theme
var battle_card_name_font: FontVariation
var battle_card_cost_font: Font
var battle_card_body_font: FontVariation
var battle_card_emphasis_font: FontVariation
var deck_editor_card_name_font: FontVariation
var map_currency_font: FontVariation
var map_health_font: Font
var map_control_font: Font
var mechanic_tooltip_overlay: Control
var mechanic_tooltip_anchor: Control
var run_map_generation_job: RefCounted

const DECK_VAULT_KEY_COST := 3


func _ready() -> void:
	if not OS.has_feature("web"):
		DisplayServer.window_set_title("RUINFALL")
	get_viewport().size_changed.connect(_clear_map_vault_preview)
	get_viewport().size_changed.connect(card_info_tooltip.clear)
	_install_theme()
	_load_settings()
	if FileAccess.file_exists(RUN_SAVE_PATH):
		_load_saved_run()
	else:
		_start_run()


func _exit_tree() -> void:
	map_debug_controller.reset()
	if screen_name == "runLoading":
		battle_session_generation += 1
	if run_map_generation_job != null:
		run_map_generation_job.cancel_and_wait()
		run_map_generation_job = null


func _load_settings() -> void:
	# Ignore any legacy saved marker choice; both map minimaps use the cross.
	minimap_player_marker = "cross"
	var config := ConfigFile.new()
	if config.load(SETTINGS_PATH) != OK:
		return
	battle_deck_check_enabled = bool(config.get_value("game", "battle_deck_check_enabled", true))
	animation_tooltips_enabled = bool(config.get_value("game", "animation_tooltips_enabled", true))
	var saved_minimap_size: Variant = config.get_value("game", "map_minimap_size", minimap_size)
	if saved_minimap_size is Vector2:
		minimap_size = Vector2(
			clampf(saved_minimap_size.x, 140.0, 640.0),
			clampf(saved_minimap_size.y, 140.0, 640.0)
		)
	var saved_minimap_position: Variant = config.get_value("game", "map_minimap_position", minimap_position)
	if saved_minimap_position is Vector2:
		minimap_position = Vector2(maxf(0.0, saved_minimap_position.x), maxf(0.0, saved_minimap_position.y))


func _save_settings() -> void:
	var config := ConfigFile.new()
	config.load(SETTINGS_PATH)
	config.set_value("game", "battle_deck_check_enabled", battle_deck_check_enabled)
	config.set_value("game", "animation_tooltips_enabled", animation_tooltips_enabled)
	config.set_value("game", "minimap_player_marker", "cross")
	config.set_value("game", "map_minimap_size", minimap_size)
	config.set_value("game", "map_minimap_position", minimap_position)
	config.save(SETTINGS_PATH)


func _open_map_settings() -> void:
	_clear_map_vault_preview()
	if is_instance_valid(map_settings_overlay):
		return
	map_settings_overlay = MapSettingsPanel.new()
	map_settings_overlay.configure([], "cross",
		battle_deck_check_enabled, animation_tooltips_enabled)
	map_settings_overlay.close_requested.connect(_close_map_settings_overlay)
	map_settings_overlay.marker_selected.connect(_on_map_settings_marker_selected)
	map_settings_overlay.battle_deck_check_changed.connect(_on_battle_deck_check_changed)
	map_settings_overlay.animation_tooltips_changed.connect(_on_animation_tooltips_changed)
	add_child(map_settings_overlay)


func _close_map_settings_overlay() -> void:
	if is_instance_valid(map_settings_overlay):
		map_settings_overlay.queue_free()
	map_settings_overlay = null


func _on_map_settings_marker_selected(marker_id: String) -> void:
	minimap_player_marker = "cross"
	_save_settings()
	if is_instance_valid(active_map_minimap):
		active_map_minimap.set("marker_id", "cross")
		active_map_minimap.queue_redraw()


func _on_battle_deck_check_changed(enabled: bool) -> void:
	battle_deck_check_enabled = enabled
	_save_settings()


func _on_animation_tooltips_changed(enabled: bool) -> void:
	animation_tooltips_enabled = enabled
	if not enabled:
		_hide_card_mechanic_preview()
	_save_settings()


func _open_title_settings() -> void:
	_show_settings("title")


func _show_settings(return_screen: String) -> void:
	settings_return_screen = return_screen
	screen_name = "settings"
	_clear_screen()
	var page := _new_page("설정", "화면 표시와 플레이 설정")
	var center := CenterContainer.new()
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	page.add_child(center)
	var panel := _panel(Vector2(760, 500))
	center.add_child(panel)
	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_child(scroll)
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 12)
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(body)
	body.add_child(_settings_toggle_row(
		"잠깐!",
		"전투에 들어가기 전에 사용할 덱을 확인합니다.",
		battle_deck_check_enabled,
		Callable(self, "_on_battle_deck_check_changed")
	))
	body.add_child(_settings_toggle_row(
		"애니메이션 툴팁",
		"카드의 ★·재련 설명에 잠시 머물면 동작 예시를 보여줍니다.",
		animation_tooltips_enabled,
		Callable(self, "_on_animation_tooltips_changed")
	))
	body.add_child(HSeparator.new())
	body.add_child(_label("단축키 안내", 20, COLOR_TEXT))
	var shortcuts := RunShortcutsScript.rows()
	for shortcut in shortcuts:
		var shortcut_row := HBoxContainer.new()
		shortcut_row.add_theme_constant_override("separation", 18)
		var key_label := _label(str(shortcut[0]), 15, COLOR_GOLD)
		key_label.custom_minimum_size.x = 180
		shortcut_row.add_child(key_label)
		var help_label := _label(str(shortcut[1]), 14, COLOR_MUTED)
		help_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		shortcut_row.add_child(help_label)
		body.add_child(shortcut_row)
	var back := _button("돌아가기", Callable(self, "_close_settings"), Vector2(180, 46))
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	page.add_child(back)


func _settings_toggle_row(title_text: String, description_text: String, enabled: bool, changed: Callable) -> Control:
	var row := PanelContainer.new()
	row.add_theme_stylebox_override("panel", _button_style(Color("#1b201d"), COLOR_BORDER))
	var line := HBoxContainer.new()
	line.add_theme_constant_override("separation", 18)
	row.add_child(line)
	var copy := VBoxContainer.new()
	copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	copy.add_child(_label(title_text, 16, COLOR_TEXT))
	var description := _label(description_text, 12, COLOR_MUTED)
	description.autowrap_mode = TextServer.AUTOWRAP_WORD
	copy.add_child(description)
	line.add_child(copy)
	var toggle := CheckButton.new()
	toggle.button_pressed = enabled
	toggle.focus_mode = Control.FOCUS_NONE
	toggle.toggled.connect(changed)
	line.add_child(toggle)
	return row


func _close_settings() -> void:
	if settings_return_screen == "title":
		_show_title()
	else:
		_show_map()


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		map_debug_controller.trace_toolbar_pointer_release(self, event)
	if (event is InputEventMouseButton and event.pressed) \
			or (event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE):
		card_info_tooltip.clear()
	if event is InputEventMouseMotion or event is InputEventMouseButton:
		pointer_position = event.position
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
		run_reset_hold.stop("pointer")
	if event is InputEventKey and not event.pressed:
		if event.keycode == KEY_R:
			run_reset_hold.stop("shortcut")
		elif event.keycode in [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER]:
			run_reset_hold.stop("buttonKeyboard")
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F5:
		get_viewport().set_input_as_handled()
		_reload_last_save()
		return
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_F8:
			if not auto_travel_active and not map_travel_active and _save_run():
				notice = "저장했습니다."
			get_viewport().set_input_as_handled()
			return
		var focus_owner := get_viewport().gui_get_focus_owner()
		var text_focused := focus_owner is LineEdit or focus_owner is TextEdit or focus_owner is OptionButton
		if event.keycode == KEY_R and not text_focused and not is_instance_valid(player_name_setup_overlay):
			run_reset_hold.start("shortcut")
			get_viewport().set_input_as_handled()
			return
		if event.keycode == KEY_F and (event.ctrl_pressed or event.meta_pressed) and not event.alt_pressed \
			and screen_name == "map" and not is_instance_valid(player_name_setup_overlay) \
			and not is_instance_valid(map_settings_overlay) and not is_instance_valid(map_debug_controller.active_stats) \
			and not auto_travel_active and not map_travel_active:
			_open_map_search()
			get_viewport().set_input_as_handled()
			return
		if not text_focused and not is_instance_valid(player_name_setup_overlay) \
			and not is_instance_valid(map_settings_overlay) and not is_instance_valid(active_map_search_panel) \
			and not is_instance_valid(map_debug_controller.active_stats):
			if screen_name == "map" and event.keycode == KEY_B and not auto_travel_active and not map_travel_active:
				map_debug_controller.count_activation(self)
				get_viewport().set_input_as_handled()
				return
			if screen_name == "deck" and event.keycode in [KEY_I, KEY_TAB, KEY_ENTER, KEY_KP_ENTER]:
				_show_map()
				get_viewport().set_input_as_handled()
				return
			if screen_name == "map" and event.keycode in [KEY_I, KEY_TAB] \
				and not auto_travel_active and not map_travel_active:
				_show_deck()
				get_viewport().set_input_as_handled()
				return
	if is_instance_valid(active_map_vault_preview):
		if event is InputEventMouseMotion:
			_request_map_vault_preview_clear()
		if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
			_clear_map_vault_preview()
			get_viewport().set_input_as_handled()
			return
		if event is InputEventMouseButton and event.pressed \
			and not active_map_vault_preview.contains_global_point(event.position):
			_clear_map_vault_preview()
	if screen_name == "encounter":
		get_viewport().set_input_as_handled()
		return
	if screen_name != "battle" or is_instance_valid(player_name_setup_overlay):
		return
	if battle_draw_presentation.active:
		get_viewport().set_input_as_handled()
		return
	var focused := get_viewport().gui_get_focus_owner()
	if focused is LineEdit or focused is TextEdit:
		return
	if battle_keyboard_drag.handle_input(event, self):
		get_viewport().set_input_as_handled()


func _reload_last_save() -> void:
	if not FileAccess.file_exists(RUN_SAVE_PATH):
		var dialog := AcceptDialog.new()
		dialog.title = "저장점 불러오기"
		dialog.dialog_text = "불러올 저장점이 없습니다."
		dialog.confirmed.connect(dialog.queue_free)
		dialog.canceled.connect(dialog.queue_free)
		add_child(dialog)
		dialog.popup_centered()
		return
	# A fresh scene discards unsaved UI state and callbacks; _ready loads the save.
	if get_viewport().gui_is_dragging():
		get_viewport().gui_cancel_drag()
	battle_draw_presentation.invalidate()
	var error := get_tree().reload_current_scene()
	if error != OK:
		push_error("마지막 저장점을 불러오지 못했습니다: %s" % error_string(error))


func _unhandled_key_input(event: InputEvent) -> void:
	var key_event := event as InputEventKey
	if key_event == null:
		return
	if is_instance_valid(player_name_setup_overlay):
		get_viewport().set_input_as_handled()
		return
	if is_instance_valid(map_settings_overlay):
		if key_event.pressed and key_event.keycode == KEY_ESCAPE:
			_close_map_settings_overlay()
		get_viewport().set_input_as_handled()
		return
	if is_instance_valid(map_debug_controller.active_stats):
		get_viewport().set_input_as_handled()
		return
	var focused := get_viewport().gui_get_focus_owner()
	if focused is LineEdit or focused is TextEdit or focused is OptionButton or is_instance_valid(active_map_search_panel):
		return
	if not key_event.pressed:
		return
	# Map movement follows OS key repeats, as in the browser, with no separate frame timer.
	if key_event.echo and not (screen_name == "map" and key_event.keycode in [
		KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_W, KEY_A, KEY_S, KEY_D,
		KEY_1, KEY_3, KEY_7, KEY_9,
		KEY_KP_7, KEY_KP_8, KEY_KP_9,
		KEY_KP_4, KEY_KP_6, KEY_KP_1, KEY_KP_2, KEY_KP_3,
	]):
		return
	if screen_name == "battle" and key_event.keycode == KEY_SPACE \
		and not key_event.alt_pressed and not key_event.ctrl_pressed and not key_event.meta_pressed:
		_sort_battle_hand_by_cost()
		get_viewport().set_input_as_handled()
		return
	if screen_name == "battle" and key_event.keycode == KEY_E:
		_end_turn()
		get_viewport().set_input_as_handled()
		return
	if screen_name == "battle" and key_event.keycode in [KEY_ENTER, KEY_KP_ENTER] \
			and not key_event.alt_pressed and not key_event.ctrl_pressed and not key_event.meta_pressed \
			and int(battle_state.get("pending_discard_count", 0)) > 0 \
			and selected_battle_hand_card_id >= 0:
		selected_battle_hand_card_id = -1
		_show_battle()
		get_viewport().set_input_as_handled()
		return
	if screen_name == "battle" and key_event.keycode in [KEY_ENTER, KEY_KP_ENTER] \
		and not key_event.alt_pressed and not key_event.ctrl_pressed and not key_event.meta_pressed \
		and selected_battle_hand_card_id >= 0 and _battle_drop_available():
		var card := _battle_hand_card(selected_battle_hand_card_id)
		if not card.is_empty() and CardUse.is_playable(card):
			if _card_can_target_enemy(card):
				battle_state["message"] = "%s: 적용할 적을 선택하세요." % str(card.get("name", "카드"))
				_show_battle()
			else:
				_play_card(selected_battle_hand_card_id)
		get_viewport().set_input_as_handled()
		return
	if key_event.keycode == KEY_ESCAPE:
		if screen_name == "map" and auto_travel_active:
			_stop_auto_travel("자동 탐사를 멈췄습니다.")
		elif screen_name == "settings":
			_close_settings()
		elif screen_name == "battle":
			return
		elif screen_name == "portalWarning":
			_cancel_portal_key_warning()
		elif screen_name in ["deck", "inventory", "deckVault", "stickerService", "stickerServiceResult"]:
			_show_map()
		else:
			return
		get_viewport().set_input_as_handled()
		return
	if screen_name != "map":
		return
	var movement := {
		KEY_UP: Vector2i(0, -1),
		KEY_DOWN: Vector2i(0, 1),
		KEY_LEFT: Vector2i(-1, 0),
		KEY_RIGHT: Vector2i(1, 0),
		KEY_W: Vector2i(0, -1),
		KEY_A: Vector2i(-1, 0),
		KEY_S: Vector2i(0, 1),
		KEY_D: Vector2i(1, 0),
		KEY_7: Vector2i(-1, -1),
		KEY_9: Vector2i(1, -1),
		KEY_1: Vector2i(-1, 1),
		KEY_3: Vector2i(1, 1),
		KEY_KP_7: Vector2i(-1, -1),
		KEY_KP_8: Vector2i(0, -1),
		KEY_KP_9: Vector2i(1, -1),
		KEY_KP_4: Vector2i(-1, 0),
		KEY_KP_6: Vector2i(1, 0),
		KEY_KP_1: Vector2i(-1, 1),
		KEY_KP_2: Vector2i(0, 1),
		KEY_KP_3: Vector2i(1, 1),
	}
	if movement.has(key_event.keycode):
		auto_travel_active = false
		auto_travel_path.clear()
		auto_travel_progress.clear()
		map_travel_active = false
		map_travel_path.clear()
		map_travel_target = Vector2i(-1, -1)
		_try_move(run_state["position"] + movement[key_event.keycode])
		get_viewport().set_input_as_handled()
	elif key_event.keycode == KEY_O:
		if auto_travel_active:
			_stop_auto_travel("자동 탐사를 멈췄습니다.")
		else:
			_start_auto_travel()
		get_viewport().set_input_as_handled()
	elif auto_travel_active or map_travel_active:
		return
	elif key_event.keycode in [KEY_KP_5, KEY_5]:
		_wait_on_map()
		get_viewport().set_input_as_handled()
	elif key_event.keycode == KEY_G:
		_quick_pick_up_floor_items()
		get_viewport().set_input_as_handled()
	elif key_event.keycode in [KEY_PLUS, KEY_KP_ADD] or (key_event.keycode == KEY_EQUAL and key_event.shift_pressed):
		if is_instance_valid(active_map_view):
			active_map_view.zoom_by(1)
		get_viewport().set_input_as_handled()
	elif key_event.keycode in [KEY_MINUS, KEY_UNDERSCORE, KEY_KP_SUBTRACT]:
		if is_instance_valid(active_map_view):
			active_map_view.zoom_by(-1)
		get_viewport().set_input_as_handled()
	elif key_event.keycode in [KEY_0, KEY_KP_0]:
		if is_instance_valid(active_map_view):
			active_map_view.reset_zoom()
		get_viewport().set_input_as_handled()
	elif key_event.keycode in [KEY_ENTER, KEY_KP_ENTER, KEY_E, KEY_GREATER] \
		or (key_event.keycode == KEY_PERIOD and key_event.shift_pressed):
		auto_travel_active = false
		auto_travel_path.clear()
		auto_travel_progress.clear()
		_use_current_map_tile()
		get_viewport().set_input_as_handled()


func _sort_battle_hand_by_cost() -> void:
	if battle_turn_resolving or battle_draw_presentation.active:
		return
	selected_battle_hand_card_id = -1
	var hand: Array = battle_state.get("hand", [])
	if hand.size() >= 2:
		battle_state["hand"] = BattleRules.sort_hand_by_cost(battle_state, hand)
	_show_battle()


func _process(delta: float) -> void:
	map_debug_controller.sync_toolbar(self)
	card_info_tooltip.refresh_position()
	if is_instance_valid(active_restart_progress):
		active_restart_progress.anchor_right = run_reset_hold.progress()
	if run_reset_hold.tick():
		_clear_run_save()
		_start_run()
		return
	_update_map_wait_notice()
	_update_map_deck_selector_host()
	if screen_name == "stickerService" and active_service_kind == "cardTransmuter" \
		and service_selected_card_ids.size() == 1 and not get_viewport().gui_is_dragging() \
		and not Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) \
		and not Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		service_preview_elapsed += delta
		if service_preview_elapsed >= 0.1:
			service_preview_elapsed = 0.0
			var source := _run_card_by_id(service_selected_card_ids[0])
			if not source.is_empty():
				var random := RandomNumberGenerator.new()
				random.randomize()
				service_transmuter_preview = StickerServices.create_transmuter_preview(source, random, service_transmuter_preview)
				_render_sticker_service_preview()
	if screen_name != "map" or run_state.is_empty() or is_instance_valid(player_name_setup_overlay):
		_finish_auto_explore_capture("map_unavailable")
		map_travel_active = false
		map_travel_path.clear()
		return
	if map_travel_active:
		_process_map_travel(delta)
		return
	if not auto_travel_active:
		return
	auto_travel_elapsed += delta
	if auto_travel_path.is_empty() or auto_travel_route_needs_refresh:
		var begins_route := auto_travel_path.is_empty()
		auto_travel_path = MapTravel.find_safe_path(
			run_state["map"], run_state["position"], run_state.get("defeated_enemies", []), auto_travel_progress
		)
		auto_travel_route_needs_refresh = false
		if auto_travel_path.is_empty():
			var stop_reason := str(auto_travel_progress.get("stop_reason", "complete"))
			if stop_reason == "blocked":
				_stop_auto_travel("남은 탐사 경로가 적의 인식 범위와 겹쳐 자동 탐사를 멈췄습니다.")
			elif stop_reason == "unsafe":
				_stop_auto_travel("현재 위치가 안전하지 않아 자동 탐사를 멈췄습니다.")
			else:
				_stop_auto_travel("안전하게 탐사할 수 있는 곳과 골드를 모두 확인했습니다.")
			return
		if begins_route:
			var steps_remaining := maxi(auto_travel_path.size(), 1)
			var base_step_ms: float = round(70.0 / sqrt(float(steps_remaining)))
			var step_interval_ms := maxi(1, int(round(maxf(45.0, base_step_ms) / 2.0)))
			auto_travel_step_interval = float(step_interval_ms) / 1000.0
	if auto_travel_elapsed < auto_travel_step_interval:
		return
	auto_travel_elapsed = 0.0
	var current: Vector2i = run_state["position"]
	var next_position: Vector2i = auto_travel_path[0]
	if not MapTravel.is_safe_known_tile(run_state["map"], next_position, current,
		run_state.get("defeated_enemies", []), auto_travel_progress):
		auto_travel_path.clear()
		auto_travel_elapsed = 0.0
		return
	var seen_before: Dictionary = run_state["map"].get("seen", {}).duplicate()
	auto_travel_path.pop_front()
	auto_travel_step_in_progress = true
	_try_move(next_position)
	auto_travel_step_in_progress = false
	if run_state.get("position") != current and not auto_explore_capture_session.is_empty():
		auto_explore_capture_steps += 1
	# The browser refreshes progress at every step, even along a committed route.
	# Keep that route in progress, but record the new position and retire stale goals.
	auto_travel_route_needs_refresh = true
	if screen_name != "map":
		_finish_auto_explore_capture("left_map")
		auto_travel_active = false
		auto_travel_path.clear()
	elif run_state.get("position") != current and _auto_travel_revealed_special_terrain(seen_before):
		_stop_auto_travel("새로운 특수 지형을 발견해 자동 탐사를 멈췄습니다.")


func _start_auto_travel() -> void:
	_ensure_auto_explore_capture_seed()
	map_travel_active = false
	map_travel_path.clear()
	map_travel_target = Vector2i(-1, -1)
	auto_travel_active = true
	auto_travel_elapsed = 0.0
	auto_travel_path.clear()
	auto_travel_progress = MapTravel.create_auto_explore_progress()
	auto_travel_route_needs_refresh = false
	auto_explore_capture_steps = 0
	auto_explore_capture_session = {
		"start": run_state.get("position", MapRules.START),
		"seen_before": run_state.get("map", {}).get("seen", {}).size(),
		"gold_before": _auto_explore_remaining_gold(run_state.get("map", {})),
	}
	notice = "자동 탐사 중 · O를 누르면 멈춥니다."
	_show_map()


func _stop_auto_travel(message: String) -> void:
	var stop_reason := str(auto_travel_progress.get("stop_reason", ""))
	_finish_auto_explore_capture(stop_reason if not stop_reason.is_empty() else message)
	auto_travel_active = false
	auto_travel_elapsed = 0.0
	auto_travel_path.clear()
	auto_travel_progress.clear()
	map_travel_active = false
	map_travel_path.clear()
	map_travel_target = Vector2i(-1, -1)
	notice = message
	if screen_name == "map":
		_show_map()


func _ensure_auto_explore_capture_seed() -> void:
	var seed_value := int(run_state.get("map_seed", -1))
	if seed_value == auto_explore_capture_seed:
		return
	_reset_auto_explore_capture(seed_value)


func _reset_auto_explore_capture(seed_value: int = -1) -> void:
	auto_explore_capture_history.clear()
	auto_explore_capture_session.clear()
	auto_explore_capture_steps = 0
	auto_explore_capture_seed = seed_value
	auto_explore_capture_written = false


func _auto_explore_remaining_gold(map_data: Dictionary) -> int:
	var total := 0
	for amount in map_data.get("gold_piles", {}).values():
		total += maxi(int(amount), 0)
	return total


func _finish_auto_explore_capture(stop_reason: String) -> void:
	if auto_explore_capture_session.is_empty() or run_state.is_empty():
		return
	var map_data: Dictionary = run_state.get("map", {})
	auto_explore_capture_session["end"] = run_state.get("position", MapRules.START)
	auto_explore_capture_session["steps"] = auto_explore_capture_steps
	auto_explore_capture_session["seen_after"] = map_data.get("seen", {}).size()
	auto_explore_capture_session["gold_after"] = _auto_explore_remaining_gold(map_data)
	auto_explore_capture_session["stop_reason"] = stop_reason
	auto_explore_capture_history.append(auto_explore_capture_session.duplicate(true))
	while auto_explore_capture_history.size() > 12:
		auto_explore_capture_history.pop_front()
	auto_explore_capture_session.clear()
	if auto_explore_capture_written or not _auto_explore_capture_has_stall_cycle():
		return
	var file := FileAccess.open(auto_explore_capture_path, FileAccess.WRITE)
	if file == null:
		push_warning("자동 탐사 반복 캡처 파일을 쓰지 못했습니다: %s" % error_string(FileAccess.get_open_error()))
		return
	file.store_var({"map_seed": auto_explore_capture_seed,
		"run_state": run_state.duplicate(true),
		"sessions": auto_explore_capture_history.duplicate(true)}, false)
	file.close()
	auto_explore_capture_written = true
	print("AUTO_EXPLORE_REPEAT_CAPTURE=" + ProjectSettings.globalize_path(auto_explore_capture_path))


func _auto_explore_session_made_no_progress(session: Dictionary) -> bool:
	return int(session.get("steps", 0)) > 0 \
		and int(session.get("seen_after", 0)) == int(session.get("seen_before", 0)) \
		and int(session.get("gold_after", 0)) == int(session.get("gold_before", 0))


func _auto_explore_capture_has_stall_cycle() -> bool:
	var count := auto_explore_capture_history.size()
	if count >= 2:
		var first: Dictionary = auto_explore_capture_history[count - 2]
		var second: Dictionary = auto_explore_capture_history[count - 1]
		if _auto_explore_session_made_no_progress(first) and _auto_explore_session_made_no_progress(second) \
			and first.get("start") == second.get("start") and first.get("end") == second.get("end"):
			return true
	if count >= 3:
		var cycle_first: Dictionary = auto_explore_capture_history[count - 3]
		var cycle_second: Dictionary = auto_explore_capture_history[count - 2]
		var cycle_third: Dictionary = auto_explore_capture_history[count - 1]
		if _auto_explore_session_made_no_progress(cycle_first) \
			and _auto_explore_session_made_no_progress(cycle_second) \
			and _auto_explore_session_made_no_progress(cycle_third) \
			and cycle_first.get("start") == cycle_third.get("start") \
			and cycle_first.get("end") == cycle_third.get("end") \
			and cycle_first.get("end") == cycle_second.get("start") \
			and cycle_second.get("end") == cycle_third.get("start"):
			return true
	return false


func _auto_travel_revealed_special_terrain(seen_before: Dictionary) -> bool:
	var map_data: Dictionary = run_state.get("map", {})
	var visible_now: Dictionary = map_data.get("visible_now", {})
	for position in visible_now.keys():
		if seen_before.has(position):
			continue
		var room_type := MapRules.room_type_at(map_data, position)
		if not ["empty", "rock", "void"].has(room_type):
			return true
	return false


func _process_map_travel(delta: float) -> void:
	map_travel_elapsed += delta
	if map_travel_elapsed < map_travel_step_interval:
		return
	map_travel_elapsed = 0.0
	var current: Vector2i = run_state["position"]
	if current == map_travel_target:
		map_travel_active = false
		map_travel_path.clear()
		map_travel_target = Vector2i(-1, -1)
		_refresh_map_travel_controls()
		return
	map_travel_path = MapTravel.find_enemy_avoiding_route(
		run_state["map"], current, map_travel_target, run_state.get("defeated_enemies", [])
	)
	if map_travel_path.size() < 2:
		map_travel_active = false
		map_travel_path.clear()
		map_travel_target = Vector2i(-1, -1)
		notice = "현재 발견한 지형으로 목적지에 닿을 경로가 없습니다."
		_show_map()
		return
	map_travel_step_in_progress = true
	_try_move(map_travel_path[1])
	map_travel_step_in_progress = false
	if screen_name != "map" or run_state["position"] == map_travel_target:
		map_travel_active = false
		map_travel_path.clear()
		map_travel_target = Vector2i(-1, -1)
		_refresh_map_travel_controls()


func _refresh_map_travel_controls() -> void:
	var traveling := auto_travel_active or map_travel_active
	for control in [active_map_wait_button, active_map_search_button]:
		if is_instance_valid(control):
			control.disabled = traveling


func _install_theme() -> void:
	var game_theme := Theme.new()
	game_theme.default_font = WEB_UI_FONT
	game_theme.default_font_size = 16
	theme = game_theme
	var card_font: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")
	# Godot ignores the string "wght" key; resolve the OpenType tag numerically.
	var card_font_weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	map_currency_font = FontVariation.new()
	map_currency_font.base_font = card_font
	map_currency_font.variation_opentype = {card_font_weight_axis: 700.0}
	map_health_font = _web_weight_font(card_font, card_font_weight_axis, 800)
	map_control_font = _web_weight_font(card_font, card_font_weight_axis, 700)
	battle_card_name_font = FontVariation.new()
	battle_card_name_font.base_font = card_font
	battle_card_name_font.variation_opentype = {card_font_weight_axis: 700.0}
	battle_card_cost_font = _web_weight_font(card_font, card_font_weight_axis, 800)
	battle_card_body_font = FontVariation.new()
	battle_card_body_font.base_font = card_font
	battle_card_body_font.variation_opentype = {card_font_weight_axis: 400.0}
	battle_card_emphasis_font = FontVariation.new()
	battle_card_emphasis_font.base_font = card_font
	battle_card_emphasis_font.variation_opentype = {card_font_weight_axis: 600.0}
	deck_editor_card_name_font = FontVariation.new()
	deck_editor_card_name_font.base_font = card_font
	deck_editor_card_name_font.variation_opentype = {card_font_weight_axis: 600.0}
	deck_editor_card_name_font.spacing_glyph = -1
	blue_tooltip_theme = Theme.new()
	var tooltip_style := StyleBoxFlat.new()
	tooltip_style.bg_color = Color("#174b70")
	tooltip_style.border_color = Color("#75b5dd")
	tooltip_style.set_border_width_all(1)
	tooltip_style.set_corner_radius_all(4)
	tooltip_style.content_margin_left = 10
	tooltip_style.content_margin_top = 7
	tooltip_style.content_margin_right = 10
	tooltip_style.content_margin_bottom = 7
	blue_tooltip_theme.set_stylebox("panel", "TooltipPanel", tooltip_style)
	blue_tooltip_theme.set_color("font_color", "TooltipLabel", Color("#f3f7fa"))
	blue_tooltip_theme.set_font_size("font_size", "TooltipLabel", 13)
	RenderingServer.set_default_clear_color(COLOR_BG)
	reward_random.randomize()


func _web_weight_font(base_font: FontFile, weight_axis: int, weight: int) -> FontVariation:
	var font := FontVariation.new()
	font.base_font = base_font
	font.variation_opentype = {weight_axis: float(weight)}
	return font


func _show_title() -> void:
	screen_name = "title"
	_clear_screen()
	var page := _new_page("RUINFALL", "탐험하고, 파일을 정리하고, 살아남으세요.")
	var center := CenterContainer.new()
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	page.add_child(center)
	var panel := _panel(Vector2(560, 340))
	center.add_child(panel)
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 18)
	body.alignment = BoxContainer.ALIGNMENT_CENTER
	panel.add_child(body)
	var title := _label("솔리테어 덱배틀", 34, COLOR_TEXT)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.add_child(title)
	var description := _label("낯선 지형을 탐험하고 카드를 모으세요.\n전투에서는 파일을 정리해 유리한 수를 만드세요.", 18, COLOR_MUTED)
	description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.add_child(description)
	if FileAccess.file_exists(RUN_SAVE_PATH):
		var continue_button := _button("이어하기", Callable(self, "_load_saved_run"), Vector2(240, 54))
		continue_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		body.add_child(continue_button)
	var start_button := _button("새 탐험" if FileAccess.file_exists(RUN_SAVE_PATH) else "탐험 시작", Callable(self, "_start_run"), Vector2(240, 54))
	start_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	body.add_child(start_button)
	var settings_button := _button("설정", Callable(self, "_open_title_settings"), Vector2(160, 44))
	settings_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	body.add_child(settings_button)
	var footer := _label("새로운 지역을 탐험하고 더 강한 덱을 만들어 보세요.", 13, COLOR_MUTED)
	footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	page.add_child(footer)


func _start_run() -> void:
	if screen_name == "runLoading":
		return
	_reset_auto_explore_capture()
	screen_name = "runLoading"
	map_debug_controller.reset()
	map_visual_motion_seed = -1
	pending_map_camera_duration_ms = 0.0
	battle_session_generation += 1
	var run_generation := battle_session_generation
	var run_tree := get_tree()
	battle_turn_resolving = false
	map_ping_position = Vector2i(-1, -1)
	map_ping_label = ""
	selected_battle_hand_card_id = -1
	deck_editor_session_active = false
	deck_editor_selected_deck_id = ""
	deck_editor_origins_by_card_id.clear()
	deck_editor_high_rarity_return_area_by_card_id.clear()
	deck_editor_pending_removals.clear()
	var seed_generator := RandomNumberGenerator.new()
	seed_generator.randomize()
	var map_seed := seed_generator.randi()
	var starter_deck := CardCatalog.create_starter_deck()
	var starter_deck_name := _random_deck_name(25)
	var next_run_state := {
		"position": MapRules.START,
		"map_seed": map_seed,
		"map_turn": 0,
		"player_hp": 50,
		"max_hp": 50,
		"gods_lament_charges": 3,
		"region_battle_wins": 0,
		"gold": 0,
		"keys": 0,
		"player_name": _random_player_name(),
		"rare_card_drop_chance": 0.05,
		"inventory_cards": [],
		"inventory_consumables": [],
		"floor_cards": [],
		"floor_deck_drops": [],
		"floor_consumable_drops": [],
		"deck": starter_deck,
		"owned_decks": [{"id": "starter", "name": starter_deck_name, "capacity": 25,
			"rare_slot_capacity": 1, "cards": starter_deck.duplicate(true), "editions": []}],
		"active_deck_id": "starter",
		"next_card_id": starter_deck.size() + 1,
		"next_consumable_id": 1,
		"sticker_service_uses": {},
		"map": {},
		"defeated_enemies": [],
	}
	var loading_progress := _show_run_loading()
	var job := preload("res://scripts/run_map_generation_job.gd").new()
	run_map_generation_job = job
	var start_error: Error = job.start(map_seed)
	if start_error != OK:
		run_map_generation_job = null
		notice = "지도 생성을 시작하지 못했습니다. 다시 시도하세요."
		_show_title()
		return
	# Web advances cooperatively; native builds report worker progress and join after completion.
	var loading_heading := loading_progress.get_parent().get_child(0) as Label
	while job.is_alive():
		if not is_inside_tree() or run_generation != battle_session_generation:
			job.cancel_and_wait()
			if run_map_generation_job == job:
				run_map_generation_job = null
			return
		job.advance()
		loading_progress.text = "지역 %d / %d" % [job.completed_regions(), MapRules.REGION_COUNT]
		loading_heading.text = "지도를 불러오는 중" + ".".repeat(1 + int(Time.get_ticks_msec() / 350) % 3)
		await run_tree.process_frame
	var generated_map: Dictionary = job.take_result()
	run_map_generation_job = null
	if generated_map.is_empty():
		return
	next_run_state["map"] = generated_map
	loading_progress.text = "지역 %d / %d" % [MapRules.REGION_COUNT, MapRules.REGION_COUNT]
	await run_tree.process_frame
	await run_tree.process_frame
	if not is_inside_tree() or run_generation != battle_session_generation:
		return
	run_state = next_run_state
	safe_area_unlock_pending_animation = false
	battle_state = {}
	map_camera_center = Vector2(MapRules.START) + Vector2(0.5, 0.5)
	map_zoom = 85.0
	minimap_zoom = 1.0
	minimap_view_offset = Vector2.ZERO
	notice = "WASD 또는 화살표 키로 이동하세요. 포탈에서 Enter를 누르면 이동합니다."
	screen_name = "map"
	_save_run()
	_show_map()
	call_deferred("_focus_map_on_player")
	_open_player_name_setup()


func _show_run_loading() -> Label:
	_clear_screen()
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 14)
	center.add_child(body)
	var heading := _label("지도를 불러오는 중…", 26, COLOR_TEXT)
	heading.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.add_child(heading)
	var progress := _label("지역 0 / %d" % MapRules.REGION_COUNT, 16, COLOR_MUTED)
	progress.name = "RunMapLoadingProgress"
	progress.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.add_child(progress)
	return progress


func _open_player_name_setup() -> void:
	if is_instance_valid(player_name_setup_overlay):
		return
	player_name_setup_overlay = Control.new()
	player_name_setup_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	player_name_setup_overlay.z_index = 100
	player_name_setup_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(player_name_setup_overlay)

	var backdrop := ColorRect.new()
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(0.0, 0.0, 0.0, 0.74)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	player_name_setup_overlay.add_child(backdrop)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	player_name_setup_overlay.add_child(center)

	var dialog := PanelContainer.new()
	dialog.custom_minimum_size = Vector2(360.0, 0.0)
	var dialog_style := StyleBoxFlat.new()
	dialog_style.bg_color = Color("#f7f5ef")
	dialog_style.border_color = Color("#77736b")
	dialog_style.set_border_width_all(1)
	dialog_style.set_corner_radius_all(8)
	dialog_style.content_margin_left = 26
	dialog_style.content_margin_top = 26
	dialog_style.content_margin_right = 26
	dialog_style.content_margin_bottom = 26
	dialog.add_theme_stylebox_override("panel", dialog_style)
	center.add_child(dialog)

	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 12)
	dialog.add_child(body)
	var heading := _label("이름을 정하세요", 24, Color("#252525"))
	body.add_child(heading)

	var name_input := LineEdit.new()
	name_input.text = str(run_state.get("player_name", _random_player_name()))
	name_input.max_length = 16
	name_input.custom_minimum_size.y = 44
	name_input.add_theme_font_size_override("font_size", 18)
	name_input.add_theme_color_override("font_color", Color("#252525"))
	name_input.add_theme_color_override("caret_color", Color("#252525"))
	var input_style := StyleBoxFlat.new()
	input_style.bg_color = Color.WHITE
	input_style.border_color = Color("#77736b")
	input_style.set_border_width_all(1)
	input_style.set_corner_radius_all(4)
	input_style.content_margin_left = 12
	input_style.content_margin_right = 12
	name_input.add_theme_stylebox_override("normal", input_style)
	name_input.add_theme_stylebox_override("focus", input_style.duplicate())
	body.add_child(name_input)

	var reroll_button := Button.new()
	reroll_button.text = "↻  랜덤 이름 리롤"
	reroll_button.custom_minimum_size.y = 36
	reroll_button.add_theme_font_size_override("font_size", 14)
	reroll_button.add_theme_color_override("font_color", Color("#4f4a44"))
	var reroll_style := StyleBoxFlat.new()
	reroll_style.bg_color = Color("#eeece5")
	reroll_style.border_color = Color("#aaa397")
	reroll_style.set_border_width_all(1)
	reroll_style.set_corner_radius_all(4)
	reroll_button.add_theme_stylebox_override("normal", reroll_style)
	var reroll_hover := reroll_style.duplicate()
	reroll_hover.bg_color = Color.WHITE
	reroll_button.add_theme_stylebox_override("hover", reroll_hover)
	reroll_button.pressed.connect(func() -> void:
		name_input.text = _random_player_name()
	)
	body.add_child(reroll_button)

	var start_button := Button.new()
	start_button.text = "탐험 시작"
	start_button.custom_minimum_size.y = 42
	start_button.add_theme_font_size_override("font_size", 16)
	start_button.add_theme_color_override("font_color", Color.WHITE)
	var start_style := StyleBoxFlat.new()
	start_style.bg_color = Color("#707070")
	start_style.border_color = Color("#5f5f5f")
	start_style.set_border_width_all(1)
	start_style.set_corner_radius_all(4)
	start_button.add_theme_stylebox_override("normal", start_style)
	var start_hover := start_style.duplicate()
	start_hover.bg_color = Color("#808080")
	start_button.add_theme_stylebox_override("hover", start_hover)
	start_button.disabled = name_input.text.strip_edges().is_empty()
	name_input.text_changed.connect(func(value: String) -> void:
		start_button.disabled = value.strip_edges().is_empty()
	)
	var confirm_name := func() -> void:
		var chosen_name := name_input.text.strip_edges()
		if chosen_name.is_empty():
			return
		run_state["player_name"] = chosen_name
		_save_run()
		player_name_setup_overlay.queue_free()
		player_name_setup_overlay = null
	start_button.pressed.connect(confirm_name)
	name_input.text_submitted.connect(func(_value: String) -> void:
		confirm_name.call()
	)
	body.add_child(start_button)
	name_input.call_deferred("grab_focus")


func _random_player_name() -> String:
	const SYLLABLES := [
		"아", "에", "이", "오", "우", "야", "예", "요", "유", "라", "레", "리", "로", "루",
		"카", "케", "키", "코", "쿠", "크", "타", "테", "티", "토", "투", "트", "파", "페",
		"피", "포", "푸", "프", "사", "세", "시", "소", "수", "스", "자", "제", "지", "조",
		"주", "즈", "나", "네", "니", "노", "누", "느", "마", "메", "미", "모", "무", "므",
		"바", "베", "비", "보", "부", "브", "다", "데", "디", "도", "두", "드", "하", "헤",
		"히", "호", "후", "흐", "엘", "알", "일", "올", "울", "벨", "델", "셀", "젤", "켈",
	]
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var name := ""
	for _index in range(rng.randi_range(2, 4)):
		name += SYLLABLES[rng.randi_range(0, SYLLABLES.size() - 1)]
	return name


func _random_deck_name(capacity: int) -> String:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var target_length := clampi(roundi(float(capacity) / 10.0) + rng.randi_range(-1, 1), 2, 12)
	var name := _random_player_name()
	while name.length() < target_length:
		name += _random_player_name().left(1)
	if name.length() > target_length:
		name = name.left(target_length)
	if name.length() > 2 and rng.randf() < 0.3:
		var space_at := rng.randi_range(1, name.length() - 1)
		name = name.left(space_at) + " " + name.substr(space_at)
	return name


func _load_saved_run() -> void:
	var file := FileAccess.open(RUN_SAVE_PATH, FileAccess.READ)
	if file == null:
		notice = "저장한 탐험을 읽지 못했습니다. 새 탐험을 시작하세요."
		_show_title()
		return
	var saved_state = file.get_var(false)
	var saved_map: Dictionary = {}
	if typeof(saved_state) == TYPE_DICTIONARY and typeof(saved_state.get("map", null)) == TYPE_DICTIONARY:
		saved_map = saved_state["map"]
	if typeof(saved_state) != TYPE_DICTIONARY or not saved_state.has("position") or not saved_state.has("deck") \
		or int(saved_map.get("version", -1)) != MapRules.MAP_VERSION:
		_clear_run_save()
		notice = "지도 형식이 바뀌어 새 탐험을 시작해야 합니다."
		_show_title()
		return
	map_debug_controller.reset()
	_reset_auto_explore_capture(int(saved_state.get("map_seed", -1)))
	run_state = saved_state
	safe_area_unlock_pending_animation = false
	if not run_state.has("player_name") or str(run_state.get("player_name", "")).strip_edges().is_empty():
		run_state["player_name"] = _random_player_name()
	deck_editor_session_active = false
	deck_editor_selected_deck_id = ""
	deck_editor_origins_by_card_id.clear()
	deck_editor_high_rarity_return_area_by_card_id.clear()
	deck_editor_pending_removals.clear()
	if not run_state.has("map_turn"):
		run_state["map_turn"] = 0
	if not run_state.has("sticker_service_uses"):
		run_state["sticker_service_uses"] = {}
	if not run_state.has("keys"):
		run_state["keys"] = 0
	if not run_state.has("gods_lament_charges"):
		run_state["gods_lament_charges"] = 0 if MapRules.is_safe_area_tile(run_state["map"], run_state["position"]) else 3
	if not run_state.has("region_battle_wins"):
		run_state["region_battle_wins"] = 0
	if not run_state.has("rare_card_drop_chance"):
		run_state["rare_card_drop_chance"] = 0.05
	if not run_state.has("inventory_cards"):
		run_state["inventory_cards"] = []
	if not run_state.has("inventory_consumables"):
		run_state["inventory_consumables"] = []
	if not run_state.has("next_consumable_id"):
		run_state["next_consumable_id"] = 1
	if not run_state.has("floor_cards"):
		run_state["floor_cards"] = []
	if not run_state.has("floor_deck_drops"):
		run_state["floor_deck_drops"] = []
	if not run_state.has("floor_consumable_drops"):
		run_state["floor_consumable_drops"] = []
	if not run_state.has("owned_decks") or typeof(run_state["owned_decks"]) != TYPE_ARRAY:
		run_state["active_deck_id"] = "starter"
		run_state["owned_decks"] = [{"id": "starter", "name": "시작 덱", "capacity": 25,
		"rare_slot_capacity": 1, "cards": run_state["deck"].duplicate(true), "editions": []}]
	elif run_state["owned_decks"].is_empty():
		# An intentionally empty collection is valid after dropping the last deck.
		run_state["active_deck_id"] = ""
		run_state["deck"] = []
	else:
		var saved_active_id := str(run_state.get("active_deck_id", ""))
		var has_saved_active_deck := false
		for deck in run_state["owned_decks"]:
			if str(deck.get("id", "")) == saved_active_id:
				has_saved_active_deck = true
				break
		if not has_saved_active_deck:
			var fallback_deck: Dictionary = run_state["owned_decks"][0]
			run_state["active_deck_id"] = str(fallback_deck.get("id", ""))
			run_state["deck"] = fallback_deck.get("cards", []).duplicate(true)
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == "starter":
			deck["rare_slot_capacity"] = 1
	var highest_saved_card_id := _highest_saved_card_id(run_state)
	run_state["next_card_id"] = maxi(int(run_state.get("next_card_id", 1)), highest_saved_card_id + 1)
	MapRules.ensure_enemy_states(run_state["map"], run_state.get("defeated_enemies", []))
	MapRules.reveal_visible(run_state["map"], run_state["position"])
	map_camera_center = Vector2(run_state["position"]) + Vector2(0.5, 0.5)
	battle_state = {}
	notice = "저장한 탐험을 이어갑니다."
	# Older saves could be written after a collision but before the battle screen.
	var restored_position: Vector2i = run_state["position"]
	if run_state["map"].get("enemy_positions", []).has(restored_position) \
			and not run_state.get("defeated_enemies", []).has(restored_position):
		_start_battle(restored_position)
		return
	_show_map()


func _highest_saved_card_id(saved: Dictionary) -> int:
	var card_arrays: Array = [saved.get("deck", []), saved.get("inventory_cards", [])]
	for owned_deck in saved.get("owned_decks", []):
		if typeof(owned_deck) == TYPE_DICTIONARY:
			card_arrays.append(owned_deck.get("cards", []))
	for drop in saved.get("floor_cards", []):
		if typeof(drop) == TYPE_DICTIONARY:
			card_arrays.append([drop.get("card", {})])
	for drop in saved.get("floor_deck_drops", []):
		if typeof(drop) == TYPE_DICTIONARY:
			var dropped_deck: Dictionary = drop.get("deck", {})
			card_arrays.append(dropped_deck.get("cards", []))
	var saved_map: Dictionary = saved.get("map", {})
	var vaults: Dictionary = saved_map.get("deck_vaults", {})
	for vault in vaults.values():
		if typeof(vault) == TYPE_DICTIONARY:
			card_arrays.append(vault.get("cards", []))
	var highest_id := 0
	for card_array in card_arrays:
		if typeof(card_array) != TYPE_ARRAY:
			continue
		for card in card_array:
			if typeof(card) == TYPE_DICTIONARY:
				highest_id = maxi(highest_id, int(card.get("id", 0)))
	return highest_id


func _save_run() -> bool:
	if run_state.is_empty() or screen_name in ["runLoading", "battle", "battleDeckCheck", "reward", "encounter"] \
			or deck_editor_session_active or is_instance_valid(player_name_setup_overlay):
		return false
	_sync_active_deck()
	var file := FileAccess.open(RUN_SAVE_PATH, FileAccess.WRITE)
	if file != null:
		file.store_var(map_debug_controller.session.snapshot_for_save(run_state), false)
		return true
	return false


func _sync_active_deck() -> void:
	if run_state.is_empty() or not run_state.has("deck"):
		return
	var decks: Array = run_state.get("owned_decks", [])
	if decks.is_empty():
		run_state["owned_decks"] = []
		run_state["active_deck_id"] = ""
		run_state["deck"] = []
		return
	var active_id := str(run_state.get("active_deck_id", ""))
	if active_id.is_empty():
		var first_deck: Dictionary = decks[0]
		run_state["active_deck_id"] = str(first_deck.get("id", ""))
		run_state["deck"] = first_deck.get("cards", []).duplicate(true)
		return
	for index in range(decks.size()):
		if str(decks[index].get("id", "")) != active_id:
			continue
		var updated: Dictionary = decks[index].duplicate(true)
		updated["cards"] = run_state["deck"].duplicate(true)
		decks[index] = updated
		run_state["owned_decks"] = decks
		return
	var fallback_deck: Dictionary = decks[0]
	run_state["active_deck_id"] = str(fallback_deck.get("id", ""))
	run_state["deck"] = fallback_deck.get("cards", []).duplicate(true)


func _select_deck_editor_target(deck_id: String) -> void:
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) != deck_id:
			continue
		deck_editor_selected_deck_id = deck_id
		_show_deck()
		return


func _activate_run_deck(deck_id: String) -> void:
	if not MapRules.is_safe_area_tile(run_state["map"], run_state["position"]):
		notice = "전투 덱은 안전 구역에서 변경할 수 있습니다."
		_show_deck()
		return
	_sync_active_deck()
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) != deck_id:
			continue
		run_state["active_deck_id"] = deck_id
		run_state["deck"] = deck.get("cards", []).duplicate(true)
		_save_run()
		_show_deck()
		return


func _select_map_deck(deck_id: String) -> void:
	if deck_id == str(run_state.get("active_deck_id", "starter")):
		return
	_sync_active_deck()
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) != deck_id:
			continue
		run_state["active_deck_id"] = deck_id
		run_state["deck"] = deck.get("cards", []).duplicate(true)
		notice = "전투 덱을 「%s」로 변경했습니다." % str(deck.get("name", "덱"))
		_save_run()
		_show_map()
		return


func _clear_run_save() -> void:
	if FileAccess.file_exists(RUN_SAVE_PATH):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(RUN_SAVE_PATH))


func _show_map() -> void:
	if screen_name == "deck":
		if get_viewport().gui_is_dragging():
			get_viewport().gui_cancel_drag()
		_finish_deck_editor_session()
	var active_map_seed := int(run_state.get("map_seed", -1))
	if map_visual_motion_seed != active_map_seed:
		map_visual_motion.reset(map_camera_center, {})
		map_visual_motion_seed = active_map_seed
	selected_battle_hand_card_id = -1
	extraction_ticket_mode = false
	screen_name = "map"
	battle_card_ledger_open = ""
	_clear_screen()
	var current_position: Vector2i = run_state["position"]
	var region_index := MapRules.region_index_at(current_position)
	var page := _new_page("", "")
	var page_heading := page.get_child(0)
	page.remove_child(page_heading)
	page_heading.queue_free()
	var toolbar_frame := CenterContainer.new()
	toolbar_frame.custom_minimum_size.y = 66
	toolbar_frame.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	page.add_child(toolbar_frame)
	var toolbar := HBoxContainer.new()
	toolbar.add_theme_constant_override("separation", 8)
	toolbar.custom_minimum_size = Vector2(minf(1440.0, get_viewport_rect().size.x) * 0.8, 58)
	toolbar.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	toolbar_frame.add_child(toolbar)
	var run_stats := VBoxContainer.new()
	run_stats.add_theme_constant_override("separation", 4)
	run_stats.custom_minimum_size.x = 205
	toolbar.add_child(run_stats)
	var health_width := 165.0 * minf(2.0, maxf(1.0, float(run_state["max_hp"]) / 50.0))
	var health_panel := PanelContainer.new()
	health_panel.custom_minimum_size = Vector2(health_width, 28)
	var health_panel_style := StyleBoxFlat.new()
	health_panel_style.bg_color = Color("#2c2825")
	health_panel_style.border_color = Color("#512522")
	health_panel_style.set_border_width_all(2)
	health_panel_style.set_corner_radius_all(3)
	health_panel_style.content_margin_left = 0
	health_panel_style.content_margin_top = 0
	health_panel_style.content_margin_right = 0
	health_panel_style.content_margin_bottom = 0
	health_panel.add_theme_stylebox_override("panel", health_panel_style)
	var health_overlay := Control.new()
	health_overlay.custom_minimum_size = Vector2(health_width, 28)
	health_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var health_bar := ProgressBar.new()
	health_bar.min_value = 0
	health_bar.max_value = maxi(1, int(run_state["max_hp"]))
	health_bar.value = clampi(int(run_state["player_hp"]), 0, int(health_bar.max_value))
	health_bar.show_percentage = false
	health_bar.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	health_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var health_background := StyleBoxFlat.new()
	health_background.bg_color = Color("#2c2825")
	health_background.set_corner_radius_all(2)
	var health_fill := StyleBoxFlat.new()
	health_fill.bg_color = Color("#b34a42")
	health_fill.set_corner_radius_all(2)
	health_bar.add_theme_stylebox_override("background", health_background)
	health_bar.add_theme_stylebox_override("fill", health_fill)
	health_overlay.add_child(health_bar)
	var health_label := _label("%d / %d" % [run_state["player_hp"], run_state["max_hp"]], 16, Color.WHITE)
	health_label.add_theme_font_override("font", map_health_font)
	health_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	health_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	health_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	health_label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	health_label.add_theme_constant_override("outline_size", 2)
	health_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	health_overlay.add_child(health_label)
	health_panel.add_child(health_overlay)
	run_stats.add_child(health_panel)
	var currencies := HBoxContainer.new()
	currencies.add_theme_constant_override("separation", 18)
	var gold_label := _label("$ %d" % int(run_state["gold"]), 18, Color("#f2cf69"))
	gold_label.add_theme_font_override("font", map_currency_font)
	var key_label := Button.new()
	key_label.name = "MapKeyCurrency"
	key_label.text = "열쇠 %d" % int(run_state.get("keys", 0))
	key_label.focus_mode = Control.FOCUS_NONE
	key_label.add_theme_font_size_override("font_size", 18)
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		key_label.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	for state in ["font_color", "font_hover_color", "font_pressed_color"]:
		key_label.add_theme_color_override(state, Color("#8fd4f3"))
	key_label.add_theme_font_override("font", map_currency_font)
	key_label.pressed.connect(func() -> void: map_debug_controller.count_activation(self))
	currencies.add_child(gold_label)
	currencies.add_child(key_label)
	run_stats.add_child(currencies)
	var lament_charges := int(run_state.get("gods_lament_charges", 0))
	var karma_stage := KarmaRules.stage_for_wins(int(run_state.get("region_battle_wins", 0)))
	if lament_charges > 0 or karma_stage > 0:
		var badges := MapStatusBadges.create(lament_charges, karma_stage,
			KarmaRules.description(karma_stage))
		badges.name = "MapStatusBadges"
		add_child(badges)
		var align_badges := func() -> void:
			if is_instance_valid(page) and is_instance_valid(badges):
				badges.global_position = page.global_position + Vector2(page.size.x * 0.9 + 12.0, 85.0)
		page.resized.connect(align_badges)
		align_badges.call_deferred()
	var toolbar_spacer := Control.new()
	toolbar_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	toolbar.add_child(toolbar_spacer)
	var wait_button := _button("한 턴 쉼", Callable(self, "_wait_on_map"), Vector2(104, 52))
	active_map_wait_button = wait_button
	_style_map_control_button(wait_button, Color("#e2edd8"), Color("#4f7654"), Color("#36533a"))
	wait_button.disabled = auto_travel_active or map_travel_active
	toolbar.add_child(wait_button)
	var search_button := _button("검색", Callable(self, "_open_map_search"), Vector2(76, 52))
	active_map_search_button = search_button
	_style_map_control_button(search_button, Color("#e2edd8"), Color("#4f7654"), Color("#36533a"))
	search_button.disabled = auto_travel_active or map_travel_active
	toolbar.add_child(search_button)
	toolbar.add_child(_map_restart_button())
	var inventory_label := "인벤토리"
	var inventory_button := _button(inventory_label, Callable(self, "_show_deck"), Vector2(126, 52))
	inventory_button.add_theme_font_override("font", map_control_font)
	inventory_button.add_theme_font_size_override("font_size", 16)
	toolbar.add_child(inventory_button)
	var settings_label := "설정"
	var settings_button := _button(settings_label, Callable(self, "_open_map_settings"), Vector2(82, 52))
	settings_button.add_theme_font_override("font", map_control_font)
	settings_button.add_theme_font_size_override("font_size", 16)
	toolbar.add_child(settings_button)
	var content := HBoxContainer.new()
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 18)
	page.add_child(content)

	var map_panel := VBoxContainer.new()
	map_panel.add_theme_constant_override("separation", 0)
	map_panel.custom_minimum_size = Vector2(0, 470)
	map_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(map_panel)
	if map_debug_controller.session.active:
		map_panel.add_child(map_debug_controller.make_toolbar(self, [], page))
	var map_surface := Control.new()
	map_surface.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	map_surface.size_flags_vertical = Control.SIZE_EXPAND_FILL
	map_surface.mouse_filter = Control.MOUSE_FILTER_IGNORE
	map_surface.clip_contents = true
	map_panel.add_child(map_surface)
	var map_viewport := Control.new()
	map_viewport.name = "MapViewport"
	map_viewport.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	map_viewport.anchor_left = 0.0
	map_viewport.anchor_right = 1.0
	map_viewport.offset_left = 0
	map_viewport.offset_right = 0
	map_viewport.clip_contents = true
	map_viewport.mouse_filter = Control.MOUSE_FILTER_IGNORE
	map_surface.add_child(map_viewport)
	var map_view := MapView.new()
	map_view.debug_mode = map_debug_controller.session.active
	active_map_view = map_view
	map_view.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	map_view.configure(run_state["map"], current_position, run_state["defeated_enemies"], map_camera_center, map_zoom,
		run_state.get("floor_cards", []), run_state.get("floor_deck_drops", []),
		run_state.get("floor_consumable_drops", []), map_ping_position, map_ping_label,
		map_visual_motion, pending_map_camera_duration_ms)
	pending_map_camera_duration_ms = 0.0
	map_view.tile_pressed.connect(_on_map_tile_pressed)
	map_view.floor_items_pressed.connect(_quick_pick_up_floor_items)
	map_view.camera_changed.connect(_on_map_camera_changed)
	map_view.ping_clear_requested.connect(_clear_map_ping)
	map_view.deck_vault_preview_requested.connect(_show_map_vault_preview)
	map_view.deck_vault_preview_clear_requested.connect(_request_map_vault_preview_clear)
	map_viewport.add_child(map_view)
	var minimap := MapMinimap.new()
	active_map_minimap = minimap
	minimap.configure(run_state["map"], current_position, region_index, minimap_player_marker,
		run_state.get("floor_cards", []), run_state.get("floor_deck_drops", []),
		run_state.get("floor_consumable_drops", []), minimap_size, minimap_zoom, minimap_view_offset)
	minimap.size_changed.connect(_on_minimap_size_changed)
	minimap.zoom_changed.connect(_on_minimap_zoom_changed)
	minimap.view_offset_changed.connect(_on_minimap_view_offset_changed)
	minimap.position_changed.connect(_on_minimap_position_changed)
	minimap.anchor_left = 0.0
	minimap.anchor_right = 0.0
	minimap.anchor_top = 0.0
	minimap.anchor_bottom = 0.0
	minimap.offset_left = minimap_position.x
	minimap.offset_top = minimap_position.y
	minimap.offset_right = minimap_position.x + minimap_size.x
	minimap.offset_bottom = minimap_position.y + minimap_size.y
	map_surface.add_child(minimap)
	active_map_surface = map_surface
	_configure_map_deck_selector()
	if gold_popup_pending > 0:
		map_view.show_gold_popup(gold_popup_pending)
		gold_popup_pending = 0
	call_deferred("_focus_map_on_player")


func _configure_map_deck_selector() -> void:
	var decks: Array = run_state.get("owned_decks", [])
	var active_id := str(run_state.get("active_deck_id", "starter"))
	var active_deck: Dictionary = {}
	for deck in decks:
		if str(deck.get("id", "")) == active_id:
			active_deck = deck
			break
	var active_cards: Array = run_state.get("deck", active_deck.get("cards", []))
	var capacity := int(active_deck.get("capacity", active_cards.size()))
	if not is_instance_valid(active_map_deck_selector_host):
		active_map_deck_selector_host = Control.new()
		active_map_deck_selector_host.name = "MapDeckSelectorHost"
		active_map_deck_selector_host.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(active_map_deck_selector_host)
		var selector := MapDeckSelector.new()
		selector.name = "MapDeckSelector"
		active_map_deck_selector = selector
		# CSS: right 10%+16px, 82px trigger scaled 1.2 about center bottom.
		selector.anchor_left = 0.9
		selector.anchor_right = 0.9
		selector.anchor_top = 1.0
		selector.anchor_bottom = 1.0
		selector.offset_left = -106.2
		selector.offset_top = -110.4
		selector.offset_right = -7.8
		selector.offset_bottom = -12.0
		selector.z_index = 12
		selector.deck_picked.connect(_select_map_deck)
		active_map_deck_selector_host.add_child(selector)
	active_map_deck_selector.call("configure", str(active_deck.get("name", "덱")),
		active_cards.size(), capacity, decks, MAX_OWNED_DECKS, active_id,
		active_cards.size(), capacity)
	move_child(active_map_deck_selector_host, get_child_count() - 1)
	_update_map_deck_selector_host()


func _update_map_deck_selector_host() -> void:
	if not is_instance_valid(active_map_deck_selector_host):
		return
	var show_selector := screen_name == "map" and not is_instance_valid(map_settings_overlay) \
		and not is_instance_valid(active_map_search_panel) and not is_instance_valid(player_name_setup_overlay)
	if not show_selector and active_map_deck_selector_host.visible:
		active_map_deck_selector.call("close_menu")
	active_map_deck_selector_host.visible = show_selector
	if is_instance_valid(active_map_surface):
		active_map_deck_selector_host.global_position = active_map_surface.global_position
		active_map_deck_selector_host.size = active_map_surface.size


func _show_inventory() -> void:
	screen_name = "inventory"
	_clear_screen()
	var page := _new_page("인벤토리", "%d / %d 사용 중" % [_inventory_item_count(), INVENTORY_CAPACITY])
	var status := _status_row([
		"체력 %d / %d" % [run_state.get("player_hp", 0), run_state.get("max_hp", 0)],
		"골드 $%d" % run_state.get("gold", 0),
		"열쇠 %d개" % run_state.get("keys", 0),
	])
	page.add_child(status)
	var content := ScrollContainer.new()
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	page.add_child(content)
	var sections := VBoxContainer.new()
	sections.add_theme_constant_override("separation", 18)
	content.add_child(sections)

	var cards: Array = run_state.get("inventory_cards", [])
	sections.add_child(_section_label("카드 · %d장" % cards.size(), COLOR_TEXT))
	if cards.is_empty():
		sections.add_child(_label("보유한 카드가 없습니다.", 14, COLOR_MUTED))
	else:
		var card_grid := GridContainer.new()
		card_grid.columns = clampi(floori((get_viewport_rect().size.x - 96.0) / 270.0), 1, 3)
		card_grid.add_theme_constant_override("h_separation", 12)
		card_grid.add_theme_constant_override("v_separation", 12)
		sections.add_child(card_grid)
		for card in cards:
			var entry := HBoxContainer.new()
			var card_slot := Control.new()
			card_slot.custom_minimum_size = Vector2(82, 82)
			card_slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
			card_slot.add_child(CompactCardView.create(card, 1, Callable(), Callable(), Callable(),
				blue_tooltip_theme, false))
			entry.add_child(card_slot)
			card_grid.add_child(entry)

	var consumables: Array = run_state.get("inventory_consumables", [])
	sections.add_child(_section_label("아이템 · %d개" % consumables.size(), COLOR_TEXT))
	if consumables.is_empty():
		sections.add_child(_label("보유한 아이템이 없습니다.", 14, COLOR_MUTED))
	else:
		var item_grid := GridContainer.new()
		item_grid.columns = clampi(floori((get_viewport_rect().size.x - 96.0) / 232.0), 1, 4)
		item_grid.add_theme_constant_override("h_separation", 12)
		item_grid.add_theme_constant_override("v_separation", 12)
		sections.add_child(item_grid)
		for consumable in consumables:
			var item_panel := _panel(Vector2(220, 128))
			var item_body := VBoxContainer.new()
			item_body.add_theme_constant_override("separation", 8)
			item_body.add_child(_label(str(consumable.get("name", "아이템")), 18, COLOR_TEXT))
			item_body.add_child(_label(str(consumable.get("description", "")), 14, COLOR_MUTED))
			item_panel.add_child(item_body)
			item_grid.add_child(item_panel)

	var actions := HBoxContainer.new()
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 12)
	page.add_child(actions)
	actions.add_child(_button("지도 복귀", Callable(self, "_show_map"), Vector2(180, 46)))


func _open_map_search() -> void:
	if screen_name != "map" or run_state.is_empty() or auto_travel_active or map_travel_active:
		return
	_clear_map_vault_preview()
	if is_instance_valid(active_map_search_panel) and not active_map_search_panel.is_queued_for_deletion():
		active_map_search_panel.focus_search()
		return
	var search_panel = MapSearchPanel.new()
	search_panel.configure(run_state, MapRules.region_index_at(run_state["position"]) + 1,
		minimap_player_marker, map_ping_position, Callable(self, "_card_widget"))
	search_panel.ping_requested.connect(_on_map_search_ping_requested)
	add_child(search_panel)
	active_map_search_panel = search_panel
	search_panel.tree_exited.connect(func() -> void:
		if active_map_search_panel == search_panel:
			active_map_search_panel = null
	)
	search_panel.focus_search()


func _on_map_search_ping_requested(position: Vector2i, label: String) -> void:
	if map_ping_position == position:
		map_ping_position = Vector2i(-1, -1)
		map_ping_label = ""
		notice = "핑을 해제했습니다."
	else:
		map_ping_position = position
		map_ping_label = label
		notice = "%s 위치에 핑을 찍었습니다." % label
	if position == run_state.get("position", Vector2i(-1, -1)):
		map_ping_position = Vector2i(-1, -1)
		map_ping_label = ""
		notice = "현재 위치라서 핑을 해제했습니다."
	if is_instance_valid(active_map_view):
		active_map_view.call("set_ping", map_ping_position, map_ping_label)


func _clear_map_ping() -> void:
	map_ping_position = Vector2i(-1, -1)
	map_ping_label = ""
	notice = "핑을 해제했습니다."
	if is_instance_valid(active_map_view):
		active_map_view.call("set_ping", map_ping_position, map_ping_label)


func _on_map_camera_changed(center: Vector2, zoom: float) -> void:
	_clear_map_vault_preview()
	map_camera_center = center
	map_zoom = zoom


func _show_map_vault_preview(position: Vector2i, anchor: Rect2) -> void:
	if screen_name != "map" or auto_travel_active or map_travel_active \
		or is_instance_valid(player_name_setup_overlay) or is_instance_valid(map_settings_overlay):
		return
	if is_instance_valid(active_map_vault_preview) and position == map_vault_preview_position:
		return
	var deck: Dictionary = MapVaultPreviewData.resolve(run_state, position, map_debug_controller.session.active)
	if deck.is_empty():
		return
	_clear_map_vault_preview()
	active_map_vault_preview = MapDeckVaultPreview.new()
	active_map_vault_preview.name = "MapDeckVaultPreview"
	# Keep the existing full-card popup (z=128) above the deck panel.
	active_map_vault_preview.z_index = 120
	active_map_vault_preview.card_hover_requested.connect(_show_card_hover_preview)
	active_map_vault_preview.card_hover_clear_requested.connect(_hide_card_hover_preview)
	active_map_vault_preview.preview_pointer_exited.connect(_request_map_vault_preview_clear)
	add_child(active_map_vault_preview)
	map_vault_preview_position = position
	map_vault_preview_anchor = anchor
	active_map_vault_preview.configure(deck, anchor, int(run_state.get("keys", 0)))


func _request_map_vault_preview_clear() -> void:
	# Mouse exit precedes entry into the adjoining panel. Check after dispatch.
	_close_map_vault_preview_if_outside.call_deferred()


func _close_map_vault_preview_if_outside() -> void:
	if not is_instance_valid(active_map_vault_preview):
		return
	var point := pointer_position
	if map_vault_preview_anchor.has_point(point) or active_map_vault_preview.contains_global_point(point):
		return
	if is_instance_valid(active_card_hover_preview) and active_card_hover_preview.get_global_rect().has_point(point):
		return
	_clear_map_vault_preview()


func _clear_map_vault_preview() -> void:
	if not is_instance_valid(active_map_vault_preview):
		return
	_hide_card_hover_preview()
	var preview := active_map_vault_preview
	active_map_vault_preview = null
	map_vault_preview_position = Vector2i(-1, -1)
	if preview.get_parent() == self:
		remove_child(preview)
	preview.queue_free()


func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_BEGIN:
		card_info_tooltip.clear()
		_hide_card_hover_preview()
		_hide_card_mechanic_preview()
	if what in [NOTIFICATION_WM_WINDOW_FOCUS_OUT, NOTIFICATION_APPLICATION_FOCUS_OUT, NOTIFICATION_APPLICATION_PAUSED]:
		card_info_tooltip.clear()
		run_reset_hold.cancel()
		_clear_map_vault_preview()
	elif what == NOTIFICATION_DRAG_BEGIN and screen_name == "battle":
		var payload: Variant = get_viewport().gui_get_drag_data()
		if payload is Dictionary and str(payload.get("kind", "")) == "battle-card" \
			and str(payload.get("source", "")) == "hand" and _is_valid_battle_drop(payload, "center", -1):
			battle_free_play_drop.begin(self)
	elif what == NOTIFICATION_DRAG_END:
		battle_free_play_drop.finish()


func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	if screen_name != "battle" or not battle_card_ledger_open.is_empty() or not data is Dictionary:
		return false
	return BattleFreePlayDrop.can_drop(pointer_position,
		active_battle_hand_area, battle_pile_widgets, data, Callable(self, "_is_valid_battle_drop"),
		_battle_enemy_drop_controls())


func _drop_data(at_position: Vector2, data: Variant) -> void:
	if _can_drop_data(at_position, data):
		_on_battle_card_dropped(data, "center", -1)


func _is_outside_battle_hand() -> bool:
	return BattleFreePlayDrop.in_play_band(active_battle_hand_area, pointer_position)


func _battle_enemy_drop_controls() -> Array[Control]:
	var controls: Array[Control] = []
	for enemy_widget in battle_enemy_widgets.values():
		if enemy_widget is Control:
			controls.append(enemy_widget)
	return controls


func _on_minimap_size_changed(new_size: Vector2) -> void:
	minimap_size = new_size
	_save_settings()


func _on_minimap_zoom_changed(new_zoom: float) -> void:
	minimap_zoom = new_zoom


func _on_minimap_view_offset_changed(new_offset: Vector2) -> void:
	minimap_view_offset = new_offset


func _on_minimap_position_changed(new_position: Vector2) -> void:
	minimap_position = new_position
	_save_settings()


func _on_map_tile_pressed(destination: Vector2i) -> void:
	if screen_name != "map" or auto_travel_active or map_travel_active:
		return
	var current: Vector2i = run_state["position"]
	if destination == current and _floor_card_count_at(current) \
		+ _floor_consumable_drop_count_at(current) + _floor_deck_drop_count_at(current) > 0:
		var current_room_type := MapRules.room_type_at(run_state["map"], current)
		var room_has_click_action := current_room_type in ["stickerAltar", "tinkerer", "cardTransmuter",
			"extractionShrine", "recoveryShrine", "vitalityShrine", "mindEyeShrine", "transformShrine",
			"treasureChest", "deckVault", "blessing", "portal", "safePortal", "heal", "partialHeal"]
		if not room_has_click_action:
			_quick_pick_up_floor_items()
			return
	if map_debug_controller.session.active and maxi(absi(destination.x - current.x), absi(destination.y - current.y)) > 1 \
		and MapRules.is_walkable(run_state["map"], destination):
		map_debug_controller.teleport(self, destination)
		return
	_try_move(destination)


func _try_move(destination: Vector2i) -> void:
	if not auto_travel_step_in_progress and not map_travel_step_in_progress:
		auto_travel_active = false
		auto_travel_path.clear()
		map_travel_active = false
		map_travel_path.clear()
		map_travel_target = Vector2i(-1, -1)
	var origin: Vector2i = run_state["position"]
	if origin == destination:
		_use_current_map_tile()
		return
	var map_data: Dictionary = run_state["map"]
	if not MapRules.is_walkable(map_data, destination):
		notice = "바위 타일은 통과할 수 없습니다."
		_show_map()
		return
	if maxi(absi(destination.x - origin.x), absi(destination.y - origin.y)) != 1:
		var route := MapTravel.find_enemy_avoiding_route(
			map_data, origin, destination, run_state.get("defeated_enemies", [])
		)
		if route.size() < 2:
			notice = "발견한 타일을 잇는 경로가 없습니다."
			_show_map()
			return
		map_travel_active = true
		map_travel_elapsed = 0.0
		map_travel_path = route
		map_travel_target = destination
		var travel_steps := maxi(route.size() - 1, 1)
		var step_ms := maxi(70, int(round(140.0 / sqrt(float(travel_steps)))))
		map_travel_step_interval = float(step_ms) / 1000.0
		notice = "적과의 거리와 경로를 고려해 이동 중 · 방향키로 취소"
		_show_map()
		return
	_update_safe_area_unlock_animation(map_data, origin, destination)
	run_state["position"] = destination
	map_camera_center = Vector2(destination) + Vector2(0.5, 0.5)
	if auto_travel_step_in_progress:
		pending_map_camera_duration_ms = auto_travel_step_interval * 1000.0
	elif map_travel_step_in_progress:
		pending_map_camera_duration_ms = map_travel_step_interval * 1000.0
	else:
		pending_map_camera_duration_ms = 0.0
	var reached_ping := destination == map_ping_position
	if reached_ping:
		map_ping_position = Vector2i(-1, -1)
		map_ping_label = ""
	MapRules.reveal_visible(map_data, destination)
	var gold_piles: Dictionary = map_data["gold_piles"]
	if gold_piles.has(destination):
		var amount := int(gold_piles[destination])
		run_state["gold"] = int(run_state["gold"]) + amount
		gold_piles.erase(destination)
		gold_popup_pending = amount
		notice = "+$%d 골드" % amount
	else:
		notice = ""
	if reached_ping:
		notice = "핑 위치에 도착했습니다."
	if map_data["enemy_positions"].has(destination) and not run_state["defeated_enemies"].has(destination):
		_start_battle(destination)
		return
	run_state["map_turn"] = int(run_state.get("map_turn", 0)) + 1
	var enemy_collision := MapEnemies.move_toward_player(
		map_data,
		origin,
		destination,
		run_state.get("defeated_enemies", []),
		int(run_state.get("map_seed", 0)) + int(run_state["map_turn"]) * 104729
	)
	if enemy_collision.x >= 0:
		_start_battle(enemy_collision)
		return
	var room_type := MapRules.room_type_at(map_data, destination)
	if room_type == "portal" or room_type == "safePortal":
		notice = "포탈 위에 있습니다. Enter를 눌러 이동하세요."
	_save_run()
	_show_map()
	call_deferred("_focus_map_on_player")


func _update_safe_area_unlock_animation(map_data: Dictionary, origin: Vector2i, destination: Vector2i) -> void:
	var was_in_safe_area := MapRules.is_safe_area_tile(map_data, origin)
	var enters_safe_area := MapRules.is_safe_area_tile(map_data, destination)
	if enters_safe_area and not was_in_safe_area:
		safe_area_unlock_pending_animation = true
	elif not enters_safe_area:
		safe_area_unlock_pending_animation = false


func _wait_on_map() -> void:
	if screen_name != "map" or run_state.is_empty() or auto_travel_active or map_travel_active:
		return
	var position: Vector2i = run_state["position"]
	var map_data: Dictionary = run_state["map"]
	run_state["map_turn"] = int(run_state.get("map_turn", 0)) + 1
	var enemy_collision := MapEnemies.move_toward_player(
		map_data,
		position,
		position,
		run_state.get("defeated_enemies", []),
		int(run_state.get("map_seed", 0)) + int(run_state["map_turn"]) * 104729
	)
	if enemy_collision.x >= 0:
		_start_battle(enemy_collision)
		_show_map_wait_notice()
		return
	notice = "한 턴 쉬었습니다."
	_save_run()
	_show_map()
	_show_map_wait_notice()


func _show_map_wait_notice() -> void:
	if is_instance_valid(active_map_wait_notice):
		active_map_wait_notice.queue_free()
	active_map_wait_notice = MapWaitNotice.new()
	active_map_wait_notice.name = "MapWaitNotice"
	active_map_wait_notice.configure(Vector2.ZERO)
	add_child(active_map_wait_notice)
	_update_map_wait_notice()
	active_map_wait_notice.play()


func _update_map_wait_notice() -> void:
	if screen_name not in ["map", "encounter"] or not is_instance_valid(active_map_wait_notice) \
		or not is_instance_valid(active_map_view):
		return
	var cell: Rect2 = active_map_view.call("_cell_rect", run_state["position"])
	var map_to_main := get_global_transform_with_canvas().affine_inverse() * active_map_view.get_global_transform_with_canvas()
	active_map_wait_notice.position = map_to_main * cell.get_center()
	active_map_wait_notice.scale = map_to_main.get_scale() * float(active_map_view.get("tile_size")) / 136.0


func _focus_map_on_player() -> void:
	if is_instance_valid(active_map_view):
		active_map_view.call("focus_if_player_left_view")


func _use_current_map_tile() -> void:
	if screen_name != "map" or run_state.is_empty():
		return
	auto_travel_active = false
	auto_travel_path.clear()
	var current: Vector2i = run_state["position"]
	var map_data: Dictionary = run_state["map"]
	var room_type := MapRules.room_type_at(map_data, current)
	var region_index := MapRules.region_index_at(current)
	if room_type in ["portal", "safePortal"] and int(run_state.get("keys", 0)) > 0:
		pending_portal_type = room_type
		_show_portal_key_warning()
		return
	if room_type == "deckVault":
		_show_deck_vault(current)
		return
	if ["stickerAltar", "tinkerer", "cardTransmuter"].has(room_type):
		_open_sticker_service(room_type, current)
		return
	if room_type == "heal":
		var previous_hp := int(run_state["player_hp"])
		run_state["player_hp"] = int(run_state["max_hp"])
		notice = "체력을 %d 회복했습니다." % (int(run_state["player_hp"]) - previous_hp)
		map_data["room_types"][current] = "empty"
	elif room_type == "partialHeal":
		var previous_hp := int(run_state["player_hp"])
		var heal_amount := floori(float(run_state["max_hp"]) * 0.3)
		run_state["player_hp"] = mini(int(run_state["max_hp"]), previous_hp + heal_amount)
		notice = "체력을 %d 회복했습니다." % (int(run_state["player_hp"]) - previous_hp)
		map_data["room_types"][current] = "empty"
	elif room_type == "portal":
		var entries: Dictionary = map_data.get("safe_area_entries", {})
		if not entries.has(region_index):
			return
		safe_area_unlock_pending_animation = true
		run_state["position"] = entries[region_index]
		run_state["gods_lament_charges"] = 0
		run_state["region_battle_wins"] = 0
		notice = "안전 구역에 도착했습니다."
	elif room_type == "safePortal":
		if region_index >= MapRules.REGION_COUNT - 1:
			notice = "마지막 지역입니다."
			_show_map()
			return
		run_state["position"] = Vector2i(MapRules.START.x, (region_index + 1) * MapRules.REGION_STRIDE)
		safe_area_unlock_pending_animation = false
		run_state["gods_lament_charges"] = 3
		run_state["region_battle_wins"] = 0
		notice = "지역 %d에 도착했습니다." % (region_index + 2)
	else:
		notice = "이 타일은 아직 상호작용할 수 없습니다."
		_show_map()
		return
	MapRules.reveal_visible(map_data, run_state["position"])
	map_camera_center = Vector2(run_state["position"]) + Vector2(0.5, 0.5)
	pending_map_camera_duration_ms = 0.0
	_save_run()
	_show_map()


func _show_portal_key_warning() -> void:
	screen_name = "portalWarning"
	_clear_screen()
	var keys := int(run_state.get("keys", 0))
	var page := _new_page("열쇠 확인", "지역을 이동하면 보유한 열쇠 %d개를 잃습니다." % keys)
	var body := VBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.alignment = BoxContainer.ALIGNMENT_CENTER
	body.add_theme_constant_override("separation", 14)
	page.add_child(body)
	body.add_child(_label("덱 금고를 열 때 열쇠 3개가 필요합니다.", 18, COLOR_MUTED))
	var leave_keys := _button("열쇠를 두고 이동", Callable(self, "_confirm_portal_key_loss"), Vector2(260, 50))
	leave_keys.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	body.add_child(leave_keys)
	var cancel := _button("취소", Callable(self, "_cancel_portal_key_warning"), Vector2(220, 46))
	cancel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	body.add_child(cancel)


func _cancel_portal_key_warning() -> void:
	pending_portal_type = ""
	_show_map()


func _confirm_portal_key_loss() -> void:
	var current: Vector2i = run_state.get("position", MapRules.START)
	if MapRules.room_type_at(run_state["map"], current) != pending_portal_type:
		pending_portal_type = ""
		_show_map()
		return
	run_state["keys"] = 0
	pending_portal_type = ""
	screen_name = "map"
	_use_current_map_tile()


func _show_deck_vault(position: Vector2i) -> void:
	screen_name = "deckVault"
	var room_key := "%d,%d" % [position.x, position.y]
	var map_data: Dictionary = run_state["map"]
	var vaults: Dictionary = map_data.get("deck_vaults", {})
	if not vaults.has(room_key):
		var vault_random := RandomNumberGenerator.new()
		vault_random.seed = int(run_state.get("map_seed", 0)) ^ ((position.x + 17) * 73856093) ^ ((position.y + 31) * 19349663)
		var generated := CardCatalog.create_region_deck(MapRules.region_index_at(position) + 1,
			int(run_state.get("next_card_id", run_state["deck"].size() + 1)), vault_random, 0.02)
		vaults[room_key] = generated["deck"]
		map_data["deck_vaults"] = vaults
		run_state["map"] = map_data
		run_state["next_card_id"] = int(generated["next_card_id"])
		_save_run()
	var vault: Dictionary = vaults[room_key]
	var opened_vaults: Dictionary = map_data.get("opened_deck_vaults", {})
	var is_opened := bool(opened_vaults.get(room_key, false))
	_show_map()
	screen_name = "deckVault"
	var modal := DeckVaultModal.new()
	modal.name = "DeckVaultModal"
	modal.z_index = 100
	modal.configure(vault, int(run_state.get("keys", 0)), is_opened, blue_tooltip_theme,
		Callable(self, "_show_card_hover_preview"), Callable(self, "_hide_card_hover_preview"))
	modal.close_requested.connect(_show_map)
	modal.unlock_requested.connect(_unlock_deck_vault.bind(position))
	add_child(modal)


func _owned_deck_id_exists(deck_id: String) -> bool:
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == deck_id:
			return true
	return false


func _unlock_deck_vault(position: Vector2i) -> void:
	if screen_name != "deckVault" or position != run_state.get("position", Vector2i(-1, -1)) \
		or MapRules.room_type_at(run_state["map"], position) != "deckVault":
		return
	if int(run_state.get("keys", 0)) < DECK_VAULT_KEY_COST:
		_show_deck_vault(position)
		return
	var room_key := "%d,%d" % [position.x, position.y]
	var map_data: Dictionary = run_state["map"]
	var vaults: Dictionary = map_data.get("deck_vaults", {})
	var opened_vaults: Dictionary = map_data.get("opened_deck_vaults", {})
	if not vaults.has(room_key) or bool(opened_vaults.get(room_key, false)):
		_show_deck_vault(position)
		return
	var new_deck: Dictionary = vaults[room_key].duplicate(true)
	var pending_decks: Array = run_state.get("floor_deck_drops", [])
	new_deck["id"] = "vault-%d-%d" % [position.x, position.y]
	pending_decks.append({"x": position.x, "y": position.y, "deck": new_deck})
	run_state["floor_deck_drops"] = pending_decks
	var consumable_id := int(run_state.get("next_consumable_id", 1))
	var pending_consumables: Array = run_state.get("floor_consumable_drops", [])
	pending_consumables.append({"x": position.x, "y": position.y, "consumable": {
		"id": "extract-%d" % consumable_id,
		"type": "extractTicket",
		"name": "추출 티켓",
		"description": "덱에서 희귀도를 가리지 않고 카드 1장을 추출합니다.",
	}})
	run_state["floor_consumable_drops"] = pending_consumables
	run_state["next_consumable_id"] = consumable_id + 1
	run_state["keys"] = int(run_state.get("keys", 0)) - DECK_VAULT_KEY_COST
	opened_vaults[room_key] = true
	map_data["opened_deck_vaults"] = opened_vaults
	run_state["map"] = map_data
	notice = "금고 보상 덱과 추출 티켓이 바닥에 떨어졌습니다."
	_save_run()
	_show_map()
	_show_vault_release_notice(new_deck)


func _show_vault_release_notice(deck: Dictionary) -> void:
	if is_instance_valid(active_vault_release_notice):
		active_vault_release_notice.queue_free()
	var release_notice := DeckVaultReleaseNotice.new()
	release_notice.name = "DeckVaultReleaseNotice"
	release_notice.configure(deck)
	active_vault_release_notice = release_notice
	release_notice.closed.connect(func() -> void:
		if active_vault_release_notice == release_notice:
			active_vault_release_notice = null
	)
	add_child(release_notice)


func _start_battle(enemy_position: Vector2i) -> void:
	if screen_name == "encounter":
		return
	auto_travel_active = false
	auto_travel_path.clear()
	map_travel_active = false
	map_travel_path.clear()
	selected_battle_hand_card_id = -1
	_show_map()
	screen_name = "encounter"
	var generation := map_encounter_generation
	var blocker := Control.new()
	blocker.name = "MapEncounterInputBlocker"
	blocker.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(blocker)
	await get_tree().process_frame
	if generation != map_encounter_generation or screen_name != "encounter" or not is_instance_valid(active_map_view):
		return
	var cell := _encounter_banner_rect()
	var transition := MapEncounterTransition.new()
	transition.name = "MapEncounterTransition"
	transition.configure(cell.get_center(), cell.size.x / 136.0, Callable(self, "_encounter_banner_rect"))
	transition.finished.connect(_finish_map_encounter.bind(enemy_position, generation))
	active_map_view.add_child(transition)
	transition.play()


func _encounter_banner_rect() -> Rect2:
	if not is_instance_valid(active_map_view):
		return Rect2()
	# Browser MapEntityMarkers places the banner on the current player marker.
	return active_map_view.call("_cell_rect", active_map_view.player_position)


func _finish_map_encounter(enemy_position: Vector2i, generation: int) -> void:
	if generation != map_encounter_generation or screen_name != "encounter":
		return
	if battle_deck_check_enabled and run_state.get("owned_decks", []).size() >= 2:
		pending_battle_enemy_position = enemy_position
		pending_battle_deck_id = str(run_state.get("active_deck_id", "starter"))
		_show_battle_deck_check()
		return
	_start_battle_now(enemy_position)


func _start_battle_now(enemy_position: Vector2i) -> void:
	battle_session_generation += 1
	battle_card_presentation.invalidate()
	battle_turn_resolving = false
	run_state["encounter_position"] = enemy_position
	var encounter_index := int(run_state["map"].get("enemy_encounters", {}).get(enemy_position, 0))
	var active_deck: Dictionary = {}
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == str(run_state.get("active_deck_id", "starter")):
			active_deck = deck
			break
	var active_editions: Array = active_deck.get("editions", [])
	var active_capacity := int(active_deck.get("capacity", run_state["deck"].size()))
	var encounter := EnemyCatalog.create_encounter(encounter_index)
	var karma_stage := KarmaRules.stage_for_wins(int(run_state.get("region_battle_wins", 0)))
	var lament_charges := int(run_state.get("gods_lament_charges", 0))
	var prepared := BattleSetup.prepare_encounter(encounter, karma_stage, lament_charges)
	encounter = prepared["encounter"]
	run_state["gods_lament_charges"] = prepared["remaining_lament_charges"]
	var initial_draw_view: Dictionary = {}
	var final_state := BattleRules.start_battle(
		run_state["deck"], int(run_state["player_hp"]), encounter,
		int(run_state["max_hp"]), active_editions, active_capacity, initial_draw_view
	)
	selected_source = {}
	if active_deck.is_empty():
		# The browser starts a defeat when there is no owned battle deck.
		final_state["status"] = "lost"
		final_state["player_hp"] = 0
		final_state["message"] = "사용할 덱이 없어 쓰러졌습니다."
		battle_state = final_state
		_show_battle()
		return
	battle_draw_presentation.begin_initial(self, initial_draw_view["before"], final_state)


func _show_battle_deck_check() -> void:
	screen_name = "battleDeckCheck"
	_clear_screen()
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.0, 0.0, 0.0, 0.68)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)
	var viewport_size := get_viewport_rect().size
	var panel_size := Vector2(minf(1080.0, viewport_size.x - 40.0), minf(780.0, viewport_size.y - 40.0))
	var panel := _panel(panel_size)
	center.add_child(panel)
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 12)
	panel.add_child(body)
	var title := _label("잠깐! 올바른 덱을 선택하셨나요?", 24, COLOR_TEXT)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.add_child(title)
	var subtitle := _label("이번 전투에서 사용할 덱을 선택하세요.", 14, COLOR_MUTED)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.add_child(subtitle)
	var deck_choices := HBoxContainer.new()
	deck_choices.alignment = BoxContainer.ALIGNMENT_CENTER
	deck_choices.add_theme_constant_override("separation", 10)
	body.add_child(deck_choices)
	var owned_decks: Array = run_state.get("owned_decks", [])
	var pending_deck_exists := false
	var active_deck_exists := false
	var active_deck_id := str(run_state.get("active_deck_id", ""))
	for deck in owned_decks:
		var deck_id := str(deck.get("id", ""))
		pending_deck_exists = pending_deck_exists or deck_id == pending_battle_deck_id
		active_deck_exists = active_deck_exists or deck_id == active_deck_id
	if not pending_deck_exists and not owned_decks.is_empty():
		pending_battle_deck_id = active_deck_id if active_deck_exists else str(owned_decks[0].get("id", ""))
	var selected_deck: Dictionary = {}
	for deck in owned_decks:
		var deck_id := str(deck.get("id", ""))
		if deck_id == pending_battle_deck_id:
			selected_deck = deck
		var deck_cards: Array = deck.get("cards", [])
		var deck_button := _button("",
			Callable(self, "_select_battle_deck_preview").bind(deck_id), Vector2(230, 76))
		deck_button.add_theme_font_size_override("font_size", 13)
		var deck_button_content := VBoxContainer.new()
		deck_button_content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		deck_button_content.offset_left = 6
		deck_button_content.offset_right = -6
		deck_button_content.offset_top = 4
		deck_button_content.offset_bottom = -4
		deck_button_content.add_theme_constant_override("separation", 0)
		deck_button_content.alignment = BoxContainer.ALIGNMENT_CENTER
		deck_button_content.mouse_filter = Control.MOUSE_FILTER_PASS
		deck_button.add_child(deck_button_content)
		var deck_name := _label("덱 「%s」" % str(deck.get("name", "덱")), 13, COLOR_TEXT)
		deck_name.add_theme_font_override("font", DeckEditorHeadingFont)
		deck_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		deck_name.mouse_filter = Control.MOUSE_FILTER_IGNORE
		deck_button_content.add_child(deck_name)
		if not (deck.get("editions", []) as Array).is_empty():
			var editions := DeckEditionList.build(deck.get("editions", []), deck.get("edition_colors", {}), DeckEditorHeadingFont, 13)
			editions.alignment = FlowContainer.ALIGNMENT_CENTER
			deck_button_content.add_child(editions)
		var deck_count := _label("%d / %d장" % [deck_cards.size(), int(deck.get("capacity", 25))], 13, COLOR_TEXT)
		deck_count.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		deck_count.mouse_filter = Control.MOUSE_FILTER_IGNORE
		deck_button_content.add_child(deck_count)
		var is_selected := deck_id == pending_battle_deck_id
		deck_button.add_theme_stylebox_override("normal", _button_style(
			Color("#403428") if is_selected else Color("#202522"),
			Color("#e0a448") if is_selected else COLOR_BORDER))
		deck_button.add_theme_stylebox_override("hover", _button_style(Color("#403b30"), Color("#e0a448")))
		deck_choices.add_child(deck_button)
	if selected_deck.is_empty() and not owned_decks.is_empty():
		selected_deck = owned_decks[0]
		pending_battle_deck_id = str(selected_deck.get("id", ""))
	var selected_name := _label("%s 구성" % str(selected_deck.get("name", "덱")), 17, COLOR_TEXT)
	body.add_child(selected_name)
	var cards_scroll := ScrollContainer.new()
	cards_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cards_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards_scroll.custom_minimum_size.y = maxf(180.0, panel_size.y - 250.0)
	cards_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	body.add_child(cards_scroll)
	var card_flow := HFlowContainer.new()
	card_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card_flow.add_theme_constant_override("h_separation", 6)
	card_flow.add_theme_constant_override("v_separation", 6)
	card_flow.alignment = FlowContainer.ALIGNMENT_CENTER
	cards_scroll.add_child(card_flow)
	var grouped_cards := _group_deck_editor_cards(selected_deck.get("cards", []))
	grouped_cards.sort_custom(Callable(self, "_battle_deck_check_group_less"))
	for group in grouped_cards:
		var card: Dictionary = _deck_editor_group_representative(group)
		var group_ids: Array = group.get("ids", [])
		var count := group_ids.size()
		card_flow.add_child(_battle_deck_check_card_widget(card, count))
	var confirm := _button("이 덱으로 전투 시작", Callable(self, "_confirm_battle_deck"), Vector2(260, 48))
	confirm.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	confirm.disabled = selected_deck.is_empty()
	body.add_child(confirm)


func _select_battle_deck_preview(deck_id: String) -> void:
	pending_battle_deck_id = deck_id
	_show_battle_deck_check()


func _battle_deck_check_group_less(left: Dictionary, right: Dictionary) -> bool:
	var left_card: Dictionary = left.get("card", {})
	var right_card: Dictionary = right.get("card", {})
	var rarity_order := {"legendary": 0, "rare": 1, "special": 2, "basic": 3, "starter": 4, "status": 5}
	var left_rarity := int(rarity_order.get(str(left_card.get("rarity", "status")), 99))
	var right_rarity := int(rarity_order.get(str(right_card.get("rarity", "status")), 99))
	if left_rarity != right_rarity:
		return left_rarity < right_rarity
	var left_cost := int(CardStickers.card_energy_cost(left_card)) if left_card.has("cost") else -1
	var right_cost := int(CardStickers.card_energy_cost(right_card)) if right_card.has("cost") else -1
	if left_cost != right_cost:
		return left_cost < right_cost
	return DeckVaultCardView.name_less(str(left_card.get("name", "")), str(right_card.get("name", "")))


func _battle_deck_check_card_widget(card: Dictionary, count: int) -> Control:
	var stack_layers := mini(5, maxi(0, count - 1))
	var holder := Control.new()
	holder.custom_minimum_size = Vector2(82 + stack_layers * 7, 82)
	holder.mouse_filter = Control.MOUSE_FILTER_PASS
	var card_view := CompactCardView.create(card, count,
		Callable(self, "_show_card_hover_preview"), Callable(self, "_hide_card_hover_preview"),
		Callable(self, "_hide_card_hover_preview"), blue_tooltip_theme, true)
	card_view.position.x = stack_layers * 7
	holder.add_child(card_view)
	return holder


func _confirm_battle_deck() -> void:
	_sync_active_deck()
	var selected_deck: Dictionary = {}
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == pending_battle_deck_id:
			selected_deck = deck
			break
	if selected_deck.is_empty():
		return
	run_state["active_deck_id"] = pending_battle_deck_id
	run_state["deck"] = selected_deck.get("cards", []).duplicate(true)
	var encounter_position := pending_battle_enemy_position
	pending_battle_deck_id = ""
	pending_battle_enemy_position = Vector2i(-1, -1)
	_start_battle_now(encounter_position)


func _show_battle(keep_draw_phase: bool = false) -> void:
	if screen_name == "reward":
		return
	battle_draw_presentation.prepare_rebuild(self, keep_draw_phase)
	screen_name = "battle"
	battle_hand_card_widgets.clear()
	battle_pile_widgets.clear()
	battle_piles_scroll = null
	_clear_screen()
	if battle_state.get("status") == "lost":
		_show_defeat()
		return
	var battlefield_background := ColorRect.new()
	battlefield_background.color = Color.BLACK
	battlefield_background.z_index = -10
	battlefield_background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	battlefield_background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(battlefield_background)
	move_child(battlefield_background, 0)
	var battlefield_frame := PanelContainer.new()
	battlefield_frame.z_index = -5
	battlefield_frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	battlefield_frame.offset_left = 12
	battlefield_frame.offset_top = 12
	battlefield_frame.offset_right = -12
	battlefield_frame.offset_bottom = -12
	battlefield_frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var battlefield_style := StyleBoxFlat.new()
	battlefield_style.bg_color = COLOR_BATTLE_FELT
	battlefield_style.border_color = Color("#69746f")
	battlefield_style.set_border_width_all(1)
	battlefield_style.set_corner_radius_all(5)
	battlefield_style.content_margin_left = 0
	battlefield_style.content_margin_top = 0
	battlefield_style.content_margin_right = 0
	battlefield_style.content_margin_bottom = 0
	battlefield_frame.add_theme_stylebox_override("panel", battlefield_style)
	add_child(battlefield_frame)
	move_child(battlefield_frame, 0)
	var board = BattleBoardLayoutScript.new()
	active_battle_play_area = board
	board.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	board.offset_left = 13
	board.offset_top = 13
	board.offset_right = -13
	board.offset_bottom = -13
	add_child(board)
	var battle_hud_overlay := Control.new()
	battle_hud_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	battle_hud_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	battle_hud_overlay.z_index = 20
	add_child(battle_hud_overlay)
	var battle_ledger := HBoxContainer.new()
	battle_ledger.position = Vector2(22, 22)
	battle_ledger.add_theme_constant_override("separation", 5)
	battle_hud_overlay.add_child(battle_ledger)
	var pile_card_count := 0
	for pile in battle_state.get("piles", []):
		pile_card_count += pile.size()
	var active_name := "현재 덱"
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == str(run_state.get("active_deck_id", "")):
			active_name = "덱 「%s」" % str(deck.get("name", ""))
	var ledger_entries := [
		{"id": "deck", "title": active_name, "count": run_state.get("deck", []).size()},
		{"id": "piles", "title": "파일", "count": pile_card_count},
		{"id": "discard", "title": "버린 카드", "count": battle_state.get("discard", []).size()},
	]
	for ledger in ledger_entries:
		var ledger_button := Button.new()
		ledger_button.text = "%s\n%d장" % [str(ledger["title"]), int(ledger["count"])]
		ledger_button.custom_minimum_size = Vector2(77, 47)
		ledger_button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		ledger_button.add_theme_font_size_override("font_size", 10)
		var ledger_is_open := battle_card_ledger_open == str(ledger["id"])
		ledger_button.add_theme_stylebox_override("normal", _button_style(
			Color("#305641") if ledger_is_open else Color("#17231f"),
			Color("#c7e5cf") if ledger_is_open else Color(1, 1, 1, 0.34)))
		ledger_button.add_theme_stylebox_override("hover", _button_style(Color("#305641"), Color("#c7e5cf")))
		ledger_button.pressed.connect(_toggle_battle_card_ledger.bind(str(ledger["id"])))
		battle_ledger.add_child(ledger_button)
	var turn_badge := HBoxContainer.new()
	turn_badge.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	turn_badge.offset_left = -74
	turn_badge.offset_top = 8
	turn_badge.offset_right = -12
	turn_badge.offset_bottom = 36
	var turn_badge_body := HBoxContainer.new()
	turn_badge_body.add_theme_constant_override("separation", 6)
	turn_badge_body.add_child(_label("TURN", 11, Color("#253c30")))
	turn_badge_body.add_child(_label(str(battle_state.get("turn", 1)), 20, Color("#253c30")))
	turn_badge.add_child(turn_badge_body)
	battle_hud_overlay.add_child(turn_badge)
	var player_column := VBoxContainer.new()
	board.add_child(player_column)
	board.player = player_column
	var files_margin := MarginContainer.new()
	files_margin.add_theme_constant_override("margin_left", 22)
	files_margin.add_theme_constant_override("margin_right", 22)
	files_margin.add_theme_constant_override("margin_top", 10)
	files_margin.add_theme_constant_override("margin_bottom", 10)
	board.add_child(files_margin)
	board.files = files_margin
	var center_files := VBoxContainer.new()
	center_files.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center_files.size_flags_vertical = Control.SIZE_EXPAND_FILL
	center_files.add_theme_constant_override("separation", 4)
	files_margin.add_child(center_files)
	var enemy_column := MarginContainer.new()
	enemy_column.add_theme_constant_override("margin_left", 10)
	enemy_column.add_theme_constant_override("margin_right", 10)
	enemy_column.add_theme_constant_override("margin_top", 0)
	board.add_child(enemy_column)
	board.enemies = enemy_column
	var center_drop = BattleDropButtonScript.new()
	_style_button(center_drop, "", Callable(), Vector2(0, 112))
	center_drop.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	center_drop.target_kind = "center"
	center_drop.target_index = -1
	center_drop.accepts_battle_drops = _battle_drop_available()
	center_drop.drop_validator = Callable(self, "_is_valid_battle_drop")
	center_drop.drop_point_validator = Callable(self, "_is_outside_battle_hand")
	center_drop.card_dropped.connect(_on_battle_card_dropped)
	var center_drop_style := StyleBoxFlat.new()
	center_drop_style.bg_color = Color(1, 1, 1, 0)
	center_drop_style.set_border_width_all(0)
	center_drop_style.content_margin_left = 0
	center_drop_style.content_margin_top = 0
	center_drop_style.content_margin_right = 0
	center_drop_style.content_margin_bottom = 0
	for style_name in ["normal", "hover", "pressed", "disabled", "focus"]:
		center_drop.add_theme_stylebox_override(style_name, center_drop_style)
	center_drop.add_child(_battle_resource_cluster())
	board.add_child(center_drop)
	board.center = center_drop
	var player_panel := VBoxContainer.new()
	player_panel.add_theme_constant_override("separation", 6)
	player_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	player_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	player_column.add_child(player_panel)
	player_panel.add_child(_battle_player_identity())
	var player_statuses: Array[String] = []
	if int(battle_state.get("player_amplification", 0)) < 0:
		player_statuses.append("약화 %d" % absi(int(battle_state["player_amplification"])))
	elif int(battle_state.get("player_amplification", 0)) > 0:
		player_statuses.append("증폭 %d" % int(battle_state["player_amplification"]))
	if int(battle_state.get("player_resistance", 0)) < 0:
		player_statuses.append("취약 %d" % absi(int(battle_state["player_resistance"])))
	elif int(battle_state.get("player_resistance", 0)) > 0:
		player_statuses.append("저항 %d" % int(battle_state["player_resistance"]))
	if int(battle_state.get("strength", 0)) != 0:
		var strength := int(battle_state["strength"])
		player_statuses.append("힘 %s%d" % ["+" if strength > 0 else "", strength])
	if int(battle_state.get("temporary_strength", 0)) != 0:
		var temporary_strength := int(battle_state["temporary_strength"])
		player_statuses.append("이번 턴 힘 %s%d" % ["+" if temporary_strength > 0 else "", temporary_strength])
	if int(battle_state.get("agility", 0)) != 0:
		var agility := int(battle_state["agility"])
		player_statuses.append("강인함 %s%d" % ["+" if agility > 0 else "", agility])
	if int(battle_state.get("player_invulnerability_turns", 0)) > 0:
		player_statuses.append("무적 %d" % int(battle_state["player_invulnerability_turns"]))
	if bool(battle_state.get("repeat_next_attack", false)):
		player_statuses.append("다음 공격 ×2")
	if not player_statuses.is_empty():
		var status_flow := HFlowContainer.new()
		status_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		status_flow.add_theme_constant_override("h_separation", 6)
		status_flow.add_theme_constant_override("v_separation", 6)
		status_flow.add_child(_label("상태", 12, COLOR_MUTED))
		for status_text in player_statuses:
			var status_color := COLOR_ORANGE
			if status_text.begins_with("약화") or status_text.begins_with("취약") \
				or status_text.begins_with("힘 -") or status_text.begins_with("이번 턴 힘 -") \
				or status_text.begins_with("강인함 -"):
				status_color = COLOR_RED
			elif status_text.begins_with("저항") or status_text.begins_with("강인함") or status_text.begins_with("무적"):
				status_color = Color("#82b6da")
			elif status_text.begins_with("다음 공격"):
				status_color = COLOR_GOLD
			var badge := PanelContainer.new()
			var badge_style := _button_style(COLOR_PANEL_HIGHLIGHT, status_color)
			badge_style.content_margin_left = 8
			badge_style.content_margin_top = 4
			badge_style.content_margin_right = 8
			badge_style.content_margin_bottom = 4
			badge.add_theme_stylebox_override("panel", badge_style)
			var badge_label := _label(status_text, 13, status_color)
			badge.tooltip_text = _battle_status_tooltip(status_text)
			badge.add_child(badge_label)
			status_flow.add_child(badge)
		player_panel.add_child(status_flow)
	var battle_edition_ids: Array = battle_state.get("deck_editions", [])
	if not battle_edition_ids.is_empty():
		var edition_flow := HFlowContainer.new()
		edition_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		edition_flow.add_theme_constant_override("h_separation", 6)
		edition_flow.add_theme_constant_override("v_separation", 6)
		for edition_value in battle_edition_ids:
			var edition_id := str(edition_value)
			var edition_badge := PanelContainer.new()
			var edition_style := _button_style(Color("#282e2a"), Color("#bda65d"))
			edition_style.content_margin_left = 8
			edition_style.content_margin_top = 4
			edition_style.content_margin_right = 8
			edition_style.content_margin_bottom = 4
			edition_badge.add_theme_stylebox_override("panel", edition_style)
			TooltipBindings.bind_edition(edition_badge, edition_id)
			edition_badge.theme = blue_tooltip_theme
			edition_badge.add_child(_label("에디션 : [%s]" % DeckEditions.label(edition_id), 12, COLOR_GOLD))
			edition_flow.add_child(edition_badge)
		player_panel.add_child(edition_flow)
	var battle_content := center_files
	var encounter_enemies: Array = battle_state.get("enemies", [])
	if not encounter_enemies.is_empty():
		var enemy_scroll := ScrollContainer.new()
		enemy_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		enemy_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
		enemy_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
		enemy_column.add_child(enemy_scroll)
		var targets := VBoxContainer.new()
		var crowded_enemies := encounter_enemies.size() > 2
		var enemy_gap := 12.0
		if crowded_enemies:
			enemy_gap = 10.0
		targets.add_theme_constant_override("separation", int(enemy_gap))
		targets.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var enemy_padding := MarginContainer.new()
		enemy_padding.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		enemy_padding.add_theme_constant_override("margin_top", 22)
		enemy_padding.add_theme_constant_override("margin_bottom", 18)
		enemy_scroll.add_child(enemy_padding)
		enemy_padding.add_child(targets)
		for enemy_index in range(encounter_enemies.size()):
			var enemy: Dictionary = encounter_enemies[enemy_index]
			if int(enemy.get("hp", 0)) <= 0 and not battle_card_presentation.dying.has(enemy_index):
				continue
			var target_button = BattleDropButtonScript.new()
			target_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			_build_enemy_target_button(target_button, enemy, enemy_index)
			target_button.target_kind = "enemy"
			target_button.target_index = enemy_index
			target_button.accepts_battle_drops = _battle_drop_available()
			target_button.drop_validator = Callable(self, "_is_valid_battle_drop")
			target_button.card_dropped.connect(_on_battle_card_dropped)
			target_button.disabled = int(enemy.get("hp", 0)) <= 0
			targets.add_child(target_button)
			battle_enemy_widgets[enemy_index] = target_button
	var active_rules: Array = battle_state.get("active_rule_cards", [])
	if not active_rules.is_empty():
		var active_rule_names: Array[String] = []
		for active_rule in active_rules:
			active_rule_names.append(str(active_rule.get("name", "룰")))
		var active_rules_panel := _panel(Vector2(0, 42))
		player_panel.add_child(active_rules_panel)
		active_rules_panel.add_child(_label("활성 룰: " + " · ".join(active_rule_names), 14, COLOR_GOLD))

	var piles_scroll := ScrollContainer.new()
	var tallest_pile_height := PILE_CARD_HEIGHT
	for pile in battle_state["piles"]:
		if not pile.is_empty():
			tallest_pile_height = maxf(tallest_pile_height, PILE_CARD_HEIGHT + float(pile.size() - 1) * PILE_STACK_OFFSET)
	piles_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	piles_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	piles_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	piles_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	piles_scroll.scroll_horizontal_by_default = true
	battle_piles_scroll = piles_scroll
	battle_content.add_child(piles_scroll)
	var piles_row := HBoxContainer.new()
	piles_row.add_theme_constant_override("separation", 12)
	piles_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	piles_row.alignment = BoxContainer.ALIGNMENT_CENTER
	var piles_margin := MarginContainer.new()
	piles_margin.add_theme_constant_override("margin_top", 20)
	piles_margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	piles_margin.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	piles_margin.add_child(piles_row)
	piles_scroll.add_child(piles_margin)
	for pile_index in range(battle_state["piles"].size()):
		var pile_widget := _pile_button(pile_index)
		battle_pile_widgets.append(pile_widget)
		piles_row.add_child(pile_widget)

	var hand_fan := BattleHandFanScript.new()
	active_battle_hand_area = hand_fan
	hand_fan.z_index = 6
	board.add_child(hand_fan)
	board.hand = hand_fan
	hand_fan.layout_height_changed.connect(func(height: float) -> void:
		board.hand_height = height
		board.arrange()
	)
	var hand_cards: Array[Control] = []
	var pending_play_card_id := int(battle_state.get("pending_play_card_id", -1))
	for card in battle_state["hand"]:
		if int(card.get("id", -1)) == pending_play_card_id:
			continue
		var card_widget := _card_widget(card)
		battle_draw_presentation.prepare_hand_widget(int(card.get("id", -1)), card_widget)
		battle_hand_card_widgets[int(card.get("id", -1))] = card_widget
		hand_cards.append(card_widget)
	hand_fan.set_cards(hand_cards)
	battle_draw_presentation.lock_hand_input(hand_fan)
	for pile_widget in battle_pile_widgets:
		var exclusions: Array[Control] = []
		for hand_widget in battle_hand_card_widgets.values():
			if hand_widget is Control:
				exclusions.append(hand_widget)
		for enemy_widget in _battle_enemy_drop_controls():
			exclusions.append(enemy_widget)
		pile_widget.drop_exclusion_controls = exclusions

	active_battle_defense_strip = _battle_resource_strip()
	player_panel.add_child(active_battle_defense_strip)
	var end_button := _button("턴 종료 (E) →", Callable(self, "_end_turn"), Vector2(124, 48))
	active_battle_end_button = end_button
	if battle_turn_resolving:
		end_button.text = "턴 진행 중"
	end_button.tooltip_text = "턴을 끝내고 각 적의 예고 행동을 진행합니다."
	end_button.disabled = battle_turn_resolving or battle_draw_presentation.active or int(battle_state.get("pending_draws", 0)) > 0 \
		or int(battle_state.get("pending_pile_draw_count", 0)) > 0 \
		or int(battle_state.get("pending_discard_count", 0)) > 0 \
		or int(battle_state.get("pending_play_card_id", -1)) >= 0 \
		or str(battle_state.get("pending_pile_operation", "")) != ""
	battle_hud_overlay.add_child(end_button)
	end_button.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	end_button.offset_left = -148
	end_button.offset_top = -74
	end_button.offset_right = -24
	end_button.offset_bottom = -26
	end_button.add_theme_font_size_override("font_size", 12)
	end_button.add_theme_color_override("font_color", Color("#252525"))
	end_button.add_theme_color_override("font_hover_color", Color("#252525"))
	end_button.add_theme_stylebox_override("normal", _button_style(Color("#ece7d9"), Color("#a5a396")))
	end_button.add_theme_stylebox_override("hover", _button_style(Color("#fff6d9"), Color("#e0c76a")))
	board.arrange.call_deferred()
	if not battle_card_ledger_open.is_empty():
		_show_battle_card_ledger()
	battle_forge_presentation.on_view_built(self)
	if battle_state.get("status") == "won":
		_finish_battle_win()
	else:
		var hold_guide := BattleHoldGuide.new()
		hold_guide.name = "BattleHoldGuide"
		hold_guide.game_ref = weakref(self)
		add_child(hold_guide)
		_add_battle_choice_focus()


func _add_battle_choice_focus() -> void:
	var focus_controls: Array[Control] = []
	var focus_visuals: Array[Control] = []
	var prompt := ""
	var prompt_above_focus := false
	var file_choice := false
	var pending_draws := int(battle_state.get("pending_draws", 0))
	var pending_file_draws := int(battle_state.get("pending_pile_draw_count", 0))
	var pending_discards := int(battle_state.get("pending_discard_count", 0))
	var pile_operation := str(battle_state.get("pending_pile_operation", ""))
	if pending_draws > 0 or pending_file_draws > 0:
		file_choice = true
		var remaining := pending_draws if pending_draws > 0 else 1
		prompt = "드로우할 파일을 선택하세요. (남은 %d회)" % remaining
		for index in range(battle_pile_widgets.size()):
			if BattleRules.can_draw_from_file(battle_state, index):
				focus_controls.append(battle_pile_widgets[index])
	elif pending_discards > 0:
		prompt = "버릴 카드를 선택하세요. (남은 %d장)" % pending_discards
		prompt_above_focus = true
		for card_id in battle_hand_card_widgets:
			var widget: Control = battle_hand_card_widgets[card_id]
			if int(card_id) != int(battle_state.get("pending_play_card_id", -1)):
				focus_controls.append(widget)
		if not focus_controls.is_empty() and is_instance_valid(active_battle_hand_area):
			focus_visuals.append(active_battle_hand_area)
	elif pile_operation != "":
		file_choice = true
		var operation_name := "버릴" if pile_operation == "discardTop" else "옮길"
		prompt = "%s 파일을 선택하세요. (남은 1회)" % operation_name
		for index in range(battle_pile_widgets.size()):
			if not battle_state["piles"][index].is_empty():
				focus_controls.append(battle_pile_widgets[index])
	if file_choice:
		for control in focus_controls:
			var previews: Variant = control.get("file_drag_previews")
			if previews is Dictionary:
				for preview in previews.values():
					if preview is Control:
						focus_visuals.append(preview)
	if prompt.is_empty():
		return
	var obstacles: Array[Control] = []
	for pile_widget in battle_pile_widgets:
		obstacles.append(pile_widget)
	for hand_widget in battle_hand_card_widgets.values():
		if hand_widget is Control:
			obstacles.append(hand_widget)
	var focus := BattleChoiceFocus.new()
	focus.name = "BattleChoiceFocus"
	focus.configure(focus_controls, focus_visuals, prompt, prompt_above_focus, obstacles)
	add_child(focus)


func _toggle_battle_card_ledger(view_id: String) -> void:
	battle_card_ledger_open = "" if battle_card_ledger_open == view_id else view_id
	_show_battle()


func _show_battle_card_ledger() -> void:
	var cards: Array = []
	var title := "현재 덱"
	match battle_card_ledger_open:
		"deck":
			cards = run_state.get("deck", [])
		"piles":
			title = "파일에 존재하는 카드"
			for pile in battle_state.get("piles", []):
				cards.append_array(pile)
		"discard":
			title = "버린 카드"
			cards = battle_state.get("discard", [])
	var panel := PanelContainer.new()
	panel.position = Vector2(26, 70)
	panel.size = Vector2(420, 260)
	panel.custom_minimum_size = panel.size
	panel.z_index = 40
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color("#080e0b")
	panel_style.border_color = Color(1, 1, 1, 0.42)
	panel_style.set_border_width_all(1)
	panel_style.set_corner_radius_all(5)
	panel_style.content_margin_left = 10
	panel_style.content_margin_top = 10
	panel_style.content_margin_right = 10
	panel_style.content_margin_bottom = 10
	panel.add_theme_stylebox_override("panel", panel_style)
	add_child(panel)
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 8)
	panel.add_child(body)
	var header := HBoxContainer.new()
	var title_label := _label(title, 15, COLOR_TEXT)
	title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title_label)
	var close_button := _button("닫기", Callable(self, "_toggle_battle_card_ledger").bind(battle_card_ledger_open), Vector2(56, 30))
	header.add_child(close_button)
	body.add_child(header)
	var cards_scroll := ScrollContainer.new()
	cards_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cards_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	body.add_child(cards_scroll)
	var cards_flow := HFlowContainer.new()
	cards_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards_flow.add_theme_constant_override("h_separation", 6)
	cards_flow.add_theme_constant_override("v_separation", 6)
	cards_scroll.add_child(cards_flow)
	var grouped_cards: Array = MapSearchRules.group_cards(cards)
	if grouped_cards.is_empty():
		cards_flow.add_child(_label("카드 없음", 12, COLOR_MUTED))
	else:
		for group in grouped_cards:
			var card_count := int(group["count"])
			var card_view: Control = CompactCardView.create(
				group["card"], card_count,
				Callable(self, "_show_card_hover_preview"),
				Callable(self, "_hide_card_hover_preview"),
				Callable(self, "_hide_card_hover_preview"),
				blue_tooltip_theme
			)
			var stack_margin := float(mini(5, maxi(0, card_count - 1)) * 7)
			if stack_margin > 0.0:
				var card_holder := Control.new()
				card_holder.custom_minimum_size = Vector2(
					card_view.custom_minimum_size.x + stack_margin, card_view.custom_minimum_size.y)
				card_holder.mouse_filter = Control.MOUSE_FILTER_PASS
				card_view.position.x = stack_margin
				card_holder.add_child(card_view)
				cards_flow.add_child(card_holder)
			else:
				cards_flow.add_child(card_view)


func _battle_player_destination() -> Rect2:
	if is_instance_valid(active_battle_play_area) and is_instance_valid(active_battle_play_area.player):
		return active_battle_play_area.player.get_global_rect()
	return active_battle_player_hp.get_global_rect() if is_instance_valid(active_battle_player_hp) else Rect2()


func _can_begin_card_play(card: Dictionary) -> bool:
	return _battle_drop_available() and battle_card_ledger_open.is_empty() and CardUse.is_playable(card) \
		and BattleRules.can_pay_card_cost(battle_state, card) \
		and battle_state.get("hand", []).size() - 1 >= int(card.get("discard_cost", 0))


func _battle_drop_available() -> bool:
	return not battle_turn_resolving and not battle_draw_presentation.active and battle_state.get("status") == "playing" \
		and int(battle_state.get("pending_draws", 0)) <= 0 \
		and int(battle_state.get("pending_pile_draw_count", 0)) <= 0 \
		and int(battle_state.get("pending_discard_count", 0)) <= 0 \
		and int(battle_state.get("pending_play_card_id", -1)) < 0 \
		and str(battle_state.get("pending_pile_operation", "")) == ""


func _build_enemy_target_button(target_button: Button, enemy: Dictionary, enemy_index: int) -> void:
	var intent_state := battle_state.duplicate(true)
	BattleRules._load_enemy_aliases(intent_state, enemy_index)
	BattleRules._refresh_enemy_intent(intent_state)
	var statuses: Array = []
	for status_text in _enemy_status_text(enemy).split(" · ", false):
		statuses.append({"text": status_text, "tooltip": _enemy_status_tooltip(enemy, status_text),
			"debuff": status_text.begins_with("취약") or status_text.begins_with("약화") or status_text.begins_with("행동 불가") or status_text.begins_with("힘 -")})
	BattleEnemyView.populate(target_button, enemy, intent_state, statuses,
		Callable(self, "_select_enemy_target").bind(enemy_index), _enemy_trait_tooltip(enemy),
		battle_state.get("enemies", []).size() > 2,
		selected_battle_hand_card_id >= 0 and _card_can_target_enemy(_battle_hand_card(selected_battle_hand_card_id)))
	BattleEnemyView.set_display_hp(target_button, battle_card_presentation.view_hp(enemy_index, int(enemy.get("hp", 0))))


func _refresh_battle_enemy_presentation(enemy_index: int) -> void:
	var enemies: Array = battle_state.get("enemies", [])
	var widget: Control = battle_enemy_widgets.get(enemy_index)
	if is_instance_valid(widget) and enemy_index >= 0 and enemy_index < enemies.size():
		BattleEnemyView.set_display_hp(widget,
			battle_card_presentation.view_hp(enemy_index, int(enemies[enemy_index].get("hp", 0))))


func _battle_enemy_visual(enemy_index: int) -> Button:
	var button := Button.new()
	var enemies: Array = battle_state.get("enemies", [])
	if enemy_index >= 0 and enemy_index < enemies.size():
		_build_enemy_target_button(button, enemies[enemy_index], enemy_index)
	return button


func _enemy_status_text(enemy: Dictionary) -> String:
	var statuses: Array[String] = []
	var resistance := int(enemy.get("resistance", 0))
	var amplification := int(enemy.get("amplification", 0))
	if resistance > 0:
		statuses.append("저항 %d" % resistance)
	elif resistance < 0:
		statuses.append("취약 %d" % absi(resistance))
	if amplification > 0:
		statuses.append("증폭 %d" % amplification)
	elif amplification < 0:
		statuses.append("약화 %d" % absi(amplification))
	if int(enemy.get("status_effectiveness", 30)) > 30:
		statuses.append("강화됨")
	var block := int(enemy.get("physical_block", 0))
	if block > 0:
		statuses.append("방어 %d" % block)
	if bool(enemy.get("stunned", false)):
		statuses.append("행동 불가 1")
	if not str(enemy.get("stun_ally_on_death", "")).is_empty():
		statuses.append("인형 조종")
	if int(enemy.get("empty_energy_strength_gain", 0)) > 0:
		statuses.append("빈틈 노리기")
	if int(enemy.get("solitaire_hit_bonus", 0)) > 0:
		statuses.append("거미줄")
	var turn_end_strength := int(enemy.get("turn_end_strength_gain", 0))
	if turn_end_strength > 0:
		statuses.append("성장 %d" % turn_end_strength)
	if int(enemy.get("half_hp_strength_gain", 0)) > 0:
		statuses.append("격노 발동" if bool(enemy.get("enraged", false)) else "격노")
	if enemy.has("powder"):
		statuses.append("화약 %d" % int(enemy.get("powder", 0)))
	if int(enemy.get("hand_strength_gain", 0)) > 0:
		statuses.append("추적")
	if bool(enemy.get("rests_when_blocked", false)):
		statuses.append("묵직한 망치")
	if int(enemy.get("energy_recovery_penalty", 0)) > 0:
		statuses.append("족쇄")
	if bool(enemy.get("seals_pile", false)):
		var sealed_file := int(enemy.get("sealed_pile_index", -1))
		statuses.append("봉인 · %d번 파일" % (sealed_file + 1) if sealed_file >= 0 else "봉인")
	if int(enemy.get("fermented_slime_count", 0)) > 0:
		statuses.append("발효 점액")
	var shared_strength := int(enemy.get("shared_turn_end_strength_gain", 0))
	if shared_strength > 0:
		statuses.append("피의 공명 %d" % shared_strength)
	if bool(enemy.get("confiscates_rare", false)):
		statuses.append("압수 %d" % enemy.get("confiscated_cards", []).size())
	var strength := int(enemy.get("strength", 0))
	if strength != 0:
		statuses.append("힘 %d" % strength)
	var temporary_strength := 0
	if int(battle_state.get("energy", 0)) <= 0:
		temporary_strength += int(enemy.get("empty_energy_strength_gain", 0))
	if not battle_state.get("hand", []).is_empty():
		temporary_strength += int(enemy.get("hand_strength_gain", 0))
	if temporary_strength > 0:
		statuses.append("임시 힘 +%d" % temporary_strength)
	if bool(enemy.get("solitaire_hit_bonus_ready", false)):
		statuses.append("실 끊김 %d" % int(enemy.get("solitaire_hit_bonus", 0)))
	var boon := int(enemy.get("boon", 0))
	if boon > 0:
		statuses.append("가호 %d" % boon)
	var berserk := int(enemy.get("berserk", 0))
	if berserk > 0:
		statuses.append("광폭화 %d" % berserk)
	var thorns := int(enemy.get("thorns", 0))
	if thorns > 0:
		statuses.append("가시 %d" % thorns)
	var sturdy := int(enemy.get("sturdy_threshold", 0))
	if sturdy > 0:
		statuses.append("단단함 ≤%d" % sturdy)
	if bool(enemy.get("quickness_ready", false)):
		statuses.append("재빠름 준비")
	if bool(enemy.get("next_attack_magic", false)):
		statuses.append("다음 공격 마법")
	return " · ".join(statuses)


func _enemy_status_tooltip(enemy: Dictionary, status_text: String) -> String:
	var effectiveness := int(enemy.get("status_effectiveness", 30))
	if status_text.begins_with("저항 "):
		return "받는 공격 피해가 %d%% 감소합니다. 취약과 서로 상쇄됩니다." % effectiveness
	if status_text.begins_with("취약 "):
		return "받는 공격 피해가 %d%% 증가합니다. 저항과 서로 상쇄됩니다." % effectiveness
	if status_text.begins_with("증폭 "):
		return "공격 피해가 %d%% 증가합니다. 약화와 서로 상쇄됩니다." % effectiveness
	if status_text.begins_with("약화 "):
		return "공격 피해가 %d%% 감소합니다. 증폭과 서로 상쇄됩니다." % effectiveness
	if status_text.begins_with("힘 "):
		return "공격의 각 타격에 피해를 %d만큼 추가합니다." % status_text.get_slice(" ", 1).to_int()
	if status_text.begins_with("임시 힘 "):
		return "이번 적 행동에만 추가되는 힘입니다. 영구적으로 누적되지 않습니다."
	if status_text.begins_with("방어 "):
		return "받는 피해를 먼저 흡수합니다. 다음 적 행동이 시작될 때 남은 방어는 사라집니다."
	if status_text.begins_with("행동 불가 "):
		return "다음 행동을 한 번 건너뜁니다. 그 행동의 공격과 강화 효과도 발동하지 않습니다."
	if status_text.begins_with("압수 "):
		var confiscated_cards: Array = enemy.get("confiscated_cards", [])
		var confiscated_names := PackedStringArray()
		for confiscated_card in confiscated_cards:
			confiscated_names.append(str(confiscated_card.get("name", "카드")))
		return ", ".join(confiscated_names) if not confiscated_names.is_empty() else "압수한 카드가 없습니다."
	if status_text.begins_with("가호 "):
		return "받는 타격의 피해를 무효화합니다. 타격을 한 번 막을 때마다 가호를 1 소모합니다."
	if status_text.begins_with("광폭화 "):
		return "플레이어의 턴이 시작될 때마다 이 수치만큼 힘을 얻습니다."
	if status_text.begins_with("가시 "):
		return "공격받을 때마다 이 수치만큼 물리 피해로 반격합니다."
	if status_text.begins_with("실 끊김 "):
		return "다음에 받는 한 타격의 피해가 이 수치만큼 증가합니다. 턴 종료 시 사라집니다."
	if status_text.begins_with("단단함 "):
		return "표시된 수치 이하의 타격 피해를 받으면 그 피해를 1로 줄입니다."
	if status_text == "재빠름 준비":
		return "다음 공격의 한 타격을 회피합니다. 회피하면 준비 상태가 사라집니다."
	if status_text == "다음 공격 마법":
		return "다음 공격이 마법 피해를 주며, 마법 방어로 막을 수 있습니다."
	return _enemy_trait_tooltip(enemy)


func _enemy_trait_tooltip(enemy: Dictionary) -> String:
	var enemy_trait = enemy.get("trait")
	return "" if enemy_trait == null else str(enemy_trait)


func _battle_status_tooltip(status_text: String) -> String:
	if status_text.begins_with("저항 "):
		return "적에게 받는 공격 피해가 30% 감소합니다. 취약과 서로 상쇄됩니다."
	if status_text.begins_with("취약 "):
		return "적에게 받는 공격 피해가 30% 증가합니다. 저항과 서로 상쇄됩니다."
	if status_text.begins_with("증폭 "):
		return "내 공격 피해가 30% 증가합니다. 약화와 서로 상쇄됩니다."
	if status_text.begins_with("약화 "):
		return "내 공격 피해가 30% 감소합니다. 증폭과 서로 상쇄됩니다."
	if status_text.begins_with("강인함 "):
		var status_parts: PackedStringArray = status_text.split(" ")
		var agility := int(status_parts[status_parts.size() - 1])
		var agility_effect := "%d만큼 추가로 얻습니다." % agility if agility >= 0 else "%d만큼 덜 얻습니다." % absi(agility)
		return "방어 또는 마법 방어를 얻을 때 %s 직접 카드를 낼 때만 적용됩니다." % agility_effect
	if status_text.begins_with("이번 턴 힘 "):
		var status_parts: PackedStringArray = status_text.split(" ")
		var temporary_strength := int(status_parts[status_parts.size() - 1])
		var temporary_strength_effect := "%d만큼 추가합니다." % temporary_strength if temporary_strength >= 0 else "%d만큼 감소시킵니다." % absi(temporary_strength)
		return "공격의 각 타격에 피해를 %s 직접 카드를 낼 때만 적용됩니다. 이번 턴만 적용됩니다." % temporary_strength_effect
	if status_text.begins_with("힘 "):
		var status_parts: PackedStringArray = status_text.split(" ")
		var strength := int(status_parts[status_parts.size() - 1])
		var strength_effect := "%d만큼 추가합니다." % strength if strength >= 0 else "%d만큼 감소시킵니다." % absi(strength)
		return "공격의 각 타격에 피해를 %s 직접 카드를 낼 때만 적용됩니다." % strength_effect
	if status_text.begins_with("무적 "):
		return "피해를 받지 않습니다."
	return ""


func _pile_button(pile_index: int) -> Button:
	var pile: Array = battle_state["piles"][pile_index]
	var pending_pile_operation := str(battle_state.get("pending_pile_operation", ""))
	var discard_target_count := _discard_target_count_for_file(pile_index)
	var button = BattleDropButtonScript.new()
	var empty_label := "+" if pile.is_empty() else ""
	_style_button(button, empty_label, Callable(self, "_on_pile_pressed").bind(pile_index), Vector2(PILE_CARD_WIDTH, PILE_CARD_HEIGHT))
	button.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	button.target_kind = "file"
	button.target_index = pile_index
	button.accepts_battle_drops = _battle_drop_available()
	button.drop_validator = Callable(self, "_is_valid_battle_drop")
	button.drop_style_resolver = Callable(self, "_battle_drop_style")
	button.card_dropped.connect(_on_battle_card_dropped)
	button.file_drag_cards = pile.duplicate(true)
	button.file_stack_offset = PILE_STACK_OFFSET
	button.add_theme_stylebox_override("normal", _pile_target_style(Color("#777d77") if pile.is_empty() else Color(0, 0, 0, 0)))
	button.add_theme_stylebox_override("hover", _pile_target_style(Color(0, 0, 0, 0)))
	button.add_theme_stylebox_override("pressed", _pile_target_style(COLOR_GOLD))
	if not pile.is_empty():
		var visible_stack_count := pile.size() - 1
		for stack_index in range(visible_stack_count):
			var stacked_card: Dictionary = pile[stack_index]
			var card_position := Vector2(0, float(stack_index) * PILE_STACK_OFFSET)
			if bool(stacked_card.get("revealed", false)):
				var stack_preview := _card_widget(stacked_card, false, false)
				stack_preview.position = card_position
				stack_preview.size = Vector2(136, 191)
				stack_preview.scale = Vector2.ONE * PILE_CARD_SCALE
				stack_preview.pivot_offset = Vector2.ZERO
				button.add_child(stack_preview)
				button.file_drag_previews[stack_index] = stack_preview
			else:
				var card_back := _battle_card_back()
				card_back.custom_minimum_size = Vector2(PILE_CARD_WIDTH, PILE_CARD_HEIGHT)
				card_back.size = Vector2(PILE_CARD_WIDTH, PILE_CARD_HEIGHT)
				card_back.position = card_position
				card_back.mouse_filter = Control.MOUSE_FILTER_PASS
				button.add_child(card_back)
				button.file_drag_previews[stack_index] = card_back
		var top_card: Dictionary = pile.back()
		var top_card_y := float(visible_stack_count) * PILE_STACK_OFFSET
		if bool(top_card.get("revealed", false)):
			var preview := _card_widget(top_card, false, false)
			preview.position = Vector2(0, top_card_y)
			preview.size = Vector2(136, 191)
			preview.scale = Vector2.ONE * PILE_CARD_SCALE
			preview.pivot_offset = Vector2.ZERO
			button.add_child(preview)
			button.set("drag_preview_widget", preview)
			button.file_drag_previews[visible_stack_count] = preview
		else:
			var card_back := _battle_card_back()
			card_back.custom_minimum_size = Vector2(PILE_CARD_WIDTH, PILE_CARD_HEIGHT)
			card_back.size = Vector2(PILE_CARD_WIDTH, PILE_CARD_HEIGHT)
			card_back.position = Vector2(0, top_card_y)
			card_back.mouse_filter = Control.MOUSE_FILTER_PASS
			button.add_child(card_back)
			button.file_drag_previews[visible_stack_count] = card_back
		button.custom_minimum_size.y = maxf(PILE_CARD_HEIGHT, top_card_y + PILE_CARD_HEIGHT)
	if not pile.is_empty() and _battle_drop_available():
		button.drag_payload = {
			"kind": "battle-card",
			"source": "file",
			"source_index": pile_index,
		}
	button.alignment = HORIZONTAL_ALIGNMENT_CENTER
	if selected_source.get("type") == "pile" and selected_source.get("pile_index") == pile_index:
		button.add_theme_color_override("font_color", COLOR_GOLD)
		button.add_theme_stylebox_override("normal", _pile_target_style(COLOR_GOLD))
	elif pending_pile_operation != "" and not pile.is_empty():
		button.add_theme_color_override("font_color", COLOR_ORANGE)
		button.add_theme_stylebox_override("normal", _pile_target_style(COLOR_ORANGE))
	elif str(battle_state.get("pending_pile_operation", "")) == "" and BattleRules.can_draw_from_file(battle_state, pile_index):
		button.add_theme_color_override("font_color", COLOR_ORANGE)
		button.add_theme_stylebox_override("normal", _pile_target_style(COLOR_ORANGE))
	elif discard_target_count > 0:
		button.add_theme_color_override("font_color", COLOR_RED)
		var discard_style := _pile_target_style(COLOR_RED)
		discard_style.bg_color = Color("#b92727")
		discard_style.bg_color.a = 0.13
		button.add_theme_stylebox_override("normal", discard_style)
	if discard_target_count > 0:
		var discard_warning = BattleFileDiscardWarning.new()
		discard_warning.name = "BattleFileDiscardWarning"
		discard_warning.configure(discard_target_count)
		discard_warning.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		discard_warning.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.add_child(discard_warning)
	return button


func _battle_card_back() -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#fbfaf5")
	style.border_color = Color("#454545")
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	panel.add_theme_stylebox_override("panel", style)
	panel.clip_contents = true
	var pattern := TextureRect.new()
	pattern.texture = CardBackTexture
	pattern.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	pattern.stretch_mode = TextureRect.STRETCH_SCALE
	pattern.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(pattern)
	return panel


func _pile_target_style(outline: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0, 0, 0, 0)
	style.border_color = outline
	style.set_border_width_all(1 if outline.a > 0.0 else 0)
	style.set_corner_radius_all(0)
	style.content_margin_left = 0
	style.content_margin_top = 0
	style.content_margin_right = 0
	style.content_margin_bottom = 0
	return style


func _on_battle_card_dropped(payload: Dictionary, target_kind: String, target_index: int) -> void:
	if not _battle_drop_available() or str(payload.get("kind", "")) != "battle-card":
		return
	var source := str(payload.get("source", ""))
	if not payload.has("card_id"):
		return
	var card_id := int(payload.get("card_id", -1))
	if target_kind == "center" and source == "hand":
		_play_card(card_id, payload.get("held_origin", {}))
		return
	elif target_kind == "file":
		var moving_card := _battle_hand_card(card_id)
		var next_state := BattleRules.move_cards_to_file(battle_state, payload, target_index)
		var held_origin: Dictionary = payload.get("held_origin", {})
		if source == "hand" and held_origin.has("pose") and not moving_card.is_empty() \
				and BattleRules._hand_card_index(next_state.get("hand", []), card_id) < 0 \
				and target_index >= 0 and target_index < battle_pile_widgets.size():
			var file := battle_pile_widgets[target_index]
			var top_index: int = next_state["piles"][target_index].size() - 1
			var target_top: Vector2 = file.get_global_transform_with_canvas() * Vector2(0, top_index * PILE_STACK_OFFSET)
			var destination := Rect2(target_top, Vector2(136, 191) * PILE_CARD_SCALE)
			var carrier := _released_card_source(moving_card, battle_hand_card_widgets.get(card_id), held_origin)
			var items: Array = [{"card": moving_card, "source": carrier}]
			var ticket := await battle_draw_presentation.play_departures(self, items, next_state, "place", destination)
			if ticket < 0:
				return
		battle_state = next_state
	elif target_kind == "enemy" and source == "hand":
		battle_state = BattleRules.select_enemy_target(battle_state, target_index)
		_play_card(card_id, payload.get("held_origin", {}))
		return
	else:
		return
	selected_source = {}
	selected_battle_hand_card_id = -1
	_show_battle()


func _discard_target_count_for_file(pile_index: int) -> int:
	var count := 0
	for enemy in battle_state.get("enemies", []):
		if int(enemy.get("hp", 0)) <= 0 or int(enemy.get("discard_pile_index", -1)) != pile_index:
			continue
		var actions: Array = enemy.get("actions", [])
		var action_index := int(enemy.get("action_index", 0))
		if action_index >= 0 and action_index < actions.size():
			var action: Dictionary = actions[action_index]
			count += maxi(0, int(action.get("discard_count", 0)))
	return count


func _card_widget(card: Dictionary, interactive: bool = true, sticker_tooltips: bool = true,
		keyword_tooltips: bool = true, use_battle_context: bool = true) -> Control:
	var panel = BattleCardDragSourceScript.new()
	panel.oversampling_with_scale = CanvasItem.OVERSAMPLING_WITH_SCALE_ENABLED
	panel.custom_minimum_size = Vector2(136, 191)
	# The browser full card has fixed dimensions, even inside a taller flex row.
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	panel.add_theme_stylebox_override("panel", _card_style(card,
		interactive and screen_name == "battle" and int(card.get("id", -1)) == selected_battle_hand_card_id))
	panel.mouse_filter = Control.MOUSE_FILTER_PASS
	panel.set_meta("targeted_card", CardUse.requires_target(card))
	if interactive and screen_name == "battle" and _battle_drop_available():
		panel.drag_payload = {
			"kind": "battle-card",
			"source": "hand",
			"card_id": int(card.get("id", -1)),
			"card_name": str(card.get("name", "카드")),
		}
	if interactive and screen_name == "battle":
		panel.gui_input.connect(_on_battle_card_gui_input.bind(int(card.get("id", -1))))
	var body := Control.new()
	body.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	body.mouse_filter = Control.MOUSE_FILTER_PASS
	panel.add_child(body)
	var header_panel := PanelContainer.new()
	header_panel.custom_minimum_size.y = 37
	header_panel.anchor_left = 0.0
	header_panel.anchor_top = 0.0
	header_panel.anchor_right = 1.0
	header_panel.anchor_bottom = 0.0
	header_panel.offset_left = 0.0
	header_panel.offset_top = 0.0
	header_panel.offset_right = 0.0
	header_panel.offset_bottom = 37.0
	header_panel.mouse_filter = Control.MOUSE_FILTER_PASS
	header_panel.add_theme_stylebox_override("panel", _card_header_style(card))
	var header := HBoxContainer.new()
	header.mouse_filter = Control.MOUSE_FILTER_PASS
	var can_show_cost := card.has("cost") \
		and CardUse.is_playable(card)
	var header_text_color := Color("#ffe08a") if str(card.get("rarity", "")) == "rare" else Color.WHITE
	if can_show_cost:
		var shown_cost = BattleRules.effective_card_cost(battle_state, card) \
			if screen_name == "battle" and use_battle_context else CardStickers.card_energy_cost(card)
		var cost := _label(str(shown_cost), 22, COLOR_TEXT)
		cost.add_theme_font_override("font", battle_card_cost_font)
		cost.add_theme_color_override("font_color", header_text_color)
		cost.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		cost.mouse_filter = Control.MOUSE_FILTER_PASS
		header.add_child(cost)
	var name := _label(str(card.get("name", "카드")), 15, header_text_color)
	name.add_theme_font_override("font", battle_card_name_font)
	name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	name.clip_text = true
	name.mouse_filter = Control.MOUSE_FILTER_PASS
	header.add_child(name)
	header_panel.add_child(header)
	body.add_child(header_panel)
	var description := RichTextLabel.new()
	description.bbcode_enabled = true
	description.fit_content = false
	description.scroll_active = false
	description.add_theme_font_override("normal_font", battle_card_body_font)
	description.add_theme_font_size_override("normal_font_size", 12)
	description.add_theme_font_size_override("bold_font_size", 12)
	description.add_theme_font_size_override("italics_font_size", 12)
	description.add_theme_font_size_override("bold_italics_font_size", 12)
	description.add_theme_font_override("bold_font", battle_card_emphasis_font)
	description.add_theme_color_override("default_color", Color("#292b28"))
	description.language = "ko"
	description.add_theme_constant_override("line_separation", 3)
	var plain_description := _card_description(card, use_battle_context)
	description.text = CardDescriptionText.to_bbcode(plain_description)
	description.autowrap_mode = TextServer.AUTOWRAP_WORD
	description.ready.connect(_fit_card_description_after_layout.bind(
		description, plain_description, screen_name == "battle"), CONNECT_ONE_SHOT)
	if keyword_tooltips:
		TooltipBindings.bind_card(panel, card)
	if keyword_tooltips and animation_tooltips_enabled and CardMechanicPreview.supports(card):
		var mechanic_timer := Timer.new()
		mechanic_timer.one_shot = true
		mechanic_timer.wait_time = 3.0
		description.add_child(mechanic_timer)
		mechanic_timer.timeout.connect(Callable(self, "_show_card_mechanic_preview").bind(card.duplicate(true), panel))
		description.mouse_entered.connect(func() -> void:
			if not animation_tooltips_enabled:
				return
			_hide_card_mechanic_preview()
			mechanic_timer.start()
		)
		description.mouse_exited.connect(func() -> void:
			mechanic_timer.stop()
			if mechanic_tooltip_anchor == panel:
				_hide_card_mechanic_preview()
		)
	description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	description.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	description.mouse_filter = Control.MOUSE_FILTER_PASS
	var description_margin := MarginContainer.new()
	description_margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	description_margin.offset_left = 4.0
	description_margin.offset_top = 30.0
	description_margin.offset_right = -4.0
	description_margin.offset_bottom = -14.0
	description_margin.add_theme_constant_override("margin_left", 1)
	description_margin.add_theme_constant_override("margin_top", 4)
	description_margin.add_theme_constant_override("margin_right", 1)
	description_margin.add_theme_constant_override("margin_bottom", 4)
	description_margin.mouse_filter = Control.MOUSE_FILTER_PASS
	description_margin.add_child(description)
	body.add_child(description_margin)
	var sticker_ids := CardStickers.card_sticker_ids(card)
	if not sticker_ids.is_empty():
		var sticker_row := HBoxContainer.new()
		sticker_row.add_theme_constant_override("separation", 0)
		sticker_row.anchor_left = 0.0
		sticker_row.anchor_top = 1.0
		sticker_row.anchor_right = 0.0
		sticker_row.anchor_bottom = 1.0
		sticker_row.offset_left = 4.0
		sticker_row.offset_top = -39.0
		sticker_row.offset_right = 4.0 + 35.0 * sticker_ids.size()
		sticker_row.offset_bottom = -4.0
		sticker_row.z_index = 4
		sticker_row.mouse_filter = Control.MOUSE_FILTER_PASS
		for sticker_id in sticker_ids:
			var icon = StickerArtScript.new()
			icon.name = "Sticker_%s" % sticker_id
			icon.configure(sticker_id, 35.0)
			icon.set_meta("card_sticker_id", sticker_id)
			icon.theme = blue_tooltip_theme
			icon.mouse_filter = Control.MOUSE_FILTER_PASS
			if sticker_tooltips:
				TooltipBindings.bind_sticker(icon, sticker_id)
			sticker_row.add_child(icon)
		body.add_child(sticker_row)
	return panel


func _fit_card_description_after_layout(description: RichTextLabel, plain_description: String,
		fit_battle_layout: bool) -> void:
	await get_tree().process_frame
	if not is_instance_valid(description):
		return
	if not description.is_inside_tree():
		return
	var fitted: Dictionary = CardDescriptionText.fit_sentences(plain_description, description, description.size.x, 12)
	if bool(fitted.get("changed", false)):
		description.text = str(fitted.get("text", CardDescriptionText.to_bbcode(plain_description)))
		description.autowrap_mode = TextServer.AUTOWRAP_WORD
	elif fit_battle_layout:
		var wrap_result: Dictionary = CardDescriptionText.wrap_words(plain_description, description,
			description.size.x, description.size.y, 12)
		if bool(wrap_result.get("fits", false)):
			description.text = CardDescriptionText.to_bbcode(str(wrap_result.get("text", plain_description)))
			description.autowrap_mode = TextServer.AUTOWRAP_OFF
		else:
			description.text = CardDescriptionText.to_bbcode(plain_description)
			description.autowrap_mode = TextServer.AUTOWRAP_WORD
	else:
		description.text = CardDescriptionText.to_bbcode(plain_description)
		description.autowrap_mode = TextServer.AUTOWRAP_WORD

	if fit_battle_layout:
		# Match useCardEffectLayout without reserving space for sticker overlays.
		var line_count := description.get_line_count()
		var shift := minf(8.0, maxf(0.0, float(line_count - 1)) * 1.2)
		var description_margin := description.get_parent() as MarginContainer
		if is_instance_valid(description_margin):
			description_margin.offset_top = 30.0 + shift
			description_margin.offset_bottom = -14.0 + shift


func _mechanic_full_card_widget(card: Dictionary) -> Control:
	return _card_widget(card, false, false, false, false)


func _show_card_mechanic_preview(card: Dictionary, anchor: Control) -> void:
	if not animation_tooltips_enabled or not is_instance_valid(anchor):
		return
	_hide_card_mechanic_preview()
	var preview = CardMechanicPreview.new()
	preview.configure(card, blue_tooltip_theme, Callable(self, "_mechanic_full_card_widget"))
	var viewport_size := get_viewport_rect().size
	var popup_size := Vector2(680, 680)
	var scale_factor := minf(1.0, minf((viewport_size.x - 24.0) / popup_size.x,
		(viewport_size.y - 24.0) / popup_size.y))
	preview.scale = Vector2.ONE * maxf(0.55, scale_factor)
	preview.pivot_offset = Vector2.ZERO
	var visible_size: Vector2 = popup_size * preview.scale
	var anchor_rect := anchor.get_global_rect()
	var x := anchor_rect.position.x + anchor_rect.size.x + 12.0
	if x + visible_size.x > viewport_size.x - 12.0:
		x = anchor_rect.position.x - visible_size.x - 12.0
	if x < 12.0:
		x = maxf(12.0, (viewport_size.x - visible_size.x) * 0.5)
	var y := clampf(anchor_rect.position.y, 12.0, maxf(12.0, viewport_size.y - visible_size.y - 12.0))
	preview.position = Vector2(x, y)
	add_child(preview)
	mechanic_tooltip_overlay = preview
	mechanic_tooltip_anchor = anchor


func _hide_card_mechanic_preview() -> void:
	if is_instance_valid(mechanic_tooltip_overlay):
		mechanic_tooltip_overlay.queue_free()
	mechanic_tooltip_overlay = null
	mechanic_tooltip_anchor = null


func _card_description(card: Dictionary, use_battle_context: bool = true) -> String:
	var description := str(card.get("description", ""))
	# Saved cards can retain old copy, so browser-aligned descriptions are normalized below.
	var effect := str(card.get("effect", ""))
	if effect in ["strategy_book", "obsidian_dagger", "dash", "combat_manual"]:
		var source_cards: Array = CardCatalog.RARE_CARDS
		if effect == "dash":
			source_cards = CardCatalog.SPECIAL_CARDS
		elif effect == "combat_manual":
			source_cards = CardCatalog.BASIC_CARDS
		for blueprint in source_cards:
			if str(blueprint.get("effect", "")) == effect:
				description = str(blueprint.get("description", description))
				break
	if effect == "dash" and bool(card.get("forged", card.get("upgraded", false))):
		description = description.replace("2[3]장", "3장")
	if str(card.get("effect", "")) == "obsidian_dagger":
		description = description.replace("피해를 1 줍니다.", "피해를 %d 줍니다." % int(card.get("value", 1)))
		var completed_forges: Array = card.get("forge_costs_completed", [])
		if not completed_forges.is_empty():
			description += "\n재련됨."
		description += "\n재련 x%d: [공격]" % maxi(0, 5 - completed_forges.size())
	elif bool(card.get("forged", false)):
		if str(card.get("effect", "")) == "double_hit":
			description = description.replace("1[2]번", "2번")
		if card.has("upgraded_value"):
			var base_value := int(card.get("value", 0))
			var forged_value := int(card.get("upgraded_value", base_value))
			description = description.replace("%d[%d]" % [base_value, forged_value], str(forged_value))
		if card.has("upgraded_resistance_gain"):
			var base_resistance := int(card.get("resistance_gain", 0))
			var forged_resistance := int(card.get("upgraded_resistance_gain", base_resistance))
			description = description.replace("%d[%d]" % [base_resistance, forged_resistance], str(forged_resistance))
	description = _browser_star_gain_description(card, description)
	if screen_name == "battle" and use_battle_context:
		description = BattleCardPreview.describe(card, description, battle_state)
	if bool(card.get("token", false)) and not description.contains("토큰."):
		description += "\n토큰."
	if CardStickers.retains_card(card) and not description.contains("보존."):
		description += " 보존."
	return _add_card_rule_marker(card, _append_forge_description(card, description))


func _append_forge_description(card: Dictionary, description: String) -> String:
	var effect := str(card.get("effect", ""))
	if effect in ["obsidian_dagger", "astronomy_research", "necromancy_research", "mass_deal"]:
		return description
	if bool(card.get("forged", false)):
		var condition := RegEx.new()
		condition.compile("\\n?재련:.*$")
		return condition.sub(description, "") + "\n재련됨."
	if description.contains("재련:"):
		return description
	var requirement := ""
	if card.has("forge_cost"):
		requirement = "%d코스트" % int(card["forge_cost"])
	elif card.has("forge_costs"):
		var costs: Array[String] = []
		for cost in card["forge_costs"]:
			costs.append(str(cost))
		requirement = " 또는 ".join(costs) + "코스트"
	elif card.has("forge_target_name"):
		requirement = str(card["forge_target_name"])
	elif bool(card.get("forge_any", false)):
		requirement = "아무거나"
	return description if requirement.is_empty() else description + "\n재련: [%s]" % requirement


func _browser_star_gain_description(card: Dictionary, fallback: String) -> String:
	var effect := str(card.get("effect", ""))
	var amount := maxi(0, int(card.get("value", 0)))
	var stars := "★".repeat(amount)
	var draw_count := maxi(0, int(card.get("draw", 0)))
	match effect:
		"ruler_compass":
			var ruler_text := "피해를 %d 줍니다.\n★을 얻습니다." % int(card.get("value", 0))
			if draw_count > 0:
				ruler_text += "\n카드를 %d장 뽑습니다." % draw_count
			return ruler_text
		"battle_plan":
			var battle_plan_text := ""
			if amount > 0:
				battle_plan_text = "%s을 얻습니다." % stars
			if draw_count > 0:
				if not battle_plan_text.is_empty():
					battle_plan_text += "\n"
				battle_plan_text += "카드를 %d장 뽑습니다." % draw_count
			return battle_plan_text
		"nebula":
			return "광채 1장을 가져옵니다.\n★★를 얻습니다."
		"starlight":
			return "%s을 얻습니다." % stars
		"star_guard":
			return fallback.replace("★를 1 얻습니다", "★을 얻습니다")
		"star_ark":
			return fallback.replace("★를 1 얻습니다", "★을 얻습니다")
		"super_strategist":
			var strategist_text := ""
			if amount > 0:
				strategist_text = "%s을 얻습니다." % stars
			if draw_count > 0:
				if not strategist_text.is_empty():
					strategist_text += "\n"
				strategist_text += "카드를 %d장 뽑습니다." % draw_count
			if bool(card.get("exhaust", false)):
				if not strategist_text.is_empty():
					strategist_text += "\n"
				strategist_text += "소멸."
			return strategist_text
		"aries":
			return "에너지를 5 얻습니다.\n★★★★★을 얻습니다." + ("\n소멸." if bool(card.get("exhaust", false)) else "")
	return fallback


func _add_card_rule_marker(card: Dictionary, description: String) -> String:
	if not bool(card.get("rule", false)) or description.contains("룰."):
		return description
	var marker := "룰.\u00a0"
	if str(card.get("effect", "")) in ["mass_deal", "evolution_theory", "sturdy_stance", "steel_storm"]:
		var split_at := description.find("\n")
		if split_at >= 0:
			return description.substr(0, split_at + 1) + marker + description.substr(split_at + 1)
	return marker + description


func _released_card_source(card: Dictionary, source_widget: Control, held_origin: Dictionary) -> Control:
	if not held_origin.has("pose") or not held_origin.has("size"):
		return source_widget
	# Keep the displayed pose alive through native drag cleanup, without a hand flash.
	var carrier := _card_widget(card, false, false, false)
	carrier.name = "ReleasedCardSource"
	add_child(carrier)
	carrier.pivot_offset = Vector2.ZERO
	carrier.size = held_origin["size"]
	var local_pose: Transform2D = get_global_transform_with_canvas().affine_inverse() * Transform2D(held_origin["pose"])
	carrier.position = local_pose.origin
	carrier.rotation = local_pose.get_rotation()
	carrier.scale = local_pose.get_scale()
	carrier.z_as_relative = false
	carrier.z_index = 4095
	_set_child_controls_mouse_ignored(carrier)
	if is_instance_valid(source_widget):
		source_widget.modulate.a = 0.0
	return carrier


func _play_card(card_id: int, held_origin: Dictionary = {}) -> void:
	if battle_turn_resolving or battle_draw_presentation.active:
		return
	var played_card := _battle_hand_card(card_id)
	var source_rect := Rect2()
	var source_widget: Control = battle_hand_card_widgets.get(card_id)
	if is_instance_valid(source_widget):
		source_rect = source_widget.get_global_rect()
	var origins := battle_draw_presentation.capture_origins(self)
	var play_view: Dictionary = {}
	var resolved := BattleRules.play_card(battle_state, card_id, play_view)
	var next_state := battle_card_presentation.prepare_action(self, battle_state, resolved, play_view)
	selected_source = {}
	selected_battle_hand_card_id = -1
	var parachute_target_file := -1
	if not played_card.is_empty() and CardStickers.has_sticker(played_card, "parachute"):
		for file_index in range(next_state.get("piles", []).size()):
			for file_card in next_state["piles"][file_index]:
				if int(file_card.get("id", -1)) == card_id:
					parachute_target_file = file_index
					break
			if parachute_target_file >= 0:
				break
	if not played_card.is_empty() and (BattleRules._hand_card_index(next_state.get("hand", []), card_id) < 0 \
			or int(next_state.get("pending_play_card_id", -1)) == card_id):
		var destination := active_battle_play_area.get_global_rect() if is_instance_valid(active_battle_play_area) else get_viewport_rect()
		if CardUse.requires_target(played_card):
			var enemy_target: Control = battle_enemy_widgets.get(int(battle_state.get("target_enemy_index", 0)))
			if is_instance_valid(enemy_target):
				destination = enemy_target.get_global_rect()
		var departure_source := _released_card_source(played_card, source_widget, held_origin)
		var items: Array = [{"card": played_card, "source": departure_source,
			"player_center": _battle_player_destination().get_center()}]
		var mode := "play" if CardUse.requires_target(played_card) else "staged_play"
		var phase_ticket := await battle_draw_presentation.play_departures(self, items, next_state, mode, destination)
		if phase_ticket < 0:
			return
	battle_card_presentation.commit_queued(self)
	battle_draw_presentation.apply_state(self, next_state, origins)
	if parachute_target_file >= 0 and source_rect.size.x > 0.0:
		_animate_parachute_card_to_file(played_card, source_rect, parachute_target_file)


func _animate_parachute_card_to_file(card: Dictionary, source_rect: Rect2, target_file: int) -> void:
	await get_tree().process_frame
	if screen_name != "battle" or target_file < 0 or target_file >= battle_pile_widgets.size():
		return
	var target_pile := battle_pile_widgets[target_file]
	var target_widget: Control = target_pile.get("drag_preview_widget")
	var target_rect := target_widget.get_global_rect() if is_instance_valid(target_widget) else target_pile.get_global_rect()
	if is_instance_valid(target_widget) and is_instance_valid(battle_piles_scroll) \
		and not battle_piles_scroll.get_global_rect().has_point(target_rect.get_center()):
		battle_piles_scroll.ensure_control_visible(target_widget)
		await get_tree().process_frame
		if screen_name != "battle":
			return
		target_rect = target_widget.get_global_rect()
	var target_modulate := Color.WHITE
	if is_instance_valid(target_widget):
		target_modulate = target_widget.modulate
		var hidden_modulate := target_modulate
		hidden_modulate.a = 0.0
		target_widget.modulate = hidden_modulate
	var animation_layer := Control.new()
	animation_layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	animation_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	animation_layer.z_index = 100
	add_child(animation_layer)
	var moving_card := _card_widget(card, false, false, false)
	moving_card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	moving_card.custom_minimum_size = target_rect.size
	_set_child_controls_mouse_ignored(moving_card)
	animation_layer.add_child(moving_card)
	moving_card.size = source_rect.size
	moving_card.global_position = source_rect.position
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_CUBIC)
	tween.set_ease(Tween.EASE_OUT)
	tween.tween_property(moving_card, "global_position", target_rect.position, 0.28)
	tween.parallel().tween_property(moving_card, "size", target_rect.size, 0.28)
	tween.tween_callback(func() -> void:
		if is_instance_valid(target_widget):
			target_widget.modulate = target_modulate
		animation_layer.queue_free()
	)


func _on_battle_card_gui_input(event: InputEvent, card_id: int) -> void:
	if battle_turn_resolving or battle_draw_presentation.active:
		return
	var mouse_event := event as InputEventMouseButton
	if mouse_event == null or mouse_event.button_index != MOUSE_BUTTON_LEFT or not mouse_event.pressed:
		return
	if int(battle_state.get("pending_discard_count", 0)) > 0:
		get_viewport().set_input_as_handled()
		_discard_for_pending_play(card_id)


func _card_can_target_enemy(card: Dictionary) -> bool:
	return CardUse.requires_target(card)


func _is_valid_battle_drop(payload: Dictionary, drop_kind: String, target_index: int) -> bool:
	if not _battle_drop_available():
		return false
	var source := str(payload.get("source", ""))
	if drop_kind == "file":
		return SolitaireRules.move_error(battle_state, payload, target_index) == ""
	if source == "file":
		return false
	if source != "hand":
		return false
	var card := _battle_hand_card(int(payload.get("card_id", -1)))
	if card.is_empty():
		return false
	if not CardUse.is_playable(card):
		return false
	if drop_kind == "center":
		return not _card_can_target_enemy(card)
	if drop_kind == "enemy":
		var enemies: Array = battle_state.get("enemies", [])
		if target_index < 0 or target_index >= enemies.size() or int(enemies[target_index].get("hp", 0)) <= 0:
			return false
		return _card_can_target_enemy(card) or _card_is_attack(card)
	return false


func _battle_drop_style(payload: Dictionary, target_kind: String, target_index: int) -> String:
	if not _is_valid_battle_drop(payload, target_kind, target_index):
		return "none"
	return BattleDropStyle.resolve(battle_state, payload, target_kind, target_index)


func _card_is_attack(card: Dictionary) -> bool:
	var effect := str(card.get("effect", ""))
	return str(card.get("kind", "")) == "strike" \
		or effect in ["radiance", "sweep", "double_hit", "iron_rampage", "magic_strike", "shockwave", "meteor", "hydra"]


func _battle_hand_card(card_id: int) -> Dictionary:
	for card in battle_state.get("hand", []):
		if int(card.get("id", -1)) == card_id:
			return card
	return {}


func _select_enemy_target(enemy_index: int) -> void:
	if battle_turn_resolving or battle_draw_presentation.active:
		return
	battle_state = BattleRules.select_enemy_target(battle_state, enemy_index)
	battle_state["preview_target_enemy_index"] = enemy_index
	if selected_battle_hand_card_id >= 0:
		var selected_card := _battle_hand_card(selected_battle_hand_card_id)
		if not selected_card.is_empty() and CardUse.is_playable(selected_card) \
				and _card_can_target_enemy(selected_card) and _battle_drop_available():
			var selected_card_id := selected_battle_hand_card_id
			selected_battle_hand_card_id = -1
			_play_card(selected_card_id)
			return
	_show_battle()


func _discard_for_pending_play(card_id: int) -> void:
	if battle_turn_resolving or battle_draw_presentation.active:
		return
	var origins := battle_draw_presentation.capture_origins(self)
	var play_view: Dictionary = {}
	var resolved := BattleRules.discard_hand_card_for_pending_play(battle_state, card_id, play_view)
	var next_state := battle_card_presentation.prepare_action(self, battle_state, resolved, play_view)
	selected_source = {}
	selected_battle_hand_card_id = -1
	battle_card_presentation.commit_queued(self)
	battle_draw_presentation.apply_state(self, next_state, origins)


func _on_pile_pressed(pile_index: int) -> void:
	if battle_turn_resolving or battle_draw_presentation.active:
		return
	if str(battle_state.get("pending_pile_operation", "")) != "":
		var origins := battle_draw_presentation.capture_origins(self)
		var next_state := BattleRules.resolve_pile_operation(battle_state, pile_index)
		battle_draw_presentation.apply_state(self, next_state, origins)
		return
	if int(battle_state.get("pending_draws", 0)) > 0 or int(battle_state.get("pending_pile_draw_count", 0)) > 0:
		selected_source = {}
		var origins := battle_draw_presentation.capture_origins(self)
		var next_state := BattleRules.draw_from_file(battle_state, pile_index)
		battle_draw_presentation.apply_state(self, next_state, origins)
		return
	if selected_source.is_empty():
		if battle_state["piles"][pile_index].is_empty():
			battle_state["message"] = "비어 있는 파일입니다."
		else:
			selected_source = {"type": "pile", "pile_index": pile_index}
			var top_card: Dictionary = battle_state["piles"][pile_index].back()
			var star_cost := CardStickers.solitaire_star_cost(top_card)
			battle_state["message"] = "카드를 옮길 목적지 파일을 선택하세요. 무료 솔리테어 행동입니다." if star_cost == 0 else "카드를 옮길 목적지 파일을 선택하세요. ★ %d개를 사용합니다." % star_cost
			_show_battle()
		return
	if selected_source["type"] == "hand":
		battle_state = BattleRules.move_hand_card_to_file(battle_state, int(selected_source["card_id"]), pile_index)
	else:
		battle_state = BattleRules.move_top_between_files(battle_state, int(selected_source["pile_index"]), pile_index)
	selected_source = {}
	_show_battle()


func _end_turn() -> void:
	if screen_name != "battle" or not _battle_drop_available():
		return
	if get_viewport().gui_is_dragging():
		get_viewport().gui_cancel_drag()
	battle_turn_resolving = true
	var draw_view: Dictionary = {}
	var turn_view: Dictionary = {}
	var next_state := BattleRules.end_turn(battle_state, draw_view, turn_view)
	selected_source = {}
	selected_battle_hand_card_id = -1
	battle_turn_presentation.present(self, battle_state, next_state, draw_view, turn_view)


func _finish_battle_win() -> void:
	if screen_name == "reward":
		return
	var position: Vector2i = run_state["encounter_position"]
	if not run_state["defeated_enemies"].has(position):
		run_state["defeated_enemies"].append(position)
		run_state["region_battle_wins"] = int(run_state.get("region_battle_wins", 0)) + 1
		MapRules.mark_enemy_defeated(run_state["map"], position)
		run_state["player_hp"] = int(battle_state["player_hp"])
		var is_boss := bool(battle_state.get("enemy_is_boss", false))
		var first_reward_id := int(run_state.get("next_card_id", run_state["deck"].size() + 1))
		var rare_chance := float(run_state.get("rare_card_drop_chance", 0.05))
		reward_cards = CardCatalog.create_reward_cards(first_reward_id, reward_random, is_boss, rare_chance)
		run_state["next_card_id"] = first_reward_id + reward_cards.size()
		var floor_cards: Array = run_state.get("floor_cards", [])
		var reward_position: Vector2i = run_state.get("position", position)
		for reward_card in reward_cards:
			floor_cards.append({"x": reward_position.x, "y": reward_position.y, "card": reward_card.duplicate(true)})
		run_state["floor_cards"] = floor_cards
		if not is_boss:
			var rewarded_card: Dictionary = reward_cards[0]
			if str(rewarded_card.get("rarity", "")) == "rare":
				run_state["rare_card_drop_chance"] = 0.05
			else:
				run_state["rare_card_drop_chance"] = minf(1.0, rare_chance + 0.02)
			run_state["keys"] = int(run_state.get("keys", 0)) + 1
	screen_name = "reward"
	var backdrop := ColorRect.new()
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.z_index = 200
	backdrop.color = Color(28.0 / 255.0, 30.0 / 255.0, 27.0 / 255.0, 0.62)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.z_index = 201
	center.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(center)
	var result_panel := PanelContainer.new()
	result_panel.custom_minimum_size.x = 538
	var result_style := StyleBoxFlat.new()
	result_style.bg_color = Color("#f7f5ef")
	result_style.border_color = Color("#5b574f")
	result_style.set_border_width_all(1)
	result_style.set_corner_radius_all(4)
	result_style.shadow_color = Color(0, 0, 0, 0.3)
	result_style.shadow_size = 24
	result_style.shadow_offset = Vector2(0, 8)
	result_panel.add_theme_stylebox_override("panel", result_style)
	center.add_child(result_panel)
	var inset := MarginContainer.new()
	for margin_name in ["margin_left", "margin_top", "margin_right", "margin_bottom"]:
		inset.add_theme_constant_override(margin_name, 34)
	result_panel.add_child(inset)
	var body := VBoxContainer.new()
	body.alignment = BoxContainer.ALIGNMENT_CENTER
	body.add_theme_constant_override("separation", 0)
	inset.add_child(body)
	var title := _label("승리!", 32, Color("#24241f"))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_override("font", DeckEditorHeadingFont)
	body.add_child(title)
	if not bool(battle_state.get("enemy_is_boss", false)):
		var key_spacer := Control.new()
		key_spacer.custom_minimum_size.y = 12
		body.add_child(key_spacer)
		var key_reward := _label("·  열쇠 +1", 20, Color("#24241f"))
		key_reward.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		key_reward.add_theme_font_override("font", DeckEditorHeadingFont)
		body.add_child(key_reward)
	var card_spacer := Control.new()
	card_spacer.custom_minimum_size.y = 17 if not bool(battle_state.get("enemy_is_boss", false)) else 29
	body.add_child(card_spacer)
	var card_row := HBoxContainer.new()
	card_row.add_theme_constant_override("separation", 22)
	card_row.alignment = BoxContainer.ALIGNMENT_CENTER
	body.add_child(card_row)
	for reward_card in reward_cards:
		card_row.add_child(_card_widget(reward_card, false))
	var button_spacer := Control.new()
	button_spacer.custom_minimum_size.y = 22
	body.add_child(button_spacer)
	var button_row := CenterContainer.new()
	body.add_child(button_row)
	var continue_button := _button("다음", Callable(self, "_return_to_map"), Vector2(96, 40))
	continue_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	continue_button.focus_mode = Control.FOCUS_ALL
	var button_normal := StyleBoxFlat.new()
	button_normal.bg_color = Color.WHITE
	button_normal.border_color = Color("#5e5547")
	button_normal.set_border_width_all(1)
	button_normal.set_corner_radius_all(3)
	var button_hover := button_normal.duplicate() as StyleBoxFlat
	button_hover.bg_color = Color("#eeeae1")
	continue_button.add_theme_stylebox_override("normal", button_normal)
	continue_button.add_theme_stylebox_override("hover", button_hover)
	continue_button.add_theme_stylebox_override("pressed", button_hover)
	continue_button.add_theme_color_override("font_color", Color("#24241f"))
	continue_button.add_theme_color_override("font_hover_color", Color("#24241f"))
	continue_button.add_theme_color_override("font_pressed_color", Color("#24241f"))
	continue_button.add_theme_color_override("font_focus_color", Color("#24241f"))
	continue_button.add_theme_font_override("font", DeckEditorHeadingFont)
	continue_button.add_theme_font_size_override("font_size", 14)
	button_row.add_child(continue_button)
	continue_button.call_deferred("grab_focus")


func _return_to_map() -> void:
	selected_source = {}
	notice = "전투 보상 카드 %d장이 이 타일에 떨어졌습니다." % reward_cards.size()
	_show_map()
	_save_run()


func _floor_card_count_at(position: Vector2i) -> int:
	var count := 0
	for drop in run_state.get("floor_cards", []):
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y:
			count += 1
	return count


func _inventory_item_count() -> int:
	return run_state.get("inventory_cards", []).size() + run_state.get("inventory_consumables", []).size()


func _inventory_space_available() -> int:
	return maxi(0, INVENTORY_CAPACITY - _inventory_item_count())


func _quick_pick_up_floor_items() -> void:
	var position: Vector2i = run_state["position"]
	var free_item_slots := _inventory_space_available()
	var inventory_cards: Array = run_state.get("inventory_cards", []).duplicate(true)
	var inventory_consumables: Array = run_state.get("inventory_consumables", []).duplicate(true)
	var remaining_cards: Array = []
	var remaining_consumables: Array = []
	var remaining_deck_drops: Array = []
	var picked_card_count := 0
	var picked_consumable_count := 0
	var picked_deck_count := 0
	var floor_cards: Array = run_state.get("floor_cards", [])
	var floor_consumables: Array = run_state.get("floor_consumable_drops", [])
	var floor_decks: Array = run_state.get("floor_deck_drops", [])
	for drop in floor_cards:
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y and free_item_slots > 0:
			inventory_cards.append(drop.get("card", {}).duplicate(true))
			picked_card_count += 1
			free_item_slots -= 1
		else:
			remaining_cards.append(drop)
	for drop in floor_consumables:
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y and free_item_slots > 0:
			var consumable: Dictionary = drop.get("consumable", {})
			if not consumable.is_empty():
				inventory_consumables.append(consumable.duplicate(true))
				picked_consumable_count += 1
				free_item_slots -= 1
			else:
				remaining_consumables.append(drop)
		else:
			remaining_consumables.append(drop)
	var owned_decks: Array = run_state.get("owned_decks", []).duplicate(true)
	var free_deck_slots := maxi(0, MAX_OWNED_DECKS - owned_decks.size())
	for drop in floor_decks:
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y and free_deck_slots > 0:
			var deck: Dictionary = drop.get("deck", {})
			if not deck.is_empty():
				owned_decks.append(deck.duplicate(true))
				picked_deck_count += 1
				free_deck_slots -= 1
			else:
				remaining_deck_drops.append(drop)
		else:
			remaining_deck_drops.append(drop)
	var total_picked := picked_card_count + picked_consumable_count + picked_deck_count
	if picked_card_count > 0:
		run_state["inventory_cards"] = inventory_cards
	if picked_consumable_count > 0:
		run_state["inventory_consumables"] = inventory_consumables
	if picked_deck_count > 0:
		run_state["owned_decks"] = owned_decks
	run_state["floor_cards"] = remaining_cards
	run_state["floor_consumable_drops"] = remaining_consumables
	run_state["floor_deck_drops"] = remaining_deck_drops
	var pickup_messages: Array[String] = []
	if picked_card_count > 0:
		pickup_messages.append("카드 %d장 획득" % picked_card_count)
	if picked_consumable_count > 0:
		pickup_messages.append("소모품 %d개 획득" % picked_consumable_count)
	if picked_deck_count > 0:
		pickup_messages.append("금고 덱 %d개 획득" % picked_deck_count)
	if _floor_card_count_at(position) + _floor_consumable_drop_count_at(position) > 0:
		pickup_messages.append("인벤토리가 가득 찼습니다!")
	if _floor_deck_drop_count_at(position) > 0:
		pickup_messages.append("보유 덱 슬롯이 가득찼습니다!")
	notice = " · ".join(pickup_messages)
	if total_picked > 0:
		_save_run()
	_show_map()


func _collect_floor_cards() -> void:
	var position: Vector2i = run_state["position"]
	var floor_cards: Array = run_state.get("floor_cards", [])
	var inventory: Array = run_state.get("inventory_cards", [])
	var remaining: Array = []
	var collected := 0
	var left_behind := 0
	var space := _inventory_space_available()
	for drop in floor_cards:
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y:
			if space > 0:
				inventory.append(drop.get("card", {}).duplicate(true))
				collected += 1
				space -= 1
			else:
				remaining.append(drop)
				left_behind += 1
		else:
			remaining.append(drop)
	if collected == 0:
		if left_behind > 0:
			notice = "인벤토리가 가득 찼습니다."
			_show_map()
		return
	run_state["inventory_cards"] = inventory
	run_state["floor_cards"] = remaining
	notice = "카드 %d장을 인벤토리에 넣었습니다." % collected
	if left_behind > 0:
		notice += " 인벤토리가 가득 차 %d장은 바닥에 남았습니다." % left_behind
	_save_run()
	_show_map()


func _floor_deck_drop_count_at(position: Vector2i) -> int:
	var count := 0
	for drop in run_state.get("floor_deck_drops", []):
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y:
			count += 1
	return count


func _floor_consumable_drop_count_at(position: Vector2i) -> int:
	var count := 0
	for drop in run_state.get("floor_consumable_drops", []):
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y:
			count += 1
	return count


func _collect_floor_deck_drops() -> void:
	var position: Vector2i = run_state["position"]
	var drops: Array = run_state.get("floor_deck_drops", [])
	var remaining: Array = []
	var decks: Array = run_state.get("owned_decks", [])
	var collected := 0
	for drop in drops:
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y:
			var deck: Dictionary = drop.get("deck", {})
			if not deck.is_empty():
				decks.append(deck.duplicate(true))
				collected += 1
		else:
			remaining.append(drop)
	if collected == 0:
		return
	run_state["owned_decks"] = decks
	run_state["floor_deck_drops"] = remaining
	notice = "금고 덱 %d개를 획득했습니다. 덱 보기에서 장착할 수 있습니다." % collected
	_save_run()
	_show_map()


func _collect_floor_consumable_drops() -> void:
	var position: Vector2i = run_state["position"]
	var drops: Array = run_state.get("floor_consumable_drops", [])
	var remaining: Array = []
	var inventory: Array = run_state.get("inventory_consumables", [])
	var collected := 0
	var left_behind := 0
	var space := _inventory_space_available()
	for drop in drops:
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y:
			var consumable: Dictionary = drop.get("consumable", {})
			if not consumable.is_empty() and space > 0:
				inventory.append(consumable.duplicate(true))
				collected += 1
				space -= 1
			else:
				remaining.append(drop)
				left_behind += 1
		else:
			remaining.append(drop)
	if collected == 0:
		if left_behind > 0:
			notice = "인벤토리가 가득 찼습니다."
			_show_map()
		return
	run_state["inventory_consumables"] = inventory
	run_state["floor_consumable_drops"] = remaining
	notice = "소모품 %d개를 획득했습니다." % collected
	if left_behind > 0:
		notice += " 인벤토리가 가득 차 %d개는 바닥에 남았습니다." % left_behind
	_save_run()
	_show_map()


func _is_rare_slot_card(card: Dictionary) -> bool:
	return DeckEditorRules.is_high_rarity(card)


func _begin_deck_editor_session() -> void:
	if deck_editor_session_active or run_state.is_empty():
		return
	deck_editor_session_active = true
	deck_editor_selected_deck_id = str(run_state.get("active_deck_id", "starter"))
	deck_editor_origins_by_card_id.clear()
	deck_editor_pending_removals.clear()
	for deck in run_state.get("owned_decks", []):
		var deck_id := str(deck.get("id", ""))
		for card in deck.get("cards", []):
			deck_editor_origins_by_card_id[int(card.get("id", -1))] = deck_id
	for card in run_state.get("inventory_cards", []):
		deck_editor_origins_by_card_id[int(card.get("id", -1))] = null
	for drop in run_state.get("floor_cards", []):
		var card: Dictionary = drop.get("card", {})
		deck_editor_origins_by_card_id[int(card.get("id", -1))] = null


func _finish_deck_editor_session() -> void:
	if not deck_editor_session_active:
		return
	if not deck_editor_pending_removals.is_empty():
		for pending in deck_editor_pending_removals:
			var card: Dictionary = pending.get("card", {})
			deck_editor_high_rarity_return_area_by_card_id.erase(int(card.get("id", -1)))
		# Web confirms removal by clearing the pending collection, not creating drops.
		notice = ""
	deck_editor_pending_removals.clear()
	deck_editor_session_active = false
	deck_editor_selected_deck_id = ""
	deck_editor_origins_by_card_id.clear()
	_sync_active_deck()
	_save_run()


func _apply_pending_deck_add_effect(view: Control, card_ids: Array) -> void:
	# Browser isTemporary: a stack blinks if any card came from outside a deck.
	for card_id in card_ids:
		if _origin_deck_id_for_card(int(card_id)) == "":
			var effect := PendingRemovalEffectScript.new()
			view.add_child(effect)
			effect.configure(view, deck_editor_effect_started_usec,
				DisplayServer.accessibility_should_reduce_animation() == 1, null, null, false)
			return


func _origin_deck_id_for_card(card_id: int) -> String:
	var original = deck_editor_origins_by_card_id.get(card_id, null)
	return "" if original == null else str(original)


func _active_deck_add_error(card: Dictionary) -> String:
	return _deck_add_error(card, str(run_state.get("active_deck_id", "starter")))


func _deck_add_error(card: Dictionary, deck_id: String) -> String:
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) != deck_id:
			continue
		var cards: Array = run_state.get("deck", []) if deck_id == str(run_state.get("active_deck_id", "starter")) else deck.get("cards", [])
		return DeckEditorRules.add_card_error(cards, card,
			int(deck.get("capacity", 25)), int(deck.get("rare_slot_capacity", 1)))
	return "deck-full"


func _can_remove_deck_card(card: Dictionary, safe_area: bool, deck_id: String = "") -> bool:
	var card_id := int(card.get("id", -1))
	var source_deck_id := deck_id if deck_id != "" else str(run_state.get("active_deck_id", "starter"))
	if extraction_ticket_mode:
		return deck_editor_origins_by_card_id.has(card_id) and _origin_deck_id_for_card(card_id) == source_deck_id
	if safe_area:
		return true
	var return_area := str(deck_editor_high_rarity_return_area_by_card_id.get(card_id, ""))
	if return_area != "":
		return true
	var original_deck_id := _origin_deck_id_for_card(card_id)
	return original_deck_id == "" or original_deck_id == source_deck_id


func _can_transfer_deck_card(card: Dictionary, safe_area: bool) -> bool:
	if safe_area:
		return true
	return not _is_rare_slot_card(card) and _origin_deck_id_for_card(int(card.get("id", -1))) == ""


func _deck_card_remove_label(card: Dictionary, safe_area: bool, deck_id: String = "") -> String:
	var source_deck_id := deck_id if deck_id != "" else str(run_state.get("active_deck_id", "starter"))
	if extraction_ticket_mode:
		return "추출 티켓 사용"
	if not safe_area and deck_editor_high_rarity_return_area_by_card_id.has(int(card.get("id", -1))):
		return "원래 위치로"
	if not safe_area and _origin_deck_id_for_card(int(card.get("id", -1))) == source_deck_id:
		return "제거 예약"
	return "인벤토리로" if _inventory_space_available() > 0 else "바닥으로"


func _set_owned_deck_cards(deck_id: String, cards: Array) -> void:
	var decks: Array = run_state.get("owned_decks", []).duplicate(true)
	for index in range(decks.size()):
		if str(decks[index].get("id", "")) != deck_id:
			continue
		var updated: Dictionary = decks[index].duplicate(true)
		updated["cards"] = cards.duplicate(true)
		decks[index] = updated
		run_state["owned_decks"] = decks
		if deck_id == str(run_state.get("active_deck_id", "starter")):
			run_state["deck"] = cards.duplicate(true)
		_sync_active_deck()
		return


func _put_card_on_current_tile(card: Dictionary) -> void:
	var floor_cards: Array = run_state.get("floor_cards", [])
	var position: Vector2i = run_state["position"]
	floor_cards.append({"x": position.x, "y": position.y, "card": card.duplicate(true)})
	run_state["floor_cards"] = floor_cards


func _move_floor_card_to_deck(card_id: int, deck_id: String = "") -> void:
	_move_external_card_to_deck(card_id, "floor", deck_id)


func _move_external_card_to_deck(card_id: int, source_area: String, requested_deck_id: String) -> void:
	_begin_deck_editor_session()
	var target_deck_id := requested_deck_id if requested_deck_id != "" else str(run_state.get("active_deck_id", "starter"))
	var error := "deck-full"
	var target_deck: Dictionary = {}
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == target_deck_id:
			target_deck = deck
			break
	if target_deck.is_empty():
		return
	var deck_cards: Array = run_state.get("deck", []) if target_deck_id == str(run_state.get("active_deck_id", "starter")) else target_deck.get("cards", [])
	var card: Dictionary = {}
	var source_index := -1
	var inventory: Array = run_state.get("inventory_cards", [])
	var floor_cards: Array = run_state.get("floor_cards", [])
	if source_area == "inventory":
		for index in range(inventory.size()):
			if int(inventory[index].get("id", -1)) == card_id:
				card = inventory[index]
				source_index = index
				break
	else:
		var position: Vector2i = run_state["position"]
		for index in range(floor_cards.size()):
			var drop: Dictionary = floor_cards[index]
			if int(drop.get("x", -1)) != position.x or int(drop.get("y", -1)) != position.y:
				continue
			var dropped_card: Dictionary = drop.get("card", {})
			if int(dropped_card.get("id", -1)) == card_id:
				card = dropped_card
				source_index = index
				break
	if source_index < 0 or card.is_empty():
		return
	error = _deck_add_error(card, target_deck_id)
	if error != "":
		notice = "덱 용량이 가득 찼습니다." if error == "deck-full" else "희귀 슬롯이 가득 찼습니다."
		_show_deck()
		return
	deck_cards = deck_cards.duplicate(true)
	deck_cards.append(card.duplicate(true))
	if source_area == "inventory":
		inventory.remove_at(source_index)
		run_state["inventory_cards"] = inventory
	else:
		floor_cards.remove_at(source_index)
		run_state["floor_cards"] = floor_cards
	_set_owned_deck_cards(target_deck_id, deck_cards)
	deck_editor_selected_deck_id = target_deck_id
	if _is_rare_slot_card(card):
		deck_editor_high_rarity_return_area_by_card_id[card_id] = source_area
	notice = "%s을(를) %s으로 옮겼습니다." % [str(card.get("name", "카드")), str(target_deck.get("name", "덱"))]
	_show_deck()


func _move_inventory_card_to_floor(card_id: int) -> void:
	_begin_deck_editor_session()
	var inventory: Array = run_state.get("inventory_cards", [])
	for index in range(inventory.size()):
		var card: Dictionary = inventory[index]
		if int(card.get("id", -1)) != card_id:
			continue
		inventory.remove_at(index)
		run_state["inventory_cards"] = inventory
		_put_card_on_current_tile(card)
		deck_editor_high_rarity_return_area_by_card_id.erase(card_id)
		_sync_active_deck()
		notice = "%s을(를) 현재 타일에 놓았습니다." % str(card.get("name", "카드"))
		_show_deck()
		return


func _move_floor_card_to_inventory(card_id: int) -> void:
	_begin_deck_editor_session()
	if _inventory_space_available() <= 0:
		notice = "인벤토리가 가득 찼습니다."
		_show_deck()
		return
	var position: Vector2i = run_state["position"]
	var floor_cards: Array = run_state.get("floor_cards", [])
	for index in range(floor_cards.size()):
		var drop: Dictionary = floor_cards[index]
		if int(drop.get("x", -1)) != position.x or int(drop.get("y", -1)) != position.y:
			continue
		var card: Dictionary = drop.get("card", {})
		if int(card.get("id", -1)) != card_id:
			continue
		floor_cards.remove_at(index)
		var inventory: Array = run_state.get("inventory_cards", [])
		inventory.append(card.duplicate(true))
		run_state["floor_cards"] = floor_cards
		run_state["inventory_cards"] = inventory
		if _is_rare_slot_card(card):
			deck_editor_high_rarity_return_area_by_card_id[card_id] = "inventory"
		_sync_active_deck()
		notice = "%s을(를) 인벤토리로 옮겼습니다." % str(card.get("name", "카드"))
		_show_deck()
		return


func _move_deck_card_to_floor(card_id: int, source_deck_id: String) -> void:
	_begin_deck_editor_session()
	var source_deck: Dictionary = {}
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == source_deck_id:
			source_deck = deck
			break
	if source_deck.is_empty():
		return
	var cards: Array = run_state.get("deck", []) if source_deck_id == str(run_state.get("active_deck_id", "starter")) else source_deck.get("cards", [])
	for index in range(cards.size()):
		var card: Dictionary = cards[index]
		if int(card.get("id", -1)) != card_id:
			continue
		var safe_area: bool = MapRules.is_safe_area_tile(run_state["map"], run_state["position"]) \
			or run_state.get("blessings", []).has("forbiddenKnowledge")
		var original_deck_id := _origin_deck_id_for_card(card_id)
		var rare_card := _is_rare_slot_card(card)
		var return_area := str(deck_editor_high_rarity_return_area_by_card_id.get(card_id, "")) if rare_card else ""
		var schedule_removal := false
		if not safe_area and return_area == "":
			if rare_card:
				if original_deck_id != source_deck_id:
					notice = "희귀·전설 카드는 일반 이동으로 꺼낼 수 없습니다."
					_show_deck()
					return
			else:
				if original_deck_id != "" and original_deck_id != source_deck_id:
					notice = "현재 위치에서는 편집 시작 당시의 원래 덱으로만 되돌릴 수 있습니다."
					_show_deck()
					return
			schedule_removal = original_deck_id == source_deck_id
		cards.remove_at(index)
		_set_owned_deck_cards(source_deck_id, cards)
		if schedule_removal:
			deck_editor_pending_removals.append({"deck_id": source_deck_id, "card": card.duplicate(true)})
			notice = "%s을(를) 제거 예정 상태로 만들었습니다." % str(card.get("name", "카드"))
		elif return_area == "inventory" and _inventory_space_available() > 0 and not safe_area:
			var inventory: Array = run_state.get("inventory_cards", [])
			inventory.append(card.duplicate(true))
			run_state["inventory_cards"] = inventory
			notice = "%s을(를) 인벤토리로 옮겼습니다." % str(card.get("name", "카드"))
		else:
			_put_card_on_current_tile(card)
			notice = "%s을(를) 현재 타일에 놓았습니다." % str(card.get("name", "카드"))
		deck_editor_high_rarity_return_area_by_card_id.erase(card_id)
		_show_deck()
		return


func _move_inventory_consumable_to_floor(consumable_id: String) -> void:
	var inventory: Array = run_state.get("inventory_consumables", [])
	for index in range(inventory.size()):
		var consumable: Dictionary = inventory[index]
		if str(consumable.get("id", "")) != consumable_id:
			continue
		inventory.remove_at(index)
		var position: Vector2i = run_state["position"]
		var drops: Array = run_state.get("floor_consumable_drops", [])
		drops.append({"x": position.x, "y": position.y, "consumable": consumable.duplicate(true)})
		run_state["inventory_consumables"] = inventory
		run_state["floor_consumable_drops"] = drops
		if extraction_ticket_mode and extraction_ticket_source == "inventory" and extraction_ticket_id == consumable_id:
			extraction_ticket_mode = false
			extraction_ticket_id = ""
		_show_deck()
		return


func _move_floor_consumable_to_inventory(consumable_id: String) -> void:
	if _inventory_space_available() <= 0:
		notice = "인벤토리가 가득 찼습니다."
		_show_deck()
		return
	var position: Vector2i = run_state["position"]
	var drops: Array = run_state.get("floor_consumable_drops", [])
	for index in range(drops.size()):
		var drop: Dictionary = drops[index]
		if int(drop.get("x", -1)) != position.x or int(drop.get("y", -1)) != position.y:
			continue
		var consumable: Dictionary = drop.get("consumable", {})
		if str(consumable.get("id", "")) != consumable_id:
			continue
		drops.remove_at(index)
		var inventory: Array = run_state.get("inventory_consumables", [])
		inventory.append(consumable.duplicate(true))
		run_state["floor_consumable_drops"] = drops
		run_state["inventory_consumables"] = inventory
		if extraction_ticket_mode and extraction_ticket_source == "floor" and extraction_ticket_id == consumable_id:
			extraction_ticket_mode = false
			extraction_ticket_id = ""
		_show_deck()
		return


func _restore_pending_deck_card(card_id: int) -> void:
	for index in range(deck_editor_pending_removals.size()):
		var pending: Dictionary = deck_editor_pending_removals[index]
		var card: Dictionary = pending.get("card", {})
		if int(card.get("id", -1)) != card_id:
			continue
		var deck_id := str(pending.get("deck_id", ""))
		var deck_cards: Array = []
		var capacity := 0
		var rare_capacity := 0
		for deck in run_state.get("owned_decks", []):
			if str(deck.get("id", "")) == deck_id:
				deck_cards = deck.get("cards", [])
				capacity = int(deck.get("capacity", 0))
				rare_capacity = int(deck.get("rare_slot_capacity", 0))
				break
		if deck_cards.size() >= capacity:
			notice = "덱 용량이 가득 차 제거 예약을 취소할 수 없습니다."
			_show_deck()
			return
		if _is_rare_slot_card(card):
			var rare_count := 0
			for existing in deck_cards:
				if _is_rare_slot_card(existing):
					rare_count += 1
			if rare_count >= rare_capacity:
				notice = "희귀 슬롯이 가득 차 제거 예약을 취소할 수 없습니다."
				_show_deck()
				return
		deck_editor_pending_removals.remove_at(index)
		if deck_id == str(run_state.get("active_deck_id", "starter")):
			run_state["deck"].append(card.duplicate(true))
			_sync_active_deck()
		else:
			var decks: Array = run_state.get("owned_decks", [])
			for deck_index in range(decks.size()):
				if str(decks[deck_index].get("id", "")) != deck_id:
					continue
				var updated: Dictionary = decks[deck_index].duplicate(true)
				var cards: Array = updated.get("cards", [])
				cards.append(card.duplicate(true))
				updated["cards"] = cards
				decks[deck_index] = updated
				run_state["owned_decks"] = decks
				break
		notice = "%s 제거 예약을 취소했습니다." % str(card.get("name", "카드"))
		_show_deck()
		return


func _move_deck_card_to_inventory(card_id: int, requested_deck_id: String = "") -> void:
	_begin_deck_editor_session()
	var safe_area: bool = MapRules.is_safe_area_tile(run_state["map"], run_state["position"]) \
		or run_state.get("blessings", []).has("forbiddenKnowledge")
	var source_deck_id := requested_deck_id if requested_deck_id != "" else str(run_state.get("active_deck_id", "starter"))
	var source_deck: Dictionary = {}
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == source_deck_id:
			source_deck = deck
			break
	if source_deck.is_empty():
		return
	var cards: Array = run_state.get("deck", []) if source_deck_id == str(run_state.get("active_deck_id", "starter")) else source_deck.get("cards", [])
	for index in range(cards.size()):
		var card: Dictionary = cards[index]
		if int(card.get("id", -1)) != card_id:
			continue
		if not _can_remove_deck_card(card, safe_area, source_deck_id):
			notice = "현재 위치에서는 편집 시작 당시의 원래 덱으로만 되돌릴 수 있습니다."
			_show_deck()
			return
		var return_area := str(deck_editor_high_rarity_return_area_by_card_id.get(card_id, ""))
		var original_deck_id := _origin_deck_id_for_card(card_id)
		if not safe_area and ((_is_rare_slot_card(card) and return_area != "inventory") \
				or (not _is_rare_slot_card(card) and original_deck_id != "")):
			notice = "현재 위치에서는 이 카드를 인벤토리로 옮길 수 없습니다."
			_show_deck()
			return
		if _inventory_space_available() <= 0:
			notice = "인벤토리가 가득 찼습니다."
			_show_deck()
			return
		cards.remove_at(index)
		_set_owned_deck_cards(source_deck_id, cards)
		var inventory: Array = run_state.get("inventory_cards", [])
		inventory.append(card.duplicate(true))
		run_state["inventory_cards"] = inventory
		notice = "%s을(를) 인벤토리로 옮겼습니다." % str(card.get("name", "카드"))
		deck_editor_high_rarity_return_area_by_card_id.erase(card_id)
		_show_deck()
		return


func _move_card_between_decks(card_id: int, source_deck_id: String, target_selector: OptionButton) -> void:
	var target_index := target_selector.selected
	if target_index < 0:
		return
	var target_deck_id := str(target_selector.get_item_metadata(target_index))
	_move_card_between_decks_by_id(card_id, source_deck_id, target_deck_id)


func _move_card_between_decks_by_id(card_id: int, source_deck_id: String, target_deck_id: String) -> void:
	var safe_area := MapRules.is_safe_area_tile(run_state["map"], run_state["position"])
	if target_deck_id == source_deck_id:
		return
	var source_cards: Array = []
	var card: Dictionary = {}
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) != source_deck_id:
			continue
		source_cards = run_state.get("deck", []) if source_deck_id == str(run_state.get("active_deck_id", "starter")) else deck.get("cards", [])
		break
	for source_card in source_cards:
		if int(source_card.get("id", -1)) == card_id:
			card = source_card
			break
	if card.is_empty():
		return
	if not _can_transfer_deck_card(card, safe_area):
		notice = "안전 구역에서는 자유롭게 옮길 수 있고, 그 외 지역에서는 덱 밖에서 들어온 일반 카드만 옮길 수 있습니다."
		_show_deck()
		return
	var error := _deck_add_error(card, target_deck_id)
	if error != "":
		notice = "대상 덱 용량이 가득 찼습니다." if error == "deck-full" else "대상 덱의 희귀 슬롯이 가득 찼습니다."
		_show_deck()
		return
	source_cards = source_cards.duplicate(true)
	for index in range(source_cards.size()):
		if int(source_cards[index].get("id", -1)) == card_id:
			source_cards.remove_at(index)
			break
	var target_cards: Array = []
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == target_deck_id:
			target_cards = run_state.get("deck", []) if target_deck_id == str(run_state.get("active_deck_id", "starter")) else deck.get("cards", [])
			break
	target_cards = target_cards.duplicate(true)
	target_cards.append(card.duplicate(true))
	_set_owned_deck_cards(source_deck_id, source_cards)
	_set_owned_deck_cards(target_deck_id, target_cards)
	deck_editor_selected_deck_id = target_deck_id
	notice = "%s을(를) 다른 덱으로 옮겼습니다." % str(card.get("name", "카드"))
	_show_deck()


func _configure_run_card_drag(widget: Control, card: Dictionary, source_area: String,
			source_deck_id: String = "", target_area: String = "", target_deck_id: String = "") -> void:
	widget.mouse_filter = Control.MOUSE_FILTER_STOP
	widget.set("run_drag_payload", {
		"kind": "run-card",
		"card_id": int(card.get("id", -1)),
		"card_name": str(card.get("name", "카드")),
		"source_area": source_area,
		"source_deck_id": source_deck_id,
	})
	if target_area.is_empty():
		return
	widget.set("run_drop_target", {"area": target_area, "deck_id": target_deck_id})
	widget.set("run_drop_callback", Callable(self, "_on_run_card_dropped"))


func _configure_deck_card_ticket_drop(widget: Control, deck_id: String, card: Dictionary) -> void:
	widget.set("ticket_drop_target", {
		"action": "extract-deck-card",
		"deck_id": deck_id,
		"card_id": int(card.get("id", -1)),
	})
	widget.set("ticket_drop_callback", Callable(self, "_on_run_ticket_dropped"))
	widget.set("ticket_can_drop_callback", Callable(self, "_can_drop_extract_ticket"))


func _run_card_drop_zone(message: String, target_area: String, target_deck_id: String = "") -> Control:
	var zone = BattleCardDragSourceScript.new()
	zone.custom_minimum_size = Vector2(210, 56)
	zone.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	zone.mouse_filter = Control.MOUSE_FILTER_STOP
	zone.set("run_drop_target", {"area": target_area, "deck_id": target_deck_id})
	zone.set("run_drop_callback", Callable(self, "_on_run_card_dropped"))
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#171918")
	style.border_color = Color("#706b5e")
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	zone.add_theme_stylebox_override("panel", style)
	var label := _label(message, 13, COLOR_MUTED)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_PASS
	zone.add_child(label)
	return zone


func _on_run_card_dropped(target: Dictionary, data: Dictionary) -> void:
	var card_id := int(data.get("card_id", -1))
	var source_area := str(data.get("source_area", ""))
	var target_area := str(target.get("area", ""))
	if target_area == "deck":
		var target_deck_id := str(target.get("deck_id", ""))
		if source_area == "pendingRemoval" and str(data.get("source_deck_id", "")) == target_deck_id:
			_restore_pending_deck_card(card_id)
		elif source_area == "deck":
			_move_card_between_decks_by_id(card_id, str(data.get("source_deck_id", "")), target_deck_id)
		elif source_area in ["inventory", "floor"]:
			_move_external_card_to_deck(card_id, source_area, target_deck_id)
		return
	if target_area == "inventory":
		if source_area == "deck":
			_move_deck_card_to_inventory(card_id, str(data.get("source_deck_id", "")))
		elif source_area == "floor":
			_move_floor_card_to_inventory(card_id)
		return
	if target_area == "floor" and source_area == "inventory":
		_move_inventory_card_to_floor(card_id)
	elif target_area == "floor" and source_area == "deck":
		_move_deck_card_to_floor(card_id, str(data.get("source_deck_id", "")))


func _on_deck_case_dropped(target: Dictionary, data: Dictionary) -> void:
	if str(data.get("kind", "")) != "deck-case":
		return
	var deck_id := str(data.get("deck_id", ""))
	match str(target.get("area", "")):
		"owned":
			_swap_owned_decks(deck_id, str(target.get("deck_id", "")))
		"emptyOwned":
			_pick_up_floor_deck(deck_id)
		"floor":
			_drop_owned_deck(deck_id)


func _swap_owned_decks(source_id: String, target_id: String) -> void:
	if source_id.is_empty() or target_id.is_empty() or source_id == target_id:
		return
	var decks: Array = run_state.get("owned_decks", []).duplicate(true)
	var source_index := -1
	var target_index := -1
	for index in range(decks.size()):
		var deck_id := str(decks[index].get("id", ""))
		if deck_id == source_id:
			source_index = index
		elif deck_id == target_id:
			target_index = index
	if source_index < 0 or target_index < 0:
		return
	var source_deck: Dictionary = decks[source_index]
	decks[source_index] = decks[target_index]
	decks[target_index] = source_deck
	run_state["owned_decks"] = decks
	_sync_active_deck()
	notice = "덱 순서를 바꿨습니다."
	_save_run()
	_show_deck()


func _pick_up_floor_deck(deck_id: String) -> void:
	var decks: Array = run_state.get("owned_decks", []).duplicate(true)
	if decks.size() >= MAX_OWNED_DECKS:
		notice = "덱은 최대 %d개까지 보유할 수 있습니다." % MAX_OWNED_DECKS
		_show_deck()
		return
	var position: Vector2i = run_state.get("position", Vector2i.ZERO)
	var floor_drops: Array = run_state.get("floor_deck_drops", []).duplicate(true)
	for index in range(floor_drops.size()):
		var drop: Dictionary = floor_drops[index]
		if int(drop.get("x", -1)) != position.x or int(drop.get("y", -1)) != position.y:
			continue
		var floor_deck: Dictionary = drop.get("deck", {})
		if str(floor_deck.get("id", "")) != deck_id:
			continue
		decks.append(floor_deck.duplicate(true))
		floor_drops.remove_at(index)
		run_state["owned_decks"] = decks
		run_state["floor_deck_drops"] = floor_drops
		notice = "덱 「%s」을(를) 주웠습니다. 보유 덱 %d / %d" % [
			str(floor_deck.get("name", "금고 덱")), decks.size(), MAX_OWNED_DECKS]
		_save_run()
		_show_deck()
		return


func _drop_owned_deck(deck_id: String) -> void:
	var decks: Array = run_state.get("owned_decks", []).duplicate(true)
	var deck_index := -1
	for index in range(decks.size()):
		if str(decks[index].get("id", "")) == deck_id:
			deck_index = index
			break
	if deck_index < 0:
		return
	var dropped_deck: Dictionary = decks[deck_index]
	decks.remove_at(deck_index)
	run_state["owned_decks"] = decks
	if str(run_state.get("active_deck_id", "")) == deck_id:
		if decks.is_empty():
			run_state["active_deck_id"] = ""
			run_state["deck"] = []
		else:
			run_state["active_deck_id"] = str(decks[0].get("id", ""))
			run_state["deck"] = decks[0].get("cards", []).duplicate(true)
	var position: Vector2i = run_state.get("position", Vector2i.ZERO)
	var floor_drops: Array = run_state.get("floor_deck_drops", []).duplicate(true)
	floor_drops.append({"x": position.x, "y": position.y, "deck": dropped_deck})
	run_state["floor_deck_drops"] = floor_drops
	_sync_active_deck()
	notice = "덱 「%s」을(를) 현재 타일에 놓았습니다." % str(dropped_deck.get("name", "덱"))
	_save_run()
	_show_deck()


func _on_owned_deck_header_gui_input(event: InputEvent, deck_id: String) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed or click.button_index != MOUSE_BUTTON_RIGHT:
		return
	_drop_owned_deck(deck_id)
	get_viewport().set_input_as_handled()


func _can_drop_extract_ticket(target: Dictionary, data: Dictionary) -> bool:
	if str(data.get("kind", "")) != "run-ticket" or str(data.get("ticket_type", "")) != "extractTicket":
		return false
	var ticket_id := str(data.get("ticket_id", ""))
	var source_area := str(data.get("source_area", ""))
	if ticket_id.is_empty() or source_area not in ["inventory", "floor"]:
		return false
	var ticket_exists := false
	if source_area == "inventory":
		for ticket in run_state.get("inventory_consumables", []):
			if str(ticket.get("id", "")) == ticket_id and str(ticket.get("type", "")) == "extractTicket":
				ticket_exists = true
				break
	else:
		var position: Vector2i = run_state.get("position", Vector2i.ZERO)
		for drop in run_state.get("floor_consumable_drops", []):
			if int(drop.get("x", -1)) != position.x or int(drop.get("y", -1)) != position.y:
				continue
			var ticket: Dictionary = drop.get("consumable", {})
			if str(ticket.get("id", "")) == ticket_id and str(ticket.get("type", "")) == "extractTicket":
				ticket_exists = true
				break
	if not ticket_exists:
		return false
	var card_id := int(target.get("card_id", -1))
	var deck_id := str(target.get("deck_id", ""))
	if card_id < 0 or deck_id.is_empty() or not deck_editor_origins_by_card_id.has(card_id):
		return false
	if _origin_deck_id_for_card(card_id) != deck_id:
		return false
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) != deck_id:
			continue
		var cards: Array = run_state.get("deck", []) if deck_id == str(run_state.get("active_deck_id", "starter")) else deck.get("cards", [])
		for card in cards:
			if int(card.get("id", -1)) == card_id:
				return true
	return false


func _on_run_ticket_dropped(target: Dictionary, data: Dictionary) -> void:
	if not _can_drop_extract_ticket(target, data):
		return
	extraction_ticket_mode = true
	extraction_ticket_source = str(data.get("source_area", ""))
	extraction_ticket_id = str(data.get("ticket_id", ""))
	_extract_owned_deck_card(str(target.get("deck_id", "")), int(target.get("card_id", -1)))


func _extract_owned_deck_card(deck_id: String, card_id: int) -> void:
	if not extraction_ticket_mode:
		return
	if not deck_editor_origins_by_card_id.has(card_id) or _origin_deck_id_for_card(card_id) != deck_id:
		notice = "추출 티켓은 편집을 시작할 때 해당 덱에 있던 카드에만 사용할 수 있습니다."
		_show_deck()
		return
	var tickets: Array = run_state.get("inventory_consumables", [])
	var floor_ticket_drops: Array = run_state.get("floor_consumable_drops", [])
	var ticket_index := -1
	if extraction_ticket_source == "inventory":
		for index in range(tickets.size()):
			if str(tickets[index].get("type", "")) == "extractTicket" \
				and (extraction_ticket_id == "" or str(tickets[index].get("id", "")) == extraction_ticket_id):
				ticket_index = index
				break
	else:
		var ticket_position: Vector2i = run_state["position"]
		for index in range(floor_ticket_drops.size()):
			var drop: Dictionary = floor_ticket_drops[index]
			if int(drop.get("x", -1)) != ticket_position.x or int(drop.get("y", -1)) != ticket_position.y:
				continue
			var ticket: Dictionary = drop.get("consumable", {})
			if str(ticket.get("type", "")) == "extractTicket" \
				and (extraction_ticket_id == "" or str(ticket.get("id", "")) == extraction_ticket_id):
				ticket_index = index
				break
	if ticket_index < 0:
		extraction_ticket_mode = false
		extraction_ticket_id = ""
		notice = "추출 티켓이 없습니다."
		_show_deck()
		return
	var decks: Array = run_state.get("owned_decks", [])
	for deck_index in range(decks.size()):
		var deck: Dictionary = decks[deck_index].duplicate(true)
		if str(deck.get("id", "")) != deck_id:
			continue
		var cards: Array = deck.get("cards", [])
		for card_index in range(cards.size()):
			var card: Dictionary = cards[card_index]
			if int(card.get("id", -1)) != card_id:
				continue
			cards.remove_at(card_index)
			deck["cards"] = cards
			decks[deck_index] = deck
			run_state["owned_decks"] = decks
			if deck_id == str(run_state.get("active_deck_id", "starter")):
				run_state["deck"] = cards.duplicate(true)
				_sync_active_deck()
			var inventory: Array = run_state.get("inventory_cards", [])
			var floor_cards: Array = run_state.get("floor_cards", [])
			var ticket_frees_slot := extraction_ticket_source == "inventory"
			var projected_inventory_count := _inventory_item_count() - (1 if ticket_frees_slot else 0)
			var dropped_to_floor := projected_inventory_count >= INVENTORY_CAPACITY
			if dropped_to_floor:
				var position: Vector2i = run_state["position"]
				floor_cards.append({"x": position.x, "y": position.y, "card": card.duplicate(true)})
				run_state["floor_cards"] = floor_cards
			else:
				inventory.append(card.duplicate(true))
				run_state["inventory_cards"] = inventory
			deck_editor_origins_by_card_id[card_id] = null
			deck_editor_high_rarity_return_area_by_card_id.erase(card_id)
			if extraction_ticket_source == "inventory":
				tickets.remove_at(ticket_index)
				run_state["inventory_consumables"] = tickets
			else:
				floor_ticket_drops.remove_at(ticket_index)
				run_state["floor_consumable_drops"] = floor_ticket_drops
			extraction_ticket_mode = false
			extraction_ticket_id = ""
			notice = "%s을(를) 추출 티켓으로 덱에서 꺼냈습니다." % str(card.get("name", "카드"))
			if dropped_to_floor:
				notice += " 인벤토리가 가득 차 현재 타일에 떨어졌습니다."
			_show_deck()
			return
	extraction_ticket_mode = false
	extraction_ticket_id = ""
	notice = "추출할 카드를 찾지 못했습니다."
	_show_deck()


func _show_deck() -> void:
	if screen_name != "deck" or deck_editor_effect_started_usec < 0:
		deck_editor_effect_started_usec = Time.get_ticks_usec()
	_clear_map_vault_preview()
	_hide_card_hover_preview()
	auto_travel_active = false
	auto_travel_path.clear()
	_sync_active_deck()
	_begin_deck_editor_session()
	screen_name = "deck"
	if deck_editor_overlay != null and is_instance_valid(deck_editor_overlay):
		remove_child(deck_editor_overlay)
		deck_editor_overlay.queue_free()
	deck_editor_overlay = Control.new()
	deck_editor_overlay.z_index = 100
	deck_editor_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	deck_editor_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(deck_editor_overlay)
	var backdrop := ColorRect.new()
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(4.0 / 255.0, 8.0 / 255.0, 7.0 / 255.0, 0.72)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.gui_input.connect(_on_deck_editor_backdrop_input)
	deck_editor_overlay.add_child(backdrop)
	var modal_margin := MarginContainer.new()
	modal_margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	modal_margin.add_theme_constant_override("margin_left", 14)
	modal_margin.add_theme_constant_override("margin_top", 14)
	modal_margin.add_theme_constant_override("margin_right", 14)
	modal_margin.add_theme_constant_override("margin_bottom", 14)
	deck_editor_overlay.add_child(modal_margin)
	var modal_panel := PanelContainer.new()
	modal_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	modal_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var modal_style := StyleBoxEmpty.new()
	modal_style.content_margin_left = 0
	modal_style.content_margin_top = 0
	modal_style.content_margin_right = 0
	modal_style.content_margin_bottom = 0
	modal_panel.add_theme_stylebox_override("panel", modal_style)
	modal_margin.add_child(modal_panel)
	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 9)
	page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	page.size_flags_vertical = Control.SIZE_EXPAND_FILL
	modal_panel.add_child(page)
	var can_change_deck := MapRules.is_safe_area_tile(run_state["map"], run_state["position"])
	var animate_safe_area_unlock: bool = safe_area_unlock_pending_animation and can_change_deck \
		and not run_state.get("blessings", []).has("forbiddenKnowledge")
	safe_area_unlock_pending_animation = false
	if extraction_ticket_mode:
		page.add_child(_label("추출할 덱 카드를 선택하세요.", 12, COLOR_GOLD))
	var editor_board := VBoxContainer.new()
	editor_board.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	editor_board.size_flags_vertical = Control.SIZE_EXPAND_FILL
	editor_board.add_theme_constant_override("separation", 0)
	page.add_child(editor_board)
	var inventory_cards: Array = run_state.get("inventory_cards", [])
	var inventory_consumables: Array = run_state.get("inventory_consumables", [])
	var inventory_row := _new_deck_editor_row(104.0,
		Color("#3a3025", 0.80), Color("#3a3025", 0.40), Color("#a08d6c", 0.60), 5,
		Color("#a08d6c", 0.60))
	var inventory_header: VBoxContainer = inventory_row["header"]
	inventory_header.add_child(_deck_editor_label("인벤토리", 15, COLOR_TEXT))
	inventory_header.add_child(_deck_editor_label("%d / %d" % [_inventory_item_count(), INVENTORY_CAPACITY], 12, COLOR_MUTED))
	var inventory_card_list: HBoxContainer = inventory_row["cards"]
	inventory_card_list.set_script(RunCardDropAreaScript)
	inventory_card_list.set("run_drop_target", {"area": "inventory"})
	inventory_card_list.set("run_drop_callback", Callable(self, "_on_run_card_dropped"))
	var inventory_leading_space := Control.new()
	inventory_leading_space.custom_minimum_size = Vector2(8, 1)
	inventory_leading_space.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	inventory_leading_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
	inventory_card_list.add_child(inventory_leading_space)
	for group in _group_deck_editor_cards(inventory_cards):
		var card := _deck_editor_group_representative(group)
		var card_ids: Array = group["ids"]
		var inventory_card_widget := _deck_editor_card_widget(card, card_ids.size())
		_configure_run_card_drag(inventory_card_widget, card, "inventory", "", "inventory")
		inventory_card_widget.gui_input.connect(_on_inventory_card_gui_input.bind(card.duplicate(true)))
		_add_deck_editor_card(inventory_card_list, inventory_card_widget, card_ids.size())
	for group in _group_deck_editor_consumables(inventory_consumables):
		var consumable := _deck_editor_group_representative(group)
		var consumable_ids: Array = group["ids"]
		inventory_card_list.add_child(_deck_editor_consumable_widget(consumable, "inventory", consumable_ids.size()))
	for _empty_slot_index in range(maxi(0, INVENTORY_CAPACITY - _inventory_item_count())):
		inventory_card_list.add_child(_deck_editor_empty_slot("normal"))
	editor_board.add_child(inventory_row["panel"])
	var inventory_deck_gap := Control.new()
	inventory_deck_gap.custom_minimum_size.y = 32.0
	inventory_deck_gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	editor_board.add_child(inventory_deck_gap)

	var display_decks: Array = run_state.get("owned_decks", []).duplicate()
	var active_deck_id := str(run_state.get("active_deck_id", "starter"))
	var deck_rows := VBoxContainer.new()
	deck_rows.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	deck_rows.size_flags_vertical = Control.SIZE_EXPAND_FILL
	deck_rows.add_theme_constant_override("separation", 10)
	# Keep owned deck rows in the board's normal vertical layout so their actual
	# panel minimum heights and borders cannot be clipped by a scroll viewport.
	editor_board.add_child(deck_rows)
	for deck in display_decks:
		var deck_id := str(deck.get("id", ""))
		var deck_name := str(deck.get("name", "덱"))
		var active := deck_id == active_deck_id
		var deck_cards: Array = run_state.get("deck", []) if active else deck.get("cards", [])
		var deck_rare_count := 0
		for card in deck_cards:
			if _is_rare_slot_card(card):
				deck_rare_count += 1
		var deck_capacity := int(deck.get("capacity", 25))
		var rare_slot_capacity := maxi(int(deck.get("rare_slot_capacity", 0)), deck_rare_count)
		var deck_row := _new_deck_editor_row(104.0, Color("#0c0d0c", 0.85),
			Color("#0c0d0c", 0.80), Color("#db8a3d"), 5, Color("#db8a3d"))
		var deck_drop_area: Control = deck_row["panel"]
		deck_drop_area.set_script(DeckCaseDropAreaScript)
		deck_drop_area.set("deck_drop_target", {"area": "owned", "deck_id": deck_id})
		deck_drop_area.set("deck_drop_callback", Callable(self, "_on_deck_case_dropped"))
		var deck_header: VBoxContainer = deck_row["header"]
		var deck_heading_panel: PanelContainer = deck_row["heading_panel"]
		var deck_heading_style := deck_heading_panel.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
		deck_heading_style.content_margin_left = 0
		deck_heading_style.content_margin_top = 0
		deck_heading_style.content_margin_right = 0
		deck_heading_style.content_margin_bottom = 0
		deck_heading_panel.add_theme_stylebox_override("panel", deck_heading_style)
		var select_deck := _button(deck_name, Callable(self, "_select_deck_editor_target").bind(deck_id), Vector2(154, 34))
		select_deck.set_script(DeckCaseDragButtonScript)
		select_deck.set("deck_drag_payload", {"kind": "deck-case", "source_area": "owned", "deck_id": deck_id})
		select_deck.disabled = false
		select_deck.add_theme_font_override("font", DeckEditorHeadingFont)
		select_deck.add_theme_font_size_override("font_size", 15)
		select_deck.custom_minimum_size = Vector2.ZERO
		select_deck.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		select_deck.size_flags_vertical = Control.SIZE_EXPAND_FILL
		var heading_button_style := StyleBoxFlat.new()
		heading_button_style.bg_color = Color("#0c0d0c", 0.85)
		heading_button_style.set_border_width_all(0)
		heading_button_style.corner_radius_top_left = 3
		heading_button_style.corner_radius_bottom_left = 3
		heading_button_style.corner_radius_top_right = 0
		heading_button_style.corner_radius_bottom_right = 0
		heading_button_style.content_margin_left = 0
		heading_button_style.content_margin_top = 0
		heading_button_style.content_margin_right = 0
		heading_button_style.content_margin_bottom = 0
		for style_name in ["normal", "hover", "pressed", "hover_pressed", "disabled", "focus"]:
			select_deck.add_theme_stylebox_override(style_name, heading_button_style)
		for color_name in ["font_color", "font_hover_color", "font_pressed_color",
				"font_hover_pressed_color", "font_disabled_color", "font_focus_color", "font_outline_color"]:
			select_deck.add_theme_color_override(color_name, Color(1.0, 1.0, 1.0, 0.0))
		select_deck.add_theme_constant_override("outline_size", 0)
		var heading_visual := DeckCaseHeadingScript.new()
		heading_visual.configure(deck_name, deck.get("editions", []), deck_cards.size(), deck_capacity,
			can_change_deck, animate_safe_area_unlock)
		select_deck.add_child(heading_visual)
		select_deck.gui_input.connect(_on_owned_deck_header_gui_input.bind(deck_id))
		deck_header.add_child(select_deck)
		var deck_card_list: HBoxContainer = deck_row["cards"]
		deck_card_list.set_script(RunCardDropAreaScript)
		deck_card_list.set("run_drop_target", {"area": "deck", "deck_id": deck_id})
		deck_card_list.set("run_drop_callback", Callable(self, "_on_run_card_dropped"))
		var deck_scroll_leading_space := Control.new()
		deck_scroll_leading_space.custom_minimum_size = Vector2(8, 1)
		deck_scroll_leading_space.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		deck_scroll_leading_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
		deck_card_list.add_child(deck_scroll_leading_space)
		var rare_card_groups: Array[Dictionary] = []
		var normal_card_groups: Array[Dictionary] = []
		for group in _group_deck_editor_cards(deck_cards):
			var grouped_card := _deck_editor_group_representative(group)
			if _is_rare_slot_card(grouped_card):
				rare_card_groups.append(group)
			else:
				normal_card_groups.append(group)
		for group in rare_card_groups:
			var card := _deck_editor_group_representative(group)
			var card_ids: Array = group["ids"]
			var deck_card_widget := _deck_editor_card_widget(card, card_ids.size())
			_apply_pending_deck_add_effect(deck_card_widget, card_ids)
			_configure_deck_card_ticket_drop(deck_card_widget, deck_id, card)
			if not extraction_ticket_mode:
				_configure_run_card_drag(deck_card_widget, card, "deck", deck_id, "deck", deck_id)
			else:
				deck_card_widget.mouse_filter = Control.MOUSE_FILTER_STOP
			deck_card_widget.gui_input.connect(_on_owned_deck_card_gui_input.bind(deck_id, card.duplicate(true), can_change_deck))
			_add_deck_editor_card(deck_card_list, deck_card_widget, card_ids.size())
		for _empty_rare_slot in range(maxi(0, rare_slot_capacity - deck_rare_count)):
			deck_card_list.add_child(_deck_editor_empty_slot("rare"))
		if rare_slot_capacity > 0:
			deck_card_list.add_child(_deck_editor_empty_slot("divider"))
		for group in normal_card_groups:
			var card := _deck_editor_group_representative(group)
			var card_ids: Array = group["ids"]
			var deck_card_widget := _deck_editor_card_widget(card, card_ids.size())
			_apply_pending_deck_add_effect(deck_card_widget, card_ids)
			_configure_deck_card_ticket_drop(deck_card_widget, deck_id, card)
			if not extraction_ticket_mode:
				_configure_run_card_drag(deck_card_widget, card, "deck", deck_id, "deck", deck_id)
			else:
				deck_card_widget.mouse_filter = Control.MOUSE_FILTER_STOP
			deck_card_widget.gui_input.connect(_on_owned_deck_card_gui_input.bind(deck_id, card.duplicate(true), can_change_deck))
			_add_deck_editor_card(deck_card_list, deck_card_widget, card_ids.size())
		var normal_card_count := deck_cards.size() - deck_rare_count
		var normal_slot_capacity := maxi(0, deck_capacity - rare_slot_capacity)
		for _empty_normal_slot in range(maxi(0, normal_slot_capacity - normal_card_count)):
			deck_card_list.add_child(_deck_editor_empty_slot("normal"))
		var deck_scroll_trailing_space := Control.new()
		deck_scroll_trailing_space.custom_minimum_size = Vector2(416, 1)
		deck_scroll_trailing_space.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		deck_scroll_trailing_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
		deck_card_list.add_child(deck_scroll_trailing_space)
		deck_rows.add_child(deck_row["panel"])
	for empty_slot_index in range(display_decks.size(), MAX_OWNED_DECKS):
		var empty_drop_area := Control.new()
		empty_drop_area.custom_minimum_size.y = 104.0
		empty_drop_area.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		empty_drop_area.set_script(DeckCaseDropAreaScript)
		empty_drop_area.set("deck_drop_target", {"area": "emptyOwned", "slot": empty_slot_index})
		empty_drop_area.set("deck_drop_callback", Callable(self, "_on_deck_case_dropped"))
		deck_rows.add_child(empty_drop_area)
	var current_position: Vector2i = run_state["position"]
	var cards_on_tile: Array = []
	var consumables_on_tile: Array = []
	var decks_on_tile: Array = []
	for drop in run_state.get("floor_cards", []):
		if int(drop.get("x", -1)) == current_position.x and int(drop.get("y", -1)) == current_position.y:
			cards_on_tile.append(drop)
	for drop in run_state.get("floor_consumable_drops", []):
		if int(drop.get("x", -1)) == current_position.x and int(drop.get("y", -1)) == current_position.y:
			consumables_on_tile.append(drop)
	for drop in run_state.get("floor_deck_drops", []):
		if int(drop.get("x", -1)) == current_position.x and int(drop.get("y", -1)) == current_position.y:
			decks_on_tile.append(drop)
	var floor_row := _new_deck_editor_row(104.0,
		Color("#26333e", 0.80), Color("#26333e", 0.40), Color("#6f879a", 0.60), 5,
		Color("#6f879a", 0.60))
	var floor_header: VBoxContainer = floor_row["header"]
	floor_header.add_child(_deck_editor_label("바닥", 15, COLOR_TEXT))
	var floor_card_list: HBoxContainer = floor_row["cards"]
	floor_card_list.set_script(RunCardDropAreaScript)
	floor_card_list.set("run_drop_target", {"area": "floor"})
	floor_card_list.set("run_drop_callback", Callable(self, "_on_run_card_dropped"))
	var floor_drop_area: Control = floor_row["panel"]
	floor_drop_area.set_script(DeckCaseDropAreaScript)
	floor_drop_area.set("deck_drop_target", {"area": "floor"})
	floor_drop_area.set("deck_drop_callback", Callable(self, "_on_deck_case_dropped"))
	var floor_leading_space := Control.new()
	floor_leading_space.custom_minimum_size = Vector2(8, 1)
	floor_leading_space.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	floor_leading_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
	floor_card_list.add_child(floor_leading_space)
	# Web displays removal candidates in the existing floor row.
	for pending in deck_editor_pending_removals:
		var pending_card: Dictionary = pending.get("card", {})
		var pending_view := _deck_editor_card_widget(pending_card)
		var removal_effect = PendingRemovalEffectScript.new()
		pending_view.add_child(removal_effect)
		removal_effect.configure(pending_view, deck_editor_effect_started_usec,
			DisplayServer.accessibility_should_reduce_animation() == 1)
		_configure_run_card_drag(pending_view, pending_card, "pendingRemoval", str(pending.get("deck_id", "")))
		pending_view.gui_input.connect(_on_pending_deck_card_gui_input.bind(pending_card.duplicate(true)))
		_add_deck_editor_card(floor_card_list, pending_view)
	var floor_cards: Array = []
	for drop in cards_on_tile:
		floor_cards.append(drop.get("card", {}))
	for group in _group_deck_editor_cards(floor_cards):
		var floor_card := _deck_editor_group_representative(group)
		var floor_card_ids: Array = group["ids"]
		var floor_card_widget := _deck_editor_card_widget(floor_card, floor_card_ids.size())
		_configure_run_card_drag(floor_card_widget, floor_card, "floor")
		floor_card_widget.gui_input.connect(_on_floor_card_gui_input.bind(floor_card.duplicate(true)))
		_add_deck_editor_card(floor_card_list, floor_card_widget, floor_card_ids.size())
	var floor_consumables: Array = []
	for drop in consumables_on_tile:
		floor_consumables.append(drop.get("consumable", {}))
	for group in _group_deck_editor_consumables(floor_consumables):
		var floor_consumable := _deck_editor_group_representative(group)
		var floor_consumable_ids: Array = group["ids"]
		floor_card_list.add_child(_deck_editor_consumable_widget(floor_consumable, "floor", floor_consumable_ids.size()))
	for drop in decks_on_tile:
		var floor_deck: Dictionary = drop.get("deck", {})
		if floor_deck.is_empty():
			continue
		var floor_deck_id := str(floor_deck.get("id", ""))
		var floor_deck_button := DeckCaseDragButtonScript.new() as Button
		floor_deck_button.custom_minimum_size = Vector2(148, 76)
		floor_deck_button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		floor_deck_button.add_theme_font_size_override("font_size", 11)
		floor_deck_button.text = "▣\n%s\n%d / %d장" % [
			str(floor_deck.get("name", "금고 덱")),
			floor_deck.get("cards", []).size(),
			int(floor_deck.get("capacity", 25))]
		floor_deck_button.tooltip_text = "눌러서 줍기 · 덱을 빈 슬롯으로 끌어도 주울 수 있습니다."
		floor_deck_button.add_theme_stylebox_override("normal", _button_style(Color("#332f25"), Color("#c18435")))
		floor_deck_button.add_theme_stylebox_override("hover", _button_style(Color("#43382b"), Color("#e2a64a")))
		floor_deck_button.set("deck_drag_payload", {
			"kind": "deck-case", "source_area": "floor", "deck_id": floor_deck_id,
		})
		floor_deck_button.pressed.connect(_pick_up_floor_deck.bind(floor_deck_id))
		floor_card_list.add_child(floor_deck_button)
	var deck_floor_gap := Control.new()
	deck_floor_gap.custom_minimum_size.y = 32.0
	deck_floor_gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	editor_board.add_child(deck_floor_gap)
	editor_board.add_child(floor_row["panel"])


func _new_deck_editor_row(row_height: float, header_color: Color,
		row_color: Color = Color("#171b18"), border_color: Color = Color("#676a5a"),
		corner_radius: int = 4, header_border_color: Color = Color("#676a5a")) -> Dictionary:
	var panel := PanelContainer.new()
	panel.custom_minimum_size.y = row_height
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var row_style := StyleBoxFlat.new()
	row_style.bg_color = row_color
	row_style.border_color = border_color
	row_style.set_border_width_all(2)
	row_style.set_corner_radius_all(corner_radius)
	# Keep child panels inside the 2px outer border so their fills cannot cover it.
	row_style.content_margin_left = 2
	row_style.content_margin_top = 2
	row_style.content_margin_right = 2
	row_style.content_margin_bottom = 2
	panel.add_theme_stylebox_override("panel", row_style)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 0)
	panel.add_child(row)
	var heading_panel := PanelContainer.new()
	heading_panel.custom_minimum_size = Vector2(190, row_height)
	var heading_style := StyleBoxFlat.new()
	heading_style.bg_color = header_color
	heading_style.border_color = header_border_color
	heading_style.corner_radius_top_left = maxi(0, corner_radius - 2)
	heading_style.corner_radius_bottom_left = maxi(0, corner_radius - 2)
	heading_style.set_border_width_all(0)
	heading_style.border_width_right = 0 if header_border_color == Color("#db8a3d") else 1
	heading_style.content_margin_left = 12
	heading_style.content_margin_top = 9
	heading_style.content_margin_right = 12
	heading_style.content_margin_bottom = 9
	heading_panel.add_theme_stylebox_override("panel", heading_style)
	var header := VBoxContainer.new()
	header.add_theme_constant_override("separation", 3)
	header.alignment = BoxContainer.ALIGNMENT_CENTER
	heading_panel.add_child(header)
	row.add_child(heading_panel)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size.y = row_height
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Match the browser's hidden scrollbar while retaining horizontal scrolling.
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var cards := HBoxContainer.new()
	cards.custom_minimum_size.y = row_height
	cards.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards.add_theme_constant_override("separation", 8)
	scroll.add_child(cards)
	row.add_child(scroll)
	return {"panel": panel, "heading_panel": heading_panel, "header": header, "cards": cards}


func _deck_editor_empty_slot(kind: String) -> Control:
	var slot := DeckEditorEmptySlotScript.new() as Control
	slot.call("configure", kind)
	slot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return slot


func _group_deck_editor_cards(cards: Array) -> Array[Dictionary]:
	var groups: Array[Dictionary] = []
	var group_index_by_key: Dictionary = {}
	for source_index in range(cards.size()):
		var card = cards[source_index]
		if not card is Dictionary:
			continue
		var sticker_key := JSON.stringify(CardStickers.card_sticker_ids(card))
		var key_parts := [
			str(card.get("name", "")),
			str(card.get("effect", "")),
			str(card.get("damageType", card.get("damage_type", ""))),
			str(card.get("cost", "")),
			str(card.get("value", "")),
			str(card.get("rarity", "")),
			sticker_key,
			"forged" if bool(card.get("forged", false)) else "normal",
			"token" if bool(card.get("enemyToken", card.get("enemy_token", false))) else "card",
			JSON.stringify(card.get("forgeCostsCompleted", card.get("forge_costs_completed", []))),
		]
		var group_key := JSON.stringify(key_parts)
		if group_index_by_key.has(group_key):
			var existing: Dictionary = groups[int(group_index_by_key[group_key])]
			var ids: Array = existing["ids"]
			ids.append(int(card.get("id", -1)))
			existing["ids"] = ids
		else:
			group_index_by_key[group_key] = groups.size()
			groups.append({"card": card, "ids": [int(card.get("id", -1))], "source_index": source_index})
	groups.sort_custom(DeckVaultCardView._card_group_less)
	return groups


func _group_deck_editor_consumables(consumables: Array) -> Array[Dictionary]:
	var groups: Array[Dictionary] = []
	var group_index_by_key: Dictionary = {}
	for consumable in consumables:
		if not consumable is Dictionary:
			continue
		var key := JSON.stringify([
			str(consumable.get("name", "")),
			str(consumable.get("type", "")),
			str(consumable.get("description", "")),
		])
		if group_index_by_key.has(key):
			var existing: Dictionary = groups[int(group_index_by_key[key])]
			var ids: Array = existing["ids"]
			ids.append(str(consumable.get("id", "")))
			existing["ids"] = ids
		else:
			group_index_by_key[key] = groups.size()
			groups.append({"card": consumable, "ids": [str(consumable.get("id", ""))]})
	return groups


func _deck_editor_group_representative(group: Dictionary) -> Dictionary:
	var representative: Dictionary = group.get("card", {}).duplicate(true)
	var ids: Array = group.get("ids", [])
	if not ids.is_empty():
		representative["id"] = ids.back()
	return representative


func _deck_editor_count_badge(count: int) -> Label:
	var badge := _label("x%d" % count, 12, Color("#ffda52"))
	badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	badge.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	badge.add_theme_color_override("font_outline_color", Color("#10192c"))
	badge.add_theme_constant_override("outline_size", 3)
	badge.tooltip_text = "%d장" % count
	badge.mouse_filter = Control.MOUSE_FILTER_PASS
	return badge


func _deck_editor_consumable_widget(consumable: Dictionary, area: String, count: int = 1) -> Control:
	var stack_root := Control.new()
	var item_view := BattleCardDragSourceScript.new()
	item_view.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var consumable_id := str(consumable.get("id", ""))
	var is_selected := extraction_ticket_mode and extraction_ticket_source == area \
		and extraction_ticket_id == consumable_id
	ConsumableTicketVisual.configure_compact(stack_root, item_view, consumable, count, is_selected)
	if area == "inventory":
		item_view.set("run_drop_target", {"area": "inventory", "deck_id": ""})
		item_view.set("run_drop_callback", Callable(self, "_on_run_card_dropped"))
	if str(consumable.get("type", "")) == "extractTicket":
		item_view.set("run_drag_payload", {
			"kind": "run-ticket",
			"ticket_id": consumable_id,
			"ticket_type": "extractTicket",
			"source_area": area,
		})
	var item_name := str(consumable.get("name", "아이템"))
	item_view.tooltip_text = "%s\n%s" % [item_name, str(consumable.get("description", ""))]
	item_view.gui_input.connect(_on_deck_editor_consumable_gui_input.bind(consumable.duplicate(true), area))
	return stack_root


func _add_deck_editor_card(row: HBoxContainer, card_view: Control, count: int = 1) -> void:
	var layers := mini(5, maxi(0, count - 1))
	if layers == 0:
		row.add_child(card_view)
		return
	# Reserve CSS margin-left without enlarging the card's hover/drop/drag area.
	var stack_margin := MarginContainer.new()
	stack_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack_margin.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	stack_margin.add_theme_constant_override("margin_left", layers * 7)
	stack_margin.add_child(card_view)
	row.add_child(stack_margin)


func _deck_editor_label(text: String, font_size: int, color: Color) -> Label:
	var label := _label(text, font_size, color)
	label.add_theme_font_override("font", DeckEditorHeadingFont)
	return label


func _deck_editor_card_widget(card: Dictionary, count: int = 1) -> BattleCardDragSourceScript:
	var card_view := CompactCardView.create(
		card,
		count,
		Callable(self, "_show_card_hover_preview"),
		Callable(self, "_hide_card_hover_preview"),
		Callable(self, "_hide_card_hover_preview"),
		blue_tooltip_theme
	) as BattleCardDragSourceScript
	card_view.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return card_view


func _show_card_hover_preview(source: Control, card: Dictionary) -> void:
	_hide_card_hover_preview()
	if get_viewport().gui_is_dragging() or not is_instance_valid(source) or card.is_empty():
		return
	var preview := _card_widget(card, false, false, false, false)
	preview.custom_minimum_size = Vector2(136, 191)
	preview.size = Vector2(136, 191)
	var frame := CardHoverPreview.create(preview)
	add_child(frame)
	var source_rect := source.get_global_rect()
	var viewport_size := get_viewport_rect().size
	frame.global_position = CardHoverPreview.position_for(source_rect, viewport_size)
	active_card_hover_preview = frame
	_request_info_tooltip("keyword", card, source)


func _hide_card_hover_preview() -> void:
	if card_info_tooltip.current_kind == "keyword":
		card_info_tooltip.clear()
	if is_instance_valid(active_card_hover_preview):
		active_card_hover_preview.queue_free()
	active_card_hover_preview = null


func _request_info_tooltip(kind: String, payload: Variant, anchor: Control) -> void:
	if not is_instance_valid(anchor) or get_viewport().gui_is_dragging() \
			or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		return
	var placement_anchor := anchor
	if kind == "sticker":
		_hide_card_hover_preview()
		_hide_card_mechanic_preview()
	elif kind == "keyword":
		if payload is Dictionary:
			payload = payload.duplicate(true)
			payload["description"] = _card_description(payload, false)
		if is_instance_valid(active_card_hover_preview) and not active_card_hover_preview.is_queued_for_deletion():
			placement_anchor = active_card_hover_preview
	card_info_tooltip.request(self, kind, payload, anchor, placement_anchor,
		Callable(self, "_tooltip_preview_card"))


func _clear_info_tooltip(anchor: Control) -> void:
	card_info_tooltip.clear_for(anchor)


func _tooltip_preview_card(section: Dictionary) -> Control:
	if str(section.get("preview", "")) == "radiance":
		return _card_widget(CardCatalog.create_radiance_card(-1), false, false, false, false)
	return null


func _on_deck_editor_backdrop_input(event: InputEvent) -> void:
	var click := event as InputEventMouseButton
	if click != null and click.pressed and click.button_index == MOUSE_BUTTON_LEFT:
		get_viewport().set_input_as_handled()
		_show_map()


func _on_inventory_card_gui_input(event: InputEvent, card: Dictionary) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed:
		return
	var card_id := int(card.get("id", -1))
	if click.button_index == MOUSE_BUTTON_RIGHT:
		_move_inventory_card_to_floor(card_id)
		get_viewport().set_input_as_handled()
	elif click.button_index == MOUSE_BUTTON_LEFT and not extraction_ticket_mode:
		_move_external_card_to_deck(card_id, "inventory", str(run_state.get("active_deck_id", "starter")))
		get_viewport().set_input_as_handled()


func _on_floor_card_gui_input(event: InputEvent, card: Dictionary) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed:
		return
	if click.button_index == MOUSE_BUTTON_LEFT and not extraction_ticket_mode:
		_move_floor_card_to_inventory(int(card.get("id", -1)))
		get_viewport().set_input_as_handled()


func _on_deck_editor_consumable_gui_input(event: InputEvent, consumable: Dictionary, area: String) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed:
		return
	var consumable_id := str(consumable.get("id", ""))
	var consumable_type := str(consumable.get("type", ""))
	if click.button_index == MOUSE_BUTTON_RIGHT and area == "inventory":
		_move_inventory_consumable_to_floor(consumable_id)
		get_viewport().set_input_as_handled()
	elif click.button_index == MOUSE_BUTTON_LEFT:
		if area == "floor" and consumable_type != "extractTicket":
			_move_floor_consumable_to_inventory(consumable_id)
			get_viewport().set_input_as_handled()
		elif consumable_type == "extractTicket":
			if extraction_ticket_mode and extraction_ticket_source == area and extraction_ticket_id == consumable_id:
				extraction_ticket_mode = false
				extraction_ticket_id = ""
			else:
				extraction_ticket_mode = true
				extraction_ticket_source = area
				extraction_ticket_id = consumable_id
			_show_deck()
			get_viewport().set_input_as_handled()


func _on_owned_deck_card_gui_input(event: InputEvent, deck_id: String, card: Dictionary, can_change_deck: bool) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed:
		return
	var card_id := int(card.get("id", -1))
	if extraction_ticket_mode and click.button_index == MOUSE_BUTTON_LEFT:
		_extract_owned_deck_card(deck_id, card_id)
		get_viewport().set_input_as_handled()
	elif not extraction_ticket_mode and click.button_index == MOUSE_BUTTON_RIGHT \
		and _can_remove_deck_card(card, can_change_deck, deck_id):
		# Browser context-menu removal chooses a destination explicitly.
		if _is_rare_slot_card(card) or not can_change_deck or _inventory_space_available() <= 0:
			_move_deck_card_to_floor(card_id, deck_id)
		else:
			_move_deck_card_to_inventory(card_id, deck_id)
		get_viewport().set_input_as_handled()


func _on_pending_deck_card_gui_input(event: InputEvent, card: Dictionary) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed or click.button_index not in [MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT]:
		return
	_restore_pending_deck_card(int(card.get("id", -1)))
	get_viewport().set_input_as_handled()


func _open_sticker_service(kind: String, position: Vector2i) -> void:
	active_service_kind = kind
	active_service_position = position
	service_selected_card_ids.clear()
	service_transmuter_preview = {}
	service_preview_elapsed = 0.0
	service_feedback = ""
	_show_sticker_service()


func _show_sticker_service() -> void:
	_clear_map_vault_preview()
	screen_name = "stickerService"
	service_preview_host = null
	service_apply_button = null
	var fixed_sticker := StickerServices.tinkerer_sticker_at(active_service_position, int(run_state.get("map_seed", 0))) if active_service_kind == "tinkerer" else ""
	var uses := _sticker_service_uses()
	var price := StickerServices.service_price(active_service_kind, uses, fixed_sticker)
	var viewport_size := get_viewport_rect().size
	var modal_width := 1540.0 if active_service_kind == "stickerAltar" else 1040.0
	var modal := _create_sticker_service_overlay(modal_width, viewport_size.y * 0.9)
	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 9)
	page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	page.size_flags_vertical = Control.SIZE_EXPAND_FILL
	modal.add_child(page)
	var heading := HBoxContainer.new()
	heading.add_theme_constant_override("separation", 12)
	heading.add_child(_sticker_service_label(_room_name(active_service_kind), 30, COLOR_TEXT, 800))
	var header_spacer := Control.new()
	header_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_child(header_spacer)
	heading.add_child(_sticker_service_label("$%d 보유" % int(run_state.get("gold", 0)), 20, COLOR_GOLD, 700))
	var close_button := _button("나가기", Callable(self, "_show_map"), Vector2(92, 40))
	_style_sticker_service_button(close_button, 14, 600)
	heading.add_child(close_button)
	page.add_child(heading)
	page.add_child(HSeparator.new())
	var instruction := HBoxContainer.new()
	instruction.add_theme_constant_override("separation", 4)
	if active_service_kind == "tinkerer":
		instruction.add_child(_sticker_service_label("$를 소모하여 카드 한 장에", 15, COLOR_TEXT))
		instruction.add_child(_sticker_icon(fixed_sticker, 28))
		instruction.add_child(_sticker_service_label("를 부여합니다.", 15, COLOR_TEXT))
	elif active_service_kind == "stickerAltar":
		instruction.add_child(_sticker_service_label("$를 소모하여 제물 카드의 스티커를 대상 카드에 붙입니다.", 15, COLOR_TEXT))
	else:
		instruction.add_child(_sticker_service_label("$를 소모하여 같은 희귀도의 다른 카드로 변환합니다.", 15, COLOR_TEXT))
	page.add_child(instruction)
	var content := HBoxContainer.new()
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 18)
	page.add_child(content)
	var list_scroll := ScrollContainer.new()
	list_scroll.set_script(ServiceCardRemovalDropAreaScript)
	list_scroll.connect("service_card_removed", _on_service_card_removed)
	list_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	list_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	list_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	content.add_child(list_scroll)
	var groups := VBoxContainer.new()
	groups.add_theme_constant_override("separation", 14)
	groups.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list_scroll.add_child(groups)
	var card_group_count := _add_sticker_service_card_group(groups, "인벤토리", run_state.get("inventory_cards", []))
	var active_deck_id := str(run_state.get("active_deck_id", "starter"))
	for deck in run_state.get("owned_decks", []):
		var deck_id := str(deck.get("id", ""))
		var deck_cards: Array = run_state.get("deck", []) if deck_id == active_deck_id else deck.get("cards", [])
		card_group_count += _add_sticker_service_card_group(groups, "덱 「%s」%s" % [
			str(deck.get("name", "덱")), " · 사용 중" if deck_id == active_deck_id else ""], deck_cards)
	if card_group_count == 0:
		groups.add_child(_sticker_service_label("선택할 카드가 없습니다.", 15, COLOR_MUTED))
	var details := VBoxContainer.new()
	var operation_width := 660.0 if active_service_kind == "stickerAltar" else 430.0 if active_service_kind == "cardTransmuter" else 340.0
	details.custom_minimum_size = Vector2(operation_width, 0)
	details.add_theme_constant_override("separation", 12)
	content.add_child(details)
	service_preview_host = VBoxContainer.new()
	service_preview_host.add_theme_constant_override("separation", 8)
	details.add_child(service_preview_host)
	_render_sticker_service_preview()
	if not service_feedback.is_empty():
		details.add_child(_sticker_service_label(service_feedback, 14, COLOR_RED))
	service_apply_button = _button("$%d" % price, Callable(self, "_apply_sticker_service"), Vector2(210, 48))
	_style_sticker_service_button(service_apply_button, 17, 800)
	service_apply_button.disabled = not _service_selection_is_complete() or int(run_state.get("gold", 0)) < price
	details.add_child(service_apply_button)


func _render_sticker_service_preview() -> void:
	if not is_instance_valid(service_preview_host):
		return
	for child in service_preview_host.get_children():
		service_preview_host.remove_child(child)
		child.queue_free()
	if active_service_kind == "stickerAltar":
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 20)
		for slot_index in range(3):
			if slot_index == 1:
				var plus := _label("+", 24, Color("#ffc400"))
				plus.custom_minimum_size = Vector2(40, 40)
				plus.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
				plus.size_flags_vertical = Control.SIZE_SHRINK_CENTER
				plus.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
				plus.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
				row.add_child(plus)
			elif slot_index == 2:
				var arrow := ResultArrowScript.new()
				arrow.custom_minimum_size = Vector2(76, 38)
				arrow.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
				arrow.size_flags_vertical = Control.SIZE_SHRINK_CENTER
				arrow.arrow_color = Color("#ffc400")
				row.add_child(arrow)
			var slot_column := CenterContainer.new()
			if slot_index < 2:
				var selected_card_id := int(service_selected_card_ids[slot_index]) if slot_index < service_selected_card_ids.size() else -1
				var selected_card := _run_card_by_id(selected_card_id) if selected_card_id >= 0 else {}
				if not selected_card.is_empty():
					slot_column.add_child(_service_selection_card_widget(selected_card))
				else:
					var slot := _service_slot("", slot_index)
					slot.card_dropped.connect(_on_service_slot_card_dropped)
					slot_column.add_child(slot)
			else:
				var offering_id := int(service_selected_card_ids[0]) if service_selected_card_ids.size() > 0 else -1
				var target_id := int(service_selected_card_ids[1]) if service_selected_card_ids.size() > 1 else -1
				var offering := _run_card_by_id(offering_id) if offering_id >= 0 else {}
				var target := _run_card_by_id(target_id) if target_id >= 0 else {}
				var result_card: Dictionary = {}
				var offering_stickers: Array[String] = []
				if not offering.is_empty():
					offering_stickers = CardStickers.card_sticker_ids(offering)
				if not target.is_empty() and offering_stickers.size() == 1:
					var result_stickers := CardStickers.card_sticker_ids(target)
					if not result_stickers.has(offering_stickers[0]):
						result_stickers.append(offering_stickers[0])
						result_card = CardStickers.with_card_stickers(target, result_stickers)
				if result_card.is_empty():
					slot_column.add_child(_service_result_placeholder())
				else:
					var result_preview := _card_widget(result_card, false, false, false)
					result_preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
					slot_column.add_child(result_preview)
					_blink_service_sticker_preview(result_preview, str(offering_stickers[0]))
			row.add_child(slot_column)
		service_preview_host.add_child(row)
		return
	if service_selected_card_ids.is_empty():
		var slot := _service_slot("", 0)
		slot.card_dropped.connect(_on_service_slot_card_dropped)
		service_preview_host.add_child(slot)
		return
	var source_id := int(service_selected_card_ids[0])
	var source := _run_card_by_id(source_id) if source_id >= 0 else {}
	if source.is_empty():
		return
	var after: Dictionary = {}
	var fixed_sticker := ""
	if active_service_kind == "tinkerer":
		var ids := CardStickers.card_sticker_ids(source)
		fixed_sticker = StickerServices.tinkerer_sticker_at(active_service_position, int(run_state.get("map_seed", 0)))
		ids.append(fixed_sticker)
		after = CardStickers.with_card_stickers(source, ids)
	else:
		after = service_transmuter_preview
	if after.is_empty():
		service_preview_host.add_child(_sticker_service_label("표시할 변환 카드가 없습니다.", 14, COLOR_MUTED))
		return
	var preview_card := _service_selection_card_widget(after) if active_service_kind == "tinkerer" \
		else _card_widget(after, false, false, false)
	if active_service_kind == "cardTransmuter":
		preview_card.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if active_service_kind == "cardTransmuter":
		var pair := HBoxContainer.new()
		pair.add_theme_constant_override("separation", 12)
		pair.alignment = BoxContainer.ALIGNMENT_CENTER
		var source_preview := _service_selection_card_widget(source)
		pair.add_child(source_preview)
		var arrow := ResultArrowScript.new()
		arrow.custom_minimum_size = Vector2(56, 28)
		arrow.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		arrow.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		arrow.arrow_color = Color("#ffc400")
		pair.add_child(arrow)
		pair.add_child(preview_card)
		service_preview_host.add_child(pair)
	else:
		service_preview_host.add_child(preview_card)
	if active_service_kind == "tinkerer":
		_blink_service_sticker_preview(preview_card, fixed_sticker)


func _blink_service_sticker_preview(card_preview: Control, sticker_id: String) -> void:
	var sticker_icon := _find_service_sticker_icon(card_preview, sticker_id)
	if sticker_icon == null:
		return
	var preview_flash := create_tween().bind_node(card_preview).set_loops(3)
	preview_flash.tween_property(sticker_icon, "modulate:a", 0.35, 0.12)
	preview_flash.tween_property(sticker_icon, "modulate:a", 1.0, 0.12)


func _find_service_sticker_icon(node: Node, sticker_id: String) -> Control:
	if node is Control and str(node.get_meta("card_sticker_id", "")) == sticker_id:
		return node as Control
	for child in node.get_children():
		var icon := _find_service_sticker_icon(child, sticker_id)
		if icon != null:
			return icon
	return null


func _service_selection_card_widget(card: Dictionary) -> Control:
	var widget := _card_widget(card, false)
	_set_child_controls_mouse_ignored(widget)
	widget.mouse_filter = Control.MOUSE_FILTER_STOP
	widget.set("drag_payload", {
		"kind": "service-card",
		"action": "remove",
		"card_id": int(card.get("id", -1)),
		"card_name": str(card.get("name", "카드")),
	})
	widget.gui_input.connect(_on_service_selection_card_gui_input.bind(int(card.get("id", -1))))
	return widget


func _add_sticker_service_card_group(parent: VBoxContainer, title: String, cards: Array) -> int:
	if cards.is_empty():
		return 0
	parent.add_child(_sticker_service_label("%s · %d장" % [title, cards.size()], 18, COLOR_TEXT, 700))
	var card_flow := HFlowContainer.new()
	card_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card_flow.add_theme_constant_override("h_separation", 8)
	card_flow.add_theme_constant_override("v_separation", 8)
	parent.add_child(card_flow)
	for card_value in cards:
		var card: Dictionary = card_value
		var card_slot := Control.new()
		card_slot.custom_minimum_size = Vector2(76, 76)
		card_slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var card_panel := CompactCardView.create(card, 1,
			Callable(self, "_show_card_hover_preview"), Callable(self, "_hide_card_hover_preview"),
			Callable(self, "_hide_card_hover_preview"), blue_tooltip_theme, true, Vector2(76, 76))
		card_panel.pivot_offset = Vector2.ZERO
		card_panel.set("drag_payload", {
			"kind": "service-card",
			"action": "remove" if service_selected_card_ids.has(int(card.get("id", -1))) else "select",
			"card_id": int(card.get("id", -1)),
			"card_name": str(card.get("name", "카드")),
		})
		card_panel.set("accepts_service_removal", true)
		card_panel.connect("service_card_removed", _on_service_card_removed)
		card_panel.gui_input.connect(_on_service_collection_card_gui_input.bind(int(card.get("id", -1)), card_panel))
		if service_selected_card_ids.has(int(card.get("id", -1))):
			var selected_style := card_panel.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
			selected_style.border_color = COLOR_ORANGE
			selected_style.set_border_width_all(3)
			card_panel.add_theme_stylebox_override("panel", selected_style)
		_set_child_controls_mouse_ignored(card_panel)
		card_panel.mouse_filter = Control.MOUSE_FILTER_STOP
		card_slot.add_child(card_panel)
		card_flow.add_child(card_slot)
	return cards.size()


func _on_service_collection_card_gui_input(event: InputEvent, card_id: int, widget: Control) -> void:
	var mouse_event := event as InputEventMouseButton
	if mouse_event == null:
		return
	if mouse_event.button_index == MOUSE_BUTTON_RIGHT and not mouse_event.pressed:
		_remove_service_selection(card_id)
		get_viewport().set_input_as_handled()
	elif mouse_event.button_index == MOUSE_BUTTON_LEFT:
		if mouse_event.pressed:
			widget.set_meta("service_press_position", get_global_mouse_position())
		elif widget.has_meta("service_press_position"):
			var press_position: Vector2 = widget.get_meta("service_press_position")
			widget.remove_meta("service_press_position")
			if press_position.distance_to(get_global_mouse_position()) < 6.0:
				if service_selected_card_ids.has(card_id):
					_remove_service_selection(card_id)
				else:
					_add_service_selection(card_id)
				get_viewport().set_input_as_handled()


func _add_service_selection(card_id: int, requested_slot := -1) -> void:
	if card_id < 0 or _run_card_by_id(card_id).is_empty():
		return
	if service_selected_card_ids.has(card_id):
		return
	var limit := 2 if active_service_kind == "stickerAltar" else 1
	var slot_index := requested_slot
	if slot_index < 0:
		if active_service_kind == "stickerAltar":
			slot_index = 0 if CardStickers.card_sticker_ids(_run_card_by_id(card_id)).size() == 1 else 1
		else:
			slot_index = 0
	if slot_index < 0 or slot_index >= limit:
		service_feedback = "제단에는 카드 두 장만 놓을 수 있습니다."
		_show_sticker_service()
		return
	if not _can_service_card_fill_slot(card_id, slot_index):
		service_feedback = _service_slot_rejection_message(slot_index)
		_show_sticker_service()
		return
	while service_selected_card_ids.size() <= slot_index:
		service_selected_card_ids.append(-1)
	service_selected_card_ids[slot_index] = card_id
	service_feedback = ""
	service_transmuter_preview = {}
	service_preview_elapsed = 0.0
	_show_sticker_service()


func _can_drop_service_card_to_slot(card_id: int, slot_index: int) -> bool:
	return _can_service_card_fill_slot(card_id, slot_index)


func _can_service_card_fill_slot(card_id: int, slot_index: int) -> bool:
	var card := _run_card_by_id(card_id)
	if card.is_empty():
		return false
	if active_service_kind != "stickerAltar":
		if slot_index != 0:
			return false
		if active_service_kind == "tinkerer":
			var fixed_sticker := StickerServices.tinkerer_sticker_at(active_service_position, int(run_state.get("map_seed", 0)))
			return not CardStickers.card_sticker_ids(card).has(fixed_sticker) \
				and CardStickers.compatible_stickers(card).has(fixed_sticker)
		if active_service_kind == "cardTransmuter":
			return not StickerServices.transmuter_candidates(card).is_empty()
		return false
	var stickers := CardStickers.card_sticker_ids(card)
	if slot_index == 0:
		if stickers.size() != 1:
			return false
		if service_selected_card_ids.size() > 1 and int(service_selected_card_ids[1]) >= 0:
			return StickerServices.can_altar_transfer(card, _run_card_by_id(int(service_selected_card_ids[1])))
		return true
	if slot_index != 1:
		return false
	if not service_selected_card_ids.is_empty() and int(service_selected_card_ids[0]) >= 0:
		return StickerServices.can_altar_transfer(_run_card_by_id(int(service_selected_card_ids[0])), card)
	for possible_donor in _all_run_cards():
		if int(possible_donor.get("id", -1)) == card_id:
			continue
		if CardStickers.card_sticker_ids(possible_donor).size() == 1 and StickerServices.can_altar_transfer(possible_donor, card):
			return true
	return false


func _service_slot_rejection_message(slot_index: int) -> String:
	if active_service_kind == "stickerAltar":
		return "스티커가 하나 붙은 카드만 제물로 놓을 수 있습니다." if slot_index == 0 \
			else "제물의 스티커를 받을 수 있는 카드만 놓을 수 있습니다."
	if active_service_kind == "tinkerer":
		return "이 카드는 해당 스티커를 받을 수 없습니다."
	if active_service_kind == "cardTransmuter":
		return "같은 희귀도의 다른 카드가 없어 변환할 수 없습니다."
	return "이 슬롯에 놓을 수 없는 카드입니다."


func _remove_service_selection(card_id: int) -> void:
	var index := service_selected_card_ids.find(card_id)
	if index < 0:
		return
	service_selected_card_ids[index] = -1
	while not service_selected_card_ids.is_empty() and int(service_selected_card_ids.back()) < 0:
		service_selected_card_ids.pop_back()
	service_feedback = ""
	service_transmuter_preview = {}
	service_preview_elapsed = 0.0
	_show_sticker_service()


func _on_service_card_removed(card_id: int) -> void:
	_remove_service_selection(card_id)


func _on_service_selection_card_gui_input(event: InputEvent, card_id: int) -> void:
	var mouse_event := event as InputEventMouseButton
	if mouse_event == null or mouse_event.pressed or mouse_event.button_index != MOUSE_BUTTON_RIGHT:
		return
	_remove_service_selection(card_id)
	get_viewport().set_input_as_handled()


func _on_service_slot_card_dropped(card_id: int, slot_index: int) -> void:
	_add_service_selection(card_id, slot_index)


func _service_selected_count() -> int:
	var count := 0
	for card_id in service_selected_card_ids:
		if int(card_id) >= 0:
			count += 1
	return count


func _service_selection_is_complete() -> bool:
	var limit := 2 if active_service_kind == "stickerAltar" else 1
	if service_selected_card_ids.size() != limit:
		return false
	for card_id in service_selected_card_ids:
		if int(card_id) < 0:
			return false
	return true


func _apply_sticker_service() -> void:
	if not _service_selection_is_complete():
		return
	var primary_id := service_selected_card_ids[0] if not service_selected_card_ids.is_empty() else -1
	var secondary_id := -1
	if active_service_kind == "stickerAltar" and service_selected_card_ids.size() == 2:
		secondary_id = service_selected_card_ids[1]
	var fixed_sticker := StickerServices.tinkerer_sticker_at(active_service_position, int(run_state.get("map_seed", 0))) if active_service_kind == "tinkerer" else ""
	var random := RandomNumberGenerator.new()
	random.randomize()
	var result := StickerServices.resolve(
		active_service_kind,
		_all_run_cards(),
		primary_id,
		secondary_id,
		fixed_sticker,
		_sticker_service_uses(),
		random
	)
	if not bool(result.get("ok", false)):
		service_feedback = str(result.get("message", "카드를 처리하지 못했습니다."))
		_show_sticker_service()
		return
	var price := int(result.get("price", 0))
	if int(run_state.get("gold", 0)) < price:
		service_feedback = "$%d가 부족합니다." % (price - int(run_state.get("gold", 0)))
		_show_sticker_service()
		return
	run_state["inventory_cards"] = _apply_sticker_service_cards(run_state.get("inventory_cards", []), result)
	var active_deck_id := str(run_state.get("active_deck_id", "starter"))
	var decks: Array = run_state.get("owned_decks", [])
	for deck_index in range(decks.size()):
		var deck: Dictionary = decks[deck_index].duplicate(true)
		deck["cards"] = _apply_sticker_service_cards(deck.get("cards", []), result)
		decks[deck_index] = deck
	run_state["owned_decks"] = decks
	for deck in decks:
		if str(deck.get("id", "")) == active_deck_id:
			run_state["deck"] = deck.get("cards", []).duplicate(true)
			break
	run_state["gold"] = int(run_state.get("gold", 0)) - price
	var use_counts: Dictionary = run_state.get("sticker_service_uses", {})
	var use_key := "%d,%d" % [active_service_position.x, active_service_position.y]
	use_counts[use_key] = _sticker_service_uses() + 1
	run_state["sticker_service_uses"] = use_counts
	_save_run()
	_show_sticker_service_result(result)


func _show_sticker_service_result(result: Dictionary) -> void:
	screen_name = "stickerServiceResult"
	service_preview_host = null
	service_apply_button = null
	var modal := _create_sticker_service_overlay(760.0, minf(320.0, get_viewport_rect().size.y * 0.8))
	var result_panel_style := modal.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	result_panel_style.content_margin_left = 24
	result_panel_style.content_margin_top = 26
	result_panel_style.content_margin_right = 24
	result_panel_style.content_margin_bottom = 26
	modal.add_theme_stylebox_override("panel", result_panel_style)
	var cards_margin := MarginContainer.new()
	cards_margin.add_theme_constant_override("margin_left", 0)
	cards_margin.add_theme_constant_override("margin_top", 14)
	cards_margin.add_theme_constant_override("margin_right", 0)
	cards_margin.add_theme_constant_override("margin_bottom", 14)
	cards_margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards_margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	modal.add_child(cards_margin)
	var cards := HBoxContainer.new()
	cards.add_theme_constant_override("separation", 30)
	cards.mouse_filter = Control.MOUSE_FILTER_STOP
	cards.alignment = BoxContainer.ALIGNMENT_CENTER
	cards.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cards_margin.add_child(cards)
	var before_card := _card_widget(result.get("before", {}), false, false)
	before_card.mouse_filter = Control.MOUSE_FILTER_STOP
	cards.add_child(before_card)
	var arrow := ResultArrowScript.new()
	arrow.custom_minimum_size = Vector2(104, 52)
	arrow.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	arrow.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	arrow.arrow_color = Color("#ff9900")
	cards.add_child(arrow)
	var after_card := _card_widget(result.get("after", {}), false, false)
	after_card.mouse_filter = Control.MOUSE_FILTER_STOP
	cards.add_child(after_card)


func _create_sticker_service_overlay(max_width: float, max_height: float) -> PanelContainer:
	if sticker_service_overlay != null and is_instance_valid(sticker_service_overlay):
		remove_child(sticker_service_overlay)
		sticker_service_overlay.queue_free()
	sticker_service_overlay = Control.new()
	sticker_service_overlay.z_index = 100
	sticker_service_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	sticker_service_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(sticker_service_overlay)
	var backdrop := ColorRect.new()
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(0.0, 0.0, 0.0, 0.76)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.gui_input.connect(_on_sticker_service_result_background_input)
	sticker_service_overlay.add_child(backdrop)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sticker_service_overlay.add_child(center)
	var viewport_size := get_viewport_rect().size
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(
		minf(max_width, maxf(280.0, viewport_size.x - 28.0)),
		minf(max_height, maxf(240.0, viewport_size.y - 28.0)))
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var panel_style := _button_style(Color("#0c0e0d"), Color("#c18435"))
	panel_style.content_margin_left = 16
	panel_style.content_margin_top = 13
	panel_style.content_margin_right = 16
	panel_style.content_margin_bottom = 13
	panel.add_theme_stylebox_override("panel", panel_style)
	center.add_child(panel)
	return panel


func _on_sticker_service_result_background_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_show_map()


func _all_run_cards() -> Array:
	var cards: Array = run_state.get("inventory_cards", []).duplicate(true)
	for deck in run_state.get("owned_decks", []):
		cards.append_array(deck.get("cards", []).duplicate(true))
	return cards


func _run_card_by_id(card_id: int) -> Dictionary:
	for card in run_state.get("inventory_cards", []):
		if int(card.get("id", -1)) == card_id:
			return card
	for deck in run_state.get("owned_decks", []):
		for card in deck.get("cards", []):
			if int(card.get("id", -1)) == card_id:
				return card
	for card in run_state.get("deck", []):
		if int(card.get("id", -1)) == card_id:
			return card
	return {}


func _apply_sticker_service_cards(cards: Array, result: Dictionary) -> Array:
	var updated: Array = []
	var destroyed_id := int(result.get("destroyed_id", -1))
	var after: Dictionary = result.get("after", {})
	var after_id := int(after.get("id", -1))
	for card in cards:
		var card_id := int(card.get("id", -1))
		if card_id == destroyed_id:
			continue
		updated.append(after.duplicate(true) if card_id == after_id else card)
	return updated


func _sticker_service_uses() -> int:
	var use_counts: Dictionary = run_state.get("sticker_service_uses", {})
	var use_key := "%d,%d" % [active_service_position.x, active_service_position.y]
	return int(use_counts.get(use_key, 0))


func _service_slot(label_text: String, slot_index := 0) -> StickerServiceSlotDropTarget:
	var panel := StickerServiceSlotDropTarget.new()
	panel.slot_index = slot_index
	panel.card_validator = Callable(self, "_can_drop_service_card_to_slot").bind(slot_index)
	panel.custom_minimum_size = Vector2(136, 191)
	if active_service_kind == "stickerAltar":
		panel.tooltip_text = "스티커가 하나 붙은 카드만 제물로 놓을 수 있습니다." if slot_index == 0 \
			else "제물 스티커를 받을 수 있는 카드를 놓을 수 있습니다."
	panel.add_theme_stylebox_override("panel", _button_style(COLOR_PANEL, COLOR_BORDER))
	var label := _label("+" if label_text.is_empty() else "+\n" + label_text, 16, COLOR_GOLD)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(label)
	return panel


func _service_result_placeholder() -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(136, 191)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_theme_stylebox_override("panel", _button_style(COLOR_PANEL, COLOR_BORDER))
	var plus := _label("+", 34, COLOR_GOLD)
	plus.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	plus.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	plus.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	plus.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_child(plus)
	return panel


func _sticker_icon(sticker_id: String, icon_size: float) -> Control:
	var icon = StickerArtScript.new()
	icon.configure(sticker_id, icon_size)
	icon.set_meta("card_sticker_id", sticker_id)
	icon.theme = blue_tooltip_theme
	if CardStickers.STICKERS.has(sticker_id):
		TooltipBindings.bind_sticker(icon, sticker_id)
	return icon


func _set_child_controls_mouse_ignored(parent: Control) -> void:
	for child in parent.get_children():
		if child is Control:
			var control := child as Control
			control.mouse_filter = Control.MOUSE_FILTER_IGNORE
			_set_child_controls_mouse_ignored(control)


func _show_defeat() -> void:
	screen_name = "defeat"
	_clear_run_save()
	_clear_screen()
	var page := _new_page("탐험 실패", "체력이 0이 되었습니다.")
	var center := CenterContainer.new()
	center.size_flags_vertical = Control.SIZE_EXPAND_FILL
	page.add_child(center)
	center.add_child(_button("다시 시작", Callable(self, "_start_run"), Vector2(220, 48)))


func _new_page(title_text: String, subtitle_text: String) -> VBoxContainer:
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 28)
	margin.add_theme_constant_override("margin_top", 22)
	margin.add_theme_constant_override("margin_right", 28)
	margin.add_theme_constant_override("margin_bottom", 22)
	add_child(margin)
	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 14)
	margin.add_child(page)
	var heading := HBoxContainer.new()
	heading.add_theme_constant_override("separation", 16)
	page.add_child(heading)
	var title := _label(title_text, 29, COLOR_TEXT)
	heading.add_child(title)
	var subtitle := _label(subtitle_text, 15, COLOR_MUTED)
	subtitle.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	heading.add_child(subtitle)
	return page


func _status_row(values: Array) -> PanelContainer:
	var panel := _panel(Vector2(0, 50))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 24)
	panel.add_child(row)
	for value in values:
		var label := _label(value, 16, COLOR_GOLD if value.contains("$") else COLOR_TEXT)
		row.add_child(label)
	return panel


func _battle_player_identity() -> VBoxContainer:
	var row := VBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 5)
	var avatar := PanelContainer.new()
	avatar.custom_minimum_size = Vector2(50, 50)
	avatar.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var avatar_style := StyleBoxFlat.new()
	avatar_style.bg_color = Color("#d9b852")
	avatar_style.border_color = Color("#a7771f")
	avatar_style.set_border_width_all(1)
	avatar_style.set_corner_radius_all(0)
	avatar.add_theme_stylebox_override("panel", avatar_style)
	var avatar_text := _label("@", 36, Color("#32270b"))
	avatar_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	avatar_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	avatar.add_child(avatar_text)
	row.add_child(avatar)
	var details := VBoxContainer.new()
	details.custom_minimum_size.x = 190
	details.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	details.alignment = BoxContainer.ALIGNMENT_CENTER
	details.add_theme_constant_override("separation", 4)
	var player_name := _label(str(run_state.get("player_name", "탐험가")), 15, Color.WHITE)
	player_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	details.add_child(player_name)
	var hp_row := HBoxContainer.new()
	hp_row.custom_minimum_size.x = 190
	hp_row.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var hp_value := int(battle_state.get("player_hp", 0))
	var hp_max := maxi(1, int(run_state.get("max_hp", 1)))
	var hp_bar := ProgressBar.new()
	active_battle_player_hp = hp_bar
	hp_bar.min_value = 0
	hp_bar.max_value = hp_max
	hp_bar.value = clampi(hp_value, 0, hp_max)
	hp_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hp_bar.custom_minimum_size.y = 28
	hp_row.add_child(hp_bar)
	var hp_text := _label("%d / %d" % [hp_value, hp_max], 15, Color.WHITE)
	active_battle_player_hp_text = hp_text
	BattleHPBar.apply_map_style(hp_bar, hp_text)
	hp_bar.add_child(hp_text)
	details.add_child(hp_row)
	row.add_child(details)
	return row


func _battle_resource_strip() -> VBoxContainer:
	var strip := VBoxContainer.new()
	strip.add_theme_constant_override("separation", 5)
	strip.alignment = BoxContainer.ALIGNMENT_BEGIN
	var physical_block := int(battle_state.get("player_block", 0))
	if physical_block > 0:
		var physical_shield = BattleDefenseShieldScript.new()
		physical_shield.configure("physical", physical_block)
		strip.add_child(physical_shield)
	var magic_block := int(battle_state.get("player_magic_block", 0))
	if magic_block > 0:
		var magic_shield = BattleDefenseShieldScript.new()
		magic_shield.configure("magic", magic_block)
		strip.add_child(magic_shield)
	return strip


func _battle_resource_cluster() -> Control:
	var cluster := Control.new()
	cluster.custom_minimum_size = Vector2(124, 124)
	cluster.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cluster.anchor_left = 1.0
	cluster.anchor_right = 1.0
	cluster.anchor_top = 0.0
	cluster.anchor_bottom = 0.0
	cluster.offset_left = -128.0
	cluster.offset_top = 2.0
	cluster.offset_right = -4.0
	cluster.offset_bottom = 126.0
	var energy_orb = BattleEnergyOrbScript.new()
	energy_orb.configure(int(battle_state.get("energy", 0)), int(battle_state.get("max_energy", 0)))
	energy_orb.position = Vector2(26, 0)
	energy_orb.custom_minimum_size = Vector2(72, 72)
	energy_orb.size = Vector2(72, 72)
	cluster.add_child(energy_orb)
	var star_count := int(battle_state.get("stars", 0))
	if star_count <= 6:
		for index in range(star_count):
			var star := _label("★", 18, COLOR_GOLD)
			star.position = Vector2(62.0 - float(star_count) * 8.0 + float(index) * 16.0, 78)
			star.size = Vector2(20, 24)
			star.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			star.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			star.add_theme_color_override("font_outline_color", Color("#111512"))
			star.add_theme_constant_override("outline_size", 2)
			star.mouse_filter = Control.MOUSE_FILTER_IGNORE
			cluster.add_child(star)
	elif star_count > 0:
		var star_total := _label("★ x%d" % star_count, 13, COLOR_GOLD)
		star_total.position = Vector2(34, 78)
		star_total.size = Vector2(56, 20)
		star_total.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		star_total.add_theme_color_override("font_outline_color", Color("#111512"))
		star_total.add_theme_constant_override("outline_size", 2)
		star_total.mouse_filter = Control.MOUSE_FILTER_IGNORE
		cluster.add_child(star_total)
	return cluster


func _section_label(text: String, color: Color) -> Label:
	return _label(text, 18, color)


func _message_label(text: String) -> Label:
	var label := _label(text, 15, COLOR_GOLD if text.begins_with("+") else COLOR_MUTED)
	label.custom_minimum_size.y = 24
	return label


func _room_name(room_type: String) -> String:
	var names := {
		"empty": "탐험 지형",
		"safeArea": "안전 구역",
		"portal": "안전 구역 포탈",
		"safePortal": "다음 지역 포탈",
		"safeEntry": "안전 구역",
		"partialHeal": "회복 지형",
		"heal": "회복 지형",
		"deckVault": "덱 금고",
		"stickerAltar": "제단",
		"tinkerer": "땜장이",
		"cardTransmuter": "변환기",
		"boss": "보스",
		"vaultInterior": "기둥 금고",
	}
	return str(names.get(room_type, "탐험 지형"))


func _deck_edition_labels(editions: Array) -> String:
	var labels: Array[String] = []
	for edition in editions:
		labels.append(DeckEditions.label(str(edition)))
	var joined := ""
	for label_text in labels:
		if joined != "":
			joined += " · "
		joined += label_text
	return joined


func _deck_edition_tooltip(editions: Array) -> String:
	var descriptions: Array[String] = []
	for edition in editions:
		var edition_id := str(edition)
		descriptions.append("%s: %s" % [DeckEditions.label(edition_id), DeckEditions.description(edition_id)])
	var tooltip := ""
	for description_text in descriptions:
		if tooltip != "":
			tooltip += "\n"
		tooltip += description_text
	return tooltip


func _label(text: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	return label


func _sticker_service_label(text: String, size: int, color: Color, weight := 400) -> Label:
	var label := _label(text, size, color)
	label.add_theme_font_override("font", _sticker_service_font(weight))
	return label


func _style_sticker_service_button(button: Button, size: int, weight: int) -> void:
	button.add_theme_font_size_override("font_size", size)
	button.add_theme_font_override("font", _sticker_service_font(weight))


func _sticker_service_font(weight: int) -> FontVariation:
	var font := FontVariation.new()
	font.base_font = STICKER_SERVICE_FONT
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	font.variation_opentype = {weight_axis: float(weight)}
	return font


func _button(text: String, callback: Callable, minimum_size: Vector2 = Vector2(140, 44)) -> Button:
	var button := Button.new()
	_style_button(button, text, callback, minimum_size)
	return button


func _map_restart_button() -> Button:
	var button := _button("다시하기", Callable(), Vector2(104, 52))
	_style_map_control_button(button, Color("#783a35"), Color("#8e3935"), Color("#fff4eb"))
	button.tooltip_text = "버튼을 1초간 눌러 새 탐험을 시작합니다."
	button.focus_mode = Control.FOCUS_ALL
	var progress := ColorRect.new()
	progress.color = Color(248.0 / 255.0, 196.0 / 255.0, 129.0 / 255.0, 0.35)
	progress.mouse_filter = Control.MOUSE_FILTER_IGNORE
	progress.anchor_left = 0.0
	progress.anchor_right = 0.0
	progress.anchor_top = 0.0
	progress.anchor_bottom = 1.0
	progress.offset_left = 0.0
	progress.offset_top = 0.0
	progress.offset_right = 0.0
	progress.offset_bottom = 0.0
	button.add_child(progress)
	active_restart_progress = progress
	button.gui_input.connect(func(event: InputEvent) -> void:
		if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				run_reset_hold.start("pointer")
			else:
				run_reset_hold.stop("pointer")
		elif event is InputEventKey and event.keycode in [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER]:
			if event.pressed and not event.echo:
				run_reset_hold.start("buttonKeyboard")
			elif not event.pressed:
				run_reset_hold.stop("buttonKeyboard")
	)
	button.mouse_exited.connect(func() -> void: run_reset_hold.stop("pointer"))
	button.focus_exited.connect(func() -> void: run_reset_hold.stop("buttonKeyboard"))
	return button


func _style_button(button: Button, text: String, callback: Callable, minimum_size: Vector2) -> void:
	button.text = text
	button.custom_minimum_size = minimum_size
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_size_override("font_size", 16)
	button.add_theme_color_override("font_color", COLOR_TEXT)
	button.add_theme_color_override("font_hover_color", Color.WHITE)
	button.add_theme_stylebox_override("normal", _button_style(COLOR_PANEL_HIGHLIGHT, COLOR_BORDER))
	button.add_theme_stylebox_override("hover", _button_style(Color("#333a35"), COLOR_ORANGE))
	button.add_theme_stylebox_override("pressed", _button_style(Color("#171b18"), COLOR_ORANGE))
	if callback.is_valid():
		button.pressed.connect(callback)


func _style_map_control_button(button: Button, background: Color, border: Color, text_color: Color) -> void:
	button.add_theme_font_size_override("font_size", 16)
	button.add_theme_font_override("font", map_control_font)
	button.add_theme_color_override("font_color", text_color)
	button.add_theme_color_override("font_hover_color", text_color)
	button.add_theme_color_override("font_pressed_color", text_color)
	button.add_theme_color_override("font_disabled_color", Color(text_color, 0.56))
	var normal := _button_style(background, border)
	var hover := _button_style(Color.WHITE if background == Color("#e2edd8") else background, border)
	var pressed := _button_style(hover.bg_color, border)
	var disabled := _button_style(Color(background, 0.56), Color(border, 0.56))
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", pressed)
	button.add_theme_stylebox_override("disabled", disabled)


func _style_option_button(option: OptionButton) -> void:
	option.focus_mode = Control.FOCUS_NONE
	option.add_theme_font_size_override("font_size", 14)
	option.add_theme_color_override("font_color", COLOR_TEXT)
	option.add_theme_color_override("font_hover_color", Color.WHITE)
	var normal := _button_style(COLOR_PANEL_HIGHLIGHT, COLOR_BORDER)
	normal.content_margin_top = 4
	normal.content_margin_bottom = 4
	var hover := _button_style(Color("#333a35"), COLOR_ORANGE)
	hover.content_margin_top = 4
	hover.content_margin_bottom = 4
	option.add_theme_stylebox_override("normal", normal)
	option.add_theme_stylebox_override("hover", hover)
	option.add_theme_stylebox_override("pressed", _button_style(Color("#171b18"), COLOR_ORANGE))


func _panel(minimum_size: Vector2) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = minimum_size
	panel.add_theme_stylebox_override("panel", _button_style(COLOR_PANEL, COLOR_BORDER))
	return panel


func _button_style(background: Color, outline: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = outline
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.content_margin_left = 12
	style.content_margin_top = 10
	style.content_margin_right = 12
	style.content_margin_bottom = 10
	return style


func _tile_style(background: Color, outline: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = outline
	style.set_border_width_all(1)
	style.content_margin_left = 0
	style.content_margin_top = 0
	style.content_margin_right = 0
	style.content_margin_bottom = 0
	return style


func _card_style(card: Dictionary, highlighted := false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = COLOR_CARD
	style.border_color = Color("#d5a928") if str(card.get("rarity", "")) == "rare" else Color("#111111")
	var border_width := 2 if str(card.get("rarity", "")) == "rare" else 1
	if highlighted:
		style.border_color = COLOR_GOLD
		border_width = 4
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(6)
	style.content_margin_left = border_width
	style.content_margin_top = border_width
	style.content_margin_right = border_width
	style.content_margin_bottom = border_width
	return style


func _card_header_style(card: Dictionary) -> StyleBoxFlat:
	var rarity := str(card.get("rarity", "starter"))
	var header_color := Color("#756a60")
	match rarity:
		"starter":
			header_color = Color("#555b60")
		"status":
			header_color = Color("#e34b58")
		"special":
			header_color = Color("#3472a2")
		"rare":
			header_color = Color("#7138a6")
		"legendary":
			header_color = Color("#a87924")
	var style := StyleBoxFlat.new()
	style.bg_color = header_color
	style.set_border_width_all(0)
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_left = 0
	style.corner_radius_bottom_right = 0
	style.content_margin_left = 7
	style.content_margin_top = 3
	style.content_margin_right = 7
	style.content_margin_bottom = 3
	return style


func _clear_screen() -> void:
	if screen_name != "deck":
		deck_editor_effect_started_usec = -1
	card_info_tooltip.clear()
	battle_draw_presentation.on_view_cleared(self)
	battle_card_presentation.on_view_cleared(self)
	battle_forge_presentation.on_view_cleared(self)
	battle_turn_presentation.on_view_cleared(self)
	map_debug_controller.on_view_cleared()
	battle_free_play_drop.finish()
	active_battle_hand_area = null
	active_battle_play_area = null
	active_battle_end_button = null
	active_battle_player_hp = null
	active_battle_player_hp_text = null
	active_battle_defense_strip = null
	battle_enemy_widgets.clear()
	_clear_map_vault_preview()
	map_encounter_generation += 1
	_hide_card_hover_preview()
	_hide_card_mechanic_preview()
	active_map_view = null
	active_map_surface = null
	active_map_wait_button = null
	active_map_search_button = null
	active_map_minimap = null
	active_map_search_panel = null
	active_restart_progress = null
	map_settings_overlay = null
	player_name_setup_overlay = null
	deck_editor_overlay = null
	sticker_service_overlay = null
	service_preview_host = null
	service_apply_button = null
	for child in get_children():
		if map_debug_controller.owns_persistent_control(child):
			continue
		if screen_name == "map" and child in [active_map_wait_notice, active_vault_release_notice,
				active_map_deck_selector_host]:
			continue
		if screen_name == "battle" and (child == battle_turn_presentation.popup_host \
				or child == battle_forge_presentation._host):
			continue
		remove_child(child)
		child.queue_free()
	if screen_name != "map":
		active_map_deck_selector_host = null
		active_map_deck_selector = null
		active_map_wait_notice = null
		active_vault_release_notice = null
