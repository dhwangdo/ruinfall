extends SceneTree

const Catalog = preload("res://scripts/card_catalog.gd")
const Rules = preload("res://scripts/battle_rules.gd")

class Game extends "res://scripts/main.gd":
	var order: Array[int] = []
	func _ready() -> void:
		_install_theme()
	func _process(_delta: float) -> void:
		battle_play_queue.tick(self)
	func _execute_card_play(card_id: int, origin: Dictionary = {}) -> void:
		order.append(card_id)
		await super._execute_card_play(card_id, origin)


func _init() -> void:
	run.call_deferred()


func setup(cards: Array, energy: int) -> Game:
	var game := Game.new()
	root.add_child(game)
	game.size = Vector2(1280, 820)
	game.run_state = {"deck": cards, "max_hp": 50, "player_name": "probe"}
	game.battle_state = Rules.start_battle(cards, 50,
		{"name": "target", "hp": 100, "max_hp": 100, "actions": [{"damage": 0}]}, 50)
	game.battle_state["enemies"].append(game.battle_state["enemies"][0].duplicate(true))
	game.battle_state["hand"] = cards.duplicate(true)
	game.battle_state["piles"] = [[], []]
	game.battle_state["energy"] = energy
	game._show_battle()
	return game


func card(template: Dictionary, id: int) -> Dictionary:
	var result := template.duplicate(true)
	result.merge({"id": id, "revealed": true}, true)
	return result


func enqueue(game: Game, id: int, target: int) -> void:
	game._on_battle_card_dropped({"kind": "battle-card", "source": "hand", "card_id": id},
		"enemy" if target >= 0 else "center", target)


func settled(game: Game) -> void:
	for frame in 600:
		await process_frame
		if not game.battle_play_queue.busy and game.battle_play_queue.entries.is_empty():
			return
	assert(false, "queue failed to settle")


func run() -> void:
	create_timer(25.0).timeout.connect(func() -> void: quit(2))
	root.size = Vector2i(1280, 820)
	var cards := [card(Catalog.STARTER_CARDS[1], 100), card(Catalog.STARTER_CARDS[0], 101),
		card(Catalog.STARTER_CARDS[0], 102)]
	var game := setup(cards, 3)
	await process_frame
	await process_frame
	enqueue(game, 100, -1)
	await process_frame
	assert(game.battle_play_queue.busy and game.battle_draw_presentation.active)
	assert(game._battle_drop_available(), "presentation must accept next input")
	var next_card: Control = game.battle_hand_card_widgets[101]
	assert(next_card.mouse_filter != Control.MOUSE_FILTER_IGNORE, "hand is locked")
	assert(not next_card.drag_payload.is_empty(), "next card cannot start drag")
	assert(game._can_begin_card_play(game._battle_hand_card(101)))
	game.battle_keyboard_drag._select(game, 101)
	assert(root.gui_is_dragging(), "keyboard could not hold next card during use")
	await create_timer(0.75).timeout
	assert(root.gui_is_dragging() and is_instance_valid(next_card), "view rebuild destroyed held card")
	assert(game.battle_play_queue.busy, "active action did not preserve held input")
	root.gui_cancel_drag()
	enqueue(game, 101, 0)
	enqueue(game, 102, 1)
	enqueue(game, 101, 0)
	assert(game.battle_play_queue.entries.size() == 2, "duplicate or lost queued input")
	assert(game.battle_state["enemies"][0]["hp"] == 100, "queued card resolved early")
	await settled(game)
	assert(game.order == [100, 101, 102], "not FIFO")
	assert(game.battle_state["enemies"][0]["hp"] == 94)
	assert(game.battle_state["enemies"][1]["hp"] == 94, "target was not stored per request")
	assert(game.battle_state["energy"] == 0)
	assert(game.battle_state["player_block"] == 5)
	game.queue_free()
	await process_frame
	print("PASS: live input during presentation, FIFO, duplicate rejection, independent targets")

	game = setup(cards, 2)
	await process_frame
	await process_frame
	enqueue(game, 100, -1)
	enqueue(game, 101, 0)
	enqueue(game, 102, 1)
	await settled(game)
	assert(game.order == [100, 101], "unaffordable card executed")
	assert(game.battle_state["energy"] == 0)
	assert(not game._battle_hand_card(102).is_empty(), "cancelled card left hand")
	assert(not game.battle_hand_card_widgets[102].drag_payload.is_empty())
	await process_frame
	assert(not game.active_battle_end_button.disabled, "empty queue left end-turn locked")
	game.queue_free()
	await process_frame
	print("PASS: execution-time energy revalidation and cancelled-card input restoration")

	game = setup(cards, 3)
	await process_frame
	await process_frame
	enqueue(game, 100, -1)
	enqueue(game, 101, 0)
	enqueue(game, 102, 1)
	# The first action's final state is authoritative when the next intent runs.
	game.battle_draw_presentation.pending_final_state["enemies"][0]["hp"] = 0
	await settled(game)
	assert(game.order == [100, 102], "queued attack retargeted a dead enemy")
	assert(not game._battle_hand_card(101).is_empty())
	assert(game.battle_state["enemies"][1]["hp"] == 94)
	game.queue_free()
	await process_frame
	print("PASS: dead targets cancel without silently choosing another enemy")

	var choice_cards := [card(Catalog.STARTER_CARDS[1], 200), card(Catalog.BASIC_CARDS[0], 201),
		card(Catalog.STARTER_CARDS[0], 202), card(Catalog.STARTER_CARDS[1], 203)]
	game = setup(choice_cards, 4)
	await process_frame
	await process_frame
	enqueue(game, 200, -1)
	enqueue(game, 201, -1)
	enqueue(game, 202, 0)
	for frame in 300:
		await process_frame
		if not game.battle_play_queue.busy and int(game.battle_state.get("pending_discard_count", 0)) > 0:
			break
	assert(game.order == [200, 201], "queue skipped mandatory discard selection")
	assert(game.battle_state.get("pending_discard_count", 0) == 1)
	assert(game.battle_play_queue.entries.size() == 1)
	game._discard_for_pending_play(203)
	await settled(game)
	assert(game.order == [200, 201, 202], "queue did not resume after selection")
	assert(game.battle_state["player_block"] == 13)
	game.queue_free()
	await process_frame
	print("PASS: mandatory discard pauses FIFO and resumes after player selection")
	quit()
