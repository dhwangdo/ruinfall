extends Control
class_name PortMapSearchTile

const MapRules = preload("res://scripts/map_rules.gd")
const TileAppearance = preload("res://scripts/map_tile_appearance.gd")
const TILE_INSET := 1.0
const DeckIconArt = preload("res://scripts/deck_icon_art.gd")
var _future_background_layer: Node2D

var map_data: Dictionary = {}
var world_position := Vector2i.ZERO
var map_seed := 0
const VaultRules = preload("res://scripts/deck_vault_rules.gd")


func configure(data: Dictionary, position: Vector2i, display_size := Vector2(48, 48), seed := 0) -> void:
	map_data = data
	world_position = position
	map_seed = seed
	custom_minimum_size = display_size
	size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	size_flags_vertical = Control.SIZE_SHRINK_CENTER
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true
	if not is_instance_valid(_future_background_layer):
		_future_background_layer = Node2D.new()
		_future_background_layer.name = "FutureVaultBackground"
		_future_background_layer.show_behind_parent = true
		_future_background_layer.material = DeckIconArt.future_material()
		_future_background_layer.draw.connect(_draw_future_background)
		add_child(_future_background_layer)
	_future_background_layer.visible = MapRules.room_type_at(map_data, world_position) == "deckVault" and VaultRules.region_offset(map_data, world_position) > 0
	if not resized.is_connected(_future_background_layer.queue_redraw):
		resized.connect(_future_background_layer.queue_redraw)
	queue_redraw()
	_future_background_layer.queue_redraw()


func _draw_future_background() -> void:
	DeckIconArt.draw_future_background(_future_background_layer,
		Rect2(Vector2.ONE * TILE_INSET, size - Vector2.ONE * TILE_INSET * 2.0))


func _draw() -> void:
	if map_data.is_empty():
		return
	var room_type := MapRules.room_type_at(map_data, world_position)
	var rect := Rect2(Vector2.ONE * TILE_INSET, size - Vector2.ONE * TILE_INSET * 2.0)
	if not (room_type == "deckVault" and VaultRules.region_offset(map_data, world_position) > 0):
		draw_rect(rect, TileAppearance.full_map_fill(world_position, room_type, MapRules.region_index_at(world_position)))
	draw_rect(rect, TileAppearance.full_map_edge(room_type), false, 1.0)
	if room_type == "deckVault":
		texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		if VaultRules.region_offset(map_data, world_position) > 0:
			draw_rect(rect, Color("#eed079"), false, 1.0)
		TileAppearance.draw_vault_symbol(self, rect, minf(rect.size.x, rect.size.y), Color("#db8a3d"),
			VaultRules.region_offset(map_data, world_position) > 0)
		return
	if TileAppearance.ROOM_TEXTURES.has(room_type):
		texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		TileAppearance.draw_room_art(self, rect, room_type)
		return
	if room_type == "tinkerer":
		TileAppearance.draw_tinkerer_sticker(self, rect, minf(size.x, size.y), world_position, map_seed)
		return
	var badge := str(TileAppearance.ROOM_BADGES.get(room_type, ""))
	if badge.is_empty():
		return
	TileAppearance.draw_room_badge(self, rect, minf(rect.size.x, rect.size.y), badge, get_theme_default_font())
