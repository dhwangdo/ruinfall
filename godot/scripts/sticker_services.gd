extends RefCounted
class_name PortStickerServices

const CardCatalog = preload("res://scripts/card_catalog.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const MapGenerationRules = preload("res://scripts/map_generation_rules.gd")
const MAX_SAFE_SERVICE_PRICE := 9007199254740991
const STICKER_PRICES := {
	"moonstone": 200, "comet": 200, "clockwork": 100, "bookmark": 100,
	"kite": 100, "bluebird": 100, "hook": 200,
	"parachute": 50, "anchor": 50, "glowDinosaur": 50,
}


static func tinkerer_sticker_at(position: Vector2i, map_seed: int) -> String:
	var browser_position := Vector2i(position.x - 106, position.y)
	var roll := MapGenerationRules.seeded_roll(browser_position, map_seed, 81402)
	var index := mini(CardStickers.STICKER_IDS.size() - 1, floori(roll * CardStickers.STICKER_IDS.size()))
	return CardStickers.STICKER_IDS[index]


static func service_price(kind: String, uses: int, sticker_id: String = "") -> int:
	var base_price := 40
	if kind == "stickerAltar":
		base_price = 100
	elif kind == "tinkerer":
		base_price = int(STICKER_PRICES.get(sticker_id, 40))
	var scaled_price := float(base_price) * pow(1.5, float(maxi(0, uses)))
	if scaled_price >= float(MAX_SAFE_SERVICE_PRICE):
		return MAX_SAFE_SERVICE_PRICE
	return int(ceil(scaled_price))


static func transmuter_candidates(card: Dictionary) -> Array[Dictionary]:
	var candidates: Array[Dictionary] = []
	for pool in [CardCatalog.STARTER_CARDS, CardCatalog.BASIC_CARDS, CardCatalog.SPECIAL_CARDS,
		CardCatalog.RARE_CARDS, CardCatalog.LEGENDARY_CARDS]:
		for blueprint in pool:
			if str(blueprint.get("rarity", "")) != str(card.get("rarity", "")):
				continue
			if str(blueprint.get("name", "")) == str(card.get("name", "")):
				continue
			if not CardStickers.card_sticker_ids(card).is_empty():
				var candidate: Dictionary = blueprint.duplicate(true)
				candidate["id"] = int(card.get("id", -1))
				if _transmuter_sticker_choices(card, candidate).is_empty():
					continue
			candidates.append(blueprint)
	return candidates


static func create_transmuter_preview(card: Dictionary, random: RandomNumberGenerator, previous_preview: Dictionary = {}) -> Dictionary:
	var candidates := transmuter_candidates(card)
	if candidates.is_empty():
		return {}
	var alternate_candidates: Array[Dictionary] = []
	if not previous_preview.is_empty() and candidates.size() > 1:
		for candidate in candidates:
			if str(candidate.get("name", "")) != str(previous_preview.get("name", "")):
				alternate_candidates.append(candidate)
	if alternate_candidates.is_empty():
		alternate_candidates = candidates
	var blueprint: Dictionary = alternate_candidates[random.randi_range(0, alternate_candidates.size() - 1)]
	var after: Dictionary = blueprint.duplicate(true)
	after["id"] = int(card.get("id", -1))
	after["revealed"] = bool(card.get("revealed", false))
	var old_stickers := CardStickers.card_sticker_ids(card)
	if not old_stickers.is_empty():
		var possible_stickers := _transmuter_sticker_choices(card, after)
		var previous_sticker := ""
		if str(previous_preview.get("name", "")) == str(after.get("name", "")):
			var prior_ids := CardStickers.card_sticker_ids(previous_preview)
			if not prior_ids.is_empty():
				previous_sticker = prior_ids[-1]
		if possible_stickers.size() > 1 and previous_sticker != "":
			var alternates: Array[String] = []
			for sticker_id in possible_stickers:
				if sticker_id != previous_sticker:
					alternates.append(sticker_id)
			if not alternates.is_empty():
				possible_stickers = alternates
		if possible_stickers.is_empty():
			return {}
		var chosen: Array[String] = [possible_stickers[random.randi_range(0, possible_stickers.size() - 1)]]
		after = CardStickers.with_card_stickers(after, chosen)
	after.erase("clockwork_triggered")
	after.erase("bluebird_used_turn")
	return after


static func _transmuter_sticker_choices(source: Dictionary, target: Dictionary) -> Array[String]:
	var choices := CardStickers.compatible_stickers(target)
	var source_stickers := CardStickers.card_sticker_ids(source)
	if source_stickers.is_empty():
		return choices
	var last_source_sticker := source_stickers[-1]
	var filtered: Array[String] = []
	for sticker_id in choices:
		if sticker_id != last_source_sticker:
			filtered.append(sticker_id)
	return filtered


static func resolve(
	kind: String,
	cards: Array,
	primary_card_id: int,
	secondary_card_id: int,
	fixed_sticker: String,
	uses: int,
	random: RandomNumberGenerator
) -> Dictionary:
	var primary: Dictionary = {}
	var secondary: Dictionary = {}
	for card in cards:
		if int(card.get("id", -1)) == primary_card_id:
			primary = card
		if int(card.get("id", -1)) == secondary_card_id:
			secondary = card
	if primary.is_empty():
		return {"ok": false, "message": "카드를 다시 선택하세요."}

	var sticker_ids := CardStickers.card_sticker_ids(primary)
	var after: Dictionary = {}
	var before: Dictionary = primary
	var destroyed_id := -1
	var attached_sticker := ""
	if kind == "stickerAltar":
		if secondary.is_empty() or secondary_card_id == primary_card_id:
			return {"ok": false, "message": "서로 다른 카드 두 장을 선택하세요."}
		var donor := primary
		var target := secondary
		var donor_id := primary_card_id
		var transfer_problem := _altar_transfer_problem(donor, target)
		if not transfer_problem.is_empty():
			var reverse_problem := _altar_transfer_problem(secondary, primary)
			if not reverse_problem.is_empty():
				return {"ok": false, "message": transfer_problem}
			donor = secondary
			target = primary
			donor_id = secondary_card_id
		sticker_ids = CardStickers.card_sticker_ids(donor)
		attached_sticker = sticker_ids[0]
		before = target
		var target_stickers := CardStickers.card_sticker_ids(target)
		target_stickers.append(attached_sticker)
		after = CardStickers.with_card_stickers(target, target_stickers)
		destroyed_id = donor_id
	elif kind == "tinkerer":
		if fixed_sticker.is_empty():
			return {"ok": false, "message": "이 땜장이의 스티커를 찾지 못했습니다."}
		if CardStickers.card_sticker_ids(primary).has(fixed_sticker):
			return {"ok": false, "message": "같은 스티커는 중복해서 붙일 수 없습니다."}
		if not CardStickers.compatible_stickers(primary).has(fixed_sticker):
			return {"ok": false, "message": "이 카드에는 해당 스티커를 붙일 수 없습니다."}
		attached_sticker = fixed_sticker
		sticker_ids.append(fixed_sticker)
		after = CardStickers.with_card_stickers(primary, sticker_ids)
	else:
		if transmuter_candidates(primary).is_empty():
			return {"ok": false, "message": "같은 희귀도의 다른 카드가 없습니다."}
		# The rotating card is only an example; confirmation rolls a fresh result.
		after = create_transmuter_preview(primary, random)
		if after.is_empty():
			return {"ok": false, "message": "변환할 수 있는 카드가 없습니다."}
		var transformed_stickers := CardStickers.card_sticker_ids(after)
		attached_sticker = transformed_stickers[-1] if not transformed_stickers.is_empty() else ""

	after.erase("clockwork_triggered")
	after.erase("bluebird_used_turn")
	var price := service_price(kind, uses, fixed_sticker)
	var message := "%s을(를) %s로 변환했습니다." % [str(primary.get("name", "카드")), str(after.get("name", "카드"))] if kind == "cardTransmuter" else "%s에 %s를 붙였습니다." % [str(after.get("name", "카드")), str(CardStickers.STICKERS[attached_sticker]["name"])]
	if destroyed_id >= 0:
		message += " 제물 카드는 파괴되었습니다."
	return {
		"ok": true,
		"price": price,
		"before": before.duplicate(true),
		"after": after.duplicate(true),
		"destroyed_id": destroyed_id,
		"attached_sticker": attached_sticker,
		"message": message,
	}


static func _altar_transfer_problem(donor: Dictionary, target: Dictionary) -> String:
	var donor_stickers := CardStickers.card_sticker_ids(donor)
	if donor_stickers.is_empty():
		return "제물 카드에 스티커가 없습니다."
	if donor_stickers.size() > 1:
		return "스티커가 여러 개인 카드는 제물로 낼 수 없습니다."
	if CardStickers.card_sticker_ids(target).has(donor_stickers[0]):
		return "같은 스티커는 중복해서 붙일 수 없습니다."
	if not CardStickers.compatible_stickers(target).has(donor_stickers[0]):
		return "이 카드에는 해당 스티커를 붙일 수 없습니다."
	return ""


static func can_altar_transfer(donor: Dictionary, target: Dictionary) -> bool:
	return not donor.is_empty() and not target.is_empty() and _altar_transfer_problem(donor, target).is_empty()
