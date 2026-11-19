extends RefCounted

const Editions = preload("res://scripts/deck_editions.gd")
const VALUES := [12, 8, 6, 15, 5]
const TABLE_PATH := "res://assets/data/deck_maxent.json"
static var _fits: Dictionary = {}
static var _prepared := false
static var _packs: Dictionary = {}


static func _prepare() -> void:
	if _prepared:
		return
	var data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string(TABLE_PATH))
	assert(data.get("model", "") == "maxent-v2", "Missing maximum entropy deck coefficients")
	for i in range(5):
		assert(int(data.weights[i]) == VALUES[i], "Deck values changed: rebuild deck_maxent.json")
	assert(data.edition_ids.size() == Editions.IDS.size(), "Edition catalogue changed: rebuild deck_maxent.json")
	for i in range(Editions.IDS.size()):
		var id: String = Editions.IDS[i]
		assert(str(data.edition_ids[i]) == id and int(data.edition_scores.get(id, -1)) == int(Editions.SCORES[id]),
			"Edition catalogue changed: rebuild deck_maxent.json")
	for row in data.regions:
		_fits[int(row.region)] = row
	_prepared = true
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
	var bound_count := int(editions.has("legendCassiopeia")) + int(editions.has("legendLeo")) + int(editions.has("legendHorologium"))
	return capacity > 0 and int(v[1]) + int(v[2]) + bound_count <= capacity \
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


static func _fallback_roll(region: int, random: RandomNumberGenerator) -> Dictionary:
	_prepare()
	var r := maxi(1, region)
	var variance := pow(15.0 + 3.0 * (r - 1), 2) / 494.0
	var edition_total := 0
	for value in Editions.SCORES.values():
		edition_total += int(value)
	var means := [r / 2.0, 0.75 + 0.375 * r, 0.25 + 0.125 * r, minf(float(edition_total - 1), r / 2.0), 0.5 + r / 2.0]
	var v: Array = []
	while true:
		v = []
		for i in range(5):
			v.append(_integer_sample(means[i], variance, random, edition_total if i == 3 else 100000))
		if valid(v):
			break
	return {"k": r, "x": v[0], "y1": v[1], "y2": v[2], "z": v[3], "w": v[4],
		"spent": score(v), "model": "moments-fallback"}


static func _sample_cdf(cdf: Array, random: RandomNumberGenerator) -> int:
	var u := random.randf()
	var low := 0
	var high := cdf.size() - 1
	while low < high:
		var middle := (low + high) / 2
		if u < float(cdf[middle]):
			high = middle
		else:
			low = middle + 1
	return low


static func roll(region: int, random: RandomNumberGenerator) -> Dictionary:
	_prepare()
	var r := maxi(1, region)
	# Only regions with calibrated coefficients use the maximum-entropy model.
	if not _fits.has(r):
		return _fallback_roll(r, random)
	var fit: Dictionary = _fits[r]
	while true:
		var v := []
		var t := []
		var log_accept := 0.0
		for i in range(5):
			var n := _sample_cdf(fit.proposal_cdfs[i], random)
			v.append(n)
			var centered := (n - float(fit.mean[i])) / float(fit.scale)
			t.append(centered)
			log_accept -= float(fit.envelope[i]) * centered * centered
		for i in range(5):
			for j in range(i + 1, 5):
				log_accept += float(fit.quadratic[i][j]) * float(t[i]) * float(t[j])
		# Young's inequality bounds log_accept by zero. This is an exact
		# rejection sampler, not a finite chain of local exchanges.
		if log(maxf(random.randf(), 1e-30)) > log_accept or not valid(v):
			continue
		return {"k": r, "x": v[0], "y1": v[1], "y2": v[2], "z": v[3], "w": v[4],
			"spent": score(v), "model": "maxent-v2"}
	return {}


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
