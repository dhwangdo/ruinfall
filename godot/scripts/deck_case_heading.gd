extends Control

const DeckEditions = preload("res://scripts/deck_editions.gd")
const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")
const PadlockGlyphArt = preload("res://scripts/padlock_glyph_art.gd")
const DeckIconArt = preload("res://scripts/deck_icon_art.gd")
const HeadingFontRegular = preload("res://assets/fonts/PretendardVariable.woff2")
const HeadingFont = preload("res://assets/fonts/PretendardVariable700.tres")
static var _name_font: FontVariation
static var _count_font: FontVariation
var _lock_shackle_progress := 1.0
var _lock_shackle_lift_progress := 1.0
var _lock_color_progress := 1.0
var _animate_unlock_on_ready := false
var _show_lock := true
var _compact_text_width := 0.0


func _ready() -> void:
	if _animate_unlock_on_ready:
		_start_unlock_animation()

const EDITION_COLORS := DeckEditions.COLORS

const NAME_SIZE := 15
const EDITION_SIZE := 12
const COUNT_SIZE := 12
const MUTED_COLOR := Color("#c5c3ba")


func configure(deck_name: String, editions: Array, card_count: int, capacity: int,
	can_edit: bool, animate_unlock := false, show_lock := true, centered := false, show_icon := false) -> void:
	if editions.has("freeEdit"):
		can_edit = true
		animate_unlock = false
	_show_lock = show_lock
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	clip_contents = true
	var content := VBoxContainer.new()
	content.name = "DeckCaseHeadingContent"
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content.offset_left = (48.0 if _show_lock else 50.0) if show_icon else 12.0
	content.offset_right = -48.0 if _show_lock else (-20.0 if show_icon else -12.0)
	content.add_theme_constant_override("separation", 2)
	content.alignment = BoxContainer.ALIGNMENT_CENTER
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(content)
	if show_icon:
		var icon := TextureRect.new()
		icon.name = "DeckCaseIcon"
		icon.texture = DeckIconArt.RARE
		icon.material = DeckIconArt.palette_material()
		icon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.anchor_top = 0.5
		icon.anchor_bottom = 0.5
		var icon_side := 36.0 if _show_lock else 44.0
		icon.offset_left = 6.0
		icon.offset_right = 6.0 + icon_side
		icon.offset_top = -icon_side * 0.5
		icon.offset_bottom = icon_side * 0.5
		icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(icon)

	var name_label := Label.new()
	name_label.name = "DeckCaseNameLabel"
	name_label.text = "덱 「%s」" % deck_name
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER if centered else HORIZONTAL_ALIGNMENT_LEFT
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
	editions_row.alignment = BoxContainer.ALIGNMENT_CENTER if centered else BoxContainer.ALIGNMENT_BEGIN
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
	count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER if centered else HORIZONTAL_ALIGNMENT_LEFT
	count_label.add_theme_font_override("font", _font_arial_700())
	count_label.add_theme_font_size_override("font_size", COUNT_SIZE)
	count_label.add_theme_color_override("font_color", MUTED_COLOR)
	count_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	count_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(count_label)
	if show_icon and centered:
		_compact_text_width = maxf(_font_800().get_string_size(name_label.text,
			HORIZONTAL_ALIGNMENT_LEFT, -1, NAME_SIZE).x,
			_font_arial_700().get_string_size(count_label.text, HORIZONTAL_ALIGNMENT_LEFT, -1, COUNT_SIZE).x)
		var edition_width := 0.0
		for label in editions_row.get_children():
			edition_width += HeadingFont.get_string_size(label.text, HORIZONTAL_ALIGNMENT_LEFT, -1, EDITION_SIZE).x
		_compact_text_width = ceilf(maxf(_compact_text_width, edition_width))
		resized.connect(_layout_compact_heading)
		_layout_compact_heading.call_deferred()
	if not _show_lock:
		return
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
	var tooltip_description := "자유 편집: 안전 구역 밖에서도 이 덱을 자유롭게 편집할 수 있습니다." if editions.has("freeEdit") else "현재 위치에서는 덱을 자유롭게 편집할 수 있습니다." if can_edit \
		else "현재 위치에서는 덱을 자유롭게 편집할 수 없습니다."
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


func _layout_compact_heading() -> void:
	if size.x <= 0.0:
		return
	var content := get_node("DeckCaseHeadingContent") as Control
	var icon := get_node("DeckCaseIcon") as Control
	var icon_side := icon.size.x
	var gap := 8.0
	var text_width := minf(_compact_text_width, maxf(1.0, size.x - 24.0 - icon_side - gap))
	var left := roundf((size.x - icon_side - gap - text_width) * 0.5)
	icon.offset_left = left
	icon.offset_right = left + icon_side
	content.offset_left = left + icon_side + gap
	content.offset_right = content.offset_left + text_width - size.x


func _draw() -> void:
	if not _show_lock:
		return
	var can_edit := bool(get_meta("deck_case_can_edit", false))
	var color := Color("#f0be4d") if bool(get_meta("deck_case_lock_hovered", false)) \
		else MUTED_COLOR.lerp(Color("#dba534"), _lock_color_progress) if can_edit else MUTED_COLOR
	var right := size.x - 20.0
	var bottom := size.y - 20.0
	var open_progress := clampf(maxf(_lock_shackle_lift_progress * 0.35, _lock_shackle_progress), 0.0, 1.0) if can_edit else 0.0
	var lock_rect := Rect2(Vector2(right - 14.0, bottom - 15.0), Vector2(28.0, 28.0))
	PadlockGlyphArt.draw(self, lock_rect, color, open_progress)
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


static func _font_arial_700() -> FontVariation:
	if _count_font == null:
		_count_font = preload("res://scripts/game_fonts.gd").make(700)
	return _count_font

