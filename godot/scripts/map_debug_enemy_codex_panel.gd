extends PanelContainer
class_name MapDebugEnemyCodexPanel

const EnemyCodexData = preload("res://scripts/map_debug_enemy_codex.gd")

var _entries: Array = []
var _anchor_rect := Rect2()
var _built := false
var _list: VBoxContainer
var _scroll: ScrollContainer


func configure(entries: Array, anchor_global_rect: Rect2 = Rect2()) -> void:
	_entries = entries.duplicate(true)
	_anchor_rect = anchor_global_rect
	if is_inside_tree():
		_build()
		_populate_entries()
		_layout_and_position()


func configure_from_catalog(anchor_global_rect: Rect2 = Rect2()) -> void:
	configure(EnemyCodexData.get_entries(), anchor_global_rect)


func anchor_to(anchor_global_rect: Rect2) -> void:
	_anchor_rect = anchor_global_rect
	_layout_and_position()


func _ready() -> void:
	z_index = 90
	mouse_filter = Control.MOUSE_FILTER_STOP
	get_viewport().size_changed.connect(_layout_and_position)
	_build()
	_layout_and_position()


func _build() -> void:
	if _built:
		return
	add_theme_stylebox_override("panel", _panel_style())
	var inner := MarginContainer.new()
	inner.name = "CodexPanelPadding"
	inner.add_theme_constant_override("margin_left", 10)
	inner.add_theme_constant_override("margin_right", 10)
	inner.add_theme_constant_override("margin_top", 10)
	inner.add_theme_constant_override("margin_bottom", 10)
	add_child(inner)
	_scroll = ScrollContainer.new()
	_scroll.name = "CodexScroll"
	_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	inner.add_child(_scroll)
	_list = VBoxContainer.new()
	_list.name = "CodexEntries"
	_list.add_theme_constant_override("separation", 8)
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_scroll.add_child(_list)
	_built = true
	_populate_entries()


func _populate_entries() -> void:
	if _list == null:
		return
	for old_child in _list.get_children():
		_list.remove_child(old_child)
		old_child.queue_free()
	for entry in _entries:
		if entry is Dictionary:
			var card := _entry_card(entry)
			card.name = "Encounter_%03d" % int(entry.get("encounter_index", 0))
			_list.add_child(card)


func _layout_and_position() -> void:
	if not is_inside_tree():
		return
	var viewport_size := get_viewport_rect().size
	var panel_width := maxf(0.0, minf(650.0, viewport_size.x - 36.0))
	var panel_height := maxf(0.0, minf(720.0, viewport_size.y * 0.72))
	custom_minimum_size = Vector2(panel_width, panel_height)
	size = Vector2(panel_width, panel_height)
	if _scroll != null:
		_scroll.custom_minimum_size = Vector2(maxf(0.0, panel_width - 22.0), maxf(0.0, panel_height - 22.0))
	if not _anchor_rect.has_area():
		return
	var parent_control := get_parent_control()
	var local_anchor := _anchor_rect
	if parent_control != null:
		var inverse := parent_control.get_global_transform_with_canvas().affine_inverse()
		local_anchor = Rect2(inverse * _anchor_rect.position, _anchor_rect.size)
	position = Vector2(local_anchor.end.x - panel_width, local_anchor.end.y + 6.0)


func _entry_card(entry: Dictionary) -> PanelContainer:
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _entry_style())
	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 0)
	card.add_child(body)

	var header := HBoxContainer.new()
	header.name = "EncounterHeader"
	header.add_theme_constant_override("separation", 14)
	var title := _label(str(entry.get("label", "적")), 14, true, Color("#fff2bd"))
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	var regions: Array = entry.get("regions", [])
	var region_text := "%s지역" % ", ".join(regions.map(func(region): return str(region))) if not regions.is_empty() else "현재 미출현"
	var region_label := _label(region_text, 12, true, Color("#a9d9c8"))
	region_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	region_label.custom_minimum_size.x = region_label.get_minimum_size().x
	region_label.size_flags_horizontal = Control.SIZE_SHRINK_END
	header.add_child(region_label)
	body.add_child(header)

	var enemies: Array = entry.get("enemies", [])
	for member_index in range(enemies.size()):
		var member: Variant = enemies[member_index]
		if not member is Dictionary:
			continue
		if member_index > 0:
			var member_rule := HSeparator.new()
			member_rule.add_theme_stylebox_override("separator", _member_separator_style())
			member_rule.custom_minimum_size.y = 20
			body.add_child(member_rule)
		body.add_child(_member_content(member, enemies.size() > 1))
	return card


func _member_content(member: Dictionary, show_member_name: bool) -> VBoxContainer:
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 3)
	var enemy: Dictionary = member.get("enemy", {})
	if show_member_name:
		var count := int(member.get("count", 1))
		var member_name := str(enemy.get("name", "적"))
		if count > 1:
			member_name += " × %d" % count
		var name_label := _label(member_name, 12, true, Color("#f2f2f2"))
		content.add_child(name_label)

	var max_hp := int(enemy.get("maxHp", enemy.get("max_hp", enemy.get("hp", 0))))
	var hp_min := int(member.get("hp_min", max_hp))
	var hp_max := int(member.get("hp_max", max_hp))
	var hp_text := str(hp_min) if hp_min == hp_max else "%d~%d" % [hp_min, hp_max]
	var stats := "체력 %s · 힘 %s · 방어 %s" % [
		hp_text,
		str(enemy.get("strength", 0)),
		str(enemy.get("physical_block", enemy.get("physicalBlock", enemy.get("block", 0)))),
	]
	content.add_child(_label(stats, 12, false, Color("#eeeeee")))

	var passive := _passive_status_text(enemy)
	if not passive.is_empty():
		content.add_child(_label(passive, 12, false, Color("#eeeeee")))
	var trait_text: Variant = enemy.get("trait", "")
	if trait_text is String and not trait_text.is_empty():
		content.add_child(_trait_label("특성: " + trait_text))

	var actions: Array = enemy.get("actions", [])
	content.add_child(_label("패턴: " + pattern_text(actions), 12, true, Color("#b8d5ee")))
	var opening_index: Variant = enemy.get("opening_intent_index", enemy.get("opening_action_index", enemy.get("openingIntentIndex", null)))
	if opening_index is int and int(opening_index) >= 0 and int(opening_index) < actions.size():
		var opening_action: Dictionary = actions[int(opening_index)] if actions[int(opening_index)] is Dictionary else {}
		content.add_child(_label("첫 행동 고정: " + str(opening_action.get("name", "행동")), 12, false, Color("#eeeeee")))

	var list := VBoxContainer.new()
	list.name = "ActionList"
	list.add_theme_constant_override("separation", 3)
	for action_index in range(actions.size()):
		var action: Variant = actions[action_index]
		if action is Dictionary:
			list.add_child(_action_row(action_index, action))
	var list_margin := MarginContainer.new()
	list_margin.add_theme_constant_override("margin_top", 5)
	list_margin.add_child(list)
	content.add_child(list_margin)
	return content


func _action_row(action_index: int, action: Dictionary) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 7)
	var marker := _label("%d." % (action_index + 1), 12, false, Color("#d5d8da"))
	marker.custom_minimum_size.x = 16
	row.add_child(marker)
	var name := _label(str(action.get("name", "행동")), 12, true, Color("#f2f2f2"))
	name.custom_minimum_size.x = 84
	name.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	row.add_child(name)
	var detail := _label(action_text(action), 12, false, Color("#d5d8da"))
	detail.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	row.add_child(detail)
	return row


static func passive_status_text(enemy: Dictionary) -> String:
	return _passive_status_text(enemy)


static func _passive_status_text(enemy: Dictionary) -> String:
	var parts: Array[String] = []
	var boon := int(_alias(enemy, "boon", "boon", 0))
	var berserk := int(_alias(enemy, "berserk", "berserk", 0))
	var thorns := int(_alias(enemy, "thorns", "thorns", 0))
	var sturdy := int(_alias(enemy, "sturdy_threshold", "sturdyThreshold", 0))
	var quickness := bool(_alias(enemy, "quickness_ready", "quicknessReady", false))
	var next_magic := bool(_alias(enemy, "next_attack_magic", "nextAttackMagic", false))
	if boon:
		parts.append("가호 %d" % boon)
	if berserk:
		parts.append("광폭화 %d" % berserk)
	if thorns:
		parts.append("가시 %d" % thorns)
	if sturdy > 0:
		parts.append("단단함 %d" % sturdy)
	if quickness:
		parts.append("재빠름 준비")
	if next_magic:
		parts.append("첫 공격 마법화")
	return " · ".join(parts)


static func pattern_text(actions: Array) -> String:
	if actions.size() <= 1:
		return "고정 반복"
	for action in actions:
		if action is Dictionary and action.has("loop_to"):
			return "처음부터 진행 후 %d번 행동부터 반복" % (int(action["loop_to"]) + 1)
		if action is Dictionary and action.has("loopTo"):
			return "처음부터 진행 후 %d번 행동부터 반복" % (int(action["loopTo"]) + 1)
	if _all_action_flag(actions, "cycle"):
		return "순서대로 반복"
	if _all_action_flag(actions, "random_each_turn", "randomEachTurn"):
		return "매 턴 무작위"
	if _all_action_flag(actions, "random_no_repeat", "randomNoRepeat"):
		return "직전 행동을 제외하고 무작위"
	return "직전 행동을 제외하고 무작위"


static func action_text(action: Dictionary) -> String:
	var parts: Array[String] = []
	if action.get("attacks", null) is Array:
		for hit in action["attacks"]:
			if not hit is Dictionary:
				continue
			parts.append(_hit_text(hit))
	elif action.has("damage"):
		parts.append(_hit_text({
			"type": action.get("damage_type", action.get("damageType", "physical")),
			"value": action.get("damage", 0),
			"hits": action.get("hits", 1),
		}))

	_append_positive(parts, action, "heal_gain", "healGain", "체력 %d 회복")
	_append_positive(parts, action, "strength_gain", "strengthGain", "힘 %d 획득")
	_append_positive(parts, action, "block_gain", "blockGain", "방어 %d 획득")
	_append_positive(parts, action, "boon_gain", "boonGain", "가호 %d 획득")
	_append_positive(parts, action, "strength_loss", "strengthLoss", "플레이어 힘 %d 감소")
	_append_positive(parts, action, "agility_loss", "agilityLoss", "플레이어 강인함 %d 감소")
	_append_positive(parts, action, "soil_count", "soilCount", "모든 파일에 흙 %d장 놓음")
	if bool(_alias(action, "next_attack_magic", "nextAttackMagic", false)):
		parts.append("다음 공격 마법화")
	_append_status(parts, action, "resistance_gain", "resistanceGain", "resistance", true)
	_append_status(parts, action, "amplification_gain", "amplificationGain", "amplification", true)
	_append_status(parts, action, "next_turn_player_resistance_change", "nextTurnPlayerResistanceChange", "resistance", false, "다음 턴 ")
	_append_status(parts, action, "next_turn_player_amplification_change", "nextTurnPlayerAmplificationChange", "amplification", false, "다음 턴 ")
	_append_positive(parts, action, "discard_count", "discardCount", "버리기 %d")
	if bool(_alias(action, "self_destruct", "selfDestruct", false)):
		parts.append("자폭")
	var summon: Variant = _alias(action, "summon", "summon", null)
	if summon != null and not str(summon).is_empty():
		parts.append("새끼 바퀴 1마리 소환 (최대 2마리, HP 12, 공격 4)")
	_append_positive(parts, action, "powder_gain", "powderGain", "화약 %d 증가")
	_append_positive(parts, action, "ally_block_gain", "allyBlockGain", "다른 아군에게 방어 %d")
	var preview: Variant = _alias(action, "preview", "preview", "")
	if preview is String and not preview.is_empty():
		parts.append(preview)
	return " · ".join(parts) if not parts.is_empty() else "대기"


static func _hit_text(hit: Dictionary) -> String:
	var damage_type := "마법 피해" if str(hit.get("type", "physical")) == "magic" else "물리 피해"
	var value := str(hit.get("value", 0))
	var hits := int(hit.get("hits", 1))
	return "%s %s%s" % [damage_type, value, " × %d" % hits if hits > 1 else ""]


static func _append_positive(parts: Array[String], data: Dictionary, native_key: String, web_key: String, format: String) -> void:
	var value := int(_alias(data, native_key, web_key, 0))
	if value:
		parts.append(format % value)


static func _append_status(parts: Array[String], data: Dictionary, native_key: String, web_key: String, kind: String, gained: bool, prefix: String = "") -> void:
	var value := int(_alias(data, native_key, web_key, 0))
	if not value:
		return
	var label := "저항" if kind == "resistance" and value >= 0 else "취약" if kind == "resistance" else "증폭" if value >= 0 else "약화"
	var text := "%s %d" % [label, absi(value)]
	if gained:
		text += " 획득"
	parts.append(prefix + text)


static func _all_action_flag(actions: Array, native_key: String, web_key: String = "") -> bool:
	for action in actions:
		if not action is Dictionary:
			return false
		if not bool(action.get(native_key, action.get(web_key, false))):
			return false
	return true


static func _alias(data: Dictionary, native_key: String, web_key: String, default_value: Variant) -> Variant:
	return data.get(native_key, data.get(web_key, default_value))


func _trait_label(text: String) -> RichTextLabel:
	var label := RichTextLabel.new()
	label.bbcode_enabled = true
	label.fit_content = true
	label.scroll_active = false
	label.selection_enabled = false
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.add_theme_font_override("normal_font", _font(false))
	label.add_theme_font_override("bold_font", _font(true))
	label.add_theme_font_size_override("normal_font_size", 12)
	label.add_theme_font_size_override("bold_font_size", 12)
	label.add_theme_color_override("default_color", Color("#d7c48d"))
	label.text = _rarity_bbcode(text)
	return label


static func _rarity_bbcode(text: String) -> String:
	var regex := RegEx.new()
	regex.compile("(?<![가-힣])(상태|시작|일반|특별|희귀|전설)(?=\\s*(?:카드|슬롯|등급|이하|이상|[·ㆍ/]))")
	var colors := {
		"상태": "#e34b58",
		"시작": "#555b60",
		"일반": "#756a60",
		"특별": "#3472a2",
		"희귀": "#7138a6",
		"전설": "#d5a928",
	}
	var output := ""
	var cursor := 0
	for result in regex.search_all(text):
		output += _escape_bbcode(text.substr(cursor, result.get_start() - cursor))
		var word := result.get_string()
		output += "[b][color=%s]%s[/color][/b]" % [colors.get(word, "#d7c48d"), _escape_bbcode(word)]
		cursor = result.get_end()
	output += _escape_bbcode(text.substr(cursor))
	return output


static func _escape_bbcode(text: String) -> String:
	var escaped := ""
	for index in text.length():
		var character := text.substr(index, 1)
		escaped += "[lb]" if character == "[" else "[rb]" if character == "]" else character
	return escaped


func _label(text: String, size: int, bold: bool, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_override("font", _font(bold))
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label


func _font(bold: bool) -> Font:
	var web_font := FontVariation.new()
	web_font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
	web_font.variation_opentype = {
		TextServerManager.get_primary_interface().name_to_tag("wght"): 700.0 if bold else 400.0
	}
	return web_font


func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(14.0 / 255.0, 16.0 / 255.0, 17.0 / 255.0, 0.98)
	style.border_color = Color("#777777")
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	style.content_margin_left = 0
	style.content_margin_right = 0
	style.content_margin_top = 0
	style.content_margin_bottom = 0
	style.shadow_color = Color(0, 0, 0, 0.62)
	style.shadow_size = 26
	style.shadow_offset = Vector2(0, 8)
	return style


func _entry_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#25292a")
	style.border_color = Color("#4b5052")
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 9
	style.content_margin_bottom = 9
	return style


func _member_separator_style() -> StyleBoxLine:
	var style := StyleBoxLine.new()
	style.color = Color("#4b5052")
	style.thickness = 1
	return style
