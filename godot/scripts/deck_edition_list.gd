extends RefCounted
class_name PortDeckEditionList

const DeckEditions = preload("res://scripts/deck_editions.gd")
const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")

const EDITION_COLORS := DeckEditions.COLORS


static func build(editions: Array, edition_colors: Dictionary = {}, font: Font = null,
	font_size := 15, fallback_color := Color("#d7caa8"), gap := 0) -> HFlowContainer:
	var flow := HFlowContainer.new()
	flow.add_theme_constant_override("h_separation", gap)
	flow.add_theme_constant_override("v_separation", 0)
	flow.mouse_filter = Control.MOUSE_FILTER_PASS
	for edition_value in editions:
		var edition := str(edition_value)
		var label := Label.new()
		label.text = "[%s]" % DeckEditions.label(edition)
		label.add_theme_font_size_override("font_size", font_size)
		if font != null:
			label.add_theme_font_override("font", font)
		var color_value: Variant = edition_colors.get(edition, EDITION_COLORS.get(edition, fallback_color))
		label.add_theme_color_override("font_color", color_value if color_value is Color else Color(str(color_value)))
		label.mouse_filter = Control.MOUSE_FILTER_PASS
		TooltipBindings.bind_edition(label, edition)
		flow.add_child(label)
	return flow
