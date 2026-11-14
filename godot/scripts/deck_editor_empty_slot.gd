extends Control

const SLOT_SIZE := Vector2(82.0, 82.0)
const DIVIDER_SIZE := Vector2(11.0, 82.0)

var slot_kind: String = "normal"


func configure(kind: String) -> void:
	slot_kind = kind
	custom_minimum_size = DIVIDER_SIZE if slot_kind == "divider" else SLOT_SIZE
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	queue_redraw()


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	queue_redraw()


func _draw() -> void:
	if slot_kind == "divider":
		draw_rect(Rect2(Vector2(5.0, 0.0), Vector2(1.0, size.y)), Color(232.0 / 255.0, 228.0 / 255.0, 218.0 / 255.0, 0.42), true)
		return
	var rare := slot_kind == "rare"
	var fill := Color(213.0 / 255.0, 169.0 / 255.0, 40.0 / 255.0, 0.18) if rare else Color(1.0, 1.0, 1.0, 0.045)
	var edge := Color(213.0 / 255.0, 169.0 / 255.0, 40.0 / 255.0, 0.88) if rare else Color(1.0, 1.0, 1.0, 0.25)
	var radius := 4.0 if rare else 3.0
	var fill_style := StyleBoxFlat.new()
	fill_style.bg_color = fill
	fill_style.set_corner_radius_all(int(radius))
	draw_style_box(fill_style, Rect2(Vector2.ZERO, size))
	var left := 0.5
	var top := 0.5
	var right := maxf(left, size.x - 0.5)
	var bottom := maxf(top, size.y - 0.5)
	draw_dashed_line(Vector2(left + radius, top), Vector2(right - radius, top), edge, 1.0, 5.0, true)
	draw_dashed_line(Vector2(right, top + radius), Vector2(right, bottom - radius), edge, 1.0, 5.0, true)
	draw_dashed_line(Vector2(right - radius, bottom), Vector2(left + radius, bottom), edge, 1.0, 5.0, true)
	draw_dashed_line(Vector2(left, bottom - radius), Vector2(left, top + radius), edge, 1.0, 5.0, true)
	draw_arc(Vector2(right - radius, top + radius), radius, -PI * 0.5, 0.0, 8, edge, 1.0, true)
	draw_arc(Vector2(right - radius, bottom - radius), radius, 0.0, PI * 0.5, 8, edge, 1.0, true)
	draw_arc(Vector2(left + radius, bottom - radius), radius, PI * 0.5, PI, 8, edge, 1.0, true)
	draw_arc(Vector2(left + radius, top + radius), radius, PI, PI * 1.5, 8, edge, 1.0, true)
