extends SceneTree

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		_install_theme()
		set_process(false)

func _init() -> void:
	call_deferred("run")

func key(game: Control, pressed: bool) -> void:
	var event := InputEventKey.new()
	event.keycode = KEY_1
	event.pressed = pressed
	game._input(event)

func mouse(game: Control, button: MouseButton, pressed: bool, point: Vector2) -> void:
	var event := InputEventMouseButton.new()
	event.button_index = button
	event.pressed = pressed
	event.position = point
	game._input(event)

func run() -> void:
	create_timer(12.0).timeout.connect(func() -> void: quit(2))
	root.size = Vector2i(1280, 820)
	var game := Game.new()
	root.add_child(game)
	game.size = Vector2(1280, 820)
	var catalog = load("res://scripts/card_catalog.gd")
	var rules = load("res://scripts/battle_rules.gd")
	var enemy := {"name": "주황 슬라임", "hp": 30, "max_hp": 30, "gives_toxic_slime": true, "actions": [{"damage": 0}]}
	var deck: Array = catalog.create_starter_deck()
	game.run_state = {"deck": deck, "max_hp": 50, "player_name": "probe"}
	game.battle_state = rules.start_battle(deck, 50, enemy, 50)
	var token_id := -1
	for card in game.battle_state["hand"]:
		if card.get("effect") == "slime":
			token_id = int(card["id"])
	assert(token_id >= 0, "generated card must not use sentinel IDs")
	game._show_battle()
	await process_frame
	await process_frame
	assert(game.battle_hand_card_widgets.has(token_id), "slime widget missing")
	assert(game.battle_hand_card_widgets[token_id].visible, "slime hidden")
	key(game, true)
	assert(root.gui_is_dragging(), "key down must hold")
	var fan: Control = game.active_battle_hand_area
	for candidate in fan.card_controls:
		fan._raise_card(candidate)
	assert(fan.hovered_card == null, "other cards must not hover during hold")
	var selected: int = game.battle_keyboard_drag.card_id
	key(game, false)
	assert(not root.gui_is_dragging(), "key release must cancel")
	assert(game.battle_keyboard_drag.returning.has(selected), "return flight missing")
	await create_timer(0.3).timeout
	assert(game.battle_hand_card_widgets[selected].modulate.a == 1.0, "hand opacity not restored")
	var widget: Control = game.battle_hand_card_widgets[selected]
	var point := widget.get_global_transform_with_canvas() * (widget.size * 0.5)
	mouse(game, MOUSE_BUTTON_LEFT, true, point)
	mouse(game, MOUSE_BUTTON_LEFT, false, point)
	await process_frame
	assert(root.gui_is_dragging(), "click must keep card held after release")
	mouse(game, MOUSE_BUTTON_RIGHT, true, point)
	assert(not root.gui_is_dragging(), "right click must cancel")
	await create_timer(0.3).timeout
	game.battle_state["piles"][0] = []
	game._show_battle()
	await process_frame
	await process_frame
	key(game, true)
	selected = game.battle_keyboard_drag.card_id
	var file: Control = game.battle_pile_widgets[0]
	var destination := file.get_global_transform_with_canvas() * (file.size * 0.5)
	var motion := InputEventMouseMotion.new()
	motion.position = destination
	root.push_input(motion, true)
	await process_frame
	await process_frame
	mouse(game, MOUSE_BUTTON_LEFT, true, destination)
	assert(not root.gui_is_dragging(), "click on file must finish held drag")
	await create_timer(0.4).timeout
	assert(game.battle_state["piles"][0].back()["id"] == selected, "click drop missed file")
	key(game, false)
	mouse(game, MOUSE_BUTTON_LEFT, false, destination)
	await process_frame
	await process_frame
	var non_targeted_id := -1
	var defense: Dictionary = catalog.STARTER_CARDS[1].duplicate(true)
	defense["id"] = 777777
	game.battle_state["hand"].append(defense)
	game._show_battle()
	await process_frame
	await process_frame
	for candidate in game.battle_state["hand"]:
		if game.CardUse.mode(candidate) == game.CardUse.UNTARGETED:
			non_targeted_id = int(candidate["id"])
			break
	assert(non_targeted_id >= 0)
	game.battle_keyboard_drag._select(game, non_targeted_id)
	fan = game.active_battle_hand_area
	var band_point := fan.get_global_transform_with_canvas() * Vector2(fan.size.x * 0.5, fan.size.y * 0.90)
	motion = InputEventMouseMotion.new()
	motion.position = band_point
	game._input(motion)
	assert(not root.gui_is_dragging(), "lower hand band must cancel hold")
	await create_timer(0.3).timeout
	var upper_hand := fan.get_global_transform_with_canvas() * Vector2(fan.size.x * 0.5, fan.size.y * 0.25)
	assert(game.BattleFreePlayDrop.in_play_band(fan, upper_hand), "play band must extend into upper hand")
	game.battle_state["pending_play_card_id"] = int(game.battle_state["hand"].back()["id"])
	game.battle_state["pending_discard_count"] = 2
	game._show_battle()
	await process_frame
	await process_frame
	var discard_id: int = game.battle_state["hand"][0]["id"]
	key(game, true)
	assert(game._battle_hand_card(discard_id).is_empty(), "number key must discard immediately")
	key(game, false)
	var core: Dictionary
	for card in catalog.SPECIAL_CARDS:
		if card["effect"] == "plate_armor":
			core = card
	assert(game._card_description(core, false).contains("재련: [3코스트]"), "core condition missing")
	var orb = load("res://scripts/battle_energy_orb.gd").new()
	orb.configure(-2, 3)
	assert(orb.energy == -2)
	orb.free()
	game.deck_editor_effect_started_usec = Time.get_ticks_usec()
	game.deck_editor_origins_by_card_id = {501: "starter", 502: null}
	var normal_view: Control = game._deck_editor_card_widget(core)
	game.add_child(normal_view)
	game._apply_pending_deck_add_effect(normal_view, [501])
	assert(normal_view.get_node_or_null("PendingRemovalEffect") == null, "original card must not blink")
	var added_view: Control = game._deck_editor_card_widget(core)
	game.add_child(added_view)
	game._apply_pending_deck_add_effect(added_view, [501, 502])
	var addition_effect = added_view.get_node_or_null("PendingRemovalEffect")
	assert(addition_effect != null, "new stack must blink")
	addition_effect.update_for_elapsed_usec(800000)
	assert(addition_effect._group_ref.get_ref().self_modulate.a < 0.5, "new stack must dim")
	assert(addition_effect._badge == null, "addition must not show trash icon")
	print("PASS: key/click hold and return, solitaire priority, no hover while held, lower cancel band, expanded play band, immediate number discard, pending-add pulse without trash badge, slime, forge condition, negative energy")
	game.queue_free()
	await process_frame
	quit()
