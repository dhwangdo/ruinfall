extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Status = preload("res://scripts/battle_status_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")
const Stickers = preload("res://scripts/stickers.gd")
const Solitaire = preload("res://scripts/solitaire_rules.gd")
const Preview = preload("res://scripts/battle_card_preview.gd")
var serial := 1000


func card(effect: String) -> Dictionary:
	for pool in [Catalog.STARTER_CARDS, Catalog.BASIC_CARDS, Catalog.SPECIAL_CARDS, Catalog.RARE_CARDS]:
		for blueprint in pool:
			if blueprint.effect == effect:
				var result: Dictionary = blueprint.duplicate(true)
				serial += 1
				result.merge({"id": serial, "revealed": true}, true)
				return result
	assert(false, effect)
	return {}


func state(editions: Array = [], deck: Array = []) -> Dictionary:
	return Rules.start_battle(deck, 1000, {"name": "probe", "hp": 10000, "actions": [{}]}, 1000, editions)


func _initialize() -> void:
	var deck := Catalog.create_starter_deck()
	var before := state([], deck)
	var after := state(["roomy"], deck)
	assert(after.piles.size() == before.piles.size() + 2)
	assert(after.piles[-1].is_empty() and after.piles[-2].is_empty())
	after = state(["gambit"], deck)
	assert(after.hand.size() == before.hand.size() + 2 and after.energy == 5 and after.max_energy == 3)
	after = Rules.end_turn(after)
	assert(after.energy == 3)
	after = state(["fantastic"], deck)
	assert(after.piles.size() == 5 and after.hand.size() == 5 and after.cards_per_file == 4)
	for pile in after.piles:
		assert(pile.size() == 3)
	after = state(["sunkenLegend"], deck)
	assert(after.piles[0][0].effect == "cassiopeia" and after.piles[0][0].token)
	assert(after.piles[0].size() == 5 and deck.size() == 20)
	# Automatic forging needs no matching substrate in the deck and chooses distinct cards.
	var forge_deck := [card("metalization"), card("beastification"), card("dash")]
	after = state(["quickHammer"], forge_deck)
	var forged := 0
	for value in after.hand:
		forged += 1 if value.get("forged", false) else 0
	for pile in after.piles:
		for value in pile:
			forged += 1 if value.get("forged", false) else 0
	assert(forged == 2 and after.forge_count == 2)
	for value in forge_deck:
		assert(not value.get("forged", false), "battle forging must not mutate saved deck")
	# The first successful move is free; rejected moves do not consume it. Reset next turn.
	before = state(["firstSolitaire"])
	var moving := card("defend")
	before.hand = [moving]
	before.piles = [[], []]
	before.stars = 0
	after = Rules.move_hand_card_to_file(before, moving.id, 99)
	assert(not after.get("first_solitaire_used", false))
	after = Rules.move_hand_card_to_file(after, moving.id, 0)
	assert(after.first_solitaire_used and after.stars == 0)
	assert(Solitaire.solitaire_star_cost(after, moving) == 1)
	var rejected := Rules.move_top_between_files(after, 0, 1)
	assert(rejected.piles[0].size() == 1 and rejected.piles[1].is_empty())
	after = Rules.end_turn(after)
	assert(not after.first_solitaire_used and Solitaire.solitaire_star_cost(after, moving) == 0)
	# Cycle only responds to real hand discards, once per turn, including confusion.
	before = state(["cycle"])
	before.piles = [[card("strike"), card("defend"), card("strike")]]
	Rules._discard_card(before, card("strike"), false, true, false)
	assert(before.hand.is_empty() and not before.get("cycle_used", false))
	Rules._discard_card(before, card("strike"), false, false, true)
	assert(before.hand.is_empty() and not before.get("cycle_used", false))
	Rules._discard_card(before, card("strike"), true, true, true)
	assert(before.hand.size() == 1 and before.cycle_used)
	Rules._discard_card(before, card("strike"), true, true, true)
	assert(before.hand.size() == 1)
	Status.begin_turn(before)
	Rules._discard_card(before, card("strike"), false, true, true)
	assert(before.hand.size() == 2)
	before = state(["cycle"])
	before.player_confusion = 1
	moving = card("defend")
	before.hand = [moving, card("strike")]
	before.piles = [[card("strike"), card("defend")]]
	after = Rules.play_card(before, moving.id)
	assert(after.cycle_used and after.hand.size() == 1 and after.confusion_sequence == 1)
	# Every generated Radiance gets a compatible sticker; the private stream progresses.
	before = state(["prism", "sharpLight"])
	var ids := {}
	for use in range(10):
		var previous: Variant = before.get("prism_random_state")
		var radiance := Rules._create_battle_radiance(before)
		assert(Stickers.card_sticker_ids(radiance).size() == 1)
		assert(not ids.has(radiance.id) and before.prism_random_state != previous)
		ids[radiance.id] = true
	var radiance := Rules._create_battle_radiance(before)
	before.hand = [radiance]
	assert(Preview.describe(radiance, radiance.description, before).contains("피해를 7"))
	after = Rules.play_card(before, radiance.id)
	assert(after.enemies[0].hp == 9993)
	# Creation effects, optical research, and delayed creation all share Prism.
	for effect in ["light_cluster", "large_prism", "nebula"]:
		before = state(["prism"])
		before.energy = 99
		moving = card(effect)
		before.hand = [moving]
		after = Rules.play_card(before, moving.id)
		for value in after.hand:
			assert(value.effect == "radiance" and Stickers.card_sticker_ids(value).size() == 1)
	before = state(["prism"])
	before.active_rule_cards = [card("optics_research")]
	before.pending_radiance = [{"turns": 1, "count": 2}]
	after = Rules.end_turn(before)
	assert(after.hand.size() == 3)
	for value in after.hand:
		assert(Stickers.card_sticker_ids(value).size() == 1)
	# Self-vulnerability uses exactly the same resistance path as enemy effects.
	var charge: Dictionary = {}
	for blueprint in Catalog.SPECIAL_CARDS:
		if blueprint.get("self_debuffs", {}).has("vulnerable"):
			charge = blueprint.duplicate(true)
	assert(charge.name == "돌격!!" and charge.cost == 0 and charge.rarity == "special")
	charge.id = 900
	for mode in ["none", "resistance"]:
		before = state()
		if mode == "resistance":
			before.magic_resistance = 1
		before.hand = [charge]
		after = Rules.play_card(before, charge.id)
		assert(after.enemies[0].hp == 9988)
		assert(after.player_vulnerable == (1 if mode == "none" else 0))
	print("PASS: all 10 editions, battle-only forge/legend, first-move reset, cycle origins/reset/confusion, Prism creation/preview, Charge resistance")
	quit()
