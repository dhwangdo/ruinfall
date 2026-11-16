extends RefCounted

const NAME_SIZE := 18
const BODY_SIZE := 12
static var _fonts: Dictionary = {}


static func font(role: String, weight: float = 400.0) -> FontVariation:
	var key := "%s:%s" % [role, weight]
	if not _fonts.has(key):
		var variation := FontVariation.new()
		var filename := "PretendardVariable.woff2"
		if role == "name":
			weight = 800.0
		elif role == "body" or role == "tooltip_title":
			weight = 700.0 if role == "tooltip_title" or weight >= 600.0 else 400.0
			filename = "MaruBuri-Bold.ttf" if weight == 700.0 else "MaruBuri-Regular.ttf"
		elif role == "tooltip_body":
			weight = 500.0
		variation.base_font = load("res://assets/fonts/" + filename)
		variation.variation_opentype = {
			TextServerManager.get_primary_interface().name_to_tag("wght"): weight,
		}
		# Use native weights; synthetic emboldening corrupts some MSDF glyphs.
		variation.variation_embolden = 0.0
		variation.spacing_top = 3
		variation.spacing_bottom = 2
		_fonts[key] = variation
	return _fonts[key]
