extends SceneTree

const Session = preload("res://scripts/map_debug_session.gd")
const Actions = preload("res://scripts/map_debug_actions.gd")
const Editions = preload("res://scripts/deck_editions.gd")
const Tooltips = preload("res://scripts/card_tooltip_controller.gd")
const Toolbar = preload("res://scripts/map_debug_toolbar.gd")

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		pass
	func _process(_delta: float) -> void:
		pass
	func _show_deck() -> void:
		_begin_deck_editor_session()
	func _show_map() -> void:
		pass
	func _save_run() -> bool:
		return true


func _init() -> void:
	run.call_deferred()


func run() -> void:
	var card := {"id": 1, "name": "normal", "rarity": "starter"}
	var original := {"deck": [card], "owned_decks": [{"id": "old", "cards": [card]}],
		"active_deck_id": "old", "next_card_id": 100, "player_hp": 40, "max_hp": 50,
		"position": Vector2i.ZERO}
	var session := Session.new()
	var entered: Dictionary = session.enter(original)
	assert(entered.deck == original.deck and entered.owned_decks == original.owned_decks)
	assert(entered.active_deck_id == "old" and entered.next_card_id == 100)
	assert(entered.max_hp == 999 and original.max_hp == 50)
	var random := RandomNumberGenerator.new()
	random.seed = 42
	var generated: Dictionary = Actions.apply(entered, "create_all_cards_deck", {}, random)
	assert(generated.owned_decks.size() == 1 and generated.active_deck_id == "old")
	assert(generated.floor_deck_drops.size() == 1)
	var all_deck: Dictionary = generated.floor_deck_drops[0].deck
	assert(all_deck.name == "ALL" and all_deck.cards.size() > 50)
	assert(generated.next_card_id > entered.next_card_id)
	generated = Actions.apply(generated, "create_all_cards_deck", {}, random)
	assert(generated.floor_deck_drops[0].deck.id != generated.floor_deck_drops[1].deck.id)
	var game := Game.new()
	game.run_state = generated
	game._begin_deck_editor_session()
	assert(not game.deck_editor_origins_by_card_id.has(100))
	game._pick_up_floor_deck(str(all_deck.id))
	for found in all_deck.cards:
		assert(game._origin_deck_id_for_card(int(found.id)) == str(all_deck.id), "missing acquired deck origin")
		assert(not game._can_transfer_deck_card(found, false))
	# This is the precise condition that used to cause pending-add blinking.
	assert(game._origin_deck_id_for_card(100) != "")
	# Do not overwrite origins of temporary additions when dropping/re-picking a deck.
	game.deck_editor_origins_by_card_id[9999] = null
	game._register_acquired_deck_origins({"id": "old", "cards": [{"id": 9999}, {"id": 9998}]})
	assert(game._origin_deck_id_for_card(9999) == "")
	assert(game._origin_deck_id_for_card(9998) == "old")
	# The legacy bulk pickup path shares origin registration.
	var second_cards: Array = game.run_state.floor_deck_drops[0].deck.cards.duplicate(true)
	game._collect_floor_deck_drops()
	for found in second_cards:
		assert(game._origin_deck_id_for_card(int(found.id)) != "")
	game.free()
	assert(not Editions.IDS.has("weakImmune") and not Editions.IDS.has("vulnerableImmune"))
	for id in Editions.IDS:
		assert(Editions.COLORS[id] == Editions.TIER_COLORS[int(Editions.SCORES[id])])
	var tooltips := Tooltips.new()
	assert(tooltips._sections_for("edition", "sharpLight")[0].title == "날카로운 빛(★)")
	assert(tooltips._sections_for("edition", "gambit")[0].title == "갬빗(★★)")
	assert(tooltips._sections_for("edition", "fantastic")[0].title == "압축(★★★)")
	var toolbar := Toolbar.new()
	toolbar.configure({"debug_mode": true}, [{"label": "test", "value": "deck:random"}])
	root.add_child(toolbar)
	assert(not toolbar._selection.fit_to_longest_item)
	var buttons := toolbar.find_children("*", "Button", true, false)
	var has_all := false
	for button in buttons:
		if button.text == "ALL 덱 생성":
			has_all = true
	assert(has_all)
	toolbar.queue_free()
	await process_frame
	print("PASS: no automatic ALL grant, explicit button/unique floor decks, pickup origins, preserved additions, edition removal/colors/stars, cheap closed selector")
	quit()
