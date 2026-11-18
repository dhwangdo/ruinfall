extends Control

const PointerArrow = preload("res://scripts/battle_pointer_arrow.gd")
const CardUse = preload("res://scripts/card_use.gd")
const EnemyTargetArea = preload("res://scripts/battle_enemy_target_area.gd")
var game_ref: WeakRef
var arrow: Control
var use_glow: Panel
var _preview_card_id := -1
var _preview_enemy_index := -2


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_as_relative = false
	z_index = 4094
	arrow = PointerArrow.new()
	add_child(arrow)
	arrow.hide()
	use_glow = create_use_glow()
	add_child(use_glow)
	use_glow.hide()


static func create_use_glow() -> Panel:
	var glow := Panel.new()
	glow.name = "CardUseGlow"
	glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.draw_center = false
	style.border_color = Color("#fff19a")
	style.set_border_width_all(2)
	style.set_corner_radius_all(6)
	style.shadow_color = Color(1.0, 0.79, 0.15, 0.72)
	style.shadow_size = 15
	glow.add_theme_stylebox_override("panel", style)
	return glow


func _process(_delta: float) -> void:
	arrow.hide()
	use_glow.hide()
	var game = game_ref.get_ref() if game_ref != null else null
	if not is_instance_valid(game) or game.screen_name != "battle":
		_reset_preview_cache()
		return
	if not get_viewport().gui_is_dragging():
		_reset_preview_cache()
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
	var card_id := int(payload.get("card_id", -1))
	var hovered_enemy := _hovered_enemy_index(game) if mode == CardUse.TARGETED else -1
	if card_id != _preview_card_id or hovered_enemy != _preview_enemy_index:
		game._update_battle_drag_card_damage_preview(card_id, hovered_enemy)
		_preview_card_id = card_id
		_preview_enemy_index = hovered_enemy
	var origin: Dictionary = game.battle_keyboard_drag.capture_origin(game)
	if origin.is_empty():
		return
	var pose: Transform2D = origin["pose"]
	var center: Vector2 = pose * (Vector2(origin["size"]) * 0.5)
	if mode == CardUse.TARGETED:
		arrow.set_endpoints(center, game.pointer_position, Color("#ff9a00"))
		arrow.show()
	if not game._can_begin_card_play(card):
		return
	var destination: Dictionary = game.battle_keyboard_drag.drop_destination(game, game.pointer_position, payload)
	if not destination.is_empty() and str(destination["kind"]) != "file":
		var local_pose := get_global_transform_with_canvas().affine_inverse() * pose
		use_glow.position = local_pose.origin
		use_glow.rotation = local_pose.get_rotation()
		use_glow.scale = local_pose.get_scale()
		use_glow.size = origin["size"]
		use_glow.show()


func _reset_preview_cache() -> void:
	_preview_card_id = -1
	_preview_enemy_index = -2


func _hovered_enemy_index(game: Control) -> int:
	var enemies: Array = game.battle_state.get("enemies", [])
	for index_value in game.battle_enemy_widgets:
		var index := int(index_value)
		var target: Control = game.battle_enemy_widgets[index_value]
		if not is_instance_valid(target) or bool(target.get("disabled")) or index < 0 or index >= enemies.size():
			continue
		if int(enemies[index].get("hp", 0)) <= 0:
			continue
		if EnemyTargetArea.global_rect(target).has_point(game.pointer_position):
			return index
	return -1
