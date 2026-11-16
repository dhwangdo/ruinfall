extends SceneTree

const Catalog = preload("res://scripts/card_catalog.gd")
const Editions = preload("res://scripts/deck_editions.gd")
const Stickers = preload("res://scripts/stickers.gd")
const Editor = preload("res://scripts/deck_editor_rules.gd")
const Services = preload("res://scripts/sticker_services.gd")


func _initialize() -> void:
	var random := RandomNumberGenerator.new()
	random.seed = 20261116
	var observed := {}
	for region in range(1, 11):
		for sample in range(150):
			var generated := Catalog.create_region_deck(region, 100, random)
			var deck: Dictionary = generated.deck
			var g: Dictionary = deck.generation
			assert(g.model == "maxent-v2")
			assert(g.spent == 12 * g.x + 8 * g.y1 + 6 * g.y2 + 15 * g.z + 5 * g.w)
			var capacity := 20 + 5 * int(g.x) - (20 if deck.editions.has("gambit") else 0)
			if deck.editions.has("fantastic"):
				capacity = floori(capacity * 0.8)
			assert(deck.capacity == capacity and capacity > 0)
			var bound := 1 if deck.editions.has("legendCassiopeia") else 0
			assert(deck.rare_slot_capacity == g.y1 + g.y2 + bound)
			assert(deck.rare_slot_capacity <= capacity and deck.cards.size() <= capacity - int(g.y2))
			var rare := 0
			var sticker_count := 0
			var bound_count := 0
			var id := 100
			for card in deck.cards:
				assert(card.id == id)
				id += 1
				rare += 1 if Editor.is_high_rarity(card) else 0
				sticker_count += Stickers.card_sticker_ids(card).size()
				if Editor.is_bound(card):
					bound_count += 1
					assert(card.effect == "cassiopeia" and Services.transmuter_candidates(card).is_empty())
			assert(generated.next_card_id == id)
			assert(rare == g.y1 + bound and bound_count == bound)
			assert(sticker_count == g.w)
			var score := 0
			var seen := {}
			for edition in deck.editions:
				assert(not seen.has(edition))
				seen[edition] = true
				observed[edition] = true
				score += int(Editions.SCORES[edition])
			assert(score == g.z)
			for edition in Editions.IDS:
				assert(seen.has(edition) or int(Editions.SCORES[edition]) > int(g.z) - score)
	assert(observed.size() == Editions.IDS.size())
	# First tier probability must be 1:2:3, independent of catalogue size in each tier.
	var counts := {1: 0, 2: 0, 3: 0}
	var names := {}
	for sample in range(18000):
		var first: String = Editions.roll(3, random)[0]
		var tier := int(Editions.SCORES[first])
		counts[tier] += 1
		names[first] = int(names.get(first, 0)) + 1
	assert(absi(int(counts[1]) - 3000) < 250)
	assert(absi(int(counts[2]) - 6000) < 300)
	assert(absi(int(counts[3]) - 9000) < 350)
	for edition in Editions.IDS:
		var expected := 600 if int(Editions.SCORES[edition]) == 1 else 2000 if int(Editions.SCORES[edition]) == 2 else 4500
		assert(absi(int(names.get(edition, 0)) - expected) < 250)
	var twos := 0
	for sample in range(9000):
		if int(Editions.SCORES[Editions.roll(2, random)[0]]) == 2:
			twos += 1
	assert(absi(twos - 6000) < 250)
	var a := RandomNumberGenerator.new()
	var b := RandomNumberGenerator.new()
	a.seed = 42
	b.seed = 42
	assert(Catalog.create_region_deck(5, 10, a) == Catalog.create_region_deck(5, 10, b))
	assert(Services.service_price("stickerAltar", 0) == 200)
	assert(Services.service_price("tinkerer", 0, "anchor") == 40)
	assert(Services.service_price("tinkerer", 0, "glowDinosaur") == 40)
	assert(Services.service_price("tinkerer", 0, "parachute") == 200)
	var bound_card: Dictionary = Catalog.LEGENDARY_CARDS[0].duplicate(true)
	bound_card.edition_bound = true
	bound_card.id = 1
	bound_card = Stickers.with_card_stickers(bound_card, ["bookmark"])
	var target: Dictionary = Catalog.STARTER_CARDS[0].duplicate(true)
	target.id = 2
	assert(not Services.can_altar_transfer(bound_card, target))
	assert(Services.can_altar_transfer(Stickers.with_card_stickers(target, ["kite"]), Stickers.with_card_stickers(bound_card, [])))
	var attached := Services.resolve("tinkerer", [bound_card], 1, -1, "kite", 0, random)
	# Existing bookmark occupies the one sticker slot; a clean bound card can receive a sticker.
	assert(not attached.ok)
	bound_card = Stickers.with_card_stickers(bound_card, [])
	attached = Services.resolve("tinkerer", [bound_card], 1, -1, "kite", 0, random)
	assert(attached.ok and Editor.is_bound(attached.after))
	print("PASS: maximum-entropy decks, exact edition points/slots/stickers/IDs, tier weights, determinism, bound services, prices")
	quit()
