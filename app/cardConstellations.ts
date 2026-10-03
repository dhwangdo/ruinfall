export type ConstellationNode = { x: number; y: number; scale: number };
export type ConstellationPreset = { nodes: ConstellationNode[]; edges: Array<[number, number]> };

export const CONSTELLATION_STAR_PATH = "M0-10 2.35-3.24 9.51-3.09 3.8 1.24 5.88 8.09 0 4-5.88 8.09-3.8 1.24-9.51-3.09-2.35-3.24Z";
const CONSTELLATION_TEXT_CLEAR_ZONE = { left: 28, right: 172, top: 92, bottom: 210 };

function constellationSegmentsIntersect(
  firstStart: Pick<ConstellationNode, "x" | "y">,
  firstEnd: Pick<ConstellationNode, "x" | "y">,
  secondStart: Pick<ConstellationNode, "x" | "y">,
  secondEnd: Pick<ConstellationNode, "x" | "y">,
) {
  const orientation = (
    start: Pick<ConstellationNode, "x" | "y">,
    end: Pick<ConstellationNode, "x" | "y">,
    point: Pick<ConstellationNode, "x" | "y">,
  ) => (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
  const onSegment = (
    start: Pick<ConstellationNode, "x" | "y">,
    end: Pick<ConstellationNode, "x" | "y">,
    point: Pick<ConstellationNode, "x" | "y">,
  ) => (
    point.x >= Math.min(start.x, end.x) - 1e-6
    && point.x <= Math.max(start.x, end.x) + 1e-6
    && point.y >= Math.min(start.y, end.y) - 1e-6
    && point.y <= Math.max(start.y, end.y) + 1e-6
  );
  const firstSideStart = orientation(firstStart, firstEnd, secondStart);
  const firstSideEnd = orientation(firstStart, firstEnd, secondEnd);
  const secondSideStart = orientation(secondStart, secondEnd, firstStart);
  const secondSideEnd = orientation(secondStart, secondEnd, firstEnd);
  const epsilon = 1e-6;

  if (
    ((firstSideStart > epsilon && firstSideEnd < -epsilon) || (firstSideStart < -epsilon && firstSideEnd > epsilon))
    && ((secondSideStart > epsilon && secondSideEnd < -epsilon) || (secondSideStart < -epsilon && secondSideEnd > epsilon))
  ) return true;
  return (
    (Math.abs(firstSideStart) <= epsilon && onSegment(firstStart, firstEnd, secondStart))
    || (Math.abs(firstSideEnd) <= epsilon && onSegment(firstStart, firstEnd, secondEnd))
    || (Math.abs(secondSideStart) <= epsilon && onSegment(secondStart, secondEnd, firstStart))
    || (Math.abs(secondSideEnd) <= epsilon && onSegment(secondStart, secondEnd, firstEnd))
  );
}

function constellationPointInTextZone(point: Pick<ConstellationNode, "x" | "y">) {
  return (
    point.x >= CONSTELLATION_TEXT_CLEAR_ZONE.left
    && point.x <= CONSTELLATION_TEXT_CLEAR_ZONE.right
    && point.y >= CONSTELLATION_TEXT_CLEAR_ZONE.top
    && point.y <= CONSTELLATION_TEXT_CLEAR_ZONE.bottom
  );
}

function constellationSegmentCrossesTextZone(
  start: Pick<ConstellationNode, "x" | "y">,
  end: Pick<ConstellationNode, "x" | "y">,
) {
  if (constellationPointInTextZone(start) || constellationPointInTextZone(end)) return true;
  const { left, right, top, bottom } = CONSTELLATION_TEXT_CLEAR_ZONE;
  const topLeft = { x: left, y: top };
  const topRight = { x: right, y: top };
  const bottomRight = { x: right, y: bottom };
  const bottomLeft = { x: left, y: bottom };
  return (
    constellationSegmentsIntersect(start, end, topLeft, topRight)
    || constellationSegmentsIntersect(start, end, topRight, bottomRight)
    || constellationSegmentsIntersect(start, end, bottomRight, bottomLeft)
    || constellationSegmentsIntersect(start, end, bottomLeft, topLeft)
  );
}

function createConstellationPresets(
  presetIndexes = Array.from({ length: 40 }, (_, index) => index),
): ConstellationPreset[] {
  return presetIndexes.map((presetIndex) => {
    let state = Math.imul(presetIndex + 17, 2654435761) >>> 0;
    const random = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
    const nodes: ConstellationNode[] = [];
    const edges: Array<[number, number]> = [];
    const componentCount = 5 + (presetIndex % 6 === 0 ? 1 : 0);
    const boundaryCenters = [
      { x: -24, y: 30 + random() * 220, angle: 0 },
      { x: 224, y: 30 + random() * 220, angle: Math.PI },
      { x: 25 + random() * 150, y: -28, angle: Math.PI / 2 },
      { x: 25 + random() * 150, y: 308, angle: -Math.PI / 2 },
    ];

    for (let componentIndex = 0; componentIndex < componentCount; componentIndex += 1) {
      const boundaryCenter = componentIndex < 3
        ? boundaryCenters[(componentIndex + presetIndex) % boundaryCenters.length]
        : undefined;
      let center = boundaryCenter ?? {
        x: 15 + random() * 170,
        y: 15 + random() * 250,
        angle: random() * Math.PI * 2,
      };
      if (!boundaryCenter) {
        let bestCenter = center;
        let bestClearance = -Infinity;
        for (let attempt = 0; attempt < 128; attempt += 1) {
          const candidate = {
            x: -20 + random() * 240,
            y: -30 + random() * 340,
            angle: random() * Math.PI * 2,
          };
          if (constellationPointInTextZone(candidate)) continue;
          const clearance = nodes.length === 0
            ? Infinity
            : Math.min(...nodes.map((node) => Math.hypot(candidate.x - node.x, candidate.y - node.y)));
          if (clearance > bestClearance) {
            bestCenter = candidate;
            bestClearance = clearance;
          }
          if (clearance >= 78) break;
        }
        center = bestCenter;
      } else if (nodes.length > 0) {
        let bestCenter = center;
        let bestClearance = Math.min(...nodes.map((node) => (
          Math.hypot(center.x - node.x, center.y - node.y)
        )));
        for (let attempt = 0; attempt < 32 && bestClearance < 72; attempt += 1) {
          const outwardDistance = 12 + random() * 100;
          const lateralDistance = (random() - .5) * 80;
          const candidate = {
            x: center.x - Math.cos(center.angle) * outwardDistance
              + Math.cos(center.angle + Math.PI / 2) * lateralDistance,
            y: center.y - Math.sin(center.angle) * outwardDistance
              + Math.sin(center.angle + Math.PI / 2) * lateralDistance,
            angle: center.angle,
          };
          const clearance = Math.min(...nodes.map((node) => (
            Math.hypot(candidate.x - node.x, candidate.y - node.y)
          )));
          if (clearance > bestClearance) {
            bestCenter = candidate;
            bestClearance = clearance;
          }
        }
        center = bestCenter;
      }
      const firstNodeIndex = nodes.length;
      const memberRoll = random();
      const memberCount = memberRoll < .3 ? 2 : memberRoll < .82 ? 3 : 4;
      const modeRoll = random();
      const mode = memberCount === 4
        ? modeRoll < .72 ? 1 : modeRoll < .86 ? 0 : 2
        : modeRoll < .34 ? 1 : modeRoll < .67 ? 0 : 2;
      nodes.push({ x: center.x, y: center.y, scale: .72 + random() * .28 });

      for (let memberIndex = 1; memberIndex < memberCount; memberIndex += 1) {
        const parentOffset = mode === 0
          ? memberIndex - 1
          : mode === 1
            ? 0
            : Math.floor(random() * memberIndex);
        const parentIndex = firstNodeIndex + parentOffset;
        const parent = nodes[parentIndex];
        const directionBias = boundaryCenter ? center.angle : random() * Math.PI * 2;
        let x = parent.x;
        let y = parent.y;
        let bestX = x;
        let bestY = y;
        let bestPlacementScore = -Infinity;
        const connectedNeighbors = edges.flatMap(([left, right]) => (
          left === parentIndex ? [nodes[right]] : right === parentIndex ? [nodes[left]] : []
        ));
        for (let attempt = 0; attempt < 128; attempt += 1) {
          const angle = directionBias + (random() - .5) * (boundaryCenter ? 1.7 : Math.PI * 1.5);
          const distance = 60 + random() * 64;
          const candidateX = parent.x + Math.cos(angle) * distance;
          const candidateY = parent.y + Math.sin(angle) * distance;
          const ownComponentClearance = Math.min(...nodes.slice(firstNodeIndex).map((node) => (
            node === parent ? distance : Math.hypot(candidateX - node.x, candidateY - node.y)
          )));
          const otherComponentClearance = firstNodeIndex === 0
            ? Infinity
            : Math.min(...nodes.slice(0, firstNodeIndex).map((node) => (
              Math.hypot(candidateX - node.x, candidateY - node.y)
            )));
          const clearance = Math.min(ownComponentClearance, otherComponentClearance - 18);
          const candidatePoint = { x: candidateX, y: candidateY };
          const crossesTextZone = constellationSegmentCrossesTextZone(parent, candidatePoint);
          const crossesExistingEdge = edges.some(([left, right]) => (
            left !== parentIndex
            && right !== parentIndex
            && constellationSegmentsIntersect(parent, candidatePoint, nodes[left], nodes[right])
          ));
          const angularDegeneracy = connectedNeighbors.reduce((maximum, neighbor) => {
            const neighborAngle = Math.atan2(neighbor.y - parent.y, neighbor.x - parent.x);
            const difference = Math.abs(Math.atan2(
              Math.sin(angle - neighborAngle),
              Math.cos(angle - neighborAngle),
            ));
            const cosine = Math.cos(difference);
            const nearStraight = ((1 - cosine) / 2) ** 4;
            const nearNarrow = .82 * ((1 + cosine) / 2) ** 4;
            return Math.max(maximum, nearStraight, nearNarrow);
          }, 0);
          const angleAcceptanceProbability = 1 - .88 * angularDegeneracy;
          const placementScore = clearance - 80 * angularDegeneracy;
          if (!crossesTextZone && !crossesExistingEdge && placementScore > bestPlacementScore) {
            bestX = candidateX;
            bestY = candidateY;
            bestPlacementScore = placementScore;
          }
          if (!crossesTextZone && !crossesExistingEdge && clearance >= 54 && random() < angleAcceptanceProbability) {
            x = candidateX;
            y = candidateY;
            break;
          }
        }
        if (bestPlacementScore === -Infinity) {
          if (memberIndex === 1) nodes.splice(firstNodeIndex, 1);
          break;
        }
        if (x === parent.x && y === parent.y) {
          x = bestX;
          y = bestY;
        }
        const nodeIndex = nodes.length;
        nodes.push({
          x,
          y,
          scale: .68 + random() * .34,
        });
        edges.push([parentIndex, nodeIndex]);
      }
    }

    return { nodes, edges };
  });
}

export const CONSTELLATION_PRESETS = createConstellationPresets();

const CARD_NAME_CONSTELLATION_IMAGES = new Map<string, string>();

export function cardNameConstellationImage(cardName: string) {
  const cachedImage = CARD_NAME_CONSTELLATION_IMAGES.get(cardName);
  if (cachedImage) return cachedImage;
  let seed = 2166136261;
  for (const character of cardName) {
    seed ^= character.codePointAt(0) ?? 0;
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const preset = createConstellationPresets([seed])[0];
  const image = constellationPresetCssImage(preset, "#17234f");
  CARD_NAME_CONSTELLATION_IMAGES.set(cardName, image);
  return image;
}

export function constellationPresetCssImage(preset: ConstellationPreset, cardBackground: string) {
  const lines = preset.edges.map(([left, right]) => {
    const start = preset.nodes[left];
    const end = preset.nodes[right];
    return `<line x1="${start.x.toFixed(1)}" y1="${start.y.toFixed(1)}" x2="${end.x.toFixed(1)}" y2="${end.y.toFixed(1)}"/>`;
  }).join("");
  const stars = preset.nodes.map((node) => `<path d="${CONSTELLATION_STAR_PATH}" transform="translate(${node.x.toFixed(1)} ${node.y.toFixed(1)}) scale(${node.scale.toFixed(2)})"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><g fill="none" stroke="#c28a00" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="4 7" opacity=".8">${lines}</g><g fill="${cardBackground}" stroke="#c28a00" stroke-width="1.8" stroke-linejoin="round" opacity=".94">${stars}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
