extends Control

signal deck_picked(deck_id: String)
signal closed

const FONT_FILE: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")
const ITEM_WIDTH := 124.0 * 1.2
const ITEM_HEIGHT := 38.0 * 1.2
const MENU_SIZE := Vector2(360.0, 320.0)
const MENU_ORIGIN := MENU_SIZE * 0.5
const OPEN_SECONDS := 0.18
const STAGGER_SECONDS := 0.14
const PICKED_SECONDS := 0.48
const CLOSE_RETENTION_SECONDS := 0.36
const PICKED_RETENTION_SECONDS := 0.70
const CLOSED_X := -113.0 * 1.2
const DARK_TEXT := Color("#e1dfd8")
const MUTED_TEXT := Color("#bdb3a0")

class EmptySlot extends Control:
	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), Color(34.0 / 255.0, 36.0 / 255.0, 32.0 / 255.0, 0.92))
		var border := Color("#5d5b54")
		var dash := 4.0
		var stride := 8.0
		var x := 0.0
		while x < size.x:
			draw_line(Vector2(x, 0), Vector2(minf(x + dash, size.x), 0), border, 1.0)
			draw_line(Vector2(x, size.y), Vector2(minf(x + dash, size.x), size.y), border, 1.0)
			x += stride
		var y := 0.0
		while y < size.y:
			draw_line(Vector2(0, y), Vector2(0, minf(y + dash, size.y)), border, 1.0)
			draw_line(Vector2(size.x, y), Vector2(size.x, minf(y + dash, size.y)), border, 1.0)
			y += stride


var _entries: Array[Dictionary] = []
var _active_deck_id := ""
var _picked_deck_id := ""
var _slot_count := 0
var _is_open := false
var _is_closing := false
var _close_timer: Timer
var _active_tweens: Array[Tween] = []
var _pending_configuration: Dictionary = {}
var _has_pending_configuration := false


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	focus_mode = Control.FOCUS_NONE
	clip_contents = false
	custom_minimum_size = MENU_SIZE
	size = MENU_SIZE
	visible = false
	_close_timer = Timer.new()
	_close_timer.name = "SelectorCloseRetention"
	_close_timer.one_shot = true
	_close_timer.timeout.connect(_finish_close)
	add_child(_close_timer)


func configure(owned_decks: Array, max_owned_decks: int, active_deck_id: String,
		active_deck_count: int = -1, active_deck_capacity: int = -1) -> void:
	var next_configuration := {
		"owned_decks": owned_decks.duplicate(true),
		"max_owned_decks": max_owned_decks,
		"active_deck_id": active_deck_id,
		"active_deck_count": active_deck_count,
		"active_deck_capacity": active_deck_capacity,
	}
	if _is_open or _is_closing:
		_pending_configuration = next_configuration
		_has_pending_configuration = true
		return
	_apply_configuration(next_configuration)


func _apply_configuration(configuration: Dictionary) -> void:
	_stop_close_timer()
	_stop_tweens()
	_is_open = false
	_is_closing = false
	_picked_deck_id = ""
	_active_deck_id = str(configuration.get("active_deck_id", ""))
	var owned_decks: Array = configuration.get("owned_decks", [])
	var max_owned_decks := int(configuration.get("max_owned_decks", 0))
	var active_deck_count := int(configuration.get("active_deck_count", -1))
	var active_deck_capacity := int(configuration.get("active_deck_capacity", -1))
	_slot_count = maxi(max_owned_decks, owned_decks.size())
	_clear_entries()
	for index in range(_slot_count):
		if index < owned_decks.size():
			var deck: Dictionary = owned_decks[index]
			var deck_id := str(deck.get("id", ""))
			var cards: Array = deck.get("cards", [])
			var count := cards.size()
			var capacity := int(deck.get("capacity", count))
			if deck_id == _active_deck_id:
				if active_deck_count >= 0:
					count = active_deck_count
				if active_deck_capacity >= 0:
					capacity = active_deck_capacity
			_entries.append(_make_deck_entry(deck_id, str(deck.get("name", "덱")), count, capacity,
				index, deck_id == _active_deck_id))
		else:
			_entries.append(_make_empty_entry(index))
	visible = false


func toggle_menu() -> void:
	if _is_open and not _is_closing:
		_begin_close("")
	else:
		_open_menu()


func open_menu() -> void:
	_open_menu()


func close_menu() -> void:
	_begin_close("")


func _open_menu() -> void:
	_stop_close_timer()
	_stop_tweens()
	_apply_pending_configuration()
	_is_open = true
	_is_closing = false
	_picked_deck_id = ""
	visible = true
	for entry in _entries:
		var row := entry["control"] as Control
		row.visible = true
		row.position = _closed_position()
		row.scale = Vector2.ONE * 0.16
		row.rotation = 0.0
		row.modulate = Color(1.0, 1.0, 1.0, 0.0)
		_set_row_input(entry, not bool(entry["empty"]))
		_set_entry_style(entry, bool(entry["selected"]), false)
	if _reduced_motion():
		_set_items_open_pose()
	else:
		_animate_open()


func _begin_close(selected_deck_id: String) -> void:
	if not _is_open or _is_closing:
		return
	_is_closing = true
	_picked_deck_id = selected_deck_id
	_stop_tweens()
	if not selected_deck_id.is_empty():
		for entry in _entries:
			entry["selected"] = str(entry["deck_id"]) == selected_deck_id
			_set_row_input(entry, false)
			_set_entry_style(entry, bool(entry["selected"]), false)
		deck_picked.emit(selected_deck_id)
	else:
		for entry in _entries:
			_set_row_input(entry, false)
	var retention := PICKED_RETENTION_SECONDS if not selected_deck_id.is_empty() else CLOSE_RETENTION_SECONDS
	if is_instance_valid(_close_timer):
		_close_timer.start(retention)
	if _reduced_motion():
		return
	_animate_close(selected_deck_id)


func _on_deck_pressed(deck_id: String) -> void:
	_begin_close(deck_id)


func _finish_close() -> void:
	_stop_tweens()
	visible = false
	_is_open = false
	_is_closing = false
	_picked_deck_id = ""
	closed.emit()
	_apply_pending_configuration()


func _apply_pending_configuration() -> void:
	if not _has_pending_configuration:
		return
	var configuration := _pending_configuration
	_pending_configuration = {}
	_has_pending_configuration = false
	_apply_configuration(configuration)


func _animate_open() -> void:
	for entry in _entries:
		var row := entry["control"] as Control
		var index := int(entry["index"])
		var delay := _stagger_delay(index)
		var middle := MENU_ORIGIN + Vector2(-float(entry["arc_inset"]) * 9.0 * 1.2,
			float(entry["offset"]) * 45.0 * 1.2)
		var open_position: Vector2 = MENU_ORIGIN + entry["open_offset"]
		var angle := deg_to_rad(float(entry["angle"]))
		var tween := create_tween()
		_active_tweens.append(tween)
		tween.tween_interval(delay)
		tween.tween_property(row, "position", middle, OPEN_SECONDS * 0.65).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(row, "modulate:a", 1.0, OPEN_SECONDS * 0.65)
		tween.parallel().tween_property(row, "scale", Vector2.ONE * 1.03, OPEN_SECONDS * 0.65)
		tween.parallel().tween_property(row, "rotation", angle, OPEN_SECONDS * 0.65)
		tween.tween_property(row, "position", open_position, OPEN_SECONDS * 0.35).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(row, "scale", Vector2.ONE, OPEN_SECONDS * 0.35)


func _animate_close(selected_deck_id: String) -> void:
	for entry in _entries:
		var row := entry["control"] as Control
		var reverse_index := _slot_count - 1 - int(entry["index"])
		var delay := _stagger_delay(reverse_index)
		if not selected_deck_id.is_empty() and str(entry["deck_id"]) == selected_deck_id:
			_animate_picked_close(entry, delay)
		else:
			_animate_regular_close(row, delay)


func _animate_regular_close(row: Control, delay: float) -> void:
	var tween := create_tween()
	_active_tweens.append(tween)
	tween.tween_interval(delay)
	tween.tween_property(row, "position", _closed_position(), OPEN_SECONDS).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.parallel().tween_property(row, "modulate:a", 0.0, OPEN_SECONDS)
	tween.parallel().tween_property(row, "scale", Vector2.ONE * 0.16, OPEN_SECONDS)
	tween.parallel().tween_property(row, "rotation", 0.0, OPEN_SECONDS)


func _animate_picked_close(entry: Dictionary, delay: float) -> void:
	var row := entry["control"] as Control
	var style := entry["style"] as StyleBoxFlat
	var tween := create_tween()
	_active_tweens.append(tween)
	tween.tween_interval(delay)
	_set_style_colors(style, Color("#493d2d"), Color("#db8a3d"), Color(219.0 / 255.0, 138.0 / 255.0, 61.0 / 255.0, 0.28), 17)
	var pulse_bg := Color("#5d4930")
	var pulse_border := Color("#f3b56d")
	var pulse_shadow := Color(219.0 / 255.0, 138.0 / 255.0, 61.0 / 255.0, 0.42)
	for _pulse in range(3):
		var to_pulse := tween.tween_property(row, "scale", Vector2.ONE * 1.04, 0.048)
		to_pulse.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
		var pulse_color := tween.parallel().tween_property(style, "bg_color", pulse_bg, 0.048)
		pulse_color.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
		tween.parallel().tween_property(style, "border_color", pulse_border, 0.048)
		tween.parallel().tween_property(style, "shadow_color", pulse_shadow, 0.048)
		var to_normal := tween.tween_property(row, "scale", Vector2.ONE, 0.048)
		to_normal.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
		var normal_color := tween.parallel().tween_property(style, "bg_color", Color("#493d2d"), 0.048)
		normal_color.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
		tween.parallel().tween_property(style, "border_color", Color("#db8a3d"), 0.048)
		tween.parallel().tween_property(style, "shadow_color", Color(219.0 / 255.0, 138.0 / 255.0, 61.0 / 255.0, 0.28), 0.048)
	var selected_phase := 0.048 * 6.0
	var close_sweep_seconds := PICKED_SECONDS - selected_phase - 0.010
	tween.tween_interval(0.010)
	var settle := tween.tween_property(row, "scale", Vector2.ONE * 0.16, close_sweep_seconds)
	settle.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	tween.parallel().tween_property(row, "position", _closed_position(), close_sweep_seconds).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tween.parallel().tween_property(row, "modulate:a", 0.0, close_sweep_seconds)
	tween.parallel().tween_property(row, "rotation", 0.0, close_sweep_seconds)


func _set_items_open_pose() -> void:
	for entry in _entries:
		var row := entry["control"] as Control
		row.position = MENU_ORIGIN + entry["open_offset"]
		row.scale = Vector2.ONE
		row.rotation = deg_to_rad(float(entry["angle"]))
		row.modulate = Color.WHITE


func _make_deck_entry(deck_id: String, deck_name: String, count: int, capacity: int,
		index: int, selected: bool) -> Dictionary:
	var button := Button.new()
	button.name = "DeckSlot_%02d" % index
	button.custom_minimum_size = Vector2(ITEM_WIDTH, ITEM_HEIGHT)
	button.size = button.custom_minimum_size
	button.text = ""
	button.focus_mode = Control.FOCUS_ALL
	button.mouse_filter = Control.MOUSE_FILTER_STOP
	button.pivot_offset = button.size * 0.5
	var style := _make_row_style(selected, false)
	button.set_meta("selector_style", style)
	for state in ["normal", "hover", "pressed", "focus"]:
		button.add_theme_stylebox_override(state, style)
	var content := VBoxContainer.new()
	content.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	content.offset_left = 9.0 * 1.2
	content.offset_top = 4.0 * 1.2
	content.offset_right = -9.0 * 1.2
	content.offset_bottom = -4.0 * 1.2
	content.add_theme_constant_override("separation", 2.0 * 1.2)
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	button.add_child(content)
	var title := Label.new()
	title.name = "DeckName"
	title.text = "덱 「%s」" % deck_name
	title.custom_minimum_size = Vector2(0.0, 13.2)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.clip_text = true
	title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS_FORCE
	title.add_theme_font_override("font", _font_with_weight(700))
	title.add_theme_font_size_override("font_size", 13)
	title.add_theme_color_override("font_color", DARK_TEXT)
	title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(title)
	var capacity_label := Label.new()
	capacity_label.name = "DeckCapacity"
	capacity_label.text = "%d / %d" % [count, capacity]
	capacity_label.custom_minimum_size = Vector2(0.0, 12.0)
	capacity_label.add_theme_font_override("font", _font_with_weight(700))
	capacity_label.add_theme_font_size_override("font_size", 12)
	capacity_label.add_theme_color_override("font_color", MUTED_TEXT)
	capacity_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(capacity_label)
	button.pressed.connect(_on_deck_pressed.bind(deck_id))
	add_child(button)
	var entry := _entry(button, deck_id, index, selected, false, style)
	button.mouse_entered.connect(_on_row_hovered.bind(entry, true))
	button.mouse_exited.connect(_on_row_hovered.bind(entry, false))
	return entry


func _make_empty_entry(index: int) -> Dictionary:
	var slot := EmptySlot.new()
	slot.name = "EmptyDeckSlot_%02d" % index
	slot.custom_minimum_size = Vector2(ITEM_WIDTH, ITEM_HEIGHT)
	slot.size = slot.custom_minimum_size
	slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var label := Label.new()
	label.text = "빈 덱 슬롯"
	label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_override("font", _font_with_weight(700))
	label.add_theme_font_size_override("font_size", 13)
	label.add_theme_color_override("font_color", Color("#a19a8b"))
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	slot.add_child(label)
	add_child(slot)
	return _entry(slot, "", index, false, true, null)


func _entry(row: Control, deck_id: String, index: int, selected: bool, empty: bool,
		style: StyleBoxFlat) -> Dictionary:
	var center := (float(_slot_count) - 1.0) * 0.5
	var offset := float(index) - center
	var arc_inset := absf(offset)
	var angle := clampf(offset * 15.0, -30.0, 30.0)
	var entry := {
		"control": row,
		"deck_id": deck_id,
		"index": index,
		"offset": offset,
		"arc_inset": arc_inset,
		"angle": angle,
		"open_offset": Vector2(-arc_inset * 7.0 * 1.2, offset * 42.0 * 1.2),
		"selected": selected,
		"empty": empty,
		"style": style,
	}
	row.position = _closed_position()
	row.pivot_offset = row.size * 0.5
	row.scale = Vector2.ONE * 0.16
	row.modulate = Color(1.0, 1.0, 1.0, 0.0)
	row.visible = false
	return entry


func _set_entry_style(entry: Dictionary, selected: bool, hovered: bool) -> void:
	if bool(entry["empty"]):
		return
	var row := entry["control"] as Control
	var style := entry["style"] as StyleBoxFlat
	if selected:
		_set_style_colors(style, Color("#493d2d"), Color("#db8a3d"),
			Color(219.0 / 255.0, 138.0 / 255.0, 61.0 / 255.0, 0.28), 0)
	else:
		var background := Color("#3c3d35") if hovered else Color("#30322d")
		_set_style_colors(style, background, Color("#6b5b45"), Color(0.0, 0.0, 0.0, 0.0), 0)
	row.queue_redraw()


func _make_row_style(selected: bool, hovered: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	style.content_margin_left = 10.8
	style.content_margin_top = 4.8
	style.content_margin_right = 10.8
	style.content_margin_bottom = 4.8
	_set_style_colors(style,
		Color("#493d2d") if selected else (Color("#3c3d35") if hovered else Color("#30322d")),
		Color("#db8a3d") if selected else Color("#6b5b45"),
		Color(219.0 / 255.0, 138.0 / 255.0, 61.0 / 255.0, 0.28) if selected else Color(0.0, 0.0, 0.0, 0.0),
		0)
	return style


func _set_style_colors(style: StyleBoxFlat, background: Color, border: Color,
		shadow: Color, shadow_size: int) -> void:
	style.bg_color = background
	style.border_color = border
	style.shadow_color = shadow
	style.shadow_size = shadow_size
	style.shadow_offset = Vector2(0.0, 0.0)


func _font_with_weight(weight: int) -> FontVariation:
	var font := FontVariation.new()
	font.base_font = FONT_FILE
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	font.variation_opentype = {weight_axis: float(weight)}
	return font


func _set_row_input(entry: Dictionary, enabled: bool) -> void:
	var row := entry["control"] as Control
	if bool(entry["empty"]):
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		return
	row.mouse_filter = Control.MOUSE_FILTER_STOP if enabled else Control.MOUSE_FILTER_IGNORE
	row.focus_mode = Control.FOCUS_ALL if enabled else Control.FOCUS_NONE


func _on_row_hovered(entry: Dictionary, hovered: bool) -> void:
	if _is_closing or bool(entry["selected"]):
		return
	_set_entry_style(entry, false, hovered)


func _stagger_delay(index: int) -> float:
	if _slot_count <= 1:
		return 0.0
	return float(index) * STAGGER_SECONDS / float(_slot_count - 1)


func _closed_position() -> Vector2:
	return MENU_ORIGIN + Vector2(CLOSED_X, 0.0)


func _reduced_motion() -> bool:
	return DisplayServer.accessibility_should_reduce_animation()


func _stop_close_timer() -> void:
	if is_instance_valid(_close_timer):
		_close_timer.stop()


func _stop_tweens() -> void:
	for tween in _active_tweens:
		if is_instance_valid(tween):
			tween.kill()
	_active_tweens.clear()


func _clear_entries() -> void:
	for entry in _entries:
		var row: Control = entry["control"]
		if is_instance_valid(row):
			remove_child(row)
			row.queue_free()
	_entries.clear()
