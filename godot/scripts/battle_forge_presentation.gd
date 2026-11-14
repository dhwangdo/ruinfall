extends RefCounted

# Tracks forge-count deltas across rebuilt battle views without touching game state.
const ForgeBurstScript = preload("res://scripts/battle_forge_burst.gd")
const HOST_NAME := "BattleForgeBurstHost"
const LAYOUT_WAIT_FRAMES := 2

var _game_ref: WeakRef
var _game_instance_id := -1
var _epoch := 0
var _previous_forge_count := 0
var _previous_cards: Array = []
var _has_snapshot := false
var _next_event_id := 1
var _pending_events: Array[Dictionary] = []
var _scheduled_events: Dictionary = {}
var _active_bursts: Dictionary = {}
var _host: Control


func on_view_built(game) -> void:
	if not is_instance_valid(game) or not game.is_inside_tree():
		return
	if str(game.screen_name) != "battle":
		on_view_cleared(game)
		return
	_bind_game(game)
	_ensure_host(game)
	var battle_state: Dictionary = game.battle_state
	var forge_count := int(battle_state.get("forge_count", 0))
	var cards := _cards_from_current_zones(game, battle_state)
	if _has_snapshot and forge_count > _previous_forge_count:
		for card_id in ForgeBurstScript.newly_forged_ids(_previous_cards, cards):
			_pending_events.append({"event_id": _next_event_id, "card_id": card_id})
			_next_event_id += 1
	_previous_forge_count = forge_count
	_previous_cards = cards
	_has_snapshot = true
	_schedule_pending(game)


func on_view_cleared(game) -> void:
	if not is_instance_valid(game) or str(game.screen_name) == "battle":
		return
	if _game_instance_id >= 0 and game.get_instance_id() != _game_instance_id:
		return
	_reset()


func _bind_game(game) -> void:
	var instance_id: int = game.get_instance_id()
	if instance_id == _game_instance_id and _game_ref != null:
		return
	_reset()
	_game_ref = weakref(game)
	_game_instance_id = instance_id
	var exit_callback := Callable(self, "_on_game_exiting").bind(instance_id)
	if not game.tree_exiting.is_connected(exit_callback):
		game.tree_exiting.connect(exit_callback, CONNECT_ONE_SHOT)


func _ensure_host(game) -> void:
	if is_instance_valid(_host) and _host.get_parent() == game and _host.is_inside_tree():
		return
	var existing := game.get_node_or_null(NodePath(HOST_NAME)) as Control
	if is_instance_valid(existing):
		_host = existing
		return
	_host = Control.new()
	_host.name = HOST_NAME
	_host.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_host.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_host.z_index = 100
	_host.z_as_relative = false
	game.add_child(_host)


func _cards_from_current_zones(game, state: Dictionary) -> Array:
	var cards: Array = []
	# The saved run deck provides the unmodified baseline even when a card is out of play.
	_append_cards(cards, game.run_state.get("deck", []))
	_append_cards(cards, state.get("initial_deck", []))
	for pile in state.get("piles", []):
		_append_cards(cards, pile)
	_append_cards(cards, state.get("hand", []))
	_append_cards(cards, state.get("discard", []))
	_append_cards(cards, state.get("exhausted", []))
	_append_cards(cards, state.get("active_rule_cards", []))
	return cards


func _append_cards(destination: Array, source: Variant) -> void:
	if not source is Array:
		return
	for card in source:
		if card is Dictionary:
			destination.append(card.duplicate(true))


func _schedule_pending(game) -> void:
	if _pending_events.is_empty():
		return
	var game_ref: WeakRef = weakref(game)
	var epoch := _epoch
	for event in _pending_events:
		var event_id := int(event["event_id"])
		if _scheduled_events.has(event_id):
			continue
		_scheduled_events[event_id] = true
		call_deferred("_resolve_pending_after_layout", game_ref, epoch, event_id, int(event["card_id"]))


func _resolve_pending_after_layout(game_ref: WeakRef, epoch: int, event_id: int, card_id: int) -> void:
	for _frame in range(LAYOUT_WAIT_FRAMES):
		var game = _current_game(game_ref, epoch)
		if game == null:
			return
		await game.get_tree().process_frame
	var game = _current_game(game_ref, epoch)
	if game == null:
		return
	var target := _find_card_target(game, card_id)
	if not is_instance_valid(target):
		_scheduled_events.erase(event_id)
		return
	_ensure_host(game)
	if not is_instance_valid(_host):
		_scheduled_events.erase(event_id)
		return
	var burst = ForgeBurstScript.new()
	burst.configure(target, DisplayServer.accessibility_should_reduce_animation() == 1)
	_host.add_child(burst)
	var burst_instance_id: int = burst.get_instance_id()
	_active_bursts[burst_instance_id] = burst
	burst.finished.connect(_on_burst_finished.bind(burst_instance_id, epoch), CONNECT_ONE_SHOT)
	_scheduled_events.erase(event_id)
	_remove_pending_event(event_id)
	burst.play()


func _find_card_target(game, card_id: int) -> Control:
	var hand_widget: Control = game.battle_hand_card_widgets.get(card_id)
	if is_instance_valid(hand_widget) and hand_widget.is_inside_tree():
		return hand_widget
	var state: Dictionary = game.battle_state
	var piles: Array = state.get("piles", [])
	var pile_widgets: Array = game.battle_pile_widgets
	for pile_index in range(piles.size()):
		var pile: Array = piles[pile_index]
		for card_index in range(pile.size()):
			if int(pile[card_index].get("id", -1)) != card_id:
				continue
			if not bool(pile[card_index].get("revealed", false)):
				return null
			if pile_index < 0 or pile_index >= pile_widgets.size():
				return null
			var previews: Variant = pile_widgets[pile_index].get("file_drag_previews")
			if previews is Dictionary:
				var dictionary_preview: Control = previews.get(card_index)
				return dictionary_preview if is_instance_valid(dictionary_preview) and dictionary_preview.is_inside_tree() else null
			if previews is Array and card_index < previews.size():
				var array_preview: Control = previews[card_index]
				return array_preview if is_instance_valid(array_preview) and array_preview.is_inside_tree() else null
			return null
	return null


func _current_game(game_ref: WeakRef, epoch: int):
	if epoch != _epoch or _game_ref == null or game_ref == null:
		return null
	var game = game_ref.get_ref()
	if not is_instance_valid(game) or not game.is_inside_tree() or game.is_queued_for_deletion():
		return null
	if game.get_instance_id() != _game_instance_id or str(game.screen_name) != "battle":
		return null
	return game


func _on_burst_finished(cancelled: bool, burst_instance_id: int, epoch: int) -> void:
	if epoch != _epoch:
		return
	var burst: Control = _active_bursts.get(burst_instance_id)
	if not is_instance_valid(burst) or burst.get_instance_id() != burst_instance_id:
		return
	_active_bursts.erase(burst_instance_id)
	burst.queue_free()


func _remove_pending_event(event_id: int) -> void:
	for index in range(_pending_events.size()):
		if int(_pending_events[index]["event_id"]) == event_id:
			_pending_events.remove_at(index)
			return


func _on_game_exiting(instance_id: int) -> void:
	if instance_id == _game_instance_id:
		_reset()


func _reset() -> void:
	_epoch += 1
	if is_instance_valid(_host):
		_host.queue_free()
	_host = null
	_game_ref = null
	_game_instance_id = -1
	_previous_forge_count = 0
	_previous_cards.clear()
	_has_snapshot = false
	_pending_events.clear()
	_scheduled_events.clear()
	_active_bursts.clear()
