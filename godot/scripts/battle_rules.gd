extends RefCounted

class_name PortBattleRules

const CardUse = preload("res://scripts/card_use.gd")

const STARTING_ENERGY := 3
const CARDS_PER_FILE := 5
const EnemyCatalog = preload("res://scripts/enemy_catalog.gd")
const CardCatalog = preload("res://scripts/card_catalog.gd")
const CardStickers = preload("res://scripts/stickers.gd")
const DeckEditions = preload("res://scripts/deck_editions.gd")
const SolitaireRules = preload("res://scripts/solitaire_rules.gd")


static func start_battle(deck: Array, player_hp: int, encounter: Dictionary = {}, max_player_hp: int = -1,
		deck_editions: Array = [], deck_capacity: int = -1, initial_draw_view: Variant = null) -> Dictionary:
	var random := RandomNumberGenerator.new()
	random.randomize()
	var cards: Array = deck.duplicate(true)
	var editions: Array = deck_editions.duplicate()
	var cards_per_file := 4 if editions.has("fantastic") else CARDS_PER_FILE
	var quick_hammer_forged := editions.has("quickHammer") and _apply_quick_hammer(cards, random)
	var deck_highlander := editions.has("deckHighlander") and _is_full_highlander_deck(cards, deck_capacity)
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
	if editions.has("roomy"):
		piles.append([])

	var enemy := encounter.duplicate(true) if not encounter.is_empty() else EnemyCatalog.create_encounter()
	var enemies: Array = enemy.get("enemies", [enemy]).duplicate(true)
	if enemies.is_empty():
		enemies.append(EnemyCatalog.create_encounter())
	var primary_enemy: Dictionary = enemies[0]
	var state := {
		"enemies": enemies,
		"target_enemy_index": 0,
		"enemy_name": str(primary_enemy.get("name", "적")),
		"enemy_hp": int(primary_enemy.get("hp", 24)),
		"enemy_max_hp": int(primary_enemy.get("max_hp", primary_enemy.get("hp", 24))),
		"enemy_strength": int(primary_enemy.get("strength", 0)),
		"enemy_resistance": int(primary_enemy.get("resistance", 0)),
		"enemy_amplification": int(primary_enemy.get("amplification", 0)),
		"enemy_status_effectiveness": int(primary_enemy.get("status_effectiveness", 30)),
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
		"enemy_solitaire_hit_bonus_ready": bool(primary_enemy.get("solitaire_hit_bonus_ready", false)),
		"enemy_is_boss": bool(primary_enemy.get("is_boss", false)),
		"enemy_actions": primary_enemy.get("actions", []).duplicate(true),
		"enemy_action_index": int(primary_enemy.get("action_index", 0)),
		"enemy_attack": 0,
		"enemy_intent": "",
		"enemy_trait": str(primary_enemy.get("trait", "")),
		"battle_seed": random.randi(),
		"player_hp": player_hp,
		"max_player_hp": maxi(player_hp, max_player_hp) if max_player_hp >= 0 else player_hp,
		"player_block": 5 if editions.has("defensiveStance") else 0,
		"player_magic_block": 0,
		"agility": talisman_agility + (3 if editions.has("giant") else 0),
		"player_amplification": 0,
		"player_resistance": 2 if editions.has("resistance") else 0,
		"player_invulnerability_turns": 1 if editions.has("invincible") else 0,
		"energy": STARTING_ENERGY,
		"max_energy": STARTING_ENERGY + (1 if editions.has("rampaging") or deck_highlander else 0),
		"stars": 2 + (2 if editions.has("clever") else 0) + (1 if editions.has("starPlus") else 0)
			+ (5 if editions.has("starFive") else 0) + (3 if editions.has("starThree") else 0)
			+ (1 if quick_hammer_forged and editions.has("hammering") else 0),
		"strength": talisman_strength + (3 if editions.has("giant") else 0),
		"temporary_strength": 0,
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
		"pending_extra_turns": 0,
		"pending_radiance": [],
		"pending_battle_preparation": 0,
		"pending_iron_song": [],
		"preserve_block_on_turn_end": false,
		"overcharge_triggered_this_turn": false,
		"critical_reaction_triggered_this_turn": false,
		"random_draw_sequence": 0,
		# Generated hand cards must not collide with the -1 "no card" sentinel.
		"next_generated_card_id": 2000000000,
		"forge_count": 1 if quick_hammer_forged else 0,
		"toxic_slime_added": false,
		"pending_summoners": [],
		"solitaire_bonus_used_this_turn": false,
		"repeat_next_attack": false,
		"pending_play_card_id": -1,
		"pending_discard_count": 0,
		"pending_pile_operation": "",
		"status": "playing",
		"message": "각 파일의 맨 위 카드를 손패로 가져왔습니다.",
	}
	state["energy"] = maxi(0, int(state["max_energy"]) + (1 if editions.has("energyPlus") else 0)
		+ (3 if editions.has("energyThree") else 0) - _enemy_energy_recovery_penalty(state["enemies"]))
	var setup_random := RandomNumberGenerator.new()
	setup_random.seed = int(state["battle_seed"])
	var sticker_setup := CardStickers.place_starting_stickers(state["piles"], setup_random)
	state["piles"] = sticker_setup.get("piles", state["piles"])
	state["hand"] = sticker_setup.get("hand", [])
	if editions.has("whiteSpace"):
		for pile in state["piles"]:
			if pile.is_empty():
				state["strength"] = int(state["strength"]) + 2
	if editions.has("lively"):
		var adrenaline := CardCatalog.create_adrenaline_card(int(state["next_generated_card_id"]))
		if not adrenaline.is_empty():
			adrenaline["revealed"] = true
			state["hand"].append(adrenaline)
			state["next_generated_card_id"] = int(state["next_generated_card_id"]) - 1
	_add_encounter_start_cards(state)
	_confiscate_rare_cards(state, setup_random)
	_prepare_enemy_pile_seals(state, setup_random)
	_apply_enemy_turn_start(state)
	_draw_from_files(state, initial_draw_view)
	var edition_start_draws := (1 if editions.has("drawPlus") else 0) + (1 if editions.has("persistentDraw") else 0)
	if edition_start_draws > 0:
		_draw_random_cards(state, edition_start_draws)
	_prepare_enemy_discard_targets(state)
	_add_enemy_intent_tokens_to_files(state)
	_refresh_enemy_intent(state)
	return state


static func select_enemy_target(state: Dictionary, enemy_index: int) -> Dictionary:
	var next: Dictionary = state.duplicate(true)
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
	state["enemy_resistance"] = int(enemy.get("resistance", 0))
	state["enemy_amplification"] = int(enemy.get("amplification", 0))
	state["enemy_status_effectiveness"] = int(enemy.get("status_effectiveness", 30))
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
	state["enemy_solitaire_hit_bonus_ready"] = bool(enemy.get("solitaire_hit_bonus_ready", false))
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
	enemy["resistance"] = int(state.get("enemy_resistance", enemy.get("resistance", 0)))
	enemy["amplification"] = int(state.get("enemy_amplification", enemy.get("amplification", 0)))
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
	enemy["solitaire_hit_bonus_ready"] = bool(state.get("enemy_solitaire_hit_bonus_ready", enemy.get("solitaire_hit_bonus_ready", false)))
	enemy["action_index"] = int(state.get("enemy_action_index", enemy.get("action_index", 0)))
	enemy["actions"] = state.get("enemy_actions", enemy.get("actions", [])).duplicate(true)
	enemies[index] = enemy
	state["enemies"] = enemies


static func _adjust_all_enemy_status(state: Dictionary, resistance_change: int, amplification_change: int) -> void:
	_save_enemy_aliases(state)
	var enemies: Array = state.get("enemies", [])
	for index in range(enemies.size()):
		var enemy: Dictionary = enemies[index]
		if int(enemy.get("hp", 0)) <= 0:
			continue
		enemy["resistance"] = int(enemy.get("resistance", 0)) + resistance_change
		enemy["amplification"] = int(enemy.get("amplification", 0)) + amplification_change
		enemies[index] = enemy
	state["enemies"] = enemies
	_load_enemy_aliases(state)


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
	var pending_id := int(next.get("pending_play_card_id", -1))
	if pending_id < 0 or discarded_card_id == pending_id:
		return _with_message(next, "사용할 카드와 다른 카드를 선택하세요.")
	var discard_index := _hand_card_index(next["hand"], discarded_card_id)
	if discard_index < 0:
		return _with_message(next, "버릴 카드를 찾을 수 없습니다.")
	var discarded: Dictionary = next["hand"].pop_at(discard_index)
	var saeongjima_draws := _discard_card(next, discarded, true, true)
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
	if int(next.get("pending_play_card_id", -1)) >= 0:
		next["pending_play_card_id"] = -1
		next["pending_discard_count"] = 0
		next["message"] = "카드 사용을 취소했습니다."
	return next


static func resolve_pile_operation(state: Dictionary, file_index: int) -> Dictionary:
	var next: Dictionary = state.duplicate(true)
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
	return next


static func can_draw_from_file(state: Dictionary, file_index: int) -> bool:
	if int(state.get("pending_draws", 0)) <= 0 and int(state.get("pending_pile_draw_count", 0)) <= 0:
		return false
	var files: Array = state.get("piles", [])
	if file_index < 0 or file_index >= files.size() or files[file_index].is_empty():
		return false
	return not _blocked_pile_indexes(state).has(file_index)


static func draw_from_file(state: Dictionary, file_index: int) -> Dictionary:
	var next: Dictionary = state.duplicate(true)
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
	return next


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
	var files: Array = next["piles"]
	var moving: Array = SolitaireRules.source_cards(next, payload)
	var from_hand := str(payload.get("source", "")) == "hand"
	var star_cost := CardStickers.solitaire_star_cost(moving[0])
	var target_card: Dictionary = files[target_file].back() if not files[target_file].is_empty() else {}
	var updated_target: Dictionary = target_card
	var consumes_target := false
	var forge_count := 0
	var placed: Array = []
	var retrieved: Array = []
	var metallurgy := _has_active_rule(next, "metallurgy_research") and not _blocked_pile_indexes(next).has(target_file)
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
	next["forge_count"] = int(next.get("forge_count", 0)) + forge_count
	next["stars"] = int(next["stars"]) - star_cost
	if forge_count > 0 and next.get("deck_editions", []).has("hammering"):
		next["stars"] = int(next["stars"]) + 1
	_arm_solitaire_enemy_bonuses(next)
	next["message"] = "%d장을 %d번 파일로 옮겼습니다." % [moving.size(), target_file + 1]
	if forge_count > 0:
		next["message"] += " · %d장 재련" % forge_count
	if not retrieved.is_empty():
		next["message"] += " · 금속학 연구: %d장 가져옴" % retrieved.size()
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
		if completed_forges.size() >= 5 or str(target_card.get("kind", "")) != "strike":
			return {"applied": false, "card": moving_card, "target": target_card}
		var dagger := moving_card.duplicate(true)
		dagger["value"] = int(moving_card.get("value", 1)) + int(target_card.get("value", 0))
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
		var moving_cost := effective_card_cost(state, moving_card)
		forged_card["base_cost"] = moving_card.get("base_cost", moving_card["cost"])
		updated_target["base_cost"] = target_card.get("base_cost", target_card["cost"])
		forged_card["cost"] = target_cost
		updated_target["cost"] = moving_cost
	forged_card["forged"] = true
	state["forge_count"] = int(state.get("forge_count", 0)) + 1
	return {"applied": true, "card": forged_card, "target": updated_target}


static func _is_full_highlander_deck(cards: Array, deck_capacity: int) -> bool:
	if deck_capacity <= 0 or cards.size() != deck_capacity:
		return false
	var seen_names: Dictionary = {}
	for card in cards:
		var card_name := str(card.get("name", ""))
		if seen_names.has(card_name):
			return false
		seen_names[card_name] = true
	return true


static func _apply_quick_hammer(cards: Array, random: RandomNumberGenerator) -> bool:
	var candidates: Array[Vector2i] = []
	for moving_index in range(cards.size()):
		var moving_card: Dictionary = cards[moving_index]
		var moving_effect := str(moving_card.get("effect", ""))
		if moving_effect in ["exchange", "obsidian_dagger"] or bool(moving_card.get("forged", false)):
			continue
		for target_index in range(cards.size()):
			if target_index == moving_index:
				continue
			var target_card: Dictionary = cards[target_index]
			if str(target_card.get("effect", "")) in ["exchange", "obsidian_dagger"]:
				continue
			var probe := {"forge_count": 0, "active_rule_cards": []}
			if bool(_resolve_forge_placement(probe, moving_card, target_card).get("applied", false)):
				candidates.append(Vector2i(moving_index, target_index))
	if candidates.is_empty():
		return false
	var selected: Vector2i = candidates[random.randi_range(0, candidates.size() - 1)]
	var moving_index := selected.x
	var target_index := selected.y
	var probe := {"forge_count": 0, "active_rule_cards": []}
	var result := _resolve_forge_placement(probe, cards[moving_index], cards[target_index])
	if not bool(result.get("applied", false)):
		return false
	cards[moving_index] = result.get("card", cards[moving_index])
	if bool(result.get("consumes_target", false)):
		cards.remove_at(target_index)
	else:
		cards[target_index] = result.get("target", cards[target_index])
	return true


static func end_turn(state: Dictionary, draw_view: Variant = null, turn_view: Variant = null) -> Dictionary:
	if turn_view is Dictionary:
		turn_view.clear()
		turn_view["steps"] = []
	if draw_view is Dictionary:
		draw_view.erase("before")
	var next: Dictionary = state.duplicate(true)
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
	var next_turn_player_status_changes := {"resistance": 0, "amplification": 0}
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
		"player_magic_block": int(next.get("player_magic_block", 0)),
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
	if next.get("deck_editions", []).has("frugalPlus") and int(next.get("energy", 0)) > 0:
		var gained_stars := int(next["energy"]) * 2
		next["stars"] = int(next.get("stars", 0)) + gained_stars
		next["message"] += " · 재활용+: ★ %d 획득" % gained_stars
	if int(next.get("pending_extra_turns", 0)) > 0:
		next["pending_extra_turns"] = int(next["pending_extra_turns"]) - 1
		return _begin_extra_turn(next, preferred_target_index, turn_end_hand, draw_view)
	_clear_enemy_physical_blocks(next)
	_load_enemy_aliases(next)
	var actions: Array = next["enemy_actions"]
	primary_enemy_index = int(next.get("target_enemy_index", primary_enemy_index))
	var primary_enemies: Array = next.get("enemies", [])
	var primary_enemy: Dictionary = primary_enemies[primary_enemy_index] if primary_enemy_index >= 0 and primary_enemy_index < primary_enemies.size() else {}
	if bool(primary_enemy.get("stunned", false)):
		var stunned_action_index := clampi(int(next.get("enemy_action_index", 0)), 0, actions.size() - 1) if not actions.is_empty() else -1
		var stunned_action_name := str(actions[stunned_action_index].get("name", "")) if stunned_action_index >= 0 else ""
		next["enemy_stunned"] = false
		next["enemy_resistance"] = _decay_status(int(next.get("enemy_resistance", 0)))
		next["enemy_amplification"] = _decay_status(int(next.get("enemy_amplification", 0)))
		next["message"] = "%s의 행동이 취소되었습니다." % next["enemy_name"]
		_save_enemy_aliases(next)
		_record_enemy_turn_message_step(turn_view, primary_enemy_index, primary_enemy,
			stunned_action_name, "행동 취소", "enemy", "debuff", next)
		_resolve_other_enemies_turn(next, primary_enemy_index, next_turn_player_status_changes, turn_view)
		if str(next.get("status", "playing")) != "playing":
			_discard_turn_end_hand(next, turn_end_hand)
			return next
		_apply_player_status_turn_end(next, next_turn_player_status_changes)
		_ensure_living_target(next)
		_spawn_enemy_minions(next)
		_apply_shared_turn_end_strength(next)
		_discard_turn_end_hand(next, turn_end_hand)
		next["temporary_strength"] = 0
		if int(next.get("player_invulnerability_turns", 0)) > 0:
			next["player_invulnerability_turns"] = int(next["player_invulnerability_turns"]) - 1
		next["player_block"] = floori(float(next.get("player_block", 0)) / 2.0) if bool(next.get("preserve_block_on_turn_end", false)) else 0
		next["player_magic_block"] = 0
		next["turn"] = int(next["turn"]) + 1
		next["radiance_played_this_turn"] = 0
		_apply_enemy_turn_start(next)
		_reset_solitaire_enemy_bonuses(next)
		_prepare_enemy_pile_seals(next)
		next["energy"] = _recover_battle_energy(next)
		next["overcharge_triggered_this_turn"] = false
		next["critical_reaction_triggered_this_turn"] = false
		_apply_scheduled_preparation(next)
		_draw_from_files(next, draw_view)
		_apply_turn_start_effects(next)
		_prepare_enemy_discard_targets(next)
		_add_enemy_intent_tokens_to_files(next)
		_restore_enemy_target(next, preferred_target_index)
		_refresh_enemy_intent(next)
		return next
	if not actions.is_empty():
		var action_index := int(next["enemy_action_index"])
		var action: Dictionary = actions[action_index]
		var temporary_strength := _temporary_enemy_strength(next)
		var raw_damage := int(action.get("damage", 0)) + int(next.get("enemy_strength", 0)) + temporary_strength
		var hits := maxi(1, int(action.get("hits", 1)))
		var total_damage := 0
		var total_blocked := 0
		var protected_by_invulnerability := int(next.get("player_invulnerability_turns", 0)) > 0
		var block_key := "player_magic_block" if str(action.get("damage_type", "physical")) == "magic" else "player_block"
		if not protected_by_invulnerability:
			for _hit_index in range(hits):
				var incoming := _calculate_attack_damage(
					raw_damage,
					int(next.get("enemy_amplification", 0)),
					int(next.get("player_resistance", 0)),
					int(next.get("enemy_status_effectiveness", 30)),
					30
				)
				var blocked := mini(incoming, int(next.get(block_key, 0)))
				var damage := incoming - blocked
				next[block_key] = int(next.get(block_key, 0)) - blocked
				total_damage += damage
				total_blocked += blocked
				next["player_hp"] = maxi(0, int(next["player_hp"]) - damage)
				if int(action.get("damage", 0)) > 0:
					_record_enemy_turn_view_step(turn_view, primary_enemy_index, primary_enemy,
						str(action.get("name", "")), true, damage, next)
				if int(next["player_hp"]) <= 0:
					break
		elif int(action.get("damage", 0)) > 0:
			for _hit_index in range(hits):
				_record_enemy_turn_view_step(turn_view, primary_enemy_index, primary_enemy,
					str(action.get("name", "")), true, 0, next)
		if int(next["player_hp"]) <= 0:
			_discard_turn_end_hand(next, turn_end_hand)
			next["status"] = "lost"
			next["message"] = "%s의 공격으로 쓰러졌습니다." % next["enemy_name"]
			return next
		var effect_messages: Array[String] = []
		next["enemy_first_action_completed"] = true
		var resistance_gain := int(action.get("resistance_gain", 0))
		var amplification_gain := int(action.get("amplification_gain", 0))
		next["enemy_resistance"] = _decay_status(int(next.get("enemy_resistance", 0))) + resistance_gain
		next["enemy_amplification"] = _decay_status(int(next.get("enemy_amplification", 0))) + amplification_gain
		if resistance_gain != 0:
			effect_messages.append("저항 %s%d" % ["+" if resistance_gain > 0 else "−", absi(resistance_gain)])
		if amplification_gain != 0:
			effect_messages.append("증폭 %s%d" % ["+" if amplification_gain > 0 else "−", absi(amplification_gain)])
		var powder_gain := int(action.get("powder_gain", 0))
		if powder_gain > 0:
			next["enemy_powder"] = int(next.get("enemy_powder", 0)) + powder_gain
			effect_messages.append("화약 +%d" % powder_gain)
		var strength_gain := int(action.get("strength_gain", 0))
		if strength_gain > 0:
			next["enemy_strength"] = int(next["enemy_strength"]) + strength_gain
			effect_messages.append("힘 +%d" % strength_gain)
		var turn_end_strength_gain := int(primary_enemy.get("turn_end_strength_gain", 0))
		if turn_end_strength_gain > 0:
			next["enemy_strength"] = int(next["enemy_strength"]) + turn_end_strength_gain
			effect_messages.append("턴 종료 힘 +%d" % turn_end_strength_gain)
		var block_gain := int(action.get("block_gain", 0))
		if block_gain > 0:
			next["enemy_physical_block"] = int(next.get("enemy_physical_block", 0)) + block_gain
			effect_messages.append("방어 +%d" % block_gain)
		var heal_gain := int(action.get("heal_gain", 0))
		if heal_gain > 0:
			var healed := mini(heal_gain, int(next.get("enemy_max_hp", 0)) - int(next.get("enemy_hp", 0)))
			next["enemy_hp"] = int(next.get("enemy_hp", 0)) + healed
			effect_messages.append("체력 +%d" % healed)
		var boon_gain := int(action.get("boon_gain", 0))
		if boon_gain > 0:
			next["enemy_boon"] = int(next.get("enemy_boon", 0)) + boon_gain
			effect_messages.append("가호 +%d" % boon_gain)
		var strength_loss := int(action.get("strength_loss", 0))
		if strength_loss > 0:
			next["strength"] = maxi(0, int(next.get("strength", 0)) - strength_loss)
			effect_messages.append("플레이어 힘 -%d" % strength_loss)
		var agility_loss := int(action.get("agility_loss", 0))
		if agility_loss > 0:
			next["agility"] = maxi(0, int(next.get("agility", 0)) - agility_loss)
			effect_messages.append("플레이어 강인함 -%d" % agility_loss)
		var amplification_change := int(action.get("next_turn_player_amplification_change", 0))
		var resistance_change := int(action.get("next_turn_player_resistance_change", 0))
		next_turn_player_status_changes["amplification"] += amplification_change
		next_turn_player_status_changes["resistance"] += resistance_change
		if amplification_change != 0:
			effect_messages.append("다음 턴 약화 %d" % abs(amplification_change))
		if resistance_change != 0:
			effect_messages.append("다음 턴 취약 %d" % abs(resistance_change))
		var discard_view: Dictionary = {}
		if int(action.get("discard_count", 0)) > 0:
			var discarded_name := _discard_targeted_file_top(next, primary_enemy_index, int(action.get("discard_count", 1)), discard_view)
			if discarded_name != "":
				effect_messages.append("파일 맨 위 %s 버림" % discarded_name)
		if bool(action.get("self_destruct", false)):
			next["enemy_hp"] = 0
			_save_enemy_aliases(next)
			effect_messages.append("자폭")
		if bool(primary_enemy.get("rests_when_blocked", false)) and int(action.get("damage", 0)) > 0:
			next["enemy_action_index"] = 1 if total_damage == 0 and actions.size() > 1 else 0
		else:
			next["enemy_action_index"] = _choose_next_enemy_action_index(next, actions, action_index, primary_enemy_index)
		next["message"] = "%s의 %s · 피해 %d (방어 %d)" % [next["enemy_name"], action["name"], total_damage, total_blocked]
		if protected_by_invulnerability:
			next["message"] += " · 무적"
		if not effect_messages.is_empty():
			next["message"] += " · " + " · ".join(effect_messages)
		if str(action.get("summon", "")) == "roachHatchling":
			var pending_summoners: Array = next.get("pending_summoners", [])
			pending_summoners.append(primary_enemy_index)
			next["pending_summoners"] = pending_summoners
		if resistance_change != 0:
			_record_enemy_turn_message_step(turn_view, primary_enemy_index, primary_enemy,
				str(action.get("name", "")), "다음 턴 " + _enemy_turn_status_label("resistance", resistance_change),
				"player", "debuff" if resistance_change < 0 else "buff", next)
		if amplification_change != 0:
			_record_enemy_turn_message_step(turn_view, primary_enemy_index, primary_enemy,
				str(action.get("name", "")), "다음 턴 " + _enemy_turn_status_label("amplification", amplification_change),
				"player", "debuff" if amplification_change < 0 else "buff", next)
		var player_debuff_parts: Array[String] = []
		if strength_loss > 0:
			player_debuff_parts.append("힘 %d 감소" % strength_loss)
		if agility_loss > 0:
			player_debuff_parts.append("강인함 %d 감소" % agility_loss)
		if not player_debuff_parts.is_empty():
			_record_enemy_turn_message_step(turn_view, primary_enemy_index, primary_enemy,
				str(action.get("name", "")), " · ".join(player_debuff_parts), "player", "debuff", next)
		if not discard_view.is_empty():
			var discarded_count := int(discard_view.get("count", 0))
			var discard_message := "%d번 파일: %d장 버림" % [int(discard_view["file_index"]) + 1, discarded_count] \
				if discarded_count > 0 else "%d번 파일은 비어 있음" % (int(discard_view["file_index"]) + 1)
			_record_enemy_turn_message_step(turn_view, primary_enemy_index, primary_enemy,
				str(action.get("name", "")), discard_message, "enemy", "debuff", next)
		var own_effect_message := _enemy_action_effect_message(primary_enemy, action)
		if own_effect_message != "":
			var effect_kind := "debuff" if resistance_gain < 0 or amplification_gain < 0 else "buff"
			_record_enemy_turn_message_step(turn_view, primary_enemy_index, primary_enemy,
				str(action.get("name", "")), own_effect_message, "enemy", effect_kind, next)
	else:
		next["enemy_resistance"] = _decay_status(int(next.get("enemy_resistance", 0)))
		next["enemy_amplification"] = _decay_status(int(next.get("enemy_amplification", 0)))
		next["message"] = "적 행동이 없습니다."
	_save_enemy_aliases(next)
	_clear_enemy_discard_target(next, primary_enemy_index)
	_resolve_other_enemies_turn(next, int(next.get("target_enemy_index", 0)), next_turn_player_status_changes, turn_view)
	if str(next.get("status", "playing")) != "playing":
		_discard_turn_end_hand(next, turn_end_hand)
		return next
	_apply_player_status_turn_end(next, next_turn_player_status_changes)
	_ensure_living_target(next)
	_spawn_enemy_minions(next)
	_apply_shared_turn_end_strength(next)
	_discard_turn_end_hand(next, turn_end_hand)
	next["temporary_strength"] = 0
	if int(next.get("player_invulnerability_turns", 0)) > 0:
		next["player_invulnerability_turns"] = int(next["player_invulnerability_turns"]) - 1
	next["player_block"] = floori(float(next.get("player_block", 0)) / 2.0) if bool(next.get("preserve_block_on_turn_end", false)) else 0
	next["player_magic_block"] = 0
	next["turn"] = int(next["turn"]) + 1
	next["radiance_played_this_turn"] = 0
	_apply_enemy_turn_start(next)
	_reset_solitaire_enemy_bonuses(next)
	_prepare_enemy_pile_seals(next)
	next["energy"] = _recover_battle_energy(next)
	next["overcharge_triggered_this_turn"] = false
	next["critical_reaction_triggered_this_turn"] = false
	_apply_scheduled_preparation(next)
	_draw_from_files(next, draw_view)
	_apply_turn_start_effects(next)
	_prepare_enemy_discard_targets(next)
	_add_enemy_intent_tokens_to_files(next)
	_restore_enemy_target(next, preferred_target_index)
	_refresh_enemy_intent(next)
	return next


static func _begin_extra_turn(state: Dictionary, preferred_target_index: int, turn_end_hand: Array, draw_view: Variant = null) -> Dictionary:
	var next := state
	_clear_enemy_physical_blocks(next)
	_discard_turn_end_hand(next, turn_end_hand)
	next["temporary_strength"] = 0
	next["player_block"] = floori(float(next.get("player_block", 0)) / 2.0) if bool(next.get("preserve_block_on_turn_end", false)) else 0
	next["player_magic_block"] = 0
	next["turn"] = int(next.get("turn", 1)) + 1
	next["radiance_played_this_turn"] = 0
	_decay_enemy_statuses(next)
	_apply_enemy_turn_start(next)
	_reset_solitaire_enemy_bonuses(next)
	next["energy"] = _recover_battle_energy(next)
	next["overcharge_triggered_this_turn"] = false
	next["critical_reaction_triggered_this_turn"] = false
	_apply_scheduled_preparation(next)
	_draw_from_files(next, draw_view)
	_apply_turn_start_effects(next)
	_prepare_enemy_discard_targets(next)
	_add_enemy_intent_tokens_to_files(next)
	_restore_enemy_target(next, preferred_target_index)
	_refresh_enemy_intent(next)
	next["message"] = "추가 턴을 시작합니다."
	return next


static func _resolve_other_enemies_turn(state: Dictionary, skipped_index: int, player_status_changes: Dictionary, turn_view: Variant = null) -> void:
	if str(state.get("status", "playing")) != "playing":
		return
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		if enemy_index == skipped_index or int(enemies[enemy_index].get("hp", 0)) <= 0:
			continue
		_load_enemy_aliases(state, enemy_index)
		if bool(state.get("enemy_stunned", false)):
			var stunned_name := ""
			var stunned_actions: Array = state.get("enemy_actions", [])
			var stunned_index := int(state.get("enemy_action_index", 0))
			if not stunned_actions.is_empty() and stunned_index >= 0 and stunned_index < stunned_actions.size():
				stunned_name = str(stunned_actions[stunned_index].get("name", ""))
			state["enemy_stunned"] = false
			state["enemy_resistance"] = _decay_status(int(state.get("enemy_resistance", 0)))
			state["enemy_amplification"] = _decay_status(int(state.get("enemy_amplification", 0)))
			state["message"] += " · %s의 행동 취소" % state["enemy_name"]
			_save_enemy_aliases(state)
			var stunned_enemy: Dictionary = state.get("enemies", [])[enemy_index]
			_record_enemy_turn_message_step(turn_view, enemy_index, stunned_enemy,
				stunned_name, "행동 취소", "enemy", "debuff", state)
			continue
		var actions: Array = state.get("enemy_actions", [])
		if actions.is_empty():
			state["enemy_resistance"] = _decay_status(int(state.get("enemy_resistance", 0)))
			state["enemy_amplification"] = _decay_status(int(state.get("enemy_amplification", 0)))
			_save_enemy_aliases(state)
			continue
		var action_index := clampi(int(state.get("enemy_action_index", 0)), 0, actions.size() - 1)
		var action: Dictionary = actions[action_index]
		var temporary_strength := _temporary_enemy_strength(state)
		var raw_damage := int(action.get("damage", 0)) + int(state.get("enemy_strength", 0)) + temporary_strength
		var hits := maxi(1, int(action.get("hits", 1)))
		var total_damage := 0
		var total_blocked := 0
		var protected_by_invulnerability := int(state.get("player_invulnerability_turns", 0)) > 0
		var block_key := "player_magic_block" if str(action.get("damage_type", "physical")) == "magic" else "player_block"
		if not protected_by_invulnerability:
			for _hit_index in range(hits):
				var incoming := _calculate_attack_damage(
					raw_damage,
					int(state.get("enemy_amplification", 0)),
					int(state.get("player_resistance", 0)),
					int(state.get("enemy_status_effectiveness", 30)),
					30
				)
				var blocked := mini(incoming, int(state.get(block_key, 0)))
				var damage := incoming - blocked
				state[block_key] = int(state.get(block_key, 0)) - blocked
				total_damage += damage
				total_blocked += blocked
				state["player_hp"] = maxi(0, int(state.get("player_hp", 0)) - damage)
				if int(action.get("damage", 0)) > 0:
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
			return
		var effect_messages: Array[String] = []
		state["enemy_first_action_completed"] = true
		var resistance_gain := int(action.get("resistance_gain", 0))
		var amplification_gain := int(action.get("amplification_gain", 0))
		state["enemy_resistance"] = _decay_status(int(state.get("enemy_resistance", 0))) + resistance_gain
		state["enemy_amplification"] = _decay_status(int(state.get("enemy_amplification", 0))) + amplification_gain
		if resistance_gain != 0:
			effect_messages.append("저항 %s%d" % ["+" if resistance_gain > 0 else "−", absi(resistance_gain)])
		if amplification_gain != 0:
			effect_messages.append("증폭 %s%d" % ["+" if amplification_gain > 0 else "−", absi(amplification_gain)])
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
		var amplification_change := int(action.get("next_turn_player_amplification_change", 0))
		var resistance_change := int(action.get("next_turn_player_resistance_change", 0))
		player_status_changes["amplification"] = int(player_status_changes.get("amplification", 0)) + amplification_change
		player_status_changes["resistance"] = int(player_status_changes.get("resistance", 0)) + resistance_change
		if amplification_change != 0:
			effect_messages.append("다음 턴 약화 %d" % abs(amplification_change))
		if resistance_change != 0:
			effect_messages.append("다음 턴 취약 %d" % abs(resistance_change))
		if resistance_change != 0:
			_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
				"다음 턴 " + _enemy_turn_status_label("resistance", resistance_change), "player",
				"debuff" if resistance_change < 0 else "buff", state)
		if amplification_change != 0:
			_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
				"다음 턴 " + _enemy_turn_status_label("amplification", amplification_change), "player",
				"debuff" if amplification_change < 0 else "buff", state)
		var player_debuff_parts: Array[String] = []
		if int(action.get("strength_loss", 0)) > 0:
			player_debuff_parts.append("힘 %d 감소" % int(action["strength_loss"]))
		if int(action.get("agility_loss", 0)) > 0:
			player_debuff_parts.append("강인함 %d 감소" % int(action["agility_loss"]))
		if not player_debuff_parts.is_empty():
			_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
				" · ".join(player_debuff_parts), "player", "debuff", state)
		var discard_view: Dictionary = {}
		if int(action.get("discard_count", 0)) > 0:
			var discarded_name := _discard_targeted_file_top(state, enemy_index, int(action.get("discard_count", 1)), discard_view)
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
			var effect_kind := "debuff" if int(action.get("resistance_gain", 0)) < 0 \
				or int(action.get("amplification_gain", 0)) < 0 else "buff"
			_record_enemy_turn_message_step(turn_view, enemy_index, enemies[enemy_index], str(action.get("name", "")),
				own_effect_message, "enemy", effect_kind, state)
		if bool(action.get("self_destruct", false)):
			state["enemy_hp"] = 0
			effect_messages.append("자폭")
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
		_save_enemy_aliases(state)
		_clear_enemy_discard_target(state, enemy_index)
	_resolve_enemy_death_effects(state)
	if int(state.get("player_hp", 0)) <= 0:
		state["status"] = "lost"
	elif _all_enemies_defeated(state):
		state["status"] = "won"
		state["message"] += " · 모든 적을 쓰러뜨렸습니다."


static func _record_enemy_turn_view_step(turn_view: Variant, enemy_index: int, enemy: Dictionary, action_name: String, attack: bool, damage: int, state: Dictionary) -> void:
	if not turn_view is Dictionary:
		return
	var steps: Array = turn_view.get("steps", [])
	steps.append({
		"enemy_index": enemy_index,
		"enemy_id": enemy.get("id", null),
		"action_name": action_name,
		"attack": attack,
		"damage": damage,
		"player_hp": int(state.get("player_hp", 0)),
		"player_block": int(state.get("player_block", 0)),
		"player_magic_block": int(state.get("player_magic_block", 0)),
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
	step["message_kind"] = message_kind
	steps[-1] = step
	turn_view["steps"] = steps


static func _enemy_turn_status_label(kind: String, value: int) -> String:
	var label := "취약" if kind == "resistance" and value < 0 else "저항" if kind == "resistance" \
		else "약화" if value < 0 else "증폭"
	return "%s %d" % [label, absi(value)]


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
	var resistance_gain := int(action.get("resistance_gain", 0))
	if resistance_gain != 0:
		parts.append(_enemy_turn_status_label("resistance", resistance_gain) + " 획득")
	var amplification_gain := int(action.get("amplification_gain", 0))
	if amplification_gain != 0:
		parts.append(_enemy_turn_status_label("amplification", amplification_gain) + " 획득")
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
			"player_magic_block": int(state.get("player_magic_block", 0)),
		},
		"extra_turn": extra_turn,
		"lethal": lethal,
	}


static func _apply_player_status_turn_end(state: Dictionary, changes: Dictionary) -> void:
	state["player_amplification"] = _decay_status(int(state.get("player_amplification", 0))) + int(changes.get("amplification", 0))
	state["player_resistance"] = _decay_status(int(state.get("player_resistance", 0))) + int(changes.get("resistance", 0))


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
	var effect := str(card.get("effect", ""))
	return str(card.get("kind", "")) == "strike" or effect in [
		"radiance", "sweep", "double_hit", "iron_rampage", "magic_strike", "shockwave", "meteor", "hydra",
	]


static func _resolve_card_play(state: Dictionary, card_id: int, play_view: Variant = null) -> Dictionary:
	var next: Dictionary = state
	_load_enemy_aliases(next)
	var card_index := _hand_card_index(next["hand"], card_id)
	if card_index < 0:
		return _with_message(next, "이 카드는 현재 손패에 없습니다.")
	var hand: Array = next["hand"]
	var hand_before_play: Array = hand.duplicate(true)
	var card: Dictionary = hand[card_index]
	var cost := effective_card_cost(next, card)
	var economics_research_count := 0
	for rule_card in next.get("active_rule_cards", []):
		if str(rule_card.get("effect", "")) == "economics_research":
			economics_research_count += 1
	if int(next["energy"]) - cost < -3 * economics_research_count:
		next["pending_play_card_id"] = -1
		return _with_message(next, "에너지가 부족합니다.")
	if str(card.get("effect", "")) == "supernova" and int(next.get("stars", 0)) < 3:
		next["pending_play_card_id"] = -1
		return _with_message(next, "초신성: ★★★가 필요합니다.")
	var manual_bonus := 0
	for held_card in hand:
		if str(held_card.get("effect", "")) in ["combat_manual", "strategy_book"]:
			manual_bonus += int(held_card.get("value", 0))
	var effect := str(card.get("effect", ""))
	var previous_amplification := int(next.get("player_amplification", 0))
	next["energy"] = int(next["energy"]) - cost
	var base_damage := int(card.get("value", 0))
	if effect == "radiance":
		base_damage = 4 + maxi(0, int(next.get("radiance_played_this_turn", 0))) * 4
	var hit_count := 1
	if effect == "photon_cannon" and int(next.get("player_amplification", 0)) >= 4:
		base_damage = 8
		hit_count = 3
	elif effect == "meteor":
		hit_count = int(next.get("stars", 0))
	elif effect == "hydra":
		hit_count = 9
	elif effect == "five_hit":
		hit_count = 5
	elif effect == "double_hit" and bool(card.get("forged", card.get("upgraded", false))):
		hit_count = 2
	if next.get("repeat_next_attack", false) and _is_attack_card(card):
		hit_count *= 2
	var total_damage := 0
	var thorn_damage_total := 0
	var enemy_hp_before_attack := int(next["enemy_hp"])
	if _is_attack_card(card):
		var selected_enemy_index := int(next.get("target_enemy_index", 0))
		var randomized_targeting := effect == "meteor" or effect == "hydra"
		var target_indexes: Array[int] = [selected_enemy_index]
		if randomized_targeting:
			target_indexes.clear()
		elif effect in ["sweep", "odin_spear", "iron_rampage"] or bool(card.get("all_targets", false)):
			target_indexes.clear()
			for target_index in range(next.get("enemies", []).size()):
				if int(next["enemies"][target_index].get("hp", 0)) > 0:
					target_indexes.append(target_index)
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
				var before_hp := int(next["enemies"][target_index].get("hp", 0))
				var random_hit_result := _resolve_attack_hit(next, target_index, base_damage, manual_bonus)
				var remaining_hp := int(next["enemies"][target_index].get("hp", 0))
				var dealt := maxi(0, before_hp - remaining_hp)
				if play_view is Dictionary and dealt > 0:
					play_view["hits"].append({"enemy_index": target_index,
						"enemy_id": str(next["enemies"][target_index].get("id", "")),
						"damage": dealt, "remaining_hp": remaining_hp})
				total_damage += int(random_hit_result.get("damage", 0))
				thorn_damage_total += int(random_hit_result.get("thorns", 0))
		else:
			for target_index in target_indexes:
				_load_enemy_aliases(next, target_index)
				var damage_to_target := 0
				for _hit_index in range(hit_count):
					if int(next.get("enemy_hp", 0)) <= 0:
						break
					var before_hp := int(next["enemies"][target_index].get("hp", 0))
					var fixed_hit_result := _resolve_attack_hit(next, target_index, base_damage, manual_bonus)
					var remaining_hp := int(next["enemies"][target_index].get("hp", 0))
					var dealt := maxi(0, before_hp - remaining_hp)
					if play_view is Dictionary and dealt > 0:
						play_view["hits"].append({"enemy_index": target_index,
							"enemy_id": str(next["enemies"][target_index].get("id", "")),
							"damage": dealt, "remaining_hp": remaining_hp})
					damage_to_target += int(fixed_hit_result.get("damage", 0))
					thorn_damage_total += int(fixed_hit_result.get("thorns", 0))
				total_damage += damage_to_target
		_load_enemy_aliases(next, selected_enemy_index)
		var hit_suffix := " (%d회 공격)" % hit_count if hit_count > 1 else ""
		var target_suffix := " · 모든 적" if target_indexes.size() > 1 else ""
		var random_suffix := " · 무작위 대상" if randomized_targeting else ""
		next["message"] = "%s: 피해 %d%s%s%s" % [card.get("name", "카드"), total_damage, hit_suffix, target_suffix, random_suffix]
	else:
		next["message"] = str(card.get("name", "카드")) + " 효과를 적용했습니다."
	var gains_block := str(card.get("kind", "")) == "skill" and not [
		"beastification", "metalization", "sand_toss", "light_cluster", "battle_cry", "combat_manual", "strategy_book", "overcharge", "sweep",
		"critical_reaction", "foresight", "transcend", "parallel_mirror", "diy", "adrenaline",
		"resistance_ward", "battle_preparation", "four_seasons", "unyielding", "star_ark", "pruning",
		"large_prism", "nebula", "starlight", "warm_up", "supernova", "super_strategist", "wish",
		"rapid_fire", "battle_plan", "draw_each_file", "quick_step",
		"light_travel_time", "plate_armor", "recycling", "osiris_sun", "librarians_privilege",
		"metallurgy_research", "evolution_theory", "mass_deal", "law_research", "economics_research", "optics_research",
		"dash", "wolf_talisman", "turtle_talisman", "aries", "cassiopeia", "horologium", "ophiuchus", "orion", "saeongjima",
		"fermented_slime", "relic",
	].has(effect)
	var defense := 0
	if gains_block:
		defense = int(card.get("value", 0)) + int(next.get("agility", 0)) + manual_bonus
		var block_key := "player_magic_block" if str(card.get("damage_type", "physical")) == "magic" else "player_block"
		next[block_key] = int(next.get(block_key, 0)) + defense
		var defense_name := "마법 방어" if block_key == "player_magic_block" else "방어"
		next["message"] += " · %s %d 획득" % [defense_name, defense]
	if effect == "star_ark":
		defense = int(card.get("value", 10)) + int(next.get("agility", 0)) + manual_bonus
		next["player_block"] = int(next.get("player_block", 0)) + defense
		next["player_magic_block"] = int(next.get("player_magic_block", 0)) + defense
		next["message"] += " · 방어·마법 방어 %d 획득" % defense
	elif effect == "silver_sword":
		defense = 5 + int(next.get("agility", 0)) + manual_bonus
		next["player_magic_block"] = int(next.get("player_magic_block", 0)) + defense
		next["message"] += " · 마법 방어 %d 획득" % defense
	elif effect == "suppression":
		defense = mini(total_damage, enemy_hp_before_attack) + int(next.get("agility", 0)) + manual_bonus
		next["player_block"] = int(next.get("player_block", 0)) + defense
		next["message"] += " · 방어 %d 획득" % defense
	elif effect == "odin_spear":
		defense = int(card.get("defense_value", 15)) + int(next.get("agility", 0)) + manual_bonus
		next["player_block"] = int(next.get("player_block", 0)) + defense
		next["message"] += " · 방어 %d 획득" % defense
	elif effect == "iron_rampage":
		# This retired debug card keeps fixed 8 defense even if its attack value changes.
		defense = (8 + int(next.get("agility", 0)) + manual_bonus) * hit_count
		next["player_block"] = int(next.get("player_block", 0)) + defense
		next["message"] += " · 방어 %d 획득" % defense
	match effect:
		"ruler_compass", "star_guard", "star_ark":
			next["stars"] = int(next["stars"]) + 1
			next["message"] += " · ★ 1 획득"
		"battle_plan":
			next["stars"] = int(next.get("stars", 0)) + int(card.get("value", 2))
			next["message"] += " · ★ %d 획득" % int(card.get("value", 2))
		"beastification":
			var strength_gain := int(card.get("upgraded_value", card.get("value", 0))) if bool(card.get("forged", card.get("upgraded", false))) else int(card.get("value", 0))
			next["strength"] = int(next.get("strength", 0)) + strength_gain
			next["message"] += " · 힘 %d 획득" % strength_gain
		"metalization":
			var toughness_gain := int(card.get("upgraded_value", card.get("value", 0))) if bool(card.get("forged", card.get("upgraded", false))) else int(card.get("value", 0))
			next["agility"] = int(next.get("agility", 0)) + toughness_gain
			next["message"] += " · 강인함 %d 획득" % toughness_gain
		"sand_toss":
			next["enemy_amplification"] = int(next.get("enemy_amplification", 0)) - int(card.get("value", 0))
			next["message"] += " · 약화 %d 부여" % int(card.get("value", 0))
		"shatter":
			next["enemy_resistance"] = int(next.get("enemy_resistance", 0)) - 2
			next["message"] += " · 취약 2 부여"
		"knee_strike":
			next["enemy_amplification"] = int(next.get("enemy_amplification", 0)) - 1
			next["message"] += " · 약화 1 부여"
		"resistance_ward":
			next["player_resistance"] = int(next.get("player_resistance", 0)) + int(card.get("value", 0))
			next["message"] += " · 저항 %d 획득" % int(card.get("value", 0))
		"unyielding":
			next["player_resistance"] = int(next.get("player_resistance", 0)) + int(card.get("value", 0))
			next["message"] += " · 저항 %d 획득" % int(card.get("value", 0))
		"scale_armor":
			next["enemy_amplification"] = int(next.get("enemy_amplification", 0)) - 2
			next["message"] += " · 약화 2 부여"
		"four_seasons":
			next["player_resistance"] = int(next.get("player_resistance", 0)) + 2
			next["player_amplification"] = int(next.get("player_amplification", 0)) + 2
			_adjust_all_enemy_status(next, -2, -2)
			next["message"] += " · 저항·증폭 2 획득 · 취약·약화 2 부여"
		"demolish":
			next["enemy_resistance"] = int(next.get("enemy_resistance", 0)) - 3
			next["enemy_amplification"] = int(next.get("enemy_amplification", 0)) - 3
			next["message"] += " · 취약·약화 3 부여"
		"battle_preparation":
			next["pending_battle_preparation"] = int(next.get("pending_battle_preparation", 0)) + int(card.get("value", 2))
			next["message"] += " · 다음 턴 에너지·증폭 예약"
		"adrenaline":
			next["player_hp"] = maxi(0, int(next.get("player_hp", 0)) - 3)
			next["energy"] = int(next.get("energy", 0)) + int(card.get("value", 2))
			next["message"] += " · 체력 -3 · 에너지 +%d" % int(card.get("value", 2))
		"iron_song":
			var pending_song: Array = next.get("pending_iron_song", [])
			pending_song.append({"turns": 2, "amount": int(card.get("value", 0))})
			next["pending_iron_song"] = pending_song
			next["message"] += " · 다음 2턴 시작 시 반복"
		"at_field":
			next["player_amplification"] = int(next.get("player_amplification", 0)) + int(card.get("amplification_gain", 2))
			next["message"] += " · 증폭 %d 획득" % int(card.get("amplification_gain", 2))
		"battle_cry":
			next["player_amplification"] = int(next.get("player_amplification", 0)) + int(card.get("value", 0))
			next["message"] += " · 증폭 %d 획득" % int(card.get("value", 0))
		"overcharge", "critical_reaction", "steel_storm", "sturdy_stance", "recycling", "osiris_sun", "librarians_privilege", "metallurgy_research", "mass_deal", "law_research", "economics_research", "optics_research":
			var active_rules: Array = next.get("active_rule_cards", [])
			active_rules.append(card.duplicate(true))
			next["active_rule_cards"] = active_rules
			next["message"] += " · 룰 활성화"
			if effect == "sturdy_stance":
				next["preserve_block_on_turn_end"] = true
			if effect == "mass_deal":
				var files: Array = next.get("piles", [])
				files.append([])
				next["piles"] = files
				next["message"] += " · 빈 파일 1개 추가"
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
		"plate_armor_defense":
			var resistance_gain := int(card.get("upgraded_resistance_gain", 2)) if bool(card.get("forged", card.get("upgraded", false))) else int(card.get("resistance_gain", 1))
			next["player_resistance"] = int(next.get("player_resistance", 0)) + resistance_gain
			next["message"] += " · 저항 %d 획득" % resistance_gain
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
			var radiance := CardCatalog.create_radiance_card(int(next["next_generated_card_id"]))
			next["next_generated_card_id"] = int(next["next_generated_card_id"]) - 1
			next["hand"].append(radiance)
			next["message"] += " · 광채 1장 생성"
		"large_prism", "nebula":
			var radiance_count := 3 if effect == "large_prism" else 1
			for _radiance_index in range(radiance_count):
				var generated := CardCatalog.create_radiance_card(int(next["next_generated_card_id"]))
				next["next_generated_card_id"] = int(next["next_generated_card_id"]) - 1
				next["hand"].append(generated)
			next["message"] += " · 광채 %d장 생성" % radiance_count
			if effect == "nebula":
				next["stars"] = int(next.get("stars", 0)) + 2
				next["message"] += " · ★ 2 획득"
		"starlight":
			next["stars"] = int(next.get("stars", 0)) + int(card.get("value", 2))
			next["message"] += " · ★ %d 획득" % int(card.get("value", 2))
		"warm_up":
			next["strength"] = int(next.get("strength", 0)) + 1
			next["temporary_strength"] = int(next.get("temporary_strength", 0)) + int(card.get("value", 4))
			next["message"] += " · 이번 턴 힘 %d 획득" % int(card.get("value", 4))
		"supernova":
			next["stars"] = int(next.get("stars", 0)) - 3
			next["energy"] = int(next.get("energy", 0)) + 3
			next["message"] += " · ★ 3 소모 · 에너지 3 획득"
		"super_strategist":
			next["stars"] = int(next.get("stars", 0)) + int(card.get("value", 3))
			next["message"] += " · ★ %d 획득" % int(card.get("value", 3))
		"wish":
			var wish_random := RandomNumberGenerator.new()
			wish_random.seed = int(next.get("battle_seed", 0)) + int(next.get("turn", 1)) * 65537 + int(next.get("random_draw_sequence", 0))
			for _wish_index in range(int(card.get("value", 3))):
				var wish_card := CardCatalog.create_random_rare_token(int(next["next_generated_card_id"]), wish_random)
				next["next_generated_card_id"] = int(next["next_generated_card_id"]) - 1
				next["hand"].append(wish_card)
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
					copied_count += 1
			next["message"] += " · 광채 %d장 복사" % copied_count
		"diy":
			next["message"] += " · 효과 없음"
	hand.remove_at(card_index)
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
	_resolve_amplification_rules(next, previous_amplification, effect if bool(card.get("rule", false)) else "")
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
		next["message"] = "아드레날린의 체력 손실로 쓰러졌습니다."
	elif _all_enemies_defeated(next):
		next["status"] = "won"
		next["message"] = "승리! 모든 적을 쓰러뜨렸습니다."
	else:
		_refresh_enemy_intent(next)
	next = _auto_resolve_forced_pile_discard(next)
	if play_view is Dictionary:
		play_view["resolved_message"] = str(next.get("message", ""))
	return next


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
	return next


static func _resolve_attack_hit(state: Dictionary, target_index: int, base_damage: int, manual_bonus: int) -> Dictionary:
	_load_enemy_aliases(state, target_index)
	if int(state.get("enemy_hp", 0)) <= 0:
		return {"damage": 0, "thorns": 0}
	var solitaire_bonus := int(state.get("enemy_solitaire_hit_bonus", 0)) if bool(state.get("enemy_solitaire_hit_bonus_ready", false)) else 0
	var raw_attack_damage := base_damage + int(state.get("strength", 0)) + int(state.get("temporary_strength", 0)) + manual_bonus + solitaire_bonus
	if solitaire_bonus > 0:
		state["enemy_solitaire_hit_bonus_ready"] = false
	var hit_damage := _calculate_attack_damage(
		raw_attack_damage,
		int(state.get("player_amplification", 0)),
		int(state.get("enemy_resistance", 0)),
		30,
		int(state.get("enemy_status_effectiveness", 30))
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


static func _resolve_amplification_rules(state: Dictionary, previous_amplification: int, newly_activated_effect: String = "") -> void:
	var active_rules: Array = state.get("active_rule_cards", [])
	var has_overcharge := false
	var has_critical_reaction := false
	for rule_card in active_rules:
		var effect := str(rule_card.get("effect", ""))
		has_overcharge = has_overcharge or effect == "overcharge"
		has_critical_reaction = has_critical_reaction or effect == "critical_reaction"
	var current_amplification := int(state.get("player_amplification", 0))
	var trigger_overcharge := has_overcharge and not bool(state.get("overcharge_triggered_this_turn", false)) \
		and current_amplification >= 4 and (previous_amplification < 4 or newly_activated_effect == "overcharge")
	var trigger_critical := has_critical_reaction and not bool(state.get("critical_reaction_triggered_this_turn", false)) \
		and current_amplification >= 8 and (previous_amplification < 8 or newly_activated_effect == "critical_reaction")
	if trigger_overcharge:
		state["overcharge_triggered_this_turn"] = true
		_draw_random_cards(state, 2)
		state["message"] += " · 과충전: 무작위 드로우 2장"
	if trigger_critical:
		state["critical_reaction_triggered_this_turn"] = true
		state["energy"] = int(state.get("energy", 0)) + 2
		state["message"] += " · 임계 반응: 에너지 +2"


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
		var random := RandomNumberGenerator.new()
		random.randomize()
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
	if state["hand"].is_empty():
		state["message"] = "드로우할 카드가 없습니다."


static func _refresh_enemy_intent(state: Dictionary) -> void:
	var enemy := {
		"name": state.get("enemy_name", ""),
		"actions": state["enemy_actions"],
		"action_index": state["enemy_action_index"],
		"strength": state["enemy_strength"],
		"amplification": state.get("enemy_amplification", 0),
		"status_effectiveness": state.get("enemy_status_effectiveness", 30),
		"player_resistance": state.get("player_resistance", 0),
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
		var temporary_strength := _temporary_enemy_strength(state)
		var raw_per_hit := int(action.get("damage", 0)) + int(state["enemy_strength"]) + temporary_strength
		for _hit_index in range(maxi(1, int(action.get("hits", 1)))):
			state["enemy_attack"] += _calculate_attack_damage(
				raw_per_hit,
				int(state.get("enemy_amplification", 0)),
				int(state.get("player_resistance", 0)),
				int(state.get("enemy_status_effectiveness", 30)),
				30
			)


static func _discard_card(state: Dictionary, card: Dictionary, is_discard_x: bool = false, counts_for_recycling: bool = false) -> int:
	if counts_for_recycling:
		for rule_card in state.get("active_rule_cards", []):
			if str(rule_card.get("effect", "")) == "recycling":
				state["stars"] = int(state.get("stars", 0)) + 1
				state["message"] += " · 재활용: ★ 1 획득"
	if bool(card.get("token", false)):
		return 0
	state["discard"].append(card)
	if is_discard_x and str(card.get("effect", "")) == "saeongjima":
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
		saeongjima_draw_count += _discard_card(state, card, false, true)
	var remaining_hand: Array = []
	for card in state["hand"]:
		if not discarded_ids.has(int(card.get("id", -1))):
			remaining_hand.append(card)
	state["hand"] = remaining_hand
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
	var even_deal := false
	for rule_card in state.get("active_rule_cards", []):
		if str(rule_card.get("effect", "")) == "mass_deal":
			even_deal = true
			break
	var cards_per_file := int(state.get("cards_per_file", CARDS_PER_FILE))
	var pile_count := maxi(1, state.get("piles", []).size())
	var new_files: Array = []
	for _pile_index in range(pile_count):
		new_files.append([])
	for card_index in range(eligible.size()):
		var pile_index := card_index % pile_count if even_deal else mini(int(card_index / cards_per_file), pile_count - 1)
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


static func _apply_scheduled_preparation(state: Dictionary) -> void:
	var preparation := int(state.get("pending_battle_preparation", 0))
	state["pending_battle_preparation"] = 0
	if preparation <= 0:
		return
	var previous_amplification := int(state.get("player_amplification", 0))
	state["energy"] = int(state.get("energy", 0)) + preparation
	state["player_amplification"] = previous_amplification + preparation
	state["message"] = "싸움 준비: 에너지·증폭 +%d" % preparation
	_resolve_amplification_rules(state, previous_amplification)


static func _apply_turn_start_effects(state: Dictionary) -> void:
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
		var optics_radiance := CardCatalog.create_radiance_card(int(state["next_generated_card_id"]))
		state["next_generated_card_id"] = int(state["next_generated_card_id"]) - 1
		state["hand"].append(optics_radiance)
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
			var radiance := CardCatalog.create_radiance_card(int(state["next_generated_card_id"]))
			state["next_generated_card_id"] = int(state["next_generated_card_id"]) - 1
			state["hand"].append(radiance)
			radiance_created += 1
	state["pending_radiance"] = next_radiance
	if radiance_created > 0:
		state["message"] = "광행시간: 광채 %d장 생성" % radiance_created
	var foresight_draws := int(state.get("pending_foresight_draws", 0))
	state["pending_foresight_draws"] = 0
	if state.get("deck_editions", []).has("persistentDraw"):
		var edition_drawn := _draw_random_cards(state, 1)
		state["message"] += " · 지속 드로우: %d장" % edition_drawn
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


static func _calculate_attack_damage(damage: int, amplification: int = 0, resistance: int = 0, amplification_effectiveness: int = 30, resistance_effectiveness: int = 30) -> int:
	var outgoing := 100 + (amplification_effectiveness if amplification > 0 else -amplification_effectiveness if amplification < 0 else 0)
	var incoming := 100 - (resistance_effectiveness if resistance > 0 else -resistance_effectiveness if resistance < 0 else 0)
	return maxi(0, int(floor(float(damage) * outgoing * incoming / 10000.0)))


static func _decay_status(value: int) -> int:
	return value - signi(value)


static func _decay_enemy_statuses(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		enemy["resistance"] = _decay_status(int(enemy.get("resistance", 0)))
		enemy["amplification"] = _decay_status(int(enemy.get("amplification", 0)))
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
			and not bool(enemy.get("solitaire_bonus_used_this_turn", false))
		):
			enemy["solitaire_hit_bonus_ready"] = true
			enemy["solitaire_bonus_used_this_turn"] = true
			enemies[enemy_index] = enemy
	state["enemies"] = enemies


static func _reset_solitaire_enemy_bonuses(state: Dictionary) -> void:
	var enemies: Array = state.get("enemies", [])
	for enemy_index in range(enemies.size()):
		var enemy: Dictionary = enemies[enemy_index]
		enemy["solitaire_hit_bonus_ready"] = false
		enemy["solitaire_bonus_used_this_turn"] = false
		enemies[enemy_index] = enemy
	state["enemies"] = enemies


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
		var living_children := 0
		for child in enemies:
			if child.get("summoner_id", null) == parent.get("id") and int(child.get("hp", 0)) > 0:
				living_children += 1
		if living_children >= 2:
			continue
		var summon_count := int(parent.get("summons_created", 0)) + 1
		parent["summons_created"] = summon_count
		enemies[parent_index] = parent
		var karma_stage := maxi(0, int(parent.get("karma_stage", 0)))
		var summon_hp := floori(18.0 * float(10 + karma_stage) / 10.0)
		summon_hp = floori(float(summon_hp) * float(parent.get("summon_hp_multiplier", 1.0)))
		enemies.append({
			"id": next_id,
			"name": "새끼 바퀴",
			"hp": summon_hp,
			"max_hp": summon_hp,
			"strength": karma_stage,
			"resistance": 0,
			"amplification": 0,
			"physical_block": 0,
			"actions": [{"name": "물기", "damage": 4, "cycle": true}],
			"action_index": 0,
			"first_action_completed": false,
			"death_resolved": false,
			"summoner_id": parent.get("id"),
			"trait": "",
		})
		next_id += 1
		state["message"] += " · 새끼 바퀴 소환"
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
			if int(action.get("discard_count", 0)) > 0 and not fallback_candidates.is_empty():
				var candidates: Array[int] = fallback_candidates.duplicate()
				if str(action.get("discard_priority", "")) == "rarity" and not non_empty_file_indexes.is_empty():
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
	var discard: Array = state.get("discard", [])
	var discarded_names: Array[String] = []
	var discarded_count := 0
	for _discard_index in range(maxi(0, discard_count)):
		if pile.is_empty():
			break
		var discarded: Dictionary = pile.pop_back()
		discard.append(discarded)
		discarded_names.append(str(discarded.get("name", "카드")))
		discarded_count += 1
	_reveal_file_top(pile)
	files[file_index] = pile
	state["piles"] = files
	state["discard"] = discard
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
	next["message"] = message
	return next


static func effective_card_cost(state: Dictionary, card: Dictionary) -> int:
	var cost := CardStickers.card_energy_cost(card)
	if str(card.get("effect", "")) == "odin_spear":
		cost -= int(state.get("forge_count", 0))
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
