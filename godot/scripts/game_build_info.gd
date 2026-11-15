extends CanvasLayer

const FONT: FontFile = preload("res://assets/fonts/PretendardVariable.woff2")
const BUILD_INFO_PATH := "res://build_info.json"
const KST_OFFSET_SECONDS := 9 * 60 * 60


func _ready() -> void:
	layer = 120
	var info := _read_build_info()
	if info.is_empty() and OS.has_feature("editor"):
		info = _read_git_info()
	if info.is_empty():
		return
	var commit_hash := str(info.get("hash", ""))
	var epoch := int(info.get("epoch", 0))
	if commit_hash.is_empty() or epoch <= 0:
		return
	var stamp := Label.new()
	stamp.name = "CommitVersionStamp"
	stamp.anchor_left = 1.0
	stamp.anchor_top = 1.0
	stamp.anchor_right = 1.0
	stamp.anchor_bottom = 1.0
	stamp.offset_left = -430.0
	stamp.offset_top = -25.0
	stamp.offset_right = -12.0
	stamp.offset_bottom = -5.0
	stamp.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	stamp.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	stamp.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stamp.add_theme_font_override("font", FONT)
	stamp.add_theme_font_size_override("font_size", 12)
	stamp.add_theme_color_override("font_color", Color("#a7aa9f", 0.78))
	stamp.text = "%s · %s KST" % [commit_hash, _format_kst(epoch)]
	add_child(stamp)


func _read_build_info() -> Dictionary:
	if not FileAccess.file_exists(BUILD_INFO_PATH):
		return {}
	var file := FileAccess.open(BUILD_INFO_PATH, FileAccess.READ)
	if file == null:
		return {}
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		return parsed
	return {}


func _read_git_info() -> Dictionary:
	var project_root := ProjectSettings.globalize_path("res://")
	var hash_output: Array[String] = []
	var epoch_output: Array[String] = []
	var hash_result := OS.execute("git", ["-C", project_root, "rev-parse", "--short=10", "HEAD"], hash_output)
	var epoch_result := OS.execute("git", ["-C", project_root, "show", "-s", "--format=%ct", "HEAD"], epoch_output)
	if hash_result != 0 or epoch_result != 0 or hash_output.is_empty() or epoch_output.is_empty():
		return {}
	return {
		"hash": hash_output[0].strip_edges(),
		"epoch": int(epoch_output[0].strip_edges()),
	}


func _format_kst(epoch: int) -> String:
	var date := Time.get_datetime_dict_from_unix_time(epoch + KST_OFFSET_SECONDS)
	return "%04d-%02d-%02d %02d:%02d:%02d" % [
		date.year, date.month, date.day, date.hour, date.minute, date.second,
	]
