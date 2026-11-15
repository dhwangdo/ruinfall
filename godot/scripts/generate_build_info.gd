extends SceneTree


func _initialize() -> void:
	var project_root := ProjectSettings.globalize_path("res://")
	var hash_output: Array[String] = []
	var epoch_output: Array[String] = []
	var hash_result := OS.execute("git", ["-C", project_root, "rev-parse", "--short=10", "HEAD"], hash_output)
	var epoch_result := OS.execute("git", ["-C", project_root, "show", "-s", "--format=%ct", "HEAD"], epoch_output)
	if hash_result != 0 or epoch_result != 0 or hash_output.is_empty() or epoch_output.is_empty():
		push_error("Could not read the current Git commit for build metadata.")
		quit(1)
		return
	var payload := {
		"hash": hash_output[0].strip_edges(),
		"epoch": int(epoch_output[0].strip_edges()),
	}
	var file := FileAccess.open("res://build_info.json", FileAccess.WRITE)
	if file == null:
		push_error("Could not write res://build_info.json.")
		quit(1)
		return
	file.store_string(JSON.stringify(payload))
	file.close()
	quit(0)
