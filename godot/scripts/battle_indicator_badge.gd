extends RefCounted

const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")
const DeckIconArt = preload("res://scripts/deck_icon_art.gd")
static var _debuff_aura_texture: GradientTexture2D

const ICONS := {
	"weak": preload("res://assets/ui/status/weak.svg"),
	"vulnerable": preload("res://assets/ui/status/vulnerable.svg"),
	"corrosion": preload("res://assets/ui/status/corrosion.svg"),
	"paralysis": preload("res://assets/ui/status/paralysis.svg"),
	"confusion": preload("res://assets/ui/status/confusion.svg"),
	"edition": preload("res://assets/ui/status/edition.svg"),
	"rule": preload("res://assets/ui/status/rule.svg"),
	"trait": preload("res://assets/ui/status/trait.svg"),
	"buff": preload("res://assets/ui/status/buff.svg"),
	"shield": preload("res://assets/ui/status/shield.svg"),
	"magic_resistance": preload("res://assets/ui/status/magic_resistance.svg"),
	"repeat_attack": preload("res://assets/ui/status/repeat_attack.svg"),
	"stunned": preload("res://assets/ui/status/stunned.svg"),
	"web": preload("res://assets/ui/status/web.svg"),
	"expiry": preload("res://assets/ui/status/expiry.svg"),
	"edition_roomy": preload("res://assets/ui/status/edition_roomy.svg"),
	"edition_firstSolitaire": preload("res://assets/ui/status/edition_firstSolitaire.svg"),
	"edition_quickHammer": preload("res://assets/ui/status/edition_quickHammer.svg"),
	"edition_sharpLight": preload("res://assets/ui/status/edition_sharpLight.svg"),
	"edition_cycle": preload("res://assets/ui/status/edition_cycle.svg"),
	"edition_gambit": preload("res://assets/ui/status/edition_gambit.svg"),
	"edition_sunkenLegend": preload("res://assets/ui/status/edition_sunkenLegend.svg"),
	"edition_prism": preload("res://assets/ui/status/edition_prism.svg"),
	"edition_fantastic": preload("res://assets/ui/status/edition_fantastic.svg"),
	"edition_legendCassiopeia": preload("res://assets/ui/status/edition_legendCassiopeia.svg"),
	"edition_legendLeo": preload("res://assets/ui/status/edition_legendCassiopeia.svg"),
	"edition_legendHorologium": preload("res://assets/ui/status/edition_legendCassiopeia.svg"),
	"edition_metallurgy": preload("res://assets/ui/status/edition_quickHammer.svg"),
	"edition_giant": preload("res://assets/ui/status/buff.svg"),
	"edition_freeEdit": preload("res://assets/ui/status/rule.svg"),
	"edition_royal": preload("res://assets/ui/status/edition_legendCassiopeia.svg"),
}


static func status(text: String, tooltip: String, enemy := false) -> Dictionary:
	var status_id := "buff"
	for entry in [
		["약화", "weak"], ["취약", "vulnerable"], ["부식", "corrosion"],
		["마비", "paralysis"], ["혼란", "confusion"],
	]:
		if text.begins_with(entry[0]):
			status_id = entry[1]
			break
	var category := "debuff" if status_id != "buff" else "buff"
	if status_id == "buff":
		if text.begins_with("강인함") or text.begins_with("방어 ") or text.begins_with("무적"):
			status_id = "shield"
		elif text.contains("마법 저항"):
			status_id = "magic_resistance"
		elif text.begins_with("다음 공격"):
			status_id = "repeat_attack"
		elif text.begins_with("거미줄"):
			status_id = "web"
			category = "trait"
		elif text.begins_with("행동 불가"):
			status_id = "stunned"
		elif enemy and not (text.begins_with("힘 ") or text.begins_with("임시 힘 ")):
			status_id = "trait"
			category = "trait"
	var parts := text.split(" ", false)
	var title := text
	var number := ""
	if parts.size() > 1 and parts[parts.size() - 1].is_valid_int():
		number = str(int(parts[parts.size() - 1]))
		title = text.substr(0, text.length() - parts[parts.size() - 1].length()).strip_edges()
	return {"id": status_id, "category": category, "text": text,
		"title": title, "number": number, "tooltip": tooltip,
		"tooltip_kind": "enemy" if enemy else "status"}


static func create(indicator: Dictionary, _font_size := 13) -> Control:
	var category := str(indicator.get("category", "trait"))
	var icon_id := str(indicator.get("id", category))
	if category == "edition":
		icon_id = "edition"
	if not ICONS.has(icon_id):
		icon_id = category if ICONS.has(category) else "trait"
	var badge := Control.new()
	badge.custom_minimum_size = Vector2(36, 36)
	var icon_size := 36 if category == "edition" else 32
	var icon := _icon(icon_id, icon_size)
	icon.position = (Vector2(36, 36) - icon.size) * 0.5
	badge.add_child(icon)
	if category == "debuff":
		var aura := TextureRect.new()
		aura.name = "DebuffAura"
		aura.mouse_filter = Control.MOUSE_FILTER_IGNORE
		aura.texture = _debuff_aura()
		aura.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
		aura.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		aura.position = Vector2(-4, -4)
		aura.size = Vector2(44, 44)
		aura.z_index = -1
		badge.add_child(aura)
	var number := str(indicator.get("number", ""))
	badge.set_meta("tooltip_effect_number", number)
	if not number.is_empty():
		var count_label := Label.new()
		count_label.text = number
		count_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		count_label.anchor_left = 1.0
		count_label.anchor_top = 1.0
		count_label.anchor_right = 1.0
		count_label.anchor_bottom = 1.0
		count_label.offset_left = -27
		count_label.offset_top = -15
		count_label.offset_right = 4
		count_label.offset_bottom = 10
		count_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		count_label.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
		count_label.add_theme_font_override("font", preload("res://assets/fonts/PretendardVariable700.tres"))
		count_label.add_theme_font_size_override("font_size", 20)
		count_label.add_theme_color_override("font_color", Color.WHITE)
		count_label.add_theme_color_override("font_outline_color", Color.BLACK)
		count_label.add_theme_constant_override("outline_size", 12)
		badge.add_child(count_label)
	badge.mouse_filter = Control.MOUSE_FILTER_PASS
	var tooltip_kind := str(indicator.get("tooltip_kind", ""))
	if tooltip_kind == "edition":
		TooltipBindings.bind_edition(badge, str(indicator.get("edition_id", "")))
	elif tooltip_kind == "card":
		TooltipBindings.bind_rule(badge, indicator.get("card", {}), icon_id)
	else:
		var title := str(indicator.get("title", indicator.get("text", "")))
		if category == "debuff":
			TooltipBindings.bind_debuff(badge, title, str(indicator.get("tooltip", "")), icon_id)
		elif tooltip_kind == "enemy":
			TooltipBindings.bind_enemy(badge, title, str(indicator.get("tooltip", "")), icon_id)
		else:
			TooltipBindings.bind_status(badge, title, str(indicator.get("tooltip", "")), icon_id)
	return badge


static func _icon(icon_id: String, size: int) -> TextureRect:
	var icon := TextureRect.new()
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	icon.texture = DeckIconArt.RARE if icon_id == "edition" else ICONS[icon_id]
	if icon_id == "edition":
		icon.material = DeckIconArt.palette_material()
		icon.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.custom_minimum_size = Vector2(size, size)
	icon.size = Vector2(size, size)
	return icon


static func _debuff_aura() -> GradientTexture2D:
	if _debuff_aura_texture == null:
		var gradient := Gradient.new()
		gradient.offsets = PackedFloat32Array([0.0, 0.55, 1.0])
		gradient.colors = PackedColorArray([Color("#9847cf", 0.95), Color("#9847cf", 0.70), Color("#9847cf", 0.0)])
		_debuff_aura_texture = GradientTexture2D.new()
		_debuff_aura_texture.width = 64
		_debuff_aura_texture.height = 64
		_debuff_aura_texture.gradient = gradient
		_debuff_aura_texture.fill = GradientTexture2D.FILL_RADIAL
		_debuff_aura_texture.fill_from = Vector2(0.5, 0.5)
		_debuff_aura_texture.fill_to = Vector2(1.0, 0.5)
	return _debuff_aura_texture
