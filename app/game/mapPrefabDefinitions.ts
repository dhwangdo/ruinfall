import type { MapPrefabDefinition } from "./mapPrefabs.ts";

/** Add handmade terrain here. Generation and placement do not depend on template IDs. */
export const MAP_PREFAB_DEFINITIONS: readonly MapPrefabDefinition[] = [
  {
    id: "spiral-vault", name: "소용돌이 금고",
    grid: ["#######", "#.....#", "#.###.#", "#.#V#.#", "#.#.#.#", "#...#.#", "#####.#", "......#"],
    entrances: [{ x: 0, y: 7, direction: "W" }],
    rotations: [0, 90, 180, 270], mirror: true, padding: 1, weight: 1, maxPerRegion: 1,
  },
  {
    id: "pillar-vault", name: "기둥 금고",
    grid: ["#########", "#.#.#.#.#", "##.#.#.##", "#.#.#.#.#", ".#.#V#.##", "#.#.#.#.#", "##.#.#.##", "#.#.#.#.#", "#########"],
    entrances: [{ x: 0, y: 4, direction: "W" }],
    rotations: [0, 90, 180, 270], mirror: true, padding: 1, weight: 1, maxPerRegion: 1,
  },
];
