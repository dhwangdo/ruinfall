extends RefCounted

const DebugSession = preload("res://scripts/map_debug_session.gd")
const DebugActions = preload("res://scripts/map_debug_actions.gd")
const DebugDecks = preload("res://scripts/debug_decks.gd")
const DebugToolbar = preload("res://scripts/map_debug_toolbar.gd")
const EnemyCodex = preload("res://scripts/map_debug_enemy_codex.gd")
const CardPoolStats = preload("res://scripts/card_pool_stats_panel.gd")
const MapRules = preload("res://scripts/map_rules.gd")

var session := DebugSession.new()
var activation_times: Array[int] = []
var selector_values := {"spawn_selection": "deck:random", "deck_region": "1", "deck_count": "1"}
var active_stats: Control
var _codex_entries: Array = []
var _cached_toolbar: Control
var _toolbar_placeholder: WeakRef
var _toolbar_trace_file: FileAccess
var _toolbar_trace_path := ""
var _toolbar_trace_entries: Array[String] = []


func reset() -> void:
	_close_toolbar_trace()
	if is_instance_valid(_cached_toolbar):
		_cached_toolbar.hide()
		_cached_toolbar.queue_free()
	_cached_toolbar = null
	_toolbar_placeholder = null
	session.reset()
	activation_times.clear()
	active_stats = null


func register_activation(now_ms: int = -1) -> bool:
	var now := Time.get_ticks_msec() if now_ms < 0 else now_ms
	var recent: Array[int] = []
	for timestamp in activation_times:
		if now - timestamp <= 1200:
			recent.append(timestamp)
	recent.append(now)
	activation_times = recent
	if recent.size() < 5:
		return false
	activation_times.clear()
	return true


func count_activation(game) -> void:
	if game.run_state.is_empty() or not register_activation():
		return
	game._sync_active_deck()
	var leaving_debug := session.active
	if leaving_debug:
		game.run_state = session.leave(game.run_state)
		_close_toolbar_trace()
		game.map_zoom = 85.0
		game.map_camera_center = Vector2(game.run_state["position"]) + Vector2(0.5, 0.5)
		game.pending_map_camera_duration_ms = 0.0
		game.map_visual_motion.snap_camera(game.map_camera_center)
		game.notice = "디버그 모드를 종료했습니다."
	else:
		game.run_state = session.enter(game.run_state)
		_start_toolbar_trace()
		game.notice = "디버그 덱 ALL 생성: 모든 카드 %d장" % game.run_state["deck"].size()
	game._save_run()
	game._show_map()


func make_toolbar(game, enemy_codex: Array = [], map_page: Control = null) -> Control:
	var placeholder := Control.new()
	placeholder.name = "MapDebugToolbarPlaceholder"
	placeholder.custom_minimum_size.y = 46.0
	placeholder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	placeholder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_toolbar_placeholder = weakref(placeholder)
	if is_instance_valid(_cached_toolbar) and not _cached_toolbar.is_queued_for_deletion():
		_place_toolbar_after_page(game, map_page)
		return placeholder
	if _codex_entries.is_empty():
		_codex_entries = EnemyCodex.get_entries()
	var choices: Array = [{"group": "덱", "label": "무작위 덱", "value": "deck:random"},
		{"group": "아이템", "label": "모든 티켓", "value": "consumable:allTickets"}]
	for type in DebugActions.CONSUMABLE_DATA:
		choices.append({"group": "아이템", "label": DebugActions.CONSUMABLE_DATA[type][0],
			"value": "consumable:" + str(type)})
	choices.append_array(DebugDecks.card_choices())
	var toolbar := DebugToolbar.new()
	toolbar.name = "MapDebugToolbar"
	toolbar.overlay_host = game
	toolbar.configure({"debug_mode": session.active, "region_count": MapRules.REGION_COUNT,
		"enemy_codex": _codex_entries if enemy_codex.is_empty() else enemy_codex}, choices, selector_values)
	toolbar.action_requested.connect(func(action: String, payload: Dictionary) -> void:
		handle_action(game, action, payload)
	, CONNECT_DEFERRED) # Finish popup input dispatch before a map rebuild removes its Window.
	_cached_toolbar = toolbar
	toolbar.z_index = 10
	toolbar.hide()
	game.add_child(toolbar)
	toolbar.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	_place_toolbar_after_page(game, map_page)
	return placeholder


func _place_toolbar_after_page(game, map_page: Control) -> void:
	if not is_instance_valid(_cached_toolbar) or not is_instance_valid(map_page) \
		or _cached_toolbar.get_parent() != game:
		return
	var page_root: Node = map_page
	while page_root.get_parent() != game and page_root.get_parent() != null:
		page_root = page_root.get_parent()
	if page_root.get_parent() != game:
		return
	var target_index := page_root.get_index() + 1
	if _cached_toolbar.get_index() < target_index:
		target_index -= 1
	target_index = clampi(target_index, 0, game.get_child_count() - 1)
	if _cached_toolbar.get_index() != target_index:
		game.move_child(_cached_toolbar, target_index)


func sync_toolbar(game) -> void:
	if not is_instance_valid(_cached_toolbar) or _cached_toolbar.is_queued_for_deletion():
		return
	var placeholder: Control = _toolbar_placeholder.get_ref() if _toolbar_placeholder != null else null
	var visible_now: bool = session.active and game.screen_name == "map" \
		and not game.run_state.is_empty() and is_instance_valid(placeholder) \
		and placeholder.is_inside_tree()
	if _cached_toolbar.visible != visible_now:
		_cached_toolbar.visible = visible_now
	if not visible_now:
		return
	var required_height := _cached_toolbar.custom_minimum_size.y
	if not is_equal_approx(placeholder.custom_minimum_size.y, required_height):
		placeholder.custom_minimum_size.y = required_height
	if not _cached_toolbar.is_inside_tree():
		return
	var target_position := placeholder.global_position
	if not _cached_toolbar.global_position.is_equal_approx(target_position):
		_cached_toolbar.global_position = target_position
	if not _cached_toolbar.size.is_equal_approx(placeholder.size):
		_cached_toolbar.size = placeholder.size


func owns_persistent_control(control: Node) -> bool:
	return is_instance_valid(_cached_toolbar) and control == _cached_toolbar


func trace_toolbar_pointer_release(game, event: InputEventMouseButton) -> void:
	if not is_instance_valid(game) or not session.active or game.screen_name != "map":
		return
	var toolbar_rect := Rect2()
	if is_instance_valid(_cached_toolbar):
		toolbar_rect = _cached_toolbar.get_global_rect()
	var placeholder: Control = _toolbar_placeholder.get_ref() if _toolbar_placeholder != null else null
	var placeholder_rect := placeholder.get_global_rect() if is_instance_valid(placeholder) else Rect2()
	var pointer := event.global_position
	var local_pointer := event.position
	if not toolbar_rect.has_point(pointer) and not placeholder_rect.has_point(pointer) \
		and not toolbar_rect.has_point(local_pointer) and not placeholder_rect.has_point(local_pointer):
		return
	var hovered: Control = game.get_viewport().gui_get_hovered_control()
	record_toolbar_trace("pointer_release", {
		"button": event.button_index,
		"screen": str(game.screen_name),
		"event_position": [event.position.x, event.position.y],
		"global_position": [pointer.x, pointer.y],
		"local_position_hits_toolbar": toolbar_rect.has_point(local_pointer) or placeholder_rect.has_point(local_pointer),
		"hovered_control": str(hovered.get_path()) if is_instance_valid(hovered) else "<none>",
		"toolbar_visible": is_instance_valid(_cached_toolbar) and _cached_toolbar.is_visible_in_tree(),
		"toolbar_rect": _rect_values(toolbar_rect),
		"placeholder_valid": is_instance_valid(placeholder),
		"placeholder_rect": _rect_values(placeholder_rect),
	})


func record_toolbar_trace(event_name: String, details: Dictionary = {}) -> void:
	if _toolbar_trace_file == null:
		return
	var entry := details.duplicate(true)
	entry["event"] = event_name
	entry["debug_active"] = session.active
	entry["time_ms"] = Time.get_ticks_msec()
	var line := JSON.stringify(entry)
	if _toolbar_trace_entries.size() < 200:
		_toolbar_trace_entries.append(line)
		_toolbar_trace_file.store_line(line)
	else:
		_toolbar_trace_entries.pop_front()
		_toolbar_trace_entries.append(line)
		_toolbar_trace_file.close()
		_toolbar_trace_file = FileAccess.open(_toolbar_trace_path, FileAccess.WRITE)
		if _toolbar_trace_file == null:
			return
		for saved_line in _toolbar_trace_entries:
			_toolbar_trace_file.store_line(saved_line)
	_toolbar_trace_file.flush()


func _start_toolbar_trace() -> void:
	_close_toolbar_trace()
	_toolbar_trace_path = OS.get_user_data_dir().path_join("debug-toolbar-input.log")
	_toolbar_trace_file = FileAccess.open(_toolbar_trace_path, FileAccess.WRITE)
	if _toolbar_trace_file == null:
		push_warning("Could not open debug toolbar trace: " + _toolbar_trace_path)
		return
	print("DEBUG_TOOLBAR_TRACE_FILE=" + _toolbar_trace_path)
	_toolbar_trace_entries.clear()
	record_toolbar_trace("debug_session_started")


func _close_toolbar_trace() -> void:
	if _toolbar_trace_file != null:
		_toolbar_trace_file.close()
	_toolbar_trace_file = null
	_toolbar_trace_path = ""
	_toolbar_trace_entries.clear()


func _rect_values(rect: Rect2) -> Array:
	return [rect.position.x, rect.position.y, rect.size.x, rect.size.y]


func handle_action(game, action: String, payload: Dictionary) -> void:
	var game_valid: bool = is_instance_valid(game) and game.is_inside_tree() and not game.is_queued_for_deletion()
	var screen := str(game.screen_name) if game_valid else "<invalid>"
	var accepted: bool = game_valid and session.active and screen == "map"
	record_toolbar_trace("handle_action", {"action": action, "payload": payload,
		"game_valid": game_valid, "screen": screen, "accepted": accepted})
	if not game_valid:
		return
	if not session.active or game.screen_name != "map":
		return
	match action:
		"spawn_selection_changed":
			selector_values["spawn_selection"] = str(payload.get("selection", ""))
			return
		"deck_region_changed":
			selector_values["deck_region"] = str(payload.get("region_number", ""))
			return
		"deck_count_changed":
			selector_values["deck_count"] = str(payload.get("deck_count", ""))
			return
		"open_card_stats":
			_open_stats(game)
			return
		"add_debug_keys":
			game.run_state["keys"] = int(game.run_state.get("keys", 0)) + 10
		"add_debug_gold":
			game.run_state["gold"] = int(game.run_state.get("gold", 0)) + 999
		"spawn_item", "generate_region_decks", "create_sticker_test_deck":
			if action == "generate_region_decks" and not _valid_deck_request(payload):
				game.notice = "지역·생성 개수를 올바르게 입력하세요."
				if is_instance_valid(game.active_map_notice_label):
					game.active_map_notice_label.text = game.notice
				return
			game._sync_active_deck()
			game.run_state = DebugActions.apply(game.run_state, action, payload)
			if action == "generate_region_decks":
				game.notice = "디버그 %s지역 덱 %s개를 바닥에 생성했습니다." % [
					str(payload["region_number"]), str(payload["deck_count"])]
			elif action == "create_sticker_test_deck":
				game.notice = "스티커 도감 덱 생성: 스티커 %d종을 확인할 수 있습니다." % game.run_state["deck"].size()
		_:
			return
	game._save_run()
	game._show_map()


func teleport(game, destination: Vector2i) -> void:
	if not session.active or game.screen_name != "map" or not MapRules.is_walkable(game.run_state["map"], destination):
		return
	game._update_safe_area_unlock_animation(game.run_state["map"], game.run_state["position"], destination)
	game.run_state["position"] = destination
	MapRules.reveal_visible(game.run_state["map"], destination)
	var gold_piles: Dictionary = game.run_state["map"].get("gold_piles", {})
	if gold_piles.has(destination):
		var amount := int(gold_piles[destination])
		game.run_state["gold"] = int(game.run_state.get("gold", 0)) + amount
		gold_piles.erase(destination)
		game.gold_popup_pending = amount
	game.notice = ""
	game.map_camera_center = Vector2(destination) + Vector2(0.5, 0.5)
	game.pending_map_camera_duration_ms = 0.0
	game.map_visual_motion.retarget_camera(game.map_camera_center, 360.0, "focus")
	# The browser's activateRoomFeature callback is currently a no-op here.
	# Teleport neither advances enemy turns nor automatically uses a service/portal.
	game._save_run()
	game._show_map()


func on_view_cleared() -> void:
	active_stats = null
	_toolbar_placeholder = null
	if not is_instance_valid(_cached_toolbar):
		return
	_cached_toolbar.prepare_for_reuse()
	_cached_toolbar.hide()


func _valid_deck_request(payload: Dictionary) -> bool:
	var region := DebugActions._strict_integer(payload.get("region_number"))
	var count := DebugActions._strict_integer(payload.get("deck_count"))
	return bool(region["valid"]) and bool(count["valid"]) \
		and int(region["value"]) >= 1 and int(region["value"]) <= MapRules.REGION_COUNT and int(count["value"]) >= 1


func _open_stats(game) -> void:
	if is_instance_valid(active_stats):
		return
	game._clear_map_vault_preview()
	var panel := CardPoolStats.create(Callable(game, "_show_card_hover_preview"),
		Callable(game, "_hide_card_hover_preview"), Callable(), game.blue_tooltip_theme)
	panel.name = "CardPoolStats"
	panel.z_index = 100
	active_stats = panel
	panel.close_requested.connect(func() -> void:
		game._hide_card_hover_preview()
		if active_stats == panel:
			active_stats = null
		if is_instance_valid(panel):
			panel.queue_free()
	)
	game.add_child(panel)
