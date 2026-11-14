extends Control
class_name PortCardPoolStatsPanel

signal close_requested

const CompactCardView = preload("res://scripts/compact_card_view.gd")
const CardCatalog = preload("res://scripts/card_catalog.gd")
const DeckVaultCardView = preload("res://scripts/deck_vault_card_view.gd")

const PANEL_BG := Color(0.063, 0.086, 0.075, 0.98)
const CARD_BG := Color(1.0, 1.0, 1.0, 0.045)
const GROUP_BORDER := Color(1.0, 1.0, 1.0, 0.18)
const RARITIES := [
	["legendary", "전설 카드"], ["rare", "희귀 카드"], ["special", "특별 카드"],
	["basic", "일반 카드"], ["starter", "시작 카드"], ["status", "상태이상 카드"],
]
const RARITY_ORDER := {"legendary": 0, "rare": 1, "special": 2, "basic": 3, "starter": 4, "status": 5}
const ATTACK_EFFECTS := ["radiance", "sweep", "double_hit", "iron_rampage", "magic_strike", "shockwave", "meteor", "hydra"]
const DRAW_EFFECTS := [
	"librarians_privilege", "pommel", "deflect", "prepare", "draw_each_pile", "dash", "quick_step",
	"battle_plan", "file_draw", "flood", "adrenaline", "astronomy_research", "necromancy_research",
	"saeongjima", "foresight", "parallel_mirror", "overcharge",
]
const ENERGY_EFFECTS := [
	"battle_preparation", "focus", "adrenaline", "pruning", "ventilate", "plate_armor", "charge",
	"flood", "end_start", "supernova", "aries", "economics_research", "critical_reaction",
]
const DEFENSE_EFFECTS := [
	"scale_armor", "defend", "deflect", "ice_shield", "water_wave", "plate_armor_defense", "star_guard",
	"star_ark", "iron_wave", "iron_rampage", "suppression", "odin_spear", "silver_sword", "sturdy_stance",
	"iron_song", "steel_storm", "at_field",
]
const STAR_EFFECTS := [
	"recycling", "battle_plan", "ruler_compass", "starlight", "star_guard", "star_ark", "super_strategist",
	"flood", "aries", "astronomy_research", "necromancy_research", "nebula",
]
const STATUS_EFFECTS := [
	"battle_cry", "shatter", "knee_strike", "resistance_ward", "battle_preparation", "scale_armor",
	"four_seasons", "unyielding", "demolish", "beastification", "metalization", "sand_toss", "iron_song",
	"foresight", "transcend", "steel_storm", "at_field", "overcharge", "critical_reaction", "warm_up",
	"rapid_fire", "counter", "supernova", "mirror_image", "light_travel_time", "wolf_talisman", "turtle_talisman",
]
const PHYSICAL_DEFENSE_EFFECTS := [
	"scale_armor", "deflect", "star_guard", "plate_armor_defense", "iron_wave", "iron_rampage", "suppression",
	"star_ark", "odin_spear", "sturdy_stance", "iron_song", "steel_storm", "at_field",
]
const MAGIC_DEFENSE_EFFECTS := ["ice_shield", "water_wave", "star_ark", "silver_sword"]

var _tooltip_theme: Theme
var _hover_enter: Callable
var _hover_exit: Callable
var _sticker_enter: Callable
var _cards: Array[Dictionary] = []
var _rows_by_key: Dictionary = {}
var _popover: PanelContainer
var _popover_title: Label
var _popover_cards: HFlowContainer
var _panel_size := Vector2(900, 760)


static func create(
		hover_enter: Callable = Callable(),
		hover_exit: Callable = Callable(),
		sticker_enter: Callable = Callable(),
		tooltip_theme: Theme = null) -> PortCardPoolStatsPanel:
	var panel := PortCardPoolStatsPanel.new()
	panel._hover_enter = hover_enter
	panel._hover_exit = hover_exit
	panel._sticker_enter = sticker_enter
	panel._tooltip_theme = tooltip_theme
	panel._build()
	return panel


func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	focus_mode = Control.FOCUS_ALL
	grab_focus()
	_layout_panel()


func _gui_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_ESCAPE:
		close_requested.emit()
		accept_event()
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if not _panel_rect().has_point(event.position):
			close_requested.emit()
			accept_event()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_layout_panel()


func catalog_cards() -> Array[Dictionary]:
	return _cards.duplicate(true)


func bucket_cards(key: String) -> Array[Dictionary]:
	var bucket: Dictionary = _rows_by_key.get(key, {})
	return (bucket.get("cards", []) as Array).duplicate(true)


func debug_summary() -> Dictionary:
	var output := {"total": _cards.size(), "rarities": {}, "groups": {}}
	for key in _rows_by_key:
		var row: Dictionary = _rows_by_key[key]
		var count := (row.get("cards", []) as Array).size()
		output.groups[key] = count
		if str(key).begins_with("rarity:"):
			output.rarities[str(key).trim_prefix("rarity:")] = count
	return output


func catalog_limitations() -> PackedStringArray:
	return PackedStringArray([
		"browser TEMPORARILY_REMOVED_CARD_POOL has five entries but is excluded from ALL_CARD_BLUEPRINTS and this panel",
		"native debug ALL deck appends five generated cards; those are not catalog blueprints and are excluded from this panel",
	])


func _build() -> void:
	_cards = _native_catalog()
	var overlay := ColorRect.new()
	overlay.name = "StatsBackdrop"
	overlay.color = Color(0, 0, 0, 0.68)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	overlay.gui_input.connect(func(event: InputEvent) -> void:
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			close_requested.emit())
	add_child(overlay)

	var center := CenterContainer.new()
	center.name = "StatsCenter"
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var frame := PanelContainer.new()
	frame.name = "StatsPanel"
	frame.custom_minimum_size = _panel_size
	frame.size = _panel_size
	frame.mouse_filter = Control.MOUSE_FILTER_STOP
	frame.add_theme_stylebox_override("panel", _panel_style())
	center.add_child(frame)

	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 0)
	frame.add_child(content)
	_build_header(content)

	var scroller := ScrollContainer.new()
	scroller.name = "StatsScroll"
	scroller.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroller.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	content.add_child(scroller)
	var body := VBoxContainer.new()
	body.name = "StatsGrid"
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 10)
	body.add_theme_stylebox_override("panel", _body_margin_style())
	scroller.add_child(body)

	var first_row := HBoxContainer.new()
	first_row.add_theme_constant_override("separation", 10)
	body.add_child(first_row)
	var rarity := _make_group("희귀도", _rarity_rows())
	var kind := _make_group("카드 유형", _kind_rows())
	rarity.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	kind.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	first_row.add_child(rarity)
	first_row.add_child(kind)

	var second_row := HBoxContainer.new()
	second_row.add_theme_constant_override("separation", 10)
	body.add_child(second_row)
	var cost := _make_group("코스트", _cost_rows())
	cost.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	second_row.add_child(cost)
	var keywords := _make_group("키워드·기능", _keyword_rows())
	keywords.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(keywords)

	_build_popover()


func _build_header(parent: VBoxContainer) -> void:
	var header := HBoxContainer.new()
	header.name = "StatsHeader"
	header.add_theme_constant_override("separation", 16)
	header.add_theme_stylebox_override("panel", _header_style())
	parent.add_child(header)
	var labels := VBoxContainer.new()
	labels.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	labels.add_theme_constant_override("separation", 2)
	header.add_child(labels)
	var eyebrow := Label.new()
	eyebrow.text = "DEBUG · CARD POOL"
	eyebrow.add_theme_font_size_override("font_size", 10)
	eyebrow.add_theme_color_override("font_color", Color("#a9c6b1"))
	labels.add_child(eyebrow)
	var title := Label.new()
	title.text = "카드 풀 통계"
	title.add_theme_font_size_override("font_size", 22)
	labels.add_child(title)
	var subtitle := Label.new()
	subtitle.text = "대상 %d장 · 적 토큰 제외" % _cards.size()
	subtitle.add_theme_font_size_override("font_size", 11)
	subtitle.add_theme_color_override("font_color", Color("#c4cec7"))
	labels.add_child(subtitle)
	var close := Button.new()
	close.text = "닫기"
	close.focus_mode = Control.FOCUS_ALL
	close.custom_minimum_size = Vector2(72, 34)
	close.add_theme_color_override("font_color", Color.WHITE)
	close.add_theme_stylebox_override("normal", _close_style())
	close.add_theme_stylebox_override("hover", _close_style(Color(1, 1, 1, 0.18)))
	close.pressed.connect(func() -> void: close_requested.emit())
	header.add_child(close)


func _build_popover() -> void:
	_popover = PanelContainer.new()
	_popover.name = "StatCardsPopover"
	_popover.visible = false
	_popover.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_popover.z_index = 20
	_popover.custom_minimum_size = Vector2(280, 120)
	_popover.add_theme_stylebox_override("panel", _popover_style())
	add_child(_popover)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 8)
	_popover.add_child(column)
	_popover_title = Label.new()
	_popover_title.add_theme_font_size_override("font_size", 13)
	_popover_title.add_theme_color_override("font_color", Color("#e9f4eb"))
	column.add_child(_popover_title)
	var scroll := ScrollContainer.new()
	scroll.name = "StatCardsScroll"
	scroll.custom_minimum_size = Vector2(0, 160)
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	column.add_child(scroll)
	_popover_cards = HFlowContainer.new()
	_popover_cards.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_popover_cards.add_theme_constant_override("h_separation", 6)
	_popover_cards.add_theme_constant_override("v_separation", 6)
	scroll.add_child(_popover_cards)


func _make_group(title_text: String, rows: Array[Dictionary]) -> PanelContainer:
	var group := PanelContainer.new()
	group.custom_minimum_size.y = 190
	group.add_theme_stylebox_override("panel", _group_style())
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 7)
	group.add_child(column)
	var heading := Label.new()
	heading.text = title_text
	heading.add_theme_font_size_override("font_size", 15)
	heading.add_theme_color_override("font_color", Color("#e9f4eb"))
	column.add_child(heading)
	for row_data in rows:
		var cards: Array[Dictionary] = row_data.get("cards", [])
		var key := str(row_data.get("key", title_text + ":" + str(row_data.get("label", ""))))
		_rows_by_key[key] = {"label": str(row_data.get("label", "")), "cards": cards}
		column.add_child(_make_stat_row(key, cards))
	return group


func _make_stat_row(key: String, cards: Array[Dictionary]) -> Control:
	var row := Button.new()
	row.name = "StatRow_%s" % key.replace(":", "_")
	row.custom_minimum_size.y = 38
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.focus_mode = Control.FOCUS_ALL
	row.mouse_default_cursor_shape = Control.CURSOR_HELP
	row.add_theme_stylebox_override("normal", _row_style())
	row.add_theme_stylebox_override("hover", _row_style(Color(1, 1, 1, 0.08)))
	row.add_theme_stylebox_override("focus", _row_focus_style())
	var count := cards.size()
	var total := maxi(1, _cards.size())
	var percent := 100.0 * float(count) / float(total)
	var inner := VBoxContainer.new()
	inner.mouse_filter = Control.MOUSE_FILTER_IGNORE
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.add_theme_constant_override("separation", 3)
	row.add_child(inner)
	var data_line := HBoxContainer.new()
	data_line.add_theme_constant_override("separation", 8)
	inner.add_child(data_line)
	var name_label := Label.new()
	name_label.text = str((_rows_by_key.get(key, {}) as Dictionary).get("label", key))
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	name_label.add_theme_font_size_override("font_size", 12)
	data_line.add_child(name_label)
	var count_label := Label.new()
	count_label.text = "%d장 · %.1f%%" % [count, percent]
	count_label.add_theme_font_size_override("font_size", 11)
	count_label.add_theme_color_override("font_color", Color("#c4cec7"))
	data_line.add_child(count_label)
	var bar := ProgressBar.new()
	bar.custom_minimum_size.y = 4
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.show_percentage = false
	bar.max_value = 100.0
	bar.value = percent
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_theme_stylebox_override("background", _progress_bg())
	bar.add_theme_stylebox_override("fill", _progress_fill())
	inner.add_child(bar)
	row.mouse_entered.connect(func() -> void: _show_bucket(key, false))
	row.mouse_exited.connect(_hide_bucket)
	row.focus_entered.connect(func() -> void: _show_bucket(key, true))
	row.focus_exited.connect(_hide_bucket)
	return row


func _show_bucket(key: String, from_focus: bool) -> void:
	var bucket: Dictionary = _rows_by_key.get(key, {})
	var source_cards: Array = bucket.get("cards", [])
	var ordered: Array[Dictionary] = []
	for card in source_cards:
		ordered.append(card)
	ordered.sort_custom(_card_less)
	for child in _popover_cards.get_children():
		child.queue_free()
	for card in ordered:
		_popover_cards.add_child(CompactCardView.create(card, 1, _hover_enter, _hover_exit, _sticker_enter,
			_tooltip_theme, true))
	_popover_title.text = "%s 카드 목록" % str(bucket.get("label", key))
	var anchor := Vector2.ZERO
	if from_focus:
		var focused := get_viewport().gui_get_focus_owner() as Control
		if focused != null:
			anchor = focused.position + Vector2(focused.size.x + 16, 0)
	else:
		anchor = get_global_mouse_position() + Vector2(16, 12)
	var viewport_size := get_viewport_rect().size
	var popover_size := Vector2(minf(420, viewport_size.x - 24), minf(300, viewport_size.y - 24))
	_popover.custom_minimum_size = popover_size
	_popover.size = popover_size
	_popover.position = Vector2(
		clampf(anchor.x, 12, maxf(12, viewport_size.x - popover_size.x - 12)),
		clampf(anchor.y, 12, maxf(12, viewport_size.y - popover_size.y - 12)))
	_popover.visible = true


func _hide_bucket() -> void:
	_popover.visible = false


func _rarity_rows() -> Array[Dictionary]:
	var rows: Array[Dictionary] = []
	for item in RARITIES:
		var rarity := str(item[0])
		rows.append(_row("rarity:" + rarity, str(item[1]), func(card: Dictionary) -> bool: return str(card.get("rarity", "")) == rarity))
	return rows


func _kind_rows() -> Array[Dictionary]:
	return [
		_row("kind:attack", "공격 카드", func(card: Dictionary) -> bool:
			return str(card.get("kind", "")) == "strike" or _canonical_effect(card) in ATTACK_EFFECTS),
		_row("kind:physical", "방어를 주는 카드", func(card: Dictionary) -> bool:
			return _gives_physical_defense(card) and not _gives_magic_defense(card)),
		_row("kind:magic", "마법 방어를 주는 카드", func(card: Dictionary) -> bool:
			return _gives_magic_defense(card) and not _gives_physical_defense(card)),
		_row("kind:both", "방어·마법 방어를 모두 주는 카드", func(card: Dictionary) -> bool:
			return _gives_physical_defense(card) and _gives_magic_defense(card)),
	]


func _cost_rows() -> Array[Dictionary]:
	var costs: Array[int] = []
	for card in _cards:
		var value := _pool_cost(card)
		if not costs.has(value): costs.append(value)
	costs.sort()
	var rows: Array[Dictionary] = []
	for cost in costs:
		var label := "사용 불가" if cost == -1 else "%d 코스트" % cost
		rows.append(_row("cost:" + str(cost), label, func(card: Dictionary) -> bool: return _pool_cost(card) == cost))
	return rows


func _keyword_rows() -> Array[Dictionary]:
	return [
		_row("keyword:draw", "드로우", func(card: Dictionary) -> bool: return int(card.get("draw", 0)) > 0 or _canonical_effect(card) in DRAW_EFFECTS),
		_row("keyword:energy", "에너지 생성", func(card: Dictionary) -> bool: return _canonical_effect(card) in ENERGY_EFFECTS),
		_row("keyword:defense", "방어 효과", func(card: Dictionary) -> bool: return _canonical_effect(card) in DEFENSE_EFFECTS),
		_row("keyword:star", "★ 획득", func(card: Dictionary) -> bool: return _canonical_effect(card) in STAR_EFFECTS),
		_row("keyword:status", "상태 효과", func(card: Dictionary) -> bool: return _canonical_effect(card) in STATUS_EFFECTS),
		_row("keyword:rule", "룰", func(card: Dictionary) -> bool: return bool(card.get("rule", false))),
		_row("keyword:forge", "재련", func(card: Dictionary) -> bool: return _is_forge_card(card)),
		_row("keyword:exhaust", "소멸", func(card: Dictionary) -> bool: return bool(card.get("exhaust", false))),
	]


func _row(key: String, label: String, matcher: Callable) -> Dictionary:
	var matching: Array[Dictionary] = []
	for card in _cards:
		if matcher.call(card): matching.append(card)
	return {"key": key, "label": label, "cards": matching}


func _native_catalog() -> Array[Dictionary]:
	var output: Array[Dictionary] = []
	var seen := {}
	for pool in [CardCatalog.STARTER_CARDS, CardCatalog.BASIC_CARDS, CardCatalog.LEGACY_SPECIAL_CARDS,
			CardCatalog.SPECIAL_CARDS,
			CardCatalog.RARE_CARDS, CardCatalog.LEGENDARY_CARDS]:
		for blueprint: Dictionary in pool:
			if bool(blueprint.get("enemy_token", blueprint.get("enemyToken", false))):
				continue
			var key := "%s|%s" % [str(blueprint.get("name", "")), _canonical_effect(blueprint)]
			if seen.has(key): continue
			seen[key] = true
			output.append(blueprint.duplicate(true))
	return output


func _canonical_effect(card: Dictionary) -> String:
	var effect := str(card.get("effect", ""))
	var explicit_aliases := {
		"draw_each_file": "draw_each_pile",
		"for_each_file": "draw_each_pile",
	}
	return str(explicit_aliases.get(effect, effect))


func _pool_cost(card: Dictionary) -> int:
	var effect := _canonical_effect(card)
	if effect in ["slime", "soil", "rock", "combat_manual", "grimoire", "wolf_talisman", "turtle_talisman", "saeongjima"]:
		return -1
	if not card.has("cost"):
		return -1
	return int(card.get("cost", 0))


func _gives_physical_defense(card: Dictionary) -> bool:
	var effect := _canonical_effect(card)
	if effect == "defend":
		return str(card.get("damage_type", card.get("damageType", "physical"))) == "physical"
	return effect in PHYSICAL_DEFENSE_EFFECTS


func _gives_magic_defense(card: Dictionary) -> bool:
	var effect := _canonical_effect(card)
	if effect == "defend":
		return str(card.get("damage_type", card.get("damageType", "physical"))) == "magic"
	return effect in MAGIC_DEFENSE_EFFECTS


func _is_forge_card(card: Dictionary) -> bool:
	var costs: Array = card.get("forge_costs", [])
	return _canonical_effect(card) in ["obsidian_dagger", "odin_spear"] \
		or card.has("forge_cost") or not costs.is_empty() \
		or card.has("forge_target_name") or bool(card.get("forge_any", false))


func _card_less(left: Dictionary, right: Dictionary) -> bool:
	var left_rank := int(RARITY_ORDER.get(str(left.get("rarity", "")), 99))
	var right_rank := int(RARITY_ORDER.get(str(right.get("rarity", "")), 99))
	if left_rank != right_rank: return left_rank < right_rank
	var left_cost := _pool_cost(left)
	var right_cost := _pool_cost(right)
	if left_cost != right_cost: return left_cost < right_cost
	return DeckVaultCardView.name_less(str(left.get("name", "")), str(right.get("name", "")))


func _layout_panel() -> void:
	var frame := get_node_or_null("StatsCenter/StatsPanel") as Control
	if frame == null: return
	var view_size := get_viewport_rect().size
	var width := minf(900.0, maxf(320.0, view_size.x - 36.0))
	var height := minf(760.0, maxf(300.0, view_size.y - 44.0))
	frame.custom_minimum_size = Vector2(width, height)
	frame.size = Vector2(width, height)
	frame.position = (view_size - frame.size) * 0.5


func _panel_rect() -> Rect2:
	var frame := get_node_or_null("StatsCenter/StatsPanel") as Control
	return Rect2(frame.position, frame.size) if frame != null else Rect2()


func _panel_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = PANEL_BG
	style.border_color = Color("#6e6b62")
	style.set_border_width_all(1)
	style.set_corner_radius_all(6)
	style.shadow_color = Color(0, 0, 0, 0.52)
	style.shadow_size = 16
	style.shadow_offset = Vector2(0, 8)
	return style


func _header_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color.TRANSPARENT
	style.border_color = Color("#515751")
	style.border_width_bottom = 1
	style.content_margin_left = 18
	style.content_margin_right = 18
	style.content_margin_top = 16
	style.content_margin_bottom = 16
	return style


func _body_margin_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color.TRANSPARENT
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 14
	style.content_margin_bottom = 14
	return style


func _group_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = CARD_BG
	style.border_color = GROUP_BORDER
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	return style


func _row_style(color: Color = Color.TRANSPARENT) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.set_content_margin_all(0)
	return style


func _row_focus_style() -> StyleBoxFlat:
	var style := _row_style(Color(0.43, 0.65, 0.54, 0.12))
	style.border_color = Color("#b7d889")
	style.set_border_width_all(1)
	style.set_corner_radius_all(2)
	return style


func _progress_bg() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1, 1, 1, 0.10)
	style.set_corner_radius_all(99)
	return style


func _progress_fill() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#82b88c")
	style.set_corner_radius_all(99)
	return style


func _close_style(color: Color = Color(1, 1, 1, 0.1)) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = Color("#89978c")
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style


func _popover_style() -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.059, 0.09, 0.074, 0.98)
	style.border_color = Color("#9fb4a6")
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	style.shadow_color = Color(0, 0, 0, 0.48)
	style.shadow_size = 10
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	return style
