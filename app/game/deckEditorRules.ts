export type DeckEditorCardArea = "deck" | "inventory" | "floor" | "pendingRemoval";

export type DeckEditorCardLocation = {
  area: DeckEditorCardArea;
  deckId?: string;
};

export type CardOriginDeckIds = Record<number, string | null>;

type CardLike = { id: number };
type DeckLike = { id: string; cards: CardLike[] };

export function createCardOriginDeckIds(
  ownedDecks: DeckLike[],
  floorDecks: DeckLike[],
  inventoryCards: CardLike[],
  floorCards: CardLike[],
): CardOriginDeckIds {
  const origins: CardOriginDeckIds = {};
  for (const card of [...inventoryCards, ...floorCards]) origins[card.id] = null;
  for (const deck of [...ownedDecks, ...floorDecks]) {
    for (const card of deck.cards) origins[card.id] = deck.id;
  }
  return origins;
}

export function usesRareCardSlot(card: { rarity: string }) {
  return card.rarity === "rare" || card.rarity === "legendary";
}

export function countRareSlotCards(cards: readonly { rarity: string }[]) {
  return cards.filter(usesRareCardSlot).length;
}

export type DeckEditorMoveBlockReason =
  | "same-location"
  | "inventory-full"
  | "deck-full"
  | "rare-slots-full"
  | "origin-locked"
  | "rare-locked"
  | "extract-original-only";

export type DeckEditorMoveAction = "move" | "schedule-removal" | "restore-removal";

export type DeckEditorMoveValidation =
  | { allowed: true; action: DeckEditorMoveAction }
  | { allowed: false; reason: DeckEditorMoveBlockReason };

export type DeckEditorMoveRequest = {
  source: DeckEditorCardLocation;
  target: DeckEditorCardLocation;
  safeArea: boolean;
  originalOriginDeckId: string | null;
  effectiveOriginDeckId: string | null;
  targetDeckCardCount?: number;
  targetDeckCapacity?: number;
  targetDeckRareCardCount?: number;
  targetDeckRareSlotCapacity?: number;
  inventoryItemCount: number;
  inventoryCapacity: number;
  inventorySlotsFreed?: number;
  viaExtractionTicket?: boolean;
  allowsRareExtraction?: boolean;
  temporaryRareReturnArea?: "inventory" | "floor";
  isRare: boolean;
};

export function validateDeckEditorCardMove(request: DeckEditorMoveRequest): DeckEditorMoveValidation {
  const sameLocation = request.source.area === request.target.area
    && (request.source.area !== "deck" || request.source.deckId === request.target.deckId);
  if (sameLocation) return { allowed: false, reason: "same-location" };
  const inventoryItemCountAfterMove = Math.max(
    0,
    request.inventoryItemCount - (request.inventorySlotsFreed ?? 0),
  );
  if (request.target.area === "inventory"
    && request.source.area !== "inventory"
    && inventoryItemCountAfterMove >= request.inventoryCapacity) {
    return { allowed: false, reason: "inventory-full" };
  }
  if (request.target.area === "deck"
    && (request.source.area !== "deck" || request.source.deckId !== request.target.deckId)
    && (request.targetDeckCardCount ?? 0) >= (request.targetDeckCapacity ?? 0)) {
    return { allowed: false, reason: "deck-full" };
  }

  if (request.isRare && request.target.area === "deck"
    && request.source.area !== "deck"
    && (request.targetDeckRareCardCount ?? 0) >= (request.targetDeckRareSlotCapacity ?? 0)) {
    return { allowed: false, reason: "rare-slots-full" };
  }

  if (request.viaExtractionTicket) {
    if (request.source.area !== "deck"
      || (request.target.area !== "inventory" && request.target.area !== "floor")
      || request.originalOriginDeckId === null
      || request.effectiveOriginDeckId === null) {
      return { allowed: false, reason: "extract-original-only" };
    }
    if (request.isRare && !request.allowsRareExtraction) {
      return { allowed: false, reason: "rare-locked" };
    }
    return { allowed: true, action: "move" };
  }

  if (request.isRare) {
    const inventoryFloorMove = (request.source.area === "inventory" && request.target.area === "floor")
      || (request.source.area === "floor" && request.target.area === "inventory");
    if (inventoryFloorMove) return { allowed: true, action: "move" };

    const insertionFromOutside = (request.source.area === "inventory" || request.source.area === "floor")
      && request.target.area === "deck";
    if (insertionFromOutside) return { allowed: true, action: "move" };

    if (request.source.area === "deck" && request.temporaryRareReturnArea === request.target.area
      && (request.target.area === "inventory" || request.target.area === "floor")) {
      return { allowed: true, action: "move" };
    }

    if (request.source.area === "deck" && request.target.area === "floor"
      && request.originalOriginDeckId === request.source.deckId
      && request.effectiveOriginDeckId === request.source.deckId) {
      return { allowed: true, action: "schedule-removal" };
    }

    if (request.source.area === "pendingRemoval" && request.target.area === "deck"
      && request.target.deckId === request.effectiveOriginDeckId) {
      return { allowed: true, action: "restore-removal" };
    }

    return { allowed: false, reason: "rare-locked" };
  }

  if (request.safeArea) {
    return { allowed: true, action: request.source.area === "pendingRemoval" ? "restore-removal" : "move" };
  }

  if (request.source.area === "pendingRemoval") {
    if (request.target.area === "deck" && request.target.deckId === request.effectiveOriginDeckId) {
      return { allowed: true, action: "restore-removal" };
    }
    return { allowed: false, reason: "origin-locked" };
  }

  if (request.effectiveOriginDeckId !== null) {
    if (request.source.area !== "deck" || request.source.deckId !== request.effectiveOriginDeckId) {
      return { allowed: false, reason: "origin-locked" };
    }
    if (request.target.area === "floor") return { allowed: true, action: "schedule-removal" };
    if (request.target.area === "deck" && request.target.deckId === request.effectiveOriginDeckId) {
      return { allowed: false, reason: "same-location" };
    }
    return { allowed: false, reason: "origin-locked" };
  }

  return { allowed: true, action: "move" };
}
