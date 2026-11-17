extends SceneTree

const MapRules = preload("res://scripts/map_rules.gd")


func _initialize() -> void:
	var center := Vector2i(30, 30)
	assert(_is_chokepoint(center, [Vector2i.LEFT, Vector2i.RIGHT]))
	assert(not _is_chokepoint(center, [Vector2i.LEFT]))
	assert(not _is_chokepoint(center, [Vector2i.UP, Vector2i.RIGHT]))
	var open_neighbors: Array[Vector2i] = []
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			if dx != 0 or dy != 0:
				open_neighbors.append(Vector2i(dx, dy))
	assert(not _is_chokepoint(center, open_neighbors))
	print("MAP_ENEMY_CHOKEPOINT_PROBE=PASS")
	quit(0)


func _is_chokepoint(center: Vector2i, offsets: Array[Vector2i]) -> bool:
	var map_data := MapRules.create_empty_map(1)
	map_data["walkable"][center] = true
	for offset in offsets:
		map_data["walkable"][center + offset] = true
	return MapRules._is_local_enemy_chokepoint(map_data, center)
