extends Control

const ICON_DESIGN_SIZE := Vector2(68.0, 64.0)

var amount := 0
var shield_color := Color("#de7024")


func configure(kind: String, value: int) -> void:
	amount = maxi(0, value)
	shield_color = Color("#4080bf") if kind == "magic" else Color("#de7024")
	custom_minimum_size = Vector2(68, 64)
	tooltip_text = "마법 방어 %d" % amount if kind == "magic" else "방어 %d" % amount
	queue_redraw()


func _draw() -> void:
	if amount <= 0:
		return
	var icon_scale := minf(size.x / ICON_DESIGN_SIZE.x, size.y / ICON_DESIGN_SIZE.y)
	if icon_scale <= 0.0:
		return
	var icon_size := ICON_DESIGN_SIZE * icon_scale
	var icon_origin := (size - icon_size) * 0.5
	var points := PackedVector2Array([
		Vector2(34.0, 0.0),
		Vector2(63.92, 10.24),
		Vector2(58.48, 43.52),
		Vector2(34.0, 64.0),
		Vector2(9.52, 43.52),
		Vector2(4.08, 10.24),
	])
	for index in range(points.size()):
		points[index] = icon_origin + points[index] * icon_scale
	draw_colored_polygon(points, shield_color)
	var outline := points.duplicate()
	outline.append(points[0])
	draw_polyline(outline, Color(0.0, 0.0, 0.0, 0.32), 3.0 * icon_scale, true)
	var font := ThemeDB.fallback_font
	if font == null:
		return
	var value_text := str(amount)
	var text_size := maxi(8, roundi(26.0 * icon_scale))
	var text_width := font.get_string_size(value_text, HORIZONTAL_ALIGNMENT_LEFT, -1, text_size).x
	var text_x := icon_origin.x + (icon_size.x - text_width) * 0.5
	var baseline := icon_origin.y + 39.68 * icon_scale
	draw_string(font, Vector2(text_x + 1.0, baseline + 2.0), value_text,
		HORIZONTAL_ALIGNMENT_LEFT, -1.0, text_size, Color(0.0, 0.0, 0.0, 0.45))
	draw_string(font, Vector2(text_x, baseline), value_text,
		HORIZONTAL_ALIGNMENT_LEFT, -1.0, text_size, Color.WHITE)
