extends Control

var energy := 0
var maximum_energy := 1


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func configure(current_energy: int, max_energy: int) -> void:
	energy = current_energy
	maximum_energy = maxi(1, max_energy)
	queue_redraw()


func _draw() -> void:
	var center := size * 0.5
	var radius := minf(size.x, size.y) * 0.5 - 2.0
	if radius <= 0.0:
		return
	draw_circle(center, radius, Color("#34495e"))
	var fraction := clampf(float(energy) / float(maximum_energy), 0.0, 1.0)
	if fraction > 0.0:
		var fill_radius := radius - 4.0
		var water_y := center.y + fill_radius - 2.0 * fill_radius * fraction
		var angle_offset := asin(clampf((water_y - center.y) / fill_radius, -1.0, 1.0))
		var points := PackedVector2Array()
		for index in range(33):
			var angle := angle_offset + (PI - angle_offset * 2.0) * float(index) / 32.0
			points.append(center + Vector2(cos(angle), sin(angle)) * fill_radius)
		draw_colored_polygon(points, Color("#126fbd"))
	draw_arc(center, radius, 0.0, TAU, 48, Color("#111512"), 3.0, true)
	draw_arc(center, radius - 1.5, 0.0, TAU, 48, Color("#8a928a"), 1.0, true)
	_draw_energy_text(center)


func _draw_energy_text(center: Vector2) -> void:
	var font := preload("res://scripts/game_fonts.gd").make(700)
	if font == null:
		return
	var current_text := str(energy)
	var maximum_text := "/%d" % maximum_energy
	var current_size := 28
	var maximum_size := 15
	var current_width := font.get_string_size(current_text, HORIZONTAL_ALIGNMENT_LEFT, -1, current_size).x
	var maximum_width := font.get_string_size(maximum_text, HORIZONTAL_ALIGNMENT_LEFT, -1, maximum_size).x
	var total_width := current_width + maximum_width + 1.0
	var start_x := center.x - total_width * 0.5
	draw_string(font, Vector2(start_x, center.y + 9.0), current_text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, current_size, Color.WHITE)
	draw_string(font, Vector2(start_x + current_width + 1.0, center.y + 6.0), maximum_text, HORIZONTAL_ALIGNMENT_LEFT, -1.0, maximum_size, Color.WHITE)
