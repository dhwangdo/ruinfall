extends SceneTree

var targeted := OS.get_cmdline_user_args().has("--targeted")

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		_install_theme()
	func _process(_delta: float) -> void:
		battle_play_queue.tick(self)


func _init() -> void:
	run.call_deferred()


func key(code: Key, pressed: bool) -> void:
	var event := InputEventKey.new()
	event.keycode = code
	event.pressed = pressed
	root.push_input(event, true)


func pointer(point: Vector2) -> void:
	var event := InputEventMouseMotion.new()
	event.position = point
	root.push_input(event, true)


func click(point: Vector2, code := MOUSE_BUTTON_LEFT) -> void:
	var event := InputEventMouseButton.new()
	event.position = point
	event.button_index = code
	event.pressed = true
	root.push_input(event, true)
	event = event.duplicate()
	event.pressed = false
	root.push_input(event, true)


func run() -> void:
	create_timer(12.0).timeout.connect(func() -> void: quit(2))
	root.size = Vector2i(1280, 820)
	var game := Game.new()
	root.add_child(game)
	game.size = Vector2(1280, 820)
	var catalog = load("res://scripts/card_catalog.gd")
	var rules = load("res://scripts/battle_rules.gd")
	var cards: Array = []
	for index in 6:
		var card: Dictionary = catalog.STARTER_CARDS[0 if targeted else 1].duplicate(true)
		card.merge({"id": 900 + index, "revealed": true}, true)
		cards.append(card)
	game.run_state = {"deck": cards, "max_hp": 50, "player_name": "probe"}
	game.battle_state = rules.start_battle(cards, 50,
		{"name": "target", "hp": 1000, "max_hp": 1000, "actions": [{"damage": 0}]}, 50)
	game.battle_state["hand"] = cards
	game.battle_state["piles"] = [[], []]
	game.battle_state["energy"] = 10
	game._show_battle()
	await process_frame
	await process_frame
	var enemy: Control = game.battle_enemy_widgets[0]
	var destination := enemy.get_global_rect().get_center() if targeted else Vector2(640, 460)
	pointer(destination)
	await process_frame
	key(KEY_1, true)
	key(KEY_1, false)
	assert(root.gui_is_dragging(), "quick key release must retain the selection")
	click(destination)
	assert(game.battle_play_queue.contains(900), "click after key release did not use card")
	for frame in 5:
		await process_frame
		if is_instance_valid(game.battle_draw_presentation.active_flights):
			break
	var first_flight: Control = game.battle_draw_presentation.active_flights
	first_flight.set_process(false)
	key(KEY_1, true)
	key(KEY_1, false)
	click(destination)
	assert(game.battle_play_queue.contains(901), "released-key click did not enqueue during animation")

	# A previous card's expiry must not cancel a newly held card.
	key(KEY_1, true)
	assert(game.battle_keyboard_drag.card_id == 902)
	await create_timer(0.37).timeout
	assert(root.gui_is_dragging(), "stale grace timer cancelled another selection")
	key(KEY_1, false)
	assert(not root.gui_is_dragging(), "long hold must cancel immediately on release")

	key(KEY_2, true)
	key(KEY_2, false)
	assert(root.gui_is_dragging())
	await create_timer(0.37).timeout
	assert(not root.gui_is_dragging(), "grace must expire without any new input")
	assert(not game._battle_hand_card(903).is_empty(), "expiry used the card")
	assert(not game.battle_play_queue.contains(903))

	key(KEY_3, true)
	key(KEY_3, false)
	assert(root.gui_is_dragging())
	click(destination, MOUSE_BUTTON_RIGHT)
	assert(not root.gui_is_dragging(), "right click must cancel immediately during grace")
	first_flight.set_process(true)
	for frame in 300:
		await process_frame
		if not game.battle_play_queue.busy and game.battle_play_queue.entries.is_empty():
			break
	assert(game.battle_state["energy"] == 8, "grace duplicated or lost a queued action")
	print("PASS: rapid key-up/click use and queue, 300ms expiry, ordinary long release, immediate right cancel, stale-timer isolation")
	game.queue_free()
	await process_frame
	quit()
