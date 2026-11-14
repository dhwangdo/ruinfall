extends Control
class_name PortMapMinimap

const MapRules = preload("res://scripts/map_rules.gd")
const TileAppearance = preload("res://scripts/map_tile_appearance.gd")

signal size_changed(new_size: Vector2)
signal zoom_changed(new_zoom: float)
signal view_offset_changed(new_offset: Vector2)
signal position_changed(new_position: Vector2)

const BASE_TILE_PIXELS := 3.0
const DEFAULT_SIZE := Vector2(245.0, 245.0)
const MIN_SIZE := 140.0
const MAX_SIZE := 640.0
const MIN_ZOOM := 0.5
const MAX_ZOOM := 4.0

var map_data: Dictionary = {}
var player_position := Vector2i.ZERO
var marker_id := "outline"
var item_positions: Dictionary = {}
var view_offset := Vector2.ZERO
var zoom := 1.0
var panel_style: StyleBoxFlat
var _pan_dragging := false
var _resize_dragging := false
var _move_dragging := false
var _resize_origin := Vector2.ZERO


func _ready() -> void:
	panel_style = StyleBoxFlat.new()
	panel_style.bg_color = TileAppearance.MINIMAP_BACKGROUND
	panel_style.border_color = Color("#52615b")
	panel_style.set_border_width_all(1)
	panel_style.set_corner_radius_all(5)
	panel_style.shadow_color = Color(0.0, 0.0, 0.0, 0.38)
	panel_style.shadow_size = 12
	panel_style.shadow_offset = Vector2(0.0, 3.0)


func configure(data: Dictionary, player: Vector2i, _region: int, marker: String,
	floor_cards: Array = [], floor_deck_drops: Array = [], floor_consumable_drops: Array = [],
	display_size: Vector2 = DEFAULT_SIZE, display_zoom: float = 1.0,
	display_offset: Vector2 = Vector2.ZERO) -> void:
	map_data = data
	player_position = player
	marker_id = marker
	zoom = clampf(display_zoom, MIN_ZOOM, MAX_ZOOM)
	view_offset = display_offset
	item_positions.clear()
	for drop in floor_cards + floor_deck_drops + floor_consumable_drops:
		item_positions[Vector2i(int(drop.get("x", -1)), int(drop.get("y", -1)))] = true
	_set_layout_size(display_size, false)
	mouse_filter = Control.MOUSE_FILTER_STOP
	queue_redraw()


func _draw() -> void:
	if panel_style:
		draw_style_box(panel_style, Rect2(Vector2.ZERO, size))
	var tile_pixels := BASE_TILE_PIXELS * zoom
	var columns_rows := _columns_rows(tile_pixels)
	var columns := columns_rows.x
	var rows := columns_rows.y
	var map_size := Vector2(columns, rows) * tile_pixels
	var origin := (size - map_size) * 0.5
	var center := Vector2(player_position) + view_offset
	var first_x := floori(center.x) - floori(float(columns) * 0.5)
	var first_y := floori(center.y) - floori(float(rows) * 0.5)
	var seen: Dictionary = map_data.get("seen", {})
	var visible_now: Dictionary = map_data.get("visible_now", {})
	var enemies: Dictionary = {}
	var enemy_positions: Array = map_data.get("enemy_positions", [])
	var enemy_states: Array = map_data.get("enemy_states", [])
	for enemy_index in range(enemy_positions.size()):
		var enemy_position: Vector2i = enemy_positions[enemy_index]
		var defeated := false
		if enemy_index < enemy_states.size():
			defeated = bool(enemy_states[enemy_index].get("defeated", false))
		if not defeated and visible_now.has(enemy_position):
			enemies[enemy_position] = true
	for remembered_position in map_data.get("enemy_memory", {}).values():
		var last_position: Vector2i = remembered_position
		if seen.has(last_position) and not visible_now.has(last_position):
			enemies[last_position] = false

	for row in range(rows):
		for column in range(columns):
			var position := Vector2i(first_x + column, first_y + row)
			if not seen.has(position):
				continue
			var rect := Rect2(origin + Vector2(column, row) * tile_pixels, Vector2.ONE * tile_pixels)
			var room_type := MapRules.room_type_at(map_data, position)
			var tile_color := TileAppearance.minimap_color(room_type)
			if room_type == "empty" and item_positions.has(position):
				tile_color = TileAppearance.MINIMAP_ITEM
			if enemies.has(position):
				tile_color = TileAppearance.MINIMAP_ENEMY if bool(enemies[position]) else TileAppearance.MINIMAP_REMEMBERED_ENEMY
			draw_rect(rect, tile_color)

	_draw_player_marker(origin, first_x, first_y, tile_pixels)
	_draw_move_handle()
	_draw_resize_handle()


func _draw_player_marker(origin: Vector2, first_x: int, first_y: int, tile_pixels: float) -> void:
	var local := Vector2(player_position.x - first_x, player_position.y - first_y)
	var center := origin + (local + Vector2(0.5, 0.5)) * tile_pixels
	var tile := tile_pixels
	if marker_id == "solid":
		var surround := Rect2(center - Vector2.ONE * tile * 1.5, Vector2.ONE * tile * 3.0)
		draw_rect(surround, Color.WHITE)
		return
	if marker_id == "dot":
		var dot_size := clampf(tile, 5.0, 10.0)
		draw_circle(center, dot_size * 0.5, Color("#101210"))
		draw_circle(center, maxf(1.0, dot_size * 0.32), Color.WHITE)
	elif marker_id == "cross":
		var arm := clampf(tile * 2.0, 12.0, 20.0)
		var thickness := maxf(1.5, arm * 0.13)
		var outline := thickness + 2.0
		draw_rect(Rect2(center - Vector2(outline * 0.5, arm * 0.5), Vector2(outline, arm)), Color("#101210"))
		draw_rect(Rect2(center - Vector2(arm * 0.5, outline * 0.5), Vector2(arm, outline)), Color("#101210"))
		draw_rect(Rect2(center - Vector2(thickness * 0.5, arm * 0.5), Vector2(thickness, arm)), Color.WHITE)
		draw_rect(Rect2(center - Vector2(arm * 0.5, thickness * 0.5), Vector2(arm, thickness)), Color.WHITE)
	else:
		var marker_size := clampf(tile * 2.0, 10.0, 18.0)
		var marker_rect := Rect2(center - Vector2.ONE * marker_size * 0.5, Vector2.ONE * marker_size)
		draw_rect(marker_rect, Color("#101210"), false, maxf(2.5, marker_size * 0.25))
		draw_rect(marker_rect, Color.WHITE, false, maxf(1.0, marker_size * 0.1))


func _draw_resize_handle() -> void:
	var handle_color := Color("#a5b5a7")
	for stripe in range(3):
		var inset := 5.0 + stripe * 4.0
		draw_line(Vector2(size.x - inset, size.y - 1.0), Vector2(size.x - 1.0, size.y - inset), handle_color, 1.0, true)


func _draw_move_handle() -> void:
	var grip := Rect2(Vector2(2.0, 2.0), Vector2(15.0, 15.0))
	var grip_background := Color("#111516")
	grip_background.a = 0.92
	draw_rect(grip, grip_background)
	draw_rect(grip, Color("#52615b"), false, 1.0)
	for x_offset in [6.0, 11.0]:
		for y_offset in [6.0, 11.0]:
			draw_circle(Vector2(x_offset, y_offset), 1.0, Color("#a5b5a7"))


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var button := event as InputEventMouseButton
		if button.button_index == MOUSE_BUTTON_WHEEL_UP and button.pressed:
			_zoom_at(button.position, 1.064)
			accept_event()
		elif button.button_index == MOUSE_BUTTON_WHEEL_DOWN and button.pressed:
			_zoom_at(button.position, 1.0 / 1.064)
			accept_event()
		elif button.button_index == MOUSE_BUTTON_LEFT:
			if button.pressed:
				if _resize_handle_rect().has_point(button.position):
					_resize_dragging = true
					_resize_origin = size
					mouse_default_cursor_shape = Control.CURSOR_FDIAGSIZE
				elif _move_handle_rect().has_point(button.position):
					_move_dragging = true
					mouse_default_cursor_shape = Control.CURSOR_MOVE
				else:
					_pan_dragging = true
					mouse_default_cursor_shape = Control.CURSOR_DRAG
				accept_event()
	elif event is InputEventMouseMotion:
		var motion := event as InputEventMouseMotion
		if _resize_handle_rect().has_point(motion.position):
			mouse_default_cursor_shape = Control.CURSOR_FDIAGSIZE
		elif _move_handle_rect().has_point(motion.position):
			mouse_default_cursor_shape = Control.CURSOR_MOVE
		else:
			mouse_default_cursor_shape = Control.CURSOR_DRAG


func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		var motion := event as InputEventMouseMotion
		if _resize_dragging:
			_resize_origin += motion.relative
			_set_layout_size(_resize_origin)
		elif _move_dragging:
			_set_layout_position(Vector2(offset_left, offset_top) + motion.relative)
		elif _pan_dragging:
			view_offset -= motion.relative / (BASE_TILE_PIXELS * zoom)
			view_offset_changed.emit(view_offset)
			queue_redraw()
		else:
			return
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton:
		var button := event as InputEventMouseButton
		if button.button_index != MOUSE_BUTTON_LEFT or button.pressed:
			return
		if not (_resize_dragging or _move_dragging or _pan_dragging):
			return
		if _resize_dragging:
			size_changed.emit(custom_minimum_size)
		elif _move_dragging:
			position_changed.emit(Vector2(offset_left, offset_top))
		else:
			view_offset_changed.emit(view_offset)
		_resize_dragging = false
		_move_dragging = false
		_pan_dragging = false
		get_viewport().set_input_as_handled()


func _columns_rows(tile_pixels: float) -> Vector2i:
	return Vector2i(
		maxi(1, floori(maxf(1.0, size.x - 2.0) / tile_pixels)),
		maxi(1, floori(maxf(1.0, size.y - 2.0) / tile_pixels))
	)


func _resize_handle_rect() -> Rect2:
	return Rect2(size - Vector2.ONE * 19.0, Vector2.ONE * 19.0)


func _move_handle_rect() -> Rect2:
	return Rect2(Vector2(2.0, 2.0), Vector2(15.0, 15.0))


func _set_layout_size(requested_size: Vector2, limit_to_parent := true) -> void:
	var maximum := Vector2.ONE * MAX_SIZE
	if limit_to_parent and get_parent() is Control:
		var parent_control := get_parent() as Control
		maximum.x = minf(MAX_SIZE, maxf(MIN_SIZE, parent_control.size.x - offset_left - 12.0))
		maximum.y = minf(MAX_SIZE, maxf(MIN_SIZE, parent_control.size.y - offset_top - 12.0))
	var next_size := Vector2(
		clampf(requested_size.x, MIN_SIZE, maximum.x),
		clampf(requested_size.y, MIN_SIZE, maximum.y)
	)
	custom_minimum_size = next_size
	offset_right = offset_left + next_size.x
	offset_bottom = offset_top + next_size.y
	if is_inside_tree():
		queue_redraw()


func _set_layout_position(requested_position: Vector2) -> void:
	var next_position := Vector2(maxf(0.0, requested_position.x), maxf(0.0, requested_position.y))
	if get_parent() is Control:
		var parent_control := get_parent() as Control
		next_position.x = minf(next_position.x, maxf(0.0, parent_control.size.x - size.x))
		next_position.y = minf(next_position.y, maxf(0.0, parent_control.size.y - size.y))
	offset_left = next_position.x
	offset_top = next_position.y
	offset_right = offset_left + size.x
	offset_bottom = offset_top + size.y
	queue_redraw()


func _zoom_at(mouse_position: Vector2, multiplier: float) -> void:
	var old_tile_pixels := BASE_TILE_PIXELS * zoom
	var old_columns_rows := _columns_rows(old_tile_pixels)
	var old_origin := (size - Vector2(old_columns_rows) * old_tile_pixels) * 0.5
	var old_center := Vector2(player_position) + view_offset
	var world_before := old_center + (mouse_position - old_origin) / old_tile_pixels
	zoom = clampf(zoom * multiplier, MIN_ZOOM, MAX_ZOOM)
	var new_tile_pixels := BASE_TILE_PIXELS * zoom
	var new_columns_rows := _columns_rows(new_tile_pixels)
	var new_origin := (size - Vector2(new_columns_rows) * new_tile_pixels) * 0.5
	view_offset = world_before - Vector2(player_position) - (mouse_position - new_origin) / new_tile_pixels
	zoom_changed.emit(zoom)
	view_offset_changed.emit(view_offset)
	queue_redraw()
