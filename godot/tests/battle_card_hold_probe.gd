extends SceneTree

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		_install_theme()
		set_process(false)

func _init() -> void:
	call_deferred("run")

func move_pointer(point: Vector2) -> void:
	var event := InputEventMouseMotion.new()
	event.position = point
	root.push_input(event, true)

func run() -> void:
	create_timer(15.0).timeout.connect(func() -> void: quit(2))
	root.size = Vector2i(1280, 820)
	var game := Game.new()
	root.add_child(game)
	game.size = Vector2(1280, 820)
	var catalog = load("res://scripts/card_catalog.gd")
	var rules = load("res://scripts/battle_rules.gd")
	var deck: Array = catalog.create_starter_deck()
	game.run_state = {"deck": deck, "max_hp": 50, "player_name": "probe"}
	game.battle_state = rules.start_battle(deck, 50, {"name": "적", "hp": 100, "max_hp": 100, "actions": [{"damage": 0}]}, 50)
	var defend: Dictionary = catalog.STARTER_CARDS[1].duplicate(true)
	defend["id"] = 300
	var strike: Dictionary = catalog.STARTER_CARDS[0].duplicate(true)
	strike["id"] = 301
	game.battle_state["hand"] = [defend, strike]
	var placement_card: Dictionary = strike.duplicate(true)
	placement_card["id"] = 303
	game.battle_state["hand"].append(placement_card)
	game._show_battle()
	await process_frame
	await process_frame
	game.battle_keyboard_drag._select(game, 303)
	var file: Control = game.battle_pile_widgets[0]
	move_pointer(file.get_global_rect().get_center())
	await create_timer(0.3).timeout
	var placement_origin: Dictionary = game.battle_keyboard_drag.capture_origin(game)
	var stars_before: int = game.battle_state["stars"]
	game.battle_keyboard_drag._commit_or_cancel(game, file.get_global_rect().get_center())
	assert(game.battle_draw_presentation.active, "file placement must animate")
	var placement_carrier: Control = game.get_node("ReleasedCardSource")
	assert(placement_carrier.get_global_transform_with_canvas().origin.distance_to(placement_origin["pose"].origin) < 0.1)
	var placement_layer: Control
	for _frame in range(4):
		await process_frame
		placement_layer = game.battle_draw_presentation.active_flights
		if is_instance_valid(placement_layer):
			break
	assert(is_instance_valid(placement_layer) and placement_layer._mode == "place")
	placement_layer.set_process(false)
	placement_layer._elapsed_ms = 0
	var placement: Dictionary = placement_layer._flights[0]
	var landing: Transform2D = placement["to"]
	placement_layer._process(0.12)
	assert(placement["ghost"].modulate.a == 1.0, "file transfer must stay opaque")
	assert(placement["ghost"].position.distance_to(placement["from"].origin) > 1.0, "file transfer must travel")
	placement_layer._process(0.3)
	await process_frame
	await process_frame
	var landed: Control = game.battle_pile_widgets[0].drag_preview_widget
	assert(landed.get_global_transform_with_canvas().origin.distance_to(landing.origin) < 0.1, "landing must match final file card position")
	assert(game.battle_state["piles"][0].back()["id"] == 303)
	assert(game.battle_state["stars"] == stars_before - 1)
	game.battle_keyboard_drag._select(game, 300)
	var point: Vector2 = game.active_battle_play_area.center.get_global_rect().get_center()
	move_pointer(point)
	await create_timer(0.3).timeout
	var guide: Control = game.get_node("BattleHoldGuide")
	guide._process(0)
	assert(not guide.arrow.visible, "untargeted cards must not show an arrow")
	assert(not game.battle_keyboard_drag._can_latch_lift(game, point), "non-targeted drag must not latch")
	game.battle_state["energy"] = 0
	guide._process(0)
	assert(not guide.arrow.visible, "untargeted cards must not show an arrow at any energy")
	game.battle_state["energy"] = 3
	var origin: Dictionary = game.battle_keyboard_drag.capture_origin(game)
	game.battle_keyboard_drag._commit_or_cancel(game, point)
	assert(not root.gui_is_dragging())
	var carrier: Control = game.get_node("ReleasedCardSource")
	assert(carrier.get_global_transform_with_canvas().origin.distance_to(origin["pose"].origin) < 0.1, "release must preserve held pose")
	assert(game.battle_hand_card_widgets[300].modulate.a == 0.0, "hand source must not flash")
	var layer: Control
	for _frame in range(4):
		await process_frame
		layer = game.battle_draw_presentation.active_flights
		if is_instance_valid(layer):
			break
	assert(is_instance_valid(layer), "departure layer missing")
	assert(layer._mode == "staged_play")
	layer.set_process(false)
	layer._elapsed_ms = 0
	layer._process(0.210)
	var flight: Dictionary = layer._flights[0]
	var ghost: Control = flight["ghost"]
	var middle: Vector2 = ghost.get_transform() * (ghost.size * 0.5)
	assert(middle.distance_to(game.active_battle_play_area.get_global_rect().get_center()) < 0.1)
	layer._process(0.055)
	assert((ghost.get_transform() * (ghost.size * 0.5)).distance_to(middle) < 0.1, "card must stop at center")
	assert(ghost.modulate.a == 1.0, "card must remain opaque at center")
	var exit_center: Vector2 = game.get_viewport_rect().end + Vector2(70, 70)
	layer._process(0.180)
	var exiting_center: Vector2 = ghost.get_transform() * (ghost.size * 0.5)
	assert(exiting_center.x > middle.x and exiting_center.y > middle.y, "card must fly down and right")
	assert(exiting_center.distance_to(exit_center) < middle.distance_to(exit_center))
	assert(ghost.modulate.a < 1.0)
	layer._process(0.200)
	await process_frame
	await process_frame
	assert(game._battle_hand_card(300).is_empty())
	game.battle_keyboard_drag._select(game, 301)
	move_pointer(Vector2(700, 700))
	await create_timer(0.4).timeout
	assert(root.gui_is_dragging(), "targeted aim must not cancel at lower edge")
	origin = game.battle_keyboard_drag.capture_origin(game)
	var center: Vector2 = origin["pose"] * (Vector2(origin["size"]) * 0.5)
	assert(center.distance_to(game.get_viewport_rect().get_center()) < 1.0, "targeted card must stay at center")
	guide = game.get_node("BattleHoldGuide")
	guide._process(0)
	assert(guide.arrow.visible and guide.arrow.color == Color("#ff9a00"))
	assert(guide.arrow.tip.distance_to(Vector2(700, 700)) < 0.1)
	move_pointer(Vector2(400, 5))
	await process_frame
	assert(root.gui_is_dragging(), "upper band must not cancel targeted aim")
	move_pointer(Vector2(400, 810))
	await process_frame
	assert(not root.gui_is_dragging(), "lower band must cancel targeted aim")
	await create_timer(0.3).timeout
	var widget: Control = game.battle_hand_card_widgets[301]
	var grab := widget.get_global_transform_with_canvas() * (widget.size * 0.5)
	move_pointer(grab)
	await process_frame
	var press := InputEventMouseButton.new()
	press.button_index = MOUSE_BUTTON_LEFT
	press.button_mask = MOUSE_BUTTON_MASK_LEFT
	press.pressed = true
	press.position = grab
	root.push_input(press, true)
	await process_frame
	var lift := InputEventMouseMotion.new()
	lift.position = grab - Vector2(0, 24)
	lift.relative = Vector2(0, -24)
	lift.button_mask = MOUSE_BUTTON_MASK_LEFT
	root.push_input(lift, true)
	await process_frame
	lift = lift.duplicate()
	lift.position = Vector2(640, 480)
	lift.relative = lift.position - grab + Vector2(0, 24)
	root.push_input(lift, true)
	await process_frame
	assert(root.gui_is_dragging(), "native upward drag must start")
	assert(game.battle_keyboard_drag.lift_hold_armed, "crossing the height must arm persistent hold")
	lift = lift.duplicate()
	lift.position = game.active_battle_hand_area.get_global_transform_with_canvas() * Vector2(350, game.active_battle_hand_area.size.y * 0.65)
	lift.relative = Vector2(0, 100)
	root.push_input(lift, true)
	await process_frame
	var release := InputEventMouseButton.new()
	release.button_index = MOUSE_BUTTON_LEFT
	release.pressed = false
	release.position = lift.position
	root.push_input(release, true)
	await process_frame
	assert(root.gui_is_dragging(), "upward targeted drag must stay held after release")
	assert(not game._battle_hand_card(301).is_empty(), "lift must not use the card")
	var enemy: Control = game.battle_enemy_widgets[0]
	point = enemy.get_global_rect().get_center()
	move_pointer(point)
	await create_timer(0.4).timeout
	origin = game.battle_keyboard_drag.capture_origin(game)
	game.battle_keyboard_drag._commit_or_cancel(game, point)
	assert(game.battle_draw_presentation.active, "enemy click must begin play")
	carrier = game.get_node("ReleasedCardSource")
	assert(carrier.get_global_transform_with_canvas().origin.distance_to(origin["pose"].origin) < 0.1)
	layer = null
	for _frame in range(4):
		await process_frame
		layer = game.battle_draw_presentation.active_flights
		if is_instance_valid(layer):
			break
	assert(is_instance_valid(layer), "targeted departure missing")
	var targeted_flight: Dictionary = layer._flights[0]
	var aimed_center: Vector2 = targeted_flight["to"] * (targeted_flight["source"].size * 0.5)
	assert(aimed_center.distance_to(enemy.get_global_rect().get_center()) < 0.1, "orange card must fly to selected enemy")
	await create_timer(0.5).timeout
	assert(game._battle_hand_card(301).is_empty(), "enemy click must use targeted card")
	print("PASS: no untargeted arrow, lower-right exit, targeting lower cancel, native upward drag latch, opaque file placement, staged flight and enemy use")
	game.queue_free()
	await process_frame
	quit()
