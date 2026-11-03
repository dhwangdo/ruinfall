import type { Card } from "./cards";
import { DECK_EDITION_INFO, type Consumable, type DeckCase } from "./rewards.ts";
import { getRegionNumber, mapRoomKey, parseMapRoomKey, type MapPosition, type RoomType } from "./mapRules.ts";
import { MAP_ROOM_LABELS } from "./mapRoomLabels.ts";
import { groupAndSortDeckEditorCards } from "./deckEditorViews.ts";

export type MapSearchKind = "vault" | "item" | "place";
export type MapSearchEntry = {
  id: string; position: MapPosition; region: number; kind: MapSearchKind;
  label: string; searchText: string; opened?: boolean;
  deck?: DeckCase; card?: Card; consumable?: Consumable; count?: number;
};
export type MapSearchData = {
  seenRooms: ReadonlySet<string>; seed: number;
  roomTypeAt: (position: MapPosition) => RoomType;
  openedVaultRooms: ReadonlySet<string>;
  vaults: Record<string, DeckCase>; cards: Record<string, Card[]>;
  decks: Record<string, DeckCase[]>; consumables: Record<string, Consumable[]>;
};

const normalize = (text: string) => text.normalize("NFKC").toLocaleLowerCase("ko").replace(/\s+/g, "");
const deckText = (deck: DeckCase) => [deck.name, ...deck.cards.map(card => card.name),
  ...deck.editions.map(edition => DECK_EDITION_INFO[edition]?.name ?? "")].join(" ");

/** Build only when the search opens; never generate content or inspect undiscovered cells. */
export function buildMapSearchEntries(data: MapSearchData): MapSearchEntry[] {
  const entries: MapSearchEntry[] = [];
  for (const key of data.seenRooms) {
    const position = parseMapRoomKey(key), region = getRegionNumber(position, data.seed);
    const base = { position, region };
    const vault = data.vaults[key];
    if (vault) entries.push({ ...base, id: `vault:${key}`, kind: "vault", deck: vault,
      label: `덱 「${vault.name}」`, searchText: normalize(deckText(vault)), opened: data.openedVaultRooms.has(key) });
    for (const deck of data.decks[key] ?? []) entries.push({ ...base, id: `deck:${key}:${deck.id}`, kind: "item", deck,
      label: `덱 「${deck.name}」`, searchText: normalize(deckText(deck)) });
    for (const group of groupAndSortDeckEditorCards(data.cards[key] ?? [], "rarity", new Set())) {
      entries.push({ ...base, id: `card:${key}:${group.card.id}`, kind: "item", card: group.card,
        label: group.card.name, count: group.cardIds.length, searchText: normalize(group.card.name) });
    }
    const consumables = new Map<string, { item: Consumable; count: number }>();
    for (const item of data.consumables[key] ?? []) {
      const group = consumables.get(item.type);
      if (group) group.count++;
      else consumables.set(item.type, { item, count: 1 });
    }
    for (const { item, count } of consumables.values()) entries.push({ ...base,
      id: `ticket:${key}:${item.type}`, kind: "item", consumable: item,
      label: item.name, count, searchText: normalize(item.name) });
    const type = data.roomTypeAt(position);
    if (!["empty", "rock", "void", "deckVault"].includes(type)) entries.push({ ...base,
      id: `place:${key}`, kind: "place", label: MAP_ROOM_LABELS[type], searchText: normalize(MAP_ROOM_LABELS[type]) });
  }
  return entries.sort((a, b) => a.region - b.region || a.label.localeCompare(b.label, "ko")
    || mapRoomKey(a.position).localeCompare(mapRoomKey(b.position)));
}

export function filterMapSearchEntries(entries: readonly MapSearchEntry[], options: {
  query: string; kind: MapSearchKind | "all"; region: number | "all"; includeOpened: boolean;
}) {
  const terms = options.query.trim().split(/\s+/).map(normalize).filter(Boolean);
  return entries.filter(entry => (options.kind === "all" || entry.kind === options.kind)
    && (options.region === "all" || entry.region === options.region)
    && (options.includeOpened || !entry.opened)
    && terms.every(term => entry.searchText.includes(term)));
}
