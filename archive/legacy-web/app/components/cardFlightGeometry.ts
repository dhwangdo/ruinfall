type Matrix2D = { a: number; b: number; c: number; d: number; e: number; f: number };

/** Recover the untransformed box position from a rendered, rotated/scaled bounding box. */
export function cardBoxPosition(
  rect: { left: number; top: number }, width: number, height: number,
  origin: { x: number; y: number }, matrix: Matrix2D,
) {
  const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => ({
    x: origin.x + matrix.a * (x - origin.x) + matrix.c * (y - origin.y) + matrix.e,
    y: origin.y + matrix.b * (x - origin.x) + matrix.d * (y - origin.y) + matrix.f,
  }));
  return {
    left: rect.left - Math.min(...corners.map(point => point.x)),
    top: rect.top - Math.min(...corners.map(point => point.y)),
  };
}
