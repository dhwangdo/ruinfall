extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Catalog = preload("res://scripts/enemy_catalog.gd")
const Intent = preload("res://scripts/battle_enemy_intent.gd")


func make_state(action_index: int) -> Dictionary:
	var enemy: Dictionary = Catalog._region_one_pair_candidates()[3].duplicate(true)
	enemy.action_index = action_index
	var state := Rules.start_battle([], 1000, {"enemies": [enemy]}, 1000)
	state.hand = []
	state.piles = [
		[{"id": 101, "name": "일반", "rarity": "basic", "effect": "strike"}],
		[{"id": 102, "name": "희귀", "rarity": "rare", "effect": "strike"}],
	]
	state.enemies[0].action_index = action_index
	Rules._load_enemy_aliases(state, 0)
	Rules._prepare_enemy_discard_targets(state)
	return state


func _initialize() -> void:
	for action_index in 3:
		var state := make_state(action_index)
		var action: Dictionary = state.enemies[0].actions[action_index]
		assert(not Intent.description(action, state.enemies[0]).contains("버리기"))
		assert(state.enemies[0].discard_pile_index == 1)
		state.active_rule_cards = [{"effect": "recycling", "value": 1}]
		Rules._resolve_enemies_turn(state)
		assert(state.discard.size() == 1 and state.discard[0].id == 102)
		assert(state.piles[0].size() == 1 and state.piles[1].is_empty())
		assert(state.strength == 1, "Passive discard must still trigger discard rules")
	var cancelled := make_state(1)
	cancelled.enemies[0].stunned = true
	Rules._resolve_enemies_turn(cancelled)
	assert(cancelled.discard.is_empty())
	var empty := make_state(0)
	empty.piles = []
	Rules._prepare_enemy_discard_targets(empty)
	Rules._resolve_enemies_turn(empty)
	assert(empty.discard.is_empty())
	print("PASS: sewer-rat passive discards once per action including multihit, prioritizes rarity, triggers rules, respects cancellation and empty files")
	quit()
