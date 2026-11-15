import { useState } from "react";
import type { Card } from "../game/cards";
import {
  createCardOriginDeckIds,
  type CardOriginDeckIds,
} from "../game/deckEditorRules.ts";
import type { Consumable, DeckCase } from "../game/rewards";

export type DeckEditorSnapshot = {
  roomKey: string;
  decks: DeckCase[];
  activeDeckId: string;
  inventory: Card[];
  consumables: Consumable[];
  floorCards: Card[];
  floorConsumables: Consumable[];
  floorDecks: DeckCase[];
  originDeckIdsByCardId: CardOriginDeckIds;
};

export type DeckEditorSessionStart = Omit<DeckEditorSnapshot, "originDeckIdsByCardId">;

export function createDeckEditorSnapshot(start: DeckEditorSessionStart): DeckEditorSnapshot {
  const decks = start.decks.map((deck) => ({ ...deck, cards: [...deck.cards] }));
  const floorDecks = start.floorDecks.map((deck) => ({ ...deck, cards: [...deck.cards] }));
  const inventory = [...start.inventory];
  const floorCards = [...start.floorCards];
  return {
    ...start,
    decks,
    floorDecks,
    inventory,
    consumables: [...start.consumables],
    floorCards,
    floorConsumables: [...start.floorConsumables],
    originDeckIdsByCardId: createCardOriginDeckIds(decks, floorDecks, inventory, floorCards),
  };
}

export function useDeckEditorSession() {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<DeckEditorSnapshot | null>(null);

  const beginSession = (start: DeckEditorSessionStart) => {
    setSnapshot(createDeckEditorSnapshot(start));
    setIsOpen(true);
  };
  const finishSession = () => {
    setSnapshot(null);
    setIsOpen(false);
  };

  return { isOpen, snapshot, beginSession, finishSession };
}
