extends Control
class_name BattleCardFlights

signal finished(cancelled: bool)

const DRAW_DURATION_MS := 300.0
const TOKEN_DURATION_MS := 820.0
const STAGGER_MS := 50.0
const DRAW_EASING := Vector4(0.2, 0.72, 0.25, 1.0)

var _flight_items: Array[Dictionary] = []
var _card_builder: Callable
var _reduced_motion := false
var _flights: Array[Dictionary] = []
var _elapsed_ms := 0.0
var _running := false
var _completed := true


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process(false)


func configure(items: Array, card_builder: Callable, reduced_motion := false) -> void:
	if _running:
		cancel()
	_flight_items.clear()
	for item in items:
		if item is Dictionary:
			_flight_items.append(item.duplicate())
	_card_builder = card_builder
	_reduced_motion = reduced_motion


func play() -> void:
	if _running:
		cancel()
	_flights.clear()
	_elapsed_ms = 0.0
	_completed = false
	_running = true
	if _reduced_motion or not _card_builder.is_valid():
		_finish(false)
		return

	for index in _flight_items.size():
		var item := _flight_items[index]
		var target := item.get("target") as Control
		var source_rect: Rect2 = item.get("source_rect", Rect2())
		if not is_instance_valid(target) or not target.is_inside_tree() or not target.is_visible_in_tree() \
				or target.get_global_rect().size.x <= 0.0 or target.get_global_rect().size.y <= 0.0 \
				or source_rect.size.x <= 0.0 or source_rect.size.y <= 0.0:
			continue

		var ghost := _card_builder.call(item.get("card")) as Control
		if not is_instance_valid(ghost):
			continue
		ghost.name = "BattleCardFlightGhost_%d" % index
		ghost.mouse_filter = Control.MOUSE_FILTER_IGNORE
		ghost.focus_mode = Control.FOCUS_NONE
		ghost.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
		_add_child_ignore_mouse(ghost)
		ghost.size = target.size

		var parent_transform := get_global_transform_with_canvas()
		var parent_inverse := parent_transform.affine_inverse()
		var target_transform := parent_inverse * target.get_global_transform_with_canvas()
		var source_center_global := source_rect.position + source_rect.size * 0.5
		var source_center := parent_inverse * source_center_global
		# The source pose is absolute; only the final pose uses the hand fan transform.
		var start_basis_transform := Transform2D(deg_to_rad(-3.0), Vector2(0.94, 0.94), 0.0, Vector2.ZERO)
		var start_transform := Transform2D(
			start_basis_transform.x,
			start_basis_transform.y,
			source_center - start_basis_transform.basis_xform(target.size * 0.5)
		)
		_set_control_pose(ghost, start_transform)
		ghost.modulate.a = 0.8
		var original_visibility := target.visible
		var original_modulate := target.modulate
		var hidden_modulate := original_modulate
		hidden_modulate.a = 0.0
		target.modulate = hidden_modulate
		_flights.append({
			"ghost": ghost,
			"target": target,
			"original_visibility": original_visibility,
			"original_modulate": original_modulate,
			"from": start_transform,
			"arc": _arc_transform(start_transform, target_transform, target.size),
			"to": target_transform,
			"duration": TOKEN_DURATION_MS if bool(item.get("enemy_token", false)) else DRAW_DURATION_MS,
			"delay": float(item.get("delay_ms", float(index) * STAGGER_MS)),
			"enemy_token": bool(item.get("enemy_token", false)),
		})

	if _flights.is_empty():
		_finish(false)
		return
	set_process(true)


func cancel() -> void:
	if not _running:
		return
	for flight in _flights:
		_restore_flight(flight)
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
		var duration: float = flight["duration"]
		var progress := clampf(local_elapsed / duration, 0.0, 1.0)
		var eased_progress := _bezier_ease(progress)
		var eased_transform: Transform2D
		if bool(flight["enemy_token"]):
			eased_transform = _token_transform(flight, eased_progress)
		else:
			eased_transform = _interpolate_pose(flight["from"], flight["to"], eased_progress)
		var ghost := flight["ghost"] as Control
		if is_instance_valid(ghost):
			_set_control_pose(ghost, eased_transform)
			ghost.modulate.a = _token_opacity(eased_progress) if bool(flight["enemy_token"]) \
				else lerpf(0.8, 1.0, eased_progress)
		if progress >= 1.0:
			_restore_flight(flight)
			_flights.remove_at(index)
	if _flights.is_empty():
		_finish(false)


func _token_transform(flight: Dictionary, eased_progress: float) -> Transform2D:
	if eased_progress <= 0.18:
		return flight["from"]
	if eased_progress <= 0.64:
		var segment := (eased_progress - 0.18) / 0.46
		return _interpolate_pose(flight["from"], flight["arc"], segment)
	var final_segment := (eased_progress - 0.64) / 0.36
	return _interpolate_pose(flight["arc"], flight["to"], final_segment)


func _token_opacity(eased_progress: float) -> float:
	if eased_progress <= 0.18:
		return lerpf(0.8, 0.92, eased_progress / 0.18)
	if eased_progress <= 0.64:
		return lerpf(0.92, 1.0, (eased_progress - 0.18) / 0.46)
	return 1.0


func _arc_transform(from_pose: Transform2D, to_pose: Transform2D, card_size: Vector2) -> Transform2D:
	var from_center := from_pose * (card_size * 0.5)
	var to_center := to_pose * (card_size * 0.5)
	var center := from_center.lerp(to_center, 0.58) + Vector2.UP * 90.0
	var basis := Transform2D(deg_to_rad(7.0), Vector2.ONE, 0.0, Vector2.ZERO)
	return Transform2D(basis.x, basis.y, center - basis.basis_xform(card_size * 0.5))


func _interpolate_pose(from_pose: Transform2D, to_pose: Transform2D, amount: float) -> Transform2D:
	return Transform2D(
		from_pose.x.lerp(to_pose.x, amount),
		from_pose.y.lerp(to_pose.y, amount),
		from_pose.origin.lerp(to_pose.origin, amount)
	)


func _set_control_pose(control: Control, pose: Transform2D) -> void:
	control.position = pose.origin
	control.rotation = pose.x.angle()
	var y_sign := -1.0 if pose.determinant() < 0.0 else 1.0
	control.scale = Vector2(pose.x.length(), pose.y.length() * y_sign)


func _bezier_ease(progress: float) -> float:
	var x := clampf(progress, 0.0, 1.0)
	var low := 0.0
	var high := 1.0
	for _iteration in 14:
		var t := (low + high) * 0.5
		if _cubic(0.0, DRAW_EASING.x, DRAW_EASING.z, 1.0, t) < x:
			low = t
		else:
			high = t
	return _cubic(0.0, DRAW_EASING.y, DRAW_EASING.w, 1.0, (low + high) * 0.5)


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


func _restore_flight(flight: Dictionary) -> void:
	var target := flight.get("target") as Control
	if is_instance_valid(target):
		target.visible = bool(flight["original_visibility"])
		target.modulate = flight["original_modulate"]
	var ghost := flight.get("ghost") as Control
	if is_instance_valid(ghost):
		if ghost.get_parent() == self:
			remove_child(ghost)
		ghost.queue_free()


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
			_restore_flight(flight)
		_flights.clear()
		_finish(true)
