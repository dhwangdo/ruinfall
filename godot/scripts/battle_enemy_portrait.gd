extends Control

var enemy_variant := ""


func configure(enemy: Dictionary) -> void:
	enemy_variant = str(enemy.get("variant", ""))
	if str(enemy.get("name", "")) == "굶주린 들개": enemy_variant = "hungryDog"
	if str(enemy.get("name", "")).contains("쥐"): enemy_variant = "rat"
	queue_redraw()


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE


func _draw() -> void:
	var factor := 0.82 if enemy_variant == "rat" else 0.88 if enemy_variant == "goblin" else 1.0
	draw_set_transform((size - Vector2(70, 75) * factor) * 0.5, 0, Vector2.ONE * factor)
	if enemy_variant == "rat":
		for x in [19.5, 50.5]: draw_arc(Vector2(x, 11.5), 8, 0, TAU, 40, Color("#b49d91"), 3, true)
	elif enemy_variant != "slime":
		var horn_color := Color("#624831") if enemy_variant == "hungryDog" else Color("#6b6757")
		for x in [17.0, 53.0]:
			draw_arc(Vector2(x, 11), 6, PI, TAU, 20, horn_color, 5, true)
			draw_line(Vector2(x - 6, 11), Vector2(x - 4, 25), horn_color, 5, true)
			draw_line(Vector2(x + 6, 11), Vector2(x + 4, 25), horn_color, 5, true)
	var face := StyleBoxFlat.new()
	face.bg_color = _face_color()
	face.border_color = Color("#2d3f34")
	face.set_border_width_all(2)
	face.corner_detail = 16
	face.set_corner_radius_all(24 if enemy_variant != "golem" else 8)
	draw_style_box(face, Rect2(7, 11, 56, 64))
	draw_circle(Vector2(25.5, 40.5), 3.5, Color("#292929"))
	draw_circle(Vector2(45.3, 40.5), 3.5, Color("#292929"))
	draw_line(Vector2(25, 62), Vector2(45, 62), Color("#292929"), 2, true)


func _face_color() -> Color:
	match enemy_variant:
		"hungryDog":
			return Color("#987554")
		"goblin":
			return Color("#9eb279")
		"rat":
			return Color("#857967")
		"gargoyle":
			return Color("#747876")
		"slime":
			return Color("#dc8037")
		"golem":
			return Color("#7f8585")
		_:
			return Color("#c0af83")
