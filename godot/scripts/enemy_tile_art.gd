extends RefCounted

# Original transparent PNGs from the official, CC0-cleared crawl/tiles exports.
const TILES := {
	"주황 슬라임": preload("res://assets/enemies/dcss/jelly.png"),
	"쥐": preload("res://assets/enemies/dcss/rat.png"),
	"하수구 쥐": preload("res://assets/enemies/dcss/river_rat.png"),
	"실을 짜는 거미": preload("res://assets/enemies/dcss/wolf_spider.png"),
	"알집 바퀴": preload("res://assets/enemies/dcss/giant_cockroach.png"),
	"새끼 바퀴": preload("res://assets/enemies/dcss/giant_cockroach.png"),
	"골렘": preload("res://assets/enemies/dcss/iron_golem.png"),
	"굶주린 들개": preload("res://assets/enemies/dcss/hound.png"),
	"수색견": preload("res://assets/enemies/dcss/hound.png"),
	"도깨비": preload("res://assets/enemies/dcss/goblin.png"),
	"저주술사": preload("res://assets/enemies/dcss/necromancer.png"),
	"미라 전사": preload("res://assets/enemies/dcss/guardian_mummy.png"),
	"가시 딱정벌레": preload("res://assets/enemies/dcss/boulder_beetle.png"),
	"청소부": preload("res://assets/enemies/dcss/ogre.png"),
	"간수": preload("res://assets/enemies/dcss/vault_guard.png"),
	"거대 지룡": preload("res://assets/enemies/dcss/swamp_dragon.png"),
	"진흙 인형": preload("res://assets/enemies/dcss/earth_elemental.png"),
	"꼭두각시 거병": preload("res://assets/enemies/dcss/guardian_golem.png"),
	"인형술사": preload("res://assets/enemies/dcss/deep_elf_sorcerer.png"),
	"핏빛 광전사": preload("res://assets/enemies/dcss/orc_warrior.png"),
	"족쇄 간수": preload("res://assets/enemies/dcss/death_knight.png"),
	"피의 기수": preload("res://assets/enemies/dcss/hell_knight.png"),
	"칼잡이": preload("res://assets/enemies/dcss/orc.png"),
	"도깨비불": preload("res://assets/enemies/dcss/will_o_the_wisp.png"),
	"화약 운반병": preload("res://assets/enemies/dcss/deep_dwarf_artificer.png"),
	"대형 망치병": preload("res://assets/enemies/dcss/hill_giant.png"),
	"봉인 파수꾼": preload("res://assets/enemies/dcss/crystal_guardian.png"),
	"발효 슬라임": preload("res://assets/enemies/dcss/azure_jelly.png"),
	"압수관": preload("res://assets/enemies/dcss/orc_knight.png"),
}


static func texture_for(enemy: Dictionary) -> Texture2D:
	return TILES.get(str(enemy.get("name", "")), null)


static func battle_rect(enemy: Dictionary, available: Vector2) -> Rect2:
	var side := 48.0 if str(enemy.get("name", "")) == "새끼 바퀴" else 64.0
	return Rect2(((available - Vector2.ONE * side) * 0.5).round(), Vector2.ONE * side)


static func map_rects(cell: Rect2, count: int) -> Array[Rect2]:
	var result: Array[Rect2] = []
	var side := cell.size.x * 0.56
	var step := cell.size.x * 0.32
	for index in count:
		var offset := (index - (count - 1) * 0.5) * step
		var lift := -cell.size.y * 0.07 if count > 1 and index % 2 == 0 else 0.0
		result.append(Rect2(Vector2(cell.get_center().x - side * 0.5 + offset,
			cell.position.y + cell.size.y * 0.24 + lift), Vector2.ONE * side))
	return result
