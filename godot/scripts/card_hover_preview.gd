extends RefCounted
class_name PortCardHoverPreview

const FRAME_SIZE := Vector2(160, 215)


static func create(card_widget: Control) -> Control:
	var frame := PanelContainer.new()
	frame.custom_minimum_size = FRAME_SIZE
	frame.size = FRAME_SIZE
	frame.z_index = 128
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.bg_color = Color(58.0 / 255.0, 31.0 / 255.0, 37.0 / 255.0, 0.96)
	style.border_color = Color(170.0 / 255.0, 108.0 / 255.0, 117.0 / 255.0, 0.9)
	style.set_border_width_all(2)
	style.set_corner_radius_all(6)
	style.content_margin_left = 12
	style.content_margin_top = 12
	style.content_margin_right = 12
	style.content_margin_bottom = 12
	frame.add_theme_stylebox_override("panel", style)
	_set_mouse_ignore(card_widget)
	frame.add_child(card_widget)
	return frame


static func position_for(anchor_rect: Rect2, viewport_size: Vector2, placement: String = "right") -> Vector2:
	var preview_x: float = anchor_rect.position.x + anchor_rect.size.x + 18.0
	if placement == "left":
		preview_x = anchor_rect.position.x - FRAME_SIZE.x - 18.0
	var preview_y := maxf(12.0, minf(anchor_rect.position.y + 18.0, viewport_size.y - FRAME_SIZE.y - 12.0))
	return Vector2(preview_x, preview_y)


static func _set_mouse_ignore(node: Node) -> void:
	if node is Control:
		(node as Control).mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in node.get_children():
		_set_mouse_ignore(child)
