extends SceneTree

const Rules = preload("res://scripts/battle_rules.gd")
const Status = preload("res://scripts/battle_status_rules.gd")
const Catalog = preload("res://scripts/card_catalog.gd")
const Preview = preload("res://scripts/battle_card_preview.gd")
var serial := 100


func card(effect: String) -> Dictionary:
	for pool in [Catalog.STARTER_CARDS, Catalog.BASIC_CARDS, Catalog.SPECIAL_CARDS, Catalog.RARE_CARDS]:
		for blueprint in pool:
			if blueprint.effect == effect:
				var result: Dictionary = blueprint.duplicate(true)
				serial += 1
				result.merge({"id": serial, "revealed": true}, true)
				return result
	assert(false, effect)
	return {}


func state(action: Dictionary = {}) -> Dictionary:
	var result := Rules.start_battle([], 1000, {"name": "probe", "hp": 1000, "actions": [action]}, 1000)
	result.energy = 99
	return result


func play(before: Dictionary, effect: String) -> Dictionary:
	var value := card(effect)
	before.hand.append(value)
	return Rules.play_card(before, value.id)


func _initialize() -> void:
	var before := state()
	before.magic_resistance = 2
	for kind in Status.DEBUFFS:
		assert(Status.apply_player_debuff(before, kind, 3) == 1)
		assert(Status.apply_player_debuff(before, kind, 2) == 0)
		assert(before["player_" + kind] == 1)
	assert(before.magic_resistance == 2, "resistance must never be consumed")
	assert(Status.apply_player_debuff(before, "strength", 99) == 0)
	assert(not before.has("player_strength"))

	before = play(state({"player_weak_gain": 3, "player_vulnerable_gain": 2, "player_corrosion_gain": 1,
		"player_paralysis_gain": 3, "player_confusion_gain": 2, "strength_loss": 2}), "blessing")
	before.strength = 5
	var after := Rules.end_turn(before)
	assert(after.player_weak == 1 and after.player_vulnerable == 0 and after.player_corrosion == 0)
	assert(after.player_paralysis == 1 and after.player_confusion == 0)
	assert(after.pending_magic_resistance_loss == 0 and after.magic_resistance == 0 and after.strength == 3)
	before = play(play(state(), "resilience"), "resilience")
	assert(before.magic_resistance == 2 and before.exhausted.size() == 2)
	after = Rules.end_turn(before)
	assert(after.magic_resistance == 2)
	before = play(play(state(), "resilience"), "blessing")
	assert(before.magic_resistance == 3 and before.pending_magic_resistance_loss == 2)
	after = Rules.end_turn(before)
	assert(after.magic_resistance == 1 and after.pending_magic_resistance_loss == 0)

	# Cleanse before damage, including its preview; resistance grants no magic block.
	before = state()
	before.player_weak = 3
	var strike := card("brave_strike")
	assert(Preview.describe(strike, strike.description, before).contains("피해를 12"))
	before.hand = [strike]
	after = Rules.play_card(before, strike.id)
	assert(after.player_weak == 0 and after.enemies[0].hp == 988)
	for effect in ["patch_gap", "sharpen_edge", "composure", "cover_weakness"]:
		before = state()
		before.player_weak = 3
		before.player_vulnerable = 3
		after = play(before, effect)
		var removes: Dictionary = card(effect).get("remove_player_debuffs", {})
		assert(after.player_weak == 3 - int(removes.get("weak", 0)))
		assert(after.player_vulnerable == 3 - int(removes.get("vulnerable", 0)))
	for effect in ["silver_sword", "ice_shield", "safeguard"]:
		before = state()
		after = play(before, effect)
		assert(after.magic_resistance == int(card(effect).temporary_magic_resistance))
		assert(after.pending_magic_resistance_loss == int(card(effect).temporary_magic_resistance))
		assert(after.player_block == int(card(effect).get("value", 0)) if effect != "silver_sword" else after.player_block == 0)
		assert(not after.has("player_magic_block"))
		var expired := Rules.end_turn(after)
		assert(expired.magic_resistance == 0 and expired.pending_magic_resistance_loss == 0)

	# Temporary strength is part of the actual strength stat, so preview and damage agree.
	before = play(state(), "warm_up")
	assert(before.strength == 5 and before.pending_strength_loss == 4)
	var warm_up_strike := card("strike")
	assert(Preview.describe(warm_up_strike, warm_up_strike.description, before).contains("피해를 11"))
	before.hand = [warm_up_strike]
	after = Rules.play_card(before, warm_up_strike.id)
	assert(after.enemies[0].hp == 989)
	after = Rules.end_turn(after)
	assert(after.strength == 1 and after.pending_strength_loss == 0)

	# Corrosion halves first, then enemy attacks, then Sturdy Stance preserves remaining block.
	before = state({"damage": 4})
	before.player_corrosion = 1
	before.player_block = 19
	before.preserve_block_on_turn_end = true
	var trace := {}
	after = Rules.end_turn(before, {}, trace)
	assert(trace.corrosion.player_block == 9)
	assert(trace.steps[0].player_block == 5)
	assert(after.player_block == 2 and after.player_hp == 1000 and after.player_corrosion == 0)

	before = state()
	before.player_paralysis = 2
	for use in 3:
		before = play(before, "defend")
	assert(before.cards_played_this_turn == 3 and before.player_block == 15)
	var energy: int = before.energy
	after = play(before, "defend")
	assert(after.cards_played_this_turn == 3 and after.energy == energy and after.player_block == 15)
	after = Rules.end_turn(after)
	assert(after.cards_played_this_turn == 0 and after.player_paralysis == 1)
	after = play(after, "defend")
	assert(after.cards_played_this_turn == 1)

	# Mandatory draws are part of the card's effect; confusion fires exactly once afterwards.
	before = state()
	before.player_confusion = 2
	var draw := card("quick_step")
	before.hand = [draw, card("strike")]
	before.piles = [[card("strike"), card("defend"), card("strike")]]
	after = Rules.play_card(before, draw.id)
	assert(after.pending_draws == 2 and not after.has("confusion_sequence"))
	after = Rules.draw_from_file(after, 0)
	assert(after.pending_draws == 1 and not after.has("confusion_sequence"))
	after = Rules.draw_from_file(after, 0)
	assert(after.confusion_sequence == 1 and after.hand.size() == 2)
	assert(after.last_confusion_discard_id != draw.id and after.pending_after_play_card_id == -1)
	# Losing confusion during the effect suppresses its deferred discard.
	before = state()
	before.player_confusion = 1
	var cleanse := card("composure")
	cleanse.remove_player_debuffs.confusion = 1
	before.hand = [cleanse, card("strike")]
	after = Rules.play_card(before, cleanse.id)
	assert(after.hand.size() == 1 and not after.has("confusion_sequence"))
	# Empty-hand plays do not discard themselves, nor create a pending effect that blocks the turn.
	before = state()
	before.player_confusion = 1
	after = play(before, "defend")
	assert(after.hand.is_empty() and after.pending_after_play_card_id == -1)
	print("PASS: five debuffs, non-consuming resistance, expiry, cleanse/preview ordering, new cards, corrosion/stance timing, paralysis limit/reset, deferred confusion")
	quit()
