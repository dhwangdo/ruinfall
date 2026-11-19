extends RefCounted
class_name PortRunSave

const MapRules = preload("res://scripts/map_rules.gd")
const PlayerTileArt = preload("res://scripts/player_tile_art.gd")


static func read_saved_run(save_path: String) -> Dictionary:
	var file := FileAccess.open(save_path, FileAccess.READ)
	if file == null:
		return {"ok": false, "reason": "unreadable"}
	var saved_state = file.get_var(false)
	var saved_map: Dictionary = {}
	if typeof(saved_state) == TYPE_DICTIONARY and typeof(saved_state.get("map", null)) == TYPE_DICTIONARY:
		saved_map = saved_state["map"]
	if typeof(saved_state) != TYPE_DICTIONARY or not saved_state.has("position") or not saved_state.has("deck") \
			or int(saved_map.get("version", -1)) != MapRules.MAP_VERSION:
		return {"ok": false, "reason": "version_mismatch"}
	return {"ok": true, "state": saved_state}


static func normalize_loaded_run(run_state: Dictionary, random_player_name: Callable) -> void:
	if not run_state.has("player_name") or str(run_state.get("player_name", "")).strip_edges().is_empty():
		run_state["player_name"] = str(random_player_name.call())
	if not run_state.has("player_avatar") or str(run_state.get("player_avatar", "")).strip_edges().is_empty():
		run_state["player_avatar"] = PlayerTileArt.random_avatar_id()
	else:
		run_state["player_avatar"] = PlayerTileArt.normalize_avatar_id(str(run_state.get("player_avatar", "")))
	var defaults := {
		"map_turn": 0,
		"sticker_service_uses": {},
		"keys": 0,
		"region_battle_wins": 0,
		"rare_card_drop_chance": 0.05,
		"inventory_cards": [],
		"inventory_consumables": [],
		"next_consumable_id": 1,
		"floor_cards": [],
		"floor_deck_drops": [],
		"floor_consumable_drops": [],
	}
	for key in defaults:
		if not run_state.has(key):
			run_state[key] = defaults[key]
	if not run_state.has("gods_lament_charges"):
		run_state["gods_lament_charges"] = 0 if (MapRules.is_gateway_tile(run_state["map"], run_state["position"]) or MapRules.region_index_at(run_state["position"]) == 0) else 3
	if not run_state.has("owned_decks") or typeof(run_state["owned_decks"]) != TYPE_ARRAY:
		run_state["active_deck_id"] = "starter"
		run_state["owned_decks"] = [{"id": "starter", "name": "시작 덱", "capacity": 20,
			"rare_slot_capacity": 1, "cards": run_state["deck"].duplicate(true), "editions": []}]
	elif run_state["owned_decks"].is_empty():
		# An intentionally empty collection is valid after dropping the last deck.
		run_state["active_deck_id"] = ""
		run_state["deck"] = []
	else:
		var saved_active_id := str(run_state.get("active_deck_id", ""))
		var has_saved_active_deck := false
		for deck in run_state["owned_decks"]:
			if str(deck.get("id", "")) == saved_active_id:
				has_saved_active_deck = true
				break
		if not has_saved_active_deck:
			var fallback_deck: Dictionary = run_state["owned_decks"][0]
			run_state["active_deck_id"] = str(fallback_deck.get("id", ""))
			run_state["deck"] = fallback_deck.get("cards", []).duplicate(true)
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == "starter":
			deck["rare_slot_capacity"] = 1
	var highest_id := highest_saved_card_id(run_state)
	run_state["next_card_id"] = maxi(int(run_state.get("next_card_id", 1)), highest_id + 1)
	MapRules.ensure_enemy_states(run_state["map"], run_state.get("defeated_enemies", []))
	MapRules.reveal_visible(run_state["map"], run_state["position"])


static func highest_saved_card_id(saved: Dictionary) -> int:
	var card_arrays: Array = [saved.get("deck", []), saved.get("inventory_cards", [])]
	for owned_deck in saved.get("owned_decks", []):
		if typeof(owned_deck) == TYPE_DICTIONARY:
			card_arrays.append(owned_deck.get("cards", []))
	for drop in saved.get("floor_cards", []):
		if typeof(drop) == TYPE_DICTIONARY:
			card_arrays.append([drop.get("card", {})])
	for drop in saved.get("floor_deck_drops", []):
		if typeof(drop) == TYPE_DICTIONARY:
			var dropped_deck: Dictionary = drop.get("deck", {})
			card_arrays.append(dropped_deck.get("cards", []))
	var saved_map: Dictionary = saved.get("map", {})
	var vaults: Dictionary = saved_map.get("deck_vaults", {})
	for vault in vaults.values():
		if typeof(vault) == TYPE_DICTIONARY:
			card_arrays.append(vault.get("cards", []))
	var highest_id := 0
	for card_array in card_arrays:
		if typeof(card_array) != TYPE_ARRAY:
			continue
		for card in card_array:
			if typeof(card) == TYPE_DICTIONARY:
				highest_id = maxi(highest_id, int(card.get("id", 0)))
	return highest_id


static func sync_active_deck(run_state: Dictionary) -> void:
	if run_state.is_empty() or not run_state.has("deck"):
		return
	var decks: Array = run_state.get("owned_decks", [])
	if decks.is_empty():
		run_state["owned_decks"] = []
		run_state["active_deck_id"] = ""
		run_state["deck"] = []
		return
	var active_id := str(run_state.get("active_deck_id", ""))
	if active_id.is_empty():
		var first_deck: Dictionary = decks[0]
		run_state["active_deck_id"] = str(first_deck.get("id", ""))
		run_state["deck"] = first_deck.get("cards", []).duplicate(true)
		return
	for index in range(decks.size()):
		if str(decks[index].get("id", "")) != active_id:
			continue
		var updated: Dictionary = decks[index].duplicate(true)
		updated["cards"] = run_state["deck"].duplicate(true)
		decks[index] = updated
		run_state["owned_decks"] = decks
		return
	var fallback_deck: Dictionary = decks[0]
	run_state["active_deck_id"] = str(fallback_deck.get("id", ""))
	run_state["deck"] = fallback_deck.get("cards", []).duplicate(true)


static func write_run_save(save_path: String, snapshot: Dictionary) -> bool:
	var file := FileAccess.open(save_path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_var(snapshot, false)
	return true


static func clear_run_save(save_path: String) -> void:
	if FileAccess.file_exists(save_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
