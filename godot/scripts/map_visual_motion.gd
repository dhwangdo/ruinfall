extends RefCounted
class_name MapVisualMotion

const ENEMY_DURATION_MS := 70.0

var _clock: Callable
var _reduced_motion := false
var _camera_position := Vector2.ZERO
var _camera_start := Vector2.ZERO
var _camera_target := Vector2.ZERO
var _camera_started_ms := 0.0
var _camera_duration_ms := 0.0
var _camera_easing := "linear"
var _enemies: Dictionary = {}


func _init(clock: Callable = Callable()) -> void:
	_clock = clock if clock.is_valid() else Callable(self, "_monotonic_time_ms")


func reset(camera: Vector2, visible_enemy_positions_by_id: Dictionary) -> void:
	_camera_position = camera
	_camera_start = camera
	_camera_target = camera
	_camera_duration_ms = 0.0
	_enemies.clear()
	var now := _now_ms()
	for id in visible_enemy_positions_by_id:
		var position: Vector2 = visible_enemy_positions_by_id[id]
		_enemies[id] = {"start": position, "target": position, "started_ms": now, "duration_ms": 0.0}


func retarget_camera(target: Vector2, duration_ms: float, easing: String = "linear") -> void:
	var current := camera_position()
	if target == _camera_target:
		return
	_camera_position = current
	_camera_start = current
	_camera_target = target
	_camera_started_ms = _now_ms()
	_camera_duration_ms = maxf(duration_ms, 0.0)
	_camera_easing = easing
	if _reduced_motion or _camera_duration_ms <= 0.0:
		_camera_position = target
		_camera_start = target
		_camera_duration_ms = 0.0


func snap_camera(target: Vector2) -> void:
	_camera_position = target
	_camera_start = target
	_camera_target = target
	_camera_started_ms = _now_ms()
	_camera_duration_ms = 0.0
	_camera_easing = "linear"


func update_visible_enemies(id_to_position: Dictionary) -> void:
	var now := _now_ms()
	var next: Dictionary = {}
	for id in id_to_position:
		var target: Vector2 = id_to_position[id]
		if not _enemies.has(id):
			next[id] = {"start": target, "target": target, "started_ms": now, "duration_ms": 0.0}
			continue
		var old: Dictionary = _enemies[id]
		var current := _interpolate_enemy(old, now)
		if target == old["target"]:
			next[id] = old
		elif _reduced_motion:
			next[id] = {"start": target, "target": target, "started_ms": now, "duration_ms": 0.0}
		else:
			next[id] = {"start": current, "target": target, "started_ms": now, "duration_ms": ENEMY_DURATION_MS}
	_enemies = next


func camera_position() -> Vector2:
	if _camera_duration_ms <= 0.0:
		return _camera_target
	var progress := clampf((_now_ms() - _camera_started_ms) / _camera_duration_ms, 0.0, 1.0)
	if progress >= 1.0:
		_camera_duration_ms = 0.0
		_camera_position = _camera_target
		_camera_start = _camera_target
		return _camera_target
	var eased := _ease(progress, _camera_easing)
	return _camera_start.lerp(_camera_target, eased)


func enemy_position(id: Variant, fallback: Vector2) -> Vector2:
	if not _enemies.has(id):
		return fallback
	var entry: Dictionary = _enemies[id]
	return _interpolate_enemy(entry, _now_ms())


func is_animating() -> bool:
	if _camera_duration_ms > 0.0 and _now_ms() - _camera_started_ms < _camera_duration_ms:
		return true
	var now := _now_ms()
	for entry in _enemies.values():
		if float(entry["duration_ms"]) > 0.0 and now - float(entry["started_ms"]) < float(entry["duration_ms"]):
			return true
	return false


func set_reduced_motion(enabled: bool) -> void:
	_reduced_motion = enabled
	if not enabled:
		return
	_camera_position = _camera_target
	_camera_start = _camera_target
	_camera_duration_ms = 0.0
	for id in _enemies:
		var target: Vector2 = _enemies[id]["target"]
		_enemies[id] = {"start": target, "target": target, "started_ms": _now_ms(), "duration_ms": 0.0}


func _interpolate_enemy(entry: Dictionary, now: float) -> Vector2:
	var duration := float(entry["duration_ms"])
	if duration <= 0.0:
		return entry["target"]
	var progress := clampf((now - float(entry["started_ms"])) / duration, 0.0, 1.0)
	if progress >= 1.0:
		return entry["target"]
	return entry["start"].lerp(entry["target"], _bezier_ease_in(progress))


func _ease(progress: float, easing: String) -> float:
	if easing == "focus":
		return _cubic_bezier(progress, Vector2(0.2, 0.72), Vector2(0.22, 1.0))
	return progress


func _bezier_ease_in(progress: float) -> float:
	return _cubic_bezier(progress, Vector2(0.42, 0.0), Vector2(1.0, 1.0))


func _cubic_bezier(x: float, p1: Vector2, p2: Vector2) -> float:
	var low := 0.0
	var high := 1.0
	var t := x
	for _iteration in range(18):
		var estimated_x := _bezier_component(t, p1.x, p2.x)
		if absf(estimated_x - x) < 0.00001:
			break
		if estimated_x < x:
			low = t
		else:
			high = t
		t = (low + high) * 0.5
	return _bezier_component(t, p1.y, p2.y)


func _bezier_component(t: float, p1: float, p2: float) -> float:
	var inverse := 1.0 - t
	return 3.0 * inverse * inverse * t * p1 + 3.0 * inverse * t * t * p2 + t * t * t


func _now_ms() -> float:
	return float(_clock.call())


func _monotonic_time_ms() -> int:
	return Time.get_ticks_msec()
