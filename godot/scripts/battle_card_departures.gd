extends Control
class_name BattleCardDepartures

signal finished(cancelled: bool)

const PLAY_DURATION_MS := 170.0
const DISCARD_DURATION_MS := 320.0
const DISCARD_STAGGER_MS := 42.0
const PLAY_EASING := Vector4(0.24, 0.78, 0.3, 1.0)
const DISCARD_EASING := Vector4(0.55, 0.05, 0.82, 0.38)

var _items: Array[Dictionary] = []
var _card_builder: Callable
var _destination_rect := Rect2()
var _mode := ""
var _reduced_motion := false
var _flights: Array[Dictionary] = []
var _held_sources: Array[Dictionary] = []
var _elapsed_ms := 0.0
var _running := false
var _completed := true


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process(false)


func configure(items: Array, card_builder: Callable, destination_rect: Rect2, mode: String,
		reduced_motion := false) -> void:
	if _running:
		cancel()
	else:
		_restore_held_sources()
	_items.clear()
	for item in items:
		if item is Dictionary:
			_items.append(item.duplicate())
	_card_builder = card_builder
	_destination_rect = destination_rect
	_mode = mode
	_reduced_motion = reduced_motion


func play() -> void:
	if _running:
		cancel()
	else:
		_restore_held_sources()
	_flights.clear()
	_elapsed_ms = 0.0
	_completed = false
	_running = true
	if _reduced_motion or not _card_builder.is_valid() or not ["play", "discard"].has(_mode):
		_finish(false)
		return

	var parent_inverse := get_global_transform_with_canvas().affine_inverse()
	var target_center := parent_inverse * (_destination_rect.position + _destination_rect.size * 0.5)
	for index in _items.size():
		var item := _items[index]
		var source := item.get("source") as Control
		if not is_instance_valid(source) or not source.is_inside_tree() or not source.is_visible_in_tree() \
				or source.size.x <= 0.0 or source.size.y <= 0.0:
			continue

		var ghost := _card_builder.call(item.get("card")) as Control
		if not is_instance_valid(ghost):
			continue
		ghost.name = "BattleCardDepartureGhost_%d" % index
		ghost.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
		ghost.size = source.size
		ghost.pivot_offset = source.pivot_offset
		ghost.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ghost.focus_mode = Control.FOCUS_NONE
		_add_child_ignore_mouse(ghost)

		var from_pose: Transform2D = parent_inverse * source.get_global_transform_with_canvas()
		_set_control_pose(ghost, from_pose)
		var center := from_pose * (source.size * 0.5)
		var to_pose: Transform2D
		if _mode == "play":
			to_pose = _pose_at_center(source.size, target_center, deg_to_rad(-4.0), Vector2(0.78, 0.78))
		else:
			# The browser's discard flight exits rightward; the supplied rect is the
			# caller's viewport discard destination, matching that off-screen endpoint.
			var discard_center := target_center
			if _destination_rect.size == Vector2.ZERO:
				discard_center = center + Vector2(get_viewport_rect().size.x * 0.78, -24.0)
			var source_angle := from_pose.x.angle() + deg_to_rad(14.0)
			var source_scale := Vector2(from_pose.x.length(), from_pose.y.length())
			to_pose = _pose_at_center(source.size, discard_center, source_angle, source_scale)

		var original_visibility := source.visible
		var original_modulate := source.modulate
		_held_sources.append({"source": source, "original_visibility": original_visibility,
			"original_modulate": original_modulate})
		var hidden_modulate := original_modulate
		hidden_modulate.a = 0.0
		source.modulate = hidden_modulate
		ghost.modulate.a = 1.0
		_flights.append({
			"ghost": ghost,
			"source": source,
			"original_visibility": original_visibility,
			"original_modulate": original_modulate,
			"from": from_pose,
			"to": to_pose,
			"duration": PLAY_DURATION_MS if _mode == "play" else DISCARD_DURATION_MS,
			"delay": float(item.get("delay_ms", float(index) * DISCARD_STAGGER_MS if _mode == "discard" else 0.0)),
		})

	if _flights.is_empty():
		_finish(false)
		return
	set_process(true)


func cancel() -> void:
	for flight in _flights:
		_remove_ghost(flight)
	_flights.clear()
	_restore_held_sources()
	if _running:
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
		var duration: float = flight["duration"]
		var progress := clampf(local_elapsed / duration, 0.0, 1.0)
		var eased := _bezier_ease(progress, PLAY_EASING if _mode == "play" else DISCARD_EASING)
		var ghost := flight["ghost"] as Control
		if is_instance_valid(ghost):
			_set_control_pose(ghost, _interpolate_pose(flight["from"], flight["to"], eased))
			ghost.modulate.a = 1.0 - eased
		if progress >= 1.0:
			_remove_ghost(flight)
			_flights.remove_at(index)
	if _flights.is_empty():
		_finish(false)


func _pose_at_center(card_size: Vector2, center: Vector2, angle: float, scale_value: Vector2) -> Transform2D:
	var basis := Transform2D(angle, scale_value, 0.0, Vector2.ZERO)
	return Transform2D(basis.x, basis.y, center - basis.basis_xform(card_size * 0.5))


func _interpolate_pose(from_pose: Transform2D, to_pose: Transform2D, amount: float) -> Transform2D:
	return Transform2D(from_pose.x.lerp(to_pose.x, amount), from_pose.y.lerp(to_pose.y, amount),
		from_pose.origin.lerp(to_pose.origin, amount))


func _set_control_pose(control: Control, pose: Transform2D) -> void:
	control.position = pose.origin - control.pivot_offset + pose.basis_xform(control.pivot_offset)
	control.rotation = pose.x.angle()
	var y_sign := -1.0 if pose.determinant() < 0.0 else 1.0
	control.scale = Vector2(pose.x.length(), pose.y.length() * y_sign)


func _bezier_ease(progress: float, easing: Vector4) -> float:
	var x := clampf(progress, 0.0, 1.0)
	var low := 0.0
	var high := 1.0
	for _iteration in 14:
		var t := (low + high) * 0.5
		if _cubic(0.0, easing.x, easing.z, 1.0, t) < x:
			low = t
		else:
			high = t
	return _cubic(0.0, easing.y, easing.w, 1.0, (low + high) * 0.5)


func _cubic(a: float, b: float, c: float, d: float, t: float) -> float:
	var inverse := 1.0 - t
	return inverse * inverse * inverse * a + 3.0 * inverse * inverse * t * b \
		+ 3.0 * inverse * t * t * c + t * t * t * d


func _add_child_ignore_mouse(ghost: Control) -> void:
	ghost.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_set_descendant_mouse_ignore(ghost)
	add_child(ghost)


func _set_descendant_mouse_ignore(root: Control) -> void:
	for child in root.get_children():
		if child is Control:
			child.mouse_filter = Control.MOUSE_FILTER_IGNORE
			_set_descendant_mouse_ignore(child)


func _remove_ghost(flight: Dictionary) -> void:
	var ghost := flight.get("ghost") as Control
	if is_instance_valid(ghost):
		if ghost.get_parent() == self:
			remove_child(ghost)
		ghost.queue_free()


func _restore_held_sources() -> void:
	for held in _held_sources:
		var source := held.get("source") as Control
		if is_instance_valid(source):
			source.visible = bool(held["original_visibility"])
			source.modulate = held["original_modulate"]
	_held_sources.clear()


func _finish(cancelled: bool) -> void:
	if _completed:
		return
	_completed = true
	_running = false
	set_process(false)
	finished.emit(cancelled)


func _exit_tree() -> void:
	if _running:
		for flight in _flights:
			_remove_ghost(flight)
		_flights.clear()
		_restore_held_sources()
		_finish(true)
	else:
		_restore_held_sources()
