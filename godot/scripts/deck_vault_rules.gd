extends RefCounted

const Generation = preload("res://scripts/map_generation_rules.gd")
const MapRules = preload("res://scripts/map_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")


static func region_offset(map_data: Dictionary, position: Vector2i) -> int:
	if MapRules.region_index_at(position) == 0:
		return 0
	var key := "%d,%d" % [position.x, position.y]
	var vaults: Dictionary = map_data.get("deck_vaults", {})
	if vaults.has(key):
		return int(vaults[key].get("vault_region_offset", 0))
	var roll := Generation.seeded_roll(position, int(map_data.get("seed", 0)), 9137)
	return 1 if roll < 0.015 else 2 if roll < 0.03 else 0


static func key_cost(deck: Dictionary) -> int:
	if int(deck.get("vault_key_cost", 0)) > 0:
		return int(deck["vault_key_cost"])
	return 3 + 3 * int(deck.get("vault_region_offset", 0))


static func generate(map_data: Dictionary, position: Vector2i, first_id: int) -> Dictionary:
	var region_index := MapRules.region_index_at(position)
	var random := RandomNumberGenerator.new()
	random.seed = int(map_data.get("seed", 0)) ^ ((position.x + 17) * 73856093) ^ ((position.y + 31) * 19349663)
	if region_index == 0:
		var key := "%d,%d" % [position.x, position.y]
		var presets: Dictionary = map_data.get("region_zero_vault_presets", {})
		var preset := int(presets.get(key, posmod(position.y, 3)))
		var generated_zero := Catalog.create_region_zero_deck(preset, first_id, random)
		generated_zero.deck["vault_region_offset"] = 0
		generated_zero.deck["vault_key_cost"] = 1
		return generated_zero
	var offset := region_offset(map_data, position)
	var generated := Catalog.create_region_deck(region_index + offset, first_id, random)
	generated.deck["vault_region_offset"] = offset
	return generated
