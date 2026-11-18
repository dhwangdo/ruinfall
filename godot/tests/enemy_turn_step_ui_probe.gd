extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Presentation = preload("res://scripts/battle_turn_presentation.gd")
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
	var game := Game.new()
	game.size = Vector2(root.size)
	root.add_child(game)
	game.run_state = {"deck": [], "max_hp": 70, "player_name": "확인"}
	game.battle_state = Rules.start_battle([], 70, {"enemies": [
		{"name": "확인 적", "hp": 100, "max_hp": 100, "actions": [
			{"name": "복합 행동", "damage": 4, "hits": 2, "player_vulnerable_gain": 2, "strength_gain": 3}
		]}
	]}, 70)
	game.battle_state.hand = []
	game._show_battle()
	for frame in 5:
		await process_frame
	var resolved: Dictionary = game.battle_state.duplicate(true)
	var trace := {}
	Rules._resolve_enemies_turn(resolved, trace)
	var presenter := Presentation.new()
	var steps: Array = presenter._completed_intent_steps(trace.steps)
	assert(steps.size() == 4)
	assert(not steps[0].attack_complete and not steps[0].effects_complete)
	assert(steps[1].attack_complete and not steps[1].effects_complete)
	assert(steps[2].effect_state.player_vulnerable == 2)
	assert(not steps[2].effects_complete and steps[3].effects_complete)
	game.battle_turn_resolving = true
	game.battle_draw_presentation.active = true
	var ticket: int = game.battle_draw_presentation.generation
	for step in steps:
		var index: int = steps.find(step)
		if index == 0:
			presenter._present_enemy_step(game, ticket, step)
			await create_timer(0.21).timeout
			var source: Control = game.battle_enemy_widgets[0]
			var intent = source.find_child("EnemyIntentRow", true, false).get_child(0)
			assert(intent.consumed_hits == 1 and intent.visible, "First sword disappears at impact, before the lunge finishes")
			assert(game.battle_draw_presentation.active_flights.ghost.find_child("EnemyIntentRow", true, false).get_child(0).consumed_hits == 1)
			await create_timer(0.4).timeout
		elif index == 2:
			presenter._present_enemy_step(game, ticket, step)
			await process_frame
			var flow := game.find_child("BattlePlayerIndicators", true, false)
			var effects: Array = Bindings.collect_effects(flow)
			var found := false
			for effect in effects:
				if str(effect.payload.get("name", "")) == "취약 2":
					found = true
			assert(found, "Vulnerable count must change as the animation starts")
			var actor: Control = game.battle_enemy_widgets[0]
			var description: Label = actor.get_meta("intent_description_label")
			assert(not description.text.contains("취약") and description.text.contains("힘"), "Remove the performed effect immediately, keeping the pending buff")
			var ghost: Control = game.battle_draw_presentation.active_flights.ghost
			assert(ghost.get_meta("intent_description_label").text == description.text)
			assert(presenter.player_popup_kind == "damage", "Enemy effects must not create text popups")
			assert(presenter.enemy_popups.is_empty())
			await create_timer(0.6).timeout
		elif index == 3:
			presenter._present_enemy_step(game, ticket, step)
			await process_frame
			assert(not game.battle_enemy_widgets[0].find_child("EnemyIntentDescription", true, false).visible)
			await create_timer(0.3).timeout
		else:
			assert(await presenter._present_enemy_step(game, ticket, step))
		var enemy: Control = game.battle_enemy_widgets[0]
		var row := enemy.find_child("EnemyIntentRow", true, false)
		assert(row.get_child(0).visible == (index == 0))
		assert(row.get_child(0).consumed_hits == mini(index + 1, 2), "Each impact consumes exactly one sword")
		assert(row.get_node("EnemyIntentDescription").visible == (index < 3))
	assert(game.battle_state.player_vulnerable == 0, "Presentation must not mutate authoritative state")
	game.queue_free()
	await process_frame
	print("PASS: step snapshots, immediate debuff counts, no effect popups, per-phase intent removal, multihit timing, authoritative state preserved")
	quit()
