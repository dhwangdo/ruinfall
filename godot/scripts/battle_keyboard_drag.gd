extends RefCounted

# Keep keyboard selection on the same payload and validators as pointer dragging.
var card_id := -1
var suppress_left_release := false


func handle_input(event: InputEvent, game: Control) -> bool:
	var viewport := game.get_viewport()
	if not viewport.gui_is_dragging():
		card_id = -1
	var active := card_id >= 0
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT \
			and not event.pressed and suppress_left_release:
		suppress_left_release = false
		return true
	if event is InputEventMouseButton and active:
		# The web keyboard drag ignores right clicks and switches when a hand card is clicked.
		if event.button_index == MOUSE_BUTTON_RIGHT:
			return true
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			var clicked_id := _hand_card_at(event.position, game.battle_hand_card_widgets)
			if clicked_id >= 0:
				suppress_left_release = true
				if clicked_id != card_id:
					_select(game, clicked_id)
				return true
	if not event is InputEventKey or not event.pressed or event.echo \
			or event.alt_pressed or event.ctrl_pressed or event.meta_pressed:
		return false
	if viewport.gui_is_dragging() and event.keycode == KEY_ESCAPE:
		viewport.gui_cancel_drag()
		card_id = -1
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
		if chosen_id == card_id:
			viewport.gui_cancel_drag()
			card_id = -1
		else:
			_select(game, chosen_id)
		return true
	if forced_discard_active:
		game.selected_battle_hand_card_id = -1 if game.selected_battle_hand_card_id == chosen_id else chosen_id
		game._show_battle()
		return true
	else:
		_select(game, chosen_id)
	return true


func _select(game: Control, chosen_id: int) -> void:
	if game.get_viewport().gui_is_dragging():
		game.get_viewport().gui_cancel_drag()
	if game.selected_battle_hand_card_id >= 0:
		game.selected_battle_hand_card_id = -1
		game._show_battle()
	var widget: Control = game.battle_hand_card_widgets.get(chosen_id)
	if not is_instance_valid(widget):
		return
	widget.begin_keyboard_drag()
	card_id = chosen_id


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
