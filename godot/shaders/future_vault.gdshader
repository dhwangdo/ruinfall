shader_type canvas_item;
render_mode unshaded;

void fragment() {
	// A broad diagonal wave drifts across the blue/navy gradient in 18 seconds.
	float phase = (UV.x + UV.y) * 0.5 - TIME / 18.0;
	float blend = 0.5 + 0.5 * sin(phase * 6.2831853);
	vec3 blue = vec3(0.20, 0.43, 0.78);
	vec3 navy = vec3(0.015, 0.025, 0.09);
	COLOR = vec4(mix(navy, blue, blend), 1.0);
}
