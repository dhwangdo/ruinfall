extends Control

signal hold_progress_changed(progress: float)
signal unlock_phase_changed(phase: String)
signal shake_changed(offset: Vector2, angle_degrees: float)
signal unlock_requested

const KEY_COST := 3
const HOLD_DURATION_MS := 2000
const CARD_FONT: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")

const ENABLED_FILL := Color("#8fd4f3")
const PROGRESS_FILL := Color("#369cc8")
const ENABLED_BORDER := Color("#61b6df")
const ENABLED_TEXT := Color("#12394c")
const DISABLED_FILL := Color("#50524f")
const DISABLED_BORDER := Color("#747773")
const DISABLED_TEXT := Color("#bebfbb")
const HOLD_GLOW := Color(143.0 / 255.0, 212.0 / 255.0, 243.0 / 255.0, 0.4)

var _keys: int = 0
var _opened: bool = false
var _reduced_motion: bool = false
var _hold_sources: Dictionary = {}
var _hold_state: String = "idle"
var _hold_started_ms: int = 0
var _progress: float = 0.0
var _panel_phase: String = "idle"
var _enabled_style: StyleBoxFlat
var _disabled_style: StyleBoxFlat
var _enabled_border: StyleBoxFlat
var _disabled_border: StyleBoxFlat
var _label: Label


func configure(keys: int, opened: bool, reduced_motion: bool = false) -> void:
	_keys = maxi(0, keys)
	_opened = opened
	_reduced_motion = reduced_motion
	if _is_disabled() and not _hold_sources.is_empty():
		_reset_hold()
	_update_label()
	queue_redraw()


func is_disabled() -> bool:
	return _is_disabled()


func _ready() -> void:
	custom_minimum_size = Vector2(190.0, 42.0)
	focus_mode = Control.FOCUS_ALL
	mouse_filter = Control.MOUSE_FILTER_STOP
	process_mode = Node.PROCESS_MODE_ALWAYS
	mouse_exited.connect(_on_mouse_exited)
	focus_exited.connect(_on_focus_exited)
	_enabled_style = _make_style(ENABLED_FILL, ENABLED_BORDER, true)
	_disabled_style = _make_style(DISABLED_FILL, DISABLED_BORDER, true)
	_enabled_border = _make_style(Color.TRANSPARENT, ENABLED_BORDER, false)
	_disabled_border = _make_style(Color.TRANSPARENT, DISABLED_BORDER, false)
	_label = Label.new()
	_label.name = "DeckVaultUnlockLabel"
	_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.add_theme_font_size_override("font_size", 14)
	var label_font := FontVariation.new()
	label_font.base_font = CARD_FONT
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	label_font.variation_opentype = {weight_axis: 600.0}
	_label.add_theme_font_override("font", label_font)
	add_child(_label)
	set_process(false)
	_update_label()
	queue_redraw()


func _exit_tree() -> void:
	_reset_hold()


func _notification(what: int) -> void:
	if what in [NOTIFICATION_WM_WINDOW_FOCUS_OUT, NOTIFICATION_APPLICATION_FOCUS_OUT, NOTIFICATION_APPLICATION_PAUSED]:
		_reset_hold()


func _input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index == MOUSE_BUTTON_LEFT and (not mouse_event.pressed or mouse_event.canceled):
			_stop_source("pointer")
	elif event is InputEventScreenTouch:
		var touch_event := event as InputEventScreenTouch
		if not touch_event.pressed or touch_event.canceled:
			_stop_source("pointer")
	elif event is InputEventKey:
		var key_event := event as InputEventKey
		if not key_event.pressed and key_event.keycode in [KEY_SPACE, KEY_ENTER]:
			_stop_source("keyboard")


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mouse_event := event as InputEventMouseButton
		if mouse_event.button_index != MOUSE_BUTTON_LEFT:
			return
		accept_event()
		if mouse_event.pressed and not mouse_event.canceled:
			grab_focus()
			_start_source("pointer")
		else:
			_stop_source("pointer")
		return
	if event is InputEventScreenTouch:
		var touch_event := event as InputEventScreenTouch
		accept_event()
		if touch_event.pressed and not touch_event.canceled:
			grab_focus()
			_start_source("pointer")
		else:
			_stop_source("pointer")
		return
	if event is InputEventKey:
		var key_event := event as InputEventKey
		if key_event.keycode not in [KEY_SPACE, KEY_ENTER]:
			return
		accept_event()
		if key_event.pressed and not key_event.echo:
			_start_source("keyboard")
		elif not key_event.pressed:
			_stop_source("keyboard")


func _process(_delta: float) -> void:
	if _hold_state != "holding":
		set_process(false)
		return
	if _is_disabled():
		_reset_hold()
		return
	var elapsed_ms: int = maxi(0, Time.get_ticks_msec() - _hold_started_ms)
	var progress: float = minf(1.0, float(elapsed_ms) / float(HOLD_DURATION_MS))
	_emit_progress(progress)
	if elapsed_ms >= HOLD_DURATION_MS:
		_hold_state = "complete"
		set_process(false)
		queue_redraw()
		unlock_requested.emit()


func _start_source(source: String) -> void:
	if _is_disabled():
		return
	_hold_sources[source] = true
	if _hold_state != "idle":
		return
	_hold_state = "holding"
	_hold_started_ms = Time.get_ticks_msec()
	set_process(true)
	queue_redraw()
	_emit_progress(0.0)


func _stop_source(source: String) -> void:
	if not _hold_sources.has(source):
		return
	_hold_sources.erase(source)
	if _hold_sources.is_empty():
		_reset_hold()


func _reset_hold() -> void:
	set_process(false)
	_hold_sources.clear()
	_hold_state = "idle"
	_hold_started_ms = 0
	_progress = 0.0
	var phase_changed: bool = _panel_phase != "idle"
	_panel_phase = "idle"
	hold_progress_changed.emit(0.0)
	if phase_changed:
		unlock_phase_changed.emit("idle")
	shake_changed.emit(Vector2.ZERO, 0.0)
	queue_redraw()


func _emit_progress(progress: float) -> void:
	_progress = clampf(progress, 0.0, 1.0)
	hold_progress_changed.emit(_progress)
	var next_phase: String = "charged" if _progress >= 0.25 else "holding" if _progress > 0.0 else "idle"
	if _panel_phase != next_phase:
		_panel_phase = next_phase
		unlock_phase_changed.emit(_panel_phase)
	var shake_offset := Vector2.ZERO
	var shake_angle := 0.0
	if _progress >= 0.25 and not _reduced_motion:
		var ramp: float = pow(minf(1.0, (_progress - 0.25) / 0.75), 1.6)
		shake_offset = Vector2(0.5 + 2.2 * ramp, 0.35 + 1.9 * ramp)
		shake_angle = 0.04 + 0.2 * ramp
	shake_changed.emit(shake_offset, shake_angle)
	queue_redraw()


func _is_disabled() -> bool:
	return _opened or _keys < KEY_COST


func _on_mouse_exited() -> void:
	_stop_source("pointer")


func _on_focus_exited() -> void:
	_reset_hold()


func _update_label() -> void:
	if _label == null:
		return
	_label.text = "열쇠 %d개로 개방" % KEY_COST
	_label.add_theme_color_override("font_color", DISABLED_TEXT if _is_disabled() else ENABLED_TEXT)
	tooltip_text = "열쇠 %d개가 필요합니다" % KEY_COST if _is_disabled() else "2초간 눌러 개방"
	mouse_default_cursor_shape = Control.CURSOR_FORBIDDEN if _is_disabled() else Control.CURSOR_POINTING_HAND


func _draw() -> void:
	if _enabled_style == null or _disabled_style == null:
		return
	var draw_position := Vector2(0.0, 1.0) if _hold_state == "holding" else Vector2.ZERO
	var draw_size := Vector2(size.x, maxf(0.0, size.y - draw_position.y))
	var button_rect := Rect2(draw_position, draw_size)
	draw_style_box(_disabled_style if _is_disabled() else _enabled_style, button_rect)
	if not _is_disabled() and _progress > 0.0:
		var progress_width: float = button_rect.size.x * _progress
		draw_rect(Rect2(button_rect.position, Vector2(progress_width, button_rect.size.y)), PROGRESS_FILL, true)
	if _hold_state == "holding":
		draw_rect(button_rect.grow(1.0), HOLD_GLOW, false, 2.0)
	draw_style_box(_disabled_border if _is_disabled() else _enabled_border, button_rect)


func _make_style(background: Color, border: Color, draw_center: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.draw_center = draw_center
	style.content_margin_left = 16
	style.content_margin_top = 9
	style.content_margin_right = 16
	style.content_margin_bottom = 9
	return style
