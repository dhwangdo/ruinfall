import { floodMapFloor, type GridPoint, type MapRandom } from "./mapGenerationMath.ts";

export type PrefabLandmark = "deckVault" | "shop" | "bloodShop" | "portal";
type Direction = "N" | "E" | "S" | "W";
type Rotation = 0 | 90 | 180 | 270;
type Entrance = GridPoint & { direction: Direction };
export type MapPrefabDefinition = {
  id: string;
  name: string;
  grid: readonly string[];
  entrances: readonly Entrance[];
  rotations?: readonly Rotation[];
  mirror?: boolean;
  padding?: number;
  weight?: number;
  maxPerRegion?: number;
  regions?: readonly number[];
};
export type MapPrefabPlacement = {
  id: string; name: string; x: number; y: number; width: number; height: number;
  rotation: Rotation; mirrored: boolean; padding: number;
  protectedCells: readonly number[];
  floorCells: readonly number[];
  requiredCells: readonly number[];
  exits: readonly number[];
  landmarks: ReadonlyMap<number, PrefabLandmark>;
};
type Port = GridPoint & { dx: number; dy: number };
const DIRECTIONS: Record<Direction, readonly [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const LANDMARKS: Record<string, PrefabLandmark> = { V: "deckVault", S: "shop", B: "bloodShop", P: "portal" };
const validatedDefinitions = new WeakSet<MapPrefabDefinition>();

export function validateMapPrefab(definition: MapPrefabDefinition) {
  if (validatedDefinitions.has(definition)) return;
  const fail = (reason: string): never => { throw new Error(`Map prefab ${definition.id}: ${reason}`); };
  const rows = definition.grid, width = rows[0]?.length ?? 0;
  if (!definition.id || !width || rows.some(row => row.length !== width || /[^#. VSBP]/.test(row))) fail("invalid rectangular grid");
  if (!definition.entrances.length) fail("an entrance is required");
  if (!Number.isInteger(definition.padding ?? 1) || (definition.padding ?? 1) < 1) fail("invalid padding");
  if (!Number.isFinite(definition.weight ?? 1) || (definition.weight ?? 1) <= 0) fail("invalid weight");
  if (!Number.isInteger(definition.maxPerRegion ?? 1) || (definition.maxPerRegion ?? 1) < 0) fail("invalid maximum count");
  const rotations = definition.rotations ?? [0, 90, 180, 270];
  if (!rotations.length || rotations.some(value => ![0, 90, 180, 270].includes(value))) fail("invalid rotations");
  const floor = new Uint8Array(width * rows.length), required: number[] = [];
  rows.forEach((row, y) => [...row].forEach((value, x) => {
    if (value !== "#" && value !== " ") floor[y * width + x] = 1;
    if (LANDMARKS[value]) required.push(y * width + x);
  }));
  for (const entry of definition.entrances) {
    const vector = DIRECTIONS[entry.direction];
    if (!vector || !Number.isInteger(entry.x) || !Number.isInteger(entry.y)
      || entry.x < 0 || entry.x >= width || entry.y < 0 || entry.y >= rows.length
      || !floor[entry.y * width + entry.x]) fail("entrance must be on floor");
    const xx = entry.x + vector[0], yy = entry.y + vector[1];
    if (xx >= 0 && xx < width && yy >= 0 && yy < rows.length) fail("entrance must face outward");
    required.push(entry.y * width + entry.x);
  }
  const reached = floodMapFloor(floor, width, rows.length, required[required.length - 1]);
  if (required.some(index => !reached.cells[index])) fail("entrances and landmarks must connect with eight-way movement");
  validatedDefinitions.add(definition);
}

export function transformMapPrefab(definition: MapPrefabDefinition, rotation: Rotation, mirrored: boolean) {
  validateMapPrefab(definition);
  if (!(definition.rotations ?? [0, 90, 180, 270]).includes(rotation) || (mirrored && !definition.mirror)) {
    throw new Error(`Map prefab ${definition.id}: transformation is not allowed`);
  }
  let grid = definition.grid.map(row => [...row]);
  let ports: Port[] = definition.entrances.map(entry => ({ x: entry.x, y: entry.y, dx: DIRECTIONS[entry.direction][0], dy: DIRECTIONS[entry.direction][1] }));
  if (mirrored) {
    const width = grid[0].length;
    grid = grid.map(row => row.reverse());
    ports = ports.map(port => ({ x: width - 1 - port.x, y: port.y, dx: -port.dx, dy: port.dy }));
  }
  for (let step = 0; step < rotation / 90; step++) {
    const height = grid.length;
    grid = Array.from({ length: grid[0].length }, (_, x) => Array.from({ length: height }, (_, y) => grid[height - 1 - y][x]));
    ports = ports.map(port => ({ x: height - 1 - port.y, y: port.x, dx: -port.dy, dy: port.dx }));
  }
  return { grid: grid.map(row => row.join("")), ports };
}

export function placeMapPrefabs(options: {
  definitions: readonly MapPrefabDefinition[]; random: MapRandom; width: number; height: number;
  unavailable: Uint8Array; region: number; count?: number;
}) {
  const { definitions, random, width, height, region } = options;
  const occupied = options.unavailable.slice(), placements: MapPrefabPlacement[] = [];
  const skipped: string[] = [], counts = new Map<string, number>(), ids = new Set<string>();
  definitions.forEach(definition => {
    validateMapPrefab(definition);
    if (ids.has(definition.id)) throw new Error(`Duplicate map prefab ID: ${definition.id}`);
    ids.add(definition.id);
  });
  const pool = definitions.filter(definition => (definition.maxPerRegion ?? 1) > 0 && (!definition.regions || definition.regions.includes(region)));
  while (placements.length < (options.count ?? 2) && pool.length) {
    const total = pool.reduce((sum, definition) => sum + (definition.weight ?? 1), 0);
    let cursor = random() * total;
    const definition = pool.find(item => { cursor -= item.weight ?? 1; return cursor < 0; }) ?? pool[pool.length - 1];
    let placement: MapPrefabPlacement | undefined;
    for (let attempt = 0; attempt < 128; attempt++) {
      const rotations = definition.rotations ?? [0, 90, 180, 270];
      const rotation = rotations[Math.floor(random() * rotations.length)];
      const mirrored = !!definition.mirror && random() < .5;
      const { grid, ports } = transformMapPrefab(definition, rotation, mirrored);
      const w = grid[0].length, h = grid.length, padding = definition.padding ?? 1;
      if (width < w + padding * 2 + 4 || height < h + padding * 2 + 4) continue;
      const ox = padding + 2 + Math.floor(random() * (width - w - padding * 2 - 3));
      const oy = padding + 2 + Math.floor(random() * (height - h - padding * 2 - 3));
      const protectedCells: number[] = [];
      let collision = false;
      for (let y = oy - padding; y < oy + h + padding && !collision; y++) for (let x = ox - padding; x < ox + w + padding; x++) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (occupied[(y + dy) * width + x + dx]) collision = true;
        }
        protectedCells.push(y * width + x);
      }
      if (collision) continue;
      const floors = new Set<number>(), required = new Set<number>(), exits: number[] = [];
      const landmarks = new Map<number, PrefabLandmark>();
      grid.forEach((row, y) => [...row].forEach((value, x) => {
        const index = (oy + y) * width + ox + x;
        if (value !== "#" && value !== " ") floors.add(index);
        if (LANDMARKS[value]) { landmarks.set(index, LANDMARKS[value]); required.add(index); }
      }));
      for (const port of ports) {
        for (let step = 0; step <= padding; step++) {
          const index = (oy + port.y + port.dy * step) * width + ox + port.x + port.dx * step;
          floors.add(index); required.add(index);
        }
        const x = ox + port.x + port.dx * (padding + 1), y = oy + port.y + port.dy * (padding + 1);
        const index = y * width + x;
        if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1 || occupied[index]) collision = true;
        exits.push(index); required.add(index);
      }
      if (collision) continue;
      placement = { id: definition.id, name: definition.name, x: ox, y: oy, width: w, height: h, padding,
        rotation, mirrored, protectedCells, floorCells: [...floors], requiredCells: [...required], exits, landmarks };
      protectedCells.forEach(index => { occupied[index] = 1; });
      break;
    }
    if (placement) {
      placements.push(placement);
      counts.set(definition.id, (counts.get(definition.id) ?? 0) + 1);
    } else skipped.push(definition.id);
    if (!placement || counts.get(definition.id)! >= (definition.maxPerRegion ?? 1)) pool.splice(pool.indexOf(definition), 1);
  }
  return { placements, skipped };
}
