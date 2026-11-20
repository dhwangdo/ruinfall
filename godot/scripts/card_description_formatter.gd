extends RefCounted
class_name PortCardDescriptionFormatter

const BattleCardPreview = preload("res://scripts/battle_card_preview.gd")
const CardCatalog = preload("res://scripts/card_catalog.gd")
const CardStickers = preload("res://scripts/stickers.gd")


static func format(card: Dictionary, battle_state: Dictionary = {}, use_battle_context: bool = false) -> String:
	var description := str(card.get("description", ""))
	# Saved cards can retain old copy, so current catalog descriptions are normalized below.
	var effect := str(card.get("effect", ""))
	if effect in ["strategy_book", "obsidian_dagger", "dash", "combat_manual", "exchange"]:
		var source_cards: Array = CardCatalog.RARE_CARDS
		if effect in ["dash", "exchange"]:
			source_cards = CardCatalog.SPECIAL_CARDS
		elif effect == "combat_manual":
			source_cards = CardCatalog.BASIC_CARDS
		for blueprint in source_cards:
			if str(blueprint.get("effect", "")) == effect:
				description = str(blueprint.get("description", description))
				break
	if effect == "iron_song" and bool(card.get("forged", card.get("upgraded", false))):
		description = description.replace("다음 턴[과 다다음 턴]", "다음 턴과 다다음 턴")
	if effect == "dash" and bool(card.get("forged", card.get("upgraded", false))):
		description = description.replace("2[3]장", "3장")
	if effect == "obsidian_dagger":
		var completed_forges: Array = card.get("forge_costs_completed", [])
		var hits := 1 + completed_forges.size()
		if hits > 1:
			description = description.replace(
				"피해를 %d 줍니다." % int(card.get("value", 11)),
				"피해를 %d씩 %d번 줍니다." % [int(card.get("value", 11)), hits]
			)
			description += "\n재련됨 (%d회)." % completed_forges.size()
		description += "\n재련 x%d: [공격]" % maxi(0, 99 - completed_forges.size())
	elif bool(card.get("forged", false)):
		if effect == "double_hit":
			description = description.replace("1[2]번", "2번")
			description = description.replace("[한 번 더 공격합니다.]", "한 번 더 공격합니다.")
		elif effect == "spinning_slash":
			description = description.replace("[모든 적을 공격합니다.]", "모든 적을 공격합니다.")
		elif effect == "exchange":
			description = description.replace("\n[밑패와 비용을 교환합니다.]", "").replace("[밑패와 비용을 교환합니다.]", "")
		if card.has("upgraded_value"):
			var base_value := int(card.get("value", 0))
			var forged_value := int(card.get("upgraded_value", base_value))
			description = description.replace("%d[%d]" % [base_value, forged_value], str(forged_value))
	description = _star_gain_description(card, description)
	if use_battle_context:
		# File/hand cards show ordinary damage. Enemy-specific mitigation belongs
		# only to the temporary drag preview built while pointing at that enemy.
		var preview_state: Dictionary = battle_state.duplicate()
		preview_state.erase("preview_target_enemy_index")
		description = BattleCardPreview.describe(card, description, preview_state)
	if bool(card.get("token", false)) and not description.contains("토큰."):
		description += "\n토큰."
	if CardStickers.retains_card(card) and not description.contains("보존."):
		description += " 보존."
	return _add_rule_marker(card, _append_forge_description(card, description))


static func _append_forge_description(card: Dictionary, description: String) -> String:
	var effect := str(card.get("effect", ""))
	if effect in ["obsidian_dagger", "astronomy_research", "necromancy_research", "mass_deal"]:
		return description
	if bool(card.get("forged", false)):
		var condition := RegEx.new()
		condition.compile("\\n?재련:.*$")
		return condition.sub(description, "") + "\n재련됨."
	if description.contains("재련:"):
		return description
	var requirement := ""
	if card.has("forge_cost"):
		requirement = "%d코스트" % int(card["forge_cost"])
	elif card.has("forge_costs"):
		var costs: Array[String] = []
		for cost in card["forge_costs"]:
			costs.append(str(cost))
		requirement = " 또는 ".join(costs) + "코스트"
	elif card.has("forge_target_name"):
		requirement = str(card["forge_target_name"])
	elif bool(card.get("forge_any", false)):
		requirement = "아무거나"
	return description if requirement.is_empty() else description + "\n재련: [%s]" % requirement


static func _star_gain_description(card: Dictionary, fallback: String) -> String:
	var effect := str(card.get("effect", ""))
	var amount := maxi(0, int(card.get("value", 0)))
	var stars := "★".repeat(amount)
	var draw_count := maxi(0, int(card.get("draw", 0)))
	match effect:
		"ruler_compass":
			var ruler_text := "피해를 %d 줍니다.\n★을 얻습니다." % int(card.get("value", 0))
			if draw_count > 0:
				ruler_text += "\n카드를 %d장 뽑습니다." % draw_count
			return ruler_text
		"battle_plan":
			var parts := PackedStringArray()
			if amount > 0:
				parts.append("%s을 얻습니다." % stars)
			if draw_count > 0:
				parts.append("카드를 %d장 뽑습니다." % draw_count)
			return "\n".join(parts)
		"nebula":
			return "광채 1장을 얻습니다.\n★★을 얻습니다."
		"starlight":
			return "%s을 얻습니다." % stars
		"star_guard", "star_ark":
			return fallback.replace("★를 1 얻습니다", "★을 얻습니다")
		"super_strategist":
			var parts := PackedStringArray()
			if amount > 0:
				parts.append("%s을 얻습니다." % stars)
			if draw_count > 0:
				parts.append("카드를 %d장 뽑습니다." % draw_count)
			if bool(card.get("exhaust", false)):
				parts.append("소멸.")
			return "\n".join(parts)
		"aries":
			return "에너지를 5 얻습니다.\n★★★★★을 얻습니다." + ("\n소멸." if bool(card.get("exhaust", false)) else "")
	return fallback


static func _add_rule_marker(card: Dictionary, description: String) -> String:
	if not bool(card.get("rule", false)) or description.contains("룰."):
		return description
	var marker := "룰.\u00a0"
	if str(card.get("effect", "")) in ["mass_deal", "evolution_theory", "sturdy_stance", "steel_storm"]:
		var split_at := description.find("\n")
		if split_at >= 0:
			return description.substr(0, split_at + 1) + marker + description.substr(split_at + 1)
	return marker + description
