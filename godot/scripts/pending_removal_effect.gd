extends Control

const PHASE_USEC := 525_000
const TRANSITION_USEC := 180_000
const DIM_ALPHA := 0.3
const DIM_SATURATION := 0.25
const BADGE_SIZE := 18.0
const BADGE_INSET := 3.0
const BADGE_COLOR := Color("#a83c35")
const BADGE_SVG := """<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><path fill=\"#ffffff\" d=\"M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 12H8L7 9Zm3 2v8h2v-8h-2Zm4 0v8h-2v-8h2Z\"/></svg>"""
const GROUP_NAME := "PendingRemovalCanvasGroup"
const FRAME_NAME := "PendingRemovalFrame"
const WRAPPER_NAME := "CompactCardWrapper"

var _view_ref: WeakRef
var _group_ref: WeakRef
var _editor_started_usec := 0
var _reduced_motion := false
var _base_modulate := Color.WHITE
var _base_panel_style: StyleBox
var _material: ShaderMaterial
var _badge: TextureRect
var _configured := false


func _ready() -> void:
	name = "PendingRemovalEffect"
	anchors_preset = Control.PRESET_FULL_RECT
	offset_left = 0.0
	offset_top = 0.0
	offset_right = 0.0
	offset_bottom = 0.0
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_index = 4
	if _has_skip_metadata(get_parent()):
		disable_for_drag_preview()


func configure(
	view: Control,
	editor_started_usec: int,
	reduced_motion := false,
	filter_shader: Shader = null,
	badge_texture: Texture2D = null
) -> bool:
	if not is_instance_valid(view) or _has_skip_metadata(view):
		return false
	var content_group := _ensure_content_group(view)
	if content_group == null:
		return false
	if filter_shader == null:
		filter_shader = load("res://shaders/pending_removal_filter.gdshader") as Shader
	if badge_texture == null:
		badge_texture = _make_badge_texture()
	if filter_shader == null or badge_texture == null:
		return false
	
	_view_ref = weakref(view)
	_group_ref = weakref(content_group)
	_editor_started_usec = editor_started_usec
	_reduced_motion = reduced_motion
	_base_modulate = view.modulate
	var panel_style: StyleBox = view.get_meta("pending_removal_base_panel_style", view.get_theme_stylebox("panel"))
	if panel_style != null:
		_base_panel_style = panel_style.duplicate() as StyleBox
		view.set_meta("pending_removal_base_panel_style", _base_panel_style)
	view.set_meta("pending_removal_base_modulate", _base_modulate)
	view.set_meta("pending_removal_editor_started_usec", editor_started_usec)
	_material = ShaderMaterial.new()
	_material.shader = filter_shader
	content_group.material = _material
	_add_badge(badge_texture)
	_configured = true
	set_process(true)
	update_for_elapsed_usec(maxi(0, Time.get_ticks_usec() - _editor_started_usec))
	return true


func update_for_elapsed_usec(elapsed_usec: int) -> void:
	if not _configured:
		return
	var view := _valid_view()
	var group := _valid_group()
	if view == null or group == null:
		set_process(false)
		return
	var elapsed := maxi(0, elapsed_usec)
	var phase := elapsed / PHASE_USEC
	var phase_time := elapsed % PHASE_USEC
	var dim_phase := phase % 2 == 1
	var alpha := 1.0
	var saturation := 1.0
	if phase > 0:
		var progress := 1.0 if _reduced_motion else _css_ease(float(phase_time) / float(TRANSITION_USEC))
		alpha = lerpf(1.0, DIM_ALPHA, progress) if dim_phase else lerpf(DIM_ALPHA, 1.0, progress)
		saturation = lerpf(1.0, DIM_SATURATION, progress) if dim_phase else lerpf(DIM_SATURATION, 1.0, progress)
	var next_modulate := _base_modulate
	next_modulate.a *= alpha
	# CSS opacity composites the complete card once, including its background.
	view.modulate = Color.WHITE
	group.self_modulate = next_modulate
	_material.set_shader_parameter("saturation", saturation)


func is_effect_active() -> bool:
	return _configured


func _process(_delta: float) -> void:
	if _has_skip_metadata(get_parent()):
		disable_for_drag_preview()
		return
	if not _configured:
		set_process(false)
		return
	update_for_elapsed_usec(maxi(0, Time.get_ticks_usec() - _editor_started_usec))


func disable_for_drag_preview() -> void:
	set_process(false)
	var view := get_parent() as Control
	if view != null and view.has_meta("pending_removal_base_modulate"):
		view.modulate = view.get_meta("pending_removal_base_modulate")
		view.remove_meta("pending_removal_editor_started_usec")
		if view.has_meta("pending_removal_base_panel_style"):
			view.add_theme_stylebox_override("panel", view.get_meta("pending_removal_base_panel_style"))
	var group := _find_group(view)
	if group != null:
		group.material = null
		group.self_modulate = Color.WHITE
		var frame := group.get_node_or_null(FRAME_NAME) as Control
		if frame != null:
			frame.hide()
	if _badge != null and is_instance_valid(_badge):
		_badge.self_modulate = BADGE_COLOR
	_configured = false


static func restore_drag_preview(root: Node) -> void:
	if root == null:
		return
	var pending: Array[Node] = [root]
	while not pending.is_empty():
		var node: Node = pending.pop_back()
		if node.name == "PendingRemovalEffect" and node.has_method("disable_for_drag_preview"):
			node.call("disable_for_drag_preview")
		elif node is CanvasGroup and (node as CanvasGroup).name == GROUP_NAME:
			(node as CanvasGroup).material = null
			(node as CanvasGroup).self_modulate = Color.WHITE
			var frame := node.get_node_or_null(FRAME_NAME) as Control
			if frame != null:
				frame.hide()
		if node is Control and node.has_meta("pending_removal_base_modulate"):
			(node as Control).modulate = node.get_meta("pending_removal_base_modulate")
			if node.has_meta("pending_removal_base_panel_style"):
				(node as Control).add_theme_stylebox_override("panel", node.get_meta("pending_removal_base_panel_style"))
		for child in node.get_children():
			pending.append(child)


func _ensure_content_group(view: Control) -> CanvasGroup:
	var existing := view.get_node_or_null(GROUP_NAME) as CanvasGroup
	if existing != null:
		return existing
	var wrapper := view.get_node_or_null(WRAPPER_NAME) as Control
	if wrapper == null:
		return null
	var child_index := wrapper.get_index()
	view.remove_child(wrapper)
	var group := CanvasGroup.new()
	group.name = GROUP_NAME
	group.position = Vector2.ZERO
	view.add_child(group)
	view.move_child(group, mini(child_index, view.get_child_count() - 1))
	var base_style := view.get_theme_stylebox("panel")
	if base_style != null:
		view.set_meta("pending_removal_base_panel_style", base_style.duplicate() as StyleBox)
		var frame := Panel.new()
		frame.name = FRAME_NAME
		frame.size = view.size
		frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
		frame.add_theme_stylebox_override("panel", base_style.duplicate() as StyleBox)
		group.add_child(frame)
		view.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	group.add_child(wrapper)
	wrapper.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	wrapper.position = Vector2.ZERO
	wrapper.size = view.size
	return group


func _add_badge(badge_texture: Texture2D) -> void:
	var badge := TextureRect.new()
	badge.name = "PendingRemovalBadge"
	var view := _valid_view()
	var group := _valid_group()
	if view == null or group == null:
		badge.free()
		return
	badge.position = view.size - Vector2.ONE * (BADGE_SIZE + BADGE_INSET)
	badge.size = Vector2.ONE * BADGE_SIZE
	badge.custom_minimum_size = Vector2.ONE * BADGE_SIZE
	badge.texture = badge_texture
	badge.self_modulate = BADGE_COLOR
	badge.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	badge.stretch_mode = TextureRect.STRETCH_SCALE
	badge.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
	badge.z_index = 4
	group.add_child(badge)
	_badge = badge
	badge.material = null


func _make_badge_texture() -> Texture2D:
	var svg := FileAccess.get_file_as_string("res://assets/pending_removal_badge.svg")
	if svg.is_empty():
		svg = BADGE_SVG
	var image := Image.new()
	if image.load_svg_from_string(svg, 3.0) != OK:
		return null
	return ImageTexture.create_from_image(image)


func _valid_view() -> Control:
	if _view_ref == null:
		return null
	var view: Variant = _view_ref.get_ref()
	return view as Control if is_instance_valid(view) else null


func _valid_group() -> CanvasGroup:
	if _group_ref == null:
		return null
	var group: Variant = _group_ref.get_ref()
	return group as CanvasGroup if is_instance_valid(group) else null


func _find_group(view: Control) -> CanvasGroup:
	if view == null:
		return null
	return view.get_node_or_null(GROUP_NAME) as CanvasGroup


func _has_skip_metadata(node: Node) -> bool:
	var current := node
	while current != null:
		if current.has_meta("skip_pending_removal_effect") and bool(current.get_meta("skip_pending_removal_effect")):
			return true
		current = current.get_parent()
	return false


func _css_ease(progress: float) -> float:
	var target_x := clampf(progress, 0.0, 1.0)
	var low := 0.0
	var high := 1.0
	var parameter := target_x
	for _iteration in range(14):
		parameter = (low + high) * 0.5
		if _bezier(parameter, 0.25, 0.25) < target_x:
			low = parameter
		else:
			high = parameter
	return _bezier(parameter, 0.1, 1.0)


func _bezier(parameter: float, first: float, second: float) -> float:
	var inverse := 1.0 - parameter
	return 3.0 * inverse * inverse * parameter * first \
		+ 3.0 * inverse * parameter * parameter * second \
		+ parameter * parameter * parameter
