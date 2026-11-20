extends SceneTree

const BattleChoiceFocus = preload("res://scripts/battle_choice_focus.gd")
const BattleDropButton = preload("res://scripts/battle_drop_button.gd")
const BattleFreePlayDrop = preload("res://scripts/battle_free_play_drop.gd")
const BattleHandFan = preload("res://scripts/battle_hand_fan.gd")


func _initialize() -> void:
	root.size = Vector2i(640, 480)
	call_deferred("_run_probe")


func _run_probe() -> void:
	var file := BattleDropButton.new()
	file.size = Vector2(100, 100)
	file.accepts_battle_drops = true
	root.add_child(file)
	var hand_card := Control.new()
	hand_card.position = Vector2(10, 110)
	hand_card.size = Vector2(80, 30)
	root.add_child(hand_card)
	file.drop_exclusion_controls = [hand_card]
	assert(not file.contains_battle_drop_local_point(Vector2(95, 120)),
		"file drop region must stay closed outside a drag")
	file.force_drag({"kind": "battle-card", "source": "file", "source_index": 1}, Control.new())
	assert(get_root().gui_is_dragging(), "probe did not start a battle-card drag")
	assert(file.contains_battle_drop_local_point(Vector2(95, 120)),
		"the 48px extra file target area should accept file-to-file points below the button")
	assert(not file.contains_battle_drop_local_point(Vector2(20, 120)),
		"extra file target area must not overlap the hand card")
	assert(not file.contains_battle_drop_local_point(Vector2(20, 149)),
		"extra file target area must stop at 48px")
	get_root().gui_cancel_drag()
	file.force_drag({"kind": "battle-card", "source": "hand"}, Control.new())
	file.notification(Control.NOTIFICATION_DRAG_BEGIN)
	assert(not file.contains_battle_drop_local_point(Vector2(95, 120)),
		"hand drags must not be snagged by the invisible 48px bottom extension")
	var free_play_hand := Control.new()
	free_play_hand.position = Vector2(0, 300)
	free_play_hand.size = Vector2(640, 180)
	root.add_child(free_play_hand)
	var accepted_early := BattleFreePlayDrop.can_drop(Vector2(50, 50), free_play_hand, [file],
		{"kind": "battle-card", "source": "hand"}, _valid_drop)
	assert(accepted_early, "during first 0.20s of hand drag, outside-hand play must win over file")
	file._process(0.21)
	var accepted_armed := BattleFreePlayDrop.can_drop(Vector2(50, 50), free_play_hand, [file],
		{"kind": "battle-card", "source": "hand"}, _valid_drop)
	assert(not accepted_armed, "after 0.20s of hand drag, armed top-card file target must take priority")
	free_play_hand.queue_free()
	get_root().gui_cancel_drag()
	var other_file := BattleDropButton.new()
	other_file.size = Vector2(100, 100)
	other_file.accepts_battle_drops = true
	root.add_child(other_file)
	file._apply_drop_guide("forge", false)
	other_file._apply_drop_guide("solitaire", false)
	assert(file._drop_guide_layers["forge_glow_inner"].visible
		and other_file._drop_guide_layers["solitaire_glow_inner"].visible,
		"when no file is hovered, all valid files should show their neon glow")
	file._apply_drop_guide("forge", true)
	assert(not file._drop_guide_layers["guide_outline"].visible,
		"hovered forge target should not show cyan border")
	assert(file._drop_guide_layers["hover_forge_glow"].visible
		and not file._drop_guide_layers["hover_use_glow"].visible
		and not file._drop_guide_layers["forge_glow_inner"].visible,
		"hovered forge target file should display the orange variant of the use glow effect")
	assert(not other_file._drop_guide_layers["solitaire_glow_inner"].visible,
		"non-hovered files must turn off neon while another file is hovered")
	assert(not file._drop_guide_layers["hover_outline"].visible,
		"drag hover must not show the pale-yellow hover border")
	assert(is_equal_approx(file._drop_guide_layers["guide_outline"].offset_bottom, 2.0),
		"cyan/yellow guides must keep the original card bottom, not include the 48px hit extension")
	assert(is_equal_approx(file._drop_guide_layers["hover_outline"].offset_bottom, 4.0),
		"yellow hover guide must keep the original slot bounds")
	file._apply_drop_guide("solitaire", false)
	assert(file._drop_guide_layers["solitaire_glow_inner"].visible
		and other_file._drop_guide_layers["solitaire_glow_inner"].visible
		and not file._drop_guide_layers["hover_use_glow"].visible,
		"leaving hovered file must restore neon on all valid files")
	file._apply_drop_guide("solitaire", true)
	assert(file._drop_guide_layers["hover_use_glow"].visible
		and not file._drop_guide_layers["solitaire_glow_inner"].visible
		and not other_file._drop_guide_layers["solitaire_glow_inner"].visible
		and not file._drop_guide_layers["hover_outline"].visible,
		"hovering solitaire file must show only the center-card use glow effect on that file")
	file._apply_drop_guide("none", false)
	other_file._apply_drop_guide("none", false)
	other_file.queue_free()
	var piles_row := HBoxContainer.new()
	piles_row.position = Vector2(640, 0)
	piles_row.size = Vector2(500, 300)
	root.add_child(piles_row)
	var short_file := BattleDropButton.new()
	short_file.custom_minimum_size = Vector2(100, 191)
	short_file.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	piles_row.add_child(short_file)
	var tall_file := BattleDropButton.new()
	tall_file.file_drag_cards = [{}, {}, {}, {}]
	tall_file.file_stack_offset = 27.0
	tall_file.custom_minimum_size = Vector2(100, 272)
	tall_file.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	piles_row.add_child(tall_file)
	await process_frame
	assert(is_equal_approx(short_file.size.y, 191.0) and is_equal_approx(tall_file.size.y, 272.0),
		"each file button must retain its own stack height inside the shared HBox row")
	assert(is_equal_approx(short_file._drop_guide_layers["guide_outline"].offset_bottom, 2.0)
		and is_equal_approx(tall_file._drop_guide_layers["guide_outline"].offset_bottom, 2.0),
		"file outlines must end at each file's own top-card bounds")

	var file_target := BattleDropButton.new()
	file_target.position = Vector2(130, 90)
	file_target.size = Vector2(140, 220)
	root.add_child(file_target)
	var file_visual := Control.new()
	file_visual.size = Vector2(136, 191)
	file_target.add_child(file_visual)
	file_target.file_drag_previews[0] = file_visual # Real file choices register their visible cards.
	file_target.drop_extension_bottom = 48.0
	var hand_fan := BattleHandFan.new()
	hand_fan.position = Vector2(0, 350)
	hand_fan.size = Vector2(640, 265)
	root.add_child(hand_fan)
	var hand_cards: Array[Control] = []
	for _index in range(3):
		var card := Control.new()
		card.custom_minimum_size = Vector2(136, 191)
		hand_cards.append(card)
	hand_fan.set_cards(hand_cards)
	await process_frame
	var hand_target: Control = hand_cards[1]
	var obstacles: Array[Control] = [file_target]
	obstacles.append_array(hand_cards)
	var file_focus := BattleChoiceFocus.new()
	file_focus.configure([file_target], [file_visual], "버릴 파일을 선택하세요. (남은 1회)", false, obstacles)
	root.add_child(file_focus)
	await process_frame
	await process_frame
	assert(file_focus.z_index == 90, "focus overlay should draw above hand cards and below presentation/tooltips")
	assert(file_visual.z_index == 91 and not file_visual.z_as_relative,
		"only the eligible file card visuals should rise above the dimmer")
	assert(file_focus._has_point(_overlay_point(file_focus, hand_target,
		hand_target.size * 0.5)),
		"file-choice focus must dim and shield the hand area")
	assert(not file_focus._has_point(_overlay_point(file_focus, file_target,
		file_target.size * 0.5)),
		"eligible file control should remain uncovered and clickable")
	assert(not _prompt_intersects(file_focus, obstacles), "file prompt must avoid file and hand card bounds")
	assert(file_focus._prompt.visible, "file instruction should remain visible in the small viewport gap")
	assert(file_focus._prompt.get_theme_font("font").resource_path.ends_with("PretendardVariable700.tres"),
		"focus instruction must use the requested Pretendard font")
	file_focus.queue_free()
	await process_frame
	var hand_focus := BattleChoiceFocus.new()
	hand_focus.configure(hand_cards, [hand_fan], "버릴 카드를 선택하세요. (남은 1장)", true, obstacles)
	root.add_child(hand_focus)
	await process_frame
	await process_frame
	assert(hand_fan.z_index == 91 and not hand_fan.z_as_relative,
		"raising the fan must preserve its native card ordering and hover lift")
	assert(hand_target.z_index > 0 and hand_target.z_as_relative,
		"fan cards must retain their individual layout-managed z order")
	assert(hand_focus._has_point(_overlay_point(hand_focus, file_target,
		file_target.size * 0.5)),
		"hand-choice focus must dim and shield the files")
	assert(not hand_focus._has_point(_overlay_point(hand_focus, hand_target,
		hand_target.size * 0.5)),
		"eligible hand control should remain uncovered and clickable")
	assert(not _prompt_intersects(hand_focus, obstacles), "hand prompt must avoid hand and file card bounds")
	assert(hand_focus._prompt.visible, "hand instruction should remain visible in the small viewport gap")
	var rotated_card: Control = hand_cards[0]
	assert(absf(rotated_card.rotation) > 0.01, "the hand silhouette probe must include a rotated card")
	assert(_aabb_corner_is_blocked(hand_focus, rotated_card),
		"rotated hand AABB corners outside the card silhouette must remain dimmed and blocked")
	hand_fan._raise_card(hand_target)
	await process_frame
	await process_frame
	assert(hand_fan.z_index == 91 and hand_target.z_index == 19,
		"fan hover relayout must preserve the lifted focus source and native hover stack")
	print("BATTLE_FOCUS_DROP_GEOMETRY=PASS")
	quit(0)


func _valid_drop(_payload: Dictionary, target_kind: String, _target_index: int) -> bool:
	return target_kind in ["center", "file"]


func _overlay_point(focus: Control, control: Control, local_point: Vector2) -> Vector2:
	var global_point: Vector2 = control.get_global_transform_with_canvas() * local_point
	return focus.get_global_transform_with_canvas().affine_inverse() * global_point


func _prompt_intersects(focus: Control, obstacles: Array[Control]) -> bool:
	for obstacle in obstacles:
		var obstacle_rect: Rect2 = focus._control_rect_in_overlay(obstacle)
		if focus._last_prompt_rect.intersects(obstacle_rect):
			return true
	return false


func _aabb_corner_is_blocked(focus: Control, card: Control) -> bool:
	var transform := card.get_global_transform_with_canvas()
	var corners := [Vector2.ZERO, Vector2(card.size.x, 0), card.size, Vector2(0, card.size.y)]
	var first: Vector2 = transform * corners[0]
	var left := first.x
	var right := first.x
	var top := first.y
	var bottom := first.y
	for corner in corners.slice(1):
		var point: Vector2 = transform * corner
		left = minf(left, point.x)
		right = maxf(right, point.x)
		top = minf(top, point.y)
		bottom = maxf(bottom, point.y)
	for offset in [Vector2(1, 1), Vector2(1, 5), Vector2(5, 1), Vector2(5, 5), Vector2(9, 2)]:
		var global_point: Vector2 = Vector2(left, top) + offset
		if not Rect2(Vector2(left, top), Vector2(right - left, bottom - top)).has_point(global_point):
			continue
		if Rect2(Vector2.ZERO, card.size).has_point(transform.affine_inverse() * global_point):
			continue
		var overlay_point: Vector2 = focus.get_global_transform_with_canvas().affine_inverse() * global_point
		return focus._has_point(overlay_point)
	return false
