extends RefCounted
class_name PortMapTravel

const MapRules = preload("res://scripts/map_rules.gd")
const VISION_RADIUS := 4
const ALERT_RESET_DISTANCE := 5
const INVALID_POSITION := Vector2i(-1, -1)
const DIRECTIONS := [
	Vector2i(-1, -1), Vector2i(0, -1), Vector2i(1, -1), Vector2i(-1, 0),
	Vector2i(1, 0), Vector2i(-1, 1), Vector2i(0, 1), Vector2i(1, 1),
]


static func find_enemy_avoiding_route(
	map_data: Dictionary,
	start: Vector2i,
	target: Vector2i,
	defeated_enemies: Array
) -> Array[Vector2i]:
	var seen: Dictionary = map_data.get("seen", {})
	if start == target:
		var start_only: Array[Vector2i] = [start]
		return start_only
	if not seen.has(target) or not MapRules.is_walkable(map_data, target):
		return []

	var walkable: Dictionary = {}
	for seen_position in seen.keys():
		if MapRules.is_walkable(map_data, seen_position):
			walkable[seen_position] = true
	walkable[start] = true

	var enemy_distances: Dictionary = {}
	var distance_queue: Array[Vector2i] = []
	for enemy_position in _known_travel_enemy_positions(map_data, defeated_enemies):
		if walkable.has(enemy_position) and not enemy_distances.has(enemy_position):
			enemy_distances[enemy_position] = 0
			distance_queue.append(enemy_position)
	var distance_index := 0
	while distance_index < distance_queue.size():
		var distance_position: Vector2i = distance_queue[distance_index]
		distance_index += 1
		var next_distance := int(enemy_distances[distance_position]) + 1
		if next_distance >= 6:
			continue
		for direction in DIRECTIONS:
			var distance_neighbor: Vector2i = distance_position + direction
			if not walkable.has(distance_neighbor) or enemy_distances.has(distance_neighbor):
				continue
			enemy_distances[distance_neighbor] = next_distance
			distance_queue.append(distance_neighbor)

	var first_node := {
		"position": start,
		"exposure": [0, 0, 0, 0, 0, 0],
		"steps": 0,
		"turns": 0,
		"direction": -1,
		"previous": INVALID_POSITION,
		"has_previous": false,
		"order": 0,
	}
	var best: Dictionary = {}
	best[start] = first_node
	var heap: Array[Dictionary] = [first_node]
	var order := 1
	while not heap.is_empty():
		var current := _route_heap_pop(heap)
		var current_position: Vector2i = current["position"]
		var current_best: Dictionary = best.get(current_position, {})
		if current_best.is_empty() or int(current_best.get("order", -1)) != int(current["order"]):
			continue
		if current_position == target:
			return _rebuild_route(best, target)
		for direction_index in range(DIRECTIONS.size()):
			var route_neighbor: Vector2i = current_position + DIRECTIONS[direction_index]
			if not walkable.has(route_neighbor):
				continue
			var exposure: Array = current["exposure"].duplicate()
			if enemy_distances.has(route_neighbor):
				exposure[int(enemy_distances[route_neighbor])] += 1
			var next_node := {
				"position": route_neighbor,
				"exposure": exposure,
				"steps": int(current["steps"]) + 1,
				"turns": int(current["turns"]) + (1 if int(current["direction"]) >= 0 and int(current["direction"]) != direction_index else 0),
				"direction": direction_index,
				"previous": current_position,
				"has_previous": true,
				"order": order,
			}
			order += 1
			var previous: Dictionary = best.get(route_neighbor, {})
			if not previous.is_empty() and not _route_node_less(next_node, previous):
				continue
			best[route_neighbor] = next_node
			_route_heap_push(heap, next_node)
	return []


static func _known_travel_enemy_positions(map_data: Dictionary, defeated_enemies: Array) -> Array[Vector2i]:
	var known: Array[Vector2i] = []
	var visible_now: Dictionary = map_data.get("visible_now", {})
	var positions: Array = map_data.get("enemy_positions", [])
	var enemy_states := MapRules.ensure_enemy_states(map_data, defeated_enemies)
	var visible_enemy_ids: Dictionary = {}
	for enemy_index in range(positions.size()):
		var visible_position: Vector2i = positions[enemy_index]
		if bool(enemy_states[enemy_index].get("defeated", false)) or not visible_now.has(visible_position):
			continue
		visible_enemy_ids[str(enemy_index)] = true
		if not known.has(visible_position):
			known.append(visible_position)
	var memory: Dictionary = map_data.get("enemy_memory", {})
	for enemy_id in memory.keys():
		if visible_enemy_ids.has(str(enemy_id)):
			continue
		var memory_enemy_index := int(enemy_id)
		if memory_enemy_index >= 0 and memory_enemy_index < enemy_states.size() \
			and bool(enemy_states[memory_enemy_index].get("defeated", false)):
			continue
		var memory_position: Vector2i = memory[enemy_id]
		if defeated_enemies.has(memory_position) or known.has(memory_position):
			continue
		known.append(memory_position)
	return known


static func _route_node_less(left: Dictionary, right: Dictionary) -> bool:
	var left_exposure: Array = left["exposure"]
	var right_exposure: Array = right["exposure"]
	for index in range(left_exposure.size()):
		if int(left_exposure[index]) != int(right_exposure[index]):
			return int(left_exposure[index]) < int(right_exposure[index])
	if int(left["steps"]) != int(right["steps"]):
		return int(left["steps"]) < int(right["steps"])
	if int(left["turns"]) != int(right["turns"]):
		return int(left["turns"]) < int(right["turns"])
	return int(left["order"]) < int(right["order"])


static func _route_heap_push(heap: Array[Dictionary], node: Dictionary) -> void:
	heap.append(node)
	var index := heap.size() - 1
	while index > 0:
		var parent := floori(float(index - 1) / 2.0)
		if not _route_node_less(node, heap[parent]):
			break
		heap[index] = heap[parent]
		index = parent
	heap[index] = node


static func _route_heap_pop(heap: Array[Dictionary]) -> Dictionary:
	var first: Dictionary = heap[0]
	var last: Dictionary = heap.pop_back()
	if heap.is_empty():
		return first
	var index := 0
	while index * 2 + 1 < heap.size():
		var child := index * 2 + 1
		if child + 1 < heap.size() and _route_node_less(heap[child + 1], heap[child]):
			child += 1
		if not _route_node_less(heap[child], last):
			break
		heap[index] = heap[child]
		index = child
	heap[index] = last
	return first


static func _rebuild_route(best: Dictionary, target: Vector2i) -> Array[Vector2i]:
	var path: Array[Vector2i] = []
	var cursor := target
	while true:
		path.push_front(cursor)
		var node: Dictionary = best[cursor]
		if not bool(node["has_previous"]):
			break
		cursor = node["previous"]
	return path


static func create_auto_explore_progress() -> Dictionary:
	return {
		"threat_history": {},
		"surveyed_rooms": {},
		"avoided_rooms": {},
		"target": INVALID_POSITION,
		"route": [],
		"stop_reason": "",
	}


static func find_safe_path(map_data: Dictionary, start: Vector2i, defeated_enemies: Array, progress: Dictionary) -> Array[Vector2i]:
	var seen: Dictionary = map_data.get("seen", {})
	var avoided := _update_avoided_rooms(map_data, progress, defeated_enemies)
	progress["stop_reason"] = ""
	if not progress.has("surveyed_rooms"):
		progress["surveyed_rooms"] = {}
	if not progress.has("target"):
		progress["target"] = INVALID_POSITION
	if not progress.has("route"):
		progress["route"] = []
	if not seen.has(start) or not MapRules.is_walkable(map_data, start):
		progress["route"] = []
		progress["target"] = INVALID_POSITION
		progress["stop_reason"] = "unsafe"
		return []
	if avoided.has(start):
		progress["route"] = []
		progress["target"] = INVALID_POSITION
		progress["stop_reason"] = "unsafe"
		return []

	var surveyed: Dictionary = progress["surveyed_rooms"]
	surveyed[start] = true
	progress["surveyed_rooms"] = surveyed
	var target: Vector2i = progress["target"]
	if target == start:
		progress["target"] = INVALID_POSITION
		progress["route"] = []
		target = INVALID_POSITION
	if target != INVALID_POSITION:
		var gold_piles: Dictionary = map_data.get("gold_piles", {})
		if not gold_piles.has(target) and _count_unseen_boundary(map_data, seen, target) == 0:
			progress["target"] = INVALID_POSITION
			progress["route"] = []
			target = INVALID_POSITION
		else:
			var old_route: Array = progress.get("route", [])
			var route_index := old_route.find(start)
			if route_index >= 0:
				var remaining: Array[Vector2i] = []
				for index in range(route_index, old_route.size()):
					remaining.append(old_route[index])
				var route_is_safe: bool = remaining.size() > 1 and remaining.back() == target
				for index in range(1, remaining.size()):
					if not _is_known_safe_tile(map_data, remaining[index], avoided):
						route_is_safe = false
						break
				if route_is_safe:
					progress["route"] = remaining
					return _route_steps(remaining)
			progress["target"] = INVALID_POSITION
			progress["route"] = []

	var parents: Dictionary = {start: INVALID_POSITION}
	var distances: Dictionary = {start: 0}
	var queue: Array[Vector2i] = [start]
	var best_goal := INVALID_POSITION
	var best_distance := 1 << 30
	var best_gain := -1
	var best_is_gold := false
	var gold_piles: Dictionary = map_data.get("gold_piles", {})
	var queue_index := 0
	while queue_index < queue.size():
		var position: Vector2i = queue[queue_index]
		queue_index += 1
		var distance := int(distances[position])
		if distance > best_distance:
			break
		if distance > 0:
			var has_gold := int(gold_piles.get(position, 0)) > 0
			var gain := 0 if surveyed.has(position) else _count_unseen_boundary(map_data, seen, position)
			if has_gold or gain > 0:
				var is_better := best_goal == INVALID_POSITION or (has_gold and not best_is_gold) \
					or (has_gold == best_is_gold and gain > best_gain)
				if is_better:
					best_goal = position
					best_distance = distance
					best_gain = gain
					best_is_gold = has_gold
				continue
		for direction in DIRECTIONS:
			var neighbor: Vector2i = position + direction
			if parents.has(neighbor) or not _is_known_safe_tile(map_data, neighbor, avoided):
				continue
			parents[neighbor] = position
			distances[neighbor] = distance + 1
			queue.append(neighbor)

	if best_goal == INVALID_POSITION:
		progress["target"] = INVALID_POSITION
		progress["route"] = []
		progress["stop_reason"] = "blocked" if not avoided.is_empty() \
			and _has_blocked_frontier(map_data, start, parents) else "complete"
		return []

	var path: Array[Vector2i] = [best_goal]
	var cursor: Vector2i = best_goal
	while cursor != start:
		if not parents.has(cursor):
			progress["target"] = INVALID_POSITION
			progress["route"] = []
			progress["stop_reason"] = "blocked"
			return []
		cursor = parents[cursor]
		path.push_front(cursor)
	progress["target"] = best_goal
	progress["route"] = path
	return _route_steps(path)


static func is_safe_known_tile(map_data: Dictionary, position: Vector2i, start: Vector2i, defeated_enemies: Array, progress: Dictionary) -> bool:
	var avoided := _update_avoided_rooms(map_data, progress, defeated_enemies)
	if avoided.has(start):
		return false
	return _is_known_safe_tile(map_data, position, avoided)


static func _route_steps(path: Array[Vector2i]) -> Array[Vector2i]:
	var steps: Array[Vector2i] = []
	for index in range(1, path.size()):
		steps.append(path[index])
	return steps


static func _update_avoided_rooms(map_data: Dictionary, progress: Dictionary, defeated_enemies: Array) -> Dictionary:
	var memory: Dictionary = map_data.get("enemy_memory", {})
	var memory_states: Dictionary = map_data.get("enemy_memory_states", {})
	var active_ids: Dictionary = {}
	var history: Dictionary = progress.get("threat_history", {}).duplicate(true)
	for enemy_id_value in memory.keys():
		var enemy_id := str(enemy_id_value)
		var position: Vector2i = memory[enemy_id_value]
		if defeated_enemies.has(position):
			continue
		active_ids[enemy_id] = true
		var state: Dictionary = memory_states.get(enemy_id, {})
		# Old saves do not contain awareness snapshots, so treat those sightings cautiously.
		var awareness := str(state.get("awareness", "alerted"))
		var boss := bool(state.get("is_boss", false))
		var permanent_sleep := bool(state.get("permanent_sleep", false))
		var snapshot_key := "%s:%d:%d:%s:%s" % [enemy_id, position.x, position.y, awareness, str(boss or permanent_sleep)]
		history[snapshot_key] = {
			"id": enemy_id,
			"position": position,
			"awareness": awareness,
			"is_boss": boss,
			"permanent_sleep": permanent_sleep,
		}
	for snapshot_key in history.keys():
		if not active_ids.has(str(history[snapshot_key].get("id", ""))):
			history.erase(snapshot_key)
	progress["threat_history"] = history

	var blocked := _blocked_rooms_from_history(map_data, history)
	# Rebuild from the currently remembered threats. Keeping cells from a defeated
	# enemy in this set would make later O-routes avoid safe areas forever.
	var avoided: Dictionary = blocked.duplicate()
	progress["avoided_rooms"] = avoided
	return avoided


static func _blocked_rooms_from_history(map_data: Dictionary, history: Dictionary) -> Dictionary:
	var blocked: Dictionary = {}
	var seen: Dictionary = map_data.get("seen", {})
	for snapshot in history.values():
		var position: Vector2i = snapshot["position"]
		var awareness := str(snapshot.get("awareness", "sleeping"))
		var radius := 0 if bool(snapshot.get("is_boss", false)) or bool(snapshot.get("permanent_sleep", false)) \
			else ALERT_RESET_DISTANCE - 1 if awareness == "alerted" \
			else MapRules.ENEMY_PERCEPTION_RANGE + 1 if awareness == "awake" \
			else MapRules.ENEMY_PERCEPTION_RANGE
		var visited: Dictionary = {position: true}
		var queue: Array[Dictionary] = [{"position": position, "distance": 0}]
		blocked[position] = true
		var queue_index := 0
		while queue_index < queue.size():
			var entry: Dictionary = queue[queue_index]
			queue_index += 1
			var current: Vector2i = entry["position"]
			var distance := int(entry["distance"])
			if distance >= radius:
				continue
			for direction in DIRECTIONS:
				var next: Vector2i = current + direction
				if next.x < 0 or next.x >= MapRules.WIDTH or next.y < 0 or next.y >= MapRules.HEIGHT or visited.has(next):
					continue
				if seen.has(next) and not MapRules.is_walkable(map_data, next):
					continue
				visited[next] = true
				blocked[next] = true
				if not seen.has(next) or not MapRules.is_safe_area_tile(map_data, next):
					queue.append({"position": next, "distance": distance + 1})
	return blocked


static func _is_known_safe_tile(map_data: Dictionary, position: Vector2i, avoided: Dictionary) -> bool:
	return map_data.get("seen", {}).has(position) and MapRules.is_walkable(map_data, position) \
		and not avoided.has(position)


static func _count_unseen_boundary(map_data: Dictionary, seen: Dictionary, center: Vector2i) -> int:
	var visited: Dictionary = {center: true}
	var unseen: Dictionary = {}
	var queue: Array[Vector2i] = [center]
	var queue_index := 0
	while queue_index < queue.size():
		var position: Vector2i = queue[queue_index]
		queue_index += 1
		for direction in DIRECTIONS:
			var next: Vector2i = position + direction
			if next.x < 0 or next.x >= MapRules.WIDTH or next.y < 0 or next.y >= MapRules.HEIGHT \
				or maxi(absi(next.x - center.x), absi(next.y - center.y)) > VISION_RADIUS or visited.has(next):
				continue
			visited[next] = true
			if not seen.has(next):
				unseen[next] = true
			elif MapRules.is_walkable(map_data, next):
				queue.append(next)
	return unseen.size()


static func _has_blocked_frontier(map_data: Dictionary, start: Vector2i, safe_reachable: Dictionary) -> bool:
	var seen: Dictionary = map_data.get("seen", {})
	var gold_piles: Dictionary = map_data.get("gold_piles", {})
	var visited: Dictionary = {start: true}
	var queue: Array[Vector2i] = [start]
	var queue_index := 0
	while queue_index < queue.size():
		var position: Vector2i = queue[queue_index]
		queue_index += 1
		if not safe_reachable.has(position) and (int(gold_piles.get(position, 0)) > 0 \
			or _count_unseen_boundary(map_data, seen, position) > 0):
			return true
		for direction in DIRECTIONS:
			var next: Vector2i = position + direction
			if visited.has(next) or not seen.has(next) or not MapRules.is_walkable(map_data, next):
				continue
			visited[next] = true
			queue.append(next)
	return false
