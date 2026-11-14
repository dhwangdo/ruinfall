extends Control

var deck_drop_target: Dictionary = {}
var deck_drop_callback: Callable
var drag_hover_valid := false


func _ready() -> void:
	queue_redraw()


func _draw() -> void:
	if str(deck_drop_target.get("area", "")) != "emptyOwned":
		return
	var rect := Rect2(Vector2.ZERO, size)
	draw_rect(rect, Color(1.0, 1.0, 1.0, 0.04), true)
	if size.x <= 10.0 or size.y <= 10.0:
		return
	var edge := Color(1.0, 1.0, 1.0, 0.3)
	var radius := 5.0
	draw_dashed_line(Vector2(radius, 0.5), Vector2(size.x - radius, 0.5), edge, 1.0, 5.0, true)
	draw_dashed_line(Vector2(size.x - 0.5, radius), Vector2(size.x - 0.5, size.y - radius), edge, 1.0, 5.0, true)
	draw_dashed_line(Vector2(size.x - radius, size.y - 0.5), Vector2(radius, size.y - 0.5), edge, 1.0, 5.0, true)
	draw_dashed_line(Vector2(0.5, size.y - radius), Vector2(0.5, radius), edge, 1.0, 5.0, true)
	draw_arc(Vector2(radius, radius), radius, PI, PI * 1.5, 8, edge, 1.0, true)
	draw_arc(Vector2(size.x - radius, radius), radius, -PI * 0.5, 0.0, 8, edge, 1.0, true)
	draw_arc(Vector2(size.x - radius, size.y - radius), radius, 0.0, PI * 0.5, 8, edge, 1.0, true)
	draw_arc(Vector2(radius, size.y - radius), radius, PI * 0.5, PI, 8, edge, 1.0, true)


func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	if typeof(data) != TYPE_DICTIONARY or str(data.get("kind", "")) != "deck-case":
		_set_drag_highlight(false)
		return false
	var source_area := str(data.get("source_area", ""))
	var target_area := str(deck_drop_target.get("area", ""))
	var valid := false
	if target_area == "owned":
		valid = source_area == "owned" and str(data.get("deck_id", "")) != str(deck_drop_target.get("deck_id", ""))
	elif target_area == "emptyOwned":
		valid = source_area == "floor"
	elif target_area == "floor":
		valid = source_area == "owned"
	_set_drag_highlight(valid)
	return valid


func _drop_data(at_position: Vector2, data: Variant) -> void:
	if _can_drop_data(at_position, data) and deck_drop_callback.is_valid():
		deck_drop_callback.call(deck_drop_target.duplicate(true), data.duplicate(true))
	_reset_drag_highlight()


func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END:
		_reset_drag_highlight()
	elif what == NOTIFICATION_RESIZED:
		queue_redraw()


func _set_drag_highlight(enabled: bool) -> void:
	if drag_hover_valid == enabled:
		return
	drag_hover_valid = enabled
	self_modulate = Color("#fff0c2") if enabled else Color.WHITE


func _reset_drag_highlight() -> void:
	_set_drag_highlight(false)
