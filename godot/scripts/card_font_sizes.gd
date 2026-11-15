extends RefCounted


static func apply(card: Control, factor: float) -> void:
	if is_equal_approx(float(card.get_meta("card_font_factor", -1.0)), factor):
		return
	card.set_meta("card_font_factor", factor)
	_apply_node(card, factor)


static func _apply_node(node: Node, factor: float) -> void:
	if node is Control and node.has_meta("card_base_header_height"):
		var header_height := roundi(float(node.get_meta("card_base_header_height")) * factor)
		node.custom_minimum_size.y = header_height
		node.offset_bottom = node.offset_top + header_height
	if node is Control and node.has_meta("card_base_font_size"):
		var font_size := roundi(float(node.get_meta("card_base_font_size")) * factor)
		if node is RichTextLabel:
			if node.has_meta("card_body_size_variants"):
				var sizes: Vector3i = node.get_meta("card_body_size_variants")
				font_size = sizes.x if factor < 1.0 else sizes.z if factor > 1.0 else sizes.y
			for key in ["normal_font_size", "bold_font_size", "italics_font_size", "bold_italics_font_size"]:
				node.add_theme_font_size_override(key, font_size)
			node.text = str(node.get_meta("card_description_bbcode", node.text))
			node.autowrap_mode = TextServer.AUTOWRAP_WORD
		else:
			node.add_theme_font_size_override("font_size", font_size)
	for child in node.get_children():
		_apply_node(child, factor)
