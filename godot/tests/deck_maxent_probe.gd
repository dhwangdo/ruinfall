extends SceneTree

const Model = preload("res://scripts/deck_generation_model.gd")
const N := 10000


func _initialize() -> void:
	var report := []
	for region in range(1, 11):
		var random := RandomNumberGenerator.new()
		random.seed = 2026111800 + region
		var means := [region / 2.0, 0.75 + 0.375 * region, 0.25 + 0.125 * region, region / 2.0, 0.5 + region / 2.0]
		var sigma := 15.0 + 3.0 * (region - 1)
		var variance := sigma * sigma / 494.0
		var sums := [0.0,0.0,0.0,0.0,0.0]
		var outer := []
		for i in range(5):
			outer.append([0.0,0.0,0.0,0.0,0.0])
		for sample in range(N):
			var shape := Model.roll(region, random)
			assert(shape.model == "maxent-v2")
			var v := [shape.x,shape.y1,shape.y2,shape.z,shape.w]
			assert(Model.valid(v))
			assert(Model.score(v) == shape.spent)
			for i in range(5):
				sums[i] += float(v[i])
				for j in range(5):
					outer[i][j] += float(v[i]) * float(v[j])
		var covariance := []
		var average := []
		var score_mean := 0.0
		var score_variance := 0.0
		for i in range(5):
			average.append(sums[i] / N)
			assert(absf(average[i] - means[i]) < 6.5 * sqrt(variance * 1.05 / N))
			score_mean += average[i] * Model.VALUES[i]
			var row := []
			for j in range(5):
				var value: float = (outer[i][j] - sums[i] * sums[j] / N) / (N - 1)
				var identity := 1.0 if i == j else 0.0
				var target: float = variance * (identity + 0.05 * (identity - float(Model.VALUES[i] * Model.VALUES[j]) / 494.0))
				assert(absf(value - target) < 0.15 * variance)
				row.append(value)
				score_variance += Model.VALUES[i] * Model.VALUES[j] * value
			covariance.append(row)
		var score_sigma := sqrt(score_variance)
		assert(absf(score_sigma - sigma) < 0.05 * sigma)
		report.append({"region": region, "samples": N, "mean": average, "covariance": covariance,
			"score_mean": score_mean, "score_stddev": score_sigma})
		print("region %d: score %.3f +/- %.3f" % [region, score_mean, score_sigma])
	# Region 1 has contiguous nonzero capacity mass at 20,25,30,35... .
	var reference: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/data/deck_maxent.json"))
	assert(reference.regions.size() == 10)
	var save := FileAccess.open(ProjectSettings.globalize_path("res://../work/deck_maxent_runtime_stats.json"), FileAccess.WRITE)
	if save:
		save.store_string(JSON.stringify(report))
	print("PASS: 100000 exact rejection samples, means/covariances/score dispersion, feasibility")
	quit()
