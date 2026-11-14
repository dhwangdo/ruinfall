extends SceneTree

const Catalog = preload("res://scripts/card_catalog.gd")
const CardUse = preload("res://scripts/card_use.gd")

func _init() -> void:
	var counts := {"unplayable": 0, "targeted": 0, "untargeted": 0}
	for card in Catalog.STARTER_CARDS + Catalog.BASIC_CARDS + Catalog.SPECIAL_CARDS + Catalog.RARE_CARDS + Catalog.LEGENDARY_CARDS + Catalog.LEGACY_SPECIAL_CARDS:
		assert(card.has("use_mode"), str(card["name"]) + " has no declared use_mode")
		var mode := CardUse.mode(card)
		assert(CardUse.MODES.has(mode))
		counts[mode] += 1
		var legacy: Dictionary = card.duplicate(true)
		legacy.erase("use_mode")
		assert(CardUse.mode(legacy) == mode, str(card["name"]) + " changed interaction")
		assert(legacy["use_mode"] == mode)
	var tokens := [Catalog.create_rock_card(1), Catalog.create_soil_card(2), Catalog.create_toxic_slime_card(3),
		Catalog.create_fermented_slime_card(4), Catalog.create_relic_card(5), Catalog.create_radiance_card(6)]
	for card in tokens:
		assert(card.has("use_mode") and CardUse.MODES.has(card["use_mode"]))
	assert(CardUse.mode(tokens[2]) == CardUse.UNPLAYABLE)
	assert(CardUse.mode(tokens[3]) == CardUse.UNTARGETED)
	assert(CardUse.mode(tokens[5]) == CardUse.TARGETED)
	assert(CardUse.mode({"use_mode": "untargeted", "kind": "strike", "effect": "new_attack"}) == CardUse.UNTARGETED)
	print("PASS: explicit catalog modes, unchanged legacy classification, generated tokens, explicit override; ", counts)
	quit()
