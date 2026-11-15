extends SceneTree

const MapRules = preload("res://scripts/map_rules.gd")
const MapGenerationJob = preload("res://scripts/run_map_generation_job.gd")


func _initialize() -> void:
	var seed_value := 20261114
	var expected := MapRules.create_map(seed_value)
	var job = MapGenerationJob.new()
	assert(job.start_cooperative(seed_value) == OK)
	var steps := 0
	while job.is_alive():
		var completed_before := job.completed_regions()
		job.advance()
		assert(job.completed_regions() == completed_before + 1)
		steps += 1
	assert(steps == MapRules.REGION_COUNT)
	assert(job.take_result() == expected)

	var cancelled_job = MapGenerationJob.new()
	assert(cancelled_job.start_cooperative(seed_value) == OK)
	cancelled_job.advance()
	cancelled_job.cancel_and_wait()
	assert(not cancelled_job.is_alive())
	assert(cancelled_job.take_result().is_empty())
	print("MAP_GENERATION_JOB_PROBE=PASS")
	quit(0)
