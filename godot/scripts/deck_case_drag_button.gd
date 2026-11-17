extends Button

const CardDragPreviewLayer = preload("res://scripts/card_drag_preview_layer.gd")
const DeckCaseHeading = preload("res://scripts/deck_case_heading.gd")
const PREVIEW_SIZE := Vector2(190, 100)

var deck_drag_payload: Dictionary = {}
var deck_preview_data: Dictionary = {}


func _get_drag_data(_at_position: Vector2) -> Variant:
	if deck_drag_payload.is_empty():
		return null
	var preview := Panel.new()
	preview.size = PREVIEW_SIZE
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#0c0d0c", 0.85)
	style.border_color = Color("#db8a3d")
	style.set_border_width_all(2)
	style.set_corner_radius_all(5)
	preview.add_theme_stylebox_override("panel", style)
	var heading := DeckCaseHeading.new()
	heading.configure(str(deck_preview_data.get("name", "덱")), deck_preview_data.get("editions", []),
		int(deck_preview_data.get("count", 0)), int(deck_preview_data.get("capacity", 0)), false, false, false, true,
		bool(deck_preview_data.get("show_icon", false)))
	preview.add_child(heading)
	set_drag_preview(CardDragPreviewLayer.create(preview, PREVIEW_SIZE, "DeckCaseDragPreview"))
	return deck_drag_payload.duplicate(true)
