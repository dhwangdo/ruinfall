extends Control
class_name PortMapDeckVaultPreview

const CompactCardView = preload("res://scripts/compact_card_view.gd")
const DeckVaultCardView = preload("res://scripts/deck_vault_card_view.gd")
const EmptySlotView = preload("res://scripts/deck_editor_empty_slot.gd")
const DeckEditionList = preload("res://scripts/deck_edition_list.gd")
const DECK_VAULT_KEY_COST := 3
const PREVIEW_MAX_WIDTH := 820.0
const VIEWPORT_MARGIN := 12.0
const ANCHOR_GAP := 11.0

signal card_hover_requested(source: Control, card: Dictionary)
signal card_hover_clear_requested
signal preview_pointer_entered
signal preview_pointer_exited

var _panel: PanelContainer
var _anchor_global_rect := Rect2()
var _keys := 0
var _layout_generation := 0
var _has_hovered_card := false


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	hide()


func configure(deck: Dictionary, anchor_global_rect: Rect2, keys: int) -> void:
	_layout_generation += 1
	_keys = keys
	_anchor_global_rect = anchor_global_rect
	_clear_card_hover()
	if is_instance_valid(_panel):
		_panel.queue_free()
	_panel = _build_panel(deck)
	add_child(_panel)
	show()
	call_deferred("_layout_panel", _layout_generation)


func clear() -> void:
	_layout_generation += 1
	_clear_card_hover()
	if is_instance_valid(_panel):
		_panel.queue_free()
	_panel = null
	hide()


func _build_panel(deck: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = "MapDeckVaultPreviewPanel"
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.add_theme_stylebox_override("panel", _panel_style())
	panel.mouse_entered.connect(_on_panel_mouse_entered)
	panel.mouse_exited.connect(_on_panel_mouse_exited)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 0)
	panel.add_child(column)
	column.add_child(_build_header(deck))
	column.add_child(_build_card_scroll(deck))
	return panel


func _build_header(deck: Dictionary) -> Control:
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 18)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 0)
	margin.add_child(column)
	var deck_name := str(deck.get("name", "덱 금고"))
	var title := Label.new()
	title.text = "덱 「%s」" % deck_name
	title.add_theme_font_size_override("font_size", 20)
	title.add_theme_color_override("font_color", Color("#f0eee7"))
	column.add_child(title)
	var editions: Array = deck.get("editions", [])
	if not editions.is_empty():
		var edition_list := DeckEditionList.build(editions, deck.get("edition_colors", {}), null, 15,
			Color("#d7caa8"), 4)
		column.add_child(edition_list)
	var cards: Array = deck.get("cards", [])
	var capacity := int(deck.get("capacity", 0))
	var summary := Label.new()
	summary.text = "%d / %d장 · 열쇠 %d개로 개방" % [cards.size(), capacity, DECK_VAULT_KEY_COST]
	summary.add_theme_font_size_override("font_size", 14)
	summary.add_theme_color_override("font_color", Color("#f0eee7"))
	summary.add_theme_constant_override("line_spacing", 1)
	var summary_margin := MarginContainer.new()
	summary_margin.add_theme_constant_override("margin_top", 8)
	summary_margin.add_child(summary)
	column.add_child(summary_margin)
	return margin


func _build_card_scroll(deck: Dictionary) -> ScrollContainer:
	var scroll := ScrollContainer.new()
	scroll.name = "MapDeckVaultCardScroll"
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	scroll.get_v_scroll_bar().value_changed.connect(func(_value: float) -> void: _clear_card_hover())
	scroll.add_theme_stylebox_override("panel", _divider_style())
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 18)
	margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var cards := HFlowContainer.new()
	cards.name = "DeckVaultCards"
	cards.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards.add_theme_constant_override("h_separation", 12)
	cards.add_theme_constant_override("v_separation", 12)
	margin.add_child(cards)
	scroll.add_child(margin)
	var card_view: Dictionary = DeckVaultCardView.create(deck)
	var items: Array = card_view.get("items", [])
	for item_value in items:
		var item: Dictionary = item_value
		var kind := str(item.get("kind", ""))
		if kind == "card":
			var group: Dictionary = item["group"]
			var card: Dictionary = group["card"]
			var count := int(group.get("card_ids", []).size())
			var compact: Control = CompactCardView.create(card, count,
				Callable(self, "_on_compact_card_mouse_entered"),
				Callable(self, "_on_compact_card_mouse_exited"), Callable(), null, true)
			var item_width := float(item.get("width", 82))
			# Reserve room for backs without stretching the 82px front card.
			var stack_margin := MarginContainer.new()
			stack_margin.add_theme_constant_override("margin_left", maxi(0, roundi(item_width - 82.0)))
			stack_margin.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			stack_margin.add_child(compact)
			cards.add_child(stack_margin)
		else:
			var empty_slot: Control = EmptySlotView.new()
			var slot_kind := "divider" if kind == "divider" else "rare" if kind == "rare-slot" else "normal"
			empty_slot.call("configure", slot_kind)
			cards.add_child(empty_slot)
	return scroll


func _layout_panel(generation: int) -> void:
	if not _layout_is_current(generation):
		return
	var layout_tree := get_tree()
	await layout_tree.process_frame
	if not _layout_is_current(generation):
		return
	var viewport := get_viewport_rect()
	var left_space := maxf(0.0, _anchor_global_rect.position.x - ANCHOR_GAP)
	var right_space := maxf(0.0, viewport.end.x - _anchor_global_rect.end.x - ANCHOR_GAP)
	var side := ""
	var width := 0.0
	var max_height := maxf(0.0, viewport.size.y - VIEWPORT_MARGIN * 2.0)
	if maxf(left_space, right_space) >= 240.0:
		side = "right" if right_space >= PREVIEW_MAX_WIDTH or right_space >= left_space else "left"
		width = minf(PREVIEW_MAX_WIDTH, right_space if side == "right" else left_space)
	else:
		var above_space := maxf(0.0, _anchor_global_rect.position.y - ANCHOR_GAP)
		var below_space := maxf(0.0, viewport.end.y - _anchor_global_rect.end.y - ANCHOR_GAP)
		side = "below" if below_space >= above_space else "above"
		width = minf(PREVIEW_MAX_WIDTH, viewport.size.x - VIEWPORT_MARGIN * 2.0)
		max_height = below_space if side == "below" else above_space
	_panel.custom_minimum_size.x = width
	_panel.size.x = width
	_panel.size.y = max_height
	await layout_tree.process_frame
	if not _layout_is_current(generation):
		return
	var column: Control = _panel.get_child(0)
	var header: Control = column.get_child(0)
	var scroll: ScrollContainer = column.get_child(1)
	var card_margin: Control = scroll.get_child(0)
	var desired_height := header.get_combined_minimum_size().y + card_margin.get_combined_minimum_size().y \
		+ _panel.get_theme_stylebox("panel").get_minimum_size().y + scroll.get_theme_stylebox("panel").get_minimum_size().y
	var panel_height := minf(desired_height, max_height)
	if panel_height <= 1.0:
		panel_height = max_height
	_panel.size = Vector2(width, panel_height)
	var preferred_x := _anchor_global_rect.end.x - 1.0 if side == "right" else _anchor_global_rect.position.x - width + 1.0 if side == "left" else _anchor_global_rect.position.x
	var preferred_y := _anchor_global_rect.end.y - 1.0 if side == "below" else _anchor_global_rect.position.y - panel_height + 1.0 if side == "above" else _anchor_global_rect.position.y
	var target_global := Vector2(
		clampf(preferred_x, VIEWPORT_MARGIN, viewport.end.x - width - VIEWPORT_MARGIN),
		clampf(preferred_y, VIEWPORT_MARGIN, viewport.end.y - panel_height - VIEWPORT_MARGIN),
	)
	_panel.position = get_global_transform_with_canvas().affine_inverse() * target_global
	_panel.size = Vector2(width, panel_height)


func _layout_is_current(generation: int) -> bool:
	return is_inside_tree() and not is_queued_for_deletion() and generation == _layout_generation \
		and is_instance_valid(_panel) and _panel.is_inside_tree() and not _panel.is_queued_for_deletion()


func _on_compact_card_mouse_entered(source: Control, card: Dictionary) -> void:
	_has_hovered_card = true
	card_hover_requested.emit(source, card)


func contains_global_point(point: Vector2) -> bool:
	return visible and is_instance_valid(_panel) and _panel.get_global_rect().has_point(point)


func _on_compact_card_mouse_exited() -> void:
	_clear_card_hover()


func _clear_card_hover() -> void:
	if not _has_hovered_card:
		return
	_has_hovered_card = false
	card_hover_clear_requested.emit()


func _on_panel_mouse_entered() -> void:
	preview_pointer_entered.emit()


func _on_panel_mouse_exited() -> void:
	preview_pointer_exited.emit()


func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#0c0d0c", 0.96)
	style.border_color = Color("#db8a3d")
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	style.shadow_color = Color(0.0, 0.0, 0.0, 0.6)
	style.shadow_size = 12
	return style


func _divider_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color.TRANSPARENT
	style.border_color = Color("#4c4538")
	style.border_width_top = 1
	return style
