extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")
const Enemies = preload("res://scripts/enemy_catalog.gd")
const Codex = preload("res://scripts/map_debug_enemy_codex.gd")
const Text = preload("res://scripts/card_description_text.gd")

var next_id := 100


func card(effect: String) -> Dictionary:
	for pool in [Catalog.STARTER_CARDS, Catalog.BASIC_CARDS, Catalog.SPECIAL_CARDS, Catalog.RARE_CARDS, Catalog.LEGENDARY_CARDS]:
		for blueprint in pool:
			if blueprint.effect == effect:
				next_id += 1
				var value: Dictionary = blueprint.duplicate(true)
				value.merge({"id": next_id, "revealed": true}, true)
				return value
	assert(false, "missing effect: " + effect)
	return {}


func state() -> Dictionary:
	var result := Rules.start_battle([], 1000, {"enemies": [
		{"name": "A", "hp": 1000, "weak": 0, "vulnerable": 0, "actions": [{"damage": 1}]},
		{"name": "B", "hp": 1000, "weak": 0, "vulnerable": 0, "actions": [{"damage": 1}]},
	]}, 1000)
	result.energy = 99
	return result


func play(before: Dictionary, effect: String) -> Dictionary:
	var value := card(effect)
	before.hand.append(value)
	return Rules.play_card(before, value.id)


func _initialize() -> void:
	var before := state()
	var after := play(before, "scale_armor")
	assert(after.energy == 97 and after.player_block == 8)
	assert(after.enemies[0].weak == 1 and after.enemies[1].weak == 0)

	# Odin is now a non-attack all-enemy debuff; strength/agility must not add damage/block.
	before = state()
	before.strength = 20
	before.agility = 20
	before.forge_count = 2
	after = play(before, "odin_spear")
	assert(after.energy == 95 and after.player_block == 0)
	for target in after.enemies:
		assert(target.hp == 1000 and target.weak == 3 and target.vulnerable == 3)

	# Forge upgrades the duration of Iron Song, using an unplayable card as its substrate.
	for forged in [false, true]:
		before = state()
		var song := card("iron_song")
		before.hand = [song]
		before.piles = [[card("combat_manual")]]
		if forged:
			before = Rules.move_hand_card_to_file(before, song.id, 0)
			song = before.piles[0].pop_back()
			assert(song.forged)
			before.hand = [song]
		after = Rules.play_card(before, song.id)
		assert(after.player_block == 5)
		after = Rules.end_turn(after)
		assert(after.player_block == 5)
		after = Rules.end_turn(after)
		assert(after.player_block == (5 if forged else 0))
		after = Rules.end_turn(after)
		assert(after.player_block == 0)

	# Removing initial block must also remove agility/hand-manual bonuses on those cards.
	for effect in ["steel_storm", "sturdy_stance"]:
		before = state()
		before.agility = 20
		before.hand = [card("combat_manual")]
		after = play(before, effect)
		assert(after.player_block == 0 and after.active_rule_cards.size() == 1)

	# Explicit hand discard triggers both the new rule and Takwolsu's two random draws.
	before = play(state(), "recycling")
	before.piles = [[card("strike"), card("defend"), card("strike")]]
	var takwolsu := card("saeongjima")
	var evade := card("defend")
	evade.discard_cost = 1
	before.hand = [evade, takwolsu]
	after = Rules.play_card(before, evade.id)
	assert(after.hand.size() == 2 and after.strength == 1 and after.stars == 2)

	# File discard uses the same triggers. Turn-end cleanup triggers neither.
	before = play(state(), "recycling")
	before.hand = []
	before.piles = [[card("strike"), card("defend"), card("saeongjima")]]
	before.pending_pile_operation = "discardTop"
	after = Rules.resolve_pile_operation(before, 0)
	assert(after.hand.size() == 2 and after.strength == 1)
	before = play(state(), "recycling")
	before.hand = [card("saeongjima"), card("strike")]
	before.piles = [[card("strike"), card("defend"), card("strike")]]
	after = Rules.end_turn(before)
	assert(after.strength == 0 and after.hand.size() == 1)

	# Enemy forced discard is also a real discard, unlike turn-end cleanup.
	before = play(state(), "recycling")
	before.hand = []
	before.piles = [[card("strike"), card("defend"), card("saeongjima")]]
	before.enemies[0].discard_pile_index = 0
	Rules._discard_targeted_file_top(before, 0, 1)
	assert(before.hand.size() == 2 and before.strength == 1)

	# Repeated Wish calls in the same turn advance a persistent random stream.
	before = state()
	before.battle_seed = 42
	var signatures := {}
	for use in 6:
		before.hand = []
		var previous_rng: Variant = before.get("wish_random_state")
		before = play(before, "wish")
		assert(before.wish_random_state != previous_rng)
		var names := PackedStringArray()
		for generated in before.hand:
			assert(generated.token and generated.rarity == "rare")
			names.append(generated.name)
		signatures[",".join(names)] = true
	assert(signatures.size() > 1, "Wish kept restarting the same stream")

	# Suppression damage and damage-derived defense remain synchronized.
	after = play(state(), "suppression")
	assert(after.enemies[0].hp == 988 and after.player_block == 12)
	before = state()
	var dodge := card("defend")
	dodge.value = 0
	before.hand = [dodge, card("strike"), card("strike")]
	var bold_evade: Dictionary = {}
	for item in Catalog.SPECIAL_CARDS:
		if item.name == "과감한 회피":
			bold_evade = item.duplicate(true)
	bold_evade.id = 9000
	before.hand = [bold_evade, card("strike"), card("strike")]
	after = Rules.play_card(before, 9000)
	assert(after.player_block == 15)

	assert(Catalog.LEGENDARY_CARDS.size() == 1 and Catalog.LEGENDARY_CARDS[0].effect == "cassiopeia")
	for pool in [Catalog.SPECIAL_CARDS, Catalog.RARE_CARDS]:
		for item in pool:
			assert(item.effect not in ["star_ark", "mass_deal"])
	for entry in Codex.get_entries():
		for group in entry.enemies:
			assert(group.enemy.name not in ["미라 사제", "지룡", "공허 해파리"])
			for action in group.enemy.actions:
				assert(action.get("damage_type", "physical") != "magic")
	assert(not after.has("player_magic_block"))
	assert(Text.to_bbcode("방어를 5 얻습니다.").contains("#a65416"))
	print("PASS: rebalanced effects, Iron Song forge duration, explicit vs cleanup discards, enemy discard, Wish stream, unified defense, retired pools/enemies")
	quit()
