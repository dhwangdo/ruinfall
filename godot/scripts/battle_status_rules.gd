extends RefCounted

const DEBUFFS := ["weak", "vulnerable", "corrosion", "paralysis", "confusion"]
const LABELS := {"weak": "약화", "vulnerable": "취약", "corrosion": "부식", "paralysis": "마비", "confusion": "혼란"}
const DESCRIPTIONS := {
	"weak": "가하는 공격 피해가 50% 감소합니다.",
	"vulnerable": "받는 공격 피해가 50% 증가합니다.",
	"corrosion": "내 턴 종료 시 방어가 절반이 됩니다. 소수점 이하는 버립니다.",
	"paralysis": "한 턴에 카드를 3장까지만 사용할 수 있습니다.",
	"confusion": "카드 효과 처리 후 손패의 카드 1장을 무작위로 버립니다.",
	"magic_resistance": "해로운 효과를 얻을 때마다 이 수치만큼 덜 얻습니다.",
}


static func resistance(state: Dictionary) -> int:
	return maxi(0, int(state.get("magic_resistance", 0)) + int(state.get("temporary_magic_resistance", 0)))


static func apply_player_debuff(state: Dictionary, kind: String, amount: int) -> int:
	if kind not in DEBUFFS:
		return 0
	var applied := maxi(0, amount - resistance(state))
	state["player_" + kind] = int(state.get("player_" + kind, 0)) + applied
	return applied


static func cleanse(state: Dictionary, amounts: Dictionary) -> void:
	for kind in DEBUFFS:
		if int(amounts.get(kind, 0)) > 0:
			state["player_" + kind] = maxi(0, int(state.get("player_" + kind, 0)) - int(amounts[kind]))


static func card_limit_reached(state: Dictionary) -> bool:
	return int(state.get("player_paralysis", 0)) > 0 and int(state.get("cards_played_this_turn", 0)) >= 3


static func decay(state: Dictionary) -> void:
	for kind in DEBUFFS:
		state["player_" + kind] = maxi(0, int(state.get("player_" + kind, 0)) - 1)


static func begin_turn(state: Dictionary) -> void:
	state["temporary_magic_resistance"] = 0
	state["cards_played_this_turn"] = 0
	state["first_solitaire_used"] = false
	state["cycle_used"] = false


static func describe_badge(text: String) -> String:
	for kind in DEBUFFS:
		if text.begins_with(str(LABELS[kind]) + " "):
			return DESCRIPTIONS[kind]
	if text.begins_with("마법 저항 ") or text.begins_with("이번 턴 마법 저항 "):
		return DESCRIPTIONS.magic_resistance
	return ""
