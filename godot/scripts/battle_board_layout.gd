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
	var actor_center := maxf(size.x * 0.16, actor_width * 0.5 + 12.0)
	var first_row := maxf(160.0, minf(size.y * 0.54, size.y - hand_height - 80.0))
	var player_height := maxf(139.0, player.get_combined_minimum_size().y) if is_instance_valid(player) else 139.0
	var screen_center := size.x * 0.5
	var resource_width := maxf(160.0, 2.0 * (screen_center - actor_center) - actor_width - 32.0)
	# Files may use the open upper field, not only the gap between actor columns.
	var file_width := maxf(160.0, size.x - 48.0)
	var files_left := screen_center - file_width * 0.5
	# Identical column widths and mirrored centers keep both sides symmetric.
	_place(player, Rect2(actor_center - actor_width * 0.5, size.y * 0.5 - player_height * 0.5, actor_width, player_height))
	_place(files, Rect2(files_left, 0, file_width, first_row))
	_place(center, Rect2(screen_center - resource_width * 0.5, first_row - 10, resource_width, 112))
	# Keep the upper field free; multiple enemies fan out in two staggered columns.
	var enemy_width := minf(size.x * 0.36, 480.0)
	var enemy_left := size.x - enemy_width - 8.0
	if is_instance_valid(enemies) and enemies.get_child_count() <= 1:
		enemy_width = actor_width
		enemy_left = size.x - actor_center - actor_width * 0.5
	_place(enemies, Rect2(enemy_left, size.y * 0.36, enemy_width, size.y * 0.49))
	var hand_width := minf(1100.0, maxf(0.0, size.x - 24.0))
	_place(hand, Rect2(screen_center - hand_width * 0.5, size.y - hand_height + HAND_DOWN_OFFSET, hand_width, hand_height))


func _place(control: Control, rectangle: Rect2) -> void:
	if is_instance_valid(control):
		control.position = rectangle.position
		control.size = rectangle.size

