extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Setup = preload("res://scripts/battle_setup.gd")


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	if args.size() != 1:
		quit(2)
		return
	var requests: Array = JSON.parse_string(FileAccess.get_file_as_string(args[0]))
	var results: Array = []
	for request in requests:
		var before := JSON.stringify(request)
		var result: Dictionary
		var play_view: Dictionary = {}
		match str(request["action"]):
			"setup":
				result = Setup.prepare_encounter(request["encounter"],int(request["stage"]),int(request["charges"]))
			"start":
				var deck: Array[Dictionary] = []
				for card in request["deck"]: deck.append(card)
				result = Rules.start_battle(deck,50,request["encounter"],50,request["editions"],25)
			"play":
				result = Rules.play_card(request["state"],int(request["card_id"]),play_view)
			"auto_discard":
				result = Rules._auto_discard_if_forced(request["state"])
			"auto_pile_discard":
				result = Rules._auto_resolve_forced_pile_discard(request["state"])
			"turn":
				result = Rules.end_turn(request["state"])
			"draw":
				result = request["state"].duplicate(true)
				Rules._draw_from_files(result)
		results.append({"state":result,"play_view":play_view,"input_unchanged":before == JSON.stringify(request)})
	print("BATTLE_FLOW_RESULT="+JSON.stringify(results))
	quit(0)
