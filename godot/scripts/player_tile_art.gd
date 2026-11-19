extends RefCounted
class_name PortPlayerTileArt

# Original transparent PNGs from the official, CC0-cleared crawl/tiles exports.
const TILES := {
	"human": preload("res://assets/player/dcss/human.png"),
	"human2": preload("res://assets/player/dcss/human2.png"),
	"human3": preload("res://assets/player/dcss/human3.png"),
	"arcanist": preload("res://assets/player/dcss/arcanist.png"),
	"imperial_myrmidon": preload("res://assets/player/dcss/imperial_myrmidon.png"),
	"vault_sentinel": preload("res://assets/player/dcss/vault_sentinel.png"),
	"vault_warden": preload("res://assets/player/dcss/vault_warden.png"),
	"occultist": preload("res://assets/player/dcss/occultist.png"),
	"servant_of_whispers": preload("res://assets/player/dcss/servant_of_whispers.png"),
	"demigod": preload("res://assets/player/dcss/demigod.png"),
	"elf": preload("res://assets/player/dcss/elf.png"),
	"deep_elf_blademaster": preload("res://assets/player/dcss/deep_elf_blademaster.png"),
	"deep_elf_knight": preload("res://assets/player/dcss/deep_elf_knight.png"),
}

const AVATAR_IDS: Array[String] = [
	"human",
	"human2",
	"human3",
	"arcanist",
	"imperial_myrmidon",
	"vault_sentinel",
	"vault_warden",
	"occultist",
	"servant_of_whispers",
	"demigod",
	"elf",
	"deep_elf_blademaster",
	"deep_elf_knight",
]


static func normalize_avatar_id(avatar_id: String) -> String:
	if TILES.has(avatar_id):
		return avatar_id
	return AVATAR_IDS[0]


static func random_avatar_id(exclude_id: String = "") -> String:
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var pool: Array[String] = []
	for id in AVATAR_IDS:
		if id != exclude_id:
			pool.append(id)
	if pool.is_empty():
		return AVATAR_IDS[0]
	return pool[rng.randi_range(0, pool.size() - 1)]


static func texture_for(avatar_id: String) -> Texture2D:
	return TILES.get(normalize_avatar_id(avatar_id), TILES[AVATAR_IDS[0]])
