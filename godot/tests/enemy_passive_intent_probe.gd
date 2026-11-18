extends SceneTree

const Catalog = preload("res://scripts/enemy_catalog.gd")
const Intent = preload("res://scripts/battle_enemy_intent.gd")
const Badge = preload("res://scripts/battle_indicator_badge.gd")

func _initialize() -> void:
	var game := preload("res://scripts/main.gd").new()
	var enemy: Dictionary = Catalog._region_one_pair_candidates()[2].duplicate(true)
	for index in enemy.actions.size():
		enemy.action_index = index
		assert(Intent.description(enemy.actions[index], enemy).is_empty(), "Countdown and death conditions are effects, not nonattack actions")
		var status := "자폭 %d" % (2 - index)
		assert(game._enemy_status_text(enemy).contains(status))
		assert(not game._enemy_status_tooltip(enemy, status).is_empty())
		var badge := Badge.status(status, game._enemy_status_tooltip(enemy, status), true)
		assert(badge.category == "trait" and badge.number == str(2 - index))
	var rat: Dictionary = Catalog._region_one_pair_candidates()[3]
	assert(game._enemy_self_destruct_countdown(rat) == -1)
	assert(game._enemy_status_text(rat).contains("갉아먹기"))
	assert(not Intent.description(rat.actions[1], rat).contains("버리기"))
	game.free()
	print("PASS: countdown and self-destruct shown only as enemy effects, remaining counts 2/1/0, rat passive stays out of actions")
	quit()
