extends Control

const PointerArrow = preload("res://scripts/battle_pointer_arrow.gd")
const CardUse = preload("res://scripts/card_use.gd")
var game_ref: WeakRef
var arrow: Control


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_as_relative = false
	z_index = 4094
	arrow = PointerArrow.new()
	add_child(arrow)
	arrow.hide()


func _process(_delta: float) -> void:
	arrow.hide()
	var game = game_ref.get_ref() if game_ref != null else null
	if not is_instance_valid(game) or game.screen_name != "battle" or not get_viewport().gui_is_dragging():
		return
	if not game._battle_drop_available():
		return
	var payload: Variant = get_viewport().gui_get_drag_data()
	if not payload is Dictionary or str(payload.get("source", "")) != "hand":
		return
	var card: Dictionary = game._battle_hand_card(int(payload.get("card_id", -1)))
	var mode := CardUse.mode(card)
	if mode == CardUse.UNPLAYABLE:
		return
	var origin: Dictionary = game.battle_keyboard_drag.capture_origin(game)
	if origin.is_empty():
		return
	var pose: Transform2D = origin["pose"]
	var center: Vector2 = pose * (Vector2(origin["size"]) * 0.5)
	if mode == CardUse.TARGETED:
		arrow.set_endpoints(center, game.pointer_position, Color("#ff9a00"))
	else:
		if not game._can_begin_card_play(card):
			return
		var destination: Dictionary = game.battle_keyboard_drag.drop_destination(game, game.pointer_position, payload)
		if destination.is_empty() or str(destination["kind"]) == "file":
			return
		arrow.set_endpoints(center, game._battle_player_destination().get_center(), Color("#42aaff"))
	arrow.show()
