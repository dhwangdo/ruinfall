extends Control
signal finished(cancelled: bool)
const DURATION := 0.350
const BEZIER_X1 := 0.2
const BEZIER_Y1 := 0.76
const BEZIER_X2 := 0.3
const BEZIER_Y2 := 1.0
var source: Control
var visual_builder: Callable
var reduced_motion := false
var ghost: Control
var _original_modulate := Color.WHITE
var _base_position := Vector2.ZERO
var _done := false
var _tween: Tween

func configure(source_control: Control, builder: Callable, reduced: bool = false) -> void:
    source = source_control
    visual_builder = builder
    reduced_motion = reduced
    if is_instance_valid(source):
        _original_modulate = source.modulate
        source.tree_exiting.connect(_on_source_exiting, CONNECT_ONE_SHOT)
    tree_exiting.connect(_on_helper_exiting, CONNECT_ONE_SHOT)

func play() -> void:
    if _done: return
    if not is_instance_valid(source) or not source.is_inside_tree() or not visual_builder.is_valid():
        _finish(false)
        return
    if reduced_motion:
        _finish(false)
        return
    var source_rect := source.get_global_rect()
    ghost = visual_builder.call()
    if not is_instance_valid(ghost):
        _finish(false)
        return
    mouse_filter = Control.MOUSE_FILTER_IGNORE
    global_position = source_rect.position
    _base_position = position
    size = source_rect.size
    z_index = 30
    z_as_relative = false
    pivot_offset = source_rect.size * 0.5
    ghost.position = Vector2.ZERO
    ghost.size = source_rect.size
    ghost.pivot_offset = source_rect.size * 0.5
    ghost.rotation = source.rotation
    ghost.scale = source.scale
    add_child(ghost)
    _make_inert(ghost)
    source.modulate.a = 0.0
    _tween = create_tween()
    var points := [Vector3(0, 0, 1), Vector3(0.18, -16, 0.96), Vector3(0.55, 610, 1.07), Vector3(0.67, 575, 1.03), Vector3(1, 0, 1)]
    for i in range(points.size() - 1):
        var a: Vector3 = points[i]
        var b: Vector3 = points[i + 1]
        _tween.tween_method(Callable(self, "_set_segment").bind(a, b), 0.0, 1.0, float(b.x - a.x) * DURATION).set_trans(Tween.TRANS_LINEAR)
    _tween.finished.connect(func(): _finish(false), CONNECT_ONE_SHOT)

func cancel() -> void:
    _finish(true)

func _set_segment(t: float, a: Vector3, b: Vector3) -> void:
    if _done: return
    var eased := _bezier_ease(t)
    position.y = _base_position.y + lerpf(float(a.y), float(b.y), eased)
    scale = Vector2.ONE * lerpf(float(a.z), float(b.z), eased)

func _bezier_ease(x: float) -> float:
    var lo := 0.0
    var hi := 1.0
    var t := x
    for _i in range(18):
        if _cubic(t, BEZIER_X1, BEZIER_X2) < x: lo = t
        else: hi = t
        t = (lo + hi) * 0.5
    return _cubic(t, BEZIER_Y1, BEZIER_Y2)

func _cubic(t: float, p1: float, p2: float) -> float:
    var u := 1.0 - t
    return 3.0 * u * u * t * p1 + 3.0 * u * t * t * p2 + t * t * t

func _make_inert(node: Node) -> void:
    if node is Control:
        node.mouse_filter = Control.MOUSE_FILTER_IGNORE
        node.focus_mode = Control.FOCUS_NONE
    for child in node.get_children():
        _make_inert(child)

func _restore() -> void:
    if is_instance_valid(source):
        source.modulate = _original_modulate
    if is_instance_valid(ghost):
        if ghost.get_parent() == self:
            remove_child(ghost)
        ghost.queue_free()
    ghost = null

func _finish(cancelled: bool) -> void:
    if _done: return
    _done = true
    if is_instance_valid(_tween): _tween.kill()
    _restore()
    finished.emit(cancelled)

func _on_source_exiting() -> void:
    _finish(true)

func _on_helper_exiting() -> void:
    _finish(true)

