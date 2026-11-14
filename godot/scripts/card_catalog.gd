extends RefCounted
class_name PortCardCatalog

const CardStickers = preload("res://scripts/stickers.gd")
const DeckEditions = preload("res://scripts/deck_editions.gd")

const DECK_NAME_SYLLABLES: Array[String] = [
	"아", "에", "이", "오", "우", "야", "예", "요", "유",
	"라", "레", "리", "로", "루", "르", "란", "렌", "린", "론", "룬",
	"카", "케", "키", "코", "쿠", "크", "칸", "켄", "킨", "콘", "쿤",
	"타", "테", "티", "토", "투", "트", "탄", "텐", "틴", "톤", "툰",
	"파", "페", "피", "포", "푸", "프", "판", "펜", "핀", "폰", "푼",
	"사", "세", "시", "소", "수", "스", "산", "센", "신", "손", "순",
	"자", "제", "지", "조", "주", "즈", "잔", "젠", "진", "존", "준",
	"나", "네", "니", "노", "누", "느", "난", "넨", "닌", "논", "눈",
	"마", "메", "미", "모", "무", "므", "만", "멘", "민", "몬", "문",
	"바", "베", "비", "보", "부", "브", "반", "벤", "빈", "본", "분",
	"다", "데", "디", "도", "두", "드", "단", "덴", "딘", "돈", "둔",
	"하", "헤", "히", "호", "후", "흐", "한", "헨", "힌", "혼", "훈",
	"엘", "알", "일", "올", "울", "벨", "델", "셀", "젤", "첼", "켈", "텔", "펠", "헬",
]

const STARTER_CARDS: Array[Dictionary] = [
	{
		"name": "타격",
		"kind": "strike",
		"effect": "strike", "use_mode": "targeted",
		"rarity": "starter",
		"cost": 1,
		"value": 6,
		"description": "피해를 6 줍니다.",
	},
	{
		"name": "방어",
		"kind": "skill",
		"effect": "defend", "use_mode": "untargeted",
		"rarity": "starter",
		"cost": 1,
		"value": 5,
		"description": "방어를 5 얻습니다.",
	},
]

const BASIC_CARDS: Array[Dictionary] = [
	{
		"name": "몸 사리기", "kind": "skill", "effect": "defend", "use_mode": "untargeted", "rarity": "basic",
		"cost": 1, "value": 8, "discard_cost": 1,
		"description": "버리기 1.\n방어를 8 얻습니다.",
	},
	{
		"name": "잽", "kind": "strike", "effect": "strike", "use_mode": "targeted", "rarity": "basic",
		"cost": 0, "value": 6, "description": "피해를 6 줍니다.",
	},
	{
		"name": "자와 컴퍼스", "kind": "strike", "effect": "ruler_compass", "use_mode": "targeted", "rarity": "basic",
		"cost": 1, "value": 6, "description": "피해를 6 줍니다.\n★을 얻습니다.",
	},
	{
		"name": "기회 포착", "kind": "strike", "effect": "strike", "use_mode": "targeted", "rarity": "basic",
		"cost": 1, "value": 9, "discard_pile_top": true,
		"description": "피해를 9 줍니다.\n파일 하나의 맨 위 카드를 버립니다.",
	},
	{
		"name": "돌진", "kind": "strike", "effect": "strike", "use_mode": "targeted", "rarity": "basic",
		"cost": 2, "value": 15, "discard_cost": 1,
		"description": "버리기 1.\n피해를 15 줍니다.",
	},
	{
		"name": "기회 창출", "kind": "skill", "effect": "deflect", "use_mode": "untargeted", "rarity": "basic",
		"cost": 1, "value": 5, "discard_pile_top": true,
		"description": "방어를 5 얻습니다.\n파일 하나의 맨 위 카드를 버립니다.",
	},
	{
		"name": "별의 장막", "kind": "skill", "effect": "star_guard", "use_mode": "untargeted", "rarity": "basic",
		"cost": 2, "value": 10,
		"description": "방어를 10 얻습니다.\n★을 얻습니다.",
	},
	{
		"name": "전투 교본", "kind": "skill", "effect": "combat_manual", "use_mode": "unplayable", "rarity": "basic",
		"value": 2, "playable": false,
		"description": "사용 불가. 손패에 있는 동안 힘과 강인함을 2 얻습니다.",
	},
]

# Legacy special cards remain excluded from normal rewards and generated pools.
const LEGACY_SPECIAL_CARDS: Array[Dictionary] = [
	{
		"name": "무쇠 난동",
		"kind": "strike",
		"effect": "iron_rampage", "use_mode": "untargeted",
		"rarity": "special",
		"cost": 2,
		"value": 8,
		"draw": 0,
		"damage_type": "physical",
		"playable": true,
		"description": "모든 적에게 피해를 8 줍니다.\n방어를 8 얻습니다.",
	},
]

const SPECIAL_CARDS: Array[Dictionary] = [
	{"name": "빛무리", "kind": "skill", "effect": "light_cluster", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 1, "playable": true, "description": "광채 1장을 얻습니다."},
	{"name": "기합", "kind": "skill", "effect": "battle_cry", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 2, "playable": true, "description": "증폭을 2 얻습니다."},
	{"name": "파쇄", "kind": "strike", "effect": "shatter", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 6, "playable": true, "description": "피해를 6 줍니다. 적에게 취약을 2 부여합니다."},
	{"name": "무릎차기", "kind": "strike", "effect": "knee_strike", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 10, "playable": true, "description": "피해를 10 줍니다. 적에게 약화를 1 부여합니다."},
	{"name": "가호", "kind": "skill", "effect": "resistance_ward", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 2, "playable": true, "description": "저항을 2 얻습니다."},
	{"name": "싸움 준비", "kind": "skill", "effect": "battle_preparation", "use_mode": "untargeted", "rarity": "special", "cost": 2, "value": 2, "playable": true, "description": "다음 턴 시작 시 에너지와 증폭을 2 얻습니다."},
	{"name": "위압", "kind": "skill", "effect": "scale_armor", "use_mode": "targeted", "rarity": "special", "cost": 2, "value": 8, "playable": true, "description": "방어를 8 얻습니다. 적에게 약화를 2 부여합니다."},
	{"name": "야수화", "kind": "skill", "effect": "beastification", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 3, "upgraded_value": 6, "exhaust": true, "playable": true, "forge_target_name": "소멸 카드", "description": "힘을 3[6] 얻습니다.\n소멸.\n재련: [소멸 카드]"},
	{"name": "금속화", "kind": "skill", "effect": "metalization", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 2, "upgraded_value": 4, "exhaust": true, "playable": true, "forge_target_name": "사용 불가 카드", "description": "강인함을 2[4] 얻습니다.\n소멸.\n재련: [사용 불가 카드]"},
	{"name": "모래 뿌리기", "kind": "skill", "effect": "sand_toss", "use_mode": "targeted", "rarity": "special", "cost": 0, "value": 2, "playable": true, "description": "선택한 적에게 약화를 2 부여합니다."},
	{"name": "새옹지마", "kind": "skill", "effect": "saeongjima", "use_mode": "unplayable", "rarity": "special", "value": 2, "draw": 2, "playable": false, "description": "사용 불가. 버리기 X 효과로 버려지면 카드를 무작위로 2장 뽑습니다."},
	{"name": "철의 노래", "kind": "skill", "effect": "iron_song", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 5, "playable": true, "description": "방어를 5 얻습니다.\n내 다음 턴과 다다음 턴 시작 시 반복합니다."},
	{"name": "광자포", "kind": "strike", "effect": "photon_cannon", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 12, "playable": true, "description": "피해를 12 줍니다. 내 증폭이 4 이상이면 대신 8씩 3번 줍니다."},
	{"name": "과충전", "kind": "skill", "effect": "overcharge", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 0, "exhaust": true, "rule": true, "playable": true, "description": "내 증폭이 4 이상일 때, 카드 2장을 뽑습니다. (턴당 1회 발동)"},
	{"name": "AT 필드", "kind": "skill", "effect": "at_field", "use_mode": "untargeted", "rarity": "special", "cost": 2, "value": 13, "amplification_gain": 2, "playable": true, "description": "방어를 13 얻습니다. 증폭을 2 얻습니다."},
	{"name": "재활용", "kind": "skill", "effect": "recycling", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "내 턴 동안 카드를 버릴 때마다 ★를 얻습니다."},
	{"name": "별의 샘", "kind": "skill", "effect": "osiris_sun", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "턴 시작 시 ★를 얻습니다."},
	{"name": "백스텝", "kind": "skill", "effect": "defend", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 5, "playable": true, "description": "방어를 5 얻습니다."},
	{"name": "정리 타격", "kind": "strike", "effect": "boomerang", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 9, "draw": 1, "discard_pile_top": true, "playable": true, "description": "피해를 9 줍니다. 파일 하나의 맨 위 카드를 버립니다. 카드를 1장 뽑습니다."},
	{"name": "낡은 노심", "kind": "skill", "effect": "plate_armor", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 1, "upgraded_value": 3, "forge_cost": 3, "playable": true, "description": "에너지를 1[3] 얻습니다."},
	{"name": "판금 갑옷", "kind": "skill", "effect": "plate_armor_defense", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 5, "resistance_gain": 1, "upgraded_resistance_gain": 2, "forge_cost": 3, "playable": true, "description": "방어를 5 얻습니다. 저항을 1[2] 얻습니다."},
	{"name": "청동 철퇴", "kind": "strike", "effect": "double_hit", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 12, "forge_costs": [2, 3], "playable": true, "description": "피해를 12씩 1[2]번 줍니다.\n재련: [2 또는 3코스트]"},
	{"name": "휩쓸기", "kind": "skill", "effect": "sweep", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 6, "playable": true, "description": "모든 적에게 피해를 6 줍니다."},
	{"name": "재주넘기", "kind": "skill", "effect": "star_guard", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 9, "playable": true, "description": "방어를 9 얻습니다. ★을 얻습니다."},
	{"name": "돌파구", "kind": "strike", "effect": "ruler_compass", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 9, "draw": 1, "playable": true, "description": "피해를 9 줍니다.\n★을 얻습니다.\n카드를 1장 뽑습니다."},
	{"name": "전략가", "kind": "skill", "effect": "battle_plan", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 2, "draw": 1, "playable": true, "description": "★★을 얻습니다.\n카드를 1장 뽑습니다."},
	{"name": "과감한 결단", "kind": "skill", "effect": "pruning", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 2, "discard_cost": 1, "discard_energy_gain": 2, "playable": true, "description": "버리기 1. 에너지를 2 얻습니다."},
	{"name": "과감한 돌진", "kind": "strike", "effect": "strike", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 15, "discard_cost": 1, "playable": true, "description": "버리기 1. 피해를 15 줍니다."},
	{"name": "과감한 회피", "kind": "skill", "effect": "defend", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 13, "discard_cost": 2, "playable": true, "description": "버리기 2. 방어를 13 얻습니다."},
	{"name": "묵직한 한 방", "kind": "strike", "effect": "strike", "use_mode": "targeted", "rarity": "special", "cost": 3, "value": 30, "playable": true, "description": "피해를 30 줍니다."},
	{"name": "얼음 방패", "kind": "skill", "effect": "ice_shield", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 11, "damage_type": "magic", "playable": true, "description": "마법 방어를 11 얻습니다."},
	{"name": "대형 프리즘", "kind": "skill", "effect": "large_prism", "use_mode": "untargeted", "rarity": "special", "cost": 3, "value": 3, "playable": true, "description": "광채 3장을 얻습니다."},
	{"name": "성운", "kind": "skill", "effect": "nebula", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 2, "playable": true, "description": "광채 1장을 가져옵니다.\n★★를 얻습니다."},
	{"name": "별빛", "kind": "skill", "effect": "starlight", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 2, "playable": true, "description": "★★을 얻습니다."},
	{"name": "준비 운동", "kind": "skill", "effect": "warm_up", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 4, "playable": true, "description": "힘을 1 얻습니다. 이번 턴 힘을 4 추가로 얻습니다."},
	{"name": "퀵스텝", "kind": "skill", "effect": "quick_step", "use_mode": "untargeted", "rarity": "special", "cost": 1, "draw": 2, "playable": true, "description": "카드를 2장 뽑습니다."},
	{"name": "5연격", "kind": "strike", "effect": "five_hit", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 2, "playable": true, "description": "피해를 2씩 5번 줍니다."},
	{"name": "별의 방주", "kind": "skill", "effect": "star_ark", "use_mode": "untargeted", "rarity": "special", "cost": 3, "value": 10, "playable": true, "description": "방어와 마법 방어를 10 얻습니다. ★을 얻습니다."},
	{"name": "은검", "kind": "strike", "effect": "silver_sword", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 12, "playable": true, "description": "피해를 12 줍니다. 마법 방어를 5 얻습니다."},
	{"name": "진압", "kind": "strike", "effect": "suppression", "use_mode": "targeted", "rarity": "special", "cost": 3, "value": 13, "playable": true, "description": "피해를 13 줍니다. 준 피해만큼 방어를 얻습니다."},
	{"name": "사서의 특권", "kind": "skill", "effect": "librarians_privilege", "use_mode": "untargeted", "rarity": "special", "cost": 2, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "룰. 턴 시작 시 원하는 파일에서 카드를 1장 뽑습니다."},
	{"name": "금속학 연구", "kind": "skill", "effect": "metallurgy_research", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "룰. 재련한 카드를 손패로 가져옵니다."},
	{"name": "질주", "kind": "skill", "effect": "dash", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 0, "forge_cost": 3, "playable": true, "description": "카드를 무작위로 2[3]장 뽑습니다.\n재련: [3코스트]"},
	{"name": "치환 합금", "kind": "strike", "effect": "exchange", "use_mode": "targeted", "rarity": "special", "cost": 3, "value": 15, "forge_any": true, "playable": true, "description": "피해를 15 줍니다.\n재련: [아무거나]"},
	{"name": "늑대 부적", "kind": "skill", "effect": "wolf_talisman", "use_mode": "unplayable", "rarity": "special", "value": 1, "playable": false, "description": "전투 덱에 있는 동안 힘을 1 얻습니다.\n사용 불가."},
	{"name": "거북이 부적", "kind": "skill", "effect": "turtle_talisman", "use_mode": "unplayable", "rarity": "special", "value": 1, "playable": false, "description": "전투 덱에 있는 동안 강인함을 1 얻습니다.\n사용 불가."},
]

const RARE_CARDS: Array[Dictionary] = [
	{"name": "사계절", "kind": "skill", "effect": "four_seasons", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 2, "exhaust": true, "playable": true, "description": "저항과 증폭을 2 얻습니다. 적에게 취약과 약화를 2 부여합니다.\n소멸."},
	{"name": "불굴", "kind": "skill", "effect": "unyielding", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "value": 5, "exhaust": true, "playable": true, "description": "저항을 5 얻습니다.\n소멸."},
	{"name": "개박살", "kind": "strike", "effect": "demolish", "use_mode": "targeted", "rarity": "rare", "cost": 3, "value": 25, "playable": true, "description": "피해를 25 줍니다. 적에게 취약과 약화를 3 부여합니다."},
	{"name": "아드레날린", "kind": "skill", "effect": "adrenaline", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "value": 2, "draw": 2, "exhaust": true, "playable": true, "description": "체력을 3 잃습니다. 에너지를 2 얻고 카드를 2장 뽑습니다.\n소멸."},
	{"name": "예지", "kind": "skill", "effect": "foresight", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "draw": 2, "playable": true, "description": "다음 턴 시작 시 카드를 2장 뽑습니다."},
	{"name": "초월", "kind": "skill", "effect": "transcend", "use_mode": "untargeted", "rarity": "rare", "cost": 4, "value": 2, "exhaust": true, "playable": true, "description": "무적을 2 얻습니다.\n소멸."},
	{"name": "강철의 폭풍", "kind": "skill", "effect": "steel_storm", "use_mode": "untargeted", "rarity": "rare", "cost": 3, "value": 12, "exhaust": true, "rule": true, "playable": true, "description": "방어를 12 얻습니다.\n턴 종료 시 모든 적에게 현재 방어만큼 피해를 줍니다."},
	{"name": "평행 거울", "kind": "skill", "effect": "parallel_mirror", "use_mode": "untargeted", "rarity": "rare", "cost": 3, "exhaust": true, "playable": true, "description": "내 손에 있는 광채를 전부 복사해서 가져옵니다.\n소멸."},
	{"name": "임계 반응", "kind": "skill", "effect": "critical_reaction", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "exhaust": true, "rule": true, "playable": true, "description": "내 증폭이 8 이상일 때, 에너지 2를 얻습니다. (턴당 1회 발동)"},
	{"name": "견고한 태세", "kind": "skill", "effect": "sturdy_stance", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 15, "exhaust": true, "rule": true, "playable": true, "description": "방어를 15 얻습니다.\n턴 종료 시 방어를 절반 보존합니다."},
	{"name": "흑요석 단검", "kind": "strike", "effect": "obsidian_dagger", "use_mode": "targeted", "rarity": "rare", "cost": 2, "value": 1, "playable": true, "description": "피해를 1 줍니다.\n[밑패를 소멸시키고 피해량을 이 카드에 추가합니다.]"},
	{"name": "DIY", "kind": "skill", "effect": "diy", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "playable": true, "description": "이 카드는 스티커를 3개까지 붙일 수 있습니다. (중복 불가)"},
	{"name": "초신성", "kind": "skill", "effect": "supernova", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "value": 3, "exhaust": true, "playable": true, "description": "★★★를 잃고 에너지를 3 얻습니다.\n소멸."},
	{"name": "책 펼치기", "kind": "skill", "effect": "draw_each_file", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "playable": true, "description": "각 파일에서 카드를 1장씩 뽑습니다."},
	{"name": "대전략가", "kind": "skill", "effect": "super_strategist", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "value": 3, "draw": 2, "exhaust": true, "playable": true, "description": "★★★을 얻습니다.\n카드를 2장 뽑습니다.\n소멸."},
	{"name": "소원", "kind": "skill", "effect": "wish", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "value": 3, "exhaust": true, "playable": true, "description": "무작위 희귀 카드 3장을 가져옵니다. 그 카드들에 토큰 속성을 부여합니다.\n소멸."},
	{"name": "연사", "kind": "skill", "effect": "rapid_fire", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "exhaust": true, "playable": true, "description": "다음 공격 카드가 2회 발동합니다.\n소멸."},
	{"name": "광행시간", "kind": "skill", "effect": "light_travel_time", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "value": 3, "playable": true, "description": "다다음 턴 시작 시 광채 3장을 얻습니다."},
	{"name": "오딘의 창", "kind": "strike", "effect": "odin_spear", "use_mode": "untargeted", "rarity": "rare", "cost": 6, "value": 40, "defense_value": 15, "all_targets": true, "playable": true, "description": "모든 적에게 피해를 40 줍니다. 방어를 15 얻습니다. 다른 카드를 재련할 때마다 비용이 1 감소합니다."},
	{"name": "병법서", "kind": "skill", "effect": "strategy_book", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 4, "exhaust": true, "playable": true, "description": "힘과 강인함을 4 얻습니다.\n이 효과는 손패에 있는 동안에도 적용됩니다.\n소멸."},
	{"name": "진화론", "kind": "skill", "effect": "evolution_theory", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "힘과 강인함을 1 얻습니다.\n룰. 내 턴 시작 시 반복합니다."},
	{"name": "유성우", "kind": "strike", "effect": "meteor", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 9, "playable": true, "description": "★를 모두 소모해, 무작위 적에게 별 하나당 피해를 9 줍니다."},
	{"name": "대분배", "kind": "skill", "effect": "mass_deal", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "exhaust": true, "rule": true, "playable": true, "description": "빈 파일을 하나 만듭니다.\n룰. 카드를 섞을 때마다 파일에 카드를 최대한 고르게 나눕니다."},
	{"name": "법학 연구", "kind": "skill", "effect": "law_research", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "룰. 내 룰 카드의 비용이 1 감소합니다."},
	{"name": "경제학 연구", "kind": "skill", "effect": "economics_research", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 3, "exhaust": true, "rule": true, "playable": true, "description": "룰. 에너지가 -3이 될 때까지 카드를 사용할 수 있습니다. 이 효과는 중첩됩니다."},
	{"name": "광학 연구", "kind": "skill", "effect": "optics_research", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "룰. 턴 시작 시 광채 1장을 얻습니다."},
]

const LEGENDARY_CARDS: Array[Dictionary] = [
	{"name": "호롤로지움", "kind": "skill", "effect": "horologium", "use_mode": "untargeted", "rarity": "legendary", "cost": 0, "value": 1, "exhaust": true, "playable": true, "description": "내 턴을 한 번 더 진행합니다.\n소멸."},
	{"name": "오피쿠우스", "kind": "skill", "effect": "ophiuchus", "use_mode": "untargeted", "rarity": "legendary", "cost": 1, "value": 5, "exhaust": true, "playable": true, "description": "체력을 5 회복합니다.\n소멸."},
	{"name": "아리에스", "kind": "skill", "effect": "aries", "use_mode": "untargeted", "rarity": "legendary", "cost": 0, "value": 5, "exhaust": true, "playable": true, "description": "에너지를 5 얻습니다.\n★★★★★을 얻습니다.\n소멸."},
	{"name": "히드라", "kind": "strike", "effect": "hydra", "use_mode": "untargeted", "rarity": "legendary", "cost": 2, "value": 9, "playable": true, "description": "무작위 적에게 피해를 9씩 9번 줍니다."},
	{"name": "오리온", "kind": "skill", "effect": "orion", "use_mode": "untargeted", "rarity": "legendary", "cost": 1, "value": 10, "exhaust": true, "playable": true, "description": "힘을 10 얻습니다.\n소멸."},
	{"name": "카시오페이아", "kind": "skill", "effect": "cassiopeia", "use_mode": "untargeted", "rarity": "legendary", "cost": -3, "value": 0, "playable": true, "description": "에너지를 3 얻습니다."},
]


static func create_starter_deck() -> Array[Dictionary]:
	var deck: Array[Dictionary] = []
	for blueprint in STARTER_CARDS:
		deck.append(_make_card(blueprint, deck.size() + 1))
	for blueprint in BASIC_CARDS:
		deck.append(_make_card(blueprint, deck.size() + 1))
	for blueprint in STARTER_CARDS:
		for copy_index in range(5):
			deck.append(_make_card(blueprint, deck.size() + 1))
	return deck


static func create_reward_cards(first_id: int, random: RandomNumberGenerator, force_rare: bool = false,
		rare_chance: float = 0.05) -> Array[Dictionary]:
	var rewards: Array[Dictionary] = []
	var reward_count := 2 if force_rare else 1
	for reward_index in range(reward_count):
		var blueprint: Dictionary
		if force_rare or random.randf() < rare_chance:
			blueprint = RARE_CARDS[random.randi_range(0, RARE_CARDS.size() - 1)]
		elif random.randf() < 0.3 / 0.95:
			blueprint = BASIC_CARDS[random.randi_range(0, BASIC_CARDS.size() - 1)]
		else:
			blueprint = SPECIAL_CARDS[random.randi_range(0, SPECIAL_CARDS.size() - 1)]
		var reward := _make_card(blueprint, first_id + reward_index)
		rewards.append(CardStickers.with_random_sticker(reward, 1.0 if force_rare else 0.3, random))
	return rewards


static func create_region_deck(region_number: int, first_id: int, random: RandomNumberGenerator, sticker_chance: float = 0.02) -> Dictionary:
	var k := maxi(1, region_number)
	var deck_sum := random.randi_range(1, 3) + random.randi_range(1, 3) + random.randi_range(1, 3) - 6
	var candidates: Array[Dictionary] = []
	var total_weight := 0.0
	var distance_scale := sqrt(1.0 + 0.2 * float(k - 1))
	for x in range(-k - 1, deck_sum + 2 * k + 1):
		for y in range(-k, deck_sum - x + k + 1):
			var z := deck_sum - x - y
			var capacity := 20 + 5 * (k + x)
			var rare_slot_capacity := k + y
			if rare_slot_capacity > capacity:
				continue
			var distance := sqrt(float(x * x + y * y + z * z))
			var weight := pow(1.75, -distance / distance_scale)
			candidates.append({"x": x, "y": y, "z": z, "capacity": capacity,
				"rare_slot_capacity": rare_slot_capacity, "weight": weight})
			total_weight += weight
	var cursor := random.randf() * total_weight
	var shape: Dictionary = candidates.back() if not candidates.is_empty() else {
		"x": 0, "y": 0, "z": 0, "capacity": 20 + 5 * k, "rare_slot_capacity": k, "weight": 1.0,
	}
	for candidate in candidates:
		cursor -= float(candidate["weight"])
		if cursor < 0.0:
			shape = candidate
			break
	var rare_slot_capacity := int(shape["rare_slot_capacity"])
	var rare_count := 0
	for _slot in range(rare_slot_capacity):
		if random.randf() < 0.8:
			rare_count += 1
	var cards: Array[Dictionary] = []
	var next_id := first_id
	var rare_bag := RARE_CARDS.duplicate()
	for _rare_index in range(rare_count):
		if rare_bag.is_empty():
			rare_bag = RARE_CARDS.duplicate()
		var rare_index := random.randi_range(0, rare_bag.size() - 1)
		var rare_blueprint: Dictionary = rare_bag.pop_at(rare_index)
		var rare_card := _make_card(rare_blueprint, next_id)
		next_id += 1
		cards.append(rare_card)
	var edition_budget := 10 * (k + int(shape["z"]))
	var editions := DeckEditions.roll(edition_budget, random)
	for _slot in range(maxi(0, int(shape["capacity"]) - rare_slot_capacity)):
		var filler_kind := random.randi_range(0, 3)
		if filler_kind == 0:
			continue
		var pool: Array = STARTER_CARDS if filler_kind == 1 else BASIC_CARDS if filler_kind == 2 else SPECIAL_CARDS
		var blueprint: Dictionary = pool[random.randi_range(0, pool.size() - 1)]
		var card := _make_card(blueprint, next_id)
		next_id += 1
		cards.append(card)
	if sticker_chance > 0.0:
		for card_index in range(cards.size()):
			cards[card_index] = CardStickers.with_random_sticker(cards[card_index], sticker_chance, random)
	return {
		"deck": {
			"id": "found-r%d-%d" % [k, first_id],
			"name": _create_deck_name(int(shape["capacity"]), random),
			"capacity": int(shape["capacity"]),
			"rare_slot_capacity": rare_slot_capacity,
			"cards": cards,
			"editions": editions,
			"generation": {"k": k, "s": deck_sum, "x": int(shape["x"]), "y": int(shape["y"]), "z": int(shape["z"])},
		},
		"next_card_id": next_id,
	}


static func _create_deck_name(capacity: int, random: RandomNumberGenerator) -> String:
	var syllable_count := clampi(roundi(float(capacity) / 10.0) + random.randi_range(-1, 1), 2, 12)
	var space_after := -1
	if syllable_count > 2 and random.randf() < 0.3:
		space_after = random.randi_range(1, syllable_count - 1)
	var deck_name := ""
	for index in range(syllable_count):
		deck_name += DECK_NAME_SYLLABLES[random.randi_range(0, DECK_NAME_SYLLABLES.size() - 1)]
		if index + 1 == space_after:
			deck_name += " "
	return deck_name


static func create_rock_card(card_id: int) -> Dictionary:
	return {
		"id": card_id,
		"name": "돌",
		"kind": "skill",
		"effect": "rock", "use_mode": "unplayable",
		"rarity": "status",
		"value": 0,
		"playable": false,
		"token": true,
		"enemy_token": true,
		"revealed": false,
		"description": "사용 불가 카드입니다.",
	}


static func create_soil_card(card_id: int) -> Dictionary:
	return {
		"id": card_id,
		"name": "흙",
		"kind": "skill",
		"effect": "soil", "use_mode": "unplayable",
		"rarity": "status",
		"value": 0,
		"playable": false,
		"token": true,
		"enemy_token": true,
		"revealed": false,
		"description": "사용 불가 카드입니다.",
	}


static func create_toxic_slime_card(card_id: int) -> Dictionary:
	return {
		"id": card_id,
		"name": "유독성 점액",
		"kind": "skill",
		"effect": "slime", "use_mode": "unplayable",
		"rarity": "status",
		"value": 1,
		"playable": false,
		"token": true,
		"enemy_token": true,
		"revealed": true,
		"description": "턴 종료 시 손패에 있다면 물리 피해를 12 받습니다.\n사용 불가.",
	}


static func create_fermented_slime_card(card_id: int) -> Dictionary:
	return {
		"id": card_id,
		"name": "발효 점액",
		"kind": "skill",
		"effect": "fermented_slime", "use_mode": "untargeted",
		"rarity": "status",
		"cost": 0,
		"value": 1,
		"playable": true,
		"token": true,
		"enemy_token": true,
		"retain": true,
		"revealed": true,
		"description": "에너지를 1 얻습니다. 보존.",
	}


static func create_relic_card(card_id: int) -> Dictionary:
	return {
		"id": card_id,
		"name": "유물",
		"kind": "skill",
		"effect": "relic", "use_mode": "untargeted",
		"rarity": "status",
		"cost": 0,
		"value": 4,
		"playable": true,
		"token": true,
		"enemy_token": true,
		"revealed": true,
		"description": "도깨비의 힘을 4 감소시킵니다.",
	}


static func create_radiance_card(card_id: int) -> Dictionary:
	return {
		"id": card_id,
		"name": "광채",
		"kind": "strike",
		"effect": "radiance", "use_mode": "targeted",
		"rarity": "status",
		"cost": 0,
		"value": 4,
		"playable": true,
		"token": true,
		"revealed": true,
		"description": "피해를 4 줍니다.",
	}


static func create_random_rare_token(card_id: int, random: RandomNumberGenerator) -> Dictionary:
	var card: Dictionary = RARE_CARDS[random.randi_range(0, RARE_CARDS.size() - 1)].duplicate(true)
	card["id"] = card_id
	card["revealed"] = true
	card["token"] = true
	return card


static func create_adrenaline_card(card_id: int) -> Dictionary:
	for blueprint in RARE_CARDS:
		if str(blueprint.get("effect", "")) == "adrenaline":
			return _make_card(blueprint, card_id)
	return {}


static func _make_card(blueprint: Dictionary, card_id: int) -> Dictionary:
	var card: Dictionary = blueprint.duplicate(true)
	card["id"] = card_id
	card["revealed"] = false
	return card
