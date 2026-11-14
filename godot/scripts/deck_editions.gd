extends RefCounted
class_name PortDeckEditions

const IDS: Array[String] = [
	"clever", "roomy", "lively", "fantastic", "rampaging", "quickHammer",
	"drawPlus", "starPlus", "energyPlus", "persistentDraw", "frugalPlus",
	"defensiveStance", "resistance", "giant", "whiteSpace", "invincible",
	"hammering", "deckHighlander", "starFive", "energyThree", "starThree",
]

const SCORES := {
	"clever": 10, "roomy": 5, "lively": 50, "fantastic": 60, "rampaging": 50,
	"quickHammer": 10, "drawPlus": 5, "starPlus": 5, "energyPlus": 10,
	"persistentDraw": 40, "frugalPlus": 40, "defensiveStance": 5,
	"resistance": 30, "giant": 50, "whiteSpace": 30, "invincible": 100,
	"hammering": 30, "deckHighlander": 30, "starFive": 40, "energyThree": 40,
	"starThree": 20,
}

const NAMES := {
	"clever": "별++", "roomy": "추가 파일", "lively": "아드레날린", "fantastic": "압축",
	"rampaging": "지속 에너지", "quickHammer": "빠른 망치", "drawPlus": "드로우+",
	"starPlus": "별+", "energyPlus": "에너지+", "persistentDraw": "지속 드로우",
	"frugalPlus": "재활용+", "defensiveStance": "방호 태세", "resistance": "저항",
	"giant": "거인", "whiteSpace": "여백의 미", "invincible": "무적",
	"hammering": "망치질", "deckHighlander": "하이랜더", "starFive": "별+++++",
	"energyThree": "에너지+++", "starThree": "별+++",
}

const DESCRIPTIONS := {
	"clever": "전투 시작 시 ★ 2개를 획득합니다.",
	"roomy": "전투 시작 시 빈 파일을 1개 추가합니다.",
	"lively": "전투 시작 시 아드레날린 카드를 1장 획득합니다.",
	"fantastic": "파일을 4장씩 쌓습니다.",
	"rampaging": "최대 에너지가 1 증가합니다.",
	"quickHammer": "전투 시작 시 덱의 재련 가능한 무작위 카드 1장을 재련합니다. 치환 합금과 흑요석 단검은 제외합니다.",
	"drawPlus": "전투 시작 시 무작위 파일에서 카드 1장을 뽑습니다.",
	"starPlus": "전투 시작 시 ★ 1개를 획득합니다.",
	"energyPlus": "전투 시작 시 에너지가 1 증가합니다.",
	"persistentDraw": "매 턴 시작 시 무작위 파일에서 카드 1장을 뽑습니다.",
	"frugalPlus": "턴 종료 시 남은 에너지 1당 ★ 2개를 획득합니다.",
	"defensiveStance": "전투 시작 시 방어도 5를 획득합니다.",
	"resistance": "전투 시작 시 저항 2를 획득합니다.",
	"giant": "전투 시작 시 힘 3과 강인함 3을 획득합니다.",
	"whiteSpace": "현재 빈 파일 하나당 힘 2를 획득합니다.",
	"invincible": "전투 시작 시 무적 1을 획득합니다.",
	"hammering": "카드를 재련할 때마다 ★ 1개를 획득합니다.",
	"deckHighlander": "전투 시작 시 중복 카드 없이 덱이 가득 차 있으면 최대 에너지가 1 증가합니다.",
	"starFive": "전투 시작 시 ★ 5개를 획득합니다.",
	"energyThree": "전투 시작 시 에너지가 3 증가합니다.",
	"starThree": "전투 시작 시 ★ 3개를 획득합니다.",
}


static func roll(budget: int, random: RandomNumberGenerator) -> Array[String]:
	var selected: Array[String] = []
	var remaining := budget
	while remaining >= 0:
		var available: Array[String] = []
		for edition in IDS:
			if not selected.has(edition) and int(SCORES[edition]) <= remaining:
				available.append(edition)
		if available.is_empty():
			break
		var total_weight := 0.0
		for edition in available:
			total_weight += pow(float(SCORES[edition]), 1.2)
		var cursor := random.randf() * total_weight
		var chosen: String = str(available.back())
		for edition in available:
			cursor -= pow(float(SCORES[edition]), 1.2)
			if cursor < 0.0:
				chosen = edition
				break
		selected.append(chosen)
		remaining -= int(SCORES[chosen])
	return selected


static func label(edition: String) -> String:
	return str(NAMES.get(edition, edition))


static func description(edition: String) -> String:
	return str(DESCRIPTIONS.get(edition, ""))
