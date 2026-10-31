import type { Dispatch, MouseEvent, SetStateAction, WheelEvent } from "react";
import type { Card } from "../../game/cards";
import type { DeckEditorCardArea, DeckEditorCardLocation } from "../../game/deckEditorRules";
import type { DeckEditorCardGroup } from "../../game/deckEditorViews";
import type { Consumable, DeckCase, DeckEdition } from "../../game/rewards";
import type { VirtualizedHorizontalItem } from "../VirtualizedHorizontalList";

export type DeckEditorArea = DeckEditorCardArea;
export type ConsumableArea = "inventory" | "floor";
export type ConsumableDrag = { id: string; source: ConsumableArea; virtualKey?: string } | null;
export type CardDrag = { cardId: number; source: DeckEditorArea; deckId?: string; virtualKey?: string } | null;
export type TouchDragCandidate = {
  pointerId: number;
  kind: "card" | "consumable";
  id: number | string;
  source: DeckEditorArea | ConsumableArea;
  deckId?: string;
  virtualKey?: string;
  pointerType: string;
  startedAt: number;
  lastX: number;
  lastY: number;
  scrolling: boolean;
  sourceList: HTMLElement | null;
  sectionScroller: HTMLElement | null;
  startX: number;
  startY: number;
  sourceElement: HTMLElement;
  grabOffsetX: number;
  grabOffsetY: number;
  active: boolean;
};
export type DeckDrag = { deckId: string; source: "floor" | "owned"; virtualKey?: string } | null;
export type DeckEditorDragKind = "card" | "consumable";
export type CardGroup = DeckEditorCardGroup & { pendingRemoval?: boolean };
export type ConsumableGroup = { consumable: Consumable; consumableIds: string[] };
export type StackVirtualItem = VirtualizedHorizontalItem & { area: "inventory" | "floor" } & (
  | { kind: "card"; card: Card; cardIds: number[]; pendingRemoval?: boolean }
  | { kind: "ticket"; consumable: Consumable; consumableIds: string[] }
);
export type InventoryVirtualItem = StackVirtualItem | (VirtualizedHorizontalItem & { kind: "empty-slot"; slot: number });
export type FloorVirtualItem = StackVirtualItem | (VirtualizedHorizontalItem & { kind: "floor-deck"; deck: DeckCase });
export type OwnedDeckVirtualItem = VirtualizedHorizontalItem & (
  | { kind: "card"; group: CardGroup }
  | { kind: "rare-slot"; slot: number }
  | { kind: "divider" }
  | { kind: "normal-slot"; slot: number }
);
export type OwnedDeckCardView = {
  items: OwnedDeckVirtualItem[];
  rareSlotCount: number;
  rareSlotCapacity: number;
  normalSlotCapacity: number;
  normalCardCount: number;
};

export type DeckEditorHeader = {
  deckEditorErrorMessage: string | null;
  deckEditorSort: "cost" | "rarity";
  setDeckEditorSort: Dispatch<SetStateAction<"cost" | "rarity">>;
  mapFeedback: { message: string; nonce: number };
};

export type DeckEditorInventoryArea = {
  deckEditorInventoryItemCount: number;
  inventoryCapacity: number;
  inventoryConsumableGroups: ConsumableGroup[];
  inventoryCardGroups: CardGroup[];
  moveInventoryConsumableToFloor: (id: string) => void;
};

export type DeckEditorDeckArea = {
  maxOwnedDecks: number;
  ownedDecks: DeckCase[];
  activeDeckId?: string;
  deckEditorDeckId: string;
  setDeckEditorDeckId: Dispatch<SetStateAction<string>>;
  onSelectActiveDeck: (deckId: string) => void;
  pickUpFloorDeck: (deckId: string) => void;
  swapOwnedDecks: (sourceId: string, targetId: string) => void;
  dropOwnedDeck: (deckId: string) => void;
  canMoveDeckCardToInventory: boolean;
  rareSlotCountForDeck: (deck: DeckCase) => number;
};

export type DeckEditorFloorArea = {
  currentFloorDecks: DeckCase[];
  floorConsumableGroups: ConsumableGroup[];
  floorCardGroups: CardGroup[];
  moveFloorConsumableToInventory: (id: string) => void;
};

export type DeckEditorTicketActions = {
  isConsumableSelected: (consumable: Consumable) => boolean;
  consumableDescription: (consumable: Consumable) => string;
  selectExtractionTicket: (consumable: Consumable) => void;
  applySelectedCardTicket: (
    card: Card,
    area: "inventory" | "floor" | "deck",
    deckId?: string,
    targetCardId?: number,
  ) => boolean;
  canApplyTicketToCard: (ticketId: string, card: Card, area: "inventory" | "deck" | "floor", deck?: DeckCase) => boolean;
  applyTicketToCard: (ticketId: string, card: Card, area: "inventory" | "deck" | "floor", deck?: DeckCase, targetCardId?: number) => void;
  canApplyTicketToConsumable: (ticketId: string, targetId: string) => boolean;
  applyTicketToConsumable: (ticketId: string, targetId: string) => void;
  canApplyTicketToDeck: (ticketId: string, deck: DeckCase) => boolean;
  applyTicketToDeck: (ticketId: string, deck: DeckCase) => void;
};

export type DeckEditorCardPreview = {
  hoveredDeckCard: Card | null;
  deckPreviewPosition: { x: number; y: number };
  consumablePreview: {
    hovered: Consumable | null;
    show: (consumable: Consumable, right: number, top: number) => void;
    clear: () => void;
  };
  moveDeckCardPreview: (event: MouseEvent<HTMLElement>, card: Card) => void;
  clearCardPreview: () => void;
  editionTooltip: {
    show: (event: MouseEvent<HTMLElement>, edition: DeckEdition) => void;
    clear: () => void;
  };
  showDeckCardPreview: (card: Card, right: number, top: number) => void;
};

export type DeckEditorBehavior = {
  pendingRemovalBlinkDim: boolean;
  transformedCardNewIds: Set<number>;
  effectiveOriginDeckIdForCard: (id: number) => string | null;
  scrollDeckEditorCardsHorizontally: (event: WheelEvent<HTMLDivElement>) => void;
  onMoveCard: (move: { cardId: number; source: DeckEditorCardLocation; target: DeckEditorCardLocation }) => void;
  onEditorDragActivityChange: (kind: DeckEditorDragKind, active: boolean) => void;
  confirmDeckEditor: () => void;
};

export type DeckEditorModalProps = {
  header: DeckEditorHeader;
  inventoryArea: DeckEditorInventoryArea;
  deckArea: DeckEditorDeckArea;
  floorArea: DeckEditorFloorArea;
  ticketActions: DeckEditorTicketActions;
  cardPreview: DeckEditorCardPreview;
  behavior: DeckEditorBehavior;
};
