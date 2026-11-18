extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")

func _initialize() -> void:
	var slash: Dictionary = {}
	var copies := 0
	for card in Catalog.create_starter_deck():
		if card.name == "연속 베기":
			slash = card.duplicate(true)
			copies += 1
	assert(copies == 1 and slash.cost == 1 and slash.rarity == "basic")
	for forged in [false, true]:
		var state := Rules.start_battle([], 70, {"enemies": [{"hp": 100, "actions": [{"damage": 0}]}]}, 70)
		var card: Dictionary = slash.duplicate(true)
		if forged:
			var target: Dictionary = Catalog.STARTER_CARDS[0].duplicate(true)
			var result := Rules._resolve_forge_placement(state, card, target)
			assert(result.applied)
			card = result.card
			var wrong: Dictionary = target.duplicate(true)
			wrong.cost = 2
			assert(not Rules._resolve_forge_placement(state, slash, wrong).applied)
		state.hand = [card]
		state.strength = 2
		var view := {}
		var after := Rules.play_card(state, card.id, view)
		assert(after.energy == 2)
		assert(after.enemies[0].hp == (84 if forged else 92))
		assert(view.hits.size() == (2 if forged else 1))
	print("PASS: starter inclusion, basic rarity, cost, forge requirement, one/two separate hits with strength")
	quit()
