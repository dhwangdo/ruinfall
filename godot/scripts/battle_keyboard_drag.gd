extends RefCounted

const CardUse = preload("res://scripts/card_use.gd")
const LIFT_HOLD_DISTANCE := 12.0

# Keep keyboard selection on the same payload and validators as pointer dragging.
var card_id := -1
var suppress_left_release := false
var held_key := 0
var click_candidate := -1
var click_start := Vector2.ZERO
var returning: Dictionary = {}
var pointer_drag := false
var lift_hold_armed := false


func handle_input(event: InputEvent, game: Control) -> bool:
	var viewport := game.get_viewport()
	if not viewport.gui_is_dragging():
		card_id = -1
		held_key = 0
		pointer_drag = false
		lift_hold_armed = false
	elif card_id < 0:
		var native_payload: Variant = viewport.gui_get_drag_data()
		if native_payload is Dictionary and str(native_payload.get("kind", "")) == "battle-card" \
				and str(native_payload.get("source", "")) == "hand":
			card_id = int(native_payload.get("card_id", -1))
			pointer_drag = true
	var active := card_id >= 0
	if active and event is InputEventMouseMotion:
		if pointer_drag and _crossed_lift_height(game, event.position):
			lift_hold_armed = true
		if game.BattleFreePlayDrop.in_cancel_band(game.active_battle_hand_area, event.position):
			_cancel(game)
			return true
	if event is InputEventKey and not event.pressed and active and event.keycode == held_key:
		_cancel(game)
		return true
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT \
			and not event.pressed and suppress_left_release:
		suppress_left_release = false
		return true
	if event is InputEventMouseButton and active:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			if event.pressed:
				_cancel(game)
			return true
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			suppress_left_release = true
			_commit_or_cancel(game, event.position)
			return true
		if event.button_index == MOUSE_BUTTON_LEFT:
			if not event.pressed and pointer_drag:
				if _can_latch_lift(game, event.position):
					# Consume this release so native drag cleanup cannot use/cancel it.
					pointer_drag = false
					held_key = 0
					click_candidate = -1
					return true
				_commit_or_cancel(game, event.position)
			return true
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			click_candidate = _hand_card_at(event.position, game.battle_hand_card_widgets) if game._battle_drop_available() else -1
			click_start = event.position
		elif click_candidate >= 0:
			var chosen := click_candidate
			click_candidate = -1
			if not viewport.gui_is_dragging() and click_start.distance_to(event.position) < 6.0:
				_select.call_deferred(game, chosen)
				return true
	if not event is InputEventKey or not event.pressed or event.echo \
			or event.alt_pressed or event.ctrl_pressed or event.meta_pressed:
		return false
	if viewport.gui_is_dragging() and event.keycode == KEY_ESCAPE:
		_cancel(game)
		return true
	if viewport.gui_is_dragging() and event.keycode == KEY_SPACE:
		return true
	if event.keycode < KEY_1 or event.keycode > KEY_9:
		return false
	var pending_play_id := int(game.battle_state.get("pending_play_card_id", -1))
	var pending_discard_count := int(game.battle_state.get("pending_discard_count", 0))
	var forced_discard_active: bool = pending_play_id >= 0 and pending_discard_count > 0 \
		and str(game.battle_state.get("status", "")) == "playing" and not game.battle_turn_resolving
	if (not game._battle_drop_available() and not forced_discard_active) \
			or not game.battle_card_ledger_open.is_empty():
		return false
	var index: int = event.keycode - KEY_1
	if viewport.gui_is_dragging() and not active:
		return false
	var visible_card_ids: Array[int] = []
	for card in game.battle_state.get("hand", []):
		var widget: Control = game.battle_hand_card_widgets.get(int(card.get("id", -1)))
		if is_instance_valid(widget) and widget.visible:
			visible_card_ids.append(int(card.get("id", -1)))
	if index >= visible_card_ids.size():
		return false
	var chosen_id := visible_card_ids[index]
	if active:
		if chosen_id != card_id:
			_select(game, chosen_id)
		held_key = event.keycode
		return true
	if forced_discard_active:
		game._discard_for_pending_play(chosen_id)
		return true
	else:
		_select(game, chosen_id)
		held_key = event.keycode
	return true


func _crossed_lift_height(game: Control, point: Vector2) -> bool:
	return CardUse.requires_target(game._battle_hand_card(card_id)) \
		and click_start.y - point.y >= LIFT_HOLD_DISTANCE \
		and game.BattleFreePlayDrop.in_play_band(game.active_battle_hand_area, point)


func _can_latch_lift(game: Control, point: Vector2) -> bool:
	if not CardUse.requires_target(game._battle_hand_card(card_id)) \
			or game.BattleFreePlayDrop.in_cancel_band(game.active_battle_hand_area, point) \
			or not (lift_hold_armed or _crossed_lift_height(game, point)):
		return false
	var payload: Dictionary = game.get_viewport().gui_get_drag_data()
	var destination := drop_destination(game, point, payload)
	# Dropping onto a valid file remains a solitaire action.
	return destination.is_empty() or str(destination["kind"]) != "file"


func _select(game: Control, chosen_id: int) -> void:
	if not is_instance_valid(game) or game.screen_name != "battle" or not game._battle_drop_available():
		return
	if game.get_viewport().gui_is_dragging():
		_cancel(game)
	if game.selected_battle_hand_card_id >= 0:
		game.selected_battle_hand_card_id = -1
		game._show_battle()
	var widget: Control = game.battle_hand_card_widgets.get(chosen_id)
	if not is_instance_valid(widget):
		return
	if returning.has(chosen_id):
		var previous: Dictionary = returning[chosen_id]
		previous["tween"].kill()
		if is_instance_valid(previous["ghost"]):
			previous["ghost"].queue_free()
		returning.erase(chosen_id)
		widget.modulate.a = 1.0
	widget.begin_keyboard_drag()
	card_id = chosen_id
	held_key = 0
	pointer_drag = false
	lift_hold_armed = false
	click_candidate = -1


func _commit_or_cancel(game: Control, point: Vector2) -> void:
	var viewport := game.get_viewport()
	var payload: Dictionary = viewport.gui_get_drag_data().duplicate(true)
	var destination := drop_destination(game, point, payload)
	if not destination.is_empty() and str(destination["kind"]) != "file" \
			and not game._can_begin_card_play(game._battle_hand_card(int(payload.get("card_id", -1)))):
		_cancel(game)
		return
	if not destination.is_empty():
		payload["held_origin"] = capture_origin(game)
		viewport.gui_cancel_drag()
		card_id = -1
		held_key = 0
		destination["control"].call("_drop_data", destination["local"], payload)
		return
	_cancel(game)


func capture_origin(game: Control) -> Dictionary:
	var data: Variant = game.get_viewport().gui_get_drag_data()
	if not data is Dictionary:
		return {}
	var widget: Control = game.battle_hand_card_widgets.get(int(data.get("card_id", -1)))
	if not is_instance_valid(widget) or not is_instance_valid(widget.active_drag_preview):
		return {}
	var visual: Control = widget.active_drag_preview.get_child(0)
	return {"pose": visual.get_global_transform_with_canvas(), "size": visual.size}


func drop_destination(game: Control, point: Vector2, payload: Dictionary) -> Dictionary:
	var viewport := game.get_viewport()
	var target: Control = viewport.gui_get_hovered_control()
	while is_instance_valid(target):
		var local := target.get_global_transform_with_canvas().affine_inverse() * point
		if target.has_method("_can_drop_data") and bool(target.call("_can_drop_data", local, payload)):
			return {"control": target, "local": local,
				"kind": "center" if target == game else str(target.get("target_kind"))}
		target = target.get_parent() as Control
	return {}


func _cancel(game: Control) -> void:
	var widget: Control = game.battle_hand_card_widgets.get(card_id)
	var ghost: Control
	if is_instance_valid(widget) and is_instance_valid(widget.active_drag_preview):
		var visual: Control = widget.active_drag_preview.get_child(0)
		ghost = visual.duplicate() as Control
		var pose := game.get_global_transform_with_canvas().affine_inverse() * visual.get_global_transform_with_canvas()
		game.add_child(ghost)
		ghost.position = pose.origin
		ghost.rotation = pose.get_rotation()
		ghost.scale = pose.get_scale()
		ghost.z_as_relative = false
		ghost.z_index = 4095
	game.get_viewport().gui_cancel_drag()
	var returning_id := card_id
	card_id = -1
	held_key = 0
	pointer_drag = false
	lift_hold_armed = false
	click_candidate = -1
	if not is_instance_valid(ghost):
		return
	widget.modulate.a = 0.0
	var destination := game.get_global_transform_with_canvas().affine_inverse() * widget.get_global_transform_with_canvas()
	var tween := game.create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.tween_property(ghost, "position", destination.origin, 0.22)
	tween.tween_property(ghost, "rotation", destination.get_rotation(), 0.22)
	tween.tween_property(ghost, "scale", destination.get_scale(), 0.22)
	returning[returning_id] = {"ghost": ghost, "tween": tween}
	tween.finished.connect(func() -> void:
		if is_instance_valid(widget):
			widget.modulate.a = 1.0
		if is_instance_valid(ghost):
			ghost.queue_free()
		returning.erase(returning_id)
	)


func _hand_card_at(point: Vector2, widgets: Dictionary) -> int:
	var chosen := -1
	var highest_z := -1
	for id in widgets:
		var widget: Control = widgets[id]
		if not is_instance_valid(widget) or not widget.visible:
			continue
		var local_point := widget.get_global_transform_with_canvas().affine_inverse() * point
		if Rect2(Vector2.ZERO, widget.size).has_point(local_point) and widget.z_index >= highest_z:
			chosen = int(id)
			highest_z = widget.z_index
	return chosen
