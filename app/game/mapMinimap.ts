import type { MapEnemy, MapEnemyCellMemory } from "./mapEnemies.ts";
import { mapRoomKey, type MapPosition, type RoomType } from "./mapRules.ts";

export const MINIMAP_COLUMNS = 81;
export const MINIMAP_ROWS = 81;
export const MINIMAP_TILE_SIZE = 3;
export const MINIMAP_COLORS = {
  background: "#111516", floor: "#7d8b80", wall: "#303b44",
  player: "#fff8e5", enemy: "#f04e4e", rememberedEnemy: "#963b3b",
  vault: "#b7804b", portal: "#b28af2", recovery: "#62c884",
  blessing: "#ebc75b", item: "#67c9df", special: "#94b6bd",
} as const;

function roomColor(type: RoomType): string {
  switch (type) {
    case "empty": return MINIMAP_COLORS.floor;
    case "rock": return MINIMAP_COLORS.wall;
    case "deckVault": return MINIMAP_COLORS.vault;
    case "portal": case "safePortal": return MINIMAP_COLORS.portal;
    case "heal": case "partialHeal": case "recoveryShrine": case "vitalityShrine":
      return MINIMAP_COLORS.recovery;
    case "blessing": return MINIMAP_COLORS.blessing;
    case "boss": return MINIMAP_COLORS.enemy;
    default: return MINIMAP_COLORS.special;
  }
}

type MinimapSource = {
  player: MapPosition;
  knownRooms: ReadonlyMap<string, MapPosition>;
  visibleRoomKeys: ReadonlySet<string>;
  enemies: readonly MapEnemy[];
  enemyMemory: MapEnemyCellMemory;
  roomTypeAt: (position: MapPosition) => RoomType;
  hasItemsAt: (roomKey: string) => boolean;
  debugMode?: boolean;
};

/** Sample a fixed local window; never query terrain or live enemies in unexplored cells. */
export function buildMinimapCells(
  source: MinimapSource,
  columns = MINIMAP_COLUMNS,
  rows = MINIMAP_ROWS,
  center: MapPosition = source.player,
) {
  const origin = {
    x: Math.floor(center.x) - Math.floor(columns / 2),
    y: Math.floor(center.y) - Math.floor(rows / 2),
  };
  const playerKey = mapRoomKey(source.player);
  const enemyKeys = new Set(source.enemies
    .filter(enemy => source.debugMode || source.visibleRoomKeys.has(mapRoomKey(enemy.position)))
    .map(enemy => mapRoomKey(enemy.position)));
  const cells: Array<MapPosition & { color: string }> = [];
  for (let y = origin.y; y < origin.y + rows; y++) {
    for (let x = origin.x; x < origin.x + columns; x++) {
      const position = { x, y }, key = mapRoomKey(position);
      if (key === playerKey) {
        cells.push({ ...position, color: MINIMAP_COLORS.player });
        continue;
      }
      if (!source.debugMode && !source.knownRooms.has(key)) continue;
      const type = source.roomTypeAt(position);
      if (type === "void") continue;
      const rememberedEnemy = !source.debugMode && !source.visibleRoomKeys.has(key) && source.enemyMemory[key];
      const color = enemyKeys.has(key) ? MINIMAP_COLORS.enemy
        : rememberedEnemy ? MINIMAP_COLORS.rememberedEnemy
        : type === "empty" && source.hasItemsAt(key) ? MINIMAP_COLORS.item : roomColor(type);
      cells.push({ ...position, color });
    }
  }
  return { origin, cells };
}
