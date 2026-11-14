extends RefCounted

const Portrait = preload("res://scripts/battle_enemy_portrait.gd")
const Intent = preload("res://scripts/battle_enemy_intent.gd")
const BattleHPBar = preload("res://scripts/battle_hp_bar.gd")


static func populate(target: Button, enemy: Dictionary, state: Dictionary, statuses: Array,
		selected: Callable, trait_text: String, crowded: bool, choosing_target: bool) -> void:
	target.custom_minimum_size = Vector2(210 if crowded else 230, 232)
	target.tooltip_text = trait_text
	target.focus_mode = Control.FOCUS_NONE
	target.pressed.connect(selected)
	for mode in ["normal", "hover", "pressed", "disabled"]:
		var style := StyleBoxFlat.new()
		style.bg_color = Color(1, 1, 1, 0.055 if mode == "hover" else 0.0)
		style.border_color = Color(1, 1, 1, 0.72 if choosing_target else 0.0)
		style.set_border_width_all(2)
		style.set_corner_radius_all(5)
		style.content_margin_left = 0
		style.content_margin_right = 0
		style.content_margin_top = 0
		style.content_margin_bottom = 0
		target.add_theme_stylebox_override(mode, style)
	var inset := MarginContainer.new()
	inset.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	inset.add_theme_constant_override("margin_left", 15)
	inset.add_theme_constant_override("margin_right", 15)
	inset.add_theme_constant_override("margin_top", 24)
	inset.add_theme_constant_override("margin_bottom", 10)
	inset.mouse_filter = Control.MOUSE_FILTER_IGNORE
	target.add_child(inset)
	var contents := VBoxContainer.new()
	contents.custom_minimum_size.x = 180 if crowded else 220
	contents.add_theme_constant_override("separation", 0)
	contents.mouse_filter = Control.MOUSE_FILTER_IGNORE
	inset.add_child(contents)
	var portrait_center := CenterContainer.new()
	portrait_center.custom_minimum_size.y = 75
	portrait_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	contents.add_child(portrait_center)
	var portrait = Portrait.new()
	portrait.custom_minimum_size = Vector2(70, 75)
	portrait.configure(enemy)
	portrait_center.add_child(portrait)
	var intent = Intent.new()
	intent.portrait_scale = 0.82 if portrait.enemy_variant == "rat" else 0.88 if portrait.enemy_variant == "goblin" else 1.0
	intent.configure(enemy, state)
	intent.position = Vector2(-50, -42) * intent.portrait_scale + (Vector2(70, 75) - Vector2(70, 75) * intent.portrait_scale) * 0.5
	portrait.add_child(intent)
	_spacer(contents, 5)
	var title := _label(str(enemy.get("name", "적")), 14)
	title.clip_text = true
	contents.add_child(title)
	_spacer(contents, 7)
	var hp_center := CenterContainer.new()
	hp_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	contents.add_child(hp_center)
	var hp := ProgressBar.new()
	hp.name = "EnemyHP"
	hp.custom_minimum_size = Vector2(160, 28)
	hp.show_percentage = false
	hp.max_value = maxi(1, int(enemy.get("max_hp", enemy.get("hp", 1))))
	hp.value = int(enemy.get("hp", 0))
	var hp_text := _label("%d / %d" % [int(enemy.get("hp", 0)), int(hp.max_value)], 16)
	hp_text.name = "EnemyHPText"
	BattleHPBar.apply_map_style(hp, hp_text)
	hp.add_child(hp_text)
	hp_center.add_child(hp)
	target.set_meta("enemy_hp_bar", hp)
	target.set_meta("enemy_hp_text", hp_text)
	if intent.secondary != "":
		_spacer(contents, 5)
		var tag_center := CenterContainer.new()
		tag_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
		contents.add_child(tag_center)
		var tag := PanelContainer.new()
		tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var tag_style := StyleBoxFlat.new()
		tag_style.bg_color = Color.WHITE
		tag_style.border_color = Color("#161616")
		tag_style.set_border_width_all(1)
		tag_style.set_corner_radius_all(2)
		tag_style.content_margin_left = 8
		tag_style.content_margin_right = 8
		tag_style.content_margin_top = 5
		tag_style.content_margin_bottom = 5
		tag.add_theme_stylebox_override("panel", tag_style)
		var description := _label(intent.secondary, 12, Color("#111111"))
		description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		var font: Font
		if OS.has_feature("web"):
			var web_font := FontVariation.new()
			web_font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
			web_font.variation_opentype = {
				TextServerManager.get_primary_interface().name_to_tag("wght"): 700.0
			}
			font = web_font
			description.add_theme_font_override("font", web_font)
		else:
			var native_font := SystemFont.new()
			native_font.font_names = PackedStringArray(["Malgun Gothic", "Arial"])
			font = native_font
		description.custom_minimum_size.x = minf(180, font.get_string_size(intent.secondary, HORIZONTAL_ALIGNMENT_LEFT, -1, 12).x)
		tag.add_child(description)
		tag_center.add_child(tag)
	if not statuses.is_empty():
		_spacer(contents, 6)
		var badges := HFlowContainer.new()
		badges.mouse_filter = Control.MOUSE_FILTER_IGNORE
		contents.add_child(badges)
		for status in statuses:
			var badge := PanelContainer.new()
			badge.tooltip_text = str(status.get("tooltip", ""))
			badge.mouse_filter = Control.MOUSE_FILTER_PASS
			var badge_style := StyleBoxFlat.new()
			badge_style.bg_color = Color("#704399") if bool(status.get("debuff", false)) else Color("#2f84b9")
			badge_style.set_corner_radius_all(3)
			badge_style.content_margin_left = 8
			badge_style.content_margin_right = 8
			badge_style.content_margin_top = 4
			badge_style.content_margin_bottom = 4
			badge.add_theme_stylebox_override("panel", badge_style)
			badge.add_child(_label(str(status.get("text", "")), 11))
			badges.add_child(badge)
	var prompt := _label("이 적에게 사용", 12)
	prompt.position = Vector2(15, 58)
	prompt.size = Vector2(200, 32)
	prompt.visible = choosing_target
	target.add_child(prompt)
	target.set("drag_prompt", prompt)
	if int(enemy.get("hp", 0)) <= 0:
		target.modulate.a = 0.42


static func set_display_hp(target: Control, value: int) -> void:
	if not is_instance_valid(target):
		return
	var hp := target.get_meta("enemy_hp_bar", null) as ProgressBar
	var hp_text := target.get_meta("enemy_hp_text", null) as Label
	if not is_instance_valid(hp) or not is_instance_valid(hp_text):
		return
	var displayed_hp := clampi(value, int(hp.min_value), int(hp.max_value))
	hp.value = displayed_hp
	hp_text.text = "%d / %d" % [displayed_hp, int(hp.max_value)]


static func _spacer(parent: Control, height: float) -> void:
	var spacer := Control.new()
	spacer.custom_minimum_size.y = height
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(spacer)


static func _label(text: String, size: int, color: Color = Color.WHITE) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label
