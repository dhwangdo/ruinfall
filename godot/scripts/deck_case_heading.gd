extends Control

const DeckEditions = preload("res://scripts/deck_editions.gd")
const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")
const HeadingFontRegular = preload("res://assets/fonts/PretendardVariable.woff2")
const HeadingFont = preload("res://assets/fonts/PretendardVariable700.tres")
static var _name_font: FontVariation
static var _count_font: SystemFont
var _lock_shackle_progress := 1.0
var _lock_shackle_lift_progress := 1.0
var _lock_color_progress := 1.0
var _animate_unlock_on_ready := false


func _ready() -> void:
	if _animate_unlock_on_ready:
		_start_unlock_animation()

const EDITION_COLORS := {
	"clever": "#ef4444", "roomy": "#f97316", "lively": "#eab308",
	"fantastic": "#84cc16", "rampaging": "#06b6d4", "quickHammer": "#e29842",
	"drawPlus": "#6366f1", "starPlus": "#8b5cf6", "energyPlus": "#a855f7",
	"persistentDraw": "#d946ef", "frugalPlus": "#ec4899", "defensiveStance": "#f43f5e",
	"resistance": "#64748b", "giant": "#7c3aed", "whiteSpace": "#115e59",
	"invincible": "#be123c", "hammering": "#c2410c", "deckHighlander": "#a16207",
	"starFive": "#15803d", "energyThree": "#0f766e", "starThree": "#d4a017",
}

const NAME_SIZE := 15
const EDITION_SIZE := 11
const COUNT_SIZE := 12
const MUTED_COLOR := Color("#c5c3ba")


func configure(deck_name: String, editions: Array, card_count: int, capacity: int,
	can_edit: bool, animate_unlock := false) -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	clip_contents = true
	var content := VBoxContainer.new()
	content.name = "DeckCaseHeadingContent"
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content.offset_left = 12.0
	content.offset_right = -48.0
	content.add_theme_constant_override("separation", 2)
	content.alignment = BoxContainer.ALIGNMENT_CENTER
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(content)

	var name_label := Label.new()
	name_label.name = "DeckCaseNameLabel"
	name_label.text = "덱 「%s」" % deck_name
	name_label.add_theme_font_override("font", _font_800())
	name_label.add_theme_font_size_override("font_size", NAME_SIZE)
	name_label.add_theme_color_override("font_color", Color.WHITE)
	name_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS_FORCE
	name_label.clip_text = true
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(name_label)

	var editions_row := HBoxContainer.new()
	editions_row.name = "DeckCaseEditions"
	editions_row.add_theme_constant_override("separation", 0)
	editions_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	editions_row.clip_contents = true
	editions_row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var sorted_editions: Array = editions.duplicate()
	sorted_editions.sort_custom(func(left: Variant, right: Variant) -> bool:
		return int(DeckEditions.SCORES.get(str(left), 0)) > int(DeckEditions.SCORES.get(str(right), 0))
	)
	for edition_value in sorted_editions:
		var edition := str(edition_value)
		if not EDITION_COLORS.has(edition):
			continue
		var label := Label.new()
		label.text = "[%s] " % DeckEditions.label(edition)
		label.add_theme_font_override("font", HeadingFont)
		label.add_theme_font_size_override("font_size", EDITION_SIZE)
		label.add_theme_color_override("font_color", Color(str(EDITION_COLORS[edition])))
		label.autowrap_mode = TextServer.AUTOWRAP_OFF
		label.mouse_filter = Control.MOUSE_FILTER_PASS
		TooltipBindings.bind_edition(label, edition)
		editions_row.add_child(label)
	content.add_child(editions_row)
	var count_label := Label.new()
	count_label.name = "DeckCaseCountLabel"
	count_label.text = "%d / %d" % [card_count, capacity]
	count_label.add_theme_font_override("font", _font_arial_700())
	count_label.add_theme_font_size_override("font_size", COUNT_SIZE)
	count_label.add_theme_color_override("font_color", MUTED_COLOR)
	count_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	count_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(count_label)
	var lock_hitbox := Control.new()
	lock_hitbox.name = "DeckCaseLockTooltip"
	lock_hitbox.mouse_filter = Control.MOUSE_FILTER_PASS
	lock_hitbox.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	lock_hitbox.offset_left = -47.0
	lock_hitbox.offset_top = -45.0
	lock_hitbox.offset_right = -7.0
	lock_hitbox.offset_bottom = -5.0
	lock_hitbox.mouse_entered.connect(_on_lock_tooltip_mouse_entered)
	lock_hitbox.mouse_exited.connect(_on_lock_tooltip_mouse_exited)
	var tooltip_title := "덱 편집 제한 해제" if can_edit else "덱 편집 제한"
	var tooltip_description := "안전 구역에서 덱을 자유롭게 편집할 수 있습니다." if can_edit \
		else "덱 자유 편집은 안전 구역에서 가능합니다."
	TooltipBindings.bind_status(lock_hitbox, tooltip_title, tooltip_description)
	add_child(lock_hitbox)
	set_meta("deck_case_can_edit", can_edit)
	_lock_shackle_progress = 1.0 if can_edit else 0.0
	_lock_shackle_lift_progress = 1.0 if can_edit else 0.0
	_lock_color_progress = 1.0 if can_edit else 0.0
	if can_edit and animate_unlock:
		_lock_shackle_progress = 0.0
		_lock_shackle_lift_progress = 0.0
		_lock_color_progress = 0.0
		_animate_unlock_on_ready = true
	queue_redraw()


func _draw() -> void:
	var can_edit := bool(get_meta("deck_case_can_edit", false))
	var color := Color("#e6a04b") if bool(get_meta("deck_case_lock_hovered", false)) \
		else MUTED_COLOR.lerp(Color("#f0cd56"), _lock_color_progress) if can_edit else MUTED_COLOR
	var right := size.x - 19.0
	var bottom := size.y - 20.0
	# Small outlined lock in the same lower-right position as the browser heading.
	var shackle_y := bottom - 8.0 - 2.25 * _lock_shackle_lift_progress
	var hinge_x := right - 6.0
	var rotation := PI * _lock_shackle_progress if can_edit else 0.0
	var shackle_points := PackedVector2Array()
	for point_index in range(17):
		var angle := PI + PI * float(point_index) / 16.0
		var original_x := right + 6.0 * cos(angle)
		var rotated_x := hinge_x + (original_x - hinge_x) * cos(rotation)
		shackle_points.append(Vector2(rotated_x, shackle_y + 6.0 * sin(angle)))
	draw_polyline(shackle_points, color, 1.8, true)
	var closed_leg_x := hinge_x
	var free_leg_x := hinge_x + 12.0 * cos(rotation)
	draw_line(Vector2(closed_leg_x, shackle_y), Vector2(closed_leg_x, bottom - 1.0), color, 1.8, true)
	draw_line(Vector2(free_leg_x, shackle_y), Vector2(free_leg_x, bottom - 1.0), color, 1.8, true)
	draw_rect(Rect2(right - 9.0, bottom - 1.0, 18.0, 15.0), color, false, 1.8, true)
	draw_circle(Vector2(right, bottom + 5.0), 1.2, color)
	draw_line(Vector2(right, bottom + 6.0), Vector2(right, bottom + 9.0), color, 1.3, true)
	# The browser uses a visible divider between the heading and card strip.
	draw_line(Vector2(size.x - 1.0, 0.0), Vector2(size.x - 1.0, size.y), Color("#db8a3d"), 2.0, true)


func _on_lock_tooltip_mouse_entered() -> void:
	set_meta("deck_case_lock_hovered", true)
	queue_redraw()


func _on_lock_tooltip_mouse_exited() -> void:
	set_meta("deck_case_lock_hovered", false)
	queue_redraw()


func _set_lock_shackle_progress(value: float) -> void:
	_lock_shackle_progress = value
	queue_redraw()


func _set_lock_color_progress(value: float) -> void:
	_lock_color_progress = value
	queue_redraw()


func _set_lock_shackle_lift_progress(value: float) -> void:
	_lock_shackle_lift_progress = value
	queue_redraw()


func _start_unlock_animation() -> void:
	_animate_unlock_on_ready = false
	var color_tween := create_tween()
	color_tween.tween_interval(0.2)
	color_tween.tween_method(_set_lock_color_progress, 0.0, 1.0, 0.352) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	var shackle_tween := create_tween()
	shackle_tween.tween_interval(0.2)
	shackle_tween.tween_method(_set_lock_shackle_lift_progress, 0.0, 1.0, 0.352) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	shackle_tween.tween_interval(0.044)
	shackle_tween.tween_method(_set_lock_shackle_progress, 0.0, 1.0333, 0.528) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	shackle_tween.tween_method(_set_lock_shackle_progress, 1.0333, 0.9889, 0.088) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	shackle_tween.tween_method(_set_lock_shackle_progress, 0.9889, 1.0, 0.088) \
		.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)


static func _font_800() -> FontVariation:
	if _name_font == null:
		var weight_axis: int = TextServerManager.get_primary_interface().name_to_tag("wght")
		_name_font = FontVariation.new()
		_name_font.base_font = HeadingFontRegular
		_name_font.variation_opentype = {weight_axis: 800.0}
	return _name_font


static func _font_arial_700() -> SystemFont:
	if _count_font == null:
		_count_font = SystemFont.new()
		_count_font.font_names = PackedStringArray(["Arial"])
		_count_font.font_weight = 700
	return _count_font

