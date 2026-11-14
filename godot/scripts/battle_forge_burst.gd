extends Control

signal finished(cancelled: bool)

const DURATION_SECONDS := 0.7
const STAR_COUNT := 16
const STAR_COLOR := Color("#ffad42")
const SHADOW_COLOR := Color("#f27a20")
const EASING_X1 := 0.22
const EASING_Y1 := 0.55
const EASING_X2 := 0.45
const EASING_Y2 := 0.9

var _font: Font
var _started_at_usec := 0
var _elapsed := 0.0
var _font_size := 13.0
var _configured := false
var _valid_source := false
var _reduced_motion := false
var _started := false
var _finished := false


func _init() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	visible = false
	z_index = 100
	z_as_relative = false
	set_process(false)
	var web_font := FontVariation.new()
	web_font.base_font = preload("res://assets/fonts/PretendardVariable.woff2")
	web_font.variation_opentype = {
		TextServerManager.get_primary_interface().name_to_tag("wght"): 800.0
	}
	_font = web_font
	tree_exiting.connect(_on_burst_exiting, CONNECT_ONE_SHOT)


func configure(target: Control, reduced_motion: bool = false) -> void:
	if _started or _finished:
		return
	_configured = true
	_reduced_motion = reduced_motion
	if not is_instance_valid(target) or not target.is_inside_tree():
		_valid_source = false
		return
	var bounds := target.get_global_rect()
	if bounds.size.x <= 0.0 or bounds.size.y <= 0.0:
		_valid_source = false
		return
	_valid_source = true
	var diameter := maxf(bounds.size.x, bounds.size.y) * 1.14
	_font_size = clampf(bounds.size.x * 0.13, 13.0, 20.0)
	size = Vector2.ONE * diameter
	pivot_offset = size * 0.5
	position = bounds.position + (bounds.size - size) * 0.5


func play() -> void:
	if _started or _finished:
		return
	_started = true
	if not _configured or not _valid_source:
		_finish(false)
		return
	if _reduced_motion:
		_finish(false)
		return
	visible = true
	_elapsed = 0.0
	_started_at_usec = Time.get_ticks_usec()
	_apply_frame()
	set_process(true)


func cancel() -> void:
	_finish(true)


func _process(_delta: float) -> void:
	_elapsed = minf(DURATION_SECONDS, float(Time.get_ticks_usec() - _started_at_usec) / 1000000.0)
	_apply_frame()
	if _elapsed >= DURATION_SECONDS:
		_finish(false)


func _draw() -> void:
	if not _started or _finished or _reduced_motion:
		return
	var center := size * 0.5
	var radius := minf(size.x, size.y) * 0.5
	var glyph := "★"
	var glyph_size := _font.get_string_size(glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, int(round(_font_size)))
	var baseline := _font.get_ascent(int(round(_font_size)))
	for index in range(STAR_COUNT):
		var angle := TAU * float(index) / float(STAR_COUNT)
		var star_center := center + Vector2(cos(angle), sin(angle)) * radius
		var origin := star_center - Vector2(glyph_size.x * 0.5, baseline * 0.5)
		draw_string(_font, origin, glyph, HORIZONTAL_ALIGNMENT_LEFT, -1, int(round(_font_size)),
		Color(SHADOW_COLOR, 0.28))
		draw_string_outline(_font, origin, glyph, HORIZONTAL_ALIGNMENT_LEFT, -1,
			int(round(_font_size)), 2, SHADOW_COLOR)
		draw_string(_font, origin, glyph, HORIZONTAL_ALIGNMENT_LEFT, -1,
			int(round(_font_size)), STAR_COLOR)


func _apply_frame() -> void:
	var progress := clampf(_elapsed / DURATION_SECONDS, 0.0, 1.0)
	var eased := _cubic_bezier_y_for_x(progress)
	scale = Vector2.ONE * lerpf(0.7, 1.0, eased)
	if progress <= 0.08:
		modulate.a = progress / 0.08
	elif progress <= 0.35:
		modulate.a = 1.0
	else:
		modulate.a = 1.0 - (progress - 0.35) / 0.65
	queue_redraw()


func _cubic_bezier_y_for_x(x: float) -> float:
	if x <= 0.0:
		return 0.0
	if x >= 1.0:
		return 1.0
	var low := 0.0
	var high := 1.0
	for _iteration in range(12):
		var t := (low + high) * 0.5
		var estimate_x := _cubic(t, 0.0, EASING_X1, EASING_X2, 1.0)
		if estimate_x < x:
			low = t
		else:
			high = t
	return _cubic((low + high) * 0.5, 0.0, EASING_Y1, EASING_Y2, 1.0)


func _cubic(t: float, p0: float, p1: float, p2: float, p3: float) -> float:
	var inverse := 1.0 - t
	return inverse * inverse * inverse * p0 + 3.0 * inverse * inverse * t * p1 \
		+ 3.0 * inverse * t * t * p2 + t * t * t * p3


func _on_burst_exiting() -> void:
	_finish(true)


func _finish(cancelled: bool) -> void:
	if _finished:
		return
	_finished = true
	set_process(false)
	visible = false
	modulate.a = 0.0
	finished.emit(cancelled)


static func newly_forged_ids(before_cards: Array, after_cards: Array) -> Array[int]:
	var previous_counts: Dictionary = {}
	for card in before_cards:
		if not card is Dictionary:
			continue
		if not card.has("id"):
			continue
		var card_id := int(card["id"])
		previous_counts[card_id] = _card_forge_count(card)
	var seen: Dictionary = {}
	var forged_ids: Array[int] = []
	for card in after_cards:
		if not card is Dictionary:
			continue
		if not card.has("id"):
			continue
		var card_id := int(card["id"])
		if _card_forge_count(card) <= int(previous_counts.get(card_id, 0)) or seen.has(card_id):
			continue
		seen[card_id] = true
		forged_ids.append(card_id)
	return forged_ids


static func _card_forge_count(card: Dictionary) -> int:
	if str(card.get("effect", "")) in ["obsidian_dagger", "obsidianDagger"]:
		for key in ["forgeCostsCompleted", "forge_costs_completed", "obsidian_forge_costs_completed"]:
			if card.has(key) and card[key] is Array:
				return card[key].size()
	return 1 if bool(card.get("forged", false)) else 0
