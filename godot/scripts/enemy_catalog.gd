extends RefCounted
class_name PortEnemyCatalog

const REGION_ONE_SINGLES := [1, 5, 19, 20, 22, 25]
const REGION_TWO_SINGLES := [2, 4, 6, 27, 30, 33, 34]
const REGION_THREE_SINGLES := [10, 11, 12, 13]


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
		return random.randi_range(pair_start, pair_end)
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
		var pair_count := pair_end - pair_start + 1
		return pair_start + floori(value * 2.0 * pair_count)
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
		var pair := encounter_index - 66
		var candidates := _region_one_pair_candidates()
		var first_index := int(pair / 4)
		var second_order := pair % 4
		var second_index := second_order if second_order < first_index else second_order + 1
		blueprints.append(candidates[first_index])
		blueprints.append(candidates[second_index])
	else:
		blueprints = _single_encounter_blueprints(encounter_index)
	if blueprints.is_empty():
		blueprints.append(_enemy("주황 슬라임", 50, [{"name": "점액 충돌", "damage": 10, "random_no_repeat": true}]))
	var enemies: Array[Dictionary] = []
	for index in range(blueprints.size()):
		enemies.append(_prepare_enemy(blueprints[index], index, rng))
	if enemies.size() == 1:
		return enemies[0]
	return {"name": "%s + %s" % [enemies[0]["name"], enemies[1]["name"]], "enemies": enemies}


static func _single_encounter_blueprints(encounter_index: int) -> Array[Dictionary]:
	match encounter_index:
		1:
			return [_enemy("주황 슬라임", 50, [
				{"name": "점액 충돌", "damage": 10, "random_no_repeat": true},
				{"name": "무기력 점액", "next_turn_player_amplification_change": -2, "random_no_repeat": true},
				{"name": "몸통 내려찍기", "damage": 7, "strength_gain": 3, "random_no_repeat": true},
			], {"gives_toxic_slime": true, "trait": "전투 시작 시 유독성 점액을 손패에 넣습니다."})]
		2:
			return [_enemy("골렘", 112, [
				{"name": "위압", "next_turn_player_amplification_change": -2, "cycle": true},
				{"name": "석화 갑주", "resistance_gain": 2, "cycle": true},
				{"name": "분쇄", "damage": 25, "strength_gain": 5, "cycle": true},
			])]
		4:
			return [_enemy("도깨비", 82, [
				{"name": "연타", "damage": 8, "hits": 2, "random_no_repeat": true},
				{"name": "난타", "damage": 7, "hits": 3, "random_no_repeat": true},
				{"name": "마력 응축", "amplification_gain": 2, "random_no_repeat": true},
			], {"variant": "goblin", "turn_end_strength_gain": 1, "trait": "전투 시작 시 가장 왼쪽 파일 맨 아래에 앞면 유물을 추가합니다. 적 턴 종료 시 힘 1을 얻습니다."})]
		5:
			var rats: Array[Dictionary] = []
			for _rat_index in range(3):
				rats.append(_enemy("쥐", 13, [{"name": "물기", "damage": 4, "cycle": true}]))
			return rats
		6:
			return [_enemy("저주술사", 68, [
				{"name": "쇠약의 저주", "next_turn_player_resistance_change": -3, "cycle": true},
				{"name": "저주의 일격", "damage": 20, "loop_to": 1},
			])]
		10:
			return [_enemy("미라 사제", 87, [
				{"name": "가호의 의식", "boon_gain": 2, "next_turn_player_resistance_change": -1, "cycle": true},
				{"name": "마력의 저주", "damage": 16, "damage_type": "magic", "cycle": true},
				{"name": "붕대 강타", "damage": 20, "cycle": true},
			], {"boon": 5, "trait": "전투 시작 시 가호 5를 얻습니다."})]
		11:
			return [_enemy("미라 전사", 125, [
				{"name": "삼연격", "damage": 4, "hits": 3, "cycle": true},
				{"name": "강타", "damage": 16, "cycle": true},
				{"name": "약화 연타", "damage": 5, "hits": 2, "next_turn_player_resistance_change": -1, "cycle": true},
			], {"berserk": 1, "trait": "턴 시작 시 힘 1을 얻습니다."})]
		12:
			return [_enemy("지룡", 118, [
				{"name": "흙", "soil_count": 1, "next_turn_player_resistance_change": -1, "cycle": true},
				{"name": "지각 강타", "damage": 15, "cycle": true},
				{"name": "대지 마력", "damage": 20, "damage_type": "magic", "cycle": true},
			], {"trait": "행동에 따라 모든 파일 맨 위에 흙을 놓습니다."})]
		13:
			var beetles: Array[Dictionary] = []
			for _beetle_index in range(2):
				beetles.append(_thorn_beetle())
			return beetles
		14:
			return [_enemy("청소부", 150, [
				{"name": "약화와 취약", "next_turn_player_amplification_change": -2, "next_turn_player_resistance_change": -2, "cycle": true},
				{"name": "내리치기", "damage": 15, "cycle": true},
				{"name": "쌍타", "damage": 6, "hits": 2, "cycle": true},
				{"name": "힘을 실은 쓸기", "damage": 10, "strength_gain": 3, "cycle": true},
			], {"is_boss": true})]
		15:
			return [_enemy("간수", 250, [
				{"name": "저항과 증폭", "resistance_gain": 2, "amplification_gain": 2, "cycle": true},
				{"name": "강타", "damage": 20, "cycle": true},
				{"name": "강타", "damage": 20, "cycle": true},
				{"name": "힘 모으기", "strength_gain": 5, "cycle": true},
			], {"is_boss": true, "status_effectiveness": 40, "trait": "강화됨: 저항과 증폭의 효율이 30%에서 40%로 증가함."})]
		16:
			return [_enemy("거대 지룡", 187, [
				{"name": "돌 깔기", "rock_count": 1, "first_action_rock_count": 2, "strength_gain": 4, "cycle": true},
				{"name": "지룡 강타", "damage": 12, "cycle": true},
				{"name": "지룡 연타", "damage": 6, "hits": 2, "cycle": true},
			], {"is_boss": true, "trait": "첫 행동에는 모든 파일에 바위 2장, 이후 1장을 놓습니다."})]
		19:
			return [_enemy("진흙 인형", 50, [
				{"name": "내려치기", "damage": 12, "random_no_repeat": true},
				{"name": "진흙 메우기", "damage": 9, "heal_gain": 6, "random_no_repeat": true},
				{"name": "진흙 응축", "amplification_gain": 2, "random_no_repeat": true},
			])]
		20:
			return [_enemy("꼭두각시 거병", 62, [
				{"name": "거병의 주먹", "damage": 9, "next_turn_player_amplification_change": -1, "random_no_repeat": true},
				{"name": "마력 응축", "damage": 11, "amplification_gain": 1, "random_no_repeat": true},
				{"name": "강타", "damage": 13, "next_turn_player_resistance_change": -1, "random_no_repeat": true},
			]), _enemy("인형술사", 12, [{"name": "조종 유지"}], {"fixed_max_hp": true, "stun_ally_on_death": "puppetColossus", "trait": "쓰러지면 함께 나온 꼭두각시 거병의 다음 행동을 한 번 취소합니다."})]
		22:
			return [_enemy("실을 짜는 거미", 60, [
				{"name": "물기", "damage": 8, "next_turn_player_resistance_change": -1, "random_no_repeat": true},
				{"name": "송곳니 연타", "damage": 6, "hits": 2, "random_no_repeat": true},
				{"name": "포식 준비", "strength_gain": 4, "random_no_repeat": true},
		], {"solitaire_hit_bonus": 6, "trait": "매 턴 첫 솔리테어 행동 후 받는 다음 한 타격의 피해가 6 증가합니다. 턴 종료 시 사라집니다."})]
		25:
			return [_enemy("알집 바퀴", 48, [
				{"name": "물기", "damage": 10, "random_no_repeat": true},
				{"name": "새끼 부화", "summon": "roachHatchling", "random_no_repeat": true},
				{"name": "부식액", "next_turn_player_resistance_change": -2, "random_no_repeat": true},
		], {"opening_action_index": 1, "trait": "첫 행동은 새끼 소환으로 고정하고 이후 3랜덤1로 행동합니다. 새끼는 최대 2마리이며 소환된 턴에는 행동하지 않습니다."})]
		27:
			return [_enemy("핏빛 광전사", 88, [
				{"name": "도끼질", "damage": 11, "random_no_repeat": true},
				{"name": "쌍도끼", "damage": 6, "hits": 2, "random_no_repeat": true},
				{"name": "무모한 일격", "damage": 16, "amplification_gain": -1, "random_no_repeat": true},
			], {"half_hp_strength_gain": 7, "trait": "체력이 절반 이하가 되면 한 번 힘 7을 얻습니다."})]
		30:
			return [_enemy("족쇄 간수", 72, [
				{"name": "족쇄 연타", "damage": 5, "hits": 2, "random_no_repeat": true},
				{"name": "제압", "damage": 6, "next_turn_player_amplification_change": -1, "random_no_repeat": true},
				{"name": "간수의 응축", "amplification_gain": 2, "random_no_repeat": true},
			], {"energy_recovery_penalty": 1, "trait": "살아 있는 동안 플레이어의 매 턴 기본 에너지 회복량이 1 감소합니다. 카드 효과에는 적용되지 않습니다."})]
		33:
			return [_enemy("공허 해파리", 60, [{"name": "공허의 파동", "damage": 8, "damage_type": "magic", "cycle": true}])]
		34:
			return [_enemy("피의 기수", 90, [
				{"name": "쌍격", "damage": 6, "hits": 2, "random_no_repeat": true},
				{"name": "무모한 돌격", "damage": 3, "hits": 3, "resistance_gain": -1, "random_no_repeat": true},
				{"name": "피의 일격", "damage": 7, "next_turn_player_resistance_change": -1, "random_no_repeat": true},
			], {"shared_turn_end_strength_gain": 2, "trait": "적 턴 종료 시 플레이어와 자신이 힘 2를 얻습니다."})]
		_:
			return []


static func _region_one_pair_candidates() -> Array[Dictionary]:
	return [
		_enemy("굶주린 들개", 24, [
			{"name": "돌진 준비", "damage": 5, "preview": "다음 턴 돌진 12", "cycle": true},
			{"name": "돌진", "damage": 12, "cycle": true},
			{"name": "물어뜯기", "damage": 5, "loop_to": 2},
		]),
		_enemy("칼잡이", 20, [
			{"name": "칼질", "damage": 6, "next_turn_player_amplification_change": -1, "random_no_repeat": true},
			{"name": "연속 베기", "damage": 4, "hits": 2, "random_no_repeat": true},
			{"name": "기세 올리기", "damage": 6, "strength_gain": 3, "random_no_repeat": true},
		]),
		_enemy("눈치보는 산적", 26, [
			{"name": "기습", "damage": 4, "next_turn_player_amplification_change": -1, "random_no_repeat": true},
			{"name": "연속 베기", "damage": 3, "hits": 2, "random_no_repeat": true},
			{"name": "강타", "damage": 6, "random_no_repeat": true},
		], {"empty_energy_strength_gain": 5, "trait": "플레이어의 에너지가 0 이하이면 이번 행동에만 힘 5를 얻습니다."}),
		_enemy("화약 두꺼비", 26, [
			{"name": "도화선 점화", "damage": 4, "preview": "두 행동 뒤 자폭", "cycle": true},
			{"name": "타오르는 도화선", "damage": 4, "preview": "다음 턴 자폭", "cycle": true},
			{"name": "자폭", "damage": 12, "self_destruct": true, "loop_to": 2},
		]),
		_enemy("하수구 쥐", 28, [
			{"name": "물어뜯기", "damage": 3, "hits": 2, "discard_count": 1, "discard_priority": "rarity", "random_no_repeat": true},
			{"name": "웅크리기", "damage": 6, "discard_count": 1, "discard_priority": "rarity", "random_no_repeat": true},
			{"name": "흉포화", "damage": 3, "strength_gain": 3, "discard_count": 1, "discard_priority": "rarity", "random_no_repeat": true},
		], {"trait": "버리기: 파일 맨 위 카드 중 희귀도가 높은 카드를 우선해 턴 종료 시 버립니다."}),
	]


static func _region_two_pair_candidates() -> Array[Dictionary]:
	return [
		_enemy("화약 운반병", 40, [
			{"name": "강타", "damage": 5, "random_no_repeat": true},
			{"name": "연타", "damage": 3, "hits": 2, "random_no_repeat": true},
			{"name": "화약 보충", "damage": 4, "powder_gain": 2, "random_no_repeat": true},
		], {"powder": 6, "trait": "사망 시 자신을 제외한 모두에게 화약 수치만큼 물리 피해를 줍니다."}),
		_enemy("수색견", 45, [{"name": "물어뜯기", "damage": 5, "cycle": true}], {"hand_strength_gain": 4, "trait": "플레이어 손패에 카드가 남아 있는 동안 임시 힘 4를 얻습니다."}),
		_enemy("대형 망치병", 54, [
			{"name": "망치 내려찍기", "damage": 10, "loop_to": 0},
			{"name": "휴식", "strength_gain": 1, "loop_to": 0},
		], {"rests_when_blocked": true, "trait": "공격이 완전히 막히면 다음 행동은 휴식하며 힘 1을 얻습니다."}),
		_enemy("봉인 파수꾼", 49, [
			{"name": "강타", "damage": 5, "random_no_repeat": true},
			{"name": "연속 타격", "damage": 3, "hits": 2, "random_no_repeat": true},
			{"name": "봉인 응축", "amplification_gain": 2, "random_no_repeat": true},
		], {"seals_pile": true, "trait": "매 플레이어 턴 시작 시 카드가 있는 무작위 파일 하나를 봉인합니다. 그 파일의 모든 드로우를 막지만 솔리테어 이동은 허용합니다."}),
		_enemy("발효 슬라임", 55, [
			{"name": "몸통 박치기", "damage": 10, "random_no_repeat": true},
			{"name": "점액 연타", "damage": 5, "hits": 2, "random_no_repeat": true},
			{"name": "발효 응축", "amplification_gain": 2, "resistance_gain": 2, "random_no_repeat": true},
		], {"fermented_slime_count": 1, "trait": "전투 시작 시 발효 점액 1장을 손패에 넣습니다. 발효 점액은 에너지 1을 주는 보존 토큰입니다."}),
		_enemy("압수관", 45, [
			{"name": "타격", "damage": 7, "random_no_repeat": true},
			{"name": "엄폐", "block_gain": 8, "random_no_repeat": true},
			{"name": "압수 명령", "next_turn_player_resistance_change": -1, "random_no_repeat": true},
		], {"confiscates_rare": true, "trait": "파일 배치 후 첫 드로우 전에 파일의 무작위 희귀 카드 1장을 압수합니다. 처치하면 즉시 손패로 돌려줍니다."}),
	]


static func _thorn_beetle() -> Dictionary:
	return _enemy("가시 딱정벌레", 56, [
		{"name": "가시 돋치기", "next_turn_player_resistance_change": -1, "random_no_repeat": true},
		{"name": "가시 강타", "damage": 10, "random_no_repeat": true},
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
	var minimum_hp := base_hp - 1 if str(enemy.get("name", "")) == "쥐" else floori(float(base_hp) * 0.9)
	var rolled_hp := base_hp if fixed_hp else random.randi_range(minimum_hp, base_hp)
	enemy["id"] = enemy_id
	enemy["hp"] = rolled_hp
	enemy["max_hp"] = rolled_hp
	enemy["physical_block"] = int(enemy.get("physical_block", 0))
	enemy["strength"] = int(enemy.get("strength", 0))
	enemy["resistance"] = int(enemy.get("resistance", 0))
	enemy["amplification"] = int(enemy.get("amplification", 0))
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
	var damage := int(action.get("damage", 0)) + int(enemy.get("strength", 0)) + temporary_strength
	if damage > 0:
		var hits := maxi(1, int(action.get("hits", 1)))
		var effectiveness := int(enemy.get("status_effectiveness", 30))
		var outgoing := 100 + (effectiveness if int(enemy.get("amplification", 0)) > 0 else -effectiveness if int(enemy.get("amplification", 0)) < 0 else 0)
		var incoming := 100 - (30 if int(enemy.get("player_resistance", 0)) > 0 else -30 if int(enemy.get("player_resistance", 0)) < 0 else 0)
		var total_damage := maxi(0, int(floor(float(damage) * outgoing * incoming / 10000.0))) * hits
		result += " · %s %d" % ["마법 피해" if str(action.get("damage_type", "physical")) == "magic" else "피해", total_damage]
		if hits > 1:
			result += " ×%d" % hits
	for key in ["strength_gain", "boon_gain", "strength_loss", "agility_loss", "resistance_gain", "amplification_gain", "powder_gain", "soil_count", "heal_gain", "block_gain"]:
		var value := int(action.get(key, 0))
		if value == 0:
			continue
		var label: String = str({
			"strength_gain": "힘 +%d", "boon_gain": "가호 +%d", "strength_loss": "플레이어 힘 -%d",
			"agility_loss": "플레이어 강인함 -%d", "resistance_gain": "저항 %s%d", "amplification_gain": "증폭 %s%d",
			"powder_gain": "화약 +%d", "soil_count": "모든 파일에 흙 %d장", "heal_gain": "체력 +%d", "block_gain": "방어 +%d",
		}[key])
		if key in ["resistance_gain", "amplification_gain"]:
			result += " · " + (label % ["+" if value > 0 else "−", absi(value)])
		else:
			result += " · " + (label % value)
	if bool(action.get("self_destruct", false)):
		result += " · 자폭"
	if action.has("preview"):
		result += " · " + str(action["preview"])
	return result
