extends SceneTree

class Game extends "res://scripts/main.gd":
	var full_builds := 0
	var encounters := 0
	func _ready() -> void:
		_install_theme()
	func _process(_delta: float) -> void:
		pass
	func _save_run() -> bool:
		return true
	func _save_settings() -> void:
		pass
	func _finish_auto_explore_capture(_reason: String) -> void:
		pass
	func _show_map() -> void:
		full_builds += 1
		super._show_map()
	func _start_battle(_position: Vector2i) -> void:
		encounters += 1
		screen_name = "encounter"


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	root.size = Vector2i(1280, 800)
	var game := Game.new()
	game.size = Vector2(1280, 800)
	root.add_child(game)
	var cells := {}
	for x in range(99, 112):
		cells[Vector2i(x, 20)] = true
	var start := Vector2i(100, 20)
	game.run_state = {"map_seed": 123, "map_turn": 0, "position": start, "player_hp": 50, "max_hp": 50,
		"gold": 0, "keys": 0, "defeated_enemies": [], "deck": [], "active_deck_id": "a",
		"owned_decks": [{"id": "a", "name": "테스트", "cards": [], "capacity": 25}],
		"map": {"seed": 123, "walkable": cells, "seen": cells.duplicate(), "visible_now": cells.duplicate(),
			"enemy_positions": [], "enemy_states": [], "gold_piles": {start + Vector2i.RIGHT: 12}}}
	game.map_camera_center = Vector2(start) + Vector2(0.5, 0.5)
	game._show_map()
	await process_frame
	await process_frame
	var view_id := game.active_map_view.get_instance_id()
	var mini_id := game.active_map_minimap.get_instance_id()
	var wait_id := game.active_map_wait_button.get_instance_id()
	var selector_id := game.active_map_deck_selector.get_instance_id()
	game.run_state.player_hp = 42
	game.run_state.keys = 2
	game._try_move(start + Vector2i.RIGHT)
	assert(game.run_state.position == start + Vector2i.RIGHT and game.run_state.gold == 12)
	assert(game._map_hud.hp_text.text == "42 / 50" and game._map_hud.gold.text == "$ 12")
	assert(game._map_hud.keys.text == "열쇠 2")
	assert(game.active_map_minimap.player_position == game.run_state.position)
	game._start_auto_travel()
	assert(game.active_map_wait_button.disabled and game.active_map_search_button.disabled)
	game.auto_travel_step_in_progress = true
	game._try_move(start + Vector2i.RIGHT * 2)
	game.auto_travel_step_in_progress = false
	game._stop_auto_travel("test")
	assert(not game.active_map_wait_button.disabled and not game.active_map_search_button.disabled)
	game._on_map_tile_pressed(start + Vector2i.RIGHT * 4)
	game._process_map_travel(1.0)
	game._process_map_travel(1.0)
	assert(game.run_state.position == start + Vector2i.RIGHT * 4)
	var turn: int = game.run_state.map_turn
	game._wait_on_map()
	assert(game.run_state.map_turn == turn + 1)
	game._try_move(game.run_state.position + Vector2i.DOWN) # Wall rejection.
	for frame in 4:
		await process_frame
		assert(game.active_map_view.get_instance_id() == view_id)
		assert(game.active_map_minimap.get_instance_id() == mini_id)
		assert(game.active_map_wait_button.get_instance_id() == wait_id)
		assert(game.active_map_deck_selector.get_instance_id() == selector_id)
	assert(game.full_builds == 1, "Walking, O start/stop, click travel and waiting must not rebuild the screen")
	# Battle collision keeps the existing transition and does not refresh the map.
	var enemy_pos: Vector2i = game.run_state.position + Vector2i.RIGHT
	game.run_state.map.enemy_positions = [enemy_pos]
	game._try_move(enemy_pos)
	assert(game.encounters == 1 and game.screen_name == "encounter" and game.full_builds == 1)
	# Returning from another screen still builds a fresh map, as before.
	game.run_state.map.enemy_positions.clear()
	game._show_map()
	assert(game.full_builds == 2 and game.active_map_view.get_instance_id() != view_id)
	game.queue_free()
	await process_frame
	print("PASS: stable map/minimap/buttons across walking, O, click travel, wait, wall; HUD/gold/vision update; battle/return preserved")
	quit()
