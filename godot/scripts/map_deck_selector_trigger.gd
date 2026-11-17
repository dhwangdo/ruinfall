extends Button
class_name GodotMapDeckSelectorTrigger

const SelectorMenu = preload("res://scripts/map_deck_selector_menu.gd")

const SELECTOR_SIZE := 82.0 * 1.2
const SELECTOR_BORDER := 3.0 * 1.2
const SELECTOR_NAME_WIDTH := 66.0 * 1.2
const CARD_FONT: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")
const DeckIconArt = preload("res://scripts/deck_icon_art.gd")

var _large_deck_menu: PopupMenu
var _deck_name := ""
var _deck_count := 0
var _deck_capacity := 0
var _name_label: Label
var _count_label: Label
var _menu: Control
var _owned_decks: Array = []
var _max_owned_decks := 0
var _active_deck_id := ""
var _active_deck_count := -1
var _active_deck_capacity := -1
var _pointer_down := false
var _repositioning := false
var _drag_moved := false
var _drag_origin := Vector2.ZERO
var _position_origin := Vector2.ZERO

signal deck_picked(deck_id: String)
signal menu_closed
signal position_changed(new_position: Vector2)


class DeckStackIcon extends Control:
	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_IGNORE
		texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		material = DeckIconArt.palette_material()

	func _draw() -> void:
		var side := floorf(minf(size.x, size.y))
		draw_texture_rect(DeckIconArt.RARE,
			Rect2(((size - Vector2.ONE * side) * 0.5).round(), Vector2.ONE * side), false)


func _init() -> void:
	flat = false
	text = ""
	custom_minimum_size = Vector2(SELECTOR_SIZE, SELECTOR_SIZE)
	size = custom_minimum_size


func _ready() -> void:
	flat = false
	text = ""
	add_theme_stylebox_override("normal", _selector_style(Color("#2c2f2b"), Color("#db8a3d")))
	add_theme_stylebox_override("hover", _selector_style(Color("#3a3931"), Color("#db8a3d")))
	add_theme_stylebox_override("pressed", _selector_style(Color("#3a3931"), Color("#db8a3d")))
	add_theme_stylebox_override("focus", _selector_style(Color("#2c2f2b"), Color("#db8a3d")))
	_build_content()
	_update_content()
	_create_menu()


func configure(deck_name: String, count: int, capacity: int, owned_decks: Array = [],
		max_owned_decks: int = 0, active_deck_id: String = "", active_deck_count: int = -1,
		active_deck_capacity: int = -1) -> void:
	_deck_name = deck_name
	_deck_count = count
	_deck_capacity = capacity
	_owned_decks = owned_decks.duplicate(true)
	_max_owned_decks = max_owned_decks
	_active_deck_id = active_deck_id
	_active_deck_count = active_deck_count
	_active_deck_capacity = active_deck_capacity
	if is_node_ready():
		_update_content()
		_configure_menu()


func _create_menu() -> void:
	var menu: Control = SelectorMenu.new() as Control
	menu.name = "MapDeckSelectorUnfoldMenu"
	menu.position = Vector2(92.0 * 1.2, 22.0 * 1.2) - Vector2(180.0, 160.0)
	menu.z_as_relative = true
	menu.z_index = 1
	_menu = menu
	add_child(menu)
	menu.connect("deck_picked", Callable(self, "_on_menu_deck_picked"))
	menu.connect("closed", Callable(self, "_on_menu_closed"))
	pressed.connect(_on_selector_pressed)
	_large_deck_menu = PopupMenu.new()
	_large_deck_menu.name = "LargeDeckSelection"
	_large_deck_menu.max_size = Vector2i(420, 480)
	_large_deck_menu.id_pressed.connect(func(index: int) -> void:
		if index >= 0 and index < _owned_decks.size():
			_on_menu_deck_picked(str(_owned_decks[index].get("id", ""))))
	_large_deck_menu.popup_hide.connect(func() -> void: menu_closed.emit())
	add_child(_large_deck_menu)
	_configure_menu()


func _configure_menu() -> void:
	if is_instance_valid(_large_deck_menu):
		_large_deck_menu.clear()
		for index in range(_owned_decks.size()):
			var deck: Dictionary = _owned_decks[index]
			_large_deck_menu.add_radio_check_item(str(deck.get("name", "덱")), index)
			_large_deck_menu.set_item_checked(index, str(deck.get("id", "")) == _active_deck_id)
	if not is_instance_valid(_menu):
		return
	_menu.call("configure", _owned_decks if _owned_decks.size() <= 3 else [], mini(_max_owned_decks, 3), _active_deck_id,
		_active_deck_count, _active_deck_capacity)


func _on_selector_pressed() -> void:
	if _drag_moved:
		return
	if _owned_decks.size() > 3 and is_instance_valid(_large_deck_menu):
		_large_deck_menu.popup_centered(Vector2i(360, 480))
		return
	if is_instance_valid(_menu):
		var desired := global_position + Vector2(92.0 * 1.2, 22.0 * 1.2) - Vector2(180, 160)
		var upper := (get_viewport_rect().size - _menu.size).max(Vector2.ZERO)
		_menu.global_position = desired.clamp(Vector2.ZERO, upper)
		_menu.call("toggle_menu")


func is_repositioning() -> bool:
	return _repositioning


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_pointer_down = true
			_drag_moved = false
			_drag_origin = get_parent().get_local_mouse_position()
			_position_origin = position
		else:
			_pointer_down = false
			if _repositioning:
				_repositioning = false
				position_changed.emit(position)
				accept_event()
	elif event is InputEventMouseMotion and _pointer_down:
		_update_reposition(get_parent().get_local_mouse_position())
		if _repositioning:
			accept_event()
	elif event is InputEventKey and event.pressed:
		_drag_moved = false


func _update_reposition(pointer: Vector2) -> void:
	var delta := pointer - _drag_origin
	if not _repositioning and delta.length() < 6.0:
		return
	if not _repositioning:
		_repositioning = true
		_drag_moved = true
		close_menu()
		set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT, Control.PRESET_MODE_KEEP_SIZE)
	var bounds := (get_parent() as Control).size - size
	position = (_position_origin + delta).clamp(Vector2.ZERO, bounds.max(Vector2.ZERO))


func close_menu() -> void:
	if is_instance_valid(_large_deck_menu):
		_large_deck_menu.hide()
	if is_instance_valid(_menu):
		_menu.call("close_menu")


func _on_menu_deck_picked(deck_id: String) -> void:
	deck_picked.emit(deck_id)


func _on_menu_closed() -> void:
	menu_closed.emit()


func _build_content() -> void:
	var content := VBoxContainer.new()
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content.alignment = BoxContainer.ALIGNMENT_CENTER
	content.add_theme_constant_override("separation", 0)
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(content)

	var icon := DeckStackIcon.new()
	icon.custom_minimum_size = Vector2(40.8, 40.8)
	icon.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	content.add_child(icon)

	_name_label = Label.new()
	_name_label.custom_minimum_size = Vector2(SELECTOR_NAME_WIDTH, 18.0)
	_name_label.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	_name_label.add_theme_font_override("font", _font_with_weight(800))
	_name_label.add_theme_font_size_override("font_size", 12)
	_name_label.add_theme_color_override("font_color", Color("#e1dfd8"))
	_name_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(_name_label)

	_count_label = Label.new()
	_count_label.custom_minimum_size = Vector2(SELECTOR_NAME_WIDTH, 18.0)
	_count_label.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_count_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_count_label.add_theme_font_override("font", _font_with_weight(700))
	_count_label.add_theme_font_size_override("font_size", 12)
	_count_label.add_theme_color_override("font_color", Color("#bdad94"))
	_count_label.add_theme_constant_override("outline_size", 0)
	_count_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(_count_label)


func _update_content() -> void:
	if not is_instance_valid(_name_label) or not is_instance_valid(_count_label):
		return
	_name_label.text = _deck_name
	_count_label.text = "(%d/%d)" % [_deck_count, _deck_capacity]


func _font_with_weight(weight: int) -> FontVariation:
	var font := FontVariation.new()
	font.base_font = CARD_FONT
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	font.variation_opentype = {weight_axis: float(weight)}
	return font


func _selector_style(background: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(roundi(SELECTOR_BORDER))
	style.set_corner_radius_all(50)
	style.content_margin_left = 0
	style.content_margin_top = 0
	style.content_margin_right = 0
	style.content_margin_bottom = 0
	style.shadow_size = 0
	return style
