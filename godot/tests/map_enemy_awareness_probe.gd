extends SceneTree

const MapRules = preload("res://scripts/map_rules.gd")
const MapEnemies = preload("res://scripts/map_enemies.gd")


func _initialize() -> void:
	var enemy := Vector2i(100, 20)
	var player := Vector2i(120, 20)
	var map_data := MapRules.create_empty_map(1)
	map_data["walkable"][enemy] = true
	map_data["enemy_positions"] = [enemy]
	map_data["enemy_encounters"] = {enemy: 0}
	map_data["enemy_states"] = [{"encounter_index": 0, "awareness": "alerted",
		"is_boss": false, "permanent_sleep": false, "defeated": false}]
	MapEnemies.move_toward_player(map_data, enemy, player, [], 1)
	assert(map_data["enemy_states"][0]["awareness"] == "awake")
	for turn in range(60):
		MapEnemies.move_toward_player(map_data, enemy, player, [], turn + 2)
		assert(map_data["enemy_states"][0]["awareness"] == "awake")
	print("MAP_ENEMY_AWARENESS_PROBE=PASS")
	quit(0)
