extends Control

const NOTICE_TEXT := "한 턴 쉼"
const NOTICE_COLOR := Color("#fff2b8")
const NOTICE_DURATION := 1.2
const FADE_IN_DURATION := NOTICE_DURATION * 0.15
const BASELINE_GAP := 16.0

var _visual_scale := 1.0
var _label: Label
var _tween: Tween


func configure(anchor_point: Vector2, visual_scale: float = 1.0) -> void:
	_visual_scale = maxf(0.01, visual_scale)
	position = anchor_point
	z_index = 13
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = false
	if is_instance_valid(_label):
		_label.queue_free()
	_label = Label.new()
	_label.text = NOTICE_TEXT
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var notice_font: Font
	notice_font = FontVariation.new()
	notice_font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
	notice_font.variation_opentype = {
		TextServerManager.get_primary_interface().name_to_tag("wght"): 900.0
	}
	_label.add_theme_font_override("font", notice_font)
	_label.add_theme_font_size_override("font_size", maxi(1, roundi(24.0 * _visual_scale)))
	_label.add_theme_color_override("font_color", NOTICE_COLOR)
	_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.75))
	_label.add_theme_constant_override("shadow_offset_x", 0)
	_label.add_theme_constant_override("shadow_offset_y", maxi(1, roundi(2.0 * _visual_scale)))
	_label.size = _label.get_combined_minimum_size()
	_label.position = Vector2(-_label.size.x * 0.5,
		-_label.size.y - 8.0 * _visual_scale)
	add_child(_label)


func play() -> void:
	if not is_inside_tree() or not is_instance_valid(_label):
		return
	if _tween != null and _tween.is_running():
		_tween.kill()
	_label.modulate.a = 0.0
	var start_position := _label.position
	var base_position := Vector2(start_position.x,
		-_label.size.y - BASELINE_GAP * _visual_scale)
	var end_position := Vector2(start_position.x,
		-_label.size.y - 30.0 * _visual_scale)
	_tween = create_tween()
	var fade_in := _tween.tween_property(_label, "modulate:a", 1.0, FADE_IN_DURATION)
	fade_in.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	var rise_in := _tween.parallel().tween_property(_label, "position", base_position, FADE_IN_DURATION)
	rise_in.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	var fade_out := _tween.tween_property(_label, "modulate:a", 0.0,
		NOTICE_DURATION - FADE_IN_DURATION)
	fade_out.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	var rise_out := _tween.parallel().tween_property(_label, "position", end_position,
		NOTICE_DURATION - FADE_IN_DURATION)
	rise_out.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	_tween.tween_callback(queue_free)
