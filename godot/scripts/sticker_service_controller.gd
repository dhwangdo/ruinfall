class_name PortStickerServiceController
extends RefCounted

const CardStickers = preload("res://scripts/stickers.gd")
const DeckEditorRules = preload("res://scripts/deck_editor_rules.gd")
const StickerServices = preload("res://scripts/sticker_services.gd")
const StickerArtScript = preload("res://scripts/sticker_art.gd")
const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")
const CompactCardView = preload("res://scripts/compact_card_view.gd")
const StickerServiceSlotDropTarget = preload("res://scripts/sticker_service_slot_drop_target.gd")
const ResultArrowScript = preload("res://scripts/result_arrow.gd")
const ServiceCardRemovalDropAreaScript = preload("res://scripts/service_card_removal_drop_area.gd")
const STICKER_SERVICE_FONT: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")

var active_service_kind := ""
var active_service_position := Vector2i.ZERO
var service_selected_card_ids: Array[int] = []
var service_transmuter_preview: Dictionary = {}
var service_preview_elapsed := 0.0
var service_preview_host: Container
var service_apply_button: Button
var sticker_service_overlay: Control
var service_feedback := ""


func on_view_cleared() -> void:
	sticker_service_overlay = null
	service_preview_host = null
	service_apply_button = null


func open(host: Node, kind: String, position: Vector2i) -> void:
	active_service_kind = kind
	active_service_position = position
	service_selected_card_ids.clear()
	service_transmuter_preview = {}
	service_preview_elapsed = 0.0
	service_feedback = ""
	show(host)


func tick(host: Node, delta: float) -> void:
	if host.screen_name != "stickerService" or active_service_kind != "cardTransmuter" \
			or service_selected_card_ids.size() != 1 or host.get_viewport().gui_is_dragging() \
			or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) \
			or Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT):
		return
	service_preview_elapsed += delta
	if service_preview_elapsed < 0.1:
		return
	service_preview_elapsed = 0.0
	var source := _run_card_by_id(host.run_state, service_selected_card_ids[0])
	if source.is_empty():
		return
	var random := RandomNumberGenerator.new()
	random.randomize()
	service_transmuter_preview = StickerServices.create_transmuter_preview(source, random, service_transmuter_preview)
	_render_preview(host)


func show(host: Node) -> void:
	host._clear_map_vault_preview()
	host.screen_name = "stickerService"
	service_preview_host = null
	service_apply_button = null
	var fixed_sticker := StickerServices.tinkerer_sticker_at(active_service_position, int(host.run_state.get("map_seed", 0))) if active_service_kind == "tinkerer" else ""
	var uses := _service_uses(host.run_state)
	var price := StickerServices.service_price(active_service_kind, uses, fixed_sticker)
	var viewport_size: Vector2 = host.get_viewport_rect().size
	var modal_width := 1540.0 if active_service_kind == "stickerAltar" else 1040.0
	var modal := _create_overlay(host, modal_width, viewport_size.y * 0.9)
	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 9)
	page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	page.size_flags_vertical = Control.SIZE_EXPAND_FILL
	modal.add_child(page)
	var heading := HBoxContainer.new()
	heading.add_theme_constant_override("separation", 12)
	heading.add_child(_service_label(host, host._room_name(active_service_kind), 30, host.COLOR_TEXT, 800))
	var header_spacer := Control.new()
	header_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_child(header_spacer)
	heading.add_child(_service_label(host, "$%d 보유" % int(host.run_state.get("gold", 0)), 20, host.COLOR_GOLD, 700))
	var close_button: Button = host._button("나가기", Callable(host, "_show_map"), Vector2(92, 40))
	_style_service_button(close_button, 14, 600)
	heading.add_child(close_button)
	page.add_child(heading)
	page.add_child(HSeparator.new())
	var instruction := HBoxContainer.new()
	instruction.add_theme_constant_override("separation", 4)
	if active_service_kind == "tinkerer":
		instruction.add_child(_service_label(host, "$를 소모하여 카드 한 장에", 15, host.COLOR_TEXT))
		instruction.add_child(_sticker_icon(host, fixed_sticker, 28))
		instruction.add_child(_service_label(host, "를 부여합니다.", 15, host.COLOR_TEXT))
	elif active_service_kind == "stickerAltar":
		instruction.add_child(_service_label(host, "$를 소모하여 제물 카드의 스티커를 대상 카드에 붙입니다.", 15, host.COLOR_TEXT))
	else:
		instruction.add_child(_service_label(host, "$를 소모하여 같은 희귀도의 다른 카드로 변환합니다.", 15, host.COLOR_TEXT))
	page.add_child(instruction)
	var content := HBoxContainer.new()
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 18)
	page.add_child(content)
	var list_scroll := ScrollContainer.new()
	list_scroll.set_script(ServiceCardRemovalDropAreaScript)
	list_scroll.connect("service_card_removed", Callable(self, "_on_card_removed").bind(host))
	list_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	list_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	list_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	content.add_child(list_scroll)
	var groups := VBoxContainer.new()
	groups.add_theme_constant_override("separation", 14)
	groups.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list_scroll.add_child(groups)
	var card_group_count := _add_card_group(host, groups, "인벤토리", host.run_state.get("inventory_cards", []))
	var active_deck_id := str(host.run_state.get("active_deck_id", "starter"))
	for deck in host.run_state.get("owned_decks", []):
		var deck_id := str(deck.get("id", ""))
		var deck_cards: Array = host.run_state.get("deck", []) if deck_id == active_deck_id else deck.get("cards", [])
		card_group_count += _add_card_group(host, groups, "덱 「%s」%s" % [
			str(deck.get("name", "덱")), " · 사용 중" if deck_id == active_deck_id else ""], deck_cards)
	if card_group_count == 0:
		groups.add_child(_service_label(host, "선택할 카드가 없습니다.", 15, host.COLOR_MUTED))
	var details := VBoxContainer.new()
	var operation_width := 660.0 if active_service_kind == "stickerAltar" else 430.0 if active_service_kind == "cardTransmuter" else 340.0
	details.custom_minimum_size = Vector2(operation_width, 0)
	details.add_theme_constant_override("separation", 12)
	content.add_child(details)
	service_preview_host = VBoxContainer.new()
	service_preview_host.add_theme_constant_override("separation", 8)
	details.add_child(service_preview_host)
	_render_preview(host)
	if not service_feedback.is_empty():
		details.add_child(_service_label(host, service_feedback, 14, host.COLOR_RED))
	service_apply_button = host._button("$%d" % price, Callable(self, "_apply").bind(host), Vector2(210, 48))
	_style_service_button(service_apply_button, 17, 800)
	service_apply_button.disabled = not _selection_is_complete() or int(host.run_state.get("gold", 0)) < price
	details.add_child(service_apply_button)


func _render_preview(host: Node) -> void:
	if not is_instance_valid(service_preview_host):
		return
	for child in service_preview_host.get_children():
		service_preview_host.remove_child(child)
		child.queue_free()
	if active_service_kind == "stickerAltar":
		_render_altar_preview(host)
		return
	if service_selected_card_ids.is_empty():
		var slot := _service_slot(host, "", 0)
		slot.card_dropped.connect(Callable(self, "_on_slot_card_dropped").bind(host))
		service_preview_host.add_child(slot)
		return
	var source_id := int(service_selected_card_ids[0])
	var source := _run_card_by_id(host.run_state, source_id) if source_id >= 0 else {}
	if source.is_empty():
		return
	var after: Dictionary = {}
	var fixed_sticker := ""
	if active_service_kind == "tinkerer":
		var ids := CardStickers.card_sticker_ids(source)
		fixed_sticker = StickerServices.tinkerer_sticker_at(active_service_position, int(host.run_state.get("map_seed", 0)))
		ids.append(fixed_sticker)
		after = CardStickers.with_card_stickers(source, ids)
	else:
		after = service_transmuter_preview
	if after.is_empty():
		service_preview_host.add_child(_service_label(host, "표시할 변환 카드가 없습니다.", 14, host.COLOR_MUTED))
		return
	var preview_card: Control = _selection_card_widget(host, after) if active_service_kind == "tinkerer" \
		else host._card_widget(after, false, false, false)
	if active_service_kind == "cardTransmuter":
		preview_card.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var pair := HBoxContainer.new()
		pair.add_theme_constant_override("separation", 12)
		pair.alignment = BoxContainer.ALIGNMENT_CENTER
		var source_preview := _selection_card_widget(host, source)
		pair.add_child(source_preview)
		var arrow := ResultArrowScript.new()
		arrow.custom_minimum_size = Vector2(56, 28)
		arrow.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
		arrow.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		arrow.arrow_color = Color("#ffc400")
		pair.add_child(arrow)
		pair.add_child(preview_card)
		service_preview_host.add_child(pair)
	else:
		service_preview_host.add_child(preview_card)
		_blink_sticker_preview(host, preview_card, fixed_sticker)


func _render_altar_preview(host: Node) -> void:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 20)
	var both_cards_present := service_selected_card_ids.size() >= 2 \
		and not _run_card_by_id(host.run_state, int(service_selected_card_ids[0])).is_empty() \
		and not _run_card_by_id(host.run_state, int(service_selected_card_ids[1])).is_empty()
	for slot_index in range(3):
		if slot_index == 1:
			var plus: Label = host._label("+", 24, Color("#ffc400"))
			plus.custom_minimum_size = Vector2(40, 40)
			plus.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			plus.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			plus.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			plus.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			row.add_child(plus)
		elif slot_index == 2:
			var arrow := ResultArrowScript.new()
			arrow.custom_minimum_size = Vector2(76, 38)
			arrow.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			arrow.size_flags_vertical = Control.SIZE_SHRINK_CENTER
			arrow.arrow_color = Color("#ffc400")
			row.add_child(arrow)
		var slot_column := CenterContainer.new()
		if slot_index < 2:
			var selected_card_id := int(service_selected_card_ids[slot_index]) if slot_index < service_selected_card_ids.size() else -1
			var selected_card := _run_card_by_id(host.run_state, selected_card_id) if selected_card_id >= 0 else {}
			if not selected_card.is_empty():
				var selected_preview := _selection_card_widget(host, selected_card)
				if slot_index == 0 and both_cards_present:
					slot_column.add_child(_altar_sacrifice_preview(selected_preview))
				else:
					slot_column.add_child(selected_preview)
			else:
				var slot := _service_slot(host, "", slot_index)
				slot.card_dropped.connect(Callable(self, "_on_slot_card_dropped").bind(host))
				slot_column.add_child(slot)
		else:
			var offering_id := int(service_selected_card_ids[0]) if service_selected_card_ids.size() > 0 else -1
			var target_id := int(service_selected_card_ids[1]) if service_selected_card_ids.size() > 1 else -1
			var offering := _run_card_by_id(host.run_state, offering_id) if offering_id >= 0 else {}
			var target := _run_card_by_id(host.run_state, target_id) if target_id >= 0 else {}
			var result_card: Dictionary = {}
			var offering_stickers: Array[String] = []
			if not offering.is_empty():
				offering_stickers = CardStickers.card_sticker_ids(offering)
			if not target.is_empty() and offering_stickers.size() == 1:
				var result_stickers := CardStickers.card_sticker_ids(target)
				if not result_stickers.has(offering_stickers[0]):
					result_stickers.append(offering_stickers[0])
					result_card = CardStickers.with_card_stickers(target, result_stickers)
			if result_card.is_empty():
				slot_column.add_child(_result_placeholder(host))
			else:
				var result_preview: Control = host._card_widget(result_card, false, false, false)
				result_preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
				slot_column.add_child(result_preview)
				_blink_sticker_preview(host, result_preview, str(offering_stickers[0]))
		row.add_child(slot_column)
	service_preview_host.add_child(row)


func _altar_sacrifice_preview(card_preview: Control) -> Control:
	var wrapper := Control.new()
	wrapper.name = "AltarOfferingPreview"
	wrapper.custom_minimum_size = card_preview.custom_minimum_size
	wrapper.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var filter := CanvasGroup.new()
	filter.name = "AltarSacrificeFilter"
	var grayscale := ShaderMaterial.new()
	grayscale.shader = preload("res://shaders/pending_removal_filter.gdshader")
	grayscale.set_shader_parameter("saturation", 0.0)
	filter.material = grayscale
	wrapper.add_child(filter)
	filter.add_child(card_preview)
	card_preview.size = card_preview.custom_minimum_size
	return wrapper


func _blink_sticker_preview(host: Node, card_preview: Control, sticker_id: String) -> void:
	var sticker_icon := _find_sticker_icon(card_preview, sticker_id)
	if sticker_icon == null:
		return
	sticker_icon.modulate.a = 0.45
	var preview_flash: Tween = host.create_tween().bind_node(card_preview).set_loops()
	preview_flash.set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	preview_flash.tween_property(sticker_icon, "modulate:a", 1.0, 0.425)
	preview_flash.tween_property(sticker_icon, "modulate:a", 0.45, 0.425)


func _find_sticker_icon(node: Node, sticker_id: String) -> Control:
	if node is Control and str(node.get_meta("card_sticker_id", "")) == sticker_id:
		return node as Control
	for child in node.get_children():
		var icon := _find_sticker_icon(child, sticker_id)
		if icon != null:
			return icon
	return null


func _selection_card_widget(host: Node, card: Dictionary) -> Control:
	var widget: Control = host._card_widget(card, false)
	host._set_child_controls_mouse_ignored(widget)
	widget.mouse_filter = Control.MOUSE_FILTER_STOP
	widget.set("drag_payload", {
		"kind": "service-card",
		"action": "remove",
		"card_id": int(card.get("id", -1)),
		"card_name": str(card.get("name", "카드")),
	})
	widget.gui_input.connect(Callable(self, "_on_selection_card_gui_input").bind(host, int(card.get("id", -1))))
	return widget


func _add_card_group(host: Node, parent: VBoxContainer, title: String, cards: Array) -> int:
	if cards.is_empty():
		return 0
	parent.add_child(_service_label(host, "%s · %d장" % [title, cards.size()], 18, host.COLOR_TEXT, 700))
	var card_flow := HFlowContainer.new()
	card_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card_flow.add_theme_constant_override("h_separation", 8)
	card_flow.add_theme_constant_override("v_separation", 8)
	parent.add_child(card_flow)
	for card_value in cards:
		var card: Dictionary = card_value
		var card_slot := Control.new()
		card_slot.custom_minimum_size = CompactCardView.CARD_SIZE
		card_slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		var card_panel := CompactCardView.create(card, 1,
			Callable(host, "_show_card_hover_preview"), Callable(host, "_hide_card_hover_preview"),
			Callable(host, "_hide_card_hover_preview"), host.blue_tooltip_theme, true)
		card_panel.pivot_offset = Vector2.ZERO
		card_panel.set("drag_payload", {
			"kind": "service-card",
			"action": "remove" if service_selected_card_ids.has(int(card.get("id", -1))) else "select",
			"card_id": int(card.get("id", -1)),
			"card_name": str(card.get("name", "카드")),
		})
		card_panel.set("accepts_service_removal", true)
		card_panel.connect("service_card_removed", Callable(self, "_on_card_removed").bind(host))
		card_panel.gui_input.connect(Callable(self, "_on_collection_card_gui_input").bind(host, int(card.get("id", -1)), card_panel))
		if service_selected_card_ids.has(int(card.get("id", -1))):
			var selected_style := card_panel.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
			selected_style.border_color = host.COLOR_ORANGE
			selected_style.set_border_width_all(3)
			card_panel.add_theme_stylebox_override("panel", selected_style)
		host._set_child_controls_mouse_ignored(card_panel)
		card_panel.mouse_filter = Control.MOUSE_FILTER_STOP
		card_slot.add_child(card_panel)
		card_flow.add_child(card_slot)
	return cards.size()


func _on_collection_card_gui_input(event: InputEvent, host: Node, card_id: int, widget: Control) -> void:
	var mouse_event := event as InputEventMouseButton
	if mouse_event == null:
		return
	if mouse_event.button_index == MOUSE_BUTTON_RIGHT and not mouse_event.pressed:
		_remove_selection(host, card_id)
		host.get_viewport().set_input_as_handled()
	elif mouse_event.button_index == MOUSE_BUTTON_LEFT:
		if mouse_event.pressed:
			widget.set_meta("service_press_position", host.get_global_mouse_position())
		elif widget.has_meta("service_press_position"):
			var press_position: Vector2 = widget.get_meta("service_press_position")
			widget.remove_meta("service_press_position")
			if press_position.distance_to(host.get_global_mouse_position()) < 6.0:
				if service_selected_card_ids.has(card_id):
					_remove_selection(host, card_id)
				else:
					_add_selection(host, card_id)
				host.get_viewport().set_input_as_handled()


func _add_selection(host: Node, card_id: int, requested_slot := -1) -> void:
	if card_id < 0 or _run_card_by_id(host.run_state, card_id).is_empty():
		return
	if service_selected_card_ids.has(card_id):
		return
	var limit := 2 if active_service_kind == "stickerAltar" else 1
	var slot_index := requested_slot
	if slot_index < 0:
		if active_service_kind == "stickerAltar":
			slot_index = 0 if CardStickers.card_sticker_ids(_run_card_by_id(host.run_state, card_id)).size() == 1 else 1
		else:
			slot_index = 0
	if slot_index < 0 or slot_index >= limit:
		service_feedback = "제단에는 카드 두 장만 놓을 수 있습니다."
		show(host)
		return
	if not _can_card_fill_slot(host.run_state, card_id, slot_index):
		service_feedback = _slot_rejection_message(slot_index)
		show(host)
		return
	while service_selected_card_ids.size() <= slot_index:
		service_selected_card_ids.append(-1)
	service_selected_card_ids[slot_index] = card_id
	service_feedback = ""
	service_transmuter_preview = {}
	service_preview_elapsed = 0.0
	show(host)


func _can_drop_card_to_slot(card_id: int, slot_index: int, run_state: Dictionary) -> bool:
	return _can_card_fill_slot(run_state, card_id, slot_index)


func _can_card_fill_slot(run_state: Dictionary, card_id: int, slot_index: int) -> bool:
	var card := _run_card_by_id(run_state, card_id)
	if card.is_empty():
		return false
	if active_service_kind != "stickerAltar":
		if slot_index != 0:
			return false
		if active_service_kind == "tinkerer":
			var fixed_sticker := StickerServices.tinkerer_sticker_at(active_service_position, int(run_state.get("map_seed", 0)))
			return not CardStickers.card_sticker_ids(card).has(fixed_sticker) \
				and CardStickers.compatible_stickers(card).has(fixed_sticker)
		if active_service_kind == "cardTransmuter":
			return not StickerServices.transmuter_candidates(card).is_empty()
		return false
	var stickers := CardStickers.card_sticker_ids(card)
	if slot_index == 0:
		if stickers.size() != 1 or DeckEditorRules.is_bound(card):
			return false
		if service_selected_card_ids.size() > 1 and int(service_selected_card_ids[1]) >= 0:
			return StickerServices.can_altar_transfer(card, _run_card_by_id(run_state, int(service_selected_card_ids[1])))
		return true
	if slot_index != 1:
		return false
	if not service_selected_card_ids.is_empty() and int(service_selected_card_ids[0]) >= 0:
		return StickerServices.can_altar_transfer(_run_card_by_id(run_state, int(service_selected_card_ids[0])), card)
	for possible_donor in _all_run_cards(run_state):
		if int(possible_donor.get("id", -1)) == card_id:
			continue
		if CardStickers.card_sticker_ids(possible_donor).size() == 1 and StickerServices.can_altar_transfer(possible_donor, card):
			return true
	return false


func _slot_rejection_message(slot_index: int) -> String:
	if active_service_kind == "stickerAltar":
		return "스티커가 하나 붙은 카드만 제물로 놓을 수 있습니다." if slot_index == 0 \
			else "제물의 스티커를 받을 수 있는 카드만 놓을 수 있습니다."
	if active_service_kind == "tinkerer":
		return "이 카드는 해당 스티커를 받을 수 없습니다."
	if active_service_kind == "cardTransmuter":
		return "같은 희귀도의 다른 카드가 없어 변환할 수 없습니다."
	return "이 슬롯에 놓을 수 없는 카드입니다."


func _remove_selection(host: Node, card_id: int) -> void:
	var index := service_selected_card_ids.find(card_id)
	if index < 0:
		return
	service_selected_card_ids[index] = -1
	while not service_selected_card_ids.is_empty() and int(service_selected_card_ids.back()) < 0:
		service_selected_card_ids.pop_back()
	service_feedback = ""
	service_transmuter_preview = {}
	service_preview_elapsed = 0.0
	show(host)


func _on_card_removed(card_id: int, host: Node) -> void:
	_remove_selection(host, card_id)


func _on_selection_card_gui_input(event: InputEvent, host: Node, card_id: int) -> void:
	var mouse_event := event as InputEventMouseButton
	if mouse_event == null or mouse_event.pressed or mouse_event.button_index != MOUSE_BUTTON_RIGHT:
		return
	_remove_selection(host, card_id)
	host.get_viewport().set_input_as_handled()


func _on_slot_card_dropped(card_id: int, slot_index: int, host: Node) -> void:
	_add_selection(host, card_id, slot_index)


func _selection_is_complete() -> bool:
	var limit := 2 if active_service_kind == "stickerAltar" else 1
	if service_selected_card_ids.size() != limit:
		return false
	for card_id in service_selected_card_ids:
		if int(card_id) < 0:
			return false
	return true


func _apply(host: Node) -> void:
	if not _selection_is_complete():
		return
	var run_state: Dictionary = host.run_state
	var primary_id := service_selected_card_ids[0] if not service_selected_card_ids.is_empty() else -1
	var secondary_id := -1
	if active_service_kind == "stickerAltar" and service_selected_card_ids.size() == 2:
		secondary_id = service_selected_card_ids[1]
	var fixed_sticker := StickerServices.tinkerer_sticker_at(active_service_position, int(run_state.get("map_seed", 0))) if active_service_kind == "tinkerer" else ""
	var random := RandomNumberGenerator.new()
	random.randomize()
	var result := StickerServices.resolve(
		active_service_kind,
		_all_run_cards(run_state),
		primary_id,
		secondary_id,
		fixed_sticker,
		_service_uses(run_state),
		random
	)
	if not bool(result.get("ok", false)):
		service_feedback = str(result.get("message", "카드를 처리하지 못했습니다."))
		show(host)
		return
	var price := int(result.get("price", 0))
	if int(run_state.get("gold", 0)) < price:
		service_feedback = "$%d가 부족합니다." % (price - int(run_state.get("gold", 0)))
		show(host)
		return
	run_state["inventory_cards"] = _apply_cards(run_state.get("inventory_cards", []), result)
	var active_deck_id := str(run_state.get("active_deck_id", "starter"))
	var decks: Array = run_state.get("owned_decks", [])
	for deck_index in range(decks.size()):
		var deck: Dictionary = decks[deck_index].duplicate(true)
		deck["cards"] = _apply_cards(deck.get("cards", []), result)
		decks[deck_index] = deck
	run_state["owned_decks"] = decks
	for deck in decks:
		if str(deck.get("id", "")) == active_deck_id:
			run_state["deck"] = deck.get("cards", []).duplicate(true)
			break
	run_state["gold"] = int(run_state.get("gold", 0)) - price
	var use_counts: Dictionary = run_state.get("sticker_service_uses", {})
	var use_key := "%d,%d" % [active_service_position.x, active_service_position.y]
	use_counts[use_key] = _service_uses(run_state) + 1
	run_state["sticker_service_uses"] = use_counts
	host._save_run()
	_show_result(host, result)


func _show_result(host: Node, result: Dictionary) -> void:
	host.screen_name = "stickerServiceResult"
	service_preview_host = null
	service_apply_button = null
	var modal := _create_overlay(host, 760.0, minf(320.0, host.get_viewport_rect().size.y * 0.8))
	var result_panel_style := modal.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
	result_panel_style.content_margin_left = 24
	result_panel_style.content_margin_top = 26
	result_panel_style.content_margin_right = 24
	result_panel_style.content_margin_bottom = 26
	modal.add_theme_stylebox_override("panel", result_panel_style)
	var cards_margin := MarginContainer.new()
	cards_margin.add_theme_constant_override("margin_left", 0)
	cards_margin.add_theme_constant_override("margin_top", 14)
	cards_margin.add_theme_constant_override("margin_right", 0)
	cards_margin.add_theme_constant_override("margin_bottom", 14)
	cards_margin.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards_margin.size_flags_vertical = Control.SIZE_EXPAND_FILL
	modal.add_child(cards_margin)
	var cards := HBoxContainer.new()
	cards.add_theme_constant_override("separation", 30)
	cards.mouse_filter = Control.MOUSE_FILTER_STOP
	cards.alignment = BoxContainer.ALIGNMENT_CENTER
	cards.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards.size_flags_vertical = Control.SIZE_EXPAND_FILL
	cards_margin.add_child(cards)
	var before_card: Control = host._card_widget(result.get("before", {}), false, false)
	before_card.mouse_filter = Control.MOUSE_FILTER_STOP
	cards.add_child(before_card)
	var arrow := ResultArrowScript.new()
	arrow.custom_minimum_size = Vector2(104, 52)
	arrow.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	arrow.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	arrow.arrow_color = Color("#ff9900")
	cards.add_child(arrow)
	var after_card: Control = host._card_widget(result.get("after", {}), false, false)
	after_card.mouse_filter = Control.MOUSE_FILTER_STOP
	cards.add_child(after_card)


func _create_overlay(host: Node, max_width: float, max_height: float) -> PanelContainer:
	if sticker_service_overlay != null and is_instance_valid(sticker_service_overlay):
		host.remove_child(sticker_service_overlay)
		sticker_service_overlay.queue_free()
	sticker_service_overlay = Control.new()
	sticker_service_overlay.z_index = 100
	sticker_service_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	sticker_service_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	host.add_child(sticker_service_overlay)
	var backdrop := ColorRect.new()
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(0.0, 0.0, 0.0, 0.76)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.gui_input.connect(Callable(self, "_on_result_background_input").bind(host))
	sticker_service_overlay.add_child(backdrop)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sticker_service_overlay.add_child(center)
	var viewport_size: Vector2 = host.get_viewport_rect().size
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(
		minf(max_width, maxf(280.0, viewport_size.x - 28.0)),
		minf(max_height, maxf(240.0, viewport_size.y - 28.0)))
	panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var panel_style: StyleBoxFlat = host._button_style(Color("#0c0e0d"), Color("#c18435"))
	panel_style.content_margin_left = 16
	panel_style.content_margin_top = 13
	panel_style.content_margin_right = 16
	panel_style.content_margin_bottom = 13
	panel.add_theme_stylebox_override("panel", panel_style)
	center.add_child(panel)
	return panel


func _on_result_background_input(event: InputEvent, host: Node) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		host._show_map()


func _all_run_cards(run_state: Dictionary) -> Array:
	var cards: Array = run_state.get("inventory_cards", []).duplicate(true)
	for deck in run_state.get("owned_decks", []):
		cards.append_array(deck.get("cards", []).duplicate(true))
	return cards


func _run_card_by_id(run_state: Dictionary, card_id: int) -> Dictionary:
	for card in run_state.get("inventory_cards", []):
		if int(card.get("id", -1)) == card_id:
			return card
	for deck in run_state.get("owned_decks", []):
		for card in deck.get("cards", []):
			if int(card.get("id", -1)) == card_id:
				return card
	for card in run_state.get("deck", []):
		if int(card.get("id", -1)) == card_id:
			return card
	return {}


func _apply_cards(cards: Array, result: Dictionary) -> Array:
	var updated: Array = []
	var destroyed_id := int(result.get("destroyed_id", -1))
	var after: Dictionary = result.get("after", {})
	var after_id := int(after.get("id", -1))
	for card in cards:
		var card_id := int(card.get("id", -1))
		if card_id == destroyed_id:
			continue
		updated.append(after.duplicate(true) if card_id == after_id else card)
	return updated


func _service_uses(run_state: Dictionary) -> int:
	var use_counts: Dictionary = run_state.get("sticker_service_uses", {})
	var use_key := "%d,%d" % [active_service_position.x, active_service_position.y]
	return int(use_counts.get(use_key, 0))


func _service_slot(host: Node, label_text: String, slot_index := 0) -> StickerServiceSlotDropTarget:
	var panel := StickerServiceSlotDropTarget.new()
	panel.slot_index = slot_index
	panel.card_validator = Callable(self, "_can_drop_card_to_slot").bind(slot_index, host.run_state)
	panel.custom_minimum_size = Vector2(149.6, 210.1)
	panel.add_theme_stylebox_override("panel", host._button_style(host.COLOR_PANEL, host.COLOR_BORDER))
	var label: Label = host._label("+" if label_text.is_empty() else "+\n" + label_text, 16, host.COLOR_GOLD)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(label)
	return panel


func _result_placeholder(host: Node) -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(149.6, 210.1)
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_theme_stylebox_override("panel", host._button_style(host.COLOR_PANEL, host.COLOR_BORDER))
	var plus: Label = host._label("+", 34, host.COLOR_GOLD)
	plus.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	plus.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	plus.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	plus.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_child(plus)
	return panel


func _sticker_icon(host: Node, sticker_id: String, icon_size: float) -> Control:
	var icon = StickerArtScript.new()
	icon.configure(sticker_id, icon_size)
	icon.set_meta("card_sticker_id", sticker_id)
	icon.theme = host.blue_tooltip_theme
	if CardStickers.STICKERS.has(sticker_id):
		TooltipBindings.bind_sticker(icon, sticker_id)
	return icon


func _service_label(host: Node, text: String, size: int, color: Color, weight := 400) -> Label:
	var label: Label = host._label(text, size, color)
	label.add_theme_font_override("font", _service_font(weight))
	return label


func _style_service_button(button: Button, size: int, weight: int) -> void:
	button.add_theme_font_size_override("font_size", size)
	button.add_theme_font_override("font", _service_font(weight))


func _service_font(weight: int) -> FontVariation:
	var font := FontVariation.new()
	font.base_font = STICKER_SERVICE_FONT
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	font.variation_opentype = {weight_axis: float(weight)}
	return font
