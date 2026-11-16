extends Control
class_name MapDebugCardCatalogPanel

signal close_requested

const CARD_SIZE := Vector2(149.6, 210.1)
const COLUMNS := 5
const CARD_GAP_X := 12.0
const CARD_GAP_Y := 16.0
const RARITY_ORDER := {"legendary": 0, "rare": 1, "special": 2, "basic": 3, "starter": 4, "status": 5}

var _cards: Array[Dictionary] = []
var _game: Control
var _frame: PanelContainer
var _grid: GridContainer
var _cells: Array[Control] = []
var _visuals: Array[Control] = []


func configure(game: Control, cards: Array) -> void:
	_game = game
	_cards.clear()
	for card in cards:
		if card is Dictionary:
			_cards.append(card.duplicate(true))
	_cards.sort_custom(_card_less)
	_build()


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	focus_mode = Control.FOCUS_ALL
	_layout()
	grab_focus()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_layout()


func _gui_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		close_requested.emit()
		accept_event()


func _build() -> void:
	var backdrop := ColorRect.new()
	backdrop.name = "CardCatalogBackdrop"
	backdrop.color = Color(0, 0, 0, 0.72)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.gui_input.connect(func(event: InputEvent) -> void:
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT \
				and (not is_instance_valid(_frame) or not _frame.get_global_rect().has_point(event.global_position)):
			close_requested.emit()
		)
	add_child(backdrop)

	var center := CenterContainer.new()
	center.name = "CardCatalogCenter"
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	_frame = PanelContainer.new()
	_frame.name = "CardCatalogPanel"
	_frame.mouse_filter = Control.MOUSE_FILTER_STOP
	_frame.add_theme_stylebox_override("panel", _panel_style())
	center.add_child(_frame)

	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 0)
	_frame.add_child(content)
	_build_header(content)

	var scroll := ScrollContainer.new()
	scroll.name = "AllCardsScroll"
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	content.add_child(scroll)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_bottom", 16)
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(margin)
	var grid_center := CenterContainer.new()
	grid_center.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	margin.add_child(grid_center)

	_grid = GridContainer.new()
	_grid.name = "AllCardsGrid"
	_grid.columns = COLUMNS
	_grid.add_theme_constant_override("h_separation", int(CARD_GAP_X))
	_grid.add_theme_constant_override("v_separation", int(CARD_GAP_Y))
	grid_center.add_child(_grid)

	for card in _cards:
		var cell := Control.new()
		cell.custom_minimum_size = CARD_SIZE
		cell.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_grid.add_child(cell)
		_cells.append(cell)
		var visual := _game.call("_mechanic_full_card_widget", card) as Control
		if visual == null:
			continue
		visual.position = Vector2.ZERO
		visual.size = CARD_SIZE
		visual.mouse_filter = Control.MOUSE_FILTER_PASS
		cell.add_child(visual)
		_visuals.append(visual)

	_layout()


func _build_header(parent: VBoxContainer) -> void:
	var header := HBoxContainer.new()
	header.name = "CardCatalogHeader"
	header.add_theme_constant_override("separation", 16)
	header.add_theme_stylebox_override("panel", _header_style())
	parent.add_child(header)
	var labels := VBoxContainer.new()
	labels.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	labels.add_theme_constant_override("separation", 3)
	header.add_child(labels)
	var title := Label.new()
	title.text = "전체 카드"
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", Color("#f0eee7"))
	labels.add_child(title)
	var count := Label.new()
	count.text = "%d장 · 한 줄에 5장" % _cards.size()
	count.add_theme_font_size_override("font_size", 12)
	count.add_theme_color_override("font_color", Color("#c4cec7"))
	labels.add_child(count)
	var close := Button.new()
	close.text = "닫기"
	close.focus_mode = Control.FOCUS_ALL
	close.custom_minimum_size = Vector2(72, 36)
	close.add_theme_color_override("font_color", Color.WHITE)
	close.add_theme_stylebox_override("normal", _close_style())
	close.add_theme_stylebox_override("hover", _close_style(Color(1, 1, 1, 0.18)))
	close.pressed.connect(func() -> void: close_requested.emit())
	header.add_child(close)


func _layout() -> void:
	if not is_instance_valid(_frame) or not is_inside_tree():
		return
	var viewport_size := get_viewport_rect().size
	var width := minf(1040.0, maxf(320.0, viewport_size.x - 40.0))
	var height := minf(820.0, maxf(320.0, viewport_size.y - 40.0))
	_frame.custom_minimum_size = Vector2(width, height)
	_frame.size = Vector2(width, height)
	var available_card_width := (width - 32.0 - 32.0 - CARD_GAP_X * (COLUMNS - 1)) / COLUMNS
	var scale_factor := clampf(available_card_width / CARD_SIZE.x, 0.1, 1.0)
	for index in _cells.size():
		var cell := _cells[index]
		cell.custom_minimum_size = CARD_SIZE * scale_factor
		cell.size = cell.custom_minimum_size
		if index < _visuals.size():
			var visual := _visuals[index]
			visual.scale = Vector2.ONE * scale_factor


func _card_less(left: Dictionary, right: Dictionary) -> bool:
	var left_rarity := int(RARITY_ORDER.get(str(left.get("rarity", "")), 99))
	var right_rarity := int(RARITY_ORDER.get(str(right.get("rarity", "")), 99))
	if left_rarity != right_rarity:
		return left_rarity < right_rarity
	var left_cost := int(left.get("cost", -1)) if bool(left.get("playable", true)) else -1
	var right_cost := int(right.get("cost", -1)) if bool(right.get("playable", true)) else -1
	if left_cost != right_cost:
		return left_cost < right_cost
	return str(left.get("name", "")).naturalnocasecmp_to(str(right.get("name", ""))) < 0


func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#101411")
	style.border_color = Color("#77786b")
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	return style


func _header_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color.TRANSPARENT
	style.border_color = Color("#515751")
	style.border_width_bottom = 1
	style.content_margin_left = 18
	style.content_margin_right = 18
	style.content_margin_top = 14
	style.content_margin_bottom = 14
	return style


func _close_style(color: Color = Color(1, 1, 1, 0.1)) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = Color("#89978c")
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style
