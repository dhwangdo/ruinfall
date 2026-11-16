extends SceneTree

const Selector = preload("res://scripts/map_deck_selector_trigger.gd")

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		pass
	func _process(_delta: float) -> void:
		pass
	func _show_deck() -> void:
		pass
	func _show_map() -> void:
		pass
	func _save_run() -> bool:
		return true


func _init() -> void:
	run.call_deferred()


func run() -> void:
	var game := Game.new()
	game.run_state = {"position": Vector2i.ZERO, "owned_decks": [], "floor_deck_drops": []}
	for index in range(101):
		game.run_state.floor_deck_drops.append({"x": 0, "y": 0,
			"deck": {"id": str(index), "name": "deck " + str(index), "cards": []}})
	assert(game._owned_deck_limit() == 3)
	for index in range(4):
		game._pick_up_floor_deck(str(index))
	assert(game.run_state.owned_decks.size() == 3)
	game.map_debug_controller.session.active = true
	assert(game._owned_deck_limit() == 100)
	for index in range(3, 101):
		game._pick_up_floor_deck(str(index))
	assert(game.run_state.owned_decks.size() == 100 and game.run_state.floor_deck_drops.size() == 1)
	# Turning debug off preserves existing decks but prohibits further pickup.
	game.map_debug_controller.session.active = false
	game._collect_floor_deck_drops()
	assert(game.run_state.owned_decks.size() == 100 and game.run_state.floor_deck_drops.size() == 1)
	var selector := Selector.new()
	root.add_child(selector)
	selector.configure("deck 0", 0, 20, game.run_state.owned_decks, 100, "0")
	assert(selector._large_deck_menu.item_count == 100)
	assert(selector._menu._slot_count == 3, "do not construct 100 radial entries")
	selector.free()
	game.run_state.owned_decks = []
	game.map_debug_controller.session.active = true
	for index in range(101):
		game.run_state.floor_deck_drops.append({"x": 0, "y": 0,
			"deck": {"id": "bulk" + str(index), "cards": []}})
	game._collect_floor_deck_drops()
	assert(game.run_state.owned_decks.size() == 100)
	game.free()
	await process_frame
	print("PASS: ordinary limit 3, debug limit 100, individual/bulk pickup caps, retained overflow, 100-entry selector")
	quit()
