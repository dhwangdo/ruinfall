extends RefCounted

const CardStickers = preload("res://scripts/stickers.gd")

static var _linear_sticker_textures: Dictionary = {}

const CARD_ART_ADJUSTMENT := {
	"bookmark": Vector2(1.24, -10.0),
	"moonstone": Vector2(1.14, 0.0),
	"clockwork": Vector2(1.1, 0.0),
	"kite": Vector2(1.1, 3.0),
	"anchor": Vector2(1.0, 12.0),
	"glowDinosaur": Vector2(0.94, -5.0),
	"bluebird": Vector2(0.94, -10.0),
	"hook": Vector2(0.98, -2.0),
	"parachute": Vector2(1.05, 10.0),
	"comet": Vector2(0.9, 10.0),
}

const MAP_ART_TRANSLATION := {
	"bookmark": Vector2(-3.6, -1.4),
	"moonstone": Vector2(-7.2, -0.9),
	"clockwork": Vector2(-3.9, -0.7),
	"kite": Vector2(3.1, -1.8),
	"anchor": Vector2(-2.8, -1.6),
	"glowDinosaur": Vector2(-0.8, 1.7),
	"bluebird": Vector2(2.5, 1.2),
	"hook": Vector2(7.4, 1.6),
	"parachute": Vector2(0.7, 3.2),
	"comet": Vector2(-3.2, 1.7),
}


static func draw_map_sticker(canvas: CanvasItem, sticker_id: String, slot_rect: Rect2) -> void:
	var info: Dictionary = CardStickers.STICKERS.get(sticker_id, {})
	if info.is_empty() or slot_rect.size.x <= 0.0 or slot_rect.size.y <= 0.0:
		return
	var atlas := linear_sticker_texture(sticker_id)
	if atlas == null or atlas.diffuse_texture == null:
		return
	var crop_right := sticker_id == "parachute"

	var art_size := minf(slot_rect.size.x, slot_rect.size.y)
	var adjustment: Vector2 = CARD_ART_ADJUSTMENT.get(sticker_id, Vector2.ONE)
	var map_translation: Vector2 = MAP_ART_TRANSLATION.get(sticker_id, Vector2.ZERO)
	var rendered_size := art_size * adjustment.x
	var translation := art_size * Vector2(adjustment.y + map_translation.x, map_translation.y) / 100.0
	var draw_size := Vector2(rendered_size * (0.92 if crop_right else 1.0), rendered_size)
	var draw_origin := slot_rect.get_center() - Vector2(rendered_size, rendered_size) * 0.5 + translation
	var source_rect := atlas_cell_rect(sticker_id)
	if crop_right:
		source_rect.size.x *= 0.92
	# CanvasTexture uses the atlas RID; supply the cell UVs explicitly.
	canvas.draw_texture_rect_region(atlas, Rect2(draw_origin, draw_size), source_rect, Color.WHITE, false, true)


static func atlas_cell_rect(sticker_id: String) -> Rect2:
	var info: Dictionary = CardStickers.STICKERS.get(sticker_id, {})
	if info.is_empty():
		return Rect2()
	var texture := load(CardStickers.STICKER_ATLAS_PATH) as Texture2D
	if texture == null:
		return Rect2()
	var cell: Vector2i = info["cell"]
	var cell_size := Vector2(float(texture.get_width()) / 5.0, float(texture.get_height()) / 2.0)
	return Rect2(Vector2(cell) * cell_size, cell_size)


static func linear_sticker_texture(sticker_id: String) -> CanvasTexture:
	if _linear_sticker_textures.has(sticker_id):
		return _linear_sticker_textures[sticker_id] as CanvasTexture
	var atlas := load(CardStickers.STICKER_ATLAS_PATH) as Texture2D
	var region_rect := atlas_cell_rect(sticker_id)
	if atlas == null or region_rect.size.x <= 0.0 or region_rect.size.y <= 0.0:
		return null
	var texture := CanvasTexture.new()
	texture.diffuse_texture = atlas
	texture.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	texture.texture_repeat = CanvasItem.TEXTURE_REPEAT_DISABLED
	_linear_sticker_textures[sticker_id] = texture
	return texture
