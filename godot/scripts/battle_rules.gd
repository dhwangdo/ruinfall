extends RefCounted

class_name PortBattleRules

const CardUse = preload("res://scripts/card_use.gd")
const StatusRules = preload("res://scripts/battle_status_rules.gd")

const STARTING_ENERGY := 3
const CARDS_PER_FILE := 5
const EnemyCatalog = preload("res://scripts/enemy_catalog.gd")
const CardCatalog = preload("res://scripts/card_catalog.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const DeckEditions = preload("res://scripts/deck_editions.gd")
const SolitaireRules = preload("res://scripts/solitaire_rules.gd")


static func start_battle(deck: Array, player_hp: int, encounter: Dictionary = {}, max_player_hp: int = -1,
		deck_editions: Array = [], deck_capacity: int = -1, initial_draw_view: Variant = null,
		supplied_seed: int = -1) -> Dictionary:
	var random := RandomNumberGenerator.new()
	if supplied_seed >= 0:
		random.seed = supplied_seed
	else:
		random.randomize()
	var battle_seed := supplied_seed if supplied_seed >= 0 else int(random.randi())
	var cards: Array = deck.duplicate(true)
	var editions: Array = deck_editions.duplicate()
	var cards_per_file := 4 if editions.has("fantastic") else CARDS_PER_FILE
	var quick_hammer_forged := 0
	var quick_hammer_retrieved: Array = []
	if editions.has("quickHammer"):
		for _attempt in range(2):
			var forged_index := _apply_quick_hammer(cards, random)
			if forged_index >= 0:
				quick_hammer_forged += 1
				if editions.has("metallurgy"):
					quick_hammer_retrieved.append(cards[forged_index])
	var talisman_strength := 0
	var talisman_agility := 0
	for card in cards:
		CardUse.mode(card)
		card.erase("clockwork_triggered")
		if str(card.get("effect", "")) == "wolf_talisman":
			talisman_strength += int(card.get("value", 1))
		elif str(card.get("effect", "")) == "turtle_talisman":
			talisman_agility += int(card.get("value", 1))
	_shuffle(cards, random)
	var pile_count := int(ceil(float(cards.size()) / cards_per_file))
	var piles: Array = []
	for pile_index in range(pile_count):
		piles.append([])
	for card_index in range(cards.size()):
		var pile_index := mini(int(card_index / cards_per_file), pile_count - 1)
		piles[pile_index].append(cards[card_index])

	var enemy := encounter.duplicate(true) if not encounter.is_empty() else EnemyCatalog.create_encounter(1, random)
	var enemies: Array = enemy.get("enemies", [enemy]).duplicate(true)
	if enemies.is_empty():
		enemies.append(EnemyCatalog.create_encounter(1, random))
	var primary_enemy: Dictionary = enemies[0]
	var state := {
		"enemies": enemies,
		"target_enemy_index": 0,
		"enemy_name": str(primary_enemy.get("name", "적")),
		"enemy_hp": int(primary_enemy.get("hp", 24)),
		"enemy_max_hp": int(primary_enemy.get("max_hp", primary_enemy.get("hp", 24))),
		"enemy_strength": int(primary_enemy.get("strength", 0)),
		"enemy_vulnerable": int(primary_enemy.get("vulnerable", 0)),
		"enemy_weak": int(primary_enemy.get("weak", 0)),
		"enemy_hand_strength_gain": int(primary_enemy.get("hand_strength_gain", 0)),
		"enemy_empty_energy_strength_gain": int(primary_enemy.get("empty_energy_strength_gain", 0)),
		"enemy_powder": int(primary_enemy.get("powder", 0)),
		"enemy_physical_block": int(primary_enemy.get("physical_block", 0)),
		"enemy_boon": int(primary_enemy.get("boon", 0)),
		"enemy_thorns": int(primary_enemy.get("thorns", 0)),
		"enemy_sturdy_threshold": int(primary_enemy.get("sturdy_threshold", 0)),
		"enemy_quickness_ready": bool(primary_enemy.get("quickness_ready", false)),
		"enemy_berserk": int(primary_enemy.get("berserk", 0)),
		"enemy_first_action_completed": bool(primary_enemy.get("first_action_completed", false)),
		"enemy_stunned": bool(primary_enemy.get("stunned", false)),
		"enemy_solitaire_hit_bonus": int(primary_enemy.get("solitaire_hit_bonus", 0)),
		"enemy_solitaire_hit_bonus_stacks": int(primary_enemy.get("solitaire_hit_bonus_stacks", 0)),
		"enemy_is_boss": bool(primary_enemy.get("is_boss", false)),
		"tutorial_skip_enabled": bool(primary_enemy.get("tutorial_skip_enabled", false)),
		"acted_this_turn": false,
		"idle_turn_streak": 0,
		"enemy_actions": primary_enemy.get("actions", []).duplicate(true),
		"enemy_action_index": int(primary_enemy.get("action_index", 0)),
		"enemy_attack": 0,
		"enemy_intent": "",
		"enemy_trait": str(primary_enemy.get("trait", "")),
		"battle_seed": battle_seed,
		"player_hp": player_hp,
		"max_player_hp": maxi(player_hp, max_player_hp) if max_player_hp >= 0 else player_hp,
		"player_block": 0,
		"agility": talisman_agility,
		"player_corrosion": 0,
		"player_paralysis": 0,
		"player_confusion": 0,
		"magic_resistance": 0,
		"pending_magic_resistance_loss": 0,
		"cards_played_this_turn": 0,
		"pending_after_play_card_id": -1,
		"player_weak": 0,
		"player_vulnerable": 0,
		"player_invulnerability_turns": 0,
		"energy": STARTING_ENERGY,
		"max_energy": STARTING_ENERGY,
		"stars": 1,
		"temporary_solitaire_actions": 1 + int(editions.has("firstSolitaire")),
		"strength": talisman_strength,
		"pending_strength_loss": 0,
		"radiance_played_this_turn": 0,
		"turn": 1,
		"piles": piles,
		"cards_per_file": cards_per_file,
		"deck_editions": editions,
		"deck_capacity": deck_capacity,
		"hand": [],
		"discard": [],
		"exhausted": [],
		"active_rule_cards": [],
		"pending_draws": 0,
		"pending_pile_draw_count": 0,
		"pending_foresight_draws": 0,
		"pending_battery_energy": 0,
		"pending_extra_turns": 0,
		"pending_radiance": [],
		"pending_iron_song": [],
		"preserve_block_on_turn_end": false,
		"random_draw_sequence": 0,
		"reshuffle_count": 0,
		# Generated hand cards must not collide with the -1 "no card" sentinel.
		"next_generated_card_id": 2000000000,
		"forge_count": quick_hammer_forged,
		"discard_count": 0,
		"toxic_slime_added": false,
		"pending_summoners": [],
		"repeat_next_attack": false,
		"pending_play_card_id": -1,
		"pending_discard_count": 0,
		"pending_pile_operation": "",
		"status": "playing",
		"message": "각 파일의 맨 위 카드를 손패로 가져왔습니다.",
	}
	state["energy"] = maxi(0, int(state["max_energy"]) - _enemy_energy_recovery_penalty(state["enemies"]))
	if editions.has("gambit"):
		state["energy"] = int(state["energy"]) + 3
	var setup_random := RandomNumberGenerator.new()
	setup_random.seed = int(state["battle_seed"])
	var sticker_setup := CardStickers.place_starting_stickers(state["piles"], setup_random)
	state["piles"] = sticker_setup.get("piles", state["piles"])
	state["hand"] = sticker_setup.get("hand", [])
	for forged_card in quick_hammer_retrieved:
		for pile in state["piles"]:
			for index in range(pile.size() - 1, -1, -1):
				if int(pile[index].get("id", -1)) == int(forged_card.get("id", -2)):
					var retrieved_card: Dictionary = pile.pop_at(index)
					retrieved_card["revealed"] = true
					state["hand"].append(retrieved_card)
					sync_hand_stats(state)
					_reveal_file_top(pile)
	if editions.has("roomy"):
		state["piles"].append([])
	if editions.has("sunkenLegend"):
		if state["piles"].is_empty():
			state["piles"].append([])
		var legend: Dictionary = CardCatalog.LEGENDARY_CARDS[setup_random.randi_range(0, CardCatalog.LEGENDARY_CARDS.size() - 1)].duplicate(true)
		legend["id"] = int(state["next_generated_card_id"])
		state["next_generated_card_id"] = int(state["next_generated_card_id"]) - 1
		legend["token"] = true
		legend["revealed"] = false
		state["piles"][0].push_front(legend)
	if editions.has("prism"):
		for pile in state["piles"]:
			for index in range(pile.size()):
				if str(pile[index].get("effect", "")) == "radiance":
					pile[index] = CardStickers.with_random_sticker(pile[index], 1.0, setup_random)
		for index in range(state["hand"].size()):
			if str(state["hand"][index].get("effect", "")) == "radiance":
				state["hand"][index] = CardStickers.with_random_sticker(state["hand"][index], 1.0, setup_random)
	_add_encounter_start_cards(state)
	_confiscate_rare_cards(state, setup_random)
	_prepare_enemy_pile_seals(state, setup_random)
	_apply_enemy_turn_start(state)
	_draw_from_files(state, initial_draw_view)
	if editions.has("gambit"):
		_draw_random_cards(state, 3)
	_prepare_enemy_discard_targets(state)
	_add_enemy_intent_tokens_to_files(state)
	_refresh_enemy_intent(state)
	return state


static func select_enemy_target(state: Dictionary, enemy_index: int) -> Dictionary:
	var next: Dictionary = state.duplicate(true)
	sync_hand_stats(next)
	var enemies: Array = next.get("enemies", [])
	if enemy_index < 0 or enemy_index >= enemies.size() or int(enemies[enemy_index].get("hp", 0)) <= 0:
		return next
	next["target_enemy_index"] = enemy_index
	_load_enemy_aliases(next, enemy_index)
	_refresh_enemy_intent(next)
	return next


static func _load_enemy_aliases(state: Dictionary, enemy_index: int = -1) -> void:
	var enemies: Array = state.get("enemies", [])
	if enemies.is_empty():
		return
	var index := int(state.get("target_enemy_index", 0)) if enemy_index < 0 else enemy_index
	index = clampi(index, 0, enemies.size() - 1)
	state["target_enemy_index"] = index
	var enemy: Dictionary = enemies[index]
	state["enemy_name"] = str(enemy.get("name", "적"))
	state["enemy_hp"] = int(enemy.get("hp", 0))
	state["enemy_max_hp"] = int(enemy.get("max_hp", enemy.get("hp", 0)))
	state["enemy_strength"] = int(enemy.get("strength", 0))
	state["enemy_vulnerable"] = int(enemy.get("vulnerable", 0))
	state["enemy_weak"] = int(enemy.get("weak", 0))
	state["enemy_hand_strength_gain"] = int(enemy.get("hand_strength_gain", 0))
	state["enemy_empty_energy_strength_gain"] = int(enemy.get("empty_energy_strength_gain", 0))
	state["enemy_powder"] = int(enemy.get("powder", 0))
	state["enemy_physical_block"] = int(enemy.get("physical_block", 0))
	state["enemy_boon"] = int(enemy.get("boon", 0))
	state["enemy_thorns"] = int(enemy.get("thorns", 0))
	state["enemy_sturdy_threshold"] = int(enemy.get("sturdy_threshold", 0))
	state["enemy_quickness_ready"] = bool(enemy.get("quickness_ready", false))
	state["enemy_berserk"] = int(enemy.get("berserk", 0))
	state["enemy_first_action_completed"] = bool(enemy.get("first_action_completed", false))
	state["enemy_stunned"] = bool(enemy.get("stunned", false))
	state["enemy_solitaire_hit_bonus"] = int(enemy.get("solitaire_hit_bonus", 0))
	state["enemy_solitaire_hit_bonus_stacks"] = int(enemy.get("solitaire_hit_bonus_stacks", 0))
	state["enemy_is_boss"] = bool(enemy.get("is_boss", false))
	state["enemy_actions"] = enemy.get("actions", []).duplicate(true)
	state["enemy_action_index"] = int(enemy.get("action_index", 0))
	state["enemy_trait"] = str(enemy.get("trait", ""))


static func _save_enemy_aliases(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	var index := int(state.get("target_enemy_index", 0))
	if index < 0 or index >= enemies.size():
		return
	var enemy: Dictionary = enemies[index]
	enemy["hp"] = int(state.get("enemy_hp", enemy.get("hp", 0)))
	enemy["max_hp"] = int(state.get("enemy_max_hp", enemy.get("max_hp", enemy.get("hp", 0))))
	enemy["strength"] = int(state.get("enemy_strength", enemy.get("strength", 0)))
	enemy["vulnerable"] = int(state.get("enemy_vulnerable", enemy.get("vulnerable", 0)))
	enemy["weak"] = int(state.get("enemy_weak", enemy.get("weak", 0)))
	if enemy.has("powder") or int(state.get("enemy_powder", 0)) != 0:
		enemy["powder"] = int(state.get("enemy_powder", enemy.get("powder", 0)))
	enemy["physical_block"] = int(state.get("enemy_physical_block", enemy.get("physical_block", 0)))
	enemy["boon"] = int(state.get("enemy_boon", enemy.get("boon", 0)))
	enemy["thorns"] = int(state.get("enemy_thorns", enemy.get("thorns", 0)))
	enemy["sturdy_threshold"] = int(state.get("enemy_sturdy_threshold", enemy.get("sturdy_threshold", 0)))
	enemy["quickness_ready"] = bool(state.get("enemy_quickness_ready", enemy.get("quickness_ready", false)))
	enemy["berserk"] = int(state.get("enemy_berserk", enemy.get("berserk", 0)))
	enemy["first_action_completed"] = bool(state.get("enemy_first_action_completed", enemy.get("first_action_completed", false)))
	enemy["stunned"] = bool(state.get("enemy_stunned", enemy.get("stunned", false)))
	enemy["solitaire_hit_bonus_stacks"] = int(state.get("enemy_solitaire_hit_bonus_stacks", enemy.get("solitaire_hit_bonus_stacks", 0)))
	enemy["action_index"] = int(state.get("enemy_action_index", enemy.get("action_index", 0)))
	enemy["actions"] = state.get("enemy_actions", enemy.get("actions", [])).duplicate(true)
	enemies[index] = enemy
	state["enemies"] = enemies


static func _all_enemies_defeated(state: Dictionary) -> bool:
	for enemy in state.get("enemies", []):
		if int(enemy.get("hp", 0)) > 0:
			return false
	return true


static func _ensure_living_target(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	var current := int(state.get("target_enemy_index", 0))
	if current >= 0 and current < enemies.size() and int(enemies[current].get("hp", 0)) > 0:
		return
	for index in range(enemies.size()):
		if int(enemies[index].get("hp", 0)) > 0:
			state["target_enemy_index"] = index
			_load_enemy_aliases(state, index)
			return


static func _restore_enemy_target(state: Dictionary, preferred_index: int) -> void:
	var enemies: Array = state.get("enemies", [])
	if preferred_index >= 0 and preferred_index < enemies.size() and int(enemies[preferred_index].get("hp", 0)) > 0:
		state["target_enemy_index"] = preferred_index
		_load_enemy_aliases(state, preferred_index)
	else:
		_ensure_living_target(state)


static func play_card(state: Dictionary, card_id: int, play_view: Variant = null) -> Dictionary:
	if play_view is Dictionary:
		play_view["hits"] = []
		play_view.erase("resolved_message")
	var next: Dictionary = state.duplicate(true)
	sync_hand_stats(next)
	if next.get("status") != "playing":
		return next
	if int(next.get("pending_draws", 0)) > 0 or int(next.get("pending_pile_draw_count", 0)) > 0:
		return _with_message(next, "드로우할 파일을 먼저 선택하세요.")
	if int(next.get("pending_play_card_id", -1)) >= 0:
		return _with_message(next, "먼저 버릴 카드를 선택하거나 취소하세요.")
	if str(next.get("pending_pile_operation", "")) != "":
		return _with_message(next, "파일 하나를 선택해 카드 효과를 마무리하세요.")
	var card_index := _hand_card_index(next["hand"], card_id)
	if card_index < 0:
		return _with_message(next, "이 카드는 현재 손패에 없습니다.")
	var card: Dictionary = next["hand"][card_index]
	if not CardUse.is_playable(card):
		return _with_message(next, "%s은(는) 사용할 수 없습니다." % str(card.get("name", "카드")))
	if StatusRules.card_limit_reached(next):
		return _with_message(next, "마비: 이번 턴에는 카드를 3장까지만 사용할 수 있습니다.")
	if not can_pay_card_cost(next, card):
		return _with_message(next, "에너지가 부족합니다.")
	var discard_cost := int(card.get("discard_cost", 0))
	if discard_cost > 0:
		if next["hand"].size() - 1 < discard_cost:
			return _with_message(next, "버릴 카드 %d장이 필요합니다." % discard_cost)
		next["pending_play_card_id"] = card_id
		next["pending_discard_count"] = discard_cost
		next["message"] = "%s: 손패에서 버릴 카드 %d장을 선택하세요." % [card.get("name", "카드"), discard_cost]
		return _auto_discard_if_forced(next, play_view)
	return _resolve_card_play(next, card_id, play_view)


static func discard_hand_card_for_pending_play(state: Dictionary, discarded_card_id: int,
		play_view: Variant = null) -> Dictionary:
	if play_view is Dictionary:
		play_view["hits"] = []
		play_view.erase("resolved_message")
	var next := _discard_hand_card_for_pending_play_once(state, discarded_card_id, play_view)
	return _auto_discard_if_forced(next, play_view)


static func _discard_hand_card_for_pending_play_once(state: Dictionary, discarded_card_id: int,
		play_view: Variant = null) -> Dictionary:
	var next: Dictionary = state.duplicate(true)
	sync_hand_stats(next)
	var pending_id := int(next.get("pending_play_card_id", -1))
	if pending_id < 0 or discarded_card_id == pending_id:
		return _with_message(next, "사용할 카드와 다른 카드를 선택하세요.")
	var discard_index := _hand_card_index(next["hand"], discarded_card_id)
	if discard_index < 0:
		return _with_message(next, "버릴 카드를 찾을 수 없습니다.")
	var discarded: Dictionary = next["hand"].pop_at(discard_index)
	var saeongjima_draws := _discard_card(next, discarded, true, true, true)
	if saeongjima_draws > 0:
		_draw_random_cards(next, saeongjima_draws)
	var remaining_discards := maxi(0, int(next.get("pending_discard_count", 1)) - 1)
	next["pending_discard_count"] = remaining_discards
	if remaining_discards > 0:
		next["message"] = "버릴 카드 %d장을 더 선택하세요." % remaining_discards
		return next
	var pending_card_index := _hand_card_index(next["hand"], pending_id)
	if pending_card_index >= 0:
		var pending_card: Dictionary = next["hand"][pending_card_index]
		next["energy"] = int(next.get("energy", 0)) + int(pending_card.get("discard_energy_gain", 0))
	next["pending_play_card_id"] = -1
	return _resolve_card_play(next, pending_id, play_view)


static func _auto_discard_if_forced(state: Dictionary, play_view: Variant = null) -> Dictionary:
	var next := state
	while int(next.get("pending_play_card_id", -1)) >= 0:
		var pending_id := int(next["pending_play_card_id"])
		var eligible_ids: Array[int] = []
		for card in next.get("hand", []):
			var card_id := int(card.get("id", -1))
			if card_id != pending_id:
				eligible_ids.append(card_id)
		var required := maxi(0, int(next.get("pending_discard_count", 0)))
		if eligible_ids.size() > required:
			break
		if eligible_ids.is_empty():
			next = next.duplicate(true)
			next["pending_play_card_id"] = -1
			next["pending_discard_count"] = 0
			next = _resolve_card_play(next, pending_id, play_view)
			continue
		next = _discard_hand_card_for_pending_play_once(next, eligible_ids[0], play_view)
	return next


static func cancel_pending_play(state: Dictionary) -> Dictionary:
	var next: Dictionary = state.duplicate(true)
	sync_hand_stats(next)
	if int(next.get("pending_play_card_id", -1)) >= 0:
		next["pending_play_card_id"] = -1
		next["pending_discard_count"] = 0
		next["message"] = "카드 사용을 취소했습니다."
	return next


static func resolve_pile_operation(state: Dictionary, file_index: int) -> Dictionary:
	var next: Dictionary = state.duplicate(true)
	sync_hand_stats(next)
	var operation := str(next.get("pending_pile_operation", ""))
	if operation not in ["discardTop", "moveTopToBottom"]:
		return next
	var files: Array = next["piles"]
	if file_index < 0 or file_index >= files.size() or files[file_index].is_empty():
		return _with_message(next, "카드가 있는 파일을 선택하세요.")
	var card: Dictionary = files[file_index].pop_back()
	if operation == "discardTop":
		var saeongjima_draws := _discard_card(next, card, false, true)
		if saeongjima_draws > 0:
			_draw_random_cards(next, saeongjima_draws)
	else:
		card["revealed"] = true
		files[file_index].push_front(card)
	_reveal_file_top(files[file_index])
	next["pending_draws"] = mini(int(next.get("pending_draws", 0)), _available_draw_card_count(next))
	next["pending_pile_draw_count"] = mini(int(next.get("pending_pile_draw_count", 0)), _available_draw_card_count(next))
	next["pending_pile_operation"] = ""
	next["message"] = "%d번 파일의 맨 위 카드를 %s했습니다." % [
		file_index + 1,
		"버렸습니다" if operation == "discardTop" else "맨 밑으로 옮겼습니다",
	]
	return _finish_card_effects(next)


static func can_draw_from_file(state: Dictionary, file_index: int) -> bool:
	if int(state.get("pending_draws", 0)) <= 0 and int(state.get("pending_pile_draw_count", 0)) <= 0:
		return false
	var files: Array = state.get("piles", [])
	if file_index < 0 or file_index >= files.size() or files[file_index].is_empty():
		return false
	return not _blocked_pile_indexes(state).has(file_index)


static func draw_from_file(state: Dictionary, file_index: int) -> Dictionary:
	var next: Dictionary = state.duplicate(true)
	sync_hand_stats(next)
	var files: Array = next.get("piles", [])
	if file_index < 0 or file_index >= files.size():
		return _with_message(next, "드로우할 파일을 선택하세요.")
	if _blocked_pile_indexes(next).has(file_index):
		return _with_message(next, "봉인된 파일에서는 카드를 뽑을 수 없습니다.")
	var pile: Array = files[file_index]
	if pile.is_empty():
		return _with_message(next, "비어 있는 파일입니다. 다른 파일을 선택하세요.")
	var fixed_file_draw := int(next.get("pending_pile_draw_count", 0)) > 0
	var draws_to_take := int(next.get("pending_pile_draw_count", 0)) if fixed_file_draw else 1
	var drawn_count := 0
	for _draw_index in range(draws_to_take):
		if pile.is_empty():
			break
		var drawn_cards := CardStickers.take_pile_cards(pile)
		for card in drawn_cards:
			next["hand"].append(card)
			sync_hand_stats(next)
		drawn_count += drawn_cards.size()
	_reveal_file_top(pile)
	files[file_index] = pile
	next["piles"] = files
	if fixed_file_draw:
		next["pending_pile_draw_count"] = 0
	else:
		next["pending_draws"] = maxi(0, int(next.get("pending_draws", 0)) - 1)
	next["pending_draws"] = mini(int(next.get("pending_draws", 0)), _available_draw_card_count(next))
	if drawn_count == 0:
		next["pending_draws"] = 0
		next["pending_pile_draw_count"] = 0
		next["message"] = "드로우할 카드가 없습니다."
	elif int(next.get("pending_pile_draw_count", 0)) > 0:
		next["message"] = "선택한 파일에서 카드 %d장을 더 뽑으세요." % int(next["pending_pile_draw_count"])
	elif int(next.get("pending_draws", 0)) > 0:
		next["message"] = "다음 드로우 파일을 선택하세요. (남은 %d장)" % int(next["pending_draws"])
	else:
		next["message"] = "%d번 파일에서 %d장 드로우" % [file_index + 1, drawn_count]
	return _finish_card_effects(next)


static func move_hand_card_to_file(state: Dictionary, card_id: int, target_file: int) -> Dictionary:
	return move_cards_to_file(state, {"source": "hand", "card_id": card_id}, target_file)


static func move_top_between_files(state: Dictionary, source_file: int, target_file: int) -> Dictionary:
	var files: Array = state.get("piles", [])
	var card_index: int = files[source_file].size() - 1 if source_file >= 0 and source_file < files.size() else -1
	return move_cards_to_file(state, SolitaireRules.file_payload(state, source_file, card_index), target_file)


static func move_cards_to_file(state: Dictionary, payload: Dictionary, target_file: int) -> Dictionary:
	var error := SolitaireRules.move_error(state, payload, target_file)
	if error != "":
		return _with_message(state, error)
	var next: Dictionary = state.duplicate(true)
	sync_hand_stats(next)
	var files: Array = next["piles"]
	var moving: Array = SolitaireRules.source_cards(next, payload)
	var from_hand := str(payload.get("source", "")) == "hand"
	var star_cost := SolitaireRules.solitaire_star_cost(next, moving[0])
	var uses_temporary_action := CardStickers.solitaire_star_cost(moving[0]) > 0 \
		and int(next.get("temporary_solitaire_actions", 0)) > 0
	var target_card: Dictionary = files[target_file].back() if not files[target_file].is_empty() else {}
	var updated_target: Dictionary = target_card
	var consumes_target := false
	var forge_count := 0
	var placed: Array = []
	var retrieved: Array = []
	var metallurgy: bool = next.get("deck_editions", []).has("metallurgy")
	for moving_card in moving:
		# Every card uses the destination and discounts from BEFORE the move.
		var forge_probe: Dictionary = state.duplicate(false)
		var result := _resolve_forge_placement(forge_probe, moving_card, target_card)
		var card: Dictionary = result.get("card", moving_card)
		var applied := bool(result.get("applied", false))
		if applied:
			forge_count += 1
			consumes_target = consumes_target or bool(result.get("consumes_target", false))
			if str(moving_card.get("effect", "")) == "exchange":
				updated_target = result.get("target", target_card)
		if from_hand:
			card["revealed"] = true
			if CardStickers.has_sticker(card, "clockwork"):
				card["clockwork_triggered"] = true
		if applied and metallurgy:
			card["revealed"] = true
			retrieved.append(card)
		else:
			placed.append(card)
	if from_hand:
		next["hand"].remove_at(_hand_card_index(next["hand"], int(payload["card_id"])))
	else:
		var source_file := int(payload["source_index"])
		files[source_file].resize(int(payload["card_index"]))
		_reveal_file_top(files[source_file])
	if consumes_target:
		next["exhausted"].append(files[target_file].pop_back())
	elif not target_card.is_empty():
		files[target_file][-1] = updated_target
	files[target_file].append_array(placed)
	_reveal_file_top(files[target_file])
	next["hand"].append_array(retrieved)
	sync_hand_stats(next)
	next["forge_count"] = int(next.get("forge_count", 0)) + forge_count
	if uses_temporary_action:
		next["temporary_solitaire_actions"] = int(next["temporary_solitaire_actions"]) - 1
	else:
		next["stars"] = int(next["stars"]) - star_cost
	_arm_solitaire_enemy_bonuses(next)
	next["acted_this_turn"] = true
	next["idle_turn_streak"] = 0
	next["message"] = "%d장을 %d번 파일로 옮겼습니다." % [moving.size(), target_file + 1]
	if forge_count > 0:
		next["message"] += " · %d장 재련" % forge_count
	if not retrieved.is_empty():
		next["message"] += " · 금속학: %d장 가져옴" % retrieved.size()
	return next


static func _has_active_rule(state: Dictionary, effect: String) -> bool:
	for rule_card in state.get("active_rule_cards", []):
		if str(rule_card.get("effect", "")) == effect:
			return true
	return false


static func _resolve_forge_placement(state: Dictionary, moving_card: Dictionary, target_card: Dictionary) -> Dictionary:
	if target_card.is_empty():
		return {"applied": false, "card": moving_card, "target": target_card}
	if str(moving_card.get("effect", "")) == "obsidian_dagger":
		var completed_forges: Array = moving_card.get("forge_costs_completed", [])
		if completed_forges.size() >= 99 or str(target_card.get("kind", "")) != "strike":
			return {"applied": false, "card": moving_card, "target": target_card}
		var dagger := moving_card.duplicate(true)
		var next_completed_forges: Array = completed_forges.duplicate()
		next_completed_forges.append(completed_forges.size() + 1)
		dagger["forge_costs_completed"] = next_completed_forges
		dagger["forged"] = true
		state["forge_count"] = int(state.get("forge_count", 0)) + 1
		return {"applied": true, "card": dagger, "target": {}, "consumes_target": true}
	if bool(moving_card.get("forged", false)):
		return {"applied": false, "card": moving_card, "target": target_card}
	var target_cost := effective_card_cost(state, target_card) if target_card.has("cost") else 0
	var forge_target_name := str(moving_card.get("forge_target_name", ""))
	var target_matches := forge_target_name != "" and forge_target_name == str(target_card.get("name", ""))
	if forge_target_name == "소멸 카드":
		target_matches = bool(target_card.get("exhaust", false))
	elif forge_target_name == "사용 불가 카드":
		target_matches = not CardUse.is_playable(target_card)
	var forge_cost_matches := target_card.has("cost") and int(moving_card.get("forge_cost", 2147483647)) == target_cost
	if moving_card.has("forge_costs"):
		forge_cost_matches = forge_cost_matches or (target_card.has("cost") and moving_card.get("forge_costs", []).has(target_cost))
	var exchange := str(moving_card.get("effect", "")) == "exchange" and target_card.has("cost") and moving_card.has("cost")
	if str(moving_card.get("effect", "")) == "exchange" and not exchange:
		return {"applied": false, "card": moving_card, "target": target_card}
	var applied := exchange or forge_cost_matches or bool(moving_card.get("forge_any", false)) or target_matches
	if not applied:
		return {"applied": false, "card": moving_card, "target": target_card}
	var forged_card := moving_card.duplicate(true)
	var updated_target := target_card.duplicate(true)
	if exchange:
		forged_card["base_cost"] = moving_card.get("base_cost", moving_card["cost"])
		updated_target["base_cost"] = target_card.get("base_cost", target_card["cost"])
		forged_card["cost"] = int(target_card["cost"])
		updated_target["cost"] = int(moving_card["cost"])
	forged_card["forged"] = true
	if str(forged_card.get("effect", "")) == "spinning_slash":
		forged_card["use_mode"] = "untargeted"
	state["forge_count"] = int(state.get("forge_count", 0)) + 1
	return {"applied": true, "card": forged_card, "target": updated_target}


static func _apply_quick_hammer(cards: Array, random: RandomNumberGenerator) -> int:
	var candidates: Array[int] = []
	for index in range(cards.size()):
		var card: Dictionary = cards[index]
		if bool(card.get("forged", false)) or str(card.get("effect", "")) in ["exchange", "obsidian_dagger"]:
			continue
		if card.has("forge_cost") or card.has("forge_costs") or card.has("forge_target_name") or bool(card.get("forge_any", false)):
			candidates.append(index)
	if candidates.is_empty():
		return -1
	var selected: int = candidates[random.randi_range(0, candidates.size() - 1)]
	cards[selected]["forged"] = true
	if str(cards[selected].get("effect", "")) == "spinning_slash":
		cards[selected]["use_mode"] = "untargeted"
	return selected


static func end_turn(state: Dictionary, draw_view: Variant = null, turn_view: Variant = null) -> Dictionary:
	if turn_view is Dictionary:
		turn_view.clear()
		turn_view["steps"] = []
	if draw_view is Dictionary:
		draw_view.erase("before")
	var next: Dictionary = state.duplicate(true)
	sync_hand_stats(next)
	if next.get("status") != "playing":
		return next
	if int(next.get("pending_draws", 0)) > 0 or int(next.get("pending_pile_draw_count", 0)) > 0:
		return _with_message(next, "드로우할 파일을 먼저 선택하세요.")
	if int(next.get("pending_discard_count", 0)) > 0 or int(next.get("pending_play_card_id", -1)) >= 0:
		return _with_message(next, "먼저 버릴 카드를 선택하거나 취소하세요.")
	_load_enemy_aliases(next)
	_save_enemy_aliases(next)
	if str(next.get("pending_pile_operation", "")) != "":
		return _with_message(next, "파일을 선택해 카드 효과를 마무리하세요.")
	next["temporary_solitaire_actions"] = 0
	var acted_this_turn := int(next.get("cards_played_this_turn", 0)) > 0 or bool(next.get("acted_this_turn", false))
	next["acted_this_turn"] = false
	if acted_this_turn:
		next["idle_turn_streak"] = 0
	else:
		next["idle_turn_streak"] = int(next.get("idle_turn_streak", 0)) + 1
	if bool(next.get("tutorial_skip_enabled", false)) and int(next.get("idle_turn_streak", 0)) >= 2:
		var skip_enemies: Array = next.get("enemies", [])
		for skip_index in range(skip_enemies.size()):
			var skip_enemy: Dictionary = skip_enemies[skip_index]
			skip_enemy["hp"] = 0
			skip_enemies[skip_index] = skip_enemy
		next["enemies"] = skip_enemies
		next["enemy_hp"] = 0
		_discard_turn_end_hand(next, next["hand"].duplicate(true))
		next["status"] = "won"
		next["message"] = "전투에서 승리했습니다."
		return next
	var preferred_target_index := int(next.get("target_enemy_index", 0))
	var primary_enemy_index := -1
	var enemies_for_turn: Array = next.get("enemies", [])
	for enemy_index in range(enemies_for_turn.size()):
		if int(enemies_for_turn[enemy_index].get("hp", 0)) > 0:
			primary_enemy_index = enemy_index
			break
	if primary_enemy_index < 0:
		_discard_turn_end_hand(next, next["hand"].duplicate(true))
		next["status"] = "won"
		return next
	next["target_enemy_index"] = primary_enemy_index
	_load_enemy_aliases(next, primary_enemy_index)
	var turn_end_hand: Array = next["hand"].duplicate(true)
	if int(next.get("player_corrosion", 0)) > 0:
		next["player_block"] = int(next.get("player_block", 0)) / 2
		if turn_view is Dictionary:
			turn_view["corrosion"] = {"player_hp": next["player_hp"], "player_block": next["player_block"]}
	var steel_storm_count := 0
	for rule_card in next.get("active_rule_cards", []):
		if str(rule_card.get("effect", "")) == "steel_storm":
			steel_storm_count += 1
	if steel_storm_count > 0 and int(next.get("player_block", 0)) > 0:
		var steel_storm_enemies: Array = next.get("enemies", [])
		for enemy_index in range(steel_storm_enemies.size()):
			var storm_enemy: Dictionary = steel_storm_enemies[enemy_index]
			if int(storm_enemy.get("hp", 0)) <= 0:
				continue
			for _storm_index in range(steel_storm_count):
				if int(storm_enemy.get("hp", 0)) <= 0:
					break
				var blocked := mini(int(next.get("player_block", 0)), int(storm_enemy.get("physical_block", 0)))
				var damage := maxi(0, int(next.get("player_block", 0)) - blocked)
				storm_enemy["physical_block"] = int(storm_enemy.get("physical_block", 0)) - blocked
				storm_enemy["hp"] = maxi(0, int(storm_enemy["hp"]) - damage)
				steel_storm_enemies[enemy_index] = storm_enemy
				next["enemies"] = steel_storm_enemies
				_check_enemy_half_hp_passive(next, enemy_index)
				steel_storm_enemies = next.get("enemies", [])
				if enemy_index < steel_storm_enemies.size():
					storm_enemy = steel_storm_enemies[enemy_index]
		next["enemies"] = steel_storm_enemies
		_resolve_enemy_death_effects(next)
		if str(next.get("status", "playing")) == "lost":
			_discard_turn_end_hand(next, turn_end_hand)
			return next
		if _all_enemies_defeated(next):
			_discard_turn_end_hand(next, turn_end_hand)
			next["status"] = "won"
			next["message"] = "강철의 폭풍 · 승리!"
			return next
		_ensure_living_target(next)
	var toxic_slime_count := 0
	for held_card in next.get("hand", []):
		if str(held_card.get("effect", "")) == "slime":
			toxic_slime_count += 1
	var toxic_slime_damage := toxic_slime_count * 12
	var toxic_before := {
		"player_hp": int(next.get("player_hp", 0)),
		"player_block": int(next.get("player_block", 0)),
	}
	var toxic_blocked := 0
	var toxic_damage_taken := 0
	var toxic_extra_turn := int(next.get("pending_extra_turns", 0)) > 0
	var toxic_trace_recorded := false
	if toxic_slime_damage > 0 and int(next.get("player_invulnerability_turns", 0)) <= 0:
		toxic_blocked = mini(toxic_slime_damage, int(next.get("player_block", 0)))
		next["player_block"] = int(next.get("player_block", 0)) - toxic_blocked
		toxic_damage_taken = toxic_slime_damage - toxic_blocked
		next["player_hp"] = maxi(0, int(next.get("player_hp", 0)) - toxic_damage_taken)
		next["message"] = "유독성 점액: 피해 %d (방어 %d)" % [toxic_damage_taken, toxic_blocked]
		if int(next["player_hp"]) <= 0:
			_record_toxic_slime_turn_view(turn_view, toxic_slime_count, toxic_slime_damage,
				toxic_damage_taken, toxic_blocked, toxic_before, next, toxic_extra_turn, true)
			toxic_trace_recorded = true
			_discard_turn_end_hand(next, turn_end_hand)
			next["status"] = "lost"
			return next
	if toxic_slime_count > 0 and not toxic_trace_recorded:
		_record_toxic_slime_turn_view(turn_view, toxic_slime_count, toxic_slime_damage,
			toxic_damage_taken, toxic_blocked, toxic_before, next, toxic_extra_turn, false)

	if int(next.get("pending_extra_turns", 0)) > 0:
		next["pending_extra_turns"] = int(next["pending_extra_turns"]) - 1
		return _begin_extra_turn(next, preferred_target_index, turn_end_hand, draw_view)
	_clear_enemy_physical_blocks(next)
	_load_enemy_aliases(next)
	_resolve_enemies_turn(next, turn_view)
	if str(next.get("status", "playing")) != "playing":
		_discard_turn_end_hand(next, turn_end_hand)
		return next
	_ensure_living_target(next)
	_spawn_enemy_minions(next)
	_apply_shared_turn_end_strength(next)
	_discard_turn_end_hand(next, turn_end_hand)
	_expire_temporary_bonuses(next)
	if int(next.get("player_invulnerability_turns", 0)) > 0:
		next["player_invulnerability_turns"] = int(next["player_invulnerability_turns"]) - 1
	next["player_block"] = floori(float(next.get("player_block", 0)) / 2.0) if bool(next.get("preserve_block_on_turn_end", false)) else 0
	next["turn"] = int(next["turn"]) + 1
	next["radiance_played_this_turn"] = 0
	StatusRules.begin_turn(next)
	_apply_enemy_turn_start(next)
	_reset_solitaire_enemy_bonuses(next)
	_prepare_enemy_pile_seals(next)
	next["energy"] = _recover_battle_energy(next)
	_draw_from_files(next, draw_view)
	_apply_turn_start_effects(next)
	_prepare_enemy_discard_targets(next)
	_add_enemy_intent_tokens_to_files(next)
	_restore_enemy_target(next, preferred_target_index)
	_refresh_enemy_intent(next)
	return next


static func _expire_temporary_bonuses(state: Dictionary) -> void:
	sync_hand_stats(state)
	var strength_loss := int(state.get("pending_strength_loss", 0))
	if strength_loss != 0:
		state["strength"] = int(state.get("strength", 0)) - strength_loss
		state["pending_strength_loss"] = 0
	var resistance_loss := int(state.get("pending_magic_resistance_loss", 0))
	if resistance_loss != 0:
		state["magic_resistance"] = maxi(0, int(state.get("magic_resistance", 0)) - resistance_loss)
		state["pending_magic_resistance_loss"] = 0


static func _begin_extra_turn(state: Dictionary, preferred_target_index: int, turn_end_hand: Array, draw_view: Variant = null) -> Dictionary:
	var next := state
	_clear_enemy_physical_blocks(next)
	_discard_turn_end_hand(next, turn_end_hand)
	_expire_temporary_bonuses(next)
	next["player_block"] = floori(float(next.get("player_block", 0)) / 2.0) if bool(next.get("preserve_block_on_turn_end", false)) else 0
	next["turn"] = int(next.get("turn", 1)) + 1
	next["radiance_played_this_turn"] = 0
	StatusRules.begin_turn(next)
	_decay_enemy_statuses(next)
	_apply_enemy_turn_start(next)
	_reset_solitaire_enemy_bonuses(next)
	next["energy"] = _recover_battle_energy(next)
	_draw_from_files(next, draw_view)
	_apply_turn_start_effects(next)
	_prepare_enemy_discard_targets(next)
	_add_enemy_intent_tokens_to_files(next)
	_restore_enemy_target(next, preferred_target_index)
	_refresh_enemy_intent(next)
	next["message"] = "추가 턴을 시작합니다."
	return next


static func _resolve_enemies_turn(state: Dictionary, turn_view: Variant = null) -> void:
	sync_hand_stats(state)
	# Resolve every attack before decay or any action's non-attack effects.
	var enemies: Array = state.get("enemies", [])
	var cancelled: Array[int] = []
	var attack_results: Dictionary = {}
	for enemy_index in range(enemies.size()):
		if int(enemies[enemy_index].get("hp", 0)) <= 0:
			continue
		if not _resolve_enemy_attack_step(state, enemies, enemy_index, cancelled, attack_results, turn_view):
			return
		enemies = state.get("enemies", [])

	# Old statuses cover the complete attack phase; new statuses retain their full duration.
	_apply_player_status_turn_end(state, {})
	_decay_enemy_statuses(state)
	for enemy_index in range(enemies.size()):
		if cancelled.has(enemy_index) or int(enemies[enemy_index].get("hp", 0)) <= 0:
			continue
		_apply_enemy_action_effects_step(state, enemies, enemy_index, attack_results, turn_view)
	_resolve_enemy_death_effects(state)
	if int(state.get("player_hp", 0)) <= 0:
		state["status"] = "lost"
	elif _all_enemies_defeated(state):
		state["status"] = "won"
		state["message"] += " · 모든 적을 쓰러뜨렸습니다."


static func _resolve_enemy_attack_step(state: Dictionary, enemies: Array, enemy_index: int,
		cancelled: Array[int], attack_results: Dictionary, turn_view: Variant) -> bool:
	_load_enemy_aliases(state, enemy_index)
	var actions: Array = state.get("enemy_actions", [])
	var action_index := clampi(int(state.get("enemy_action_index", 0)), 0, actions.size() - 1) if not actions.is_empty() else -1
	var action: Dictionary = actions[action_index] if action_index >= 0 else {}
	if bool(state.get("enemy_stunned", false)):
		cancelled.append(enemy_index)
		state["enemy_stunned"] = false
		_save_enemy_aliases(state)
		_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index],
			str(action.get("name", "")), "행동 취소", "enemy", "cancel", state)
		return true
	var temporary_strength := _temporary_enemy_strength(state)
	var raw_damage := int(action.get("damage", 0)) + int(state.get("enemy_strength", 0)) + temporary_strength
	var hits := maxi(1, int(action.get("hits", 1)))
	var total_damage := 0
	var total_blocked := 0
	var protected_by_invulnerability := int(state.get("player_invulnerability_turns", 0)) > 0
	if int(action.get("damage", 0)) > 0 and not protected_by_invulnerability:
		for _hit_index in range(hits):
			var incoming := _calculate_attack_damage(
				raw_damage,
				int(state.get("enemy_weak", 0)),
				int(state.get("player_vulnerable", 0))
			)
			var blocked := mini(incoming, int(state.get("player_block", 0)))
			var damage := incoming - blocked
			state["player_block"] = int(state.get("player_block", 0)) - blocked
			total_damage += damage
			total_blocked += blocked
			state["player_hp"] = maxi(0, int(state.get("player_hp", 0)) - damage)
			_record_enemy_turn_view_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")), true, damage, state)
			if int(state["player_hp"]) <= 0:
				break
	elif int(action.get("damage", 0)) > 0:
		for _hit_index in range(hits):
			_record_enemy_turn_view_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")), true, 0, state)
	if int(state.get("player_hp", 0)) <= 0:
		state["status"] = "lost"
		state["message"] = "%s의 공격으로 쓰러졌습니다." % state["enemy_name"]
		_save_enemy_aliases(state)
		return false
	attack_results[enemy_index] = {"damage": total_damage, "blocked": total_blocked}
	if bool(action.get("self_destruct", false)):
		state["enemy_hp"] = 0
		_save_enemy_aliases(state)
		_resolve_enemy_death_effects(state)
		if str(state.get("status", "playing")) != "playing":
			return false
	return true


static func _apply_enemy_action_effects_step(state: Dictionary, enemies: Array, enemy_index: int,
		attack_results: Dictionary, turn_view: Variant) -> void:
	_load_enemy_aliases(state, enemy_index)
	var actions: Array = state.get("enemy_actions", [])
	if actions.is_empty():
		return
	var action_index := clampi(int(state.get("enemy_action_index", 0)), 0, actions.size() - 1)
	var action: Dictionary = actions[action_index]
	var total_damage := int(attack_results.get(enemy_index, {}).get("damage", 0))
	var total_blocked := int(attack_results.get(enemy_index, {}).get("blocked", 0))
	var protected_by_invulnerability := int(state.get("player_invulnerability_turns", 0)) > 0
	var effect_messages: Array[String] = []
	state["enemy_first_action_completed"] = true
	var toxic_slime_count := maxi(0, int(action.get("toxic_slime_count", 0)))
	if toxic_slime_count > 0:
		var hand: Array = state.get("hand", [])
		var generated_id := int(state.get("next_generated_card_id", -1))
		for _slime_index in range(toxic_slime_count):
			hand.append(CardCatalog.create_toxic_slime_card(generated_id))
			generated_id -= 1
		state["hand"] = hand
		state["next_generated_card_id"] = generated_id
		var slime_message := "유독성 점액 %d장 추가" % toxic_slime_count
		effect_messages.append("손패에 " + slime_message)
		_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
			slime_message, "player", "debuff", state)
	var enemy_weak_gain := int(action.get("weak_gain", 0))
	var enemy_vulnerable_gain := int(action.get("vulnerable_gain", 0))
	state["enemy_weak"] = int(state.get("enemy_weak", 0)) + enemy_weak_gain
	state["enemy_vulnerable"] = int(state.get("enemy_vulnerable", 0)) + enemy_vulnerable_gain
	var self_debuff_parts: Array[String] = []
	if enemy_weak_gain > 0:
		self_debuff_parts.append("약화 %d" % enemy_weak_gain)
	if enemy_vulnerable_gain > 0:
		self_debuff_parts.append("취약 %d" % enemy_vulnerable_gain)
	if not self_debuff_parts.is_empty():
		_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
			" · ".join(self_debuff_parts), "enemy", "self_debuff", state)
	var powder_gain := int(action.get("powder_gain", 0))
	if powder_gain > 0:
		state["enemy_powder"] = int(state.get("enemy_powder", 0)) + powder_gain
		effect_messages.append("화약 +%d" % powder_gain)
	var strength_gain := int(action.get("strength_gain", 0))
	if strength_gain > 0:
		state["enemy_strength"] = int(state.get("enemy_strength", 0)) + strength_gain
		effect_messages.append("힘 +%d" % strength_gain)
	var turn_end_strength_gain := int(enemies[enemy_index].get("turn_end_strength_gain", 0))
	if turn_end_strength_gain > 0:
		state["enemy_strength"] = int(state.get("enemy_strength", 0)) + turn_end_strength_gain
		effect_messages.append("턴 종료 힘 +%d" % turn_end_strength_gain)
	var block_gain := int(action.get("block_gain", 0))
	if block_gain > 0:
		state["enemy_physical_block"] = int(state.get("enemy_physical_block", 0)) + block_gain
		effect_messages.append("방어 +%d" % block_gain)
	var heal_gain := int(action.get("heal_gain", 0))
	if heal_gain > 0:
		var healed := mini(heal_gain, int(state.get("enemy_max_hp", 0)) - int(state.get("enemy_hp", 0)))
		state["enemy_hp"] = int(state.get("enemy_hp", 0)) + healed
		effect_messages.append("체력 +%d" % healed)
	var boon_gain := int(action.get("boon_gain", 0))
	if boon_gain > 0:
		state["enemy_boon"] = int(state.get("enemy_boon", 0)) + boon_gain
		effect_messages.append("가호 +%d" % boon_gain)
	var strength_loss := int(action.get("strength_loss", 0))
	if strength_loss > 0:
		state["strength"] = maxi(0, int(state.get("strength", 0)) - strength_loss)
		effect_messages.append("플레이어 힘 -%d" % strength_loss)
	var agility_loss := int(action.get("agility_loss", 0))
	if agility_loss > 0:
		state["agility"] = maxi(0, int(state.get("agility", 0)) - agility_loss)
		effect_messages.append("플레이어 강인함 -%d" % agility_loss)
	for kind in StatusRules.DEBUFFS:
		var requested := int(action.get("player_" + kind + "_gain", action.get("next_turn_player_" + kind + "_gain", 0)))
		if requested <= 0:
			continue
		var applied := StatusRules.apply_player_debuff(state, kind, requested)
		var status_message := "%s %d 부여" % [StatusRules.LABELS[kind], applied] if applied > 0 else "%s 차단" % StatusRules.LABELS[kind]
		effect_messages.append(status_message)
		_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
			status_message, "player", "debuff", state)
	var player_debuff_parts: Array[String] = []
	if strength_loss > 0:
		player_debuff_parts.append("힘 %d 감소" % strength_loss)
	if agility_loss > 0:
		player_debuff_parts.append("강인함 %d 감소" % agility_loss)
	if not player_debuff_parts.is_empty():
		_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
			" · ".join(player_debuff_parts), "player", "debuff", state)
	var discard_view: Dictionary = {}
	var discard_count := int(action.get("discard_count", 0)) + int(enemies[enemy_index].get("action_discard_count", 0))
	if discard_count > 0:
		var discarded_name := _discard_targeted_file_top(state, enemy_index, discard_count, discard_view)
		if discarded_name != "":
			effect_messages.append("파일 맨 위 %s 버림" % discarded_name)
	if not discard_view.is_empty():
		var discarded_count := int(discard_view.get("count", 0))
		var discard_message := "%d번 파일: %d장 버림" % [int(discard_view["file_index"]) + 1, discarded_count] \
			if discarded_count > 0 else "%d번 파일은 비어 있음" % (int(discard_view["file_index"]) + 1)
		_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
			discard_message, "enemy", "debuff", state)
	var own_effect_message := _enemy_action_effect_message(enemies[enemy_index], action)
	if own_effect_message != "":
		_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
			own_effect_message, "enemy", "buff", state)
	if bool(enemies[enemy_index].get("rests_when_blocked", false)) and int(action.get("damage", 0)) > 0:
		state["enemy_action_index"] = 1 if total_damage == 0 and actions.size() > 1 else 0
	else:
		state["enemy_action_index"] = _choose_next_enemy_action_index(state, actions, action_index, enemy_index)
	state["message"] += " · %s의 %s · 피해 %d (방어 %d)" % [state["enemy_name"], action.get("name", "행동"), total_damage, total_blocked]
	if protected_by_invulnerability:
		state["message"] += " · 무적"
	if not effect_messages.is_empty():
		state["message"] += " · " + " · ".join(effect_messages)
	if str(action.get("summon", "")) == "roachHatchling":
		var pending_summoners: Array = state.get("pending_summoners", [])
		pending_summoners.append(enemy_index)
		state["pending_summoners"] = pending_summoners
		_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
			EnemyCatalog.roach_summon_description(), "enemy", "buff", state)
	_save_enemy_aliases(state)
	_clear_enemy_discard_target(state, enemy_index)


static func _enemy_step_effect_snapshot(state: Dictionary) -> Dictionary:
	var snapshot: Dictionary = {}
	for key in state:
		if not state[key] is Array and not state[key] is Dictionary:
			snapshot[key] = state[key]
	for key in ["enemies", "hand", "deck_editions", "active_rule_cards", "pending_iron_song", "pending_radiance"]:
		if state.has(key):
			snapshot[key] = state[key].duplicate(true) if state[key] is Array or state[key] is Dictionary else state[key]
	_save_enemy_aliases(snapshot)
	return snapshot


static func _record_enemy_turn_view_step(turn_view: Variant, enemy_index: int, enemy: Dictionary, action_name: String, attack: bool, damage: int, state: Dictionary) -> void:
	if not turn_view is Dictionary:
		return
	var steps: Array = turn_view.get("steps", [])
	steps.append({
		"enemy_index": enemy_index,
		"enemy_id": enemy.get("id", null),
		"action_name": action_name,
		"attack": attack,
		"motion": "attack" if attack else "none",
		"damage": damage,
		"player_hp": int(state.get("player_hp", 0)),
		"player_block": int(state.get("player_block", 0)),
		"magic_resistance": int(state.get("magic_resistance", 0)),
		"effect_state": _enemy_step_effect_snapshot(state),
	})
	turn_view["steps"] = steps


static func _record_enemy_turn_message_step(turn_view: Variant, enemy_index: int, enemy: Dictionary, action_name: String,
		message: String, message_target: String, message_kind: String, state: Dictionary) -> void:
	if message == "":
		return
	_record_enemy_turn_view_step(turn_view, enemy_index, enemy, action_name, false, 0, state)
	if not turn_view is Dictionary:
		return
	var steps: Array = turn_view.get("steps", [])
	var step: Dictionary = steps.back()
	step["message"] = message
	step["message_target"] = message_target
	step["message_kind"] = "debuff" if message_kind == "self_debuff" else message_kind
	step["motion"] = message_kind if message_kind in ["buff", "debuff"] else "none"
	steps[-1] = step
	turn_view["steps"] = steps


static func _enemy_turn_status_label(kind: String, value: int) -> String:
	var label := "취약" if kind == "vulnerable" else "약화"
	return "%s %d" % [label, value]


static func _enemy_action_effect_message(enemy: Dictionary, action: Dictionary) -> String:
	var parts: Array[String] = []
	var strength_gain := maxi(0, int(action.get("strength_gain", 0))) + maxi(0, int(enemy.get("turn_end_strength_gain", 0)))
	if strength_gain > 0:
		parts.append("힘 +%d" % strength_gain)
	var block_gain := int(action.get("block_gain", 0))
	if block_gain > 0:
		parts.append("방어 +%d" % block_gain)
	var heal_gain := int(action.get("heal_gain", 0))
	if heal_gain > 0:
		parts.append("체력 +%d" % mini(heal_gain, int(enemy.get("max_hp", enemy.get("hp", 0))) - int(enemy.get("hp", 0))))
	var boon_gain := int(action.get("boon_gain", 0))
	if boon_gain > 0:
		parts.append("가호 +%d" % boon_gain)
	var powder_gain := int(action.get("powder_gain", 0))
	if powder_gain > 0:
		parts.append("화약 +%d" % powder_gain)
	return " · ".join(parts)


static func _record_toxic_slime_turn_view(turn_view: Variant, count: int, damage: int, damage_taken: int, blocked: int, before: Dictionary, state: Dictionary, extra_turn: bool, lethal: bool) -> void:
	if not turn_view is Dictionary or count <= 0:
		return
	turn_view["toxic_slime"] = {
		"count": count,
		"damage": damage,
		"damage_taken": damage_taken,
		"blocked": blocked,
		"before": before.duplicate(),
		"after": {
			"player_hp": int(state.get("player_hp", 0)),
			"player_block": int(state.get("player_block", 0)),
		},
		"extra_turn": extra_turn,
		"lethal": lethal,
	}


static func _apply_player_status_turn_end(state: Dictionary, changes: Dictionary) -> void:
	StatusRules.decay(state)
	for kind in StatusRules.DEBUFFS:
		if int(changes.get(kind, 0)) > 0:
			StatusRules.apply_player_debuff(state, kind, int(changes[kind]))


static func _choose_next_enemy_action_index(state: Dictionary, actions: Array, previous_index: int, enemy_index: int) -> int:
	if actions.size() <= 1:
		return 0
	var safe_previous_index := clampi(previous_index, 0, actions.size() - 1)
	var previous_action: Dictionary = actions[safe_previous_index]
	if previous_action.has("loop_to"):
		return int(previous_action["loop_to"])
	var first_action: Dictionary = actions[0]
	if bool(first_action.get("cycle", false)):
		return (safe_previous_index + 1) % actions.size()
	var random_no_repeat := bool(first_action.get("random_no_repeat", false))
	var choose_any := bool(first_action.get("random_each_turn", false)) and not random_no_repeat
	var candidates: Array[int] = []
	for candidate_index in range(actions.size()):
		if choose_any or candidate_index != safe_previous_index:
			candidates.append(candidate_index)
	if candidates.is_empty():
		return 0
	var random := RandomNumberGenerator.new()
	random.seed = int(state.get("battle_seed", 0)) + int(state.get("turn", 1)) * 7919 + enemy_index * 101 + safe_previous_index
	return candidates[random.randi_range(0, candidates.size() - 1)]


static func _resolve_enemy_death_effects(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	while true:
		var dead_index := -1
		for enemy_index in range(enemies.size()):
			if int(enemies[enemy_index].get("hp", 0)) <= 0 and not bool(enemies[enemy_index].get("death_resolved", false)):
				dead_index = enemy_index
				break
		if dead_index < 0:
			break
		var dead: Dictionary = enemies[dead_index]
		var powder := int(dead.get("powder", 0))
		var confiscated: Array = dead.get("confiscated_cards", [])
		for card in confiscated:
			var returned_card: Dictionary = card.duplicate(true)
			returned_card["revealed"] = true
			state["hand"].append(returned_card)
			sync_hand_stats(state)
		if not confiscated.is_empty():
			state["message"] += " · 압수된 카드를 손패로 돌려받았습니다."
		var stun_target_name := str(dead.get("stun_ally_on_death", ""))
		if stun_target_name == "puppetColossus":
			for ally_index in range(enemies.size()):
				if ally_index == dead_index or int(enemies[ally_index].get("hp", 0)) <= 0:
					continue
				if str(enemies[ally_index].get("name", "")) == "꼭두각시 거병":
					var stunned_ally: Dictionary = enemies[ally_index]
					stunned_ally["stunned"] = true
					enemies[ally_index] = stunned_ally
		dead["death_resolved"] = true
		dead["confiscated_cards"] = []
		enemies[dead_index] = dead
		state["enemies"] = enemies
		if powder <= 0:
			continue
		var protected := int(state.get("player_invulnerability_turns", 0)) > 0
		if not protected:
			var player_block := int(state.get("player_block", 0))
			var player_blocked := mini(powder, player_block)
			var player_damage := powder - player_blocked
			state["player_block"] = player_block - player_blocked
			state["player_hp"] = maxi(0, int(state.get("player_hp", 0)) - player_damage)
			state["message"] += " · %s 폭발: 플레이어 피해 %d" % [dead.get("name", "적"), player_damage]
		else:
			state["message"] += " · %s 폭발: 무적" % dead.get("name", "적")
		for enemy_index in range(enemies.size()):
			if enemy_index == dead_index or int(enemies[enemy_index].get("hp", 0)) <= 0:
				continue
			var enemy: Dictionary = enemies[enemy_index]
			var enemy_block := int(enemy.get("physical_block", 0))
			var blocked := mini(powder, enemy_block)
			enemy["physical_block"] = enemy_block - blocked
			enemy["hp"] = maxi(0, int(enemy.get("hp", 0)) - powder + blocked)
			enemies[enemy_index] = enemy
		state["enemies"] = enemies
		if int(state.get("player_hp", 0)) <= 0:
			state["status"] = "lost"
			return
	state["enemies"] = enemies
	if _all_enemies_defeated(state) and str(state.get("status", "playing")) == "playing":
		state["status"] = "won"


static func _is_attack_card(card: Dictionary) -> bool:
	return CardUse.is_attack(card)


static func sync_hand_stats(state: Dictionary) -> void:
	# Track only the contribution already applied, so changes to real strength
	# and agility remain intact when a book enters/leaves the hand.
	var amount := _held_stat_amount(state)
	var delta := amount - int(state.get("applied_hand_stat_bonus", 0))
	state["strength"] = int(state.get("strength", 0)) + delta
	state["agility"] = int(state.get("agility", 0)) + delta
	state["applied_hand_stat_bonus"] = amount


static func _held_stat_amount(state: Dictionary) -> int:
	var bonus := 0
	for held_card in state.get("hand", []):
		if str(held_card.get("effect", "")) in ["combat_manual", "strategy_book"]:
			bonus += int(held_card.get("value", 0))
	return bonus


static func _resolve_card_play(state: Dictionary, card_id: int, play_view: Variant = null) -> Dictionary:
	sync_hand_stats(state)
	var next: Dictionary = state
	_load_enemy_aliases(next)
	var prep := _prepare_card_play(next, card_id)
	if not bool(prep.get("ok", false)):
		return prep["state"]
	var card_index: int = int(prep["card_index"])
	var card: Dictionary = prep["card"]
	var hand_before_play: Array = prep["hand_before_play"]
	var cost: int = int(prep["cost"])
	var effect: String = str(prep["effect"])
	next["energy"] = int(next["energy"]) - cost
	var giant_triggered: bool = cost >= 3 and next.get("deck_editions", []).has("giant")
	if giant_triggered:
		next["energy"] = int(next["energy"]) + 1
	next["cards_played_this_turn"] = int(next.get("cards_played_this_turn", 0)) + 1
	# Cleansing on Brave Strike must occur before damage is calculated.
	StatusRules.cleanse(next, card.get("remove_player_debuffs", {}))
	var hit_count := _compute_card_hit_count(next, card, effect)
	var enemy_hp_before_attack := int(next["enemy_hp"])
	var attack_totals := _resolve_card_attack_phase(next, card, effect, hit_count, play_view)
	var total_damage: int = int(attack_totals["total_damage"])
	var thorn_damage_total: int = int(attack_totals["thorn_damage_total"])
	_apply_card_defense_and_resistance(next, card, effect, hit_count, total_damage, enemy_hp_before_attack)
	_apply_card_play_effect(next, card, card_id, effect, hand_before_play)
	if giant_triggered:
		next["message"] += " · 거인: 에너지 1 획득"
	for kind in card.get("self_debuffs", {}):
		StatusRules.apply_player_debuff(next, str(kind), int(card["self_debuffs"][kind]))
	var parachute_pending := _finalize_card_destination_and_draws(next, card, card_index, effect, hit_count)
	return _resolve_post_play_outcomes(next, card, card_id, effect, thorn_damage_total, parachute_pending, play_view)


static func _prepare_card_play(next: Dictionary, card_id: int) -> Dictionary:
	var card_index := _hand_card_index(next["hand"], card_id)
	if card_index < 0:
		return {"ok": false, "state": _with_message(next, "이 카드는 현재 손패에 없습니다.")}
	var hand: Array = next["hand"]
	var hand_before_play: Array = hand.duplicate(true)
	var card: Dictionary = hand[card_index]
	if StatusRules.card_limit_reached(next):
		next["pending_play_card_id"] = -1
		next["pending_discard_count"] = 0
		return {"ok": false, "state": _with_message(next, "마비: 이번 턴에는 카드를 3장까지만 사용할 수 있습니다.")}
	var cost := effective_card_cost(next, card)
	var economics_research_count := 0
	for rule_card in next.get("active_rule_cards", []):
		if str(rule_card.get("effect", "")) == "economics_research":
			economics_research_count += 1
	if int(next["energy"]) - cost < -3 * economics_research_count:
		next["pending_play_card_id"] = -1
		return {"ok": false, "state": _with_message(next, "에너지가 부족합니다.")}
	var effect := str(card.get("effect", ""))
	if effect == "supernova" and int(next.get("stars", 0)) < 3:
		next["pending_play_card_id"] = -1
		return {"ok": false, "state": _with_message(next, "초신성: ★★★가 필요합니다.")}
	return {
		"ok": true,
		"card_index": card_index,
		"card": card,
		"hand_before_play": hand_before_play,
		"cost": cost,
		"effect": effect,
	}


static func enemy_intends_to_attack(enemy: Dictionary) -> bool:
	if bool(enemy.get("stunned", false)):
		return false
	var actions: Array = enemy.get("actions", [])
	if actions.is_empty():
		return false
	var action_index := clampi(int(enemy.get("action_index", 0)), 0, actions.size() - 1)
	var action: Dictionary = actions[action_index]
	return int(action.get("damage", 0)) > 0


static func _compute_card_base_damage(next: Dictionary, card: Dictionary, effect: String) -> int:
	if effect == "radiance":
		return 4 + maxi(0, int(next.get("radiance_played_this_turn", 0))) * 4 \
			+ (3 if next.get("deck_editions", []).has("sharpLight") else 0)
	if effect == "shield_bash":
		return maxi(0, int(next.get("player_block", 0)))
	if effect == "exploit_opening":
		var enemies: Array = next.get("enemies", [])
		var target_index := clampi(int(next.get("target_enemy_index", 0)), 0, maxi(0, enemies.size() - 1))
		if target_index < enemies.size() and not enemy_intends_to_attack(enemies[target_index]):
			return int(card.get("value", 11)) * 2
		return int(card.get("value", 11))
	return int(card.get("value", 0))


static func _compute_card_hit_count(next: Dictionary, card: Dictionary, effect: String) -> int:
	var hit_count := 1
	if effect == "meteor":
		hit_count = int(next.get("stars", 0)) + int(next.get("temporary_solitaire_actions", 0))
	elif effect == "hydra":
		hit_count = 9
	elif effect == "five_hit":
		hit_count = 5
	elif effect == "double_hit" and bool(card.get("forged", card.get("upgraded", false))):
		hit_count = 2
	elif effect == "obsidian_dagger":
		var completed_forges: Array = card.get("forge_costs_completed", [])
		hit_count = 1 + completed_forges.size()
	if _is_attack_card(card):
		for rule_card in next.get("active_rule_cards", []):
			if str(rule_card.get("effect", "")) == "leo":
				hit_count *= 2
		if next.get("repeat_next_attack", false):
			hit_count *= 2
	return hit_count


static func _execute_single_attack_hit(next: Dictionary, target_index: int, base_damage: int, play_view: Variant) -> Dictionary:
	var before_hp := int(next["enemies"][target_index].get("hp", 0))
	var hit_result := _resolve_attack_hit(next, target_index, base_damage)
	var remaining_hp := int(next["enemies"][target_index].get("hp", 0))
	var dealt := maxi(0, before_hp - remaining_hp)
	if play_view is Dictionary and dealt > 0:
		play_view["hits"].append({
			"enemy_index": target_index,
			"enemy_id": str(next["enemies"][target_index].get("id", "")),
			"damage": dealt,
			"remaining_hp": remaining_hp,
		})
	return hit_result


static func _resolve_card_attack_phase(next: Dictionary, card: Dictionary, effect: String, hit_count: int, play_view: Variant) -> Dictionary:
	if not _is_attack_card(card):
		next["message"] = str(card.get("name", "카드")) + " 효과를 적용했습니다."
		return {"total_damage": 0, "thorn_damage_total": 0}
	var base_damage := _compute_card_base_damage(next, card, effect)
	var selected_enemy_index := int(next.get("target_enemy_index", 0))
	var randomized_targeting := effect == "meteor" or effect == "hydra"
	var target_indexes: Array[int] = [selected_enemy_index]
	if randomized_targeting:
		target_indexes.clear()
	elif effect in ["sweep", "odin_spear", "iron_rampage"] or bool(card.get("all_targets", false)) \
		or (effect == "spinning_slash" and bool(card.get("forged", card.get("upgraded", false)))):
		target_indexes.clear()
		for target_index in range(next.get("enemies", []).size()):
			if int(next["enemies"][target_index].get("hp", 0)) > 0:
				target_indexes.append(target_index)
	var total_damage := 0
	var thorn_damage_total := 0
	if randomized_targeting:
		var attack_random := RandomNumberGenerator.new()
		attack_random.seed = int(next.get("battle_seed", 0)) + int(next.get("turn", 1)) * 104729 + int(card.get("id", 0)) * 7919
		for _hit_index in range(hit_count):
			var living_targets: Array[int] = []
			for candidate_index in range(next.get("enemies", []).size()):
				if int(next["enemies"][candidate_index].get("hp", 0)) > 0:
					living_targets.append(candidate_index)
			if living_targets.is_empty():
				break
			var target_index := living_targets[attack_random.randi_range(0, living_targets.size() - 1)]
			var hit_result := _execute_single_attack_hit(next, target_index, base_damage, play_view)
			total_damage += int(hit_result.get("damage", 0))
			thorn_damage_total += int(hit_result.get("thorns", 0))
	else:
		for target_index in target_indexes:
			_load_enemy_aliases(next, target_index)
			var damage_to_target := 0
			for _hit_index in range(hit_count):
				if int(next.get("enemy_hp", 0)) <= 0:
					break
				var hit_result := _execute_single_attack_hit(next, target_index, base_damage, play_view)
				damage_to_target += int(hit_result.get("damage", 0))
				thorn_damage_total += int(hit_result.get("thorns", 0))
			total_damage += damage_to_target
	_load_enemy_aliases(next, selected_enemy_index)
	var hit_suffix := " (%d회 공격)" % hit_count if hit_count > 1 else ""
	var target_suffix := " · 모든 적" if target_indexes.size() > 1 else ""
	var random_suffix := " · 무작위 대상" if randomized_targeting else ""
	next["message"] = "%s: 피해 %d%s%s%s" % [card.get("name", "카드"), total_damage, hit_suffix, target_suffix, random_suffix]
	return {"total_damage": total_damage, "thorn_damage_total": thorn_damage_total}


static func _apply_card_defense_and_resistance(next: Dictionary, card: Dictionary, effect: String, hit_count: int, total_damage: int, enemy_hp_before_attack: int) -> void:
	var gains_block := bool(card.get("grants_block", false)) or effect in ["defend", "scale_armor", "deflect", "star_guard", "iron_song", "iron_wave", "water_wave"]
	var defense := 0
	if gains_block:
		defense = maxi(0, int(card.get("value", 0)) + int(next.get("agility", 0)))
		next["player_block"] = int(next.get("player_block", 0)) + defense
		next["message"] += " · 방어 %d 획득" % defense
	if effect == "suppression":
		defense = maxi(0, mini(total_damage, enemy_hp_before_attack) + int(next.get("agility", 0)))
		next["player_block"] = int(next.get("player_block", 0)) + defense
		next["message"] += " · 방어 %d 획득" % defense
	elif effect == "iron_rampage":
		# This retired debug card keeps fixed 8 defense even if its attack value changes.
		defense = maxi(0, (8 + int(next.get("agility", 0))) * hit_count)
		next["player_block"] = int(next.get("player_block", 0)) + defense
		next["message"] += " · 방어 %d 획득" % defense
	next["magic_resistance"] = int(next.get("magic_resistance", 0)) + int(card.get("magic_resistance", 0))
	var temporary_resistance := int(card.get("temporary_magic_resistance", 0))
	next["magic_resistance"] = int(next.get("magic_resistance", 0)) + temporary_resistance
	next["pending_magic_resistance_loss"] = int(next.get("pending_magic_resistance_loss", 0)) + temporary_resistance


static func _apply_card_play_effect(next: Dictionary, card: Dictionary, card_id: int, effect: String, hand_before_play: Array) -> void:
	match effect:
		"strategy_book":
			var gain := int(card.get("value", 4))
			next["strength"] = int(next.get("strength", 0)) + gain
			next["agility"] = int(next.get("agility", 0)) + gain
			next["message"] += " · 힘·강인함 %d 획득" % gain
		"ruler_compass", "star_guard":
			next["stars"] = int(next["stars"]) + 1
			next["message"] += " · ★ 1 획득"
		"battle_plan", "starlight", "super_strategist":
			var star_gain := int(card.get("value", 3 if effect == "super_strategist" else 2))
			next["stars"] = int(next.get("stars", 0)) + star_gain
			next["message"] += " · ★ %d 획득" % star_gain
		"beastification":
			var strength_gain := int(card.get("upgraded_value", card.get("value", 0))) if bool(card.get("forged", card.get("upgraded", false))) else int(card.get("value", 0))
			next["strength"] = int(next.get("strength", 0)) + strength_gain
			next["message"] += " · 힘 %d 획득" % strength_gain
		"metalization":
			var toughness_gain := int(card.get("upgraded_value", card.get("value", 0))) if bool(card.get("forged", card.get("upgraded", false))) else int(card.get("value", 0))
			next["agility"] = int(next.get("agility", 0)) + toughness_gain
			next["message"] += " · 강인함 %d 획득" % toughness_gain
		"sand_toss":
			next["enemy_weak"] = int(next.get("enemy_weak", 0)) + int(card.get("value", 0))
			next["message"] += " · 약화 %d 부여" % int(card.get("value", 0))
		"shatter":
			next["enemy_vulnerable"] = int(next.get("enemy_vulnerable", 0)) + 1
			next["message"] += " · 취약 1 부여"
		"knee_strike", "scale_armor":
			next["enemy_weak"] = int(next.get("enemy_weak", 0)) + 1
			next["message"] += " · 약화 1 부여"
		"odin_spear":
			_save_enemy_aliases(next)
			for enemy in next.get("enemies", []):
				if int(enemy.get("hp", 0)) > 0:
					enemy["weak"] = int(enemy.get("weak", 0)) + 3
					enemy["vulnerable"] = int(enemy.get("vulnerable", 0)) + 3
			_load_enemy_aliases(next)
			next["message"] += " · 모든 적에게 약화·취약 3 부여"
		"demolish":
			next["enemy_vulnerable"] = int(next.get("enemy_vulnerable", 0)) + 2
			next["enemy_weak"] = int(next.get("enemy_weak", 0)) + 2
			next["message"] += " · 취약·약화 2 부여"
		"adrenaline":
			next["player_hp"] = maxi(0, int(next.get("player_hp", 0)) - 3)
			next["energy"] = int(next.get("energy", 0)) + int(card.get("value", 2))
			next["message"] += " · 체력 -3 · 에너지 +%d" % int(card.get("value", 2))
		"blood_struggle":
			next["player_hp"] = maxi(0, int(next.get("player_hp", 0)) - 3)
			next["message"] += " · 체력 -3"
		"overload":
			var gained_energy := int(card.get("value", 3))
			next["energy"] = int(next.get("energy", 0)) + gained_energy
			next["message"] += " · 에너지 +%d" % gained_energy
		"battery":
			var battery_energy := int(card.get("value", 3))
			next["pending_battery_energy"] = int(next.get("pending_battery_energy", 0)) + battery_energy
			next["message"] += " · 다음 턴 에너지 +%d" % battery_energy
		"iron_song":
			var pending_song: Array = next.get("pending_iron_song", [])
			var repeats := 2 if bool(card.get("forged", card.get("upgraded", false))) else 1
			pending_song.append({"turns": repeats, "amount": int(card.get("value", 0))})
			next["pending_iron_song"] = pending_song
			next["message"] += " · 다음 %d턴 시작 시 반복" % repeats
		"steel_storm", "sturdy_stance", "recycling", "osiris_sun", "librarians_privilege", "law_research", "economics_research", "optics_research", "leo":
			var active_rules: Array = next.get("active_rule_cards", [])
			active_rules.append(card.duplicate(true))
			next["active_rule_cards"] = active_rules
			next["message"] += " · 룰 활성화"
			if effect == "sturdy_stance":
				next["preserve_block_on_turn_end"] = true
		"dash":
			var dash_draw_count := 3 if bool(card.get("forged", card.get("upgraded", false))) else 2
			var dash_drawn := _draw_random_cards(next, dash_draw_count)
			next["message"] += " · 카드를 무작위로 %d장 뽑음" % dash_drawn
		"evolution_theory":
			var evolution_gain := int(card.get("value", 1))
			var evolution_rules: Array = next.get("active_rule_cards", [])
			evolution_rules.append(card.duplicate(true))
			next["active_rule_cards"] = evolution_rules
			next["strength"] = int(next.get("strength", 0)) + evolution_gain
			next["agility"] = int(next.get("agility", 0)) + evolution_gain
			next["message"] += " · 힘·강인함 %d 획득 · 룰 활성화" % evolution_gain
		"meteor":
			next["stars"] = 0
			next["temporary_solitaire_actions"] = 0
			next["message"] += " · ★ 모두 소모"
		"aries":
			next["energy"] = int(next.get("energy", 0)) + 5
			next["stars"] = int(next.get("stars", 0)) + 5
			next["message"] += " · 에너지 5 · ★ 5 획득"
		"orion":
			var orion_gain := int(card.get("value", 10))
			next["strength"] = int(next.get("strength", 0)) + orion_gain
			next["message"] += " · 힘 %d 획득" % orion_gain
		"ophiuchus":
			var healed := mini(int(card.get("value", 5)), int(next.get("max_player_hp", next.get("player_hp", 0))) - int(next.get("player_hp", 0)))
			next["player_hp"] = int(next.get("player_hp", 0)) + maxi(0, healed)
			next["message"] += " · 체력 %d 회복" % maxi(0, healed)
		"horologium":
			next["pending_extra_turns"] = int(next.get("pending_extra_turns", 0)) + 1
			next["message"] += " · 추가 턴 예약"
		"cassiopeia":
			next["message"] += " · 에너지 3 획득"
		"fermented_slime":
			next["energy"] = int(next.get("energy", 0)) + int(card.get("value", 1))
			next["message"] += " · 에너지 %d 획득" % int(card.get("value", 1))
		"relic":
			var relic_value := int(card.get("value", 4))
			var relic_enemies: Array = next.get("enemies", [])
			for enemy_index in range(relic_enemies.size()):
				var relic_enemy: Dictionary = relic_enemies[enemy_index]
				if str(relic_enemy.get("variant", "")) != "goblin":
					continue
				relic_enemy["strength"] = int(relic_enemy.get("strength", 0)) - relic_value
				relic_enemies[enemy_index] = relic_enemy
			next["enemies"] = relic_enemies
			_load_enemy_aliases(next, int(next.get("target_enemy_index", 0)))
			next["message"] += " · 도깨비 힘 %d 감소" % relic_value
		"plate_armor":
			var energy_gain := int(card.get("upgraded_value", card.get("value", 1))) if bool(card.get("forged", card.get("upgraded", false))) else int(card.get("value", 1))
			next["energy"] = int(next.get("energy", 0)) + energy_gain
			next["message"] += " · 에너지 %d 획득" % energy_gain
		"foresight":
			next["pending_foresight_draws"] = int(next.get("pending_foresight_draws", 0)) + int(card.get("draw", 2))
			next["message"] += " · 다음 턴 시작 시 드로우 예약"
		"light_travel_time":
			var pending_radiance: Array = next.get("pending_radiance", [])
			pending_radiance.append({"turns": 2, "count": int(card.get("value", 3))})
			next["pending_radiance"] = pending_radiance
			next["message"] += " · 다다음 턴 광채 %d장 예약" % int(card.get("value", 3))
		"transcend":
			next["player_invulnerability_turns"] = int(next.get("player_invulnerability_turns", 0)) + int(card.get("value", 2))
			next["message"] += " · 무적 %d 획득" % int(card.get("value", 2))
		"light_cluster":
			next["hand"].append(_create_battle_radiance(next))
			sync_hand_stats(next)
			next["message"] += " · 광채 1장 생성"
		"large_prism", "nebula":
			var radiance_count := 3 if effect == "large_prism" else 1
			for _radiance_index in range(radiance_count):
				next["hand"].append(_create_battle_radiance(next))
				sync_hand_stats(next)
			next["message"] += " · 광채 %d장 생성" % radiance_count
			if effect == "nebula":
				next["stars"] = int(next.get("stars", 0)) + 2
				next["message"] += " · ★ 2 획득"
		"warm_up":
			var temporary_gain := int(card.get("value", 4))
			next["strength"] = int(next.get("strength", 0)) + 1 + temporary_gain
			next["pending_strength_loss"] = int(next.get("pending_strength_loss", 0)) + temporary_gain
			next["message"] += " · 힘 %d 획득 · 턴 종료 시 힘 %d 감소" % [1 + temporary_gain, temporary_gain]
		"supernova":
			next["stars"] = int(next.get("stars", 0)) - 3
			next["energy"] = int(next.get("energy", 0)) + 3
			next["message"] += " · ★ 3 소모 · 에너지 3 획득"
		"wish":
			var wish_random := RandomNumberGenerator.new()
			wish_random.seed = int(next.get("battle_seed", 0))
			if next.has("wish_random_state"):
				wish_random.state = int(next["wish_random_state"])
			for _wish_index in range(int(card.get("value", 3))):
				var wish_card := CardCatalog.create_random_rare_token(int(next["next_generated_card_id"]), wish_random)
				next["next_generated_card_id"] = int(next["next_generated_card_id"]) - 1
				next["hand"].append(wish_card)
				sync_hand_stats(next)
			next["wish_random_state"] = wish_random.state
			next["message"] += " · 무작위 희귀 카드 %d장 생성" % int(card.get("value", 3))
		"rapid_fire":
			next["repeat_next_attack"] = true
			next["message"] += " · 다음 공격 2회 발동"
		"parallel_mirror":
			var copied_count := 0
			for held_card in hand_before_play:
				if int(held_card.get("id", -1)) != card_id and str(held_card.get("effect", "")) == "radiance":
					var copy: Dictionary = held_card.duplicate(true)
					copy["id"] = int(next["next_generated_card_id"])
					next["next_generated_card_id"] = int(next["next_generated_card_id"]) - 1
					copy["revealed"] = true
					next["hand"].append(copy)
					sync_hand_stats(next)
					copied_count += 1
			next["message"] += " · 광채 %d장 복사" % copied_count
		"diy":
			next["message"] += " · 효과 없음"


static func _finalize_card_destination_and_draws(next: Dictionary, card: Dictionary, card_index: int, effect: String, hit_count: int) -> bool:
	next["hand"].remove_at(card_index)
	sync_hand_stats(next)
	if effect == "radiance":
		next["radiance_played_this_turn"] = int(next.get("radiance_played_this_turn", 0)) + 1
	var parachute_pending := false
	if bool(next.get("repeat_next_attack", false)) and _is_attack_card(card):
		next["repeat_next_attack"] = false
	next["pending_play_card_id"] = -1
	next["pending_discard_count"] = 0
	if bool(card.get("exhaust", false)) or bool(card.get("rule", false)) or bool(card.get("token", false)):
		next["exhausted"].append(card)
	elif CardStickers.has_sticker(card, "parachute"):
		parachute_pending = true
	else:
		next["discard"].append(card)
	var available_draws := _available_draw_card_count(next)
	if effect == "draw_each_file" or (effect == "file_draw" and bool(card.get("forged", card.get("upgraded", false)))):
		_draw_from_each_file(next)
	elif effect == "file_draw":
		next["pending_pile_draw_count"] = mini(int(card.get("draw", 0)), available_draws) if not _all_enemies_defeated(next) else 0
	elif int(card.get("draw", 0)) > 0 and effect != "foresight" and effect != "saeongjima" and not _all_enemies_defeated(next):
		next["pending_draws"] = mini(int(card.get("draw", 0)) * hit_count, available_draws)
	if int(next.get("pending_pile_draw_count", 0)) > 0:
		next["message"] += " · 카드를 뽑을 파일을 선택하세요."
	elif int(next.get("pending_draws", 0)) > 0:
		next["message"] += " · 드로우할 파일을 선택하세요."
	elif int(card.get("draw", 0)) > 0 and effect not in ["foresight", "saeongjima", "draw_each_file", "file_draw"] \
		and not _all_enemies_defeated(next) and available_draws == 0:
		next["message"] += " · 드로우할 카드가 없습니다."
	if not _all_enemies_defeated(next) and (bool(card.get("discard_pile_top", false)) or effect == "boomerang"):
		var has_cards := false
		for pile in next["piles"]:
			if not pile.is_empty():
				has_cards = true
				break
		if has_cards:
			var discard_top := bool(card.get("discard_pile_top", false))
			next["pending_pile_operation"] = "discardTop" if discard_top else "moveTopToBottom"
			next["message"] += " · 맨 위 카드를 %s 파일을 선택하세요." % ("버릴" if discard_top else "맨 밑으로 옮길")
	return parachute_pending


static func _resolve_post_play_outcomes(next: Dictionary, card: Dictionary, card_id: int, effect: String, thorn_damage_total: int, parachute_pending: bool, play_view: Variant) -> Dictionary:
	if thorn_damage_total > 0:
		if int(next.get("player_invulnerability_turns", 0)) > 0:
			next["message"] += " · 가시 피해 무적"
		else:
			var thorn_blocked := mini(thorn_damage_total, int(next.get("player_block", 0)))
			next["player_block"] = int(next.get("player_block", 0)) - thorn_blocked
			var thorn_taken := thorn_damage_total - thorn_blocked
			next["player_hp"] = maxi(0, int(next.get("player_hp", 0)) - thorn_taken)
			next["message"] += " · 가시 피해 %d (방어 %d)" % [thorn_taken, thorn_blocked]
	_save_enemy_aliases(next)
	_resolve_enemy_death_effects(next)
	if parachute_pending:
		if _move_card_to_empty_file(next, card):
			next["message"] += " · 낙하산: 빈 파일로 이동"
		else:
			next["discard"].append(card)
	_ensure_living_target(next)
	if play_view is Dictionary:
		play_view["resolved_message"] = str(next.get("message", ""))
	if int(next["player_hp"]) <= 0:
		next["status"] = "lost"
		if effect == "adrenaline" and thorn_damage_total == 0:
			next["message"] = "아드레날린의 체력 손실로 쓰러졌습니다."
		elif effect == "blood_struggle" and thorn_damage_total == 0:
			next["message"] = "혈투의 체력 손실로 쓰러졌습니다."
		elif thorn_damage_total > 0:
			next["message"] = "가시 피해로 쓰러졌습니다."
		else:
			next["message"] = "폭발 피해로 쓰러졌습니다."
	elif _all_enemies_defeated(next):
		next["status"] = "won"
		next["message"] = "승리! 모든 적을 쓰러뜨렸습니다."
	else:
		_refresh_enemy_intent(next)
	next["pending_after_play_card_id"] = card_id
	next = _auto_resolve_forced_pile_discard(next)
	next = _finish_card_effects(next)
	if play_view is Dictionary:
		play_view["resolved_message"] = str(next.get("message", ""))
	return next


static func _finish_card_effects(state: Dictionary) -> Dictionary:
	sync_hand_stats(state)
	var played_id := int(state.get("pending_after_play_card_id", -1))
	if played_id < 0:
		return state
	if int(state.get("pending_draws", 0)) > 0 or int(state.get("pending_pile_draw_count", 0)) > 0 \
			or str(state.get("pending_pile_operation", "")) != "" or int(state.get("pending_play_card_id", -1)) >= 0:
		return state
	state["pending_after_play_card_id"] = -1
	if state.get("status") != "playing" or int(state.get("player_confusion", 0)) <= 0:
		return state
	var candidates: Array[int] = []
	for index in state.get("hand", []).size():
		if int(state["hand"][index].get("id", -1)) != played_id:
			candidates.append(index)
	if candidates.is_empty():
		return state
	var random := RandomNumberGenerator.new()
	random.seed = int(state.get("battle_seed", 0)) + 15485863
	if state.has("confusion_random_state"):
		random.state = int(state["confusion_random_state"])
	var index := candidates[random.randi_range(0, candidates.size() - 1)]
	state["confusion_random_state"] = random.state
	var discarded: Dictionary = state["hand"].pop_at(index)
	var draws := _discard_card(state, discarded, false, true, true)
	state["confusion_sequence"] = int(state.get("confusion_sequence", 0)) + 1
	state["last_confusion_discard_id"] = int(discarded.get("id", -1))
	state["message"] += " · 혼란: %s 버림" % discarded.get("name", "카드")
	if draws > 0:
		_draw_random_cards(state, draws)
	_refresh_enemy_intent(state)
	return state


static func _auto_resolve_forced_pile_discard(state: Dictionary) -> Dictionary:
	if str(state.get("pending_pile_operation", "")) != "discardTop":
		return state
	var files: Array = state.get("piles", [])
	var eligible_file_index := -1
	for file_index in range(files.size()):
		if files[file_index].is_empty():
			continue
		if eligible_file_index >= 0:
			return state
		eligible_file_index = file_index
	if eligible_file_index >= 0:
		return resolve_pile_operation(state, eligible_file_index)
	var next := state.duplicate(true)
	next["pending_pile_operation"] = ""
	next["pending_sweep"] = false
	next["message"] = "버릴 파일 맨 위 카드가 없습니다."
	return _finish_card_effects(next)


static func preview_attack_hit(state: Dictionary, target_index: int, base_damage: int) -> int:
	if target_index < 0 or target_index >= state.get("enemies", []).size():
		return 0
	var preview_state: Dictionary = state.duplicate(true)
	var result := _resolve_attack_hit(preview_state, target_index, base_damage)
	return int(result.get("damage", 0))


static func _resolve_attack_hit(state: Dictionary, target_index: int, base_damage: int) -> Dictionary:
	sync_hand_stats(state)
	_load_enemy_aliases(state, target_index)
	if int(state.get("enemy_hp", 0)) <= 0:
		return {"damage": 0, "thorns": 0}
	var solitaire_bonus := int(state.get("enemy_solitaire_hit_bonus", 0)) * int(state.get("enemy_solitaire_hit_bonus_stacks", 0))
	var raw_attack_damage := base_damage + int(state.get("strength", 0)) + solitaire_bonus
	var hit_damage := _calculate_attack_damage(
		raw_attack_damage,
		int(state.get("player_weak", 0)),
		int(state.get("enemy_vulnerable", 0))
	)
	if bool(state.get("enemy_quickness_ready", false)):
		state["enemy_quickness_ready"] = false
		_save_enemy_aliases(state)
		return {"damage": 0, "thorns": 0}
	var thorn_damage := int(state.get("enemy_thorns", 0)) if raw_attack_damage > 0 else 0
	if raw_attack_damage > 0 and int(state.get("enemy_boon", 0)) > 0:
		state["enemy_boon"] = int(state.get("enemy_boon", 0)) - 1
		_save_enemy_aliases(state)
		return {"damage": 0, "thorns": thorn_damage}
	var sturdy_threshold := int(state.get("enemy_sturdy_threshold", 0))
	if sturdy_threshold > 0 and hit_damage > 0 and hit_damage <= sturdy_threshold:
		state["enemy_hp"] = maxi(0, int(state.get("enemy_hp", 0)) - 1)
		_save_enemy_aliases(state)
		_check_enemy_half_hp_passive(state, target_index)
		return {"damage": 1, "thorns": thorn_damage}
	var enemy_blocked := mini(hit_damage, int(state.get("enemy_physical_block", 0)))
	state["enemy_physical_block"] = int(state.get("enemy_physical_block", 0)) - enemy_blocked
	var dealt := hit_damage - enemy_blocked
	state["enemy_hp"] = maxi(0, int(state.get("enemy_hp", 0)) - dealt)
	_save_enemy_aliases(state)
	_check_enemy_half_hp_passive(state, target_index)
	return {"damage": dealt, "thorns": thorn_damage}


static func _draw_from_files(state: Dictionary, draw_view: Variant = null) -> void:
	if draw_view is Dictionary:
		# Expose only a copied presentation snapshot, never a field in battle state.
		var before_draw: Dictionary = state.duplicate(true)
		_refresh_enemy_intent(before_draw)
		draw_view["before"] = before_draw
	var hand: Array = state["hand"]
	var files: Array = state["piles"]
	var blocked := _blocked_pile_indexes(state)
	var empty_file_indexes: Array[int] = []
	for file_index in range(files.size()):
		var pile: Array = files[file_index]
		if pile.is_empty():
			empty_file_indexes.append(file_index)
		if not pile.is_empty() and not blocked.has(file_index):
			for card in CardStickers.take_pile_cards(pile):
				hand.append(card)
				sync_hand_stats(state)
	var any_files_remaining := false
	for pile in state["piles"]:
		if not pile.is_empty():
			any_files_remaining = true
			break
	if any_files_remaining:
		if not hand.is_empty():
			state["message"] = "각 파일의 맨 위 카드를 손패로 가져왔습니다."
		elif not empty_file_indexes.is_empty():
			state["message"] = "남은 파일이 봉인되어 카드를 가져오지 못했습니다."
		return
	if not state["discard"].is_empty():
		if draw_view is Dictionary:
			var cleared: Dictionary = state.duplicate(true)
			_refresh_enemy_intent(cleared)
			draw_view["cleared"] = cleared
		var reshuffle_count := int(state.get("reshuffle_count", 0)) + 1
		state["reshuffle_count"] = reshuffle_count
		var random := RandomNumberGenerator.new()
		random.seed = int(state.get("battle_seed", 0)) + reshuffle_count * 104729 + int(state.get("turn", 1)) * 7919
		_reshuffle_discard_into_files(state, random)
		if draw_view is Dictionary:
			var refill_before: Dictionary = state.duplicate(true)
			_refresh_enemy_intent(refill_before)
			draw_view["refill_before"] = refill_before
		_draw_from_file_indexes(state, empty_file_indexes, draw_view)
		state["message"] = "버린 카드를 파일로 다시 섞었습니다."
		return
	if hand.is_empty():
		state["message"] = "드로우할 카드가 없습니다."
	else:
		state["message"] = "각 파일의 맨 위 카드를 손패로 가져왔습니다."


static func _draw_from_file_indexes(state: Dictionary, file_indexes: Array[int], draw_view: Variant = null) -> void:
	if draw_view is Dictionary and not draw_view.has("before"):
		var before_draw: Dictionary = state.duplicate(true)
		_refresh_enemy_intent(before_draw)
		draw_view["before"] = before_draw
	var files: Array = state["piles"]
	var blocked := _blocked_pile_indexes(state)
	for file_index in file_indexes:
		if file_index < 0 or file_index >= files.size() or blocked.has(file_index):
			continue
		var pile: Array = files[file_index]
		if pile.is_empty():
			continue
		for card in CardStickers.take_pile_cards(pile):
			state["hand"].append(card)
			sync_hand_stats(state)
	if state["hand"].is_empty():
		state["message"] = "드로우할 카드가 없습니다."


static func _refresh_enemy_intent(state: Dictionary) -> void:
	sync_hand_stats(state)
	var enemy := {
		"name": state.get("enemy_name", ""),
		"actions": state["enemy_actions"],
		"action_index": state["enemy_action_index"],
		"strength": state["enemy_strength"],
		"weak": state.get("enemy_weak", 0),
		"vulnerable": state.get("enemy_vulnerable", 0),
		"player_vulnerable": state.get("player_vulnerable", 0),
		"first_action_completed": state.get("enemy_first_action_completed", false),
		"hand_strength_gain": state.get("enemy_hand_strength_gain", 0),
		"empty_energy_strength_gain": state.get("enemy_empty_energy_strength_gain", 0),
	}
	state["enemy_intent"] = EnemyCatalog.intent_text(enemy, int(state.get("energy", STARTING_ENERGY)), state.get("hand", []).size())
	state["enemy_attack"] = 0
	var actions: Array = state["enemy_actions"]
	if not actions.is_empty():
		if int(state.get("player_invulnerability_turns", 0)) > 0:
			state["enemy_intent"] += " · 무적"
			return
		var action: Dictionary = actions[int(state["enemy_action_index"])]
		if int(action.get("damage", 0)) <= 0:
			return
		var temporary_strength := _temporary_enemy_strength(state)
		var raw_per_hit := int(action.get("damage", 0)) + int(state["enemy_strength"]) + temporary_strength
		for _hit_index in range(maxi(1, int(action.get("hits", 1)))):
			state["enemy_attack"] += _calculate_attack_damage(
				raw_per_hit,
				int(state.get("enemy_weak", 0)),
				int(state.get("player_vulnerable", 0))
			)


static func _discard_card(state: Dictionary, card: Dictionary, is_discard_x: bool = false, explicit_discard: bool = false, from_hand: bool = false) -> int:
	sync_hand_stats(state)
	var triggers_discard := is_discard_x or explicit_discard
	if triggers_discard:
		state["discard_count"] = int(state.get("discard_count", 0)) + 1
		for rule_card in state.get("active_rule_cards", []):
			if str(rule_card.get("effect", "")) == "recycling":
				state["strength"] = int(state.get("strength", 0)) + int(rule_card.get("value", 1))
				state["message"] += " · 이계의 힘: 힘 1 획득"
	if not bool(card.get("token", false)):
		state["discard"].append(card)
	if triggers_discard and from_hand and state.get("deck_editions", []).has("cycle") and not bool(state.get("cycle_used", false)):
		state["cycle_used"] = true
		_draw_random_cards(state, 1)
	if triggers_discard and str(card.get("effect", "")) == "saeongjima":
		return int(card.get("draw", 2))
	return 0


static func _discard_turn_end_hand(state: Dictionary, original_hand: Array) -> void:
	var discarded_ids: Dictionary = {}
	var saeongjima_draw_count := 0
	for card in original_hand:
		if bool(card.get("preserve", false)) or CardStickers.retains_card(card):
			continue
		var card_id := int(card.get("id", -1))
		discarded_ids[card_id] = true
		saeongjima_draw_count += _discard_card(state, card)
	var remaining_hand: Array = []
	for card in state["hand"]:
		if not discarded_ids.has(int(card.get("id", -1))):
			remaining_hand.append(card)
	state["hand"] = remaining_hand
	sync_hand_stats(state)
	if saeongjima_draw_count > 0:
		_draw_random_cards(state, saeongjima_draw_count)


static func _temporary_enemy_strength(state: Dictionary) -> int:
	var strength := int(state.get("enemy_empty_energy_strength_gain", 0)) if int(state.get("energy", 0)) <= 0 else 0
	if not state.get("hand", []).is_empty():
		strength += int(state.get("enemy_hand_strength_gain", 0))
	return strength


static func _draw_random_cards(state: Dictionary, count: int) -> int:
	var random := RandomNumberGenerator.new()
	var sequence := int(state.get("random_draw_sequence", 0))
	random.seed = int(state.get("battle_seed", 0)) + int(state.get("turn", 1)) * 104729 + sequence * 7919
	state["random_draw_sequence"] = sequence + 1
	var drawn_count := 0
	for _draw_index in range(maxi(0, count)):
		var files: Array = state["piles"]
		var available_files: Array[int] = []
		var blocked := _blocked_pile_indexes(state)
		for file_index in range(files.size()):
			if not files[file_index].is_empty() and not blocked.has(file_index):
				available_files.append(file_index)
		if available_files.is_empty():
			break
		var chosen_file := available_files[random.randi_range(0, available_files.size() - 1)]
		var pile: Array = state["piles"][chosen_file]
		var drawn_cards := CardStickers.take_pile_cards(pile)
		for card in drawn_cards:
			state["hand"].append(card)
			sync_hand_stats(state)
		drawn_count += drawn_cards.size()
	return drawn_count


static func _available_draw_card_count(state: Dictionary) -> int:
	var count := 0
	var files: Array = state.get("piles", [])
	var blocked := _blocked_pile_indexes(state)
	for file_index in range(files.size()):
		if not blocked.has(file_index):
			count += files[file_index].size()
	return count


static func _draw_from_each_file(state: Dictionary) -> int:
	var drawn_count := 0
	var blocked := _blocked_pile_indexes(state)
	for file_index in range(state["piles"].size()):
		var pile: Array = state["piles"][file_index]
		if blocked.has(file_index):
			continue
		if pile.is_empty():
			continue
		var drawn_cards := CardStickers.take_pile_cards(pile)
		for card in drawn_cards:
			state["hand"].append(card)
			sync_hand_stats(state)
		drawn_count += drawn_cards.size()
	state["message"] += " · 각 파일에서 %d장 드로우" % drawn_count
	return drawn_count


static func _reshuffle_discard_into_files(state: Dictionary, random: RandomNumberGenerator) -> void:
	var discard: Array = state["discard"]
	var excluded_ids: Dictionary = {}
	for card in state.get("exhausted", []):
		excluded_ids[int(card.get("id", -1))] = true
	for card in state.get("hand", []):
		excluded_ids[int(card.get("id", -1))] = true
	for pile in state.get("piles", []):
		for card in pile:
			excluded_ids[int(card.get("id", -1))] = true
	var eligible: Array = []
	for card in discard:
		if not bool(card.get("token", false)) and not excluded_ids.has(int(card.get("id", -1))):
			eligible.append(card)
	if eligible.is_empty():
		state["discard"] = []
		return
	_shuffle(eligible, random)
	state["discard"] = []
	var cards_per_file := int(state.get("cards_per_file", CARDS_PER_FILE))
	var pile_count := maxi(1, state.get("piles", []).size())
	var new_files: Array = []
	for _pile_index in range(pile_count):
		new_files.append([])
	for card_index in range(eligible.size()):
		var pile_index := mini(int(card_index / cards_per_file), pile_count - 1)
		var card: Dictionary = eligible[card_index]
		card["revealed"] = CardStickers.has_sticker(card, "glowDinosaur")
		new_files[pile_index].append(card)
	for pile in new_files:
		_reveal_file_top(pile)
	state["piles"] = new_files


static func _move_card_to_empty_file(state: Dictionary, card: Dictionary) -> bool:
	var files: Array = state.get("piles", [])
	var empty_file_indexes: Array[int] = []
	for file_index in range(files.size()):
		if files[file_index].is_empty():
			empty_file_indexes.append(file_index)
	if empty_file_indexes.is_empty():
		return false
	var random := RandomNumberGenerator.new()
	random.seed = int(state.get("battle_seed", 0)) + int(state.get("turn", 1)) * 104729 \
		+ int(card.get("id", 0)) * 7919 + 32452843
	var target_file := empty_file_indexes[random.randi_range(0, empty_file_indexes.size() - 1)]
	var moved: Dictionary = card.duplicate(true)
	moved["revealed"] = true
	files[target_file].append(moved)
	return true


static func _apply_turn_start_effects(state: Dictionary) -> void:
	state["temporary_solitaire_actions"] = 1 + int(state.get("deck_editions", []).has("firstSolitaire"))
	var pending_battery := int(state.get("pending_battery_energy", 0))
	if pending_battery > 0:
		state["energy"] = int(state.get("energy", 0)) + pending_battery
		state["pending_battery_energy"] = 0
	var pending_songs: Array = state.get("pending_iron_song", [])
	var next_songs: Array = []
	for song in pending_songs:
		var turns_left := int(song.get("turns", 0))
		if turns_left <= 0:
			continue
		var amount := int(song.get("amount", 0))
		state["player_block"] = int(state.get("player_block", 0)) + amount
		turns_left -= 1
		if turns_left > 0:
			next_songs.append({"turns": turns_left, "amount": amount})
		state["message"] = "철의 노래: 방어 %d 반복" % amount
	state["pending_iron_song"] = next_songs
	var turn_start_stars := 0
	var star_spring_bonus := 0
	var turn_start_librarian_draws := 0
	var turn_start_radiance := 0
	var turn_start_evolution := 0
	for rule_card in state.get("active_rule_cards", []):
		var rule_effect := str(rule_card.get("effect", ""))
		if rule_effect == "osiris_sun":
			var star_spring_stars := int(rule_card.get("value", 1))
			turn_start_stars += star_spring_stars
			star_spring_bonus += star_spring_stars
		elif rule_effect == "librarians_privilege":
			turn_start_librarian_draws += int(rule_card.get("value", 1))
		elif rule_effect == "optics_research":
			turn_start_radiance += int(rule_card.get("value", 1))
		elif rule_effect == "evolution_theory":
			turn_start_evolution += int(rule_card.get("value", 1))
	if turn_start_stars > 0:
		state["stars"] = int(state.get("stars", 0)) + turn_start_stars
		if star_spring_bonus > 0:
			state["message"] = "별의 샘: ★ %d 획득" % star_spring_bonus
	if turn_start_evolution > 0:
		state["strength"] = int(state.get("strength", 0)) + turn_start_evolution
		state["agility"] = int(state.get("agility", 0)) + turn_start_evolution
		state["message"] = "진화론: 힘·강인함 %d 획득" % turn_start_evolution
	for _radiance_index in range(turn_start_radiance):
		var optics_radiance := _create_battle_radiance(state)
		state["hand"].append(optics_radiance)
		sync_hand_stats(state)
	if turn_start_radiance > 0:
		state["message"] = "광학 연구: 광채 %d장 생성" % turn_start_radiance
	var pending_radiance: Array = state.get("pending_radiance", [])
	var next_radiance: Array = []
	var radiance_created := 0
	for event in pending_radiance:
		var turns_left := int(event.get("turns", 0)) - 1
		if turns_left > 0:
			next_radiance.append({"turns": turns_left, "count": int(event.get("count", 0))})
			continue
		for _radiance_index in range(int(event.get("count", 0))):
			var radiance := _create_battle_radiance(state)
			state["hand"].append(radiance)
			sync_hand_stats(state)
			radiance_created += 1
	state["pending_radiance"] = next_radiance
	if radiance_created > 0:
		state["message"] = "광행시간: 광채 %d장 생성" % radiance_created
	var foresight_draws := int(state.get("pending_foresight_draws", 0))
	state["pending_foresight_draws"] = 0

	var scheduled_file_draws := foresight_draws + turn_start_librarian_draws
	if scheduled_file_draws > 0:
		state["pending_draws"] = mini(
			int(state.get("pending_draws", 0)) + scheduled_file_draws,
			_available_draw_card_count(state)
		)
		if int(state["pending_draws"]) > 0:
			var draw_source := "예지와 사서의 특권" if foresight_draws > 0 and turn_start_librarian_draws > 0 \
				else "예지" if foresight_draws > 0 else "사서의 특권"
			state["message"] = "%s: 드로우할 파일을 선택하세요. (남은 %d장)" % [draw_source, int(state["pending_draws"])]


static func _calculate_attack_damage(damage: int, weakness_turns: int = 0, vulnerable_turns: int = 0) -> int:
	var weakness_modifier := -50 if weakness_turns > 0 else 0
	var vulnerable_modifier := 50 if vulnerable_turns > 0 else 0
	var combined_percent := 100 + weakness_modifier + vulnerable_modifier
	return maxi(0, int(floor(float(damage) * combined_percent / 100.0)))


static func _decay_status(value: int) -> int:
	return value - signi(value)


static func _decay_enemy_statuses(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		enemy["vulnerable"] = _decay_status(int(enemy.get("vulnerable", 0)))
		enemy["weak"] = _decay_status(int(enemy.get("weak", 0)))
		enemies[enemy_index] = enemy
	state["enemies"] = enemies
	_load_enemy_aliases(state)


static func _apply_enemy_turn_start(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		if int(enemy.get("hp", 0)) <= 0:
			continue
		var berserk := int(enemy.get("berserk", 0))
		if berserk > 0:
			enemy["strength"] = int(enemy.get("strength", 0)) + berserk
			enemies[enemy_index] = enemy
	state["enemies"] = enemies
	_load_enemy_aliases(state)


static func _enemy_energy_recovery_penalty(enemies: Array) -> int:
	var penalty := 0
	for enemy in enemies:
		if int(enemy.get("hp", 0)) > 0:
			penalty = maxi(penalty, int(enemy.get("energy_recovery_penalty", 0)))
	return penalty


static func _recover_battle_energy(state: Dictionary) -> int:
	var maximum_energy := maxi(1, int(state.get("max_energy", STARTING_ENERGY)))
	var recovered_energy := maxi(1, maximum_energy - _enemy_energy_recovery_penalty(state.get("enemies", [])))
	return mini(int(state.get("energy", 0)) + recovered_energy, maximum_energy)


static func _add_encounter_start_cards(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	var piles: Array = state.get("piles", [])
	var hand: Array = state.get("hand", [])
	var generated_id := int(state.get("next_generated_card_id", -1))
	var toxic_added := false
	for enemy in enemies:
		if int(enemy.get("hp", 0)) <= 0:
			continue
		if str(enemy.get("variant", "")) == "goblin" and not piles.is_empty():
			var relic := CardCatalog.create_relic_card(-10000 - int(enemy.get("id", 0)))
			piles[0].push_front(relic)
			_reveal_file_top(piles[0])
		var toxic_count := maxi(0, int(enemy.get("toxic_slime_count", 1 if bool(enemy.get("gives_toxic_slime", false)) else 0)))
		if toxic_count > 0 and not toxic_added:
			for _toxic_index in range(toxic_count):
				hand.append(CardCatalog.create_toxic_slime_card(generated_id))
				generated_id -= 1
			toxic_added = true
		var fermented_count := maxi(0, int(enemy.get("fermented_slime_count", 0)))
		for _fermented_index in range(fermented_count):
			hand.append(CardCatalog.create_fermented_slime_card(generated_id))
			generated_id -= 1
	state["piles"] = piles
	state["hand"] = hand
	state["next_generated_card_id"] = generated_id
	state["toxic_slime_added"] = toxic_added


static func _confiscate_rare_cards(state: Dictionary, random: RandomNumberGenerator) -> void:
	var enemies: Array = state.get("enemies", [])
	var piles: Array = state.get("piles", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		if int(enemy.get("hp", 0)) <= 0 or not bool(enemy.get("confiscates_rare", false)):
			continue
		var candidates: Array[Dictionary] = []
		for pile_index in range(piles.size()):
			for card_index in range(piles[pile_index].size()):
				if str(piles[pile_index][card_index].get("rarity", "")) == "rare":
					candidates.append({"pile": pile_index, "card": card_index})
		if candidates.is_empty():
			continue
		var selected: Dictionary = candidates[random.randi_range(0, candidates.size() - 1)]
		var selected_pile: Array = piles[int(selected["pile"])]
		var confiscated: Dictionary = selected_pile.pop_at(int(selected["card"]))
		confiscated["revealed"] = true
		_reveal_file_top(selected_pile)
		piles[int(selected["pile"])] = selected_pile
		enemy["confiscated_cards"] = [confiscated]
		enemies[enemy_index] = enemy
	state["enemies"] = enemies
	state["piles"] = piles


static func _prepare_enemy_pile_seals(state: Dictionary, supplied_random: RandomNumberGenerator = null) -> void:
	var random: RandomNumberGenerator = supplied_random
	if random == null:
		random = RandomNumberGenerator.new()
		random.seed = int(state.get("battle_seed", 0)) + int(state.get("turn", 1)) * 65537
	var candidates: Array[int] = []
	for pile_index in range(state.get("piles", []).size()):
		if not state["piles"][pile_index].is_empty():
			candidates.append(pile_index)
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		if int(enemy.get("hp", 0)) <= 0 or not bool(enemy.get("seals_pile", false)):
			continue
		if int(enemy.get("sealed_turn", -1)) == int(state.get("turn", 1)):
			continue
		enemy["sealed_turn"] = int(state.get("turn", 1))
		enemy["sealed_pile_index"] = candidates[random.randi_range(0, candidates.size() - 1)] if not candidates.is_empty() else -1
		enemies[enemy_index] = enemy
	state["enemies"] = enemies


static func _blocked_pile_indexes(state: Dictionary) -> Array[int]:
	var blocked: Array[int] = []
	for enemy in state.get("enemies", []):
		var file_index := int(enemy.get("sealed_pile_index", -1))
		if (
			int(enemy.get("hp", 0)) > 0
			and bool(enemy.get("seals_pile", false))
			and int(enemy.get("sealed_turn", -1)) == int(state.get("turn", 1))
			and file_index >= 0
			and not blocked.has(file_index)
		):
			blocked.append(file_index)
	return blocked


static func _clear_enemy_physical_blocks(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		enemy["physical_block"] = 0
		enemies[enemy_index] = enemy
	state["enemies"] = enemies


static func _arm_solitaire_enemy_bonuses(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		if (
			int(enemy.get("hp", 0)) > 0
			and int(enemy.get("solitaire_hit_bonus", 0)) > 0
		):
			enemy["solitaire_hit_bonus_stacks"] = int(enemy.get("solitaire_hit_bonus_stacks", 0)) + 1
			enemies[enemy_index] = enemy
			if enemy_index == int(state.get("target_enemy_index", 0)):
				state["enemy_solitaire_hit_bonus_stacks"] = int(enemy["solitaire_hit_bonus_stacks"])
	state["enemies"] = enemies


static func _reset_solitaire_enemy_bonuses(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		enemy["solitaire_hit_bonus_stacks"] = 0
		enemies[enemy_index] = enemy
	state["enemies"] = enemies
	state["enemy_solitaire_hit_bonus_stacks"] = 0


static func _check_enemy_half_hp_passive(state: Dictionary, enemy_index: int) -> void:
	var enemies: Array = state.get("enemies", [])
	if enemy_index < 0 or enemy_index >= enemies.size():
		return
	var enemy: Dictionary = enemies[enemy_index]
	var gain := int(enemy.get("half_hp_strength_gain", 0))
	var max_hp := int(enemy.get("max_hp", 0))
	if (
		int(enemy.get("hp", 0)) > 0
		and gain > 0
		and not bool(enemy.get("enraged", false))
		and max_hp > 0
		and int(enemy["hp"]) * 2 <= max_hp
	):
		enemy["strength"] = int(enemy.get("strength", 0)) + gain
		enemy["enraged"] = true
		enemies[enemy_index] = enemy
		state["message"] += " · %s: 힘 +%d" % [enemy.get("name", "적"), gain]
		state["enemies"] = enemies


static func _spawn_enemy_minions(state: Dictionary) -> void:
	var pending: Array = state.get("pending_summoners", [])
	if pending.is_empty():
		return
	var enemies: Array = state.get("enemies", [])
	var next_id := 1
	for enemy in enemies:
		next_id = maxi(next_id, int(enemy.get("id", 0)) + 1)
	for raw_parent_index in pending:
		var parent_index := int(raw_parent_index)
		if parent_index < 0 or parent_index >= enemies.size():
			continue
		var parent: Dictionary = enemies[parent_index]
		if int(parent.get("hp", 0)) <= 0:
			continue
		parent["summons_created"] = int(parent.get("summons_created", 0)) + EnemyCatalog.ROACH_SUMMON_COUNT
		enemies[parent_index] = parent
		var karma_stage := maxi(0, int(parent.get("karma_stage", 0)))
		var summon_hp := floori(float(EnemyCatalog.ROACH_BASE_HP) * float(10 + karma_stage) / 10.0)
		summon_hp = floori(float(summon_hp) * float(parent.get("summon_hp_multiplier", 1.0)))
		for _summon_index in EnemyCatalog.ROACH_SUMMON_COUNT:
			enemies.append({
				"id": next_id,
				"name": "새끼 바퀴",
				"hp": summon_hp,
				"max_hp": summon_hp,
				"strength": karma_stage,
				"vulnerable": 0,
				"weak": 0,
				"physical_block": 0,
				"actions": [{"name": "물기", "damage": EnemyCatalog.ROACH_BASE_DAMAGE, "cycle": true}],
				"action_index": 0,
				"first_action_completed": false,
				"death_resolved": false,
				"summoner_id": parent.get("id"),
				"trait": "",
			})
			next_id += 1
		state["message"] += " · " + EnemyCatalog.roach_summon_description()
	state["enemies"] = enemies
	state["pending_summoners"] = []
	_ensure_living_target(state)


static func _apply_shared_turn_end_strength(state: Dictionary) -> void:
	var player_gain := 0
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		if int(enemy.get("hp", 0)) <= 0:
			continue
		var shared_gain := int(enemy.get("shared_turn_end_strength_gain", 0))
		if shared_gain > 0:
			player_gain += shared_gain
			enemy["strength"] = int(enemy.get("strength", 0)) + shared_gain
			enemies[enemy_index] = enemy
	if player_gain > 0:
		state["strength"] = int(state.get("strength", 0)) + player_gain
		state["message"] += " · 플레이어·적 힘 +%d" % player_gain
	state["enemies"] = enemies


static func _add_enemy_intent_tokens_to_files(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	var piles: Array = state.get("piles", [])
	var soil_added := 0
	var rocks_added := 0
	for enemy in enemies:
		if int(enemy.get("hp", 0)) <= 0:
			continue
		var actions: Array = enemy.get("actions", [])
		if actions.is_empty():
			continue
		var action_index := clampi(int(enemy.get("action_index", 0)), 0, actions.size() - 1)
		var action: Dictionary = actions[action_index]
		var soil_count := maxi(0, int(action.get("soil_count", 0)))
		var rock_count := maxi(0, int(action.get("rock_count", 0)))
		if not bool(enemy.get("first_action_completed", false)) and action.has("first_action_rock_count"):
			rock_count = maxi(0, int(action["first_action_rock_count"]))
		for file_index in range(piles.size()):
			var pile: Array = piles[file_index]
			for _soil_index in range(soil_count):
				var soil := CardCatalog.create_soil_card(int(state.get("next_generated_card_id", -1)))
				state["next_generated_card_id"] = int(state.get("next_generated_card_id", -1)) - 1
				pile.append(soil)
				soil_added += 1
			for _rock_index in range(rock_count):
				var rock := CardCatalog.create_rock_card(int(state.get("next_generated_card_id", -1)))
				state["next_generated_card_id"] = int(state.get("next_generated_card_id", -1)) - 1
				pile.append(rock)
				rocks_added += 1
			_reveal_file_top(pile)
			piles[file_index] = pile
	state["piles"] = piles
	if soil_added > 0 or rocks_added > 0:
		var token_notes: Array[String] = []
		if soil_added > 0:
			token_notes.append("흙 %d장 추가" % soil_added)
		if rocks_added > 0:
			token_notes.append("바위 %d장 추가" % rocks_added)
		state["message"] += " · " + " · ".join(token_notes)


static func _prepare_enemy_discard_targets(state: Dictionary) -> void:
	var files: Array = state.get("piles", [])
	var non_empty_file_indexes: Array[int] = []
	var all_file_indexes: Array[int] = []
	for file_index in range(files.size()):
		all_file_indexes.append(file_index)
		if not files[file_index].is_empty():
			non_empty_file_indexes.append(file_index)
	var fallback_candidates := non_empty_file_indexes if not non_empty_file_indexes.is_empty() else all_file_indexes
	var rarity_rank := {"status": 0, "starter": 1, "basic": 2, "special": 3, "rare": 4, "legendary": 5}
	var random := RandomNumberGenerator.new()
	random.seed = int(state.get("battle_seed", 0)) + int(state.get("turn", 1)) * 104729 + 1618033
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		enemy.erase("discard_pile_index")
		var actions: Array = enemy.get("actions", [])
		var action_index := int(enemy.get("action_index", 0))
		if int(enemy.get("hp", 0)) > 0 and action_index >= 0 and action_index < actions.size():
			var action: Dictionary = actions[action_index]
			if int(action.get("discard_count", 0)) + int(enemy.get("action_discard_count", 0)) > 0 and not fallback_candidates.is_empty():
				var candidates: Array[int] = fallback_candidates.duplicate()
				if str(action.get("discard_priority", enemy.get("discard_priority", ""))) == "rarity" and not non_empty_file_indexes.is_empty():
					var highest_rarity_candidates: Array[int] = []
					var highest_rarity := -1
					for file_index in non_empty_file_indexes:
						var top_card: Dictionary = files[file_index].back()
						var rank := int(rarity_rank.get(str(top_card.get("rarity", "basic")), 2))
						if rank > highest_rarity:
							highest_rarity = rank
							highest_rarity_candidates.clear()
						if rank == highest_rarity:
							highest_rarity_candidates.append(file_index)
					if not highest_rarity_candidates.is_empty():
						candidates = highest_rarity_candidates
				enemy["discard_pile_index"] = candidates[random.randi_range(0, candidates.size() - 1)]
		enemies[enemy_index] = enemy
	state["enemies"] = enemies


static func _discard_targeted_file_top(state: Dictionary, enemy_index: int, discard_count: int, discard_view: Variant = null) -> String:
	if discard_view is Dictionary:
		discard_view.clear()
	var enemies: Array = state.get("enemies", [])
	if enemy_index < 0 or enemy_index >= enemies.size():
		return ""
	var file_index := int(enemies[enemy_index].get("discard_pile_index", -1))
	var files: Array = state.get("piles", [])
	if file_index < 0 or file_index >= files.size():
		return ""
	if discard_view is Dictionary:
		discard_view["file_index"] = file_index
	var pile: Array = files[file_index]
	var triggered_draws := 0
	var discarded_names: Array[String] = []
	var discarded_count := 0
	for _discard_index in range(maxi(0, discard_count)):
		if pile.is_empty():
			break
		var discarded: Dictionary = pile.pop_back()
		triggered_draws += _discard_card(state, discarded, false, true)
		discarded_names.append(str(discarded.get("name", "카드")))
		discarded_count += 1
	_reveal_file_top(pile)
	files[file_index] = pile
	state["piles"] = files
	if triggered_draws > 0:
		_draw_random_cards(state, triggered_draws)
	if discard_view is Dictionary:
		discard_view["count"] = discarded_count
	return ", ".join(discarded_names)


static func _clear_enemy_discard_target(state: Dictionary, enemy_index: int) -> void:
	var enemies: Array = state.get("enemies", [])
	if enemy_index < 0 or enemy_index >= enemies.size():
		return
	var enemy: Dictionary = enemies[enemy_index]
	enemy.erase("discard_pile_index")
	enemies[enemy_index] = enemy
	state["enemies"] = enemies


static func _hand_card_index(hand: Array, card_id: int) -> int:
	for index in range(hand.size()):
		if int(hand[index].get("id", -1)) == card_id:
			return index
	return -1


static func _reveal_file_top(pile: Array) -> void:
	if not pile.is_empty():
		pile[-1]["revealed"] = true


static func _shuffle(cards: Array, random: RandomNumberGenerator) -> void:
	for index in range(cards.size() - 1, 0, -1):
		var target := random.randi_range(0, index)
		var temporary = cards[index]
		cards[index] = cards[target]
		cards[target] = temporary


static func _with_message(state: Dictionary, message: String) -> Dictionary:
	var next: Dictionary = state.duplicate(true)
	sync_hand_stats(next)
	next["message"] = message
	return next


static func effective_card_cost(state: Dictionary, card: Dictionary) -> int:
	var cost := CardStickers.card_energy_cost(card)
	var effect := str(card.get("effect", ""))
	if effect == "odin_spear":
		cost -= int(state.get("forge_count", 0))
	elif effect == "landslide":
		cost = maxi(0, cost - int(state.get("discard_count", 0)))
	if bool(card.get("rule", false)):
		for rule_card in state.get("active_rule_cards", []):
			if str(rule_card.get("effect", "")) == "law_research":
				cost -= int(rule_card.get("value", 1))
	return cost


static func sort_hand_by_cost(state: Dictionary, hand: Array) -> Array[Dictionary]:
	var rarity_rank := {"legendary": 0, "rare": 1, "special": 2, "basic": 3, "starter": 4, "status": 5}
	var sortable: Array[Dictionary] = []
	for index in range(hand.size()):
		var card: Dictionary = hand[index]
		var sort_cost := INF
		if not CardUse.is_playable(card):
			sort_cost = -999.0
		elif card.has("cost"):
			sort_cost = float(effective_card_cost(state, card))
		sortable.append({
			"card": card,
			"cost": sort_cost,
			"rarity": int(rarity_rank.get(str(card.get("rarity", "status")), 5)),
			"index": index,
		})
	sortable.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		if float(left["cost"]) != float(right["cost"]):
			return float(left["cost"]) < float(right["cost"])
		if int(left["rarity"]) != int(right["rarity"]):
			return int(left["rarity"]) < int(right["rarity"])
		return int(left["index"]) < int(right["index"])
	)
	var sorted_hand: Array[Dictionary] = []
	for entry in sortable:
		var card: Dictionary = entry["card"]
		sorted_hand.append(card.duplicate(true))
	return sorted_hand


static func can_pay_card_cost(state: Dictionary, card: Dictionary) -> bool:
	var economics_research_count := 0
	for rule_card in state.get("active_rule_cards", []):
		if str(rule_card.get("effect", "")) == "economics_research":
			economics_research_count += 1
	return int(state.get("energy", 0)) - effective_card_cost(state, card) >= -3 * economics_research_count


static func _create_battle_radiance(state: Dictionary) -> Dictionary:
	var card := CardCatalog.create_radiance_card(int(state["next_generated_card_id"]))
	state["next_generated_card_id"] = int(state["next_generated_card_id"]) - 1
	if state.get("deck_editions", []).has("prism"):
		var random := RandomNumberGenerator.new()
		random.seed = int(state.get("battle_seed", 0))
		if state.has("prism_random_state"):
			random.state = int(state["prism_random_state"])
		card = CardStickers.with_random_sticker(card, 1.0, random)
		state["prism_random_state"] = random.state
	return card
