extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")

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


func setup(count: int) -> Game:
	var game := Game.new()
	root.add_child(game)
	game.size = Vector2(1280, 820)
	var cards: Array = []
	for index in count:
		var card: Dictionary = Catalog.STARTER_CARDS[1].duplicate(true)
		card.merge({"id": 100 + index, "revealed": true}, true)
		cards.append(card)
	game.run_state = {"deck": cards, "max_hp": 50, "player_name": "probe"}
	game.battle_state = Rules.start_battle(cards, 50,
		{"name": "target", "hp": 1000, "actions": [{"damage": 0}]}, 50)
	game.battle_state.hand = cards
	game.battle_state.piles = [[], []]
	game.battle_state.energy = 99
	game._show_battle()
	return game


func submit(game: Game, id: int) -> void:
	game._on_battle_card_dropped({"kind": "battle-card", "source": "hand", "card_id": id}, "center", -1)


func settled(game: Game) -> void:
	for frame in 800:
		await process_frame
		if not game.battle_play_queue.busy and game.battle_play_queue.entries.is_empty():
			return
	assert(false, "queue did not settle")


func run() -> void:
	create_timer(25.0).timeout.connect(func(): quit(2))
	root.size = Vector2i(1280, 820)
	var game := setup(4)
	await process_frame
	await process_frame
	submit(game, 100)
	# Start confusion after the first resolution, then queue all remaining hand cards.
	game.battle_draw_presentation.pending_final_state.player_confusion = 2
	submit(game, 101)
	submit(game, 102)
	submit(game, 103)
	assert(game.battle_play_queue.entries.size() == 3)
	await settled(game)
	assert(game.order == [100, 101], "confusion failed to cancel the remaining queue")
	assert(game.battle_state.energy == 97 and game.battle_state.player_block == 10, "committed effects were rolled back")
	assert(game.battle_state.hand.size() == 1 and game.battle_state.discard.size() == 3)
	var discarded_id := int(game.battle_state.last_confusion_discard_id)
	assert(discarded_id in [102, 103] and game._battle_hand_card(discarded_id).is_empty())
	var returned_id := 103 if discarded_id == 102 else 102
	assert(not game._battle_hand_card(returned_id).is_empty())
	var restored: Control = game.battle_hand_card_widgets[returned_id]
	assert(restored.modulate.a == 1.0 and not restored.has_meta("card_use_queued"))
	assert(not restored.drag_payload.is_empty())
	# A historical discard event must not cancel a later, unrelated reservation.
	game.battle_state.player_confusion = 0
	submit(game, returned_id)
	await settled(game)
	assert(game.battle_state.energy == 96 and game.order.size() == 3)
	game.queue_free()
	await process_frame

	game = setup(5)
	game.battle_state.player_paralysis = 2
	await process_frame
	await process_frame
	for id in range(100, 105):
		submit(game, id)
	await settled(game)
	assert(game.order == [100, 101, 102], "queued input bypassed the paralysis limit")
	assert(game.battle_state.energy == 96 and game.battle_state.cards_played_this_turn == 3)
	assert(game.battle_state.hand.size() == 2)
	for card in game.battle_state.hand:
		var widget: Control = game.battle_hand_card_widgets[card.id]
		assert(not widget.has_meta("card_use_queued") and not widget.drag_payload.is_empty())
	game.queue_free()
	await process_frame
	print("PASS: live confusion queue cancellation, committed cost/effect preservation, discarded/returned cards, stale-event isolation, queued paralysis limit")
	quit()
