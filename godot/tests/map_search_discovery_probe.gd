extends SceneTree

const Rules = preload("res://scripts/map_rules.gd")
const Search = preload("res://scripts/map_search_rules.gd")
const SearchPanel = preload("res://scripts/map_search_panel.gd")
const Preview = preload("res://scripts/map_vault_preview_data.gd")


func _initialize() -> void:
	run.call_deferred()


func run() -> void:
	var player := Vector2i(30, 10)
	var vault := player + Vector2i(18, 0)
	var hidden := player + Vector2i(19, 0)
	var map := {"walkable": {player: true, vault: true, hidden: true},
		"room_types": {vault: "deckVault", hidden: "deckVault"}, "seen": {player: true},
		"visible_now": {player: true}, "deck_vaults": {}, "opened_deck_vaults": {}}
	var state := {"map": map, "map_seed": 123, "position": player, "next_card_id": 500}
	assert(Rules.remember_visible_vaults(map, player, true))
	assert(not map.known_deck_vaults.has(hidden))
	assert(not map.seen.has(vault))
	state.position = Vector2i(90, 10)
	var entries := Search.build_entries(state)
	var decks := Search.filter_entries(entries, "deck", 1, "")
	assert(decks.size() == 1 and decks[0].position == vault)
	assert(not decks[0].deck.is_empty())
	assert(decks[0].in_vault)
	assert(Search.filter_entries(entries, "item", 1, "").size() > 0)
	assert(state.next_card_id == 500 and map.deck_vaults.is_empty())
	var restored: Dictionary = bytes_to_var(var_to_bytes(state))
	assert(Search.filter_entries(Search.build_entries(restored), "deck", 1, "").size() == 1)
	assert(Preview.resolve(state, vault).name == decks[0].deck.name)
	map.opened_deck_vaults["48,10"] = true
	assert(Search.filter_entries(Search.build_entries(state), "deck", 1, "").is_empty())
	# Existing saves with only seen, and no discovery ledger, also find unvisited vaults.
	map.opened_deck_vaults.clear()
	map.erase("known_deck_vaults")
	map.seen[vault] = true
	assert(Search.filter_entries(Search.build_entries(state), "deck", 1, "").size() == 1)
	var floors := []
	for i in range(500):
		var position := Vector2i(i % 50, i / 50)
		map.seen[position] = true
		floors.append({"x": position.x, "y": position.y, "card": {"id": i,
			"name": "성능%04d" % i, "rarity": "basic", "kind": "attack", "cost": 1,
			"effect": "strike", "value": 6, "description": "피해를 6 줍니다."}})
	map.room_types.clear()
	state.floor_cards = floors
	var panel := SearchPanel.new()
	panel.selected_kind = "item"
	var started := Time.get_ticks_usec()
	panel.configure(state, 1)
	root.add_child(panel)
	await process_frame
	await process_frame
	assert(panel.result_panel.size.x <= 372.0, "Search list children must not force the panel wider")
	assert(panel.filtered_results.size() == 500)
	assert(panel.result_list.get_child_count() == panel.RESULT_PAGE_SIZE)
	print("500-result search initial widgets: %d; setup %.2fms" % [panel.result_list.get_child_count(), (Time.get_ticks_usec() - started) / 1000.0])
	var visited := {}
	while true:
		for index in range(panel.result_page * panel.RESULT_PAGE_SIZE,
			mini((panel.result_page + 1) * panel.RESULT_PAGE_SIZE, 500)):
			visited[panel.filtered_results[index].search_entry_key] = true
		if panel.next_page_button.disabled:
			break
		panel._change_result_page(1)
		assert(panel.result_list.get_child_count() <= panel.RESULT_PAGE_SIZE)
		await process_frame
	assert(visited.size() == 500 and panel.result_list.get_child_count() == 20)
	panel.search_input.text = "성능0499"
	panel._refresh_results()
	assert(panel.filtered_results.size() == 1 and panel.result_page == 0)
	assert(panel.result_list.get_child_count() == 1)
	panel.search_input.text = "일치없음"
	panel._refresh_results()
	assert(panel.filtered_results.is_empty())
	assert(panel.previous_page_button.disabled and panel.next_page_button.disabled)
	panel.queue_free()
	await process_frame
	print("PASS: seen/unvisited and remembered vault contents, save roundtrip, no hidden vaults or ID consumption, bounded UI/all-result search")
	quit()
