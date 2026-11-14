extends Control

signal service_card_removed(card_id: int)


func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	return typeof(data) == TYPE_DICTIONARY \
		and str(data.get("kind", "")) == "service-card" \
		and str(data.get("action", "")) == "remove"


func _drop_data(_at_position: Vector2, data: Variant) -> void:
	if _can_drop_data(_at_position, data):
		service_card_removed.emit(int(data.get("card_id", -1)))
