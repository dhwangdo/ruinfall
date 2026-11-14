extends PanelContainer

class_name PortCardMechanicPreview

const CardUse = preload("res://scripts/card_use.gd")

const CardCatalog = preload("res://scripts/card_catalog.gd")
const CardKeywords = preload("res://scripts/card_keywords.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const CARD_STACK_OFFSET := 24.0

class DemoCursor extends Control:
	func _init() -> void:
		custom_minimum_size = Vector2(32, 40)
		mouse_filter = Control.MOUSE_FILTER_IGNORE

	func _draw() -> void:
		var shape := PackedVector2Array([
			Vector2(3, 2), Vector2(3, 30), Vector2(10, 23),
			Vector2(16, 37), Vector2(22, 34), Vector2(16, 21), Vector2(27, 21),
		])
		draw_colored_polygon(shape, Color.WHITE)
		shape.append(shape[0])
		draw_polyline(shape, Color("#18231e"), 2.0, true)


var source_card: Dictionary = {}
var tooltip_theme: Theme
var full_card_builder: Callable = Callable()
var _missing_builder_reported := false
var modes: Array[String] = []
var mode_index := 0
var stage: Control
var moving_card: Control
var drag_cursor: Control
var resource_label: Label
var pile_positions: Array[Vector2] = [Vector2(33.5, 178), Vector2(252.5, 178), Vector2(471.5, 178)]
var legal_drop_highlights: Array[PanelContainer] = []
var drop_highlights: Array[PanelContainer] = []
var pile_face_widgets: Array[Control] = []
var hand_position := Vector2(252, 412)


static func supports(card: Dictionary) -> bool:
	var effect := str(card.get("effect", ""))
	if ["metallurgy_research", "odin_spear"].has(effect):
		return false
	var keywords := CardKeywords.tooltip_text(card)
	return keywords.contains("재련\n") or keywords.contains("★\n")


func configure(card: Dictionary, theme_for_tooltips: Theme, card_builder: Callable = Callable()) -> void:
	source_card = card.duplicate(true)
	tooltip_theme = theme_for_tooltips
	full_card_builder = card_builder
	modes.clear()
	var effect := str(source_card.get("effect", ""))
	if not ["metallurgy_research", "odin_spear"].has(effect):
		var keywords := CardKeywords.tooltip_text(source_card)
		if keywords.contains("재련\n"):
			modes.append("forge")
		if keywords.contains("★\n"):
			modes.append("star")


func _ready() -> void:
	custom_minimum_size = Vector2(680, 680)
	size = custom_minimum_size
	z_index = 250
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color("#111512")
	panel_style.border_color = Color("#b84750")
	panel_style.set_border_width_all(2)
	panel_style.set_corner_radius_all(7)
	panel_style.content_margin_left = 0
	panel_style.content_margin_top = 0
	panel_style.content_margin_right = 0
	panel_style.content_margin_bottom = 0
	panel_style.shadow_color = Color(0.0, 0.0, 0.0, 0.5)
	panel_style.shadow_size = 12
	panel_style.shadow_offset = Vector2(0, 4)
	add_theme_stylebox_override("panel", panel_style)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_bottom", 12)
	add_child(margin)
	var content := VBoxContainer.new()
	margin.add_child(content)
	stage = Control.new()
	stage.custom_minimum_size = Vector2(640, 640)
	stage.clip_contents = true
	content.add_child(stage)
	_build_stage()
	call_deferred("_cycle_examples")


func _build_stage() -> void:
	for index in range(3):
		var pile := Control.new()
		pile.position = pile_positions[index]
		pile.custom_minimum_size = Vector2(138, 250)
		pile.size = pile.custom_minimum_size
		pile.mouse_filter = Control.MOUSE_FILTER_IGNORE
		stage.add_child(pile)
		var face := _demo_card(_sample_pile_card(index, modes[mode_index] if not modes.is_empty() else ""))
		face.position = Vector2(0, 48)
		var face_size := face.size
		for depth in range(2):
			var back := PanelContainer.new()
			back.position = Vector2(0, depth * CARD_STACK_OFFSET)
			back.size = face_size
			back.mouse_filter = Control.MOUSE_FILTER_IGNORE
			var back_style := StyleBoxFlat.new()
			back_style.bg_color = Color("#353b38")
			back_style.border_color = Color("#74776f")
			back_style.set_border_width_all(2)
			back_style.set_corner_radius_all(4)
			back.add_theme_stylebox_override("panel", back_style)
			pile.add_child(back)
		var legal_highlight := PanelContainer.new()
		legal_highlight.position = Vector2(0, 48)
		legal_highlight.size = face_size
		legal_highlight.mouse_filter = Control.MOUSE_FILTER_IGNORE
		legal_highlight.visible = false
		var legal_style := StyleBoxFlat.new()
		legal_style.bg_color = Color(1.0, 0.68, 0.16, 0.025)
		legal_style.border_color = Color("#9d7838")
		legal_style.set_border_width_all(2)
		legal_style.set_corner_radius_all(4)
		legal_highlight.add_theme_stylebox_override("panel", legal_style)
		legal_drop_highlights.append(legal_highlight)
		pile.add_child(face)
		pile_face_widgets.append(face)
		pile.add_child(legal_highlight)
		var highlight := PanelContainer.new()
		highlight.position = Vector2(0, 48)
		highlight.size = face_size
		highlight.mouse_filter = Control.MOUSE_FILTER_IGNORE
		highlight.visible = false
		var highlight_style := StyleBoxFlat.new()
		highlight_style.bg_color = Color(1.0, 0.72, 0.20, 0.08)
		highlight_style.border_color = Color("#ffc13a")
		highlight_style.set_border_width_all(3)
		highlight_style.set_corner_radius_all(4)
		highlight.add_theme_stylebox_override("panel", highlight_style)
		pile.add_child(highlight)
		drop_highlights.append(highlight)
	var hand_left := _demo_card(CardCatalog.STARTER_CARDS[0].duplicate(true))
	hand_left.position = Vector2(126, 412)
	stage.add_child(hand_left)
	var hand_right := _demo_card(CardCatalog.STARTER_CARDS[1].duplicate(true))
	hand_right.position = Vector2(380, 412)
	stage.add_child(hand_right)
	resource_label = _stage_label("★ 2", Vector2(254, 28), Vector2(150, 34))
	resource_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	resource_label.add_theme_color_override("font_color", Color("#ffd34f"))
	resource_label.add_theme_font_size_override("font_size", 24)
	stage.add_child(resource_label)
	moving_card = _demo_card(source_card)
	moving_card.position = hand_position
	stage.add_child(moving_card)
	drag_cursor = DemoCursor.new()
	drag_cursor.position = hand_position + Vector2(90, 20)
	drag_cursor.visible = false
	stage.add_child(drag_cursor)


func _cycle_examples() -> void:
	if modes.is_empty():
		return
	while is_inside_tree():
		var cycle_started := Time.get_ticks_msec()
		var mode := modes[mode_index]
		for index in range(pile_face_widgets.size()):
			_replace_pile_face(index, _sample_pile_card(index, mode))
		_replace_moving_card(_example_card_for_mode(mode))
		_set_drop_targets_hidden()
		moving_card.visible = true
		moving_card.position = hand_position
		drag_cursor.position = hand_position + Vector2(90, 20)
		drag_cursor.visible = false
		resource_label.text = "★ 2"
		await get_tree().create_timer(0.45).timeout
		if not is_inside_tree():
			return
		if mode == "forge":
			await _move_card_to(_pile_flight_position(2), 2, mode)
			if not is_inside_tree():
				return
			resource_label.text = "★ 1"
			_replace_moving_card(_forged_card())
			if str(source_card.get("effect", "")) == "exchange":
				_replace_pile_face(2, _exchanged_target_card())
			drag_cursor.visible = false
			await get_tree().create_timer(1.55).timeout
		else:
			var first_file_position: Vector2 = _pile_flight_position(0)
			await _move_card_to(first_file_position, 0, mode)
			if not is_inside_tree():
				return
			resource_label.text = "★ 1"
			await get_tree().create_timer(0.35).timeout
			if not is_inside_tree():
				return
			await _move_card_to(_pile_flight_position(2), 2, mode, 0)
			if not is_inside_tree():
				return
			resource_label.text = "★ 0"
			drag_cursor.visible = false
			await get_tree().create_timer(1.25).timeout
		if not is_inside_tree():
			return
		moving_card.position = hand_position
		moving_card.visible = false
		await get_tree().create_timer(0.9).timeout
		if not is_inside_tree():
			return
		moving_card.visible = true
		mode_index = (mode_index + 1) % modes.size()
		var elapsed := float(Time.get_ticks_msec() - cycle_started) / 1000.0
		await get_tree().create_timer(maxf(0.0, 5.6 - elapsed)).timeout


func _move_card_to(destination: Vector2, target_pile: int, mode: String, source_pile := -1) -> void:
	for index in range(legal_drop_highlights.size()):
		legal_drop_highlights[index].visible = index != source_pile and _can_demo_drop(mode, index)
	for index in range(drop_highlights.size()):
		drop_highlights[index].visible = index == target_pile
	drag_cursor.visible = true
	var move := create_tween()
	move.set_parallel(true)
	move.tween_property(moving_card, "position", destination, 0.8) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	move.tween_property(drag_cursor, "position", destination + Vector2(90, 20), 0.8) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	await move.finished
	_set_drop_targets_hidden()


func _pile_flight_position(index: int) -> Vector2:
	var face := pile_face_widgets[index]
	var pile := face.get_parent() as Control
	return pile.position + face.position + Vector2(0, CARD_STACK_OFFSET)


func _set_drop_targets_hidden() -> void:
	for highlight in legal_drop_highlights:
		highlight.visible = false
	for highlight in drop_highlights:
		highlight.visible = false


func _can_demo_drop(mode: String, index: int) -> bool:
	var moving := _example_card_for_mode(mode)
	var target := _sample_pile_card(index, mode)
	if mode == "star":
		var rule := str(moving.get("solitaire_rule", ""))
		if rule == "top":
			return str(target.get("solitaire_rule", "")) == "bottom"
		if rule == "spell":
			return str(target.get("solitaire_rule", "")) == "spell" \
				and target.has("cost") and int(target.get("cost", -1)) == int(moving.get("cost", -2)) + 1
		return true
	if str(moving.get("effect", "")) in ["astronomy_research", "necromancy_research", "metallurgy_research", "odin_spear"]:
		return false
	if str(moving.get("effect", "")) == "obsidian_dagger":
		return str(target.get("kind", "")) == "strike"
	if bool(moving.get("forged", false)):
		return false
	if not target.has("cost"):
		return false
	var target_cost := CardStickers.card_energy_cost(target)
	var forge_target_matches := false
	match str(moving.get("forge_target_name", "")):
		"소멸 카드":
			forge_target_matches = bool(target.get("exhaust", false))
		"사용 불가 카드":
			forge_target_matches = not CardUse.is_playable(target)
		_:
			forge_target_matches = str(moving.get("forge_target_name", "")) != "" \
				and str(moving.get("forge_target_name", "")) == str(target.get("name", ""))
	return (moving.has("forge_cost") and int(moving.get("forge_cost", -1)) == target_cost) \
		or (moving.has("forge_costs") and moving.get("forge_costs", []).has(target_cost)) \
		or bool(moving.get("forge_any", false)) or forge_target_matches


func _replace_moving_card(card: Dictionary) -> void:
	var old_position := moving_card.position if is_instance_valid(moving_card) else hand_position
	if is_instance_valid(moving_card):
		moving_card.queue_free()
	moving_card = _demo_card(card)
	moving_card.position = old_position
	stage.add_child(moving_card)


func _replace_pile_face(index: int, card: Dictionary) -> void:
	var old_widget := pile_face_widgets[index]
	var pile := old_widget.get_parent()
	if is_instance_valid(pile):
		pile.remove_child(old_widget)
	old_widget.queue_free()
	var new_widget := _demo_card(card)
	new_widget.position = Vector2(0, 48)
	if is_instance_valid(pile):
		pile.add_child(new_widget)
	pile_face_widgets[index] = new_widget


func _sample_pile_card(index: int, mode: String = "") -> Dictionary:
	var candidate: Dictionary = {}
	var target_effect := ""
	var target_name := ""
	var moving := _example_card_for_mode(mode)
	if mode == "forge" or (mode == "" and modes.has("forge")):
		if index == 0:
			target_effect = "defend"
		elif index == 1:
			target_effect = "strike"
		else:
			candidate = _find_forge_target(moving).duplicate(true)
	else:
		if index == 0:
			target_effect = "defend"
		elif index == 1:
			target_name = "잽"
		else:
			target_name = "기회 포착"
	if candidate.is_empty():
		for cards in [CardCatalog.STARTER_CARDS, CardCatalog.BASIC_CARDS, CardCatalog.SPECIAL_CARDS,
				CardCatalog.RARE_CARDS, CardCatalog.LEGENDARY_CARDS]:
			for card in cards:
				if (target_effect != "" and str(card.get("effect", "")) == target_effect) \
						or (target_name != "" and str(card.get("name", "")) == target_name):
					candidate = card.duplicate(true)
					break
			if not candidate.is_empty():
				break
	if candidate.is_empty():
		candidate = CardCatalog.STARTER_CARDS[index % CardCatalog.STARTER_CARDS.size()].duplicate(true)
	candidate["id"] = -91100 - index
	candidate["revealed"] = true
	return candidate


func _exchanged_target_card() -> Dictionary:
	var moving := _example_card_for_mode("forge")
	var target := _find_forge_target(moving).duplicate(true)
	target["cost"] = CardStickers.card_energy_cost(moving)
	return target


func _example_card_for_mode(mode: String) -> Dictionary:
	if mode == "star":
		var strike := CardCatalog.STARTER_CARDS[0].duplicate(true)
		strike["id"] = -91200
		strike["revealed"] = true
		return strike
	for cards in [CardCatalog.STARTER_CARDS, CardCatalog.BASIC_CARDS, CardCatalog.SPECIAL_CARDS,
			CardCatalog.RARE_CARDS, CardCatalog.LEGENDARY_CARDS]:
		for card in cards:
			if str(card.get("effect", "")) == str(source_card.get("effect", "")) \
					and str(card.get("name", "")) == str(source_card.get("name", "")):
				var blueprint: Dictionary = card.duplicate(true)
				blueprint["forged"] = false
				blueprint["forge_costs_completed"] = []
				return blueprint
	var fallback := source_card.duplicate(true)
	fallback["forged"] = false
	fallback["forge_costs_completed"] = []
	return fallback


func _forged_card() -> Dictionary:
	var result := _example_card_for_mode("forge")
	var description := str(result.get("description", ""))
	if str(result.get("effect", "")) == "exchange":
		result["cost"] = CardStickers.card_energy_cost(_find_forge_target(result))
	if result.has("upgraded_value"):
		var before := int(result.get("value", 0))
		var after := int(result.get("upgraded_value", before))
		result["value"] = after
		description = description.replace("%d[%d]" % [before, after], str(after))
	if result.has("upgraded_resistance_gain"):
		var before_resistance := int(result.get("resistance_gain", 0))
		var after_resistance := int(result.get("upgraded_resistance_gain", before_resistance))
		result["resistance_gain"] = after_resistance
		description = description.replace("%d[%d]" % [before_resistance, after_resistance], str(after_resistance))
	if str(result.get("effect", "")) == "obsidian_dagger":
		var target := _find_forge_target(result)
		var added_damage := int(target.get("value", 0))
		var damage := int(result.get("value", 1)) + added_damage
		result["value"] = damage
		description = description.replace("피해를 1 줍니다.", "피해를 %d 줍니다." % damage)
	result["description"] = description
	result["forged"] = true
	return result


func _find_forge_target(card: Dictionary) -> Dictionary:
	var candidates: Array[Dictionary] = []
	candidates.append_array(CardCatalog.STARTER_CARDS)
	candidates.append_array(CardCatalog.BASIC_CARDS)
	candidates.append_array(CardCatalog.SPECIAL_CARDS)
	candidates.append_array(CardCatalog.RARE_CARDS)
	candidates.append_array(CardCatalog.LEGENDARY_CARDS)
	var effect := str(card.get("effect", ""))
	for candidate in candidates:
		if str(card.get("forge_target_name", "")) == "소멸 카드" and bool(candidate.get("exhaust", false)):
			return candidate
		if str(card.get("forge_target_name", "")) == "사용 불가 카드" and not CardUse.is_playable(candidate):
			return candidate
		if card.has("forge_cost") and int(candidate.get("cost", -1)) == int(card.get("forge_cost", -2)):
			return candidate
		if card.has("forge_costs") and card.get("forge_costs", []).has(int(candidate.get("cost", -1))):
			return candidate
		if bool(card.get("forge_any", false)) and candidate.has("cost"):
			return candidate
		if effect == "obsidian_dagger" and str(candidate.get("kind", "")) == "strike":
			return candidate
	return CardCatalog.STARTER_CARDS[0]


func _demo_card(card: Dictionary) -> Control:
	var demo := card.duplicate(true)
	demo["id"] = int(demo.get("id", -91000))
	demo["revealed"] = true
	if not full_card_builder.is_valid():
		if not _missing_builder_reported:
			push_error("PortCardMechanicPreview requires a full-card builder in configure().")
			_missing_builder_reported = true
		return _empty_card_widget()
	var built: Variant = full_card_builder.call(demo)
	if not (built is Control):
		if not _missing_builder_reported:
			push_error("PortCardMechanicPreview full-card builder must return a Control.")
			_missing_builder_reported = true
		return _empty_card_widget()
	var widget := built as Control
	var measured_size := widget.get_combined_minimum_size()
	if measured_size.x > 0.0 and measured_size.y > 0.0:
		widget.size = measured_size
	_disable_card_input(widget)
	return widget


func _empty_card_widget() -> Control:
	var empty := Control.new()
	empty.custom_minimum_size = Vector2(136, 191)
	empty.size = empty.custom_minimum_size
	return empty


func _disable_card_input(node: Node) -> void:
	if node is Control:
		var control := node as Control
		control.mouse_filter = Control.MOUSE_FILTER_IGNORE
		control.tooltip_text = ""
	for child in node.get_children():
		_disable_card_input(child)


func _stage_label(text: String, at: Vector2, dimensions: Vector2) -> Label:
	var label := Label.new()
	label.text = text
	label.position = at
	label.size = dimensions
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 15)
	label.add_theme_color_override("font_color", Color("#e8e5dd"))
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label
