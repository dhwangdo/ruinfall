extends SceneTree

const Vault = preload("res://scripts/deck_vault_rules.gd")
const MapRules = preload("res://scripts/map_rules.gd")
const Preview = preload("res://scripts/map_vault_preview_data.gd")
const Hold = preload("res://scripts/deck_vault_unlock_hold.gd")

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		pass
	func _process(_delta: float) -> void:
		pass
	func _save_run() -> bool:
		return true
	func _show_map() -> void:
		pass
	func _show_deck_vault(_position: Vector2i) -> void:
		pass
	func _show_vault_release_notice(_deck: Dictionary) -> void:
		pass


func _initialize() -> void:
	var examples := {}
	var map := {"seed": 123, "deck_vaults": {}, "room_types": {}, "walkable": {}, "seen": {}, "visible_now": {}}
	for y in range(100):
		for x in range(100):
			var p := Vector2i(x, y)
			var offset := Vault.region_offset(map, p)
			if not examples.has(offset):
				examples[offset] = p
	assert(examples.size() == 3)
	for offset in examples:
		var p: Vector2i = examples[offset]
		map.room_types[p] = "deckVault"
		map.walkable[p] = true
		map.seen[p] = true
		map.visible_now[p] = true
		var generated := Vault.generate(map, p, 500)
		var deck: Dictionary = generated.deck
		assert(deck.id.begins_with("found-r%d-" % (MapRules.region_index_at(p) + 1 + offset)))
		assert(Vault.key_cost(deck) == 3 + 2 * offset)
		var state := {"map": map, "position": p, "next_card_id": 500}
		assert(Preview.resolve(state, p) == deck)
		assert(map.deck_vaults.is_empty())
		var key := "%d,%d" % [p.x, p.y]
		map.deck_vaults[key] = deck
		var restored: Dictionary = bytes_to_var(var_to_bytes(map))
		assert(Vault.region_offset(restored, p) == offset)
		assert(Preview.resolve(state, p) == deck)
		var cost := Vault.key_cost(deck)
		var hold := Hold.new()
		hold.configure(cost - 1, false, false, cost)
		assert(hold.is_disabled())
		hold.configure(cost, false, false, cost)
		assert(not hold.is_disabled())
		hold.free()
		var game := Game.new()
		game.screen_name = "deckVault"
		game.run_state = {"map": map.duplicate(true), "position": p, "keys": cost - 1}
		game._unlock_deck_vault(p)
		assert(game.run_state.keys == cost - 1 and game.run_state.get("floor_deck_drops", []).is_empty())
		game.run_state.keys = cost
		game._unlock_deck_vault(p)
		assert(game.run_state.keys == 0 and game.run_state.floor_deck_drops.size() == 1)
		game._unlock_deck_vault(p)
		assert(game.run_state.floor_deck_drops.size() == 1)
		game.free()
		map.deck_vaults.clear()
	# Previously materialized vaults keep their ordinary cost and appearance.
	var p: Vector2i = examples[2]
	map.deck_vaults["%d,%d" % [p.x, p.y]] = {"name": "existing"}
	assert(Vault.region_offset(map, p) == 0)
	print("PASS: all vault tiers, preview/generation/save consistency, 3/5/7 key gates and deductions, no duplicate reward")
	quit()
