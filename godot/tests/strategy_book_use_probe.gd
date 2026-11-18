extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")
const Preview = preload("res://scripts/battle_card_preview.gd")

func _initialize() -> void:
	var book: Dictionary
	for card in Catalog.RARE_CARDS:
		if card.effect == "strategy_book":
			book = card.duplicate(true)
	book.id = 1
	var second: Dictionary = book.duplicate(true)
	second.id = 2
	var strike: Dictionary = Catalog.STARTER_CARDS[0].duplicate(true)
	strike.id = 3
	var defend: Dictionary = Catalog.STARTER_CARDS[1].duplicate(true)
	defend.id = 4
	var state := Rules.start_battle([], 70, {"enemies": [
		{"hp": 999, "actions": [{"damage": 0}]}
	]}, 70)
	state.energy = 20
	state.hand = [book, second, strike, defend]
	assert(Rules.hand_manual_bonus(state) == 8)
	assert(Preview.describe(strike, strike.description, state).contains("14"))
	state = Rules.play_card(state, 1)
	assert(state.strength == 4 and state.agility == 4)
	assert(Rules.hand_manual_bonus(state) == 4 and state.exhausted.size() == 1)
	assert(Preview.describe(strike, strike.description, state).contains("14"))
	state = Rules.play_card(state, 2)
	assert(state.strength == 8 and state.agility == 8 and Rules.hand_manual_bonus(state) == 0)
	state = Rules.play_card(state, 3)
	assert(state.enemies[0].hp == 985)
	state = Rules.play_card(state, 4)
	assert(state.player_block == 13)
	state = Rules.end_turn(state)
	assert(state.strength == 8 and state.agility == 8)
	print("PASS: Strategy Book converts hand bonus to permanent strength/agility, stacks, previews and survives turn end")
	quit()
