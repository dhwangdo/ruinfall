import type {
  CSSProperties,
  ComponentType,
  Dispatch,
  DragEvent,
  MouseEvent,
  SetStateAction,
  WheelEvent,
} from "react";
import { DeckEditorCardIcon } from "./DeckEditorCardIcon";
import { DeckName } from "./DeckName";
import type { Card } from "../game/cards";
import type { DeckEditorCardArea } from "../game/deckEditorRules";
import type { CardFaceProps } from "./CardFace";
import type { Consumable, DeckCase, DeckEdition } from "../game/rewards";

type DeckEditorArea = DeckEditorCardArea;
type ConsumableArea = "inventory" | "floor";
type ConsumableDrag = { id: string; source: ConsumableArea } | null;
type CardDrag = { cardId: number; source: DeckEditorArea; deckId?: string } | null;
type DeckDrag = { deckId: string; source: "floor" | "owned" } | null;
type CardGroup = { card: Card; cardIds: number[] };
type ConsumableGroup = { consumable: Consumable; consumableIds: string[] };
type EditionTooltip = { edition: DeckEdition; x: number; y: number; width: number };

export type DeckEditorModalProps = {
  deckEditorOpen: boolean;
  deckEditorErrorMessage: string | null;
  deckEditorSort: "cost" | "rarity";
  setDeckEditorSort: Dispatch<SetStateAction<"cost" | "rarity">>;
  deckEditorDropTarget: DeckEditorArea | null;
  setDeckEditorDropTarget: Dispatch<SetStateAction<DeckEditorArea | null>>;
  deckEditorInventoryItemCount: number;
  inventoryCapacity: number;
  maxOwnedDecks: number;
  ownedDecks: DeckCase[];
  activeDeck?: DeckCase;
  editingDeck?: DeckCase;
  deckEditorDeckId: string;
  setDeckEditorDeckId: Dispatch<SetStateAction<string>>;
  inventoryConsumableGroups: ConsumableGroup[];
  removedInventoryCardGroups: CardGroup[];
  inventoryCardGroups: CardGroup[];
  currentFloorDecks: DeckCase[];
  floorConsumableGroups: ConsumableGroup[];
  removedFloorCardGroups: CardGroup[];
  floorCardGroups: CardGroup[];
  deckEditorDrag: CardDrag;
  deckEditorDragRef: { current: CardDrag };
  consumableDrag: ConsumableDrag;
  consumableDragRef: { current: ConsumableDrag };
  deckCaseDrag: DeckDrag;
  deckCaseDragRef: { current: DeckDrag };
  deckCaseDropSlot: number | null;
  setDeckCaseDropSlot: Dispatch<SetStateAction<number | null>>;
  ticketDropTarget: string | null;
  pendingRemovalBlinkDim: boolean;
  transformedCardNewIds: Set<number>;
  pendingCloneTicketId: string | null;
  pendingPaintTicketId: string | null;
  pendingExtractTicketId: string | null;
  pendingTransformTicketId: string | null;
  hoveredDeckCard: Card | null;
  hoveredConsumable: Consumable | null;
  deckPreviewPosition: { x: number; y: number };
  mapMessage: string;
  mapMessageNonce: number;
  CardFace: ComponentType<CardFaceProps>;
  deckEditorCardStackStyle: (count: number) => CSSProperties | undefined;
  isConsumableSelected: (consumable: Consumable) => boolean;
  consumableDescription: (consumable: Consumable) => string;
  beginConsumableDrag: (event: DragEvent<HTMLElement>, id: string, source: ConsumableArea) => void;
  finishConsumableDrag: () => void;
  showConsumablePreview: (consumable: Consumable, right: number, top: number) => void;
  setHoveredConsumable: Dispatch<SetStateAction<Consumable | null>>;
  selectExtractionTicket: (consumable: Consumable) => void;
  moveInventoryConsumableToFloor: (id: string) => void;
  beginDeckEditorDrag: (event: DragEvent<HTMLElement>, id: number, source: DeckEditorArea, deckId?: string) => void;
  finishDeckEditorDrag: () => void;
  moveDeckCardPreview: (event: MouseEvent<HTMLElement>, card: Card) => void;
  setHoveredDeckCard: Dispatch<SetStateAction<Card | null>>;
  clearCardKeywordHover: () => void;
  ticketDropKey: (area: "inventory" | "deck" | "floor", id: number, deckId?: string) => string;
  handleTicketDragOverCard: (event: DragEvent<HTMLElement>, card: Card, area: "inventory" | "deck" | "floor", deck: DeckCase | undefined, id: number) => void;
  handleTicketDropOnCard: (event: DragEvent<HTMLElement>, card: Card, area: "inventory" | "deck" | "floor", deck: DeckCase | undefined, id: number) => void;
  handleTicketDragLeave: (event: DragEvent<HTMLElement>, key: string) => void;
  cloneCardWithTicket: (card: Card) => void;
  transformCardWithTicket: (card: Card, area: "inventory" | "floor" | "deck", deckId?: string) => void;
  moveInventoryCardToDeck: (id: number) => void;
  moveInventoryCardToFloor: (id: number) => void;
  beginDeckCaseDrag: (event: DragEvent<HTMLElement>, deckId: string, source: "floor" | "owned") => void;
  finishDeckCaseDrag: () => void;
  pickUpFloorDeck: (deckId: string) => void;
  swapOwnedDecks: (sourceId: string, targetId: string) => void;
  dropOwnedDeck: (deckId: string) => void;
  showDeckEditionTooltip: (event: MouseEvent<HTMLElement>, edition: DeckEdition) => void;
  setHoveredDeckEditionTooltip: Dispatch<SetStateAction<EditionTooltip | null>>;
  groupAndSortCards: (cards: Card[]) => CardGroup[];
  effectiveOriginDeckIdForCard: (id: number) => string | null;
  paintDeckCard: (cardId: number, ticketId: string, deckId: string) => void;
  extractDeckCardWithTicket: (cardId: number, deckId: string) => void;
  canMoveDeckCardToInventory: boolean;
  moveDeckCardToFloor: (cardId: number, deckId: string) => void;
  moveDeckCardToInventory: (cardId: number, deckId: string) => void;
  dropConsumable: (event: DragEvent<HTMLElement>, target: ConsumableArea) => void;
  dropDeckEditorCard: (event: DragEvent<HTMLElement>, target: DeckEditorArea, deckId?: string) => void;
  scrollDeckEditorCardsHorizontally: (event: WheelEvent<HTMLDivElement>) => void;
  moveFloorConsumableToInventory: (id: string) => void;
  restorePendingRemovedCardToDeck: (cardId: number) => void;
  moveFloorCardToInventory: (id: number) => void;
  confirmDeckEditor: () => void;
  showDeckCardPreview: (card: Card, right: number, top: number) => void;
};

export function DeckEditorModal(props: DeckEditorModalProps) {
  const {
    deckEditorOpen,
    deckEditorErrorMessage,
    deckEditorSort,
    setDeckEditorSort,
    deckEditorDropTarget,
    setDeckEditorDropTarget,
    deckEditorInventoryItemCount,
    inventoryCapacity,
    maxOwnedDecks,
    ownedDecks,
    activeDeck,
    editingDeck,
    deckEditorDeckId,
    setDeckEditorDeckId,
    inventoryConsumableGroups,
    removedInventoryCardGroups,
    inventoryCardGroups,
    currentFloorDecks,
    floorConsumableGroups,
    removedFloorCardGroups,
    floorCardGroups,
    deckEditorDrag,
    deckEditorDragRef,
    consumableDrag,
    consumableDragRef,
    deckCaseDrag,
    deckCaseDragRef,
    deckCaseDropSlot,
    setDeckCaseDropSlot,
    ticketDropTarget,
    pendingRemovalBlinkDim,
    transformedCardNewIds,
    pendingCloneTicketId,
    pendingPaintTicketId,
    pendingExtractTicketId,
    pendingTransformTicketId,
    hoveredDeckCard,
    hoveredConsumable,
    deckPreviewPosition,
    mapMessage,
    mapMessageNonce,
    CardFace,
    deckEditorCardStackStyle,
    isConsumableSelected,
    consumableDescription,
    beginConsumableDrag,
    finishConsumableDrag,
    showConsumablePreview,
    setHoveredConsumable,
    selectExtractionTicket,
    moveInventoryConsumableToFloor,
    beginDeckEditorDrag,
    finishDeckEditorDrag,
    moveDeckCardPreview,
    setHoveredDeckCard,
    clearCardKeywordHover,
    ticketDropKey,
    handleTicketDragOverCard,
    handleTicketDropOnCard,
    handleTicketDragLeave,
    cloneCardWithTicket,
    transformCardWithTicket,
    moveInventoryCardToDeck,
    moveInventoryCardToFloor,
    beginDeckCaseDrag,
    finishDeckCaseDrag,
    pickUpFloorDeck,
    swapOwnedDecks,
    dropOwnedDeck,
    showDeckEditionTooltip,
    setHoveredDeckEditionTooltip,
    groupAndSortCards,
    effectiveOriginDeckIdForCard,
    paintDeckCard,
    extractDeckCardWithTicket,
    canMoveDeckCardToInventory,
    moveDeckCardToFloor,
    moveDeckCardToInventory,
    dropConsumable,
    dropDeckEditorCard,
    scrollDeckEditorCardsHorizontally,
    moveFloorConsumableToInventory,
    restorePendingRemovedCardToDeck,
    moveFloorCardToInventory,
    confirmDeckEditor,
    showDeckCardPreview,
  } = props;

  if (!deckEditorOpen) return null;
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
                  <div className="deck-editor-card-list" onWheel={scrollDeckEditorCardsHorizontally}>
                     {inventoryConsumableGroups.map(({ consumable, consumableIds }) => {
                       const consumableId = consumableIds.at(-1)!;
                       return (
                      <button
                        type="button"
                        className={`consumable-ticket inventory-ticket ${consumable.type} ${isConsumableSelected(consumable) ? "is-selected" : ""}`}
                        key={consumableIds.join("-")}
                        style={deckEditorCardStackStyle(consumableIds.length)}
                        draggable
                        onDragStart={(event) => beginConsumableDrag(event, consumableId, "inventory")}
                        onDragEnd={finishConsumableDrag}
                        onMouseEnter={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          showConsumablePreview(consumable, bounds.right, bounds.top);
                        }}
                        onMouseMove={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          showConsumablePreview(consumable, bounds.right, bounds.top);
                        }}
                        onMouseLeave={() => setHoveredConsumable(null)}
                        onFocus={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          showConsumablePreview(consumable, bounds.right, bounds.top);
                        }}
                         onBlur={() => setHoveredConsumable(null)}
                         onClick={() => selectExtractionTicket(consumable)}
                         aria-pressed={isConsumableSelected(consumable)}
                         onContextMenu={(event) => {
                          event.preventDefault();
                          moveInventoryConsumableToFloor(consumableId);
                        }}
                        aria-label={`${consumable.name} ${consumableIds.length}장`}
                      >
                        <strong>{consumable.name}</strong>
                        <small>{consumableDescription(consumable)}</small>
                        {consumableIds.length > 1 && <span className="inventory-card-count">x{consumableIds.length}</span>}
                      </button>
                      );
                    })}
                    {removedInventoryCardGroups.map(({ card, cardIds }) => (
                      <div
className={`deck-editor-card is-pending-removal ${pendingRemovalBlinkDim ? "is-blink-dim" : ""} rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""} ${deckEditorDrag?.cardId === cardIds.at(-1) ? "is-dragging" : ""}`}
                        key={`pending-removal-inventory-${cardIds.join("-")}`}
                        style={deckEditorCardStackStyle(cardIds.length)}
                        draggable
                        onDragStart={(event) => beginDeckEditorDrag(event, cardIds.at(-1)!, "pendingRemoval")}
                        onDragEnd={finishDeckEditorDrag}
                        onMouseEnter={(event) => moveDeckCardPreview(event, card)}
                        onMouseMove={(event) => moveDeckCardPreview(event, card)}
                        onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                        aria-label={`${card.name} ${cardIds.length}장, 제거 예정`}
                      >
                        <DeckEditorCardIcon card={card} count={cardIds.length} showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))} />
                        <span className="pending-removal-icon" aria-label="제거 예정" title="제거 예정">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 12H8L7 9Zm3 2v8h2v-8h-2Zm4 0v8h-2v-8h2Z" /></svg>
                        </span>
                      </div>
                    ))}
                    {inventoryCardGroups.map(({ card, cardIds }) => (
                      <button
                        type="button"
className={`deck-editor-card rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""} ${deckEditorDrag?.cardId === cardIds.at(-1) ? "is-dragging" : ""} ${ticketDropTarget === ticketDropKey("inventory", cardIds.at(-1)!) ? "is-ticket-drop-target" : ""}`}
                        key={`inventory-${cardIds.join("-")}`}
                        style={deckEditorCardStackStyle(cardIds.length)}
                        draggable
                        onDragStart={(event) => beginDeckEditorDrag(event, cardIds.at(-1)!, "inventory")}
                        onDragEnd={finishDeckEditorDrag}
                        onDragOver={(event) => handleTicketDragOverCard(event, card, "inventory", undefined, cardIds.at(-1)!)}
                        onDrop={(event) => handleTicketDropOnCard(event, card, "inventory", undefined, cardIds.at(-1)!)}
                        onDragLeave={(event) => handleTicketDragLeave(event, ticketDropKey("inventory", cardIds.at(-1)!))}
                        onMouseEnter={(event) => moveDeckCardPreview(event, card)}
                        onMouseMove={(event) => moveDeckCardPreview(event, card)}
                        onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                        onFocus={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          showDeckCardPreview(card, bounds.right, bounds.top);
                        }}
                        onBlur={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                        onClick={() => {
                          if (pendingCloneTicketId) cloneCardWithTicket(card);
                          else if (pendingTransformTicketId) transformCardWithTicket(card, "inventory");
                          else moveInventoryCardToDeck(cardIds.at(-1)!);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          moveInventoryCardToFloor(cardIds.at(-1)!);
                        }}
                        aria-label={`${card.name}, 좌클릭하면 선택한 덱으로 이동, 우클릭하면 바닥으로 이동`}
                      >
                        <DeckEditorCardIcon card={card} count={cardIds.length} showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))} />
                      </button>
                    ))}
                    {Array.from(
                      { length: Math.max(0, inventoryCapacity - deckEditorInventoryItemCount) },
                      (_, slot) => <span className="deck-editor-empty-card-slot" key={`inventory-slot-${slot}`} />,
                    )}
                  </div>
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
                    return (
                      <section
                        className={`deck-editor-deck-row ${isSelected ? "is-selected" : ""} ${deck.id === activeDeck?.id ? "is-active-deck" : ""} ${deckEditorDropTarget === "deck" && deckEditorDeckId === deck.id ? "is-drop-target" : ""}`}
                        key={deck.id}
                        onDragOver={(event) => {
                          const drag = deckEditorDragRef.current ?? deckEditorDrag;
                          if (!drag || (drag.source === "deck" && drag.deckId === deck.id)) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDeckEditorDeckId(deck.id);
                          setDeckEditorDropTarget("deck");
                        }}
                        onDrop={(event) => dropDeckEditorCard(event, "deck", deck.id)}
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
                              onEditionTooltipHover={showDeckEditionTooltip}
                              onEditionTooltipLeave={() => setHoveredDeckEditionTooltip(null)}
                            />
                          </strong>
                          <small>{deck.cards.length} / {deck.capacity}</small>
                        </button>
                        <div
                          className="deck-editor-deck-list"
                          onWheel={scrollDeckEditorCardsHorizontally}
                          onDragOver={(event) => {
                            const drag = deckEditorDragRef.current ?? deckEditorDrag;
                            if (!drag || (drag.source === "deck" && drag.deckId === deck.id)) return;
                            event.preventDefault();
                            event.stopPropagation();
                            setDeckEditorDeckId(deck.id);
                            setDeckEditorDropTarget("deck");
                          }}
                          onDrop={(event) => {
                            dropDeckEditorCard(event, "deck", deck.id);
                          }}
                        >
                          {groupAndSortCards(deck.cards).map(({ card, cardIds }) => {
                            const cardId = cardIds.at(-1)!;
                            const isTemporary = cardIds.some((id) => effectiveOriginDeckIdForCard(id) === null);
                            return (
                              <button
                                type="button"
className={`deck-editor-card deck-list-entry rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""} ${isTemporary ? `is-temporary ${pendingRemovalBlinkDim ? "is-blink-dim" : ""}` : ""} ${ticketDropTarget === ticketDropKey("deck", cardId, deck.id) ? "is-ticket-drop-target" : ""}`}
                                key={`${deck.id}-${cardIds.join("-")}`}
                                style={deckEditorCardStackStyle(cardIds.length)}
                                draggable
                                onDragStart={(event) => beginDeckEditorDrag(event, cardId, "deck", deck.id)}
                                onDragEnd={finishDeckEditorDrag}
                                onDragOver={(event) => handleTicketDragOverCard(event, card, "deck", deck, cardId)}
                                onDrop={(event) => handleTicketDropOnCard(event, card, "deck", deck, cardId)}
                                onDragLeave={(event) => handleTicketDragLeave(event, ticketDropKey("deck", cardId, deck.id))}
                                onMouseEnter={(event) => moveDeckCardPreview(event, card)}
                                onMouseMove={(event) => moveDeckCardPreview(event, card)}
                                onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                                onClick={() => {
                                  setDeckEditorDeckId(deck.id);
                                  if (pendingCloneTicketId) cloneCardWithTicket(card);
                                  else if (pendingPaintTicketId) paintDeckCard(cardId, pendingPaintTicketId, deck.id);
                                  else if (pendingExtractTicketId) extractDeckCardWithTicket(cardId, deck.id);
                                  else if (pendingTransformTicketId) transformCardWithTicket(card, "deck", deck.id);
                                }}
                                onContextMenu={(event) => {
                                  event.preventDefault();
                                  const canMoveToInventory = canMoveDeckCardToInventory;
                                  if (canMoveToInventory) {
                                    if (deckEditorInventoryItemCount >= inventoryCapacity) {
                                      moveDeckCardToFloor(cardId, deck.id);
                                    } else {
                                      moveDeckCardToInventory(cardId, deck.id);
                                    }
                                  } else {
                                    moveDeckCardToFloor(cardId, deck.id);
                                  }
                                }}
                              >
                                <DeckEditorCardIcon card={card} count={cardIds.length} showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))} />
                              </button>
                            );
                          })}
                          {Array.from({ length: Math.max(0, deck.capacity - deck.cards.length) }, (_, slot) => (
                            <span className="deck-editor-empty-card-slot" key={`${deck.id}-slot-${slot}`} />
                          ))}
                        </div>
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
                  <div
                    className={`deck-editor-floor-cards ${deckEditorDropTarget === "floor" ? "is-drop-target" : ""} ${deckCaseDrag?.source === "owned" ? "is-deck-drop-target" : ""}`}
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
                  >
                    {currentFloorDecks.map((deck) => (
                      <button
                        type="button"
                        className="floor-deck-item"
                        key={deck.id}
                        draggable
                        onDragStart={(event) => beginDeckCaseDrag(event, deck.id, "floor")}
                        onDragEnd={finishDeckCaseDrag}
                        onClick={() => pickUpFloorDeck(deck.id)}
                        aria-label={`${deck.name}, 카드 ${deck.cards.length}장, 용량 ${deck.capacity}. 누르면 줍기`}
                      >
                        <span className="floor-deck-icon" aria-hidden="true" />
                        <strong><DeckName deck={deck} showEditionTooltips={false} /></strong>
                        <span>{deck.cards.length} / {deck.capacity}</span>
                        <small>눌러서 줍기</small>
                      </button>
                    ))}
                    {floorConsumableGroups.map(({ consumable, consumableIds }) => {
                      const consumableId = consumableIds.at(-1)!;
                      return (
                      <button
                        type="button"
                        className={`consumable-ticket floor-ticket ${consumable.type} ${isConsumableSelected(consumable) ? "is-selected" : ""}`}
                        key={consumableIds.join("-")}
                        style={deckEditorCardStackStyle(consumableIds.length)}
                        draggable
                        onDragStart={(event) => beginConsumableDrag(event, consumableId, "floor")}
                        onDragEnd={finishConsumableDrag}
                        onMouseEnter={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          showConsumablePreview(consumable, bounds.right, bounds.top);
                        }}
                        onMouseMove={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          showConsumablePreview(consumable, bounds.right, bounds.top);
                        }}
                        onMouseLeave={() => setHoveredConsumable(null)}
                        onFocus={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          showConsumablePreview(consumable, bounds.right, bounds.top);
                        }}
                        onBlur={() => setHoveredConsumable(null)}
                        onClick={() => ["paintTicket", "cloneTicket", "extractTicket", "transformTicket", "bombTicket", "darkTicket"].includes(consumable.type)
                          ? selectExtractionTicket(consumable)
                          : moveFloorConsumableToInventory(consumableId)}
                        aria-pressed={isConsumableSelected(consumable)}
                        aria-label={`${consumable.name} ${consumableIds.length}장`}
                      >
                        <strong>{consumable.name}</strong>
                        <small>{consumableDescription(consumable)}</small>
                        {consumableIds.length > 1 && <span className="inventory-card-count">x{consumableIds.length}</span>}
                      </button>
                      );
                    })}
                    {removedFloorCardGroups.map(({ card, cardIds }) => (
                      <div
                        className={`deck-editor-card is-pending-removal ${pendingRemovalBlinkDim ? "is-blink-dim" : ""} rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""} ${deckEditorDrag?.cardId === cardIds.at(-1) ? "is-dragging" : ""}`}
                        key={`pending-removal-${cardIds.join("-")}`}
                        style={deckEditorCardStackStyle(cardIds.length)}
                        draggable
                        onDragStart={(event) => beginDeckEditorDrag(event, cardIds.at(-1)!, "pendingRemoval")}
                        onDragEnd={finishDeckEditorDrag}
                        onMouseEnter={(event) => moveDeckCardPreview(event, card)}
                        onMouseMove={(event) => moveDeckCardPreview(event, card)}
                        onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          restorePendingRemovedCardToDeck(cardIds.at(-1)!);
                        }}
                        aria-label={`${card.name} ${cardIds.length}장, 제거 예정, 우클릭하면 원래 덱으로 복귀`}
                      >
                        <DeckEditorCardIcon card={card} count={cardIds.length} showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))} />
                        <span className="pending-removal-icon" aria-label="제거 예정" title="제거 예정">
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 12H8L7 9Zm3 2v8h2v-8h-2Zm4 0v8h-2v-8h2Z" /></svg>
                        </span>
                      </div>
                    ))}
                    {floorCardGroups.map(({ card, cardIds }) => (
                      <button
                        type="button"
                        className={`deck-editor-card rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""} ${deckEditorDrag?.cardId === cardIds.at(-1) ? "is-dragging" : ""} ${ticketDropTarget === ticketDropKey("floor", cardIds.at(-1)!) ? "is-ticket-drop-target" : ""}`}
                        key={`floor-${cardIds.join("-")}`}
                        style={deckEditorCardStackStyle(cardIds.length)}
                        draggable
                        onDragStart={(event) => beginDeckEditorDrag(event, cardIds.at(-1)!, "floor")}
                        onDragEnd={finishDeckEditorDrag}
                        onDragOver={(event) => handleTicketDragOverCard(event, card, "floor", undefined, cardIds.at(-1)!)}
                        onDrop={(event) => handleTicketDropOnCard(event, card, "floor", undefined, cardIds.at(-1)!)}
                        onDragLeave={(event) => handleTicketDragLeave(event, ticketDropKey("floor", cardIds.at(-1)!))}
                        onMouseEnter={(event) => moveDeckCardPreview(event, card)}
                        onMouseMove={(event) => moveDeckCardPreview(event, card)}
                        onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                        onFocus={(event) => {
                          const bounds = event.currentTarget.getBoundingClientRect();
                          showDeckCardPreview(card, bounds.right, bounds.top);
                        }}
                        onBlur={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                        onClick={() => {
                          if (pendingCloneTicketId) cloneCardWithTicket(card);
                          else if (pendingTransformTicketId) transformCardWithTicket(card, "floor");
                          else moveFloorCardToInventory(cardIds.at(-1)!);
                        }}
                        aria-label={`${card.name}, 인벤토리에 줍기`}
                      >
                        <DeckEditorCardIcon card={card} count={cardIds.length} showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))} />
                      </button>
                    ))}
                  </div>
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
              {hoveredConsumable && !consumableDrag && (
                <aside
                  className={`deck-consumable-preview-floating ${hoveredConsumable.type}`}
                  style={{ left: deckPreviewPosition.x, top: deckPreviewPosition.y }}
                  aria-live="polite"
                >
                  <strong>{hoveredConsumable.name}</strong>
                  <p>{hoveredConsumable.description}</p>
                </aside>
              )}
            </div>
            {mapMessage && <p key={mapMessageNonce} className="map-message deck-editor-map-message" role="status" aria-live="polite">{mapMessage}</p>}
          
    </div>
  );
}
