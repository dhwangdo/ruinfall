extends RefCounted

const KarmaRules = preload("res://scripts/karma_rules.gd")


static func prepare_encounter(encounter: Dictionary, karma_stage: int, lament_charges: int) -> Dictionary:
	# Catalog entries may contain one enemy directly or an array of enemies.
	var source: Array = encounter.get("enemies", [encounter])
	var enemies: Array = []
	for enemy in source:
		var prepared := KarmaRules.apply_to_enemy(enemy, karma_stage)
		if lament_charges > 0:
			prepared["hp"] = floori(float(prepared.get("hp", 0)) * 0.7)
			prepared["summon_hp_multiplier"] = 0.7
		enemies.append(prepared)
	return {
		"encounter": {"name": encounter.get("name", "적"), "enemies": enemies},
		"remaining_lament_charges": maxi(0, lament_charges - (1 if lament_charges > 0 else 0)),
	}
