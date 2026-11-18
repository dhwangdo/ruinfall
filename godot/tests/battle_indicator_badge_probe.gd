extends SceneTree

const Badge = preload("res://scripts/battle_indicator_badge.gd")
const TooltipBindings = preload("res://scripts/tooltip_bindings.gd")
const CardCatalog = preload("res://scripts/card_catalog.gd")
const DeckArt = preload("res://scripts/deck_icon_art.gd")
const Editions = preload("res://scripts/deck_editions.gd")


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
		var expected_children := (2 if indicator.has("number") and indicator["number"] != "" else 1) + (1 if indicator.get("category", "") == "debuff" else 0)
		if badge is PanelContainer or badge.get_child_count() != expected_children:
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
		if str(indicator.get("category", "")) == "edition":
			assert(icon.texture == DeckArt.RARE and icon.material is ShaderMaterial)
			assert(icon.size == Vector2(36, 36) and icon.position == Vector2.ZERO)
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
	for enemy in [false, true]:
		for text in ["취약 2", "약화 1", "부식 1", "마비 1", "혼란 1"]:
			var badge := Badge.create(Badge.status(text, "디버프", enemy))
			var aura: TextureRect = badge.get_node("DebuffAura")
			assert(aura.texture.fill == GradientTexture2D.FILL_RADIAL and aura.z_index < 0)
			assert(aura.size == Vector2(44, 44) and aura.mouse_filter == Control.MOUSE_FILTER_IGNORE)
			badge.free()
	var rule_image: Image = Badge.ICONS.rule.get_image()
	assert(rule_image.get_pixel(18, 7).is_equal_approx(Color("#7736a4")), "Rule icon import still contains the old scroll")
	var radiance := CardCatalog.create_radiance_card(1)
	for edition in ["roomy", "quickHammer", "gambit", "sunkenLegend", "fantastic", "legendCassiopeia", "freeEdit", "royal"]:
		assert(not Editions.PERSISTENT_BATTLE_IDS.has(edition))
	for edition in ["firstSolitaire", "sharpLight", "cycle", "metallurgy", "prism", "giant"]:
		assert(Editions.PERSISTENT_BATTLE_IDS.has(edition))
	if not str(radiance.get("description", "")).contains("이번 턴 동안 광채의 피해량이 4 증가"):
		push_error("Radiance stacking explanation missing")
		quit(1)
		return
	print("Battle indicator badge probe passed")
	quit()
