extends RefCounted
class_name PortBattleCardPreview

const BattleRules = preload("res://scripts/battle_rules.gd")

const ATTACK_EFFECTS := [
	"radiance", "sweep", "double_hit", "iron_rampage", "magic_strike", "shockwave", "meteor", "hydra",
]
const DEFENSE_EFFECTS := [
	"defend", "scale_armor", "deflect", "ice_shield", "star_guard", "plate_armor_defense", "sturdy_stance",
	"iron_wave", "iron_song", "steel_storm", "at_field", "water_wave", "iron_rampage", "star_ark",
	"odin_spear", "silver_sword", "suppression",
]
const FIXED_DEFENSE_VALUES := {
	"iron_wave": 5,
	"iron_song": 5,
	"steel_storm": 12,
	"at_field": 13,
	"water_wave": 5,
	"iron_rampage": 8,
	"star_ark": 10,
	"odin_spear": 15,
	"silver_sword": 5,
}


static func describe(card: Dictionary, source: String, state: Dictionary) -> String:
	var result := source
	var effect := str(card.get("effect", ""))
	if (str(card.get("kind", "")) == "strike" or ATTACK_EFFECTS.has(effect)) and result.contains("피해를"):
		result = _preview_attack_text(card, result, state)
	if DEFENSE_EFFECTS.has(effect) and result.contains("방어"):
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
		base_damage = 4 + maxi(0, int(state.get("radiance_played_this_turn", 0))) * 4
	var strength := int(state.get("strength", 0))
	var hand_bonus := 0
	for held_card in state.get("hand", []):
		if str(held_card.get("effect", "")) in ["combat_manual", "strategy_book"]:
			hand_bonus += int(held_card.get("value", 0))
	strength += hand_bonus
	var selected_index := int(state.get("preview_target_enemy_index", -1))
	var enemies: Array = state.get("enemies", [])
	var resistance := 0
	var resistance_effectiveness := 30
	if selected_index >= 0 and selected_index < enemies.size():
		var target: Dictionary = enemies[selected_index]
		resistance = int(target.get("resistance", 0))
		if resistance > 0:
			resistance_effectiveness = int(target.get("status_effectiveness", 30))
	var raw_damage := base_damage + strength
	return BattleRules._calculate_attack_damage(
		raw_damage,
		int(state.get("player_amplification", 0)),
		resistance,
		30,
		resistance_effectiveness
	)


static func _preview_defense_text(card: Dictionary, source: String, state: Dictionary) -> String:
	var effect := str(card.get("effect", ""))
	var base_value := int(FIXED_DEFENSE_VALUES.get(effect, card.get("value", 0)))
	if effect == "odin_spear":
		base_value = int(card.get("defense_value", 15))
	elif not FIXED_DEFENSE_VALUES.has(effect) and effect not in [
		"defend", "scale_armor", "deflect", "ice_shield", "star_guard", "plate_armor_defense", "sturdy_stance",
	]:
		return source
	var multiplier := float(state.get("defense_multiplier", 1.0))
	var agility := int(state.get("agility", 0))
	for held_card in state.get("hand", []):
		if str(held_card.get("effect", "")) in ["combat_manual", "strategy_book"]:
			agility += int(held_card.get("value", 0))
	var defense := int(floor(float(base_value + agility) * multiplier))
	if effect == "star_ark":
		var both_defenses := RegEx.new()
		both_defenses.compile("방어와 마법 방어를\\s*\\d+")
		return both_defenses.sub(source, "방어와 마법 방어를 %d" % defense, false)
	var pattern := RegEx.new()
	pattern.compile("(마법 방어를|방어를)\\s*\\d+")
	var matches := pattern.search_all(source)
	if matches.is_empty():
		return source
	var result := source
	for match_index in range(matches.size() - 1, -1, -1):
		var matched: RegExMatch = matches[match_index]
		var prefix := str(matched.get_string(1))
		result = result.substr(0, matched.get_start()) + prefix + " " + str(defense) + result.substr(matched.get_end())
	return result
