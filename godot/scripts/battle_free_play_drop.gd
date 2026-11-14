extends RefCounted

const PLAY_HAND_HEIGHT_FRACTION := 0.40
const CANCEL_HAND_HEIGHT_FRACTION := 0.82

var _pass_through_controls: Array[Control] = []


func begin(root: Control) -> void:
	finish()
	_make_children_pass_through(root)


func _make_children_pass_through(parent: Node) -> void:
	for child in parent.get_children():
		if child is Control and child.mouse_filter == Control.MOUSE_FILTER_STOP:
			_pass_through_controls.append(child)
			child.mouse_filter = Control.MOUSE_FILTER_PASS
		_make_children_pass_through(child)


func finish() -> void:
	for control in _pass_through_controls:
		if is_instance_valid(control):
			control.mouse_filter = Control.MOUSE_FILTER_STOP
	_pass_through_controls.clear()


static func can_drop(point: Vector2, hand: Control, files: Array[Control], payload: Dictionary,
		validator: Callable, blocked_controls: Array[Control] = []) -> bool:
	if str(payload.get("kind", "")) != "battle-card" or str(payload.get("source", "")) != "hand" \
		or not in_play_band(hand, point) \
		or not bool(validator.call(payload, "center", -1)):
		return false
	# A valid solitaire destination always wins over the outside-hand action.
	for index in range(files.size()):
		var file := files[index]
		if is_instance_valid(file) and contains_point(file, point) \
			and bool(validator.call(payload, "file", index)):
			return false
	for control in blocked_controls:
		if contains_point(control, point):
			return false
	return true


static func in_play_band(hand: Control, point: Vector2) -> bool:
	if not is_instance_valid(hand):
		return false
	var local := hand.get_global_transform_with_canvas().affine_inverse() * point
	return local.y < hand.size.y * PLAY_HAND_HEIGHT_FRACTION


static func in_cancel_band(hand: Control, point: Vector2) -> bool:
	if not is_instance_valid(hand):
		return false
	var local := hand.get_global_transform_with_canvas().affine_inverse() * point
	return local.y >= hand.size.y * CANCEL_HAND_HEIGHT_FRACTION


static func contains_point(control: Control, point: Vector2) -> bool:
	if not is_instance_valid(control) or not control.is_visible_in_tree():
		return false
	var local_point: Vector2 = control.get_global_transform_with_canvas().affine_inverse() * point
	var hit := Rect2(Vector2.ZERO, control.size).has_point(local_point)
	if control.has_method("contains_battle_drop_local_point"):
		hit = bool(control.call("contains_battle_drop_local_point", local_point))
	if hit:
		return true
	for child in control.get_children():
		if child is Control and contains_point(child, point):
			return true
	return false


static func contains_control_children(control: Control, point: Vector2) -> bool:
	if not is_instance_valid(control):
		return false
	for child in control.get_children():
		if child is Control and contains_point(child, point):
			return true
	return false
