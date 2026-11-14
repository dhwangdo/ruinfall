extends RefCounted
class_name PortMapTileAppearance

const StickerServices = preload("res://scripts/sticker_services.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const StickerArtDraw = preload("res://scripts/sticker_art_draw.gd")

const ROOM_BADGES := {
	"shop": "상점",
	"bloodShop": "피의 상점",
	"extractionShrine": "추출의 성소",
	"recoveryShrine": "회복의 성소",
	"vitalityShrine": "건강의 성소",
	"mindEyeShrine": "심안의 성소",
	"transformShrine": "변환의 성소",
	"treasureChest": "보물 상자",
	"stickerAltar": "제단",
	"tinkerer": "땜장이",
	"cardTransmuter": "변환기",
	"boss": "보스",
	"blessing": "축복",
	"portal": "포탈",
	"safePortal": "포탈",
	"heal": "회복",
	"partialHeal": "회복 30%",
}

const REGION_FLOOR_COLORS := [
	Color("#91ad81"),
	Color("#818f96"),
	Color("#dec58b"),
	Color("#abd8e6"),
]

const MINIMAP_BACKGROUND := Color("#111516")
const MINIMAP_FLOOR := Color("#657568")
const MINIMAP_WALL := Color("#303b44")
const MINIMAP_VAULT := Color("#ffad42")
const MINIMAP_PORTAL := Color("#c43cff")
const MINIMAP_RECOVERY := Color("#4ff58b")
const MINIMAP_BLESSING := Color("#ffe65a")
const MINIMAP_ITEM := Color("#73e5ff")
const MINIMAP_ENEMY := Color("#f04e4e")
const MINIMAP_REMEMBERED_ENEMY := Color("#963b3b")
const MINIMAP_SPECIAL := Color("#55e5f5")

const GOLD_PILE_SHAPES := [
	{"stacks": [{"x": 14.0, "base": 26.0, "coins": 2}], "loose": [{"x": 25.0, "y": 29.0, "angle": -18.0}, {"x": 32.0, "y": 25.0, "angle": 25.0}], "offset_y": -5.0},
	{"stacks": [{"x": 12.0, "base": 31.0, "coins": 3}, {"x": 26.0, "base": 28.0, "coins": 5}], "loose": [{"x": 33.0, "y": 34.0, "angle": -12.0}, {"x": 18.0, "y": 36.0, "angle": 12.0}], "offset_y": -1.0},
	{"stacks": [{"x": 8.0, "base": 32.0, "coins": 4}, {"x": 21.0, "base": 32.0, "coins": 7}, {"x": 34.0, "base": 34.0, "coins": 4}], "loose": [{"x": 20.0, "y": 38.0, "angle": -8.0}, {"x": 30.0, "y": 39.0, "angle": 8.0}]},
	{"stacks": [{"x": 9.0, "base": 34.0, "coins": 6}, {"x": 22.0, "base": 32.0, "coins": 8}, {"x": 35.0, "base": 35.0, "coins": 5}, {"x": 20.0, "base": 39.0, "coins": 3}], "loose": [{"x": 31.0, "y": 40.0, "angle": -10.0}]},
	{"stacks": [{"x": 7.0, "base": 34.0, "coins": 7}, {"x": 18.0, "base": 32.0, "coins": 8}, {"x": 31.0, "base": 33.0, "coins": 8}, {"x": 37.0, "base": 38.0, "coins": 5}, {"x": 21.0, "base": 40.0, "coins": 4}], "loose": [{"x": 9.0, "y": 40.0, "angle": -12.0}]},
]


static func full_map_fill(position: Vector2i, room_type: String, region_index: int) -> Color:
	match room_type:
		"rock":
			return _region_tile_color(position, Color("#303b44"))
		"shop":
			return Color("#8b7041")
		"bloodShop":
			return Color("#a44c58")
		"extractionShrine":
			return Color("#78cbea")
		"recoveryShrine", "heal", "partialHeal":
			return Color("#658a6e")
		"vitalityShrine":
			return Color("#ee9651")
		"mindEyeShrine":
			return Color("#8066c2")
		"transformShrine":
			return Color("#c2933e")
		"treasureChest":
			return Color("#a87539")
		"deckVault":
			return Color("#403411")
		"portal", "safePortal":
			return Color("#775b98")
		"stickerAltar":
			return Color("#b54b4b")
		"tinkerer":
			# The sticker panel is dark; the surrounding tile is silver gray.
			return Color("#aeb7b8")
		"cardTransmuter":
			return Color("#4e9199")
		"boss":
			return Color("#9b3d35")
		"safeEntry", "safeArea", "vaultInterior":
			# Browser setpiece floors render as ordinary region floor tiles.
			return _region_tile_color(position, _region_floor_color(region_index))
		"empty":
			return _region_tile_color(position, _region_floor_color(region_index))
	return _region_floor_color(region_index)


static func full_map_edge(room_type: String) -> Color:
	match room_type:
		"rock":
			return Color("#111827")
		"shop":
			return Color("#5f4c2b")
		"bloodShop":
			return Color("#7b333c")
		"extractionShrine":
			return Color("#377f9c")
		"recoveryShrine", "heal", "partialHeal":
			return Color("#356044")
		"vitalityShrine":
			return Color("#a44724")
		"mindEyeShrine":
			return Color("#4d3b8f")
		"transformShrine":
			return Color("#8b6328")
		"treasureChest":
			return Color("#6b4721")
		"deckVault":
			return Color("#ef8129")
		"portal", "safePortal":
			return Color("#48335f")
		"stickerAltar":
			return Color("#622c2f")
		"tinkerer":
			return Color("#435058")
		"cardTransmuter":
			return Color("#28535b")
		"boss":
			return Color("#5c2020")
		"empty", "safeEntry", "safeArea", "vaultInterior":
			# Browser gives fixed setpiece floor cells the ordinary empty-tile edge.
			return Color("#385541")
	return Color("#343a39")


static func _region_floor_color(region_index: int) -> Color:
	var index := region_index if region_index >= 0 and region_index < REGION_FLOOR_COLORS.size() else 0
	return REGION_FLOOR_COLORS[index]


static func draw_vault_symbol(canvas: CanvasItem, rect: Rect2, tile_size: float, color := Color("#ef8129")) -> void:
	var left := rect.position.x + tile_size * 0.29
	var top := rect.position.y + tile_size * 0.23
	var right := rect.position.x + tile_size * 0.70
	var bottom := rect.position.y + tile_size * 0.76
	var middle_x := rect.position.x + tile_size * 0.41
	var middle_y := rect.position.y + tile_size * 0.63
	var inner_right := rect.position.x + tile_size * 0.72
	var inner_top := rect.position.y + tile_size * 0.19
	var outer := PackedVector2Array([Vector2(left, top), Vector2(left, bottom), Vector2(right, bottom)])
	var inner := PackedVector2Array([
		Vector2(middle_x, inner_top), Vector2(inner_right, inner_top),
		Vector2(inner_right, middle_y), Vector2(middle_x, middle_y), Vector2(middle_x, inner_top),
	])
	var line_width := maxf(1.0, tile_size * 0.06)
	canvas.draw_polyline(outer, color, line_width, true)
	canvas.draw_polyline(inner, color, line_width, true)


static func draw_gold_pile(canvas: CanvasItem, art_rect: Rect2, amount: int) -> void:
	if amount <= 0:
		return
	var tier := 0 if amount <= 4 else 1 if amount <= 8 else 2 if amount <= 13 else 3 if amount <= 19 else 4
	var shape: Dictionary = GOLD_PILE_SHAPES[tier]
	# The caller supplies the CSS-sized art box: primary=94% tile; secondary=54 design px.
	var scale := minf(art_rect.size.x, art_rect.size.y) / 44.0
	var origin := art_rect.position + (art_rect.size - Vector2.ONE * scale * 44.0) * 0.5
	var offset_y := float(shape.get("offset_y", 0.0))
	var stacks: Array = shape["stacks"]
	for index in range(stacks.size()):
		var stack: Dictionary = stacks[index]
		_draw_gold_stack(canvas, origin, scale, float(stack["x"]), float(stack["base"]), int(stack["coins"]), offset_y, index)
	var loose: Array = shape["loose"]
	for entry in loose:
		var coin: Dictionary = entry
		_draw_loose_gold_coin(canvas, origin, scale, float(coin["x"]), float(coin["y"]), float(coin["angle"]), offset_y)


static func _draw_gold_stack(canvas: CanvasItem, origin: Vector2, scale: float, x: float,
	base: float, coin_count: int, offset_y: float, index: int) -> void:
	var top := base - float(coin_count - 1) * 3.8
	var left := x - 6.0
	var right := x + 6.0
	var body := PackedVector2Array([
		Vector2(left, top), Vector2(right, top), Vector2(right, base),
		Vector2(right - 0.8, base + 2.5), Vector2(x, base + 3.5),
		Vector2(left + 0.8, base + 2.5), Vector2(left, base), Vector2(left, top),
	])
	var fill_points := PackedVector2Array(body)
	fill_points.remove_at(fill_points.size() - 1)
	canvas.draw_colored_polygon(_gold_points(origin, scale, offset_y, fill_points), Color("#edb416") if index % 2 == 0 else Color("#d99a09"))
	canvas.draw_polyline(_gold_points(origin, scale, offset_y, body), Color("#090807"), maxf(0.7, scale * 1.05), true)
	for layer in range(coin_count - 1):
		var y := top + float(layer + 1) * 3.8
		var curve := PackedVector2Array()
		for step in range(9):
			var t := float(step) / 8.0
			var one_minus_t := 1.0 - t
			var px := (left + 0.5) * one_minus_t * one_minus_t + 2.0 * x * one_minus_t * t + (right - 0.5) * t * t
			var py := y * one_minus_t * one_minus_t + 2.0 * (y + 3.1) * one_minus_t * t + y * t * t
			curve.append(Vector2(px, py))
		_draw_gold_polyline(canvas, origin, scale, offset_y, curve, Color("#98600a"), 0.85)
	_draw_gold_polyline(canvas, origin, scale, offset_y,
		PackedVector2Array([Vector2(left + 1.8, top + 3.3), Vector2(left + 1.8, base - 0.5)]), Color("#ffe364"), 0.8)
	_draw_gold_ellipse(canvas, origin, scale, offset_y, Vector2(x, top), 6.0, 2.6, Color("#ffda3e"), Color("#090807"), 1.05)
	_draw_gold_ellipse(canvas, origin, scale, offset_y, Vector2(x, top), 3.8, 1.35, Color.TRANSPARENT, Color("#ce9511"), 0.65)
	var shine := PackedVector2Array([Vector2(x - 3.4, top - 0.5), Vector2(x - 2.0, top - 1.45), Vector2(x + 0.5, top - 1.2), Vector2(x + 1.1, top - 0.8)])
	_draw_gold_polyline(canvas, origin, scale, offset_y, shine, Color("#fff5ab"), 1.1)


static func _draw_loose_gold_coin(canvas: CanvasItem, origin: Vector2, scale: float, x: float,
	y: float, angle_degrees: float, offset_y: float) -> void:
	var angle := deg_to_rad(angle_degrees)
	var shadow_center := Vector2(0.0, 1.2)
	_draw_gold_ellipse(canvas, origin, scale, offset_y, _rotate_gold_point(Vector2(x, y), shadow_center, angle),
		5.6, 2.8, Color("#cb8b08"), Color("#090807"), 1.05, angle)
	_draw_gold_ellipse(canvas, origin, scale, offset_y, Vector2(x, y), 5.6, 2.8, Color("#ffda3e"), Color("#090807"), 1.05, angle)
	_draw_gold_ellipse(canvas, origin, scale, offset_y, Vector2(x, y), 3.4, 1.4, Color.TRANSPARENT, Color("#cb9410"), 0.7, angle)
	var gloss := PackedVector2Array([Vector2(-3.5, -0.6), Vector2(-1.7, -1.45), Vector2(0.8, -1.2), Vector2(1.0, -0.9)])
	var rotated_gloss := PackedVector2Array()
	for point in gloss:
		rotated_gloss.append(_rotate_gold_point(Vector2(x, y), point, angle))
	_draw_gold_polyline(canvas, origin, scale, offset_y, rotated_gloss, Color("#fff5ab"), 1.1)


static func _rotate_gold_point(center: Vector2, point: Vector2, angle: float) -> Vector2:
	return center + Vector2(point.x * cos(angle) - point.y * sin(angle), point.x * sin(angle) + point.y * cos(angle))


static func _gold_points(origin: Vector2, scale: float, offset_y: float, points: PackedVector2Array) -> PackedVector2Array:
	var result := PackedVector2Array()
	for point in points:
		result.append(origin + Vector2(point.x, point.y + offset_y) * scale)
	return result


static func _draw_gold_polyline(canvas: CanvasItem, origin: Vector2, scale: float, offset_y: float,
	points: PackedVector2Array, color: Color, width: float) -> void:
	canvas.draw_polyline(_gold_points(origin, scale, offset_y, points), color, maxf(0.65, width * scale), true)


static func _draw_gold_ellipse(canvas: CanvasItem, origin: Vector2, scale: float, offset_y: float,
	center: Vector2, radius_x: float, radius_y: float, fill: Color, stroke: Color,
	stroke_width: float, rotation := 0.0) -> void:
	var points := PackedVector2Array()
	for step in range(25):
		var angle := float(step % 24) * TAU / 24.0
		var local := Vector2(cos(angle) * radius_x, sin(angle) * radius_y)
		if rotation != 0.0:
			local = Vector2(local.x * cos(rotation) - local.y * sin(rotation), local.x * sin(rotation) + local.y * cos(rotation))
		points.append(center + local)
	var mapped := _gold_points(origin, scale, offset_y, points)
	if not fill.is_equal_approx(Color.TRANSPARENT):
		canvas.draw_colored_polygon(mapped, fill)
	if not stroke.is_equal_approx(Color.TRANSPARENT):
		canvas.draw_polyline(mapped, stroke, maxf(0.65, stroke_width * scale), true)


static func draw_room_badge(canvas: CanvasItem, rect: Rect2, tile_size: float, label: String, font: Font) -> void:
	var font_size := clampi(roundi(tile_size * 0.15), 8, 14)
	var baseline := rect.position.y + rect.size.y * 0.5 + font_size * 0.36
	canvas.draw_string(font, Vector2(rect.position.x + 3.0, baseline), label,
		HORIZONTAL_ALIGNMENT_CENTER, rect.size.x - 6.0, font_size, Color("#f7f5ef"))


static func awareness_symbol(awareness: String) -> String:
	match awareness:
		"sleeping":
			return "Zzz"
		"awake":
			return "?"
		"alerted":
			return "!"
	return ""


static func draw_enemy_badge(canvas: CanvasItem, rect: Rect2, tile_size: float,
	state_symbol: String, enemy_name: String, remembered: bool, has_horizontal_neighbor: bool,
	state_font: Font, name_font: Font) -> void:
	var scale := tile_size / 136.0
	var max_design_width := 208.0
	if has_horizontal_neighbor:
		max_design_width = minf(max_design_width, 136.0 - 8.0)
	var max_width := max_design_width * scale
	var content_max_width := maxf(1.0, max_width - 16.0 * scale)
	var state_font_size := maxi(1, roundi(18.0 * scale))
	var name_font_size := maxi(1, roundi(20.0 * scale))
	var state_width := state_font.get_string_size(state_symbol, HORIZONTAL_ALIGNMENT_LEFT, -1, state_font_size).x
	var name_lines := _wrap_enemy_name(name_font, enemy_name, name_font_size, content_max_width)
	var content_width := state_width
	for line in name_lines:
		content_width = maxf(content_width, name_font.get_string_size(line, HORIZONTAL_ALIGNMENT_LEFT, -1, name_font_size).x)
	var badge_width := clampf(content_width + 16.0 * scale, 124.0 * scale, max_width)
	var inner_width := maxf(1.0, badge_width - 16.0 * scale)
	var state_line_height := 18.0 * 1.1 * scale
	var name_line_height := 20.0 * 1.2 * scale
	var badge_height := (4.0 + 14.0) * scale + state_line_height
	if not name_lines.is_empty():
		badge_height += 2.0 * scale + name_line_height * name_lines.size()
	var badge_rect := Rect2(rect.get_center() - Vector2(badge_width, badge_height) * 0.5,
		Vector2(badge_width, badge_height))
	var border_color := Color("#302724")
	var fill_color := Color("#6c5b52")
	var shadow_color := Color(0.0, 0.0, 0.0, 0.5)
	var alerted := false
	if not remembered:
		match state_symbol:
			"Zzz":
				border_color = Color("#4c5360")
				fill_color = Color("#636c7a")
			"?":
				border_color = Color("#896c28")
				fill_color = Color("#a17e2e")
			"!":
				border_color = Color("#7f221c")
				fill_color = Color("#b43329")
				shadow_color = Color("#ff735b", 0.28)
				alerted = true
	var shadow_rect := badge_rect
	shadow_rect.position.y += 4.0 * scale
	_draw_rounded_panel(canvas, shadow_rect, 8.0 * scale, Color(0.0, 0.0, 0.0, 0.5), Color.TRANSPARENT, 0.0)
	if alerted:
		_draw_rounded_panel(canvas, badge_rect.grow(3.0 * scale), 9.0 * scale, shadow_color, Color.TRANSPARENT, 0.0)
	_draw_rounded_panel(canvas, badge_rect, 8.0 * scale, fill_color, border_color, 2.0 * scale)
	var text_color := Color("#fff7e8")
	var text_top := badge_rect.position.y + 9.0 * scale
	var state_baseline := text_top + state_font_size * 0.9
	canvas.draw_string(state_font, Vector2(badge_rect.position.x + 8.0 * scale, state_baseline), state_symbol,
		HORIZONTAL_ALIGNMENT_CENTER, inner_width, state_font_size, text_color)
	var name_baseline := text_top + state_line_height + 2.0 * scale + name_font_size * 0.9
	for line in name_lines:
		canvas.draw_string(name_font, Vector2(badge_rect.position.x + 8.0 * scale, name_baseline), line,
			HORIZONTAL_ALIGNMENT_CENTER, inner_width, name_font_size, text_color)
		name_baseline += name_line_height


static func _wrap_enemy_name(font: Font, value: String, font_size: int, max_width: float) -> Array[String]:
	if value.is_empty():
		return []
	var lines: Array[String] = []
	var current := ""
	for word in value.split(" ", false):
		var candidate := word if current.is_empty() else current + " " + word
		if font.get_string_size(candidate, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x <= max_width:
			current = candidate
			continue
		if not current.is_empty():
			lines.append(current)
			current = ""
		if font.get_string_size(word, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x <= max_width:
			current = word
			continue
		for codepoint in word.to_utf32_buffer():
			var next_char := String.chr(codepoint)
			candidate = current + next_char
			if not current.is_empty() and font.get_string_size(candidate, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x > max_width:
				lines.append(current)
				current = next_char
			else:
				current = candidate
	if not current.is_empty():
		lines.append(current)
	var truncated := lines.size() > 2
	if truncated:
		lines.resize(2)
	if truncated and lines.size() == 2:
		var ellipsis := "…"
		while not lines[1].is_empty() and font.get_string_size(lines[1] + ellipsis, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x > max_width:
			lines[1] = lines[1].substr(0, lines[1].length() - 1)
		lines[1] += ellipsis
	return lines


static func _draw_rounded_panel(canvas: CanvasItem, rect: Rect2, radius: float,
	fill: Color, border: Color, border_width: float) -> void:
	var r := minf(radius, minf(rect.size.x, rect.size.y) * 0.5)
	var points := PackedVector2Array()
	var corners := [
		[Vector2(rect.end.x - r, rect.position.y + r), -90.0],
		[Vector2(rect.end.x - r, rect.end.y - r), 0.0],
		[Vector2(rect.position.x + r, rect.end.y - r), 90.0],
		[Vector2(rect.position.x + r, rect.position.y + r), 180.0],
	]
	for corner in corners:
		var center: Vector2 = corner[0]
		var start_angle: float = corner[1]
		for step in range(5):
			var angle := deg_to_rad(start_angle + float(step) * 90.0 / 4.0)
			points.append(center + Vector2(cos(angle), sin(angle)) * r)
	canvas.draw_colored_polygon(points, fill)
	if border_width > 0.0 and not border.is_equal_approx(Color.TRANSPARENT):
		var closed_points := points.duplicate()
		closed_points.append(points[0])
		canvas.draw_polyline(closed_points, border, border_width, true)


static func draw_tinkerer_sticker(canvas: CanvasItem, rect: Rect2, tile_size: float,
	position: Vector2i, map_seed: int) -> void:
	var scale := tile_size / 136.0
	var inset := tile_size * 0.08
	var backing_rect := rect.grow(-inset)
	_draw_rounded_panel(canvas, backing_rect, 3.0 * scale,
		Color("#292522"), Color("#252a2c"), 2.0 * scale)
	var sticker_id := StickerServices.tinkerer_sticker_at(position, map_seed)
	var icon_size := tile_size * (75.0 / 136.0)
	StickerArtDraw.draw_map_sticker(canvas, sticker_id,
		Rect2(rect.get_center() - Vector2.ONE * icon_size * 0.5, Vector2.ONE * icon_size))


static func minimap_color(room_type: String) -> Color:
	match room_type:
		"empty":
			return MINIMAP_FLOOR
		"rock":
			return MINIMAP_WALL
		"deckVault":
			return MINIMAP_VAULT
		"portal", "safePortal":
			return MINIMAP_PORTAL
		"heal", "partialHeal", "recoveryShrine", "vitalityShrine":
			return MINIMAP_RECOVERY
		"blessing":
			return MINIMAP_BLESSING
		"boss":
			return MINIMAP_ENEMY
	return MINIMAP_SPECIAL


static func out_of_vision_color(color: Color, room_type: String) -> Color:
	if room_type == "rock":
		return _adjust_saturation_brightness(color, 0.8, 0.88)
	if room_type == "empty":
		var gray := color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722
		var contrasted := clampf((gray - 0.5) * 1.05 + 0.5, 0.0, 1.0) * 0.76
		return Color(contrasted, contrasted, contrasted, color.a)
	return _adjust_saturation_brightness(color, 1.08, 0.86)


static func _region_tile_color(position: Vector2i, base: Color) -> Color:
	var hash := ((position.x * 0x45d9f3b) & 0xffffffff) ^ ((position.y * 0x119de1f3) & 0xffffffff)
	hash = ((hash ^ (hash >> 16)) * 0x45d9f3b) & 0xffffffff
	var brightness := 0.94 + float(hash & 255) / 255.0 * 0.12
	var saturation := 0.91 + float((hash >> 8) & 255) / 255.0 * 0.18
	var mean := (base.r + base.g + base.b) / 3.0
	return Color(
		clampf((mean + (base.r - mean) * saturation) * brightness, 0.0, 1.0),
		clampf((mean + (base.g - mean) * saturation) * brightness, 0.0, 1.0),
		clampf((mean + (base.b - mean) * saturation) * brightness, 0.0, 1.0),
		1.0
	)


static func _adjust_saturation_brightness(color: Color, saturation: float, brightness: float) -> Color:
	var mean := (color.r + color.g + color.b) / 3.0
	return Color(
		clampf((mean + (color.r - mean) * saturation) * brightness, 0.0, 1.0),
		clampf((mean + (color.g - mean) * saturation) * brightness, 0.0, 1.0),
		clampf((mean + (color.b - mean) * saturation) * brightness, 0.0, 1.0),
		color.a
	)
