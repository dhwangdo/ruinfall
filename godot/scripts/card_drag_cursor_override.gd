extends Control

var suppress_forbidden_cursor := false
var _cursor_overridden := false
var _cursor_shape_before_drag := DisplayServer.CURSOR_ARROW
var _has_saved_cursor_shape := false


func _ready() -> void:
	set_process(false)
	if suppress_forbidden_cursor:
		# force_drag may notify existing nodes before adding its preview.
		_cursor_shape_before_drag = DisplayServer.cursor_get_shape()
		_has_saved_cursor_shape = true
		call_deferred("_apply_drag_cursor")


func _input(_event: InputEvent) -> void:
	var viewport := get_viewport()
	if suppress_forbidden_cursor and viewport != null and viewport.gui_is_dragging():
		# Run after this input event's Control hover/drop cursor update so the
		# native forbidden glyph cannot remain set for the rendered frame.
		call_deferred("_apply_drag_cursor")


func _notification(what: int) -> void:
	if what == NOTIFICATION_DRAG_BEGIN and suppress_forbidden_cursor:
		if not _has_saved_cursor_shape:
			_cursor_shape_before_drag = DisplayServer.cursor_get_shape()
			_has_saved_cursor_shape = true
		call_deferred("_apply_drag_cursor")
	if what == NOTIFICATION_DRAG_END:
		_restore_cursor()


func _exit_tree() -> void:
	_restore_cursor()


func _apply_drag_cursor() -> void:
	var viewport := get_viewport()
	if not suppress_forbidden_cursor or viewport == null or not viewport.gui_is_dragging():
		return
	DisplayServer.cursor_set_shape(DisplayServer.CURSOR_ARROW)
	_cursor_overridden = true


func _restore_cursor() -> void:
	if not _cursor_overridden:
		return
	DisplayServer.cursor_set_shape(
		_cursor_shape_before_drag if _has_saved_cursor_shape else DisplayServer.CURSOR_ARROW)
	# Viewport finishes its own drag cursor reset after removing the preview.
	DisplayServer.cursor_set_shape.call_deferred(
		_cursor_shape_before_drag if _has_saved_cursor_shape else DisplayServer.CURSOR_ARROW)
	_cursor_overridden = false
	_has_saved_cursor_shape = false
