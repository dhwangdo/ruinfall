extends RefCounted
class_name PortTooltipBindings

const BINDING_META := "port_tooltip_binding_installed"
const KIND_META := "port_tooltip_kind"
const PAYLOAD_META := "port_tooltip_payload"


static func bind_card(control: Control, card: Dictionary) -> void:
	_bind(control, "keyword", card)


static func bind_sticker(control: Control, sticker_id: String) -> void:
	_bind(control, "sticker", sticker_id)


static func bind_edition(control: Control, edition_id: String) -> void:
	_bind(control, "edition", edition_id)


static func bind_status(control: Control, title: String, description: String) -> void:
	_bind(control, "status", {"name": title, "description": description})


static func _bind(control: Control, kind: String, payload: Variant) -> void:
	if not is_instance_valid(control):
		return
	control.set_meta(KIND_META, kind)
	control.set_meta(PAYLOAD_META, payload.duplicate(true) if payload is Dictionary else payload)
	if control.has_meta(BINDING_META):
		return
	control.set_meta(BINDING_META, true)
	var control_ref: WeakRef = weakref(control)
	var binding_script := load("res://scripts/tooltip_bindings.gd") as GDScript
	control.mouse_entered.connect(Callable(binding_script, "_on_mouse_entered").bind(control_ref))
	control.mouse_exited.connect(Callable(binding_script, "_on_mouse_exited").bind(control_ref))
	control.tree_exiting.connect(Callable(binding_script, "_on_mouse_exited").bind(control_ref))


static func _on_mouse_entered(control_ref: WeakRef) -> void:
	var control := control_ref.get_ref() as Control if control_ref else null
	if not is_instance_valid(control) or _pointer_input_blocked(control):
		return
	var bridge := _find_bridge(control)
	if bridge:
		bridge.call("_request_info_tooltip", str(control.get_meta(KIND_META, "")),
			control.get_meta(PAYLOAD_META), control)


static func _on_mouse_exited(control_ref: WeakRef) -> void:
	var control := control_ref.get_ref() as Control if control_ref else null
	if not is_instance_valid(control):
		return
	var bridge := _find_bridge(control)
	if bridge:
		bridge.call("_clear_info_tooltip", control)


static func _find_bridge(control: Control) -> Node:
	var current: Node = control
	while is_instance_valid(current):
		if current.has_method("_request_info_tooltip") and current.has_method("_clear_info_tooltip"):
			return current
		current = current.get_parent()
	return null


static func _pointer_input_blocked(control: Control) -> bool:
	for button in [MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT, MOUSE_BUTTON_MIDDLE]:
		if Input.is_mouse_button_pressed(button):
			return true
	var viewport := control.get_viewport()
	return viewport != null and viewport.has_method("gui_is_dragging") \
		and bool(viewport.call("gui_is_dragging"))
