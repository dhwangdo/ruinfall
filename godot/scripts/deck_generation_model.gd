extends RefCounted

const Editions = preload("res://scripts/deck_editions.gd")
const VALUES := [12, 8, 6, 15, 5]
const EXCHANGE_STEPS := 6
static var _exchanges: Array = []
static var _packs: Dictionary = {}


static func _prepare() -> void:
	if not _exchanges.is_empty():
		return
	for a in range(-2, 3):
		for b in range(-2, 3):
			for c in range(-2, 3):
				for d in range(-2, 3):
					for e in range(-2, 3):
						var v := [a,b,c,d,e]
						var first := 0
						for n in v:
							if n != 0:
								first = n
								break
						if first > 0 and absi(score(v)) <= 1:
							_exchanges.append(v)
	for mask in range(1 << Editions.IDS.size()):
		var ids: Array[String] = []
		var points := 0
		for i in range(Editions.IDS.size()):
			if mask & (1 << i):
				var id: String = Editions.IDS[i]
				ids.append(id)
				points += int(Editions.SCORES[id])
		if not _packs.has(points):
			_packs[points] = []
		_packs[points].append(ids)


static func score(v: Array) -> int:
	var result := 0
	for i in range(5):
		result += int(v[i]) * VALUES[i]
	return result


static func final_capacity(v: Array, editions: Array) -> int:
	var capacity := 20 + 5 * int(v[0]) - (20 if editions.has("gambit") else 0)
	return floori(capacity * 0.8) if editions.has("fantastic") else capacity


static func compatible(v: Array, editions: Array) -> bool:
	var capacity := final_capacity(v, editions)
	return capacity > 0 and int(v[1]) + int(v[2]) + (1 if editions.has("legendCassiopeia") else 0) <= capacity \
		and int(v[4]) <= capacity - int(v[2])


static func valid(v: Array) -> bool:
	for n in v:
		if n < 0:
			return false
	for ids in _packs.get(int(v[3]), []):
		if compatible(v, ids):
			return true
	return false


static func _integer_sample(mean: float, variance: float, random: RandomNumberGenerator, maximum := 100000) -> int:
	var low := floori(mean)
	var fraction := mean - low
	var minimum_variance := fraction * (1.0 - fraction)
	var high := mini(maximum, ceili(mean + variance / mean) + 1)
	var high_variance := mean * (high - mean)
	var mix := clampf((variance - minimum_variance) / maxf(0.000001, high_variance - minimum_variance), 0.0, 1.0)
	if random.randf() < mix:
		return high if random.randf() < mean / high else 0
	return low + (1 if random.randf() < fraction else 0)


static func roll(region: int, random: RandomNumberGenerator) -> Dictionary:
	_prepare()
	var r := maxi(1, region)
	var variance := pow(15.0 + 3.0 * (r - 1), 2) / 494.0
	var means := [r / 2.0, 0.75 + 0.375 * r, 0.25 + 0.125 * r, minf(16.0, r / 2.0), 0.5 + r / 2.0]
	var v: Array = []
	while true:
		v = []
		for i in range(5):
			v.append(_integer_sample(means[i], variance, random, 17 if i == 3 else 100000))
		if valid(v):
			break
	for _step in range(EXCHANGE_STEPS):
		var delta: Array = _exchanges[random.randi_range(0, _exchanges.size() - 1)]
		var plus := []
		var minus := []
		for i in range(5):
			plus.append(int(v[i]) + int(delta[i]))
			minus.append(int(v[i]) - int(delta[i]))
		if valid(plus) and valid(minus):
			v = plus if random.randf() < 0.5 else minus
	return {"k": r, "x": v[0], "y1": v[1], "y2": v[2], "z": v[3], "w": v[4],
		"spent": score(v), "model": "moments-v1"}


static func editions_for(shape: Dictionary, random: RandomNumberGenerator) -> Array[String]:
	_prepare()
	var v := [shape.x, shape.y1, shape.y2, shape.z, shape.w]
	# Preserve tier-weighted selection when it produces a valid exact pack.
	for _attempt in range(64):
		var ids := Editions.roll(int(shape.z), random)
		var points := 0
		for id in ids:
			points += int(Editions.SCORES[id])
		if points == int(shape.z) and compatible(v, ids):
			return ids
	var candidates := []
	for ids in _packs.get(int(shape.z), []):
		if compatible(v, ids):
			candidates.append(ids)
	var chosen: Array[String] = candidates[random.randi_range(0, candidates.size() - 1)].duplicate()
	return chosen
