extends Control

const GAP := 12.0
var vertical_reference: Control
var file_row: Control


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(_arrange)
	_arrange.call_deferred()


func _arrange() -> void:
	var targets: Array[Control] = []
	var natural := Vector2(230, 232)
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
	var extent := Vector2(natural.x * columns + GAP * (columns - 1),
		natural.y * row_count + GAP * (row_count - 1.0))
	var factor := minf(1.0, minf(size.x / extent.x, size.y / extent.y))
	var origin := (size - extent * factor) * 0.5
	for index in count:
		var column := index % 2
		var row := float(index / 2) + (stagger if column == 1 else 0.0)
		var target := targets[index]
		target.size = natural
		target.pivot_offset = Vector2.ZERO
		target.scale = Vector2.ONE * factor
		target.position = origin + Vector2(column * (natural.x + GAP), row * (natural.y + GAP)) * factor
	_align_portraits.call_deferred()


func _align_portraits() -> void:
	if not is_instance_valid(vertical_reference) or not is_inside_tree():
		return
	# Larger encounters retain their taller formation in the open right field.
	if get_child_count() > 2:
		_avoid_files()
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
	_avoid_files()


func _avoid_files() -> void:
	if not is_instance_valid(file_row):
		return
	var files := file_row.get_global_rect()
	var shift := 0.0
	for target in get_children():
		var bounds: Rect2 = target.get_global_rect()
		# Include the attack intent drawn above the enemy button.
		bounds.position.y -= 20.0 * target.scale.y
		bounds.size.y += 20.0 * target.scale.y
		if bounds.position.x < files.end.x + GAP and bounds.end.x > files.position.x - GAP \
				and bounds.position.y < files.end.y + GAP and bounds.end.y > files.position.y:
			shift = maxf(shift, files.end.y + GAP - bounds.position.y)
	for target in get_children():
		target.position.y += shift
