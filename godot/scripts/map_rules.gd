extends RefCounted
class_name PortMapRules

const WIDTH := 212
const REGION_COUNT := 8
const REGION_HEIGHT := 47
const ROCK_BARRIER_HEIGHT := 5
const REGION_STRIDE := REGION_HEIGHT + ROCK_BARRIER_HEIGHT
const HEIGHT := REGION_COUNT * REGION_HEIGHT + (REGION_COUNT - 1) * ROCK_BARRIER_HEIGHT
const START := Vector2i(106, 23)
const MAP_VERSION := 26
const DECK_VAULTS_ENABLED := false
const FUTURE_VAULTS_ENABLED := false
const ENEMY_MIN_MANHATTAN_DIST := 4
const START_COMPONENT_MIN_TILES := 35
const START_COMPONENT_MAX_TILES := 80
const REGION_COMPONENT_MAX_TILES := 135
const PRUNE_MERGE_MAX_TILES := 175
const MIN_SPLIT_FRAGMENT_TILES := 14
const PLAYER_VISION_RADIUS := 6
const DEBUG_VISION_RADIUS := 18 # Player-centered 37x37 square; walls do not occlude it.
const ENEMY_DETECTION_ONE_TILE_CHANCE := 1.0
const ENEMY_DETECTION_TWO_TILE_CHANCE := 0.20
const ENEMY_PERCEPTION_RANGE := 2
const ENEMY_ACTIVE_RADIUS := 4
const ENEMY_START_SAFE_RADIUS := 4
const MAP_ENEMY_SPAWN_CHANCE := 0.045
const ENEMY_CHOKEPOINT_WEIGHT := 4.0
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
		"region_zero_vault_presets": {},
		"floor_deck_spawn_positions": [],
		"pregenerated_floor_decks": {},
		"spawned_floor_deck_positions": {},
		"generated_regions": {},
		"seen": {},
		"visible_now": {},
		"enemy_memory": {},
		"enemy_memory_states": {},
	}


static func finish_map(map_data: Dictionary) -> void:
	ensure_enemy_states(map_data)
	reveal_visible(map_data, START)


static func is_region_generated(map_data: Dictionary, region_index: int) -> bool:
	if region_index < 0 or region_index >= REGION_COUNT:
		return false
	if not map_data.has("generated_regions"):
		return true
	return bool(map_data["generated_regions"].get(region_index, false))


static func next_ungenerated_region(map_data: Dictionary) -> int:
	if not map_data.has("generated_regions"):
		return -1
	var generated: Dictionary = map_data["generated_regions"]
	for region_index in range(REGION_COUNT):
		if not bool(generated.get(region_index, false)):
			return region_index
	return -1


static func merge_region_chunk(target_map: Dictionary, chunk: Dictionary, region_index: int) -> void:
	if is_region_generated(target_map, region_index):
		return
	for dict_key in ["walkable", "room_types", "protected_cells", "gold_piles",
			"enemy_encounters", "safe_area_entries", "safe_portals", "region_zero_vault_presets"]:
		if not target_map.has(dict_key):
			target_map[dict_key] = {}
		var dst: Dictionary = target_map[dict_key]
		var src: Dictionary = chunk.get(dict_key, {})
		for k in src.keys():
			dst[k] = src[k]
	var dst_portals: Array = target_map.get("portal_positions", [])
	for p in chunk.get("portal_positions", []):
		dst_portals.append(p)
	target_map["portal_positions"] = dst_portals
	var dst_enemies: Array = target_map.get("enemy_positions", [])
	for ep in chunk.get("enemy_positions", []):
		dst_enemies.append(ep)
	target_map["enemy_positions"] = dst_enemies
	var dst_floor_decks: Array = target_map.get("floor_deck_spawn_positions", [])
	for dp in chunk.get("floor_deck_spawn_positions", []):
		dst_floor_decks.append(dp)
	target_map["floor_deck_spawn_positions"] = dst_floor_decks
	var dst_pregen: Dictionary = target_map.get("pregenerated_floor_decks", {})
	var src_pregen: Dictionary = chunk.get("pregenerated_floor_decks", {})
	for pk in src_pregen.keys():
		dst_pregen[pk] = src_pregen[pk]
	target_map["pregenerated_floor_decks"] = dst_pregen
	if not target_map.has("generated_regions"):
		target_map["generated_regions"] = {}
	target_map["generated_regions"][region_index] = true
	ensure_enemy_states(target_map)


static func generate_region(map_data: Dictionary, region_index: int, map_seed: int) -> void:
	if region_index == 0:
		_generate_region_zero(map_data, map_seed)
		if not map_data.has("generated_regions"):
			map_data["generated_regions"] = {}
		map_data["generated_regions"][0] = true
		return
	var content_region := region_index - 1
	var start_y := region_index * REGION_STRIDE
	var safe_center_local := MapGenerationRules.safe_area_center(map_seed, content_region, WIDTH, REGION_HEIGHT)
	var safe_center_x := safe_center_local.x
	var safe_center_y := start_y + safe_center_local.y
	var location_counts := MapGenerationRules.roll_region_location_counts(map_seed, content_region)
	var safe_entry := Vector2i(safe_center_x - 15, safe_center_y)
	var safe_area_blocked := MapGenerationRules.make_blocked_safe_area(WIDTH, REGION_HEIGHT, safe_center_local)
	var layout_seed := MapGenerationRules.region_layout_seed(map_seed, content_region + 1)
	# Use the 4 band anchor points to ensure the organic dungeon spans all 4 horizontal bands.
	var anchor_portals := MapGenerationRules.place_region_portals(
		map_seed, content_region, WIDTH, REGION_HEIGHT, safe_area_blocked, int(location_counts["portal"])
	)
	var prefab_definitions: Array[Dictionary] = [
		{"id": "spiral-vault", "grid": SPIRAL_VAULT, "entrance": Vector2i(0, 7), "mirror": true, "padding": 1},
		{"id": "pillar-vault", "grid": PILLAR_VAULT, "entrance": Vector2i(0, 4), "mirror": true, "padding": 1},
	]
	# Preserve the former vault count when disabling setpiece placement.
	var former_prefab_count := MapGenerationRules.place_region_prefabs(
		layout_seed, content_region + 1, WIDTH, REGION_HEIGHT, safe_area_blocked,
		Vector2i(START.x, 0), anchor_portals, prefab_definitions
	).size()
	var layout := MapGenerationRules.generate_floor(
		layout_seed, content_region + 1, WIDTH, REGION_HEIGHT, Vector2i(START.x, 0), anchor_portals,
		safe_area_blocked, []
	)
	var former_vault_count := roundi(float(int(location_counts["deckVault"]) + former_prefab_count) * 1.2)
	location_counts["deckVault"] = roundi(float(former_vault_count) * 1.2)
	for local_y in range(REGION_HEIGHT):
		for x in range(WIDTH):
			if layout["floor"][local_y * WIDTH + x]:
				map_data["walkable"][Vector2i(x, start_y + local_y)] = true

	map_data["safe_area_entries"][region_index] = safe_entry
	# The portal teleports into the gateway chamber (관문); it has no walkable route back into the region.
	# Layout: [safeEntry] - [3x3 safeArea] - [9-tile corridor: partialHeal at start, boss in center] - [3x3 reward/services w/ heal] - [safePortal]
	_add_floor(map_data, safe_entry)
	map_data["room_types"][safe_entry] = "safeEntry"
	for dy in range(-1, 2):
		for dx in range(-14, -11):
			var safe_pos := Vector2i(safe_center_x + dx, safe_center_y + dy)
			_add_floor(map_data, safe_pos)
			map_data["room_types"][safe_pos] = "safeArea"
	for dx in range(-11, -2):
		var corridor_pos := Vector2i(safe_center_x + dx, safe_center_y)
		_add_floor(map_data, corridor_pos)
		map_data["room_types"][corridor_pos] = "empty"
	for dy in range(-1, 2):
		for dx in range(-2, 1):
			var right_pos := Vector2i(safe_center_x + dx, safe_center_y + dy)
			_add_floor(map_data, right_pos)
			map_data["room_types"][right_pos] = "empty"
	var service_types := ["stickerAltar", "cardTransmuter", "tinkerer"]
	var region_point := Vector2i(content_region, 0)
	var first_service := floori(MapGenerationRules.seeded_roll(region_point, map_seed, 8301) * service_types.size())
	var second_service := (first_service + 1 + floori(MapGenerationRules.seeded_roll(region_point, map_seed, 8302) * 2.0)) % service_types.size()
	map_data["room_types"][Vector2i(safe_center_x - 11, safe_center_y)] = "partialHeal"
	map_data["room_types"][Vector2i(safe_center_x - 1, safe_center_y)] = "heal"
	map_data["room_types"][Vector2i(safe_center_x - 1, safe_center_y - 1)] = service_types[first_service]
	map_data["room_types"][Vector2i(safe_center_x - 1, safe_center_y + 1)] = service_types[second_service]
	if content_region < 3:
		map_data["room_types"][Vector2i(safe_center_x - 7, safe_center_y)] = "boss"
	var safe_portal := Vector2i(safe_center_x + 1, safe_center_y)
	_add_floor(map_data, safe_portal)
	if region_index < REGION_COUNT - 1:
		map_data["room_types"][safe_portal] = "safePortal"
		map_data["safe_portals"][region_index] = safe_portal
	else:
		map_data["room_types"][safe_portal] = "empty"

	# 1. Partition the organic dungeon with clean chokepoint enemies (no conga-lines, true cycle cuts).
	var enemy_cells := _place_region_enemy_positions(map_data, map_seed, layout["main"], start_y)
	# 2. Analyze the post-enemy zone graph to place 4 portals, 3 services, and floor decks intentionally.
	var post_features := _place_post_enemy_features(
		map_data, layout["main"], start_y, enemy_cells, location_counts, map_seed, content_region
	)
	for portal_pos in post_features["portals"]:
		map_data["room_types"][portal_pos] = "portal"
		map_data["portal_positions"].append(portal_pos)
	var ordinary_locations: Dictionary = post_features["locations"]
	for pos_key in ordinary_locations.keys():
		var pos: Vector2i = pos_key
		map_data["room_types"][pos] = str(ordinary_locations[pos_key])

	_add_region_gold(map_data, region_index, map_seed, layout["main"])
	if content_region < 3:
		for enemy_position in enemy_cells:
			map_data["enemy_positions"].append(enemy_position)
			var browser_position := Vector2i(enemy_position.x - START.x, enemy_position.y)
			var encounter_roll := MapGenerationRules.seeded_roll(browser_position, map_seed, 4001)
			map_data["enemy_encounters"][enemy_position] = EnemyCatalog.pick_region_encounter_from_roll(content_region, encounter_roll)
		var boss_position := Vector2i(safe_center_x - 7, safe_center_y)
		map_data["enemy_positions"].append(boss_position)
		map_data["enemy_encounters"][boss_position] = 14 + content_region
	if not DECK_VAULTS_ENABLED:
		var floor_spawns: Array = map_data.get("floor_deck_spawn_positions", [])
		for pos_key in ordinary_locations.keys():
			if str(ordinary_locations[pos_key]) == "deckVault":
				var pos: Vector2i = pos_key
				map_data["room_types"].erase(pos)
				floor_spawns.append(pos)
		map_data["floor_deck_spawn_positions"] = floor_spawns
	if not map_data.has("generated_regions"):
		map_data["generated_regions"] = {}
	map_data["generated_regions"][region_index] = true


static func _generate_region_zero(map_data: Dictionary, map_seed: int) -> void:
	var cy := START.y
	# Starting room (3x3: x = 105..107, y = cy-1..cy+1, centered on START)
	for y in range(cy - 1, cy + 2):
		for x in range(105, 108):
			_add_floor(map_data, Vector2i(x, y))
	# Corridor 1 (x = 108..110, y = cy): Battle 1 (2 rats)
	for x in range(108, 111):
		_add_floor(map_data, Vector2i(x, cy))
	var first_enemy := Vector2i(109, cy)
	map_data["enemy_positions"].append(first_enemy)
	map_data["enemy_encounters"][first_enemy] = 90
	# Deck room (3x3: x = 111..113, y = cy-1..cy+1) at the corner of the ㄱ layout
	for y in range(cy - 1, cy + 2):
		for x in range(111, 114):
			_add_floor(map_data, Vector2i(x, y))
	var deck_positions: Array[Vector2i] = [Vector2i(112, cy - 1), Vector2i(113, cy)]
	var presets: Array[int] = [0, 1]
	var preset_rng := RandomNumberGenerator.new()
	preset_rng.seed = map_seed ^ 0x4a3b2c1d
	if preset_rng.randi_range(0, 1) == 1:
		presets = [1, 0]
	var preset_map: Dictionary = map_data.get("region_zero_vault_presets", {})
	var zero_floor_spawns: Array = map_data.get("floor_deck_spawn_positions", [])
	for idx in range(deck_positions.size()):
		var vpos := deck_positions[idx]
		if DECK_VAULTS_ENABLED:
			map_data["room_types"][vpos] = "deckVault"
		else:
			zero_floor_spawns.append(vpos)
		preset_map["%d,%d" % [vpos.x, vpos.y]] = presets[idx]
	map_data["region_zero_vault_presets"] = preset_map
	map_data["floor_deck_spawn_positions"] = zero_floor_spawns
	# Corridor 2 (vertical downward, x = 112, y = cy+2..cy+4): Battle 2 (3 rats)
	for y in range(cy + 2, cy + 5):
		_add_floor(map_data, Vector2i(112, y))
	var second_enemy := Vector2i(112, cy + 3)
	map_data["enemy_positions"].append(second_enemy)
	map_data["enemy_encounters"][second_enemy] = 92
	# Portal room (3x3: x = 111..113, y = cy+5..cy+7)
	for y in range(cy + 5, cy + 8):
		for x in range(111, 114):
			_add_floor(map_data, Vector2i(x, y))
	var portal_pos := Vector2i(112, cy + 6)
	map_data["room_types"][portal_pos] = "portal"
	map_data["portal_positions"].append(portal_pos)

	# Region 0 gateway chamber (관문): 3x3 safeArea - 9-tile corridor (partialHeal at start, boss in center) - 3x3 heal - portal
	var safe_entry := Vector2i(133, cy)
	map_data["safe_area_entries"][0] = safe_entry
	_add_floor(map_data, safe_entry)
	map_data["room_types"][safe_entry] = "safeEntry"
	for dy in range(-1, 2):
		for x in range(134, 137):
			var safe_pos := Vector2i(x, cy + dy)
			_add_floor(map_data, safe_pos)
			map_data["room_types"][safe_pos] = "safeArea"
	for x in range(137, 146):
		var corridor_pos := Vector2i(x, cy)
		_add_floor(map_data, corridor_pos)
		map_data["room_types"][corridor_pos] = "empty"
	map_data["room_types"][Vector2i(137, cy)] = "partialHeal"
	var boss_pos := Vector2i(141, cy)
	map_data["room_types"][boss_pos] = "boss"
	map_data["enemy_positions"].append(boss_pos)
	map_data["enemy_encounters"][boss_pos] = 91
	for dy in range(-1, 2):
		for x in range(146, 149):
			var right_pos := Vector2i(x, cy + dy)
			_add_floor(map_data, right_pos)
			map_data["room_types"][right_pos] = "empty"
	map_data["room_types"][Vector2i(147, cy)] = "heal"
	var safe_portal := Vector2i(149, cy)
	_add_floor(map_data, safe_portal)
	map_data["room_types"][safe_portal] = "safePortal"
	map_data["safe_portals"][0] = safe_portal


static func _compute_corridor_chains(region_cells: Dictionary) -> Dictionary:
	var deg2: Dictionary = {}
	for raw_cell in region_cells.keys():
		var cell: Vector2i = raw_cell
		var deg := 0
		for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			if region_cells.has(cell + dir):
				deg += 1
		if deg == 2:
			deg2[cell] = true
	var chain_of: Dictionary = {}
	var next_id := 0
	for raw_cell in deg2.keys():
		var start_cell: Vector2i = raw_cell
		if chain_of.has(start_cell):
			continue
		var cid := next_id
		next_id += 1
		var q: Array[Vector2i] = [start_cell]
		chain_of[start_cell] = cid
		var qi := 0
		while qi < q.size():
			var cur := q[qi]
			qi += 1
			for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var nxt: Vector2i = cur + dir
				if deg2.has(nxt) and not chain_of.has(nxt):
					chain_of[nxt] = cid
					q.append(nxt)
	return chain_of


static func _place_region_enemy_positions(
	map_data: Dictionary,
	map_seed: int,
	main_floor: PackedByteArray,
	start_y: int
) -> Array[Vector2i]:
	var room_types: Dictionary = map_data["room_types"]
	var walkable: Dictionary = map_data["walkable"]
	var safe_start := Vector2i(START.x, start_y)
	var region_cells: Dictionary = {}
	var eligible_chokepoints: Dictionary = {}
	var chokepoint_patterns: Dictionary = {}
	for local_y in range(REGION_HEIGHT):
		for x in range(WIDTH):
			var position := Vector2i(x, start_y + local_y)
			if not walkable.has(position) or is_gateway_tile(map_data, position):
				continue
			var index := local_y * WIDTH + x
			if index >= main_floor.size() or not main_floor[index]:
				continue
			region_cells[position] = true
			if room_types.has(position) and str(room_types[position]) != "vaultInterior":
				continue
			if maxi(absi(position.x - safe_start.x), absi(position.y - safe_start.y)) <= ENEMY_START_SAFE_RADIUS:
				continue
			if _is_local_enemy_chokepoint(map_data, position, chokepoint_patterns):
				eligible_chokepoints[position] = true
	if region_cells.is_empty() or eligible_chokepoints.is_empty():
		return []

	var corridor_chains := _compute_corridor_chains(region_cells)
	var used_chains: Dictionary = {}
	var placed: Dictionary = {}
	var selected: Array[Vector2i] = []
	var unsplitable_markers: Dictionary = {}
	var max_iterations := mini(220, eligible_chokepoints.size())
	for _iter in range(max_iterations):
		var visited: Dictionary = {}
		var target_comp: Array[Vector2i] = []
		var target_is_start := false
		var best_priority := -1

		for raw_cell in region_cells.keys():
			var cell: Vector2i = raw_cell
			if visited.has(cell) or placed.has(cell):
				continue
			var comp: Array[Vector2i] = []
			var queue: Array[Vector2i] = [cell]
			visited[cell] = true
			var qi := 0
			var has_start := false
			var marker := cell
			while qi < queue.size():
				var cur: Vector2i = queue[qi]
				qi += 1
				comp.append(cur)
				if cur == safe_start:
					has_start = true
				if cur.y < marker.y or (cur.y == marker.y and cur.x < marker.x):
					marker = cur
				for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
					var nxt: Vector2i = cur + dir
					if not visited.has(nxt) and not placed.has(nxt) and region_cells.has(nxt):
						visited[nxt] = true
						queue.append(nxt)
			var marker_key := "%d,%d:%d" % [marker.x, marker.y, comp.size()]
			if unsplitable_markers.has(marker_key):
				continue
			var priority := -1
			if has_start:
				if comp.size() > START_COMPONENT_MAX_TILES:
					priority = 500000 + comp.size()
			elif comp.size() > REGION_COMPONENT_MAX_TILES:
				priority = comp.size()
			if priority > best_priority:
				best_priority = priority
				target_comp = comp
				target_is_start = has_start

		if target_comp.is_empty():
			break

		var cut := _pick_component_split_chokepoint(
			target_comp, safe_start, target_is_start,
			eligible_chokepoints, selected, corridor_chains, used_chains,
			map_seed, ENEMY_MIN_MANHATTAN_DIST
		)
		if cut.x < 0 and target_comp.size() > 160:
			cut = _pick_component_split_chokepoint(
				target_comp, safe_start, target_is_start,
				eligible_chokepoints, selected, corridor_chains, used_chains,
				map_seed, 3
			)
		if cut.x < 0:
			var marker := target_comp[0]
			for c in target_comp:
				if c.y < marker.y or (c.y == marker.y and c.x < marker.x):
					marker = c
			unsplitable_markers["%d,%d:%d" % [marker.x, marker.y, target_comp.size()]] = true
			continue
		placed[cut] = true
		selected.append(cut)
		if corridor_chains.has(cut):
			used_chains[corridor_chains[cut]] = true
	return _prune_redundant_enemies(region_cells, selected, safe_start, eligible_chokepoints, corridor_chains, used_chains)


static func _prune_redundant_enemies(
	region_cells: Dictionary,
	enemies_in: Array[Vector2i],
	safe_start: Vector2i,
	eligible_chokepoints: Dictionary,
	corridor_chains: Dictionary,
	used_chains: Dictionary
) -> Array[Vector2i]:
	var enemies := enemies_in.duplicate()
	var split_attempted_pairs: Dictionary = {}
	for _pass in range(60):
		var enemy_set: Dictionary = {}
		for ep in enemies:
			enemy_set[ep] = true
		# Recompute components excluding current enemies.
		var comp_of: Dictionary = {}
		var comp_tiles: Array = []
		var comp_sizes: Array[int] = []
		var start_comp := -1
		for raw_cell in region_cells.keys():
			var cell: Vector2i = raw_cell
			if comp_of.has(cell) or enemy_set.has(cell):
				continue
			var cid := comp_sizes.size()
			var q: Array[Vector2i] = [cell]
			comp_of[cell] = cid
			var qi := 0
			while qi < q.size():
				var cur := q[qi]
				qi += 1
				if cur == safe_start:
					start_comp = cid
				for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
					var nxt: Vector2i = cur + dir
					if region_cells.has(nxt) and not comp_of.has(nxt) and not enemy_set.has(nxt):
						comp_of[nxt] = cid
						q.append(nxt)
			comp_tiles.append(q)
			comp_sizes.append(q.size())

		var changed := false
		# 1. Always remove every self-loop enemy (all neighbors in <= 1 component).
		var kept: Array[Vector2i] = []
		var pair_enemies: Dictionary = {} # pair_key -> Array[Vector2i]
		for ep in enemies:
			var touched: Array[int] = []
			for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var nxt: Vector2i = ep + dir
				if comp_of.has(nxt):
					var cid := int(comp_of[nxt])
					if not touched.has(cid):
						touched.append(cid)
			if touched.size() <= 1:
				changed = true
				continue
			kept.append(ep)
			if touched.size() == 2:
				var a := mini(touched[0], touched[1])
				var b := maxi(touched[0], touched[1])
				var pk := (a << 14) | b
				if not pair_enemies.has(pk):
					pair_enemies[pk] = []
				(pair_enemies[pk] as Array).append(ep)
		if changed:
			enemies = kept
			continue

		# 2. Resolve parallel-edge enemies: merge (A, B) if under limit, otherwise split the larger side to form a true 3-zone loop!
		var to_remove: Dictionary = {}
		var best_parallel_pk := -1
		var best_parallel_merged := 999999
		for raw_pk in pair_enemies.keys():
			var pk := int(raw_pk)
			var elist: Array = pair_enemies[pk]
			if elist.size() <= 1:
				continue
			var a := pk >> 14
			var b := pk & 0x3fff
			var merged_sz := comp_sizes[a] + comp_sizes[b] + elist.size()
			var max_allowed := (START_COMPONENT_MAX_TILES + 25) if (a == start_comp or b == start_comp) else PRUNE_MERGE_MAX_TILES
			if merged_sz <= max_allowed and merged_sz < best_parallel_merged:
				best_parallel_merged = merged_sz
				best_parallel_pk = pk
		if best_parallel_pk >= 0:
			for ep_raw in pair_enemies[best_parallel_pk]:
				to_remove[ep_raw] = true
			var next_enemies: Array[Vector2i] = []
			for ep in enemies:
				if not to_remove.has(ep):
					next_enemies.append(ep)
			enemies = next_enemies
			continue

		# 2b. For remaining parallel pairs that are too large to merge, split the larger zone between e1 and e2.
		var added_split := Vector2i(-1, -1)
		for raw_pk in pair_enemies.keys():
			var pk := int(raw_pk)
			var elist: Array = pair_enemies[pk]
			if elist.size() <= 1:
				continue
			var a := pk >> 14
			var b := pk & 0x3fff
			var e1: Vector2i = elist[0]
			var e2: Vector2i = elist[1]
			var attempt_key := "%d,%d|%d,%d" % [e1.x, e1.y, e2.x, e2.y]
			if split_attempted_pairs.has(attempt_key):
				continue
			split_attempted_pairs[attempt_key] = true
			var sides: Array[int] = [a, b]
			if comp_sizes[b] > comp_sizes[a]:
				sides = [b, a]
			for side_cid in sides:
				if side_cid == start_comp and comp_sizes[side_cid] < START_COMPONENT_MIN_TILES + 20:
					continue
				var cut := _find_parallel_breaker_cut(
					comp_tiles[side_cid], comp_of, side_cid, e1, e2, safe_start, side_cid == start_comp,
					eligible_chokepoints, enemies, corridor_chains, used_chains
				)
				if cut.x >= 0:
					added_split = cut
					break
			if added_split.x >= 0:
				break
		if added_split.x >= 0:
			enemies.append(added_split)
			if corridor_chains.has(added_split):
				used_chains[corridor_chains[added_split]] = true
			continue

		# 3. Absorb tiny fragments (<= 10 tiles) into an adjacent zone if merged size stays under limit.
		var best_tiny_enemy := Vector2i(-1, -1)
		var best_tiny_merged := 999999
		for ep in enemies:
			var touched: Array[int] = []
			for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var nxt: Vector2i = ep + dir
				if comp_of.has(nxt):
					var cid := int(comp_of[nxt])
					if not touched.has(cid):
						touched.append(cid)
			if touched.size() != 2:
				continue
			var a := touched[0]
			var b := touched[1]
			if mini(comp_sizes[a], comp_sizes[b]) > 10:
				continue
			var merged_sz := comp_sizes[a] + comp_sizes[b] + 1
			var max_allowed := (START_COMPONENT_MAX_TILES + 15) if (a == start_comp or b == start_comp) else PRUNE_MERGE_MAX_TILES
			if merged_sz <= max_allowed and merged_sz < best_tiny_merged:
				best_tiny_merged = merged_sz
				best_tiny_enemy = ep
		if best_tiny_enemy.x >= 0:
			var next_enemies: Array[Vector2i] = []
			for ep in enemies:
				if ep != best_tiny_enemy:
					next_enemies.append(ep)
			enemies = next_enemies
			continue
		break
	return enemies


static func _find_parallel_breaker_cut(
	tiles: Array,
	comp_of: Dictionary,
	side_cid: int,
	e1: Vector2i,
	e2: Vector2i,
	safe_start: Vector2i,
	is_start: bool,
	eligible_chokepoints: Dictionary,
	enemies: Array[Vector2i],
	corridor_chains: Dictionary,
	used_chains: Dictionary
) -> Vector2i:
	var u1 := Vector2i(-1, -1)
	var u2 := Vector2i(-1, -1)
	for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
		if int(comp_of.get(e1 + dir, -1)) == side_cid:
			u1 = e1 + dir
		if int(comp_of.get(e2 + dir, -1)) == side_cid:
			u2 = e2 + dir
	if u1.x < 0 or u2.x < 0 or u1 == u2:
		return Vector2i(-1, -1)

	var tile_set: Dictionary = {}
	for t_raw in tiles:
		tile_set[t_raw] = true

	# Find shortest path between u1 and u2 inside this component; any separating cut MUST lie on this path!
	var parent: Dictionary = {u1: Vector2i(-1, -1)}
	var q: Array[Vector2i] = [u1]
	var qi := 0
	var found := false
	while qi < q.size():
		var cur := q[qi]
		qi += 1
		if cur == u2:
			found = true
			break
		for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var nxt: Vector2i = cur + dir
			if tile_set.has(nxt) and not parent.has(nxt):
				parent[nxt] = cur
				q.append(nxt)
	if not found:
		return Vector2i(-1, -1)

	var path: Array[Vector2i] = []
	var trace := u2
	while trace.x >= 0:
		if trace != u1 and trace != u2:
			path.append(trace)
		trace = parent[trace]

	var best_cut := Vector2i(-1, -1)
	var best_balance := -1
	for cand in path:
		if not eligible_chokepoints.has(cand):
			continue
		if corridor_chains.has(cand) and used_chains.has(corridor_chains[cand]):
			continue
		var too_close := false
		for ep in enemies:
			if absi(cand.x - ep.x) + absi(cand.y - ep.y) < 3:
				too_close = true
				break
		if too_close:
			continue
		# Check if removing cand truly separates u1 from u2 inside this component!
		var vis: Dictionary = {u1: true}
		var bq: Array[Vector2i] = [u1]
		var bqi := 0
		var reaches_u2 := false
		var start_in_u1 := (u1 == safe_start)
		while bqi < bq.size():
			var cur := bq[bqi]
			bqi += 1
			if cur == u2:
				reaches_u2 = true
				break
			if cur == safe_start:
				start_in_u1 = true
			for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var nxt: Vector2i = cur + dir
				if nxt != cand and tile_set.has(nxt) and not vis.has(nxt):
					vis[nxt] = true
					bq.append(nxt)
		if reaches_u2:
			continue
		var sz1 := vis.size()
		var sz2 := tiles.size() - 1 - sz1
		if mini(sz1, sz2) < MIN_SPLIT_FRAGMENT_TILES:
			continue
		if is_start:
			var start_sz := sz1 if start_in_u1 else sz2
			if start_sz < START_COMPONENT_MIN_TILES:
				continue
		var balance := mini(sz1, sz2)
		if balance > best_balance:
			best_balance = balance
			best_cut = cand
	return best_cut


static func _pick_component_split_chokepoint(
	comp: Array[Vector2i],
	safe_start: Vector2i,
	is_start: bool,
	eligible_chokepoints: Dictionary,
	selected_enemies: Array[Vector2i],
	corridor_chains: Dictionary,
	used_chains: Dictionary,
	map_seed: int,
	min_enemy_dist: int
) -> Vector2i:
	var n := comp.size()
	var idx_of: Dictionary = {}
	for i in range(n):
		idx_of[comp[i]] = i

	var root_idx := int(idx_of.get(safe_start, 0)) if is_start else 0
	# Iterative Tarjan DFS for articulation points, subtree sizes, and true cycle membership.
	var disc := PackedInt32Array()
	disc.resize(n)
	disc.fill(-1)
	var low := PackedInt32Array()
	low.resize(n)
	low.fill(0)
	var parent := PackedInt32Array()
	parent.resize(n)
	parent.fill(-1)
	var sub_size := PackedInt32Array()
	sub_size.resize(n)
	sub_size.fill(1)
	var adj: Array = []
	adj.resize(n)
	for i in range(n):
		var nbrs: Array[int] = []
		var pos := comp[i]
		for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var nxt: Vector2i = pos + dir
			if idx_of.has(nxt):
				nbrs.append(int(idx_of[nxt]))
		adj[i] = nbrs

	var next_edge := PackedInt32Array()
	next_edge.resize(n)
	next_edge.fill(0)
	var detached_sum := PackedInt32Array()
	detached_sum.resize(n)
	detached_sum.fill(0)
	var max_detached := PackedInt32Array()
	max_detached.resize(n)
	max_detached.fill(0)
	var has_cycle_child := PackedByteArray()
	has_cycle_child.resize(n)
	has_cycle_child.fill(0)

	var timer := 0
	disc[root_idx] = 0
	low[root_idx] = 0
	timer = 1
	var stack: Array[int] = [root_idx]
	while not stack.is_empty():
		var u: int = stack[stack.size() - 1]
		var nbrs: Array = adj[u]
		var ei := next_edge[u]
		if ei < nbrs.size():
			next_edge[u] = ei + 1
			var v: int = nbrs[ei]
			if disc[v] == -1:
				parent[v] = u
				disc[v] = timer
				low[v] = timer
				timer += 1
				stack.append(v)
			elif v != parent[u]:
				if disc[v] < low[u]:
					low[u] = disc[v]
		else:
			stack.pop_back()
			var p := parent[u]
			if p != -1:
				sub_size[p] += sub_size[u]
				if low[u] < low[p]:
					low[p] = low[u]
				if low[u] <= disc[p] and sub_size[u] >= 2:
					has_cycle_child[p] = 1
				if low[u] >= disc[p]:
					detached_sum[p] += sub_size[u]
					if sub_size[u] > max_detached[p]:
						max_detached[p] = sub_size[u]

	var best_cut := Vector2i(-1, -1)
	var best_score := -1.0
	var fallback_loop_cut := Vector2i(-1, -1)
	var fallback_loop_score := -1.0

	for i in range(n):
		if i == root_idx:
			continue
		var pos := comp[i]
		if not eligible_chokepoints.has(pos):
			continue
		# Never place a second enemy in the same 1-wide corridor chain.
		if corridor_chains.has(pos) and used_chains.has(corridor_chains[pos]):
			continue
		# Hard minimum Manhattan spacing from all already-placed enemies.
		var too_close := false
		for ep in selected_enemies:
			if absi(pos.x - ep.x) + absi(pos.y - ep.y) < min_enemy_dist:
				too_close = true
				break
		if too_close:
			continue
		var jitter := MapGenerationRules.seeded_roll(pos, map_seed, 3107) * 0.5
		var root_side := n - 1 - detached_sum[i]
		if is_start and root_side < START_COMPONENT_MIN_TILES:
			continue

		if max_detached[i] >= MIN_SPLIT_FRAGMENT_TILES and (is_start or root_side >= MIN_SPLIT_FRAGMENT_TILES):
			var split_score := float(mini(root_side, max_detached[i])) + jitter
			if is_start:
				var target_fit := 120.0 - absf(float(root_side) - 55.0)
				split_score = target_fit + minf(float(max_detached[i]), 80.0) * 0.4 + jitter
			if split_score > best_score:
				best_score = split_score
				best_cut = pos
		else:
			# Only break ACTUAL cycles (never dead-end corridor stubs!).
			var on_cycle := (low[i] < disc[i]) or (has_cycle_child[i] != 0)
			if not on_cycle:
				continue
			if (adj[i] as Array).size() < 2:
				continue
			var loop_score := 50.0 + jitter
			if is_start:
				var dist := absi(pos.x - safe_start.x) + absi(pos.y - safe_start.y)
				if dist < 6:
					continue
				loop_score = 100.0 - absf(float(dist) - 11.0) + jitter
			else:
				loop_score = float(mini(sub_size[i], n - sub_size[i])) + jitter
			if loop_score > fallback_loop_score:
				fallback_loop_score = loop_score
				fallback_loop_cut = pos

	return best_cut if best_cut.x >= 0 else fallback_loop_cut


static func _place_post_enemy_features(
	map_data: Dictionary,
	main_floor: PackedByteArray,
	start_y: int,
	enemy_cells: Array[Vector2i],
	location_counts: Dictionary,
	map_seed: int,
	content_region: int
) -> Dictionary:
	var walkable: Dictionary = map_data["walkable"]
	var safe_start := Vector2i(START.x, start_y)
	var enemy_set: Dictionary = {}
	for ep in enemy_cells:
		enemy_set[ep] = true

	var region_cells: Dictionary = {}
	for local_y in range(REGION_HEIGHT):
		for x in range(WIDTH):
			if main_floor[local_y * WIDTH + x] == 0:
				continue
			var pos := Vector2i(x, start_y + local_y)
			if walkable.has(pos) and not is_gateway_tile(map_data, pos):
				region_cells[pos] = true

	# Build post-enemy component graph (zones = connected components, edges = enemies).
	var comp_of: Dictionary = {}
	var comp_tiles: Array = []
	var comp_centroids: Array[Vector2] = []
	var start_comp := 0
	for raw_cell in region_cells.keys():
		var cell: Vector2i = raw_cell
		if comp_of.has(cell) or enemy_set.has(cell):
			continue
		var cid := comp_tiles.size()
		var tiles: Array[Vector2i] = []
		var q: Array[Vector2i] = [cell]
		comp_of[cell] = cid
		var qi := 0
		var sum_x := 0.0
		var sum_y := 0.0
		while qi < q.size():
			var cur := q[qi]
			qi += 1
			tiles.append(cur)
			sum_x += float(cur.x)
			sum_y += float(cur.y - start_y)
			if cur == safe_start:
				start_comp = cid
			for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var nxt: Vector2i = cur + dir
				if region_cells.has(nxt) and not comp_of.has(nxt) and not enemy_set.has(nxt):
					comp_of[nxt] = cid
					q.append(nxt)
		comp_tiles.append(tiles)
		comp_centroids.append(Vector2(sum_x / float(tiles.size()), sum_y / float(tiles.size())))

	var comp_count := comp_tiles.size()
	var comp_adj: Array = []
	comp_adj.resize(comp_count)
	for c in range(comp_count):
		comp_adj[c] = []
	for ep in enemy_cells:
		var touched: Array[int] = []
		for dir in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
			var nxt: Vector2i = ep + dir
			if comp_of.has(nxt):
				var cid := int(comp_of[nxt])
				if not touched.has(cid):
					touched.append(cid)
		for i in range(touched.size()):
			for j in range(i + 1, touched.size()):
				var a := touched[i]
				var b := touched[j]
				if not (comp_adj[a] as Array).has(b):
					(comp_adj[a] as Array).append(b)
				if not (comp_adj[b] as Array).has(a):
					(comp_adj[b] as Array).append(a)

	# BFS battle depth from start_comp.
	var comp_dist := PackedInt32Array()
	comp_dist.resize(comp_count)
	comp_dist.fill(-1)
	if start_comp >= 0 and start_comp < comp_count:
		comp_dist[start_comp] = 0
		var cq: Array[int] = [start_comp]
		var cqi := 0
		while cqi < cq.size():
			var u := cq[cqi]
			cqi += 1
			for nb in comp_adj[u]:
				var v := int(nb)
				if comp_dist[v] == -1:
					comp_dist[v] = comp_dist[u] + 1
					cq.append(v)

	var rng := MapGenerationRules.create_rng(map_seed ^ MapGenerationRules._imul(content_region + 1, 0x517cc1b))
	var used_tiles: Dictionary = {safe_start: true}
	for ep in enemy_cells:
		used_tiles[ep] = true

	# 1. Place 4 portals in 4 horizontal bands, always at battle depth >= 3 (fallback >= 2, >= 1, never start_comp).
	var portals: Array[Vector2i] = []
	var portal_comps: Dictionary = {}
	var portal_count := int(location_counts.get("portal", 4))
	var band_width := float(WIDTH) / maxf(float(portal_count), 1.0)
	for band in range(portal_count):
		var x_min := floori(float(band) * band_width)
		var x_max := WIDTH - 1 if band == portal_count - 1 else floori(float(band + 1) * band_width) - 1
		var best_c := -1
		var best_score := -INF
		for min_req_dist in [3, 2, 1]:
			for c in range(comp_count):
				if c == start_comp or portal_comps.has(c) or comp_dist[c] < min_req_dist:
					continue
				var tiles: Array = comp_tiles[c]
				if tiles.size() < 8:
					continue
				var cx := comp_centroids[c].x
				if cx < float(x_min) or cx > float(x_max):
					continue
				var score := float(comp_dist[c]) * 10.0 + comp_centroids[c].y * 0.9 + MapGenerationRules.next_random(rng) * 8.0
				if (comp_adj[c] as Array).size() == 1:
					score += 4.0
				if score > best_score:
					best_score = score
					best_c = c
			if best_c >= 0:
				break
		if best_c < 0:
			for c in range(comp_count):
				if c == start_comp or portal_comps.has(c) or comp_dist[c] < 1:
					continue
				var score := float(comp_dist[c]) * 10.0 + MapGenerationRules.next_random(rng) * 6.0
				if score > best_score:
					best_score = score
					best_c = c
		if best_c >= 0:
			var tile := _pick_post_enemy_tile(comp_tiles[best_c], comp_centroids[best_c], start_y, used_tiles, {}, enemy_cells, 2, 0)
			if tile.x >= 0:
				used_tiles[tile] = true
				portal_comps[best_c] = true
				portals.append(tile)

	var locations: Dictionary = {} # Vector2i -> kind

	# 2. Place 3 special services (altar / tinkerer / transmuter) in distinct well-spaced non-start zones.
	var service_list: Array[String] = []
	for kind in ["stickerAltar", "tinkerer", "cardTransmuter"]:
		for _i in range(int(location_counts.get(kind, 0))):
			service_list.append(kind)
	var service_comps: Dictionary = {}
	var service_positions: Array[Vector2i] = []
	for kind in service_list:
		var best_c := -1
		var best_score := -INF
		for c in range(comp_count):
			if c == start_comp or comp_dist[c] < 1 or service_comps.has(c) or portal_comps.has(c):
				continue
			if (comp_tiles[c] as Array).size() < 8:
				continue
			var min_sep := 99999.0
			for sp in service_positions:
				var d := Vector2(comp_centroids[c].x - float(sp.x), comp_centroids[c].y - float(sp.y - start_y)).length()
				min_sep = minf(min_sep, d)
			var deg := (comp_adj[c] as Array).size()
			var role_bonus := 14.0 if deg == 1 else (7.0 if deg >= 3 else 0.0)
			var score := minf(min_sep, 75.0) * 1.2 + role_bonus + float(comp_dist[c]) * 2.5 + MapGenerationRules.next_random(rng) * 8.0
			if score > best_score:
				best_score = score
				best_c = c
		if best_c >= 0:
			var tile := _pick_post_enemy_tile(comp_tiles[best_c], comp_centroids[best_c], start_y, used_tiles, locations, enemy_cells, 2, 3)
			if tile.x >= 0:
				used_tiles[tile] = true
				service_comps[best_c] = true
				service_positions.append(tile)
				locations[tile] = kind

	# 3. Place Floor Decks intentionally (dead-end zones guaranteed, deeper zones prioritized, start zone light).
	var deck_target := int(location_counts.get("deckVault", 20))
	var decks_in_comp := PackedInt32Array()
	decks_in_comp.resize(comp_count)
	decks_in_comp.fill(0)
	var placed_decks := 0

	# Guaranteed 1 deck in at least 1 depth-1 zone so the very first battle has immediate deck payoff.
	var depth1_zones: Array[int] = []
	for c in range(comp_count):
		if c != start_comp and comp_dist[c] == 1 and not portal_comps.has(c) and (comp_tiles[c] as Array).size() >= 10:
			depth1_zones.append(c)
	MapGenerationRules._shuffle_ints(depth1_zones, rng)
	var d1_target := mini(2, depth1_zones.size())
	for di in range(d1_target):
		if placed_decks >= deck_target:
			break
		var c := depth1_zones[di]
		var tile := _pick_post_enemy_tile(comp_tiles[c], comp_centroids[c], start_y, used_tiles, locations, enemy_cells, 2, 3)
		if tile.x >= 0:
			used_tiles[tile] = true
			locations[tile] = "deckVault"
			decks_in_comp[c] += 1
			placed_decks += 1

	# Guaranteed 1 deck in meaningful dead-end zones (non-start, non-portal).
	var dead_ends: Array[int] = []
	for c in range(comp_count):
		if c != start_comp and comp_dist[c] >= 1 and not portal_comps.has(c) and decks_in_comp[c] == 0 \
			and (comp_adj[c] as Array).size() == 1 and (comp_tiles[c] as Array).size() >= 10:
			dead_ends.append(c)
	MapGenerationRules._shuffle_ints(dead_ends, rng)
	for c in dead_ends:
		if placed_decks >= deck_target:
			break
		var tile := _pick_post_enemy_tile(comp_tiles[c], comp_centroids[c], start_y, used_tiles, locations, enemy_cells, 2, 3)
		if tile.x >= 0:
			used_tiles[tile] = true
			locations[tile] = "deckVault"
			decks_in_comp[c] += 1
			placed_decks += 1

	for _attempt in range(deck_target * 10):
		if placed_decks >= deck_target:
			break
		var best_c := -1
		var best_score := -INF
		for c in range(comp_count):
			if comp_dist[c] < 0:
				continue
			var sz := (comp_tiles[c] as Array).size()
			if sz < 8:
				continue
			var cap := 1 if (c == start_comp or portal_comps.has(c) or sz < 28) else (3 if sz >= 95 else 2)
			if decks_in_comp[c] >= cap:
				continue
			var score := 0.0
			if c == start_comp:
				score = -6.0
			else:
				score = minf(float(comp_dist[c]), 4.0) * 1.4
				if (comp_adj[c] as Array).size() == 1 and not portal_comps.has(c):
					score += 6.0
				if decks_in_comp[c] == 0:
					score += 6.0
				if sz >= 85:
					score += 3.0
				if service_comps.has(c):
					score -= 2.0
				if portal_comps.has(c):
					score -= 3.0
			score += MapGenerationRules.next_random(rng) * 18.0
			if score > best_score:
				best_score = score
				best_c = c
		if best_c < 0:
			break
		var tile := _pick_post_enemy_tile(comp_tiles[best_c], comp_centroids[best_c], start_y, used_tiles, locations, enemy_cells, 2, 3)
		if tile.x < 0:
			decks_in_comp[best_c] = 99
			continue
		used_tiles[tile] = true
		locations[tile] = "deckVault"
		decks_in_comp[best_c] += 1
		placed_decks += 1

	return {"portals": portals, "locations": locations}


static func _pick_post_enemy_tile(
	tiles: Array,
	centroid: Vector2,
	start_y: int,
	used_tiles: Dictionary,
	locations: Dictionary,
	enemy_cells: Array[Vector2i],
	min_enemy_d: int,
	min_loc_d: int
) -> Vector2i:
	for relaxed in [false, true]:
		var best := Vector2i(-1, -1)
		var best_score := -INF
		var req_ed := 1 if relaxed else min_enemy_d
		var req_ld := 1 if relaxed else min_loc_d
		for raw_t in tiles:
			var t: Vector2i = raw_t
			if used_tiles.has(t):
				continue
			var ed := 999
			for ep in enemy_cells:
				ed = mini(ed, absi(t.x - ep.x) + absi(t.y - ep.y))
			if ed < req_ed:
				continue
			if req_ld > 0:
				var ld := 999
				for raw_loc in locations.keys():
					var lp: Vector2i = raw_loc
					ld = mini(ld, absi(t.x - lp.x) + absi(t.y - lp.y))
				if ld < req_ld:
					continue
			var cd := Vector2(float(t.x) - centroid.x, float(t.y - start_y) - centroid.y).length()
			var score := minf(float(ed), 5.0) * 2.5 - cd * 0.9
			if score > best_score:
				best_score = score
				best = t
		if best.x >= 0:
			return best
	return Vector2i(-1, -1)


static func _is_local_enemy_chokepoint(map_data: Dictionary, position: Vector2i, pattern_cache: Dictionary = {}) -> bool:
	var neighbors: Array[Vector2i] = []
	var mask := 0
	var bit := 1
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			if dx == 0 and dy == 0:
				continue
			var neighbor := position + Vector2i(dx, dy)
			if is_walkable(map_data, neighbor) and not is_gateway_tile(map_data, neighbor):
				neighbors.append(neighbor)
				mask |= bit
			bit <<= 1
	if pattern_cache.has(mask):
		return bool(pattern_cache[mask])
	if neighbors.size() < 2:
		pattern_cache[mask] = false
		return false
	var visited := PackedByteArray()
	visited.resize(neighbors.size())
	visited.fill(0)
	var component_count := 0
	for start_index in range(neighbors.size()):
		if visited[start_index] != 0:
			continue
		component_count += 1
		if component_count >= 2:
			pattern_cache[mask] = true
			return true
		var queue: Array[int] = [start_index]
		visited[start_index] = 1
		var queue_index := 0
		while queue_index < queue.size():
			var index := queue[queue_index]
			queue_index += 1
			for next_index in range(neighbors.size()):
				if visited[next_index] != 0:
					continue
				var offset: Vector2i = neighbors[next_index] - neighbors[index]
				if maxi(absi(offset.x), absi(offset.y)) == 1:
					visited[next_index] = 1
					queue.append(next_index)
	pattern_cache[mask] = false
	return false


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
		if current_distance >= PLAYER_VISION_RADIUS:
			continue
		for y_offset in range(-1, 2):
			for x_offset in range(-1, 2):
				if x_offset == 0 and y_offset == 0:
					continue
				var next_position := current + Vector2i(x_offset, y_offset)
				if next_position.x < 0 or next_position.x >= WIDTH \
					or next_position.y < -ROCK_BARRIER_HEIGHT or next_position.y >= HEIGHT \
					or absi(next_position.x - position.x) > PLAYER_VISION_RADIUS \
					or absi(next_position.y - position.y) > PLAYER_VISION_RADIUS:
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


static func is_in_map_bounds(position: Vector2i) -> bool:
	return position.x >= 0 and position.x < WIDTH and position.y >= -ROCK_BARRIER_HEIGHT and position.y < HEIGHT


static func is_cell_seen_for_display(map_data: Dictionary, position: Vector2i, debug_mode: bool = false) -> bool:
	if debug_mode:
		return is_in_map_bounds(position)
	return map_data.get("seen", {}).has(position)


static func is_cell_visible_for_display(map_data: Dictionary, position: Vector2i, debug_mode: bool = false) -> bool:
	if debug_mode:
		return is_in_map_bounds(position)
	return map_data.get("visible_now", {}).has(position)


static func display_visibility(map_data: Dictionary, position: Vector2i, debug_mode: bool = false) -> Dictionary:
	if not debug_mode:
		return {"seen": map_data.get("seen", {}), "visible_now": map_data.get("visible_now", {})}
	var visible: Dictionary = {}
	var seen: Dictionary = map_data.get("seen", {}).duplicate()
	for y in range(maxi(-ROCK_BARRIER_HEIGHT, position.y - DEBUG_VISION_RADIUS), mini(HEIGHT - 1, position.y + DEBUG_VISION_RADIUS) + 1):
		for x in range(maxi(0, position.x - DEBUG_VISION_RADIUS), mini(WIDTH - 1, position.x + DEBUG_VISION_RADIUS) + 1):
			var cell := Vector2i(x, y)
			visible[cell] = true
			seen[cell] = true
	# Debug display never permanently reveals distant cells in the saved map.
	return {"seen": seen, "visible_now": visible}


static func remember_visible_vaults(map_data: Dictionary, position: Vector2i, debug_mode: bool = false) -> bool:
	var known: Dictionary = map_data.get("known_deck_vaults", {})
	var changed := false
	var visibility := display_visibility(map_data, position, debug_mode)
	for cell in visibility.visible_now:
		if room_type_at(map_data, cell) == "deckVault" and not known.has(cell):
			known[cell] = true
			changed = true
	if changed:
		map_data["known_deck_vaults"] = known
	return changed


static func reveal_visible(map_data: Dictionary, position: Vector2i) -> void:
	_reveal_visible(map_data, position)
	refresh_enemy_memory(map_data)


static func refresh_enemy_memory(map_data: Dictionary) -> void:
	var visible_now: Dictionary = map_data.get("visible_now", {})
	var enemy_positions: Array = map_data.get("enemy_positions", [])
	var enemy_states := ensure_enemy_states(map_data)
	var memory: Dictionary = map_data.get("enemy_memory", {})
	if not map_data.has("enemy_memory"):
		map_data["enemy_memory"] = memory
	var memory_states: Dictionary = map_data.get("enemy_memory_states", {})
	if not map_data.has("enemy_memory_states"):
		map_data["enemy_memory_states"] = memory_states
	for enemy_id in memory.keys():
		var index := int(enemy_id)
		var last_position: Vector2i = memory[enemy_id]
		if index < 0 or index >= enemy_positions.size() \
			or bool(enemy_states[index].get("defeated", false)) \
			or (visible_now.has(last_position) and enemy_positions[index] != last_position):
			memory.erase(enemy_id)
			memory_states.erase(enemy_id)
	for enemy_index in range(enemy_positions.size()):
		var position: Vector2i = enemy_positions[enemy_index]
		if not visible_now.has(position):
			continue
		if bool(enemy_states[enemy_index].get("defeated", false)):
			continue
		var enemy_id := str(enemy_index)
		memory[enemy_id] = position
		var state: Dictionary = enemy_states[enemy_index]
		memory_states[enemy_id] = {
			"awareness": str(state.get("awareness", "sleeping")),
			"is_boss": bool(state.get("is_boss", false)),
			"permanent_sleep": bool(state.get("permanent_sleep", false)),
		}


static func ensure_enemy_states(map_data: Dictionary, defeated_positions: Array = []) -> Array:
	var raw_states = map_data.get("enemy_states", null)
	var states: Array = raw_states if typeof(raw_states) == TYPE_ARRAY else []
	if typeof(raw_states) != TYPE_ARRAY:
		map_data["enemy_states"] = states
	var enemy_positions: Array = map_data.get("enemy_positions", [])
	if defeated_positions.is_empty() and states.size() == enemy_positions.size() \
		and (states.is_empty() or (states[0].size() >= 5 and states[states.size() - 1].size() >= 5)):
		return states
	var encounters: Dictionary = map_data.get("enemy_encounters", {})
	var defeated_lookup: Dictionary = {}
	for defeated_pos in defeated_positions:
		defeated_lookup[defeated_pos] = true
	while states.size() < enemy_positions.size():
		var enemy_index := states.size()
		var position: Vector2i = enemy_positions[enemy_index]
		var encounter_index := int(encounters.get(position, 0))
		states.append({
			"encounter_index": encounter_index,
			"awareness": "sleeping",
			"is_boss": [14, 15, 16, 91].has(encounter_index),
			"permanent_sleep": false,
			"defeated": defeated_lookup.has(position),
		})
	var check_count := mini(states.size(), enemy_positions.size())
	var has_defeated := not defeated_lookup.is_empty()
	for enemy_index in range(check_count):
		var state: Dictionary = states[enemy_index]
		var position: Vector2i = enemy_positions[enemy_index]
		if state.size() < 5:
			if not state.has("encounter_index"):
				state["encounter_index"] = int(encounters.get(position, 0))
			if not state.has("awareness"):
				state["awareness"] = "sleeping"
			if not state.has("is_boss"):
				state["is_boss"] = [14, 15, 16, 91].has(int(state["encounter_index"]))
			if not state.has("permanent_sleep"):
				state["permanent_sleep"] = false
			if not state.has("defeated"):
				state["defeated"] = false
		if has_defeated and defeated_lookup.has(position):
			state["defeated"] = true
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
		if str(map_data.get("room_types", {}).get(position, "")) == "boss":
			map_data["room_types"][position] = "empty"
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
	var room_type := _room_type(map_data, position)
	if room_type == "deckVault":
		var room_key := "%d,%d" % [position.x, position.y]
		if bool(map_data.get("opened_deck_vaults", {}).get(room_key, false)):
			return "empty"
	if room_type == "boss":
		var enemy_positions: Array = map_data.get("enemy_positions", [])
		var enemy_states: Array = map_data.get("enemy_states", [])
		for enemy_index in range(enemy_positions.size()):
			if enemy_positions[enemy_index] == position and enemy_index < enemy_states.size() \
					and bool(enemy_states[enemy_index].get("defeated", false)):
				return "empty"
	return room_type


static func is_safe_area_tile(map_data: Dictionary, position: Vector2i) -> bool:
	var region_index := _region_index(position.y)
	if region_index < 0:
		return false
	var entries: Dictionary = map_data.get("safe_area_entries", {})
	if not entries.has(region_index):
		return false
	var entry: Vector2i = entries[region_index]
	return position.x >= entry.x + 1 and position.x <= entry.x + 3 and absi(position.y - entry.y) <= 1


static func is_gateway_tile(map_data: Dictionary, position: Vector2i) -> bool:
	var region_index := _region_index(position.y)
	if region_index < 0:
		return false
	var entries: Dictionary = map_data.get("safe_area_entries", {})
	if not entries.has(region_index):
		return false
	var entry: Vector2i = entries[region_index]
	if position.y == entry.y and position.x >= entry.x and position.x <= entry.x + 16:
		return true
	if absi(position.y - entry.y) == 1:
		return (position.x >= entry.x + 1 and position.x <= entry.x + 3) \
			or (position.x >= entry.x + 13 and position.x <= entry.x + 15)
	return false


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
