import type { Card } from "./cards";
import type { DeckCase } from "./rewards";
import type {
  DeckEditorCardLocation,
  DeckEditorMoveAction,
} from "./deckEditorRules";

export type DeckEditorCardCollections = {
  ownedDecks: DeckCase[];
  inventoryCards: Card[];
  floorCards: Card[];
  pendingRemovedCards: Card[];
  pendingRemovedCardAreas: Record<number, "inventory" | "floor">;
};

export type DeckEditorCardTransitionRequest = {
  cardId: number;
  source: DeckEditorCardLocation;
  target: DeckEditorCardLocation;
  action: DeckEditorMoveAction;
};

export type DeckEditorCardTransition = {
  card: Card;
  collections: DeckEditorCardCollections;
};

function findCard(
  collections: DeckEditorCardCollections,
  location: DeckEditorCardLocation,
  cardId: number,
) {
  if (location.area === "deck") {
    return collections.ownedDecks
      .find((deck) => deck.id === location.deckId)?.cards
      .find((card) => card.id === cardId);
  }
  if (location.area === "inventory") {
    return collections.inventoryCards.find((card) => card.id === cardId);
  }
  if (location.area === "pendingRemoval") {
    return collections.pendingRemovedCards.find((card) => card.id === cardId);
  }
  return collections.floorCards.find((card) => card.id === cardId);
}

/** Apply an already validated editor move to the card collections. */
export function transitionDeckEditorCardCollections(
  collections: DeckEditorCardCollections,
  request: DeckEditorCardTransitionRequest,
): DeckEditorCardTransition | null {
  const card = findCard(collections, request.source, request.cardId);
  if (!card) return null;
  if (request.source.area === "deck"
    && !collections.ownedDecks.some((deck) => deck.id === request.source.deckId)) return null;
  if (request.target.area === "deck"
    && !collections.ownedDecks.some((deck) => deck.id === request.target.deckId)) return null;

  let ownedDecks = collections.ownedDecks;
  let inventoryCards = collections.inventoryCards;
  let floorCards = collections.floorCards;
  let pendingRemovedCards = collections.pendingRemovedCards;
  let pendingRemovedCardAreas = collections.pendingRemovedCardAreas;

  if (request.source.area === "deck") {
    ownedDecks = ownedDecks.map((deck) => deck.id === request.source.deckId
      ? { ...deck, cards: deck.cards.filter((item) => item.id !== request.cardId) }
      : deck);
  } else if (request.source.area === "inventory") {
    inventoryCards = inventoryCards.filter((item) => item.id !== request.cardId);
  } else if (request.source.area === "floor") {
    floorCards = floorCards.filter((item) => item.id !== request.cardId);
  } else {
    pendingRemovedCards = pendingRemovedCards.filter((item) => item.id !== request.cardId);
    if (Object.hasOwn(pendingRemovedCardAreas, request.cardId)) {
      pendingRemovedCardAreas = { ...pendingRemovedCardAreas };
      delete pendingRemovedCardAreas[request.cardId];
    }
  }

  if (request.action === "schedule-removal") {
    pendingRemovedCards = [...pendingRemovedCards, card];
    pendingRemovedCardAreas = { ...pendingRemovedCardAreas, [card.id]: "floor" };
  } else if (request.target.area === "deck") {
    ownedDecks = ownedDecks.map((deck) => deck.id === request.target.deckId
      ? { ...deck, cards: [...deck.cards, card] }
      : deck);
  } else if (request.target.area === "inventory") {
    inventoryCards = [...inventoryCards, card];
  } else if (request.target.area === "floor") {
    floorCards = [...floorCards, card];
  }

  return {
    card,
    collections: {
      ownedDecks,
      inventoryCards,
      floorCards,
      pendingRemovedCards,
      pendingRemovedCardAreas,
    },
  };
}
