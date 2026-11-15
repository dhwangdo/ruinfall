extends RefCounted

const BASE_SIZE := Vector2(149.6, 210.1)


static func apply(card: Control, factor: float) -> void:
	# One card layout and font size, scaled together in every full-card context.
	card.size = BASE_SIZE
	card.scale = Vector2.ONE * factor
