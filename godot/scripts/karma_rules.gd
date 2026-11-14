extends RefCounted

const FIRST_WIN := 12


static func stage_for_wins(wins: int) -> int:
	return maxi(0, maxi(0, wins) - FIRST_WIN + 1)


static func description(stage: int) -> String:
	return "적이 힘을 %d 얻고 최대 체력이 %d%% 증가합니다. 전투에서 승리할 때마다 1단계 올라가며 포탈을 타면 사라집니다." % [stage, stage * 10]


static func apply_to_enemy(enemy: Dictionary, stage: int) -> Dictionary:
	var next: Dictionary = enemy.duplicate(true)
	var safe_stage := maxi(0, stage)
	if safe_stage == 0:
		return next
	next["karma_stage"] = safe_stage
	next["strength"] = int(next.get("strength", 0)) + safe_stage
	var current_hp := int(next.get("hp", 0))
	var current_max_hp := int(next.get("max_hp", current_hp))
	var multiplier := float(10 + safe_stage) / 10.0
	next["hp"] = floori(float(current_hp) * multiplier)
	next["max_hp"] = floori(float(current_max_hp) * multiplier)
	return next
