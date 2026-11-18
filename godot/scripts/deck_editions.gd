extends RefCounted
class_name PortDeckEditions

const IDS: Array[String] = [
	"roomy", "firstSolitaire", "quickHammer", "sharpLight", "cycle", "metallurgy",
	"gambit", "sunkenLegend", "prism", "giant",
	"fantastic", "legendCassiopeia", "freeEdit", "royal",
]
const SCORES := {
	"roomy": 1, "firstSolitaire": 1, "quickHammer": 1, "sharpLight": 1, "cycle": 1,
	"gambit": 2, "sunkenLegend": 2, "prism": 2,
	"fantastic": 3, "legendCassiopeia": 3,
	"metallurgy": 1, "giant": 2, "freeEdit": 3, "royal": 3,
}
const NAMES := {
	"roomy": "추가 파일", "firstSolitaire": "추가 솔리테어 행동", "quickHammer": "자동망치",
	"sharpLight": "날카로운 빛", "cycle": "순환", "gambit": "갬빗",
	"sunkenLegend": "가라앉은 전설", "prism": "프리즘",
	"fantastic": "압축", "legendCassiopeia": "카시오페이아",
	"metallurgy": "금속학", "giant": "거인", "freeEdit": "자유 편집", "royal": "로열",
}
const DESCRIPTIONS := {
	"roomy": "전투 시작 시 빈 추가 파일 2개를 얻습니다.",
	"firstSolitaire": "매 턴 시작 시 임시 ★을 1개 더 얻습니다.",
	"quickHammer": "전투 시작 시 덱의 재련 가능한 무작위 카드 2장을 재련합니다.",
	"sharpLight": "내 광채의 피해량이 3 증가합니다.",
	"cycle": "매 턴 처음으로 손패에서 카드를 버리면 무작위 카드 1장을 뽑습니다.",
	"gambit": "전투 시작 시 무작위 파일에서 카드 3장을 뽑고 에너지를 3 얻습니다. 덱 용량 -20.",
	"sunkenLegend": "전투 시작 시 첫 번째 파일 맨 아래에 무작위 전설 카드를 놓습니다.",
	"prism": "내 광채가 무작위 스티커를 얻습니다.",
	"fantastic": "파일에 카드를 4장씩 놓습니다. 덱 용량 -20%.",
	"legendCassiopeia": "이 덱은 카시오페이아를 가집니다.",
	"metallurgy": "카드를 재련할 때마다 그 카드를 손패로 가져옵니다.",
	"giant": "기본 비용이 3 이상인 카드의 비용이 1 감소합니다.",
	"freeEdit": "안전 구역 밖에서도 이 덱을 자유롭게 편집할 수 있습니다.",
	"royal": "모든 슬롯이 희귀 슬롯으로 바뀝니다.",
}
const TIER_COLORS := {1: "#00c8ff", 2: "#e040fb", 3: "#ffc400"}
const COLORS := {
	"roomy": TIER_COLORS[1], "firstSolitaire": TIER_COLORS[1], "quickHammer": TIER_COLORS[1],
	"sharpLight": TIER_COLORS[1], "cycle": TIER_COLORS[1], "gambit": TIER_COLORS[2],
	"sunkenLegend": TIER_COLORS[2], "prism": TIER_COLORS[2],
	"fantastic": TIER_COLORS[3], "legendCassiopeia": TIER_COLORS[3],
	"metallurgy": TIER_COLORS[1], "giant": TIER_COLORS[2],
	"freeEdit": TIER_COLORS[3], "royal": TIER_COLORS[3],
}


static func rare_slot_capacity(deck: Dictionary) -> int:
	if deck.get("editions", []).has("royal"):
		return int(deck.get("capacity", 0))
	return int(deck.get("rare_slot_capacity", deck.get("rareSlotCapacity", 0)))


static func roll(budget: int, random: RandomNumberGenerator) -> Array[String]:
	var selected: Array[String] = []
	var remaining := budget
	while remaining > 0:
		var tiers: Array[int] = []
		var total_weight := 0
		for tier in range(1, mini(3, remaining) + 1):
			for edition in IDS:
				if int(SCORES[edition]) == tier and not selected.has(edition):
					tiers.append(tier)
					total_weight += tier
					break
		if tiers.is_empty():
			break
		var cursor := random.randi_range(1, total_weight)
		var chosen_tier: int = tiers.back()
		for tier in tiers:
			cursor -= tier
			if cursor <= 0:
				chosen_tier = tier
				break
		var candidates: Array[String] = []
		for edition in IDS:
			if int(SCORES[edition]) == chosen_tier and not selected.has(edition):
				candidates.append(edition)
		selected.append(candidates[random.randi_range(0, candidates.size() - 1)])
		remaining -= chosen_tier
	return selected


static func label(edition: String) -> String:
	return str(NAMES.get(edition, edition))


static func description(edition: String) -> String:
	return str(DESCRIPTIONS.get(edition, ""))


static func tooltip_title(edition: String) -> String:
	return "%s(%s)" % [label(edition), "★".repeat(int(SCORES.get(edition, 0)))]
