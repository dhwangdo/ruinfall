extends RefCounted
class_name PortCardTooltipController

const CardKeywords = preload("res://scripts/card_keywords.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const DeckEditions = preload("res://scripts/deck_editions.gd")
const TooltipScript = preload("res://scripts/card_info_tooltip.gd")

const KEYWORD_DELAY_SECONDS := 0.245
const KEYWORD_WIDTH := 310.0
const PREVIEW_WIDTH := 160.0
const STICKER_WIDTH := 260.0
const EDITION_WIDTH := 310.0
const VIEWPORT_MARGIN := 12.0
const KEYWORD_GAP := 16.0
const STICKER_GAP := 8.0
const EDITION_GAP := 10.0

var current_kind := ""
var _generation := 0
var _payload_key := ""
var _game_ref: WeakRef
var _anchor_ref: WeakRef
var _view_ref: WeakRef
var _sections: Array[Dictionary] = []
var _width := KEYWORD_WIDTH
var _pending := false
var _placement_anchor_ref: WeakRef
var _preview_factory: Callable


func request(game: Node, kind: String, payload: Variant, anchor: Control,
		placement_anchor: Control = null, preview_factory: Callable = Callable()) -> void:
	if not is_instance_valid(game) or not is_instance_valid(anchor):
		return
	if not ["keyword", "sticker", "edition", "status"].has(kind):
		return
	var next_placement_anchor := placement_anchor if is_instance_valid(placement_anchor) else anchor
	var next_key := _make_payload_key(kind, payload)
	var same_request := current_kind == kind \
		and _payload_key == next_key \
		and _get_ref(_anchor_ref) == anchor \
		and _get_ref(_game_ref) == game
	if same_request:
		_placement_anchor_ref = weakref(next_placement_anchor)
		_preview_factory = preview_factory
		if not _pending:
			_reposition_visible()
		return

	clear()
	current_kind = kind
	_payload_key = next_key
	_game_ref = weakref(game)
	_anchor_ref = weakref(anchor)
	_placement_anchor_ref = weakref(next_placement_anchor)
	_preview_factory = preview_factory
	_sections = _sections_for(kind, payload)
	_width = _width_for(kind, payload, _sections, anchor)
	if _sections.is_empty():
		clear()
		return
	_generation += 1
	var request_generation := _generation
	if kind == "keyword":
		_pending = true
		await game.get_tree().create_timer(KEYWORD_DELAY_SECONDS).timeout
	if not _request_is_current(request_generation):
		return
	_pending = false
	await _create_and_place(request_generation)


func clear() -> void:
	_generation += 1
	_pending = false
	_clear_view()
	current_kind = ""
	_payload_key = ""
	_sections.clear()
	_game_ref = null
	_anchor_ref = null
	_placement_anchor_ref = null
	_preview_factory = Callable()


func clear_for(anchor: Control) -> void:
	if not is_instance_valid(anchor):
		return
	if _get_ref(_anchor_ref) == anchor:
		clear()


func get_current_anchor() -> Control:
	return _get_ref(_anchor_ref) as Control


func refresh_position() -> void:
	if not _pending:
		_reposition_visible()


static func _anchor_bounds(anchor: Control) -> Rect2:
	# Browser getBoundingClientRect includes the rotated/scaled visual bounds.
	return anchor.get_global_transform() * Rect2(Vector2.ZERO, anchor.size)


func _sections_for(kind: String, payload: Variant) -> Array[Dictionary]:
	if kind == "keyword":
		if payload is Dictionary:
			return CardKeywords.tooltip_sections(payload)
		return []
	if kind == "sticker":
		var sticker_id := str(payload)
		var sticker: Dictionary = CardStickers.STICKERS.get(sticker_id, {})
		if sticker.is_empty():
			return []
		return [{
			"title": str(sticker.get("name", "")),
			"description": str(sticker.get("description", "")),
			"kind": "sticker",
		}]
	if kind == "edition":
		var edition_id := str(payload)
		var edition_description := DeckEditions.description(edition_id)
		if edition_description.is_empty():
			return []
		return [{
			"title": DeckEditions.label(edition_id),
			"description": edition_description,
			"kind": "edition",
		}]
	if kind == "status" and payload is Dictionary:
		var title := str(payload.get("name", ""))
		var description := str(payload.get("description", ""))
		if title.is_empty() and description.is_empty():
			return []
		return [{"title": title, "description": description, "kind": "status"}]
	return []


func _width_for(kind: String, payload: Variant, sections: Array[Dictionary], anchor: Control) -> float:
	if kind == "sticker":
		return minf(STICKER_WIDTH, _viewport_size().x - VIEWPORT_MARGIN * 2.0)
	if kind in ["edition", "status"]:
		var rect := _anchor_bounds(anchor)
		var left_space := maxf(0.0, rect.position.x - EDITION_GAP - VIEWPORT_MARGIN)
		var right_space := maxf(0.0, _viewport_size().x - rect.end.x - EDITION_GAP - VIEWPORT_MARGIN)
		var place_left := right_space < EDITION_WIDTH and left_space > right_space
		return maxf(1.0, minf(EDITION_WIDTH, left_space if place_left else right_space))
	var preview_only := not sections.is_empty()
	for section in sections:
		if not section.has("preview"):
			preview_only = false
	return minf(PREVIEW_WIDTH if preview_only else KEYWORD_WIDTH, _viewport_size().x - VIEWPORT_MARGIN * 2.0)


func _create_and_place(request_generation: int) -> void:
	var game := _get_ref(_game_ref) as Node
	if not is_instance_valid(game):
		return
	var view: Control = TooltipScript.new()
	view.name = "CardInfoTooltip"
	view.set_as_top_level(true)
	view.z_index = 4095
	view.modulate.a = 0.0
	game.add_child(view)
	_view_ref = weakref(view)
	view.configure(_sections, _width, _preview_factory)
	await game.get_tree().process_frame
	if not _request_is_current(request_generation):
		if is_instance_valid(view):
			view.queue_free()
		return
	var measured: Vector2 = view.get_preferred_size()
	var max_height := maxf(1.0, _viewport_size().y - VIEWPORT_MARGIN * 2.0)
	if measured.y > max_height:
		view.constrain_height(max_height)
		await game.get_tree().process_frame
		if not _request_is_current(request_generation):
			return
		measured = view.get_preferred_size()
	view.size = measured
	var anchor := _get_ref(_anchor_ref) as Control
	if not is_instance_valid(anchor):
		clear()
		return
	view.global_position = _position_for(current_kind, anchor, measured, _width)
	view.modulate.a = 1.0


func _position_for(kind: String, anchor: Control, measured: Vector2, width: float) -> Vector2:
	var rect_anchor := anchor
	if kind == "keyword":
		var requested_placement := _get_ref(_placement_anchor_ref) as Control
		var local_preview_ref: Variant = null
		if anchor.has_meta("card_hover_preview_ref"):
			local_preview_ref = anchor.get_meta("card_hover_preview_ref")
		if local_preview_ref is WeakRef:
			var local_preview := local_preview_ref.get_ref() as Control
			if is_instance_valid(local_preview) and local_preview.is_inside_tree() \
					and not local_preview.is_queued_for_deletion():
				requested_placement = local_preview
		if is_instance_valid(requested_placement):
			rect_anchor = requested_placement
	var rect := _anchor_bounds(rect_anchor)
	var original_rect := _anchor_bounds(anchor)
	var viewport := _viewport_size()
	var actual_width := minf(width, viewport.x - VIEWPORT_MARGIN * 2.0)
	var x := rect.position.x
	var y := rect.position.y
	if kind == "sticker":
		x = clampf(rect.position.x, VIEWPORT_MARGIN, viewport.x - actual_width - VIEWPORT_MARGIN)
		y = rect.position.y - STICKER_GAP - measured.y if rect.position.y >= 120.0 else rect.end.y + STICKER_GAP
	elif kind in ["edition", "status"]:
		var left_space := maxf(0.0, rect.position.x - EDITION_GAP - VIEWPORT_MARGIN)
		var right_space := maxf(0.0, viewport.x - rect.end.x - EDITION_GAP - VIEWPORT_MARGIN)
		var place_left := right_space < EDITION_WIDTH and left_space > right_space
		actual_width = minf(EDITION_WIDTH, left_space if place_left else right_space)
		x = rect.position.x - EDITION_GAP - actual_width if place_left else rect.end.x + EDITION_GAP
		y = clampf(rect.position.y + rect.size.y * 0.5 - measured.y * 0.5,
			VIEWPORT_MARGIN, viewport.y - measured.y - VIEWPORT_MARGIN)
	else:
		x = rect.position.x - actual_width - KEYWORD_GAP \
			if rect.end.x <= original_rect.position.x else rect.end.x + KEYWORD_GAP
		y = maxf(VIEWPORT_MARGIN, rect.position.y)
		x = minf(x, viewport.x - actual_width - VIEWPORT_MARGIN)
		y = minf(y, viewport.y - measured.y - VIEWPORT_MARGIN)
	return Vector2(maxf(VIEWPORT_MARGIN, x), maxf(VIEWPORT_MARGIN, y))


func _reposition_visible() -> void:
	var view := _get_ref(_view_ref) as Control
	var anchor := _get_ref(_anchor_ref) as Control
	if not is_instance_valid(view) or not is_instance_valid(anchor):
		return
	view.global_position = _position_for(current_kind, anchor, view.get_preferred_size(), _width)


func _request_is_current(request_generation: int) -> bool:
	return request_generation == _generation \
		and is_instance_valid(_get_ref(_game_ref)) \
		and is_instance_valid(_get_ref(_anchor_ref))


func _clear_view() -> void:
	var view := _get_ref(_view_ref) as Control
	if is_instance_valid(view):
		# Clear may run inside an anchor's tree_exiting signal while its parent is busy.
		# The weak ref identifies the current view; native node names need not be unique.
		view.hide()
		view.queue_free()
	_view_ref = null


func _get_ref(reference: WeakRef) -> Object:
	return reference.get_ref() if reference else null


func _make_payload_key(kind: String, payload: Variant) -> String:
	return "%s:%s" % [kind, str(payload)]


func _viewport_size() -> Vector2:
	var game := _get_ref(_game_ref) as Node
	if is_instance_valid(game):
		return game.get_viewport().get_visible_rect().size
	return Vector2(1280, 720)
