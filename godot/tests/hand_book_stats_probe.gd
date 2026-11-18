extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")
const Preview = preload("res://scripts/battle_card_preview.gd")
var serial := 9000

func card(effect: String) -> Dictionary:
	for pool in [Catalog.STARTER_CARDS, Catalog.BASIC_CARDS, Catalog.SPECIAL_CARDS, Catalog.RARE_CARDS]:
		for blueprint in pool:
			if blueprint.effect == effect:
				var result: Dictionary = blueprint.duplicate(true)
				serial += 1
				result.id = serial
				return result
	return {}

func fresh() -> Dictionary:
	return Rules.start_battle([], 70, {"enemies": [{"hp": 1000, "actions": [{"damage": 0}]}]}, 70)

func _initialize() -> void:
	var state := fresh()
	var manual := card("combat_manual")
	var book := card("strategy_book")
	var strike := card("strike")
	state.strength = 3
	state.agility = 4
	state.hand = [manual, book, strike]
	Rules.sync_hand_stats(state)
	assert(state.strength == 9 and state.agility == 10)
	for repeat in 10:
		Rules.sync_hand_stats(state)
	assert(state.strength == 9 and state.agility == 10, "Sync never stacks the same contribution")
	var second := card("combat_manual")
	state.piles = [[second], []]
	state.pending_draws = 1
	state = Rules.draw_from_file(state, 0)
	assert(state.strength == 11 and state.agility == 12, "Drawing applies real stats immediately")
	state = Rules.move_hand_card_to_file(state, book.id, 1)
	assert(state.strength == 7 and state.agility == 8, "Moving a book to a file removes its real stats")
	state.player_weak = 2
	assert(Preview.describe(strike, strike.description, state).contains("피해를 6 줍니다."))
	var attack := Rules.play_card(state, strike.id)
	assert(attack.enemies[0].hp == 994, "Damage uses total strength once, then weakness")
	# A discarded manual must stop affecting the defense of the pending card.
	state = fresh()
	var block := card("defend")
	block.value = 8
	block.discard_cost = 1
	manual = card("combat_manual")
	state.hand = [manual, block]
	Rules.sync_hand_stats(state)
	state = Rules.play_card(state, block.id)
	assert(state.strength == 0 and state.agility == 0 and state.player_block == 8)
	# Discard-triggered strength gains survive removal of the held contribution.
	state = fresh()
	manual = card("combat_manual")
	state.hand = [manual]
	state.active_rule_cards = [{"effect": "recycling", "value": 1}]
	Rules.sync_hand_stats(state)
	state.hand.pop_back()
	Rules._discard_card(state, manual, false, true, true)
	assert(state.strength == 1 and state.agility == 0)
	# Retained books keep real stats across turn boundaries without accumulating.
	state = fresh()
	manual = card("combat_manual")
	manual.preserve = true
	book = card("strategy_book")
	state.hand = [manual, book]
	state.piles = [[]]
	for index in 8:
		state.piles[0].append(card("strike"))
	Rules.sync_hand_stats(state)
	state = Rules.end_turn(state)
	assert(state.strength == 2 and state.agility == 2)
	state = Rules.end_turn(state)
	assert(state.strength == 2 and state.agility == 2)
	print("PASS: real held stats stack once, draw/file/discard update stats, pending defense and weakness use totals, discard gains persist, retained books do not accumulate")
	quit()
