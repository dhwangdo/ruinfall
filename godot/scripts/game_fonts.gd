extends RefCounted

const PRETENDARD: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")


static func make(weight: float = 400.0) -> FontVariation:
	var font := FontVariation.new()
	font.base_font = PRETENDARD
	font.variation_opentype = {
		TextServerManager.get_primary_interface().name_to_tag("wght"): weight
	}
	return font
