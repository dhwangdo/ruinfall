extends RefCounted
class_name PortStickers

const CardUse = preload("res://scripts/card_use.gd")
const STICKERS := {
	"moonstone": {"name": "월석 스티커", "description": "이 카드의 비용이 1 감소합니다.", "cell": Vector2i(1, 0)},
	"clockwork": {"name": "태엽장치 스티커", "description": "이 카드를 손패에서 파일로 옮기면 비용이 1 감소합니다. 전투마다 한 번만 발동합니다.", "cell": Vector2i(2, 0)},
	"bookmark": {"name": "책갈피 스티커", "description": "이 카드가 보존을 얻습니다.", "cell": Vector2i(0, 0)},
	"kite": {"name": "연 스티커", "description": "전투 시작 시 이 카드를 파일 맨 위에 놓습니다.", "cell": Vector2i(3, 0)},
	"anchor": {"name": "닻 스티커", "description": "전투 시작 시 이 카드를 파일 맨 밑에 놓습니다.", "cell": Vector2i(4, 0)},
	"glowDinosaur": {"name": "야광공룡 스티커", "description": "셔플할 때 이 카드를 항상 앞면으로 놓습니다.", "cell": Vector2i(0, 1)},
	"bluebird": {"name": "파랑새 스티커", "description": "이 카드는 무료로 솔리테어 행동할 수 있습니다.", "cell": Vector2i(1, 1)},
	"hook": {"name": "갈고리 스티커", "description": "이 카드를 뽑을 때 같은 파일의 다음 카드도 1장 가져옵니다.", "cell": Vector2i(2, 1)},
	"parachute": {"name": "낙하산 스티커", "description": "사용 후 빈 파일이 있으면 버려지지 않고 대신 빈 파일로 이동합니다.", "cell": Vector2i(3, 1)},
	"comet": {"name": "혜성 스티커", "description": "전투 시작 시 이 카드를 손패로 가져옵니다.", "cell": Vector2i(4, 1)},
}
const STICKER_IDS := ["moonstone", "clockwork", "bookmark", "kite", "anchor", "glowDinosaur", "bluebird", "hook", "parachute", "comet"]
const STICKER_ATLAS_PATH := "res://assets/sticker-atlas.png"


static func card_sticker_ids(card: Dictionary) -> Array[String]:
	var result: Array[String] = []
	var saved: Array = card.get("stickers", [])
	if saved.is_empty() and card.has("sticker"):
		saved = [card["sticker"]]
	for raw_id in saved:
		var sticker_id := str(raw_id)
		if STICKERS.has(sticker_id) and not result.has(sticker_id):
			result.append(sticker_id)
	return result


static func has_sticker(card: Dictionary, sticker_id: String) -> bool:
	return card_sticker_ids(card).has(sticker_id)


static func card_energy_cost(card: Dictionary) -> int:
	var cost := int(card.get("cost", 0))
	if has_sticker(card, "moonstone"):
		cost -= 1
	if has_sticker(card, "clockwork") and bool(card.get("clockwork_triggered", false)):
		cost -= 1
	return cost


static func solitaire_star_cost(card: Dictionary) -> int:
	return 0 if has_sticker(card, "bluebird") else 1


static func retains_card(card: Dictionary) -> bool:
	return bool(card.get("retain", false)) or has_sticker(card, "bookmark")


static func with_card_stickers(card: Dictionary, sticker_ids: Array[String]) -> Dictionary:
	var next: Dictionary = card.duplicate(true)
	next.erase("sticker")
	var unique: Array[String] = []
	for sticker_id in sticker_ids:
		if STICKERS.has(sticker_id) and not unique.has(sticker_id):
			unique.append(sticker_id)
	if unique.is_empty():
		next.erase("stickers")
	else:
		next["stickers"] = unique
	return next


static func compatible_stickers(card: Dictionary) -> Array[String]:
	var existing := card_sticker_ids(card)
	var maximum := 3 if str(card.get("effect", "")) == "diy" else 1
	var unplayable_effect := not CardUse.is_playable(card)
	if existing.size() >= maximum:
		return []
	var compatible: Array[String] = []
	for sticker_id in STICKER_IDS:
		if existing.has(sticker_id):
			continue
		if ["moonstone", "clockwork"].has(sticker_id):
			if not card.has("cost") or unplayable_effect:
				continue
		if sticker_id == "bookmark" and bool(card.get("retain", false)):
			continue
		if sticker_id == "parachute" and (
			bool(card.get("exhaust", false)) or bool(card.get("rule", false))
			or bool(card.get("token", false)) or unplayable_effect
		):
			continue
		compatible.append(sticker_id)
	return compatible


static func with_random_sticker(card: Dictionary, chance: float, random: RandomNumberGenerator) -> Dictionary:
	if not card_sticker_ids(card).is_empty() or random.randf() >= chance:
		return card
	var choices := compatible_stickers(card)
	if choices.is_empty():
		return card
	var chosen: Array[String] = [choices[random.randi_range(0, choices.size() - 1)]]
	return with_card_stickers(card, chosen)


static func take_pile_cards(pile: Array) -> Array[Dictionary]:
	var hand: Array[Dictionary] = []
	var first := _draw_one(pile, hand)
	if not first.is_empty() and has_sticker(first, "hook"):
		_draw_one(pile, hand)
	_reveal_file_top(pile)
	return hand


static func place_starting_stickers(piles: Array, random: RandomNumberGenerator) -> Dictionary:
	var placement: Dictionary = {}
	var cards_by_id: Dictionary = {}
	for pile in piles:
		for card in pile:
			cards_by_id[int(card.get("id", -1))] = card
			var ids := card_sticker_ids(card)
			for sticker_index in range(ids.size() - 1, -1, -1):
				if ["comet", "kite", "anchor"].has(ids[sticker_index]):
					placement[int(card.get("id", -1))] = ids[sticker_index]
					break

	var next_piles: Array = []
	var starting_hand: Array[Dictionary] = []
	var special_cards: Array[Dictionary] = []
	for card_id in placement.keys():
		var card: Dictionary = cards_by_id[card_id].duplicate(true)
		var sticker_id := str(placement[card_id])
		if sticker_id == "comet":
			card["revealed"] = true
			starting_hand.append(card)
		else:
			special_cards.append({"card": card, "sticker": sticker_id})
	for pile in piles:
		var filtered: Array = []
		for card in pile:
			if not placement.has(int(card.get("id", -1))):
				filtered.append(card.duplicate(true))
		next_piles.append(filtered)

	for sticker_id in ["anchor", "kite"]:
		var available: Array[int] = []
		for special in special_cards:
			if str(special["sticker"]) != sticker_id:
				continue
			if available.is_empty():
				for pile_index in range(next_piles.size()):
					available.append(pile_index)
			if available.is_empty():
				next_piles.append([])
				available.append(next_piles.size() - 1)
			var available_index := random.randi_range(0, available.size() - 1)
			var pile_index: int = int(available.pop_at(available_index))
			var card: Dictionary = special["card"]
			card["revealed"] = sticker_id == "kite"
			if sticker_id == "anchor":
				next_piles[pile_index].push_front(card)
			else:
				next_piles[pile_index].append(card)

	for pile in next_piles:
		for card_index in range(pile.size()):
			var card: Dictionary = pile[card_index]
			card["revealed"] = has_sticker(card, "glowDinosaur") or card_index == pile.size() - 1
	return {"piles": next_piles, "hand": starting_hand}


static func sticker_icon(sticker_id: String) -> AtlasTexture:
	if not STICKERS.has(sticker_id):
		return null
	var info: Dictionary = STICKERS[sticker_id]
	var cell: Vector2i = info["cell"]
	var atlas: Texture2D = load(STICKER_ATLAS_PATH)
	var cell_size := Vector2(float(atlas.get_width()) / 5.0, float(atlas.get_height()) / 2.0)
	var texture := AtlasTexture.new()
	texture.atlas = atlas
	texture.region = Rect2(Vector2(cell) * cell_size, cell_size)
	texture.filter_clip = true
	return texture


static func _draw_one(pile: Array, hand: Array[Dictionary]) -> Dictionary:
	if pile.is_empty():
		return {}
	var card: Dictionary = pile.pop_back()
	card["revealed"] = true
	hand.append(card)
	return card


static func _reveal_file_top(pile: Array) -> void:
	if not pile.is_empty():
		var card: Dictionary = pile[pile.size() - 1]
		card["revealed"] = true
