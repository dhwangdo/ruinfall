extends Control
class_name PortMapSearchTile

const MapRules = preload("res://scripts/map_rules.gd")
const TileAppearance = preload("res://scripts/map_tile_appearance.gd")

var map_data: Dictionary = {}
var world_position := Vector2i.ZERO
var map_seed := 0


func configure(data: Dictionary, position: Vector2i, display_size := Vector2(48, 48), seed := 0) -> void:
	map_data = data
	world_position = position
	map_seed = seed
	custom_minimum_size = display_size
	size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	size_flags_vertical = Control.SIZE_SHRINK_CENTER
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true
	queue_redraw()


func _draw() -> void:
	if map_data.is_empty():
		return
	var room_type := MapRules.room_type_at(map_data, world_position)
	var rect := Rect2(Vector2.ONE, size - Vector2.ONE * 2.0)
	draw_rect(rect, TileAppearance.full_map_fill(world_position, room_type, MapRules.region_index_at(world_position)))
	draw_rect(rect, TileAppearance.full_map_edge(room_type), false, 1.0)
	if room_type == "deckVault":
		TileAppearance.draw_vault_symbol(self, rect, minf(rect.size.x, rect.size.y))
		return
	if room_type == "tinkerer":
		TileAppearance.draw_tinkerer_sticker(self, rect, minf(size.x, size.y), world_position, map_seed)
		return
	var badge := str(TileAppearance.ROOM_BADGES.get(room_type, ""))
	if badge.is_empty():
		return
	TileAppearance.draw_room_badge(self, rect, minf(rect.size.x, rect.size.y), badge, get_theme_default_font())
