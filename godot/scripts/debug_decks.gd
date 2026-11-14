extends RefCounted
class_name PortDebugDecks

const CardCatalog = preload("res://scripts/card_catalog.gd")
const CardStickers = preload("res://scripts/stickers.gd")

const DEBUG_CARD_RARITIES := [
	{"rarity": "legendary", "label": "전설 카드"},
	{"rarity": "rare", "label": "희귀 카드"},
	{"rarity": "special", "label": "특별 카드"},
	{"rarity": "basic", "label": "일반 카드"},
	{"rarity": "starter", "label": "시작 카드"},
	{"rarity": "status", "label": "상태이상 카드"},
]


static func create_all_cards_deck(first_id: int) -> Dictionary:
	var next_card_id := first_id
	var cards: Array[Dictionary] = []
	for blueprint in _all_card_blueprints():
		cards.append(CardCatalog._make_card(blueprint, next_card_id))
		next_card_id += 1
	for card in [
		CardCatalog.create_radiance_card(next_card_id),
		CardCatalog.create_toxic_slime_card(next_card_id + 1),
		CardCatalog.create_soil_card(next_card_id + 2),
		CardCatalog.create_rock_card(next_card_id + 3),
		CardCatalog.create_relic_card(next_card_id + 4),
	]:
		cards.append(card)
		next_card_id += 1
	return {
		"deck": _make_debug_deck("debug-all-cards", "ALL", cards),
		"next_card_id": next_card_id,
	}


static func create_sticker_test_deck(first_id: int) -> Dictionary:
	var next_card_id := first_id
	var available_blueprints := _all_card_blueprints()
	var cards: Array[Dictionary] = []
	for sticker_id in CardStickers.STICKER_IDS:
		var blueprint_index := -1
		for index in range(available_blueprints.size()):
			var candidate: Dictionary = available_blueprints[index].duplicate(true)
			candidate["id"] = -1
			candidate["revealed"] = false
			if CardStickers.compatible_stickers(candidate).has(sticker_id):
				blueprint_index = index
				break
		if blueprint_index < 0:
			push_error("No compatible debug card found for sticker: %s" % sticker_id)
			return {"deck": {}, "next_card_id": first_id}
		var blueprint: Dictionary = available_blueprints.pop_at(blueprint_index)
		var card := CardCatalog._make_card(blueprint, next_card_id)
		cards.append(CardStickers.with_card_stickers(card, [sticker_id]))
		next_card_id += 1
	return {
		"deck": _make_debug_deck("debug-sticker-catalog", "스티커 도감", cards),
		"next_card_id": next_card_id,
	}


## Returns card entries with the same rarity-index selection values as MapDebugToolbar.
static func card_choices() -> Array[Dictionary]:
	var choices: Array[Dictionary] = []
	var blueprints := _all_card_blueprints()
	for rarity_info in DEBUG_CARD_RARITIES:
		var rarity := str(rarity_info["rarity"])
		var label := str(rarity_info["label"])
		var rarity_index := 0
		for blueprint in blueprints:
			if str(blueprint.get("rarity", "")) != rarity:
				continue
			choices.append({
				"group": label,
				"label": str(blueprint.get("name", "")),
				"value": "card:%s:%d" % [rarity, rarity_index],
			})
			rarity_index += 1
	choices.append({"group": "기타 카드", "label": "아드레날린", "value": "card:adrenaline"})
	return choices


static func _make_debug_deck(deck_id: String, deck_name: String, cards: Array[Dictionary]) -> Dictionary:
	var rare_slot_capacity := 0
	for card in cards:
		if str(card.get("rarity", "")) in ["rare", "legendary"]:
			rare_slot_capacity += 1
	return {
		"id": deck_id,
		"name": deck_name,
		"capacity": cards.size(),
		"rare_slot_capacity": rare_slot_capacity,
		"cards": cards,
		"editions": [],
	}


static func _all_card_blueprints() -> Array[Dictionary]:
	var blueprints: Array[Dictionary] = []
	var seen := {}
	for pool in [CardCatalog.STARTER_CARDS, CardCatalog.BASIC_CARDS, CardCatalog.LEGACY_SPECIAL_CARDS,
		CardCatalog.SPECIAL_CARDS,
		CardCatalog.RARE_CARDS, CardCatalog.LEGENDARY_CARDS]:
		for blueprint in pool:
			var key := "%s|%s" % [str(blueprint.get("name", "")), str(blueprint.get("effect", ""))]
			if seen.has(key):
				continue
			seen[key] = true
			blueprints.append(blueprint.duplicate(true))
	return blueprints
