extends RefCounted

const MapRules := preload("res://scripts/map_rules.gd")
const VaultRules := preload("res://scripts/deck_vault_rules.gd")

var _thread := Thread.new()
var _mutex := Mutex.new()
var _cancel_requested := false
var _completed_regions := 0
var _cooperative := false
var _cooperative_next_region := 0
var _cooperative_seed := 0
var _ready_chunks: Array[Dictionary] = []
var _worker_done := false
var _started := false


func start(seed_value: int, start_region: int = 0) -> Error:
	cancel_and_wait()
	_cancel_requested = false
	_completed_regions = clampi(start_region, 0, MapRules.REGION_COUNT)
	_ready_chunks.clear()
	_worker_done = _completed_regions >= MapRules.REGION_COUNT
	_started = true
	if _worker_done:
		return OK
	if OS.has_feature("web"):
		_cooperative = true
		_cooperative_seed = seed_value
		_cooperative_next_region = _completed_regions
		return OK
	_cooperative = false
	return _thread.start(_generate_streaming.bind(seed_value, _completed_regions))


func advance() -> void:
	if not _cooperative or _cancel_requested or _worker_done:
		return
	if _cooperative_next_region < MapRules.REGION_COUNT:
		var region_index := _cooperative_next_region
		var chunk := MapRules.create_empty_map(_cooperative_seed)
		MapRules.generate_region(chunk, region_index, _cooperative_seed)
		_pregenerate_chunk_floor_decks(chunk)
		_ready_chunks.append({"region": region_index, "chunk": chunk})
		_cooperative_next_region += 1
		_completed_regions = _cooperative_next_region
	if _cooperative_next_region >= MapRules.REGION_COUNT:
		_worker_done = true


func poll_ready_chunks() -> Array[Dictionary]:
	if _cooperative:
		if _ready_chunks.is_empty():
			return []
		var out := _ready_chunks.duplicate()
		_ready_chunks.clear()
		return out
	_mutex.lock()
	var out: Array[Dictionary] = []
	if not _ready_chunks.is_empty():
		out = _ready_chunks.duplicate()
		_ready_chunks.clear()
	_mutex.unlock()
	return out


func is_cooperative() -> bool:
	return _cooperative


func is_alive() -> bool:
	if _cooperative:
		return not _worker_done and not _cancel_requested
	return _thread.is_started() and _thread.is_alive()


func is_finished() -> bool:
	if not _started:
		return true
	if _cooperative:
		return _worker_done and _ready_chunks.is_empty()
	if _thread.is_started() and _thread.is_alive():
		return false
	_mutex.lock()
	var done := _worker_done and _ready_chunks.is_empty()
	_mutex.unlock()
	return done


func completed_regions() -> int:
	if _cooperative:
		return _completed_regions
	_mutex.lock()
	var count := _completed_regions
	_mutex.unlock()
	return count


func finish_if_done() -> void:
	if not _cooperative and _thread.is_started() and not _thread.is_alive():
		_thread.wait_to_finish()


func cancel_and_wait() -> void:
	if _cooperative:
		_cancel_requested = true
		_ready_chunks.clear()
		_worker_done = true
		_started = false
		return
	_mutex.lock()
	_cancel_requested = true
	_mutex.unlock()
	if _thread.is_started():
		_thread.wait_to_finish()
	_mutex.lock()
	_ready_chunks.clear()
	_worker_done = true
	_mutex.unlock()
	_started = false


func _is_cancelled() -> bool:
	_mutex.lock()
	var cancelled := _cancel_requested
	_mutex.unlock()
	return cancelled


func _generate_streaming(seed_value: int, start_region: int) -> void:
	# Worker only writes to fresh isolated per-region Dictionaries; no Node, UI, or shared map mutation occurs here.
	for region_index in range(start_region, MapRules.REGION_COUNT):
		if _is_cancelled():
			break
		var chunk := MapRules.create_empty_map(seed_value)
		MapRules.generate_region(chunk, region_index, seed_value)
		if _is_cancelled():
			break
		_pregenerate_chunk_floor_decks(chunk)
		if _is_cancelled():
			break
		_mutex.lock()
		_ready_chunks.append({"region": region_index, "chunk": chunk})
		_completed_regions = region_index + 1
		_mutex.unlock()
	_mutex.lock()
	_worker_done = true
	_mutex.unlock()


func _pregenerate_chunk_floor_decks(chunk: Dictionary) -> void:
	if MapRules.DECK_VAULTS_ENABLED:
		return
	var pregen: Dictionary = {}
	for raw_pos in chunk.get("floor_deck_spawn_positions", []):
		if _is_cancelled():
			return
		if raw_pos is Vector2i:
			var pos: Vector2i = raw_pos
			var gen := VaultRules.generate(chunk, pos, 1)
			pregen["%d,%d" % [pos.x, pos.y]] = gen["deck"]
	chunk["pregenerated_floor_decks"] = pregen
