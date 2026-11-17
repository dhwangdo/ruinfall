extends SceneTree

const MapRules = preload("res://scripts/map_rules.gd")
const MapTravel = preload("res://scripts/map_travel.gd")


func _initialize() -> void:
	var center := Vector2i(106, 10)
	var map_data := MapRules.create_empty_map(1)
	for dy in range(-7, 8):
		for dx in range(-7, 8):
			map_data["walkable"][center + Vector2i(dx, dy)] = true
	MapRules.reveal_visible(map_data, center)
	var visible: Dictionary = map_data["visible_now"]
	assert(visible.size() == 169)
	assert(visible.has(center + Vector2i(6, 0)))
	assert(visible.has(center + Vector2i(6, 6)))
	assert(not visible.has(center + Vector2i(7, 0)))
	var seen: Dictionary = {}
	for dy in range(-5, 6):
		for dx in range(-5, 6):
			seen[center + Vector2i(dx, dy)] = true
	assert(MapTravel._count_unseen_boundary(map_data, seen, center) == 48)
	print("MAP_PLAYER_VISION_PROBE=PASS")
	quit(0)
