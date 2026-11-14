extends Control
class_name PortDeckVaultModal

const CompactCardView = preload("res://scripts/compact_card_view.gd")
const DeckVaultCardView = preload("res://scripts/deck_vault_card_view.gd")
const EmptySlotView = preload("res://scripts/deck_editor_empty_slot.gd")
const DeckEditionList = preload("res://scripts/deck_edition_list.gd")
const DeckVaultUnlockHold = preload("res://scripts/deck_vault_unlock_hold.gd")
const PretendardVaultFont = preload("res://assets/fonts/PretendardVariable.woff2")

const PANEL_MAX_WIDTH := 1040.0
const VIEWPORT_MARGIN := 24.0
const PANEL_HEIGHT_MARGIN := 44.0
const CARD_GAP := 12.0
const CARD_WIDTH := 82.0
const CARD_HEIGHT := 82.0

signal close_requested
signal unlock_requested


class ChargeOverlay extends Control:
	var progress := 0.0

	func _draw() -> void:
		if progress <= 0.0:
			return
		var outline := StyleBoxFlat.new()
		outline.bg_color = Color.TRANSPARENT
		outline.draw_center = false
		outline.border_color = Color(206.0 / 255.0, 241.0 / 255.0, 1.0, progress)
		outline.set_border_width_all(1)
		outline.set_corner_radius_all(5)
		outline.shadow_color = Color(143.0 / 255.0, 212.0 / 255.0, 243.0 / 255.0, 0.42 * progress)
		outline.shadow_size = roundi(22.0 * progress)
		draw_style_box(outline, Rect2(Vector2(-1.0, -1.0), size + Vector2(2.0, 2.0)))
		var inner := StyleBoxFlat.new()
		inner.bg_color = Color.TRANSPARENT
		inner.draw_center = false
		inner.border_color = Color(143.0 / 255.0, 212.0 / 255.0, 243.0 / 255.0, 0.16 * progress)
		inner.set_border_width_all(1)
		inner.set_corner_radius_all(4)
		draw_style_box(inner, Rect2(Vector2(3.0, 3.0), size - Vector2(6.0, 6.0)))


var _deck: Dictionary = {}
var _keys := 0
var _opened := false
var _tooltip_theme: Theme
var _hover_enter: Callable
var _hover_exit: Callable
var _reduced_motion := false
var _configured := false
var _items: Array = []

var _center: CenterContainer
var _layout_root: Control
var _panel: PanelContainer
var _header: Control
var _cards_scroll: ScrollContainer
var _cards_flow: HFlowContainer
var _footer: Control
var _charge_overlay: ChargeOverlay
var _hold_button: Control
var _shake_offset := Vector2.ZERO
var _shake_angle := 0.0
var _shake_started_msec := 0
var _home_position := Vector2.ZERO


func configure(deck: Dictionary, keys: int, opened: bool, tooltip_theme: Theme,
		hover_enter: Callable, hover_exit: Callable, reduced_motion: bool = false) -> void:
	_deck = deck.duplicate(true)
	_keys = maxi(0, keys)
	_opened = opened
	_tooltip_theme = tooltip_theme
	_hover_enter = hover_enter
	_hover_exit = hover_exit
	_reduced_motion = reduced_motion
	_configured = true
	if is_inside_tree():
		_rebuild()


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	if not _configured:
		return
	_build_modal()
	if not get_viewport().size_changed.is_connected(_on_viewport_size_changed):
		get_viewport().size_changed.connect(_on_viewport_size_changed)
	call_deferred("_reflow")


func _exit_tree() -> void:
	if is_instance_valid(_hold_button):
		_hold_button.call("configure", _keys, true, _reduced_motion)


func _rebuild() -> void:
	for child in get_children():
		remove_child(child)
		child.queue_free()
	_build_modal()
	call_deferred("_reflow")


func _build_modal() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	var modal_theme := Theme.new()
	modal_theme.default_font = _font_with_weight(400)
	modal_theme.default_font_size = 14
	theme = modal_theme
	var backdrop := ColorRect.new()
	backdrop.name = "DeckVaultBackdrop"
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(4.0 / 255.0, 8.0 / 255.0, 7.0 / 255.0, 0.72)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.gui_input.connect(_on_backdrop_gui_input)
	add_child(backdrop)

	_center = CenterContainer.new()
	_center.name = "DeckVaultCenter"
	_center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_center.offset_left = VIEWPORT_MARGIN
	_center.offset_top = VIEWPORT_MARGIN
	_center.offset_right = -VIEWPORT_MARGIN
	_center.offset_bottom = -VIEWPORT_MARGIN
	_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_center)

	_layout_root = Control.new()
	_layout_root.name = "DeckVaultLayoutRoot"
	_layout_root.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_layout_root.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_layout_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_center.add_child(_layout_root)

	_panel = PanelContainer.new()
	_panel.name = "DeckVaultPanel"
	_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_panel.add_theme_stylebox_override("panel", _panel_style())
	_layout_root.add_child(_panel)
	var column := VBoxContainer.new()
	column.name = "DeckVaultColumn"
	column.add_theme_constant_override("separation", 0)
	_panel.add_child(column)

	_header = _build_header()
	column.add_child(_header)
	_cards_scroll = _build_card_scroll()
	column.add_child(_cards_scroll)
	_footer = _build_footer()
	column.add_child(_footer)

	_charge_overlay = ChargeOverlay.new()
	_charge_overlay.name = "DeckVaultChargeOverlay"
	_charge_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_charge_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_charge_overlay.z_index = 20
	_panel.add_child(_charge_overlay)

	_hold_button = DeckVaultUnlockHold.new()
	_hold_button.name = "DeckVaultUnlockHold"
	_hold_button.call("configure", _keys, _opened, _reduced_motion)
	_hold_button.connect("hold_progress_changed", Callable(self, "_on_hold_progress_changed"))
	_hold_button.connect("unlock_phase_changed", Callable(self, "_on_unlock_phase_changed"))
	_hold_button.connect("shake_changed", Callable(self, "_on_shake_changed"))
	_hold_button.connect("unlock_requested", Callable(self, "_on_unlock_requested"))
	_footer.get_node("FooterRow").add_child(_hold_button)


func _build_header() -> Control:
	var margin := MarginContainer.new()
	margin.name = "HeaderMargin"
	margin.add_theme_constant_override("margin_left", _header_footer_padding())
	margin.add_theme_constant_override("margin_top", _header_footer_padding())
	margin.add_theme_constant_override("margin_right", _header_footer_padding())
	margin.add_theme_constant_override("margin_bottom", _header_footer_padding())
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	margin.add_child(row)
	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info.add_theme_constant_override("separation", 0)
	var title := Label.new()
	title.name = "DeckVaultTitle"
	title.text = "덱 「%s」" % str(_deck.get("name", "덱 금고"))
	title.add_theme_font_size_override("font_size", 20)
	title.add_theme_color_override("font_color", Color("#f0eee7"))
	var title_font := _font_with_weight(700)
	title.add_theme_font_override("font", title_font)
	info.add_child(title)
	var editions: Array = _deck.get("editions", [])
	if not editions.is_empty():
		var edition_font := _font_with_weight(500)
		var edition_list := DeckEditionList.build(editions, _deck.get("edition_colors", {}), edition_font, 15,
			Color("#d7caa8"), 4)
		edition_list.name = "DeckVaultEditions"
		info.add_child(edition_list)
	var summary_margin := MarginContainer.new()
	summary_margin.add_theme_constant_override("margin_top", 8)
	var summary := Label.new()
	summary.name = "DeckVaultCardCount"
	var cards: Array = _deck.get("cards", [])
	summary.text = "%d / %d장" % [cards.size(), int(_deck.get("capacity", 0))]
	summary.add_theme_font_size_override("font_size", 14)
	summary.add_theme_color_override("font_color", Color("#f0eee7"))
	summary_margin.add_child(summary)
	info.add_child(summary_margin)
	row.add_child(info)
	var exit_button := _action_button("나가기")
	exit_button.name = "DeckVaultClose"
	exit_button.pressed.connect(_on_close_pressed)
	row.add_child(exit_button)
	return margin


func _build_card_scroll() -> ScrollContainer:
	var scroll := ScrollContainer.new()
	scroll.name = "DeckVaultCardScroll"
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.add_theme_stylebox_override("panel", _divider_style())
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", _card_padding())
	margin.add_theme_constant_override("margin_top", _card_padding())
	margin.add_theme_constant_override("margin_right", _card_padding())
	margin.add_theme_constant_override("margin_bottom", _card_padding())
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_cards_flow = HFlowContainer.new()
	_cards_flow.name = "DeckVaultCards"
	_cards_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_cards_flow.add_theme_constant_override("h_separation", CARD_GAP)
	_cards_flow.add_theme_constant_override("v_separation", CARD_GAP)
	margin.add_child(_cards_flow)
	scroll.add_child(margin)
	_items = DeckVaultCardView.create(_deck).get("items", [])
	for item_value in _items:
		var item: Dictionary = item_value
		var kind := str(item.get("kind", ""))
		if kind == "card":
			var group: Dictionary = item["group"]
			var card: Dictionary = group["card"]
			var count := int(group.get("card_ids", []).size())
			var compact: Control = CompactCardView.create(card, count, _hover_enter, _hover_exit,
				Callable(), _tooltip_theme, true)
			compact.name = "VaultCompactCard_%s" % str(card.get("id", group.get("source_index", 0)))
			var item_width := float(item.get("width", CARD_WIDTH))
			var stack_margin := MarginContainer.new()
			stack_margin.name = "VaultCardStackMargin"
			stack_margin.custom_minimum_size.y = CARD_HEIGHT
			stack_margin.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			stack_margin.add_theme_constant_override("margin_left", maxi(0, roundi(item_width - CARD_WIDTH)))
			stack_margin.add_child(compact)
			_cards_flow.add_child(stack_margin)
		else:
			var empty_slot: Control = EmptySlotView.new()
			var slot_kind := "divider" if kind == "divider" else "rare" if kind == "rare-slot" else "normal"
			empty_slot.call("configure", slot_kind)
			_cards_flow.add_child(empty_slot)
	return scroll


func _build_footer() -> Control:
	var margin := MarginContainer.new()
	margin.name = "FooterMargin"
	margin.add_theme_constant_override("margin_left", _header_footer_padding())
	margin.add_theme_constant_override("margin_top", _header_footer_padding())
	margin.add_theme_constant_override("margin_right", _header_footer_padding())
	margin.add_theme_constant_override("margin_bottom", _header_footer_padding())
	var row := HBoxContainer.new()
	row.name = "FooterRow"
	row.add_theme_constant_override("separation", 16)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	margin.add_child(row)
	var key_count := Label.new()
	key_count.name = "DeckVaultKeyCount"
	key_count.text = "보유 열쇠 %d개" % _keys
	key_count.add_theme_font_size_override("font_size", 18)
	key_count.add_theme_font_override("font", _font_with_weight(700))
	key_count.add_theme_color_override("font_color", Color("#8fd4f3"))
	key_count.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(key_count)
	return margin


func _action_button(text: String) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size.y = 40.0
	button.add_theme_font_override("font", _font_with_weight(600))
	button.add_theme_font_size_override("font_size", 14)
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#484941")
	style.border_color = Color("#928b7a")
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.content_margin_left = 16
	style.content_margin_right = 16
	style.content_margin_top = 9
	style.content_margin_bottom = 9
	button.add_theme_stylebox_override("normal", style)
	button.add_theme_stylebox_override("hover", style.duplicate())
	button.add_theme_stylebox_override("pressed", style.duplicate())
	return button


func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#0c0d0c", 0.96)
	style.border_color = Color("#db8a3d")
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	style.content_margin_left = 0
	style.content_margin_top = 0
	style.content_margin_right = 0
	style.content_margin_bottom = 0
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.6)
	style.shadow_size = 12
	return style


func _divider_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color.TRANSPARENT
	style.border_color = Color("#4c4538")
	style.border_width_top = 1
	style.border_width_bottom = 1
	style.content_margin_left = 0
	style.content_margin_top = 0
	style.content_margin_right = 0
	style.content_margin_bottom = 0
	return style


func _header_footer_padding() -> int:
	return 12 if get_viewport_rect().size.x <= 760.0 else 18


func _card_padding() -> int:
	return 12 if get_viewport_rect().size.x <= 760.0 else 18


func _font_with_weight(weight: int) -> FontVariation:
	var variation := FontVariation.new()
	variation.base_font = PretendardVaultFont
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	variation.variation_opentype = {weight_axis: float(weight)}
	return variation


func _reflow() -> void:
	if not is_instance_valid(_center) or not is_instance_valid(_layout_root):
		return
	var viewport := get_viewport_rect().size
	var available_width := maxf(0.0, viewport.x - VIEWPORT_MARGIN * 2.0)
	var available_height := maxf(0.0, viewport.y - PANEL_HEIGHT_MARGIN)
	var panel_width := minf(PANEL_MAX_WIDTH, available_width)
	var natural_cards_height := _natural_card_area_height(panel_width)
	var header_height := _header.get_combined_minimum_size().y
	var footer_height := _footer.get_combined_minimum_size().y
	var card_area_height := minf(natural_cards_height, maxf(0.0, available_height - header_height - footer_height - 2.0))
	var panel_height := minf(available_height, header_height + footer_height + card_area_height + 2.0)
	_cards_scroll.custom_minimum_size = Vector2(0.0, card_area_height)
	_layout_root.custom_minimum_size = Vector2(panel_width, panel_height)
	_layout_root.size = _layout_root.custom_minimum_size
	call_deferred("_capture_home_position")


func _natural_card_area_height(panel_width: float) -> float:
	if _items.is_empty():
		return 38.0
	var flow_width := maxf(CARD_WIDTH, panel_width - 38.0)
	var used_width := 0.0
	var row_count := 1
	for item_value in _items:
		var item: Dictionary = item_value
		var item_width := float(item.get("width", CARD_WIDTH))
		if used_width > 0.0 and used_width + CARD_GAP + item_width > flow_width:
			row_count += 1
			used_width = item_width
		else:
			used_width = item_width if used_width == 0.0 else used_width + CARD_GAP + item_width
	return 38.0 + row_count * CARD_HEIGHT + maxi(0, row_count - 1) * CARD_GAP


func _capture_home_position() -> void:
	if is_instance_valid(_center) and is_instance_valid(_layout_root):
		_home_position = (_center.size - _layout_root.size) * 0.5
		_layout_root.position = _home_position


func _on_viewport_size_changed() -> void:
	_on_shake_changed(Vector2.ZERO, 0.0)
	_reflow()


func _on_backdrop_gui_input(event: InputEvent) -> void:
	var click := event as InputEventMouseButton
	if click != null and click.pressed and click.button_index == MOUSE_BUTTON_LEFT:
		get_viewport().set_input_as_handled()
		close_requested.emit()


func _on_close_pressed() -> void:
	close_requested.emit()


func _on_hold_progress_changed(progress: float) -> void:
	if is_instance_valid(_charge_overlay):
		_charge_overlay.progress = clampf(progress, 0.0, 1.0)
		_charge_overlay.queue_redraw()


func _on_unlock_phase_changed(phase: String) -> void:
	if is_instance_valid(_panel):
		_panel.set_meta("unlock_phase", phase)


func _on_shake_changed(offset: Vector2, angle_degrees: float) -> void:
	_shake_offset = offset
	_shake_angle = angle_degrees
	if _shake_offset.is_zero_approx() and is_zero_approx(_shake_angle):
		set_process(false)
		if is_instance_valid(_layout_root):
			_layout_root.position = _home_position
			_layout_root.rotation_degrees = 0.0
		return
	if _reduced_motion:
		return
	if not is_processing():
		_shake_started_msec = Time.get_ticks_msec()
	set_process(true)


func _process(_delta: float) -> void:
	if _reduced_motion or not is_instance_valid(_layout_root):
		set_process(false)
		return
	var cycle := fposmod(float(Time.get_ticks_msec() - _shake_started_msec), 75.0) / 75.0
	var frame := cycle * 4.0
	var keyframe := mini(3, floori(frame))
	var amount := frame - float(keyframe)
	var offsets := [Vector2.ZERO, Vector2(_shake_offset.x, -_shake_offset.y),
		Vector2(-_shake_offset.x, _shake_offset.y), Vector2(_shake_offset.y, _shake_offset.x), Vector2.ZERO]
	var angles: Array[float] = [0.0, _shake_angle, -_shake_angle, _shake_angle, 0.0]
	_layout_root.position = _home_position + offsets[keyframe].lerp(offsets[keyframe + 1], amount)
	_layout_root.rotation_degrees = lerpf(angles[keyframe], angles[keyframe + 1], amount)


func _on_unlock_requested() -> void:
	unlock_requested.emit()
