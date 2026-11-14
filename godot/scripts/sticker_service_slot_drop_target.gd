extends PanelContainer

signal card_dropped(card_id: int, slot_index: int)

var slot_index := 0
var card_validator: Callable
var drag_hover_valid := false


func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	if typeof(data) != TYPE_DICTIONARY or str(data.get("kind", "")) != "service-card" \
		or str(data.get("action", "")) != "select":
		return false
	var can_accept := not card_validator.is_valid() or bool(card_validator.call(int(data.get("card_id", -1))))
	if drag_hover_valid != can_accept:
		drag_hover_valid = can_accept
		self_modulate = Color("#fff0c2") if can_accept else Color("#ffd0d0")
	return can_accept


func _drop_data(_at_position: Vector2, data: Variant) -> void:
	if _can_drop_data(_at_position, data):
		card_dropped.emit(int(data.get("card_id", -1)), slot_index)
	_reset_drag_highlight()


func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_END:
		_reset_drag_highlight()


func _reset_drag_highlight() -> void:
	drag_hover_valid = false
	self_modulate = Color.WHITE
