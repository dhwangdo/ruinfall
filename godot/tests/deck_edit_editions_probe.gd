extends SceneTree

const Editions = preload("res://scripts/deck_editions.gd")
const Heading = preload("res://scripts/deck_case_heading.gd")
const CardView = preload("res://scripts/deck_vault_card_view.gd")

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		pass
	func _process(_delta: float) -> void:
		pass
	func _show_deck() -> void:
		pass


func _initialize() -> void:
	var game := Game.new()
	var normal := {"id": 1, "name": "normal", "rarity": "basic", "cost": 1}
	var rare := {"id": 2, "name": "rare", "rarity": "rare", "cost": 1}
	var bound := {"id": 3, "rarity": "legendary", "edition_bound": true}
	game.run_state = {"map": {}, "position": Vector2i.ZERO, "active_deck_id": "free",
		"deck": [normal, rare, bound], "inventory_cards": [], "inventory_consumables": [],
		"owned_decks": [
			{"id": "free", "editions": ["freeEdit"], "capacity": 20, "rare_slot_capacity": 3, "cards": [normal, rare, bound]},
			{"id": "locked", "capacity": 20, "rare_slot_capacity": 3, "cards": []},
		]}
	game._begin_deck_editor_session()
	assert(game._can_transfer_deck_card(rare, false, "free"))
	assert(not game._can_transfer_deck_card(rare, false, "locked"))
	assert(not game._can_transfer_deck_card(bound, false, "free"))
	game._move_deck_card_to_inventory(2, "free")
	assert(game.run_state.inventory_cards.size() == 1 and game.run_state.inventory_cards[0].id == 2)
	game._move_deck_card_to_floor(1, "free")
	assert(game.run_state.floor_cards.size() == 1 and game.deck_editor_pending_removals.is_empty())
	game._move_external_card_to_deck(2, "inventory", "free")
	assert(game.run_state.inventory_cards.is_empty())
	game._move_card_between_decks_by_id(2, "free", "locked")
	assert(game.run_state.owned_decks[1].cards.size() == 1)
	assert(not game._can_transfer_deck_card(rare, false, "locked"))
	game.free()
	var heading := Heading.new()
	heading.configure("free", ["freeEdit"], 1, 20, false, true)
	assert(heading.get_meta("deck_case_can_edit") and not heading._animate_unlock_on_ready)
	assert(heading._lock_shackle_progress == 1.0)
	heading.free()
	var royal := {"capacity": 20, "rare_slot_capacity": 1, "editions": ["royal"], "cards": [normal, rare]}
	assert(Editions.rare_slot_capacity(royal) == 20)
	var view := CardView.create(royal)
	var empty := 0
	var cards := 0
	for item in view.items:
		assert(item.kind not in ["normal-slot", "divider"])
		if item.kind == "rare-slot":
			empty += 1
		elif item.kind == "card":
			cards += item.group.card_ids.size()
	assert(empty == 18 and cards == 2)
	print("PASS: free edit outside safety, locked/bound guards, open lock, Royal capacity and occupied slot layout")
	quit()
