extends RefCounted

const UNPLAYABLE := "unplayable"
const TARGETED := "targeted"
const UNTARGETED := "untargeted"
const MODES := [UNPLAYABLE, TARGETED, UNTARGETED]
const LEGACY_UNPLAYABLE_EFFECTS := [
	"slime", "soil", "rock", "combat_manual", "grimoire", "wolf_talisman", "turtle_talisman", "saeongjima",
]


static func mode(card: Dictionary) -> String:
	if card.is_empty():
		return UNPLAYABLE
	var stored := str(card.get("use_mode", ""))
	if MODES.has(stored):
		return stored
	# Compatibility for old saves. New catalog entries declare use_mode directly.
	var effect := str(card.get("effect", ""))
	var resolved := UNTARGETED
	if not bool(card.get("playable", true)) or LEGACY_UNPLAYABLE_EFFECTS.has(effect):
		resolved = UNPLAYABLE
	elif effect in ["scale_armor", "sand_toss"]:
		resolved = TARGETED
	elif str(card.get("kind", "")) == "strike" \
			or effect in ["radiance", "sweep", "double_hit", "iron_rampage", "magic_strike", "shockwave", "meteor", "hydra"]:
		resolved = UNTARGETED if effect in ["iron_rampage", "shockwave", "sweep", "odin_spear", "meteor", "hydra", "magic_strike"] else TARGETED
	card["use_mode"] = resolved
	return resolved


static func is_playable(card: Dictionary) -> bool:
	return mode(card) != UNPLAYABLE


static func requires_target(card: Dictionary) -> bool:
	return mode(card) == TARGETED
