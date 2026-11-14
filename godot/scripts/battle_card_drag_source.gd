extends PanelContainer

const CardDragPreviewLayer = preload("res://scripts/card_drag_preview_layer.gd")

var drag_payload: Dictionary = {}
var accepts_service_removal := false
var run_drag_payload: Dictionary = {}
var run_drop_target: Dictionary = {}
var run_drop_callback: Callable
var ticket_drop_target: Dictionary = {}
var ticket_drop_callback: Callable
var ticket_can_drop_callback: Callable
var drag_hover_valid := false
var active_drag_preview: Control

signal service_card_removed(card_id: int)

func _get_drag_data(_at_position: Vector2) -> Variant:
	var payload := run_drag_payload if not run_drag_payload.is_empty() else drag_payload
	if payload.is_empty():
		return null
	set_drag_preview(_make_drag_preview(payload))
	return payload.duplicate(true)


func begin_keyboard_drag() -> void:
	if not drag_payload.is_empty():
		var preview := _make_drag_preview(drag_payload)
		# Start from the hand pose instead of appearing at the cursor.
		preview.get_child(0).position = get_global_transform_with_canvas().origin - get_global_mouse_position()
		force_drag(drag_payload.duplicate(true), preview)


func _make_drag_preview(payload: Dictionary) -> Control:
	var preview := duplicate() as Control
	preview.size = size
	if str(payload.get("kind", "")) == "battle-card":
		preview.scale = Vector2.ONE
		preview.rotation = 0
		preview.pivot_offset = Vector2.ZERO
	var selected_card_size := size if not size.is_zero_approx() else custom_minimum_size
	active_drag_preview = CardDragPreviewLayer.create(preview, selected_card_size, "BattleCardDragPreview", true)
	if str(payload.get("kind", "")) == "battle-card" and str(payload.get("source", "")) == "hand":
		# The source metadata is set by the hand builder, independently of cost.
		active_drag_preview.set_meta("drag_fixed_center", bool(get_meta("targeted_card", false)))
	return active_drag_preview


func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	var can_accept_run_card := not run_drop_target.is_empty() and _can_drop_run_card(data)
	var can_accept_ticket := not ticket_drop_target.is_empty() and _can_drop_ticket(data)
	var can_remove_service_card := accepts_service_removal and typeof(data) == TYPE_DICTIONARY \
		and str(data.get("kind", "")) == "service-card" \
		and str(data.get("action", "")) == "remove"
	var can_accept := can_accept_run_card or can_accept_ticket or can_remove_service_card
	_set_drag_highlight(can_accept)
	return can_accept


func _drop_data(_at_position: Vector2, data: Variant) -> void:
	if not run_drop_target.is_empty() and _can_drop_run_card(data):
		if run_drop_callback.is_valid():
			run_drop_callback.call(run_drop_target.duplicate(true), data.duplicate(true))
		_reset_drag_highlight()
		return
	if not ticket_drop_target.is_empty() and _can_drop_ticket(data):
		if ticket_drop_callback.is_valid():
			ticket_drop_callback.call(ticket_drop_target.duplicate(true), data.duplicate(true))
		_reset_drag_highlight()
		return
	if _can_drop_data(_at_position, data):
		service_card_removed.emit(int(data.get("card_id", -1)))
	_reset_drag_highlight()


func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_BEGIN and not drag_payload.is_empty():
		var payload: Variant = get_viewport().gui_get_drag_data()
		if typeof(payload) == TYPE_DICTIONARY and str(payload.get("source", "")) == "hand" \
				and int(payload.get("card_id", -1)) == int(drag_payload.get("card_id", -2)):
			modulate.a = 0.16
	if what == NOTIFICATION_DRAG_END:
		modulate.a = 1.0
		_reset_drag_highlight()


func _set_drag_highlight(enabled: bool) -> void:
	if drag_hover_valid == enabled:
		return
	drag_hover_valid = enabled


func _reset_drag_highlight() -> void:
	_set_drag_highlight(false)


func _can_drop_run_card(data: Variant) -> bool:
	if typeof(data) != TYPE_DICTIONARY or str(data.get("kind", "")) != "run-card":
		return false
	var source_area := str(data.get("source_area", ""))
	var target_area := str(run_drop_target.get("area", ""))
	if source_area == "pendingRemoval" and target_area == "deck":
		return str(data.get("source_deck_id", "")) == str(run_drop_target.get("deck_id", ""))
	if source_area == "deck" and target_area == "deck":
		return str(data.get("source_deck_id", "")) != str(run_drop_target.get("deck_id", ""))
	if source_area in ["inventory", "floor"] and target_area == "deck":
		return true
	if source_area in ["deck", "floor"] and target_area == "inventory":
		return true
	return source_area in ["inventory", "deck"] and target_area == "floor"


func _can_drop_ticket(data: Variant) -> bool:
	if typeof(data) != TYPE_DICTIONARY or str(data.get("kind", "")) != "run-ticket":
		return false
	if str(data.get("ticket_type", "")) != "extractTicket":
		return false
	if str(ticket_drop_target.get("action", "")) != "extract-deck-card":
		return false
	return ticket_can_drop_callback.is_valid() \
		and bool(ticket_can_drop_callback.call(ticket_drop_target, data))
