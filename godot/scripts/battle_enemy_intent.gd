extends Control

var damage := 0
var hits := 1
var secondary := ""
var portrait_scale := 1.0
var intent_font: Font


func configure(enemy: Dictionary, state: Dictionary) -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var web_font := FontVariation.new()
	web_font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
	web_font.variation_opentype = {
		TextServerManager.get_primary_interface().name_to_tag("wght"): 800.0
	}
	intent_font = web_font
	var actions: Array = enemy.get("actions", [])
	var action: Dictionary = actions[clampi(int(enemy.get("action_index", 0)), 0, actions.size() - 1)] if not actions.is_empty() else {}
	hits = maxi(1, int(action.get("hits", 1)))
	damage = int(state.get("enemy_attack", 0)) / hits if action.has("damage") else 0
	secondary = description(action, enemy)
	var width := float(hits * 46 + (20 if secondary != "" else 0)) if damage > 0 else 24.0
	custom_minimum_size = Vector2(width, 65) * portrait_scale
	size = custom_minimum_size
	queue_redraw()


static func description(action: Dictionary, enemy: Dictionary) -> String:
	if bool(enemy.get("stunned", false)):
		return "행동 취소"
	var parts: Array[String] = []
	var formats := {
		"strength_gain": "힘 %d 획득", "boon_gain": "가호 %d 획득", "block_gain": "방어 %d 획득",
		"heal_gain": "체력 %d 회복", "strength_loss": "플레이어 힘 %d 감소", "agility_loss": "플레이어 강인함 %d 감소",
		"weak_gain": "약화 %d", "vulnerable_gain": "취약 %d", "powder_gain": "화약 %d 획득",
		"soil_count": "모든 파일에 흙 %d장", "rock_count": "모든 파일에 바위 %d장", "discard_count": "버리기 %d",
	}
	for key in formats:
		var count := int(action.get(key, 0))
		if key == "rock_count" and not bool(enemy.get("first_action_completed", false)):
			count = int(action.get("first_action_rock_count", count))
		if count != 0:
			parts.append(str(formats[key]) % count)
	for kind in ["weak", "vulnerable", "corrosion", "paralysis", "confusion"]:
		var amount := int(action.get("player_" + kind + "_gain", action.get("next_turn_player_" + kind + "_gain", 0)))
		if amount > 0:
			var label: String = preload("res://scripts/battle_status_rules.gd").LABELS[kind]
			parts.append("%s %d 부여" % [label, amount])
	if action.has("summon"): parts.append(preload("res://scripts/enemy_catalog.gd").roach_summon_description())
	if bool(action.get("self_destruct", false)): parts.append("자폭")
	if action.has("preview"): parts.append(str(action["preview"]))
	return " · ".join(parts)


func _draw() -> void:
	draw_set_transform(Vector2.ZERO, 0, Vector2.ONE * portrait_scale)
	if damage > 0:
		for index in range(hits):
			var origin := Vector2(float(index) * 46, 0)
			var blade := PackedVector2Array([
				Vector2(22, 0), Vector2(40, 11), Vector2(33, 41),
				Vector2(44, 41), Vector2(44, 49), Vector2(27, 49),
				Vector2(27, 60), Vector2(17, 60), Vector2(17, 49),
				Vector2(0, 49), Vector2(0, 41), Vector2(11, 41), Vector2(4, 11),
			])
			for point in range(blade.size()): blade[point] += origin
			draw_colored_polygon(blade, Color("#e87e22"))
			draw_string(intent_font, origin + Vector2(0, 35), str(damage), HORIZONTAL_ALIGNMENT_CENTER, 44, 25, Color.WHITE)
	if secondary != "":
		draw_string(intent_font, Vector2(float(hits * 46) if damage > 0 else 0.0, 39), "*", HORIZONTAL_ALIGNMENT_CENTER, 24, 42, Color("#a23fc4"))
