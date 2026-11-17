extends SceneTree

const Art = preload("res://scripts/enemy_tile_art.gd")
const Portrait = preload("res://scripts/battle_enemy_portrait.gd")
const View = preload("res://scripts/battle_enemy_view.gd")
const MapView = preload("res://scripts/map_view.gd")
const Catalog = preload("res://scripts/enemy_catalog.gd")


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	root.size = Vector2i(1280, 720)
	root.content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	var board := Control.new()
	board.size = Vector2(1280, 720)
	root.add_child(board)
	var background := ColorRect.new()
	background.color = Color("#355b46")
	background.size = board.size
	board.add_child(background)
	var names := ["주황 슬라임", "쥐", "실을 짜는 거미", "알집 바퀴", "골렘", "굶주린 들개"]
	var encounters := [1, 5, 22, 25, 2, 66]
	for i in names.size():
		var texture := Art.texture_for({"name": names[i]})
		assert(texture != null and texture.get_size() == Vector2(32, 32))
		assert(texture.get_image().detect_alpha() != Image.ALPHA_NONE)
		var target := Button.new()
		target.position = Vector2(10 + i * 210, 90)
		board.add_child(target)
		View.populate(target, {"name": names[i], "hp": 20, "max_hp": 20,
			"actions": [{"damage": 6}], "action_index": 0}, {"enemy_attack": 6}, [], func(): pass, "", true, false)
		var portrait: Control = target.get_meta("enemy_portrait")
		assert(portrait.tile_texture == texture)
		assert(portrait.texture_filter == CanvasItem.TEXTURE_FILTER_NEAREST)
		assert(portrait.mouse_filter == Control.MOUSE_FILTER_IGNORE)
		var map := MapView.new()
		map.position = Vector2(10 + i * 210, 390)
		map.size = Vector2(200, 200)
		board.add_child(map)
		var pos := Vector2i(100, 20)
		map.configure({"seen": {pos: true}, "visible_now": {pos: true},
			"walkable": {pos: true}, "room_types": {pos: "floor"},
			"enemy_positions": [pos], "enemy_states": [{"encounter_index": encounters[i], "awareness": "sleeping"}]},
			Vector2i(101, 20), [], Vector2(100.5, 20.5), 119.0)
		map.camera_center = Vector2(100.5, 20.5)
		assert(not map._enemy_tiles(encounters[i]).is_empty())
	# Unknown enemies retain the existing portrait instead of borrowing another species.
	var fallback := Portrait.new()
	fallback.configure({"name": "미등록 테스트 적"})
	assert(fallback.tile_texture == null)
	fallback.free()
	assert(Art.battle_rect({"name": "새끼 바퀴"}, Vector2(70, 75)).size.x == 48)
	var encountered_names := {}
	for encounter_index in range(1, 86):
		var rng := RandomNumberGenerator.new()
		rng.seed = encounter_index
		var encounter := Catalog.create_encounter(encounter_index, rng)
		for enemy in encounter.get("enemies", [encounter]):
			assert(Art.texture_for(enemy) != null, "Unmapped enemy: " + str(enemy.name))
			encountered_names[enemy.name] = true
	assert(encountered_names.size() == Art.TILES.size() - 1) # Hatchling is summoned in battle.
	var group_rects := Art.map_rects(Rect2(0, 0, 100, 100), 3)
	assert(group_rects.size() == 3 and group_rects[0].intersects(group_rects[1]))
	assert(group_rects[0].position.x < 0 and group_rects[2].end.x > 100)
	await process_frame
	await process_frame
	# The map normally recenters on the player after layout; center each preview cell.
	for child in board.get_children():
		if child is MapView:
			child.camera_center = Vector2(100.5, 20.5)
			child.queue_redraw()
	await process_frame
	for child in board.get_children():
		if child is MapView:
			var encounter_index: int = child.map_data.enemy_states[0].encounter_index
			assert(child._enemy_sprite_draws.size() == child._enemy_tiles(encounter_index).size())
			assert(child._enemy_sprite_layer.texture_filter == CanvasItem.TEXTURE_FILTER_NEAREST)
	if "--preview" in OS.get_cmdline_user_args():
		await RenderingServer.frame_post_draw
		root.get_texture().get_image().save_png(ProjectSettings.globalize_path("res://../work/dcss-enemy-preview.png"))
	print("PASS: all %d catalog enemies + hatchling mapped, overlapping group tiles, nearest filter, fallback, small hatchling" % encountered_names.size())
	board.queue_free()
	quit()
