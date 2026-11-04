import { CardVisual } from "./CardVisual";
import { DeckSlotPlaceholder } from "./DeckSlotPlaceholder";
import { ConsumableVisual } from "./ConsumableVisual";
import { DeckEditorPreviews } from "./DeckEditorPreviews";
import { DeckName } from "./DeckName";
import { VirtualizedHorizontalList } from "./VirtualizedHorizontalList";
import { usesRareCardSlot } from "../game/deckEditorRules";
import type { DeckCase } from "../game/rewards";
import type { DeckEditorModalProps, StackVirtualItem, InventoryVirtualItem, OwnedDeckVirtualItem, FloorVirtualItem } from "./deck-editor/types";
import { useDeckEditorInput } from "../hooks/useDeckEditorInput";
import { useDeckEditorItems } from "../hooks/useDeckEditorItems";
import { useDeckEditorPreviews } from "../hooks/useDeckEditorPreviews";
export type { DeckEditorModalProps } from "./deck-editor/types";

export function DeckEditorModal(props: DeckEditorModalProps) {
  const { controlsRef, actions: cardPreview } = useDeckEditorPreviews();
  const { consumablePreview, moveDeckCardPreview, clearCardPreview, editionTooltip, showDeckCardPreview } = cardPreview;
  const { deckEditorDrag, deckEditorDragRef, deckEditorDropTarget, setDeckEditorDropTarget,
    consumableDrag, consumableDragRef, deckCaseDrag, deckCaseDragRef, deckCaseDropSlot, setDeckCaseDropSlot,
    ticketDropTarget, touchDrag, suppressTouchClickRef,
    beginDeckEditorDrag, finishDeckEditorDrag, beginConsumableDrag, finishConsumableDrag,
    beginDeckCaseDrag, finishDeckCaseDrag, ticketDropKey, consumableTicketDropKey,
    handleTicketDragOverCard, handleTicketDropOnCard, handleTicketDragLeave,
    handleTicketDragOverConsumable, handleTicketDropOnConsumable,
    handleTicketDragOverDeck, handleTicketDropOnDeck, dropDeckEditorCard, dropConsumable, beginTouchPointerDrag } = useDeckEditorInput(props, cardPreview);
  const { activeDeck, editingDeck, ownedDeckCardViews, inventoryVirtualItems, floorVirtualItems } = useDeckEditorItems(props);
  const {
    header: { deckEditorErrorMessage, mapFeedback },
    inventoryArea: {
      deckEditorInventoryItemCount,
      inventoryCapacity,
      inventoryConsumableGroups,
      moveInventoryConsumableToFloor,
    },
    deckArea: {
      maxOwnedDecks,
      ownedDecks,
      deckEditorDeckId,
      setDeckEditorDeckId,
      onSelectActiveDeck,
      pickUpFloorDeck,
      swapOwnedDecks,
      dropOwnedDeck,
      canMoveDeckCardToInventory,
    },
    floorArea: {
      floorConsumableGroups,
      moveFloorConsumableToInventory,
    },
    ticketActions: {
      isConsumableSelected,
      consumableDescription,
      selectExtractionTicket,
      applySelectedCardTicket,
      canApplyTicketToDeck,
      applyTicketToDeck,
    },
    behavior: {
      pendingRemovalBlinkDim,
      transformedCardNewIds,
      effectiveOriginDeckIdForCard,
      scrollDeckEditorCardsHorizontally,
      onMoveCard,
      confirmDeckEditor,
    },
  } = props;

  const mapMessage = mapFeedback.message;
  const mapMessageNonce = mapFeedback.nonce;
  const applySelectedTicketToDeck = (deck: DeckCase) => {
    const ticket = [...inventoryConsumableGroups, ...floorConsumableGroups]
      .find(({ consumable }) => isConsumableSelected(consumable));
    const ticketId = ticket?.consumableIds.at(-1);
    if (!ticketId || !canApplyTicketToDeck(ticketId, deck)) return false;
    applyTicketToDeck(ticketId, deck);
    return true;
  };

  const renderDeckCardGroup = (deck: DeckCase, item: Extract<OwnedDeckVirtualItem, { kind: "card" }>) => {
    const { card, cardIds } = item.group;
    const cardId = cardIds.at(-1)!;
    const isTemporary = cardIds.some((id) => effectiveOriginDeckIdForCard(id) === null);
    return (
      <CardVisual
        as="button"
        card={card}
        variant="compact"
        count={cardIds.length}
        showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))}
        type="button"
        className={`deck-list-entry ${card.rarity === "legendary" ? "is-painted" : ""} ${isTemporary ? `is-temporary ${pendingRemovalBlinkDim ? "is-blink-dim" : ""}` : ""} ${deckEditorDrag?.cardId === cardId ? "is-dragging" : ""} ${touchDrag?.active && touchDrag.kind === "card" && touchDrag.id === cardId && touchDrag.source === "deck" && touchDrag.deckId === deck.id ? "is-touch-drag-origin" : ""} ${ticketDropTarget === ticketDropKey("deck", cardId, deck.id) ? "is-ticket-drop-target" : ""}`}
        key={item.key}
        data-ticket-card-id={cardId}
        data-ticket-card-area="deck"
        data-ticket-deck-id={deck.id}
        draggable
        onPointerDown={(event) => beginTouchPointerDrag(event, "card", cardId, "deck", deck.id, item.key)}
        onDragStart={(event) => beginDeckEditorDrag(event, cardId, "deck", deck.id, item.key)}
        onDragEnd={finishDeckEditorDrag}
        onDragOver={(event) => handleTicketDragOverCard(event, card, "deck", deck, cardId)}
        onDrop={(event) => handleTicketDropOnCard(event, card, "deck", deck, cardId)}
        onDragLeave={(event) => handleTicketDragLeave(event, ticketDropKey("deck", cardId, deck.id))}
        onMouseEnter={(event) => moveDeckCardPreview(event, card)}
        onMouseMove={(event) => moveDeckCardPreview(event, card)}
        onMouseLeave={clearCardPreview}
        onClick={() => {
          if (suppressTouchClickRef.current) {
            suppressTouchClickRef.current = false;
            return;
          }
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
      />
    );
  };

  const renderTicketItem = (item: StackVirtualItem) => {
    if (item.kind !== "ticket" || !item.consumable || !item.consumableIds) return null;
    const { consumable, consumableIds } = item;
    const consumableId = consumableIds.at(-1)!;
    const area = item.area;
    return (
      <ConsumableVisual
        as="button"
        item={consumable}
        variant="compact"
        description={consumableDescription(consumable)}
        count={consumableIds.length}
        type="button"
        className={`${area === "inventory" ? "inventory-ticket" : "floor-ticket"}   ${isConsumableSelected(consumable) ? "is-selected" : ""} ${consumableDrag?.id === consumableId ? "is-dragging" : ""} ${touchDrag?.active && touchDrag.kind === "consumable" && touchDrag.id === consumableId && touchDrag.source === area ? "is-touch-drag-origin" : ""} ${ticketDropTarget === consumableTicketDropKey(consumableId) ? "is-ticket-drop-target" : ""}`}
        key={item.key}
        data-deck-editor-ticket-id={consumableId}
        draggable
        onPointerDown={(event) => beginTouchPointerDrag(event, "consumable", consumableId, area, undefined, item.key)}
        onDragStart={(event) => beginConsumableDrag(event, consumableId, area, item.key)}
        onDragEnd={finishConsumableDrag}
        onDragOver={(event) => handleTicketDragOverConsumable(event, consumable)}
        onDrop={(event) => handleTicketDropOnConsumable(event, consumable)}
        onDragLeave={(event) => handleTicketDragLeave(event, consumableTicketDropKey(consumableId))}
        onMouseEnter={(event) => {
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
          if (suppressTouchClickRef.current) {
            suppressTouchClickRef.current = false;
            return;
          }
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
      />
    );
  };

  const renderCardItem = (item: StackVirtualItem) => {
    if (item.kind !== "card" || !item.card || !item.cardIds) return null;
    const { card, cardIds, pendingRemoval = false } = item;
    const cardId = cardIds.at(-1)!;
    if (pendingRemoval) {
      return (
        <CardVisual
          card={card}
          variant="compact"
          count={cardIds.length}
          showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))}
          className={`is-pending-removal ${pendingRemovalBlinkDim ? "is-blink-dim" : ""} ${card.rarity === "legendary" ? "is-painted" : ""} ${deckEditorDrag?.cardId === cardId ? "is-dragging" : ""} ${touchDrag?.active && touchDrag.kind === "card" && touchDrag.id === cardId && touchDrag.source === "pendingRemoval" ? "is-touch-drag-origin" : ""}`}
          key={item.key}
          draggable
          onPointerDown={(event) => beginTouchPointerDrag(event, "card", cardId, "pendingRemoval", undefined, item.key)}
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
          onClick={item.area === "floor" ? () => {
            if (suppressTouchClickRef.current) {
              suppressTouchClickRef.current = false;
              return;
            }
            onMoveCard({
              cardId,
              source: { area: "pendingRemoval" },
              target: { area: "deck", deckId: effectiveOriginDeckIdForCard(cardId) ?? editingDeck?.id },
            });
          } : undefined}
          aria-label={`${card.name} ${cardIds.length}장, 제거 예정${item.area === "floor" ? ", 우클릭하면 원래 덱으로 복귀" : ""}`}
        >
          <span className="pending-removal-icon" aria-label="제거 예정" title="제거 예정">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-1 12H8L7 9Zm3 2v8h2v-8h-2Zm4 0v8h-2v-8h2Z" /></svg>
          </span>
        </CardVisual>
      );
    }

    const area = item.area;
    const areaKey = area === "inventory" ? "inventory" : "floor";
    const location = ticketDropKey(areaKey, cardId);
    return (
      <CardVisual
        as="button"
        card={card}
        variant="compact"
        count={cardIds.length}
        showNewBadge={cardIds.some((id) => transformedCardNewIds.has(id))}
        type="button"
        className={`${card.rarity === "legendary" ? "is-painted" : ""} ${deckEditorDrag?.cardId === cardId ? "is-dragging" : ""} ${touchDrag?.active && touchDrag.kind === "card" && touchDrag.id === cardId && touchDrag.source === area ? "is-touch-drag-origin" : ""} ${ticketDropTarget === location ? "is-ticket-drop-target" : ""}`}
        key={item.key}
        data-ticket-card-id={cardId}
        data-ticket-card-area={area}
        draggable
        onPointerDown={(event) => beginTouchPointerDrag(event, "card", cardId, area, undefined, item.key)}
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
          if (suppressTouchClickRef.current) {
            suppressTouchClickRef.current = false;
            return;
          }
          if (area === "inventory") {
            const ticketApplied = applySelectedCardTicket(card, "inventory", undefined, cardId);
            if (!ticketApplied && document.documentElement.dataset.deviceMode !== "mobile") {
              onMoveCard({ cardId, source: { area: "inventory" }, target: { area: "deck", deckId: editingDeck?.id } });
            }
          } else {
            const ticketApplied = applySelectedCardTicket(card, "floor", undefined, cardId);
            if (!ticketApplied && document.documentElement.dataset.deviceMode !== "mobile") {
              onMoveCard({ cardId, source: { area: "floor" }, target: { area: "inventory" } });
            }
          }
        }}
        onContextMenu={area === "inventory" ? (event) => {
          event.preventDefault();
          onMoveCard({ cardId, source: { area: "inventory" }, target: { area: "floor" } });
        } : undefined}
        aria-label={area === "inventory"
          ? `${card.name}, 끌어서 덱 또는 바닥으로 이동`
          : `${card.name}, 끌어서 이동`}
      />
    );
  };

  const renderInventoryItem = (item: InventoryVirtualItem) => item.kind === "ticket"
    ? renderTicketItem(item)
    : item.kind === "card"
      ? renderCardItem(item)
      : <DeckSlotPlaceholder kind="normal-slot" key={item.key} />;

  const renderOwnedDeckItem = (deck: DeckCase, item: OwnedDeckVirtualItem) => {
    if (item.kind === "card") return renderDeckCardGroup(deck, item);
    return <DeckSlotPlaceholder kind={item.kind} key={item.key} />;
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
        <strong><DeckName deck={deck} showEditions={false} showEditionTooltips={false} showGenerationDebug={false} /></strong>
        <span>{deck.cards.length} / {deck.capacity}</span>
        <small>눌러서 줍기</small>
      </button>
    );
  };

  return (
    <div
      className="deck-editor-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="덱 편집"
      onClick={(event) => {
        if (!(event.target instanceof HTMLElement)
          || !event.target.matches(".deck-editor-overlay, .deck-editor-stage, .deck-editor-panel")) return;
        event.stopPropagation();
        if (deckEditorDragRef.current || consumableDragRef.current || deckCaseDragRef.current || touchDrag?.active) return;
        if (suppressTouchClickRef.current) {
          suppressTouchClickRef.current = false;
          return;
        }
        confirmDeckEditor();
      }}
    >

            <div className="deck-editor-stage">
              <section className="deck-editor-panel" onClick={(event) => {
                if (event.target !== event.currentTarget) event.stopPropagation();
              }}>
              <div className="deck-editor-columns">
                <section
                  className={`deck-editor-column inventory-column ${deckEditorDropTarget === "inventory" ? "is-drop-target" : ""}`}
                  data-deck-editor-area="inventory"
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
                          role="group"
                          aria-label="빈 덱 슬롯"
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
                        />
                      );
                    }
                    const isSelected = deck.id === editingDeck?.id;
                    const deckView = ownedDeckCardViews.get(deck.id);
                    if (!deckView) return null;
                    return (
                      <section
                        className={`deck-editor-deck-row ${isSelected ? "is-selected" : ""} ${deck.id === activeDeck?.id ? "is-active-deck" : ""} ${deckEditorDropTarget === "deck" && deckEditorDeckId === deck.id ? "is-drop-target" : ""}`}
                        key={deck.id}
                        data-deck-editor-area="deck"
                        data-deck-editor-deck-id={deck.id}
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
                          onClick={() => {
                            setDeckEditorDeckId(deck.id);
                            applySelectedTicketToDeck(deck);
                          }}
                          onDoubleClick={() => {
                            if (deckCaseDragRef.current || touchDrag?.active || suppressTouchClickRef.current) return;
                            onSelectActiveDeck(deck.id);
                          }}
                          title="더블클릭하여 사용할 덱으로 선택"
                          onContextMenu={(event) => {
                            event.preventDefault();
                            dropOwnedDeck(deck.id);
                          }}
                        >
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
              <section className="deck-editor-floor-section" data-deck-editor-area="floor" aria-label="바닥 아이템">
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

              </div>

              </section>
              <DeckEditorPreviews controlsRef={controlsRef} suppressed={!!(deckEditorDrag || consumableDrag || deckCaseDrag || touchDrag?.active)} />
            </div>
            {(deckEditorErrorMessage || mapMessage) && <p key={mapMessageNonce} className="map-message deck-editor-map-message" role="status" aria-live="polite">{deckEditorErrorMessage || mapMessage}</p>}
          
    </div>
  );
}
