extends SceneTree

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		_install_theme()
		set_process(false)

func _init() -> void:
	call_deferred("run")

func run() -> void:
	create_timer(10.0).timeout.connect(func() -> void: quit(2))
	root.size = Vector2i(1280, 820)
	var game := Game.new()
	root.add_child(game)
	game.size = Vector2(1280, 820)
	var catalog = load("res://scripts/card_catalog.gd")
	var rules = load("res://scripts/battle_rules.gd")
	var deck: Array = catalog.create_starter_deck()
	game.run_state = {"deck": deck, "max_hp": 50, "player_name": "probe"}
	game.battle_state = rules.start_battle(deck, 50,
		{"name": "적", "hp": 100, "max_hp": 100, "actions": [{"damage": 0}]}, 50)
	var ordinary: Dictionary = catalog.STARTER_CARDS[1].duplicate(true)
	ordinary.merge({"id": 800, "revealed": true}, true)
	var incoming := [ordinary, catalog.create_toxic_slime_card(801), catalog.create_soil_card(802),
		catalog.create_rock_card(803), catalog.create_fermented_slime_card(804), catalog.create_relic_card(805)]
	game.battle_state["hand"] = []
	game.battle_state["piles"] = []
	for card in incoming:
		game.battle_state["piles"].append([card])
	game._show_battle()
	await process_frame
	await process_frame
	var origins: Dictionary = game.battle_draw_presentation.capture_origins(game)
	assert(origins.size() == 6)
	var next: Dictionary = game.battle_state.duplicate(true)
	next["hand"] = incoming
	for index in range(next["piles"].size()):
		next["piles"][index] = []
	game.battle_draw_presentation.apply_state(game, next, origins)
	var layer: Control
	for _frame in range(6):
		await process_frame
		layer = game.battle_draw_presentation.active_flights
		if is_instance_valid(layer):
			break
	assert(is_instance_valid(layer) and layer._flights.size() == 6)
	layer.set_process(false)
	layer._elapsed_ms = 0
	for flight in layer._flights:
		assert(flight["duration"] == 300.0, "file draw must use ordinary 300ms speed")
		assert(not flight["enemy_delivery"], "enemy origin on card must not enable delivery motion")
	layer._process(0.56)
	await process_frame
	await process_frame
	assert(not game.battle_draw_presentation.active)
	for card in incoming:
		assert(game.battle_hand_card_widgets[card["id"]].visible)
		assert(game.battle_hand_card_widgets[card["id"]].modulate.a == 1.0)
	assert(game._battle_hand_card(801)["enemy_token"], "card provenance must remain unchanged")
	print("PASS: normal/slime/soil/rock/fermented/relic file draws use 300ms; no delivery pause; cards visible and input unlocked")
	game.queue_free()
	await process_frame
	quit()
