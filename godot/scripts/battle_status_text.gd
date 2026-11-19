class_name PortBattleStatusText
extends RefCounted

const BattleRules = preload("res://scripts/battle_rules.gd")


static func enemy_self_destruct_countdown(enemy: Dictionary) -> int:
	var actions: Array = enemy.get("actions", [])
	var current := int(enemy.get("action_index", 0))
	for index in actions.size():
		if bool(actions[index].get("self_destruct", false)):
			return maxi(0, index - current)
	return -1


static func enemy_status_text(enemy: Dictionary, battle_state: Dictionary) -> String:
	var statuses: Array[String] = []
	var countdown := enemy_self_destruct_countdown(enemy)
	if countdown >= 0:
		statuses.append("자폭 %d" % countdown)
	if int(enemy.get("action_discard_count", 0)) > 0:
		statuses.append("갉아먹기")
	var vulnerable := int(enemy.get("vulnerable", 0))
	var weak := int(enemy.get("weak", 0))
	if vulnerable > 0:
		statuses.append("취약 %d" % vulnerable)
	if weak > 0:
		statuses.append("약화 %d" % weak)
	var block := int(enemy.get("physical_block", 0))
	if block > 0:
		statuses.append("방어 %d" % block)
	if bool(enemy.get("stunned", false)):
		statuses.append("행동 불가 1")
	if not str(enemy.get("stun_ally_on_death", "")).is_empty():
		statuses.append("인형 조종")
	if int(enemy.get("empty_energy_strength_gain", 0)) > 0:
		statuses.append("빈틈 노리기")
	if int(enemy.get("solitaire_hit_bonus", 0)) > 0:
		statuses.append("거미줄")
	var turn_end_strength := int(enemy.get("turn_end_strength_gain", 0))
	if turn_end_strength > 0:
		statuses.append("성장 %d" % turn_end_strength)
	if int(enemy.get("half_hp_strength_gain", 0)) > 0:
		statuses.append("격노 발동" if bool(enemy.get("enraged", false)) else "격노")
	if enemy.has("powder"):
		statuses.append("화약 %d" % int(enemy.get("powder", 0)))
	if int(enemy.get("hand_strength_gain", 0)) > 0:
		statuses.append("추적")
	if bool(enemy.get("rests_when_blocked", false)):
		statuses.append("묵직한 망치")
	if int(enemy.get("energy_recovery_penalty", 0)) > 0:
		statuses.append("족쇄")
	if bool(enemy.get("seals_pile", false)):
		var sealed_file := int(enemy.get("sealed_pile_index", -1))
		statuses.append("봉인 · %d번 파일" % (sealed_file + 1) if sealed_file >= 0 else "봉인")
	if int(enemy.get("fermented_slime_count", 0)) > 0:
		statuses.append("발효 점액")
	var shared_strength := int(enemy.get("shared_turn_end_strength_gain", 0))
	if shared_strength > 0:
		statuses.append("피의 공명 %d" % shared_strength)
	if bool(enemy.get("confiscates_rare", false)):
		statuses.append("압수 %d" % enemy.get("confiscated_cards", []).size())
	var strength := int(enemy.get("strength", 0))
	if strength != 0:
		statuses.append("힘 %d" % strength)
	var temporary_strength := 0
	if int(battle_state.get("energy", 0)) <= 0:
		temporary_strength += int(enemy.get("empty_energy_strength_gain", 0))
	if not battle_state.get("hand", []).is_empty():
		temporary_strength += int(enemy.get("hand_strength_gain", 0))
	if temporary_strength > 0:
		statuses.append("임시 힘 +%d" % temporary_strength)
	var spider_damage_bonus := int(enemy.get("solitaire_hit_bonus", 0)) * int(enemy.get("solitaire_hit_bonus_stacks", 0))
	if spider_damage_bonus > 0:
		statuses.append("받는 피해 +%d" % spider_damage_bonus)
	var boon := int(enemy.get("boon", 0))
	if boon > 0:
		statuses.append("가호 %d" % boon)
	var berserk := int(enemy.get("berserk", 0))
	if berserk > 0:
		statuses.append("광폭화 %d" % berserk)
	var thorns := int(enemy.get("thorns", 0))
	if thorns > 0:
		statuses.append("가시 %d" % thorns)
	var sturdy := int(enemy.get("sturdy_threshold", 0))
	if sturdy > 0:
		statuses.append("단단함 ≤%d" % sturdy)
	if bool(enemy.get("quickness_ready", false)):
		statuses.append("재빠름 준비")
	return " · ".join(statuses)


static func enemy_status_tooltip(enemy: Dictionary, status_text: String) -> String:
	if status_text.begins_with("자폭 "):
		var countdown := enemy_self_destruct_countdown(enemy)
		return "이번 공격 후 자폭합니다." if countdown == 0 else "공격을 %d번 더 한 뒤, 다음 공격 후 자폭합니다." % countdown
	if status_text.begins_with("취약 "):
		return "받는 공격 피해가 50% 증가합니다."
	if status_text.begins_with("약화 "):
		return "가하는 공격 피해가 50% 감소합니다."
	if status_text.begins_with("힘 "):
		return "공격의 각 타격에 피해를 %d만큼 추가합니다." % status_text.get_slice(" ", 1).to_int()
	if status_text.begins_with("임시 힘 "):
		return "이번 적 행동에만 추가되는 힘입니다. 영구적으로 누적되지 않습니다."
	if status_text.begins_with("방어 "):
		return "받는 피해를 먼저 흡수합니다. 다음 적 행동이 시작될 때 남은 방어는 사라집니다."
	if status_text.begins_with("행동 불가 "):
		return "다음 행동을 한 번 건너뜁니다. 그 행동의 공격과 강화 효과도 발동하지 않습니다."
	if status_text.begins_with("압수 "):
		var confiscated_cards: Array = enemy.get("confiscated_cards", [])
		var confiscated_names := PackedStringArray()
		for confiscated_card in confiscated_cards:
			confiscated_names.append(str(confiscated_card.get("name", "카드")))
		return ", ".join(confiscated_names) if not confiscated_names.is_empty() else "압수한 카드가 없습니다."
	if status_text.begins_with("가호 "):
		return "받는 타격의 피해를 무효화합니다. 타격을 한 번 막을 때마다 가호를 1 소모합니다."
	if status_text.begins_with("광폭화 "):
		return "플레이어의 턴이 시작될 때마다 이 수치만큼 힘을 얻습니다."
	if status_text.begins_with("가시 "):
		return "공격받을 때마다 이 수치만큼 피해로 반격합니다."
	if status_text.begins_with("받는 피해 +"):
		return "이번 턴 솔리테어 행동을 할 때마다 받는 피해가 3 증가합니다. 이 수치는 턴 종료 시 사라집니다."
	if status_text.begins_with("단단함 "):
		return "표시된 수치 이하의 타격 피해를 받으면 그 피해를 1로 줄입니다."
	if status_text == "재빠름 준비":
		return "다음 공격의 한 타격을 회피합니다. 회피하면 준비 상태가 사라집니다."
	return enemy_trait_tooltip(enemy)


static func enemy_trait_tooltip(enemy: Dictionary) -> String:
	var enemy_trait = enemy.get("trait")
	return "" if enemy_trait == null else str(enemy_trait)


static func battle_status_tooltip(status_text: String) -> String:
	var shared_status := BattleRules.StatusRules.describe_badge(status_text)
	if shared_status != "":
		return shared_status
	if status_text.begins_with("취약 "):
		return "받는 공격 피해가 50% 증가합니다."
	if status_text.begins_with("약화 "):
		return "가하는 공격 피해가 50% 감소합니다."
	if status_text.begins_with("강인함 "):
		var status_parts: PackedStringArray = status_text.split(" ")
		var agility := int(status_parts[status_parts.size() - 1])
		var agility_effect := "%d만큼 추가로 얻습니다." % agility if agility >= 0 else "%d만큼 덜 얻습니다." % absi(agility)
		return "방어를 얻을 때 %s 직접 카드를 낼 때만 적용됩니다." % agility_effect
	if status_text.begins_with("이번 턴 힘 "):
		var status_parts: PackedStringArray = status_text.split(" ")
		var temporary_strength := int(status_parts[status_parts.size() - 1])
		var temporary_strength_effect := "%d만큼 추가합니다." % temporary_strength if temporary_strength >= 0 else "%d만큼 감소시킵니다." % absi(temporary_strength)
		return "이번 턴 동안 공격의 각 타격에 피해를 %s 직접 카드를 낼 때만 적용됩니다." % temporary_strength_effect
	if status_text.begins_with("힘 "):
		var status_parts: PackedStringArray = status_text.split(" ")
		var strength := int(status_parts[status_parts.size() - 1])
		var strength_effect := "%d만큼 추가합니다." % strength if strength >= 0 else "%d만큼 감소시킵니다." % absi(strength)
		return "공격의 각 타격에 피해를 %s 직접 카드를 낼 때만 적용됩니다." % strength_effect
	if status_text.begins_with("무적 "):
		return "피해를 받지 않습니다."
	return ""
