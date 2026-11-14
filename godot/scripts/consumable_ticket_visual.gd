extends RefCounted
class_name PortConsumableTicketVisual

const FONT_REGULAR = preload("res://assets/fonts/PretendardVariable.woff2")
const FONT_BOLD = preload("res://assets/fonts/PretendardVariable700.tres")

static var _medium_font: FontVariation
static var _count_font: FontVariation
static var _star_font: FontVariation

class TicketCountText extends Control:
	var display_text := ""
	var display_font: Font
	var display_font_size := 14
	var display_color := Color.WHITE

	func _draw() -> void:
		if display_font == null or display_text.is_empty():
			return
		var text_width := display_font.get_string_size(display_text, HORIZONTAL_ALIGNMENT_LEFT, -1, display_font_size).x
		var font_height := display_font.get_height(display_font_size)
		var baseline := (size.y - font_height) * 0.5 + display_font.get_ascent(display_font_size)
		draw_string(display_font, Vector2((size.x - text_width) * 0.5, baseline), display_text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, display_font_size, display_color)


class TicketTitleText extends Control:
	var display_text := ""
	var display_font: Font
	var display_font_size := 13
	var display_color := Color.BLACK

	func _draw() -> void:
		if display_font == null or display_text.is_empty():
			return
		var text_width := display_font.get_string_size(display_text, HORIZONTAL_ALIGNMENT_LEFT, -1, display_font_size).x
		var font_height := display_font.get_height(display_font_size)
		var baseline := (size.y - font_height) * 0.5 + display_font.get_ascent(display_font_size)
		draw_string(display_font, Vector2((size.x - text_width) * 0.5, baseline), display_text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, display_font_size, display_color)


static func configure_compact(target: Control, item_front: Control, item: Dictionary, count: int, selected := false) -> void:
	_ensure_fonts()
	var layers := mini(5, maxi(0, count - 1))
	var target_size := Vector2(82.0 + layers * 7.0, 82.0)
	target.custom_minimum_size = target_size
	target.size = target_size
	target.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	target.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var palette := _palette(str(item.get("type", "")))
	for layer in range(layers):
		_add_backing(target, palette, Vector2(float(layer * 7), 0.0), Vector2(82.0, 82.0))
	item_front.position = Vector2(float(layers * 7), 0.0)
	item_front.custom_minimum_size = Vector2(82.0, 82.0)
	item_front.size = item_front.custom_minimum_size
	item_front.mouse_filter = Control.MOUSE_FILTER_STOP
	item_front.add_theme_stylebox_override("panel", _frame_style(palette, int(palette["tier"]), selected))
	target.add_child(item_front)
	var content := Control.new()
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	item_front.add_child(content)
	_add_content(content, item, palette, Vector2(82.0, 82.0), false, count)


static func create_full(item: Dictionary) -> Control:
	_ensure_fonts()
	var preview := Control.new()
	preview.custom_minimum_size = Vector2(136.0, 191.0)
	preview.size = preview.custom_minimum_size
	preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var palette := _palette(str(item.get("type", "")))
	var frame := Panel.new()
	frame.size = Vector2(136.0, 191.0)
	frame.custom_minimum_size = frame.size
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.add_theme_stylebox_override("panel", _frame_style(palette, int(palette["tier"])))
	preview.add_child(frame)
	var content := Control.new()
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.add_child(content)
	_add_content(content, item, palette, frame.size, true, 1)
	return preview


static func _add_backing(parent: Control, palette: Dictionary, position: Vector2, frame_size: Vector2) -> void:
	var frame := Panel.new()
	frame.position = position
	frame.size = frame_size
	frame.custom_minimum_size = frame_size
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.add_theme_stylebox_override("panel", _frame_style(palette, int(palette["tier"])))
	parent.add_child(frame)


static func _frame_style(palette: Dictionary, tier: int, selected := false) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = palette["fill"]
	style.border_color = Color("#d9af37") if selected else Color("#d5a928") if tier == 3 else palette["border"]
	style.set_border_width_all(2 if selected else 4)
	style.set_corner_radius_all(4)
	style.content_margin_left = 0
	style.content_margin_top = 0
	style.content_margin_right = 0
	style.content_margin_bottom = 0
	return style


static func _add_content(content: Control, item: Dictionary, palette: Dictionary,
	frame_size: Vector2, full: bool, count: int) -> void:
	var tier := int(palette.get("tier", 0))
	var gradient: GradientTexture2D = palette.get("gradient")
	if gradient != null:
		var gradient_rect := TextureRect.new()
		gradient_rect.position = Vector2(4.0, 4.0)
		gradient_rect.size = frame_size - Vector2(8.0, 8.0)
		gradient_rect.texture = gradient
		gradient_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		gradient_rect.stretch_mode = TextureRect.STRETCH_SCALE
		gradient_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
		content.add_child(gradient_rect)
	var title: Control
	if full:
		var full_title := Label.new()
		full_title.text = str(item.get("name", "아이템"))
		full_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		full_title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		full_title.add_theme_font_override("font", FONT_BOLD)
		full_title.add_theme_font_size_override("font_size", 15)
		full_title.add_theme_color_override("font_color", Color.WHITE if tier == 3 else palette["text"])
		full_title.mouse_filter = Control.MOUSE_FILTER_IGNORE
		full_title.position = Vector2(12.0, 12.0)
		full_title.size = Vector2(frame_size.x - 24.0, 37.0)
		full_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		title = full_title
	else:
		var compact_title := TicketTitleText.new()
		compact_title.display_text = str(item.get("name", "아이템"))
		compact_title.display_font = _medium_font
		compact_title.display_font_size = 13
		compact_title.display_color = Color.WHITE if tier == 3 else palette["text"]
		compact_title.position = Vector2(10.0, 10.0)
		compact_title.size = frame_size - Vector2(20.0, 20.0)
		compact_title.clip_contents = true
		compact_title.mouse_filter = Control.MOUSE_FILTER_IGNORE
		title = compact_title
	content.add_child(title)
	if full:
		var description := Label.new()
		description.text = str(item.get("description", ""))
		description.position = Vector2(12.0, 49.0)
		description.size = Vector2(frame_size.x - 24.0, frame_size.y - 61.0)
		description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		description.add_theme_font_override("font", FONT_REGULAR)
		description.add_theme_font_size_override("font_size", 12)
		description.add_theme_color_override("font_color", Color.WHITE if tier == 3 else palette["text"])
		description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		description.add_theme_constant_override("line_spacing", 3)
		description.mouse_filter = Control.MOUSE_FILTER_IGNORE
		content.add_child(description)
	if tier > 0:
		var stars := Label.new()
		stars.text = "★".repeat(tier)
		stars.position = Vector2(5.0, 3.0)
		stars.size = Vector2(44.0, 15.0)
		stars.add_theme_font_override("font", _star_font)
		stars.add_theme_font_size_override("font_size", 11)
		stars.add_theme_color_override("font_color", Color.WHITE if tier == 3 else palette["fill"].lerp(Color.BLACK, 0.55))
		stars.mouse_filter = Control.MOUSE_FILTER_IGNORE
		content.add_child(stars)
	if count > 1 and not full:
		var badge_text := "x%d" % count
		var text_width := _count_font.get_string_size(badge_text, HORIZONTAL_ALIGNMENT_LEFT, -1, 14).x
		var badge_size := Vector2(ceilf(text_width) + 6.0, 16.0)
		var badge := Panel.new()
		badge.position = frame_size - badge_size - Vector2(3.0, 3.0)
		badge.size = badge_size
		badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var badge_style := StyleBoxFlat.new()
		badge_style.bg_color = Color("#17234f")
		badge_style.set_border_width_all(0)
		badge_style.set_corner_radius_all(2)
		badge_style.content_margin_left = 3
		badge_style.content_margin_right = 3
		badge_style.content_margin_top = 1
		badge_style.content_margin_bottom = 1
		badge.add_theme_stylebox_override("panel", badge_style)
		var count_label := TicketCountText.new()
		count_label.display_text = badge_text
		count_label.display_font = _count_font
		count_label.display_font_size = 14
		count_label.display_color = Color("#ffd166")
		count_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		count_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		badge.add_child(count_label)
		content.add_child(badge)
		count_label.queue_redraw()


static func draw_compact(canvas: CanvasItem, item: Dictionary, front_rect: Rect2, count := 1) -> void:
	_ensure_fonts()
	var palette := _palette(str(item.get("type", "")))
	var tier := int(palette.get("tier", 0))
	var scale := front_rect.size.x / 82.0
	var layers := mini(5, maxi(0, count - 1))
	for layer in range(layers, 0, -1):
		_draw_canvas_frame(canvas, Rect2(front_rect.position - Vector2(7.0 * layer * scale, 0.0), front_rect.size), palette, tier, scale)
	_draw_canvas_frame(canvas, front_rect, palette, tier, scale)
	var gradient: GradientTexture2D = palette.get("gradient")
	var border_width := maxf(1.0, roundf(4.0 * scale))
	if gradient != null:
		canvas.draw_texture_rect(gradient, front_rect.grow(-border_width), false, Color.WHITE)
	var name_size := maxi(1, roundi(13.0 * scale))
	var name := _fit_text(_medium_font, str(item.get("name", "아이템")), name_size, front_rect.size.x - 20.0 * scale)
	var name_width := _medium_font.get_string_size(name, HORIZONTAL_ALIGNMENT_LEFT, -1, name_size).x
	var name_baseline := front_rect.position.y + (front_rect.size.y - _medium_font.get_height(name_size)) * 0.5 + _medium_font.get_ascent(name_size)
	canvas.draw_string(_medium_font, Vector2(front_rect.get_center().x - name_width * 0.5, name_baseline), name,
		HORIZONTAL_ALIGNMENT_LEFT, -1, name_size, Color.WHITE if tier == 3 else palette["text"])
	if tier > 0:
		var star_size := maxi(1, roundi(11.0 * scale))
		var star_text := "★".repeat(tier)
		canvas.draw_string(_star_font, Vector2(front_rect.position.x + 5.0 * scale,
			front_rect.position.y + 3.0 * scale + _star_font.get_ascent(star_size)), star_text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, star_size,
			Color.WHITE if tier == 3 else palette["fill"].lerp(Color.BLACK, 0.55))
	if count > 1:
		_draw_canvas_count_badge(canvas, front_rect, count, scale)


static func _draw_canvas_frame(canvas: CanvasItem, rect: Rect2, palette: Dictionary, tier: int, scale: float) -> void:
	var style := _frame_style(palette, tier)
	style.set_border_width_all(maxi(1, roundi(4.0 * scale)))
	style.set_corner_radius_all(maxi(1, roundi(4.0 * scale)))
	style.draw(canvas, rect)


static func _draw_canvas_count_badge(canvas: CanvasItem, rect: Rect2, count: int, scale: float) -> void:
	var text := "x%d" % count
	var font_size := maxi(1, roundi(14.0 * scale))
	var width := _count_font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x + 6.0 * scale
	var height := 16.0 * scale
	var badge_rect := Rect2(rect.end - Vector2(width + 3.0 * scale, height + 3.0 * scale), Vector2(width, height))
	var badge_style := StyleBoxFlat.new()
	badge_style.bg_color = Color("#17234f")
	badge_style.set_border_width_all(0)
	badge_style.set_corner_radius_all(maxi(1, roundi(2.0 * scale)))
	badge_style.draw(canvas, badge_rect)
	var text_width := _count_font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
	var baseline := badge_rect.position.y + (badge_rect.size.y - _count_font.get_height(font_size)) * 0.5 + _count_font.get_ascent(font_size)
	canvas.draw_string(_count_font, Vector2(badge_rect.get_center().x - text_width * 0.5, baseline), text,
		HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, Color("#ffd166"))


static func _fit_text(font: Font, value: String, base_size: int, max_width: float) -> String:
	var size := maxi(1, base_size)
	var text := value
	while not text.is_empty() and font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > max_width:
		text = text.substr(0, text.length() - 1)
	if text != value and not text.is_empty():
		while not text.is_empty() and font.get_string_size(text + "…", HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > max_width:
			text = text.substr(0, text.length() - 1)
		text += "…"
	return text


static func _palette(ticket_type: String) -> Dictionary:
	var palette := {"fill": Color("#fefdfa"), "border": Color("#56534d"), "text": Color("#252525"), "tier": 0}
	match ticket_type:
		"swiftTicket":
			palette.fill = Color("#cfdfea")
			palette.border = Color("#526f82")
		"mindEyeTicket":
			palette.fill = Color("#bcd9ee")
			palette.border = Color("#436f8c")
			palette.tier = 1
		"darkTicket":
			palette.fill = Color("#a9a7c8")
			palette.border = Color("#4b4770")
			palette.tier = 1
		"bombTicket":
			palette.fill = Color("#e8b09d")
			palette.border = Color("#8b503d")
			palette.tier = 1
		"extractTicket", "extractPlusTicket":
			palette.fill = Color("#ead8aa")
			palette.border = Color("#87703d")
			palette.tier = 1
			if ticket_type == "extractPlusTicket":
				palette.tier = 0
		"transformTicket":
			palette.fill = Color("#d8c1eb")
			palette.border = Color("#704f87")
			palette.tier = 2
		"cloneTicket":
			palette.tier = 3
			palette.fill = _hsl_color(175.0, 0.88, 0.31)
			palette.border = _hsl_color(175.0, 0.88, 0.19)
			palette.gradient = _gradient([130.0, 175.0, 205.0], 0.31)
		"expandTicket":
			palette.tier = 3
			palette.fill = _hsl_color(30.0, 0.88, 0.32)
			palette.border = _hsl_color(30.0, 0.88, 0.19)
			palette.gradient = _gradient([0.0, 30.0, 60.0], 0.32)
		"cardPack":
			palette.fill = Color("#e7c884")
			palette.border = Color("#85691f")
	return palette


static func _gradient(hues: Array[float], lightness: float) -> GradientTexture2D:
	var colors := PackedColorArray()
	for hue in hues:
		colors.append(_hsl_color(hue, 0.88, lightness))
	var gradient := Gradient.new()
	gradient.colors = colors
	gradient.offsets = PackedFloat32Array([0.0, 0.5, 1.0])
	var texture := GradientTexture2D.new()
	texture.gradient = gradient
	texture.width = 128
	texture.height = 128
	texture.fill_from = Vector2(0.0, 1.0)
	texture.fill_to = Vector2(1.0, 0.42)
	return texture


static func _hsl_color(hue: float, saturation: float, lightness: float) -> Color:
	var chroma := (1.0 - absf(2.0 * lightness - 1.0)) * saturation
	var segment := hue / 60.0
	var secondary := chroma * (1.0 - absf(fposmod(segment, 2.0) - 1.0))
	var rgb := Vector3.ZERO
	match floori(segment):
		0: rgb = Vector3(chroma, secondary, 0.0)
		1: rgb = Vector3(secondary, chroma, 0.0)
		2: rgb = Vector3(0.0, chroma, secondary)
		3: rgb = Vector3(0.0, secondary, chroma)
		4: rgb = Vector3(secondary, 0.0, chroma)
		_: rgb = Vector3(chroma, 0.0, secondary)
	var offset := lightness - chroma * 0.5
	return Color(rgb.x + offset, rgb.y + offset, rgb.z + offset)


static func _ensure_fonts() -> void:
	if _medium_font == null:
		var weight_axis: int = TextServerManager.get_primary_interface().name_to_tag("wght")
		_medium_font = FontVariation.new()
		_medium_font.base_font = FONT_REGULAR
		_medium_font.variation_opentype = {weight_axis: 600.0}
	if _count_font == null:
		_count_font = preload("res://scripts/game_fonts.gd").make(800)
	if _star_font == null:
		_star_font = preload("res://scripts/game_fonts.gd").make(900)
