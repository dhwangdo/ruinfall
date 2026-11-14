extends RefCounted

const CardStickers = preload("res://scripts/stickers.gd")
const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")
const BattleCardDragSourceScript = preload("res://scripts/battle_card_drag_source.gd")
const DeckEditorCardStackScript = preload("res://scripts/deck_editor_card_stack.gd")
const StickerArtScript = preload("res://scripts/sticker_art.gd")
const StickerArtDraw = preload("res://scripts/sticker_art_draw.gd")
const PretendardCardFont = preload("res://assets/fonts/PretendardVariable.woff2")

const CARD_SIZE := Vector2(82.0, 82.0)
const CARD_INSET := 4.0
const CARD_PAPER := Color("#e1dfd8")
const CARD_TEXT := Color("#272725")
const COUNT_BACKGROUND := Color("#17234f")
const COUNT_TEXT := Color("#ffd166")

static var _name_font: FontVariation
static var _cost_font: SystemFont
static var _count_font: SystemFont
static var _map_frame_styles: Dictionary = {}


static func draw_map_preview(canvas: CanvasItem, card: Dictionary, rect: Rect2) -> void:
	_ensure_fonts()
	var rarity := str(card.get("rarity", ""))
	var rare_frame := rarity in ["rare", "legendary"]
	if not _map_frame_styles.has(rare_frame):
		_map_frame_styles[rare_frame] = _make_frame_style(Color("#d5a928") if rare_frame else Color("#9a9da2"))
	var frame: StyleBoxFlat = _map_frame_styles[rare_frame]
	canvas.draw_set_transform(rect.position, 0.0, rect.size / CARD_SIZE)
	frame.draw(canvas.get_canvas_item(), Rect2(Vector2.ZERO, CARD_SIZE))
	canvas.draw_rect(Rect2(4.0, 4.0, 74.0, 19.6), _rarity_band(rarity))
	if card.has("cost") and not CardStickers.UNPLAYABLE_CARD_EFFECTS.has(str(card.get("effect", ""))):
		var cost_baseline := 4.0 + (19.6 - _cost_font.get_height(16)) * 0.5 + _cost_font.get_ascent(16)
		canvas.draw_string(_cost_font, Vector2(9.0, cost_baseline),
			str(CardStickers.card_energy_cost(card)), HORIZONTAL_ALIGNMENT_LEFT, -1, 16, Color.WHITE)
	var display_name := _compact_display_name(card)
	var trimmed := false
	while not display_name.is_empty() and _name_font.get_string_size(display_name + ("…" if trimmed else ""), HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x > 62.0:
		display_name = display_name.substr(0, display_name.length() - 1)
		trimmed = true
	if trimmed:
		display_name += "…"
	var baseline := 41.0 + (_name_font.get_ascent(13) - _name_font.get_descent(13)) * 0.5
	canvas.draw_string(_name_font, Vector2(10.0, baseline), display_name, HORIZONTAL_ALIGNMENT_CENTER, 62.0, 13, CARD_TEXT)
	var sticker_ids := CardStickers.card_sticker_ids(card)
	for index in range(sticker_ids.size()):
		var sticker_id: String = sticker_ids[index]
		var adjustment: Vector2 = StickerArtDraw.CARD_ART_ADJUSTMENT.get(sticker_id, Vector2(1.0, 0.0))
		var art_size := 25.0 * adjustment.x
		var origin := Vector2(4.0 + index * 25.0, 53.0) + Vector2.ONE * (25.0 - art_size) * 0.5
		origin.x += 25.0 * adjustment.y / 100.0
		var source_rect := StickerArtDraw.atlas_cell_rect(sticker_id)
		var draw_size := Vector2.ONE * art_size
		if sticker_id == "parachute":
			source_rect.size.x *= 0.92
			draw_size.x *= 0.92
		var texture := StickerArtDraw.linear_sticker_texture(sticker_id)
		if texture != null:
			canvas.draw_texture_rect_region(texture, Rect2(origin, draw_size), source_rect, Color.WHITE, false, true)
	canvas.draw_set_transform(Vector2.ZERO)


class CompactCardText extends Control:
	@export var display_text: String = ""
	@export var display_font: Font
	@export var display_font_size: int = 14
	@export var display_color: Color = Color.WHITE
	@export var horizontal_alignment: int = HORIZONTAL_ALIGNMENT_LEFT

	func _draw() -> void:
		if display_font == null or display_text.is_empty():
			return
		var text_width := display_font.get_string_size(display_text, HORIZONTAL_ALIGNMENT_LEFT, -1, display_font_size).x
		var x := 0.0
		if horizontal_alignment == HORIZONTAL_ALIGNMENT_CENTER:
			x = (size.x - text_width) * 0.5
		var font_height := display_font.get_height(display_font_size)
		var baseline := (size.y - font_height) * 0.5 + display_font.get_ascent(display_font_size)
		draw_string(display_font, Vector2(x, baseline), display_text, HORIZONTAL_ALIGNMENT_LEFT, -1,
			display_font_size, display_color)


static func create(
	card: Dictionary,
	count: int,
	hover_enter: Callable,
	hover_exit: Callable,
	sticker_enter: Callable,
	tooltip_theme: Theme = null,
	interactive: bool = true,
	card_size: Vector2 = CARD_SIZE
) -> Control:
	_ensure_fonts()
	var rarity := str(card.get("rarity", ""))
	var band_color := _rarity_band(rarity)
	var frame_color := Color("#d5a928") if rarity in ["rare", "legendary"] else Color("#9a9da2")
	var frame_style := _make_frame_style(frame_color)
	var card_copy := card.duplicate(true)

	var source: Control = BattleCardDragSourceScript.new()
	source.oversampling_with_scale = CanvasItem.OVERSAMPLING_WITH_SCALE_ENABLED
	source.custom_minimum_size = card_size
	source.size = card_size
	source.mouse_filter = Control.MOUSE_FILTER_STOP if interactive else Control.MOUSE_FILTER_IGNORE
	source.add_theme_stylebox_override("panel", frame_style)
	if interactive and hover_enter.is_valid():
		source.mouse_entered.connect(hover_enter.bind(source, card_copy))
	if interactive and hover_exit.is_valid():
		source.mouse_exited.connect(hover_exit)
	if interactive:
		TooltipBindings.bind_card(source, card_copy)

	var layers := mini(5, maxi(0, count - 1))
	if layers > 0:
		var stack_backs: Control = DeckEditorCardStackScript.new()
		stack_backs.name = "CompactCardStackBacks"
		stack_backs.set("layers", layers)
		stack_backs.set("frame", frame_style.duplicate() as StyleBoxFlat)
		stack_backs.set("band_color", band_color)
		stack_backs.mouse_filter = Control.MOUSE_FILTER_IGNORE
		stack_backs.show_behind_parent = true
		stack_backs.custom_minimum_size = Vector2.ZERO
		source.add_child(stack_backs)

	# PanelContainer's zero content margins keep the wrapper at card_size;
	# the inner visual retains the CSS 4px padding-box inset.
	var wrapper := Control.new()
	wrapper.name = "CompactCardWrapper"
	wrapper.mouse_filter = Control.MOUSE_FILTER_PASS if interactive else Control.MOUSE_FILTER_IGNORE
	wrapper.custom_minimum_size = Vector2.ZERO
	wrapper.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	source.add_child(wrapper)

	var visual := Control.new()
	visual.name = "CompactCardVisual"
	visual.mouse_filter = Control.MOUSE_FILTER_PASS if interactive else Control.MOUSE_FILTER_IGNORE
	visual.custom_minimum_size = Vector2.ZERO
	visual.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	visual.offset_left = CARD_INSET
	visual.offset_top = CARD_INSET
	visual.offset_right = -CARD_INSET
	visual.offset_bottom = -CARD_INSET
	wrapper.add_child(visual)

	var band := Panel.new()
	band.name = "RarityBand"
	band.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	band.offset_bottom = 19.6
	band.custom_minimum_size = Vector2.ZERO
	band.mouse_filter = Control.MOUSE_FILTER_IGNORE if not interactive else Control.MOUSE_FILTER_PASS
	var band_style := StyleBoxFlat.new()
	band_style.bg_color = band_color
	band_style.set_border_width_all(0)
	band.add_theme_stylebox_override("panel", band_style)
	visual.add_child(band)

	if card.has("cost") and not CardStickers.UNPLAYABLE_CARD_EFFECTS.has(str(card.get("effect", ""))):
		var cost := CompactCardText.new()
		cost.name = "CompactCardCost"
		cost.position = Vector2(5, 2)
		cost.size = Vector2(28, 17)
		cost.display_text = str(CardStickers.card_energy_cost(card))
		cost.display_font = _cost_font
		cost.display_font_size = 16
		cost.display_color = Color.WHITE
		cost.mouse_filter = Control.MOUSE_FILTER_PASS if interactive else Control.MOUSE_FILTER_IGNORE
		visual.add_child(cost)

	var name_label := Label.new()
	name_label.name = "CompactCardName"
	# A Godot Label retains its native 23px minimum line box at this font size;
	# offset it so the rendered line center stays at CSS y=50% for either size.
	name_label.position = Vector2(6, card_size.y * 0.5 - CARD_INSET - 11.5)
	name_label.size = Vector2(maxf(0.0, card_size.x - 20.0), 15.84)
	name_label.custom_minimum_size = Vector2.ZERO
	name_label.text = _compact_display_name(card)
	name_label.add_theme_font_override("font", _name_font)
	name_label.add_theme_font_size_override("font_size", 13)
	name_label.add_theme_color_override("font_color", CARD_TEXT)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	name_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS_FORCE
	name_label.clip_text = true
	name_label.mouse_filter = Control.MOUSE_FILTER_PASS if interactive else Control.MOUSE_FILTER_IGNORE
	visual.add_child(name_label)

	_add_stickers(visual, card_copy, interactive, sticker_enter, hover_enter, source, tooltip_theme)
	if count > 1:
		_add_count_badge(wrapper, count, interactive, card_size)
	return source


static func _ensure_fonts() -> void:
	if _name_font != null:
		return
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	_name_font = FontVariation.new()
	_name_font.base_font = PretendardCardFont
	_name_font.variation_opentype = {weight_axis: 600.0}
	_name_font.spacing_glyph = -1
	_cost_font = SystemFont.new()
	_cost_font.font_names = PackedStringArray(["Arial"])
	_cost_font.font_weight = 800
	_count_font = SystemFont.new()
	_count_font.font_names = PackedStringArray(["Arial"])
	_count_font.font_weight = 800


static func _rarity_band(rarity: String) -> Color:
	match rarity:
		"starter": return Color("#555b60")
		"status": return Color("#e34b58")
		"special": return Color("#3472a2")
		"rare": return Color("#7138a6")
		"legendary": return Color("#d5a928")
		_: return Color("#756a60")


static func _compact_display_name(card: Dictionary) -> String:
	var display_name := str(card.get("name", "카드"))
	var effect := str(card.get("effect", ""))
	var forged := bool(card.get("forged", false))
	if effect in ["obsidianDagger", "obsidian_dagger"]:
		var forge_count := 1 if forged else 0
		var completed_value: Variant = card.get("forgeCostsCompleted", card.get("forge_costs_completed"))
		if completed_value is Array:
			forge_count = completed_value.size()
		if forge_count > 0:
			display_name += " +%d" % forge_count
	elif forged and effect not in ["astronomyResearch", "necromancyResearch", "astronomy_research", "necromancy_research"]:
		display_name += "+"
	return display_name


static func _make_frame_style(border_color: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = CARD_PAPER
	style.border_color = border_color
	style.set_border_width_all(4)
	style.set_corner_radius_all(4)
	style.content_margin_left = 0
	style.content_margin_right = 0
	style.content_margin_top = 0
	style.content_margin_bottom = 0
	return style


static func _add_stickers(
	visual: Control,
	card: Dictionary,
	interactive: bool,
	sticker_enter: Callable,
	hover_enter: Callable,
	source: Control,
	tooltip_theme: Theme
) -> void:
	var sticker_ids: Array[String] = CardStickers.card_sticker_ids(card)
	for index in range(sticker_ids.size()):
		var sticker_id := sticker_ids[index]
		var icon = StickerArtScript.new()
		icon.name = "Sticker_%s" % sticker_id
		icon.configure(sticker_id, 25.0)
		icon.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_LEFT)
		icon.offset_left = index * 25.0
		icon.offset_top = -25.0
		icon.offset_right = icon.offset_left + 25.0
		icon.offset_bottom = 0.0
		icon.mouse_filter = Control.MOUSE_FILTER_PASS if interactive else Control.MOUSE_FILTER_IGNORE
		if tooltip_theme != null:
			icon.theme = tooltip_theme
		icon.tooltip_text = ""
		if interactive and sticker_enter.is_valid():
			icon.mouse_entered.connect(sticker_enter)
		if interactive:
			TooltipBindings.bind_sticker(icon, sticker_id)
		if interactive and hover_enter.is_valid():
			icon.mouse_exited.connect(hover_enter.bind(source, card))
		visual.add_child(icon)


static func _add_count_badge(wrapper: Control, count: int, interactive: bool, card_size: Vector2) -> void:
	var text := "x%d" % count
	var text_width := _count_font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
	var badge_size := Vector2(ceilf(text_width) + 6.0, 16.3)
	var badge := Panel.new()
	badge.name = "InventoryCardCount"
	badge.position = Vector2(card_size.x - 7.0 - badge_size.x, card_size.y - 7.0 - badge_size.y)
	badge.size = badge_size
	badge.custom_minimum_size = Vector2.ZERO
	badge.z_index = 8
	badge.mouse_filter = Control.MOUSE_FILTER_PASS if interactive else Control.MOUSE_FILTER_IGNORE
	var badge_style := StyleBoxFlat.new()
	badge_style.bg_color = COUNT_BACKGROUND
	badge_style.set_border_width_all(0)
	badge_style.set_corner_radius_all(2)
	badge_style.content_margin_left = 3
	badge_style.content_margin_right = 3
	badge_style.content_margin_top = 1
	badge_style.content_margin_bottom = 1
	badge.add_theme_stylebox_override("panel", badge_style)
	var label := CompactCardText.new()
	label.name = "InventoryCardCountText"
	label.position = Vector2(3.0, (badge_size.y - 14.3) * 0.5)
	label.size = Vector2(badge_size.x - 6.0, 14.3)
	label.display_text = text
	label.display_font = _count_font
	label.display_font_size = 14
	label.display_color = COUNT_TEXT
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_PASS if interactive else Control.MOUSE_FILTER_IGNORE
	badge.add_child(label)
	wrapper.add_child(badge)
