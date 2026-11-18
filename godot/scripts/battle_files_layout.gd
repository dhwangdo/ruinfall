extends Control

signal layout_changed

const MIN_SCALE := 0.60
const SIDE_PADDING := 12.0
const VERTICAL_PADDING := 20.0
const ACTOR_GAP := 8.0

var row: HBoxContainer
var avoid_controls: Array[Control] = []
var _layout_queued := false


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	resized.connect(_queue_layout)
	get_parent().resized.connect(_queue_layout)
	if is_instance_valid(row):
		row.minimum_size_changed.connect(_queue_layout)
	for control in avoid_controls:
		control.resized.connect(_queue_layout)
	_queue_layout()


func _queue_layout() -> void:
	if _layout_queued or not is_inside_tree():
		return
	_layout_queued = true
	_arrange.call_deferred()


func _arrange() -> void:
	_layout_queued = false
	if not is_instance_valid(row) or not is_inside_tree():
		return
	var viewport := get_parent() as Control
	var natural := row.get_combined_minimum_size()
	if viewport.size.x <= 1.0 or viewport.size.y <= 1.0 or natural.x <= 0.0 or natural.y <= 0.0:
		return
	# Leave one extra pixel to avoid scrollbars from fractional layout rounding.
	var usable := viewport.size - Vector2(SIDE_PADDING * 2.0 + 1.0, VERTICAL_PADDING * 2.0 + 1.0)
	var factor := clampf(minf(usable.x / natural.x, usable.y / natural.y), MIN_SCALE, 1.0)
	# Use the free space above actors. Shrink only enough to clear an actual actor
	# horizontally OR vertically, instead of reserving the whole side columns.
	var horizontal_center := viewport.size.x * 0.5
	var inverse := get_global_transform_with_canvas().affine_inverse()
	for control in avoid_controls:
		if not is_instance_valid(control) or not control.is_visible_in_tree() or control.size.is_zero_approx():
			continue
		var actor: Rect2 = inverse * control.get_global_transform_with_canvas() * Rect2(Vector2.ZERO, control.size)
		var horizontal_gap := horizontal_center - actor.end.x - ACTOR_GAP \
			if actor.get_center().x < horizontal_center else actor.position.x - horizontal_center - ACTOR_GAP
		var horizontal_limit := maxf(0.0, horizontal_gap * 2.0 / natural.x)
		var vertical_limit := maxf(0.0, (actor.position.y - VERTICAL_PADDING - ACTOR_GAP) / natural.y)
		factor = maxf(MIN_SCALE, minf(factor, maxf(horizontal_limit, vertical_limit)))
	var visual := natural * factor
	custom_minimum_size = visual + Vector2(SIDE_PADDING * 2.0, VERTICAL_PADDING * 2.0)
	row.size = natural
	row.pivot_offset = Vector2.ZERO
	row.scale = Vector2.ONE * factor
	row.position = Vector2(SIDE_PADDING, VERTICAL_PADDING)
	layout_changed.emit()
