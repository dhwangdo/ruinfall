import type { MapPosition, RoomType } from "../game/mapRules";

const FLOOR_COLORS = [[145, 173, 129], [168, 120, 82], [222, 197, 139], [171, 216, 230]];

/** Stable paint colors: no random changes on movement and no per-tile filter layers. */
export function mapTileColor(position: MapPosition, roomType: RoomType, region: number | null) {
  if (roomType !== "empty" && roomType !== "rock") return undefined;
  const base = roomType === "rock" ? [37, 50, 76] : FLOOR_COLORS[region ?? 0] ?? FLOOR_COLORS[0];
  let hash = Math.imul(position.x, 0x45d9f3b) ^ Math.imul(position.y, 0x119de1f3);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  const brightness = .94 + (hash & 255) / 255 * .12;
  const saturation = .91 + ((hash >>> 8) & 255) / 255 * .18;
  const mean = (base[0] + base[1] + base[2]) / 3;
  return `rgb(${base.map(channel => Math.round((mean + (channel - mean) * saturation) * brightness)).join(" ")})`;
}
