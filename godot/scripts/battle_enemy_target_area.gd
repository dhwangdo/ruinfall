extends RefCounted

const SIDE := 96.0 # 64px sprite plus 16px padding on each side.


static func local_rect(target: Control) -> Rect2:
	var portrait: Control = target.get_meta("enemy_portrait", null)
	if not is_instance_valid(portrait):
		return Rect2(Vector2.ZERO, Vector2.ZERO)
	var center := target.get_global_transform_with_canvas().affine_inverse() \
		* portrait.get_global_transform_with_canvas() * (portrait.size * 0.5)
	return Rect2(center - Vector2.ONE * SIDE * 0.5, Vector2.ONE * SIDE)


static func global_rect(target: Control) -> Rect2:
	return target.get_global_transform_with_canvas() * local_rect(target)
