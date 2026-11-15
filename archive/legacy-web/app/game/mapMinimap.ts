import type { MapEnemy, MapEnemyCellMemory } from "./mapEnemies.ts";
import { mapRoomKey, type MapPosition, type RoomType } from "./mapRules.ts";

export const MINIMAP_COLUMNS = 81;
export const MINIMAP_ROWS = 81;
export const MINIMAP_TILE_SIZE = 3;
export const MINIMAP_COLORS = {
  background: "#111516", floor: "#657568", wall: "#303b44",
  player: "#ffffff", enemy: "#f04e4e", rememberedEnemy: "#963b3b",
  vault: "#ffad42", portal: "#c43cff", recovery: "#4ff58b",
  blessing: "#ffe65a", item: "#73e5ff", special: "#55e5f5",
} as const;

export function minimapRoomColor(type: RoomType): string {
  switch (type) {
    case "empty": return MINIMAP_COLORS.floor;
    case "rock": return MINIMAP_COLORS.wall;
    case "deckVault": return MINIMAP_COLORS.vault;
    case "stickerAltar": case "tinkerer": case "cardTransmuter": return MINIMAP_COLORS.special;
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
  const enemyKeys = new Set(source.enemies
    .filter(enemy => source.debugMode || source.visibleRoomKeys.has(mapRoomKey(enemy.position)))
    .map(enemy => mapRoomKey(enemy.position)));
  const cells: Array<MapPosition & { color: string }> = [];
  for (let y = origin.y; y < origin.y + rows; y++) {
    for (let x = origin.x; x < origin.x + columns; x++) {
      const position = { x, y }, key = mapRoomKey(position);
      if (!source.debugMode && !source.knownRooms.has(key)) continue;
      const type = source.roomTypeAt(position);
      if (type === "void") continue;
      const rememberedEnemy = !source.debugMode && !source.visibleRoomKeys.has(key) && source.enemyMemory[key];
      const color = enemyKeys.has(key) ? MINIMAP_COLORS.enemy
        : rememberedEnemy ? MINIMAP_COLORS.rememberedEnemy
        : type === "empty" && source.hasItemsAt(key) ? MINIMAP_COLORS.item : minimapRoomColor(type);
      cells.push({ ...position, color });
    }
  }
  return { origin, cells };
}
