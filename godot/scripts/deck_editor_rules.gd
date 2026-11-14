extends RefCounted
class_name PortDeckEditorRules


static func is_high_rarity(card: Dictionary) -> bool:
	return str(card.get("rarity", "")) in ["rare", "legendary"]


static func add_card_error(cards: Array, card: Dictionary, capacity: int, rare_slot_capacity: int) -> String:
	if cards.size() >= capacity:
		return "deck-full"
	if is_high_rarity(card):
		var rare_count := 0
		for existing in cards:
			if is_high_rarity(existing):
				rare_count += 1
		if rare_count >= rare_slot_capacity:
			return "rare-slots-full"
	return ""
