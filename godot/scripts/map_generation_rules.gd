extends RefCounted
class_name PortMapGenerationRules

const UINT32_MASK := 0xffffffff
const UINT32_SCALE := 4294967296.0
const CARDINAL_DIRECTIONS := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]


static func _u32(value: int) -> int:
	return value & UINT32_MASK


static func _imul(left: int, right: int) -> int:
	var left_low := _u32(left) & 0xffff
	var left_high := _u32(left) >> 16
	var right_low := _u32(right) & 0xffff
	var right_high := _u32(right) >> 16
	var low_product := left_low * right_low
	var cross_product := left_low * right_high + left_high * right_low
	return _u32(low_product + (cross_product << 16))


static func region_layout_seed(seed_value: int, region_number: int) -> int:
	return _u32(seed_value ^ _imul(region_number, 0x9e3779b9))


static func _urshift(value: int, amount: int) -> int:
	return _u32(value) >> amount


static func create_rng(seed_value: int) -> Dictionary:
	return {"state": _u32(seed_value)}


static func next_random(rng: Dictionary) -> float:
	var state := _u32(int(rng.get("state", 0)) + 0x6d2b79f5)
	rng["state"] = state
	var value := _imul(state ^ _urshift(state, 15), 1 | state)
	value = _u32(value ^ _u32(value + _imul(value ^ _urshift(value, 7), 61 | value)))
	return float(_u32(value ^ _urshift(value, 14))) / UINT32_SCALE


static func seeded_roll(position: Vector2i, seed_value: int, salt: int = 0) -> float:
	var value := _imul(position.x + 17 + salt, 374761393) \
		^ _imul(position.y + 29, 668265263) \
		^ _imul(seed_value + 11, 1442695041)
	value = _imul(value ^ _urshift(value, 13), 1274126177)
	return float(_u32(value ^ _urshift(value, 16))) / UINT32_SCALE


static func safe_area_center(seed_value: int, region_index: int, width: int, region_height: int) -> Vector2i:
	var region_point := Vector2i(region_index, 0)
	var left_side := seeded_roll(region_point, seed_value, 8201) < 0.5
	var min_x := 12 if left_side else 163
	var max_x := 53 if left_side else width - 3
	var center_x := min_x + floori(seeded_roll(region_point, seed_value, 8202) * (max_x - min_x + 1))
	var base_y := floori(float(region_height) / 2.0)
	var center_y := base_y + floori(seeded_roll(region_point, seed_value, 8203) * 5.0) - 2
	return Vector2i(center_x, center_y)


static func roll_region_location_counts(seed_value: int, region_index: int) -> Dictionary:
	var rng := create_rng(seed_value ^ _imul(region_index + 1, 0x127ae39))
	var deck_vault := 16 + floori(next_random(rng) * 7.0)
	# The paused shop quotas still consume their draws, matching the browser sequence.
	next_random(rng)
	next_random(rng)
	var portal := 8 + floori(next_random(rng) * 5.0)
	next_random(rng)
	next_random(rng)
	next_random(rng)
	var sticker_altar := 0
	var tinkerer := 0
	var card_transmuter := 0
	var service_kinds: Array[String] = ["stickerAltar", "tinkerer", "cardTransmuter"]
	for _index in range(3):
		var selected := floori(next_random(rng) * service_kinds.size())
		match service_kinds[selected]:
			"stickerAltar": sticker_altar += 1
			"tinkerer": tinkerer += 1
			"cardTransmuter": card_transmuter += 1
	return {
		"deckVault": deck_vault,
		"shop": 0,
		"bloodShop": 0,
		"portal": portal,
		"stickerAltar": sticker_altar,
		"tinkerer": tinkerer,
		"cardTransmuter": card_transmuter,
	}


static func make_blocked_safe_area(width: int, height: int, center: Vector2i) -> PackedByteArray:
	var blocked := PackedByteArray()
	blocked.resize(width * height)
	blocked.fill(0)
	for y in range(center.y - 2, center.y + 3):
		for x in range(center.x - 12, center.x + 3):
			if x >= 0 and x < width and y >= 0 and y < height:
				blocked[y * width + x] = 1
	return blocked


static func place_region_prefabs(
	seed_value: int,
	region_number: int,
	width: int,
	height: int,
	blocked: PackedByteArray,
	start: Vector2i,
	portals: Array[Vector2i],
	definitions: Array[Dictionary]
) -> Array[Dictionary]:
	var random := create_rng(seed_value ^ _imul(region_number, 0x712e4a))
	var occupied := blocked.duplicate()
	var boundary_points: Array[Vector2i] = [start]
	boundary_points.append_array(portals)
	for point in boundary_points:
		for dy in range(-3, 4):
			for dx in range(-4, 5):
				var x := point.x + dx
				var y := point.y + dy
				if x >= 0 and x < width and y >= 0 and y < height:
					occupied[y * width + x] = 1

	var pool: Array[Dictionary] = []
	for definition in definitions:
		if int(definition.get("max_per_region", 1)) > 0:
			pool.append(definition)
	var counts: Dictionary = {}
	var placements: Array[Dictionary] = []
	while placements.size() < 2 and not pool.is_empty():
		var total_weight := 0.0
		for definition in pool:
			total_weight += float(definition.get("weight", 1.0))
		var cursor := next_random(random) * total_weight
		var selected: Dictionary = pool[pool.size() - 1]
		for definition in pool:
			cursor -= float(definition.get("weight", 1.0))
			if cursor < 0.0:
				selected = definition
				break

		var placement: Dictionary = {}
		var grid: Array[String] = []
		var rotation_options: Array = selected.get("rotations", [0, 90, 180, 270])
		var padding := int(selected.get("padding", 1))
		for _attempt in range(128):
			var rotation: int = rotation_options[floori(next_random(random) * rotation_options.size())]
			var mirrored := bool(selected.get("mirror", false)) and next_random(random) < 0.5
			var transformed := _transform_region_prefab(
				selected["grid"], selected["entrance"], rotation, mirrored
			)
			grid = transformed["grid"]
			var prefab_width := grid[0].length()
			var prefab_height := grid.size()
			if width < prefab_width + padding * 2 + 4 or height < prefab_height + padding * 2 + 4:
				continue
			var left := padding + 2 + floori(next_random(random) * (width - prefab_width - padding * 2 - 3))
			var top := padding + 2 + floori(next_random(random) * (height - prefab_height - padding * 2 - 3))
			var protected_cells: Array[int] = []
			var collision := false
			for y in range(top - padding, top + prefab_height + padding):
				for x in range(left - padding, left + prefab_width + padding):
					for dy in range(-1, 2):
						for dx in range(-1, 2):
							if occupied[(y + dy) * width + x + dx] != 0:
								collision = true
					protected_cells.append(y * width + x)
			if collision:
				continue

			var floor_cells: Array[int] = []
			var required_cells: Array[int] = []
			var exits: Array[int] = []
			var landmarks: Dictionary = {}
			for y in range(prefab_height):
				var row: String = grid[y]
				for x in range(prefab_width):
					var value := row.substr(x, 1)
					var index := (top + y) * width + left + x
					if value != "#" and value != " ":
						floor_cells.append(index)
					if value == "V":
						landmarks[index] = "deckVault"
						_append_unique_int(required_cells, index)
			for port in transformed["ports"]:
				for step in range(padding + 1):
					var x: int = left + int(port["x"]) + int(port["dx"]) * step
					var y: int = top + int(port["y"]) + int(port["dy"]) * step
					var index := y * width + x
					if not floor_cells.has(index):
						floor_cells.append(index)
					_append_unique_int(required_cells, index)
				var exit_x: int = left + int(port["x"]) + int(port["dx"]) * (padding + 1)
				var exit_y: int = top + int(port["y"]) + int(port["dy"]) * (padding + 1)
				var exit_index := exit_y * width + exit_x
				if exit_x <= 0 or exit_x >= width - 1 or exit_y <= 0 or exit_y >= height - 1 or occupied[exit_index] != 0:
					collision = true
				exits.append(exit_index)
				_append_unique_int(required_cells, exit_index)
			if collision:
				continue
			placement = {
				"id": str(selected["id"]),
				"top_left": Vector2i(left, top),
				"grid": grid,
				"width": prefab_width,
				"height": prefab_height,
				"rotation": rotation,
				"mirrored": mirrored,
				"padding": padding,
				"protected_cells": protected_cells,
				"floor_cells": floor_cells,
				"required_cells": required_cells,
				"exits": exits,
				"landmarks": landmarks,
			}
			for index in protected_cells:
				occupied[index] = 1
			break
		if not placement.is_empty():
			placements.append(placement)
			var definition_id := str(selected["id"])
			counts[definition_id] = int(counts.get(definition_id, 0)) + 1
		if placement.is_empty() or int(counts.get(str(selected["id"]), 0)) >= int(selected.get("max_per_region", 1)):
			pool.erase(selected)
	return placements


static func _transform_region_prefab(base_grid: Array, base_entrance: Vector2i, rotation: int, mirrored: bool) -> Dictionary:
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
	return {
		"grid": grid,
		"ports": [{"x": entrance.x, "y": entrance.y, "dx": direction.x, "dy": direction.y}],
	}


static func _append_unique_int(values: Array[int], value: int) -> void:
	if not values.has(value):
		values.append(value)


static func place_region_portals(seed_value: int, region_index: int, width: int, height: int, blocked: PackedByteArray, count: int) -> Array[Vector2i]:
	var rng := create_rng(seed_value ^ _imul(region_index + 1, 0x217ad5))
	var portals: Array[Vector2i] = []
	for band in range(count):
		var x := floori((float(band) + 0.2 + next_random(rng) * 0.6) * width / count)
		var rows: Array[int] = []
		for y in range(2, height):
			if not blocked[y * width + x]:
				rows.append(y)
		var separated: Array[int] = []
		for y in rows:
			var is_separated := true
			for previous in portals:
				if previous.distance_squared_to(Vector2i(x, y)) < 64:
					is_separated = false
					break
			if is_separated:
				separated.append(y)
		if not separated.is_empty():
			rows = separated
		if rows.is_empty():
			assert(false, "No free floor for a required portal")
			return portals
		var total_weight := 0.0
		for y in rows:
			total_weight += float((y + 1) * (y + 1))
		var cursor := next_random(rng) * total_weight
		var chosen_y: int = int(rows.back())
		for y in rows:
			cursor -= float((y + 1) * (y + 1))
			if cursor < 0.0:
				chosen_y = y
				break
		portals.append(Vector2i(x, chosen_y))
	return portals


static func place_region_locations(map_data: Dictionary, counts: Dictionary, seed_value: int, region_index: int, width: int, height: int, start_y: int, safe_center: Vector2i, main_floor: PackedByteArray) -> Dictionary:
	var random := create_rng(seed_value ^ _imul(region_index + 1, 7302) ^ 0x153ab29)
	var walkable: Dictionary = map_data.get("walkable", {})
	var room_types: Dictionary = map_data.get("room_types", {})
	var protected_cells: Dictionary = map_data.get("protected_cells", {})
	var available: Array[int] = []
	var occupied: Array[int] = []
	var landmarks: Dictionary = {}
	for local_y in range(height):
		for x in range(width):
			var position := Vector2i(x, start_y + local_y)
			var index := local_y * width + x
			if room_types.has(position) and ["portal", "deckVault"].has(str(room_types[position])):
				occupied.append(index)
				landmarks[index] = str(room_types[position])
			if x >= safe_center.x - 12 and x <= safe_center.x + 2 \
				and abs(local_y - safe_center.y) <= 2:
				continue
			if index < main_floor.size() and main_floor[index] and walkable.has(position) \
				and not protected_cells.has(position) and not room_types.has(position) \
				and index != floori(float(width) / 2.0):
				available.append(index)
	var result: Dictionary = {}
	var kinds: Array[String] = ["shop", "bloodShop", "deckVault", "stickerAltar", "tinkerer", "cardTransmuter"]
	for kind in kinds:
		var count := int(counts.get(kind, 0))
		if count == 0:
			continue
		var same_kind: Array[int] = []
		for index in landmarks.keys():
			if str(landmarks[index]) == kind:
				same_kind.append(int(index))
		var bands: Array = []
		for _band_index in range(count):
			bands.append([])
		for index in available:
			if result.has(index):
				continue
			var band := mini(count - 1, floori(float(index % width) * count / width))
			bands[band].append(index)
		var order: Array[int] = []
		for band in range(count):
			order.append(band)
		_shuffle_ints(order, random)
		for band in order:
			var candidates: Array[int] = []
			for index in bands[band]:
				if not result.has(index):
					candidates.append(index)
			var has_spaced_candidate := false
			for index in candidates:
				if _every_cell_is_far_enough(index, same_kind, width, 6) \
					and _every_cell_is_far_enough(index, occupied, width, 3):
					has_spaced_candidate = true
					break
			if not has_spaced_candidate:
				candidates.clear()
				for index in available:
					if result.has(index):
						continue
					if _every_cell_is_far_enough(index, same_kind, width, 6) \
						and _every_cell_is_far_enough(index, occupied, width, 3):
						candidates.append(index)
			if candidates.is_empty():
				for index in available:
					if not result.has(index):
						candidates.append(index)
			var target_x := (float(band) + 0.2 + next_random(random) * 0.6) * width / count
			var best := -1
			var best_tier := -1
			var best_score := -INF
			for index in candidates:
				if result.has(index):
					continue
				var nearest_same := _nearest_squared_distance(index, same_kind, width)
				var nearest_any := _nearest_squared_distance(index, occupied, width)
				var tier := 1 if nearest_same >= 36.0 and nearest_any >= 9.0 else 0
				var score := minf(nearest_same, 144.0) * 0.15 + minf(nearest_any, 36.0) * 0.25 \
					- absf(float(index % width) - target_x) * count / width * 8.0 + next_random(random) * 8.0
				if tier > best_tier or (tier == best_tier and score > best_score):
					best = index
					best_tier = tier
					best_score = score
			if best < 0:
				assert(false, "Not enough main-continent floor for %s quota" % kind)
				return result
			result[best] = kind
			same_kind.append(best)
			occupied.append(best)
	return result


static func _shuffle_ints(values: Array[int], random: Dictionary) -> void:
	for index in range(values.size() - 1, 0, -1):
		var other := floori(next_random(random) * (index + 1))
		var value := values[index]
		values[index] = values[other]
		values[other] = value


static func _every_cell_is_far_enough(index: int, points: Array[int], width: int, minimum_distance: int) -> bool:
	var minimum_squared := minimum_distance * minimum_distance
	for other in points:
		if _squared_distance(index, other, width) < minimum_squared:
			return false
	return true


static func _nearest_squared_distance(index: int, points: Array[int], width: int) -> float:
	var nearest := INF
	for other in points:
		nearest = minf(nearest, float(_squared_distance(index, other, width)))
	return nearest


static func _squared_distance(left: int, right: int, width: int) -> int:
	return (left % width - right % width) * (left % width - right % width) \
		+ (floori(float(left) / width) - floori(float(right) / width)) * (floori(float(left) / width) - floori(float(right) / width))


static func generate_floor(
	seed_value: int,
	region_number: int,
	width: int,
	height: int,
	start: Vector2i,
	portals: Array[Vector2i],
	blocked: PackedByteArray,
	prefabs: Array[Dictionary] = []
) -> Dictionary:
	var size := width * height
	var random := create_rng(seed_value ^ _imul(region_number, 0x45d9f3b))
	var floor_cells := PackedByteArray()
	floor_cells.resize(size)
	floor_cells.fill(0)
	var fixed_floor := PackedByteArray()
	fixed_floor.resize(size)
	fixed_floor.fill(0)
	var protected_cells := PackedByteArray()
	protected_cells.resize(size)
	protected_cells.fill(0)
	var forbidden := blocked.duplicate()
	var nodes: Array[Dictionary] = []
	var room_candidates: Array[Dictionary] = []
	var required: Array[int] = []
	for placement in prefabs:
		for index in placement["protected_cells"]:
			forbidden[index] = 1
			protected_cells[index] = 1
		for index in placement["floor_cells"]:
			floor_cells[index] = 1
			fixed_floor[index] = 1
		for index in placement["required_cells"]:
			_append_unique_int(required, index)
		var top_left: Vector2i = placement["top_left"]
		var center := (top_left.y + floori(float(placement["height"]) / 2.0)) * width \
			+ top_left.x + floori(float(placement["width"]) / 2.0)
		nodes.append({"index": center, "exits": placement["exits"], "prefab": true})
	for boundary_index in range(portals.size() + 1):
		var point: Vector2i = start if boundary_index == 0 else portals[boundary_index - 1]
		var point_index := point.y * width + point.x
		floor_cells[point_index] = 1
		_append_unique_int(required, point_index)
		var center := Vector2i(clampi(point.x, 1, width - 2), clampi(point.y, 1, height - 2))
		var portal := boundary_index > 0
		_add_layout_node(
			nodes, room_candidates, floor_cells, forbidden, random, width, height,
			center.x, center.y, 2.4 if portal else 2.0, 1.5 if portal else 1.4
		)

	var target := maxi(nodes.size(), floori(float(size) / 95.0))
	for _attempt in range(target * 90):
		if nodes.size() >= target:
			break
		var x := 5 + floori(next_random(random) * (width - 10))
		var y := 5 + floori(next_random(random) * (height - 10))
		var near_node := false
		for node in nodes:
			var node_index: int = node["index"]
			if _squared_distance(node_index, y * width + x, width) < 36:
				near_node = true
				break
		if near_node:
			continue
		var area_blocked := false
		for dy in range(-4, 5):
			for dx in range(-5, 6):
				var xx := x + dx
				var yy := y + dy
				if xx < 0 or xx >= width or yy < 0 or yy >= height or forbidden[yy * width + xx]:
					area_blocked = true
					break
			if area_blocked:
				break
		if not area_blocked:
			_add_layout_node(nodes, room_candidates, floor_cells, forbidden, random, width, height, x, y)

	var edges := _layout_connection_edges(nodes, width, random)
	var costs := PackedFloat32Array()
	costs.resize(size)
	for index in range(size):
		costs[index] = 1.0 + next_random(random) * 6.0
	for edge in edges:
		var from_index := int(nodes[edge[0]]["exits"][0])
		var to_index := int(nodes[edge[1]]["exits"][0])
		var best_distance := INF
		for left in nodes[edge[0]]["exits"]:
			for right in nodes[edge[1]]["exits"]:
				var candidate_distance := float(_squared_distance(int(left), int(right), width))
				if candidate_distance < best_distance:
					best_distance = candidate_distance
					from_index = int(left)
					to_index = int(right)
		_carve_weighted_corridor(from_index, to_index, width, height, floor_cells, forbidden, costs)
	for node in nodes:
		if not bool(node.get("prefab", false)):
			continue
		for exit_index in node["exits"]:
			var nearest_index := -1
			var nearest_distance := INF
			for other in nodes:
				if bool(other.get("prefab", false)):
					continue
				var candidate_distance := float(_squared_distance(int(exit_index), int(other["index"]), width))
				if candidate_distance < nearest_distance:
					nearest_distance = candidate_distance
					nearest_index = int(other["index"])
			if nearest_index >= 0:
				_carve_weighted_corridor(int(exit_index), nearest_index, width, height, floor_cells, forbidden, costs)

	var distance := PackedFloat64Array()
	distance.resize(size)
	distance.fill(INF)
	var field_heap_indices: Array[int] = []
	var field_heap_priorities: Array[float] = []
	for source in range(size):
		if not floor_cells[source] or forbidden[source]:
			continue
		distance[source] = 0.0
		_heap_push(field_heap_indices, field_heap_priorities, source, 0.0)
	while not field_heap_indices.is_empty():
		var current_entry := _heap_pop(field_heap_indices, field_heap_priorities)
		var current: int = current_entry[0]
		var current_distance: float = current_entry[1]
		if current_distance > distance[current]:
			continue
		var current_x := current % width
		var current_y := floori(float(current) / width)
		for dy in range(-1, 2):
			for dx in range(-1, 2):
				if dx == 0 and dy == 0:
					continue
				var x := current_x + dx
				var y := current_y + dy
				if not _inside_layout(x, y, width, height):
					continue
				var index := y * width + x
				if forbidden[index]:
					continue
				var step_cost := sqrt(2.0) if dx != 0 and dy != 0 else 1.0
				var next_distance := current_distance + step_cost
				if next_distance > 2.8 or next_distance >= distance[index]:
					continue
				distance[index] = next_distance
				_heap_push(field_heap_indices, field_heap_priorities, index, next_distance)
	for index in range(size):
		if is_inf(distance[index]):
			continue
		var x := index % width
		var y := floori(float(index) / width)
		var radius := 0.05 + 1.25 * _spatial_noise(x, y, 8.0, seed_value + 13) \
			+ 0.30 * _spatial_noise(x, y, 3.0, seed_value + 57) \
			+ 0.55 * (_grid_noise(x, y, seed_value + 211) - 0.5)
		if distance[index] <= radius:
			floor_cells[index] = 1
	for candidate in room_candidates:
		var center: int = candidate["center"]
		if _grid_noise(center % width, floori(float(center) / width), seed_value + 417) < 0.28:
			for index in candidate["cells"]:
				floor_cells[index] = 1

	var rough_random := create_rng(seed_value ^ 0x356ead)
	var origins: Array[int] = []
	for index in range(size):
		if floor_cells[index] and not forbidden[index]:
			origins.append(index)
	for _branch in range(floori(float(width) / 5.0)):
		if origins.is_empty():
			break
		var current := origins[floori(next_random(rough_random) * origins.size())]
		var direction := floori(next_random(rough_random) * CARDINAL_DIRECTIONS.size())
		var length := 2 + floori(next_random(rough_random) * 7.0)
		for _step in range(length):
			if next_random(rough_random) < 0.35:
				direction = floori(next_random(rough_random) * CARDINAL_DIRECTIONS.size())
			var point: Vector2i = Vector2i(current % width, floori(float(current) / width)) + CARDINAL_DIRECTIONS[direction]
			if not _inside_layout(point.x, point.y, width, height) or forbidden[point.y * width + point.x]:
				break
			current = point.y * width + point.x
			floor_cells[current] = 1

	var main := _flood_floor(floor_cells, width, height, start.y * width + start.x)
	for index in required:
		if not main["cells"][index]:
			return {"floor": floor_cells, "main": main["cells"], "nodes": _node_positions(nodes, width), "valid": false}
	var floor_count := 0
	for index in range(size):
		if floor_cells[index]:
			floor_count += 1
	var pocket_random := create_rng(seed_value ^ 0x56d3e9)
	var pocket_target := roundi(float(main["count"]) * (1.0 - 0.97) / 0.97)
	for _attempt in range(1200):
		if floor_count - int(main["count"]) >= pocket_target:
			break
		var x := 2 + floori(next_random(pocket_random) * (width - 4))
		var y := 2 + floori(next_random(pocket_random) * (height - 4))
		if forbidden[y * width + x] or _touches_floor(x, y, width, height, floor_cells):
			continue
		var length := 2 + floori(next_random(pocket_random) * 13.0)
		for _step in range(length):
			var index := y * width + x
			if not _inside_layout(x, y, width, height) or forbidden[index] or _touches_floor(x, y, width, height, main["cells"]):
				break
			if not floor_cells[index]:
				floor_cells[index] = 1
				floor_count += 1
			var direction: Vector2i = CARDINAL_DIRECTIONS[floori(next_random(pocket_random) * CARDINAL_DIRECTIONS.size())]
			x += direction.x
			y += direction.y
	for index in range(size):
		if protected_cells[index] and floor_cells[index] != fixed_floor[index]:
			return {"floor": floor_cells, "main": main["cells"], "nodes": _node_positions(nodes, width), "valid": false}
		if blocked[index] and floor_cells[index]:
			return {"floor": floor_cells, "main": main["cells"], "nodes": _node_positions(nodes, width), "valid": false}
	return {
		"floor": floor_cells,
		"main": main["cells"],
		"nodes": _node_positions(nodes, width),
		"floor_count": floor_count,
		"main_floor_count": main["count"],
		"valid": float(main["count"]) / maxf(float(floor_count), 1.0) >= 0.90,
	}


static func _add_layout_node(nodes: Array[Dictionary], room_candidates: Array[Dictionary], floor_cells: PackedByteArray, forbidden: PackedByteArray, random: Dictionary, width: int, height: int, x: int, y: int, rx: float = -1.0, ry: float = -1.0) -> void:
	if rx < 0.0:
		rx = 2.0 + next_random(random) * 1.4
	if ry < 0.0:
		ry = 1.5 + next_random(random) * 1.2
	var index := y * width + x
	var cells: Array[int] = []
	for yy in range(floori(float(y) - ry - 1.0), ceili(float(y) + ry + 1.0)):
		for xx in range(floori(float(x) - rx - 1.0), ceili(float(x) + rx + 1.0)):
			if not _inside_layout(xx, yy, width, height):
				continue
			var cell := yy * width + xx
			if forbidden[cell]:
				continue
			var ellipse := pow((float(xx) - x) / rx, 2.0) + pow((float(yy) - y) / ry, 2.0)
			if ellipse < 0.9 + next_random(random) * 0.25:
				cells.append(cell)
	floor_cells[index] = 1
	room_candidates.append({"center": index, "cells": cells})
	nodes.append({"index": index, "exits": [index], "prefab": false})


static func _node_positions(nodes: Array[Dictionary], width: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for node in nodes:
		if bool(node.get("prefab", false)):
			continue
		var index: int = node["index"]
		result.append(Vector2i(index % width, floori(float(index) / width)))
	return result


static func _layout_connection_edges(nodes: Array[Dictionary], width: int, random: Dictionary) -> Array:
	var edges: Array = []
	if nodes.size() < 2:
		return edges
	var selected := PackedByteArray()
	selected.resize(nodes.size())
	selected.fill(0)
	var best := PackedFloat64Array()
	best.resize(nodes.size())
	best.fill(INF)
	var parents := PackedInt32Array()
	parents.resize(nodes.size())
	parents.fill(-1)
	best[0] = 0.0
	for _step in range(nodes.size()):
		var next := -1
		for index in range(nodes.size()):
			if not selected[index] and (next < 0 or best[index] < best[next]):
				next = index
		if next < 0:
			break
		selected[next] = 1
		if parents[next] >= 0:
			edges.append([parents[next], next])
		for candidate in range(nodes.size()):
			if selected[candidate]:
				continue
			var distance := float(_squared_distance(int(nodes[next]["index"]), int(nodes[candidate]["index"]), width))
			if distance < best[candidate]:
				best[candidate] = distance
				parents[candidate] = next
	var tree_distances := _tree_path_distances(nodes.size(), edges, nodes, width)
	var alternatives: Array = []
	for left in range(nodes.size()):
		for right in range(left + 1, nodes.size()):
			var direct := sqrt(float(_squared_distance(int(nodes[left]["index"]), int(nodes[right]["index"]), width)))
			if direct < 24.0 and float(tree_distances[left][right]) > direct * 1.8:
				alternatives.append([left, right])
	_shuffle_values(alternatives, random)
	var extra_limit := ceili(float(nodes.size()) * 0.45)
	for index in range(mini(extra_limit, alternatives.size())):
		edges.append(alternatives[index])
	return edges


static func _tree_path_distances(node_count: int, edges: Array, nodes: Array[Dictionary], width: int) -> Array:
	var adjacency: Array = []
	for _index in range(node_count):
		adjacency.append([])
	for edge in edges:
		var left: int = edge[0]
		var right: int = edge[1]
		var distance := sqrt(float(_squared_distance(int(nodes[left]["index"]), int(nodes[right]["index"]), width)))
		adjacency[left].append({"node": right, "distance": distance})
		adjacency[right].append({"node": left, "distance": distance})
	var matrix: Array = []
	for source in range(node_count):
		var distances := PackedFloat64Array()
		distances.resize(node_count)
		distances.fill(INF)
		distances[source] = 0.0
		var stack: Array[int] = [source]
		var visited := PackedByteArray()
		visited.resize(node_count)
		visited.fill(0)
		visited[source] = 1
		while not stack.is_empty():
			var current: int = stack.pop_back()
			for edge in adjacency[current]:
				var next: int = edge["node"]
				if visited[next]:
					continue
				visited[next] = 1
				distances[next] = distances[current] + float(edge["distance"])
				stack.append(next)
		matrix.append(distances)
	return matrix


static func _shuffle_values(values: Array, random: Dictionary) -> void:
	for index in range(values.size() - 1, 0, -1):
		var other := floori(next_random(random) * (index + 1))
		var value = values[index]
		values[index] = values[other]
		values[other] = value


static func _carve_weighted_corridor(start: int, goal: int, width: int, height: int, floor_cells: PackedByteArray, forbidden: PackedByteArray, costs: PackedFloat32Array) -> void:
	var distance := PackedFloat64Array()
	distance.resize(width * height)
	distance.fill(INF)
	var previous := PackedInt32Array()
	previous.resize(width * height)
	previous.fill(-1)
	var heap_indices: Array[int] = []
	var heap_priorities: Array[float] = []
	distance[start] = 0.0
	_heap_push(heap_indices, heap_priorities, start, 0.0)
	var goal_point := Vector2i(goal % width, floori(float(goal) / width))
	while not heap_indices.is_empty():
		var current_entry := _heap_pop(heap_indices, heap_priorities)
		var current: int = current_entry[0]
		var current_priority: float = current_entry[1]
		# The heap key is A* priority; compare the stored path cost separately.
		var current_cost := distance[current]
		var current_point := Vector2i(current % width, floori(float(current) / width))
		var current_heuristic := absi(current_point.x - goal_point.x) + absi(current_point.y - goal_point.y)
		if current_priority > current_cost + float(current_heuristic):
			continue
		if current == goal:
			break
		for direction in CARDINAL_DIRECTIONS:
			var next_point: Vector2i = current_point + direction
			if not _inside_layout(next_point.x, next_point.y, width, height):
				continue
			var next := next_point.y * width + next_point.x
			if forbidden[next]:
				continue
			var next_cost := current_cost + costs[next]
			if next_cost >= distance[next]:
				continue
			distance[next] = next_cost
			previous[next] = current
			var heuristic := absi(next_point.x - goal_point.x) + absi(next_point.y - goal_point.y)
			_heap_push(heap_indices, heap_priorities, next, next_cost + float(heuristic))
	if is_inf(distance[goal]):
		return
	var cursor := goal
	while cursor >= 0:
		floor_cells[cursor] = 1
		if cursor == start:
			break
		cursor = previous[cursor]


static func _heap_push(indices: Array[int], priorities: Array[float], cell: int, priority: float) -> void:
	var cursor := indices.size()
	indices.append(cell)
	priorities.append(priority)
	while cursor > 0:
		var parent := floori(float(cursor - 1) / 2.0)
		if priorities[parent] < priority or (priorities[parent] == priority and indices[parent] <= cell):
			break
		indices[cursor] = indices[parent]
		priorities[cursor] = priorities[parent]
		cursor = parent
	indices[cursor] = cell
	priorities[cursor] = priority


static func _heap_pop(indices: Array[int], priorities: Array[float]) -> Array:
	var first_index: int = indices[0]
	var first_priority: float = priorities[0]
	var last_index: int = indices.pop_back()
	var last_priority: float = priorities.pop_back()
	if indices.is_empty():
		return [first_index, first_priority]
	var cursor := 0
	while cursor * 2 + 1 < indices.size():
		var child := cursor * 2 + 1
		if child + 1 < indices.size() and (priorities[child + 1] < priorities[child] \
			or (priorities[child + 1] == priorities[child] and indices[child + 1] < indices[child])):
			child += 1
		if priorities[child] > last_priority or (priorities[child] == last_priority and indices[child] >= last_index):
			break
		indices[cursor] = indices[child]
		priorities[cursor] = priorities[child]
		cursor = child
	indices[cursor] = last_index
	priorities[cursor] = last_priority
	return [first_index, first_priority]


static func _grid_noise(x: int, y: int, seed_value: int) -> float:
	var value := _imul(x, 374761393) ^ _imul(y, 668265263) ^ _imul(seed_value, 1442695041)
	value = _imul(value ^ _urshift(value, 13), 1274126177)
	return float(_u32(value ^ _urshift(value, 16))) / UINT32_SCALE


static func _spatial_noise(x: int, y: int, scale: float, seed_value: int) -> float:
	var xx := float(x) / scale
	var yy := float(y) / scale
	var ix := floori(xx)
	var iy := floori(yy)
	var sx := xx - ix
	var sy := yy - iy
	var tx := sx * sx * (3.0 - 2.0 * sx)
	var ty := sy * sy * (3.0 - 2.0 * sy)
	var a := _grid_noise(ix, iy, seed_value) * (1.0 - tx) + _grid_noise(ix + 1, iy, seed_value) * tx
	var b := _grid_noise(ix, iy + 1, seed_value) * (1.0 - tx) + _grid_noise(ix + 1, iy + 1, seed_value) * tx
	return a * (1.0 - ty) + b * ty


static func _flood_floor(floor_cells: PackedByteArray, width: int, height: int, start: int) -> Dictionary:
	var visited := PackedByteArray()
	visited.resize(floor_cells.size())
	visited.fill(0)
	if not floor_cells[start]:
		return {"cells": visited, "count": 0}
	var queue: Array[int] = [start]
	visited[start] = 1
	var cursor := 0
	while cursor < queue.size():
		var index := queue[cursor]
		cursor += 1
		var x := index % width
		var y := floori(float(index) / width)
		for dy in range(-1, 2):
			for dx in range(-1, 2):
				var xx := x + dx
				var yy := y + dy
				if (dx == 0 and dy == 0) or xx < 0 or xx >= width or yy < 0 or yy >= height:
					continue
				var next := yy * width + xx
				if not floor_cells[next] or visited[next]:
					continue
				visited[next] = 1
				queue.append(next)
	return {"cells": visited, "count": queue.size()}


static func _touches_floor(x: int, y: int, width: int, height: int, floor_cells: PackedByteArray) -> bool:
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			var xx := x + dx
			var yy := y + dy
			if xx >= 0 and xx < width and yy >= 0 and yy < height and floor_cells[yy * width + xx]:
				return true
	return false


static func _inside_layout(x: int, y: int, width: int, height: int) -> bool:
	return x > 0 and x < width - 1 and y > 0 and y < height - 1
