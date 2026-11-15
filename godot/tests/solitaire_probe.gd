extends SceneTree

const BattleRules = preload("res://scripts/battle_rules.gd")
const SolitaireRules = preload("res://scripts/solitaire_rules.gd")


func _initialize() -> void:
	var arguments := OS.get_cmdline_user_args()
	if arguments.size() != 1:
		quit(2)
		return
	var cases: Array = JSON.parse_string(FileAccess.get_file_as_string(arguments[0]))
	var results: Array = []
	for entry in cases:
		var state: Dictionary = entry["state"]
		var before := JSON.stringify(state)
		var payload: Dictionary = entry["payload"]
		var target := int(entry["target"])
		var error := SolitaireRules.move_error(state, payload, target)
		var next := BattleRules.move_cards_to_file(state, payload, target)
		results.append({
			"label": entry["label"], "state": next, "accepted": error == "", "error": error,
			"source_unchanged": before == JSON.stringify(state),
		})
	print("SOLITAIRE_RESULT=" + JSON.stringify(results))
	quit(0)
