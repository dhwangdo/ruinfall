extends Control
class_name PortMapSearchRegionMinimap

const MapRules = preload("res://scripts/map_rules.gd")
const TileAppearance = preload("res://scripts/map_tile_appearance.gd")

var map_data: Dictionary = {}
var region := 1
var target := Vector2i.ZERO
var player := Vector2i.ZERO
var marker_id := "outline"
var pulse_time := 0.0


func configure(data: Dictionary, region_number: int, target_position: Vector2i,
	player_position: Vector2i, player_marker: String) -> void:
	clip_contents = true
	map_data = data
	region = region_number
	target = target_position
	player = player_position
	marker_id = player_marker
	custom_minimum_size = Vector2(380, 240)
	set_process(true)
	queue_redraw()


func _process(delta: float) -> void:
	pulse_time += delta
	queue_redraw()


func _draw() -> void:
	var background := Rect2(Vector2.ZERO, size)
	draw_rect(background, TileAppearance.MINIMAP_BACKGROUND)
	draw_rect(background, Color("#52615b"), false, 1.0)
	if map_data.is_empty() or region < 1 or region > MapRules.REGION_COUNT:
		return
	var region_index := region - 1
	var region_top := region_index * MapRules.REGION_STRIDE
	var region_bottom := region_top + MapRules.REGION_HEIGHT - 1
	var min_x := target.x
	var max_x := target.x
	var min_y := target.y
	var max_y := target.y
	var seen: Dictionary = map_data.get("seen", {})
	for raw_position in seen.keys():
		if not (raw_position is Vector2i):
			continue
		var position: Vector2i = raw_position
		if MapRules.region_index_at(position) != region_index:
			continue
		min_x = mini(min_x, position.x)
		max_x = maxi(max_x, position.x)
		min_y = mini(min_y, position.y)
		max_y = maxi(max_y, position.y)
	min_x = maxi(0, min_x - 2)
	max_x = mini(MapRules.WIDTH - 1, max_x + 2)
	min_y = maxi(region_top, min_y - 2)
	max_y = mini(region_bottom, max_y + 2)
	var columns := max_x - min_x + 1
	var rows := max_y - min_y + 1
	var tile_size := minf((size.x - 20.0) / columns, (size.y - 20.0) / rows)
	if tile_size <= 0.0:
		return
	var map_size := Vector2(columns, rows) * tile_size
	var origin := (size - map_size) * 0.5
	for raw_position in seen.keys():
		if not (raw_position is Vector2i):
			continue
		var position: Vector2i = raw_position
		if MapRules.region_index_at(position) != region_index:
			continue
		if position.x < min_x or position.x > max_x or position.y < min_y or position.y > max_y:
			continue
		var room_type := MapRules.room_type_at(map_data, position)
		var cell := Rect2(origin + Vector2(position.x - min_x, position.y - min_y) * tile_size, Vector2.ONE * tile_size)
		draw_rect(cell, TileAppearance.minimap_color(room_type))
	_draw_player_marker(origin, min_x, min_y, max_x, max_y, tile_size)
	_draw_target(origin, min_x, min_y, tile_size)


func _draw_player_marker(origin: Vector2, min_x: int, min_y: int, max_x: int, max_y: int, tile_size: float) -> void:
	if player.x < min_x or player.x > max_x or player.y < min_y or player.y > max_y:
		return
	var center := origin + (Vector2(player.x - min_x, player.y - min_y) + Vector2(0.5, 0.5)) * tile_size
	if marker_id == "solid":
		draw_rect(Rect2(center - Vector2.ONE * tile_size * 1.5, Vector2.ONE * tile_size * 3.0), Color.WHITE)
	elif marker_id == "dot":
		draw_circle(center, tile_size * 0.27, Color.WHITE)
	elif marker_id == "cross":
		var arm := tile_size * 0.8
		var width := maxf(1.0, tile_size * 0.2)
		draw_rect(Rect2(center - Vector2(width * 0.5, arm * 0.5), Vector2(width, arm)), Color.WHITE)
		draw_rect(Rect2(center - Vector2(arm * 0.5, width * 0.5), Vector2(arm, width)), Color.WHITE)
	else:
		var rect := Rect2(center - Vector2.ONE * tile_size * 0.38, Vector2.ONE * tile_size * 0.76)
		draw_rect(rect, Color.WHITE, false, maxf(1.0, tile_size * 0.1))


func _draw_target(origin: Vector2, min_x: int, min_y: int, tile_size: float) -> void:
	var target_rect := Rect2(origin + Vector2(target.x - min_x, target.y - min_y) * tile_size, Vector2.ONE * tile_size)
	var pulse := 0.72 + 0.28 * sin(pulse_time * 5.0)
	var glow := Color("#ffbf3d")
	glow.a = 0.18 + pulse * 0.2
	draw_rect(target_rect.grow(tile_size * 0.12), glow)
	var outline := Color("#ffd04c")
	outline.a = pulse
	draw_rect(target_rect, outline, false, maxf(2.0, tile_size * 0.14))
	var center := target_rect.get_center()
	var center_glow := Color("#ffe28a", 0.32 + pulse * 0.16)
	draw_circle(center, maxf(2.4, tile_size * 0.22), center_glow)
	draw_circle(center, maxf(1.4, tile_size * 0.11), Color("#fff1b8"))
