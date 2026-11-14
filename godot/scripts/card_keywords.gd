extends RefCounted

class_name PortCardKeywords

const CardUse = preload("res://scripts/card_use.gd")

const CardStickers = preload("res://scripts/stickers.gd")

const DESCRIPTIONS := {
	"룰": "사용하면 카드가 소멸하고, 그 효과는 이번 전투 동안 지속됩니다.",
	"소멸": "사용 시 이번 전투 동안 사라집니다.",
	"보존": "턴이 끝나도 손패에서 버려지지 않습니다.",
	"토큰": "전투 중 생성되는 임시 카드입니다. 사용하거나 버리면 사라집니다.",
	"재련": "이 카드를 조건에 맞는 카드 위에 놓으면 이 카드가 강화됩니다. 재련: [조건]은 아래 카드가 만족해야 하는 조건을 나타냅니다. 효과 설명 속 [ ]는 재련 후 적용되는 수치나 효과를 나타냅니다.",
	"사용 불가": "손패에서 사용할 수 없습니다. 옮길 수는 있습니다.",
	"★": "솔리테어 행동 자원입니다. 사용하여 손패에서 파일로, 혹은 파일에서 다른 파일로 카드를 옮길 수 있습니다. 턴이 끝나도 사라지지 않습니다.",
	"에너지": "카드를 사용할 때 소모하는 자원입니다. 턴 시작 시 기본적으로 최대 에너지만큼 회복합니다. 이 회복으로는 최대 에너지를 넘지 않습니다.",
	"버리기 X": "사용 시 손패의 다른 카드 X장을 버립니다. 버릴 카드가 X장보다 적으면 사용할 수 없습니다.",
	"힘 X": "공격의 각 타격에 피해를 X만큼 추가합니다. 직접 카드를 낼 때만 적용됩니다.",
	"강인함 X": "방어 또는 마법 방어를 얻을 때 X만큼 추가로 얻습니다. 직접 카드를 낼 때만 적용됩니다.",
	"저항 X": "적에게 받는 공격 피해가 30% 감소합니다. 취약과 서로 상쇄됩니다.",
	"취약 X": "적에게 받는 공격 피해가 30% 증가합니다. 저항과 서로 상쇄됩니다.",
	"증폭 X": "내 공격 피해가 30% 증가합니다. 약화와 서로 상쇄됩니다.",
	"약화 X": "내 공격 피해가 30% 감소합니다. 증폭과 서로 상쇄됩니다.",
	"무적": "피해를 받지 않습니다.",
	"광채": "피해를 4 줍니다. 전투 중 생성되는 임시 카드입니다. 사용하거나 버리면 사라집니다.",
}
const PREVIEWS := {"광채": "radiance"}


static func tooltip_sections(card: Dictionary) -> Array[Dictionary]:
	var description := str(card.get("description", ""))
	var effect := str(card.get("effect", ""))
	var keywords: Array[String] = []
	if bool(card.get("rule", false)) or description.contains("룰."):
		_add_keyword(keywords, "룰")
	if (bool(card.get("exhaust", false)) or effect == "obsidian_dagger") \
			and not bool(card.get("rule", false)):
		_add_keyword(keywords, "소멸")
	if bool(card.get("token", false)) or effect in ["soil", "wish"]:
		_add_keyword(keywords, "토큰")
	if bool(card.get("retain", false)) or CardStickers.has_sticker(card, "bookmark"):
		_add_keyword(keywords, "보존")
	if description.contains("에너지"):
		_add_keyword(keywords, "에너지")
	if effect in ["obsidian_dagger", "odin_spear", "metallurgy_research"] \
			or description.contains("재련") or card.has("forge_cost") or card.has("forge_costs") \
			or card.has("forge_target_name") or bool(card.get("forge_any", false)):
		_add_keyword(keywords, "재련")
	if not CardUse.is_playable(card) or description.contains("사용 불가") \
			or (not bool(card.get("forged", false)) \
			and str(card.get("forge_target_name", "")) == "사용 불가 카드"):
		_add_keyword(keywords, "사용 불가")
	if description.contains("★") or effect in ["grimoire", "meteor", "supernova", "osiris_sun"]:
		_add_keyword(keywords, "★")
	if card.has("discard_cost") or effect == "saeongjima" or description.contains("버리기"):
		_add_keyword(keywords, "버리기 X")
	if description.contains("힘"):
		_add_keyword(keywords, "힘 X")
	if description.contains("강인함"):
		_add_keyword(keywords, "강인함 X")
	if description.contains("저항"):
		_add_keyword(keywords, "저항 X")
	if description.contains("취약"):
		_add_keyword(keywords, "취약 X")
	if description.contains("증폭"):
		_add_keyword(keywords, "증폭 X")
	if description.contains("약화"):
		_add_keyword(keywords, "약화 X")
	if description.contains("무적"):
		_add_keyword(keywords, "무적")
	if description.contains("광채"):
		_add_keyword(keywords, "광채")

	var sections: Array[Dictionary] = []
	for keyword in keywords:
		var section := {"title": keyword, "description": DESCRIPTIONS[keyword], "kind": "keyword"}
		if PREVIEWS.has(keyword):
			section["preview"] = PREVIEWS[keyword]
		sections.append(section)
	for sticker_id in CardStickers.card_sticker_ids(card):
		var sticker: Dictionary = CardStickers.STICKERS.get(sticker_id, {})
		if not sticker.is_empty():
			sections.append({
				"title": str(sticker.get("name", "")),
				"description": str(sticker.get("description", "")),
				"kind": "sticker",
			})
	return sections


static func tooltip_text(card: Dictionary) -> String:
	var sections := PackedStringArray()
	for section in tooltip_sections(card):
		sections.append("%s\n%s" % [section.get("title", ""), section.get("description", "")])
	return "\n\n".join(sections)


static func _add_keyword(keywords: Array[String], keyword: String) -> void:
	if not keywords.has(keyword):
		keywords.append(keyword)
