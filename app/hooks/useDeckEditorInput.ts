import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { DragEvent, PointerEvent as ReactPointerEvent } from "react";
import type { Card } from "../game/cards";
import type { DeckEditorCardLocation } from "../game/deckEditorRules";
import type { Consumable, DeckCase } from "../game/rewards";
import type { CardDrag, ConsumableDrag, ConsumableArea, DeckDrag, DeckEditorArea,
  TouchDragCandidate, DeckEditorModalProps } from "../components/deck-editor/types";

/** Owns desktop drag/drop and touch gestures, including cleanup and click suppression. */
export function useDeckEditorInput(props: DeckEditorModalProps) {
  const {
    inventoryArea: { inventoryCardGroups, moveInventoryConsumableToFloor },
    floorArea: { floorCardGroups, moveFloorConsumableToInventory },
    deckArea: { ownedDecks, setDeckEditorDeckId },
    ticketActions: { canApplyTicketToCard, applyTicketToCard, canApplyTicketToConsumable,
      applyTicketToConsumable, canApplyTicketToDeck, applyTicketToDeck },
    cardPreview: { clearCardPreview, consumablePreview },
    behavior: { onMoveCard, onEditorDragActivityChange },
  } = props;
  const [deckEditorDrag, setDeckEditorDrag] = useState<CardDrag>(null);
  const deckEditorDragRef = useRef<CardDrag>(null);
  const [deckEditorDropTarget, setDeckEditorDropTarget] = useState<DeckEditorArea | null>(null);
  const [consumableDrag, setConsumableDrag] = useState<ConsumableDrag>(null);
  const consumableDragRef = useRef<ConsumableDrag>(null);
  const [deckCaseDrag, setDeckCaseDrag] = useState<DeckDrag>(null);
  const deckCaseDragRef = useRef<DeckDrag>(null);
  const [deckCaseDropSlot, setDeckCaseDropSlot] = useState<number | null>(null);
  const [ticketDropTarget, setTicketDropTarget] = useState<string | null>(null);
  const [touchDrag, setTouchDrag] = useState<TouchDragCandidate | null>(null);
  const touchDragRef = useRef<TouchDragCandidate | null>(null);
  const touchDragPortalRef = useRef<HTMLDivElement | null>(null);
  const touchDragGhostRef = useRef<HTMLElement | null>(null);
  const suppressTouchClickRef = useRef(false);
  const previewReleaseTimerRef = useRef<number | null>(null);
  const activityCallbackRef = useRef(onEditorDragActivityChange);

  useEffect(() => {
    activityCallbackRef.current = onEditorDragActivityChange;
  }, [onEditorDragActivityChange]);


  useEffect(() => () => {
    if (previewReleaseTimerRef.current !== null) window.clearTimeout(previewReleaseTimerRef.current);
    touchDragPortalRef.current?.remove();
    touchDragPortalRef.current = null;
    touchDragGhostRef.current = null;
    activityCallbackRef.current("card", false);
    activityCallbackRef.current("consumable", false);
  }, []);

  const clearTouchDragGhost = useCallback(() => {
    touchDragPortalRef.current?.remove();
    touchDragPortalRef.current = null;
    touchDragGhostRef.current = null;
  }, []);

  const moveTouchDragGhost = useCallback((candidate: TouchDragCandidate, x: number, y: number) => {
    if (!touchDragPortalRef.current || !touchDragGhostRef.current) {
      const bounds = candidate.sourceElement.getBoundingClientRect();
      const portal = document.createElement("div");
      portal.className = "deck-editor-panel deck-editor-touch-drag-portal";
      portal.setAttribute("aria-hidden", "true");
      portal.style.cssText = "position:fixed;inset:0;z-index:100000;display:block;width:auto;height:auto;min-width:0;margin:0;padding:0;border:0;background:transparent;box-shadow:none;overflow:visible;pointer-events:none;transform:none";

      const ghost = candidate.sourceElement.cloneNode(true) as HTMLElement;
      ghost.classList.remove("is-dragging", "is-ticket-drop-target", "is-touch-drag-origin");
      ghost.classList.add("is-touch-drag-preview");
      ghost.setAttribute("aria-hidden", "true");
      ghost.removeAttribute("id");
      ghost.style.position = "fixed";
      ghost.style.inset = "auto";
      ghost.style.left = "0";
      ghost.style.top = "0";
      ghost.style.width = `${bounds.width}px`;
      ghost.style.height = `${bounds.height}px`;
      ghost.style.minHeight = `${bounds.height}px`;
      ghost.style.flex = `0 0 ${bounds.width}px`;
      ghost.style.margin = "0";
      ghost.style.pointerEvents = "none";
      ghost.style.transition = "none";
      ghost.style.transformOrigin = "top left";
      ghost.style.willChange = "transform";
      ghost.style.boxShadow = "0 10px 24px rgba(0,0,0,.4)";
      portal.appendChild(ghost);
      document.body.appendChild(portal);
      touchDragPortalRef.current = portal;
      touchDragGhostRef.current = ghost;
    }

    touchDragGhostRef.current.style.transform = `translate3d(${x - candidate.grabOffsetX}px, ${y - candidate.grabOffsetY}px, 0) scale(1.04) rotate(-1deg)`;
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

  const beginTouchPointerDrag = (
    event: ReactPointerEvent<HTMLElement>,
    kind: TouchDragCandidate["kind"],
    id: number | string,
    source: DeckEditorArea | ConsumableArea,
    deckId?: string,
    virtualKey?: string,
  ) => {
    const isMobileMode = document.documentElement.dataset.deviceMode === "mobile";
    if ((!isMobileMode && event.pointerType !== "touch") || event.button !== 0) return;
    if (isMobileMode) event.currentTarget.draggable = false;
    touchDragRef.current = {
      pointerId: event.pointerId,
      kind,
      id,
      source,
      deckId,
      virtualKey,
      pointerType: event.pointerType,
      startedAt: event.timeStamp,
      lastX: event.clientX,
      lastY: event.clientY,
      scrolling: false,
      sourceList: event.currentTarget.closest<HTMLElement>(".deck-editor-card-list, .deck-editor-deck-list, .deck-editor-floor-cards"),
      sectionScroller: event.currentTarget.closest<HTMLElement>(".deck-editor-columns"),
      startX: event.clientX,
      startY: event.clientY,
      sourceElement: event.currentTarget,
      grabOffsetX: event.clientX - event.currentTarget.getBoundingClientRect().left,
      grabOffsetY: event.clientY - event.currentTarget.getBoundingClientRect().top,
      active: false,
    };
  };

  const touchDropElementAt = (x: number, y: number) => document.elementFromPoint(x, y);

  const finishTouchDrop = (candidate: TouchDragCandidate, x: number, y: number) => {
    const underPointer = touchDropElementAt(x, y);
    if (candidate.kind === "card") {
      const areaElement = underPointer?.closest<HTMLElement>("[data-deck-editor-area]");
      const targetArea = areaElement?.dataset.deckEditorArea as DeckEditorArea | undefined;
      const targetDeckId = areaElement?.dataset.deckEditorDeckId;
      if (targetArea && !(candidate.source === "deck" && targetArea === "deck" && candidate.deckId === targetDeckId)) {
        onMoveCard({
          cardId: Number(candidate.id),
          source: { area: candidate.source as DeckEditorArea, ...(candidate.deckId ? { deckId: candidate.deckId } : {}) },
          target: { area: targetArea, ...(targetDeckId ? { deckId: targetDeckId } : {}) },
        });
        if (targetDeckId) setDeckEditorDeckId(targetDeckId);
      }
      finishDeckEditorDrag();
      return;
    }

    const ticketId = String(candidate.id);
    const targetCardElement = underPointer?.closest<HTMLElement>("[data-ticket-card-id]");
    if (targetCardElement) {
      const cardId = Number(targetCardElement.dataset.ticketCardId);
      const area = targetCardElement.dataset.ticketCardArea as "inventory" | "deck" | "floor";
      const deckId = targetCardElement.dataset.ticketDeckId;
      const deck = deckId ? ownedDecks.find((entry) => entry.id === deckId) : undefined;
      const card = area === "deck"
        ? deck?.cards.find((entry) => entry.id === cardId)
        : (area === "inventory" ? inventoryCardGroups : floorCardGroups)
          .find((group) => group.cardIds.includes(cardId))?.card;
      if (card && canApplyTicketToCard(ticketId, card, area, deck)) {
        applyTicketToCard(ticketId, card, area, deck, cardId);
      }
      finishConsumableDrag();
      return;
    }

    const targetTicketElement = underPointer?.closest<HTMLElement>("[data-deck-editor-ticket-id]");
    if (targetTicketElement) {
      const targetId = targetTicketElement.dataset.deckEditorTicketId;
      if (targetId && canApplyTicketToConsumable(ticketId, targetId)) applyTicketToConsumable(ticketId, targetId);
      finishConsumableDrag();
      return;
    }

    const areaElement = underPointer?.closest<HTMLElement>("[data-deck-editor-area]");
    const targetArea = areaElement?.dataset.deckEditorArea;
    const deckId = areaElement?.dataset.deckEditorDeckId;
    if (targetArea === "deck" && deckId) {
      const deck = ownedDecks.find((entry) => entry.id === deckId);
      if (deck && canApplyTicketToDeck(ticketId, deck)) applyTicketToDeck(ticketId, deck);
      finishConsumableDrag();
      return;
    }
    if (targetArea === "inventory" && candidate.source === "floor") moveFloorConsumableToInventory(ticketId);
    if (targetArea === "floor" && candidate.source === "inventory") moveInventoryConsumableToFloor(ticketId);
    finishConsumableDrag();
  };

  const updateDropTarget = (candidate: TouchDragCandidate, x: number, y: number) => {
    const underPointer = touchDropElementAt(x, y);
    const areaElement = underPointer?.closest<HTMLElement>("[data-deck-editor-area]");
    const area = areaElement?.dataset.deckEditorArea as DeckEditorArea | undefined;
    const deckId = areaElement?.dataset.deckEditorDeckId;
    if (area) {
      setDeckEditorDropTarget(area);
      if (deckId) setDeckEditorDeckId(deckId);
    } else {
      setDeckEditorDropTarget(null);
    }
    if (candidate.kind === "consumable") {
      const targetCard = underPointer?.closest<HTMLElement>("[data-ticket-card-id]");
      const targetTicket = underPointer?.closest<HTMLElement>("[data-deck-editor-ticket-id]");
      if (targetCard) {
        const targetArea = targetCard.dataset.ticketCardArea as "inventory" | "deck" | "floor";
        setTicketDropTarget(ticketDropKey(targetArea, Number(targetCard.dataset.ticketCardId), targetCard.dataset.ticketDeckId));
      } else if (targetTicket?.dataset.deckEditorTicketId) {
        setTicketDropTarget(consumableTicketDropKey(targetTicket.dataset.deckEditorTicketId));
      } else if (area === "deck" && deckId) {
        setDeckEditorDeckId(deckId);
      } else {
        setTicketDropTarget(null);
      }
    }
  };

  const handlePointerMove = useEffectEvent((event: PointerEvent) => {
    const candidate = touchDragRef.current;
    if (!candidate || event.pointerId !== candidate.pointerId) return;
    if (!candidate.active) {
      const dx = event.clientX - candidate.startX;
      const dy = event.clientY - candidate.startY;
      if (candidate.pointerType === "touch" && candidate.scrolling) {
        const moveX = event.clientX - candidate.lastX;
        const moveY = event.clientY - candidate.lastY;
        if (Math.abs(moveX) >= Math.abs(moveY) && candidate.sourceList) {
          candidate.sourceList.scrollLeft -= moveX;
        } else if (candidate.sectionScroller) {
          candidate.sectionScroller.scrollTop -= moveY;
        }
        candidate.lastX = event.clientX;
        candidate.lastY = event.clientY;
        event.preventDefault();
        return;
      }
      if (Math.hypot(dx, dy) < 12) return;
      if (candidate.pointerType === "touch" && event.timeStamp - candidate.startedAt < 180) {
        candidate.scrolling = true;
        candidate.lastX = event.clientX;
        candidate.lastY = event.clientY;
        if (Math.abs(dx) >= Math.abs(dy) && candidate.sourceList) {
          candidate.sourceList.scrollLeft -= dx;
        } else if (candidate.sectionScroller) {
          candidate.sectionScroller.scrollTop -= dy;
        }
        event.preventDefault();
        return;
      }
      candidate.active = true;
      setTouchDrag({ ...candidate });
      if (candidate.kind === "card") {
        const drag: NonNullable<CardDrag> = {
          cardId: Number(candidate.id),
          source: candidate.source as DeckEditorArea,
          deckId: candidate.deckId,
          virtualKey: candidate.virtualKey,
        };
        deckEditorDragRef.current = drag;
        setDeckEditorDrag(drag);
        onEditorDragActivityChange("card", true);
        clearCardPreview();
        consumablePreview.clear();
      } else {
        const drag: NonNullable<ConsumableDrag> = {
          id: String(candidate.id),
          source: candidate.source as ConsumableArea,
          virtualKey: candidate.virtualKey,
        };
        consumableDragRef.current = drag;
        setConsumableDrag(drag);
        onEditorDragActivityChange("consumable", true);
        setTicketDropTarget(null);
      }
    }
    event.preventDefault();
    moveTouchDragGhost(candidate, event.clientX, event.clientY);
    updateDropTarget(candidate, event.clientX, event.clientY);
  });

  const handlePointerUp = useEffectEvent((event: PointerEvent) => {
    const candidate = touchDragRef.current;
    if (!candidate || event.pointerId !== candidate.pointerId) return;
    touchDragRef.current = null;
    clearTouchDragGhost();
    if (candidate.active) {
      suppressTouchClickRef.current = true;
      window.setTimeout(() => { suppressTouchClickRef.current = false; }, 0);
      finishTouchDrop(candidate, event.clientX, event.clientY);
    }
    setTouchDrag(null);
    setDeckEditorDropTarget(null);
    setTicketDropTarget(null);
  });

  const handlePointerCancel = useEffectEvent((event: PointerEvent) => {
    const candidate = touchDragRef.current;
    if (!candidate || event.pointerId !== candidate.pointerId) return;
    touchDragRef.current = null;
    clearTouchDragGhost();
    if (candidate.active) {
      if (candidate.kind === "card") finishDeckEditorDrag();
      else finishConsumableDrag();
    }
    setTouchDrag(null);
    setDeckEditorDropTarget(null);
    setTicketDropTarget(null);
  });

  useEffect(() => {
    document.addEventListener("pointermove", handlePointerMove, { passive: false });
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerCancel);
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerCancel);
      clearTouchDragGhost();
    };
  }, [clearTouchDragGhost]);

  return { deckEditorDrag, deckEditorDragRef, deckEditorDropTarget, setDeckEditorDropTarget,
    consumableDrag, consumableDragRef, deckCaseDrag, deckCaseDragRef, deckCaseDropSlot, setDeckCaseDropSlot,
    ticketDropTarget, touchDrag, suppressTouchClickRef,
    beginDeckEditorDrag, finishDeckEditorDrag, beginConsumableDrag, finishConsumableDrag,
    beginDeckCaseDrag, finishDeckCaseDrag, ticketDropKey, consumableTicketDropKey,
    handleTicketDragOverCard, handleTicketDropOnCard, handleTicketDragLeave,
    handleTicketDragOverConsumable, handleTicketDropOnConsumable,
    handleTicketDragOverDeck, handleTicketDropOnDeck, dropDeckEditorCard, dropConsumable, beginTouchPointerDrag };
}

export type DeckEditorInput = ReturnType<typeof useDeckEditorInput>;
