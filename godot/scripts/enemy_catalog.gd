extends RefCounted
class_name PortEnemyCatalog


const ROACH_SUMMON_COUNT := 2
const ROACH_BASE_HP := 7
const ROACH_BASE_DAMAGE := 5

const REGION_ONE_PAIR_IDS := [66, 68, 69, 70, 72, 73, 78, 79, 81, 82, 83, 85]
const REGION_ONE_SINGLES := [1, 5, 19, 20, 22, 25]
const REGION_TWO_SINGLES := [2, 4, 6, 27, 30, 34]
const REGION_THREE_SINGLES := [11, 13]


static func pick_region_encounter(region_index: int, random: RandomNumberGenerator) -> int:
	var singles: Array = []
	var pair_start := -1
	var pair_end := -1
	match region_index:
		0:
			singles = REGION_ONE_SINGLES
			pair_start = 66
			pair_end = 85
		1:
			singles = REGION_TWO_SINGLES
			pair_start = 36
			pair_end = 65
		_:
			singles = REGION_THREE_SINGLES
	if pair_start >= 0 and random.randf() < 0.5:
		var pair_ids: Array = REGION_ONE_PAIR_IDS if region_index == 0 else range(pair_start, pair_end + 1)
		return int(pair_ids[random.randi_range(0, pair_ids.size() - 1)])
	return int(singles[random.randi_range(0, singles.size() - 1)])


static func pick_region_encounter_from_roll(region_index: int, roll: float) -> int:
	var singles: Array = []
	var pair_start := -1
	var pair_end := -1
	match region_index:
		0:
			singles = REGION_ONE_SINGLES
			pair_start = 66
			pair_end = 85
		1:
			singles = REGION_TWO_SINGLES
			pair_start = 36
			pair_end = 65
		_:
			singles = REGION_THREE_SINGLES

	var value := clampf(roll, 0.0, 0.999999999)
	if pair_start >= 0 and value < 0.5:
		var pair_ids: Array = REGION_ONE_PAIR_IDS if region_index == 0 else range(pair_start, pair_end + 1)
		return int(pair_ids[floori(value * 2.0 * pair_ids.size())])
	if pair_start >= 0:
		value = (value - 0.5) * 2.0
	return int(singles[floori(value * singles.size())])


static func create_encounter(encounter_index: int = 1, random: RandomNumberGenerator = null) -> Dictionary:
	var rng := random
	if rng == null:
		rng = RandomNumberGenerator.new()
		rng.randomize()
	var blueprints: Array[Dictionary] = []
	if encounter_index >= 36 and encounter_index < 66:
		var pair := encounter_index - 36
		var candidates := _region_two_pair_candidates()
		var first_index := int(pair / 5)
		var second_order := pair % 5
		var second_index := second_order if second_order < first_index else second_order + 1
		blueprints.append(candidates[first_index])
		blueprints.append(candidates[second_index])
	elif encounter_index >= 66 and encounter_index < 86:
		blueprints = _region_one_pair_blueprints(encounter_index)
	else:
		blueprints = _single_encounter_blueprints(encounter_index)
	if blueprints.is_empty():
		blueprints.append(_enemy("주황 슬라임", 58, [{"name": "점액 충돌", "damage": 12, "random_no_repeat": true}]))
	var enemies: Array[Dictionary] = []
	for index in range(blueprints.size()):
		enemies.append(_prepare_enemy(blueprints[index], index, rng))
	if enemies.size() == 1:
		return enemies[0]
	return {"name": "%s + %s" % [enemies[0]["name"], enemies[1]["name"]], "enemies": enemies}


static func _single_encounter_blueprints(encounter_index: int) -> Array[Dictionary]:
	match encounter_index:
		1:
			return [_enemy("주황 슬라임", 58, [
				{"name": "점액 충돌", "damage": 12, "random_no_repeat": true},
				{"name": "부식성 점액", "player_corrosion_gain": 2, "random_no_repeat": true},
				{"name": "몸통 내려찍기", "damage": 9, "toxic_slime_count": 1, "random_no_repeat": true},
			], {"gives_toxic_slime": true, "trait": "전투 시작 시 유독성 점액을 손패에 넣습니다."})]
		2:
			return [_enemy("골렘", 129, [
				{"name": "위압", "next_turn_player_weak_gain": 2, "cycle": true},
				{"name": "석화", "player_paralysis_gain": 2, "cycle": true},
				{"name": "분쇄", "damage": 29, "strength_gain": 6, "cycle": true},
			])]
		4:
			return [_enemy("도깨비", 94, [
				{"name": "연타", "damage": 9, "hits": 2, "random_no_repeat": true},
				{"name": "난타", "damage": 8, "hits": 3, "random_no_repeat": true},
				{"name": "마력 응축", "next_turn_player_vulnerable_gain": 2, "random_no_repeat": true},
			], {"variant": "goblin", "turn_end_strength_gain": 1, "trait": "전투 시작 시 가장 왼쪽 파일 맨 아래에 앞면 유물을 추가합니다. 적 턴 종료 시 힘 1을 얻습니다."})]
		5:
			var rats: Array[Dictionary] = []
			for _rat_index in range(3):
				rats.append(_enemy("쥐", 15, [{"name": "물기", "damage": 5, "cycle": true}]))
			return rats
		6:
			var curses: Array = []
			var labels := {"vulnerable": "취약", "weak": "약화", "corrosion": "부식", "paralysis": "마비", "confusion": "혼란"}
			for kind in labels:
				var action := {"name": "%s의 저주" % labels[kind], "damage": 14, "random_each_turn": true}
				action["player_" + kind + "_gain"] = 2
				curses.append(action)
			return [_enemy("저주술사", 78, curses)]
		11:
			return [_enemy("미라 전사", 144, [
				{"name": "삼연격", "damage": 5, "hits": 3, "cycle": true},
				{"name": "강타", "damage": 18, "cycle": true},
				{"name": "약화 연타", "damage": 6, "hits": 2, "next_turn_player_vulnerable_gain": 1, "cycle": true},
			], {"berserk": 1, "trait": "턴 시작 시 힘 1을 얻습니다."})]
		13:
			var beetles: Array[Dictionary] = []
			for _beetle_index in range(2):
				beetles.append(_thorn_beetle())
			return beetles
		14:
			return [_enemy("청소부", 173, [
				{"name": "약화와 취약", "next_turn_player_weak_gain": 2, "next_turn_player_vulnerable_gain": 2, "cycle": true},
				{"name": "내리치기", "damage": 17, "cycle": true},
				{"name": "쌍타", "damage": 7, "hits": 2, "cycle": true},
				{"name": "힘을 실은 쓸기", "damage": 12, "strength_gain": 3, "cycle": true},
			], {"is_boss": true})]
		15:
			return [_enemy("간수", 288, [
				{"name": "약화와 취약", "next_turn_player_weak_gain": 2, "next_turn_player_vulnerable_gain": 2, "cycle": true},
				{"name": "강타", "damage": 23, "cycle": true},
				{"name": "강타", "damage": 23, "cycle": true},
				{"name": "힘 모으기", "strength_gain": 6, "cycle": true},
			], {"is_boss": true})]
		16:
			return [_enemy("거대 지룡", 215, [
				{"name": "돌 깔기", "rock_count": 1, "first_action_rock_count": 2, "strength_gain": 5, "cycle": true},
				{"name": "지룡 강타", "damage": 14, "cycle": true},
				{"name": "지룡 연타", "damage": 7, "hits": 2, "cycle": true},
			], {"is_boss": true, "trait": "첫 행동에는 모든 파일에 바위 2장, 이후 1장을 놓습니다."})]
		19:
			return [_enemy("진흙 인형", 58, [
				{"name": "내려치기", "damage": 14, "random_no_repeat": true},
				{"name": "진흙 메우기", "damage": 10, "heal_gain": 6, "random_no_repeat": true},
				{"name": "진흙 응축", "next_turn_player_vulnerable_gain": 2, "random_no_repeat": true},
			])]
		20:
			return [_enemy("꼭두각시 거병", 71, [
				{"name": "거병의 주먹", "damage": 10, "next_turn_player_weak_gain": 1, "random_no_repeat": true},
				{"name": "마력 응축", "damage": 13, "next_turn_player_vulnerable_gain": 1, "random_no_repeat": true},
				{"name": "강타", "damage": 15, "next_turn_player_vulnerable_gain": 1, "random_no_repeat": true},
			]), _enemy("인형술사", 14, [{"name": "조종 유지"}], {"fixed_max_hp": true, "stun_ally_on_death": "puppetColossus", "trait": "쓰러지면 함께 나온 꼭두각시 거병의 다음 행동을 한 번 취소합니다."})]
		22:
			return [_enemy("실을 짜는 거미", 69, [
				{"name": "끈끈한 거미줄", "player_vulnerable_gain": 2, "random_no_repeat": true},
				{"name": "송곳니 연타", "damage": 7, "hits": 2, "random_no_repeat": true},
				{"name": "포식", "damage": 9, "strength_gain": 3, "random_no_repeat": true},
		], {"solitaire_hit_bonus": 3, "solitaire_hit_bonus_stacks": 0, "trait": "이번 턴 솔리테어 행동을 할 때마다 받는 피해가 3 증가합니다. 효과는 중첩됩니다."})]
		25:
			return [_enemy("알집 바퀴", 55, [
				{"name": "물기", "damage": 12, "random_no_repeat": true},
				{"name": "새끼 부화", "summon": "roachHatchling", "random_no_repeat": true},
				{"name": "부식액", "next_turn_player_weak_gain": 2, "random_no_repeat": true},
		], {"opening_action_index": 1, "trait": "첫 행동은 새끼 2마리 소환으로 고정하고 이후 3랜덤1로 행동합니다. 새끼는 소환된 턴에는 행동하지 않습니다."})]
		27:
			return [_enemy("핏빛 광전사", 101, [
				{"name": "도끼질", "damage": 13, "random_no_repeat": true},
				{"name": "쌍도끼", "damage": 7, "hits": 2, "random_no_repeat": true},
				{"name": "무모한 일격", "damage": 18, "weak_gain": 1, "random_no_repeat": true},
			], {"half_hp_strength_gain": 8, "trait": "체력이 절반 이하가 되면 한 번 힘 8을 얻습니다."})]
		30:
			return [_enemy("족쇄 간수", 83, [
				{"name": "족쇄 연타", "damage": 6, "hits": 2, "random_no_repeat": true},
				{"name": "제압", "damage": 7, "next_turn_player_weak_gain": 1, "random_no_repeat": true},
				{"name": "간수의 응축", "next_turn_player_vulnerable_gain": 2, "random_no_repeat": true},
			], {"energy_recovery_penalty": 1, "trait": "살아 있는 동안 플레이어의 매 턴 기본 에너지 회복량이 1 감소합니다. 카드 효과에는 적용되지 않습니다."})]
		34:
			return [_enemy("피의 기수", 104, [
				{"name": "쌍격", "damage": 7, "hits": 2, "random_no_repeat": true},
				{"name": "무모한 돌격", "damage": 3, "hits": 3, "vulnerable_gain": 1, "random_no_repeat": true},
				{"name": "피의 일격", "damage": 8, "next_turn_player_vulnerable_gain": 1, "random_no_repeat": true},
			], {"shared_turn_end_strength_gain": 2, "trait": "적 턴 종료 시 플레이어와 자신이 힘 2를 얻습니다."})]
		_:
			return []


static func _region_one_pair_blueprints(encounter_index: int) -> Array[Dictionary]:
	# Keep surviving ids stable. Retired bandit pairs resolve to a valid current pair.
	var id := encounter_index
	if id not in REGION_ONE_PAIR_IDS:
		id = int(REGION_ONE_PAIR_IDS[posmod(id - 66, REGION_ONE_PAIR_IDS.size())])
	var legacy_pair := id - 66
	var legacy_first := int(legacy_pair / 4)
	var order := legacy_pair % 4
	var legacy_second := order if order < legacy_first else order + 1
	var retained := [0, 1, 3, 4]
	var candidates := _region_one_pair_candidates()
	return [candidates[retained.find(legacy_first)], candidates[retained.find(legacy_second)]]


static func _region_one_pair_candidates() -> Array[Dictionary]:
	return [
		_enemy("굶주린 들개", 33, [
			{"name": "물어뜯기", "damage": 10, "random_no_repeat": true},
			{"name": "덮치기", "damage": 10, "random_no_repeat": true},
			{"name": "위협", "player_vulnerable_gain": 2, "random_no_repeat": true},
		]),
		_enemy("칼잡이", 28, [
			{"name": "칼질", "damage": 7, "next_turn_player_weak_gain": 1, "random_no_repeat": true},
			{"name": "연속 베기", "damage": 5, "hits": 2, "random_no_repeat": true},
			{"name": "기세 올리기", "damage": 7, "strength_gain": 3, "random_no_repeat": true},
		]),
		_enemy("도깨비불", 41, [
			{"name": "도화선 점화", "damage": 5, "cycle": true},
			{"name": "타오르는 도화선", "damage": 5, "cycle": true},
			{"name": "자폭", "damage": 23, "self_destruct": true, "loop_to": 2},
		]),
		_enemy("하수구 쥐", 37, [
			{"name": "약화시키기", "player_weak_gain": 2, "random_no_repeat": true},
			{"name": "물어뜯기", "damage": 4, "hits": 2, "random_no_repeat": true},
			{"name": "맹독 이빨", "damage": 6, "player_vulnerable_gain": 1, "random_no_repeat": true},
		], {"action_discard_count": 1, "discard_priority": "rarity",
			"trait": "행동할 때마다 파일에서 카드를 1장 버립니다. 파일 맨 위 카드 중 희귀도가 높은 카드를 우선합니다."}),
	]


static func _region_two_pair_candidates() -> Array[Dictionary]:
	return [
		_enemy("화약 운반병", 46, [
			{"name": "강타", "damage": 6, "random_no_repeat": true},
			{"name": "연타", "damage": 3, "hits": 2, "random_no_repeat": true},
			{"name": "화약 보충", "damage": 5, "powder_gain": 2, "random_no_repeat": true},
		], {"powder": 6, "trait": "사망 시 자신을 제외한 모두에게 화약 수치만큼 물리 피해를 줍니다."}),
		_enemy("수색견", 52, [{"name": "물어뜯기", "damage": 6, "cycle": true}], {"hand_strength_gain": 5, "trait": "플레이어 손패에 카드가 남아 있는 동안 임시 힘 5를 얻습니다."}),
		_enemy("대형 망치병", 62, [
			{"name": "망치 내려찍기", "damage": 12, "loop_to": 0},
			{"name": "휴식", "strength_gain": 1, "loop_to": 0},
		], {"rests_when_blocked": true, "trait": "공격이 완전히 막히면 다음 행동은 휴식하며 힘 1을 얻습니다."}),
		_enemy("봉인 파수꾼", 56, [
			{"name": "강타", "damage": 6, "random_no_repeat": true},
			{"name": "연속 타격", "damage": 3, "hits": 2, "random_no_repeat": true},
			{"name": "봉인 응축", "next_turn_player_vulnerable_gain": 2, "random_no_repeat": true},
		], {"seals_pile": true, "trait": "매 플레이어 턴 시작 시 카드가 있는 무작위 파일 하나를 봉인합니다. 그 파일의 모든 드로우를 막지만 솔리테어 이동은 허용합니다."}),
		_enemy("발효 슬라임", 63, [
			{"name": "몸통 박치기", "damage": 12, "random_no_repeat": true},
			{"name": "점액 연타", "damage": 6, "hits": 2, "random_no_repeat": true},
			{"name": "발효 응축", "next_turn_player_vulnerable_gain": 2, "next_turn_player_weak_gain": 2, "random_no_repeat": true},
		], {"fermented_slime_count": 1, "trait": "전투 시작 시 발효 점액 1장을 손패에 넣습니다. 발효 점액은 에너지 1을 주는 보존 토큰입니다."}),
		_enemy("압수관", 52, [
			{"name": "타격", "damage": 8, "random_no_repeat": true},
			{"name": "엄폐", "block_gain": 8, "random_no_repeat": true},
			{"name": "압수 명령", "next_turn_player_vulnerable_gain": 1, "random_no_repeat": true},
		], {"confiscates_rare": true, "trait": "파일 배치 후 첫 드로우 전에 파일의 무작위 희귀 카드 1장을 압수합니다. 처치하면 즉시 손패로 돌려줍니다."}),
	]


static func _thorn_beetle() -> Dictionary:
	return _enemy("가시 딱정벌레", 64, [
		{"name": "가시 돋치기", "next_turn_player_vulnerable_gain": 1, "random_no_repeat": true},
		{"name": "가시 강타", "damage": 12, "random_no_repeat": true},
		{"name": "약화 독", "strength_loss": 2, "agility_loss": 2, "random_no_repeat": true},
	], {"thorns": 4, "trait": "공격받을 때마다 물리 피해 4로 반격합니다."})


static func _enemy(enemy_name: String, hp: int, actions: Array, passives: Dictionary = {}) -> Dictionary:
	var blueprint := {
		"name": enemy_name,
		"hp": hp,
		"actions": actions,
	}
	blueprint.merge(passives, true)
	return blueprint


static func _prepare_enemy(blueprint: Dictionary, enemy_id: int, random: RandomNumberGenerator) -> Dictionary:
	var enemy: Dictionary = blueprint.duplicate(true)
	var base_hp := int(enemy["hp"])
	var fixed_hp := bool(enemy.get("fixed_max_hp", false)) or bool(enemy.get("is_boss", false))
	var minimum_hp := maxi(1, roundi(float(base_hp) * 0.95))
	var maximum_hp := maxi(minimum_hp, roundi(float(base_hp) * 1.05))
	var rolled_hp := base_hp if fixed_hp else random.randi_range(minimum_hp, maximum_hp)
	enemy["id"] = enemy_id
	enemy["hp"] = rolled_hp
	enemy["max_hp"] = rolled_hp
	enemy["physical_block"] = int(enemy.get("physical_block", 0))
	enemy["strength"] = int(enemy.get("strength", 0))
	enemy["vulnerable"] = int(enemy.get("vulnerable", 0))
	enemy["weak"] = int(enemy.get("weak", 0))
	enemy["first_action_completed"] = false
	enemy["action_index"] = int(enemy.get("opening_action_index", -1))
	var actions: Array = enemy.get("actions", [])
	if int(enemy["action_index"]) < 0:
		enemy["action_index"] = 0 if actions.is_empty() or bool(actions[0].get("cycle", false)) else random.randi_range(0, actions.size() - 1)
	enemy["death_resolved"] = false
	return enemy


static func intent_text(enemy: Dictionary, player_energy: int = 3, hand_count: int = 0) -> String:
	var actions: Array = enemy.get("actions", [])
	if actions.is_empty():
		return "다음 행동 없음"
	var action_index := clampi(int(enemy.get("action_index", 0)), 0, actions.size() - 1)
	var action: Dictionary = actions[action_index]
	var result := "다음 행동: %s" % str(action.get("name", "행동"))
	var rock_count := int(action.get("rock_count", 0))
	if not bool(enemy.get("first_action_completed", false)) and action.has("first_action_rock_count"):
		rock_count = int(action["first_action_rock_count"])
	if rock_count > 0:
		result += " · 모든 파일에 바위 %d장" % rock_count
	var temporary_strength := int(enemy.get("empty_energy_strength_gain", 0)) if player_energy <= 0 else 0
	if hand_count > 0:
		temporary_strength += int(enemy.get("hand_strength_gain", 0))
	var damage := int(action.get("damage", 0)) + int(enemy.get("strength", 0)) + temporary_strength if int(action.get("damage", 0)) > 0 else 0
	if damage > 0:
		var hits := maxi(1, int(action.get("hits", 1)))
		var outgoing_modifier := -50 if int(enemy.get("weak", 0)) > 0 else 0
		var incoming_modifier := 50 if int(enemy.get("player_vulnerable", 0)) > 0 else 0
		var total_damage := maxi(0, int(floor(float(damage) * (100 + outgoing_modifier + incoming_modifier) / 100.0))) * hits
		result += " · %s %d" % ["피해", total_damage]
		if hits > 1:
			result += " ×%d" % hits
	for key in ["strength_gain", "boon_gain", "strength_loss", "agility_loss", "powder_gain", "soil_count", "heal_gain", "block_gain"]:
		var value := int(action.get(key, 0))
		if value == 0:
			continue
		var label: String = str({
			"strength_gain": "힘 +%d", "boon_gain": "가호 +%d", "strength_loss": "플레이어 힘 -%d",
			"agility_loss": "플레이어 강인함 -%d",
			"powder_gain": "화약 +%d", "soil_count": "모든 파일에 흙 %d장", "heal_gain": "체력 +%d", "block_gain": "방어 +%d",
		}[key])
		result += " · " + (label % value)
	for kind in ["weak", "vulnerable", "corrosion", "paralysis", "confusion"]:
		var label: String = preload("res://scripts/battle_status_rules.gd").LABELS[kind]
		var own_amount := int(action.get(kind + "_gain", 0))
		if own_amount > 0:
			result += " · %s %d" % [label, own_amount]
		var amount := int(action.get("player_" + kind + "_gain", action.get("next_turn_player_" + kind + "_gain", 0)))
		if amount > 0:
			result += " · %s %d 부여" % [label, amount]
	if str(action.get("summon", "")) == "roachHatchling":
		result += " · " + roach_summon_description()
	var toxic_slime_count := maxi(0, int(action.get("toxic_slime_count", 0)))
	if toxic_slime_count > 0:
		result += " · 손패에 유독성 점액 %d장 추가" % toxic_slime_count
	if bool(action.get("self_destruct", false)):
		result += " · 자폭"
	if action.has("preview"):
		result += " · " + str(action["preview"])
	return result


static func roach_summon_description() -> String:
	return "새끼 바퀴 %d마리 소환 (체력 %d, 피해 %d)" % [ROACH_SUMMON_COUNT, ROACH_BASE_HP, ROACH_BASE_DAMAGE]
