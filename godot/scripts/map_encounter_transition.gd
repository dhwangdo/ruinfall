extends Control

signal finished

const COLLISION_OVERLAP_SECONDS := 0.28
const BANNER_HOLD_SECONDS := 0.60
const BANNER_TEXT := "전투!"

const TEXT_COLOR := Color("#fff8df")
const BORDER_COLOR := Color("#ffe0a0")
const BACKGROUND_COLOR := Color("#9d241d")
const DARK_SHADOW_COLOR := Color(44.0 / 255.0, 12.0 / 255.0, 10.0 / 255.0, 0.78)
const GLOW_SHADOW_COLOR := Color(255.0 / 255.0, 125.0 / 255.0, 74.0 / 255.0, 0.8)

var _anchor_point := Vector2.ZERO
var _anchor_provider: Callable
var _visual_scale := 1.0
var _timer: Timer
var _label: Label
var _content_panel: PanelContainer
var _ring_panel: Panel
var _glow_panel: Panel
var _phase := 0
var _playing := false
var _finished_emitted := false
var shown_at_usec := -1
var finished_at_usec := -1
var _phase_deadline_usec := -1


func configure(anchor_point: Vector2, visual_scale: float = 1.0, anchor_provider: Callable = Callable()) -> void:
	_anchor_point = anchor_point
	_anchor_provider = anchor_provider
	_visual_scale = maxf(0.01, visual_scale)
	if is_node_ready():
		_apply_visual_scale()


func play() -> void:
	if _playing or _finished_emitted or not is_inside_tree():
		return
	_playing = true
	_phase = 0
	shown_at_usec = -1
	finished_at_usec = -1
	visible = false
	_phase_deadline_usec = Time.get_ticks_usec() + roundi(COLLISION_OVERLAP_SECONDS * 1_000_000.0)
	_timer.start(COLLISION_OVERLAP_SECONDS)


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_index = 16
	visible = false
	_build_visuals()
	_timer = Timer.new()
	_timer.one_shot = true
	_timer.process_mode = Node.PROCESS_MODE_ALWAYS
	_timer.ignore_time_scale = true
	_timer.timeout.connect(_on_phase_timeout)
	add_child(_timer)
	_apply_visual_scale()


func _process(_delta: float) -> void:
	if not _anchor_provider.is_valid():
		return
	var current = _anchor_provider.call()
	if not current is Rect2 or current.size.x <= 0.0:
		return
	_anchor_point = current.get_center()
	var next_scale := maxf(0.01, current.size.x / 136.0)
	if not is_equal_approx(next_scale, _visual_scale):
		_visual_scale = next_scale
		_apply_visual_scale()
	else:
		position = _anchor_point - size * 0.5


func _exit_tree() -> void:
	if is_instance_valid(_timer):
		_timer.stop()


func _build_visuals() -> void:
	_glow_panel = Panel.new()
	_glow_panel.name = "Glow"
	_glow_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_glow_panel)

	_ring_panel = Panel.new()
	_ring_panel.name = "DarkShadowRing"
	_ring_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_ring_panel)

	_content_panel = PanelContainer.new()
	_content_panel.name = "Banner"
	_content_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_content_panel)

	_label = Label.new()
	_label.text = BANNER_TEXT
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_content_panel.add_child(_label)
	_content_panel.minimum_size_changed.connect(_layout_visuals)


func _apply_visual_scale() -> void:
	if not is_instance_valid(_label) or not is_instance_valid(_content_panel):
		return

	var scale := _visual_scale
	var base_font: Font
	base_font = preload("res://assets/fonts/PretendardVariable.woff2")
	var font := FontVariation.new()
	font.base_font = base_font
	font.spacing_glyph = roundi(34.0 * 0.08 * scale)
	_label.add_theme_font_override("font", font)
	_label.add_theme_font_size_override("font_size", maxi(1, roundi(34.0 * scale)))
	_label.add_theme_color_override("font_color", TEXT_COLOR)

	var content_style := StyleBoxFlat.new()
	content_style.bg_color = BACKGROUND_COLOR
	content_style.border_color = BORDER_COLOR
	content_style.set_border_width_all(maxi(1, roundi(3.0 * scale)))
	content_style.set_corner_radius_all(maxi(0, roundi(7.0 * scale)))
	content_style.content_margin_left = 22.0 * scale
	content_style.content_margin_right = 22.0 * scale
	content_style.content_margin_top = 12.0 * scale
	content_style.content_margin_bottom = 12.0 * scale
	_content_panel.add_theme_stylebox_override("panel", content_style)

	var ring_style := StyleBoxFlat.new()
	ring_style.bg_color = DARK_SHADOW_COLOR
	ring_style.set_border_width_all(0)
	ring_style.set_corner_radius_all(maxi(0, roundi(11.0 * scale)))
	_ring_panel.add_theme_stylebox_override("panel", ring_style)

	var glow_style := StyleBoxFlat.new()
	glow_style.bg_color = BACKGROUND_COLOR
	glow_style.set_border_width_all(0)
	glow_style.set_corner_radius_all(maxi(0, roundi(7.0 * scale)))
	glow_style.shadow_color = GLOW_SHADOW_COLOR
	glow_style.shadow_size = maxi(0, roundi(28.0 * scale))
	_glow_panel.add_theme_stylebox_override("panel", glow_style)

	_layout_visuals()


func _layout_visuals() -> void:
	if not is_instance_valid(_content_panel):
		return
	var scale := _visual_scale
	_content_panel.reset_size()
	var content_size := _content_panel.get_combined_minimum_size()
	var ring_inset := 4.0 * scale
	var root_size := content_size + Vector2.ONE * (ring_inset * 2.0)
	size = root_size
	custom_minimum_size = root_size
	_glow_panel.position = Vector2.ONE * ring_inset
	_glow_panel.size = content_size
	_ring_panel.position = Vector2.ZERO
	_ring_panel.size = root_size
	_content_panel.position = Vector2.ONE * ring_inset
	_content_panel.size = content_size
	position = _anchor_point - root_size * 0.5


func _on_phase_timeout() -> void:
	var remaining_usec := _phase_deadline_usec - Time.get_ticks_usec()
	if remaining_usec > 0:
		_timer.start(float(remaining_usec) / 1_000_000.0)
		return

	if _phase == 0:
		_phase = 1
		shown_at_usec = Time.get_ticks_usec()
		visible = true
		_phase_deadline_usec = shown_at_usec + roundi(BANNER_HOLD_SECONDS * 1_000_000.0)
		_timer.start(BANNER_HOLD_SECONDS)
		return

	_phase = 2
	finished_at_usec = Time.get_ticks_usec()
	_timer.stop()
	_playing = false
	if _finished_emitted:
		return
	_finished_emitted = true
	finished.emit()
	queue_free()
