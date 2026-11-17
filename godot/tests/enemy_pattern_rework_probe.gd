extends SceneTree

const Catalog = preload("res://scripts/enemy_catalog.gd")
const Rules = preload("res://scripts/battle_rules.gd")
const Codex = preload("res://scripts/map_debug_enemy_codex.gd")
const Setup = preload("res://scripts/battle_setup.gd")
const Intent = preload("res://scripts/battle_enemy_intent.gd")


func state(encounter: Dictionary) -> Dictionary:
	var result := Rules.start_battle([], 10000, encounter, 10000)
	result.hand = []
	result.battle_seed = 42
	return result


func select_action(before: Dictionary, index: int) -> void:
	before.enemies[0].action_index = index
	Rules._load_enemy_aliases(before, 0)


func _initialize() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	var before := state(Catalog.create_encounter(1, rng))
	select_action(before, 1)
	var after := Rules.end_turn(before)
	assert(after.player_corrosion == 2 and after.player_weak == 0)
	assert(after.player_hp == 10000)

	for index in 3:
		before = state(Catalog.create_encounter(22, rng))
		select_action(before, index)
		after = Rules.end_turn(before)
		assert(after.player_hp == 10000 - [0, 16, 10][index])
		assert(after.player_vulnerable == (2 if index == 0 else 0))
		assert(after.enemies[0].strength == (4 if index == 2 else 0))

	before = state(Catalog.create_encounter(2, rng))
	assert(before.enemies[0].action_index == 0)
	after = Rules.end_turn(before)
	assert(after.player_weak == 2 and after.enemies[0].action_index == 1)
	after = Rules.end_turn(after)
	assert(after.player_paralysis == 2 and after.enemies[0].action_index == 2)
	after = Rules.end_turn(after)
	assert(after.player_hp == 9967 and after.enemies[0].strength == 7 and after.enemies[0].action_index == 0)

	var candidates := Catalog._region_one_pair_candidates()
	var dog: Dictionary = candidates[0]
	assert(dog.name == "굶주린 들개")
	assert(dog.actions.size() == 3)
	assert(dog.actions[0].damage == 10 and dog.actions[1].damage == 10)
	assert(dog.actions[2].player_vulnerable_gain == 2)
	for action in dog.actions:
		assert(action.random_no_repeat)
	var toad: Dictionary = candidates[2]
	assert(toad.name == "도깨비불" and toad.hp == 41)
	before = state(Catalog._prepare_enemy(toad, 0, rng))
	for damage in [5, 5, 26]:
		var hp: int = before.player_hp
		after = Rules.end_turn(before)
		assert(after.player_hp == hp - damage)
		before = after
	assert(after.status == "won" and after.enemies[0].hp == 0)
	var sewer_rat: Dictionary = candidates[3]
	assert(sewer_rat.name == "하수구 쥐")
	assert(sewer_rat.actions[0].player_weak_gain == 2)
	assert(sewer_rat.actions[1].damage == 4 and sewer_rat.actions[1].hits == 2)
	assert(sewer_rat.actions[2].damage == 6 and sewer_rat.actions[2].player_vulnerable_gain == 1)
	for action in sewer_rat.actions:
		assert(action.random_no_repeat and action.discard_count == 1 and action.discard_priority == "rarity")

	# All five curse intents expose their selected effect before the attack/effect phases.
	var priest := Catalog.create_encounter(6, rng)
	assert(priest.actions.size() == 5)
	var kinds := {}
	for index in 5:
		before = state(priest)
		select_action(before, index)
		before.magic_resistance = 1
		var action: Dictionary = before.enemies[0].actions[index]
		assert(action.damage == 16)
		var selected := ""
		for kind in Rules.StatusRules.DEBUFFS:
			if int(action.get("player_" + kind + "_gain", 0)) == 2:
				selected = kind
		assert(selected != "")
		kinds[selected] = true
		assert(Intent.description(action, before.enemies[0]).contains(Rules.StatusRules.LABELS[selected]))
		var trace := {}
		after = Rules.end_turn(before, {}, trace)
		assert(after.player_hp == 9984 and trace.steps[0].attack)
		assert(after["player_" + selected] == 1, "curse did not pass through resistance")
	assert(kinds.size() == 5)
	before = state(priest)
	var seen := {}
	for turn in 50:
		seen[before.enemies[0].action_index] = true
		before = Rules.end_turn(before)
	assert(seen.size() == 5, "curse selection failed to advance among all five intents")

	# Every summon adds two distinct children, with no living-child cap and no immediate attack.
	before = state(Catalog.create_encounter(25, rng))
	for use in 3:
		select_action(before, 1)
		var hp: int = before.player_hp
		after = Rules.end_turn(before)
		assert(after.enemies.size() == 1 + 2 * (use + 1))
		assert(after.player_hp == hp - use * 2 * 5)
		var ids := {}
		for child in after.enemies:
			assert(not ids.has(child.id))
			ids[child.id] = true
			if child.name == "새끼 바퀴":
				assert(child.hp == 7 and child.actions[0].damage == 5)
		assert(not after.enemies[-1].first_action_completed)
		before = after
	var modified := Setup.prepare_encounter(Catalog.create_encounter(25, rng), 5, 1)
	after = Rules.end_turn(state(modified.encounter))
	assert(after.enemies[1].hp == 7 and after.enemies[1].strength == 5)

	# Removing one member of a pair pool must not leave invalid indexes or weighted stale pairs.
	assert(Catalog.REGION_ONE_PAIR_IDS.size() == 12)
	var pairs := {}
	for id in Catalog.REGION_ONE_PAIR_IDS:
		var encounter := Catalog.create_encounter(id, rng)
		assert(encounter.enemies.size() == 2 and encounter.enemies[0].name != encounter.enemies[1].name)
		for enemy in encounter.enemies:
			assert(enemy.name != "눈치보는 산적")
		pairs[encounter.name] = true
	assert(pairs.size() == 12)
	for index in 1000:
		var id := Catalog.pick_region_encounter(0, rng)
		assert(id in Catalog.REGION_ONE_SINGLES or id in Catalog.REGION_ONE_PAIR_IDS)
		id = Catalog.pick_region_encounter_from_roll(0, float(index) / 1000.0)
		assert(id in Catalog.REGION_ONE_SINGLES or id in Catalog.REGION_ONE_PAIR_IDS)
	for entry in Codex.get_entries():
		for group in entry.enemies:
			assert(group.enemy.name != "눈치보는 산적")
	# Old stored pair ids also resolve safely without reintroducing the deleted enemy.
	for id in range(66, 86):
		for enemy in Catalog.create_encounter(id, rng).enemies:
			assert(enemy.name != "눈치보는 산적")
	# Non-fixed HP now spans both sides of its baseline; fixed HP remains exact.
	var observed := {}
	var hp_blueprint := Catalog._enemy("HP range probe", 100, [])
	for sample in 1000:
		var prepared := Catalog._prepare_enemy(hp_blueprint, 0, rng)
		assert(prepared.hp >= 95 and prepared.hp <= 105 and prepared.max_hp == prepared.hp)
		observed[prepared.hp] = true
	assert(observed.has(95) and observed.has(105))
	for passive in [{"fixed_max_hp": true}, {"is_boss": true}]:
		assert(Catalog._prepare_enemy(Catalog._enemy("fixed", 100, [], passive), 0, rng).hp == 100)
	print("PASS: revised patterns, five visible random curses, attack-before-debuff/resistance, unlimited two-child summons, no same-turn summon attack, karma/lament, bandit-free pair pools")
	quit()
