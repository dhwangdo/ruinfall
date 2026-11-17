extends SceneTree

const Catalog = preload("res://scripts/enemy_catalog.gd")
const Rules = preload("res://scripts/battle_rules.gd")
const Art = preload("res://scripts/enemy_tile_art.gd")


func _initialize() -> void:
	var candidates := Catalog._region_one_pair_candidates()
	var dog: Dictionary = candidates[0]
	assert(dog.name == "굶주린 들개")
	assert(dog.actions.map(func(action: Dictionary) -> int: return int(action.get("damage", 0))) == [10, 10, 0])
	assert(dog.actions[2].player_vulnerable_gain == 2)
	var rat: Dictionary = candidates[3]
	assert(rat.name == "하수구 쥐")
	assert(rat.actions[0].player_weak_gain == 2)
	assert(rat.actions[1].damage == 4 and rat.actions[1].hits == 2)
	assert(rat.actions[2].damage == 6 and rat.actions[2].player_vulnerable_gain == 1)
	for enemy in [dog, rat]:
		for action in enemy.actions:
			assert(action.random_no_repeat)
			if enemy == rat:
				assert(action.discard_count == 1 and action.discard_priority == "rarity")
		for previous in enemy.actions.size():
			for turn in 20:
				var next_index := Rules._choose_next_enemy_action_index({"battle_seed": 42, "turn": turn}, enemy.actions, previous, 0)
				assert(next_index != previous)
	var wisp: Dictionary = candidates[2]
	assert(wisp.name == "도깨비불" and wisp.hp == 41)
	assert(Art.texture_for(wisp) != null)
	print("PASS: dog and sewer rat patterns, no immediate repeat, discard, wisp tile")
	quit()
