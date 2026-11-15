extends RefCounted
class_name PortCardDescriptionText

const EMPHASIS_700_FONT := "res://assets/fonts/PretendardVariable700.tres"
const STRONG_STAR_TOKEN := "__PORT_STRONG_STAR__"
const STRONG_DEFENSE_TOKEN := "__PORT_STRONG_DEFENSE__"
const STRONG_MAGIC_DAMAGE_TOKEN := "__PORT_STRONG_MAGIC_DAMAGE__"

const EMPHASIZED_KEYWORDS := [
	"힘", "강인함", "취약", "약화", "무적", "광채",
	"에너지", "소멸", "보존", "토큰", "재련", "버리기", "룰.", "피해",
	"사용 불가", "사용불가",
]


static func to_bbcode(source: String, context_source: String = "") -> String:
	var result := ""
	var semantic_context := context_source if not context_source.is_empty() else source
	semantic_context = semantic_context.replace("\n", " ")
	for character in source:
		if character == "[":
			result += "[lb]"
		elif character == "]":
			result += "[rb]"
		else:
			result += character
	var number_pattern := RegEx.new()
	number_pattern.compile("(\\d+(?:\\.\\d+)?)")
	result = number_pattern.sub(result, "[b]$1[/b]", true)
	result = result.replace("★", STRONG_STAR_TOKEN)
	if semantic_context.contains("턴 종료 시 방어를 절반 보존합니다."):
		result = result.replace("방어", STRONG_DEFENSE_TOKEN)
	if semantic_context.contains("카드를 낼 때마다 마법 피해를 1 받고"):
		result = result.replace("마법 피해", STRONG_MAGIC_DAMAGE_TOKEN)

	result = result.replace("마법 방어", "__PORT_MAGIC_DEFENSE__")
	result = result.replace("물리 피해", "__PORT_PHYSICAL_DAMAGE__")
	result = result.replace("방어", "[color=#c55200][b]방어[/b][/color]")
	for keyword in EMPHASIZED_KEYWORDS:
		result = result.replace(keyword, "[b]%s[/b]" % keyword)
	result = result.replace("__PORT_MAGIC_DEFENSE__", "[color=#0068b7][b]마법 방어[/b][/color]")
	result = result.replace("__PORT_PHYSICAL_DAMAGE__", "[color=#c55200][b]물리 피해[/b][/color]")
	result = result.replace(STRONG_STAR_TOKEN, "[font=%s]★[/font]" % EMPHASIS_700_FONT)
	result = result.replace(STRONG_DEFENSE_TOKEN,
		"[b][color=#c55200]방어[/color][/b]")
	result = result.replace(STRONG_MAGIC_DAMAGE_TOKEN,
		"[b]마법 피해[/b]")
	return result


static func wrap_words(source: String, label: RichTextLabel, max_width: float,
		max_height: float, font_size: int = 12) -> Dictionary:
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.add_theme_font_size_override("normal_font_size", font_size)
	var wrapped_paragraphs: Array[String] = []
	var too_wide_words: Array[String] = []
	for paragraph in source.split("\n", true):
		if paragraph.is_empty():
			wrapped_paragraphs.append("")
			continue
		var wrapped_lines: Array[String] = []
		var current_line := ""
		for word in paragraph.split(" ", false):
			var candidate := word if current_line.is_empty() else current_line + " " + word
			label.text = to_bbcode(candidate, source)
			var candidate_width := float(label.get_content_width())
			if current_line.is_empty() and candidate_width > max_width:
				too_wide_words.append(word)
				current_line = word
			elif not current_line.is_empty() and candidate_width > max_width:
				wrapped_lines.append(current_line)
				current_line = word
				label.text = to_bbcode(word, source)
				if float(label.get_content_width()) > max_width:
					too_wide_words.append(word)
			else:
				current_line = candidate
		if not current_line.is_empty():
			wrapped_lines.append(current_line)
		wrapped_paragraphs.append("\n".join(wrapped_lines))
	var wrapped_text := "\n".join(wrapped_paragraphs)
	label.text = to_bbcode(wrapped_text, source)
	var line_widths: Array[float] = []
	for line_index in range(label.get_line_count()):
		line_widths.append(float(label.get_line_width(line_index)))
	var max_line_width := 0.0
	for line_width in line_widths:
		max_line_width = maxf(max_line_width, line_width)
	var content_height := float(label.get_content_height())
	var expected_line_count := wrapped_text.split("\n", true).size()
	var line_count_matches := label.get_line_count() == expected_line_count
	return {
		"text": wrapped_text,
		"fits": too_wide_words.is_empty() and max_line_width <= max_width and content_height > 0.0
			and content_height <= max_height and line_count_matches,
		"content_height": content_height,
		"max_line_width": max_line_width,
		"line_widths": line_widths,
		"too_wide_words": too_wide_words,
		"line_count_matches": line_count_matches,
	}
