extends SceneTree

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		pass
	func _process(_delta: float) -> void:
		pass
	func _show_deck() -> void:
		assert(false, "blocked edit unexpectedly rebuilt the screen")


func _initialize() -> void:
	var game := Game.new()
	var bound := {"id": 42, "name": "카시오페이아", "rarity": "legendary", "edition_bound": true}
	var deck := {"id": "bound", "cards": [bound]}
	game.run_state = {"owned_decks": [deck], "deck": [bound], "active_deck_id": "bound",
		"inventory_consumables": [{"id": "ticket", "type": "extractTicket"}]}
	game._begin_deck_editor_session()
	assert(not game._can_remove_deck_card(bound, true, "bound"))
	assert(not game._can_remove_deck_card(bound, false, "bound"))
	assert(not game._can_transfer_deck_card(bound, true))
	assert(not game._can_transfer_deck_card(bound, false))
	game._move_deck_card_to_floor(42, "bound")
	assert(game.run_state.deck.size() == 1 and game.deck_editor_pending_removals.is_empty())
	var widget := Control.new()
	game._configure_run_card_drag(widget, bound, "deck", "bound")
	widget.free()
	game.extraction_ticket_mode = true
	game.extraction_ticket_source = "inventory"
	game.extraction_ticket_id = "ticket"
	game._extract_owned_deck_card("bound", 42)
	assert(game.run_state.deck.size() == 1 and game.run_state.owned_decks[0].cards.size() == 1)
	assert(game.run_state.inventory_consumables.size() == 1)
	assert(not game._can_drop_extract_ticket({"card_id": 42, "deck_id": "bound"},
		{"kind": "run-ticket", "ticket_type": "extractTicket", "ticket_id": "ticket", "source_area": "inventory"}))
	game.free()
	print("PASS: bound legendary edit guards: drag, transfer, removal, floor discard, ticket extraction without consuming ticket")
	quit()
