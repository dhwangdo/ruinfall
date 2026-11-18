extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")
const Bindings = preload("res://scripts/tooltip_bindings.gd")

class Game extends "res://scripts/main.gd":
	func _ready() -> void:
		_install_theme()
	func _process(_delta: float) -> void:
		pass


func _initialize() -> void:
	_run.call_deferred()


func _run() -> void:
	root.size = Vector2i(1280, 850)
	root.content_scale_mode = Window.CONTENT_SCALE_MODE_DISABLED
	var game := Game.new()
	game.size = Vector2(root.size)
	root.add_child(game)
	game.run_state = {"deck": [], "max_hp": 70, "player_name": "효과 확인"}
	game.battle_state = Rules.start_battle([], 70, {"enemies": [
		{"name": "쥐", "hp": 100, "max_hp": 100, "actions": [{"damage": 4}]}
	]}, 70)
	game.battle_state.merge({"player_weak": 2, "player_vulnerable": 3, "player_corrosion": 1,
		"player_paralysis": 1, "player_confusion": 2, "strength": 4, "agility": 5,
		"magic_resistance": 2, "player_block": 12, "pending_strength_loss": 1,
		"deck_editions": ["gambit", "roomy", "freeEdit", "cycle", "prism", "giant"],
		"pending_foresight_draws": 4, "pending_iron_song": [{"turns": 2, "amount": 5}],
		"pending_radiance": [{"turns": 2, "count": 3}]}, true)
	for card in Catalog.RARE_CARDS:
		if card.get("rule", false):
			game.battle_state.active_rule_cards.append(card.duplicate(true))
	game._show_battle()
	for frame in 8:
		await process_frame
	var portrait := game.find_child("PlayerPortrait", true, false) as Control
	assert(portrait.get_meta(Bindings.KIND_META) == "effects")
	var motion := InputEventMouseMotion.new()
	motion.position = portrait.get_global_rect().get_center()
	root.push_input(motion, true)
	for frame in 8:
		await process_frame
	assert(game.card_info_tooltip.current_kind == "effects", "Actual player hover must open the aggregate tooltip")
	var sections: Array = game.card_info_tooltip._sections
	var titles := []
	var debuffs := 0
	var editions := 0
	for section in sections:
		titles.append(section.title)
		debuffs += int(section.kind == "debuff")
		editions += int(section.kind == "edition")
	assert(debuffs == 5 and editions == 3)
	for title in ["약화 2", "취약 3", "힘 4", "강인함 5", "방어 12", "마법 저항 2", "턴 종료 시 감소", "예지", "철의 노래", "광행시간"]:
		assert(titles.has(title), "Missing effect: " + title)
	var view: Control = game.card_info_tooltip._get_ref(game.card_info_tooltip._view_ref)
	assert(view != null and view.modulate.a == 1.0)
	assert(view.get_preferred_size().x > 310, "Tall effect stacks should spread into columns")
	assert(view.get_preferred_size().x <= 1256 and view.get_preferred_size().y <= 826)
	motion.position = Vector2(700, 800)
	root.push_input(motion, true)
	await process_frame
	assert(game.card_info_tooltip.current_kind == "")
	game.queue_free()
	await process_frame
	print("PASS: real player hover, all effect categories/counts, hidden editions omitted, multi-column bounds, leave cleanup")
	quit()
