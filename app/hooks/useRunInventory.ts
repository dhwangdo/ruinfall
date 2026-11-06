import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Card } from "../game/cards";
import { createConsumable, createStarterDeck, createRegionDeck, getDeckEditionColor, isDeckEdition, STARTING_DECK_SIZE, type Consumable,
  type ConsumableType, type DeckCase } from "../game/rewards";

import type { PreparedRunRestore } from "../game/runSaveState";

/** Travel needs newly generated loot before React's next render commits. */
function useFloorDrops<T>() {
  const [drops, setRenderedDrops] = useState<Record<string, T[]>>({});
  const ref = useRef(drops);
  const setDrops = useCallback<Dispatch<SetStateAction<Record<string, T[]>>>>((update) => {
    const next = typeof update === "function" ? update(ref.current) : update;
    ref.current = next;
    setRenderedDrops(next);
  }, []);
  return [drops, setDrops, ref] as const;
}

function removeDeletedDeckEditions(deck: DeckCase): DeckCase {
  const editions = deck.editions.filter(isDeckEdition);
  return {
    ...deck,
    editions,
    editionColors: Object.fromEntries(editions.map((edition) => [
      edition,
      deck.editionColors[edition] ?? getDeckEditionColor(edition),
    ])),
  };
}

/** Owns the run's item collections and identities across map, shop, and editor screens. */
export function useRunInventory() {
  const [ownedDecks, setOwnedDecks] = useState<DeckCase[]>(() => [createStarterDeck()]);
  const [activeDeckId, setActiveDeckId] = useState("starter");
  const [inventoryCards, setInventoryCards] = useState<Card[]>([]);
  const [inventoryConsumables, setInventoryConsumables] = useState<Consumable[]>([]);
  const inventoryConsumablesRef = useRef<Consumable[]>([]);
  const [roomDrops, setRoomDrops, roomDropsRef] = useFloorDrops<Card>();
  const [roomConsumableDrops, setRoomConsumableDrops, roomConsumableDropsRef] = useFloorDrops<Consumable>();
  const [roomDeckDrops, setRoomDeckDrops, roomDeckDropsRef] = useFloorDrops<DeckCase>();
  const hasFloorItems = useCallback((key: string) =>
    (roomDropsRef.current[key]?.length ?? 0) + (roomConsumableDropsRef.current[key]?.length ?? 0)
      + (roomDeckDropsRef.current[key]?.length ?? 0) > 0,
  [roomDropsRef, roomConsumableDropsRef, roomDeckDropsRef]);

  const [keys, setRenderedKeys] = useState(0);
  const keysRef = useRef(0);
  const setKeys = useCallback<Dispatch<SetStateAction<number>>>((update) => {
    const next = typeof update === "function" ? update(keysRef.current) : update;
    keysRef.current = next;
    setRenderedKeys(next);
  }, []);
  const [skipPortalKeyWarning, setSkipPortalKeyWarning] = useState(false);
  const [roomDeckVaults, setRoomDeckVaults] = useState<Record<string, DeckCase>>({});
  const roomDeckVaultsRef = useRef<Record<string, DeckCase>>({});
  const resetDeckVaults = useCallback(() => {
    roomDeckVaultsRef.current = {};
    setRoomDeckVaults({});
    setKeys(0);
    setSkipPortalKeyWarning(false);
  }, [setKeys]);
  const rareCardDropChanceRef = useRef(0.05);


  const nextCardIdRef = useRef(STARTING_DECK_SIZE);
  const nextConsumableIdRef = useRef(1);

  useEffect(() => {
    inventoryConsumablesRef.current = inventoryConsumables;
  }, [inventoryConsumables]);

  const nextConsumable = useCallback((type: ConsumableType) => {
    const id = `consumable-${nextConsumableIdRef.current}`;
    nextConsumableIdRef.current += 1;
    return createConsumable(type, id);
  }, []);

  const ensureDeckVault = useCallback((roomKey: string, region: number, capacityBonus = 0) => {
    const existing = roomDeckVaultsRef.current[roomKey];
    if (existing) return existing;
    const deck = createRegionDeck(region, nextCardIdRef.current, capacityBonus);
    nextCardIdRef.current += deck.cards.length;
    roomDeckVaultsRef.current = { ...roomDeckVaultsRef.current, [roomKey]: deck };
    setRoomDeckVaults(roomDeckVaultsRef.current);
    return deck;
  }, []);

  const updateDeckCards = useCallback((deckId: string | undefined, updater: Card[] | ((cards: Card[]) => Card[])) => {
    if (!deckId) return;
    setOwnedDecks((current) => current.map((deck) => {
      if (deck.id !== deckId) return deck;
      const cards = typeof updater === "function" ? updater(deck.cards) : updater;
      return { ...deck, cards };
    }));
  }, []);

  const saveState = useMemo(() => ({
    ownedDecks, activeDeckId, inventoryCards, inventoryConsumables, roomDrops, roomConsumableDrops,
    roomDeckDrops, keys, skipPortalKeyWarning, roomDeckVaults,
  }), [
    ownedDecks, activeDeckId, inventoryCards, inventoryConsumables, roomDrops, roomConsumableDrops,
    roomDeckDrops, keys, skipPortalKeyWarning, roomDeckVaults,
  ]);
  const restoreInventory = useCallback((state: PreparedRunRestore) => {
    setOwnedDecks(state.ownedDecks.map(removeDeletedDeckEditions));
    setActiveDeckId(state.activeDeckId);
    setInventoryCards(state.inventoryCards);
    setInventoryConsumables(state.inventoryConsumables);
    inventoryConsumablesRef.current = state.inventoryConsumables;
    setRoomDrops(state.roomDrops);
    setRoomConsumableDrops(state.roomConsumableDrops);
    setRoomDeckDrops(Object.fromEntries(Object.entries(state.roomDeckDrops).map(([key, decks]) => [
      key, decks.map(removeDeletedDeckEditions),
    ])));
    setKeys(state.keys);
    setSkipPortalKeyWarning(state.skipPortalKeyWarning);
    roomDeckVaultsRef.current = state.roomDeckVaults;
    setRoomDeckVaults(state.roomDeckVaults);
  }, [setKeys, setRoomDrops, setRoomConsumableDrops, setRoomDeckDrops]);

  return { saveState, restoreInventory, ownedDecks, setOwnedDecks, activeDeckId, setActiveDeckId,
    inventoryCards, setInventoryCards, inventoryConsumables, setInventoryConsumables, inventoryConsumablesRef,
    roomDrops, setRoomDrops, roomConsumableDrops, setRoomConsumableDrops, hasFloorItems,
    roomDeckDrops, setRoomDeckDrops, 
    keys, keysRef, setKeys, skipPortalKeyWarning, setSkipPortalKeyWarning, roomDeckVaults, roomDeckVaultsRef, ensureDeckVault, resetDeckVaults,
    rareCardDropChanceRef,
    nextCardIdRef, nextConsumableIdRef, nextConsumable, updateDeckCards };
}

export type RunInventory = ReturnType<typeof useRunInventory>;
