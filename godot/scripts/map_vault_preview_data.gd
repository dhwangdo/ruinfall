extends RefCounted

const MapRules = preload("res://scripts/map_rules.gd")
const CardCatalog = preload("res://scripts/card_catalog.gd")
const VaultRules = preload("res://scripts/deck_vault_rules.gd")


static func resolve(state: Dictionary, position: Vector2i, debug_mode: bool = false) -> Dictionary:
	var map_data: Dictionary = state.get("map", {})
	var key := "%d,%d" % [position.x, position.y]
	var visibility := MapRules.display_visibility(map_data, Vector2i(state.get("position", Vector2i.ZERO)), debug_mode)
	if (not visibility.seen.has(position) and not map_data.get("known_deck_vaults", {}).has(position)) \
		or MapRules.room_type_at(map_data, position) != "deckVault" \
		or bool(map_data.get("opened_deck_vaults", {}).get(key, false)):
		return {}
	var vaults: Dictionary = map_data.get("deck_vaults", {})
	if vaults.has(key):
		return vaults[key].duplicate(true)
	# Before its first visit the port has not materialized the vault. Preview
	# the same location-seeded deck without reserving IDs or changing the save.
	var first_id := int(state.get("next_card_id", state.get("deck", []).size() + 1))
	var generated := VaultRules.generate(map_data, position, first_id)
	return generated["deck"]
