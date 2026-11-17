extends RefCounted
class_name PortBattleCardPreview

const BattleRules = preload("res://scripts/battle_rules.gd")

const ATTACK_EFFECTS := [
	"radiance", "sweep", "double_hit", "iron_rampage", "magic_strike", "shockwave", "meteor", "hydra",
]
const DEFENSE_EFFECTS := [
	"defend", "scale_armor", "deflect", "star_guard",
	"iron_wave", "iron_song", "water_wave", "iron_rampage",
	"suppression",
]
const FIXED_DEFENSE_VALUES := {
	"iron_wave": 5,
	"iron_song": 5,
	"water_wave": 5,
	"iron_rampage": 8,
}


static func describe(card: Dictionary, source: String, state: Dictionary) -> String:
	var result := source
	var effect := str(card.get("effect", ""))
	if (str(card.get("kind", "")) == "strike" or ATTACK_EFFECTS.has(effect)) and result.contains("피해를"):
		result = _preview_attack_text(card, result, state)
	if (DEFENSE_EFFECTS.has(effect) or bool(card.get("grants_block", false))) and result.contains("방어"):
		result = _preview_defense_text(card, result, state)
	return result


static func _preview_attack_text(card: Dictionary, source: String, state: Dictionary) -> String:
	var damage := _damage_per_hit(card, state)
	var pattern := RegEx.new()
	pattern.compile("피해를\\s*\\d+")
	return pattern.sub(source, "피해를 %d" % damage, false)


static func _damage_per_hit(card: Dictionary, state: Dictionary) -> int:
	var effect := str(card.get("effect", ""))
	var base_damage := int(card.get("value", 0))
	if effect == "radiance":
		base_damage = 4 + maxi(0, int(state.get("radiance_played_this_turn", 0))) * 4 + (3 if state.get("deck_editions", []).has("sharpLight") else 0)
	var strength := int(state.get("strength", 0))
	strength += BattleRules.hand_manual_bonus(state)
	var selected_index := int(state.get("preview_target_enemy_index", -1))
	var enemies: Array = state.get("enemies", [])
	var vulnerable := 0
	if selected_index >= 0 and selected_index < enemies.size():
		var target: Dictionary = enemies[selected_index]
		vulnerable = int(target.get("vulnerable", 0))
	var raw_damage := base_damage + strength
	return BattleRules._calculate_attack_damage(
		raw_damage,
		maxi(0, int(state.get("player_weak", 0)) - int(card.get("remove_player_debuffs", {}).get("weak", 0))),
		vulnerable
	)


static func _preview_defense_text(card: Dictionary, source: String, state: Dictionary) -> String:
	var effect := str(card.get("effect", ""))
	var base_value := int(FIXED_DEFENSE_VALUES.get(effect, card.get("value", 0)))
	if not bool(card.get("grants_block", false)) and not FIXED_DEFENSE_VALUES.has(effect) and effect not in [
		"defend", "scale_armor", "deflect", "star_guard",
	]:
		return source
	var multiplier := float(state.get("defense_multiplier", 1.0))
	var agility := int(state.get("agility", 0)) + BattleRules.hand_manual_bonus(state)
	var defense := int(floor(float(base_value + agility) * multiplier))
	var pattern := RegEx.new()
	pattern.compile("(방어를)\\s*\\d+")
	var matches := pattern.search_all(source)
	if matches.is_empty():
		return source
	var result := source
	for match_index in range(matches.size() - 1, -1, -1):
		var matched: RegExMatch = matches[match_index]
		var prefix := str(matched.get_string(1))
		result = result.substr(0, matched.get_start()) + prefix + " " + str(defense) + result.substr(matched.get_end())
	return result
