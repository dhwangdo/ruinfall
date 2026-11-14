extends Control

# Decorative backs only: the foreground card keeps its existing input rectangle.
@export var layers := 0
@export var frame: StyleBoxFlat
@export var band_color := Color.WHITE


func _ready() -> void:
	resized.connect(queue_redraw)


func _draw() -> void:
	if frame == null:
		return
	for layer in range(layers, 0, -1):
		draw_style_box(frame, Rect2(Vector2(-7.0 * layer, 0), size))
	# CSS stack bands start at the outer left edge, 4px below the card top.
	for layer in range(layers):
		var left := -7.0 * (layers - layer)
		draw_rect(Rect2(left, 4, 4, 19.6), frame.border_color)
		draw_rect(Rect2(left + 4, 4, 3, 19.6), band_color)
