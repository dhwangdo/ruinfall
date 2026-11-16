extends RefCounted

# Approved card keyword colors, shared by Windows and Web exports.
const COLORS := {
	"방어": "#a65416",
	"★": "#89601e",
	"마법 저항": "#345e9b",
}
const DEFAULT_COLOR := "#242620"


static func color_for(keyword: String) -> String:
	var canonical := "사용 불가" if keyword == "사용불가" else keyword.trim_suffix(".")
	return str(COLORS.get(canonical, DEFAULT_COLOR))
