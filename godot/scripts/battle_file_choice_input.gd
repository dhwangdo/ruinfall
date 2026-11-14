extends RefCounted


static func handle_input(event: InputEvent, game: Control) -> bool:
	if not (event is InputEventMouseMotion or event is InputEventMouseButton) \
			or not game.battle_card_ledger_open.is_empty():
		return false
	var operation := str(game.battle_state.get("pending_pile_operation", ""))
	var drawing := int(game.battle_state.get("pending_draws", 0)) > 0 \
		or int(game.battle_state.get("pending_pile_draw_count", 0)) > 0
	if operation.is_empty() and not drawing:
		return false
	var selected := -1
	for index in range(game.battle_pile_widgets.size()):
		var file: Control = game.battle_pile_widgets[index]
		var eligible: bool = game.BattleRules.can_draw_from_file(game.battle_state, index) if drawing \
			else not game.battle_state["piles"][index].is_empty()
		var hovered: bool = eligible and file.contains_choice_point(event.position)
		file.set_choice_hovered(hovered)
		if hovered:
			selected = index
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT and selected >= 0:
		game._on_pile_pressed(selected)
		return true
	return false
