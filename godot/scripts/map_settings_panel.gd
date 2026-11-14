extends Control
class_name PortMapSettingsPanel

const RunShortcuts = preload("res://scripts/run_shortcuts.gd")

signal close_requested
signal marker_selected(marker_id: String)
signal battle_deck_check_changed(enabled: bool)
signal animation_tooltips_changed(enabled: bool)

var battle_deck_check_enabled := true
var animation_tooltips_enabled := true


func configure(_options: Array, _selected_id: String, battle_check_enabled: bool = true,
		animation_tooltips: bool = true) -> void:
	battle_deck_check_enabled = battle_check_enabled
	animation_tooltips_enabled = animation_tooltips


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	z_index = 150
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.0, 0.0, 0.0, 0.60)
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.gui_input.connect(_on_backdrop_input)
	add_child(backdrop)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = _panel_size()
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	panel.add_theme_stylebox_override("panel", _panel_style())
	center.add_child(panel)
	get_viewport().size_changed.connect(_resize_panel.bind(panel))

	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 0)
	panel.add_child(body)
	var header_margin := _margin_container(22, 22, 14, 14)
	body.add_child(header_margin)
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 12)
	header_margin.add_child(header)
	var title := Label.new()
	title.text = "설정"
	title.add_theme_font_size_override("font_size", 22)
	header.add_child(title)
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(spacer)
	var close_button := _button("닫기", Vector2(72, 38))
	close_button.pressed.connect(func(): close_requested.emit())
	header.add_child(close_button)
	body.add_child(_separator())

	var scroll := ScrollContainer.new()
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	body.add_child(scroll)
	var content_margin := _margin_container(22, 22, 12, 20)
	scroll.add_child(content_margin)
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 8)
	content_margin.add_child(content)
	content.add_child(_preference_toggle_row(
		"잠깐!",
		"전투에 들어가기 전에 사용할 덱을 확인합니다.",
		battle_deck_check_enabled,
		func(enabled: bool):
			battle_deck_check_enabled = enabled
			battle_deck_check_changed.emit(enabled)
	))
	content.add_child(_preference_toggle_row(
		"애니메이션 툴팁",
		"카드의 ★·재련 설명에 잠시 머물면 동작 예시를 보여줍니다.",
		animation_tooltips_enabled,
		func(enabled: bool):
			animation_tooltips_enabled = enabled
			animation_tooltips_changed.emit(enabled)
	))
	content.add_child(_separator())
	content.add_child(_label("단축키 안내", 16, Color("#e8e5dd")))
	content.add_child(_shortcut_grid())


func _preference_toggle_row(title_text: String, description_text: String, enabled: bool, changed: Callable) -> Control:
	var row := PanelContainer.new()
	row.add_theme_stylebox_override("panel", _row_style(false))
	var margin := _margin_container(12, 12, 10, 10)
	row.add_child(margin)
	var line := HBoxContainer.new()
	line.add_theme_constant_override("separation", 12)
	margin.add_child(line)
	var copy := VBoxContainer.new()
	copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	copy.add_child(_label(title_text, 14, Color("#e8e5dd")))
	var description := _label(description_text, 12, Color("#c4c7ba"))
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	copy.add_child(description)
	line.add_child(copy)
	var toggle := CheckButton.new()
	toggle.button_pressed = enabled
	toggle.focus_mode = Control.FOCUS_NONE
	toggle.toggled.connect(changed)
	line.add_child(toggle)
	return row


func _shortcut_grid() -> GridContainer:
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 6)
	for shortcut in RunShortcuts.rows():
		var key := _label(str(shortcut[0]), 13, Color("#e0bf8f"))
		key.custom_minimum_size.x = 180
		grid.add_child(key)
		var description := _label(str(shortcut[1]), 13, Color("#c6c7bc"))
		description.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		grid.add_child(description)
	return grid


func _on_backdrop_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		close_requested.emit()


func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		close_requested.emit()
		get_viewport().set_input_as_handled()


func _panel_size() -> Vector2:
	var viewport_size := get_viewport_rect().size
	return Vector2(minf(600.0, viewport_size.x - 32.0), minf(780.0, viewport_size.y - 40.0))


func _resize_panel(panel: PanelContainer) -> void:
	if is_instance_valid(panel):
		panel.custom_minimum_size = _panel_size()


func _button(text: String, minimum_size: Vector2) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = minimum_size
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_font_size_override("font_size", 14)
	button.add_theme_color_override("font_color", Color("#e8e5dd"))
	button.add_theme_stylebox_override("normal", _simple_style(Color("#2a2d28"), Color("#6d6b60")))
	button.add_theme_stylebox_override("hover", _simple_style(Color("#373e33"), Color("#bd955c")))
	return button


func _label(text: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label


func _margin_container(left: int, right: int, top: int, bottom: int) -> MarginContainer:
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", left)
	margin.add_theme_constant_override("margin_right", right)
	margin.add_theme_constant_override("margin_top", top)
	margin.add_theme_constant_override("margin_bottom", bottom)
	return margin


func _separator() -> ColorRect:
	var separator := ColorRect.new()
	separator.color = Color("#484b40")
	separator.custom_minimum_size.y = 1
	separator.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return separator


func _row_style(selected: bool) -> StyleBoxFlat:
	var style := _simple_style(Color("#322d22") if selected else Color("#171b18"),
		Color("#d58a41") if selected else Color("#494d42"))
	style.content_margin_left = 0
	style.content_margin_top = 0
	style.content_margin_right = 0
	style.content_margin_bottom = 0
	return style


func _panel_style() -> StyleBoxFlat:
	var style := _simple_style(Color("#131613"), Color("#82735a"))
	style.set_corner_radius_all(5)
	style.content_margin_left = 0
	style.content_margin_top = 0
	style.content_margin_right = 0
	style.content_margin_bottom = 0
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.42)
	style.shadow_size = 16
	style.shadow_offset = Vector2(0.0, 4.0)
	return style


func _simple_style(background: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.content_margin_left = 10
	style.content_margin_top = 7
	style.content_margin_right = 10
	style.content_margin_bottom = 7
	return style
