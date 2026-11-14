extends Control
class_name BattleHitPopup

signal finished

const DURATION := 1.15
const BLOCKED_TEXT := "막음"

var _label: Label
var _tween: Tween
var _anchor_center := Vector2.ZERO
var _anchor_provider: Callable
var _fallback_anchor := Rect2()
var _progress := 0.0
var _finished := false


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func configure(text: String, anchor_global_rect: Rect2, kind: String = "damage", anchor_provider: Callable = Callable()) -> void:
	if _tween != null and _tween.is_running():
		_tween.kill()
	_finished = false
	_progress = 0.0
	_anchor_provider = anchor_provider
	_fallback_anchor = anchor_global_rect
	_anchor_center = Vector2(anchor_global_rect.position.x + anchor_global_rect.size.x * 0.5, anchor_global_rect.position.y - 3.0)
	if is_instance_valid(_label):
		remove_child(_label)
		_label.free()
	_label = Label.new()
	_label.name = "PopupText"
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.text = text
	_label.modulate.a = 0.0
	_label.pivot_offset = Vector2.ZERO
	_apply_style(text, kind)
	add_child(_label)
	_label.resized.connect(_center_label)
	_center_label()


func play() -> void:
	if not is_instance_valid(_label):
		return
	if _tween != null and _tween.is_running():
		_tween.kill()
	_finished = false
	_progress = 0.0
	_center_label()
	_tween = create_tween()
	_tween.tween_method(_set_progress, 0.0, 1.0, DURATION)
	_tween.tween_callback(_finish)


func cancel() -> void:
	if _tween != null and _tween.is_running():
		_tween.kill()
	_finish()


func _apply_style(text: String, kind: String) -> void:
	var settings := LabelSettings.new()
	settings.shadow_size = 2
	settings.shadow_offset = Vector2(0, 2)
	settings.shadow_color = Color("541b18")
	var font_weight := 700
	if kind == "buff" or kind == "debuff":
		font_weight = 800
		settings.font_size = 17
		settings.font_color = Color("ffe09a") if kind == "buff" else Color("ebc9ff")
		settings.shadow_color = Color(55.0 / 255.0, 37.0 / 255.0, 8.0 / 255.0, 0.86) if kind == "buff" else Color("3b174d")
		_label.custom_minimum_size = Vector2(230, 0)
		_label.size = Vector2(230, 0)
	elif text == BLOCKED_TEXT or kind == "blocked":
		font_weight = 900
		settings.font_size = 24
		settings.font_color = Color("d8edf8")
		settings.shadow_color = Color("17435b")
		_label.custom_minimum_size = Vector2(180, 0)
		_label.size = Vector2(180, 0)
	else:
		font_weight = 900
		settings.font_size = 30
		settings.font_color = Color("ffd6ce")
		_label.custom_minimum_size = Vector2(180, 0)
		_label.size = Vector2(180, 0)
	var font: Font
	var web_font := FontVariation.new()
	web_font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
	web_font.variation_opentype = {
		TextServerManager.get_primary_interface().name_to_tag("wght"): float(font_weight)
	}
	font = web_font
	settings.font = font
	_label.label_settings = settings


func _center_label() -> void:
	if not is_instance_valid(_label):
		return
	_label.pivot_offset = _label.size * 0.5
	_set_progress(_progress)


func _set_progress(progress: float) -> void:
	if not is_instance_valid(_label):
		return
	_progress = progress
	if _anchor_provider.is_valid():
		var current = _anchor_provider.call()
		if current is Rect2 and current.size.x > 0.0 and current.size.y > 0.0:
			_fallback_anchor = current
	_anchor_center = Vector2(_fallback_anchor.get_center().x, _fallback_anchor.position.y - 3.0)
	var segment_start := 0.0 if progress <= 0.22 else 0.22
	var segment_end := 0.22 if progress <= 0.22 else 1.0
	var local_time := clampf((progress - segment_start) / (segment_end - segment_start), 0.0, 1.0)
	var eased := _bezier_ease_out(local_time)
	var from_opacity := 0.0 if progress <= 0.22 else 1.0
	var to_opacity := 1.0 if progress <= 0.22 else 0.0
	var from_y := 12.0 if progress <= 0.22 else 0.0
	var to_y := 0.0 if progress <= 0.22 else -34.0
	var from_scale := 0.78 if progress <= 0.22 else 1.08
	var to_scale := 1.08 if progress <= 0.22 else 1.0
	_label.modulate.a = lerpf(from_opacity, to_opacity, eased)
	_label.global_position = _anchor_center - Vector2(_label.size.x * 0.5, _label.size.y) + Vector2(0, lerpf(from_y, to_y, eased))
	var scale_value := lerpf(from_scale, to_scale, eased)
	_label.scale = Vector2.ONE * scale_value


func _bezier_ease_out(time: float) -> float:
	# CSS cubic-bezier(0, 0, .58, 1), solved from x back to its Bezier parameter.
	var low := 0.0
	var high := 1.0
	for _iteration in range(14):
		var t := (low + high) * 0.5
		var inverse := 1.0 - t
		var x := 3.0 * inverse * t * t * 0.58 + t * t * t
		if x < time:
			low = t
		else:
			high = t
	var parameter := (low + high) * 0.5
	return 3.0 * (1.0 - parameter) * parameter * parameter + parameter * parameter * parameter


func _finish() -> void:
	if _finished:
		return
	_finished = true
	finished.emit()
	queue_free()
