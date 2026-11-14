extends RefCounted

const DebugDecks = preload("res://scripts/debug_decks.gd")
const ALL_DECK_ID := "debug-all-cards"
const STICKER_DECK_ID := "debug-sticker-catalog"
const DEBUG_HP := 999

var active := false
var previous_active_deck_id := ""
var normal_max_hp := 50


static func is_temporary_deck(deck_id: String) -> bool:
	return deck_id in [ALL_DECK_ID, STICKER_DECK_ID]


func enter(state: Dictionary) -> Dictionary:
	if active:
		return state
	var next := state.duplicate()
	previous_active_deck_id = str(state.get("active_deck_id", ""))
	normal_max_hp = maxi(1, int(state.get("max_hp", 50)))
	var generated: Dictionary = DebugDecks.create_all_cards_deck(int(state.get("next_card_id", 1)))
	var deck: Dictionary = generated["deck"]
	var decks: Array = []
	decks.append(deck)
	for owned in state.get("owned_decks", []):
		if not is_temporary_deck(str(owned.get("id", ""))):
			decks.append(owned)
	next["owned_decks"] = decks
	next["active_deck_id"] = str(deck["id"])
	next["deck"] = deck["cards"].duplicate(true)
	next["next_card_id"] = int(generated["next_card_id"])
	next["player_hp"] = DEBUG_HP
	next["max_hp"] = DEBUG_HP
	active = true
	return next


func leave(state: Dictionary) -> Dictionary:
	if not active:
		return state
	var next := state.duplicate()
	var decks: Array = []
	var selected: Dictionary = {}
	for owned in state.get("owned_decks", []):
		if is_temporary_deck(str(owned.get("id", ""))):
			continue
		decks.append(owned)
		if str(owned.get("id", "")) == previous_active_deck_id:
			selected = owned
	if selected.is_empty() and not decks.is_empty():
		selected = decks[0]
	next["owned_decks"] = decks
	next["active_deck_id"] = str(selected.get("id", ""))
	next["deck"] = selected.get("cards", []).duplicate(true)
	next["max_hp"] = normal_max_hp
	next["player_hp"] = mini(int(state.get("player_hp", 0)), normal_max_hp)
	active = false
	previous_active_deck_id = ""
	return next


func snapshot_for_save(state: Dictionary) -> Dictionary:
	if not active:
		return state
	# Browser max HP is derived from its transient debug flag. Native stores it,
	# so serialize the normal cap to reproduce the debug-off reload/clamp.
	var snapshot := state.duplicate()
	snapshot["max_hp"] = normal_max_hp
	snapshot["player_hp"] = mini(int(state.get("player_hp", 0)), normal_max_hp)
	return snapshot


func reset() -> void:
	active = false
	previous_active_deck_id = ""
	normal_max_hp = 50
