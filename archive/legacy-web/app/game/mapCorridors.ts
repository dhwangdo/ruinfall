import { MapMinQueue, shuffleMapItems, type MapRandom } from "./mapGenerationMath.ts";

export type MapConnectionNode = { index: number; exits: readonly number[]; prefab: boolean };

export function mapConnectionEdges(nodes: readonly MapConnectionNode[], width: number, random: MapRandom, extraRate: number) {
  const count = nodes.length, selected = new Uint8Array(count);
  const best = new Float64Array(count).fill(Infinity), parents = new Int32Array(count).fill(-1);
  const edges: [number, number][] = [], tree: { node: number; length: number }[][] = nodes.map(() => []);
  const squareDistance = (a: number, b: number) => {
    const pa = nodes[a].index, pb = nodes[b].index;
    return (pa % width - pb % width) ** 2 + (Math.floor(pa / width) - Math.floor(pb / width)) ** 2;
  };
  best[0] = 0;
  for (let step = 0; step < count; step++) {
    let next = -1;
    for (let i = 0; i < count; i++) if (!selected[i] && (next < 0 || best[i] < best[next])) next = i;
    selected[next] = 1;
    const parent = parents[next];
    if (parent >= 0) {
      edges.push([parent, next]);
      const length = Math.sqrt(best[next]);
      tree[parent].push({ node: next, length }); tree[next].push({ node: parent, length });
    }
    for (let i = 0; i < count; i++) if (!selected[i]) {
      const distance = squareDistance(next, i);
      if (distance < best[i]) { best[i] = distance; parents[i] = next; }
    }
  }
  const existing = new Set(edges.map(([a, b]) => Math.min(a, b) * count + Math.max(a, b)));
  const candidates: [number, number][] = [];
  for (let source = 0; source < count; source++) {
    const distances = new Float64Array(count);
    const todo = [{ node: source, parent: -1, length: 0 }];
    while (todo.length) {
      const current = todo.pop()!;
      distances[current.node] = current.length;
      for (const edge of tree[current.node]) if (edge.node !== current.parent) {
        todo.push({ node: edge.node, parent: current.node, length: current.length + edge.length });
      }
    }
    for (let target = source + 1; target < count; target++) {
      if (existing.has(source * count + target)) continue;
      const distance = Math.sqrt(squareDistance(source, target));
      if (distance < 24 && distances[target] > distance * 1.8) candidates.push([source, target]);
    }
  }
  shuffleMapItems(candidates, random);
  edges.push(...candidates.slice(0, Math.ceil(count * extraRate)));
  return edges;
}

/** Dig through rock without entering a reserved prefab or the separate safe area. */
export function carveMapCorridor(start: number, end: number, options: {
  width: number; height: number; forbidden: Uint8Array; floor: Uint8Array; costs: Float32Array;
}) {
  const { width, height, forbidden, floor, costs } = options;
  const distances = new Float64Array(floor.length).fill(Infinity);
  const previous = new Int32Array(floor.length).fill(-1);
  const queue = new MapMinQueue();
  distances[start] = 0;
  queue.push({ index: start, cost: 0, priority: 0 });
  while (queue.size) {
    const { index, cost } = queue.pop();
    if (cost > distances[index]) continue;
    if (index === end) {
      let cursor = end;
      while (cursor >= 0) { floor[cursor] = 1; cursor = previous[cursor]; }
      return;
    }
    const x = index % width, y = Math.floor(index / width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, next = yy * width + xx;
      if (xx <= 0 || xx >= width - 1 || yy <= 0 || yy >= height - 1 || forbidden[next]) continue;
      const nextCost = cost + costs[next];
      if (nextCost >= distances[next]) continue;
      distances[next] = nextCost; previous[next] = index;
      queue.push({ index: next, cost: nextCost,
        priority: nextCost + Math.abs(xx - end % width) + Math.abs(yy - Math.floor(end / width)) });
    }
  }
  throw new Error(`Map corridor could not connect ${start} to ${end}`);
}
