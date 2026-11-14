extends RefCounted

const CardFlights = preload("res://scripts/battle_card_flights.gd")
const CardDepartures = preload("res://scripts/battle_card_departures.gd")
const INTRO_DELAY_SECONDS := 0.36
const TURN_DRAW_DELAY_SECONDS := 0.12
const HIDDEN_MODULATE_META := &"draw_original_modulate"

var active := false
var generation := 0
var pending_final_state: Dictionary = {}
var hidden_card_ids: Dictionary = {}
var active_flights: Control
var active_clear_notice: Control


func prepare_rebuild(game, keep_draw_phase: bool) -> void:
	if keep_draw_phase:
		return
	_clear_notice()
	# A resize or another view rebuild must not discard an already computed draw.
	if not pending_final_state.is_empty():
		game.battle_state = pending_final_state
		game.battle_card_presentation.commit_queued(game)
		game.battle_turn_resolving = game.battle_card_presentation.has_pending_victory()
	pending_final_state = {}
	hidden_card_ids.clear()
	active = false


func on_view_cleared(game) -> void:
	generation += 1
	_clear_notice()
	_cancel_flights()
	if game.screen_name != "battle":
		active = false
		pending_final_state = {}
		hidden_card_ids.clear()


func invalidate() -> void:
	generation += 1
	_clear_notice()
	active = false
	pending_final_state = {}
	hidden_card_ids.clear()
	_cancel_flights()


func begin_initial(game, before_draw: Dictionary, final_state: Dictionary) -> void:
	begin_prepared(game, before_draw, final_state, INTRO_DELAY_SECONDS)


func begin_prepared(game, before_draw: Dictionary, final_state: Dictionary,
		delay_seconds: float = TURN_DRAW_DELAY_SECONDS) -> void:
	if final_state.get("status") != "playing":
		game.battle_state = final_state
		game._show_battle()
		return
	active = true
	pending_final_state = final_state
	game.battle_state = before_draw
	game._show_battle(true)
	var ticket := generation
	await game.get_tree().create_timer(maxf(delay_seconds, 0.0)).timeout
	if not _is_current(game, ticket):
		return
	var origins := capture_origins(game)
	var next_state := pending_final_state
	await apply_state(game, next_state, origins)


func begin_clear_prepared(game, draw_view: Dictionary, final_state: Dictionary) -> void:
	if final_state.get("status") != "playing":
		game.battle_state = final_state
		game._show_battle()
		return
	active = true
	pending_final_state = final_state
	var before_draw: Dictionary = draw_view.get("before", {})
	var cleared: Dictionary = draw_view.get("cleared", {})
	var refill_before: Dictionary = draw_view.get("refill_before", {})
	if before_draw.is_empty() or cleared.is_empty() or refill_before.is_empty():
		begin_prepared(game, before_draw, final_state)
		return
	game.battle_state = before_draw
	game._show_battle(true)
	var ticket := generation
	await game.get_tree().create_timer(TURN_DRAW_DELAY_SECONDS).timeout
	if not _is_current(game, ticket):
		return
	var old_origins := capture_origins(game)
	if not await apply_state(game, cleared, old_origins, true, true):
		return
	ticket = generation
	_show_clear_notice(game)
	await game.get_tree().create_timer(0.9).timeout
	if not _is_current(game, ticket):
		return
	_clear_notice()
	game.battle_state = refill_before
	game._show_battle(true)
	ticket = generation
	await game.get_tree().process_frame
	await game.get_tree().process_frame
	if not _is_current(game, ticket):
		return
	var refill_origins := capture_origins(game)
	await apply_state(game, final_state, refill_origins, false, true)


func capture_origins(game) -> Dictionary:
	var origins: Dictionary = {}
	var piles: Array = game.battle_state.get("piles", [])
	for index in mini(piles.size(), game.battle_pile_widgets.size()):
		var pile: Array = piles[index]
		var button = game.battle_pile_widgets[index]
		if pile.is_empty() or not is_instance_valid(button):
			continue
		var top: Control = button.file_drag_previews.get(pile.size() - 1)
		if not is_instance_valid(top) or not top.is_visible_in_tree():
			continue
		origins[int(pile.back().get("id", -1))] = top.get_global_rect()
	return origins


func apply_state(game, next_state: Dictionary, origins: Dictionary,
		keep_active := false, preserve_pending := false) -> bool:
	if not preserve_pending:
		pending_final_state = {}
	var previous_ids: Dictionary = {}
	for card in game.battle_state.get("hand", []):
		previous_ids[int(card.get("id", -1))] = true
	hidden_card_ids.clear()
	for card in next_state.get("hand", []):
		var card_id := int(card.get("id", -1))
		if not previous_ids.has(card_id) and origins.has(card_id):
			hidden_card_ids[card_id] = true
	game.battle_state = next_state
	if next_state.get("status") != "playing" or hidden_card_ids.is_empty():
		if not keep_active:
			active = false
			pending_final_state = {}
		game._show_battle(keep_active)
		return true
	active = true
	game._show_battle(true)
	var ticket := generation
	# The actual fan must finish layout before its target poses are captured.
	await game.get_tree().process_frame
	await game.get_tree().process_frame
	if not _is_current(game, ticket):
		return false
	var items: Array = []
	var visible_index := 0
	for card in next_state.get("hand", []):
		var card_id := int(card.get("id", -1))
		var target: Control = game.battle_hand_card_widgets.get(card_id)
		if not is_instance_valid(target) or not target.is_visible_in_tree():
			continue
		if hidden_card_ids.has(card_id):
			_restore_pre_hidden(target)
			items.append({"card": card, "target": target, "source_rect": origins[card_id],
				"enemy_token": bool(card.get("enemy_token", false)), "delay_ms": visible_index * 50.0})
		visible_index += 1
	var layer := CardFlights.new()
	layer.name = "BattleDrawFlights"
	layer.z_index = 110
	active_flights = layer
	game.add_child(layer)
	layer.configure(items, Callable(game, "_card_widget").bind(false, false, false), _reduced_motion())
	var completion: Array[bool] = []
	var accepted_completion: Array[bool] = []
	layer.finished.connect(func(cancelled: bool) -> void:
		completion.append(cancelled)
		if not _is_current(game, ticket):
			return
		if cancelled:
			return
		accepted_completion.append(true)
		active_flights = null
		hidden_card_ids.clear()
		if not keep_active:
			active = false
			pending_final_state = {}
		game._show_battle(keep_active)
	, CONNECT_ONE_SHOT)
	layer.play()
	if completion.is_empty():
		await layer.finished
	if accepted_completion.is_empty():
		if not completion.is_empty() and completion[0] and _is_current(game, ticket) \
				and not pending_final_state.is_empty():
			game.battle_state = pending_final_state
			pending_final_state = {}
			active = false
			hidden_card_ids.clear()
			_clear_notice()
			game._show_battle()
		return false
	active_flights = null
	if is_instance_valid(layer):
		layer.queue_free()
	return true


func _show_clear_notice(game) -> void:
	_clear_notice()
	var overlay := Control.new()
	overlay.name = "BattlePileClearNotice"
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.z_index = 105
	game.add_child(overlay)
	var label := Label.new()
	label.text = "CLEAR!"
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.focus_mode = Control.FOCUS_NONE
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 34)
	label.add_theme_color_override("font_color", Color("#f2c94c"))
	label.add_theme_color_override("font_outline_color", Color("#17120b"))
	label.add_theme_constant_override("outline_size", 4)
	label.size = Vector2(220, 64)
	label.set_anchors_preset(Control.PRESET_CENTER)
	label.position = Vector2(-110.0, -32.0)
	overlay.add_child(label)
	active_clear_notice = overlay


func _clear_notice() -> void:
	if is_instance_valid(active_clear_notice):
		active_clear_notice.queue_free()
	active_clear_notice = null


func play_departures(game, items: Array, final_state: Dictionary, mode: String,
		destination_rect: Rect2 = Rect2()) -> int:
	active = true
	pending_final_state = final_state
	var ticket := generation
	lock_hand_input(game.active_battle_hand_area)
	if is_instance_valid(game.active_battle_end_button):
		game.active_battle_end_button.disabled = true
	# A native drag finishes after its drop callback. Start the flight with that
	# cleanup complete, so it cannot restore mouse filters over this input lock.
	await game.get_tree().process_frame
	if not _is_current(game, ticket):
		return -1
	lock_hand_input(game.active_battle_hand_area)
	var layer := CardDepartures.new()
	layer.name = "BattleCardDepartures"
	layer.z_index = 110
	active_flights = layer
	game.add_child(layer)
	layer.configure(items, Callable(game, "_card_widget").bind(false, false, false), destination_rect, mode, _reduced_motion())
	var completion: Array[bool] = []
	layer.finished.connect(func(cancelled: bool) -> void: completion.append(cancelled), CONNECT_ONE_SHOT)
	layer.play()
	# Empty/hidden/reduced-motion batches can finish synchronously in play().
	if completion.is_empty():
		await layer.finished
	if not _is_current(game, ticket):
		return -1
	active_flights = null
	if completion[0]:
		_resume_cancelled_action.call_deferred(game, ticket)
		return -1
	return ticket


func _resume_cancelled_action(game, ticket: int) -> void:
	if _is_current(game, ticket):
		game._show_battle()


func prepare_hand_widget(card_id: int, widget: Control) -> void:
	if hidden_card_ids.has(card_id):
		widget.set_meta(HIDDEN_MODULATE_META, widget.modulate)
		widget.modulate.a = 0.0


func lock_hand_input(node: Node) -> void:
	if not active or not is_instance_valid(node):
		return
	if node is Control:
		node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in node.get_children():
		lock_hand_input(child)


func _restore_pre_hidden(widget: Control) -> void:
	if widget.has_meta(HIDDEN_MODULATE_META):
		widget.modulate = widget.get_meta(HIDDEN_MODULATE_META)
		widget.remove_meta(HIDDEN_MODULATE_META)


func _reduced_motion() -> bool:
	return DisplayServer.accessibility_should_reduce_animation() == 1


func _is_current(game, ticket: int) -> bool:
	return is_instance_valid(game) and game.is_inside_tree() and not game.is_queued_for_deletion() \
		and game.screen_name == "battle" and ticket == generation and active


func _cancel_flights() -> void:
	var layer := active_flights
	active_flights = null
	if is_instance_valid(layer):
		layer.cancel()
