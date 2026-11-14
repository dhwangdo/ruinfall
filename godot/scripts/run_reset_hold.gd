extends RefCounted
class_name RunResetHold

const HOLD_DURATION_MS := 1000.0
const SOURCES := ["shortcut", "pointer", "buttonKeyboard"]

var _clock: Callable
var _sources: Dictionary = {}
var _started_at_ms: float = -1.0
var _completed := false


func _init(clock: Callable = Callable()) -> void:
	_clock = clock if clock.is_valid() else Callable(self, "_monotonic_time_ms")


func start(source: String) -> void:
	if not SOURCES.has(source):
		return
	_sources[source] = true
	if _started_at_ms >= 0.0 or _completed:
		return
	_started_at_ms = _now_ms()


func stop(source: String) -> void:
	_sources.erase(source)
	if _sources.is_empty():
		cancel()


func cancel() -> void:
	_sources.clear()
	_started_at_ms = -1.0
	_completed = false


func tick() -> bool:
	if _completed or _started_at_ms < 0.0:
		return false
	if _now_ms() - _started_at_ms < HOLD_DURATION_MS:
		return false
	_completed = true
	_started_at_ms = -1.0
	return true


func progress() -> float:
	if _started_at_ms < 0.0 or _completed:
		return 0.0
	return clampf((_now_ms() - _started_at_ms) / HOLD_DURATION_MS, 0.0, 1.0)


func held_sources() -> Array[String]:
	var result: Array[String] = []
	for source in SOURCES:
		if _sources.has(source):
			result.append(source)
	return result


func is_completed() -> bool:
	return _completed


func _now_ms() -> float:
	return float(_clock.call())


func _monotonic_time_ms() -> int:
	return Time.get_ticks_msec()
