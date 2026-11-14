extends Control
class_name BattleCardToPlayer

signal finished(cancelled: bool)

const DEFAULT_DURATION_MS := 820.0
const EASING := Vector4(0.18, 0.72, 0.2, 1.0)

var _items: Array[Dictionary] = []
var _card_builder: Callable
var _destination_rect := Rect2()
var _duration_ms := DEFAULT_DURATION_MS
var _reduced_motion := false
var _flights: Array[Dictionary] = []
var _elapsed_ms := 0.0
var _running := false
var _completed := true


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process(false)


func configure(items: Array, card_builder: Callable, destination_rect: Rect2,
		duration_ms: float = DEFAULT_DURATION_MS, reduced_motion: bool = false) -> void:
	if _running:
		cancel()
	_clear_ghosts()
	_items.clear()
	for item in items:
		if item is Dictionary:
			_items.append(item.duplicate(false))
	_card_builder = card_builder
	_destination_rect = destination_rect
	_duration_ms = maxf(0.0, duration_ms)
	_reduced_motion = reduced_motion


func play() -> void:
	if _running:
		cancel()
	_clear_ghosts()
	_flights.clear()
	_elapsed_ms = 0.0
	_completed = false
	_running = true
	if _reduced_motion or not _card_builder.is_valid() or _destination_rect.size.x <= 0.0 \
			or _destination_rect.size.y <= 0.0:
		_finish(false)
		return

	var parent_inverse := get_global_transform_with_canvas().affine_inverse()
	var destination_center := parent_inverse * (_destination_rect.position + _destination_rect.size * 0.5)
	for index in _items.size():
		var item := _items[index]
		var source := item.get("source") as Control
		if not is_instance_valid(source) or not source.is_inside_tree() or not source.is_visible_in_tree() \
				or source.size.x <= 0.0 or source.size.y <= 0.0:
			continue

		var ghost := _card_builder.call(item.get("card")) as Control
		if not is_instance_valid(ghost) or ghost == source:
			continue
		ghost.name = "BattleCardToPlayerGhost_%d" % index
		ghost.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
		ghost.size = source.size
		ghost.pivot_offset = source.pivot_offset
		_set_descendant_inert(ghost)
		add_child(ghost)

		var from_pose: Transform2D = parent_inverse * source.get_global_transform_with_canvas()
		_set_control_pose(ghost, from_pose)
		ghost.modulate.a = 0.92
		var to_pose := _pose_at_center(source.size, destination_center)
		_flights.append({
			"ghost": ghost,
			"source": source,
			"from": from_pose,
			"to": to_pose,
			"duration": maxf(0.001, float(item.get("duration_ms", _duration_ms))),
			"delay": maxf(0.0, float(item.get("delay_ms", 0.0))),
		})

	if _flights.is_empty():
		_finish(false)
		return
	set_process(true)


func cancel() -> void:
	if not _running:
		return
	_clear_ghosts()
	_flights.clear()
	_finish(true)


func _process(delta: float) -> void:
	if not _running:
		return
	_elapsed_ms += delta * 1000.0
	for index in range(_flights.size() - 1, -1, -1):
		var flight := _flights[index]
		var local_elapsed := _elapsed_ms - float(flight["delay"])
		if local_elapsed < 0.0:
			continue
		var duration := float(flight["duration"])
		var progress := clampf(local_elapsed / duration, 0.0, 1.0)
		var eased := _bezier_ease(progress)
		var ghost := flight["ghost"] as Control
		if is_instance_valid(ghost):
			_set_control_pose(ghost, _interpolate_pose(flight["from"], flight["to"], eased))
			ghost.modulate.a = lerpf(0.92, 1.0, eased)
		if progress >= 1.0:
			_remove_ghost(flight)
			_flights.remove_at(index)
	if _flights.is_empty():
		_finish(false)


func _pose_at_center(card_size: Vector2, center: Vector2) -> Transform2D:
	return Transform2D(0.0, Vector2.ONE, 0.0, center - card_size * 0.5)


func _interpolate_pose(from_pose: Transform2D, to_pose: Transform2D, amount: float) -> Transform2D:
	return Transform2D(
		from_pose.x.lerp(to_pose.x, amount),
		from_pose.y.lerp(to_pose.y, amount),
		from_pose.origin.lerp(to_pose.origin, amount)
	)


func _set_control_pose(control: Control, pose: Transform2D) -> void:
	control.position = pose.origin - control.pivot_offset + pose.basis_xform(control.pivot_offset)
	control.rotation = pose.x.angle()
	var y_sign := -1.0 if pose.determinant() < 0.0 else 1.0
	control.scale = Vector2(pose.x.length(), pose.y.length() * y_sign)


func _bezier_ease(progress: float) -> float:
	var x := clampf(progress, 0.0, 1.0)
	var low := 0.0
	var high := 1.0
	for _iteration in 14:
		var t := (low + high) * 0.5
		if _cubic(0.0, EASING.x, EASING.z, 1.0, t) < x:
			low = t
		else:
			high = t
	return _cubic(0.0, EASING.y, EASING.w, 1.0, (low + high) * 0.5)


func _cubic(a: float, b: float, c: float, d: float, t: float) -> float:
	var inverse := 1.0 - t
	return inverse * inverse * inverse * a + 3.0 * inverse * inverse * t * b \
		+ 3.0 * inverse * t * t * c + t * t * t * d


func _set_descendant_inert(control: Control) -> void:
	control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	control.focus_mode = Control.FOCUS_NONE
	for child in control.get_children():
		if child is Control:
			_set_descendant_inert(child)


func _remove_ghost(flight: Dictionary) -> void:
	var ghost := flight.get("ghost") as Control
	if is_instance_valid(ghost):
		if ghost.get_parent() == self:
			remove_child(ghost)
		ghost.queue_free()


func _clear_ghosts() -> void:
	for flight in _flights:
		_remove_ghost(flight)


func _finish(cancelled: bool) -> void:
	if _completed:
		return
	_completed = true
	_running = false
	set_process(false)
	finished.emit(cancelled)


func _exit_tree() -> void:
	if _running:
		_clear_ghosts()
		_flights.clear()
		_finish(true)
	else:
		_clear_ghosts()
