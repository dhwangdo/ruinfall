class_name PortDeckEditorView
extends RefCounted

const BattleCardDragSourceScript = preload("res://scripts/battle_card_drag_source.gd")
const CompactCardView = preload("res://scripts/compact_card_view.gd")
const ConsumableTicketVisual = preload("res://scripts/consumable_ticket_visual.gd")
const DeckCaseDragButtonScript = preload("res://scripts/deck_case_drag_button.gd")
const DeckCaseDropAreaScript = preload("res://scripts/deck_case_drop_area.gd")
const DeckCaseHeadingScript = preload("res://scripts/deck_case_heading.gd")
const DeckEditions = preload("res://scripts/deck_editions.gd")
const DeckEditorEmptySlotScript = preload("res://scripts/deck_editor_empty_slot.gd")
const DeckEditorHeadingFont = preload("res://assets/fonts/PretendardVariable700.tres")
const DeckEditorRules = preload("res://scripts/deck_editor_rules.gd")
const DeckStorageService = preload("res://scripts/deck_storage_service.gd")
const MapRules = preload("res://scripts/map_rules.gd")
const PendingRemovalEffectScript = preload("res://scripts/pending_removal_effect.gd")
const RunCardDropAreaScript = preload("res://scripts/run_card_drop_area.gd")


static func show(host: Node) -> void:
	if host.screen_name != "deck" or host.deck_editor_effect_started_usec < 0:
		host.deck_editor_effect_started_usec = Time.get_ticks_usec()
	host._clear_map_vault_preview()
	host._hide_card_hover_preview()
	host.auto_travel_active = false
	host.auto_travel_path.clear()
	host._sync_active_deck()
	DeckStorageService.begin_session(host)
	host.screen_name = "deck"
	if host.deck_editor_overlay != null and is_instance_valid(host.deck_editor_overlay):
		host.remove_child(host.deck_editor_overlay)
		host.deck_editor_overlay.queue_free()
	var overlay := Control.new()
	overlay.z_index = 100
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	host.deck_editor_overlay = overlay
	host.add_child(overlay)
	var backdrop := ColorRect.new()
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(4.0 / 255.0, 8.0 / 255.0, 7.0 / 255.0, 0.72)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.gui_input.connect(Callable(PortDeckEditorView, "_on_backdrop_input").bind(host))
	overlay.add_child(backdrop)
	var modal_margin := MarginContainer.new()
	modal_margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	modal_margin.add_theme_constant_override("margin_left", 14)
	modal_margin.add_theme_constant_override("margin_top", 14)
	modal_margin.add_theme_constant_override("margin_right", 14)
	modal_margin.add_theme_constant_override("margin_bottom", 14)
	overlay.add_child(modal_margin)
	var modal_panel := PanelContainer.new()
	modal_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	modal_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var modal_style := StyleBoxEmpty.new()
	modal_style.content_margin_left = 0
	modal_style.content_margin_top = 0
	modal_style.content_margin_right = 0
	modal_style.content_margin_bottom = 0
	modal_panel.add_theme_stylebox_override("panel", modal_style)
	modal_margin.add_child(modal_panel)
	var page := VBoxContainer.new()
	page.add_theme_constant_override("separation", 9)
	page.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	page.size_flags_vertical = Control.SIZE_EXPAND_FILL
	modal_panel.add_child(page)

	var run_state: Dictionary = host.run_state
	var can_change_deck := MapRules.is_safe_area_tile(run_state["map"], run_state["position"])
	var animate_safe_area_unlock: bool = host.safe_area_unlock_pending_animation and can_change_deck \
		and not run_state.get("blessings", []).has("forbiddenKnowledge")
	host.safe_area_unlock_pending_animation = false
	if host.extraction_ticket_mode:
		page.add_child(host._label("추출할 덱 카드를 선택하세요.", 12, host.COLOR_GOLD))
	var editor_board := VBoxContainer.new()
	editor_board.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	editor_board.size_flags_vertical = Control.SIZE_EXPAND_FILL
	editor_board.add_theme_constant_override("separation", 0)
	page.add_child(editor_board)

	_build_inventory_row(host, editor_board)
	_add_gap(editor_board, 32.0)
	_build_owned_deck_rows(host, editor_board, can_change_deck, animate_safe_area_unlock)
	_add_gap(editor_board, 32.0)
	_build_floor_row(host, editor_board)


static func _add_gap(parent: Control, height: float) -> void:
	var gap := Control.new()
	gap.custom_minimum_size.y = height
	gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(gap)


static func _leading_spacer() -> Control:
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(8, 1)
	spacer.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return spacer


static func _build_inventory_row(host: Node, editor_board: VBoxContainer) -> void:
	var run_state: Dictionary = host.run_state
	var inventory_cards: Array = run_state.get("inventory_cards", [])
	var inventory_consumables: Array = run_state.get("inventory_consumables", [])
	var inventory_row := _new_row(104.0,
		Color("#3a3025", 0.80), Color("#3a3025", 0.40), Color("#a08d6c", 0.60), 5,
		Color("#a08d6c", 0.60))
	var inventory_header: VBoxContainer = inventory_row["header"]
	inventory_header.add_child(_editor_label(host, "인벤토리", 15, host.COLOR_TEXT))
	inventory_header.add_child(_editor_label(host, "%d / %d" % [
		DeckStorageService.inventory_item_count(run_state), int(host.INVENTORY_CAPACITY)], 12, host.COLOR_MUTED))
	var inventory_card_list: HBoxContainer = inventory_row["cards"]
	inventory_card_list.set_script(RunCardDropAreaScript)
	inventory_card_list.set("run_drop_target", {"area": "inventory"})
	inventory_card_list.set("run_drop_callback", Callable(DeckStorageService, "on_run_card_dropped").bind(host))
	inventory_card_list.add_child(_leading_spacer())
	for group in DeckStorageService.group_cards(inventory_cards):
		var card := DeckStorageService.group_representative(group)
		var card_ids: Array = group["ids"]
		var widget := card_widget(host, card, card_ids.size())
		configure_run_card_drag(host, widget, card, "inventory", "", "inventory")
		widget.gui_input.connect(Callable(PortDeckEditorView, "_on_inventory_card_gui_input").bind(host, card.duplicate(true)))
		add_card_to_row(inventory_card_list, widget, card_ids.size())
	for group in DeckStorageService.group_consumables(inventory_consumables):
		var consumable := DeckStorageService.group_representative(group)
		var consumable_ids: Array = group["ids"]
		inventory_card_list.add_child(consumable_widget(host, consumable, "inventory", consumable_ids.size()))
	for _empty_slot_index in range(DeckStorageService.inventory_space_available(host)):
		inventory_card_list.add_child(empty_slot("normal"))
	editor_board.add_child(inventory_row["panel"])


static func _build_owned_deck_rows(host: Node, editor_board: VBoxContainer,
		can_change_deck: bool, animate_safe_area_unlock: bool) -> void:
	var run_state: Dictionary = host.run_state
	var display_decks: Array = run_state.get("owned_decks", []).duplicate()
	var active_deck_id := str(run_state.get("active_deck_id", "starter"))
	var deck_rows := VBoxContainer.new()
	deck_rows.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	deck_rows.size_flags_vertical = Control.SIZE_EXPAND_FILL
	deck_rows.add_theme_constant_override("separation", 10)
	var deck_limit := DeckStorageService.owned_deck_limit(host)
	if display_decks.size() > int(host.MAX_OWNED_DECKS) or (deck_limit > int(host.MAX_OWNED_DECKS) and display_decks.size() >= int(host.MAX_OWNED_DECKS)):
		var deck_scroll := ScrollContainer.new()
		deck_scroll.name = "ExtraDecksScroll"
		deck_scroll.custom_minimum_size.y = 330.0
		deck_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		deck_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
		deck_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
		deck_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
		deck_scroll.add_child(deck_rows)
		editor_board.add_child(deck_scroll)
	else:
		editor_board.add_child(deck_rows)

	for deck in display_decks:
		var deck_id := str(deck.get("id", ""))
		var deck_name := str(deck.get("name", "덱"))
		var active := deck_id == active_deck_id
		var deck_cards: Array = run_state.get("deck", []) if active else deck.get("cards", [])
		var deck_rare_count := 0
		for card in deck_cards:
			if DeckStorageService.is_rare_slot_card(card):
				deck_rare_count += 1
		var deck_capacity := int(deck.get("capacity", 25))
		var rare_slot_capacity := maxi(DeckEditions.rare_slot_capacity(deck), deck_rare_count)
		var deck_row := _new_row(104.0, Color("#0c0d0c", 0.85),
			Color("#0c0d0c", 0.80), Color("#db8a3d"), 5, Color("#db8a3d"))
		var deck_drop_area: Control = deck_row["panel"]
		deck_drop_area.set_script(DeckCaseDropAreaScript)
		deck_drop_area.set("deck_drop_target", {"area": "owned", "deck_id": deck_id})
		deck_drop_area.set("deck_drop_callback", Callable(DeckStorageService, "on_deck_case_dropped").bind(host))
		var deck_header: VBoxContainer = deck_row["header"]
		var deck_heading_panel: PanelContainer = deck_row["heading_panel"]
		var deck_heading_style := deck_heading_panel.get_theme_stylebox("panel").duplicate() as StyleBoxFlat
		deck_heading_style.content_margin_left = 0
		deck_heading_style.content_margin_top = 0
		deck_heading_style.content_margin_right = 0
		deck_heading_style.content_margin_bottom = 0
		deck_heading_panel.add_theme_stylebox_override("panel", deck_heading_style)
		var select_deck: Button = host._button(deck_name, Callable(host, "_select_deck_editor_target").bind(deck_id), Vector2(154, 34))
		select_deck.set_script(DeckCaseDragButtonScript)
		select_deck.set("deck_drag_payload", {"kind": "deck-case", "source_area": "owned", "deck_id": deck_id})
		select_deck.set("deck_preview_data", {"name": deck_name, "editions": deck.get("editions", []),
			"count": deck_cards.size(), "capacity": deck_capacity, "show_icon": true})
		select_deck.disabled = false
		select_deck.add_theme_font_override("font", DeckEditorHeadingFont)
		select_deck.add_theme_font_size_override("font_size", 15)
		select_deck.custom_minimum_size = Vector2.ZERO
		select_deck.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		select_deck.size_flags_vertical = Control.SIZE_EXPAND_FILL
		var heading_button_style := StyleBoxFlat.new()
		heading_button_style.bg_color = Color("#0c0d0c", 0.85)
		heading_button_style.set_border_width_all(0)
		heading_button_style.corner_radius_top_left = 3
		heading_button_style.corner_radius_bottom_left = 3
		heading_button_style.corner_radius_top_right = 0
		heading_button_style.corner_radius_bottom_right = 0
		heading_button_style.content_margin_left = 0
		heading_button_style.content_margin_top = 0
		heading_button_style.content_margin_right = 0
		heading_button_style.content_margin_bottom = 0
		for style_name in ["normal", "hover", "pressed", "hover_pressed", "disabled", "focus"]:
			select_deck.add_theme_stylebox_override(style_name, heading_button_style)
		for color_name in ["font_color", "font_hover_color", "font_pressed_color",
				"font_hover_pressed_color", "font_disabled_color", "font_focus_color", "font_outline_color"]:
			select_deck.add_theme_color_override(color_name, Color(1.0, 1.0, 1.0, 0.0))
		select_deck.add_theme_constant_override("outline_size", 0)
		var heading_visual := DeckCaseHeadingScript.new()
		var allow_free := DeckStorageService.deck_allows_free_edit(run_state, deck_id)
		var deck_can_edit := can_change_deck or allow_free
		heading_visual.configure(deck_name, deck.get("editions", []), deck_cards.size(), deck_capacity,
			deck_can_edit, animate_safe_area_unlock and not allow_free, true, false, true)
		select_deck.add_child(heading_visual)
		select_deck.gui_input.connect(Callable(PortDeckEditorView, "_on_owned_deck_header_gui_input").bind(host, deck_id))
		deck_header.add_child(select_deck)

		var deck_card_list: HBoxContainer = deck_row["cards"]
		deck_card_list.set_script(RunCardDropAreaScript)
		deck_card_list.set("run_drop_target", {"area": "deck", "deck_id": deck_id})
		deck_card_list.set("run_drop_callback", Callable(DeckStorageService, "on_run_card_dropped").bind(host))
		deck_card_list.add_child(_leading_spacer())

		var rare_card_groups: Array[Dictionary] = []
		var normal_card_groups: Array[Dictionary] = []
		var royal: bool = deck.get("editions", []).has("royal")
		for group in DeckStorageService.group_cards(deck_cards):
			var grouped_card := DeckStorageService.group_representative(group)
			if royal or DeckStorageService.is_rare_slot_card(grouped_card):
				rare_card_groups.append(group)
			else:
				normal_card_groups.append(group)
		_append_deck_card_groups(host, deck_card_list, rare_card_groups, deck_id, deck_can_edit)
		for _empty_rare_slot in range(maxi(0, rare_slot_capacity - (deck_cards.size() if royal else deck_rare_count))):
			deck_card_list.add_child(empty_slot("rare"))
		if rare_slot_capacity > 0 and not royal:
			deck_card_list.add_child(empty_slot("divider"))
		_append_deck_card_groups(host, deck_card_list, normal_card_groups, deck_id, deck_can_edit)
		var normal_card_count := deck_cards.size() - deck_rare_count
		var normal_slot_capacity := maxi(0, deck_capacity - rare_slot_capacity)
		for _empty_normal_slot in range(maxi(0, normal_slot_capacity - normal_card_count)):
			deck_card_list.add_child(empty_slot("normal"))
		var deck_scroll_trailing_space := Control.new()
		deck_scroll_trailing_space.custom_minimum_size = Vector2(416, 1)
		deck_scroll_trailing_space.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		deck_scroll_trailing_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
		deck_card_list.add_child(deck_scroll_trailing_space)
		deck_rows.add_child(deck_row["panel"])

	var visible_slot_count := mini(deck_limit, maxi(int(host.MAX_OWNED_DECKS), display_decks.size() + 1))
	for empty_slot_index in range(display_decks.size(), visible_slot_count):
		var empty_drop_area := Control.new()
		empty_drop_area.custom_minimum_size.y = 104.0
		empty_drop_area.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		empty_drop_area.set_script(DeckCaseDropAreaScript)
		empty_drop_area.set("deck_drop_target", {"area": "emptyOwned", "slot": empty_slot_index})
		empty_drop_area.set("deck_drop_callback", Callable(DeckStorageService, "on_deck_case_dropped").bind(host))
		deck_rows.add_child(empty_drop_area)


static func _append_deck_card_groups(host: Node, deck_card_list: HBoxContainer, groups: Array[Dictionary],
		deck_id: String, deck_can_edit: bool) -> void:
	for group in groups:
		var card := DeckStorageService.group_representative(group)
		var card_ids: Array = group["ids"]
		var deck_card_widget := card_widget(host, card, card_ids.size())
		_apply_pending_deck_add_effect(host, deck_card_widget, card_ids)
		_configure_deck_card_ticket_drop(host, deck_card_widget, deck_id, card)
		if not host.extraction_ticket_mode:
			configure_run_card_drag(host, deck_card_widget, card, "deck", deck_id, "deck", deck_id)
		else:
			deck_card_widget.mouse_filter = Control.MOUSE_FILTER_STOP
		deck_card_widget.gui_input.connect(Callable(PortDeckEditorView, "_on_owned_deck_card_gui_input").bind(
			host, deck_id, card.duplicate(true), deck_can_edit))
		add_card_to_row(deck_card_list, deck_card_widget, card_ids.size())


static func _build_floor_row(host: Node, editor_board: VBoxContainer) -> void:
	var run_state: Dictionary = host.run_state
	var current_position: Vector2i = run_state["position"]
	var cards_on_tile: Array = []
	var consumables_on_tile: Array = []
	var decks_on_tile: Array = []
	for drop in run_state.get("floor_cards", []):
		if int(drop.get("x", -1)) == current_position.x and int(drop.get("y", -1)) == current_position.y:
			cards_on_tile.append(drop)
	for drop in run_state.get("floor_consumable_drops", []):
		if int(drop.get("x", -1)) == current_position.x and int(drop.get("y", -1)) == current_position.y:
			consumables_on_tile.append(drop)
	for drop in run_state.get("floor_deck_drops", []):
		if int(drop.get("x", -1)) == current_position.x and int(drop.get("y", -1)) == current_position.y:
			decks_on_tile.append(drop)
	var floor_row := _new_row(104.0,
		Color("#26333e", 0.80), Color("#26333e", 0.40), Color("#6f879a", 0.60), 5,
		Color("#6f879a", 0.60))
	var floor_header: VBoxContainer = floor_row["header"]
	floor_header.add_child(_editor_label(host, "바닥", 15, host.COLOR_TEXT))
	var floor_card_list: HBoxContainer = floor_row["cards"]
	floor_card_list.set_script(RunCardDropAreaScript)
	floor_card_list.set("run_drop_target", {"area": "floor"})
	floor_card_list.set("run_drop_callback", Callable(DeckStorageService, "on_run_card_dropped").bind(host))
	var floor_drop_area: Control = floor_row["panel"]
	floor_drop_area.set_script(DeckCaseDropAreaScript)
	floor_drop_area.set("deck_drop_target", {"area": "floor"})
	floor_drop_area.set("deck_drop_callback", Callable(DeckStorageService, "on_deck_case_dropped").bind(host))
	floor_card_list.add_child(_leading_spacer())

	# Web displays removal candidates in the existing floor row.
	for pending in host.deck_editor_pending_removals:
		var pending_card: Dictionary = pending.get("card", {})
		var pending_view := card_widget(host, pending_card)
		var removal_effect = PendingRemovalEffectScript.new()
		pending_view.add_child(removal_effect)
		removal_effect.configure(pending_view, host.deck_editor_effect_started_usec,
			DisplayServer.accessibility_should_reduce_animation() == 1)
		configure_run_card_drag(host, pending_view, pending_card, "pendingRemoval", str(pending.get("deck_id", "")))
		pending_view.gui_input.connect(Callable(PortDeckEditorView, "_on_pending_deck_card_gui_input").bind(host, pending_card.duplicate(true)))
		add_card_to_row(floor_card_list, pending_view)

	var floor_cards: Array = []
	for drop in cards_on_tile:
		floor_cards.append(drop.get("card", {}))
	for group in DeckStorageService.group_cards(floor_cards):
		var floor_card := DeckStorageService.group_representative(group)
		var floor_card_ids: Array = group["ids"]
		var floor_card_widget := card_widget(host, floor_card, floor_card_ids.size())
		configure_run_card_drag(host, floor_card_widget, floor_card, "floor")
		floor_card_widget.gui_input.connect(Callable(PortDeckEditorView, "_on_floor_card_gui_input").bind(host, floor_card.duplicate(true)))
		add_card_to_row(floor_card_list, floor_card_widget, floor_card_ids.size())

	var floor_consumables: Array = []
	for drop in consumables_on_tile:
		floor_consumables.append(drop.get("consumable", {}))
	for group in DeckStorageService.group_consumables(floor_consumables):
		var floor_consumable := DeckStorageService.group_representative(group)
		var floor_consumable_ids: Array = group["ids"]
		floor_card_list.add_child(consumable_widget(host, floor_consumable, "floor", floor_consumable_ids.size()))

	for drop in decks_on_tile:
		var floor_deck: Dictionary = drop.get("deck", {})
		if floor_deck.is_empty():
			continue
		var floor_deck_id := str(floor_deck.get("id", ""))
		var floor_deck_button := DeckCaseDragButtonScript.new() as Button
		floor_deck_button.custom_minimum_size = Vector2(190, 100)
		floor_deck_button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		var floor_deck_style := StyleBoxFlat.new()
		floor_deck_style.bg_color = Color("#0c0d0c", 0.85)
		floor_deck_style.border_color = Color("#db8a3d")
		floor_deck_style.set_border_width_all(2)
		floor_deck_style.set_corner_radius_all(5)
		for style_name in ["normal", "hover", "pressed", "hover_pressed", "disabled", "focus"]:
			floor_deck_button.add_theme_stylebox_override(style_name, floor_deck_style)
		var floor_heading := DeckCaseHeadingScript.new()
		floor_heading.configure(str(floor_deck.get("name", "금고 덱")), floor_deck.get("editions", []),
			floor_deck.get("cards", []).size(), int(floor_deck.get("capacity", 25)), false, false, false, true, true)
		floor_deck_button.add_child(floor_heading)
		floor_deck_button.set("deck_drag_payload", {
			"kind": "deck-case", "source_area": "floor", "deck_id": floor_deck_id,
		})
		floor_deck_button.set("deck_preview_data", {"name": floor_deck.get("name", "금고 덱"),
			"editions": floor_deck.get("editions", []), "count": floor_deck.get("cards", []).size(),
			"capacity": int(floor_deck.get("capacity", 25)), "show_icon": true})
		floor_deck_button.pressed.connect(Callable(DeckStorageService, "pick_up_floor_deck").bind(host, floor_deck_id))
		floor_card_list.add_child(floor_deck_button)
	editor_board.add_child(floor_row["panel"])


static func _new_row(row_height: float, header_color: Color,
		row_color: Color = Color("#171b18"), border_color: Color = Color("#676a5a"),
		corner_radius: int = 4, header_border_color: Color = Color("#676a5a")) -> Dictionary:
	var panel := PanelContainer.new()
	panel.custom_minimum_size.y = row_height
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var row_style := StyleBoxFlat.new()
	row_style.bg_color = row_color
	row_style.border_color = border_color
	row_style.set_border_width_all(2)
	row_style.set_corner_radius_all(corner_radius)
	# Keep child panels inside the 2px outer border so their fills cannot cover it.
	row_style.content_margin_left = 2
	row_style.content_margin_top = 2
	row_style.content_margin_right = 2
	row_style.content_margin_bottom = 2
	panel.add_theme_stylebox_override("panel", row_style)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 0)
	panel.add_child(row)
	var heading_panel := PanelContainer.new()
	heading_panel.custom_minimum_size = Vector2(190, row_height)
	var heading_style := StyleBoxFlat.new()
	heading_style.bg_color = header_color
	heading_style.border_color = header_border_color
	heading_style.corner_radius_top_left = maxi(0, corner_radius - 2)
	heading_style.corner_radius_bottom_left = maxi(0, corner_radius - 2)
	heading_style.set_border_width_all(0)
	heading_style.border_width_right = 0 if header_border_color == Color("#db8a3d") else 1
	heading_style.content_margin_left = 12
	heading_style.content_margin_top = 9
	heading_style.content_margin_right = 12
	heading_style.content_margin_bottom = 9
	heading_panel.add_theme_stylebox_override("panel", heading_style)
	var header := VBoxContainer.new()
	header.add_theme_constant_override("separation", 3)
	header.alignment = BoxContainer.ALIGNMENT_CENTER
	heading_panel.add_child(header)
	row.add_child(heading_panel)
	var scroll := ScrollContainer.new()
	scroll.custom_minimum_size.y = row_height
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	# Match the browser's hidden scrollbar while retaining horizontal scrolling.
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_NEVER
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	var cards := HBoxContainer.new()
	cards.custom_minimum_size.y = row_height
	cards.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	cards.add_theme_constant_override("separation", 8)
	scroll.add_child(cards)
	row.add_child(scroll)
	return {"panel": panel, "heading_panel": heading_panel, "header": header, "cards": cards}


static func empty_slot(kind: String) -> Control:
	var slot := DeckEditorEmptySlotScript.new() as Control
	slot.call("configure", kind)
	slot.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return slot


static func _apply_pending_deck_add_effect(host: Node, view: Control, card_ids: Array) -> void:
	# Browser isTemporary: a stack blinks if any card came from outside a deck.
	for card_id in card_ids:
		if DeckStorageService.origin_deck_id_for_card(host, int(card_id)) == "":
			var effect := PendingRemovalEffectScript.new()
			view.add_child(effect)
			effect.configure(view, host.deck_editor_effect_started_usec,
				DisplayServer.accessibility_should_reduce_animation() == 1, null, null, false)
			return


static func configure_run_card_drag(host: Node, widget: Control, card: Dictionary, source_area: String,
		source_deck_id: String = "", target_area: String = "", target_deck_id: String = "") -> void:
	if DeckEditorRules.is_bound(card):
		return
	widget.mouse_filter = Control.MOUSE_FILTER_STOP
	widget.set("run_drag_payload", {
		"kind": "run-card",
		"card_id": int(card.get("id", -1)),
		"card_name": str(card.get("name", "카드")),
		"source_area": source_area,
		"source_deck_id": source_deck_id,
	})
	if target_area.is_empty():
		return
	widget.set("run_drop_target", {"area": target_area, "deck_id": target_deck_id})
	widget.set("run_drop_callback", Callable(DeckStorageService, "on_run_card_dropped").bind(host))


static func _configure_deck_card_ticket_drop(host: Node, widget: Control, deck_id: String, card: Dictionary) -> void:
	widget.set("ticket_drop_target", {
		"action": "extract-deck-card",
		"deck_id": deck_id,
		"card_id": int(card.get("id", -1)),
	})
	widget.set("ticket_drop_callback", Callable(DeckStorageService, "on_run_ticket_dropped").bind(host))
	widget.set("ticket_can_drop_callback", Callable(DeckStorageService, "can_drop_extract_ticket").bind(host))


static func consumable_widget(host: Node, consumable: Dictionary, area: String, count: int = 1) -> Control:
	var stack_root := Control.new()
	var item_view := BattleCardDragSourceScript.new()
	item_view.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var consumable_id := str(consumable.get("id", ""))
	var is_selected: bool = host.extraction_ticket_mode and host.extraction_ticket_source == area \
		and host.extraction_ticket_id == consumable_id
	ConsumableTicketVisual.configure_compact(stack_root, item_view, consumable, count, is_selected)
	if area == "inventory":
		item_view.set("run_drop_target", {"area": "inventory", "deck_id": ""})
		item_view.set("run_drop_callback", Callable(DeckStorageService, "on_run_card_dropped").bind(host))
	item_view.set("run_drag_payload", {
		"kind": "run-ticket",
		"ticket_id": consumable_id,
		"ticket_type": str(consumable.get("type", "")),
		"source_area": area,
	})
	item_view.gui_input.connect(Callable(PortDeckEditorView, "_on_consumable_gui_input").bind(host, consumable.duplicate(true), area))
	return stack_root


static func add_card_to_row(row: HBoxContainer, card_view: Control, count: int = 1) -> void:
	var layers := mini(5, maxi(0, count - 1))
	if layers == 0:
		row.add_child(card_view)
		return
	# Reserve CSS margin-left without enlarging the card's hover/drop/drag area.
	var stack_margin := MarginContainer.new()
	stack_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stack_margin.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	stack_margin.add_theme_constant_override("margin_left", layers * 7)
	stack_margin.add_child(card_view)
	row.add_child(stack_margin)


static func _editor_label(host: Node, text: String, font_size: int, color: Color) -> Label:
	var label: Label = host._label(text, font_size, color)
	label.add_theme_font_override("font", DeckEditorHeadingFont)
	return label


static func card_widget(host: Node, card: Dictionary, count: int = 1) -> BattleCardDragSourceScript:
	var card_view := CompactCardView.create(
		card,
		count,
		Callable(host, "_show_card_hover_preview"),
		Callable(host, "_hide_card_hover_preview"),
		Callable(host, "_hide_card_hover_preview"),
		host.blue_tooltip_theme
	) as BattleCardDragSourceScript
	card_view.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return card_view


static func _on_backdrop_input(event: InputEvent, host: Node) -> void:
	var click := event as InputEventMouseButton
	if click != null and click.pressed and click.button_index == MOUSE_BUTTON_LEFT:
		host.get_viewport().set_input_as_handled()
		host._show_map()


static func _on_inventory_card_gui_input(event: InputEvent, host: Node, card: Dictionary) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed:
		return
	var card_id := int(card.get("id", -1))
	if click.button_index == MOUSE_BUTTON_RIGHT:
		DeckStorageService.move_inventory_card_to_floor(host, card_id)
		host.get_viewport().set_input_as_handled()
	elif click.button_index == MOUSE_BUTTON_LEFT and not host.extraction_ticket_mode:
		DeckStorageService.move_external_card_to_deck(host, card_id, "inventory", str(host.run_state.get("active_deck_id", "starter")))
		host.get_viewport().set_input_as_handled()


static func _on_floor_card_gui_input(event: InputEvent, host: Node, card: Dictionary) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed:
		return
	if click.button_index == MOUSE_BUTTON_LEFT and not host.extraction_ticket_mode:
		DeckStorageService.move_floor_card_to_inventory(host, int(card.get("id", -1)))
		host.get_viewport().set_input_as_handled()


static func _on_consumable_gui_input(event: InputEvent, host: Node, consumable: Dictionary, area: String) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed:
		return
	var consumable_id := str(consumable.get("id", ""))
	var consumable_type := str(consumable.get("type", ""))
	if click.button_index == MOUSE_BUTTON_RIGHT and area == "inventory":
		DeckStorageService.move_inventory_consumable_to_floor(host, consumable_id)
		host.get_viewport().set_input_as_handled()
	elif click.button_index == MOUSE_BUTTON_LEFT:
		if area == "floor" and consumable_type != "extractTicket":
			DeckStorageService.move_floor_consumable_to_inventory(host, consumable_id)
			host.get_viewport().set_input_as_handled()
		elif consumable_type == "extractTicket":
			if host.extraction_ticket_mode and host.extraction_ticket_source == area and host.extraction_ticket_id == consumable_id:
				host.extraction_ticket_mode = false
				host.extraction_ticket_id = ""
			else:
				host.extraction_ticket_mode = true
				host.extraction_ticket_source = area
				host.extraction_ticket_id = consumable_id
			host._show_deck()
			host.get_viewport().set_input_as_handled()


static func _on_owned_deck_header_gui_input(event: InputEvent, host: Node, deck_id: String) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed or click.button_index != MOUSE_BUTTON_RIGHT:
		return
	DeckStorageService.drop_owned_deck(host, deck_id)
	host.get_viewport().set_input_as_handled()


static func _on_owned_deck_card_gui_input(event: InputEvent, host: Node, deck_id: String, card: Dictionary, can_change_deck: bool) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed:
		return
	var card_id := int(card.get("id", -1))
	if host.extraction_ticket_mode and click.button_index == MOUSE_BUTTON_LEFT:
		DeckStorageService.extract_owned_deck_card(host, deck_id, card_id)
		host.get_viewport().set_input_as_handled()
	elif not host.extraction_ticket_mode and click.button_index == MOUSE_BUTTON_RIGHT \
			and DeckStorageService.can_remove_deck_card(host, card, can_change_deck, deck_id):
		# Browser context-menu removal chooses a destination explicitly.
		if DeckStorageService.is_rare_slot_card(card) or not can_change_deck or DeckStorageService.inventory_space_available(host) <= 0:
			DeckStorageService.move_deck_card_to_floor(host, card_id, deck_id)
		else:
			DeckStorageService.move_deck_card_to_inventory(host, card_id, deck_id)
		host.get_viewport().set_input_as_handled()


static func _on_pending_deck_card_gui_input(event: InputEvent, host: Node, card: Dictionary) -> void:
	var click := event as InputEventMouseButton
	if click == null or click.pressed or click.button_index not in [MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT]:
		return
	DeckStorageService.restore_pending_deck_card(host, int(card.get("id", -1)))
	host.get_viewport().set_input_as_handled()
