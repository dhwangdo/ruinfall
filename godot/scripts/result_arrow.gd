extends Control

@export var arrow_color := Color("#ff9a00")


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	queue_redraw()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		queue_redraw()


func _draw() -> void:
	if size.x <= 0.0 or size.y <= 0.0:
		return
	var shaft_height := size.y * 0.38
	var shaft_top := (size.y - shaft_height) * 0.5
	var head_start := size.x * 0.62
	var points := PackedVector2Array([
		Vector2(0, shaft_top),
		Vector2(head_start, shaft_top),
		Vector2(head_start, 0),
		Vector2(size.x, size.y * 0.5),
		Vector2(head_start, size.y),
		Vector2(head_start, shaft_top + shaft_height),
		Vector2(0, shaft_top + shaft_height),
	])
	draw_colored_polygon(points, arrow_color)
