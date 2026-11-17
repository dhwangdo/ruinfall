shader_type canvas_item;

// Rare DCSS deck -> near-black cover, orange trim and muted light markings.
uniform vec4 cover_color : source_color = vec4(0.859, 0.541, 0.239, 1.0);
uniform vec4 face_color : source_color = vec4(0.047, 0.051, 0.047, 1.0);
varying vec4 vertex_tint;

void vertex() {
	vertex_tint = COLOR;
}

vec3 rgb_to_hsv(vec3 c) {
	vec4 k = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
	vec4 p = mix(vec4(c.bg, k.wz), vec4(c.gb, k.xy), step(c.b, c.g));
	vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
	float d = q.x - min(q.w, q.y);
	return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 0.00001)), d / (q.x + 0.00001), q.x);
}

vec3 hsv_to_rgb(vec3 c) {
	vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
	return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

void fragment() {
	vec4 pixel = texture(TEXTURE, UV);
	vec3 hsv = rgb_to_hsv(pixel.rgb);
	vec3 target = rgb_to_hsv(cover_color.rgb);
	bool blue_cover = hsv.x > 0.52 && hsv.x < 0.78 && hsv.y > 0.08;
	if (blue_cover) {
		// Two quiet cover tones instead of amplifying every source-palette variation.
		float marking = step(0.40, hsv.y);
		pixel.rgb = mix(face_color.rgb, vec3(0.24, 0.235, 0.21), marking);
	} else if (hsv.z > 0.16) {
		float trim_shade = hsv.z > 0.60 ? 1.0 : 0.62;
		pixel.rgb = hsv_to_rgb(vec3(target.x, target.y, target.z * trim_shade));
	}
	COLOR = vertex_tint * pixel;
}
