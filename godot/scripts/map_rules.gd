extends RefCounted
class_name PortMapRules

const WIDTH := 212
const REGION_COUNT := 7
const REGION_HEIGHT := 47
const ROCK_BARRIER_HEIGHT := 5
const REGION_STRIDE := REGION_HEIGHT + ROCK_BARRIER_HEIGHT
const HEIGHT := REGION_COUNT * REGION_HEIGHT + (REGION_COUNT - 1) * ROCK_BARRIER_HEIGHT
const START := Vector2i(106, 0)
const MAP_VERSION := 16
const ENEMY_DETECTION_ONE_TILE_CHANCE := 1.0
const ENEMY_DETECTION_TWO_TILE_CHANCE := 0.10
const ENEMY_PERCEPTION_RANGE := 2
const ENEMY_ACTIVE_RADIUS := 4
const ENEMY_START_SAFE_RADIUS := 4
const MAP_ENEMY_SPAWN_CHANCE := 0.045
const EnemyCatalog = preload("res://scripts/enemy_catalog.gd")
const MapGenerationRules = preload("res://scripts/map_generation_rules.gd")

const SPIRAL_VAULT := [
	"#######", "#.....#", "#.###.#", "#.#V#.#",
	"#.#.#.#", "#...#.#", "#####.#", "......#",
]
const PILLAR_VAULT := [
	"#########", "#.#.#.#.#", "##.#.#.##", "#.#.#.#.#",
	".#.#V#.##", "#.#.#.#.#", "##.#.#.##", "#.#.#.#.#", "#########",
]


static func create_map(seed_value: int = 0) -> Dictionary:
	var map_data := create_empty_map(seed_value)
	for region_index in range(REGION_COUNT):
		generate_region(map_data, region_index, seed_value)
	finish_map(map_data)
	return map_data


static func create_empty_map(seed_value: int) -> Dictionary:
	return {
		"version": MAP_VERSION,
		"seed": seed_value,
		"walkable": {},
		"room_types": {},
		"protected_cells": {},
		"gold_piles": {},
		"enemy_positions": [],
		"enemy_encounters": {},
		"enemy_states": [],
		"portal_positions": [],
		"safe_area_entries": {},
		"safe_portals": {},
		"seen": {},
		"visible_now": {},
		"enemy_memory": {},
		"enemy_memory_states": {},
	}


static func finish_map(map_data: Dictionary) -> void:
	ensure_enemy_states(map_data)
	reveal_visible(map_data, START)


static func generate_region(map_data: Dictionary, region_index: int, map_seed: int) -> void:
	var start_y := region_index * REGION_STRIDE
	var safe_center_local := MapGenerationRules.safe_area_center(map_seed, region_index, WIDTH, REGION_HEIGHT)
	var safe_center_x := safe_center_local.x
	var safe_center_y := start_y + safe_center_local.y
	var location_counts := MapGenerationRules.roll_region_location_counts(map_seed, region_index)
	var safe_entry := Vector2i(safe_center_x - 11, safe_center_y)
	var safe_area_blocked := MapGenerationRules.make_blocked_safe_area(WIDTH, REGION_HEIGHT, safe_center_local)
	var local_portals := MapGenerationRules.place_region_portals(
		map_seed, region_index, WIDTH, REGION_HEIGHT, safe_area_blocked, int(location_counts["portal"])
	)
	var layout_seed := MapGenerationRules.region_layout_seed(map_seed, region_index + 1)
	var prefab_definitions: Array[Dictionary] = [
		{"id": "spiral-vault", "grid": SPIRAL_VAULT, "entrance": Vector2i(0, 7), "mirror": true, "padding": 1},
		{"id": "pillar-vault", "grid": PILLAR_VAULT, "entrance": Vector2i(0, 4), "mirror": true, "padding": 1},
	]
	var prefab_placements := MapGenerationRules.place_region_prefabs(
		layout_seed, region_index + 1, WIDTH, REGION_HEIGHT, safe_area_blocked,
		Vector2i(START.x, 0), local_portals, prefab_definitions
	)
	var layout := MapGenerationRules.generate_floor(
		layout_seed, region_index + 1, WIDTH, REGION_HEIGHT, Vector2i(START.x, 0), local_portals,
		safe_area_blocked, prefab_placements
	)
	for local_y in range(REGION_HEIGHT):
		for x in range(WIDTH):
			if layout["floor"][local_y * WIDTH + x]:
				map_data["walkable"][Vector2i(x, start_y + local_y)] = true
	for placement in prefab_placements:
		var local_top_left: Vector2i = placement["top_left"]
		_place_prefab(
			map_data,
			Vector2i(local_top_left.x, start_y + local_top_left.y),
			placement["grid"],
			str(placement["id"])
		)
	for local_portal in local_portals:
		var portal_position := Vector2i(local_portal.x, start_y + local_portal.y)
		map_data["room_types"][portal_position] = "portal"
		map_data["portal_positions"].append(portal_position)

	map_data["safe_area_entries"][region_index] = safe_entry
	# The browser portal teleports into the safe area; it has no walkable route back into the region.
	for x in range(safe_center_x - 11, safe_center_x + 2):
		var position := Vector2i(x, safe_center_y)
		_add_floor(map_data, position)
		map_data["room_types"][position] = "safeArea"
	for y_offset in [-1, 1]:
		var left_arm := Vector2i(safe_center_x - 10, safe_center_y + y_offset)
		var right_arm := Vector2i(safe_center_x, safe_center_y + y_offset)
		_add_floor(map_data, left_arm)
		_add_floor(map_data, right_arm)
		map_data["room_types"][left_arm] = "safeArea"
		map_data["room_types"][right_arm] = "safeArea"
	var service_types := ["stickerAltar", "cardTransmuter", "tinkerer"]
	var region_point := Vector2i(region_index, 0)
	var first_service := floori(MapGenerationRules.seeded_roll(region_point, map_seed, 8301) * service_types.size())
	var second_service := (first_service + 1 + floori(MapGenerationRules.seeded_roll(region_point, map_seed, 8302) * 2.0)) % service_types.size()
	map_data["room_types"][Vector2i(safe_center_x - 11, safe_center_y)] = "safeEntry"
	map_data["room_types"][Vector2i(safe_center_x - 10, safe_center_y)] = "partialHeal"
	map_data["room_types"][Vector2i(safe_center_x, safe_center_y)] = "heal"
	map_data["room_types"][Vector2i(safe_center_x, safe_center_y - 1)] = service_types[first_service]
	map_data["room_types"][Vector2i(safe_center_x, safe_center_y + 1)] = service_types[second_service]
	if region_index < 3:
		map_data["room_types"][Vector2i(safe_center_x - 5, safe_center_y)] = "boss"
	var safe_portal := Vector2i(safe_center_x + 1, safe_center_y)
	if region_index < REGION_COUNT - 1:
		map_data["room_types"][safe_portal] = "safePortal"
		map_data["safe_portals"][region_index] = safe_portal

	var ordinary_locations := MapGenerationRules.place_region_locations(
		map_data, location_counts, map_seed, region_index, WIDTH, REGION_HEIGHT, start_y, safe_center_local, layout["main"]
	)
	for local_index in ordinary_locations.keys():
		var index := int(local_index)
		var position := Vector2i(index % WIDTH, start_y + floori(float(index) / WIDTH))
		map_data["room_types"][position] = str(ordinary_locations[local_index])

	_add_region_gold(map_data, region_index, map_seed, layout["main"])
	if region_index < 3:
		var enemy_cells := _place_region_enemy_positions(map_data, map_seed, layout["main"], start_y)
		for enemy_position in enemy_cells:
			map_data["enemy_positions"].append(enemy_position)
			var browser_position := Vector2i(enemy_position.x - START.x, enemy_position.y)
			var encounter_roll := MapGenerationRules.seeded_roll(browser_position, map_seed, 4001)
			map_data["enemy_encounters"][enemy_position] = EnemyCatalog.pick_region_encounter_from_roll(region_index, encounter_roll)
		var boss_position := Vector2i(safe_center_x - 5, safe_center_y)
		map_data["enemy_positions"].append(boss_position)
		map_data["enemy_encounters"][boss_position] = 14 + region_index


static func _place_region_enemy_positions(
	map_data: Dictionary,
	map_seed: int,
	main_floor: PackedByteArray,
	start_y: int
) -> Array[Vector2i]:
	var candidates: Array[Vector2i] = []
	var room_types: Dictionary = map_data["room_types"]
	var walkable: Dictionary = map_data["walkable"]
	var safe_start := Vector2i(START.x, start_y)
	for local_y in range(REGION_HEIGHT):
		for x in range(WIDTH):
			var index := local_y * WIDTH + x
			var position := Vector2i(x, start_y + local_y)
			if index >= main_floor.size() or not main_floor[index] or not walkable.has(position) \
				or (room_types.has(position) and str(room_types[position]) != "vaultInterior"):
				continue
			if maxi(absi(position.x - safe_start.x), absi(position.y - safe_start.y)) <= ENEMY_START_SAFE_RADIUS:
				continue
			candidates.append(position)
	if candidates.is_empty():
		return []

	# Mirror the browser's 4.5% target, slight count jitter, and distance-weighted sampling.
	var browser_anchor := Vector2i(candidates[0].x - START.x, candidates[0].y)
	var expected_count := float(candidates.size()) * MAP_ENEMY_SPAWN_CHANCE
	var spread := minf(expected_count * 0.1, sqrt(expected_count * (1.0 - MAP_ENEMY_SPAWN_CHANCE)))
	var target_count := clampf(expected_count + spread * (
		MapGenerationRules.seeded_roll(browser_anchor, map_seed, 2901)
		- MapGenerationRules.seeded_roll(browser_anchor, map_seed, 2902)
	), 0.0, float(candidates.size()))
	var whole_count := floori(target_count)
	var enemy_count := whole_count + (1 if MapGenerationRules.seeded_roll(browser_anchor, map_seed, 3001) < target_count - whole_count else 0)

	var remaining: Array[Dictionary] = []
	for position in candidates:
		remaining.append({"position": position, "distance": INF, "weight": 1.0})
	var selected: Array[Vector2i] = []
	for selected_index in range(enemy_count):
		var total_weight := 0.0
		for candidate in remaining:
			total_weight += float(candidate["weight"])
		var roll := MapGenerationRules.seeded_roll(browser_anchor, map_seed, 3003 + selected_index) * total_weight
		var chosen_index := remaining.size() - 1
		for index in range(remaining.size()):
			roll -= float(remaining[index]["weight"])
			if roll < 0.0:
				chosen_index = index
				break
		var chosen: Dictionary = remaining.pop_at(chosen_index)
		var chosen_position: Vector2i = chosen["position"]
		selected.append(chosen_position)
		for candidate in remaining:
			var candidate_position: Vector2i = candidate["position"]
			var distance := maxi(absi(candidate_position.x - chosen_position.x), absi(candidate_position.y - chosen_position.y))
			candidate["distance"] = minf(float(candidate["distance"]), float(distance))
			candidate["weight"] = minf(1.0, pow((float(candidate["distance"]) + 0.25) / 5.0, 2.5))
	return selected


static func _place_region_prefabs(
	map_data: Dictionary,
	region_index: int,
	region_nodes: Array[Vector2i],
	rng: RandomNumberGenerator,
	safe_area_blocked: PackedByteArray
) -> Array[Dictionary]:
	var start_y := region_index * REGION_STRIDE
	var definitions: Array[Dictionary] = [
		{"id": "spiral-vault", "grid": SPIRAL_VAULT, "entrance": Vector2i(0, 7)},
		{"id": "pillar-vault", "grid": PILLAR_VAULT, "entrance": Vector2i(0, 4)},
	]
	for index in range(definitions.size() - 1, 0, -1):
		var other := rng.randi_range(0, index)
		var definition = definitions[index]
		definitions[index] = definitions[other]
		definitions[other] = definition

	var placements: Array[Dictionary] = []
	for definition in definitions:
		var placed := false
		for _attempt in range(128):
			var rotation := rng.randi_range(0, 3) * 90
			var mirrored := rng.randf() < 0.5
			var transformed := _transform_prefab(definition["grid"], definition["entrance"], rotation, mirrored)
			var grid: Array = transformed["grid"]
			var prefab_width := str(grid[0]).length()
			var prefab_height := grid.size()
			if WIDTH < prefab_width + 7 or REGION_HEIGHT < prefab_height + 7:
				continue
			var top_left := Vector2i(
				rng.randi_range(3, WIDTH - prefab_width - 3),
				start_y + rng.randi_range(3, REGION_HEIGHT - prefab_height - 3)
			)
			if not _prefab_area_is_clear(map_data, top_left, grid, region_nodes, safe_area_blocked, start_y):
				continue
			var placement := {
				"id": str(definition["id"]),
				"top_left": top_left,
				"grid": grid,
				"entrance": transformed["entrance"],
				"direction": transformed["direction"],
			}
			_place_prefab(map_data, top_left, grid, str(definition["id"]))
			placements.append(placement)
			placed = true
			break
		if not placed:
			continue
	return placements


static func _transform_prefab(base_grid: Array, base_entrance: Vector2i, rotation: int, mirrored: bool) -> Dictionary:
	var grid: Array[String] = []
	for row in base_grid:
		grid.append(str(row))
	var entrance := base_entrance
	var direction := Vector2i(-1, 0)
	if mirrored:
		var mirrored_grid: Array[String] = []
		for row in grid:
			var reversed_row := ""
			for x in range(row.length() - 1, -1, -1):
				reversed_row += row.substr(x, 1)
			mirrored_grid.append(reversed_row)
		grid = mirrored_grid
		entrance.x = grid[0].length() - 1 - entrance.x
		direction.x = -direction.x

	for _quarter_turn in range(int(rotation / 90)):
		var old_height := grid.size()
		var old_width := grid[0].length()
		var rotated_grid: Array[String] = []
		for new_y in range(old_width):
			var rotated_row := ""
			for new_x in range(old_height):
				rotated_row += grid[old_height - 1 - new_x].substr(new_y, 1)
			rotated_grid.append(rotated_row)
		grid = rotated_grid
		entrance = Vector2i(old_height - 1 - entrance.y, entrance.x)
		direction = Vector2i(-direction.y, direction.x)
	return {"grid": grid, "entrance": entrance, "direction": direction}


static func _prefab_area_is_clear(
	map_data: Dictionary,
	top_left: Vector2i,
	grid: Array,
	region_nodes: Array[Vector2i],
	safe_area_blocked: PackedByteArray,
	start_y: int
) -> bool:
	var width := str(grid[0]).length()
	var height := grid.size()
	if top_left.x < 3 or top_left.x + width > WIDTH - 3 \
		or top_left.y < start_y + 3 or top_left.y + height > start_y + REGION_HEIGHT - 3:
		return false
	for node in region_nodes:
		if node.x >= top_left.x - 1 and node.x < top_left.x + width + 1 \
			and node.y >= top_left.y - 1 and node.y < top_left.y + height + 1:
			return false
	var protected_cells: Dictionary = map_data.get("protected_cells", {})
	for y in range(-1, grid.size() + 1):
		for x in range(-1, width + 1):
			var position := top_left + Vector2i(x, y)
			# Keep the vault footprint and its one-tile padding clear of existing landmarks.
			var local_y := position.y - start_y
			if local_y < 0 or local_y >= REGION_HEIGHT or position.x < 0 or position.x >= WIDTH:
				return false
			if safe_area_blocked[local_y * WIDTH + position.x] != 0:
				return false
			if map_data["room_types"].has(position) or protected_cells.has(position):
				return false
	return true


static func _place_prefab(map_data: Dictionary, top_left: Vector2i, grid: Array, _prefab_id: String) -> void:
	var protected_cells: Dictionary = map_data.get("protected_cells", {})
	for y in range(-1, grid.size() + 1):
		for x in range(-1, str(grid[0]).length() + 1):
			protected_cells[top_left + Vector2i(x, y)] = true
	map_data["protected_cells"] = protected_cells
	for y in range(grid.size()):
		var row: String = grid[y]
		for x in range(row.length()):
			var position := top_left + Vector2i(x, y)
			if row.substr(x, 1) == "#":
				map_data["walkable"].erase(position)
				map_data["room_types"].erase(position)
			else:
				map_data["walkable"][position] = true
				if row.substr(x, 1) == "V":
					map_data["room_types"][position] = "deckVault"
				else:
					map_data["room_types"][position] = "vaultInterior"


static func _add_region_gold(map_data: Dictionary, region_index: int, map_seed: int, main_floor: PackedByteArray) -> void:
	var region_point := Vector2i(region_index, 0)
	var pile_count := 96 + floori(MapGenerationRules.seeded_roll(region_point, map_seed, 7304) * 16.0)
	var start_y := region_index * REGION_STRIDE
	var room_types: Dictionary = map_data["room_types"]
	var walkable: Dictionary = map_data["walkable"]
	var protected_cells: Dictionary = map_data.get("protected_cells", {})
	var candidates: Array[Dictionary] = []
	for local_y in range(REGION_HEIGHT):
		for x in range(WIDTH):
			var index := local_y * WIDTH + x
			if index >= main_floor.size() or not main_floor[index]:
				continue
			var position := Vector2i(x, start_y + local_y)
			if not walkable.has(position) or room_types.has(position) or protected_cells.has(position):
				continue
			var browser_position := Vector2i(x - START.x, position.y)
			var key := "%d:%d" % [browser_position.x, browser_position.y]
			candidates.append({
				"position": position,
				"key": key,
				"score": MapGenerationRules.seeded_roll(browser_position, map_seed, 7301),
			})
	candidates.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		var left_score := float(left["score"])
		var right_score := float(right["score"])
		return left_score < right_score if left_score != right_score else str(left["key"]) < str(right["key"])
	)

	var selected: Array[Dictionary] = []
	for candidate in candidates:
		if selected.size() >= pile_count:
			break
		var position: Vector2i = candidate["position"]
		var spaced := true
		for other in selected:
			var other_position: Vector2i = other["position"]
			if maxi(absi(position.x - other_position.x), absi(position.y - other_position.y)) < 3:
				spaced = false
				break
		if spaced:
			selected.append(candidate)
	if selected.size() < pile_count:
		for candidate in candidates:
			if selected.size() >= pile_count:
				break
			if not selected.has(candidate):
				selected.append(candidate)
	if selected.is_empty():
		return

	var weights: Array[Dictionary] = []
	var total_weight := 0.0
	for pile in selected:
		var position: Vector2i = pile["position"]
		var browser_position := Vector2i(position.x - START.x, position.y)
		var roll := MapGenerationRules.seeded_roll(browser_position, map_seed, 7302)
		var weight := 0.2 + roll * roll * 2.4
		total_weight += weight
		weights.append({
			"position": position,
			"weight": weight,
			"remainder": 0.0,
			"tie_break": MapGenerationRules.seeded_roll(browser_position, map_seed, 7303),
			"amount": 0,
		})
	var allocated := 0
	for item in weights:
		var exact := float(1000 - pile_count) * float(item["weight"]) / total_weight
		item["amount"] = floori(exact) + 1
		item["remainder"] = exact - floori(exact)
		allocated += int(item["amount"])
	weights.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		var left_remainder := float(left["remainder"])
		var right_remainder := float(right["remainder"])
		return left_remainder > right_remainder if left_remainder != right_remainder else float(left["tie_break"]) < float(right["tie_break"])
	)
	var undistributed := 1000 - allocated
	for index in range(undistributed):
		weights[index]["amount"] = int(weights[index]["amount"]) + 1
	for item in weights:
		map_data["gold_piles"][item["position"]] = int(item["amount"])


static func _carve_route(map_data: Dictionary, from: Vector2i, to: Vector2i, rng: RandomNumberGenerator) -> void:
	var current := from
	var guard := 0
	while current != to and guard < WIDTH + REGION_HEIGHT:
		_add_floor(map_data, current)
		var can_move_x := current.x != to.x
		var can_move_y := current.y != to.y
		if can_move_x and (not can_move_y or rng.randf() < 0.5):
			current.x += 1 if to.x > current.x else -1
		else:
			current.y += 1 if to.y > current.y else -1
		_add_floor(map_data, current, 1 if rng.randf() < 0.18 else 0)
		guard += 1
	_add_floor(map_data, to)


static func _add_floor(map_data: Dictionary, position: Vector2i, radius: int = 0) -> void:
	for y_offset in range(-radius, radius + 1):
		for x_offset in range(-radius, radius + 1):
			var point := position + Vector2i(x_offset, y_offset)
			if point.x < 0 or point.x >= WIDTH:
				continue
			var region_index := _region_index(point.y)
			if region_index < 0:
				continue
			map_data["walkable"][point] = true


static func _reveal_visible(map_data: Dictionary, position: Vector2i) -> void:
	var visible_now: Dictionary = {}
	var seen: Dictionary = map_data.get("seen", {})
	var traversed: Dictionary = {position: true}
	var distance_by_position: Dictionary = {position: 0}
	var queue: Array[Vector2i] = [position]
	visible_now[position] = true
	var queue_index := 0
	while queue_index < queue.size():
		var current: Vector2i = queue[queue_index]
		queue_index += 1
		var current_distance := int(distance_by_position[current])
		if current_distance >= 4:
			continue
		for y_offset in range(-1, 2):
			for x_offset in range(-1, 2):
				if x_offset == 0 and y_offset == 0:
					continue
				var next_position := current + Vector2i(x_offset, y_offset)
				if next_position.x < 0 or next_position.x >= WIDTH \
					or next_position.y < -ROCK_BARRIER_HEIGHT or next_position.y >= HEIGHT \
					or absi(next_position.x - position.x) > 4 \
					or absi(next_position.y - position.y) > 4:
					continue
				visible_now[next_position] = true
				if not is_walkable(map_data, next_position) or traversed.has(next_position):
					continue
				traversed[next_position] = true
				distance_by_position[next_position] = current_distance + 1
				queue.append(next_position)
	for visible_position in visible_now.keys():
		seen[visible_position] = true
	map_data["seen"] = seen
	map_data["visible_now"] = visible_now


static func reveal_visible(map_data: Dictionary, position: Vector2i) -> void:
	_reveal_visible(map_data, position)
	refresh_enemy_memory(map_data)


static func refresh_enemy_memory(map_data: Dictionary) -> void:
	var visible_now: Dictionary = map_data.get("visible_now", {})
	var enemy_positions: Array = map_data.get("enemy_positions", [])
	var enemy_states := ensure_enemy_states(map_data)
	var memory: Dictionary = map_data.get("enemy_memory", {}).duplicate()
	var memory_states: Dictionary = map_data.get("enemy_memory_states", {}).duplicate(true)
	for enemy_index in range(enemy_positions.size()):
		var enemy_id := str(enemy_index)
		if bool(enemy_states[enemy_index].get("defeated", false)):
			memory.erase(enemy_id)
			memory_states.erase(enemy_id)
			continue
		var position: Vector2i = enemy_positions[enemy_index]
		if visible_now.has(position):
			memory[enemy_id] = position
			var state: Dictionary = enemy_states[enemy_index]
			memory_states[enemy_id] = {
				"awareness": str(state.get("awareness", "sleeping")),
				"is_boss": bool(state.get("is_boss", false)),
				"permanent_sleep": bool(state.get("permanent_sleep", false)),
			}
	for enemy_id in memory.keys():
		var last_position: Vector2i = memory[enemy_id]
		if visible_now.has(last_position):
			var index := int(enemy_id)
			if index < 0 or index >= enemy_positions.size() or enemy_positions[index] != last_position:
				memory.erase(enemy_id)
				memory_states.erase(enemy_id)
	map_data["enemy_memory"] = memory
	map_data["enemy_memory_states"] = memory_states


static func ensure_enemy_states(map_data: Dictionary, defeated_positions: Array = []) -> Array:
	var raw_states = map_data.get("enemy_states", [])
	var states: Array = raw_states.duplicate(true) if typeof(raw_states) == TYPE_ARRAY else []
	var enemy_positions: Array = map_data.get("enemy_positions", [])
	var encounters: Dictionary = map_data.get("enemy_encounters", {})
	while states.size() < enemy_positions.size():
		var enemy_index := states.size()
		var position: Vector2i = enemy_positions[enemy_index]
		var encounter_index := int(encounters.get(position, 0))
		states.append({
			"encounter_index": encounter_index,
			"awareness": "sleeping",
			"is_boss": [14, 15, 16].has(encounter_index),
			"permanent_sleep": false,
			"defeated": defeated_positions.has(position),
		})
	for enemy_index in range(states.size()):
		if enemy_index >= enemy_positions.size():
			break
		var state: Dictionary = states[enemy_index]
		var position: Vector2i = enemy_positions[enemy_index]
		if not state.has("encounter_index"):
			state["encounter_index"] = int(encounters.get(position, 0))
		if not state.has("awareness"):
			state["awareness"] = "sleeping"
		if not state.has("is_boss"):
			state["is_boss"] = [14, 15, 16].has(int(state["encounter_index"]))
		if not state.has("permanent_sleep"):
			state["permanent_sleep"] = false
		if defeated_positions.has(position):
			state["defeated"] = true
		elif not state.has("defeated"):
			state["defeated"] = false
		states[enemy_index] = state
	map_data["enemy_states"] = states
	return states


static func mark_enemy_defeated(map_data: Dictionary, position: Vector2i) -> void:
	var enemy_positions: Array = map_data.get("enemy_positions", [])
	var states := ensure_enemy_states(map_data)
	for enemy_index in range(enemy_positions.size()):
		if enemy_positions[enemy_index] != position or bool(states[enemy_index].get("defeated", false)):
			continue
		var state: Dictionary = states[enemy_index]
		state["defeated"] = true
		states[enemy_index] = state
		map_data["enemy_states"] = states
		forget_enemy_memory_at(map_data, position)
		return


static func forget_enemy_memory_at(map_data: Dictionary, position: Vector2i) -> void:
	var memory: Dictionary = map_data.get("enemy_memory", {}).duplicate()
	var memory_states: Dictionary = map_data.get("enemy_memory_states", {}).duplicate(true)
	for enemy_id in memory.keys():
		if memory[enemy_id] == position:
			memory.erase(enemy_id)
			memory_states.erase(enemy_id)
	map_data["enemy_memory"] = memory
	map_data["enemy_memory_states"] = memory_states


static func room_type_at(map_data: Dictionary, position: Vector2i) -> String:
	if not is_walkable(map_data, position):
		return "rock"
	return _room_type(map_data, position)


static func is_safe_area_tile(map_data: Dictionary, position: Vector2i) -> bool:
	var region_index := _region_index(position.y)
	if region_index < 0:
		return false
	var entries: Dictionary = map_data.get("safe_area_entries", {})
	if not entries.has(region_index):
		return false
	var entry: Vector2i = entries[region_index]
	var center := entry + Vector2i(11, 0)
	if position.y == center.y and position.x >= center.x - 11 and position.x <= center.x + 1:
		return true
	return abs(position.y - center.y) == 1 and [center.x - 10, center.x].has(position.x)


static func _room_type(map_data: Dictionary, position: Vector2i) -> String:
	return str(map_data.get("room_types", {}).get(position, "empty"))


static func region_index_at(position: Vector2i) -> int:
	return _region_index(position.y)


static func _region_index(y: int) -> int:
	if y < 0 or y >= HEIGHT:
		return -1
	var region_index := floori(float(y) / REGION_STRIDE)
	if y - region_index * REGION_STRIDE >= REGION_HEIGHT:
		return -1
	return region_index


static func is_walkable(map_data: Dictionary, position: Vector2i) -> bool:
	return bool(map_data.get("walkable", {}).get(position, false))
