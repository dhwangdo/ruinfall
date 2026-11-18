extends RefCounted

const NORMAL = preload("res://assets/ui/dcss/misc_deck.png")
const RARE = preload("res://assets/ui/dcss/misc_deck_rare.png")
const PALETTE = preload("res://shaders/deck_palette.gdshader")
const FUTURE_SHADER = preload("res://shaders/future_vault.gdshader")
const DECK_COLOR := Color("#db8a3d")
static var _vault_texture: ImageTexture
static var _future_background: GradientTexture2D
static var _future_material: ShaderMaterial


static func future_material() -> ShaderMaterial:
	if _future_material == null:
		_future_material = ShaderMaterial.new()
		_future_material.shader = FUTURE_SHADER
	return _future_material


static func draw_future_background(canvas: CanvasItem, cell: Rect2) -> void:
	if _future_background == null:
		_future_background = GradientTexture2D.new()
		_future_background.gradient = Gradient.new()
	canvas.draw_texture_rect(_future_background, cell, false)


static func vault_texture() -> Texture2D:
	if _vault_texture == null:
		var image := RARE.get_image()
		for y in image.get_height():
			for x in image.get_width():
				var source := image.get_pixel(x, y)
				var blue_cover := source.h > 0.52 and source.h < 0.78 and source.s > 0.08
				var gray := source.get_luminance()
				if blue_cover:
					gray = 0.35 if source.s >= 0.40 else 0.08
				elif source.v > 0.16:
					gray = 0.82 if source.v > 0.60 else 0.50
				image.set_pixel(x, y, Color(gray, gray, gray, source.a))
		_vault_texture = ImageTexture.create_from_image(image)
	return _vault_texture


static func draw_vault(canvas: CanvasItem, cell: Rect2, border: Color = DECK_COLOR, future: bool = false) -> void:
	var side := minf(cell.size.x, cell.size.y)
	var plate := Rect2(cell.get_center() - Vector2.ONE * side * 0.43, Vector2.ONE * side * 0.86)
	if future:
		# The animated background is a separate layer below the crisp icon/border.
		border = Color("#eed079")
	else:
		canvas.draw_rect(plate, Color("#0c0d0c"))
	canvas.draw_rect(plate, border, false, maxf(1.0, side * 0.025))
	var icon := Rect2(cell.get_center() - Vector2.ONE * side * 0.36, Vector2.ONE * side * 0.72)
	canvas.draw_texture_rect(vault_texture(), icon, false)


static func floor_rect(cell: Rect2) -> Rect2:
	return Rect2(cell.position + cell.size * 0.36, cell.size * 0.60)


static func palette_material(color: Color = DECK_COLOR) -> ShaderMaterial:
	var result := ShaderMaterial.new()
	result.shader = PALETTE
	result.set_shader_parameter("cover_color", color)
	return result
