extends SceneTree

class Game extends "res://scripts/main.gd":
	var moves: Array[Vector2i] = []
	var waits := 0
	func _ready() -> void:
		set_process(false)
		screen_name = "map"
		run_state = {"position": Vector2i(40, 40)}
	func _try_move(position: Vector2i) -> void:
		moves.append(position)
	func _wait_on_map() -> void:
		waits += 1

func _init() -> void:
	call_deferred("run")

func run() -> void:
	var game := Game.new()
	root.add_child(game)
	var cases := {
		KEY_1: Vector2i(-1, 1), KEY_2: Vector2i(0, 1), KEY_3: Vector2i(1, 1),
		KEY_4: Vector2i(-1, 0), KEY_6: Vector2i(1, 0),
		KEY_7: Vector2i(-1, -1), KEY_8: Vector2i(0, -1), KEY_9: Vector2i(1, -1),
		KEY_KP_1: Vector2i(-1, 1), KEY_KP_2: Vector2i(0, 1), KEY_KP_3: Vector2i(1, 1),
		KEY_KP_4: Vector2i(-1, 0), KEY_KP_6: Vector2i(1, 0),
		KEY_KP_7: Vector2i(-1, -1), KEY_KP_8: Vector2i(0, -1), KEY_KP_9: Vector2i(1, -1),
	}
	for code in cases:
		for echo in [false, true]:
			var before := game.moves.size()
			var event := InputEventKey.new()
			event.keycode = code
			event.pressed = true
			event.echo = echo
			root.push_input(event, true)
			assert(game.moves.size() == before + 1, "move missing for " + str(code))
			assert(game.moves.back() == Vector2i(40, 40) + Vector2i(cases[code]))
	for code in [KEY_5, KEY_KP_5]:
		var event := InputEventKey.new()
		event.keycode = code
		event.pressed = true
		root.push_input(event, true)
	assert(game.waits == 2, "both 5 keys must wait")
	print("PASS: all eight directions for digit/numpad keys, OS repeats, both wait keys (34 input cases)")
	game.queue_free()
	await process_frame
	quit()
