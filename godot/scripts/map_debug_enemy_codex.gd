extends RefCounted
class_name MapDebugEnemyCodex

const EnemyCatalog = preload("res://scripts/enemy_catalog.gd")

const REGION_ONE_SINGLE_INDEXES := [1, 5, 19, 20, 22, 25]
const REGION_TWO_SINGLE_INDEXES := [2, 4, 6, 27, 30, 33, 34]
const REGION_THREE_SINGLE_INDEXES := [10, 11, 12, 13]
const REGION_ONE_BOSS_INDEX := 14
const REGION_TWO_BOSS_INDEX := 15
const REGION_THREE_BOSS_INDEX := 16


static func get_entries() -> Array[Dictionary]:
	var entries: Array[Dictionary] = []
	_append_region(entries, 1, REGION_ONE_SINGLE_INDEXES, [REGION_ONE_BOSS_INDEX], range(66, 86))
	_append_region(entries, 2, REGION_TWO_SINGLE_INDEXES, [REGION_TWO_BOSS_INDEX], range(36, 66))
	_append_region(entries, 3, REGION_THREE_SINGLE_INDEXES, [REGION_THREE_BOSS_INDEX], [])
	entries.sort_custom(func(left: Dictionary, right: Dictionary) -> bool:
		var left_region := int(left["regions"][0])
		var right_region := int(right["regions"][0])
		return left_region < right_region if left_region != right_region \
			else int(left["encounter_index"]) < int(right["encounter_index"]))
	return entries


static func _append_region(entries: Array[Dictionary], region: int, singles: Array,
		bosses: Array, pairs: Array) -> void:
	var indexes: Array[int] = []
	for encounter_index in singles:
		indexes.append(int(encounter_index))
	for encounter_index in bosses:
		indexes.append(int(encounter_index))
	for encounter_index in pairs:
		indexes.append(int(encounter_index))
	for encounter_index in indexes:
		var blueprints := _blueprints_for_encounter(encounter_index)
		if blueprints.is_empty():
			continue
		entries.append(_make_entry(encounter_index, region, blueprints))


static func _blueprints_for_encounter(encounter_index: int) -> Array[Dictionary]:
	if encounter_index >= 36 and encounter_index < 66:
		var pair_index := encounter_index - 36
		var candidates: Array[Dictionary] = EnemyCatalog._region_two_pair_candidates()
		var first_index := int(pair_index / 5)
		var second_order := pair_index % 5
		var second_index := second_order if second_order < first_index else second_order + 1
		return [candidates[first_index].duplicate(true), candidates[second_index].duplicate(true)]
	if encounter_index >= 66 and encounter_index < 86:
		var pair_index := encounter_index - 66
		var candidates: Array[Dictionary] = EnemyCatalog._region_one_pair_candidates()
		var first_index := int(pair_index / 4)
		var second_order := pair_index % 4
		var second_index := second_order if second_order < first_index else second_order + 1
		return [candidates[first_index].duplicate(true), candidates[second_index].duplicate(true)]
	return EnemyCatalog._single_encounter_blueprints(encounter_index)


static func _make_entry(encounter_index: int, region: int, blueprints: Array[Dictionary]) -> Dictionary:
	var grouped: Dictionary = {}
	var signatures: Array[String] = []
	for blueprint in blueprints:
		var signature := JSON.stringify(blueprint)
		if not grouped.has(signature):
			grouped[signature] = {"enemy": blueprint.duplicate(true), "count": 0}
			signatures.append(signature)
		grouped[signature]["count"] = int(grouped[signature]["count"]) + 1

	var enemies: Array[Dictionary] = []
	var names: Array[String] = []
	for signature in signatures:
		var group: Dictionary = grouped[signature]
		var enemy: Dictionary = group["enemy"]
		var max_hp := int(enemy.get("hp", enemy.get("max_hp", 0)))
		var fixed_hp := bool(enemy.get("fixed_max_hp", false)) or bool(enemy.get("is_boss", false))
		enemies.append({
			"enemy": enemy,
			"count": int(group["count"]),
			"hp_min": max_hp if fixed_hp else floori(float(max_hp) * 0.9),
			"hp_max": max_hp,
		})
		names.append(str(enemy.get("name", "적")))
	var label := "%s %d마리" % [names[0], blueprints.size()] \
		if names.size() == 1 and blueprints.size() > 1 else " + ".join(names)
	return {
		"encounter_index": encounter_index,
		"label": label,
		"regions": [region],
		"enemies": enemies,
	}
