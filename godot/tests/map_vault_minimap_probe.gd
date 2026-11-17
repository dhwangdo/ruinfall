extends SceneTree

const MapRules = preload("res://scripts/map_rules.gd")
const MapGenerationRules = preload("res://scripts/map_generation_rules.gd")
const TileAppearance = preload("res://scripts/map_tile_appearance.gd")


func _initialize() -> void:
	for room_type in ["safeEntry", "safeArea", "vaultInterior"]:
		assert(TileAppearance.minimap_color(room_type) == TileAppearance.MINIMAP_FLOOR)
	for seed_value in [20261117, 20261118]:
		var map_data := MapRules.create_empty_map(seed_value)
		for region_index in range(3):
			MapRules.generate_region(map_data, region_index, seed_value)
			var start_y := region_index * MapRules.REGION_STRIDE
			var vault_count := 0
			var first_vault := Vector2i(-1, -1)
			for position in map_data["room_types"]:
				if position.y < start_y or position.y >= start_y + MapRules.REGION_HEIGHT \
						or map_data["room_types"][position] != "deckVault":
					continue
				vault_count += 1
				if first_vault.x < 0:
					first_vault = position
			var counts := MapGenerationRules.roll_region_location_counts(seed_value, region_index)
			var safe_center := MapGenerationRules.safe_area_center(seed_value, region_index,
				MapRules.WIDTH, MapRules.REGION_HEIGHT)
			var blocked := MapGenerationRules.make_blocked_safe_area(MapRules.WIDTH,
				MapRules.REGION_HEIGHT, safe_center)
			var portals := MapGenerationRules.place_region_portals(seed_value, region_index,
				MapRules.WIDTH, MapRules.REGION_HEIGHT, blocked, int(counts["portal"]))
			var layout_seed := MapGenerationRules.region_layout_seed(seed_value, region_index + 1)
			var definitions: Array[Dictionary] = [
				{"id": "spiral-vault", "grid": MapRules.SPIRAL_VAULT, "entrance": Vector2i(0, 7), "mirror": true, "padding": 1},
				{"id": "pillar-vault", "grid": MapRules.PILLAR_VAULT, "entrance": Vector2i(0, 4), "mirror": true, "padding": 1},
			]
			var former_prefab_count := MapGenerationRules.place_region_prefabs(layout_seed,
				region_index + 1, MapRules.WIDTH, MapRules.REGION_HEIGHT, blocked,
				Vector2i(MapRules.START.x, 0), portals, definitions).size()
			var previous_total := roundi(float(int(counts["deckVault"]) + former_prefab_count) * 1.2)
			assert(vault_count == roundi(float(previous_total) * 1.2))
			assert(map_data["protected_cells"].is_empty())
			for position in map_data["room_types"]:
				assert(map_data["room_types"][position] != "vaultInterior")
			if first_vault.x >= 0:
				assert(MapRules.room_type_at(map_data, first_vault) == "deckVault")
				var room_key := "%d,%d" % [first_vault.x, first_vault.y]
				var opened := {}
				opened[room_key] = true
				map_data["opened_deck_vaults"] = opened
				assert(MapRules.room_type_at(map_data, first_vault) == "empty")
				map_data["opened_deck_vaults"] = {}
	print("MAP_VAULT_MINIMAP_PROBE=PASS")
	quit(0)
