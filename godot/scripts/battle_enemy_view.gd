extends RefCounted

const Portrait = preload("res://scripts/battle_enemy_portrait.gd")
const Intent = preload("res://scripts/battle_enemy_intent.gd")
const BattleHPBar = preload("res://scripts/battle_hp_bar.gd")
const BattleIndicatorBadge = preload("res://scripts/battle_indicator_badge.gd")


static func populate(target: Button, enemy: Dictionary, state: Dictionary, statuses: Array,
		selected: Callable, _trait_text: String, _crowded: bool, _choosing_target: bool) -> void:
	target.custom_minimum_size = Vector2(176, 232)
	target.focus_mode = Control.FOCUS_NONE
	target.pressed.connect(func() -> void:
		if not target.has_method("enemy_click_is_inside") or target.call("enemy_click_is_inside"):
			selected.call())
	for mode in ["normal", "hover", "pressed", "disabled"]:
		var style := StyleBoxFlat.new()
		style.bg_color = Color.TRANSPARENT
		style.border_color = Color.TRANSPARENT
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
	contents.custom_minimum_size.x = 140
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
	target.set_meta("enemy_portrait", portrait)
	var intent_row := HBoxContainer.new()
	intent_row.name = "EnemyIntentRow"
	intent_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	intent_row.alignment = BoxContainer.ALIGNMENT_CENTER
	intent_row.add_theme_constant_override("separation", 4)
	portrait.add_child(intent_row)
	var intent = Intent.new()
	intent.portrait_scale = 0.82 if portrait.enemy_variant == "rat" else 0.88 if portrait.enemy_variant == "goblin" else 1.0
	intent.configure(enemy, state)
	intent.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	intent_row.add_child(intent)
	_spacer(contents, 5)
	var title := _label(str(enemy.get("name", "적")), 14)
	title.name = "EnemyName"
	title.clip_text = true
	contents.add_child(title)
	_spacer(contents, 7)
	var hp_center := CenterContainer.new()
	hp_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	contents.add_child(hp_center)
	var hp := ProgressBar.new()
	hp.name = "EnemyHP"
	hp.custom_minimum_size = Vector2(140, 28)
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
	var badges := HFlowContainer.new()
	badges.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badges.alignment = FlowContainer.ALIGNMENT_CENTER
	badges.add_theme_constant_override("h_separation", 2)
	contents.add_child(badges)
	target.set_meta("status_badges", badges)
	refresh_statuses(target, statuses)
	if intent.secondary != "":
		var tag_center := CenterContainer.new()
		tag_center.name = "EnemyIntentDescription"
		tag_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
		tag_center.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		intent_row.add_child(tag_center)
		var tag := PanelContainer.new()
		tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var tag_style := StyleBoxFlat.new()
		tag_style.bg_color = Color("#43294f")
		tag_style.border_color = Color("#9870b2")
		tag_style.set_border_width_all(1)
		tag_style.set_corner_radius_all(2)
		tag_style.content_margin_left = 8
		tag_style.content_margin_right = 8
		tag_style.content_margin_top = 5
		tag_style.content_margin_bottom = 5
		tag.add_theme_stylebox_override("panel", tag_style)
		var description := _label(intent.secondary, 14, Color.WHITE)
		target.set_meta("intent_description_label", description)
		description.autowrap_mode = TextServer.AUTOWRAP_OFF
		var font: Font
		var web_font := FontVariation.new()
		web_font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
		web_font.variation_opentype = {
			TextServerManager.get_primary_interface().name_to_tag("wght"): 700.0
		}
		font = web_font
		description.add_theme_font_override("font", web_font)
		description.custom_minimum_size.x = font.get_string_size(intent.secondary, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
		tag.add_child(description)
		tag_center.add_child(tag)
	var place_intent := func() -> void:
		intent_row.size = intent_row.get_combined_minimum_size()
		var factor := minf(1.0, 192.0 / maxf(1.0, intent_row.size.x))
		intent_row.scale = Vector2.ONE * factor
		intent_row.position = Vector2((portrait.size.x - intent_row.size.x * factor) * 0.5,
			-8.0 - intent_row.size.y * factor)
	portrait.resized.connect(place_intent)
	intent_row.minimum_size_changed.connect(place_intent, CONNECT_DEFERRED)
	place_intent.call_deferred()
	if int(enemy.get("hp", 0)) <= 0:
		target.modulate.a = 0.42


static func refresh_statuses(target: Control, statuses: Array) -> void:
	var badges = target.get_meta("status_badges", null)
	if not is_instance_valid(badges):
		return
	for child in badges.get_children():
		badges.remove_child(child)
		child.queue_free()
	badges.visible = not statuses.is_empty()
	for status in statuses:
		badges.add_child(BattleIndicatorBadge.create(status, 11))


static func consume_effect_description(target: Control, message: String, finished: bool) -> void:
	var label = target.get_meta("intent_description_label", null) if target.has_meta("intent_description_label") else null
	if not is_instance_valid(label):
		return
	var remaining: Array[String] = []
	for part in str(label.text).split(" · ", false):
		var normalized := str(part).replace(" 획득", "").replace(" 부여", "").replace(" 회복", "").replace(" ", "")
		var performed := message.replace("+", "").replace(" ", "")
		if performed.contains(normalized) or (str(part).begins_with("버리기") and message.contains("버림")):
			continue
		remaining.append(part)
	var text := "" if finished else " · ".join(remaining)
	set_effect_description(target, text)


static func set_effect_description(target: Control, text: String) -> void:
	target.set_meta("remaining_intent_description", text)
	var label = target.get_meta("intent_description_label", null) if target.has_meta("intent_description_label") else null
	if not is_instance_valid(label):
		return
	label.text = text
	label.custom_minimum_size.x = label.get_theme_font("font").get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
	label.get_parent().get_parent().visible = not text.is_empty()


static func set_consumed_attack_hits(target: Control, count: int) -> void:
	target.set_meta("consumed_attack_hits", count)
	var row := target.find_child("EnemyIntentRow", true, false)
	if is_instance_valid(row):
		row.get_child(0).set_consumed_hits(count)


static func consume_intent(target: Control, attack_done: bool, effects_done: bool) -> void:
	target.set_meta("attack_done", bool(target.get_meta("attack_done", false)) or attack_done)
	target.set_meta("effects_done", bool(target.get_meta("effects_done", false)) or effects_done)
	var row := target.find_child("EnemyIntentRow", true, false)
	if not is_instance_valid(row):
		return
	if bool(target.get_meta("attack_done", false)):
		row.get_child(0).hide()
	var description := row.get_node_or_null("EnemyIntentDescription")
	if bool(target.get_meta("effects_done", false)) and is_instance_valid(description):
		description.hide()


static func set_display_hp(target: Control, value: int, animate: bool = true) -> void:
	if not is_instance_valid(target):
		return
	var hp := target.get_meta("enemy_hp_bar", null) as ProgressBar
	var hp_text := target.get_meta("enemy_hp_text", null) as Label
	if not is_instance_valid(hp) or not is_instance_valid(hp_text):
		return
	BattleHPBar.set_display_hp(hp, hp_text, value, animate)


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
