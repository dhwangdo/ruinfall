import { CONSTELLATION_STAR_PATH, type ConstellationPreset } from "../cardConstellations";

export function ConstellationPreview({ preset }: { preset: ConstellationPreset }) {
  return (
    <svg viewBox="0 0 200 280" aria-hidden="true">
      <g className="constellation-preview-lines">
        {preset.edges.map(([left, right], index) => (
          <line key={index} x1={preset.nodes[left].x} y1={preset.nodes[left].y} x2={preset.nodes[right].x} y2={preset.nodes[right].y} />
        ))}
      </g>
      <g className="constellation-preview-stars">
        {preset.nodes.map((node, index) => (
          <path key={index} d={CONSTELLATION_STAR_PATH} transform={`translate(${node.x} ${node.y}) scale(${node.scale})`} />
        ))}
      </g>
    </svg>
  );
}
