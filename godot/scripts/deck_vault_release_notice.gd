extends Control
class_name PortDeckVaultReleaseNotice

signal closed

const NOTICE_DURATION := 2.4
const NOTICE_FADE_IN := NOTICE_DURATION * 0.12
const NOTICE_HOLD := NOTICE_DURATION * 0.68
const NOTICE_FADE_OUT := NOTICE_DURATION * 0.20
const CARD_FONT: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")

class ReleaseRing extends Control:
	func _draw() -> void:
		draw_arc(size * 0.5, minf(size.x, size.y) * 0.5 - 1.0, 0.0, TAU, 80,
			Color("#f4c16f"), 2.0, true)

class ReleaseDeckIcon extends Control:
	func _draw() -> void:
		draw_rect(Rect2(Vector2(0, 6), Vector2(23, 29)), Color("#72552c"), true)
		draw_rect(Rect2(Vector2(0, 6), Vector2(23, 29)), Color("#8e6730"), false, 2.0)
		draw_rect(Rect2(Vector2(2, 4), Vector2(23, 29)), Color("#c99a4a"), true)
		draw_rect(Rect2(Vector2(2, 4), Vector2(23, 29)), Color("#8e6730"), false, 2.0)
		draw_rect(Rect2(Vector2(6, 0), Vector2(23, 29)), Color("#f4d496"), true)
		draw_rect(Rect2(Vector2(6, 0), Vector2(23, 29)), Color("#8e6730"), false, 2.0)
		draw_rect(Rect2(Vector2(11, 5), Vector2(13, 19)), Color("#8e6730"), false, 1.0)


var _deck_name := ""
var _reduced_motion := false
var _configured := false
var _started := false
var _flash: ColorRect
var _flash_material: ShaderMaterial
var _notice: PanelContainer
var _ring: ReleaseRing
var _deck_icon: ReleaseDeckIcon


func configure(deck: Dictionary, reduced_motion: bool = false) -> void:
	_deck_name = str(deck.get("name", ""))
	_reduced_motion = reduced_motion
	_configured = true
	if is_inside_tree() and is_node_ready():
		_build_notice()
		_start_sequence.call_deferred()


func _ready() -> void:
	if _configured:
		_build_notice()
		_start_sequence.call_deferred()


func _build_notice() -> void:
	for child in get_children():
		child.queue_free()
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	z_index = 240
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	_flash = ColorRect.new()
	_flash.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var flash_shader := Shader.new()
	flash_shader.code = """
shader_type canvas_item;
uniform float flash_alpha : hint_range(0.0, 1.0) = 0.95;
void fragment() {
	float radial = length((UV - vec2(0.5)) * 2.0);
	float glow = 1.0 - smoothstep(0.0, 0.82, radial);
	COLOR = vec4(240.0 / 255.0, 169.0 / 255.0, 75.0 / 255.0,
		(56.0 / 255.0) * glow * flash_alpha);
}
"""
	_flash_material = ShaderMaterial.new()
	_flash_material.shader = flash_shader
	_flash.material = _flash_material
	add_child(_flash)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)
	_notice = PanelContainer.new()
	_notice.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_notice.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_notice.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var notice_style := StyleBoxFlat.new()
	notice_style.bg_color = Color("#29251ef5")
	notice_style.border_color = Color("#db8a3d")
	notice_style.set_border_width_all(1)
	notice_style.set_corner_radius_all(6)
	notice_style.shadow_color = Color(0.0, 0.0, 0.0, 0.6)
	notice_style.shadow_size = 44
	notice_style.shadow_offset = Vector2(0, 12)
	notice_style.content_margin_left = 32
	notice_style.content_margin_right = 32
	notice_style.content_margin_top = 24
	notice_style.content_margin_bottom = 24
	_notice.add_theme_stylebox_override("panel", notice_style)
	center.add_child(_notice)

	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 0)
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_notice.add_child(content)
	var emblem_space := CenterContainer.new()
	emblem_space.custom_minimum_size = Vector2(72, 81)
	emblem_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(emblem_space)
	var emblem := Control.new()
	emblem.custom_minimum_size = Vector2(72, 66)
	emblem.mouse_filter = Control.MOUSE_FILTER_IGNORE
	emblem_space.add_child(emblem)
	_ring = ReleaseRing.new()
	_ring.position = Vector2(0, -3)
	_ring.custom_minimum_size = Vector2(72, 72)
	_ring.size = _ring.custom_minimum_size
	_ring.pivot_offset = _ring.size * 0.5
	_ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	emblem.add_child(_ring)
	_deck_icon = ReleaseDeckIcon.new()
	_deck_icon.position = Vector2(18.5, 15.5)
	_deck_icon.custom_minimum_size = Vector2(35, 35)
	_deck_icon.size = _deck_icon.custom_minimum_size
	_deck_icon.pivot_offset = _deck_icon.size * 0.5
	_deck_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	emblem.add_child(_deck_icon)

	var message := RichTextLabel.new()
	message.bbcode_enabled = true
	message.fit_content = true
	message.scroll_active = false
	message.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	message.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var font_size := clampi(roundi(get_viewport_rect().size.x * 0.02), 17, 24)
	message.add_theme_font_size_override("normal_font_size", font_size)
	message.add_theme_font_size_override("bold_font_size", font_size)
	message.add_theme_color_override("default_color", Color("#f2eadb"))
	message.add_theme_constant_override("line_separation", roundi(float(font_size) * 0.5))
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	var normal_font := FontVariation.new()
	normal_font.base_font = CARD_FONT
	normal_font.variation_opentype = {weight_axis: 600.0}
	message.add_theme_font_override("normal_font", normal_font)
	var strong_font := FontVariation.new()
	strong_font.base_font = CARD_FONT
	strong_font.variation_opentype = {weight_axis: 800.0}
	message.add_theme_font_override("bold_font", strong_font)
	var safe_name := ""
	for character in _deck_name:
		safe_name += "[lb]" if character == "[" else "[rb]" if character == "]" else character
	message.text = "덱 [color=#f4d496][b]「%s」[/b][/color]%s 해방했습니다!" % [safe_name, _object_particle(_deck_name)]
	var plain_message := "덱 「%s」%s 해방했습니다!" % [_deck_name, _object_particle(_deck_name)]
	message.custom_minimum_size.x = minf(656.0, normal_font.get_string_size(plain_message, HORIZONTAL_ALIGNMENT_LEFT, -1.0, font_size).x)
	content.add_child(message)

	_flash.visible = not _reduced_motion
	_ring.visible = not _reduced_motion
	_notice.modulate = Color.WHITE
	if not _reduced_motion:
		_notice.modulate.a = 0.0
		_notice.scale = Vector2(0.97, 0.97)
		_ring.modulate.a = 0.9
		_ring.scale = Vector2(0.55, 0.55)
		_deck_icon.position.y += 18.0
		_deck_icon.scale = Vector2(0.85, 0.85)
		_deck_icon.rotation_degrees = -7.0


func _start_sequence() -> void:
	if _started or not _configured or not is_inside_tree():
		return
	_started = true
	await get_tree().process_frame
	if not is_inside_tree():
		return
	var notice_position := _notice.position
	if not _reduced_motion:
		_notice.pivot_offset = _notice.size * 0.5
		_notice.position.y = notice_position.y + 12.0
		_flash_material.set_shader_parameter("flash_alpha", 0.95)
		var flash_tween := create_tween()
		flash_tween.tween_method(_set_flash_alpha, 0.95, 0.0, 0.65).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		var ring_tween := create_tween()
		ring_tween.set_parallel(true)
		ring_tween.tween_property(_ring, "modulate:a", 0.0, 0.7).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		ring_tween.tween_property(_ring, "scale", Vector2(1.8, 1.8), 0.7).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		var icon_tween := create_tween()
		icon_tween.set_parallel(true)
		icon_tween.tween_property(_deck_icon, "position:y", 15.5 - 3.0, 0.36).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		icon_tween.tween_property(_deck_icon, "scale", Vector2(1.3, 1.3), 0.36).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		icon_tween.tween_property(_deck_icon, "rotation_degrees", 2.0, 0.36).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		icon_tween.set_parallel(false)
		icon_tween.tween_property(_deck_icon, "position:y", 15.5, 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		icon_tween.parallel().tween_property(_deck_icon, "scale", Vector2(1.2, 1.2), 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		icon_tween.parallel().tween_property(_deck_icon, "rotation_degrees", 0.0, 0.24).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		var notice_in := create_tween()
		notice_in.set_parallel(true)
		notice_in.tween_property(_notice, "modulate:a", 1.0, NOTICE_FADE_IN).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		notice_in.tween_property(_notice, "position:y", notice_position.y, NOTICE_FADE_IN).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		notice_in.tween_property(_notice, "scale", Vector2.ONE, NOTICE_FADE_IN).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		await get_tree().create_timer(NOTICE_FADE_IN).timeout
		if not is_inside_tree():
			return
		await get_tree().create_timer(NOTICE_HOLD).timeout
		if not is_inside_tree():
			return
		var notice_out := create_tween()
		notice_out.set_parallel(true)
		notice_out.tween_property(_notice, "modulate:a", 0.0, NOTICE_FADE_OUT).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		notice_out.tween_property(_notice, "position:y", notice_position.y - 8.0, NOTICE_FADE_OUT).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		await get_tree().create_timer(NOTICE_FADE_OUT).timeout
	else:
		await get_tree().create_timer(NOTICE_DURATION).timeout
	if not is_inside_tree():
		return
	closed.emit()
	queue_free()


func _set_flash_alpha(value: float) -> void:
	if is_instance_valid(_flash_material):
		_flash_material.set_shader_parameter("flash_alpha", value)


func _object_particle(value: String) -> String:
	if value.is_empty():
		return "을"
	var last_syllable := value.unicode_at(value.length() - 1) - 0xAC00
	if last_syllable < 0 or last_syllable > 11171:
		return "을"
	return "를" if last_syllable % 28 == 0 else "을"
