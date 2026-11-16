extends RefCounted
class_name PortCardDescriptionText

const EMPHASIS_700_FONT := "res://assets/fonts/PretendardVariable700.tres"
const Colors = preload("res://scripts/keyword_colors.gd")
const EMPHASIZED_KEYWORDS := [
	"사용 불가", "사용불가", "마법 저항", "강인함", "에너지", "버리기", "방어",
	"취약", "약화", "부식", "마비", "혼란", "무적", "광채", "소멸", "보존", "토큰", "재련", "룰.", "피해", "힘",
]
static var _tokens: RegEx


static func _escape(text: String) -> String:
	var escaped := ""
	for character in text:
		escaped += "[lb]" if character == "[" else ("[rb]" if character == "]" else character)
	return escaped


static func to_bbcode(source: String, _context_source: String = "") -> String:
	if _tokens == null:
		_tokens = RegEx.new()
		var patterns: Array[String] = []
		for keyword in EMPHASIZED_KEYWORDS:
			patterns.append(keyword.replace(".", "\\."))
		patterns.append("★")
		patterns.append("\\d+(?:\\.\\d+)?")
		_tokens.compile("|".join(patterns))
	var result := ""
	var offset := 0
	# Tokenize the plain source once; never run replacements over generated BBCode tags.
	for matched in _tokens.search_all(source):
		result += _escape(source.substr(offset, matched.get_start() - offset))
		var token := matched.get_string()
		var rendered := "[b]%s[/b]" % _escape(token)
		var is_keyword := token in EMPHASIZED_KEYWORDS or token == "★"
		if token == "★":
			rendered = "[font=%s]★[/font]" % EMPHASIS_700_FONT
		if is_keyword:
			var color := Colors.color_for(token)
			if color != "":
				rendered = "[color=%s]%s[/color]" % [color, rendered]
		result += rendered
		offset = matched.get_end()
	return result + _escape(source.substr(offset))


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
