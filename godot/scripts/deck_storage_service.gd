class_name PortDeckStorageService
extends RefCounted

const CardStickers = preload("res://scripts/stickers.gd")
const DeckEditions = preload("res://scripts/deck_editions.gd")
const DeckEditorRules = preload("res://scripts/deck_editor_rules.gd")
const DeckVaultCardView = preload("res://scripts/deck_vault_card_view.gd")
const MapRules = preload("res://scripts/map_rules.gd")


static func _floor_drop_count_at(drops: Array, position: Vector2i) -> int:
	var count := 0
	for drop in drops:
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y:
			count += 1
	return count


static func floor_card_count_at(run_state: Dictionary, position: Vector2i) -> int:
	return _floor_drop_count_at(run_state.get("floor_cards", []), position)


static func floor_deck_drop_count_at(run_state: Dictionary, position: Vector2i) -> int:
	return _floor_drop_count_at(run_state.get("floor_deck_drops", []), position)


static func floor_consumable_drop_count_at(run_state: Dictionary, position: Vector2i) -> int:
	return _floor_drop_count_at(run_state.get("floor_consumable_drops", []), position)


static func inventory_item_count(run_state: Dictionary) -> int:
	return run_state.get("inventory_cards", []).size() + run_state.get("inventory_consumables", []).size()


static func inventory_space_available(host: Node) -> int:
	return maxi(0, int(host.INVENTORY_CAPACITY) - inventory_item_count(host.run_state))


static func owned_deck_limit(host: Node) -> int:
	return int(host.DEBUG_MAX_OWNED_DECKS) if host.map_debug_controller.session.active else int(host.MAX_OWNED_DECKS)


static func is_rare_slot_card(card: Dictionary) -> bool:
	return DeckEditorRules.is_high_rarity(card)


static func _find_owned_deck(run_state: Dictionary, deck_id: String) -> Dictionary:
	for deck in run_state.get("owned_decks", []):
		if str(deck.get("id", "")) == deck_id:
			return deck
	return {}


static func _deck_cards(run_state: Dictionary, deck: Dictionary, deck_id: String) -> Array:
	if deck_id == str(run_state.get("active_deck_id", "starter")):
		return run_state.get("deck", [])
	return deck.get("cards", [])


static func _is_safe_area_for_deck(run_state: Dictionary, deck_id: String) -> bool:
	return MapRules.is_safe_area_tile(run_state["map"], run_state["position"]) \
		or run_state.get("blessings", []).has("forbiddenKnowledge") \
		or deck_allows_free_edit(run_state, deck_id)


static func quick_pick_up_floor_items(host: Node) -> void:
	var run_state: Dictionary = host.run_state
	var position: Vector2i = run_state["position"]
	var free_item_slots := inventory_space_available(host)
	var inventory_cards: Array = run_state.get("inventory_cards", []).duplicate(true)
	var inventory_consumables: Array = run_state.get("inventory_consumables", []).duplicate(true)
	var remaining_cards: Array = []
	var remaining_consumables: Array = []
	var remaining_deck_drops: Array = []
	var picked_card_count := 0
	var picked_consumable_count := 0
	var picked_deck_count := 0
	for drop in run_state.get("floor_cards", []):
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y and free_item_slots > 0:
			inventory_cards.append(drop.get("card", {}).duplicate(true))
			picked_card_count += 1
			free_item_slots -= 1
		else:
			remaining_cards.append(drop)
	for drop in run_state.get("floor_consumable_drops", []):
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y and free_item_slots > 0:
			var consumable: Dictionary = drop.get("consumable", {})
			if not consumable.is_empty():
				inventory_consumables.append(consumable.duplicate(true))
				picked_consumable_count += 1
				free_item_slots -= 1
			else:
				remaining_consumables.append(drop)
		else:
			remaining_consumables.append(drop)
	var owned_decks: Array = run_state.get("owned_decks", []).duplicate(true)
	var free_deck_slots := maxi(0, owned_deck_limit(host) - owned_decks.size())
	for drop in run_state.get("floor_deck_drops", []):
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y and free_deck_slots > 0:
			var deck: Dictionary = drop.get("deck", {})
			if not deck.is_empty():
				owned_decks.append(deck.duplicate(true))
				register_acquired_deck_origins(host, deck)
				picked_deck_count += 1
				free_deck_slots -= 1
			else:
				remaining_deck_drops.append(drop)
		else:
			remaining_deck_drops.append(drop)
	var total_picked := picked_card_count + picked_consumable_count + picked_deck_count
	if picked_card_count > 0:
		run_state["inventory_cards"] = inventory_cards
	if picked_consumable_count > 0:
		run_state["inventory_consumables"] = inventory_consumables
	if picked_deck_count > 0:
		run_state["owned_decks"] = owned_decks
	run_state["floor_cards"] = remaining_cards
	run_state["floor_consumable_drops"] = remaining_consumables
	run_state["floor_deck_drops"] = remaining_deck_drops
	var pickup_messages: Array[String] = []
	if picked_card_count > 0:
		pickup_messages.append("카드 %d장 획득" % picked_card_count)
	if picked_consumable_count > 0:
		pickup_messages.append("소모품 %d개 획득" % picked_consumable_count)
	if picked_deck_count > 0:
		pickup_messages.append("금고 덱 %d개 획득" % picked_deck_count)
	if floor_card_count_at(run_state, position) + floor_consumable_drop_count_at(run_state, position) > 0:
		pickup_messages.append("인벤토리가 가득 찼습니다!")
	if floor_deck_drop_count_at(run_state, position) > 0:
		pickup_messages.append("보유 덱 슬롯이 가득찼습니다!")
	host.notice = " · ".join(pickup_messages)
	if total_picked > 0:
		host._save_run()
	host._show_map()


static func collect_floor_cards(host: Node) -> void:
	var run_state: Dictionary = host.run_state
	var position: Vector2i = run_state["position"]
	var inventory: Array = run_state.get("inventory_cards", [])
	var remaining: Array = []
	var collected := 0
	var left_behind := 0
	var space := inventory_space_available(host)
	for drop in run_state.get("floor_cards", []):
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y:
			if space > 0:
				inventory.append(drop.get("card", {}).duplicate(true))
				collected += 1
				space -= 1
			else:
				remaining.append(drop)
				left_behind += 1
		else:
			remaining.append(drop)
	if collected == 0:
		if left_behind > 0:
			host.notice = "인벤토리가 가득 찼습니다."
			host._show_map()
		return
	run_state["inventory_cards"] = inventory
	run_state["floor_cards"] = remaining
	host.notice = "카드 %d장을 인벤토리에 넣었습니다." % collected
	if left_behind > 0:
		host.notice += " 인벤토리가 가득 차 %d장은 바닥에 남았습니다." % left_behind
	host._save_run()
	host._show_map()


static func collect_floor_deck_drops(host: Node) -> void:
	var run_state: Dictionary = host.run_state
	var position: Vector2i = run_state["position"]
	var remaining: Array = []
	var decks: Array = run_state.get("owned_decks", [])
	var collected := 0
	var deck_limit := owned_deck_limit(host)
	for drop in run_state.get("floor_deck_drops", []):
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y and decks.size() < deck_limit:
			var deck: Dictionary = drop.get("deck", {})
			if not deck.is_empty():
				decks.append(deck.duplicate(true))
				register_acquired_deck_origins(host, deck)
				collected += 1
		else:
			remaining.append(drop)
	if collected == 0:
		return
	run_state["owned_decks"] = decks
	run_state["floor_deck_drops"] = remaining
	host.notice = "금고 덱 %d개를 획득했습니다. 덱 보기에서 장착할 수 있습니다." % collected
	host._save_run()
	host._show_map()


static func collect_floor_consumable_drops(host: Node) -> void:
	var run_state: Dictionary = host.run_state
	var position: Vector2i = run_state["position"]
	var remaining: Array = []
	var inventory: Array = run_state.get("inventory_consumables", [])
	var collected := 0
	var left_behind := 0
	var space := inventory_space_available(host)
	for drop in run_state.get("floor_consumable_drops", []):
		if int(drop.get("x", -1)) == position.x and int(drop.get("y", -1)) == position.y:
			var consumable: Dictionary = drop.get("consumable", {})
			if not consumable.is_empty() and space > 0:
				inventory.append(consumable.duplicate(true))
				collected += 1
				space -= 1
			else:
				remaining.append(drop)
				left_behind += 1
		else:
			remaining.append(drop)
	if collected == 0:
		if left_behind > 0:
			host.notice = "인벤토리가 가득 찼습니다."
			host._show_map()
		return
	run_state["inventory_consumables"] = inventory
	run_state["floor_consumable_drops"] = remaining
	host.notice = "소모품 %d개를 획득했습니다." % collected
	if left_behind > 0:
		host.notice += " 인벤토리가 가득 차 %d개는 바닥에 남았습니다." % left_behind
	host._save_run()
	host._show_map()


static func register_acquired_deck_origins(host: Node, deck: Dictionary) -> void:
	if not host.deck_editor_session_active:
		return
	var deck_id := str(deck.get("id", ""))
	for card in deck.get("cards", []):
		var card_id := int(card.get("id", -1))
		# Preserve recorded temporary additions when dropping and picking up a deck.
		if card_id >= 0 and not host.deck_editor_origins_by_card_id.has(card_id):
			host.deck_editor_origins_by_card_id[card_id] = deck_id


static func begin_session(host: Node) -> void:
	if host.deck_editor_session_active or host.run_state.is_empty():
		return
	host.deck_editor_session_active = true
	host.deck_editor_selected_deck_id = str(host.run_state.get("active_deck_id", "starter"))
	host.deck_editor_origins_by_card_id.clear()
	host.deck_editor_pending_removals.clear()
	for deck in host.run_state.get("owned_decks", []):
		var deck_id := str(deck.get("id", ""))
		for card in deck.get("cards", []):
			host.deck_editor_origins_by_card_id[int(card.get("id", -1))] = deck_id
	for card in host.run_state.get("inventory_cards", []):
		host.deck_editor_origins_by_card_id[int(card.get("id", -1))] = null
	for drop in host.run_state.get("floor_cards", []):
		var card: Dictionary = drop.get("card", {})
		host.deck_editor_origins_by_card_id[int(card.get("id", -1))] = null


static func finish_session(host: Node) -> void:
	if not host.deck_editor_session_active:
		return
	if not host.deck_editor_pending_removals.is_empty():
		for pending in host.deck_editor_pending_removals:
			var card: Dictionary = pending.get("card", {})
			host.deck_editor_high_rarity_return_area_by_card_id.erase(int(card.get("id", -1)))
		# Web confirms removal by clearing the pending collection, not creating drops.
		host.notice = ""
	host.deck_editor_pending_removals.clear()
	host.deck_editor_session_active = false
	host.deck_editor_selected_deck_id = ""
	host.deck_editor_origins_by_card_id.clear()
	host._sync_active_deck()
	host._save_run()


static func origin_deck_id_for_card(host: Node, card_id: int) -> String:
	var original = host.deck_editor_origins_by_card_id.get(card_id, null)
	return "" if original == null else str(original)


static func deck_add_error(run_state: Dictionary, card: Dictionary, deck_id: String) -> String:
	var deck := _find_owned_deck(run_state, deck_id)
	if deck.is_empty():
		return "deck-full"
	var cards := _deck_cards(run_state, deck, deck_id)
	return DeckEditorRules.add_card_error(cards, card,
		int(deck.get("capacity", 25)), DeckEditions.rare_slot_capacity(deck))


static func deck_allows_free_edit(run_state: Dictionary, deck_id: String) -> bool:
	var deck := _find_owned_deck(run_state, deck_id)
	return not deck.is_empty() and deck.get("editions", []).has("freeEdit")


static func can_remove_deck_card(host: Node, card: Dictionary, safe_area: bool, deck_id: String = "") -> bool:
	if DeckEditorRules.is_bound(card):
		return false
	var card_id := int(card.get("id", -1))
	var source_deck_id := deck_id if deck_id != "" else str(host.run_state.get("active_deck_id", "starter"))
	if host.extraction_ticket_mode:
		return host.deck_editor_origins_by_card_id.has(card_id) and origin_deck_id_for_card(host, card_id) == source_deck_id
	if safe_area or deck_allows_free_edit(host.run_state, source_deck_id):
		return true
	if str(host.deck_editor_high_rarity_return_area_by_card_id.get(card_id, "")) != "":
		return true
	var original_deck_id := origin_deck_id_for_card(host, card_id)
	return original_deck_id == "" or original_deck_id == source_deck_id


static func can_transfer_deck_card(host: Node, card: Dictionary, safe_area: bool, deck_id: String = "") -> bool:
	if DeckEditorRules.is_bound(card):
		return false
	if safe_area or deck_allows_free_edit(host.run_state, deck_id):
		return true
	return not is_rare_slot_card(card) and origin_deck_id_for_card(host, int(card.get("id", -1))) == ""


static func deck_card_remove_label(host: Node, card: Dictionary, safe_area: bool, deck_id: String = "") -> String:
	var source_deck_id := deck_id if deck_id != "" else str(host.run_state.get("active_deck_id", "starter"))
	safe_area = safe_area or deck_allows_free_edit(host.run_state, source_deck_id)
	if host.extraction_ticket_mode:
		return "추출 티켓 사용"
	if not safe_area and host.deck_editor_high_rarity_return_area_by_card_id.has(int(card.get("id", -1))):
		return "원래 위치로"
	if not safe_area and origin_deck_id_for_card(host, int(card.get("id", -1))) == source_deck_id:
		return "제거 예약"
	return "인벤토리로" if inventory_space_available(host) > 0 else "바닥으로"


static func set_owned_deck_cards(host: Node, deck_id: String, cards: Array) -> void:
	var run_state: Dictionary = host.run_state
	var decks: Array = run_state.get("owned_decks", []).duplicate(true)
	for index in range(decks.size()):
		if str(decks[index].get("id", "")) != deck_id:
			continue
		var updated: Dictionary = decks[index].duplicate(true)
		updated["cards"] = cards.duplicate(true)
		decks[index] = updated
		run_state["owned_decks"] = decks
		if deck_id == str(run_state.get("active_deck_id", "starter")):
			run_state["deck"] = cards.duplicate(true)
		host._sync_active_deck()
		return


static func put_card_on_current_tile(run_state: Dictionary, card: Dictionary) -> void:
	var floor_cards: Array = run_state.get("floor_cards", [])
	var position: Vector2i = run_state["position"]
	floor_cards.append({"x": position.x, "y": position.y, "card": card.duplicate(true)})
	run_state["floor_cards"] = floor_cards


static func move_external_card_to_deck(host: Node, card_id: int, source_area: String, requested_deck_id: String) -> void:
	begin_session(host)
	var run_state: Dictionary = host.run_state
	var target_deck_id := requested_deck_id if requested_deck_id != "" else str(run_state.get("active_deck_id", "starter"))
	var target_deck := _find_owned_deck(run_state, target_deck_id)
	if target_deck.is_empty():
		return
	var deck_cards := _deck_cards(run_state, target_deck, target_deck_id)
	var card: Dictionary = {}
	var source_index := -1
	var inventory: Array = run_state.get("inventory_cards", [])
	var floor_cards: Array = run_state.get("floor_cards", [])
	if source_area == "inventory":
		for index in range(inventory.size()):
			if int(inventory[index].get("id", -1)) == card_id:
				card = inventory[index]
				source_index = index
				break
	else:
		var position: Vector2i = run_state["position"]
		for index in range(floor_cards.size()):
			var drop: Dictionary = floor_cards[index]
			if int(drop.get("x", -1)) != position.x or int(drop.get("y", -1)) != position.y:
				continue
			var dropped_card: Dictionary = drop.get("card", {})
			if int(dropped_card.get("id", -1)) == card_id:
				card = dropped_card
				source_index = index
				break
	if source_index < 0 or card.is_empty():
		return
	var error := deck_add_error(run_state, card, target_deck_id)
	if error != "":
		host.notice = "덱 용량이 가득 찼습니다." if error == "deck-full" else "희귀 슬롯이 가득 찼습니다."
		host._show_deck()
		return
	deck_cards = deck_cards.duplicate(true)
	deck_cards.append(card.duplicate(true))
	if source_area == "inventory":
		inventory.remove_at(source_index)
		run_state["inventory_cards"] = inventory
	else:
		floor_cards.remove_at(source_index)
		run_state["floor_cards"] = floor_cards
	set_owned_deck_cards(host, target_deck_id, deck_cards)
	host.deck_editor_selected_deck_id = target_deck_id
	if is_rare_slot_card(card):
		host.deck_editor_high_rarity_return_area_by_card_id[card_id] = source_area
	host.notice = "%s을(를) %s으로 옮겼습니다." % [str(card.get("name", "카드")), str(target_deck.get("name", "덱"))]
	host._show_deck()


static func move_inventory_card_to_floor(host: Node, card_id: int) -> void:
	begin_session(host)
	var run_state: Dictionary = host.run_state
	var inventory: Array = run_state.get("inventory_cards", [])
	for index in range(inventory.size()):
		var card: Dictionary = inventory[index]
		if int(card.get("id", -1)) != card_id:
			continue
		inventory.remove_at(index)
		run_state["inventory_cards"] = inventory
		put_card_on_current_tile(run_state, card)
		host.deck_editor_high_rarity_return_area_by_card_id.erase(card_id)
		host._sync_active_deck()
		host.notice = "%s을(를) 현재 타일에 놓았습니다." % str(card.get("name", "카드"))
		host._show_deck()
		return


static func move_floor_card_to_inventory(host: Node, card_id: int) -> void:
	begin_session(host)
	if inventory_space_available(host) <= 0:
		host.notice = "인벤토리가 가득 찼습니다."
		host._show_deck()
		return
	var run_state: Dictionary = host.run_state
	var position: Vector2i = run_state["position"]
	var floor_cards: Array = run_state.get("floor_cards", [])
	for index in range(floor_cards.size()):
		var drop: Dictionary = floor_cards[index]
		if int(drop.get("x", -1)) != position.x or int(drop.get("y", -1)) != position.y:
			continue
		var card: Dictionary = drop.get("card", {})
		if int(card.get("id", -1)) != card_id:
			continue
		floor_cards.remove_at(index)
		var inventory: Array = run_state.get("inventory_cards", [])
		inventory.append(card.duplicate(true))
		run_state["floor_cards"] = floor_cards
		run_state["inventory_cards"] = inventory
		if is_rare_slot_card(card):
			host.deck_editor_high_rarity_return_area_by_card_id[card_id] = "inventory"
		host._sync_active_deck()
		host.notice = "%s을(를) 인벤토리로 옮겼습니다." % str(card.get("name", "카드"))
		host._show_deck()
		return


static func move_deck_card_to_floor(host: Node, card_id: int, source_deck_id: String) -> void:
	begin_session(host)
	var run_state: Dictionary = host.run_state
	var source_deck := _find_owned_deck(run_state, source_deck_id)
	if source_deck.is_empty():
		return
	var cards := _deck_cards(run_state, source_deck, source_deck_id)
	for index in range(cards.size()):
		var card: Dictionary = cards[index]
		if int(card.get("id", -1)) != card_id:
			continue
		if DeckEditorRules.is_bound(card):
			return
		var safe_area := _is_safe_area_for_deck(run_state, source_deck_id)
		var original_deck_id := origin_deck_id_for_card(host, card_id)
		var rare_card := is_rare_slot_card(card)
		var return_area := str(host.deck_editor_high_rarity_return_area_by_card_id.get(card_id, "")) if rare_card else ""
		var schedule_removal := false
		if not safe_area and return_area == "":
			if rare_card:
				if original_deck_id != source_deck_id:
					host.notice = "희귀·전설 카드는 일반 이동으로 꺼낼 수 없습니다."
					host._show_deck()
					return
			else:
				if original_deck_id != "" and original_deck_id != source_deck_id:
					host.notice = "현재 위치에서는 편집 시작 당시의 원래 덱으로만 되돌릴 수 있습니다."
					host._show_deck()
					return
			schedule_removal = original_deck_id == source_deck_id
		cards.remove_at(index)
		set_owned_deck_cards(host, source_deck_id, cards)
		if schedule_removal:
			host.deck_editor_pending_removals.append({"deck_id": source_deck_id, "card": card.duplicate(true)})
			host.notice = "%s을(를) 제거 예정 상태로 만들었습니다." % str(card.get("name", "카드"))
		elif return_area == "inventory" and inventory_space_available(host) > 0 and not safe_area:
			var inventory: Array = run_state.get("inventory_cards", [])
			inventory.append(card.duplicate(true))
			run_state["inventory_cards"] = inventory
			host.notice = "%s을(를) 인벤토리로 옮겼습니다." % str(card.get("name", "카드"))
		else:
			put_card_on_current_tile(run_state, card)
			host.notice = "%s을(를) 현재 타일에 놓았습니다." % str(card.get("name", "카드"))
		host.deck_editor_high_rarity_return_area_by_card_id.erase(card_id)
		host._show_deck()
		return


static func move_inventory_consumable_to_floor(host: Node, consumable_id: String) -> void:
	var run_state: Dictionary = host.run_state
	var inventory: Array = run_state.get("inventory_consumables", [])
	for index in range(inventory.size()):
		var consumable: Dictionary = inventory[index]
		if str(consumable.get("id", "")) != consumable_id:
			continue
		inventory.remove_at(index)
		var position: Vector2i = run_state["position"]
		var drops: Array = run_state.get("floor_consumable_drops", [])
		drops.append({"x": position.x, "y": position.y, "consumable": consumable.duplicate(true)})
		run_state["inventory_consumables"] = inventory
		run_state["floor_consumable_drops"] = drops
		if host.extraction_ticket_mode and host.extraction_ticket_source == "inventory" and host.extraction_ticket_id == consumable_id:
			host.extraction_ticket_mode = false
			host.extraction_ticket_id = ""
		host._show_deck()
		return


static func move_floor_consumable_to_inventory(host: Node, consumable_id: String) -> void:
	if inventory_space_available(host) <= 0:
		host.notice = "인벤토리가 가득 찼습니다."
		host._show_deck()
		return
	var run_state: Dictionary = host.run_state
	var position: Vector2i = run_state["position"]
	var drops: Array = run_state.get("floor_consumable_drops", [])
	for index in range(drops.size()):
		var drop: Dictionary = drops[index]
		if int(drop.get("x", -1)) != position.x or int(drop.get("y", -1)) != position.y:
			continue
		var consumable: Dictionary = drop.get("consumable", {})
		if str(consumable.get("id", "")) != consumable_id:
			continue
		drops.remove_at(index)
		var inventory: Array = run_state.get("inventory_consumables", [])
		inventory.append(consumable.duplicate(true))
		run_state["floor_consumable_drops"] = drops
		run_state["inventory_consumables"] = inventory
		if host.extraction_ticket_mode and host.extraction_ticket_source == "floor" and host.extraction_ticket_id == consumable_id:
			host.extraction_ticket_mode = false
			host.extraction_ticket_id = ""
		host._show_deck()
		return


static func restore_pending_deck_card(host: Node, card_id: int) -> void:
	var run_state: Dictionary = host.run_state
	for index in range(host.deck_editor_pending_removals.size()):
		var pending: Dictionary = host.deck_editor_pending_removals[index]
		var card: Dictionary = pending.get("card", {})
		if int(card.get("id", -1)) != card_id:
			continue
		var deck_id := str(pending.get("deck_id", ""))
		var target_deck := _find_owned_deck(run_state, deck_id)
		var deck_cards: Array = target_deck.get("cards", [])
		var capacity := int(target_deck.get("capacity", 0))
		var rare_capacity := DeckEditions.rare_slot_capacity(target_deck)
		if deck_cards.size() >= capacity:
			host.notice = "덱 용량이 가득 차 제거 예약을 취소할 수 없습니다."
			host._show_deck()
			return
		if is_rare_slot_card(card):
			var rare_count := 0
			for existing in deck_cards:
				if is_rare_slot_card(existing):
					rare_count += 1
			if rare_count >= rare_capacity:
				host.notice = "희귀 슬롯이 가득 차 제거 예약을 취소할 수 없습니다."
				host._show_deck()
				return
		host.deck_editor_pending_removals.remove_at(index)
		if deck_id == str(run_state.get("active_deck_id", "starter")):
			run_state["deck"].append(card.duplicate(true))
			host._sync_active_deck()
		else:
			var decks: Array = run_state.get("owned_decks", [])
			for deck_index in range(decks.size()):
				if str(decks[deck_index].get("id", "")) != deck_id:
					continue
				var updated: Dictionary = decks[deck_index].duplicate(true)
				var cards: Array = updated.get("cards", [])
				cards.append(card.duplicate(true))
				updated["cards"] = cards
				decks[deck_index] = updated
				run_state["owned_decks"] = decks
				break
		host.notice = "%s 제거 예약을 취소했습니다." % str(card.get("name", "카드"))
		host._show_deck()
		return


static func move_deck_card_to_inventory(host: Node, card_id: int, requested_deck_id: String = "") -> void:
	begin_session(host)
	var run_state: Dictionary = host.run_state
	var source_deck_id := requested_deck_id if requested_deck_id != "" else str(run_state.get("active_deck_id", "starter"))
	var safe_area := _is_safe_area_for_deck(run_state, source_deck_id)
	var source_deck := _find_owned_deck(run_state, source_deck_id)
	if source_deck.is_empty():
		return
	var cards := _deck_cards(run_state, source_deck, source_deck_id)
	for index in range(cards.size()):
		var card: Dictionary = cards[index]
		if int(card.get("id", -1)) != card_id:
			continue
		if not can_remove_deck_card(host, card, safe_area, source_deck_id):
			host.notice = "현재 위치에서는 편집 시작 당시의 원래 덱으로만 되돌릴 수 있습니다."
			host._show_deck()
			return
		var return_area := str(host.deck_editor_high_rarity_return_area_by_card_id.get(card_id, ""))
		var original_deck_id := origin_deck_id_for_card(host, card_id)
		if not safe_area and ((is_rare_slot_card(card) and return_area != "inventory") \
				or (not is_rare_slot_card(card) and original_deck_id != "")):
			host.notice = "현재 위치에서는 이 카드를 인벤토리로 옮길 수 없습니다."
			host._show_deck()
			return
		if inventory_space_available(host) <= 0:
			host.notice = "인벤토리가 가득 찼습니다."
			host._show_deck()
			return
		cards.remove_at(index)
		set_owned_deck_cards(host, source_deck_id, cards)
		var inventory: Array = run_state.get("inventory_cards", [])
		inventory.append(card.duplicate(true))
		run_state["inventory_cards"] = inventory
		host.notice = "%s을(를) 인벤토리로 옮겼습니다." % str(card.get("name", "카드"))
		host.deck_editor_high_rarity_return_area_by_card_id.erase(card_id)
		host._show_deck()
		return


static func move_card_between_decks(host: Node, card_id: int, source_deck_id: String, target_selector: OptionButton) -> void:
	var target_index := target_selector.selected
	if target_index < 0:
		return
	move_card_between_decks_by_id(host, card_id, source_deck_id, str(target_selector.get_item_metadata(target_index)))


static func move_card_between_decks_by_id(host: Node, card_id: int, source_deck_id: String, target_deck_id: String) -> void:
	if target_deck_id == source_deck_id:
		return
	var run_state: Dictionary = host.run_state
	var safe_area := MapRules.is_safe_area_tile(run_state["map"], run_state["position"])
	var source_deck := _find_owned_deck(run_state, source_deck_id)
	var source_cards := _deck_cards(run_state, source_deck, source_deck_id) if not source_deck.is_empty() else []
	var card: Dictionary = {}
	for source_card in source_cards:
		if int(source_card.get("id", -1)) == card_id:
			card = source_card
			break
	if card.is_empty():
		return
	if not can_transfer_deck_card(host, card, safe_area, source_deck_id):
		host.notice = "안전 구역에서는 자유롭게 옮길 수 있고, 그 외 지역에서는 덱 밖에서 들어온 일반 카드만 옮길 수 있습니다."
		host._show_deck()
		return
	var error := deck_add_error(run_state, card, target_deck_id)
	if error != "":
		host.notice = "대상 덱 용량이 가득 찼습니다." if error == "deck-full" else "대상 덱의 희귀 슬롯이 가득 찼습니다."
		host._show_deck()
		return
	source_cards = source_cards.duplicate(true)
	for index in range(source_cards.size()):
		if int(source_cards[index].get("id", -1)) == card_id:
			source_cards.remove_at(index)
			break
	var target_deck := _find_owned_deck(run_state, target_deck_id)
	var target_cards := _deck_cards(run_state, target_deck, target_deck_id).duplicate(true)
	target_cards.append(card.duplicate(true))
	set_owned_deck_cards(host, source_deck_id, source_cards)
	set_owned_deck_cards(host, target_deck_id, target_cards)
	host.deck_editor_selected_deck_id = target_deck_id
	host.notice = "%s을(를) 다른 덱으로 옮겼습니다." % str(card.get("name", "카드"))
	host._show_deck()


static func on_run_card_dropped(target: Dictionary, data: Dictionary, host: Node) -> void:
	var card_id := int(data.get("card_id", -1))
	var source_area := str(data.get("source_area", ""))
	var target_area := str(target.get("area", ""))
	if str(data.get("kind", "")) == "run-ticket":
		var ticket_id := str(data.get("ticket_id", ""))
		if source_area == "floor" and target_area == "inventory":
			move_floor_consumable_to_inventory(host, ticket_id)
		elif source_area == "inventory" and target_area == "floor":
			move_inventory_consumable_to_floor(host, ticket_id)
		return
	if target_area == "deck":
		var target_deck_id := str(target.get("deck_id", ""))
		if source_area == "pendingRemoval" and str(data.get("source_deck_id", "")) == target_deck_id:
			restore_pending_deck_card(host, card_id)
		elif source_area == "deck":
			move_card_between_decks_by_id(host, card_id, str(data.get("source_deck_id", "")), target_deck_id)
		elif source_area in ["inventory", "floor"]:
			move_external_card_to_deck(host, card_id, source_area, target_deck_id)
		return
	if target_area == "inventory":
		if source_area == "deck":
			move_deck_card_to_inventory(host, card_id, str(data.get("source_deck_id", "")))
		elif source_area == "floor":
			move_floor_card_to_inventory(host, card_id)
		return
	if target_area == "floor" and source_area == "inventory":
		move_inventory_card_to_floor(host, card_id)
	elif target_area == "floor" and source_area == "deck":
		move_deck_card_to_floor(host, card_id, str(data.get("source_deck_id", "")))


static func on_deck_case_dropped(target: Dictionary, data: Dictionary, host: Node) -> void:
	if str(data.get("kind", "")) != "deck-case":
		return
	var deck_id := str(data.get("deck_id", ""))
	match str(target.get("area", "")):
		"owned":
			swap_owned_decks(host, deck_id, str(target.get("deck_id", "")))
		"emptyOwned":
			pick_up_floor_deck(host, deck_id)
		"floor":
			drop_owned_deck(host, deck_id)


static func swap_owned_decks(host: Node, source_id: String, target_id: String) -> void:
	if source_id.is_empty() or target_id.is_empty() or source_id == target_id:
		return
	var run_state: Dictionary = host.run_state
	var decks: Array = run_state.get("owned_decks", []).duplicate(true)
	var source_index := -1
	var target_index := -1
	for index in range(decks.size()):
		var deck_id := str(decks[index].get("id", ""))
		if deck_id == source_id:
			source_index = index
		elif deck_id == target_id:
			target_index = index
	if source_index < 0 or target_index < 0:
		return
	var source_deck: Dictionary = decks[source_index]
	decks[source_index] = decks[target_index]
	decks[target_index] = source_deck
	run_state["owned_decks"] = decks
	host._sync_active_deck()
	host.notice = "덱 순서를 바꿨습니다."
	host._save_run()
	host._show_deck()


static func pick_up_floor_deck(host: Node, deck_id: String) -> void:
	var run_state: Dictionary = host.run_state
	var decks: Array = run_state.get("owned_decks", []).duplicate(true)
	var limit := owned_deck_limit(host)
	if decks.size() >= limit:
		host.notice = "덱은 최대 %d개까지 보유할 수 있습니다." % limit
		host._show_deck()
		return
	var position: Vector2i = run_state.get("position", Vector2i.ZERO)
	var floor_drops: Array = run_state.get("floor_deck_drops", []).duplicate(true)
	for index in range(floor_drops.size()):
		var drop: Dictionary = floor_drops[index]
		if int(drop.get("x", -1)) != position.x or int(drop.get("y", -1)) != position.y:
			continue
		var floor_deck: Dictionary = drop.get("deck", {})
		if str(floor_deck.get("id", "")) != deck_id:
			continue
		decks.append(floor_deck.duplicate(true))
		register_acquired_deck_origins(host, floor_deck)
		floor_drops.remove_at(index)
		run_state["owned_decks"] = decks
		run_state["floor_deck_drops"] = floor_drops
		host.notice = "덱 「%s」을(를) 주웠습니다. 보유 덱 %d / %d" % [
			str(floor_deck.get("name", "금고 덱")), decks.size(), limit]
		host._save_run()
		host._show_deck()
		return


static func drop_owned_deck(host: Node, deck_id: String) -> void:
	var run_state: Dictionary = host.run_state
	var decks: Array = run_state.get("owned_decks", []).duplicate(true)
	var deck_index := -1
	for index in range(decks.size()):
		if str(decks[index].get("id", "")) == deck_id:
			deck_index = index
			break
	if deck_index < 0:
		return
	var dropped_deck: Dictionary = decks[deck_index]
	decks.remove_at(deck_index)
	run_state["owned_decks"] = decks
	if str(run_state.get("active_deck_id", "")) == deck_id:
		if decks.is_empty():
			run_state["active_deck_id"] = ""
			run_state["deck"] = []
		else:
			run_state["active_deck_id"] = str(decks[0].get("id", ""))
			run_state["deck"] = decks[0].get("cards", []).duplicate(true)
	var position: Vector2i = run_state.get("position", Vector2i.ZERO)
	var floor_drops: Array = run_state.get("floor_deck_drops", []).duplicate(true)
	floor_drops.append({"x": position.x, "y": position.y, "deck": dropped_deck})
	run_state["floor_deck_drops"] = floor_drops
	host._sync_active_deck()
	host.notice = "덱 「%s」을(를) 현재 타일에 놓았습니다." % str(dropped_deck.get("name", "덱"))
	host._save_run()
	host._show_deck()


static func can_drop_extract_ticket(target: Dictionary, data: Dictionary, host: Node) -> bool:
	if str(data.get("kind", "")) != "run-ticket" or str(data.get("ticket_type", "")) != "extractTicket":
		return false
	var ticket_id := str(data.get("ticket_id", ""))
	var source_area := str(data.get("source_area", ""))
	if ticket_id.is_empty() or source_area not in ["inventory", "floor"]:
		return false
	var run_state: Dictionary = host.run_state
	var ticket_exists := _find_extract_ticket_index(run_state, source_area, ticket_id) >= 0
	if not ticket_exists:
		return false
	var card_id := int(target.get("card_id", -1))
	var deck_id := str(target.get("deck_id", ""))
	if card_id < 0 or deck_id.is_empty() or not host.deck_editor_origins_by_card_id.has(card_id):
		return false
	if origin_deck_id_for_card(host, card_id) != deck_id:
		return false
	var deck := _find_owned_deck(run_state, deck_id)
	if deck.is_empty():
		return false
	for card in _deck_cards(run_state, deck, deck_id):
		if int(card.get("id", -1)) == card_id:
			return not DeckEditorRules.is_bound(card)
	return false


static func _find_extract_ticket_index(run_state: Dictionary, source_area: String, ticket_id: String) -> int:
	if source_area == "inventory":
		var tickets: Array = run_state.get("inventory_consumables", [])
		for index in range(tickets.size()):
			if str(tickets[index].get("type", "")) == "extractTicket" \
					and (ticket_id == "" or str(tickets[index].get("id", "")) == ticket_id):
				return index
		return -1
	var ticket_position: Vector2i = run_state.get("position", Vector2i.ZERO)
	var drops: Array = run_state.get("floor_consumable_drops", [])
	for index in range(drops.size()):
		var drop: Dictionary = drops[index]
		if int(drop.get("x", -1)) != ticket_position.x or int(drop.get("y", -1)) != ticket_position.y:
			continue
		var ticket: Dictionary = drop.get("consumable", {})
		if str(ticket.get("type", "")) == "extractTicket" \
				and (ticket_id == "" or str(ticket.get("id", "")) == ticket_id):
			return index
	return -1


static func on_run_ticket_dropped(target: Dictionary, data: Dictionary, host: Node) -> void:
	if not can_drop_extract_ticket(target, data, host):
		return
	host.extraction_ticket_mode = true
	host.extraction_ticket_source = str(data.get("source_area", ""))
	host.extraction_ticket_id = str(data.get("ticket_id", ""))
	extract_owned_deck_card(host, str(target.get("deck_id", "")), int(target.get("card_id", -1)))


static func extract_owned_deck_card(host: Node, deck_id: String, card_id: int) -> void:
	if not host.extraction_ticket_mode:
		return
	if not host.deck_editor_origins_by_card_id.has(card_id) or origin_deck_id_for_card(host, card_id) != deck_id:
		host.notice = "추출 티켓은 편집을 시작할 때 해당 덱에 있던 카드에만 사용할 수 있습니다."
		host._show_deck()
		return
	var run_state: Dictionary = host.run_state
	var ticket_index := _find_extract_ticket_index(run_state, host.extraction_ticket_source, host.extraction_ticket_id)
	if ticket_index < 0:
		host.extraction_ticket_mode = false
		host.extraction_ticket_id = ""
		host.notice = "추출 티켓이 없습니다."
		host._show_deck()
		return
	var decks: Array = run_state.get("owned_decks", [])
	for deck_index in range(decks.size()):
		var deck: Dictionary = decks[deck_index].duplicate(true)
		if str(deck.get("id", "")) != deck_id:
			continue
		var cards: Array = deck.get("cards", [])
		for card_index in range(cards.size()):
			var card: Dictionary = cards[card_index]
			if int(card.get("id", -1)) != card_id:
				continue
			if DeckEditorRules.is_bound(card):
				host.notice = "에디션에 귀속된 카드는 추출할 수 없습니다."
				return
			cards.remove_at(card_index)
			deck["cards"] = cards
			decks[deck_index] = deck
			run_state["owned_decks"] = decks
			if deck_id == str(run_state.get("active_deck_id", "starter")):
				run_state["deck"] = cards.duplicate(true)
				host._sync_active_deck()
			var ticket_frees_slot: bool = host.extraction_ticket_source == "inventory"
			var projected_inventory_count := inventory_item_count(run_state) - (1 if ticket_frees_slot else 0)
			var dropped_to_floor := projected_inventory_count >= int(host.INVENTORY_CAPACITY)
			if dropped_to_floor:
				put_card_on_current_tile(run_state, card)
			else:
				var inventory: Array = run_state.get("inventory_cards", [])
				inventory.append(card.duplicate(true))
				run_state["inventory_cards"] = inventory
			host.deck_editor_origins_by_card_id[card_id] = null
			host.deck_editor_high_rarity_return_area_by_card_id.erase(card_id)
			if host.extraction_ticket_source == "inventory":
				var tickets: Array = run_state.get("inventory_consumables", [])
				tickets.remove_at(ticket_index)
				run_state["inventory_consumables"] = tickets
			else:
				var floor_ticket_drops: Array = run_state.get("floor_consumable_drops", [])
				floor_ticket_drops.remove_at(ticket_index)
				run_state["floor_consumable_drops"] = floor_ticket_drops
			host.extraction_ticket_mode = false
			host.extraction_ticket_id = ""
			host.notice = "%s을(를) 추출 티켓으로 덱에서 꺼냈습니다." % str(card.get("name", "카드"))
			if dropped_to_floor:
				host.notice += " 인벤토리가 가득 차 현재 타일에 떨어졌습니다."
			host._show_deck()
			return
	host.extraction_ticket_mode = false
	host.extraction_ticket_id = ""
	host.notice = "추출할 카드를 찾지 못했습니다."
	host._show_deck()


static func group_cards(cards: Array) -> Array[Dictionary]:
	var groups: Array[Dictionary] = []
	var group_index_by_key: Dictionary = {}
	for source_index in range(cards.size()):
		var card = cards[source_index]
		if not card is Dictionary:
			continue
		var sticker_key := JSON.stringify(CardStickers.card_sticker_ids(card))
		var key_parts := [
			str(card.get("name", "")),
			str(card.get("effect", "")),
			str(card.get("damageType", card.get("damage_type", ""))),
			str(card.get("cost", "")),
			str(card.get("value", "")),
			str(card.get("rarity", "")),
			sticker_key,
			"forged" if bool(card.get("forged", false)) else "normal",
			"token" if bool(card.get("enemyToken", card.get("enemy_token", false))) else "card",
			JSON.stringify(card.get("forgeCostsCompleted", card.get("forge_costs_completed", []))),
		]
		var group_key := JSON.stringify(key_parts)
		if group_index_by_key.has(group_key):
			var existing: Dictionary = groups[int(group_index_by_key[group_key])]
			var ids: Array = existing["ids"]
			ids.append(int(card.get("id", -1)))
			existing["ids"] = ids
		else:
			group_index_by_key[group_key] = groups.size()
			groups.append({"card": card, "ids": [int(card.get("id", -1))], "source_index": source_index})
	groups.sort_custom(DeckVaultCardView._card_group_less)
	return groups


static func group_consumables(consumables: Array) -> Array[Dictionary]:
	var groups: Array[Dictionary] = []
	var group_index_by_key: Dictionary = {}
	for consumable in consumables:
		if not consumable is Dictionary:
			continue
		var key := JSON.stringify([
			str(consumable.get("name", "")),
			str(consumable.get("type", "")),
			str(consumable.get("description", "")),
		])
		if group_index_by_key.has(key):
			var existing: Dictionary = groups[int(group_index_by_key[key])]
			var ids: Array = existing["ids"]
			ids.append(str(consumable.get("id", "")))
			existing["ids"] = ids
		else:
			group_index_by_key[key] = groups.size()
			groups.append({"card": consumable, "ids": [str(consumable.get("id", ""))]})
	return groups


static func group_representative(group: Dictionary) -> Dictionary:
	var representative: Dictionary = group.get("card", {}).duplicate(true)
	var ids: Array = group.get("ids", [])
	if not ids.is_empty():
		representative["id"] = ids.back()
	return representative
