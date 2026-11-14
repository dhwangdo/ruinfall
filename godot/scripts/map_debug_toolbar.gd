extends Control
class_name MapDebugToolbar

const EnemyCodexPanel = preload("res://scripts/map_debug_enemy_codex_panel.gd")

signal action_requested(action: String, payload: Dictionary)

var snapshot: Dictionary = {}
var catalog_choices: Array = []
var selector_values: Dictionary = {}
var overlay_host: Node
var _selection: OptionButton
var _region_input: LineEdit
var _count_input: LineEdit
var _quick_popup: PopupPanel
var _codex_panel: PanelContainer


func configure(next_snapshot: Dictionary, next_catalog_choices: Array, next_selector_values: Dictionary = {}) -> void:
	snapshot = next_snapshot.duplicate(true)
	catalog_choices = next_catalog_choices.duplicate(true)
	selector_values = next_selector_values.duplicate(true)
	if is_inside_tree():
		_rebuild()


func _ready() -> void:
	_rebuild()


func _rebuild() -> void:
	_clear_codex_panel()
	for child in get_children():
		remove_child(child)
		child.queue_free()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	custom_minimum_size = Vector2(0, 46)

	var bar := Control.new()
	bar.name = "BrowserStyleToolbar"
	bar.set_anchors_preset(Control.PRESET_FULL_RECT)
	bar.anchor_left = 0.1
	bar.anchor_right = 0.9
	bar.offset_left = 0
	bar.offset_right = 0
	add_child(bar)
	var background := Panel.new()
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.add_theme_stylebox_override("panel", _bar_style())
	bar.add_child(background)

	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_bottom", 9) # Includes the source bottom border.
	bar.add_child(margin)

	var row := HBoxContainer.new()
	row.name = "ToolbarFlowRow"
	row.add_theme_constant_override("separation", 0)
	margin.add_child(row)
	_add_spawn_group(row)
	_add_spacer(row)
	_add_quick_actions(row)
	_add_spacer(row)
	_add_score_group(row)
	_add_spacer(row)
	_add_card_stats(row)
	_add_spacer(row)
	_add_codex(row)
	call_deferred("_sync_height", row)


func _add_spawn_group(row: HBoxContainer) -> void:
	var group := HBoxContainer.new()
	group.name = "SpawnControls"
	group.add_theme_constant_override("separation", 7)
	row.add_child(group)
	_selection = OptionButton.new()
	_selection.name = "SpawnSelection"
	_selection.custom_minimum_size.x = 190
	_selection.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_selection.add_theme_font_override("font", _font())
	_selection.add_theme_font_size_override("font_size", 12)
	_selection.add_theme_color_override("font_color", Color("#111111"))
	_selection.add_theme_stylebox_override("normal", _input_style())
	_selection.add_theme_stylebox_override("hover", _input_style())
	_selection.add_theme_stylebox_override("pressed", _input_style())
	var selected_index := -1
	for choice in catalog_choices:
		if not choice is Dictionary:
			continue
		var label := str(choice.get("label", choice.get("value", "")))
		var category := str(choice.get("group", ""))
		_selection.add_item((category + " · " if not category.is_empty() else "") + label)
		_selection.set_item_metadata(_selection.item_count - 1, str(choice.get("value", "")))
		if str(choice.get("value", "")) == str(selector_values.get("spawn_selection", "deck:random")):
			selected_index = _selection.item_count - 1
	if selected_index >= 0:
		_selection.select(selected_index)
	_selection.item_selected.connect(_on_spawn_selected)
	group.add_child(_selection)
	var spawn := _button("바닥에 생성", 11)
	spawn.name = "SpawnItemButton"
	spawn.pressed.connect(func() -> void:
		_request("spawn_item", {"selection": _current_spawn_selection()})
	)
	group.add_child(spawn)


func _add_quick_actions(row: HBoxContainer) -> void:
	var anchor := _button("디버그 지급", 11)
	anchor.name = "QuickActionsSummary"
	anchor.pressed.connect(func() -> void: _toggle_popup(_quick_popup, anchor))
	row.add_child(anchor)
	_quick_popup = _popup()
	var popup_box := VBoxContainer.new()
	popup_box.oversampling_with_scale = CanvasItem.OVERSAMPLING_WITH_SCALE_ENABLED
	popup_box.add_theme_constant_override("separation", 5)
	_quick_popup.add_child(popup_box)
	_add_popup_button(popup_box, "스티커 덱 생성", "create_sticker_test_deck", {})
	_add_popup_button(popup_box, "열쇠 +10", "add_debug_keys", {"amount": 10})
	_add_popup_button(popup_box, "골드 +999", "add_debug_gold", {"amount": 999})
	add_child(_quick_popup)


func _add_score_group(row: HBoxContainer) -> void:
	var group := HFlowContainer.new()
	group.name = "ScoreControls"
	group.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	group.add_theme_constant_override("h_separation", 7)
	group.add_theme_constant_override("v_separation", 5)
	row.add_child(group)
	var region := _labeled_number("지역", str(selector_values.get("deck_region", "1")))
	_region_input = region[1]
	group.add_child(region[0])
	var count := _labeled_number("생성 개수", str(selector_values.get("deck_count", "1")))
	_count_input = count[1]
	group.add_child(count[0])
	_region_input.text_changed.connect(func(value: String) -> void:
		selector_values["deck_region"] = value
		_request("deck_region_changed", {"region_number": value})
	)
	_count_input.text_changed.connect(func(value: String) -> void:
		selector_values["deck_count"] = value
		_request("deck_count_changed", {"deck_count": value})
	)
	var generate := _button("지역 덱 생성", 11)
	generate.name = "GenerateRegionDecksButton"
	generate.pressed.connect(func() -> void:
		_request("generate_region_decks", {"region_number": _region_input.text, "deck_count": _count_input.text})
	)
	group.add_child(generate)
	group.resized.connect(func() -> void: call_deferred("_sync_height", row))


func _add_card_stats(row: HBoxContainer) -> void:
	var button := _button("카드 풀 통계", 11)
	button.name = "CardPoolStatsButton"
	button.pressed.connect(func() -> void: _request("open_card_stats", {}))
	row.add_child(button)


func _add_codex(row: HBoxContainer) -> void:
	var entries: Array = snapshot.get("enemy_codex", [])
	var button := _button("▸ 적 도감 (%d)" % entries.size(), 11, true)
	button.name = "EnemyCodexSummary"
	button.pressed.connect(func() -> void:
		if is_instance_valid(_codex_panel) and _codex_panel.visible:
			_codex_panel.hide()
			button.text = "▸ 적 도감 (%d)" % entries.size()
			return
		if not is_instance_valid(_codex_panel):
			_codex_panel = EnemyCodexPanel.new()
			_codex_panel.name = "EnemyCodexPanel"
			# GUI hit testing follows control order, unlike drawing z_index.
			# Place the panel after the map, as with the map's vault preview.
			var host: Node = overlay_host if is_instance_valid(overlay_host) else get_tree().root
			host.add_child(_codex_panel)
		_codex_panel.configure(entries, button.get_global_rect())
		_codex_panel.show()
		button.text = "▾ 적 도감 (%d)" % entries.size()
	)
	button.item_rect_changed.connect(func() -> void:
		if is_inside_tree() and button.is_inside_tree() and is_instance_valid(_codex_panel) \
			and _codex_panel.is_inside_tree() and _codex_panel.visible:
			_codex_panel.anchor_to(button.get_global_rect())
	)
	row.add_child(button)


func _clear_codex_panel() -> void:
	if is_instance_valid(_codex_panel):
		_codex_panel.hide()
		_codex_panel.queue_free()
	_codex_panel = null


func _exit_tree() -> void:
	_clear_codex_panel()


func prepare_for_reuse() -> void:
	_clear_codex_panel()
	if is_instance_valid(_quick_popup):
		_quick_popup.hide()
	if is_instance_valid(_selection):
		_selection.get_popup().hide()


func _labeled_number(label_text: String, initial: String) -> Array:
	var group := HBoxContainer.new()
	group.add_theme_constant_override("separation", 5)
	group.add_child(_label(label_text, 11, true, Color("#e6e6e6")))
	# Keep raw input until Generate validates it, like the browser number input.
	# SpinBox rounds fractions and silently clamps invalid/large values first.
	var line_edit := LineEdit.new()
	line_edit.text = initial
	line_edit.custom_minimum_size = Vector2(66, 31)
	line_edit.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	line_edit.add_theme_font_override("font", _font())
	line_edit.add_theme_font_size_override("font_size", 12)
	line_edit.add_theme_color_override("font_color", Color("#111111"))
	line_edit.add_theme_stylebox_override("normal", _input_style())
	line_edit.add_theme_stylebox_override("focus", _input_style())
	group.add_child(line_edit)
	return [group, line_edit]


func _add_popup_button(parent: VBoxContainer, title: String, action: String, payload: Dictionary) -> void:
	var button := _button(title, 11)
	button.custom_minimum_size.y = 30
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.pressed.connect(func() -> void:
		_request(action, payload.duplicate(true))
	)
	parent.add_child(button)


func _popup(is_codex: bool = false) -> PopupPanel:
	var popup := PopupPanel.new()
	popup.name = "EnemyCodexPopup" if is_codex else "QuickActionsPopup"
	popup.add_theme_stylebox_override("panel", _popup_style())
	popup.add_theme_constant_override("margin_left", 10 if is_codex else 6)
	popup.add_theme_constant_override("margin_right", 10 if is_codex else 6)
	popup.add_theme_constant_override("margin_top", 10 if is_codex else 6)
	popup.add_theme_constant_override("margin_bottom", 10 if is_codex else 6)
	return popup


func _toggle_popup(popup: PopupPanel, anchor: Control) -> void:
	if popup.visible:
		popup.hide()
		return
	var rect := anchor.get_global_rect()
	popup.position = Vector2i(roundi(rect.position.x), roundi(rect.end.y + 4))
	popup.popup()


func _on_spawn_selected(index: int) -> void:
	var value := str(_selection.get_item_metadata(index))
	selector_values["spawn_selection"] = value
	_request("spawn_selection_changed", {"selection": value})


func _sync_height(row: HBoxContainer) -> void:
	if not is_instance_valid(row) or not is_inside_tree() or is_queued_for_deletion():
		return
	var bar := find_child("BrowserStyleToolbar", true, false) as Control
	var score := find_child("ScoreControls", true, false) as HFlowContainer
	if bar != null and score != null:
		# At desktop width the browser flex row keeps the score controls together.
	# Narrow wrappers let that one group wrap while the outer toolbar remains a row.
		score.custom_minimum_size.x = 380.0 if bar.size.x >= 900.0 else 0.0
	# Allocated height already contains the host's padding. Feeding it back into
	# the minimum grows the bar again on every resize. Measure content only.
	var row_height := row.get_combined_minimum_size().y
	var needed := maxf(46.0, row_height + 16.0 + 1.0)
	if not is_equal_approx(custom_minimum_size.y, needed):
		custom_minimum_size.y = needed


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		var row := find_child("ToolbarFlowRow", true, false) as HBoxContainer
		if row != null:
			call_deferred("_sync_height", row)


func _current_spawn_selection() -> String:
	if _selection == null or _selection.item_count == 0:
		return str(selector_values.get("spawn_selection", "deck:random"))
	return str(_selection.get_item_metadata(_selection.selected))


func _request(action: String, payload: Dictionary) -> void:
	var debug_mode := bool(snapshot.get("debug_mode", false))
	if is_instance_valid(overlay_host):
		var controller = overlay_host.get("map_debug_controller")
		if controller != null and controller.has_method("record_toolbar_trace"):
			controller.call("record_toolbar_trace", "request", {
				"action": action,
				"payload": payload,
				"snapshot_debug_mode": debug_mode,
				"toolbar_visible": is_visible_in_tree(),
				"screen": str(overlay_host.get("screen_name")),
			})
	if debug_mode:
		action_requested.emit(action, payload)


func _button(text: String, horizontal_padding: int = 11, dark: bool = false) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = 31
	button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	button.add_theme_font_override("font", _font())
	button.add_theme_font_size_override("font_size", 12)
	button.add_theme_color_override("font_color", Color("#f4f4f4") if dark else Color("#111111"))
	button.add_theme_color_override("font_hover_color", Color("#ffffff") if dark else Color("#111111"))
	button.add_theme_color_override("font_pressed_color", Color("#ffffff") if dark else Color("#111111"))
	var style := _codex_button_style() if dark else _input_style()
	button.add_theme_stylebox_override("normal", style)
	button.add_theme_stylebox_override("hover", _codex_button_hover_style() if dark else _input_style(true))
	button.add_theme_stylebox_override("pressed", style)
	button.add_theme_constant_override("h_separation", horizontal_padding)
	return button


func _label(text: String, size: int, bold: bool, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_override("font", _font(bold))
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	if bold:
		label.add_theme_color_override("font_color", color)
	return label


func _font(bold: bool = true) -> Font:
	if OS.has_feature("web"):
		var web_font := FontVariation.new()
		web_font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
		web_font.variation_opentype = {
			TextServerManager.get_primary_interface().name_to_tag("wght"): 700.0 if bold else 400.0
		}
		return web_font
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Arial"])
	font.font_weight = 700 if bold else 400
	return font


func _add_spacer(row: HBoxContainer) -> void:
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(spacer)


func _bar_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#242727")
	style.border_width_bottom = 1
	style.border_color = Color(0, 0, 0, 0.18)
	return style


func _input_style(hover: bool = false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#fff8e8") if hover else Color("#f5f1e7")
	style.border_color = Color(1, 1, 1, 0.42)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.content_margin_left = 9
	style.content_margin_right = 9
	style.content_margin_top = 5
	style.content_margin_bottom = 5
	return style


func _popup_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#211f1a")
	style.border_color = Color("#746b59")
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	return style


func _codex_button_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(20.0 / 255.0, 22.0 / 255.0, 23.0 / 255.0, 0.97)
	style.border_color = Color("#777777")
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	style.content_margin_left = 11
	style.content_margin_right = 11
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style


func _codex_button_hover_style() -> StyleBoxFlat:
	var style := _codex_button_style()
	style.bg_color = Color("#2a2c2d")
	return style
