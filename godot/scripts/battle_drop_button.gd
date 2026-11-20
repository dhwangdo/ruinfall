extends Button

const CardDragPreviewLayer = preload("res://scripts/card_drag_preview_layer.gd")
const BattleFreePlayDrop = preload("res://scripts/battle_free_play_drop.gd")
const BattleHoldGuide = preload("res://scripts/battle_hold_guide.gd")
const EnemyTargetArea = preload("res://scripts/battle_enemy_target_area.gd")

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
var _enemy_click_inside := false
var _drop_guide_layers: Dictionary = {}
var _drop_guide_style := "none"
var _drop_guide_hovered := false

const DROP_GUIDE_FORGE := "forge"
const DROP_GUIDE_SOLITAIRE := "solitaire"
const HAND_FILE_DROP_LOCK_SEC := 0.20

static var _active_hovered_file: Control = null
static var _file_instances: Array = []

var _file_drag_guarded := false
var _file_drag_elapsed := 0.0
var _file_drag_armed := false
var _last_pointer_position := Vector2.INF


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
				copy.size = Vector2(149.6, 210.1)
				copy.custom_minimum_size = Vector2(149.6, 210.1)
				copy.scale = Vector2.ONE
				copy.pivot_offset = Vector2.ZERO
				copy.mouse_filter = Control.MOUSE_FILTER_IGNORE
				preview.add_child(copy)
		preview.size = Vector2(149.6, 210.1 + float(card_ids.size() - 1) * file_stack_offset)
		payload["card_ids"] = card_ids
	elif is_instance_valid(drag_preview_widget):
		preview = drag_preview_widget.duplicate() as Control
		preview.set_script(null)
		preview.size = Vector2(149.6, 210.1)
		preview.custom_minimum_size = Vector2(149.6, 210.1)
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
	set_drag_preview(CardDragPreviewLayer.create(preview, Vector2(149.6, 210.1), "BattlePileCardDragPreview", true))
	return payload


func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	if target_kind == "enemy" and not _has_point(_at_position):
		_set_drag_highlight(false)
		return false
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
	if target_kind == "file" and can_accept and _is_guarded_hand_payload(data):
		var armed := _top_card_local_rect().has_point(_at_position) and _file_drag_armed
		_set_drag_highlight(true, data, armed)
		return armed
	_set_drag_highlight(can_accept, data, true)
	return can_accept


func _passes_drop_validator(data: Dictionary) -> bool:
	return not drop_validator.is_valid() or bool(drop_validator.call(data, target_kind, target_index))


func _is_guarded_hand_payload(data: Variant) -> bool:
	return target_kind == "file" and accepts_battle_drops \
		and typeof(data) == TYPE_DICTIONARY \
		and str(data.get("kind", "")) == "battle-card" \
		and str(data.get("source", "")) == "hand"


func _is_guarded_hand_drag() -> bool:
	if not accepts_battle_drops or target_kind != "file" or not get_viewport().gui_is_dragging():
		return false
	return _is_guarded_hand_payload(get_viewport().gui_get_drag_data())


func _top_card_local_rect() -> Rect2:
	var top_y := maxf(0.0, float(file_drag_cards.size() - 1) * file_stack_offset)
	return Rect2(0.0, top_y, size.x, maxf(0.0, size.y - top_y))


func is_guarded_file_drop_armed(payload: Dictionary, global_point: Vector2) -> bool:
	if not _is_guarded_hand_payload(payload):
		return true
	var local_point: Vector2 = get_global_transform_with_canvas().affine_inverse() * global_point
	return _file_drag_armed and _top_card_local_rect().has_point(local_point)


func _reset_file_drag_guard() -> void:
	_file_drag_guarded = false
	_file_drag_elapsed = 0.0
	_file_drag_armed = false
	set_process(false)


func _drop_data(_at_position: Vector2, data: Variant) -> void:
	if not _can_drop_data(_at_position, data):
		return
	card_dropped.emit(data, target_kind, target_index)
	_reset_file_drag_guard()
	_reset_drag_highlight()


func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_BEGIN and target_kind == "file" and accepts_battle_drops:
		if _active_hovered_file == self:
			_active_hovered_file = null
		_reset_file_drag_guard()
		var drop_data: Variant = get_viewport().gui_get_drag_data()
		var can_drop := typeof(drop_data) == TYPE_DICTIONARY and _passes_drop_validator(drop_data)
		_set_drag_highlight(can_drop, drop_data, false)
		if can_drop and _is_guarded_hand_payload(drop_data):
			_file_drag_guarded = true
			set_process(true)
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
		if _active_hovered_file == self:
			_active_hovered_file = null
		for card in file_drag_previews.values():
			if is_instance_valid(card): card.modulate.a = 1.0
		_reset_file_drag_guard()
		_reset_drag_highlight()
		if is_instance_valid(drag_prompt):
			drag_prompt.visible = false


func _process(delta: float) -> void:
	if not _file_drag_guarded or not get_viewport().gui_is_dragging():
		_reset_file_drag_guard()
		return
	_file_drag_elapsed += delta
	if _file_drag_elapsed >= HAND_FILE_DROP_LOCK_SEC:
		_file_drag_armed = true
		set_process(false)
		var global_mouse := _last_pointer_position if _last_pointer_position != Vector2.INF else get_viewport().get_mouse_position()
		if _is_point_in_clipped_top_card(global_mouse):
			_apply_drop_guide(_drop_guide_style, true)


func _is_point_in_clipped_top_card(global_point: Vector2) -> bool:
	if not is_visible_in_tree():
		return false
	var ancestor := get_parent()
	while ancestor is Control:
		if ancestor.clip_contents:
			var ancestor_local: Vector2 = ancestor.get_global_transform_with_canvas().affine_inverse() * global_point
			if not Rect2(Vector2.ZERO, ancestor.size).has_point(ancestor_local):
				return false
		ancestor = ancestor.get_parent()
	var local_point: Vector2 = get_global_transform_with_canvas().affine_inverse() * global_point
	return _top_card_local_rect().has_point(local_point)


func _set_drag_highlight(enabled: bool, data: Variant = {}, hovered: bool = true) -> void:
	if drag_hover_valid == enabled:
		if not drop_style_resolver.is_valid() and _drop_guide_layers.is_empty():
			return
	drag_hover_valid = enabled
	queue_redraw()
	if not drop_style_resolver.is_valid() or target_kind != "file":
		self_modulate = Color("#fff0c2") if enabled else Color.WHITE
		_apply_drop_guide("none", false)
		return
	self_modulate = Color.WHITE
	var guide_style := "none"
	if enabled and typeof(data) == TYPE_DICTIONARY:
		guide_style = str(drop_style_resolver.call(data, target_kind, target_index))
	_apply_drop_guide(guide_style, enabled and hovered)


func _enter_tree() -> void:
	if not _file_instances.has(self):
		_file_instances.append(self)


func _exit_tree() -> void:
	_file_instances.erase(self)
	if _active_hovered_file == self:
		_active_hovered_file = null
		_refresh_all_file_drop_guides()


func _ready() -> void:
	set_process(false)
	_create_drop_guide_layers()
	mouse_entered.connect(queue_redraw)
	mouse_exited.connect(queue_redraw)


func _draw() -> void:
	if target_kind == "enemy" and not disabled and drag_hover_valid:
		var rect := EnemyTargetArea.local_rect(self)
		draw_rect(rect, Color(1, 1, 1, 0.035))
		draw_rect(rect, Color("#ffe16a"), false, 2.0)


func _has_point(point: Vector2) -> bool:
	if target_kind == "enemy":
		return EnemyTargetArea.local_rect(self).has_point(point)
	if target_kind == "file" and _is_guarded_hand_drag():
		return _top_card_local_rect().has_point(point)
	var extension := drop_extension_bottom if _battle_card_drag_active() else 0.0
	if point.x < 0.0 or point.x > size.x or point.y < 0.0 or point.y > size.y + extension:
		return false
	if point.y >= size.y:
		var global_point: Vector2 = get_global_transform_with_canvas() * point
		for control in drop_exclusion_controls:
			if BattleFreePlayDrop.contains_point(control, global_point):
				return false
	return true


func _gui_input(event: InputEvent) -> void:
	if target_kind == "enemy" and event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_enemy_click_inside = _has_point(event.position) if event.pressed else _enemy_click_inside and _has_point(event.position)


func enemy_click_is_inside() -> bool:
	return _enemy_click_inside


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
	if event is InputEventMouseMotion or event is InputEventScreenDrag:
		_last_pointer_position = event.position
	# Native drag validation runs on the target under the pointer; it does not
	# revisit the previous target to turn its hovered outline off.
	if target_kind == "enemy" and drag_hover_valid and event is InputEventMouseMotion:
		var local_point: Vector2 = get_global_transform_with_canvas().affine_inverse() * event.position
		if not _has_point(local_point):
			_set_drag_highlight(false)
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
	var hover_use_glow := BattleHoldGuide.create_use_glow()
	hover_use_glow.name = "hover_use_glow"
	hover_use_glow.z_as_relative = true
	hover_use_glow.z_index = 102
	hover_use_glow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hover_use_glow.offset_left = 0.0
	hover_use_glow.offset_top = maxf(0.0, float(file_drag_cards.size() - 1) * file_stack_offset)
	hover_use_glow.offset_right = 0.0
	hover_use_glow.offset_bottom = 0.0
	add_child(hover_use_glow)
	_drop_guide_layers["hover_use_glow"] = hover_use_glow
	var hover_forge_glow := BattleHoldGuide.create_use_glow()
	hover_forge_glow.name = "hover_forge_glow"
	hover_forge_glow.z_as_relative = true
	hover_forge_glow.z_index = 102
	hover_forge_glow.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	hover_forge_glow.offset_left = 0.0
	hover_forge_glow.offset_top = maxf(0.0, float(file_drag_cards.size() - 1) * file_stack_offset)
	hover_forge_glow.offset_right = 0.0
	hover_forge_glow.offset_bottom = 0.0
	var forge_hover_style := (hover_forge_glow.get_theme_stylebox("panel") as StyleBoxFlat).duplicate() as StyleBoxFlat
	forge_hover_style.border_color = Color("#ffba66")
	forge_hover_style.shadow_color = Color(1.0, 0.48, 0.08, 0.82)
	hover_forge_glow.add_theme_stylebox_override("panel", forge_hover_style)
	add_child(hover_forge_glow)
	_drop_guide_layers["hover_forge_glow"] = hover_forge_glow
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
	var prev_active := _active_hovered_file
	if _drop_guide_hovered:
		_active_hovered_file = self
	elif _active_hovered_file == self:
		_active_hovered_file = null
	if prev_active != _active_hovered_file:
		_refresh_all_file_drop_guides()
	else:
		_refresh_drop_guide_visibility()


static func _refresh_all_file_drop_guides() -> void:
	var alive: Array = []
	for item in _file_instances:
		if is_instance_valid(item):
			alive.append(item)
			if item != _active_hovered_file and item._drop_guide_hovered:
				item._drop_guide_hovered = false
			item._refresh_drop_guide_visibility()
	_file_instances = alive


func _refresh_drop_guide_visibility() -> void:
	for layer_name in _drop_guide_layers:
		var layer: Control = _drop_guide_layers[layer_name]
		layer.visible = false
	var suppressed := is_instance_valid(_active_hovered_file) and _active_hovered_file != self
	if _drop_guide_hovered and _drop_guide_style != "none":
		var hover_layer_name := "hover_forge_glow" if _drop_guide_style == DROP_GUIDE_FORGE else "hover_use_glow"
		if _drop_guide_layers.has(hover_layer_name):
			_drop_guide_layers[hover_layer_name].visible = true
	elif not suppressed:
		if _drop_guide_style == DROP_GUIDE_SOLITAIRE:
			_drop_guide_layers["solitaire_glow_inner"].visible = true
			_drop_guide_layers["solitaire_glow_outer"].visible = true
			_drop_guide_layers["guide_outline"].visible = true
		elif _drop_guide_style == DROP_GUIDE_FORGE:
			_drop_guide_layers["forge_glow_inner"].visible = true
			_drop_guide_layers["forge_glow_outer"].visible = true
	if choice_hovered:
		_drop_guide_layers["hover_outline"].visible = true
	if _drop_guide_style != DROP_GUIDE_FORGE and _drop_guide_layers.has("guide_outline"):
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
