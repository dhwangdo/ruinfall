extends SceneTree

const Art = preload("res://scripts/enemy_tile_art.gd")
const Portrait = preload("res://scripts/battle_enemy_portrait.gd")


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	root.size = Vector2i(1200, 900)
	root.content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	var board := ColorRect.new()
	board.color = Color("#355b46")
	board.size = Vector2(1200, 900)
	root.add_child(board)
	var index := 0
	for enemy_name in Art.TILES:
		var origin := Vector2(index % 6 * 200, floori(index / 6.0) * 175)
		var portrait := Portrait.new()
		portrait.position = origin + Vector2(65, 25)
		portrait.size = Vector2(70, 75)
		portrait.configure({"name": enemy_name})
		board.add_child(portrait)
		var label := Label.new()
		label.text = enemy_name
		label.position = origin + Vector2(0, 110)
		label.size = Vector2(200, 25)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.add_theme_font_override("font", preload("res://assets/fonts/PretendardVariable.woff2"))
		label.add_theme_font_size_override("font_size", 17)
		board.add_child(label)
		index += 1
	await process_frame
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png(ProjectSettings.globalize_path("res://../work/dcss-all-enemies.png"))
	board.queue_free()
	print("Saved all-enemy art gallery")
	quit()
