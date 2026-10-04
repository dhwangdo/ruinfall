import type { Card } from "./cards";

type RarePaletteCard = Pick<Card, "name" | "rarity"> & { id?: number };

const RARE_PALETTE_COUNT = 6;

export function rareCardPaletteClass(card: RarePaletteCard): string {
  if (card.rarity !== "rare") return "";

  // A card keeps its palette through rerenders, moves, and previews.
  const key = `${card.id ?? "pool"}:${card.name}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 0x01000193);
  }
  return `rare-palette rare-palette-${(hash >>> 0) % RARE_PALETTE_COUNT}`;
}
