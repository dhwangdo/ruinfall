extends Control

var run_drop_target: Dictionary = {}
var run_drop_callback: Callable
var drag_hover_valid := false


func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	var can_accept := not run_drop_target.is_empty() and _can_drop_run_card(data)
	_set_drag_highlight(can_accept)
	return can_accept


func _drop_data(_at_position: Vector2, data: Variant) -> void:
	if _can_drop_data(_at_position, data) and run_drop_callback.is_valid():
		run_drop_callback.call(run_drop_target.duplicate(true), data.duplicate(true))
	_reset_drag_highlight()


func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END:
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
