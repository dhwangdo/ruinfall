extends SceneTree

class ProbeMain:
	extends "res://scripts/main.gd"

	func _ready() -> void:
		pass

	func _save_run() -> bool:
		return true

	func _show_map() -> void:
		screen_name = "map"
		deck_editor_session_active = false


func _initialize() -> void:
	call_deferred("_run_probe")


func _run_probe() -> void:
	var game = ProbeMain.new()
	root.add_child(game)
	var outside := Vector2i(14, 0)
	var inside := Vector2i(13, 0)
	var starter := {"id": "starter", "name": "검증", "cards": [], "capacity": 25,
		"rare_slot_capacity": 1, "editions": []}
	game.run_state = {
		"map": {"safe_area_entries": {0: Vector2i(1, 0)},
			"walkable": {outside: true, inside: true}, "room_types": {}, "gold_piles": {},
			"enemy_positions": [], "enemy_encounters": {}, "enemy_states": [],
			"enemy_memory": {}, "enemy_memory_states": {}, "seen": {}, "visible_now": {}},
		"position": outside, "deck": [], "owned_decks": [starter], "active_deck_id": "starter",
		"inventory_cards": [], "inventory_consumables": [], "floor_cards": [],
		"floor_deck_drops": [], "floor_consumable_drops": [], "blessings": [],
		"gold": 0, "keys": 0, "player_hp": 50, "max_hp": 50,
		"next_card_id": 1, "next_consumable_id": 1,
	}
	game.screen_name = "map"
	game.map_debug_controller.session.active = true
	game.map_debug_controller.teleport(game, inside)
	assert(game.safe_area_unlock_pending_animation, "debug entry did not arm unlock animation")
	game._show_deck()
	var first := _heading(game)
	assert(float(first.get("_lock_shackle_progress")) < 1.0, "first deck view did not start unlock motion")
	await create_timer(0.75).timeout
	assert(float(first.get("_lock_shackle_progress")) > 0.0 and float(first.get("_lock_shackle_progress")) < 1.0,
		"first deck view did not show motion mid-animation")
	game._show_map()
	game.map_debug_controller.teleport(game, outside)
	assert(not game.safe_area_unlock_pending_animation, "safe-area exit did not clear pending animation")
	game.map_debug_controller.teleport(game, inside)
	assert(game.safe_area_unlock_pending_animation, "second debug entry did not rearm animation")
	game._show_deck()
	var second := _heading(game)
	assert(float(second.get("_lock_shackle_progress")) < 1.0, "reentry did not animate the lock")
	await create_timer(1.6).timeout
	game._show_map()
	game._show_deck()
	var repeat := _heading(game)
	assert(is_equal_approx(float(repeat.get("_lock_shackle_progress")), 1.0),
		"reopening in the same safe area unexpectedly replayed animation")
	print("SAFE_AREA_UNLOCK_PROBE=PASS")
	quit()


func _heading(game: Node) -> Control:
	for node in game.find_children("*", "Control", true, false):
		if node.has_meta("deck_case_can_edit"):
			return node
	assert(false, "deck heading not found")
	return null
