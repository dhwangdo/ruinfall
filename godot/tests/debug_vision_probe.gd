extends SceneTree

const Rules = preload("res://scripts/map_rules.gd")
const MapView = preload("res://scripts/map_view.gd")
const Preview = preload("res://scripts/map_vault_preview_data.gd")
const Editions = preload("res://scripts/deck_editions.gd")

class Motion extends RefCounted:
	var visible := {}
	func update_visible_enemies(positions: Dictionary) -> void:
		visible = positions.duplicate()


func _initialize() -> void:
	var player := Vector2i(50, 50)
	var near := player + Vector2i(9, 9)
	var far := player + Vector2i(10, 0)
	var memory := player + Vector2i(20, 0)
	var map := {"seen": {player: true, memory: true}, "visible_now": {player: true},
		"walkable": {player: true, near: true, far: true}, "room_types": {near: "deckVault", far: "deckVault"},
		"deck_vaults": {"59,59": {"id": "near"}, "60,50": {"id": "far"}},
		"enemy_positions": [near, far], "enemy_states": [{}, {}]}
	var before := map.duplicate(true)
	var debug := Rules.display_visibility(map, player, true)
	assert(debug.visible_now.size() == 361)
	assert(debug.visible_now.has(near) and not debug.visible_now.has(far))
	# Even solid walls and tiles behind them are fully visible.
	assert(not Rules.is_walkable(map, player + Vector2i(1, 0)))
	assert(debug.visible_now.has(player + Vector2i(8, 0)))
	assert(debug.seen.has(memory) and not debug.visible_now.has(memory))
	assert(not debug.seen.has(far))
	assert(map == before, "debug display must not permanently reveal the map")
	var normal := Rules.display_visibility(map, player, false)
	assert(normal.visible_now == before.visible_now and normal.seen == before.seen)
	var moved := Rules.display_visibility(map, player + Vector2i(1, 0), true)
	assert(moved.visible_now.has(far))
	assert(not moved.visible_now.has(player + Vector2i(-9, 0)))
	var corner := Rules.display_visibility(map, Vector2i(0, -Rules.ROCK_BARRIER_HEIGHT), true)
	assert(corner.visible_now.size() == 100)
	var view := MapView.new()
	var motion := Motion.new()
	view.map_data = map
	view.player_position = player
	view.debug_mode = true
	view._motion = motion
	view._update_motion_visible_enemies()
	assert(motion.visible.has(0) and not motion.visible.has(1))
	view.debug_mode = false
	view._update_motion_visible_enemies()
	assert(motion.visible.is_empty())
	view.free()
	var state := {"map": map, "position": player}
	assert(Preview.resolve(state, near, true).id == "near")
	assert(Preview.resolve(state, far, true).is_empty())
	assert(Preview.resolve(state, near, false).is_empty())
	assert(Editions.description("legendCassiopeia") == "이 덱은 카시오페이아를 가집니다.")
	print("PASS: 19x19 square, wall transparency, bounds/movement, no saved reveal, enemy/preview visibility, concise edition text")
	quit()
