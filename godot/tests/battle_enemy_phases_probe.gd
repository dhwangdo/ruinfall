extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Catalog = preload("res://scripts/enemy_catalog.gd")
const Intent = preload("res://scripts/battle_enemy_intent.gd")
const Strike = preload("res://scripts/battle_enemy_strike.gd")


func enemy(action: Dictionary, extra: Dictionary = {}) -> Dictionary:
	var value := {"name": "probe", "hp": 100, "max_hp": 100, "actions": [action], "action_index": 0}
	value.merge(extra, true)
	return value


func state(enemies: Array) -> Dictionary:
	return Rules.start_battle([], 1000, {"enemies": enemies}, 1000)


func _initialize() -> void:
	run.call_deferred()


func run() -> void:
	# Both ordering permutations must produce the same attack damage. New statuses do not decay.
	for reverse in [false, true]:
		var enemies := [enemy({"name": "curse", "next_turn_player_vulnerable_gain": 2}),
			enemy({"name": "hit", "damage": 10, "strength_gain": 3})]
		if reverse:
			enemies.reverse()
		var before := state(enemies)
		var trace := {}
		var after := Rules.end_turn(before, {}, trace)
		assert(after.player_hp == 990, "new vulnerability affected the attack phase")
		assert(after.player_vulnerable == 2, "new vulnerability lost duration")
		assert(before.player_hp == 1000, "input mutated")
		var effects_started := false
		for step in trace.steps:
			if step.attack:
				assert(not effects_started, "attack occurred after an effect")
			else:
				effects_started = true
			assert(not str(step.get("message", "")).contains("다음 턴"))
		var attacker: Dictionary = after.enemies[0 if reverse else 1]
		assert(attacker.strength == 3)

	# Old vulnerability covers every attack, then decays before new vulnerability is added.
	var before := state([enemy({"damage": 10, "next_turn_player_vulnerable_gain": 2}), enemy({"damage": 10})])
	before.player_vulnerable = 1
	before.player_weak = 2
	var after := Rules.end_turn(before)
	assert(after.player_hp == 970)
	assert(after.player_vulnerable == 2 and after.player_weak == 1)

	# Buff-only patterns cannot attack using accumulated strength.
	before = state([enemy({"strength_gain": 3}, {"strength": 20})])
	after = Rules.end_turn(before)
	assert(after.player_hp == 1000 and after.enemies[0].strength == 23)
	assert(not Catalog.intent_text(before.enemies[0]).contains("피해"))
	assert(Intent.description({"next_turn_player_weak_gain": 2}, {}) == "약화 2 부여")

	# Stun cancels both phases and preserves the cancelled action for next turn.
	before = state([enemy({"damage": 10, "next_turn_player_weak_gain": 2, "strength_gain": 3}, {"stunned": true})])
	before.enemies[0].weak = 2
	after = Rules.end_turn(before)
	assert(after.player_hp == 1000 and after.player_weak == 0)
	assert(after.enemies[0].strength == 0 and after.enemies[0].weak == 1)
	assert(not after.enemies[0].stunned)

	# Self-inflicted weakness is added after decay; multi-hit uses old weakness throughout.
	before = state([enemy({"damage": 10, "hits": 2, "weak_gain": 1}, {"weak": 1})])
	after = Rules.end_turn(before)
	assert(after.player_hp == 990 and after.enemies[0].weak == 1)

	# Lethal attack stops the effects phase. Suicide stops that enemy's later effects.
	before = state([enemy({"damage": 2000, "strength_gain": 5})])
	after = Rules.end_turn(before)
	assert(after.status == "lost" and after.enemies[0].strength == 0)
	before = state([enemy({"damage": 10, "self_destruct": true, "strength_gain": 5}), enemy({"damage": 10})])
	after = Rules.end_turn(before)
	assert(after.player_hp == 980 and after.enemies[0].hp == 0 and after.enemies[0].strength == 0)

	# Summons are created after both phases and never attack in their creation turn.
	before = state([enemy({"summon": "roachHatchling"})])
	after = Rules.end_turn(before)
	assert(after.enemies.size() == 3 and after.player_hp == 1000)

	# Exercise every current encounter, including rests, multi-hit, summon and boss patterns.
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	for encounter_index in range(1, 86):
		var current := Rules.start_battle([], 10000, Catalog.create_encounter(encounter_index, rng), 10000)
		for turn in 4:
			var trace := {}
			current = Rules.end_turn(current, {}, trace)
			var effects_started := false
			for step in trace.steps:
				if step.attack:
					assert(not effects_started)
				elif step.get("motion", "none") in ["buff", "debuff"]:
					effects_started = true
			if current.status != "playing":
				break

	# Motion stays horizontal, and cancellation restores the source.
	var source := Control.new()
	source.size = Vector2(100, 100)
	root.add_child(source)
	var strike := Strike.new()
	root.add_child(strike)
	strike.configure(source, func(): return Control.new())
	strike.play()
	strike._set_segment(1.0, Vector3(0, 0, 1), Vector3(0.38, -28, 1))
	assert(strike.position.x < 0 and strike.position.y == 0)
	strike.cancel()
	assert(source.modulate.a == 1.0)
	strike.queue_free()
	source.queue_free()
	await process_frame
	print("PASS: attack/effect phases, duration, ordering, stun, no phantom attacks, multi-hit, lethal, suicide, summons, 85 encounters, motion cleanup")
	quit()
