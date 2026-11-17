extends SceneTree

const Selector = preload("res://scripts/map_deck_selector_trigger.gd")

class Game extends "res://scripts/main.gd":
	var settings_saves := 0
	func _ready() -> void:
		pass
	func _process(_delta: float) -> void:
		pass
	func _save_settings() -> void:
		settings_saves += 1


func _initialize() -> void:
	call_deferred("_run")


func _run() -> void:
	var game := Game.new()
	root.add_child(game)
	game.screen_name = "map"
	var surface := Control.new()
	surface.size = Vector2(600, 400)
	game.add_child(surface)
	game.active_map_surface = surface
	var host := Control.new()
	host.size = surface.size
	game.add_child(host)
	game.active_map_deck_selector_host = host
	var selector := Selector.new()
	host.add_child(selector)
	game.active_map_deck_selector = selector
	selector.position_changed.connect(game._on_map_deck_selector_position_changed)
	selector.position = Vector2(300, 200)
	selector._drag_origin = Vector2(30, 30)
	selector._position_origin = selector.position
	selector._pointer_down = true
	selector._update_reposition(Vector2(33, 30))
	assert(not selector.is_repositioning() and selector.position == Vector2(300, 200))
	selector._update_reposition(Vector2(90, 70))
	assert(selector.is_repositioning() and selector.position == Vector2(360, 240))
	selector._on_selector_pressed()
	assert(not selector._menu.visible, "Dragging must not open the deck menu")
	selector._update_reposition(Vector2(1000, -1000))
	assert(selector.position == Vector2(host.size.x - selector.size.x, 0))
	var release := InputEventMouseButton.new()
	release.button_index = MOUSE_BUTTON_LEFT
	release.pressed = false
	selector._gui_input(release)
	assert(not selector.is_repositioning() and game.settings_saves == 1)
	assert(game.map_deck_selector_position_ratio == Vector2(1, 0))
	surface.size = Vector2(400, 300)
	game._update_map_deck_selector_host()
	assert(selector.position == Vector2(roundf(400 - selector.size.x), 0))
	# A later ordinary click still opens the original selection menu.
	selector._drag_moved = false
	selector._on_selector_pressed()
	assert(selector._menu.visible)
	selector.close_menu()
	game.queue_free()
	await process_frame
	print("PASS: click threshold, bounded drag, no menu on drag, saved relative position, resize, normal click")
	quit()
