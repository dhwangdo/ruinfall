extends RefCounted

const Generation = preload("res://scripts/map_generation_rules.gd")
const MapRules = preload("res://scripts/map_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")


static func region_offset(map_data: Dictionary, position: Vector2i) -> int:
	var key := "%d,%d" % [position.x, position.y]
	var vaults: Dictionary = map_data.get("deck_vaults", {})
	if vaults.has(key):
		return int(vaults[key].get("vault_region_offset", 0))
	var roll := Generation.seeded_roll(position, int(map_data.get("seed", 0)), 9137)
	return 1 if roll < 0.005 else 2 if roll < 0.01 else 0


static func key_cost(deck: Dictionary) -> int:
	return 3 + 2 * int(deck.get("vault_region_offset", 0))


static func generate(map_data: Dictionary, position: Vector2i, first_id: int) -> Dictionary:
	var offset := region_offset(map_data, position)
	var random := RandomNumberGenerator.new()
	random.seed = int(map_data.get("seed", 0)) ^ ((position.x + 17) * 73856093) ^ ((position.y + 31) * 19349663)
	var generated := Catalog.create_region_deck(MapRules.region_index_at(position) + 1 + offset, first_id, random)
	generated.deck["vault_region_offset"] = offset
	return generated
