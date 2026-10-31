import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "../game/cards";
import { createConsumable, createStarterDeck, getDeckEditionColor, STARTING_DECK_SIZE, type Consumable,
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
  const deckDropChanceRef = useRef(0.25);

  const rareCardDropChanceRef = useRef(0.05);

  const deckPityBattlesRemainingRef = useRef(3);

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
    roomDeckDrops, roomShops, gold,
  }), [
    ownedDecks, activeDeckId, inventoryCards, inventoryConsumables, roomDrops, roomConsumableDrops,
    roomDeckDrops, roomShops, gold,
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
  }, []);

  return { saveState, restoreInventory, ownedDecks, setOwnedDecks, activeDeckId, setActiveDeckId,
    inventoryCards, setInventoryCards, inventoryConsumables, setInventoryConsumables, inventoryConsumablesRef,
    roomDrops, setRoomDrops, roomConsumableDrops, setRoomConsumableDrops,
    roomDeckDrops, setRoomDeckDrops, roomShops, setRoomShops, gold, setGold,
    deckDropChanceRef, rareCardDropChanceRef, deckPityBattlesRemainingRef,
    nextCardIdRef, nextConsumableIdRef, nextConsumable, updateDeckCards };
}

export type RunInventory = ReturnType<typeof useRunInventory>;
