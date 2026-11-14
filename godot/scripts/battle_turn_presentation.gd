extends RefCounted

const CardToPlayer = preload("res://scripts/battle_card_to_player.gd")
const EnemyStrike = preload("res://scripts/battle_enemy_strike.gd")
const HitPopup = preload("res://scripts/battle_hit_popup.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const DefenseShield = preload("res://scripts/battle_defense_shield.gd")

var active_popup: Control
var player_popup_kind := "damage"
var enemy_popups: Dictionary = {}
var popup_host: Control


func present(game, before: Dictionary, final_state: Dictionary, draw_view: Dictionary, turn_view: Dictionary) -> void:
	var presenter = game.battle_draw_presentation
	var departures: Array = []
	for card in before.get("hand", []):
		if _retained(card) or str(card.get("effect", "")) == "slime":
			continue
		departures.append({"card": card, "source": game.battle_hand_card_widgets.get(int(card.get("id", -1)))})
	var ticket: int = await presenter.play_departures(game, departures, final_state, "discard")
	if ticket < 0:
		return
	if not await _present_toxic_slime(game, ticket, before, turn_view.get("toxic_slime", {})):
		return
	for step in turn_view.get("steps", []):
		if not await _present_enemy_step(game, ticket, step):
			return
	if not presenter._is_current(game, ticket):
		return
	if player_popup_kind == "damage":
		_clear_popup()
	game.battle_turn_resolving = false
	if draw_view.has("before") and draw_view.has("cleared") and draw_view.has("refill_before"):
		await presenter.begin_clear_prepared(game, draw_view, final_state)
	elif draw_view.has("before"):
		await presenter.begin_prepared(game, draw_view["before"], final_state)
	else:
		game.battle_state = final_state
		game._show_battle()


func _present_toxic_slime(game, ticket: int, before: Dictionary, slime: Dictionary) -> bool:
	var presenter = game.battle_draw_presentation
	if slime.is_empty() or bool(slime.get("extra_turn", false)):
		_layout_retained_hand(game, before)
		return presenter._is_current(game, ticket)
	var items: Array = []
	for card in before.get("hand", []):
		if str(card.get("effect", "")) != "slime":
			continue
		var source: Control = game.battle_hand_card_widgets.get(int(card.get("id", -1)))
		if is_instance_valid(source) and source.is_visible_in_tree():
			items.append({"card": card, "source": source})
	var reduced: bool = presenter._reduced_motion()
	var gap := 20.0 if reduced else 50.0
	for index in items.size():
		items[index]["delay_ms"] = index * gap
	var completion: Array[bool] = []
	var layer: Control
	if not items.is_empty() and is_instance_valid(game.active_battle_player_hp):
		layer = CardToPlayer.new()
		layer.name = "BattleToxicSlimeFlights"
		layer.z_index = 110
		presenter.active_flights = layer
		game.add_child(layer)
		layer.configure(items, Callable(game, "_card_widget").bind(false, false, false),
			game.active_battle_player_hp.get_global_rect(), 460.0, reduced)
		_connect_layer(game, ticket, layer, completion)
		layer.play()
	# Capture flight poses first, then remove discarded cards from the visible fan.
	_layout_retained_hand(game, before)
	var last_delay := maxf(0.0, float(items.size() - 1)) * gap
	var impact := ((60.0 if reduced else 380.0) + last_delay) / 1000.0 if not items.is_empty() else 0.0
	var duration := ((120.0 if reduced else 460.0) + last_delay) / 1000.0 if not items.is_empty() else 0.0
	if not await _wait(game, ticket, impact):
		return false
	_render_vitals(game, slime.get("after", {}))
	_show_hit(game, int(slime.get("damage_taken", 0)))
	if not await _wait(game, ticket, duration - impact):
		return false
	return await _finish_layer(game, ticket, layer, completion)


func _present_enemy_step(game, ticket: int, step: Dictionary) -> bool:
	var presenter = game.battle_draw_presentation
	var reduced: bool = presenter._reduced_motion()
	var attack := bool(step.get("attack", false))
	var duration := 0.05 if reduced else (0.35 if attack else 0.195)
	var impact := 0.02 if reduced else (0.193 if attack else 0.105)
	var gap := 0.03 if reduced or attack else 0.025
	var completion: Array[bool] = []
	var layer: Control
	var enemy_index := int(step.get("enemy_index", -1))
	var source: Control = game.battle_enemy_widgets.get(enemy_index)
	if attack and is_instance_valid(source):
		layer = EnemyStrike.new()
		layer.name = "BattleEnemyStrike"
		layer.z_index = 30
		presenter.active_flights = layer
		game.add_child(layer)
		layer.configure(source, Callable(game, "_battle_enemy_visual").bind(enemy_index), reduced)
		_connect_layer(game, ticket, layer, completion)
		layer.play()
	if not await _wait(game, ticket, impact):
		return false
	_render_vitals(game, step)
	if attack:
		_show_hit(game, int(step.get("damage", 0)))
	if not str(step.get("message", "")).is_empty():
		_show_message(game, step)
	if not await _wait(game, ticket, duration - impact):
		return false
	if not await _finish_layer(game, ticket, layer, completion):
		return false
	return await _wait(game, ticket, gap)


func _connect_layer(game, ticket: int, layer: Control, completion: Array[bool]) -> void:
	var presenter = game.battle_draw_presentation
	layer.finished.connect(func(cancelled: bool) -> void:
		completion.append(cancelled)
		if cancelled and presenter._is_current(game, ticket):
			presenter._resume_cancelled_action.call_deferred(game, ticket)
	, CONNECT_ONE_SHOT)


func _finish_layer(game, ticket: int, layer: Control, completion: Array[bool]) -> bool:
	var presenter = game.battle_draw_presentation
	if not presenter._is_current(game, ticket):
		return false
	if is_instance_valid(layer) and completion.is_empty():
		await layer.finished
	if not presenter._is_current(game, ticket) or (not completion.is_empty() and completion[0]):
		return false
	presenter.active_flights = null
	if is_instance_valid(layer):
		layer.queue_free()
	return true


func _wait(game, ticket: int, seconds: float) -> bool:
	var presenter = game.battle_draw_presentation
	if seconds > 0.0:
		await game.get_tree().create_timer(seconds).timeout
	return presenter._is_current(game, ticket)


func _retained(card: Dictionary) -> bool:
	return bool(card.get("preserve", false)) or CardStickers.retains_card(card)


func _layout_retained_hand(game, before: Dictionary) -> void:
	var fan: Control = game.active_battle_hand_area
	if not is_instance_valid(fan):
		return
	var kept: Array[Control] = []
	for card in before.get("hand", []):
		var widget: Control = game.battle_hand_card_widgets.get(int(card.get("id", -1)))
		if not is_instance_valid(widget):
			continue
		if _retained(card):
			kept.append(widget)
		else:
			widget.visible = false
	fan.card_controls = kept
	fan.window_start = 0
	fan.hovered_card = null
	fan._layout_cards()


func _render_vitals(game, values: Dictionary) -> void:
	var hp: ProgressBar = game.active_battle_player_hp
	if is_instance_valid(hp):
		var value := int(values.get("player_hp", hp.value))
		hp.value = clampf(value, 0.0, hp.max_value)
		game.active_battle_player_hp_text.text = "%d / %d" % [value, int(hp.max_value)]
	var strip: VBoxContainer = game.active_battle_defense_strip
	if not is_instance_valid(strip):
		return
	for child in strip.get_children():
		strip.remove_child(child)
		child.queue_free()
	for damage_type in ["physical", "magic"]:
		var key := "player_block" if damage_type == "physical" else "player_magic_block"
		var value := int(values.get(key, 0))
		if value > 0:
			var shield = DefenseShield.new()
			shield.configure(damage_type, value)
			strip.add_child(shield)


func _show_hit(game, damage: int) -> void:
	_show_player_popup(game, "-%d" % damage if damage > 0 else "막음", "damage")


func _show_player_popup(game, text: String, kind: String) -> void:
	_clear_popup()
	if not is_instance_valid(game.active_battle_player_hp):
		return
	active_popup = HitPopup.new()
	active_popup.name = "BattlePlayerHitPopup"
	player_popup_kind = kind
	active_popup.finished.connect(_on_player_popup_finished.bind(active_popup.get_instance_id()), CONNECT_ONE_SHOT)
	_popup_parent(game).add_child(active_popup)
	active_popup.configure(text, game.active_battle_player_hp.get_global_rect(), kind,
		Callable(self, "_player_popup_anchor").bind(game))
	active_popup.play()


func _show_message(game, step: Dictionary) -> void:
	var text := str(step.get("message", ""))
	var kind := str(step.get("message_kind", "buff"))
	if str(step.get("message_target", "enemy")) == "player":
		_show_player_popup(game, text, kind)
		return
	var index := int(step.get("enemy_index", -1))
	show_enemy_popup(game, index, text, kind)


func show_enemy_popup(game, index: int, text: String, kind: String = "damage") -> void:
	var anchor := _enemy_popup_anchor(game, index)
	if anchor.size == Vector2.ZERO:
		return
	_retire_popup(enemy_popups.get(index))
	var popup := HitPopup.new()
	popup.name = "BattleEnemyEffectPopup_%d" % index
	enemy_popups[index] = popup
	popup.finished.connect(_on_enemy_popup_finished.bind(index, popup.get_instance_id()), CONNECT_ONE_SHOT)
	_popup_parent(game).add_child(popup)
	popup.configure(text, anchor, kind, Callable(self, "_enemy_popup_anchor").bind(game, index))
	popup.play()


func retire_enemy_popup(index: int) -> void:
	_retire_popup(enemy_popups.get(index))
	enemy_popups.erase(index)


func _popup_parent(game) -> Control:
	if not is_instance_valid(popup_host):
		popup_host = Control.new()
		popup_host.name = "BattlePopupLayer"
		popup_host.mouse_filter = Control.MOUSE_FILTER_IGNORE
		popup_host.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		popup_host.z_index = 12
		game.add_child(popup_host)
	return popup_host


func _on_player_popup_finished(popup_id: int) -> void:
	if is_instance_valid(active_popup) and active_popup.get_instance_id() == popup_id:
		active_popup = null
		player_popup_kind = "damage"


func _on_enemy_popup_finished(index: int, popup_id: int) -> void:
	var popup = enemy_popups.get(index)
	if is_instance_valid(popup) and popup.get_instance_id() == popup_id:
		enemy_popups.erase(index)


func _player_popup_anchor(game) -> Rect2:
	if is_instance_valid(game) and game.is_inside_tree() and not game.is_queued_for_deletion() \
			and is_instance_valid(game.active_battle_player_hp):
		return game.active_battle_player_hp.get_global_rect()
	return Rect2()


func _enemy_popup_anchor(game, index: int) -> Rect2:
	if is_instance_valid(game) and game.is_inside_tree() and not game.is_queued_for_deletion():
		var widget: Control = game.battle_enemy_widgets.get(index)
		if is_instance_valid(widget):
			var hp: ProgressBar = widget.get_meta("enemy_hp_bar", null)
			if is_instance_valid(hp):
				return hp.get_global_rect()
			return widget.get_global_rect()
	return Rect2()


func on_view_cleared(game) -> void:
	if game.screen_name == "battle":
		return
	_clear_popup()
	for popup in enemy_popups.values():
		_retire_popup(popup)
	enemy_popups.clear()
	_retire_popup(popup_host)
	popup_host = null


func _retire_popup(popup) -> void:
	if is_instance_valid(popup):
		popup.hide()
		popup.queue_free()


func _clear_popup() -> void:
	_retire_popup(active_popup)
	active_popup = null
	player_popup_kind = "damage"
