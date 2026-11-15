extends SceneTree

const MainScript = preload("res://scripts/main.gd")


func _initialize() -> void:
	var game: Variant = MainScript.new()
	var capture_path := ProjectSettings.globalize_path(
		"res://tests/.auto_explore_capture_probe_%d.save" % Time.get_ticks_usec())
	var fake_seen: Dictionary = {}
	for index in range(20):
		fake_seen[Vector2i(index, 0)] = true
	game.auto_explore_capture_path = capture_path
	game.auto_explore_capture_seed = 7
	game.run_state = {"position": Vector2i(2, 0), "map_seed": 7,
		"map": {"seen": fake_seen, "gold_piles": {Vector2i(30, 0): 100}}}
	var no_progress := {"steps": 4, "seen_before": 20, "seen_after": 20,
		"gold_before": 100, "gold_after": 100}
	var progress := {"steps": 4, "seen_before": 20, "seen_after": 21,
		"gold_before": 100, "gold_after": 100}
	var ab := no_progress.duplicate()
	ab["start"] = Vector2i(1, 0)
	ab["end"] = Vector2i(2, 0)
	var ba := no_progress.duplicate()
	ba["start"] = Vector2i(2, 0)
	ba["end"] = Vector2i(1, 0)
	var advancing := progress.duplicate()
	advancing["start"] = Vector2i(2, 0)
	advancing["end"] = Vector2i(3, 0)
	var advancing_history: Array[Dictionary] = [ab, advancing]
	game.auto_explore_capture_history = advancing_history
	assert(not game._auto_explore_capture_has_stall_cycle(), "Seen growth must not capture a stall")
	game.auto_explore_capture_session = {"start": Vector2i(2, 0), "seen_before": 20, "gold_before": 100}
	game.auto_explore_capture_steps = 4
	game._finish_auto_explore_capture("test")
	assert(not FileAccess.file_exists(capture_path), "A progressing endpoint sequence must not write a capture")
	var repeated_history: Array[Dictionary] = [ab, ab.duplicate()]
	game.auto_explore_capture_history = repeated_history
	assert(game._auto_explore_capture_has_stall_cycle(), "Repeated no-progress endpoint pairs must capture")
	var prior_history: Array[Dictionary] = [ab]
	game.auto_explore_capture_history = prior_history
	game.auto_explore_capture_session = {"start": Vector2i(1, 0), "seen_before": 20, "gold_before": 100}
	game.auto_explore_capture_steps = 4
	game._finish_auto_explore_capture("test-cycle")
	assert(FileAccess.file_exists(capture_path), "A repeated no-progress pair must serialize a capture")
	var saved := FileAccess.open(capture_path, FileAccess.READ)
	var payload: Dictionary = saved.get_var(false)
	assert(payload.get("run_state", {}).get("position") == Vector2i(2, 0), "Capture must retain native Vector2i state")
	assert(payload.get("sessions", []).size() == 2, "Capture must retain cross-O summaries")
	saved.close()
	DirAccess.remove_absolute(capture_path)
	var cycle_history: Array[Dictionary] = [ab, ba, ab.duplicate()]
	game.auto_explore_capture_history = cycle_history
	assert(game._auto_explore_capture_has_stall_cycle(), "A-B-A-B no-progress cycles must capture")
	print("AUTO_EXPLORE_CAPTURE_PROBE=3/3 passed")
	game.free()
	quit(0)
