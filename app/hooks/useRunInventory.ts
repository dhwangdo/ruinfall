import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Card } from "../game/cards";
import { createConsumable, createStarterDeck, createRegionDeck, getDeckEditionColor, STARTING_DECK_SIZE, type Consumable,
  type ConsumableType, type DeckCase, type ShopOffer } from "../game/rewards";

import type { PreparedRunRestore } from "../game/runSaveState";

const REMOVED_DECK_EDITIONS = new Set(["transparent", "golden", "debug", "firepower", "growth"]);

function removeDeletedDeckEditions(deck: DeckCase): DeckCase {
  const editions = deck.editions.filter((edition) => !REMOVED_DECK_EDITIONS.has(edition as string));
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
  const [inventoryConsumables, setInventoryConsumables] = useState<Consumable[]>(() => [
    createConsumable("extractTicket", "starter-extract"),
  ]);
  const inventoryConsumablesRef = useRef<Consumable[]>([]);
  const [roomDrops, setRoomDrops] = useState<Record<string, Card[]>>({});
  const [roomConsumableDrops, setRoomConsumableDrops] = useState<Record<string, Consumable[]>>({});
  const [roomDeckDrops, setRoomDeckDrops] = useState<Record<string, DeckCase[]>>({});
  const [roomShops, setRoomShops] = useState<Record<string, ShopOffer[]>>({});
  const [gold, setGold] = useState(0);

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
    roomDeckDrops, roomShops, gold, keys, skipPortalKeyWarning, roomDeckVaults,
  }), [
    ownedDecks, activeDeckId, inventoryCards, inventoryConsumables, roomDrops, roomConsumableDrops,
    roomDeckDrops, roomShops, gold, keys, skipPortalKeyWarning, roomDeckVaults,
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
    setRoomShops(state.roomShops);
    setGold(state.gold);
    setKeys(state.keys);
    setSkipPortalKeyWarning(state.skipPortalKeyWarning);
    roomDeckVaultsRef.current = state.roomDeckVaults;
    setRoomDeckVaults(state.roomDeckVaults);
  }, [setKeys]);

  return { saveState, restoreInventory, ownedDecks, setOwnedDecks, activeDeckId, setActiveDeckId,
    inventoryCards, setInventoryCards, inventoryConsumables, setInventoryConsumables, inventoryConsumablesRef,
    roomDrops, setRoomDrops, roomConsumableDrops, setRoomConsumableDrops,
    roomDeckDrops, setRoomDeckDrops, roomShops, setRoomShops, gold, setGold,
    keys, keysRef, setKeys, skipPortalKeyWarning, setSkipPortalKeyWarning, roomDeckVaults, roomDeckVaultsRef, ensureDeckVault, resetDeckVaults,
    rareCardDropChanceRef,
    nextCardIdRef, nextConsumableIdRef, nextConsumable, updateDeckCards };
}

export type RunInventory = ReturnType<typeof useRunInventory>;
