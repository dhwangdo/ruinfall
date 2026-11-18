extends Control

var start := Vector2.ZERO
var tip := Vector2.ZERO
var color := Color("#42aaff")


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	focus_mode = Control.FOCUS_NONE


func set_endpoints(from_global: Vector2, pointer_global: Vector2, tint: Color) -> void:
	var inverse := get_global_transform_with_canvas().affine_inverse()
	start = inverse * from_global
	tip = inverse * pointer_global
	color = tint
	queue_redraw()


func _draw() -> void:
	var direction := tip - start
	if direction.length() < 12.0:
		return
	var head_base := tip - direction.normalized() * minf(15.0, direction.length() * 0.35)
	var control := (start + head_base) * 0.5
	control.y -= minf(24.0, direction.length() * 0.06)
	var tangent := (head_base - control).normalized()
	var curve_points := PackedVector2Array()
	for segment in range(21):
		var t := float(segment) / 20.0
		var inverse_t := 1.0 - t
		curve_points.append(inverse_t * inverse_t * start + 2.0 * inverse_t * t * control + t * t * head_base)
	# One filled silhouette gives the shaft and head the same crisp edge.
	draw_colored_polygon(_arrow_polygon(curve_points, tip + tangent * 2.0, 4.5, 11.0), Color(0, 0, 0, 0.4))
	draw_colored_polygon(_arrow_polygon(curve_points, tip, 3.0, 9.0), color)


func _arrow_polygon(points: PackedVector2Array, arrow_tip: Vector2, half_width: float,
		head_half_width: float) -> PackedVector2Array:
	var left := PackedVector2Array()
	var right := PackedVector2Array()
	for index in range(points.size()):
		var before := points[maxi(0, index - 1)]
		var after := points[mini(points.size() - 1, index + 1)]
		var tangent := (after - before).normalized()
		var normal := Vector2(-tangent.y, tangent.x)
		left.append(points[index] + normal * half_width)
		right.append(points[index] - normal * half_width)
	var head_base := points[points.size() - 1]
	var head_tangent := (points[points.size() - 1] - points[points.size() - 2]).normalized()
	var head_normal := Vector2(-head_tangent.y, head_tangent.x)
	left.append(head_base + head_normal * head_half_width)
	left.append(arrow_tip)
	left.append(head_base - head_normal * head_half_width)
	for index in range(right.size() - 1, -1, -1):
		left.append(right[index])
	return left
