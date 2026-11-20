extends Control
class_name PortMapSearchPanel

const SearchRules = preload("res://scripts/map_search_rules.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const DeckEditionList = preload("res://scripts/deck_edition_list.gd")
const DeckIconArt = preload("res://scripts/deck_icon_art.gd")
const DeckHeading = preload("res://scripts/deck_case_heading.gd")
const DeckEditions = preload("res://scripts/deck_editions.gd")
const SearchTilePreview = preload("res://scripts/map_search_tile.gd")
const ConsumableTicketVisual = preload("res://scripts/consumable_ticket_visual.gd")
const SearchRegionMinimap = preload("res://scripts/map_search_region_minimap.gd")
const CompactCardView = preload("res://scripts/compact_card_view.gd")
const CardHoverPreview = preload("res://scripts/card_hover_preview.gd")
const StickerArt = preload("res://scripts/sticker_art.gd")
const SearchFont = preload("res://assets/fonts/PretendardVariable.woff2")
const SearchBoldFont = preload("res://assets/fonts/PretendardVariable700.tres")

const RESULT_PAGE_SIZE := 24
const RESULT_PREVIEW_SIDE := 82.0

var filtered_results: Array[Dictionary] = []
var result_page := 0
var previous_page_button: Button
var next_page_button: Button
var results_scroll: ScrollContainer

signal ping_requested(position: Vector2i, label: String)

var entries: Array[Dictionary] = []
var run_state: Dictionary = {}
var selected_kind := "deck"
var selected_region := SearchRules.ALL_REGIONS
var selected_entry_key := ""
var search_input: LineEdit
var region_picker: OptionButton
var result_count: Label
var result_list: VBoxContainer
var detail_content: VBoxContainer
var card_widget_builder: Callable
var player_marker := "outline"
var ping_position := Vector2i(-1, -1)
var modal_panel: PanelContainer
var result_panel: PanelContainer
var region_ids: Array[int] = []
var active_card_preview: Control


func configure(state: Dictionary, current_region: int, minimap_marker := "outline",
	active_ping := Vector2i(-1, -1), card_builder: Callable = Callable()) -> void:
	run_state = state
	entries = SearchRules.build_entries(run_state)
	selected_region = current_region
	player_marker = minimap_marker
	ping_position = active_ping
	card_widget_builder = card_builder


func _ready() -> void:
	_build()


func _build() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	z_index = 100
	var search_theme := Theme.new()
	search_theme.default_font = SearchFont
	search_theme.default_font_size = 14
	theme = search_theme
	var backdrop := ColorRect.new()
	backdrop.color = Color(0.015, 0.02, 0.018, 0.88)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.gui_input.connect(_on_backdrop_input)
	add_child(backdrop)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)
	modal_panel = PanelContainer.new()
	modal_panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	modal_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var frame_style := _panel_style(Color("#111512"), Color("#82735a"), 0)
	modal_panel.add_theme_stylebox_override("panel", frame_style)
	center.add_child(modal_panel)
	_resize_modal()
	get_viewport().size_changed.connect(_resize_modal)

	var body := VBoxContainer.new()
	body.add_theme_constant_override("separation", 0)
	modal_panel.add_child(body)

	var header_margin := _margin_container(16, 16, 12, 12)
	body.add_child(header_margin)
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 12)
	header_margin.add_child(header)
	var title := Label.new()
	title.text = "지도 검색"
	title.add_theme_font_override("font", SearchBoldFont)
	title.add_theme_font_size_override("font_size", 20)
	title.custom_minimum_size.x = 88
	header.add_child(title)
	var header_spacer := Control.new()
	header_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(header_spacer)
	var close_button := Button.new()
	close_button.text = "닫기"
	close_button.custom_minimum_size = Vector2(68, 38)
	close_button.pressed.connect(_close)
	header.add_child(close_button)

	var search_margin := _margin_container(16, 16, 0, 10)
	body.add_child(search_margin)
	search_input = LineEdit.new()
	search_input.placeholder_text = "덱 · 카드 이름과 효과 · 에디션 · 장소 검색"
	search_input.clear_button_enabled = true
	search_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	search_input.custom_minimum_size.y = 42
	search_input.text_changed.connect(_refresh_results)
	search_margin.add_child(search_input)

	var tools_margin := _margin_container(16, 16, 0, 10)
	body.add_child(tools_margin)
	var filters := HBoxContainer.new()
	filters.add_theme_constant_override("separation", 7)
	tools_margin.add_child(filters)
	var button_group := ButtonGroup.new()
	for option in [["deck", "덱"], ["item", "아이템"], ["place", "특수 장소"]]:
		var button := Button.new()
		button.text = str(option[1])
		button.toggle_mode = true
		button.button_group = button_group
		button.button_pressed = str(option[0]) == selected_kind
		button.custom_minimum_size.y = 40
		button.pressed.connect(_on_kind_selected.bind(str(option[0])))
		filters.add_child(button)
	region_picker = OptionButton.new()
	region_picker.custom_minimum_size = Vector2(120, 40)
	region_picker.add_item("모든 지역", 0)
	region_ids = []
	if selected_region >= 0:
		region_ids.append(selected_region)
	for entry in entries:
		var entry_region := int(entry.get("region", SearchRules.ALL_REGIONS))
		if entry_region >= 0 and not region_ids.has(entry_region):
			region_ids.append(entry_region)
	region_ids.sort()
	for region_number in region_ids:
		region_picker.add_item("%d지역" % region_number, region_number + 1)
	var target_picker_id := 0 if selected_region < 0 else selected_region + 1
	for option_index in range(region_picker.item_count):
		if region_picker.get_item_id(option_index) == target_picker_id:
			region_picker.select(option_index)
			break
	region_picker.item_selected.connect(_on_region_selected)
	filters.add_child(region_picker)
	var tools_rule := ColorRect.new()
	tools_rule.color = Color("#484b40")
	tools_rule.custom_minimum_size.y = 1
	tools_rule.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(tools_rule)

	var content := HBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(content)
	result_panel = PanelContainer.new()
	result_panel.custom_minimum_size.x = maxf(160.0, minf(372.0, modal_panel.custom_minimum_size.x * 0.31824))
	result_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	result_panel.add_theme_stylebox_override("panel", _result_list_style())
	content.add_child(result_panel)
	var result_body := VBoxContainer.new()
	result_body.add_theme_constant_override("separation", 8)
	result_panel.add_child(result_body)
	result_count = Label.new()
	result_count.add_theme_font_size_override("font_size", 13)
	result_count.clip_text = true
	result_count.add_theme_color_override("font_color", Color("#a7aa9f"))
	result_body.add_child(result_count)
	var page_controls := HBoxContainer.new()
	result_body.add_child(page_controls)
	previous_page_button = Button.new()
	previous_page_button.text = "이전"
	previous_page_button.pressed.connect(_change_result_page.bind(-1))
	page_controls.add_child(previous_page_button)
	next_page_button = Button.new()
	next_page_button.text = "다음"
	next_page_button.pressed.connect(_change_result_page.bind(1))
	page_controls.add_child(next_page_button)
	results_scroll = ScrollContainer.new()
	results_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	results_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	results_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	results_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_SHOW_ALWAYS
	result_body.add_child(results_scroll)
	results_scroll.get_v_scroll_bar().value_changed.connect(_on_result_scroll_changed)
	result_list = VBoxContainer.new()
	result_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	result_list.add_theme_constant_override("separation", 7)
	results_scroll.add_child(result_list)

	var detail_panel := Control.new()
	detail_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(detail_panel)
	var detail_margin := _margin_container(16, 16, 14, 14)
	detail_margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	detail_panel.add_child(detail_margin)
	var detail_scroll := ScrollContainer.new()
	detail_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	detail_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	detail_margin.add_child(detail_scroll)
	detail_scroll.get_v_scroll_bar().value_changed.connect(_on_result_scroll_changed)
	detail_content = VBoxContainer.new()
	detail_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	detail_content.add_theme_constant_override("separation", 8)
	detail_scroll.add_child(detail_content)
	_refresh_results()
	search_input.call_deferred("grab_focus")


func _resize_modal() -> void:
	if not is_instance_valid(modal_panel):
		return
	var viewport_size := get_viewport_rect().size
	modal_panel.custom_minimum_size = Vector2(
		minf(1180.0, maxf(280.0, viewport_size.x - 32.0)),
		minf(900.0, maxf(420.0, viewport_size.y - 36.0))
	)
	if is_instance_valid(result_panel):
		result_panel.custom_minimum_size.x = maxf(160.0, minf(372.0, modal_panel.custom_minimum_size.x * 0.31824))


func _refresh_results(_text: String = "") -> void:
	if not is_instance_valid(result_list):
		return
	filtered_results = SearchRules.filter_entries(entries, selected_kind, selected_region, search_input.text)
	var selected_index := -1
	for index in range(filtered_results.size()):
		if _entry_key(filtered_results[index]) == selected_entry_key:
			selected_index = index
			break
	if selected_index < 0:
		selected_index = 0
		selected_entry_key = _entry_key(filtered_results[0]) if not filtered_results.is_empty() else ""
	result_page = selected_index / RESULT_PAGE_SIZE
	_render_result_page()


func _change_result_page(direction: int) -> void:
	var last_page := maxi(0, (filtered_results.size() - 1) / RESULT_PAGE_SIZE)
	result_page = clampi(result_page + direction, 0, last_page)
	var index := result_page * RESULT_PAGE_SIZE
	selected_entry_key = _entry_key(filtered_results[index]) if index < filtered_results.size() else ""
	_render_result_page()


func _render_result_page() -> void:
	_hide_card_preview()
	for child in result_list.get_children():
		result_list.remove_child(child)
		child.queue_free()
	var first := result_page * RESULT_PAGE_SIZE
	var last := mini(first + RESULT_PAGE_SIZE, filtered_results.size())
	result_count.text = "%d개 발견" % filtered_results.size()
	if not filtered_results.is_empty():
		result_count.text += " · %d–%d" % [first + 1, last]
	previous_page_button.disabled = first == 0
	next_page_button.disabled = last >= filtered_results.size()
	var selected: Dictionary = {}
	for index in range(first, last):
		var entry: Dictionary = filtered_results[index]
		result_list.add_child(_result_row(entry))
		if _entry_key(entry) == selected_entry_key:
			selected = entry
	if filtered_results.is_empty():
		var empty_row := Label.new()
		empty_row.text = "발견한 장소나 물품 중 일치하는 결과가 없습니다."
		empty_row.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		empty_row.add_theme_color_override("font_color", Color("#bfc0b3"))
		result_list.add_child(empty_row)
	results_scroll.scroll_vertical = 0
	_render_detail(selected)


func _result_row(entry: Dictionary) -> Control:
	var row := PanelContainer.new()
	row.custom_minimum_size.y = RESULT_PREVIEW_SIDE + 24.0
	row.mouse_filter = Control.MOUSE_FILTER_STOP
	row.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	var is_selected := _entry_key(entry) == selected_entry_key
	var row_style := _panel_style(Color("#292319") if is_selected else Color("#0c0d0c"),
		Color("#efb45e") if is_selected else Color("#80613e"), 0)
	row_style.set_border_width_all(2)
	row.add_theme_stylebox_override("panel", row_style)
	row.gui_input.connect(_on_result_row_input.bind(_entry_key(entry)))
	var row_margin := MarginContainer.new()
	row_margin.mouse_filter = Control.MOUSE_FILTER_PASS
	for side in ["left", "right", "top", "bottom"]:
		row_margin.add_theme_constant_override("margin_" + side, 10)
	row.add_child(row_margin)
	var line := HBoxContainer.new()
	line.mouse_filter = Control.MOUSE_FILTER_PASS
	line.add_theme_constant_override("separation", 12)
	row_margin.add_child(line)
	var copy := VBoxContainer.new()
	copy.mouse_filter = Control.MOUSE_FILTER_PASS
	copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	copy.add_theme_constant_override("separation", 3)
	copy.alignment = BoxContainer.ALIGNMENT_CENTER
	line.add_child(copy)
	var title_row := HBoxContainer.new()
	title_row.mouse_filter = Control.MOUSE_FILTER_PASS
	title_row.add_theme_constant_override("separation", 6)
	copy.add_child(title_row)
	var name_label := Label.new()
	name_label.text = str(entry["label"])
	name_label.add_theme_font_override("font", DeckHeading._font_800())
	name_label.add_theme_font_size_override("font_size", DeckHeading.NAME_SIZE)
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.clip_text = true
	name_label.mouse_filter = Control.MOUSE_FILTER_PASS
	title_row.add_child(name_label)
	var position: Vector2i = entry["position"]
	var detail := str(entry.get("detail", ""))
	var meta_parts: Array[String] = ["%d지역" % int(entry["region"])]
	var deck: Dictionary = entry.get("deck", {})
	if not deck.is_empty():
		meta_parts.append("%d/%d장" % [int(deck.get("cards", []).size()), int(deck.get("capacity", 0))])
	if not detail.is_empty() and str(entry.get("kind", "")) != "deck":
		meta_parts.append(detail)
	var count := int(entry.get("count", 1))
	if count > 1:
		meta_parts.append("x%d" % count)
	var subtitle := Label.new()
	subtitle.text = " · ".join(meta_parts)
	subtitle.add_theme_font_override("font", DeckHeading._font_arial_700())
	subtitle.add_theme_font_size_override("font_size", DeckHeading.COUNT_SIZE)
	subtitle.add_theme_color_override("font_color", DeckHeading.MUTED_COLOR)
	subtitle.clip_text = true
	subtitle.mouse_filter = Control.MOUSE_FILTER_PASS
	copy.add_child(subtitle)
	if not deck.is_empty():
		var editions: Array = deck.get("editions", [])
		if not editions.is_empty():
			var edition_list := DeckEditionList.build(editions, deck.get("edition_colors", {}), DeckHeading.HeadingFont,
				DeckHeading.EDITION_SIZE, Color("#db8a3d"), 3)
			for label in edition_list.get_children():
				var label_width: float = minf(label.get_combined_minimum_size().x, 120.0)
				label.clip_text = true
				label.custom_minimum_size.x = label_width
			var edition_clip := Control.new()
			edition_clip.custom_minimum_size.y = 30.0
			edition_clip.clip_contents = true
			edition_clip.mouse_filter = Control.MOUSE_FILTER_PASS
			copy.add_child(edition_clip)
			edition_list.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
			edition_clip.add_child(edition_list)
			copy.move_child(subtitle, copy.get_child_count() - 1)
	var thumbnail := CenterContainer.new()
	thumbnail.name = "SearchResultThumbnail"
	thumbnail.custom_minimum_size = Vector2.ONE * RESULT_PREVIEW_SIDE
	thumbnail.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	thumbnail.mouse_filter = Control.MOUSE_FILTER_IGNORE
	line.add_child(thumbnail)
	var card: Dictionary = entry.get("card", {})
	if not card.is_empty():
		# Search rows already show xN in the subtitle. Browser search previews a single card,
		# so don't draw a second stacked-card badge/band here.
		thumbnail.add_child(_compact_card_preview(card))
	elif str(entry["kind"]) == "deck" and not bool(entry.get("in_vault", false)):
		var icon := TextureRect.new()
		icon.name = "SearchDeckIcon"
		icon.texture = DeckIconArt.RARE
		icon.material = DeckIconArt.palette_material()
		icon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.custom_minimum_size = Vector2.ONE * RESULT_PREVIEW_SIDE
		icon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		thumbnail.add_child(icon)
	elif str(entry["kind"]) == "place" or bool(entry.get("in_vault", false)):
		var tile := SearchTilePreview.new()
		var map_seed := int(run_state.get("map_seed", run_state.get("map", {}).get("seed", 0)))
		tile.configure(run_state.get("map", {}), position, Vector2.ONE * RESULT_PREVIEW_SIDE, map_seed)
		thumbnail.add_child(tile)
	elif not entry.get("consumable", {}).is_empty():
		var ticket := Control.new()
		var ticket_front := Panel.new()
		ConsumableTicketVisual.configure_compact(ticket, ticket_front, entry["consumable"], 1)
		ticket_front.mouse_filter = Control.MOUSE_FILTER_IGNORE
		thumbnail.add_child(ticket)
	return row


func _render_detail(entry: Dictionary) -> void:
	if not is_instance_valid(detail_content):
		return
	_hide_card_preview()
	for child in detail_content.get_children():
		detail_content.remove_child(child)
		child.queue_free()
	if entry.is_empty():
		var empty := Label.new()
		empty.text = "검색어와 필터를 바꿔 보세요."
		empty.add_theme_color_override("font_color", Color("#a7aa9f"))
		detail_content.add_child(empty)
		return
	var position: Vector2i = entry["position"]
	var deck: Dictionary = entry.get("deck", {})
	var card: Dictionary = entry.get("card", {})
	var consumable: Dictionary = entry.get("consumable", {})
	var summary := HBoxContainer.new()
	summary.add_theme_constant_override("separation", 20)
	detail_content.add_child(summary)
	var selection := VBoxContainer.new()
	selection.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	selection.size_flags_vertical = Control.SIZE_EXPAND_FILL
	selection.alignment = BoxContainer.ALIGNMENT_END if not deck.is_empty() else BoxContainer.ALIGNMENT_BEGIN
	selection.add_theme_constant_override("separation", 8)
	summary.add_child(selection)
	var title_row := HBoxContainer.new()
	title_row.add_theme_constant_override("separation", 12)
	selection.add_child(title_row)
	var title := Label.new()
	title.text = str(entry["label"])
	title.add_theme_font_override("font", DeckHeading._font_800())
	title.add_theme_font_size_override("font_size", 20 if deck.is_empty() else 26)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.clip_text = true
	title_row.add_child(title)
	var ping_label := str(entry["label"])
	if not deck.is_empty():
		ping_label = str(deck.get("name", ping_label))
	var ping_button := Button.new()
	ping_button.text = "핑 해제" if ping_position == position else "핑 찍기"
	ping_button.custom_minimum_size = Vector2(112, 38)
	_style_ping_button(ping_button)
	ping_button.pressed.connect(_emit_ping.bind(position, ping_label))
	title_row.add_child(ping_button)
	if deck.is_empty():
		var meta := Label.new()
		meta.text = "%d지역" % int(entry["region"])
		meta.add_theme_color_override("font_color", Color("#a7aa9f"))
		selection.add_child(meta)
	else:
		var deck_count := _detail_label("%d / %d" % [int(deck.get("cards", []).size()), int(deck.get("capacity", 0))],
			DeckHeading.COUNT_SIZE, DeckHeading.MUTED_COLOR)
		deck_count.add_theme_font_override("font", DeckHeading._font_arial_700())
		selection.add_child(deck_count)
	if not deck.is_empty():
		var editions: Array = deck.get("editions", [])
		if not editions.is_empty():
			var edition_list := DeckEditionList.build(editions, deck.get("edition_colors", {}), DeckHeading.HeadingFont,
				DeckHeading.EDITION_SIZE, Color("#db8a3d"), 4)
			selection.add_child(edition_list)
			selection.move_child(edition_list, 1)
	var sticker_id := str(entry.get("sticker_id", ""))
	if not sticker_id.is_empty():
		var sticker_info: Dictionary = CardStickers.STICKERS.get(sticker_id, {})
		var sticker_row := HBoxContainer.new()
		sticker_row.add_theme_constant_override("separation", 8)
		var sticker_icon: Control = StickerArt.new()
		sticker_icon.call("configure", sticker_id, 36.0)
		sticker_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		sticker_row.add_child(sticker_icon)
		var sticker_description := _detail_label("%s · %s" % [str(sticker_info.get("name", "스티커")),
			str(sticker_info.get("description", ""))], 14, Color("#d9e5e0"))
		sticker_description.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		sticker_row.add_child(sticker_description)
		selection.add_child(sticker_row)
	var count := int(entry.get("count", 1))
	if count > 1:
		selection.add_child(_detail_label("보유 수량 x%d" % count, 13, Color("#a7aa9f")))
	var container_detail := str(entry.get("detail", ""))
	if not container_detail.is_empty():
		selection.add_child(_detail_label(container_detail, 13, Color("#bec0b4")))
	if not card.is_empty() and card_widget_builder.is_valid():
		var card_holder := CenterContainer.new()
		card_holder.custom_minimum_size.y = 210
		card_holder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var card_preview := card_widget_builder.call(card, false, false) as Control
		card_preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
		card_holder.add_child(card_preview)
		selection.add_child(card_holder)
	elif not consumable.is_empty():
		var item_holder := CenterContainer.new()
		item_holder.custom_minimum_size.y = 210
		item_holder.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		item_holder.add_child(_consumable_preview(consumable))
		selection.add_child(item_holder)
	var region_minimap := SearchRegionMinimap.new()
	var player: Vector2i = run_state.get("position", Vector2i.ZERO)
	region_minimap.configure(run_state.get("map", {}), int(entry["region"]), position, player, player_marker)
	region_minimap.custom_minimum_size = Vector2(420, 260)
	summary.add_child(region_minimap)

	if not deck.is_empty():
		var deck_gap := Control.new()
		deck_gap.custom_minimum_size.y = 8.0
		deck_gap.mouse_filter = Control.MOUSE_FILTER_IGNORE
		detail_content.add_child(deck_gap)
		var grouped_cards: Array = SearchRules.group_cards(deck.get("cards", []))
		var all_cards: Array = deck.get("cards", [])
		if grouped_cards.is_empty() and int(deck.get("capacity", 0)) <= 0:
			return
		else:
			var card_flow := HFlowContainer.new()
			card_flow.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			card_flow.add_theme_constant_override("h_separation", 10)
			card_flow.add_theme_constant_override("v_separation", 10)
			detail_content.add_child(card_flow)
			var rare_card_count := 0
			var normal_card_count := 0
			for raw_card in all_cards:
				if str(raw_card.get("rarity", "")) in ["rare", "legendary"]:
					rare_card_count += 1
				else:
					normal_card_count += 1
			var royal: bool = deck.get("editions", []).has("royal")
			var rare_slot_capacity := maxi(DeckEditions.rare_slot_capacity(deck), rare_card_count)
			var normal_slot_capacity := maxi(0, int(deck.get("capacity", all_cards.size())) - rare_slot_capacity)
			for deck_card_value in grouped_cards:
				var deck_card: Dictionary = deck_card_value["card"]
				if royal or str(deck_card.get("rarity", "")) in ["rare", "legendary"]:
					card_flow.add_child(_compact_card_preview(deck_card, int(deck_card_value["count"]), true))
			for _slot_index in range(maxi(0, rare_slot_capacity - (all_cards.size() if royal else rare_card_count))):
				card_flow.add_child(_deck_slot_preview(true))
			if rare_slot_capacity > 0 and not royal:
				var divider := ColorRect.new()
				divider.color = Color("#484b40")
				divider.custom_minimum_size = Vector2(1, 82)
				card_flow.add_child(divider)
			for deck_card_value in grouped_cards:
				var deck_card: Dictionary = deck_card_value["card"]
				if not royal and str(deck_card.get("rarity", "")) not in ["rare", "legendary"]:
					card_flow.add_child(_compact_card_preview(deck_card, int(deck_card_value["count"]), true))
			for _slot_index in range(maxi(0, normal_slot_capacity - normal_card_count)):
				card_flow.add_child(_deck_slot_preview(false))


func _deck_slot_preview(rare: bool) -> Control:
	var slot := PanelContainer.new()
	slot.custom_minimum_size = Vector2.ONE * 82.0
	slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.84, 0.66, 0.16, 0.18) if rare else Color(1, 1, 1, 0.045)
	style.border_color = Color(0.84, 0.66, 0.16, 0.88) if rare else Color(1, 1, 1, 0.25)
	style.set_border_width_all(1)
	style.set_corner_radius_all(4 if rare else 3)
	slot.add_theme_stylebox_override("panel", style)
	return slot


func _compact_card_preview(card: Dictionary, count: int = 1, allow_hover_preview: bool = false) -> Control:
	var stack_layers := mini(5, maxi(0, count - 1))
	var slot := Control.new()
	slot.custom_minimum_size = CompactCardView.CARD_SIZE + Vector2(stack_layers * 7.0, 0.0)
	slot.mouse_filter = Control.MOUSE_FILTER_PASS if allow_hover_preview else Control.MOUSE_FILTER_IGNORE
	var card_view: Control = CompactCardView.create(
		card, count,
		Callable(self, "_show_card_hover_preview"),
		Callable(self, "_hide_card_preview"),
		Callable(self, "_hide_card_preview"), null, allow_hover_preview
	)
	card_view.position = Vector2(stack_layers * 7.0, 0.0)
	card_view.size = CompactCardView.CARD_SIZE
	card_view.pivot_offset = Vector2.ZERO
	card_view.scale = Vector2.ONE
	card_view.mouse_filter = Control.MOUSE_FILTER_PASS if allow_hover_preview else Control.MOUSE_FILTER_IGNORE
	slot.add_child(card_view)
	return slot


func _on_result_scroll_changed(_value: float) -> void:
	_hide_card_preview()


func _show_card_hover_preview(source: Control, card: Dictionary) -> void:
	_hide_card_preview()
	if not is_instance_valid(source) or card.is_empty() or not card_widget_builder.is_valid():
		return
	var preview := card_widget_builder.call(card, false, false) as Control
	if not is_instance_valid(preview):
		return
	preview.custom_minimum_size = Vector2(149.6, 210.1)
	preview.size = Vector2(149.6, 210.1)
	var frame := CardHoverPreview.create(preview)
	add_child(frame)
	var source_rect := source.get_global_rect()
	var viewport_size := get_viewport_rect().size
	frame.global_position = CardHoverPreview.position_for(source_rect, viewport_size)
	source.set_meta("card_hover_preview_ref", weakref(frame))
	active_card_preview = frame


func _hide_card_preview() -> void:
	if is_instance_valid(active_card_preview):
		active_card_preview.queue_free()
	active_card_preview = null


func _consumable_preview(consumable: Dictionary) -> Control:
	return ConsumableTicketVisual.create_full(consumable)


func _style_ping_button(button: Button) -> void:
	button.add_theme_font_override("font", DeckHeading.HeadingFont)
	button.add_theme_font_size_override("font_size", 14)
	for mode in ["normal", "hover", "pressed", "hover_pressed"]:
		var background := Color("#e8b45d")
		if mode == "hover":
			background = Color("#ffd589")
		elif mode in ["pressed", "hover_pressed"]:
			background = Color("#cd963e")
		var style := _panel_style(background, Color("#ffcf7a"), 8)
		style.set_border_width_all(2)
		style.set_corner_radius_all(5)
		button.add_theme_stylebox_override(mode, style)
	for mode in ["font_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color", "font_focus_color"]:
		button.add_theme_color_override(mode, Color("#191c16"))


func _detail_label(text: String, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label


func _entry_key(entry: Dictionary) -> String:
	if entry.has("search_entry_key"):
		return str(entry.search_entry_key)
	var position: Vector2i = entry.get("position", Vector2i.ZERO)
	var payload_key := "%s|%s|%s|%d" % [str(entry.get("detail", "")),
		str(entry.get("card", {})), str(entry.get("consumable", {})), int(entry.get("count", 1))]
	return "%s|%s|%d|%d|%s" % [str(entry.get("kind", "")), str(entry.get("label", "")),
		position.x, position.y, payload_key]


func _on_result_row_input(event: InputEvent, entry_key: String) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		selected_entry_key = entry_key
		_refresh_results()
		get_viewport().set_input_as_handled()


func _on_kind_selected(kind: String) -> void:
	selected_kind = kind
	selected_entry_key = ""
	_refresh_results()


func _on_region_selected(index: int) -> void:
	var picked_id := region_picker.get_item_id(index)
	selected_region = SearchRules.ALL_REGIONS if picked_id <= 0 else picked_id - 1
	selected_entry_key = ""
	_refresh_results()


func _emit_ping(position: Vector2i, label: String) -> void:
	ping_requested.emit(position, label)
	_close()


func _on_backdrop_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		_close()


func _input(event: InputEvent) -> void:
	# Focused text fields consume Escape before _unhandled_key_input can see it.
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		get_viewport().set_input_as_handled()
		_close()


func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_F and (event.ctrl_pressed or event.meta_pressed):
			focus_search()
		get_viewport().set_input_as_handled()


func focus_search() -> void:
	if not is_instance_valid(search_input):
		return
	search_input.grab_focus()
	search_input.select_all()


func _close() -> void:
	queue_free()


func _margin_container(left: int, right: int, top: int, bottom: int) -> MarginContainer:
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", left)
	margin.add_theme_constant_override("margin_right", right)
	margin.add_theme_constant_override("margin_top", top)
	margin.add_theme_constant_override("margin_bottom", bottom)
	return margin


func _result_list_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#141816")
	style.border_color = Color("#484b40")
	style.set_border_width_all(0)
	style.border_width_right = 1
	style.content_margin_left = 10
	style.content_margin_top = 10
	style.content_margin_right = 10
	style.content_margin_bottom = 10
	return style


func _panel_style(background: Color, border: Color, content_margin := 10) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.content_margin_left = content_margin
	style.content_margin_top = content_margin
	style.content_margin_right = content_margin
	style.content_margin_bottom = content_margin
	return style
