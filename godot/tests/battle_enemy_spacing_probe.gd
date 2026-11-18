extends SceneTree

const Catalog = preload("res://scripts/card_catalog.gd")
const Rules = preload("res://scripts/battle_rules.gd")
const Area = preload("res://scripts/battle_enemy_target_area.gd")
const FreeDrop = preload("res://scripts/battle_free_play_drop.gd")

class Game extends "res://scripts/main.gd":
	var selected_events := 0
	func _ready() -> void:
		_install_theme()
	func _process(_delta: float) -> void:
		pass
	func _select_enemy_target(_index: int) -> void:
		selected_events += 1


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	root.content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	var game := Game.new()
	root.add_child(game)
	var cards: Array = []
	for index in 64:
		var card: Dictionary = Catalog.STARTER_CARDS[index % 2].duplicate(true)
		card.merge({"id": 100 + index, "revealed": true}, true)
		cards.append(card)
	for variant in [[Vector2i(1280, 850), 1, 4], [Vector2i(1280, 850), 2, 4], [Vector2i(1280, 850), 3, 8],
		[Vector2i(1920, 1080), 6, 8], [Vector2i(800, 600), 2, 4]]:
		root.size = variant[0]
		game.size = Vector2(variant[0])
		var enemies := []
		for index in variant[1]:
			enemies.append({"name": "쥐", "hp": 12, "max_hp": 12, "actions": [{"damage": 4, "player_weak_gain": 1}]})
		game.run_state = {"deck": cards, "max_hp": 50, "player_name": "배치 확인"}
		game.battle_state = Rules.start_battle(cards, 50, {"enemies": enemies}, 50)
		game.battle_state.hand = cards.slice(0, 4)
		var piles := []
		for index in variant[2]:
			piles.append(cards.slice(4 + index * 3, 7 + index * 3))
		game.battle_state.piles = piles
		game._show_battle()
		for frame in 8:
			await process_frame
		var board: Control = game.active_battle_play_area
		var files: Rect2 = board.files.get_global_rect()
		var rail: Rect2 = board.enemies.get_global_rect()
		var row_visual: Control = game.battle_pile_widgets[0].get_parent()
		var visible_file_end := minf(files.end.x, row_visual.get_global_rect().end.x)
		assert(visible_file_end + 12.0 <= rail.position.x, "Visible files and enemy field must be horizontally separate")
		assert(is_equal_approx(files.position.x, board.global_position.x), "Files can extend left independently of the hand center")
		assert(files.get_center().x < board.get_global_rect().get_center().x)
		if variant[0].x == 1280 and variant[2] == 4:
			var row: Control = game.battle_pile_widgets[0].get_parent()
			assert(absf(row.get_global_rect().get_center().x - board.hand.get_global_rect().get_center().x) < 1.0,
				"When four files fit, center them with the hand instead of pinning them left")
		var squares: Array[Rect2] = []
		for target in game.battle_enemy_widgets.values():
			var portrait: Control = target.get_meta("enemy_portrait")
			var intent_row: Control = portrait.get_node("EnemyIntentRow")
			var intent_description: Control = intent_row.get_node("EnemyIntentDescription")
			assert(intent_description.get_global_rect().end.y < portrait.get_global_rect().position.y,
				"Intent description must sit above the portrait, apart from current status icons")
			assert(absf(intent_row.get_child(0).get_global_rect().get_center().y - intent_description.get_global_rect().get_center().y) < 1.0,
				"Attack/effect symbols and description must share the same row")
			var local := Area.local_rect(target)
			var square := Area.global_rect(target)
			assert(is_equal_approx(square.size.x, square.size.y))
			assert(square.position.x >= visible_file_end + 12.0)
			assert(target._has_point(local.get_center() + Vector2(Area.SIDE * 0.5 - 1, Area.SIDE * 0.5 - 1)))
			assert(not target._has_point(local.get_center() + Vector2(Area.SIDE * 0.5 + 1, 0)))
			var hp: Control = target.get_meta("enemy_hp_bar")
			assert(not FreeDrop.contains_point(target, hp.get_global_rect().get_center()), "HP/labels cannot enlarge the targeting square")
			for other in squares:
				assert(not other.intersects(square), "Neighbor target squares must not overlap")
			squares.append(square)
		if variant[1] == 1:
			assert(absf(squares[0].get_center().x - rail.get_center().x) < 1.0,
				"A single enemy should sit in the center of the available field")
			var old_rail_center := board.global_position.x + board.size.x - clampf(board.size.x * 0.25, 200.0, 320.0) * 0.5 - 12.0
			assert(squares[0].get_center().x < old_rail_center - 20.0,
				"Spare file space should move the enemy away from the right edge")
		var first_target: Control = game.battle_enemy_widgets[0]
		var point := Area.global_rect(first_target).get_center()
		var motion := InputEventMouseMotion.new()
		motion.position = point
		root.push_input(motion, true)
		await process_frame
		var enemy_name := first_target.find_child("EnemyName", true, false) as Label
		assert(enemy_name.modulate.a == 1.0, "Enemy name should appear on portrait hover")
		var before := game.selected_events
		for down in [true, false]:
			var click := InputEventMouseButton.new()
			click.position = point
			click.button_index = MOUSE_BUTTON_LEFT
			click.pressed = down
			root.push_input(click, true)
		assert(game.selected_events == before + 1, "The portrait square must receive real clicks")
		point = first_target.get_meta("enemy_hp_bar").get_global_rect().get_center()
		motion.position = point
		root.push_input(motion, true)
		await process_frame
		assert(enemy_name.modulate.a == 1.0, "Enemy name should remain visible without hover")
		for down in [true, false]:
			var click := InputEventMouseButton.new()
			click.position = point
			click.button_index = MOUSE_BUTTON_LEFT
			click.pressed = down
			root.push_input(click, true)
		assert(game.selected_events == before + 1, "HP clicks must not select an enemy")
		if "--preview" in OS.get_cmdline_user_args() and variant[1] == 2 and variant[0].x == 1280:
			motion.position = Area.global_rect(first_target).get_center()
			root.push_input(motion, true)
			await process_frame
			await RenderingServer.frame_post_draw
			root.get_texture().get_image().save_png(ProjectSettings.globalize_path("res://../work/battle-enemy-spacing.png"))
	game.queue_free()
	await process_frame
	print("PASS: 5 viewport/formation cases, separate file/enemy x ranges, independent left-aligned files, precise nonoverlapping square targets")
	quit()
