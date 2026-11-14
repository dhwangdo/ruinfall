extends RefCounted
class_name PortMapEnemies

const MapRules = preload("res://scripts/map_rules.gd")
const DIRECTIONS := [
	Vector2i(-1, -1), Vector2i(0, -1), Vector2i(1, -1), Vector2i(-1, 0),
	Vector2i(1, 0), Vector2i(-1, 1), Vector2i(0, 1), Vector2i(1, 1),
]
const INVALID_POSITION := Vector2i(-1, -1)
const ALERT_RESET_DISTANCE := 5
const INF_DISTANCE := 1 << 20


## Only enemies near the tile being left take a turn; movement targets the new player tile.
static func move_toward_player(map_data: Dictionary, active_center: Vector2i, player_position: Vector2i, defeated_positions: Array, seed_value: int) -> Vector2i:
	var enemy_positions: Array = map_data.get("enemy_positions", []).duplicate()
	if enemy_positions.is_empty():
		return INVALID_POSITION
	var enemy_states := MapRules.ensure_enemy_states(map_data, defeated_positions)
	var random := RandomNumberGenerator.new()
	random.seed = seed_value
	var active_enemy_found := false
	for enemy_index in range(enemy_positions.size()):
		var state: Dictionary = enemy_states[enemy_index]
		if bool(state.get("defeated", false)) or bool(state.get("is_boss", false)) \
			or bool(state.get("permanent_sleep", false)):
			continue
		var enemy_position: Vector2i = enemy_positions[enemy_index]
		if _chebyshev_distance(enemy_position, active_center) <= MapRules.ENEMY_ACTIVE_RADIUS:
			active_enemy_found = true
			break
	if not active_enemy_found:
		MapRules.refresh_enemy_memory(map_data)
		return INVALID_POSITION

	var awareness_distances := _distance_field(map_data, player_position)
	var alerted_movers: Array[int] = []
	var awake_movers: Array[int] = []
	for enemy_index in range(enemy_positions.size()):
		var current_position: Vector2i = enemy_positions[enemy_index]
		var state: Dictionary = enemy_states[enemy_index]
		var can_update := not bool(state.get("defeated", false)) \
			and not bool(state.get("is_boss", false)) \
			and not bool(state.get("permanent_sleep", false)) \
			and _chebyshev_distance(current_position, active_center) <= MapRules.ENEMY_ACTIVE_RADIUS
		var state_changed := false

		if can_update:
			var old_distance := int(awareness_distances.get(current_position, INF_DISTANCE))
			var awareness := str(state.get("awareness", "sleeping"))
			if awareness == "alerted" and old_distance >= ALERT_RESET_DISTANCE:
				awareness = "awake"
				state_changed = true
			elif awareness == "awake" and old_distance >= MapRules.ENEMY_ACTIVE_RADIUS and random.randf() < 0.1:
				awareness = "sleeping"
				state_changed = true

			# Match the browser rule: perception uses shortest walkable-path distance, not straight-line proximity.
			var detection_chance := 0.0
			if old_distance == 1:
				detection_chance = MapRules.ENEMY_DETECTION_ONE_TILE_CHANCE
			elif old_distance == 2:
				detection_chance = MapRules.ENEMY_DETECTION_TWO_TILE_CHANCE
			if detection_chance > 0.0 and random.randf() < detection_chance:
				if awareness == "sleeping":
					awareness = "awake"
					state_changed = true
				elif awareness == "awake":
					awareness = "alerted"
					state_changed = true
			state["awareness"] = awareness
			enemy_states[enemy_index] = state

			if not state_changed:
				if awareness == "awake" and random.randf() >= 0.5:
					awake_movers.append(enemy_index)
				elif awareness == "alerted" and random.randf() < 0.95:
					alerted_movers.append(enemy_index)

	var alerted_ids: Dictionary = {}
	for enemy_index in alerted_movers:
		alerted_ids[enemy_index] = true
	var blocked_cells: Dictionary = {}
	for enemy_index in range(enemy_positions.size()):
		if not alerted_ids.has(enemy_index):
			blocked_cells[enemy_positions[enemy_index]] = true
	blocked_cells.erase(player_position)
	var chase_distances := _distance_field(map_data, player_position, blocked_cells)
	var chase_options: Dictionary = {}
	for enemy_index in alerted_movers:
		var current_position: Vector2i = enemy_positions[enemy_index]
		var old_distance := int(chase_distances.get(current_position, INF_DISTANCE))
		var options: Array[Dictionary] = [{
			"position": current_position,
			"distance_reduction": 0,
			"moved": false,
			"manhattan_distance_to_player": _manhattan_distance(current_position, player_position),
		}]
		if old_distance < INF_DISTANCE:
			for direction in DIRECTIONS:
				var destination: Vector2i = current_position + direction
				if blocked_cells.has(destination) or not _is_enemy_walkable(map_data, destination):
					continue
				var next_distance := int(chase_distances.get(destination, INF_DISTANCE))
				if next_distance >= old_distance:
					continue
				options.append({
					"position": destination,
					"distance_reduction": old_distance - next_distance,
					"moved": true,
					"manhattan_distance_to_player": _manhattan_distance(destination, player_position),
				})
		chase_options[enemy_index] = options

	var assignments := _assign_alerted_destinations(
		alerted_movers, chase_options, enemy_positions, player_position
	)
	var planned_positions: Array[Vector2i] = []
	for position in enemy_positions:
		planned_positions.append(position)
	for enemy_index in assignments:
		planned_positions[int(enemy_index)] = assignments[enemy_index]

	var occupied_cells: Dictionary = {}
	for position in planned_positions:
		occupied_cells[position] = true
	occupied_cells.erase(player_position)
	for enemy_index in awake_movers:
		var origin: Vector2i = planned_positions[enemy_index]
		occupied_cells.erase(origin)
		var candidates: Array[Vector2i] = []
		for direction in DIRECTIONS:
			var destination: Vector2i = origin + direction
			if not occupied_cells.has(destination) and _is_enemy_walkable(map_data, destination):
				candidates.append(destination)
		var wander_destination := origin
		if not candidates.is_empty():
			wander_destination = candidates[random.randi_range(0, candidates.size() - 1)]
		planned_positions[enemy_index] = wander_destination
		if wander_destination != player_position:
			occupied_cells[wander_destination] = true

	var updated_encounters: Dictionary = {}
	var collision := INVALID_POSITION
	for enemy_index in range(enemy_positions.size()):
		var next_position: Vector2i = planned_positions[enemy_index]
		enemy_positions[enemy_index] = next_position
		var state: Dictionary = enemy_states[enemy_index]
		updated_encounters[next_position] = int(state.get("encounter_index", 0))
		if next_position == player_position and not bool(state.get("defeated", false)) and collision == INVALID_POSITION:
			collision = next_position

	map_data["enemy_positions"] = enemy_positions
	map_data["enemy_states"] = enemy_states
	map_data["enemy_encounters"] = updated_encounters
	MapRules.refresh_enemy_memory(map_data)
	return collision


static func _assign_alerted_destinations(
	enemy_indexes: Array[int],
	options_by_enemy_index: Dictionary,
	enemy_positions: Array,
	player_position: Vector2i
) -> Dictionary:
	if enemy_indexes.is_empty():
		return {}
	var destination_positions: Array[Vector2i] = []
	var destination_indexes: Dictionary = {}
	var maximum_reduction := 1
	var maximum_manhattan_distance := 0
	for enemy_index in enemy_indexes:
		for option in options_by_enemy_index.get(enemy_index, []):
			var position: Vector2i = option["position"]
			if not destination_indexes.has(position):
				destination_indexes[position] = destination_positions.size()
				destination_positions.append(position)
			maximum_reduction = maxi(maximum_reduction, int(option["distance_reduction"]))
			maximum_manhattan_distance = maxi(maximum_manhattan_distance, int(option["manhattan_distance_to_player"]))

	var source := 0
	var enemy_offset := 1
	var destination_offset := enemy_offset + enemy_indexes.size()
	var sink := destination_offset + destination_positions.size()
	var graph: Array = []
	for _node in range(sink + 1):
		graph.append([])
	var distance_reduction_priority := enemy_indexes.size() * maximum_manhattan_distance + 1
	var movement_priority := enemy_indexes.size() * (
		maximum_reduction * distance_reduction_priority + maximum_manhattan_distance
	) + 1

	for local_index in range(enemy_indexes.size()):
		var enemy_index: int = enemy_indexes[local_index]
		var enemy_node := enemy_offset + local_index
		_add_flow_edge(graph, source, enemy_node, 0)
		for option in options_by_enemy_index.get(enemy_index, []):
			var position: Vector2i = option["position"]
			var destination_node := destination_offset + int(destination_indexes[position])
			var manhattan_bonus := maximum_manhattan_distance - int(option["manhattan_distance_to_player"])
			var score := (movement_priority if bool(option["moved"]) else 0) \
				+ int(option["distance_reduction"]) * distance_reduction_priority + manhattan_bonus
			_add_flow_edge(graph, enemy_node, destination_node, -score, option)

	for destination_index in range(destination_positions.size()):
		var destination: Vector2i = destination_positions[destination_index]
		var capacity := enemy_indexes.size() if destination == player_position else 1
		_add_flow_edge(graph, destination_offset + destination_index, sink, 0, {}, capacity)

	for _flow in range(enemy_indexes.size()):
		var distances: Array[int] = []
		var previous_nodes: Array[int] = []
		var previous_edges: Array[int] = []
		for _node in range(graph.size()):
			distances.append(INF_DISTANCE)
			previous_nodes.append(-1)
			previous_edges.append(-1)
		distances[source] = 0
		for _pass in range(graph.size() - 1):
			var changed := false
			for node in range(graph.size()):
				if distances[node] >= INF_DISTANCE:
					continue
				for edge_index in range(graph[node].size()):
					var edge: Dictionary = graph[node][edge_index]
					if int(edge["capacity"]) <= 0:
						continue
					var target := int(edge["to"])
					var candidate_distance := distances[node] + int(edge["cost"])
					if candidate_distance >= distances[target]:
						continue
					distances[target] = candidate_distance
					previous_nodes[target] = node
					previous_edges[target] = edge_index
					changed = true
			if not changed:
				break
		if distances[sink] >= INF_DISTANCE:
			break
		var node := sink
		while node != source:
			var previous_node := previous_nodes[node]
			if previous_node < 0:
				break
			var edge_index := previous_edges[node]
			var edge: Dictionary = graph[previous_node][edge_index]
			edge["capacity"] = int(edge["capacity"]) - 1
			graph[previous_node][edge_index] = edge
			var reverse_index := int(edge["reverse_index"])
			var reverse_edge: Dictionary = graph[node][reverse_index]
			reverse_edge["capacity"] = int(reverse_edge["capacity"]) + 1
			graph[node][reverse_index] = reverse_edge
			node = previous_node

	var assignments: Dictionary = {}
	for local_index in range(enemy_indexes.size()):
		var enemy_index: int = enemy_indexes[local_index]
		var enemy_node := enemy_offset + local_index
		for edge in graph[enemy_node]:
			if edge.has("option") and int(edge["capacity"]) == 0:
				assignments[enemy_index] = edge["option"]["position"]
				break
		if not assignments.has(enemy_index):
			assignments[enemy_index] = enemy_positions[enemy_index]
	return assignments


static func _add_flow_edge(graph: Array, from: int, to: int, cost: int, option: Dictionary = {}, capacity: int = 1) -> void:
	var forward := {
		"to": to,
		"reverse_index": graph[to].size(),
		"capacity": capacity,
		"cost": cost,
	}
	if not option.is_empty():
		forward["option"] = option
	var reverse := {
		"to": from,
		"reverse_index": graph[from].size(),
		"capacity": 0,
		"cost": -cost,
	}
	graph[from].append(forward)
	graph[to].append(reverse)


static func _distance_field(map_data: Dictionary, origin: Vector2i, blocked_cells: Dictionary = {}) -> Dictionary:
	var distances: Dictionary = {origin: 0}
	var queue: Array[Vector2i] = [origin]
	var queue_index := 0
	while queue_index < queue.size():
		var position: Vector2i = queue[queue_index]
		queue_index += 1
		var distance := int(distances[position])
		for direction in DIRECTIONS:
			var neighbor: Vector2i = position + direction
			if distances.has(neighbor) or blocked_cells.has(neighbor) or not _is_enemy_walkable(map_data, neighbor):
				continue
			distances[neighbor] = distance + 1
			queue.append(neighbor)
	return distances


static func _is_enemy_walkable(map_data: Dictionary, position: Vector2i) -> bool:
	if not MapRules.is_walkable(map_data, position):
		return false
	return not MapRules.is_safe_area_tile(map_data, position)


static func _chebyshev_distance(first: Vector2i, second: Vector2i) -> int:
	return maxi(absi(first.x - second.x), absi(first.y - second.y))


static func _manhattan_distance(first: Vector2i, second: Vector2i) -> int:
	return absi(first.x - second.x) + absi(first.y - second.y)
