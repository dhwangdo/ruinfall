extends RefCounted

# Store intents, never precomputed effects. Revalidate against the live state.
var entries: Array[Dictionary] = []
var busy := false
var executing_id := -1
var session := -1
var turn := -1
var view: Control
var waiting_for_advance := false


func contains(card_id: int) -> bool:
	if executing_id == card_id:
		return true
	for entry in entries:
		if int(entry["card_id"]) == card_id:
			return true
	return false


func accepting(game) -> bool:
	if not busy or game.battle_turn_resolving or game.screen_name != "battle":
		return false
	var state: Dictionary = game.battle_draw_presentation.pending_final_state
	# A pending choice pauses execution, not submission of subsequent intents.
	return not state.is_empty() and state.get("status") == "playing"


static func ready(state: Dictionary) -> bool:
	return state.get("status") == "playing" \
		and int(state.get("pending_draws", 0)) <= 0 \
		and int(state.get("pending_pile_draw_count", 0)) <= 0 \
		and int(state.get("pending_discard_count", 0)) <= 0 \
		and int(state.get("pending_play_card_id", -1)) < 0 \
		and str(state.get("pending_pile_operation", "")) == ""


func submit(game, card_id: int, target: int, origin: Dictionary) -> void:
	if contains(card_id) or not game._can_begin_card_play(game._battle_hand_card(card_id)):
		return
	if not busy and entries.is_empty():
		session = game.battle_session_generation
		turn = int(game.battle_state.get("turn", 0))
	entries.append({"card_id": card_id, "target": target, "origin": origin.duplicate(true)})
	var widget: Control = game.battle_hand_card_widgets.get(card_id)
	if not is_instance_valid(view):
		view = preload("res://scripts/battle_play_queue_view.gd").new()
		view.name = "BattlePlayQueueView"
		game.add_child(view)
		view.resized.connect(_arrange_view)
	view.add_card(game, game._battle_hand_card(card_id), origin, widget)
	if is_instance_valid(widget):
		widget.modulate.a = 0.0
		widget.set_meta("card_use_queued", true)
		widget.drag_payload = {}
	if is_instance_valid(game.active_battle_hand_area):
		game.active_battle_hand_area._layout_cards()
	_arrange_view()
	tick(game)


func tick(game) -> void:
	if game.screen_name != "battle" or session != game.battle_session_generation \
			or turn != int(game.battle_state.get("turn", 0)) or game.battle_state.get("status") != "playing":
		entries.clear()
		if is_instance_valid(view):
			view.queue_free()
		view = null
		return
	if not busy and entries.is_empty():
		if is_instance_valid(game.active_battle_end_button):
			game.active_battle_end_button.disabled = not game._battle_drop_available()
		return
	if busy or entries.is_empty() or game.battle_turn_resolving or game.battle_draw_presentation.active \
			or not ready(game.battle_state) or game.get_viewport().gui_is_dragging() \
			or not game.battle_card_ledger_open.is_empty():
		return
	if waiting_for_advance and is_instance_valid(view) and view.is_advancing(int(entries.front()["card_id"])):
		return
	waiting_for_advance = false
	_run_next(game)


func _run_next(game) -> void:
	var entry: Dictionary = entries.pop_front()
	var card_id := int(entry["card_id"])
	var card: Dictionary = game._battle_hand_card(card_id)
	var valid: bool = game.CardUse.is_playable(card)
	if valid and game.CardUse.requires_target(card):
		var enemies: Array = game.battle_state.get("enemies", [])
		var target := int(entry["target"])
		valid = target >= 0 and target < enemies.size() and int(enemies[target].get("hp", 0)) > 0
	if not valid or not game._can_begin_card_play(card):
		if valid and not game.BattleRules.can_pay_card_cost(game.battle_state, card):
			game._flash_energy_shortage()
		_restore_widget(game, card_id)
		_retire(card_id)
		return
	busy = true
	executing_id = card_id
	if game.CardUse.requires_target(card):
		game.battle_state = game.BattleRules.select_enemy_target(game.battle_state, int(entry["target"]))
	await game._execute_card_play(card_id, entry["origin"])
	executing_id = -1
	busy = false
	_retire(card_id)
	if is_instance_valid(game.active_battle_end_button):
		game.active_battle_end_button.disabled = not game._battle_drop_available() or not entries.is_empty()


func _restore_widget(game, card_id: int) -> void:
	var widget: Control = game.battle_hand_card_widgets.get(card_id)
	if is_instance_valid(widget):
		widget.modulate.a = 1.0
		widget.remove_meta("card_use_queued")
		widget.drag_payload = {"kind": "battle-card", "source": "hand", "card_id": card_id}
		if is_instance_valid(game.active_battle_hand_area):
			game.active_battle_hand_area._layout_cards()


func _retire(card_id: int) -> void:
	if is_instance_valid(view):
		view.retire(card_id)
	_arrange_view()
	waiting_for_advance = not entries.is_empty()


func _arrange_view() -> void:
	if not is_instance_valid(view):
		return
	var order: Array[int] = []
	if executing_id >= 0:
		order.append(executing_id)
	for entry in entries:
		order.append(int(entry["card_id"]))
	view.arrange(order, executing_id)
