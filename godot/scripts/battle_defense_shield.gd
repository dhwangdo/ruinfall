extends Control

const ICON_DESIGN_SIZE := Vector2(48.0, 48.0)

var amount := 0
var shield_color := Color("#de7024")


func configure(kind: String, value: int) -> void:
	amount = maxi(0, value)
	shield_color = Color("#4299e8") if kind == "magic" else Color("#e87e22")
	custom_minimum_size = Vector2(58, 58)
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
		Vector2(24.0, 0.0),
		Vector2(46.0, 8.0),
		Vector2(42.0, 34.0),
		Vector2(24.0, 48.0),
		Vector2(6.0, 34.0),
		Vector2(2.0, 8.0),
	])
	for index in range(points.size()):
		points[index] = icon_origin + points[index] * icon_scale
	draw_colored_polygon(points, shield_color)
	var web_font := FontVariation.new()
	web_font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
	web_font.variation_opentype = {
		TextServerManager.get_primary_interface().name_to_tag("wght"): 800.0
	}
	var font: Font = web_font
	if font == null:
		return
	var value_text := str(amount)
	var text_size := 25
	var text_width := font.get_string_size(value_text, HORIZONTAL_ALIGNMENT_LEFT, -1, text_size).x
	var text_x := icon_origin.x + (icon_size.x - text_width) * 0.5
	var baseline := icon_origin.y + 31.0 * icon_scale
	draw_string(font, Vector2(text_x, baseline), value_text,
		HORIZONTAL_ALIGNMENT_LEFT, -1.0, text_size, Color.WHITE)
