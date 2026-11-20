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
	"sigmund": preload("res://assets/player/dcss/sigmund.png"),
	"jessica": preload("res://assets/player/dcss/jessica.png"),
	"terence": preload("res://assets/player/dcss/terence.png"),
	"edmund": preload("res://assets/player/dcss/edmund.png"),
	"eustachio": preload("res://assets/player/dcss/eustachio.png"),
	"harold": preload("res://assets/player/dcss/harold.png"),
	"joseph": preload("res://assets/player/dcss/joseph.png"),
	"josephine": preload("res://assets/player/dcss/josephine.png"),
	"josephina": preload("res://assets/player/dcss/josephina.png"),
	"donald": preload("res://assets/player/dcss/donald.png"),
	"agnes": preload("res://assets/player/dcss/agnes.png"),
	"frederick": preload("res://assets/player/dcss/frederick.png"),
	"frances": preload("res://assets/player/dcss/frances.png"),
	"margery": preload("res://assets/player/dcss/margery.png"),
	"nikola": preload("res://assets/player/dcss/nikola.png"),
	"norris": preload("res://assets/player/dcss/norris.png"),
	"louise": preload("res://assets/player/dcss/louise.png"),
	"kirke": preload("res://assets/player/dcss/kirke.png"),
	"rupert": preload("res://assets/player/dcss/rupert.png"),
	"maggie": preload("res://assets/player/dcss/maggie.png"),
	"fannar": preload("res://assets/player/dcss/fannar.png"),
	"dowan": preload("res://assets/player/dcss/dowan.png"),
	"duvessa": preload("res://assets/player/dcss/duvessa.png"),
	"jory": preload("res://assets/player/dcss/jory.png"),
	"cassandra": preload("res://assets/player/dcss/cassandra.png"),
	"bai_suizhen": preload("res://assets/player/dcss/bai_suizhen.png"),
	"instructor": preload("res://assets/player/dcss/instructor.png"),
	"jorgrun": preload("res://assets/player/dcss/jorgrun.png"),
	"wiglaf": preload("res://assets/player/dcss/wiglaf.png"),
	"sonja": preload("res://assets/player/dcss/sonja.png"),
	"elf_archer": preload("res://assets/player/dcss/elf_archer.png"),
	"elf_pyro": preload("res://assets/player/dcss/elf_pyro.png"),
	"elf_zephyr": preload("res://assets/player/dcss/elf_zephyr.png"),
	"elf_priest": preload("res://assets/player/dcss/elf_priest.png"),
	"frostheart": preload("res://assets/player/dcss/frostheart.png"),
	"convoker": preload("res://assets/player/dcss/convoker.png"),
	"meteoran": preload("res://assets/player/dcss/meteoran.png"),
}

const AVATAR_IDS: Array[String] = [
	"human", "human2", "human3", "arcanist", "imperial_myrmidon",
	"vault_sentinel", "vault_warden", "occultist", "servant_of_whispers", "demigod",
	"elf", "deep_elf_blademaster", "deep_elf_knight",
	"sigmund", "jessica", "terence", "edmund", "eustachio",
	"harold", "joseph", "josephine", "josephina", "donald",
	"agnes", "frederick", "frances", "margery", "nikola",
	"norris", "louise", "kirke", "rupert", "maggie",
	"fannar", "dowan", "duvessa", "jory", "cassandra",
	"bai_suizhen", "instructor", "jorgrun", "wiglaf", "sonja",
	"elf_archer", "elf_pyro", "elf_zephyr", "elf_priest", "frostheart",
	"convoker", "meteoran",
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
