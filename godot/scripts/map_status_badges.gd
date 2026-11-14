extends RefCounted
class_name PortMapStatusBadges

const LAMENT_DESCRIPTION := "다음 전투하는 모든 적의 체력을 30% 감소시킵니다. 전투마다 1회 소모됩니다."
const CARD_FONT: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")
const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")


static func create(lament_charges: int, karma_stage: int, karma_description: String) -> VBoxContainer:
	var badges := VBoxContainer.new()
	badges.custom_minimum_size.x = 144.0
	badges.z_index = 8
	badges.add_theme_constant_override("separation", 7)
	badges.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if karma_stage > 0:
		badges.add_child(_create_badge("카르마(%d)" % karma_stage,
			Color("#573565"), Color("#a079b3"), Color("#f3defb"),
			PackedStringArray(["Pretendard", "Malgun Gothic"]), "카르마", karma_description))
	if lament_charges > 0:
		badges.add_child(_create_badge("신들의 비탄(%d)" % lament_charges,
			Color("#f3dfaa"), Color("#8b733e"), Color("#473715"),
			PackedStringArray(["Arial"]), "신들의 비탄", LAMENT_DESCRIPTION))
	return badges


static func _create_badge(text: String, background: Color, border: Color, foreground: Color,
		_font_families: PackedStringArray, tooltip_title: String, description: String) -> PanelContainer:
	var badge := PanelContainer.new()
	badge.custom_minimum_size = Vector2(144.0, 44.0)
	badge.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	badge.mouse_filter = Control.MOUSE_FILTER_PASS
	TooltipBindings.bind_status(badge, tooltip_title, description)
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	style.content_margin_left = 11
	style.content_margin_right = 11
	style.content_margin_top = 9
	style.content_margin_bottom = 9
	badge.add_theme_stylebox_override("panel", style)
	var label := Label.new()
	label.text = text
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.add_theme_font_size_override("font_size", 13)
	label.add_theme_color_override("font_color", foreground)
	var font := FontVariation.new()
	font.base_font = CARD_FONT
	var weight_axis := TextServerManager.get_primary_interface().name_to_tag("wght")
	font.variation_opentype = {weight_axis: 800.0}
	label.add_theme_font_override("font", font)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge.add_child(label)
	return badge
