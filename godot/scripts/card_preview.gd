extends RefCounted

const CardStickers = preload("res://scripts/stickers.gd")
const CardKeywords = preload("res://scripts/card_keywords.gd")
const PretendardCardFont = preload("res://assets/fonts/PretendardVariable.woff2")

static var _name_font: FontVariation
static var _body_font: FontVariation
static var _cost_font: FontVariation


static func _ensure_fonts() -> void:
	if _name_font != null:
		return
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	_name_font = FontVariation.new()
	_name_font.base_font = PretendardCardFont
	_name_font.variation_opentype = {weight_axis: 700.0}
	_body_font = FontVariation.new()
	_body_font.base_font = PretendardCardFont
	_body_font.variation_opentype = {weight_axis: 400.0}
	_cost_font = preload("res://scripts/game_fonts.gd").make(800)


static func compact(
	card: Dictionary,
	scale: float,
	count: int,
	hover_enter: Callable,
	hover_exit: Callable,
	sticker_hover: Callable,
	tooltip_theme: Theme = null
) -> Control:
	_ensure_fonts()
	var card_size := Vector2(82.0, 115.0)
	var slot := Control.new()
	slot.custom_minimum_size = card_size * scale
	slot.mouse_filter = Control.MOUSE_FILTER_PASS
	var border_color := Color("#8f9090")
	if str(card.get("rarity", "")) in ["rare", "legendary"]:
		border_color = Color("#e2b632")
	var card_style := StyleBoxFlat.new()
	card_style.bg_color = Color("#e1ded5")
	card_style.border_color = border_color
	card_style.set_border_width_all(4)
	card_style.set_corner_radius_all(4)
	card_style.content_margin_left = 3
	card_style.content_margin_right = 3
	card_style.content_margin_top = 3
	card_style.content_margin_bottom = 3
	var card_panel := PanelContainer.new()
	card_panel.oversampling_with_scale = CanvasItem.OVERSAMPLING_WITH_SCALE_ENABLED
	card_panel.position = Vector2.ZERO
	card_panel.size = card_size
	card_panel.pivot_offset = Vector2.ZERO
	card_panel.scale = Vector2.ONE * scale
	card_panel.add_theme_stylebox_override("panel", card_style)
	card_panel.mouse_filter = Control.MOUSE_FILTER_PASS
	card_panel.mouse_entered.connect(hover_enter.bind(card_panel, card.duplicate(true)))
	card_panel.mouse_exited.connect(hover_exit)
	slot.add_child(card_panel)
	var body := VBoxContainer.new()
	body.mouse_filter = Control.MOUSE_FILTER_PASS
	body.add_theme_constant_override("separation", 0)
	card_panel.add_child(body)
	var header_style := StyleBoxFlat.new()
	var header_color := Color("#756a60")
	match str(card.get("rarity", "")):
		"starter":
			header_color = Color("#555b60")
		"status":
			header_color = Color("#e34b58")
		"special":
			header_color = Color("#3976a1")
		"rare":
			header_color = Color("#7439a6")
		"legendary":
			header_color = Color("#a87924")
	header_style.bg_color = header_color
	header_style.set_border_width_all(0)
	header_style.set_corner_radius_all(3)
	header_style.content_margin_left = 4
	header_style.content_margin_right = 4
	header_style.content_margin_top = 1
	header_style.content_margin_bottom = 1
	var header_panel := PanelContainer.new()
	header_panel.mouse_filter = Control.MOUSE_FILTER_PASS
	header_panel.custom_minimum_size.y = 22
	header_panel.add_theme_stylebox_override("panel", header_style)
	var header := HBoxContainer.new()
	header.mouse_filter = Control.MOUSE_FILTER_PASS
	var cost := Label.new()
	cost.mouse_filter = Control.MOUSE_FILTER_PASS
	cost.text = str(CardStickers.card_energy_cost(card)) if card.has("cost") else "—"
	cost.add_theme_font_size_override("font_size", 13)
	cost.add_theme_font_override("font", _cost_font)
	cost.add_theme_color_override("font_color", Color.WHITE)
	header.add_child(cost)
	var card_name := Label.new()
	card_name.mouse_filter = Control.MOUSE_FILTER_PASS
	card_name.text = str(card.get("name", "카드"))
	card_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card_name.add_theme_font_size_override("font_size", 9)
	card_name.add_theme_font_override("font", _name_font)
	card_name.add_theme_color_override("font_color", Color.WHITE)
	card_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	card_name.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	card_name.clip_text = true
	header.add_child(card_name)
	header_panel.add_child(header)
	body.add_child(header_panel)
	var card_body := Control.new()
	card_body.mouse_filter = Control.MOUSE_FILTER_PASS
	card_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(card_body)
	var description := str(card.get("description", "효과 정보 없음"))
	var description_label := Label.new()
	description_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	description_label.offset_left = 3
	description_label.offset_top = 2
	description_label.offset_right = -3
	description_label.offset_bottom = -25
	description_label.text = description
	description_label.tooltip_text = CardKeywords.tooltip_text(card)
	description_label.add_theme_font_size_override("font_size", 7)
	description_label.add_theme_font_override("font", _body_font)
	description_label.add_theme_color_override("font_color", Color("#292b28"))
	description_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	description_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	description_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	description_label.clip_text = true
	description_label.mouse_filter = Control.MOUSE_FILTER_PASS
	card_body.add_child(description_label)
	var sticker_row := HBoxContainer.new()
	sticker_row.mouse_filter = Control.MOUSE_FILTER_PASS
	sticker_row.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	sticker_row.offset_left = 2
	sticker_row.offset_top = -24
	sticker_row.offset_right = -2
	sticker_row.offset_bottom = -1
	sticker_row.add_theme_constant_override("separation", 1)
	var sticker_ids: Array = CardStickers.card_sticker_ids(card)
	var sticker_size := 20.0
	if count > 1:
		sticker_size = 13.0 if sticker_ids.size() >= 3 else 18.0
	for sticker_id in sticker_ids:
		var icon := TextureRect.new()
		icon.texture = CardStickers.sticker_icon(sticker_id)
		icon.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
		icon.custom_minimum_size = Vector2.ONE * sticker_size
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		if tooltip_theme != null:
			icon.theme = tooltip_theme
		icon.mouse_filter = Control.MOUSE_FILTER_PASS
		var sticker_info: Dictionary = CardStickers.STICKERS.get(str(sticker_id), {})
		icon.tooltip_text = "%s\n%s" % [sticker_info.get("name", ""), sticker_info.get("description", "")]
		icon.mouse_entered.connect(sticker_hover)
		icon.mouse_exited.connect(hover_enter.bind(card_panel, card.duplicate(true)))
		sticker_row.add_child(icon)
	if count > 1:
		var footer_spacer := Control.new()
		footer_spacer.mouse_filter = Control.MOUSE_FILTER_PASS
		footer_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		sticker_row.add_child(footer_spacer)
	if count > 1:
		var count_badge := PanelContainer.new()
		count_badge.mouse_filter = Control.MOUSE_FILTER_PASS
		count_badge.custom_minimum_size = Vector2(28, 18)
		var count_style := StyleBoxFlat.new()
		count_style.bg_color = Color("#17234f")
		count_style.set_border_width_all(0)
		count_style.set_corner_radius_all(2)
		count_style.content_margin_left = 3
		count_style.content_margin_right = 3
		count_style.content_margin_top = 1
		count_style.content_margin_bottom = 1
		count_badge.add_theme_stylebox_override("panel", count_style)
		var count_label := Label.new()
		count_label.mouse_filter = Control.MOUSE_FILTER_PASS
		count_label.text = "x%d" % count
		count_label.add_theme_font_size_override("font_size", 11)
		count_label.add_theme_color_override("font_color", Color("#ffd166"))
		count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		count_badge.add_child(count_label)
		sticker_row.add_child(count_badge)
	card_body.add_child(sticker_row)
	return slot
