extends Control

const PANEL_KEYWORD := Color(0.227, 0.121, 0.145, 0.96)
const PANEL_BLUE := Color(0.090, 0.267, 0.431, 0.98)
const BORDER_KEYWORD := Color(0.667, 0.424, 0.459, 0.9)
const BORDER_BLUE := Color("#81b5e7")
const TEXT_KEYWORD := Color("#f5eee8")
const TEXT_BLUE := Color("#f4f8ff")
const TITLE_KEYWORD := Color("#f8d4aa")
const TITLE_BLUE := Color("#fff3c7")
const FONT_PATH := "res://assets/fonts/PretendardVariable.woff2"
const WEIGHT_AXIS_TAG := 2003265652 # OpenType `wght` axis.

var _sections_root: VBoxContainer
var _configured_width := 310.0
var _regular_font: Font
var _bold_font: Font
var _preview_factory: Callable
var _max_height := INF
var _overflow_scroll: ScrollContainer


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	focus_mode = Control.FOCUS_NONE
	var base_font := load(FONT_PATH) as Font
	if base_font:
		_regular_font = _font_weight(base_font, 400)
		_bold_font = _font_weight(base_font, 700)
	_sections_root = VBoxContainer.new()
	_sections_root.name = "Sections"
	_sections_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_sections_root.add_theme_constant_override("separation", 8)
	_sections_root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_sections_root)


func configure(sections: Array, width: float, preview_factory: Callable = Callable()) -> void:
	_configured_width = maxf(1.0, width)
	_preview_factory = preview_factory
	_sections_root.custom_minimum_size.x = _configured_width
	custom_minimum_size = Vector2(_configured_width, 0)
	size.x = _configured_width
	for child in _sections_root.get_children():
		_sections_root.remove_child(child)
		child.queue_free()
	for section_value in sections:
		if not section_value is Dictionary:
			continue
		_add_section(section_value)
	_sections_root.queue_sort()
	update_minimum_size()


func get_preferred_size() -> Vector2:
	if not _sections_root:
		return Vector2(_configured_width, 0)
	_sections_root.queue_sort()
	var measured := _sections_root.get_combined_minimum_size()
	return Vector2(_configured_width, minf(measured.y, _max_height))


func constrain_height(max_height: float) -> void:
	_max_height = maxf(1.0, max_height)
	size = Vector2(_configured_width, _max_height)
	if is_instance_valid(_overflow_scroll):
		return
	# Browser overflow:auto constrains tall stacks; ordinary panels keep their shadows.
	remove_child(_sections_root)
	_overflow_scroll = ScrollContainer.new()
	_overflow_scroll.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overflow_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_overflow_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	_overflow_scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_overflow_scroll)
	_sections_root.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	_sections_root.custom_minimum_size.x = 0.0
	_sections_root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_overflow_scroll.add_child(_sections_root)
	_overflow_scroll.get_v_scroll_bar().mouse_filter = Control.MOUSE_FILTER_IGNORE
	_overflow_scroll.get_h_scroll_bar().mouse_filter = Control.MOUSE_FILTER_IGNORE


func _add_section(section: Dictionary) -> void:
	var title := str(section.get("title", ""))
	var description := str(section.get("description", ""))
	var kind := str(section.get("kind", "keyword"))
	var blue := kind in ["sticker", "edition", "status"]
	var is_preview := str(section.get("preview", "")) == "radiance" and _preview_factory.is_valid()

	var panel := PanelContainer.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN if is_preview else Control.SIZE_EXPAND_FILL
	if is_preview:
		# Browser preview section is a 136px card with 10px padding and 2px borders.
		panel.custom_minimum_size = Vector2(160, 0)
	panel.add_theme_stylebox_override("panel", _panel_style(blue))
	_sections_root.add_child(panel)

	var content := VBoxContainer.new()
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_theme_constant_override("separation", 3)
	if is_preview:
		content.alignment = BoxContainer.ALIGNMENT_CENTER
	panel.add_child(content)

	if is_preview:
		var preview_control := _preview_factory.call(section) as Control
		if is_instance_valid(preview_control):
			preview_control.custom_minimum_size = Vector2(136, 191)
			preview_control.size = Vector2(136, 191)
			_disable_mouse_input(preview_control)
			content.add_child(preview_control)
			return

	if not title.is_empty():
		var title_label := Label.new()
		title_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		title_label.text = title
		title_label.add_theme_font_size_override("font_size", 13)
		title_label.add_theme_constant_override("line_spacing", 1)
		title_label.add_theme_color_override("font_color", TITLE_BLUE if blue else TITLE_KEYWORD)
		_apply_font(title_label, _bold_font)
		content.add_child(title_label)

	if not description.is_empty():
		var body_label := Label.new()
		body_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		body_label.text = description
		body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		body_label.add_theme_font_size_override("font_size", 13)
		body_label.add_theme_constant_override("line_spacing", 3)
		body_label.add_theme_color_override("font_color", TEXT_BLUE if blue else TEXT_KEYWORD)
		_apply_font(body_label, _regular_font)
		content.add_child(body_label)


func _panel_style(blue: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = PANEL_BLUE if blue else PANEL_KEYWORD
	style.border_color = BORDER_BLUE if blue else BORDER_KEYWORD
	style.set_border_width_all(2)
	style.set_corner_radius_all(6)
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style


func _apply_font(label: Label, font: Font) -> void:
	if font:
		label.add_theme_font_override("font", font)


func _disable_mouse_input(control: Control) -> void:
	control.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for child in control.get_children():
		if child is Control:
			_disable_mouse_input(child)


func _font_weight(base_font: Font, weight: int) -> FontVariation:
	var variation := FontVariation.new()
	variation.base_font = base_font
	variation.variation_opentype = {WEIGHT_AXIS_TAG: float(weight)}
	return variation
