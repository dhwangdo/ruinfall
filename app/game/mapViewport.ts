type ViewportLayout = {
  minX: number;
  maxX: number;
  minY?: number;
  maxY: number;
  marginX: number;
  marginY: number;
  padding: number;
  strideX: number;
  strideY: number;
};

/** A nearby, chunk-aligned grid instead of a full-world GPU/layout surface. */
export function mapRenderSurface(bounds: { minX: number; maxX: number; minY: number; maxY: number }) {
  const chunk = 8;
  return {
    minX: Math.floor(bounds.minX / chunk) * chunk - chunk,
    maxX: Math.ceil((Math.max(bounds.minX, bounds.maxX) + 1) / chunk) * chunk + chunk - 1,
    minY: Math.floor(bounds.minY / chunk) * chunk - chunk,
    maxY: Math.ceil((Math.max(bounds.minY, bounds.maxY) + 1) / chunk) * chunk + chunk - 1,
  };
}

/** Keep a small border of cells mounted while the camera crosses a cell edge. */
export function mapViewportBounds(
  pan: { x: number; y: number },
  zoom: number,
  viewport: { width: number; height: number },
  layout: ViewportLayout,
) {
  const width = viewport.width || 1200;
  const height = viewport.height || 620;
  return {
    minX: Math.max(layout.minX, layout.minX - layout.marginX
      + Math.floor((-pan.x / zoom - layout.padding) / layout.strideX) - 2),
    maxX: Math.min(layout.maxX, layout.minX - layout.marginX
      + Math.ceil(((width - pan.x) / zoom - layout.padding) / layout.strideX) + 2),
    minY: Math.max(layout.minY ?? 0, Math.floor((-pan.y / zoom - layout.padding) / layout.strideY) - layout.marginY - 2),
    maxY: Math.min(layout.maxY, Math.ceil(((height - pan.y) / zoom - layout.padding) / layout.strideY) - layout.marginY + 2),
  };
}
