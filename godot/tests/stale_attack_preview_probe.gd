extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")
const Preview = preload("res://scripts/battle_card_preview.gd")

func _initialize() -> void:
	var game := preload("res://scripts/main.gd").new()
	game.screen_name = "battle"
	var state := Rules.start_battle([], 70, {"enemies": [
		{"hp": 100, "actions": [{"damage": 0}]},
		{"hp": 100, "actions": [{"damage": 0}]}
	]}, 70)
	var strike: Dictionary = Catalog.STARTER_CARDS[0].duplicate(true)
	strike.id = 101
	state.player_weak = 2
	state.enemies[0].hp = 0
	state.preview_target_enemy_index = 0
	state.target_enemy_index = 1
	Rules._load_enemy_aliases(state, 1)
	game.battle_state = state
	var shown: String = game._card_description(strike)
	print("Previously selected dead enemy, strength 0, weak 2: ", shown)
	if not shown.contains("피해를 3 줍니다."):
		push_error("Stale enemy preview turns normal Strike damage into zero")
		game.free()
		quit(1)
		return
	# A living enemy with defense must not affect ordinary file/hand descriptions.
	state.enemies[0].hp = 100
	state.enemies[0].physical_block = 100
	assert(game._card_description(strike).contains("피해를 3 줍니다."))
	assert(Preview.describe(strike, strike.description, state).contains("피해를 0 줍니다."), "Explicit enemy hover still includes block")
	state.strength = 4
	state.pending_strength_loss = 4
	assert(game._card_description(strike).contains("피해를 5 줍니다."))
	Rules._expire_temporary_bonuses(state)
	assert(state.strength == 0)
	assert(game._card_description(strike).contains("피해를 3 줍니다."))
	var manual: Dictionary = Catalog.BASIC_CARDS.filter(func(c): return c.effect == "combat_manual")[0].duplicate(true)
	state.hand = [strike, manual]
	assert(game._card_description(strike).contains("피해를 4 줍니다."))
	state.hand = [strike]
	assert(game._card_description(strike).contains("피해를 3 줍니다."))
	state = Rules.select_enemy_target(state, 1)
	var result := Rules.play_card(state, strike.id)
	assert(result.enemies[1].hp == 97, "Actual damage remains three after temporary/held strength is gone")
	game.free()
	print("PASS: stale dead/blocked targets cannot alter ordinary card text; explicit target preview and strength expiry/weakness damage remain correct")
	quit()
