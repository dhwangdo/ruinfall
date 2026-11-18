extends RefCounted
class_name PortCardCatalog

const GenerationModel = preload("res://scripts/deck_generation_model.gd")

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
		"description": "피해를 9 줍니다.\n파일에서 카드를 1장 버립니다.",
	},
	{
		"name": "돌진", "kind": "strike", "effect": "strike", "use_mode": "targeted", "rarity": "basic",
		"cost": 2, "value": 15, "discard_cost": 1,
		"description": "버리기 1.\n피해를 15 줍니다.",
	},
	{
		"name": "기회 창출", "kind": "skill", "effect": "deflect", "use_mode": "untargeted", "rarity": "basic",
		"cost": 1, "value": 5, "discard_pile_top": true,
		"description": "방어를 5 얻습니다.\n파일에서 카드를 1장 버립니다.",
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
	{"name": "빈틈 메우기", "kind": "skill", "effect": "patch_gap", "use_mode": "untargeted", "rarity": "basic", "cost": 1, "remove_player_debuffs": {"vulnerable": 2}, "description": "나에게 걸린 취약을 2만큼 제거합니다."},
	{"name": "날 세우기", "kind": "skill", "effect": "sharpen_edge", "use_mode": "untargeted", "rarity": "basic", "cost": 1, "remove_player_debuffs": {"weak": 2}, "description": "나에게 걸린 약화를 2만큼 제거합니다."},
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
	{"name": "돌격!!", "kind": "strike", "effect": "strike", "use_mode": "targeted", "rarity": "special", "cost": 0, "value": 12, "self_debuffs": {"vulnerable": 1}, "description": "피해를 12 줍니다.\n취약을 1 얻습니다."},
	{"name": "광학 연구", "kind": "skill", "effect": "optics_research", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "룰. 턴 시작 시 광채 1장을 얻습니다."},
	{"name": "빛무리", "kind": "skill", "effect": "light_cluster", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 1, "playable": true, "description": "광채 1장을 얻습니다."},
	{"name": "파쇄", "kind": "strike", "effect": "shatter", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 6, "playable": true, "description": "피해를 6 줍니다. 취약을 1 부여합니다."},
	{"name": "무릎차기", "kind": "strike", "effect": "knee_strike", "use_mode": "targeted", "rarity": "special", "cost": 2, "value": 12, "playable": true, "description": "피해를 12 줍니다. 약화를 1 부여합니다."},
	{"name": "위압", "kind": "skill", "effect": "scale_armor", "use_mode": "targeted", "rarity": "special", "cost": 2, "value": 8, "playable": true, "description": "방어를 8 얻습니다. 약화를 1 부여합니다."},
	{"name": "야수화", "kind": "skill", "effect": "beastification", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 3, "upgraded_value": 6, "exhaust": true, "playable": true, "forge_target_name": "소멸 카드", "description": "힘을 3[6] 얻습니다.\n소멸.\n재련: [소멸 카드]"},
	{"name": "금속화", "kind": "skill", "effect": "metalization", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 2, "upgraded_value": 4, "exhaust": true, "playable": true, "forge_target_name": "사용 불가 카드", "description": "강인함을 2[4] 얻습니다.\n소멸.\n재련: [사용 불가 카드]"},
	{"name": "모래 뿌리기", "kind": "skill", "effect": "sand_toss", "use_mode": "targeted", "rarity": "special", "cost": 0, "value": 1, "discard_cost": 1, "playable": true, "description": "버리기 1.\n약화를 1 부여합니다."},
	{"name": "탁월수", "kind": "skill", "effect": "saeongjima", "use_mode": "unplayable", "rarity": "special", "value": 2, "draw": 2, "playable": false, "description": "사용 불가.\n이 카드가 버려지면 무작위 카드 2장을 뽑습니다."},
	{"name": "철의 노래", "kind": "skill", "effect": "iron_song", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 5, "forge_target_name": "사용 불가 카드", "playable": true, "description": "방어를 5 얻습니다.\n내 다음 턴[과 다다음 턴] 시작 시 반복합니다.\n재련: [사용 불가 카드]"},
	{"name": "별의 샘", "kind": "skill", "effect": "osiris_sun", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "턴 시작 시 ★를 얻습니다."},
	{"name": "백스텝", "kind": "skill", "effect": "defend", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 5, "playable": true, "description": "방어를 5 얻습니다."},
	{"name": "정리 타격", "kind": "strike", "effect": "boomerang", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 9, "draw": 1, "discard_pile_top": true, "playable": true, "description": "피해를 9 줍니다.\n파일에서 카드를 1장 버립니다.\n카드를 1장 뽑습니다."},
	{"name": "낡은 노심", "kind": "skill", "effect": "plate_armor", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 1, "upgraded_value": 3, "forge_cost": 3, "playable": true, "description": "에너지를 1[3] 얻습니다."},
	{"name": "청동 철퇴", "kind": "strike", "effect": "double_hit", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 12, "forge_costs": [2, 3], "playable": true, "description": "피해를 12씩 1[2]번 줍니다.\n재련: [2 또는 3코스트]"},
	{"name": "휩쓸기", "kind": "skill", "effect": "sweep", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 6, "playable": true, "description": "모든 적에게 피해를 6 줍니다."},
	{"name": "재주넘기", "kind": "skill", "effect": "star_guard", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 9, "playable": true, "description": "방어를 9 얻습니다. ★을 얻습니다."},
	{"name": "돌파구", "kind": "strike", "effect": "ruler_compass", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 9, "draw": 1, "playable": true, "description": "피해를 9 줍니다.\n★을 얻습니다.\n카드를 1장 뽑습니다."},
	{"name": "전략가", "kind": "skill", "effect": "battle_plan", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 2, "draw": 1, "playable": true, "description": "★★을 얻습니다.\n카드를 1장 뽑습니다."},
	{"name": "과감한 결단", "kind": "skill", "effect": "pruning", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 2, "discard_cost": 1, "discard_energy_gain": 2, "playable": true, "description": "버리기 1. 에너지를 2 얻습니다."},
	{"name": "과감한 돌진", "kind": "strike", "effect": "strike", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 15, "discard_cost": 1, "playable": true, "description": "버리기 1. 피해를 15 줍니다."},
	{"name": "과감한 회피", "kind": "skill", "effect": "defend", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 15, "discard_cost": 2, "playable": true, "description": "버리기 2. 방어를 15 얻습니다."},
	{"name": "묵직한 한 방", "kind": "strike", "effect": "strike", "use_mode": "targeted", "rarity": "special", "cost": 3, "value": 30, "playable": true, "description": "피해를 30 줍니다."},
	{"name": "대형 프리즘", "kind": "skill", "effect": "large_prism", "use_mode": "untargeted", "rarity": "special", "cost": 3, "value": 3, "playable": true, "description": "광채 3장을 얻습니다."},
	{"name": "성운", "kind": "skill", "effect": "nebula", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 2, "playable": true, "description": "광채 1장을 가져옵니다.\n★★를 얻습니다."},
	{"name": "별빛", "kind": "skill", "effect": "starlight", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 2, "playable": true, "description": "★★을 얻습니다."},
	{"name": "준비 운동", "kind": "skill", "effect": "warm_up", "use_mode": "untargeted", "rarity": "special", "cost": 0, "value": 4, "playable": true, "description": "힘을 5 얻습니다. 턴 종료 시 힘을 4 잃습니다."},
	{"name": "퀵스텝", "kind": "skill", "effect": "quick_step", "use_mode": "untargeted", "rarity": "special", "cost": 1, "draw": 2, "playable": true, "description": "카드를 2장 뽑습니다."},
	{"name": "5연격", "kind": "strike", "effect": "five_hit", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 2, "playable": true, "description": "피해를 2씩 5번 줍니다."},
	{"name": "진압", "kind": "strike", "effect": "suppression", "use_mode": "targeted", "rarity": "special", "cost": 3, "value": 12, "playable": true, "description": "피해를 12 줍니다. 준 피해만큼 방어를 얻습니다."},
	{"name": "사서의 특권", "kind": "skill", "effect": "librarians_privilege", "use_mode": "untargeted", "rarity": "special", "cost": 2, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "룰. 턴 시작 시 원하는 파일에서 카드를 1장 뽑습니다."},
	{"name": "질주", "kind": "skill", "effect": "dash", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 0, "forge_cost": 3, "playable": true, "description": "카드를 무작위로 2[3]장 뽑습니다.\n재련: [3코스트]"},
	{"name": "치환 합금", "kind": "strike", "effect": "exchange", "use_mode": "targeted", "rarity": "special", "cost": 3, "value": 15, "forge_any": true, "playable": true, "description": "피해를 15 줍니다.\n재련: [아무거나]"},
	{"name": "늑대 부적", "kind": "skill", "effect": "wolf_talisman", "use_mode": "unplayable", "rarity": "special", "value": 1, "playable": false, "description": "전투 덱에 있는 동안 힘을 1 얻습니다.\n사용 불가."},
	{"name": "거북이 부적", "kind": "skill", "effect": "turtle_talisman", "use_mode": "unplayable", "rarity": "special", "value": 1, "playable": false, "description": "전투 덱에 있는 동안 강인함을 1 얻습니다.\n사용 불가."},
	{"name": "가호", "kind": "skill", "effect": "blessing", "use_mode": "untargeted", "rarity": "special", "cost": 1, "temporary_magic_resistance": 2, "description": "이번 턴 동안 마법 저항을 2 얻습니다."},
	{"name": "은검", "kind": "strike", "effect": "silver_sword", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 10, "temporary_magic_resistance": 1, "description": "피해를 10 줍니다.\n이번 턴 동안 마법 저항을 1 얻습니다."},
	{"name": "얼음 방패", "kind": "skill", "effect": "ice_shield", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 9, "grants_block": true, "temporary_magic_resistance": 1, "description": "방어를 9 얻습니다.\n이번 턴 동안 마법 저항을 1 얻습니다."},
	{"name": "수호", "kind": "skill", "effect": "safeguard", "use_mode": "untargeted", "rarity": "special", "cost": 2, "value": 10, "grants_block": true, "temporary_magic_resistance": 2, "description": "방어를 10 얻습니다.\n이번 턴 동안 마법 저항을 2 얻습니다."},
	{"name": "평정", "kind": "skill", "effect": "composure", "use_mode": "untargeted", "rarity": "special", "cost": 0, "remove_player_debuffs": {"weak": 1, "vulnerable": 1}, "description": "나에게 걸린 약화와 취약을 1만큼 제거합니다."},
	{"name": "약점 보완", "kind": "skill", "effect": "cover_weakness", "use_mode": "untargeted", "rarity": "special", "cost": 1, "value": 6, "grants_block": true, "remove_player_debuffs": {"vulnerable": 2}, "description": "방어를 6 얻습니다.\n나에게 걸린 취약을 2만큼 제거합니다."},
	{"name": "용맹한 일격", "kind": "strike", "effect": "brave_strike", "use_mode": "targeted", "rarity": "special", "cost": 1, "value": 12, "remove_player_debuffs": {"weak": 3}, "description": "나에게 걸린 약화를 3만큼 제거합니다.\n피해를 12 줍니다."},
]

const RARE_CARDS: Array[Dictionary] = [
	{"name": "이계의 힘", "kind": "skill", "effect": "recycling", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "룰. 카드를 버릴 때마다 힘을 1 얻습니다."},
	{"name": "개박살", "kind": "strike", "effect": "demolish", "use_mode": "targeted", "rarity": "rare", "cost": 3, "value": 20, "playable": true, "description": "피해를 20 줍니다. 취약과 약화를 2 부여합니다."},
	{"name": "아드레날린", "kind": "skill", "effect": "adrenaline", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "value": 2, "draw": 2, "exhaust": true, "playable": true, "description": "체력을 3 잃습니다. 에너지를 2 얻고 카드를 2장 뽑습니다.\n소멸."},
	{"name": "예지", "kind": "skill", "effect": "foresight", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "draw": 2, "playable": true, "description": "다음 턴 시작 시 카드를 2장 뽑습니다."},
	{"name": "초월", "kind": "skill", "effect": "transcend", "use_mode": "untargeted", "rarity": "rare", "cost": 4, "value": 2, "exhaust": true, "playable": true, "description": "무적을 2 얻습니다.\n소멸."},
	{"name": "강철의 폭풍", "kind": "skill", "effect": "steel_storm", "use_mode": "untargeted", "rarity": "rare", "cost": 3, "value": 0, "exhaust": true, "rule": true, "playable": true, "description": "턴 종료 시 모든 적에게 현재 방어만큼 피해를 줍니다."},
	{"name": "평행 거울", "kind": "skill", "effect": "parallel_mirror", "use_mode": "untargeted", "rarity": "rare", "cost": 3, "exhaust": true, "playable": true, "description": "내 손에 있는 광채를 전부 복사해서 가져옵니다.\n소멸."},
	{"name": "견고한 태세", "kind": "skill", "effect": "sturdy_stance", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 0, "exhaust": true, "rule": true, "playable": true, "description": "턴 종료 시 방어를 절반 보존합니다."},
	{"name": "흑요석 단검", "kind": "strike", "effect": "obsidian_dagger", "use_mode": "targeted", "rarity": "rare", "cost": 2, "value": 1, "playable": true, "description": "피해를 1 줍니다.\n[밑패를 소멸시키고 피해량을 이 카드에 추가합니다.]"},
	{"name": "DIY", "kind": "skill", "effect": "diy", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "playable": true, "description": "이 카드는 스티커를 3개까지 붙일 수 있습니다. (중복 불가)"},
	{"name": "초신성", "kind": "skill", "effect": "supernova", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "value": 3, "exhaust": true, "playable": true, "description": "★★★를 잃고 에너지를 3 얻습니다.\n소멸."},
	{"name": "책 펼치기", "kind": "skill", "effect": "draw_each_file", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "playable": true, "description": "각 파일에서 카드를 1장씩 뽑습니다."},
	{"name": "대전략가", "kind": "skill", "effect": "super_strategist", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "value": 3, "draw": 2, "exhaust": true, "playable": true, "description": "★★★을 얻습니다.\n카드를 2장 뽑습니다.\n소멸."},
	{"name": "소원", "kind": "skill", "effect": "wish", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "value": 3, "exhaust": true, "playable": true, "description": "무작위 희귀 카드 3장을 가져옵니다. 그 카드들에 토큰 속성을 부여합니다.\n소멸."},
	{"name": "연사", "kind": "skill", "effect": "rapid_fire", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "exhaust": true, "playable": true, "description": "다음 공격 카드가 2회 발동합니다.\n소멸."},
	{"name": "광행시간", "kind": "skill", "effect": "light_travel_time", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "value": 3, "playable": true, "description": "다다음 턴 시작 시 광채 3장을 얻습니다."},
	{"name": "오딘의 창", "kind": "skill", "effect": "odin_spear", "use_mode": "untargeted", "rarity": "rare", "cost": 6, "value": 3, "all_targets": true, "playable": true, "description": "모든 적에게 약화와 취약을 3 부여합니다.\n다른 카드를 재련할 때마다 이 카드의 비용이 1 감소합니다."},
	{"name": "병법서", "kind": "skill", "effect": "strategy_book", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 4, "exhaust": true, "playable": true, "description": "힘과 강인함을 4 얻습니다.\n이 효과는 손패에 있는 동안에도 적용됩니다.\n소멸."},
	{"name": "진화론", "kind": "skill", "effect": "evolution_theory", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "힘과 강인함을 1 얻습니다.\n룰. 내 턴 시작 시 반복합니다."},
	{"name": "유성우", "kind": "strike", "effect": "meteor", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 9, "playable": true, "description": "★를 모두 소모해, 무작위 적에게 ★ 하나당 피해를 9 줍니다. 임시 ★도 포함합니다."},
	{"name": "법학 연구", "kind": "skill", "effect": "law_research", "use_mode": "untargeted", "rarity": "rare", "cost": 0, "value": 1, "exhaust": true, "rule": true, "playable": true, "description": "룰. 내 룰 카드의 비용이 1 감소합니다."},
	{"name": "경제학 연구", "kind": "skill", "effect": "economics_research", "use_mode": "untargeted", "rarity": "rare", "cost": 2, "value": 3, "exhaust": true, "rule": true, "playable": true, "description": "룰. 에너지가 -3이 될 때까지 카드를 사용할 수 있습니다."},
	{"name": "저항력", "kind": "skill", "effect": "resilience", "use_mode": "untargeted", "rarity": "rare", "cost": 1, "magic_resistance": 1, "exhaust": true, "description": "마법 저항을 1 얻습니다.\n소멸."},
]

const LEGENDARY_CARDS: Array[Dictionary] = [
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


static func create_region_deck(region_number: int, first_id: int, random: RandomNumberGenerator) -> Dictionary:
	var k := maxi(1, region_number)
	var shape := roll_region_shape(k, random)
	var editions := GenerationModel.editions_for(shape, random)
	while true:
		var capacity := 20 + 5 * int(shape.x)
		if editions.has("gambit"):
			capacity -= 20
		if editions.has("fantastic"):
			capacity = floori(float(capacity) * 0.8)
		var bound_legend := editions.has("legendCassiopeia")
		var rare_slots := int(shape.y1) + int(shape.y2) + (1 if bound_legend else 0)
		if capacity <= 0 or rare_slots > capacity:
			continue
		var cards: Array[Dictionary] = []
		var next_id := first_id
		var rare_bag := RARE_CARDS.duplicate()
		for _slot in range(int(shape.y1)):
			if rare_bag.is_empty():
				rare_bag = RARE_CARDS.duplicate()
			cards.append(_make_card(rare_bag.pop_at(random.randi_range(0, rare_bag.size() - 1)), next_id))
			next_id += 1
		if bound_legend:
			var legend := _make_card(LEGENDARY_CARDS[0], next_id)
			legend["edition_bound"] = true
			cards.append(legend)
			next_id += 1
		# y2 rare slots stay empty. Only the non-rare capacity receives filler.
		for _slot in range(capacity - rare_slots):
			var filler_kind := random.randi_range(0, 3)
			if filler_kind == 0:
				continue
			var pool: Array = STARTER_CARDS if filler_kind == 1 else BASIC_CARDS if filler_kind == 2 else SPECIAL_CARDS
			cards.append(_make_card(pool[random.randi_range(0, pool.size() - 1)], next_id))
			next_id += 1
		var sticker_candidates: Array[int] = []
		for index in range(cards.size()):
			if not CardStickers.compatible_stickers(cards[index]).is_empty():
				sticker_candidates.append(index)
		while sticker_candidates.size() < int(shape.w) and cards.size() < capacity - int(shape.y2):
			var blueprint: Dictionary = BASIC_CARDS[random.randi_range(0, BASIC_CARDS.size() - 1)]
			var extra := _make_card(blueprint, next_id)
			if CardStickers.compatible_stickers(extra).is_empty():
				continue
			sticker_candidates.append(cards.size())
			cards.append(extra)
			next_id += 1
		if int(shape.w) > sticker_candidates.size():
			continue
		for _sticker in range(int(shape.w)):
			var index: int = sticker_candidates.pop_at(random.randi_range(0, sticker_candidates.size() - 1))
			cards[index] = CardStickers.with_random_sticker(cards[index], 1.0, random)
		return {
			"deck": {
				"id": "found-r%d-%d" % [k, first_id], "name": _create_deck_name(capacity, random),
				"capacity": capacity, "rare_slot_capacity": capacity if editions.has("royal") else rare_slots, "cards": cards,
				"editions": editions, "generation": shape,
			},
			"next_card_id": next_id,
		}
	return {}


static func roll_region_shape(region_number: int, random: RandomNumberGenerator) -> Dictionary:
	return GenerationModel.roll(region_number, random)


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
		"description": "피해를 4 줍니다.\n사용한 후 이번 턴 동안 광채의 피해량이 4 증가합니다.",
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
