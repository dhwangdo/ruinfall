extends SceneTree

const Fan = preload("res://scripts/battle_hand_fan.gd")

func _initialize() -> void:
	_run.call_deferred()

func _run() -> void:
	var fan := Fan.new()
	root.add_child(fan)
	var cards: Array[Control] = []
	for index in 11:
		cards.append(Control.new())
	fan.set_cards(cards)
	for width in [980.0, 1100.0]:
		fan.size = Vector2(width, 350)
		fan._layout_cards()
		assert(fan.layout_visible_count == 9, "Nine cards should fit a normal window")
		var count := 0
		for card in cards:
			if not card.visible:
				continue
			count += 1
			var bounds: Rect2 = card.get_transform() * Rect2(Vector2.ZERO, card.size)
			assert(bounds.position.x >= 0 and bounds.end.x <= width, "Rotated cards must fit horizontally")
		assert(count == 9)
		assert(is_equal_approx(absf(cards[0].rotation_degrees), 16.8))
	fan.size.x = 600
	fan._layout_cards()
	assert(fan.layout_visible_count < 9, "Small screens should retain readable spacing")
	fan.queue_free()
	await process_frame
	print("PASS: nine rotated cards fit 980/1100px, no edge clipping, narrow-screen fallback")
	quit()
