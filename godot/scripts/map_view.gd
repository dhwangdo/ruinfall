extends Control
class_name PortMapView

const MapRules = preload("res://scripts/map_rules.gd")
const TileAppearance = preload("res://scripts/map_tile_appearance.gd")
const EnemyCatalog = preload("res://scripts/enemy_catalog.gd")
const CompactCardView = preload("res://scripts/compact_card_view.gd")
const ConsumableTicketVisual = preload("res://scripts/consumable_ticket_visual.gd")
const WEB_MAP_FONT: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")
const ROOM_BADGES := TileAppearance.ROOM_BADGES
const MAP_TILE_SIZE_DEFAULT := 85.0
const MAP_TILE_SIZE_MIN := 25.5
const MAP_TILE_SIZE_DEBUG_MIN := 8.5 # 136px × browser debug minimum zoom .0625
const MAP_TILE_SIZE_MAX := 119.0
const MAP_TILE_SIZE_STEP := 5.44 # 136px web tile × 0.04 zoom step

signal tile_pressed(position: Vector2i)
signal floor_items_pressed
signal camera_changed(center: Vector2, zoom: float)
signal ping_clear_requested
signal deck_vault_preview_requested(position: Vector2i, anchor_global_rect: Rect2)
signal deck_vault_preview_clear_requested

const VAULT_COLOR := Color("#ef8129")

var map_data: Dictionary = {}
var debug_mode := false
var floor_card_positions: Dictionary = {}
var floor_deck_positions: Dictionary = {}
var floor_consumable_positions: Dictionary = {}
var player_position := Vector2i.ZERO
var defeated_enemies: Array = []
var ping_position := Vector2i(-1, -1)
var ping_label := ""
var camera_center := Vector2(106.5, 0.5)
var tile_size := MAP_TILE_SIZE_DEFAULT
var gold_popup_text := ""
var gold_popup_remaining := 0.0
var ping_flash_time := 0.0
var _mouse_down := false
var _dragged := false
var _press_position := Vector2.ZERO
var _last_ping_arrow_click_msec := 0
var _hovered_deck_vault_position := Vector2i(-1, -1)
var _enemy_name_cache: Dictionary = {}
var _enemy_state_font: Font
var _enemy_name_font: Font
var _motion: RefCounted
var _camera_duration_ms := 0.0


func _ready() -> void:
	mouse_exited.connect(_clear_deck_vault_hover)
	if OS.has_feature("web"):
		_enemy_state_font = _web_map_font(900)
		_enemy_name_font = _web_map_font(700)
	else:
		var state_font := SystemFont.new()
		state_font.font_names = PackedStringArray(["Arial"])
		state_font.font_weight = 900
		_enemy_state_font = state_font
		var name_font := SystemFont.new()
		name_font.font_names = PackedStringArray(["Arial"])
		name_font.font_weight = 700
		_enemy_name_font = name_font


func _web_map_font(weight: int) -> FontVariation:
	var font := FontVariation.new()
	font.base_font = WEB_MAP_FONT
	font.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): float(weight)}
	return font


func configure(data: Dictionary, player: Vector2i, defeated: Array, center: Vector2, zoom: float,
	floor_cards: Array = [], floor_deck_drops: Array = [], floor_consumable_drops: Array = [],
	ping: Vector2i = Vector2i(-1, -1), ping_text: String = "",
	motion: RefCounted = null, camera_duration_ms: float = 0.0) -> void:
	_clear_deck_vault_hover()
	_motion = motion
	_camera_duration_ms = maxf(camera_duration_ms, 0.0)
	map_data = data
	player_position = player
	defeated_enemies = defeated.duplicate()
	ping_position = ping
	ping_label = ping_text
	floor_card_positions.clear()
	floor_deck_positions.clear()
	floor_consumable_positions.clear()
	for drop in floor_cards:
		var drop_position := Vector2i(int(drop.get("x", -1)), int(drop.get("y", -1)))
		if not floor_card_positions.has(drop_position):
			floor_card_positions[drop_position] = drop.get("card", {})
	for drop in floor_deck_drops:
		floor_deck_positions[Vector2i(int(drop.get("x", -1)), int(drop.get("y", -1)))] = true
	for drop in floor_consumable_drops:
		var drop_position := Vector2i(int(drop.get("x", -1)), int(drop.get("y", -1)))
		if not floor_consumable_positions.has(drop_position):
			floor_consumable_positions[drop_position] = drop.get("consumable", {}).duplicate(true)
	if _motion != null:
		_motion.call("retarget_camera", center, _camera_duration_ms)
		camera_center = _motion.call("camera_position")
	else:
		camera_center = center
	tile_size = clampf(zoom, MAP_TILE_SIZE_DEBUG_MIN if debug_mode else MAP_TILE_SIZE_MIN, MAP_TILE_SIZE_MAX)
	if _motion != null:
		_update_motion_visible_enemies()
	set_process(gold_popup_remaining > 0.0 or _has_ping() or _motion_is_animating())
	queue_redraw()
	call_deferred("_focus_player_if_needed")


func show_gold_popup(amount: int) -> void:
	if amount <= 0:
		return
	gold_popup_text = "+$%d" % amount
	gold_popup_remaining = 1.25
	set_process(true)
	queue_redraw()


func set_ping(position: Vector2i, label: String) -> void:
	ping_position = position
	ping_label = label
	ping_flash_time = 0.0
	_last_ping_arrow_click_msec = 0
	set_process(gold_popup_remaining > 0.0 or _has_ping() or _motion_is_animating())
	queue_redraw()


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Color("#0e1210"))
	if map_data.is_empty() or tile_size <= 0.0:
		return
	var half_tiles := size / (2.0 * tile_size)
	var first_x := floori(camera_center.x - half_tiles.x) - 1
	var last_x := ceili(camera_center.x + half_tiles.x) + 1
	var first_y := floori(camera_center.y - half_tiles.y) - 1
	var last_y := ceili(camera_center.y + half_tiles.y) + 1
	var seen: Dictionary = map_data.get("seen", {})
	var visible_now: Dictionary = map_data.get("visible_now", {})
	var visible_enemy_cells: Dictionary = {}
	var remembered_enemy_cells: Dictionary = {}
	var visible_floor_card_cells: Dictionary = {}
	var visible_floor_deck_cells: Dictionary = {}
	var visible_floor_consumable_cells: Dictionary = {}
	for drop_position in floor_card_positions.keys():
		if debug_mode or seen.has(drop_position):
			visible_floor_card_cells[drop_position] = true
	for drop_position in floor_deck_positions.keys():
		if debug_mode or seen.has(drop_position):
			visible_floor_deck_cells[drop_position] = true
	for drop_position in floor_consumable_positions.keys():
		if debug_mode or seen.has(drop_position):
			visible_floor_consumable_cells[drop_position] = true
	var enemy_positions: Array = map_data.get("enemy_positions", [])
	var enemy_states: Array = map_data.get("enemy_states", [])
	for enemy_index in range(enemy_positions.size()):
		var enemy_position: Vector2i = enemy_positions[enemy_index]
		var is_defeated := defeated_enemies.has(enemy_position)
		if enemy_index < enemy_states.size():
			is_defeated = is_defeated or bool(enemy_states[enemy_index].get("defeated", false))
		if not is_defeated and (debug_mode or visible_now.has(enemy_position)):
			var visible_state: Dictionary = enemy_states[enemy_index].duplicate(true) if enemy_index < enemy_states.size() else {}
			visible_state["_visual_enemy_id"] = enemy_index
			visible_enemy_cells[enemy_position] = visible_state
	var enemy_memory: Dictionary = map_data.get("enemy_memory", {})
	var enemy_memory_states: Dictionary = map_data.get("enemy_memory_states", {})
	if not debug_mode:
		for enemy_id in enemy_memory.keys():
			var remembered_position: Vector2i = enemy_memory[enemy_id]
			var position: Vector2i = remembered_position
			if seen.has(position) and not visible_now.has(position) and not defeated_enemies.has(position):
				var enemy_index := int(enemy_id)
				var enemy_state: Dictionary = enemy_memory_states.get(enemy_id, {})
				if enemy_index >= 0 and enemy_index < enemy_states.size():
					enemy_state = enemy_state.duplicate(true)
					enemy_state["encounter_index"] = int(enemy_states[enemy_index].get("encounter_index", 0))
					remembered_enemy_cells[position] = enemy_state
	for y in range(first_y, last_y + 1):
		for x in range(first_x, last_x + 1):
			var position := Vector2i(x, y)
			var rect := _cell_rect(position)
			var room_type := MapRules.room_type_at(map_data, position)
			if room_type == "void" or (not debug_mode and not seen.has(position)):
				continue
			var fill := TileAppearance.full_map_fill(position, room_type, MapRules.region_index_at(position))
			var edge := TileAppearance.full_map_edge(room_type)
			if position == player_position:
				fill = Color("#d9b852")
				edge = Color("#a7771f")
			elif not debug_mode and not visible_now.has(position):
				fill = TileAppearance.out_of_vision_color(fill, room_type)
				edge = TileAppearance.out_of_vision_color(edge, room_type)
			draw_rect(rect, fill)
			if tile_size >= 9.0:
				draw_rect(rect, edge, false, 1.0)
			if tile_size >= 38.0 and room_type == "tinkerer":
				TileAppearance.draw_tinkerer_sticker(self, rect, tile_size, position,
					int(map_data.get("seed", map_data.get("map_seed", 0))))
			elif tile_size >= 38.0 and ROOM_BADGES.has(room_type):
				_draw_room_badge(rect, str(ROOM_BADGES[room_type]))
			if position == player_position:
				if visible_floor_card_cells.has(position):
					_draw_card_drop(rect, floor_card_positions[position])
			elif visible_enemy_cells.has(position) or remembered_enemy_cells.has(position):
				pass
			elif visible_floor_card_cells.has(position):
				_draw_card_drop(rect, floor_card_positions[position])
			if room_type == "deckVault" and tile_size >= 10.0:
				_draw_vault_symbol(rect)
			if visible_floor_deck_cells.has(position):
				_draw_deck_drop_symbol(rect)
			if visible_floor_consumable_cells.has(position):
				_draw_consumable_drop(rect, floor_consumable_positions.get(position, {}))
			var gold_amount := int(map_data.get("gold_piles", {}).get(position, 0))
			if gold_amount > 0:
				var has_primary_item := visible_floor_card_cells.has(position) \
					or visible_floor_deck_cells.has(position) or visible_floor_consumable_cells.has(position)
				var gold_art_rect: Rect2
				if has_primary_item:
					var zoom_scale := tile_size / 136.0
					var secondary_size := 54.0 * zoom_scale
					var secondary_inset := 3.0 * zoom_scale
					gold_art_rect = Rect2(rect.end - Vector2.ONE * (secondary_size + secondary_inset),
						Vector2.ONE * secondary_size)
				else:
					var primary_size := tile_size * 0.94
					gold_art_rect = Rect2(rect.get_center() - Vector2.ONE * primary_size * 0.5,
						Vector2.ONE * primary_size)
				TileAppearance.draw_gold_pile(self, gold_art_rect, gold_amount)
	_draw_enemy_overlays(visible_enemy_cells, remembered_enemy_cells)
	if _has_ping():
		var ping_rect := _cell_rect(ping_position)
		if Rect2(Vector2.ZERO, size).intersects(ping_rect):
			_draw_ping_tile(ping_rect)
	if _has_ping() and _ping_center_is_offscreen():
		_draw_ping_arrow()
	if gold_popup_remaining > 0.0:
		var elapsed := 1.25 - gold_popup_remaining
		var player_rect := _cell_rect(player_position)
		var baseline := player_rect.position.y - elapsed * 16.0
		var popup_color := Color("#f0c646")
		popup_color.a = clampf(gold_popup_remaining / 0.35, 0.0, 1.0)
		draw_string(ThemeDB.fallback_font, Vector2(player_rect.get_center().x - 36.0, baseline), gold_popup_text,
			HORIZONTAL_ALIGNMENT_CENTER, 72.0, 18, popup_color)


func _process(delta: float) -> void:
	if _motion != null:
		camera_center = _motion.call("camera_position")
	gold_popup_remaining = maxf(0.0, gold_popup_remaining - delta)
	if gold_popup_remaining == 0.0:
		gold_popup_text = ""
	if _has_ping():
		ping_flash_time += delta
	set_process(gold_popup_remaining > 0.0 or _has_ping() or _motion_is_animating())
	queue_redraw()


func _motion_is_animating() -> bool:
	return _motion != null and bool(_motion.call("is_animating"))


func _update_motion_visible_enemies() -> void:
	var visible_positions: Dictionary = {}
	var visible_now: Dictionary = map_data.get("visible_now", {})
	var enemy_positions: Array = map_data.get("enemy_positions", [])
	var enemy_states: Array = map_data.get("enemy_states", [])
	for enemy_index in range(enemy_positions.size()):
		var position: Vector2i = enemy_positions[enemy_index]
		var is_defeated := defeated_enemies.has(position)
		if enemy_index < enemy_states.size():
			is_defeated = is_defeated or bool(enemy_states[enemy_index].get("defeated", false))
		if not is_defeated and (debug_mode or visible_now.has(position)):
			visible_positions[enemy_index] = Vector2(position)
	_motion.call("update_visible_enemies", visible_positions)


func _has_ping() -> bool:
	return ping_position.x >= 0 and ping_position.y >= 0


func _ping_screen_center() -> Vector2:
	return size * 0.5 + (Vector2(ping_position) + Vector2(0.5, 0.5) - camera_center) * tile_size


func _ping_center_is_offscreen() -> bool:
	var center := _ping_screen_center()
	return center.x < 0.0 or center.x > size.x or center.y < 0.0 or center.y > size.y


func _draw_ping_tile(rect: Rect2) -> void:
	var pulse := 0.72 + 0.28 * sin(ping_flash_time * 5.0)
	var glow := Color("#ff334b")
	glow.a = pulse
	var inset := maxf(1.0, tile_size * 0.04)
	var halo := Color("#ff334b")
	halo.a = pulse * 0.2
	draw_rect(rect.grow(-inset - 1.0), halo, false, maxf(1.0, tile_size * 0.08))
	draw_rect(rect.grow(-inset), glow, false, maxf(1.0, tile_size * 0.055))


func _ping_arrow_center() -> Vector2:
	var direction := _ping_screen_center() - size * 0.5
	if direction.length_squared() < 0.01:
		return size * 0.5
	var half_bounds := Vector2(maxf(14.0, size.x * 0.5 - 28.0), maxf(14.0, size.y * 0.5 - 28.0))
	var x_scale := half_bounds.x / absf(direction.x) if absf(direction.x) > 0.01 else INF
	var y_scale := half_bounds.y / absf(direction.y) if absf(direction.y) > 0.01 else INF
	return size * 0.5 + direction * minf(x_scale, y_scale)


func _draw_ping_arrow() -> void:
	var direction := (_ping_screen_center() - size * 0.5).normalized()
	var center := _ping_arrow_center()
	var perpendicular := Vector2(-direction.y, direction.x)
	var points := PackedVector2Array([
		center + direction * 15.0,
		center - direction * 10.0 + perpendicular * 9.0,
		center - direction * 10.0 - perpendicular * 9.0,
	])
	var pulse := 0.72 + 0.28 * sin(ping_flash_time * 5.0)
	var arrow_color := Color("#ff5367")
	arrow_color.a = pulse
	draw_colored_polygon(points, Color("#07120f"))
	draw_polyline(PackedVector2Array([points[0], points[1], points[2], points[0]]), arrow_color, 3.0, true)
	if ping_label.is_empty():
		return
	var map_font := get_theme_default_font()
	var text_size := map_font.get_string_size(ping_label, HORIZONTAL_ALIGNMENT_LEFT, -1, 13)
	var label_width := minf(190.0, text_size.x + 16.0)
	var label_height := 25.0
	var label_x := clampf(center.x - label_width * 0.5, 4.0, size.x - label_width - 4.0)
	var label_y := clampf(center.y - 34.0, 4.0, size.y - label_height - 4.0)
	var label_rect := Rect2(Vector2(label_x, label_y), Vector2(label_width, label_height))
	draw_rect(label_rect, Color("#2a070e"))
	draw_rect(label_rect, arrow_color, false, 1.5)
	draw_string(map_font, Vector2(label_x + 8.0, label_y + 17.0), ping_label,
		HORIZONTAL_ALIGNMENT_LEFT, label_width - 16.0, 13, Color.WHITE)


func _is_ping_arrow_at(point: Vector2) -> bool:
	return _has_ping() and _ping_center_is_offscreen() and point.distance_to(_ping_arrow_center()) <= 24.0


func _draw_vault_symbol(rect: Rect2) -> void:
	TileAppearance.draw_vault_symbol(self, rect, tile_size, VAULT_COLOR)


func _draw_room_badge(rect: Rect2, label: String) -> void:
	TileAppearance.draw_room_badge(self, rect, tile_size, label, get_theme_default_font())


func _draw_card_drop(rect: Rect2, card: Dictionary) -> void:
	# Browser MapFloorItem uses the standard 82px compact card in a 136px tile.
	var card_size := CompactCardView.CARD_SIZE * (tile_size / 136.0)
	CompactCardView.draw_map_preview(self, card, Rect2(rect.get_center() - card_size * 0.5, card_size))


func _draw_enemy_overlays(visible_enemies: Dictionary, remembered_enemies: Dictionary) -> void:
	var enemy_positions: Dictionary = visible_enemies.duplicate()
	for position in remembered_enemies.keys():
		if not enemy_positions.has(position):
			enemy_positions[position] = remembered_enemies[position]
	for position in enemy_positions.keys():
		var enemy_state: Dictionary = enemy_positions[position]
		var awareness := str(enemy_state.get("awareness", ""))
		var state_symbol := TileAppearance.awareness_symbol(awareness)
		if state_symbol.is_empty():
			continue
		var encounter_index := int(enemy_state.get("encounter_index", -1))
		var is_remembered := remembered_enemies.has(position) and not visible_enemies.has(position)
		var has_horizontal_neighbor := enemy_positions.has(position + Vector2i.LEFT) \
			or enemy_positions.has(position + Vector2i.RIGHT)
		var rect := _cell_rect(position)
		if _motion != null and enemy_state.has("_visual_enemy_id"):
			var visual_position: Vector2 = _motion.call("enemy_position", int(enemy_state["_visual_enemy_id"]), Vector2(position))
			rect.position += (visual_position - Vector2(position)) * tile_size
		TileAppearance.draw_enemy_badge(self, rect, tile_size, state_symbol,
			_enemy_name(encounter_index), is_remembered, has_horizontal_neighbor,
			_enemy_state_font, _enemy_name_font)


func _enemy_name(encounter_index: int) -> String:
	if encounter_index < 0:
		return ""
	if not _enemy_name_cache.has(encounter_index):
		var label_rng := RandomNumberGenerator.new()
		label_rng.seed = encounter_index + 1
		var encounter: Dictionary = EnemyCatalog.create_encounter(encounter_index, label_rng)
		var enemies: Array = encounter.get("enemies", [])
		var label := str(encounter.get("name", ""))
		if enemies.size() > 1:
			var first_name := str(enemies[0].get("name", ""))
			var same_enemy := true
			for enemy in enemies:
				if str(enemy.get("name", "")) != first_name:
					same_enemy = false
					break
			label = "%s %d마리" % [first_name, enemies.size()] if same_enemy else "%s + ?" % first_name
		_enemy_name_cache[encounter_index] = label
	return str(_enemy_name_cache[encounter_index])


func _draw_deck_drop_symbol(rect: Rect2) -> void:
	var icon_size := tile_size * 0.34
	var icon := Rect2(rect.position + Vector2(tile_size * 0.57, tile_size * 0.57), Vector2.ONE * icon_size)
	draw_rect(icon, Color("#d99a47"))
	draw_rect(icon.grow(-tile_size * 0.08), Color("#2e261b"))
	draw_rect(icon, Color("#f3bf62"), false, maxf(1.0, tile_size * 0.05))


func _draw_consumable_drop(rect: Rect2, consumable: Dictionary) -> void:
	if consumable.is_empty():
		return
	var ticket_size := tile_size * (82.0 / 136.0)
	ConsumableTicketVisual.draw_compact(self, consumable,
		Rect2(rect.get_center() - Vector2.ONE * ticket_size * 0.5, Vector2.ONE * ticket_size))


func _floor_item_hit_test(position: Vector2i, point: Vector2) -> bool:
	var rect := _cell_rect(position)
	if floor_consumable_positions.has(position):
		var ticket_size := tile_size * (82.0 / 136.0)
		var ticket_rect := Rect2(rect.get_center() - Vector2.ONE * ticket_size * 0.5, Vector2.ONE * ticket_size)
		if ticket_rect.has_point(point):
			return true
	if floor_deck_positions.has(position):
		var deck_size := tile_size * 0.34
		var deck_rect := Rect2(rect.position + Vector2(tile_size * 0.57, tile_size * 0.57), Vector2.ONE * deck_size)
		if deck_rect.has_point(point):
			return true
	if floor_card_positions.has(position):
		var icon_scale := 0.24 if position == player_position else 0.48
		var alignment := Vector2(0.76, 0.76) if position == player_position else Vector2(0.5, 0.5)
		var icon_size := tile_size * icon_scale
		var icon_center := rect.position + rect.size * alignment
		var icon_rect := Rect2(icon_center - Vector2(icon_size * 0.5, icon_size * 0.58),
			Vector2(icon_size, icon_size * 1.16))
		if icon_rect.grow(maxf(1.0, tile_size * 0.06) * 0.5).has_point(point):
			return true
	var gold_amount := int(map_data.get("gold_piles", {}).get(position, 0))
	if gold_amount > 0:
		var has_primary_item := floor_card_positions.has(position) or floor_deck_positions.has(position) \
			or floor_consumable_positions.has(position)
		var gold_art_rect: Rect2
		if has_primary_item:
			var zoom_scale := tile_size / 136.0
			var secondary_size := 54.0 * zoom_scale
			var secondary_inset := 3.0 * zoom_scale
			gold_art_rect = Rect2(rect.end - Vector2.ONE * (secondary_size + secondary_inset),
				Vector2.ONE * secondary_size)
		else:
			var primary_size := tile_size * 0.94
			gold_art_rect = Rect2(rect.get_center() - Vector2.ONE * primary_size * 0.5,
				Vector2.ONE * primary_size)
		if gold_art_rect.has_point(point):
			return true
	return false


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_button := event as InputEventMouseButton
		if mouse_button.button_index == MOUSE_BUTTON_WHEEL_UP and mouse_button.pressed:
			_clear_deck_vault_hover()
			_zoom_at(mouse_button.position, 1.0)
			accept_event()
		elif mouse_button.button_index == MOUSE_BUTTON_WHEEL_DOWN and mouse_button.pressed:
			_clear_deck_vault_hover()
			_zoom_at(mouse_button.position, -1.0)
			accept_event()
		elif mouse_button.button_index == MOUSE_BUTTON_LEFT:
			if mouse_button.pressed:
				_mouse_down = true
				_dragged = false
				_press_position = mouse_button.position
			else:
				if _mouse_down and not _dragged:
					_clear_deck_vault_hover()
				if _mouse_down and not _dragged:
					if _is_ping_arrow_at(mouse_button.position):
						var now := Time.get_ticks_msec()
						if _last_ping_arrow_click_msec > 0 and now - _last_ping_arrow_click_msec <= 450:
							ping_clear_requested.emit()
							_last_ping_arrow_click_msec = 0
						else:
							_last_ping_arrow_click_msec = now
					else:
						_last_ping_arrow_click_msec = 0
						var clicked_position := _world_position(mouse_button.position)
						var has_floor_drop := floor_card_positions.has(clicked_position) \
							or floor_deck_positions.has(clicked_position) \
							or floor_consumable_positions.has(clicked_position)
						if clicked_position == player_position and (has_floor_drop \
							or _floor_item_hit_test(clicked_position, mouse_button.position)):
							floor_items_pressed.emit()
						else:
							tile_pressed.emit(clicked_position)
				_mouse_down = false
				accept_event()
	elif event is InputEventMouseMotion:
		var motion := event as InputEventMouseMotion
		if _mouse_down:
			if not _dragged and motion.position.distance_to(_press_position) > 6.0:
				_dragged = true
				_last_ping_arrow_click_msec = 0
				_clear_deck_vault_hover()
			if _dragged:
				camera_center -= motion.relative / tile_size
				_snap_motion_camera()
				queue_redraw()
				camera_changed.emit(camera_center, tile_size)
				accept_event()
		else:
			_update_deck_vault_hover(motion.position)


func focus_if_player_left_view() -> void:
	_focus_player_if_needed()


func _focus_player_if_needed() -> void:
	if _motion != null:
		return
	if size.x <= 1.0 or size.y <= 1.0 or tile_size <= 0.0:
		return
	var half_tiles := size / (2.0 * tile_size)
	var player_center := Vector2(player_position) + Vector2(0.5, 0.5)
	if absf(player_center.x - camera_center.x) > half_tiles.x - 2.0 \
		or absf(player_center.y - camera_center.y) > half_tiles.y - 2.0:
		camera_center = player_center
		queue_redraw()
		camera_changed.emit(camera_center, tile_size)


func _zoom_at(mouse_position: Vector2, direction: float) -> void:
	_clear_deck_vault_hover()
	var world_before := _world_position_float(mouse_position)
	tile_size = clampf(tile_size + direction * MAP_TILE_SIZE_STEP,
		MAP_TILE_SIZE_DEBUG_MIN if debug_mode else MAP_TILE_SIZE_MIN, MAP_TILE_SIZE_MAX)
	var offset_from_center := (mouse_position - size * 0.5) / tile_size
	camera_center = world_before - offset_from_center
	_snap_motion_camera()
	queue_redraw()
	camera_changed.emit(camera_center, tile_size)


func zoom_by(direction: float) -> void:
	if is_zero_approx(direction):
		return
	_zoom_at(size * 0.5, direction)


func reset_zoom() -> void:
	_clear_deck_vault_hover()
	tile_size = MAP_TILE_SIZE_DEFAULT
	camera_center = Vector2(player_position) + Vector2(0.5, 0.5)
	_snap_motion_camera()
	queue_redraw()
	camera_changed.emit(camera_center, tile_size)


func _snap_motion_camera() -> void:
	if _motion == null:
		return
	_motion.call("snap_camera", camera_center)
	camera_center = _motion.call("camera_position")


func _world_position(mouse_position: Vector2) -> Vector2i:
	var point := _world_position_float(mouse_position)
	return Vector2i(floori(point.x), floori(point.y))


func _world_position_float(mouse_position: Vector2) -> Vector2:
	return camera_center + (mouse_position - size * 0.5) / tile_size


func _cell_rect(position: Vector2i) -> Rect2:
	var center := size * 0.5 + (Vector2(position) + Vector2(0.5, 0.5) - camera_center) * tile_size
	return Rect2(center - Vector2.ONE * tile_size * 0.5, Vector2.ONE * tile_size)


func _update_deck_vault_hover(point: Vector2) -> void:
	var position := _world_position(point)
	var seen: Dictionary = map_data.get("seen", {})
	var room_key := "%d,%d" % [position.x, position.y]
	var opened_vaults: Dictionary = map_data.get("opened_deck_vaults", {})
	if (not debug_mode and not seen.has(position)) or MapRules.room_type_at(map_data, position) != "deckVault" \
		or bool(opened_vaults.get(room_key, false)):
		_clear_deck_vault_hover()
		return
	if _hovered_deck_vault_position == position:
		return
	_hovered_deck_vault_position = position
	var global_rect: Rect2 = get_global_transform_with_canvas() * _cell_rect(position)
	deck_vault_preview_requested.emit(position, global_rect)


func _clear_deck_vault_hover() -> void:
	if _hovered_deck_vault_position == Vector2i(-1, -1):
		return
	_hovered_deck_vault_position = Vector2i(-1, -1)
	deck_vault_preview_clear_requested.emit()
