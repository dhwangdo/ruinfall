extends Button

const CardDragPreviewLayer = preload("res://scripts/card_drag_preview_layer.gd")
const BattleFreePlayDrop = preload("res://scripts/battle_free_play_drop.gd")

signal card_dropped(payload: Dictionary, target_kind: String, target_index: int)

var target_kind := "file"
var target_index := -1
var accepts_battle_drops := false
var drag_payload: Dictionary = {}
var drag_preview_widget: Control
var file_drag_cards: Array = []
var file_drag_previews: Dictionary = {}
var file_stack_offset := 27.0
var drop_extension_bottom := 48.0
var drop_exclusion_controls: Array[Control] = []
var drop_validator: Callable
var drop_point_validator: Callable
var drop_style_resolver: Callable
var drag_hover_valid := false
var drag_prompt: Control
var choice_hovered := false
var _drop_guide_layers: Dictionary = {}
var _drop_guide_style := "none"
var _drop_guide_hovered := false

const DROP_GUIDE_FORGE := "forge"
const DROP_GUIDE_SOLITAIRE := "solitaire"


func _get_drag_data(at_position: Vector2) -> Variant:
	if drag_payload.is_empty() or at_position.y >= size.y:
		return null
	var payload: Dictionary = drag_payload.duplicate(true)
	var preview: Control
	if not file_drag_cards.is_empty():
		var card_index := clampi(int(floor(at_position.y / file_stack_offset)), 0, file_drag_cards.size() - 1)
		var card: Dictionary = file_drag_cards[card_index]
		if not bool(card.get("revealed", false)):
			return null
		payload["card_index"] = card_index
		payload["card_id"] = int(card.get("id", -1))
		payload["card_name"] = str(card.get("name", "카드"))
		var card_ids: Array = []
		preview = Control.new()
		for index in range(card_index, file_drag_cards.size()):
			card_ids.append(int(file_drag_cards[index].get("id", -1)))
			var source_preview: Control = file_drag_previews.get(index)
			if is_instance_valid(source_preview):
				var copy := source_preview.duplicate() as Control
				copy.set_script(null)
				copy.position = Vector2(0, float(index - card_index) * file_stack_offset)
				copy.size = Vector2(136, 191)
				copy.custom_minimum_size = Vector2(136, 191)
				copy.scale = Vector2.ONE
				copy.pivot_offset = Vector2.ZERO
				copy.mouse_filter = Control.MOUSE_FILTER_IGNORE
				preview.add_child(copy)
		preview.size = Vector2(136, 191 + float(card_ids.size() - 1) * file_stack_offset)
		payload["card_ids"] = card_ids
	elif is_instance_valid(drag_preview_widget):
		preview = drag_preview_widget.duplicate() as Control
		preview.set_script(null)
		preview.size = Vector2(136, 191)
		preview.custom_minimum_size = Vector2(136, 191)
		preview.scale = Vector2.ONE
		preview.pivot_offset = Vector2.ZERO
	else:
		var label := Label.new()
		label.text = str(drag_payload.get("card_name", "카드"))
		label.add_theme_font_size_override("font_size", 16)
		label.add_theme_color_override("font_color", Color("#f0c646"))
		label.custom_minimum_size = Vector2(100, 34)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		preview = label
	set_drag_preview(CardDragPreviewLayer.create(preview, Vector2(136, 191), "BattlePileCardDragPreview", true))
	return payload


func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	var can_accept := false
	if accepts_battle_drops and typeof(data) == TYPE_DICTIONARY \
			and str(data.get("kind", "")) == "battle-card":
		var source := str(data.get("source", ""))
		if target_kind in ["enemy", "center"]:
			can_accept = source == "hand" and _passes_drop_validator(data)
		elif target_kind == "file":
			if source == "hand":
				can_accept = _passes_drop_validator(data)
			elif source == "file":
				can_accept = int(data.get("source_index", -1)) != target_index \
					and _passes_drop_validator(data)
	if can_accept and drop_point_validator.is_valid():
		can_accept = bool(drop_point_validator.call())
	_set_drag_highlight(can_accept, data, true)
	return can_accept


func _passes_drop_validator(data: Dictionary) -> bool:
	return not drop_validator.is_valid() or bool(drop_validator.call(data, target_kind, target_index))


func _drop_data(_at_position: Vector2, data: Variant) -> void:
	if not _can_drop_data(_at_position, data):
		return
	card_dropped.emit(data, target_kind, target_index)
	_reset_drag_highlight()


func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_BEGIN and target_kind == "file" and accepts_battle_drops:
		var drop_data: Variant = get_viewport().gui_get_drag_data()
		var can_drop := typeof(drop_data) == TYPE_DICTIONARY and _passes_drop_validator(drop_data)
		_set_drag_highlight(can_drop, drop_data, false)
	if what == NOTIFICATION_DRAG_BEGIN and not file_drag_cards.is_empty():
		var data: Variant = get_viewport().gui_get_drag_data()
		if typeof(data) == TYPE_DICTIONARY and str(data.get("source", "")) == "file" and int(data.get("source_index", -1)) == target_index:
			for index in range(int(data.get("card_index", 0)), file_drag_cards.size()):
				var card: Control = file_drag_previews.get(index)
				if is_instance_valid(card): card.modulate.a = 0.16
	if what == NOTIFICATION_DRAG_BEGIN and is_instance_valid(drag_prompt):
		var payload: Variant = get_viewport().gui_get_drag_data()
		drag_prompt.visible = typeof(payload) == TYPE_DICTIONARY and str(payload.get("source", "")) == "hand" and _passes_drop_validator(payload)
	if what == NOTIFICATION_DRAG_END:
		for card in file_drag_previews.values():
			if is_instance_valid(card): card.modulate.a = 1.0
		_reset_drag_highlight()
		if is_instance_valid(drag_prompt):
			drag_prompt.visible = false


func _set_drag_highlight(enabled: bool, data: Variant = {}, hovered: bool = true) -> void:
	if drag_hover_valid == enabled:
		if not drop_style_resolver.is_valid() and _drop_guide_layers.is_empty():
			return
	drag_hover_valid = enabled
	if not drop_style_resolver.is_valid() or target_kind != "file":
		self_modulate = Color("#fff0c2") if enabled else Color.WHITE
		_apply_drop_guide("none", false)
		return
	self_modulate = Color.WHITE
	var guide_style := "none"
	if enabled and typeof(data) == TYPE_DICTIONARY:
		guide_style = str(drop_style_resolver.call(data, target_kind, target_index))
	_apply_drop_guide(guide_style, enabled and hovered)


func _ready() -> void:
	_create_drop_guide_layers()


func _has_point(point: Vector2) -> bool:
	var extension := drop_extension_bottom if _battle_card_drag_active() else 0.0
	if point.x < 0.0 or point.x > size.x or point.y < 0.0 or point.y > size.y + extension:
		return false
	if point.y >= size.y:
		var global_point: Vector2 = get_global_transform_with_canvas() * point
		for control in drop_exclusion_controls:
			if BattleFreePlayDrop.contains_point(control, global_point):
				return false
	return true


func contains_battle_drop_local_point(point: Vector2) -> bool:
	return _has_point(point)


func contains_choice_point(global_point: Vector2) -> bool:
	if not is_visible_in_tree() or not get_viewport_rect().has_point(global_point):
		return false
	var ancestor := get_parent()
	while ancestor is Control:
		if ancestor.clip_contents:
			var point: Vector2 = ancestor.get_global_transform_with_canvas().affine_inverse() * global_point
			if not Rect2(Vector2.ZERO, ancestor.size).has_point(point):
				return false
		ancestor = ancestor.get_parent()
	for preview in file_drag_previews.values():
		if is_instance_valid(preview) and preview.is_visible_in_tree():
			var point: Vector2 = preview.get_global_transform_with_canvas().affine_inverse() * global_point
			if Rect2(Vector2.ZERO, preview.size).has_point(point):
				return true
	return false


func set_choice_hovered(enabled: bool) -> void:
	choice_hovered = enabled
	if not _drop_guide_layers.is_empty():
		_drop_guide_layers["hover_outline"].visible = choice_hovered or _drop_guide_hovered


func _battle_card_drag_active() -> bool:
	if not accepts_battle_drops or not get_viewport().gui_is_dragging():
		return false
	var payload: Variant = get_viewport().gui_get_drag_data()
	return payload is Dictionary and str(payload.get("kind", "")) == "battle-card"


func _input(event: InputEvent) -> void:
	# Native drag validation runs on the target under the pointer; it does not
	# revisit the previous target to turn its hovered outline off.
	if event is InputEventMouseMotion and _drop_guide_hovered:
		if BattleFreePlayDrop.contains_point(self, event.position):
			return
		_apply_drop_guide(_drop_guide_style, false)


func _create_drop_guide_layers() -> void:
	_add_drop_guide_layer("solitaire_glow_inner", 101, 0, 0, Color(121.0 / 255.0, 213.0 / 255.0, 1.0, 0.68), 4, 5)
	_add_drop_guide_layer("solitaire_glow_outer", 100, 0, 0, Color(81.0 / 255.0, 187.0 / 255.0, 241.0 / 255.0, 0.38), 11, 5)
	_add_drop_guide_layer("forge_glow_inner", 101, 0, 0, Color(1.0, 173.0 / 255.0, 66.0 / 255.0, 0.92), 5, 5)
	_add_drop_guide_layer("forge_glow_outer", 100, 0, 0, Color(239.0 / 255.0, 126.0 / 255.0, 31.0 / 255.0, 0.62), 15, 5)
	_add_drop_guide_layer("guide_outline", 102, 2, 1, Color(150.0 / 255.0, 225.0 / 255.0, 1.0, 0.56), 0, 7)
	_add_drop_guide_layer("hover_outline", 103, 4, 3, Color("#fff06a"), 0, 9)
	_apply_drop_guide("none", false)


func _add_drop_guide_layer(layer_name: String, layer_z: int, padding: float, border_width: int, border_color: Color, shadow_size: int, radius: int) -> void:
	var layer := Panel.new()
	layer.name = layer_name
	layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.z_as_relative = true
	layer.z_index = layer_z
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.offset_left = -padding
	# The browser outlines only the top card, or the empty-file slot.
	layer.offset_top = maxf(0.0, float(file_drag_cards.size() - 1) * file_stack_offset) - padding
	layer.offset_right = padding
	# The 48px drop extension is invisible: visual guides stay on the original button/card bounds.
	layer.offset_bottom = padding
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0, 0, 0, 0)
	style.draw_center = false
	style.set_border_width_all(border_width)
	style.border_color = border_color
	style.set_corner_radius_all(radius)
	style.shadow_color = border_color
	style.shadow_size = shadow_size
	layer.add_theme_stylebox_override("panel", style)
	add_child(layer)
	_drop_guide_layers[layer_name] = layer


func _apply_drop_guide(style_name: String, hovered: bool) -> void:
	_drop_guide_style = style_name if style_name in [DROP_GUIDE_FORGE, DROP_GUIDE_SOLITAIRE] else "none"
	_drop_guide_hovered = hovered and _drop_guide_style != "none"
	for layer_name in _drop_guide_layers:
		var layer: Control = _drop_guide_layers[layer_name]
		layer.visible = false
	if _drop_guide_style == DROP_GUIDE_SOLITAIRE:
		_drop_guide_layers["solitaire_glow_inner"].visible = true
		_drop_guide_layers["solitaire_glow_outer"].visible = true
		_drop_guide_layers["guide_outline"].visible = true
	elif _drop_guide_style == DROP_GUIDE_FORGE:
		_drop_guide_layers["forge_glow_inner"].visible = true
		_drop_guide_layers["forge_glow_outer"].visible = true
	if _drop_guide_hovered:
		_drop_guide_layers["hover_outline"].visible = true
	if choice_hovered:
		_drop_guide_layers["hover_outline"].visible = true
	if _drop_guide_style != DROP_GUIDE_FORGE:
		var outline: Control = _drop_guide_layers["guide_outline"]
		outline.add_theme_stylebox_override("panel", _make_guide_outline(Color(150.0 / 255.0, 225.0 / 255.0, 1.0, 0.56), 1, 7))
		var hover_outline: Control = _drop_guide_layers["hover_outline"]
		hover_outline.add_theme_stylebox_override("panel", _make_guide_outline(Color("#fff06a"), 3, 9))


func _make_guide_outline(color: Color, border_width: int, radius: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0, 0, 0, 0)
	style.draw_center = false
	style.border_color = color
	style.set_border_width_all(border_width)
	style.set_corner_radius_all(radius)
	return style


func _reset_drag_highlight() -> void:
	_set_drag_highlight(false)
