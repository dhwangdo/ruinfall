extends RefCounted

const SolitaireRules = preload("res://scripts/solitaire_rules.gd")
const BattleRules = preload("res://scripts/battle_rules.gd")


static func resolve(state: Dictionary, payload: Dictionary, target_kind: String, target_index: int) -> String:
	if target_kind != "file" or str(payload.get("kind", "")) != "battle-card" \
		or SolitaireRules.move_error(state, payload, target_index) != "":
		return "none"
	var moving: Array = SolitaireRules.source_cards(state, payload)
	var pile: Array = state["piles"][target_index]
	if moving.is_empty() or pile.is_empty():
		return "solitaire"
	# BattlePileZone asks about the dragged card, not the whole moving stack.
	var card: Dictionary = moving[0]
	if str(card.get("effect", "")) in ["astronomy_research", "necromancy_research", "mass_deal"]:
		return "solitaire"
	# The existing forge resolver copies cards before changing them; only its
	# scalar counter is written here, into this disposable state dictionary.
	var probe: Dictionary = state.duplicate(false)
	var result: Dictionary = BattleRules._resolve_forge_placement(probe, card, pile.back())
	return "forge" if bool(result.get("applied", false)) else "solitaire"
