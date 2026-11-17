extends Control

var player: Control
var files: Control
var center: Control
var enemies: Control
var hand: Control
var hand_height := 265.0
const HAND_DOWN_OFFSET := 30.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(arrange)
	arrange.call_deferred()


func arrange() -> void:
	if size.x <= 0 or size.y <= 0:
		return
	var actor_width := 250.0
	if is_instance_valid(player):
		actor_width = maxf(actor_width, player.get_combined_minimum_size().x)
	var actor_center := maxf(size.x * 0.145, actor_width * 0.5 + 12.0)
	var first_row := maxf(160.0, minf(size.y * 0.54, size.y - hand_height - 80.0))
	var player_height := maxf(139.0, player.get_combined_minimum_size().y) if is_instance_valid(player) else 139.0
	var screen_center := size.x * 0.5
	var resource_width := maxf(160.0, 2.0 * (screen_center - actor_center) - actor_width - 32.0)
	var play_center := size.x * 0.46
	var enemy_width := clampf(size.x * 0.25, 200.0, 320.0)
	var enemy_left := size.x - enemy_width - 12.0
	var file_right := enemy_left - 24.0
	var file_width := maxf(160.0, minf(play_center - 24.0, file_right - play_center) * 2.0)
	var files_left := play_center - file_width * 0.5
	# Identical column widths and mirrored centers keep both sides symmetric.
	_place(player, Rect2(actor_center - actor_width * 0.5, size.y * 0.5 - player_height * 0.5, actor_width, player_height))
	_place(files, Rect2(files_left, 0, file_width, first_row))
	_place(center, Rect2(screen_center - resource_width * 0.5, first_row - 10, resource_width, 112))
	# Reserve a separate right rail even when actors and files differ vertically.
	_place(enemies, Rect2(enemy_left, size.y * 0.36, enemy_width, size.y * 0.49))
	var hand_width := minf(1100.0, maxf(0.0, minf(play_center, size.x - play_center) * 2.0 - 24.0))
	_place(hand, Rect2(play_center - hand_width * 0.5, size.y - hand_height + HAND_DOWN_OFFSET, hand_width, hand_height))


func _place(control: Control, rectangle: Rect2) -> void:
	if is_instance_valid(control):
		control.position = rectangle.position
		control.size = rectangle.size

