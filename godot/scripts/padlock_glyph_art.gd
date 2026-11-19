extends RefCounted
class_name PortPadlockGlyphArt


static func _draw_half_cap(canvas: CanvasItem, center: Vector2, radius: float, start_angle: float, color: Color) -> void:
	var pts := PackedVector2Array()
	for i in range(13):
		var angle := start_angle + PI * float(i) / 12.0
		pts.append(center + Vector2(cos(angle), sin(angle)) * radius)
	canvas.draw_colored_polygon(pts, color)


static func draw(canvas: CanvasItem, rect: Rect2, color: Color, open_progress: float = 1.0) -> void:
	var progress := clampf(open_progress, 0.0, 1.0)
	var side := minf(rect.size.x, rect.size.y)
	if side <= 2.0:
		return
	var u := side / 132.0
	var cx := rect.get_center().x
	var bar_y := rect.get_center().y + 7.0 * u
	var bw := 27.0 * u
	var stroke := maxf(1.6, 8.5 * u)
	var cap_r := stroke * 0.5

	# Horizontal crossbar with non-overlapping outward semicircular endcaps
	var bar_left := Vector2(cx - 46.0 * u, bar_y)
	var bar_right := Vector2(cx + 46.0 * u, bar_y)
	canvas.draw_line(bar_left, bar_right, color, stroke, true)
	_draw_half_cap(canvas, bar_left, cap_r, PI * 0.5, color)
	_draw_half_cap(canvas, bar_right, cap_r, -PI * 0.5, color)

	# Bottom U-bowl starts flush below the crossbar so strokes never double-blend
	var bowl_points := PackedVector2Array()
	bowl_points.append(Vector2(cx - bw, bar_y + cap_r))
	bowl_points.append(Vector2(cx - bw, bar_y + 24.0 * u))
	for i in range(25):
		var angle := PI - PI * float(i) / 24.0
		bowl_points.append(Vector2(cx + bw * cos(angle), bar_y + 24.0 * u + bw * sin(angle)))
	bowl_points.append(Vector2(cx + bw, bar_y + cap_r))
	canvas.draw_polyline(bowl_points, color, stroke, true)

	# Center dot
	canvas.draw_circle(Vector2(cx, bar_y + 25.0 * u), maxf(1.2, 5.8 * u), color)

	# Upper capsule arch starts flush above the crossbar; lifts cleanly on the right as open_progress -> 1.0
	var lift := 10.0 * u * progress
	var arch_top_leg_y := bar_y - (28.0 * u + lift)
	var right_end_y := bar_y - cap_r - 30.0 * u * progress
	var arch_points := PackedVector2Array()
	arch_points.append(Vector2(cx - bw, bar_y - cap_r))
	arch_points.append(Vector2(cx - bw, arch_top_leg_y))
	for i in range(25):
		var angle := PI + PI * float(i) / 24.0
		arch_points.append(Vector2(cx + bw * cos(angle), arch_top_leg_y + bw * sin(angle)))
	arch_points.append(Vector2(cx + bw, right_end_y))
	canvas.draw_polyline(arch_points, color, stroke, true)
	if progress > 0.02:
		_draw_half_cap(canvas, Vector2(cx + bw, right_end_y), cap_r, 0.0, color)
