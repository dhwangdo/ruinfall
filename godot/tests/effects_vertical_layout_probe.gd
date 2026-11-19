extends SceneTree

const Controller = preload("res://scripts/card_tooltip_controller.gd")


func _initialize() -> void:
	_run.call_deferred()


func _run() -> void:
	root.content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	var host := Control.new()
	root.add_child(host)
	var controller := Controller.new()
	var anchor := Control.new()
	anchor.size = Vector2(50, 50)
	host.add_child(anchor)
	var effects := [
		{"kind": "debuff", "payload": {"name": "취약 3", "description": "받는 공격 피해가 50% 증가합니다.", "icon_id": "vulnerable"}},
		{"kind": "status", "payload": {"name": "힘 2", "description": "공격의 각 타격에 피해를 2만큼 추가합니다. 직접 카드를 낼 때만 적용됩니다.", "icon_id": "buff"}},
		{"kind": "status", "payload": {"name": "강인함 2", "description": "방어를 얻을 때 2만큼 추가로 얻습니다. 직접 카드를 낼 때만 적용됩니다.", "icon_id": "shield"}},
		{"kind": "rule", "payload": {"name": "사서의 특권", "description": "룰. 턴 시작 시 카드를 1장 뽑습니다.", "icon_id": "rule"}},
	]
	for viewport in [Vector2i(1280, 850), Vector2i(1050, 480)]:
		root.size = viewport
		host.size = Vector2(viewport)
		for position in [Vector2(30, 20), Vector2(70, viewport.y * 0.5), Vector2(110, viewport.y - 80)]:
			anchor.position = position
			controller.request(host, "effects", effects, anchor)
			for frame in 16:
				await process_frame
			var view: Control = controller._get_ref(controller._view_ref)
			assert(view != null and view.modulate.a == 1.0)
			assert(view._sections_root is VBoxContainer, "Four effects must stay vertical regardless of anchor position")
			assert(view.get_preferred_size().x == 310.0)
			assert(view.get_global_rect().position.y >= 12 and view.get_global_rect().end.y <= viewport.y - 12)
			controller.clear()
			await process_frame
	host.queue_free()
	await process_frame
	print("PASS: four effect tooltips stay in one vertical column at top/middle/bottom in two viewports")
	quit()
