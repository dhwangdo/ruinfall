extends RefCounted
class_name PortMapSearchRules

const MapRules = preload("res://scripts/map_rules.gd")
const StickerServices = preload("res://scripts/sticker_services.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const DeckEditions = preload("res://scripts/deck_editions.gd")
const DeckVaultCardView = preload("res://scripts/deck_vault_card_view.gd")

const CARD_RARITY_ORDER := {"legendary": 0, "rare": 1, "special": 2, "basic": 3, "starter": 4, "status": 5}

const ROOM_LABELS := {
	"safeArea": "안전 구역",
	"safeEntry": "안전 구역 입구",
	"partialHeal": "회복 지형",
	"heal": "회복 지형",
	"portal": "안전 구역 포탈",
	"safePortal": "다음 지역 포탈",
	"deckVault": "덱 금고",
	"stickerAltar": "제단",
	"tinkerer": "땜장이",
	"cardTransmuter": "변환기",
	"boss": "보스",
}


static func build_entries(run_state: Dictionary) -> Array[Dictionary]:
	var entries: Array[Dictionary] = []
	var map_data: Dictionary = run_state.get("map", {})
	var seen: Dictionary = map_data.get("seen", {})
	var map_seed := int(run_state.get("map_seed", map_data.get("seed", 0)))
	var vaults: Dictionary = map_data.get("deck_vaults", {})
	var opened_vaults: Dictionary = map_data.get("opened_deck_vaults", {})
	for raw_position in seen.keys():
		if not (raw_position is Vector2i):
			continue
		var seen_position: Vector2i = raw_position
		var region := MapRules.region_index_at(seen_position) + 1
		if region <= 0:
			continue
		var room_type := MapRules.room_type_at(map_data, seen_position)
		if ROOM_LABELS.has(room_type) and room_type != "deckVault":
			var place_label := str(ROOM_LABELS[room_type])
			var place_search_text := place_label
			var place_sticker_id := ""
			if room_type == "tinkerer":
				place_sticker_id = StickerServices.tinkerer_sticker_at(seen_position, map_seed)
				place_search_text += " " + str(CardStickers.STICKERS.get(place_sticker_id, {}).get("name", "스티커"))
			_add_entry(entries, "place", place_label, region, seen_position, place_search_text, 999, "", place_sticker_id)
		if room_type == "deckVault":
			var vault_key := _position_key(seen_position)
			if bool(opened_vaults.get(vault_key, false)):
				continue
			var vault: Dictionary = vaults.get(vault_key, {})
			if vault.is_empty():
				continue
			var deck_name := str(vault.get("name", "덱 금고"))
			_add_entry(entries, "deck", "덱 「%s」" % deck_name, region, seen_position,
				"덱 금고 %s %s %s" % [deck_name, _deck_search_text(vault), _edition_search_text(vault)], -1, "미개방 금고", "", {"deck": vault.duplicate(true)})
			_add_card_entries(entries, vault.get("cards", []), region, seen_position,
				"미개방 금고 · 덱 「%s」" % deck_name, deck_name, _edition_search_text(vault))

	var floor_cards_by_tile: Dictionary = {}
	for drop in run_state.get("floor_cards", []):
		var card_position := Vector2i(int(drop.get("x", -1)), int(drop.get("y", -1)))
		if not seen.has(card_position):
			continue
		var tile_key := _position_key(card_position)
		if not floor_cards_by_tile.has(tile_key):
			floor_cards_by_tile[tile_key] = {"position": card_position, "cards": []}
		floor_cards_by_tile[tile_key]["cards"].append(drop.get("card", {}))
	for group in floor_cards_by_tile.values():
		var card_position: Vector2i = group["position"]
		_add_card_entries(entries, group["cards"], MapRules.region_index_at(card_position) + 1,
			card_position, "바닥 카드", "", "")
	for drop in run_state.get("floor_deck_drops", []):
		var deck_position := Vector2i(int(drop.get("x", -1)), int(drop.get("y", -1)))
		if not seen.has(deck_position):
			continue
		var deck: Dictionary = drop.get("deck", {})
		var name := str(deck.get("name", "금고 덱"))
		_add_entry(entries, "deck", "덱 「%s」" % name, MapRules.region_index_at(deck_position) + 1, deck_position,
			"덱 %s %s %s" % [name, _deck_search_text(deck), _edition_search_text(deck)], -1, "바닥 덱", "", {"deck": deck.duplicate(true)})
		_add_card_entries(entries, deck.get("cards", []), MapRules.region_index_at(deck_position) + 1,
			deck_position, "바닥 덱 · 덱 「%s」" % name, name, _edition_search_text(deck))
	var floor_consumables_by_tile: Dictionary = {}
	for drop in run_state.get("floor_consumable_drops", []):
		var item_position := Vector2i(int(drop.get("x", -1)), int(drop.get("y", -1)))
		if not seen.has(item_position):
			continue
		var item: Dictionary = drop.get("consumable", {})
		var item_key := "%s|%s" % [_position_key(item_position), str(item.get("type", item.get("name", "아이템")))]
		if not floor_consumables_by_tile.has(item_key):
			floor_consumables_by_tile[item_key] = {"position": item_position, "item": item, "count": 0}
		floor_consumables_by_tile[item_key]["count"] += 1
	for group in floor_consumables_by_tile.values():
		var item_position: Vector2i = group["position"]
		var item: Dictionary = group["item"]
		var name := str(item.get("name", "아이템"))
		_add_entry(entries, "item", name, MapRules.region_index_at(item_position) + 1, item_position,
			"%s %s" % [name, str(item)], 999, "바닥 아이템", "",
			{"consumable": item.duplicate(true), "count": int(group["count"])})

	entries.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		if int(left["region"]) != int(right["region"]):
			return int(left["region"]) < int(right["region"])
		if str(left["label"]) != str(right["label"]):
			return DeckVaultCardView.name_less(str(left["label"]), str(right["label"]))
		var left_position: Vector2i = left["position"]
		var right_position: Vector2i = right["position"]
		return left_position.y < right_position.y if left_position.y != right_position.y else left_position.x < right_position.x
	)
	return entries


static func filter_entries(entries: Array[Dictionary], kind: String, region: int, query: String) -> Array[Dictionary]:
	var query_terms: Array[String] = []
	var separated_query := query.strip_edges().replace("\t", " ").replace("\n", " ").replace("\r", " ")
	for raw_term in separated_query.split(" ", false):
		var normalized_term := _normalize(raw_term)
		if not normalized_term.is_empty():
			query_terms.append(normalized_term)
	var results: Array[Dictionary] = []
	for entry in entries:
		if str(entry["kind"]) != kind:
			continue
		if region > 0 and int(entry["region"]) != region:
			continue
		var search_text := _normalize(str(entry["search_text"]))
		var matches_query := true
		for term in query_terms:
			if not search_text.contains(term):
				matches_query = false
				break
		if not matches_query:
			continue
		results.append(entry)
	if kind == "item":
		results.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
			if int(left["region"]) != int(right["region"]):
				return int(left["region"]) < int(right["region"])
			if int(left["rarity_order"]) != int(right["rarity_order"]):
				return int(left["rarity_order"]) < int(right["rarity_order"])
			if str(left["label"]) != str(right["label"]):
				return DeckVaultCardView.name_less(str(left["label"]), str(right["label"]))
			var left_position: Vector2i = left["position"]
			var right_position: Vector2i = right["position"]
			return left_position.y < right_position.y if left_position.y != right_position.y else left_position.x < right_position.x
		)
	return results


static func _add_entry(entries: Array[Dictionary], kind: String, label: String, region: int,
	position: Vector2i, search_text: String, rarity_order: int = 999, detail: String = "", sticker_id: String = "",
	payload: Dictionary = {}) -> void:
	if region <= 0:
		return
	entries.append({
		"kind": kind,
		"label": label,
		"region": region,
		"position": position,
		"search_text": _normalize(search_text),
		"rarity_order": rarity_order,
		"detail": detail,
		"sticker_id": sticker_id,
		"card": payload.get("card", {}),
		"deck": payload.get("deck", {}),
		"consumable": payload.get("consumable", {}),
		"count": int(payload.get("count", 1)),
	})


static func _add_card_entries(entries: Array[Dictionary], raw_cards: Array, region: int,
	position: Vector2i, detail: String, deck_name: String, edition_text: String) -> void:
	for group in group_cards(raw_cards):
		var card: Dictionary = group["card"]
		var card_name := str(card.get("name", "카드"))
		_add_entry(entries, "item", card_name, region, position,
			"%s %s %s %s %s" % [card_name, str(card), _sticker_search_text(card), deck_name, edition_text],
			int(CARD_RARITY_ORDER.get(str(card.get("rarity", "")), 99)), detail, "",
			{"card": card.duplicate(true), "count": int(group["count"])})


static func group_cards(raw_cards: Array) -> Array[Dictionary]:
	var groups: Dictionary = {}
	for raw_card in raw_cards:
		if not (raw_card is Dictionary):
			continue
		var card: Dictionary = raw_card
		var group_key := _card_group_key(card)
		if not groups.has(group_key):
			groups[group_key] = {"card": card, "count": 0}
		groups[group_key]["count"] += 1
	var result: Array[Dictionary] = []
	for group in groups.values():
		result.append(group)
	result.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		var left_card: Dictionary = left["card"]
		var right_card: Dictionary = right["card"]
		var left_rare := str(left_card.get("rarity", "")) in ["rare", "legendary"]
		var right_rare := str(right_card.get("rarity", "")) in ["rare", "legendary"]
		if left_rare != right_rare:
			return left_rare
		var left_rarity := int(CARD_RARITY_ORDER.get(str(left_card.get("rarity", "")), 99))
		var right_rarity := int(CARD_RARITY_ORDER.get(str(right_card.get("rarity", "")), 99))
		if left_rarity != right_rarity:
			return left_rarity < right_rarity
		var left_cost := CardStickers.card_energy_cost(left_card) if left_card.has("cost") else -1
		var right_cost := CardStickers.card_energy_cost(right_card) if right_card.has("cost") else -1
		if left_cost != right_cost:
			return left_cost < right_cost
		return DeckVaultCardView.name_less(str(left_card.get("name", "")), str(right_card.get("name", "")))
	)
	return result


static func _card_group_key(card: Dictionary) -> String:
	var fields := PackedStringArray([
		str(card.get("name", "")), str(card.get("effect", "")), str(card.get("damage_type", card.get("damageType", ""))),
		str(card.get("cost", "")), str(card.get("value", "")), str(card.get("rarity", "")),
		",".join(PackedStringArray(CardStickers.card_sticker_ids(card))), str(card.get("forged", false)),
		str(card.get("enemy_token", card.get("enemyToken", false))),
		str(card.get("forge_costs_completed", card.get("forgeCostsCompleted", []))),
	])
	return ":".join(fields)


static func _deck_search_text(deck: Dictionary) -> String:
	var parts: Array[String] = []
	for edition in deck.get("editions", []):
		parts.append(str(edition))
	for card in deck.get("cards", []):
		parts.append(str(card))
	var joined := ""
	for part in parts:
		joined += " " + part
	return joined


static func _edition_search_text(deck: Dictionary) -> String:
	var editions: Array[String] = []
	for edition in deck.get("editions", []):
		var edition_id := str(edition)
		editions.append("%s %s" % [edition_id, DeckEditions.label(edition_id)])
	var result := ""
	for edition_text in editions:
		result += " " + edition_text
	return result


static func _sticker_search_text(card: Dictionary) -> String:
	var result := ""
	for sticker_id in CardStickers.card_sticker_ids(card):
		result += " " + str(CardStickers.STICKERS.get(sticker_id, {}).get("name", sticker_id))
	return result


static func _position_key(position: Vector2i) -> String:
	return "%d,%d" % [position.x, position.y]


static func _normalize(value: String) -> String:
	return value.strip_edges().to_lower().replace(" ", "").replace("\n", "").replace("\t", "")
