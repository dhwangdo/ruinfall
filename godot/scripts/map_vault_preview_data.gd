extends RefCounted

const MapRules = preload("res://scripts/map_rules.gd")
const CardCatalog = preload("res://scripts/card_catalog.gd")


static func resolve(state: Dictionary, position: Vector2i, debug_mode: bool = false) -> Dictionary:
	var map_data: Dictionary = state.get("map", {})
	var key := "%d,%d" % [position.x, position.y]
	if (not debug_mode and not map_data.get("seen", {}).has(position)) \
		or MapRules.room_type_at(map_data, position) != "deckVault" \
		or bool(map_data.get("opened_deck_vaults", {}).get(key, false)):
		return {}
	var vaults: Dictionary = map_data.get("deck_vaults", {})
	if vaults.has(key):
		return vaults[key].duplicate(true)
	# Before its first visit the port has not materialized the vault. Preview
	# the same location-seeded deck without reserving IDs or changing the save.
	var random := RandomNumberGenerator.new()
	random.seed = int(state.get("map_seed", 0)) ^ ((position.x + 17) * 73856093) ^ ((position.y + 31) * 19349663)
	var first_id := int(state.get("next_card_id", state.get("deck", []).size() + 1))
	var generated: Dictionary = CardCatalog.create_region_deck(MapRules.region_index_at(position) + 1, first_id, random, 0.02)
	return generated["deck"]
