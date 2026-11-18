extends RefCounted


static func apply_map_style(bar: ProgressBar, label: Label) -> void:
	bar.show_percentage = false
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var background := StyleBoxFlat.new()
	background.bg_color = Color("#2c2825")
	background.border_color = Color("#512522")
	background.set_border_width_all(2)
	background.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("background", background)
	var fill := StyleBoxFlat.new()
	fill.bg_color = Color("#b34a42")
	fill.set_corner_radius_all(2)
	bar.add_theme_stylebox_override("fill", fill)

	var font := preload("res://scripts/game_fonts.gd").make(800)
	label.add_theme_font_override("font", font)
	label.add_theme_font_size_override("font_size", 16)
	label.add_theme_color_override("font_color", Color.WHITE)
	label.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	label.add_theme_constant_override("outline_size", 2)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE


static func set_display_hp(bar: ProgressBar, label: Label, target: int, animate: bool = true) -> void:
	var displayed := clampi(target, int(bar.min_value), int(bar.max_value))
	if int(bar.get_meta("hp_target", roundi(bar.value))) == displayed:
		return
	var previous_tween: Tween = bar.get_meta("hp_tween") if bar.has_meta("hp_tween") else null
	if previous_tween and previous_tween.is_running():
		previous_tween.kill()
	bar.set_meta("hp_target", displayed)
	if not animate or not bar.is_inside_tree():
		bar.value = displayed
		label.text = "%d / %d" % [displayed, int(bar.max_value)]
		return
	var tween := bar.create_tween()
	bar.set_meta("hp_tween", tween)
	var update := func(value: float) -> void:
		bar.value = value
		label.text = "%d / %d" % [roundi(value), int(bar.max_value)]
	tween.tween_method(update, bar.value, float(displayed), 0.38).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
