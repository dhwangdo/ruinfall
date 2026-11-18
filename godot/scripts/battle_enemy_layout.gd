extends Control

const GAP := 8.0
var vertical_reference: Control
var files_reference: Control


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(_arrange)
	_arrange.call_deferred()


func _arrange() -> void:
	# Use the actual visible file group, rather than reserving the whole
	# maximum file viewport when only a few files are present.
	var board := get_parent() as Control
	if is_instance_valid(board) and is_instance_valid(files_reference) and files_reference.size.x > 0:
		var file_end := files_reference.get_global_rect().end.x - board.global_position.x
		var file_clip_end := board.size.x - clampf(board.size.x * 0.25, 200.0, 320.0) - 36.0
		var left := maxf(board.size.x * 0.5, minf(file_end, file_clip_end) + 24.0)
		position.x = left
		size.x = maxf(1.0, board.size.x - left - 12.0)
	var targets: Array[Control] = []
	var natural := Vector2(176, 232)
	for child in get_children():
		if child is Control:
			targets.append(child)
			natural = natural.max(child.get_combined_minimum_size())
	if targets.is_empty() or size.x <= 0 or size.y <= 0:
		return
	var count := targets.size()
	var rows := ceili(float(count) / 2.0)
	var columns := 1 if count == 1 else 2
	# The back column sits halfway between the front column's rows.
	var stagger := 0.2 if count == 2 else 0.5
	var row_count := float(rows) + (stagger if count % 2 == 0 and count > 1 else 0.0)
	var column_step := minf(natural.x, 156.0) + GAP
	var row_step := natural.y * 0.80 + GAP
	var extent := Vector2(natural.x + column_step * (columns - 1),
		natural.y + row_step * (row_count - 1.0))
	var factor := minf(1.0, minf(size.x / extent.x, size.y / extent.y))
	var origin := (size - extent * factor) * 0.5
	for index in count:
		var column := index % 2
		var row := float(index / 2) + (stagger if column == 1 else 0.0)
		var target := targets[index]
		target.size = natural
		target.pivot_offset = Vector2.ZERO
		target.scale = Vector2.ONE * factor
		target.position = origin + Vector2(column * column_step, row * row_step) * factor
	_align_portraits.call_deferred()


func _align_portraits() -> void:
	if not is_instance_valid(vertical_reference) or not is_inside_tree():
		return
	# Larger encounters retain their taller formation in the open right field.
	if get_child_count() > 2:
		return
	var top := INF
	var bottom := -INF
	for target in get_children():
		var portrait: Control = target.get_meta("enemy_portrait", null)
		if is_instance_valid(portrait):
			var y := portrait.get_global_rect().get_center().y
			top = minf(top, y)
			bottom = maxf(bottom, y)
	if top == INF:
		return
	var delta := vertical_reference.get_global_rect().get_center().y - (top + bottom) * 0.5
	for target in get_children():
		target.position.y += delta
