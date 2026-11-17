extends SceneTree

const Travel = preload("res://scripts/map_travel.gd")

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		pass
	func _process(_delta: float) -> void:
		pass
	func _show_map() -> void:
		pass
	func _finish_auto_explore_capture(_reason: String) -> void:
		pass


func _initialize() -> void:
	# Minimal geometry from the captured A<->B stall; no user save is required.
	var seen := {}
	for row in [[-1,105,107], [0,99,107], [1,99,107], [2,98,107], [3,98,101], [4,98,101]]:
		for x in range(row[1], row[2] + 1):
			seen[Vector2i(x,row[0])] = true
	var walkable := {}
	for x in range(100,107):
		walkable[Vector2i(x,1)] = true
	for cell in [Vector2i(106,0), Vector2i(100,2), Vector2i(99,3), Vector2i(100,3), Vector2i(98,4), Vector2i(99,4)]:
		walkable[cell] = true
	var map := {"seen": seen, "walkable": walkable, "gold_piles": {},
		"enemy_memory": {"23": Vector2i(99,3)}, "enemy_memory_states": {"23": {"awareness": "sleeping"}}}
	var game := Game.new()
	game.run_state = {"map_seed": 7, "map": map, "position": Vector2i(103,1)}
	game._start_auto_travel()
	var first := Travel.find_safe_path(map, game.run_state.position, [], game.auto_travel_progress)
	assert(first == [Vector2i(102,1)])
	game.run_state.position = first.back()
	assert(Travel.find_safe_path(map, game.run_state.position, [], game.auto_travel_progress).is_empty())
	game._stop_auto_travel("blocked")
	assert(game.auto_explore_surveyed_rooms.size() == 2)
	for attempt in range(6):
		game._start_auto_travel()
		assert(Travel.find_safe_path(map, game.run_state.position, [], game.auto_travel_progress).is_empty(),
			"Restarting O must not send the player back to a surveyed tile")
		game._stop_auto_travel("blocked")
	# Other interruptions clear per-session progress, not persistent surveys.
	game.auto_travel_progress.clear()
	game._start_auto_travel()
	assert(game.auto_travel_progress.threat_history.is_empty())
	assert(game.auto_travel_progress.target == Travel.INVALID_POSITION)
	assert(game.auto_travel_progress.surveyed_rooms.size() == 2)
	# A surveyed tile remains a valid goal if it now contains gold.
	map.gold_piles[Vector2i(103,1)] = 10
	assert(Travel.find_safe_path(map, game.run_state.position, [], game.auto_travel_progress) == [Vector2i(103,1)])
	map.gold_piles.clear()
	game._stop_auto_travel("manual")
	game.run_state.map_seed = 8
	game._start_auto_travel()
	assert(game.auto_explore_surveyed_rooms.is_empty(), "New map must clear survey memory")
	assert(Travel.find_safe_path(map, game.run_state.position, [], game.auto_travel_progress) == [Vector2i(103,1)])
	game._reset_auto_explore_capture()
	assert(game.auto_explore_surveyed_rooms.is_empty())
	game.free()
	print("PASS: captured A/B stall stops across 6 O restarts; interruptions preserve surveys, threats/routes refresh, gold and new-map reset work")
	quit()
