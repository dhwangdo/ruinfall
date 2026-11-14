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
	var tangent := direction.normalized()
	var normal := Vector2(-tangent.y, tangent.x)
	var head_base := tip - tangent * 15.0
	draw_line(start, head_base, Color(0, 0, 0, 0.4), 7.0, true)
	draw_line(start, head_base, color, 4.0, true)
	draw_colored_polygon(PackedVector2Array([tip, head_base + normal * 7.0,
		head_base - normal * 7.0]), color)
