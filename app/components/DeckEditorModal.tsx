import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Dispatch,
  DragEvent,
  MouseEvent,
  SetStateAction,
  WheelEvent,
} from "react";
import { DeckEditorCardIcon } from "./DeckEditorCardIcon";
import { CardFace } from "./CardFace";
import { DeckName } from "./DeckName";
import { deckEditorCardStackStyle } from "./deckEditorCardStackStyle";
import { ConsumableTicketTierMark, consumableTicketTierClassName } from "./ConsumableTicketTierMark";
import { VirtualizedHorizontalList, type VirtualizedHorizontalItem } from "./VirtualizedHorizontalList";
import type { Card } from "../game/cards";
import { usesRareCardSlot, type DeckEditorCardArea, type DeckEditorCardLocation } from "../game/deckEditorRules";
import { groupAndSortDeckEditorCards, type DeckEditorCardGroup } from "../game/deckEditorViews";
import type { Consumable, DeckCase, DeckEdition } from "../game/rewards";

type DeckEditorArea = DeckEditorCardArea;
type ConsumableArea = "inventory" | "floor";
type ConsumableDrag = { id: string; source: ConsumableArea; virtualKey?: string } | null;
type CardDrag = { cardId: number; source: DeckEditorArea; deckId?: string; virtualKey?: string } | null;
type DeckDrag = { deckId: string; source: "floor" | "owned"; virtualKey?: string } | null;
type DeckEditorDragKind = "card" | "consumable";
type CardGroup = DeckEditorCardGroup & { pendingRemoval?: boolean };
type ConsumableGroup = { consumable: Consumable; consumableIds: string[] };
type StackVirtualItem = VirtualizedHorizontalItem & { area: "inventory" | "floor" } & (
  | { kind: "card"; card: Card; cardIds: number[]; pendingRemoval?: boolean }
  | { kind: "ticket"; consumable: Consumable; consumableIds: string[] }
);
type InventoryVirtualItem = StackVirtualItem | (VirtualizedHorizontalItem & { kind: "empty-slot"; slot: number });
type FloorVirtualItem = StackVirtualItem | (VirtualizedHorizontalItem & { kind: "floor-deck"; deck: DeckCase });
type OwnedDeckVirtualItem = VirtualizedHorizontalItem & (
  | { kind: "card"; group: CardGroup }
  | { kind: "rare-slot"; slot: number }
  | { kind: "divider" }
  | { kind: "normal-slot"; slot: number }
);
type OwnedDeckCardView = {
  items: OwnedDeckVirtualItem[];
  rareSlotCount: number;
  rareSlotCapacity: number;
  normalSlotCapacity: number;
  normalCardCount: number;
};

type DeckEditorHeader = {
  deckEditorErrorMessage: string | null;
  deckEditorSort: "cost" | "rarity";
  setDeckEditorSort: Dispatch<SetStateAction<"cost" | "rarity">>;
  mapFeedback: { message: string; nonce: number };
};

type DeckEditorInventoryArea = {
  deckEditorInventoryItemCount: number;
  inventoryCapacity: number;
  inventoryConsumableGroups: ConsumableGroup[];
  inventoryCardGroups: CardGroup[];
  moveInventoryConsumableToFloor: (id: string) => void;
};

type DeckEditorDeckArea = {
  maxOwnedDecks: number;
  ownedDecks: DeckCase[];
  activeDeckId?: string;
  deckEditorDeckId: string;
  setDeckEditorDeckId: Dispatch<SetStateAction<string>>;
  pickUpFloorDeck: (deckId: string) => void;
  swapOwnedDecks: (sourceId: string, targetId: string) => void;
  dropOwnedDeck: (deckId: string) => void;
  canMoveDeckCardToInventory: boolean;
  rareSlotCountForDeck: (deck: DeckCase) => number;
};

type DeckEditorFloorArea = {
  currentFloorDecks: DeckCase[];
  floorConsumableGroups: ConsumableGroup[];
  floorCardGroups: CardGroup[];
  moveFloorConsumableToInventory: (id: string) => void;
};

type DeckEditorTicketActions = {
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

type DeckEditorCardPreview = {
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

type DeckEditorBehavior = {
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

function stackedVirtualWidth(itemCount: number) {
  return 74 + Math.min(5, Math.max(0, itemCount - 1)) * 7;
}

export function DeckEditorModal(props: DeckEditorModalProps) {
  const {
    header: { deckEditorErrorMessage, deckEditorSort, setDeckEditorSort, mapFeedback },
    inventoryArea: {
      deckEditorInventoryItemCount,
      inventoryCapacity,
      inventoryConsumableGroups,
      inventoryCardGroups,
      moveInventoryConsumableToFloor,
    },
    deckArea: {
      maxOwnedDecks,
      ownedDecks,
      activeDeckId,
      deckEditorDeckId,
      setDeckEditorDeckId,
      pickUpFloorDeck,
      swapOwnedDecks,
      dropOwnedDeck,
      canMoveDeckCardToInventory,
      rareSlotCountForDeck,
    },
    floorArea: {
      currentFloorDecks,
      floorConsumableGroups,
      floorCardGroups,
      moveFloorConsumableToInventory,
    },
    ticketActions: {
      isConsumableSelected,
      consumableDescription,
      selectExtractionTicket,
      applySelectedCardTicket,
      canApplyTicketToCard,
      applyTicketToCard,
      canApplyTicketToConsumable,
      applyTicketToConsumable,
      canApplyTicketToDeck,
      applyTicketToDeck,
    },
    cardPreview: {
      hoveredDeckCard,
      deckPreviewPosition,
      consumablePreview,
      moveDeckCardPreview,
      clearCardPreview,
      editionTooltip,
      showDeckCardPreview,
    },
    behavior: {
      pendingRemovalBlinkDim,
      transformedCardNewIds,
      effectiveOriginDeckIdForCard,
      scrollDeckEditorCardsHorizontally,
      onMoveCard,
      onEditorDragActivityChange,
      confirmDeckEditor,
    },
  } = props;

  const mapMessage = mapFeedback.message;
  const mapMessageNonce = mapFeedback.nonce;
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

  const [deckEditorDrag, setDeckEditorDrag] = useState<CardDrag>(null);
  const deckEditorDragRef = useRef<CardDrag>(null);
  const [deckEditorDropTarget, setDeckEditorDropTarget] = useState<DeckEditorArea | null>(null);
  const [consumableDrag, setConsumableDrag] = useState<ConsumableDrag>(null);
  const consumableDragRef = useRef<ConsumableDrag>(null);
  const [deckCaseDrag, setDeckCaseDrag] = useState<DeckDrag>(null);
  const deckCaseDragRef = useRef<DeckDrag>(null);
  const [deckCaseDropSlot, setDeckCaseDropSlot] = useState<number | null>(null);
  const [ticketDropTarget, setTicketDropTarget] = useState<string | null>(null);
  const previewReleaseTimerRef = useRef<number | null>(null);
  const activityCallbackRef = useRef(onEditorDragActivityChange);

  useEffect(() => {
    activityCallbackRef.current = onEditorDragActivityChange;
  }, [onEditorDragActivityChange]);

  const ownedDeckCardViews = useMemo(() => {
    const views = new Map<string, OwnedDeckCardView>();
    ownedDecks.forEach((deck) => {
      const groups = groupAndSortDeckEditorCards(deck.cards, deckEditorSort, transformedCardNewIds);
      const rareCardGroups = groups.filter(({ card }) => usesRareCardSlot(card));
      const normalCardGroups = groups.filter(({ card }) => !usesRareCardSlot(card));
      const rareSlotCount = rareSlotCountForDeck(deck);
      const rareSlotCapacity = Math.max(deck.rareSlotCapacity ?? 0, rareSlotCount);
      const normalSlotCapacity = Math.max(0, deck.capacity - rareSlotCapacity);
      const normalCardCount = deck.cards.filter((card) => !usesRareCardSlot(card)).length;
      const emptyRareSlotCount = Math.max(0, rareSlotCapacity - rareSlotCount);
      const items: OwnedDeckVirtualItem[] = [
        ...rareCardGroups.map((group) => ({
          kind: "card" as const,
          key: `deck-card:${deck.id}:${group.cardIds.at(-1)}`,
          width: stackedVirtualWidth(group.cardIds.length),
          group,
        })),
        ...Array.from({ length: emptyRareSlotCount }, (_, slot) => ({
          kind: "rare-slot" as const,
          key: `deck-rare-slot:${deck.id}:${slot}`,
          width: 81.4,
          slot,
        })),
        ...(rareSlotCapacity > 0 ? [{
          kind: "divider" as const,
          key: `deck-divider:${deck.id}`,
          width: 11,
        }] : []),
        ...normalCardGroups.map((group) => ({
          kind: "card" as const,
          key: `deck-card:${deck.id}:${group.cardIds.at(-1)}`,
          width: stackedVirtualWidth(group.cardIds.length),
          group,
        })),
        ...Array.from({ length: Math.max(0, normalSlotCapacity - normalCardCount) }, (_, slot) => ({
          kind: "normal-slot" as const,
          key: `deck-normal-slot:${deck.id}:${slot}`,
          width: 74,
          slot,
        })),
      ];
      views.set(deck.id, { items, rareSlotCount, rareSlotCapacity, normalSlotCapacity, normalCardCount });
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
      width: 74,
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

  const renderDeckCardGroup = (deck: DeckCase, item: Extract<OwnedDeckVirtualItem, { kind: "card" }>) => {
    const { card, cardIds } = item.group;
    const cardId = cardIds.at(-1)!;
    const isTemporary = cardIds.some((id) => effectiveOriginDeckIdForCard(id) === null);
    return (
      <button
        type="button"
        className={`deck-editor-card deck-list-entry rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""} ${isTemporary ? `is-temporary ${pendingRemovalBlinkDim ? "is-blink-dim" : ""}` : ""} ${ticketDropTarget === ticketDropKey("deck", cardId, deck.id) ? "is-ticket-drop-target" : ""}`}
        key={item.key}
        style={deckEditorCardStackStyle(cardIds.length)}
        draggable
        onDragStart={(event) => beginDeckEditorDrag(event, cardId, "deck", deck.id, item.key)}
        onDragEnd={finishDeckEditorDrag}
        onDragOver={(event) => handleTicketDragOverCard(event, card, "deck", deck, cardId)}
        onDrop={(event) => handleTicketDropOnCard(event, card, "deck", deck, cardId)}
        onDragLeave={(event) => handleTicketDragLeave(event, ticketDropKey("deck", cardId, deck.id))}
        onMouseEnter={(event) => moveDeckCardPreview(event, card)}
        onMouseMove={(event) => moveDeckCardPreview(event, card)}
        onMouseLeave={clearCardPreview}
        onClick={() => {
          setDeckEditorDeckId(deck.id);
          applySelectedCardTicket(card, "deck", deck.id, cardId);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          if (usesRareCardSlot(card)) {
            onMoveCard({ cardId, source: { area: "deck", deckId: deck.id }, target: { area: "floor" } });
          } else if (canMoveDeckCardToInventory) {
            if (deckEditorInventoryItemCount >= inventoryCapacity) {
              onMoveCard({ cardId, source: { area: "deck", deckId: deck.id }, target: { area: "floor" } });
            } else {
              onMoveCard({ cardId, source: { area: "deck", deckId: deck.id }, target: { area: "inventory" } });
            }
          } else {
            onMoveCard({ cardId, source: { area: "deck", deckId: deck.id }, target: { area: "floor" } });
          }
        }}
      >
        <DeckEditorCardIcon card={card} count={cardIds.length} showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))} />
      </button>
    );
  };

  useEffect(() => () => {
    if (previewReleaseTimerRef.current !== null) window.clearTimeout(previewReleaseTimerRef.current);
    activityCallbackRef.current("card", false);
    activityCallbackRef.current("consumable", false);
  }, []);

  const beginDeckEditorDrag = (
    event: DragEvent<HTMLElement>,
    cardId: number,
    source: DeckEditorArea,
    deckId?: string,
    virtualKey?: string,
  ) => {
    if (previewReleaseTimerRef.current !== null) window.clearTimeout(previewReleaseTimerRef.current);
    previewReleaseTimerRef.current = null;
    onEditorDragActivityChange("card", true);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${source}:${cardId}:${deckId ?? ""}`);
    const drag = { cardId, source, deckId, virtualKey };
    deckEditorDragRef.current = drag;
    setDeckEditorDrag(drag);
    setDeckEditorDropTarget(null);
    clearCardPreview();
    consumablePreview.clear();
  };

  const finishDeckEditorDrag = () => {
    deckEditorDragRef.current = null;
    setDeckEditorDrag(null);
    setDeckEditorDropTarget(null);
    clearCardPreview();
    if (previewReleaseTimerRef.current !== null) window.clearTimeout(previewReleaseTimerRef.current);
    previewReleaseTimerRef.current = window.setTimeout(() => {
      onEditorDragActivityChange("card", false);
      previewReleaseTimerRef.current = null;
    }, 140);
  };

  const beginConsumableDrag = (event: DragEvent<HTMLElement>, id: string, source: ConsumableArea, virtualKey?: string) => {
    onEditorDragActivityChange("consumable", true);
    setTicketDropTarget(null);
    const drag = { id, source, virtualKey };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `consumable:${source}:${id}`);
    consumableDragRef.current = drag;
    setConsumableDrag(drag);
  };

  const finishConsumableDrag = () => {
    consumableDragRef.current = null;
    setConsumableDrag(null);
    setTicketDropTarget(null);
    setDeckEditorDropTarget(null);
    onEditorDragActivityChange("consumable", false);
  };

  const beginDeckCaseDrag = (event: DragEvent<HTMLElement>, deckId: string, source: "floor" | "owned", virtualKey?: string) => {
    const drag = { deckId, source, virtualKey };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `deck-case:${source}:${deckId}`);
    deckCaseDragRef.current = drag;
    setDeckCaseDrag(drag);
    setDeckCaseDropSlot(null);
  };

  const finishDeckCaseDrag = () => {
    deckCaseDragRef.current = null;
    setDeckCaseDrag(null);
    setDeckCaseDropSlot(null);
  };

  const ticketDropKey = (area: "inventory" | "deck" | "floor", cardId: number, deckId?: string) =>
    `${area}:${deckId ?? ""}:${cardId}`;
  const consumableTicketDropKey = (ticketId: string) => `ticket:${ticketId}`;

  const handleTicketDragOverCard = (
    event: DragEvent<HTMLElement>,
    card: Card,
    area: "inventory" | "deck" | "floor",
    deck?: DeckCase,
    targetCardId = card.id,
  ) => {
    const drag = consumableDragRef.current ?? consumableDrag;
    if (!drag || !canApplyTicketToCard(drag.id, card, area, deck)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setTicketDropTarget(ticketDropKey(area, targetCardId, deck?.id));
  };

  const handleTicketDragLeave = (event: DragEvent<HTMLElement>, targetKey: string) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) return;
    setTicketDropTarget((current) => current === targetKey ? null : current);
  };

  const handleTicketDropOnCard = (
    event: DragEvent<HTMLElement>,
    card: Card,
    area: "inventory" | "deck" | "floor",
    deck?: DeckCase,
    targetCardId = card.id,
  ) => {
    const drag = consumableDragRef.current ?? consumableDrag;
    if (!drag || !canApplyTicketToCard(drag.id, card, area, deck)) return;
    event.preventDefault();
    event.stopPropagation();
    applyTicketToCard(drag.id, card, area, deck, targetCardId);
    finishConsumableDrag();
  };

  const handleTicketDragOverConsumable = (event: DragEvent<HTMLElement>, target: Consumable) => {
    const drag = consumableDragRef.current ?? consumableDrag;
    if (!drag || !canApplyTicketToConsumable(drag.id, target.id)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setTicketDropTarget(consumableTicketDropKey(target.id));
  };

  const handleTicketDropOnConsumable = (event: DragEvent<HTMLElement>, target: Consumable) => {
    const drag = consumableDragRef.current ?? consumableDrag;
    if (!drag || !canApplyTicketToConsumable(drag.id, target.id)) return;
    event.preventDefault();
    event.stopPropagation();
    applyTicketToConsumable(drag.id, target.id);
    finishConsumableDrag();
  };

  const handleTicketDragOverDeck = (event: DragEvent<HTMLElement>, deck: DeckCase) => {
    const drag = consumableDragRef.current ?? consumableDrag;
    if (!drag || !canApplyTicketToDeck(drag.id, deck)) return false;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDeckEditorDeckId(deck.id);
    setDeckEditorDropTarget("deck");
    return true;
  };

  const handleTicketDropOnDeck = (event: DragEvent<HTMLElement>, deck: DeckCase) => {
    const drag = consumableDragRef.current ?? consumableDrag;
    if (!drag || !canApplyTicketToDeck(drag.id, deck)) return false;
    event.preventDefault();
    event.stopPropagation();
    applyTicketToDeck(drag.id, deck);
    finishConsumableDrag();
    return true;
  };

  const dropDeckEditorCard = (event: DragEvent<HTMLElement>, target: DeckEditorArea, targetDeckId?: string) => {
    event.preventDefault();
    // Nested deck rows also receive drop; stop bubbling to avoid moving the same card twice.
    event.stopPropagation();
    const [payloadSource, payloadId, payloadDeckId] = event.dataTransfer.getData("text/plain").split(":");
    const drag = deckEditorDragRef.current ?? deckEditorDrag;
    const source = drag?.source ?? (payloadSource as DeckEditorArea);
    const cardId = drag?.cardId ?? Number(payloadId);
    const sourceDeckId = drag?.deckId ?? (payloadDeckId || undefined);
    if (Number.isInteger(cardId)) {
      const sourceLocation: DeckEditorCardLocation = { area: source, ...(sourceDeckId ? { deckId: sourceDeckId } : {}) };
      const targetLocation: DeckEditorCardLocation = { area: target, ...(targetDeckId ? { deckId: targetDeckId } : {}) };
      const isValidSource = ["deck", "inventory", "floor", "pendingRemoval"].includes(source);
      if (isValidSource && !(source === "deck" && target === "deck" && sourceDeckId === targetDeckId)) {
        onMoveCard({ cardId, source: sourceLocation, target: targetLocation });
      }
    }
    deckEditorDragRef.current = null;
    setDeckEditorDrag(null);
    setDeckEditorDropTarget(null);
    onEditorDragActivityChange("card", false);
  };

  const dropConsumable = (event: DragEvent<HTMLElement>, target: ConsumableArea) => {
    const drag = consumableDragRef.current ?? consumableDrag;
    if (!drag || drag.source === target) return;
    event.preventDefault();
    event.stopPropagation();
    if (drag.source === "floor" && target === "inventory") moveFloorConsumableToInventory(drag.id);
    if (drag.source === "inventory" && target === "floor") moveInventoryConsumableToFloor(drag.id);
    finishConsumableDrag();
  };

  const renderTicketItem = (item: StackVirtualItem) => {
    if (item.kind !== "ticket" || !item.consumable || !item.consumableIds) return null;
    const { consumable, consumableIds } = item;
    const consumableId = consumableIds.at(-1)!;
    const area = item.area;
    return (
      <button
        type="button"
        className={`consumable-ticket ${area === "inventory" ? "inventory-ticket" : "floor-ticket"} ${consumable.type} ${consumableTicketTierClassName(consumable.type)} ${isConsumableSelected(consumable) ? "is-selected" : ""} ${ticketDropTarget === consumableTicketDropKey(consumableId) ? "is-ticket-drop-target" : ""}`}
        key={item.key}
        style={deckEditorCardStackStyle(consumableIds.length)}
        draggable
        onDragStart={(event) => beginConsumableDrag(event, consumableId, area, item.key)}
        onDragEnd={finishConsumableDrag}
        onDragOver={(event) => handleTicketDragOverConsumable(event, consumable)}
        onDrop={(event) => handleTicketDropOnConsumable(event, consumable)}
        onDragLeave={(event) => handleTicketDragLeave(event, consumableTicketDropKey(consumableId))}
        onMouseEnter={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          consumablePreview.show(consumable, bounds.right, bounds.top);
        }}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          consumablePreview.show(consumable, bounds.right, bounds.top);
        }}
        onMouseLeave={consumablePreview.clear}
        onFocus={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          consumablePreview.show(consumable, bounds.right, bounds.top);
        }}
        onBlur={consumablePreview.clear}
        onClick={() => {
          if (area === "inventory" || ["paintTicket", "cloneTicket", "extractTicket", "extractPlusTicket", "transformTicket", "bombTicket", "darkTicket"].includes(consumable.type)) {
            selectExtractionTicket(consumable);
          } else {
            moveFloorConsumableToInventory(consumableId);
          }
        }}
        onContextMenu={area === "inventory" ? (event) => {
          event.preventDefault();
          moveInventoryConsumableToFloor(consumableId);
        } : undefined}
        aria-pressed={isConsumableSelected(consumable)}
        aria-label={`${consumable.name} ${consumableIds.length}장`}
      >
        <ConsumableTicketTierMark type={consumable.type} />
        <strong>{consumable.name}</strong>
        <small>{consumableDescription(consumable)}</small>
        {consumableIds.length > 1 && <span className="inventory-card-count">x{consumableIds.length}</span>}
      </button>
    );
  };

  const renderCardItem = (item: StackVirtualItem) => {
    if (item.kind !== "card" || !item.card || !item.cardIds) return null;
    const { card, cardIds, pendingRemoval = false } = item;
    const cardId = cardIds.at(-1)!;
    if (pendingRemoval) {
      return (
        <div
          className={`deck-editor-card is-pending-removal ${pendingRemovalBlinkDim ? "is-blink-dim" : ""} rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""} ${deckEditorDrag?.cardId === cardId ? "is-dragging" : ""}`}
          key={item.key}
          style={deckEditorCardStackStyle(cardIds.length)}
          draggable
          onDragStart={(event) => beginDeckEditorDrag(event, cardId, "pendingRemoval", undefined, item.key)}
          onDragEnd={finishDeckEditorDrag}
          onMouseEnter={(event) => moveDeckCardPreview(event, card)}
          onMouseMove={(event) => moveDeckCardPreview(event, card)}
          onMouseLeave={clearCardPreview}
          onContextMenu={item.area === "floor" ? (event) => {
            event.preventDefault();
            onMoveCard({
              cardId,
              source: { area: "pendingRemoval" },
              target: { area: "deck", deckId: effectiveOriginDeckIdForCard(cardId) ?? editingDeck?.id },
            });
          } : undefined}
          aria-label={`${card.name} ${cardIds.length}장, 제거 예정${item.area === "floor" ? ", 우클릭하면 원래 덱으로 복귀" : ""}`}
        >
          <DeckEditorCardIcon card={card} count={cardIds.length} showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))} />
          <span className="pending-removal-icon" aria-label="제거 예정" title="제거 예정">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 12H8L7 9Zm3 2v8h2v-8h-2Zm4 0v8h-2v-8h2Z" /></svg>
          </span>
        </div>
      );
    }

    const area = item.area;
    const areaKey = area === "inventory" ? "inventory" : "floor";
    const location = ticketDropKey(areaKey, cardId);
    return (
      <button
        type="button"
        className={`deck-editor-card rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""} ${deckEditorDrag?.cardId === cardId ? "is-dragging" : ""} ${ticketDropTarget === location ? "is-ticket-drop-target" : ""}`}
        key={item.key}
        style={deckEditorCardStackStyle(cardIds.length)}
        draggable
        onDragStart={(event) => beginDeckEditorDrag(event, cardId, area, undefined, item.key)}
        onDragEnd={finishDeckEditorDrag}
        onDragOver={(event) => handleTicketDragOverCard(event, card, area, undefined, cardId)}
        onDrop={(event) => handleTicketDropOnCard(event, card, area, undefined, cardId)}
        onDragLeave={(event) => handleTicketDragLeave(event, location)}
        onMouseEnter={(event) => moveDeckCardPreview(event, card)}
        onMouseMove={(event) => moveDeckCardPreview(event, card)}
        onMouseLeave={clearCardPreview}
        onFocus={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          showDeckCardPreview(card, bounds.right, bounds.top);
        }}
        onBlur={clearCardPreview}
        onClick={() => {
          if (area === "inventory") {
            if (!applySelectedCardTicket(card, "inventory", undefined, cardId)) onMoveCard({
              cardId,
              source: { area: "inventory" },
              target: { area: "deck", deckId: editingDeck?.id },
            });
          } else if (!applySelectedCardTicket(card, "floor", undefined, cardId)) {
            onMoveCard({ cardId, source: { area: "floor" }, target: { area: "inventory" } });
          }
        }}
        onContextMenu={area === "inventory" ? (event) => {
          event.preventDefault();
          onMoveCard({ cardId, source: { area: "inventory" }, target: { area: "floor" } });
        } : undefined}
        aria-label={area === "inventory"
          ? `${card.name}, 좌클릭하면 선택한 덱으로 이동, 우클릭하면 바닥으로 이동`
          : `${card.name}, 인벤토리에 줍기`}
      >
        <DeckEditorCardIcon card={card} count={cardIds.length} showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))} />
      </button>
    );
  };

  const renderInventoryItem = (item: InventoryVirtualItem) => item.kind === "ticket"
    ? renderTicketItem(item)
    : item.kind === "card"
      ? renderCardItem(item)
      : <span className="deck-editor-empty-card-slot" key={item.key} />;

  const renderOwnedDeckItem = (deck: DeckCase, item: OwnedDeckVirtualItem) => {
    if (item.kind === "card") return renderDeckCardGroup(deck, item);
    if (item.kind === "rare-slot") {
      return <div className="deck-editor-rare-slot is-empty" key={item.key} role="img" aria-label="빈 희귀 슬롯" />;
    }
    if (item.kind === "divider") {
      return <div className="deck-editor-slot-divider" key={item.key} role="separator" aria-label="희귀 슬롯과 일반 슬롯 구분" />;
    }
    return <span className="deck-editor-empty-card-slot" key={item.key} />;
  };

  const renderFloorItem = (item: FloorVirtualItem) => {
    if (item.kind === "ticket") return renderTicketItem(item);
    if (item.kind === "card") return renderCardItem(item);
    const { deck } = item;
    return (
      <button
        type="button"
        className="floor-deck-item"
        key={item.key}
        draggable
        onDragStart={(event) => beginDeckCaseDrag(event, deck.id, "floor", item.key)}
        onDragEnd={finishDeckCaseDrag}
        onClick={() => pickUpFloorDeck(deck.id)}
        aria-label={`${deck.name}, 카드 ${deck.cards.length}장, 용량 ${deck.capacity}. 누르면 줍기`}
      >
        <span className="floor-deck-icon" aria-hidden="true" />
        <strong><DeckName deck={deck} showEditionTooltips={false} /></strong>
        <span>{deck.cards.length} / {deck.capacity}</span>
        <small>눌러서 줍기</small>
      </button>
    );
  };

  return (
    <div className="deck-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="deck-editor-title">

            <div className="deck-editor-stage">
              <section className="deck-editor-panel" onClick={(event) => event.stopPropagation()}>
              <header className="deck-editor-header">
                <div>
                  <h2 id="deck-editor-title">덱 편집</h2>
                </div>
                {deckEditorErrorMessage && <p className="deck-editor-message" role="status">{deckEditorErrorMessage}</p>}
                <div className="deck-editor-header-costs">
                  <div className="deck-editor-sort" aria-label="카드 정렬 방식">
                    <button type="button" className={deckEditorSort === "cost" ? "is-active" : ""} onClick={() => setDeckEditorSort("cost")}>코스트 순</button>
                    <button type="button" className={deckEditorSort === "rarity" ? "is-active" : ""} onClick={() => setDeckEditorSort("rarity")}>희귀도 순</button>
                  </div>
                </div>
              </header>

              <div className="deck-editor-columns">
                <section
                  className={`deck-editor-column inventory-column ${deckEditorDropTarget === "inventory" ? "is-drop-target" : ""}`}
                  onDragOver={(event) => {
                    const itemDrag = consumableDragRef.current ?? consumableDrag;
                    if (itemDrag?.source === "floor") {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      return;
                    }
                    const drag = deckEditorDragRef.current ?? deckEditorDrag;
                    const source = drag?.source;
                    if (source !== "floor" && source !== "pendingRemoval" && source !== "deck") return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDeckEditorDropTarget("inventory");
                  }}
                  onDrop={(event) => {
                    if ((consumableDragRef.current ?? consumableDrag)?.source === "floor") {
                      dropConsumable(event, "inventory");
                      return;
                    }
                    dropDeckEditorCard(event, "inventory");
                  }}
                >
                  <div className="deck-editor-column-title">
                    <h3>인벤토리</h3>
                    <strong className={deckEditorInventoryItemCount > inventoryCapacity ? "is-full" : ""}>
                      {deckEditorInventoryItemCount} / {inventoryCapacity}
                    </strong>
                  </div>
                  <VirtualizedHorizontalList
                    className="deck-editor-card-list"
                    items={inventoryVirtualItems}
                    renderItem={renderInventoryItem}
                    pinnedKey={deckEditorDrag?.virtualKey ?? consumableDrag?.virtualKey ?? deckCaseDrag?.virtualKey}
                    onWheel={scrollDeckEditorCardsHorizontally}
                  />
                </section>

                <div className="deck-editor-decks" aria-label="보유 덱 전체">
                  {Array.from({ length: maxOwnedDecks }, (_, index) => {
                    const deck = ownedDecks[index];
                    if (!deck) {
                      return (
                        <div
                          className={`deck-editor-deck-row empty-deck-row ${deckCaseDrag?.source === "floor" && deckCaseDropSlot === index ? "is-deck-drop-target" : ""}`}
                          key={`empty-deck-${index}`}
                          onDragOver={(event) => {
                            const drag = deckCaseDragRef.current ?? deckCaseDrag;
                            if (drag?.source !== "floor") return;
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            setDeckCaseDropSlot(index);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            const drag = deckCaseDragRef.current ?? deckCaseDrag;
                            if (drag?.source === "floor") pickUpFloorDeck(drag.deckId);
                            finishDeckCaseDrag();
                          }}
                        >
                          <strong>덱 {index + 1}</strong><span>빈 덱 칸</span>
                        </div>
                      );
                    }
                    const isSelected = deck.id === editingDeck?.id;
                    const deckView = ownedDeckCardViews.get(deck.id);
                    if (!deckView) return null;
                    return (
                      <section
                        className={`deck-editor-deck-row ${isSelected ? "is-selected" : ""} ${deck.id === activeDeck?.id ? "is-active-deck" : ""} ${deckEditorDropTarget === "deck" && deckEditorDeckId === deck.id ? "is-drop-target" : ""}`}
                        key={deck.id}
                        onDragOver={(event) => {
                          if (handleTicketDragOverDeck(event, deck)) return;
                          const drag = deckEditorDragRef.current ?? deckEditorDrag;
                          if (!drag || (drag.source === "deck" && drag.deckId === deck.id)) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDeckEditorDeckId(deck.id);
                          setDeckEditorDropTarget("deck");
                        }}
                        onDrop={(event) => {
                          if (handleTicketDropOnDeck(event, deck)) return;
                          dropDeckEditorCard(event, "deck", deck.id);
                        }}
                      >
                        <button
                          type="button"
                          className={`deck-editor-deck-heading ${deckCaseDropSlot === index ? "is-deck-drop-target" : ""}`}
                          draggable
                          onDragStart={(event) => beginDeckCaseDrag(event, deck.id, "owned")}
                          onDragEnd={finishDeckCaseDrag}
                          onDragOver={(event) => {
                            const drag = deckCaseDragRef.current ?? deckCaseDrag;
                            if (drag?.source === "owned" && drag.deckId !== deck.id) {
                              event.preventDefault();
                              event.stopPropagation();
                              setDeckCaseDropSlot(index);
                              return;
                            }
                            if (handleTicketDragOverDeck(event, deck)) return;
                            const cardDrag = deckEditorDragRef.current ?? deckEditorDrag;
                            if (!cardDrag || (cardDrag.source === "deck" && cardDrag.deckId === deck.id)) return;
                            event.preventDefault();
                            event.stopPropagation();
                            setDeckEditorDeckId(deck.id);
                            setDeckEditorDropTarget("deck");
                          }}
                          onDrop={(event) => {
                            const drag = deckCaseDragRef.current ?? deckCaseDrag;
                            if (drag?.source === "owned") {
                              event.preventDefault();
                              event.stopPropagation();
                              swapOwnedDecks(drag.deckId, deck.id);
                              finishDeckCaseDrag();
                              return;
                            }
                            if (handleTicketDropOnDeck(event, deck)) return;
                            const cardDrag = deckEditorDragRef.current ?? deckEditorDrag;
                            if (!cardDrag || (cardDrag.source === "deck" && cardDrag.deckId === deck.id)) return;
                            dropDeckEditorCard(event, "deck", deck.id);
                          }}
                          onClick={() => setDeckEditorDeckId(deck.id)}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            dropOwnedDeck(deck.id);
                          }}
                        >
                          <span>덱 {index + 1}{deck.id === activeDeck?.id ? " · 사용 중" : ""}</span>
                          <strong>
                            <DeckName
                              deck={deck}
                              onEditionTooltipHover={editionTooltip.show}
                              onEditionTooltipLeave={editionTooltip.clear}
                            />
                          </strong>
                          <small>{deck.cards.length} / {deck.capacity}</small>
                        </button>
                        <VirtualizedHorizontalList
                          className="deck-editor-deck-list"
                          items={deckView.items}
                          renderItem={(item) => renderOwnedDeckItem(deck, item)}
                          pinnedKey={deckEditorDrag?.source === "deck" && deckEditorDrag.deckId === deck.id
                            ? deckEditorDrag.virtualKey
                            : undefined}
                          onWheel={scrollDeckEditorCardsHorizontally}
                          onDragOver={(event) => {
                            if (handleTicketDragOverDeck(event, deck)) return;
                            const drag = deckEditorDragRef.current ?? deckEditorDrag;
                            if (!drag || (drag.source === "deck" && drag.deckId === deck.id)) return;
                            event.preventDefault();
                            event.stopPropagation();
                            setDeckEditorDeckId(deck.id);
                            setDeckEditorDropTarget("deck");
                          }}
                          onDrop={(event) => {
                            if (handleTicketDropOnDeck(event, deck)) return;
                            dropDeckEditorCard(event, "deck", deck.id);
                          }}
                        />
                      </section>
                    );
                  })}
                </div>
              </div>

              <section className="deck-editor-floor-section">
                <div className="area-flow-arrow floor-inventory-flow" aria-hidden="true">
                  <span />
                  <span />
                </div>
                <div className="deck-editor-floor-heading">
                  <div><strong>바닥</strong></div>
                </div>
                <div className="deck-editor-floor-layout">
                  <VirtualizedHorizontalList
                    className={`deck-editor-floor-cards ${deckEditorDropTarget === "floor" ? "is-drop-target" : ""} ${deckCaseDrag?.source === "owned" ? "is-deck-drop-target" : ""}`}
                    items={floorVirtualItems}
                    renderItem={renderFloorItem}
                    pinnedKey={deckEditorDrag?.virtualKey ?? consumableDrag?.virtualKey ?? deckCaseDrag?.virtualKey}
                    onWheel={scrollDeckEditorCardsHorizontally}
                    onDragOver={(event) => {
                      const deckDrag = deckCaseDragRef.current ?? deckCaseDrag;
                      if (deckDrag?.source === "owned") {
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = "move";
                        return;
                      }
                      const itemDrag = consumableDragRef.current ?? consumableDrag;
                      if (itemDrag?.source === "inventory") {
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = "move";
                        return;
                      }
                      const drag = deckEditorDragRef.current ?? deckEditorDrag;
                      const source = drag?.source;
                      if (source !== "inventory" && source !== "deck" && source !== "pendingRemoval") return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDeckEditorDropTarget("floor");
                    }}
                    onDrop={(event) => {
                      const deckDrag = deckCaseDragRef.current ?? deckCaseDrag;
                      if (deckDrag?.source === "owned") {
                        event.preventDefault();
                        event.stopPropagation();
                        dropOwnedDeck(deckDrag.deckId);
                        finishDeckCaseDrag();
                        return;
                      }
                      if ((consumableDragRef.current ?? consumableDrag)?.source === "inventory") {
                        dropConsumable(event, "floor");
                        return;
                      }
                      dropDeckEditorCard(event, "floor");
                    }}
                  />
                </div>
              </section>

              <footer className="deck-editor-footer">
                <div className="deck-editor-footer-actions">
                  <button
                    type="button"
                    className="confirm"
                    onClick={confirmDeckEditor}
                    disabled={deckEditorInventoryItemCount > inventoryCapacity}
                  >확인</button>
                </div>
              </footer>
              </section>
              {hoveredDeckCard && !deckEditorDrag && (
                <aside
                  className="deck-card-preview-floating"
                  style={{ left: deckPreviewPosition.x, top: deckPreviewPosition.y }}
                  aria-live="polite"
                >
                  <div className={`card-face ${hoveredDeckCard.kind} ${hoveredDeckCard.damageType}`}>
                    <CardFace card={hoveredDeckCard} />
                  </div>
                </aside>
              )}
            {consumablePreview.hovered && !consumableDrag && (
                <aside
                  className={`deck-consumable-preview-floating ${consumablePreview.hovered.type}`}
                  style={{ left: deckPreviewPosition.x, top: deckPreviewPosition.y }}
                  aria-live="polite"
                >
                  <strong>{consumablePreview.hovered.name}</strong>
                  <p>{consumablePreview.hovered.description}</p>
                </aside>
              )}
            </div>
            {mapMessage && <p key={mapMessageNonce} className="map-message deck-editor-map-message" role="status" aria-live="polite">{mapMessage}</p>}
          
    </div>
  );
}
