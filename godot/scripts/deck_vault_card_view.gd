extends RefCounted
class_name PortDeckVaultCardView

const CardUse = preload("res://scripts/card_use.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const DeckEditorRules = preload("res://scripts/deck_editor_rules.gd")

const RARITY_RANK := {
	"legendary": 0,
	"rare": 1,
	"special": 2,
	"basic": 3,
	"starter": 4,
	"status": 5,
}


static func create(deck: Dictionary) -> Dictionary:
	var groups_by_key: Dictionary = {}
	var groups: Array[Dictionary] = []
	var cards: Array = deck.get("cards", [])
	var rare_count := 0
	var normal_count := 0
	for source_index in range(cards.size()):
		var card: Dictionary = cards[source_index]
		# Capacity counts physical cards, even when identical cards share a stack.
		if DeckEditorRules.is_high_rarity(card):
			rare_count += 1
		else:
			normal_count += 1
		var key := _group_key(card)
		if groups_by_key.has(key):
			var existing: Dictionary = groups_by_key[key]
			var ids: Array = existing["card_ids"]
			ids.append(card.get("id", source_index))
			existing["card_ids"] = ids
			continue
		var card_ids: Array = [card.get("id", source_index)]
		var group := {"card": card, "card_ids": card_ids, "source_index": source_index}
		groups_by_key[key] = group
		groups.append(group)
	groups.sort_custom(_card_group_less)

	var rare_capacity := maxi(int(deck.get("rare_slot_capacity", deck.get("rareSlotCapacity", 0))), rare_count)
	var capacity := maxi(0, int(deck.get("capacity", 0)))
	var normal_capacity := maxi(0, capacity - rare_capacity)
	var rare_cards: Array[Dictionary] = []
	var normal_cards: Array[Dictionary] = []
	for group in groups:
		var card: Dictionary = group["card"]
		if DeckEditorRules.is_high_rarity(card):
			rare_cards.append(group)
		else:
			normal_cards.append(group)
	var items: Array[Dictionary] = []
	for group in rare_cards:
		items.append({"kind": "card", "group": group,
			"width": 82 + mini(5, maxi(0, group["card_ids"].size() - 1)) * 7})
	for slot_index in range(maxi(0, rare_capacity - rare_count)):
		items.append({"kind": "rare-slot", "slot": slot_index, "width": 82})
	if rare_capacity > 0:
		items.append({"kind": "divider", "width": 11})
	for group in normal_cards:
		items.append({"kind": "card", "group": group,
			"width": 82 + mini(5, maxi(0, group["card_ids"].size() - 1)) * 7})
	for slot_index in range(maxi(0, normal_capacity - normal_count)):
		items.append({"kind": "normal-slot", "slot": slot_index, "width": 82})
	return {
		"items": items,
		"rare_slot_count": rare_count,
		"rare_slot_capacity": rare_capacity,
		"normal_slot_capacity": normal_capacity,
		"normal_card_count": normal_count,
	}


static func _group_key(card: Dictionary) -> String:
	var sticker_ids := CardStickers.card_sticker_ids(card)
	var completed_forges: Variant = card.get("forge_costs_completed", card.get("forgeCostsCompleted", []))
	return JSON.stringify([
		str(card.get("name", "")),
		str(card.get("effect", "")),
		str(card.get("damage_type", card.get("damageType", ""))),
		card.get("cost"),
		card.get("value"),
		str(card.get("rarity", "")),
		sticker_ids,
		bool(card.get("forged", false)),
		bool(card.get("enemy_token", card.get("enemyToken", false))),
		completed_forges,
		bool(card.get("transformed_new", card.get("transformedNew", false))),
	])


static func _card_group_less(left: Dictionary, right: Dictionary) -> bool:
	var left_card: Dictionary = left["card"]
	var right_card: Dictionary = right["card"]
	var left_rarity := int(RARITY_RANK.get(str(left_card.get("rarity", "")), 99))
	var right_rarity := int(RARITY_RANK.get(str(right_card.get("rarity", "")), 99))
	if left_rarity != right_rarity:
		return left_rarity < right_rarity
	var left_cost := _card_cost(left_card)
	var right_cost := _card_cost(right_card)
	if left_cost != right_cost:
		return left_cost < right_cost
	var left_name := str(left_card.get("name", ""))
	var right_name := str(right_card.get("name", ""))
	if left_name != right_name:
		return name_less(left_name, right_name)
	return int(left["source_index"]) < int(right["source_index"])


static func name_less(left_name: String, right_name: String) -> bool:
	return korean_name_key(left_name) < korean_name_key(right_name)


static func korean_name_key(name: String) -> String:
	var normalized := name.to_lower()
	var key := ""
	for index in range(normalized.length()):
		var codepoint := normalized.unicode_at(index)
		if codepoint >= 97 and codepoint <= 122:
			key += char(0xE000 + codepoint)
		else:
			key += normalized.substr(index, 1)
	return key


static func _card_cost(card: Dictionary) -> int:
	if not CardUse.is_playable(card):
		return -1
	return int(CardStickers.card_energy_cost(card) if card.has("cost") else -1)
