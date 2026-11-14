extends RefCounted

const MapRules := preload("res://scripts/map_rules.gd")

var _thread := Thread.new()
var _mutex := Mutex.new()
var _cancel_requested := false
var _completed_regions := 0
var _cooperative := false
var _cooperative_map: Dictionary = {}
var _cooperative_seed := 0
var _cooperative_result_ready := false


func start(seed_value: int) -> Error:
	if OS.has_feature("web"):
		return start_cooperative(seed_value)
	return _thread.start(_generate.bind(seed_value))


func start_cooperative(seed_value: int) -> Error:
	_cooperative = true
	_cancel_requested = false
	_completed_regions = 0
	_cooperative_seed = seed_value
	_cooperative_map = MapRules.create_empty_map(seed_value)
	_cooperative_result_ready = false
	return OK


func advance() -> void:
	if not _cooperative or _cancel_requested or _cooperative_result_ready:
		return
	if _completed_regions < MapRules.REGION_COUNT:
		MapRules.generate_region(_cooperative_map, _completed_regions, _cooperative_seed)
		_completed_regions += 1
	if _completed_regions == MapRules.REGION_COUNT:
		if _cancel_requested:
			_cooperative_map.clear()
		else:
			MapRules.finish_map(_cooperative_map)
		_cooperative_result_ready = true


func is_alive() -> bool:
	if _cooperative:
		return not _cooperative_result_ready and not _cancel_requested
	return _thread.is_alive()


func completed_regions() -> int:
	if _cooperative:
		return _completed_regions
	_mutex.lock()
	var count := _completed_regions
	_mutex.unlock()
	return count


func take_result() -> Dictionary:
	if _cooperative:
		if not _cooperative_result_ready or _cancel_requested:
			return {}
		var result := _cooperative_map
		_cooperative_map = {}
		return result
	# The caller polls is_alive() first; join transfers the worker-owned map once.
	if not _thread.is_started():
		return {}
	return _thread.wait_to_finish()


func cancel_and_wait() -> void:
	if _cooperative:
		_cancel_requested = true
		_cooperative_map.clear()
		_cooperative_result_ready = true
		return
	_mutex.lock()
	_cancel_requested = true
	_mutex.unlock()
	if _thread.is_started():
		_thread.wait_to_finish()


func _is_cancelled() -> bool:
	_mutex.lock()
	var cancelled := _cancel_requested
	_mutex.unlock()
	return cancelled


func _generate(seed_value: int) -> Dictionary:
	# No Node, UI, file, or shared map access occurs on this thread.
	var map_data := MapRules.create_empty_map(seed_value)
	for region_index in range(MapRules.REGION_COUNT):
		if _is_cancelled():
			return {}
		MapRules.generate_region(map_data, region_index, seed_value)
		_mutex.lock()
		_completed_regions = region_index + 1
		_mutex.unlock()
	if _is_cancelled():
		return {}
	MapRules.finish_map(map_data)
	return map_data
