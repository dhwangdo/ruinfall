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


## Enemies are stationary chokepoint guardians; combat starts only when the player steps onto an enemy tile.
static func move_toward_player(map_data: Dictionary, _active_center: Vector2i, _player_position: Vector2i, defeated_positions: Array, _seed_value: int) -> Vector2i:
	MapRules.ensure_enemy_states(map_data, defeated_positions)
	MapRules.refresh_enemy_memory(map_data)
	return INVALID_POSITION


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
