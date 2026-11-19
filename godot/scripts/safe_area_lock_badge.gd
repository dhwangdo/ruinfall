extends Control
class_name PortSafeAreaLockBadge

const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")
const GameFonts = preload("res://scripts/game_fonts.gd")
const PadlockGlyphArt = preload("res://scripts/padlock_glyph_art.gd")

const UNLOCKED_COLOR := Color("#dba534")
const UNLOCKED_HOVER := Color("#f0be4d")
const LAMENT_COLOR := Color("#8fd4f3")
const LAMENT_HOVER := Color("#bce9ff")
const LAMENT_HALO := Color("#f3dfaa")
const KARMA_COLOR := Color("#d084ff")
const KARMA_HOVER := Color("#eabfff")

var _kind := "safe_area"
var _count := 0
var _tooltip_title := "덱 편집 제한 해제"
var _tooltip_description := "안전 구역에서는 덱을 자유롭게 편집할 수 있습니다."
var _hovered := false


func configure(kind: String, count: int = 0, tooltip_title: String = "", tooltip_description: String = "") -> void:
	_kind = kind
	_count = count
	if not tooltip_title.is_empty():
		_tooltip_title = tooltip_title
	if not tooltip_description.is_empty():
		_tooltip_description = tooltip_description
	if is_inside_tree():
		_apply_bindings()
		queue_redraw()


func _ready() -> void:
	name = "MapBuffBadge_%s" % _kind
	custom_minimum_size = Vector2(46, 46)
	size = Vector2(46, 46)
	mouse_filter = Control.MOUSE_FILTER_PASS
	mouse_entered.connect(_on_mouse_entered)
	mouse_exited.connect(_on_mouse_exited)
	_apply_bindings()
	queue_redraw()


func _apply_bindings() -> void:
	TooltipBindings.bind_status(self, _tooltip_title, _tooltip_description)
	for child in get_children():
		child.queue_free()
	if _count > 0:
		var count_label := Label.new()
		count_label.text = str(_count)
		count_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		count_label.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
		count_label.offset_left = -26.0
		count_label.offset_top = -22.0
		count_label.offset_right = -4.0
		count_label.offset_bottom = -2.0
		count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		count_label.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
		count_label.add_theme_font_override("font", GameFonts.make(800))
		count_label.add_theme_font_size_override("font_size", 15)
		count_label.add_theme_color_override("font_color", Color.WHITE)
		count_label.add_theme_color_override("font_outline_color", Color.BLACK)
		count_label.add_theme_constant_override("outline_size", 6)
		add_child(count_label)


func _on_mouse_entered() -> void:
	_hovered = true
	queue_redraw()


func _on_mouse_exited() -> void:
	_hovered = false
	queue_redraw()


func _draw() -> void:
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color("#0c0d0c", 0.78)
	bg.border_color = Color("#db8a3d", 0.85)
	bg.set_border_width_all(1)
	bg.set_corner_radius_all(5)
	draw_style_box(bg, Rect2(Vector2.ZERO, size))
	match _kind:
		"gods_lament":
			_draw_gods_lament()
		"karma":
			_draw_karma()
		_:
			_draw_unlocked_padlock()


func _draw_unlocked_padlock() -> void:
	var color := UNLOCKED_HOVER if _hovered else UNLOCKED_COLOR
	var icon_rect := Rect2(Vector2(5.0, 5.0), size - Vector2(10.0, 10.0))
	PadlockGlyphArt.draw(self, icon_rect, color, 1.0)


func _draw_gods_lament() -> void:
	# Golden halo ring above a glowing cyan teardrop.
	var cx := size.x * 0.5
	var halo_y := 11.5
	var halo_points := PackedVector2Array()
	for i in range(21):
		var angle := TAU * float(i) / 20.0
		halo_points.append(Vector2(cx + 9.0 * cos(angle), halo_y + 3.0 * sin(angle)))
	draw_polyline(halo_points, LAMENT_HALO, 1.8, true)
	var drop_color := LAMENT_HOVER if _hovered else LAMENT_COLOR
	var drop_points := PackedVector2Array([
		Vector2(cx, 16.5),
		Vector2(cx + 6.5, 25.5),
		Vector2(cx + 8.0, 30.0),
		Vector2(cx + 6.0, 34.5),
		Vector2(cx, 36.8),
		Vector2(cx - 6.0, 34.5),
		Vector2(cx - 8.0, 30.0),
		Vector2(cx - 6.5, 25.5),
		Vector2(cx, 16.5),
	])
	draw_polyline(drop_points, drop_color, 2.0, true)
	draw_circle(Vector2(cx - 2.4, 29.5), 1.4, drop_color)


func _draw_karma() -> void:
	# Stylized violet eye / curse sigil.
	var cx := size.x * 0.5
	var cy := size.y * 0.5
	var color := KARMA_HOVER if _hovered else KARMA_COLOR
	var top_arc := PackedVector2Array()
	var bot_arc := PackedVector2Array()
	for i in range(17):
		var t := float(i) / 16.0
		var x := lerpf(cx - 14.0, cx + 14.0, t)
		var bulge := sin(t * PI) * 9.5
		top_arc.append(Vector2(x, cy - bulge))
		bot_arc.append(Vector2(x, cy + bulge))
	draw_polyline(top_arc, color, 2.0, true)
	draw_polyline(bot_arc, color, 2.0, true)
	draw_arc(Vector2(cx, cy), 4.6, 0.0, TAU, 20, color, 1.8, true)
	draw_line(Vector2(cx, cy - 3.0), Vector2(cx, cy + 3.0), color, 2.0, true)
