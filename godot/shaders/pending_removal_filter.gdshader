shader_type canvas_item;
render_mode unshaded;

uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_nearest;
uniform float saturation : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	vec4 source = textureLod(screen_texture, SCREEN_UV, 0.0);
	vec3 unpremultiplied = source.a > 0.0001 ? source.rgb / source.a : vec3(0.0);
	float luminance = dot(unpremultiplied, vec3(0.2126, 0.7152, 0.0722));
	source.rgb = mix(vec3(luminance), unpremultiplied, saturation);
	COLOR *= source;
}
