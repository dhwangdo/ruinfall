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

func click(point: Vector2, pressed: bool) -> void:
	var event := InputEventMouseButton.new()
	event.button_index = MOUSE_BUTTON_LEFT
	event.pressed = pressed
	event.position = point
	root.push_input(event, true)

func run() -> void:
	create_timer(10.0).timeout.connect(func() -> void: quit(2))
	root.size = Vector2i(1280, 820)
	var game := Game.new()
	root.add_child(game)
	game.size = Vector2(1280, 820)
	var catalog = load("res://scripts/card_catalog.gd")
	var rules = load("res://scripts/battle_rules.gd")
	var deck: Array = catalog.create_starter_deck()
	game.run_state = {"deck": deck, "max_hp": 50, "player_name": "probe"}
	var base: Dictionary = rules.start_battle(deck, 50,
		{"name": "적", "hp": 100, "max_hp": 100, "actions": [{"damage": 0}]}, 50)
	var first: Dictionary = catalog.STARTER_CARDS[0].duplicate(true)
	first.merge({"id": 501, "revealed": true}, true)
	var top: Dictionary = catalog.STARTER_CARDS[1].duplicate(true)
	top.merge({"id": 502, "revealed": true}, true)
	base["piles"] = [[first, top], [], [], []]
	base["hand"] = []
	base["pending_pile_operation"] = "discardTop"
	# Cost/header, effect body, bottom-right border, exposed lower-card strip.
	for local in [Vector2(8, 8), Vector2(68, 100), Vector2(135, 190), Vector2(16, -12)]:
		game.battle_state = base.duplicate(true)
		game._show_battle()
		await process_frame
		await process_frame
		var file: Control = game.battle_pile_widgets[0]
		var preview: Control = file.drag_preview_widget
		var point: Vector2 = preview.get_global_transform_with_canvas() * Vector2(local)
		assert(file.contains_choice_point(point), "visible card point excluded: " + str(local))
		move_pointer(point)
		await process_frame
		assert(file._drop_guide_layers["hover_outline"].visible, "yellow hover missing: " + str(local))
		var focus: Control = game.get_node("BattleChoiceFocus")
		assert(not focus._has_point(focus.get_global_transform_with_canvas().affine_inverse() * point), "dimmer blocks visible card")
		move_pointer(Vector2(10, 10))
		await process_frame
		assert(not file._drop_guide_layers["hover_outline"].visible, "hover remained after pointer left")
		move_pointer(point)
		click(point, true)
		await process_frame
		assert(game.battle_state["piles"][0].size() == 1, "card click did not discard file top: " + str(local))
		assert(game.battle_state["pending_pile_operation"] == "")
		click(point, false)
		await process_frame
		assert(game.battle_state["piles"][0].size() == 1, "release fired a second action")
	print("PASS: file-choice header/body/corner/exposed-card clicks, yellow hover/leave, dimmer pass-through, single action per click")
	game.queue_free()
	await process_frame
	quit()
