extends SceneTree

const Toolbar = preload("res://scripts/map_debug_toolbar.gd")


func _initialize() -> void:
	run.call_deferred()


func run() -> void:
	var presets := ConfigFile.new()
	assert(presets.load("res://export_presets.cfg") == OK)
	assert(presets.get_value("preset.1.options", "html/experimental_virtual_keyboard", false))
	var toolbar := Toolbar.new()
	toolbar.configure({"debug_mode": true}, [{"label": "deck", "value": "deck:random"}])
	root.add_child(toolbar)
	var requests := []
	toolbar.action_requested.connect(func(action: String, payload: Dictionary) -> void:
		requests.append({"action": action, "payload": payload.duplicate(true)}))
	await process_frame
	var region: LineEdit = toolbar._region_input
	var count: LineEdit = toolbar._count_input
	for field in [region, count]:
		assert(field.virtual_keyboard_enabled)
		assert(field.virtual_keyboard_type == LineEdit.KEYBOARD_TYPE_NUMBER)
		field.grab_focus()
		field.clear()
		# Unicode-only events exercise text entry rather than map movement keys.
		for character in "12":
			var event := InputEventKey.new()
			event.pressed = true
			event.unicode = character.unicode_at(0)
			Input.parse_input_event(event)
			await process_frame
		assert(field.text == "12")
		assert(field.has_focus())
		assert(is_instance_valid(field))
	assert(toolbar.selector_values.deck_region == "12")
	assert(toolbar.selector_values.deck_count == "12")
	var generate: Button = toolbar.find_child("GenerateRegionDecksButton", true, false)
	generate.pressed.emit()
	assert(requests.back().action == "generate_region_decks")
	assert(requests.back().payload == {"region_number": "12", "deck_count": "12"})
	toolbar.queue_free()
	await process_frame
	print("PASS: mobile Web keyboard enabled, numeric keypads, Unicode entry/focus, region/count payloads")
	quit()
