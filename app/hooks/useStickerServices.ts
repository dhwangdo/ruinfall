import { useEffect, useRef, useState } from "react";
import type { RunInventory } from "./useRunInventory";
import type { RunWorld } from "./useRunWorld";
import { mapRoomKey } from "../game/mapRules";
import { applyStickerServiceCards, isStickerServiceKind, resolveStickerService, stickerServicePrice, stickerServiceRandom, tinkererStickerAt, type StickerServiceSite } from "../game/stickerServices";

export function useStickerServices({ inventory, world, queueRunSave }: {
  inventory: RunInventory; world: RunWorld; queueRunSave: (delay?: number) => void;
}) {
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const submittingRef = useRef(false);
  useEffect(() => { submittingRef.current = false; }, [inventory.gold, inventory.inventoryCards, inventory.ownedDecks, world.roomServiceUses]);
  const kind = world.effectiveRoomType(world.mapPosition);
  const fixedSticker = kind === "tinkerer" ? tinkererStickerAt(world.mapPosition, world.mapSeed) : null;
  const uses = roomKey ? world.roomServiceUses[roomKey] ?? 0 : 0;
  const site: StickerServiceSite | null = roomKey === mapRoomKey(world.mapPosition) && isStickerServiceKind(kind)
    ? { kind, roomKey, fixedSticker, uses, price: stickerServicePrice(kind, uses, fixedSticker) } : null;
  const open = () => {
    if (!isStickerServiceKind(kind)) return;
    setRoomKey(mapRoomKey(world.mapPosition));
  };
  const close = () => setRoomKey(null);
  const submit = (primaryCardId: number, secondaryCardId?: number) => {
    if (submittingRef.current || !site) return null;
    const result = resolveStickerService({ ...site, cards: [...inventory.inventoryCards, ...inventory.ownedDecks.flatMap(deck => deck.cards)],
      primaryCardId, secondaryCardId, gold: inventory.gold, random: stickerServiceRandom(site.roomKey, site.uses, primaryCardId) });
    if (!result.ok) return result;
    submittingRef.current = true;
    inventory.setGold(current => current - result.price);
    inventory.setInventoryCards(current => applyStickerServiceCards(current, result));
    inventory.setOwnedDecks(current => current.map(deck => ({ ...deck, cards: applyStickerServiceCards(deck.cards, result) })));
    world.setRoomServiceUses(current => ({ ...current, [site.roomKey]: (current[site.roomKey] ?? 0) + 1 }));
    queueRunSave();
    return result;
  };
  return { site, open, close, submit, isOpen: roomKey !== null };
}
