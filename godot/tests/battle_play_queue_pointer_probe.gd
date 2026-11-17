extends SceneTree
const EnemyTargetArea = preload("res://scripts/battle_enemy_target_area.gd")

var untargeted := OS.get_cmdline_user_args().has("--untargeted")
var discard_first := OS.get_cmdline_user_args().has("--discard-first")
var keyboard := OS.get_cmdline_user_args().has("--keyboard")
var discard_queued := OS.get_cmdline_user_args().has("--discard-queued")

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		_install_theme()
	func _process(_delta: float) -> void:
		battle_play_queue.tick(self)


func _init() -> void:
	run.call_deferred()


func move_pointer(point: Vector2, relative := Vector2.ZERO, pressed := false) -> void:
	var event := InputEventMouseMotion.new()
	event.position = point
	event.relative = relative
	event.button_mask = MOUSE_BUTTON_MASK_LEFT if pressed else 0
	root.push_input(event, true)


func button(point: Vector2, pressed: bool) -> void:
	var event := InputEventMouseButton.new()
	event.position = point
	event.button_index = MOUSE_BUTTON_LEFT
	event.pressed = pressed
	root.push_input(event, true)


func play_by_pointer(game: Game, id: int) -> void:
	var widget: Control = game.battle_hand_card_widgets[id]
	var start: Vector2 = widget.get_global_transform_with_canvas() * (widget.size * 0.5)
	move_pointer(start)
	await process_frame
	if keyboard:
		var key := InputEventKey.new()
		key.keycode = KEY_1
		key.pressed = true
		root.push_input(key, true)
		assert(root.gui_is_dragging(), "number key failed to hold " + str(id))
		var target: Control = game.battle_enemy_widgets[0]
		var destination := Vector2(640, 460) if untargeted or (discard_first and id == 500) else EnemyTargetArea.global_rect(target).get_center()
		move_pointer(destination)
		await process_frame
		button(destination, true)
		button(destination, false)
		key = key.duplicate()
		key.pressed = false
		root.push_input(key, true)
		assert(not root.gui_is_dragging(), "number-key use was not accepted")
		return
	# Hover expansion may move the card before pressing.
	start = widget.get_global_transform_with_canvas() * (widget.size * 0.5)
	move_pointer(start)
	button(start, true)
	await process_frame
	move_pointer(start - Vector2(0, 24), Vector2(0, -24), true)
	await process_frame
	var enemy: Control = game.battle_enemy_widgets[0]
	var point := EnemyTargetArea.global_rect(enemy).get_center()
	if untargeted or (discard_first and id == 500):
		point = Vector2(640, 460)
	move_pointer(point, point - start, true)
	await process_frame
	assert(root.gui_is_dragging(), "pointer could not pick up card " + str(id))
	button(point, false)
	assert(not root.gui_is_dragging(), "release was not accepted for " + str(id))


func run() -> void:
	create_timer(12.0).timeout.connect(func() -> void: quit(2))
	root.size = Vector2i(1280, 820)
	var game := Game.new()
	root.add_child(game)
	game.size = Vector2(1280, 820)
	var catalog = load("res://scripts/card_catalog.gd")
	var rules = load("res://scripts/battle_rules.gd")
	var cards: Array = []
	for index in 5:
		var card: Dictionary = catalog.STARTER_CARDS[1 if untargeted else 0].duplicate(true)
		if discard_first and index == 0:
			card = catalog.BASIC_CARDS[0].duplicate(true)
		card.merge({"id": 500 + index, "revealed": true}, true)
		cards.append(card)
	if discard_first and not discard_queued:
		var filler: Dictionary = catalog.STARTER_CARDS[1].duplicate(true)
		filler.merge({"id": 505, "revealed": true}, true)
		cards.append(filler)
	game.run_state = {"deck": cards, "max_hp": 50, "player_name": "probe"}
	game.battle_state = rules.start_battle(cards, 50,
		{"name": "target", "hp": 1000, "max_hp": 1000, "actions": [{"damage": 0}]}, 50)
	game.battle_state["hand"] = cards
	game.battle_state["piles"] = [[], []]
	game.battle_state["energy"] = 10
	game._show_battle()
	await process_frame
	await process_frame
	await play_by_pointer(game, 500)
	for frame in 5:
		await process_frame
		if is_instance_valid(game.battle_draw_presentation.active_flights):
			break
	var first_flight: Control = game.battle_draw_presentation.active_flights
	assert(is_instance_valid(first_flight))
	first_flight.set_process(false)
	assert(game.get_node_or_null("ReleasedCardSource") == null, "transparent carrier must be removed")
	for id in range(501, 505):
		await play_by_pointer(game, id)
		assert(game.battle_play_queue.entries.size() == id - 500, "release did not enqueue " + str(id))
		assert(game.battle_play_queue.executing_id == 500, "first card must still be in progress")
		assert(not game.battle_hand_card_widgets[id].visible, "queued card must leave hand immediately")
	var queue_view: Control = game.battle_play_queue.view
	for frame in 120:
		await process_frame
		if not queue_view.is_advancing(504):
			break
	for index in range(1, 5):
		var visual: Control = queue_view.cards[500 + index]
		var goal := queue_view.size * 0.5 - visual.size * 0.5 + Vector2(22, 22) * index
		assert(visual.position.distance_to(goal) < 0.5, "queued cards not stacked in FIFO order")
		assert(visual.mouse_filter == Control.MOUSE_FILTER_IGNORE, "queue view must not block input")
	first_flight.set_process(true)
	for frame in 180:
		await process_frame
		if not queue_view.cards.has(500):
			break
	for frame in 120:
		await process_frame
		if not queue_view.is_advancing(501):
			break
	var front := queue_view.size * 0.5 - Vector2(149.6, 210.1) * 0.5
	assert(queue_view.cards[501].position.distance_to(front) < 0.5, "next card did not advance to front")
	assert(queue_view.cards[502].position.distance_to(front + Vector2(22, 22)) < 0.5, "stack did not advance together")
	if discard_first:
		for frame in 180:
			await process_frame
			if not game.battle_play_queue.busy:
				break
		assert(game.battle_state.get("pending_discard_count", 0) == 1)
		assert(game.battle_play_queue.entries.size() == 4, "selection must pause execution, not lose inputs")
		if discard_queued:
			assert(game.battle_hand_card_widgets[504].visible, "queued cards must remain selectable for mandatory discard")
			var key := InputEventKey.new()
			key.keycode = KEY_4
			key.pressed = true
			root.push_input(key, true)
			key = key.duplicate()
			key.pressed = false
			root.push_input(key, true)
		else:
			game._discard_for_pending_play(505)
	for frame in 600:
		await process_frame
		if not game.battle_play_queue.busy and game.battle_play_queue.entries.is_empty():
			break
	assert(game.battle_state["enemies"][0]["hp"] == (982 if discard_queued else 976 if discard_first else 1000 if untargeted else 970))
	assert(game.battle_state["player_block"] == (8 if discard_first else 25 if untargeted else 0))
	assert(game.battle_state["energy"] == (6 if discard_queued else 5))
	assert(game.battle_play_queue.view.cards.is_empty(), "processed cards left in stack")
	print("PASS: five real press-drag-release inputs accepted before first flight finishes; all resolve once")
	game.queue_free()
	await process_frame
	quit()
