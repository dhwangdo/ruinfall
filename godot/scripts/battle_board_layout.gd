extends Control

var player: Control
var files: Control
var center: Control
var enemies: Control
var hand: Control
var hand_height := 265.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(arrange)
	arrange.call_deferred()


func arrange() -> void:
	if size.x <= 0 or size.y <= 0:
		return
	# The desktop reference uses .9fr / 2.7fr / 1fr, with minimum tracks.
	var widths := [220.0, 600.0, 240.0]
	var weights := [0.9, 2.7, 1.0]
	var available := size.x
	var remaining_weight := 4.6
	var fixed: Array[int] = []
	for iteration in range(3):
		for index in range(3):
			if not fixed.has(index) and available * weights[index] / remaining_weight < widths[index]:
				available -= widths[index]
				remaining_weight -= weights[index]
				fixed.append(index)
	for index in range(3):
		if not fixed.has(index):
			widths[index] = available * weights[index] / remaining_weight
	# Fit narrow native windows while keeping all three regions reachable.
	if widths[0] + widths[1] + widths[2] > size.x + 0.1:
		widths = [size.x * 0.20, size.x * 0.58, size.x * 0.22]
	var first_row := maxf(310.0, size.y - 112.0 - hand_height)
	var player_height := maxf(139.0, player.get_combined_minimum_size().y) if is_instance_valid(player) else 139.0
	_place(player, Rect2(12, first_row + 56.0 - player_height * 0.5, widths[0] - 24, player_height))
	_place(files, Rect2(widths[0], 0, widths[1], first_row))
	_place(center, Rect2(widths[0], first_row - 10, widths[1], 112))
	_place(enemies, Rect2(widths[0] + widths[1], 0, widths[2], size.y))
	var hand_width := minf(1100.0, size.x - 24)
	_place(hand, Rect2((size.x - hand_width) * 0.5, size.y - hand_height, hand_width, hand_height))
	queue_redraw()


func _place(control: Control, rectangle: Rect2) -> void:
	if is_instance_valid(control):
		control.position = rectangle.position
		control.size = rectangle.size


func _draw() -> void:
	if is_instance_valid(files):
		draw_rect(Rect2(files.position, files.size), Color(0, 0, 0, 0.035))
		draw_line(files.position + Vector2(0, files.size.y), files.position + files.size, Color(1, 1, 1, 0.1))
	if is_instance_valid(enemies):
		draw_line(Vector2(enemies.position.x, 0), Vector2(enemies.position.x, size.y), Color(1, 1, 1, 0.08))
