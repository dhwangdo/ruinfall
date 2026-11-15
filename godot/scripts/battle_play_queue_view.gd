extends Control

const CARD_SIZE := Vector2(149.6, 210.1)
const STACK_STEP := Vector2(22, 22)
const ADVANCE_SECONDS := 0.10
var cards: Dictionary = {}
var motions: Dictionary = {}


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	z_index = 109


func add_card(game, card: Dictionary, origin: Dictionary, fallback: Control) -> void:
	var id := int(card["id"])
	var visual: Control = game._card_widget(card, false, false, false)
	visual.mouse_filter = Control.MOUSE_FILTER_IGNORE
	game._set_child_controls_mouse_ignored(visual)
	visual.size = CARD_SIZE
	visual.pivot_offset = Vector2.ZERO
	add_child(visual)
	var pose := Transform2D.IDENTITY
	if origin.has("pose"):
		pose = origin["pose"]
	elif is_instance_valid(fallback):
		pose = fallback.get_global_transform_with_canvas()
	pose = get_global_transform_with_canvas().affine_inverse() * pose
	visual.position = pose.origin
	visual.rotation = pose.get_rotation()
	visual.scale = pose.get_scale()
	cards[id] = visual


func arrange(order: Array[int], active_id: int) -> void:
	var front := size * 0.5 - CARD_SIZE * 0.5
	for index in order.size():
		var id := order[index]
		var visual: Control = cards.get(id)
		if not is_instance_valid(visual) or id == active_id:
			continue
		_stop(id)
		visual.z_index = -index
		var tween := create_tween().set_parallel(true).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tween.tween_property(visual, "position", front + STACK_STEP * index, ADVANCE_SECONDS)
		tween.tween_property(visual, "rotation", 0.0, ADVANCE_SECONDS)
		tween.tween_property(visual, "scale", Vector2.ONE, ADVANCE_SECONDS)
		motions[id] = tween


func begin(id: int) -> Dictionary:
	var visual: Control = cards.get(id)
	if not is_instance_valid(visual):
		return {}
	_stop(id)
	var origin := {"pose": visual.get_global_transform_with_canvas(), "size": visual.size}
	visual.hide()
	return origin


func retire(id: int) -> void:
	_stop(id)
	var visual: Control = cards.get(id)
	if is_instance_valid(visual):
		visual.queue_free()
	cards.erase(id)


func is_advancing(id: int) -> bool:
	if not motions.has(id):
		return false
	var tween: Tween = motions[id]
	return tween.is_valid() and tween.is_running()


func _stop(id: int) -> void:
	if motions.has(id):
		var tween: Tween = motions[id]
		if tween.is_valid():
			tween.kill()
		motions.erase(id)
