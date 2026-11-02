export type GridPoint = { x: number; y: number };
export type MapRandom = () => number;

export function mapRandom(seed: number): MapRandom {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function gridNoise(x: number, y: number, seed: number) {
  let value = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

export function spatialNoise(x: number, y: number, scale: number, seed: number) {
  const xx = x / scale, yy = y / scale;
  const ix = Math.floor(xx), iy = Math.floor(yy);
  const sx = xx - ix, sy = yy - iy;
  const tx = sx * sx * (3 - 2 * sx), ty = sy * sy * (3 - 2 * sy);
  const a = gridNoise(ix, iy, seed) * (1 - tx) + gridNoise(ix + 1, iy, seed) * tx;
  const b = gridNoise(ix, iy + 1, seed) * (1 - tx) + gridNoise(ix + 1, iy + 1, seed) * tx;
  return a * (1 - ty) + b * ty;
}

export function shuffleMapItems<T>(items: T[], random: MapRandom) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

type QueueEntry = { index: number; cost: number; priority: number };

/** Shared by corridor routing and the distance field used to vary corridor width. */
export class MapMinQueue {
  private items: QueueEntry[] = [];

  get size() { return this.items.length; }

  push(entry: QueueEntry) {
    let index = this.items.length;
    this.items.push(entry);
    while (index > 0) {
      const parent = (index - 1) >>> 1;
      if (!this.before(entry, this.items[parent])) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = entry;
  }

  pop(): QueueEntry {
    const first = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length === 0) return first;
    let index = 0;
    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1;
      if (child + 1 < this.items.length && this.before(this.items[child + 1], this.items[child])) child++;
      if (!this.before(this.items[child], last)) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = last;
    return first;
  }

  private before(a: QueueEntry, b: QueueEntry) {
    return a.priority < b.priority || (a.priority === b.priority && a.index < b.index);
  }
}

export function floodMapFloor(floor: Uint8Array, width: number, height: number, start: number) {
  const visited = new Uint8Array(floor.length);
  const queue = new Int32Array(floor.length);
  if (!floor[start]) return { cells: visited, count: 0 };
  let size = 1;
  queue[0] = start;
  visited[start] = 1;
  for (let cursor = 0; cursor < size; cursor++) {
    const index = queue[cursor], x = index % width, y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if ((!dx && !dy) || xx < 0 || xx >= width || yy < 0 || yy >= height) continue;
      const next = yy * width + xx;
      if (!floor[next] || visited[next]) continue;
      visited[next] = 1;
      queue[size++] = next;
    }
  }
  return { cells: visited, count: size };
}
