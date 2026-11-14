extends Button

const CardDragPreviewLayer = preload("res://scripts/card_drag_preview_layer.gd")

var deck_drag_payload: Dictionary = {}


func _get_drag_data(_at_position: Vector2) -> Variant:
	if deck_drag_payload.is_empty():
		return null
	var preview := duplicate() as Control
	preview.set_script(null)
	preview.size = size
	set_drag_preview(CardDragPreviewLayer.create(preview, size, "DeckCaseDragPreview"))
	return deck_drag_payload.duplicate(true)
