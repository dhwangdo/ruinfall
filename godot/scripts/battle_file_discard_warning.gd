extends Control

var discard_count := 0
var badge_style := StyleBoxFlat.new()
var badge_font: Font = SystemFont.new()


func configure(count: int) -> void:
	discard_count = maxi(0, count)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_index = 12
	if OS.has_feature("web"):
		badge_font = _web_font(800)
	else:
		var native_font := SystemFont.new()
		native_font.font_names = PackedStringArray(["Arial", "Malgun Gothic"])
		native_font.font_weight = 800
		badge_font = native_font
	badge_style.bg_color = Color("#8d2525")
	badge_style.corner_radius_top_left = 9
	badge_style.corner_radius_top_right = 9
	badge_style.corner_radius_bottom_left = 9
	badge_style.corner_radius_bottom_right = 9
	badge_style.content_margin_left = 7
	badge_style.content_margin_right = 7
	badge_style.content_margin_top = 2
	badge_style.content_margin_bottom = 2
	badge_style.shadow_color = Color(0, 0, 0, 0.35)
	badge_style.shadow_size = 3
	badge_style.shadow_offset = Vector2(0, 1)
	resized.connect(queue_redraw)
	queue_redraw()


func _web_font(weight: int) -> FontVariation:
	var font := FontVariation.new()
	font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
	font.variation_opentype = {TextServerManager.get_primary_interface().name_to_tag("wght"): float(weight)}
	return font


func _draw() -> void:
	if discard_count <= 0:
		return
	var outline := Color("#df5353")
	var left := -4.0
	var top := -4.0
	var right := size.x + 4.0
	var bottom := size.y + 4.0
	draw_dashed_line(Vector2(left, top), Vector2(right, top), outline, 3.0, 6.0)
	draw_dashed_line(Vector2(right, top), Vector2(right, bottom), outline, 3.0, 6.0)
	draw_dashed_line(Vector2(right, bottom), Vector2(left, bottom), outline, 3.0, 6.0)
	draw_dashed_line(Vector2(left, bottom), Vector2(left, top), outline, 3.0, 6.0)
	var text := "버리기 %d" % discard_count
	var text_size := badge_font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, 11)
	var badge_size := text_size + Vector2(14, 4)
	var badge_rect := Rect2(Vector2((size.x - badge_size.x) * 0.5, size.y + 3), badge_size)
	draw_style_box(badge_style, badge_rect)
	draw_string(badge_font, Vector2(badge_rect.position.x + 7, badge_rect.position.y + 2 + badge_font.get_ascent(11)), text,
		HORIZONTAL_ALIGNMENT_LEFT, badge_size.x - 14, 11, Color("#fff4e8"))
