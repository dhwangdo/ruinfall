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
	assert(deck.size() == 10 + Catalog.BASIC_CARDS.size())
	for blueprint in Catalog.BASIC_CARDS:
		var copies := 0
		for starter_card in deck:
			if starter_card.name == blueprint.name:
				copies += 1
		assert(copies == 1, "Starting deck must include every basic card once: " + str(blueprint.name))
	# Keep the edition layout fixture at its original 20 cards.
	deck = deck.slice(0, 20)
	var before := state([], deck)
	var after := state(["roomy"], deck)
	assert(after.piles.size() == before.piles.size() + 1)
	assert(after.piles[-1].is_empty())
	after = state(["gambit"], deck)
	assert(after.hand.size() == before.hand.size() + 3 and after.energy == 6 and after.max_energy == 3)
	after = Rules.end_turn(after)
	assert(after.energy == 3)
	after = state(["fantastic"], deck)
	assert(after.piles.size() == 5 and after.hand.size() == 5 and after.cards_per_file == 4)
	for pile in after.piles:
		assert(pile.size() == 3)
	after = state(["sunkenLegend"], deck)
	assert(after.piles[0][0].effect in ["cassiopeia", "leo", "horologium"] and after.piles[0][0].token)
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
	# Metallurgy retrieves both automatic forges and ordinary Solitaire forges.
	after = state(["quickHammer", "metallurgy"], forge_deck)
	forged = 0
	for value in after.hand:
		forged += 1 if value.get("forged", false) else 0
	assert(forged == 2)
	for pile in after.piles:
		for value in pile:
			assert(not value.get("forged", false))
	before = state(["metallurgy"])
	var forge_card := card("dash")
	forge_card.forge_any = true
	before.hand = [forge_card]
	before.piles = [[card("strike")]]
	after = Rules.move_hand_card_to_file(before, forge_card.id, 0)
	assert(after.hand.size() == 1 and after.hand[0].id == forge_card.id and after.hand[0].forged)
	assert(after.piles[0].size() == 1 and after.forge_count == 1)
	# Giant refunds 1 energy whenever a card played costs 3 or more effective energy.
	before = state(["giant"])
	var costly := {"id": 9101, "name": "고비용", "kind": "skill", "effect": "defend", "use_mode": "untargeted", "cost": 3, "value": 5, "revealed": true}
	var moonstone_costly := {"id": 9102, "name": "할인됨", "kind": "skill", "effect": "defend", "use_mode": "untargeted", "cost": 3, "value": 5, "stickers": ["moonstone"], "revealed": true}
	assert(Rules.effective_card_cost(before, costly) == 3)
	assert(Rules.effective_card_cost(before, moonstone_costly) == 2)
	before.energy = 2
	before.hand = [costly.duplicate(true)]
	after = Rules.play_card(before, 9101)
	assert(after.hand.size() == 1 and after.energy == 2, "Giant cannot discount card affordability below 3")
	before.energy = 3
	before.hand = [costly.duplicate(true), moonstone_costly.duplicate(true)]
	after = Rules.play_card(before, 9101)
	assert(after.energy == 1 and after.player_block == 5, "Playing 3+ cost card grants +1 energy")
	after = Rules.play_card(after, 9102)
	assert(after.hand.size() == 1 and after.energy == 1, "Remaining 1 energy cannot afford 2-cost card")
	before.energy = 3
	before.hand = [moonstone_costly.duplicate(true)]
	after = Rules.play_card(before, 9102)
	assert(after.energy == 1, "Moonstone-discounted 2-cost play does not trigger Giant")
	var odin := card("odin_spear")
	before.forge_count = 2
	assert(Rules.effective_card_cost(before, odin) == int(odin.cost) - 2)
	# Each turn grants a temporary action; the edition grants one more.
	before = state(["firstSolitaire"])
	assert(before.stars == 1 and before.temporary_solitaire_actions == 2)
	var moving := card("defend")
	before.hand = [moving]
	before.piles = [[], []]
	after = Rules.move_hand_card_to_file(before, moving.id, 99)
	assert(after.temporary_solitaire_actions == 2)
	after = Rules.move_hand_card_to_file(after, moving.id, 0)
	assert(after.temporary_solitaire_actions == 1 and after.stars == 1)
	assert(Solitaire.solitaire_star_cost(after, moving) == 0)
	var moved := Rules.move_top_between_files(after, 0, 1)
	assert(moved.temporary_solitaire_actions == 0 and moved.stars == 1)
	assert(Solitaire.solitaire_star_cost(moved, moving) == 1)
	after = Rules.move_top_between_files(moved, 1, 0)
	assert(after.temporary_solitaire_actions == 0 and after.stars == 0)
	after = Rules.end_turn(after)
	assert(after.temporary_solitaire_actions == 2 and after.stars == 0)
	# Meteor counts and spends both permanent and temporary stars.
	before = state()
	var meteor := card("meteor")
	before.hand = [meteor]
	before.stars = 2
	assert(before.temporary_solitaire_actions == 1)
	after = Rules.play_card(before, meteor.id)
	assert(after.enemies[0].hp == 9973)
	assert(after.stars == 0 and after.temporary_solitaire_actions == 0)
	# Manuals in hand contribute to the displayed and applied strength/agility.
	before = state()
	var manual := card("combat_manual")
	var strategy := card("strategy_book")
	var strike := card("strike")
	before.hand = [manual, strategy, strike]
	Rules.sync_hand_stats(before)
	assert(before.strength == 6 and before.agility == 6)
	after = Rules.play_card(before, strike.id)
	assert(after.enemies[0].hp == 9988)
	before.hand.erase(manual)
	Rules.sync_hand_stats(before)
	assert(before.strength == 4 and before.agility == 4)
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
	print("PASS: editions, temporary Solitaire actions, Meteor stars, cycle, Prism, Charge resistance")
	quit()
