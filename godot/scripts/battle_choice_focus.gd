extends Control

const PROMPT_FONT := preload("res://assets/fonts/PretendardVariable700.tres")
const DIM_COLOR := Color(0.025, 0.035, 0.04, 0.76)
const PROMPT_COLOR := Color("#fff5c7")
const FOCUS_Z_INDEX := 90
const TARGET_Z_INDEX := 91
const PROMPT_Z_INDEX := 127

var interaction_controls: Array[Control] = []
var visual_controls: Array[Control] = []
var obstacle_controls: Array[Control] = []
var prompt_text := ""
var prompt_above_focus := false
var pointer_provider: Callable
var _dimmer: ColorRect
var _prompt: Label
var _last_hole := Rect2(-1, -1, -1, -1)
var _last_size := Vector2(-1, -1)
var _last_prompt_rect := Rect2(-1, -1, -1, -1)
var _original_z: Dictionary = {}


func configure(interactions: Array[Control], visuals: Array[Control], text: String,
		above_focus: bool, obstacles: Array[Control]) -> void:
	interaction_controls = interactions
	visual_controls = visuals
	obstacle_controls = obstacles
	prompt_text = text
	prompt_above_focus = above_focus
	visible = not prompt_text.is_empty()
	queue_redraw()


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	z_as_relative = false
	z_index = FOCUS_Z_INDEX
	mouse_filter = Control.MOUSE_FILTER_STOP
	_dimmer = ColorRect.new()
	_dimmer.name = "BattleChoiceDimmer"
	_dimmer.color = DIM_COLOR
	_dimmer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_dimmer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_dimmer)
	_prompt = Label.new()
	_prompt.name = "BattleChoiceFocusPrompt"
	_prompt.z_as_relative = false
	_prompt.z_index = PROMPT_Z_INDEX
	_prompt.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_prompt.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_prompt.add_theme_font_size_override("font_size", 20)
	_prompt.add_theme_font_override("font", PROMPT_FONT)
	_prompt.add_theme_color_override("font_color", PROMPT_COLOR)
	_prompt.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.95))
	_prompt.add_theme_constant_override("shadow_offset_x", 2)
	_prompt.add_theme_constant_override("shadow_offset_y", 2)
	add_child(_prompt)
	_raise_visuals()
	_update_dimmer_geometry()


func _exit_tree() -> void:
	for id in _original_z:
		var saved: Dictionary = _original_z[id]
		var control: Control = saved["control"]
		if is_instance_valid(control):
			control.z_as_relative = bool(saved["z_as_relative"])
			control.z_index = int(saved["z_index"])
	_original_z.clear()


func _process(_delta: float) -> void:
	if not visible:
		return
	_update_dimmer_geometry()
	_layout_prompt()
	var pointer: Vector2 = pointer_provider.call() if pointer_provider.is_valid() \
		else get_global_transform_with_canvas() * get_local_mouse_position()
	for control in interaction_controls:
		if is_instance_valid(control) and control.has_method("contains_choice_point"):
			control.call("set_choice_hovered", control.call("contains_choice_point", pointer))


func _has_point(point: Vector2) -> bool:
	var global_point: Vector2 = get_global_transform_with_canvas() * point
	for control in interaction_controls:
		if not is_instance_valid(control) or not control.is_visible_in_tree():
			continue
		if control.has_method("contains_choice_point"):
			if control.call("contains_choice_point", global_point):
				return false
			continue
		var local_point: Vector2 = control.get_global_transform_with_canvas().affine_inverse() * global_point
		if Rect2(Vector2.ZERO, control.size).has_point(local_point):
			return false
	return true


func _raise_visuals() -> void:
	for control in visual_controls:
		if not is_instance_valid(control):
			continue
		var id := control.get_instance_id()
		if not _original_z.has(id):
			_original_z[id] = {
				"control": control,
				"z_index": control.z_index,
				"z_as_relative": control.z_as_relative,
			}
		control.z_as_relative = false
		control.z_index = TARGET_Z_INDEX


func _update_dimmer_geometry() -> void:
	var hole := Rect2()
	var has_hole := false
	for control in interaction_controls:
		if not is_instance_valid(control) or not control.is_visible_in_tree():
			continue
		var rect := _control_rect_in_overlay(control)
		if rect.size.x <= 0.0 or rect.size.y <= 0.0:
			continue
		var clipped := rect.intersection(Rect2(Vector2.ZERO, size))
		if clipped.size.x <= 0.0 or clipped.size.y <= 0.0:
			continue
		hole = clipped if not has_hole else hole.merge(clipped)
		has_hole = true
	if not has_hole:
		hole = Rect2()
	if hole == _last_hole and size == _last_size:
		return
	_last_hole = hole
	_last_size = size


func _layout_prompt() -> void:
	_prompt.text = prompt_text
	var text_width := PROMPT_FONT.get_string_size(prompt_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 20).x
	var prompt_size := Vector2(minf(size.x, text_width + 24.0), 40.0)
	var x := (size.x - prompt_size.x) * 0.5
	var above := _last_hole.position.y - prompt_size.y - 12.0
	var below := _last_hole.end.y + 12.0
	var preferred := above if prompt_above_focus else below
	var alternate := below if prompt_above_focus else above
	var candidates: Array[float] = [preferred, alternate, (size.y - prompt_size.y) * 0.5, 0.0, size.y - prompt_size.y]
	for control in obstacle_controls:
		if not is_instance_valid(control) or not control.is_visible_in_tree():
			continue
		var rect := _control_rect_in_overlay(control)
		candidates.append(rect.position.y - prompt_size.y - 8.0)
		candidates.append(rect.end.y + 8.0)
	var chosen_y := -1.0
	for candidate in candidates:
		var y := clampf(candidate, 0.0, maxf(0.0, size.y - prompt_size.y))
		var prompt_rect := Rect2(Vector2(x, y), prompt_size)
		var clear := true
		for control in obstacle_controls:
			if is_instance_valid(control) and control.is_visible_in_tree() \
				and prompt_rect.intersects(_control_rect_in_overlay(control).grow(3.0)):
				clear = false
				break
		if clear:
			chosen_y = y
			break
	if chosen_y < 0.0:
		_prompt.visible = false
		return
	_prompt.visible = true
	_prompt.position = Vector2(x, chosen_y)
	_prompt.size = prompt_size
	_last_prompt_rect = Rect2(_prompt.position, _prompt.size)


func _control_rect_in_overlay(control: Control) -> Rect2:
	var transform := get_global_transform_with_canvas().affine_inverse() * control.get_global_transform_with_canvas()
	var corners := [Vector2.ZERO, Vector2(control.size.x, 0), control.size, Vector2(0, control.size.y)]
	var first: Vector2 = transform * corners[0]
	var left := first.x
	var right := first.x
	var top := first.y
	var bottom := first.y
	for corner in corners.slice(1):
		var point: Vector2 = transform * corner
		left = minf(left, point.x)
		right = maxf(right, point.x)
		top = minf(top, point.y)
		bottom = maxf(bottom, point.y)
	return Rect2(Vector2(left, top), Vector2(right - left, bottom - top))
