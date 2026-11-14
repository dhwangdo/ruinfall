extends Control

# Godot owns the wrapper cursor position and lifetime during native dragging.
# The child offset sets the cursor hotspot within the selected card.
const PREVIEW_Z_INDEX := 4095
const CardDragCursorOverride = preload("res://scripts/card_drag_cursor_override.gd")


static func create(visual: Control, selected_card_size: Vector2, preview_name: String,
		suppress_forbidden_cursor := false) -> Control:
	var wrapper := Control.new()
	wrapper.set_script(CardDragCursorOverride)
	wrapper.set("suppress_forbidden_cursor", suppress_forbidden_cursor)
	wrapper.name = preview_name
	wrapper.mouse_filter = Control.MOUSE_FILTER_IGNORE
	wrapper.focus_mode = Control.FOCUS_NONE
	wrapper.clip_contents = false
	wrapper.z_as_relative = false
	wrapper.z_index = PREVIEW_Z_INDEX
	wrapper.set_meta("skip_pending_removal_effect", true)
	var visual_size := visual.size
	if visual_size.is_zero_approx():
		visual_size = visual.custom_minimum_size
	visual.set_script(null)
	visual.name = "DraggedCardVisual"
	visual.set_meta("skip_pending_removal_effect", true)
	visual.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	visual.rotation = 0.0
	visual.scale = Vector2.ONE
	visual.pivot_offset = Vector2.ZERO
	visual.modulate = Color.WHITE
	visual.self_modulate = Color.WHITE
	visual.custom_minimum_size = visual_size
	visual.size = visual_size
	# Horizontal grab stays centered; vertical grab is two-thirds down the first
	# selected card, matching a 2:1 top-to-bottom hotspot split.
	visual.position = Vector2(-selected_card_size.x * 0.5, -selected_card_size.y * (2.0 / 3.0))
	wrapper.set_meta("drag_target_offset", visual.position)
	_ignore_pointer(visual)
	wrapper.add_child(visual)
	return wrapper


static func _ignore_pointer(node: Node) -> void:
	if node.has_method("disable_for_drag_preview"):
		node.call("disable_for_drag_preview")
	if node is Control:
		var control := node as Control
		control.mouse_filter = Control.MOUSE_FILTER_IGNORE
		control.focus_mode = Control.FOCUS_NONE
		control.tooltip_text = ""
	for child in node.get_children():
		_ignore_pointer(child)
