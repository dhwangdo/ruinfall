extends RefCounted

const CardStickers = preload("res://scripts/stickers.gd")


static func file_payload(state: Dictionary, file_index: int, card_index: int) -> Dictionary:
	var piles: Array = state.get("piles", [])
	if file_index < 0 or file_index >= piles.size():
		return {}
	var pile: Array = piles[file_index]
	if card_index < 0 or card_index >= pile.size():
		return {}
	var card: Dictionary = pile[card_index]
	var card_ids: Array = []
	for moving_card in pile.slice(card_index):
		card_ids.append(int(moving_card.get("id", -1)))
	return {
		"kind": "battle-card", "source": "file", "source_index": file_index,
		"card_index": card_index, "card_id": int(card.get("id", -1)),
		"card_ids": card_ids, "card_name": str(card.get("name", "카드")),
	}


static func source_cards(state: Dictionary, payload: Dictionary) -> Array:
	var card_id := int(payload.get("card_id", -1))
	if str(payload.get("source", "")) == "hand":
		for card in state.get("hand", []):
			if int(card.get("id", -1)) == card_id:
				return [card]
		return []
	if str(payload.get("source", "")) != "file":
		return []
	var piles: Array = state.get("piles", [])
	var file_index := int(payload.get("source_index", -1))
	if file_index < 0 or file_index >= piles.size():
		return []
	var pile: Array = piles[file_index]
	var card_index := int(payload.get("card_index", -1))
	if card_index < 0 or card_index >= pile.size():
		return []
	if int(pile[card_index].get("id", -1)) != card_id or not bool(pile[card_index].get("revealed", false)):
		return []
	var moving: Array = pile.slice(card_index)
	var expected_ids: Array = payload.get("card_ids", [])
	if moving.size() != expected_ids.size():
		return []
	for index in range(moving.size()):
		if int(moving[index].get("id", -1)) != int(expected_ids[index]):
			return []
	return moving


static func placement_error(card: Dictionary, target: Dictionary) -> String:
	match str(card.get("solitaire_rule", "")):
		"top":
			if str(target.get("solitaire_rule", "")) != "bottom":
				return "윗패는 밑패 위에만 놓을 수 있습니다."
		"spell":
			if not card.has("cost") or not target.has("cost") \
					or str(target.get("solitaire_rule", "")) != "spell" \
					or int(target["cost"]) != int(card["cost"]) + 1:
				return "주문은 비용이 1 높은 주문 카드 위에만 놓을 수 있습니다."
	return ""


static func move_error(state: Dictionary, payload: Dictionary, target_file: int) -> String:
	if str(state.get("status", "")) != "playing":
		return "지금은 카드를 옮길 수 없습니다."
	if int(state.get("pending_draws", 0)) > 0 or int(state.get("pending_pile_draw_count", 0)) > 0 \
			or int(state.get("pending_play_card_id", -1)) >= 0 \
			or int(state.get("pending_discard_count", 0)) > 0 \
			or str(state.get("pending_pile_operation", "")) != "":
		return "먼저 진행 중인 카드 효과를 마무리하세요."
	var piles: Array = state.get("piles", [])
	if target_file < 0 or target_file >= piles.size():
		return "존재하지 않는 파일입니다."
	if str(payload.get("source", "")) == "file" and int(payload.get("source_index", -1)) == target_file:
		return "다른 파일을 선택하세요."
	var moving := source_cards(state, payload)
	if moving.is_empty():
		return "카드 위치가 바뀌었습니다. 앞면 카드를 다시 선택하세요."
	var target: Dictionary = piles[target_file].back() if not piles[target_file].is_empty() else {}
	var error := placement_error(moving[0], target)
	if error != "":
		return error
	if int(state.get("stars", 0)) < CardStickers.solitaire_star_cost(moving[0]):
		return "솔리테어 행동에 필요한 ★가 없습니다."
	return ""
