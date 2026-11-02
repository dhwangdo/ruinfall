import { useMemo } from "react";
import { createDeckCardView } from "../game/deckEditorViews";
import type { DeckEditorModalProps, OwnedDeckCardView, InventoryVirtualItem, FloorVirtualItem } from "../components/deck-editor/types";

function stackedVirtualWidth(itemCount: number) {
  return 82 + Math.min(5, Math.max(0, itemCount - 1)) * 7;
}

export function useDeckEditorItems(props: DeckEditorModalProps) {
  const { header: { deckEditorSort }, inventoryArea: { inventoryCardGroups, inventoryConsumableGroups,
    inventoryCapacity, deckEditorInventoryItemCount }, floorArea: { currentFloorDecks, floorCardGroups,
    floorConsumableGroups }, deckArea: { ownedDecks, activeDeckId, deckEditorDeckId, rareSlotCountForDeck },
    behavior: { transformedCardNewIds } } = props;
  const activeDeck = ownedDecks.find((deck) => deck.id === activeDeckId);
  const editingDeck = ownedDecks.find((deck) => deck.id === deckEditorDeckId) ?? activeDeck;
  const { removedInventoryCardGroups, availableInventoryCardGroups } = useMemo(() => ({
    removedInventoryCardGroups: inventoryCardGroups.filter((group) => group.pendingRemoval),
    availableInventoryCardGroups: inventoryCardGroups.filter((group) => !group.pendingRemoval),
  }), [inventoryCardGroups]);
  const { removedFloorCardGroups, availableFloorCardGroups } = useMemo(() => ({
    removedFloorCardGroups: floorCardGroups.filter((group) => group.pendingRemoval),
    availableFloorCardGroups: floorCardGroups.filter((group) => !group.pendingRemoval),
  }), [floorCardGroups]);

  const ownedDeckCardViews = useMemo(() => {
    const views = new Map<string, OwnedDeckCardView>();
    ownedDecks.forEach((deck) => {
      views.set(deck.id, createDeckCardView(deck, deckEditorSort, transformedCardNewIds, rareSlotCountForDeck(deck)));
    });
    return views;
  }, [ownedDecks, deckEditorSort, transformedCardNewIds, rareSlotCountForDeck]);

  const inventoryVirtualItems = useMemo<InventoryVirtualItem[]>(() => [
    ...inventoryConsumableGroups.map(({ consumable, consumableIds }) => ({
      kind: "ticket" as const,
      key: `inventory-ticket:${consumableIds.at(-1)}`,
      width: stackedVirtualWidth(consumableIds.length),
      area: "inventory" as const,
      consumable,
      consumableIds,
    })),
    ...removedInventoryCardGroups.map(({ card, cardIds }) => ({
      kind: "card" as const,
      key: `inventory-pending:${cardIds.at(-1)}`,
      width: stackedVirtualWidth(cardIds.length),
      area: "inventory" as const,
      card,
      cardIds,
      pendingRemoval: true,
    })),
    ...availableInventoryCardGroups.map(({ card, cardIds }) => ({
      kind: "card" as const,
      key: `inventory-card:${cardIds.at(-1)}`,
      width: stackedVirtualWidth(cardIds.length),
      area: "inventory" as const,
      card,
      cardIds,
      pendingRemoval: false,
    })),
    ...Array.from({ length: Math.max(0, inventoryCapacity - deckEditorInventoryItemCount) }, (_, slot) => ({
      kind: "empty-slot" as const,
      key: `inventory-slot:${slot}`,
      width: 82,
      slot,
    })),
  ], [inventoryConsumableGroups, removedInventoryCardGroups, availableInventoryCardGroups, inventoryCapacity, deckEditorInventoryItemCount]);

  const floorVirtualItems = useMemo<FloorVirtualItem[]>(() => [
    ...currentFloorDecks.map((deck) => ({
      kind: "floor-deck" as const,
      key: `floor-deck:${deck.id}`,
      width: 148,
      deck,
    })),
    ...floorConsumableGroups.map(({ consumable, consumableIds }) => ({
      kind: "ticket" as const,
      key: `floor-ticket:${consumableIds.at(-1)}`,
      width: stackedVirtualWidth(consumableIds.length),
      area: "floor" as const,
      consumable,
      consumableIds,
    })),
    ...removedFloorCardGroups.map(({ card, cardIds }) => ({
      kind: "card" as const,
      key: `floor-pending:${cardIds.at(-1)}`,
      width: stackedVirtualWidth(cardIds.length),
      area: "floor" as const,
      card,
      cardIds,
      pendingRemoval: true,
    })),
    ...availableFloorCardGroups.map(({ card, cardIds }) => ({
      kind: "card" as const,
      key: `floor-card:${cardIds.at(-1)}`,
      width: stackedVirtualWidth(cardIds.length),
      area: "floor" as const,
      card,
      cardIds,
      pendingRemoval: false,
    })),
  ], [currentFloorDecks, floorConsumableGroups, removedFloorCardGroups, availableFloorCardGroups]);

  return { activeDeck, editingDeck, ownedDeckCardViews, inventoryVirtualItems, floorVirtualItems };
}
