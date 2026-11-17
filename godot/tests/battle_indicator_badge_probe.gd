extends SceneTree

const Badge = preload("res://scripts/battle_indicator_badge.gd")
const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")
const CardCatalog = preload("res://scripts/card_catalog.gd")


func _initialize() -> void:
	var examples := [
		Badge.status("취약 2", "받는 피해 증가"),
		Badge.status("힘 2", "공격 피해 증가"),
		{"id": "edition_sharpLight", "category": "edition", "text": "날카로운 빛",
			"tooltip_kind": "edition", "edition_id": "sharpLight"},
		{"id": "rule", "category": "rule", "text": "광학 연구",
			"tooltip_kind": "card", "card": {"name": "광학 연구", "description": "룰 효과"}},
		Badge.status("거미줄", "솔리테어 행동에 반응", true),
		Badge.status("행동 불가 1", "행동을 건너뜁니다", true),
		Badge.status("힘 -2", "공격 피해 감소"),
	]
	for indicator in examples:
		var badge := Badge.create(indicator)
		if badge is PanelContainer or badge.get_child_count() != (2 if indicator.has("number") and indicator["number"] != "" else 1):
			push_error("Indicator still contains a box or text: %s" % indicator)
			quit(1)
			return
		var icon := badge.get_child(0) as TextureRect
		if icon == null or icon.size.x < 32:
			push_error("Indicator icon is too small: %s" % indicator)
			quit(1)
			return
		if badge.get_meta(TooltipBindings.KIND_META, "") == "":
			push_error("Indicator tooltip missing: %s" % indicator)
			quit(1)
			return
		if str(indicator.get("category", "")) == "debuff" \
				and badge.get_meta(TooltipBindings.KIND_META, "") != "debuff":
			push_error("Debuff tooltip is not purple: %s" % indicator)
			quit(1)
			return
		if str(indicator.get("category", "")) != "debuff" \
				and badge.get_meta(TooltipBindings.KIND_META, "") == "debuff":
			push_error("Non-core status has a purple tooltip: %s" % indicator)
			quit(1)
			return
		badge.free()
	var radiance := CardCatalog.create_radiance_card(1)
	if not str(radiance.get("description", "")).contains("이번 턴 동안 광채의 피해량이 4 증가"):
		push_error("Radiance stacking explanation missing")
		quit(1)
		return
	print("Battle indicator badge probe passed")
	quit()
