extends Control
class_name BattleHandFan

signal layout_height_changed(height: float)

const CARD_WIDTH := 136.0
const CARD_HEIGHT := 191.0
const MAX_VISIBLE_CARDS := 9
const HAND_ANGLE_STEP := 3.4
const HAND_ARC_RADIUS := 1700.0
const HAND_EDGE_MARGIN := 12.0

var card_controls: Array[Control] = []
var window_start := 0
var layout_visible_count := 1
var layout_in_progress := false
var layout_height := 265.0
var hovered_card: Control


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	resized.connect(_layout_cards)
	get_viewport().size_changed.connect(_layout_cards)
	_layout_cards()


func _has_point(point: Vector2) -> bool:
	if not Rect2(Vector2.ZERO, size).has_point(point):
		return false
	if not get_viewport().gui_is_dragging():
		return true
	# Empty fan space overlaps the enemy column. Only visible cards may intercept drops.
	for card in card_controls:
		if is_instance_valid(card) and card.visible:
			var local_point := card.get_transform().affine_inverse() * point
			if Rect2(Vector2.ZERO, card.size).has_point(local_point):
				return true
	return false


func set_cards(cards: Array[Control]) -> void:
	for child in get_children():
		remove_child(child)
		child.queue_free()
	card_controls = cards
	window_start = 0
	for card in card_controls:
		add_child(card)
		card.mouse_entered.connect(_raise_card.bind(card))
		card.mouse_exited.connect(_lower_cards)
	_layout_cards()


func _gui_input(event: InputEvent) -> void:
	var mouse_event := event as InputEventMouseButton
	if mouse_event == null or not mouse_event.pressed or card_controls.size() <= layout_visible_count:
		return
	if mouse_event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
		window_start = mini(window_start + 1, card_controls.size() - layout_visible_count)
		_layout_cards()
		accept_event()
	elif mouse_event.button_index == MOUSE_BUTTON_WHEEL_UP:
		window_start = maxi(window_start - 1, 0)
		_layout_cards()
		accept_event()


func _raise_card(card: Control) -> void:
	if not is_instance_valid(card) or not card.visible:
		return
	hovered_card = card
	_layout_cards()


func _lower_cards() -> void:
	hovered_card = null
	_layout_cards()


func _layout_cards() -> void:
	if layout_in_progress:
		return
	layout_in_progress = true
	var viewport_width := size.x
	if viewport_width <= 1.0:
		viewport_width = minf(600.0, maxf(300.0, get_viewport_rect().size.x - 80.0))
	viewport_width = minf(viewport_width, 1100.0)
	var fitting_count := 1
	for candidate in [9, 7, 5, 3, 1]:
		var edge_angle := deg_to_rad(float(candidate - 1) / 2.0 * HAND_ANGLE_STEP)
		var outer_edge := HAND_ARC_RADIUS * sin(edge_angle) \
			+ CARD_WIDTH / 2.0 * cos(edge_angle) \
			+ CARD_HEIGHT * sin(edge_angle)
		if outer_edge * 2.0 + HAND_EDGE_MARGIN * 2.0 <= viewport_width:
			fitting_count = candidate
			break
	layout_visible_count = fitting_count
	var visible_count := mini(card_controls.size(), layout_visible_count)
	window_start = clampi(window_start, 0, maxi(0, card_controls.size() - visible_count))
	var edge_distance := maxf(0.0, float(visible_count - 1) / 2.0)
	var edge_angle := deg_to_rad(edge_distance * HAND_ANGLE_STEP)
	var clearance := maxf(52.0, ceil(HAND_ARC_RADIUS * (1.0 - cos(edge_angle)) + CARD_WIDTH / 2.0 * sin(edge_angle) + 16.0))
	var fan_height := CARD_HEIGHT + 22.0 + clearance
	for index in range(card_controls.size()):
		var card := card_controls[index]
		var visible_index := index - window_start
		card.scale = Vector2.ONE
		card.visible = visible_index >= 0 and visible_index < visible_count
		if not card.visible:
			continue
		card.size = Vector2(CARD_WIDTH, maxf(CARD_HEIGHT, card.get_combined_minimum_size().y))
		var distance := float(visible_index) - float(visible_count - 1) / 2.0
		var angle := deg_to_rad(distance * HAND_ANGLE_STEP)
		var top := HAND_ARC_RADIUS * (1.0 - cos(angle)) + 22.0
		var horizontal_center := viewport_width * 0.5 + HAND_ARC_RADIUS * sin(angle)
		card.position = Vector2(horizontal_center - CARD_WIDTH * 0.5, top)
		card.pivot_offset = Vector2(CARD_WIDTH / 2.0, card.size.y)
		card.rotation = angle
		card.z_index = visible_index + 1
		if card == hovered_card:
			card.rotation = 0
			card.scale = Vector2.ONE * 1.3
			card.position.y = 8.0
			card.z_index = MAX_VISIBLE_CARDS + 10
	custom_minimum_size = Vector2(viewport_width, fan_height)
	layout_in_progress = false
	if not is_equal_approx(layout_height, fan_height):
		layout_height = fan_height
		layout_height_changed.emit(fan_height)
