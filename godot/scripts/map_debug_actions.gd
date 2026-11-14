extends RefCounted
class_name MapDebugActions

const CardCatalog = preload("res://scripts/card_catalog.gd")
const DebugDecks = preload("res://scripts/debug_decks.gd")
const MapRules = preload("res://scripts/map_rules.gd")

const CONSUMABLE_DATA := {
	"mindEyeTicket": ["심안 티켓", "20번 이동하는 동안 시야 거리 +2를 얻습니다."],
	"darkTicket": ["어둠 티켓", "20턴 동안 적의 인식 거리가 1 감소합니다."],
	"bombTicket": ["폭탄 티켓", "점화한 뒤 바닥에 내려놓으면 3번 이동 후 폭발합니다."],
	"cloneTicket": ["복제 티켓", "카드나 티켓 하나를 복제합니다."],
	"expandTicket": ["확장 티켓", "덱에 드래그해 희귀 슬롯을 1 늘립니다."],
	"extractTicket": ["추출 티켓", "덱에서 희귀도를 가리지 않고 카드 1장을 추출합니다."],
	"transformTicket": ["변환 티켓", "카드는 같은 희귀도의 다른 카드로, 티켓은 티어와 관계없이 다른 무작위 티켓으로 바꿉니다."],
	"cardPack": ["카드 팩", "카드 5개를 얻습니다."],
}


## Applies a map-toolbar request to a deep copy. RNG is optional for deterministic probes.
static func apply(run_state: Dictionary, action: String, payload: Dictionary, random: RandomNumberGenerator = null) -> Dictionary:
	var state := run_state.duplicate(true)
	var rng := random
	if rng == null:
		rng = RandomNumberGenerator.new()
		rng.randomize()
	match action:
		"spawn_item":
			_spawn_item(state, str(payload.get("selection", "")), rng)
		"generate_region_decks":
			var region := _strict_integer(payload.get("region_number", null))
			var count := _strict_integer(payload.get("deck_count", null))
			if bool(region.get("valid", false)) and bool(count.get("valid", false)):
				_generate_region_decks(state, int(region["value"]), int(count["value"]), rng)
		"create_sticker_test_deck":
			_create_sticker_test_deck(state)
	return state


static func _spawn_item(state: Dictionary, selection: String, random: RandomNumberGenerator) -> void:
	var position := _position(state)
	var x := position.x
	var y := position.y
	if selection == "deck:random":
		var region := maxi(1, MapRules.region_index_at(Vector2i(x, y)) + 1)
		var bonus := 5 if state.get("blessings", []).has("deckSize") else 0
		var first_id := int(state.get("next_card_id", 1))
		var result := CardCatalog.create_region_deck(region, first_id, random, 0.0)
		var deck: Dictionary = result["deck"]
		deck["capacity"] = int(deck.get("capacity", 0)) + bonus
		var drops: Array = state.get("floor_deck_drops", [])
		drops.append({"x": x, "y": y, "deck": deck})
		state["floor_deck_drops"] = drops
		state["next_card_id"] = int(result["next_card_id"])
		return
	if selection.begins_with("consumable:"):
		var chosen := selection.trim_prefix("consumable:")
		var types: Array[String] = []
		if chosen == "allTickets":
			for type in CONSUMABLE_DATA:
				if type != "cardPack":
					types.append(str(type))
		elif CONSUMABLE_DATA.has(chosen):
			types.append(chosen)
		var consumable_drops: Array = state.get("floor_consumable_drops", [])
		var next_id := int(state.get("next_consumable_id", 1))
		for type in types:
			var details: Array = CONSUMABLE_DATA[type]
			consumable_drops.append({"x": x, "y": y, "consumable": {
				"id": "consumable-%d" % next_id,
				"type": type,
				"name": details[0],
				"description": details[1],
			}})
			next_id += 1
		state["floor_consumable_drops"] = consumable_drops
		state["next_consumable_id"] = next_id
		return
	if selection == "card:adrenaline":
		var adrenaline := CardCatalog.create_adrenaline_card(int(state.get("next_card_id", 1)))
		if adrenaline.is_empty():
			return
		var adrenaline_drops: Array = state.get("floor_cards", [])
		adrenaline_drops.append({"x": x, "y": y, "card": adrenaline})
		state["floor_cards"] = adrenaline_drops
		state["next_card_id"] = int(state.get("next_card_id", 1)) + 1
		return
	var parts := selection.split(":")
	if parts.size() != 3 or parts[0] != "card":
		return
	var rarity := parts[1]
	var rarity_index := int(parts[2])
	var matching: Array[Dictionary] = []
	for blueprint in DebugDecks._all_card_blueprints():
		if str(blueprint.get("rarity", "")) == rarity:
			matching.append(blueprint)
	if rarity_index < 0 or rarity_index >= matching.size():
		return
	var card: Dictionary
	var next_card_id := int(state.get("next_card_id", 1))
	card = CardCatalog._make_card(matching[rarity_index], next_card_id)
	if card.is_empty():
		return
	var floor_cards: Array = state.get("floor_cards", [])
	floor_cards.append({"x": x, "y": y, "card": card})
	state["floor_cards"] = floor_cards
	state["next_card_id"] = next_card_id + 1


static func _generate_region_decks(state: Dictionary, region: int, count: int, random: RandomNumberGenerator) -> void:
	if region < 1 or region > MapRules.REGION_COUNT or count < 1:
		return
	var position := _position(state)
	var x := position.x
	var y := position.y
	var bonus := 5 if state.get("blessings", []).has("deckSize") else 0
	var next_id := int(state.get("next_card_id", 1))
	var drops: Array = state.get("floor_deck_drops", [])
	for _index in range(count):
		var result := CardCatalog.create_region_deck(region, next_id, random, 0.0)
		var deck: Dictionary = result["deck"]
		deck["capacity"] = int(deck.get("capacity", 0)) + bonus
		drops.append({"x": x, "y": y, "deck": deck})
		next_id = int(result["next_card_id"])
	state["floor_deck_drops"] = drops
	state["next_card_id"] = next_id


static func _create_sticker_test_deck(state: Dictionary) -> void:
	var result := DebugDecks.create_sticker_test_deck(int(state.get("next_card_id", 1)))
	var deck: Dictionary = result.get("deck", {})
	if deck.is_empty():
		return
	var owned: Array = state.get("owned_decks", []).duplicate(true)
	var filtered: Array = []
	for existing in owned:
		if str(existing.get("id", "")) != "debug-sticker-catalog":
			filtered.append(existing)
	filtered.push_front(deck)
	state["owned_decks"] = filtered
	state["active_deck_id"] = str(deck.get("id", "debug-sticker-catalog"))
	state["deck"] = deck.get("cards", []).duplicate(true)
	state["next_card_id"] = int(result.get("next_card_id", state.get("next_card_id", 1)))


static func _strict_integer(value: Variant) -> Dictionary:
	if value is int:
		return {"valid": true, "value": value}
	if value is float:
		return {"valid": is_finite(value) and value == floorf(value), "value": int(value)}
	if value is String or value is StringName:
		var text := str(value)
		if not text.is_valid_float():
			return {"valid": false, "value": 0}
		var number := text.to_float()
		return {"valid": is_finite(number) and number == floorf(number), "value": int(number)}
	return {"valid": false, "value": 0}


static func _position(state: Dictionary) -> Vector2i:
	var raw: Variant = state.get("position", Vector2i.ZERO)
	if raw is Vector2i:
		return raw
	if raw is Vector2:
		return Vector2i(raw)
	if raw is Dictionary:
		return Vector2i(int(raw.get("x", 0)), int(raw.get("y", 0)))
	return Vector2i.ZERO
