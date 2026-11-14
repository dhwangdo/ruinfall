extends Control
class_name PortStickerArt

const CardStickers = preload("res://scripts/stickers.gd")

const ART_ADJUSTMENT := {
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


func configure(sticker_id: String, slot_size: float) -> void:
	set_meta("card_sticker_id", sticker_id)
	custom_minimum_size = Vector2.ONE * slot_size
	size = custom_minimum_size
	size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	size_flags_vertical = Control.SIZE_SHRINK_CENTER
	mouse_filter = Control.MOUSE_FILTER_PASS
	var info: Dictionary = CardStickers.STICKERS.get(sticker_id, {})
	if info.is_empty():
		return
	var atlas := load(CardStickers.STICKER_ATLAS_PATH) as Texture2D
	var cell: Vector2i = info["cell"]
	var cell_size := Vector2(atlas.get_width() / 5.0, atlas.get_height() / 2.0)
	var source := AtlasTexture.new()
	source.atlas = atlas
	source.region = Rect2(Vector2(cell.x, cell.y) * cell_size, cell_size)
	source.filter_clip = true
	var adjustment: Vector2 = ART_ADJUSTMENT.get(sticker_id, Vector2.ONE)
	var origin := Vector2.ONE * slot_size * 0.5
	var x_translation := slot_size * adjustment.y / 100.0
	if sticker_id == "parachute":
		var clip := Control.new()
		clip.name = "StickerArtClip"
		clip.position = Vector2(x_translation, 0.0)
		clip.size = Vector2(slot_size * 0.92, slot_size)
		clip.pivot_offset = origin
		clip.scale = Vector2.ONE * adjustment.x
		clip.clip_contents = true
		clip.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(clip)
		var art := _make_art(source, slot_size)
		clip.add_child(art)
	else:
		var art := _make_art(source, slot_size)
		art.position = Vector2(x_translation, 0.0)
		art.pivot_offset = origin
		art.scale = Vector2.ONE * adjustment.x
		add_child(art)


static func _make_art(source: Texture2D, slot_size: float) -> TextureRect:
	var art := TextureRect.new()
	art.name = "StickerArt"
	art.position = Vector2.ZERO
	art.size = Vector2.ONE * slot_size
	art.texture = source
	art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	art.stretch_mode = TextureRect.STRETCH_SCALE
	art.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return art
