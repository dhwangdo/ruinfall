extends RefCounted

# Present the primitive hit trace; never resolve a card or roll randomness here.
const HIT_GAP_MS := 220
const HP_RELEASE_MS := 240
const DEFEAT_RELEASE_MS := 500

var hp_overrides: Dictionary = {}
var dying: Dictionary = {}
var queued_action: Dictionary = {}
var generation := 0
var _serial := 0
var _victory_action := -1
var _victory_final: Dictionary = {}


func prepare_action(game, before: Dictionary, final_state: Dictionary, play_view: Dictionary) -> Dictionary:
	var hits: Array = play_view.get("hits", [])
	if final_state.get("status") == "lost":
		return final_state
	var defeated: Array[int] = []
	var previous: Array = before.get("enemies", [])
	var enemies: Array = final_state.get("enemies", [])
	for index in mini(previous.size(), enemies.size()):
		if int(previous[index].get("hp", 0)) > 0 and int(enemies[index].get("hp", 0)) <= 0:
			defeated.append(index)
	if hits.is_empty() and defeated.is_empty():
		return final_state
	_serial += 1
	var last_hits: Dictionary = {}
	for index in hits.size():
		var enemy_index := int(hits[index].get("enemy_index", -1))
		if enemy_index < 0 or enemy_index >= previous.size():
			continue
		if not hp_overrides.has(enemy_index):
			hp_overrides[enemy_index] = int(previous[enemy_index].get("hp", 0))
		last_hits[enemy_index] = index
	for index in defeated:
		dying[index] = {"action": _serial}
	queued_action = {"id": _serial, "hits": hits.duplicate(true),
		"last_hits": last_hits, "defeated": defeated}
	if final_state.get("status") == "won" and not hits.is_empty():
		_victory_action = _serial
		_victory_final = final_state.duplicate(true)
		game.battle_turn_resolving = true
		var displayed := final_state.duplicate(true)
		displayed["status"] = "playing"
		displayed["message"] = str(play_view.get("resolved_message", final_state.get("message", "")))
		return displayed
	return final_state


func commit_queued(game) -> void:
	if queued_action.is_empty():
		return
	var action := queued_action
	queued_action = {}
	_present(weakref(game), generation, int(game.battle_session_generation), action)


func view_hp(index: int, actual: int) -> int:
	return int(hp_overrides.get(index, actual))


func has_pending_victory() -> bool:
	return not _victory_final.is_empty()


func on_view_cleared(game) -> void:
	if game.screen_name != "battle":
		invalidate()


func invalidate() -> void:
	generation += 1
	hp_overrides.clear()
	dying.clear()
	queued_action = {}
	_victory_final = {}
	_victory_action = -1


func _present(game_ref: WeakRef, ticket: int, session: int, action: Dictionary) -> void:
	var game = _current_game(game_ref, ticket, session)
	if game == null:
		return
	var started := Time.get_ticks_msec()
	var events: Array[Dictionary] = []
	var hits: Array = action["hits"]
	for index in hits.size():
		events.append({"at": index * HIT_GAP_MS, "kind": "hit", "hit": hits[index]})
	var last_hits: Dictionary = action["last_hits"]
	for index in last_hits:
		events.append({"at": int(last_hits[index]) * HIT_GAP_MS + HP_RELEASE_MS,
			"kind": "release_hp", "index": index})
	for index in action["defeated"]:
		events.append({"at": int(last_hits.get(index, 0)) * HIT_GAP_MS + DEFEAT_RELEASE_MS,
			"kind": "remove_dead", "index": index})
	if int(action["id"]) == _victory_action:
		events.append({"at": maxi(DEFEAT_RELEASE_MS, (hits.size() - 1) * HIT_GAP_MS + DEFEAT_RELEASE_MS),
			"kind": "victory"})
	events.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return int(a["at"]) < int(b["at"]))
	# Rebuilt enemy controls must finish layout before the first health-bar popup.
	await game.get_tree().process_frame
	for event in events:
		game = _current_game(game_ref, ticket, session)
		if game == null:
			return
		var delay_ms := int(event["at"]) - int(Time.get_ticks_msec() - started)
		if delay_ms > 0:
			await game.get_tree().create_timer(float(delay_ms) / 1000.0).timeout
			game = _current_game(game_ref, ticket, session)
			if game == null:
				return
		match str(event["kind"]):
			"hit":
				var hit: Dictionary = event["hit"]
				var index := int(hit["enemy_index"])
				hp_overrides[index] = int(hit["remaining_hp"])
				game._refresh_battle_enemy_presentation(index)
				game.battle_turn_presentation.show_enemy_popup(game, index, "-%d" % int(hit["damage"]))
			"release_hp":
				var index := int(event["index"])
				hp_overrides.erase(index)
				game._refresh_battle_enemy_presentation(index)
			"remove_dead":
				_remove_dead(game, int(event["index"]), int(action["id"]))
			"victory":
				if int(action["id"]) != _victory_action or _victory_final.is_empty():
					continue
				var final_state := _victory_final
				_victory_final = {}
				_victory_action = -1
				game.battle_turn_resolving = false
				if game.battle_state.get("status") == "playing":
					game.battle_state = final_state
					game._show_battle()


func _remove_dead(game, index: int, action_id: int) -> void:
	if not dying.has(index) or int(dying[index].get("action", -1)) != action_id:
		return
	dying.erase(index)
	var enemies: Array = game.battle_state.get("enemies", [])
	if index < 0 or index >= enemies.size() or int(enemies[index].get("hp", 0)) > 0:
		return
	var widget: Control = game.battle_enemy_widgets.get(index)
	game.battle_enemy_widgets.erase(index)
	if is_instance_valid(widget):
		widget.get_parent().remove_child(widget)
		widget.queue_free()
	game.battle_turn_presentation.retire_enemy_popup(index)


func _current_game(game_ref: WeakRef, ticket: int, session: int):
	var game = game_ref.get_ref()
	if not is_instance_valid(game) or not game.is_inside_tree() or game.is_queued_for_deletion():
		return null
	if ticket != generation or session != int(game.battle_session_generation) or game.screen_name != "battle":
		return null
	return game
