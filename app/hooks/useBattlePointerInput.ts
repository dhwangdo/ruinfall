import { useCallback, useEffect, useRef, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from "react";
import { canTargetEnemy, type Card } from "../game/cards";
import { cardDropTarget } from "../game/cardTargetRules.ts";
import type { DragState, Phase } from "../game/battleUiTypes";
import type { GameState } from "../game/battleState";
import type { ActiveBattleDrag } from "./useBattleInteractionState";
import { useBattleInteractionState } from "./useBattleInteractionState";
import { handCardAtPointer } from "../components/handHitTest";
import { hasSticker } from "../game/stickers";

type BattleInteractionState = ReturnType<typeof useBattleInteractionState>;

type BattlePointerInputOptions = {
  interaction: BattleInteractionState;
  game: GameState;
  phase: Phase;
  pileScrollRef: RefObject<HTMLDivElement | null>;
  setGame: Dispatch<SetStateAction<GameState>>;
  onClearPreviews: () => void;
  onMoveCardToPile: (drag: DragState, targetPileIndex: number) => void;
  onPlayCard: (card: Card, targetEnemyId?: string) => void;
  onResearchDraw: (pileIndex: number, allowAutoPay?: boolean) => void;
  onRetrieveBluebirdFromPile: (pileIndex: number) => void;
};

export function useBattlePointerInput({
  interaction,
  game,
  phase,
  pileScrollRef,
  setGame,
  onClearPreviews,
  onMoveCardToPile,
  onPlayCard,
  onResearchDraw,
  onRetrieveBluebirdFromPile,
}: BattlePointerInputOptions) {
  const {
    centerDropZoneRef,
    setDragOverDropTarget,
    setDragging,
    setHoveredHandCardId,
  } = interaction;
  const gameRef = useRef(game);
  const dragRef = useRef<ActiveBattleDrag | null>(null);
  const keyboardDragRef = useRef(false);
  const previewElementRef = useRef<HTMLDivElement | null>(null);
  const keyboardIntroOriginRef = useRef<{ x: number; y: number } | null>(null);
  const keyboardIntroFrameRef = useRef<number | null>(null);
  const switchAnimationFrameRef = useRef<number | null>(null);
  const incomingTransitionTimerRef = useRef<number | null>(null);
  const incomingTransitionTokenRef = useRef(0);
  const switchGhostsRef = useRef(new Set<HTMLElement>());
  const switchTimersRef = useRef(new Set<number>());
  const hiddenHandCardsRef = useRef(new Map<HTMLElement, { visibility: string; timer: number }>());
  const pointerFrameRef = useRef<number | null>(null);
  const pileAutoScrollRef = useRef<{ pointerX: number; frame: number | null }>({ pointerX: 0, frame: null });
  const moveDragAtPointRef = useRef<(clientX: number, clientY: number) => void>(() => {});
  const finishDragAtPointRef = useRef<(clientX: number, clientY: number) => void>(() => {});
  const cancelDragRef = useRef<() => void>(() => {});
  const releasePointerIdRef = useRef<number | null>(null);
  const selectKeyboardDragCardRef = useRef<(card: Card) => boolean>(() => false);

  // Pointer coordinates are presentation only; they must not rerender the battle.
  const dragPreviewRef = useCallback((element: HTMLDivElement | null) => {
    previewElementRef.current = element;
    const current = dragRef.current;
    if (!element || !current) return;
    const origin = keyboardIntroOriginRef.current;
    if (current.keyboard && origin) {
      keyboardIntroOriginRef.current = null;
      element.style.transition = "none";
      element.style.translate = `${origin.x}px ${origin.y}px`;
      element.getBoundingClientRect();
      keyboardIntroFrameRef.current = window.requestAnimationFrame(() => {
        keyboardIntroFrameRef.current = null;
        const latest = dragRef.current;
        if (previewElementRef.current !== element || !latest?.keyboard) return;
        element.style.transition = "translate 190ms cubic-bezier(.2,.75,.25,1)";
        element.style.translate = `${latest.x}px ${latest.y}px`;
      });
      return;
    }
    element.style.translate = `${current.x}px ${current.y}px`;
  }, []);
  const stopPointerFrame = () => {
    if (pointerFrameRef.current !== null) window.cancelAnimationFrame(pointerFrameRef.current);
    pointerFrameRef.current = null;
  };

  const stopPileAutoScroll = () => {
    const autoScroll = pileAutoScrollRef.current;
    if (autoScroll.frame !== null) window.cancelAnimationFrame(autoScroll.frame);
    autoScroll.frame = null;
  };

  const clearSwitchAnimations = () => {
    if (switchAnimationFrameRef.current !== null) window.cancelAnimationFrame(switchAnimationFrameRef.current);
    switchAnimationFrameRef.current = null;
    if (incomingTransitionTimerRef.current !== null) {
      window.clearTimeout(incomingTransitionTimerRef.current);
      switchTimersRef.current.delete(incomingTransitionTimerRef.current);
    }
    incomingTransitionTimerRef.current = null;
    incomingTransitionTokenRef.current += 1;
    switchTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    switchTimersRef.current.clear();
    switchGhostsRef.current.forEach((ghost) => ghost.remove());
    switchGhostsRef.current.clear();
    hiddenHandCardsRef.current.forEach(({ visibility, timer }, element) => {
      window.clearTimeout(timer);
      element.style.visibility = visibility;
    });
    hiddenHandCardsRef.current.clear();
  };

  const handCardElement = (cardId: number) => document
    .querySelector<HTMLElement>(`.hand-track [data-card-id="${cardId}"]`);

  const readPreviewPosition = (preview: HTMLElement, fallback: { x: number; y: number }) => {
    const [x, y] = window.getComputedStyle(preview).translate.split(/\s+/).map(Number.parseFloat);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : fallback;
  };

  const animateSwitchOut = (cardId: number, x: number, y: number) => {
    const preview = previewElementRef.current;
    const source = handCardElement(cardId);
    if (!preview || !source) return;

    const bounds = source.getBoundingClientRect();
    const currentPosition = readPreviewPosition(preview, { x, y });
    const ghost = preview.cloneNode(true) as HTMLElement;
    ghost.removeAttribute("id");
    ghost.setAttribute("aria-hidden", "true");
    ghost.inert = true;
    ghost.style.transition = "none";
    ghost.style.translate = `${currentPosition.x}px ${currentPosition.y}px`;
    ghost.style.pointerEvents = "none";
    ghost.style.zIndex = "10000";
    document.body.appendChild(ghost);
    switchGhostsRef.current.add(ghost);
    ghost.getBoundingClientRect();

    const existingHidden = hiddenHandCardsRef.current.get(source);
    if (existingHidden) {
      window.clearTimeout(existingHidden.timer);
      switchTimersRef.current.delete(existingHidden.timer);
    }
    const previousVisibility = existingHidden?.visibility ?? source.style.visibility;
    source.style.visibility = "hidden";
    const restoreTimer = window.setTimeout(() => {
      switchTimersRef.current.delete(restoreTimer);
      const hidden = hiddenHandCardsRef.current.get(source);
      if (hidden?.timer !== restoreTimer) return;
      source.style.visibility = hidden.visibility;
      hiddenHandCardsRef.current.delete(source);
    }, 230);
    switchTimersRef.current.add(restoreTimer);
    hiddenHandCardsRef.current.set(source, { visibility: previousVisibility, timer: restoreTimer });

    const ghostTimer = window.setTimeout(() => {
      switchTimersRef.current.delete(ghostTimer);
      switchGhostsRef.current.delete(ghost);
      ghost.remove();
    }, 230);
    switchTimersRef.current.add(ghostTimer);

    window.requestAnimationFrame(() => {
      if (!ghost.isConnected) return;
      ghost.style.transition = "translate 190ms cubic-bezier(.2,.75,.25,1)";
      ghost.style.translate = `${bounds.left + bounds.width / 2}px ${bounds.top + bounds.height / 2}px`;
    });
  };

  const updatePileAutoScroll = (pointerX: number) => {
    const autoScroll = pileAutoScrollRef.current;
    autoScroll.pointerX = pointerX;
    if (autoScroll.frame !== null) return;

    const tick = () => {
      const viewport = pileScrollRef.current;
      if (!viewport || viewport.scrollWidth <= viewport.clientWidth) {
        autoScroll.frame = null;
        return;
      }
      const bounds = viewport.getBoundingClientRect();
      const edgeSize = Math.min(96, Math.max(48, bounds.width * 0.16));
      const distanceFromLeft = autoScroll.pointerX - bounds.left;
      const distanceFromRight = bounds.right - autoScroll.pointerX;
      let scrollDelta = 0;
      if (distanceFromLeft < edgeSize) {
        scrollDelta = -Math.ceil(Math.min(1, (edgeSize - distanceFromLeft) / edgeSize) * 18);
      } else if (distanceFromRight < edgeSize) {
        scrollDelta = Math.ceil(Math.min(1, (edgeSize - distanceFromRight) / edgeSize) * 18);
      }
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      if (
        scrollDelta === 0
        || (scrollDelta < 0 && viewport.scrollLeft <= 0)
        || (scrollDelta > 0 && viewport.scrollLeft >= maxScrollLeft)
      ) {
        autoScroll.frame = null;
        return;
      }
      viewport.scrollLeft = Math.max(0, Math.min(maxScrollLeft, viewport.scrollLeft + scrollDelta));
      autoScroll.frame = window.requestAnimationFrame(tick);
    };

    autoScroll.frame = window.requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    const frame = pileAutoScrollRef.current.frame;
    if (frame !== null) window.cancelAnimationFrame(frame);
    if (pointerFrameRef.current !== null) window.cancelAnimationFrame(pointerFrameRef.current);
    if (keyboardIntroFrameRef.current !== null) window.cancelAnimationFrame(keyboardIntroFrameRef.current);
    clearSwitchAnimations();
  }, []);

  useEffect(() => {
    if (interaction.dragging !== null && phase === "playing" && game.status === "playing") return;
    keyboardDragRef.current = false;
    keyboardIntroOriginRef.current = null;
    if (keyboardIntroFrameRef.current !== null) window.cancelAnimationFrame(keyboardIntroFrameRef.current);
    keyboardIntroFrameRef.current = null;
    if (previewElementRef.current) previewElementRef.current.style.transition = "none";
    dragRef.current = null;
    if (pointerFrameRef.current !== null) window.cancelAnimationFrame(pointerFrameRef.current);
    pointerFrameRef.current = null;
    const autoScroll = pileAutoScrollRef.current;
    if (autoScroll.frame !== null) window.cancelAnimationFrame(autoScroll.frame);
    autoScroll.frame = null;
  }, [interaction.dragging, phase, game.status]);

  const beginDrag = (
    event: PointerEvent<HTMLElement>,
    card: Card,
    source: DragState["source"] = { type: "hand" },
    cards: Card[] = [card],
  ) => {
    if (
      game.status !== "playing"
      || game.pendingDraws > 0
      || game.pendingPileDrawCount > 0
      || game.pendingDiscards > 0
      || game.pendingSweep
      || (game.pendingResearchDraw !== null
        && !(game.pendingResearchDraw === "astronomy" && source.type === "pile"))
      || phase !== "playing"
    ) return;
    stopPointerFrame();
    stopPileAutoScroll();
    onClearPreviews();
    setDragOverDropTarget(null);
    keyboardDragRef.current = false;
    keyboardIntroOriginRef.current = null;
    if (keyboardIntroFrameRef.current !== null) window.cancelAnimationFrame(keyboardIntroFrameRef.current);
    keyboardIntroFrameRef.current = null;
    if (previewElementRef.current) previewElementRef.current.style.transition = "none";
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextDrag: ActiveBattleDrag = {
      card,
      cards,
      source,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      keyboard: false,
    };
    dragRef.current = nextDrag;
    setDragging(nextDrag);
    setHoveredHandCardId(source.type === "hand" ? card.id : null);
  };

  const beginKeyboardDrag = (
    card: Card,
    clientX: number,
    clientY: number,
    origin?: { x: number; y: number },
  ) => {
    if (
      game.status !== "playing"
      || game.pendingDraws > 0
      || game.pendingPileDrawCount > 0
      || game.pendingDiscards > 0
      || game.pendingSweep
      || game.pendingResearchDraw !== null
      || phase !== "playing"
    ) return false;
    stopPointerFrame();
    stopPileAutoScroll();
    onClearPreviews();
    setDragOverDropTarget(null);
    keyboardIntroOriginRef.current = origin ?? null;
    const nextDrag: ActiveBattleDrag = {
      card,
      cards: [card],
      source: { type: "hand" },
      x: clientX,
      y: clientY,
      startX: clientX,
      startY: clientY,
      moved: true,
      keyboard: true,
    };
    keyboardDragRef.current = true;
    dragRef.current = nextDrag;
    setDragging(nextDrag);
    setHoveredHandCardId(card.id);
    moveDragAtPoint(clientX, clientY);
    return true;
  };

  const selectKeyboardDragCard = (card: Card) => {
    const current = dragRef.current;
    if (!keyboardDragRef.current || !current) return false;
    stopPointerFrame();
    stopPileAutoScroll();
    onClearPreviews();
    if (keyboardIntroFrameRef.current !== null) window.cancelAnimationFrame(keyboardIntroFrameRef.current);
    keyboardIntroFrameRef.current = null;
    keyboardIntroOriginRef.current = null;
    if (switchAnimationFrameRef.current !== null) window.cancelAnimationFrame(switchAnimationFrameRef.current);
    switchAnimationFrameRef.current = null;
    if (incomingTransitionTimerRef.current !== null) {
      window.clearTimeout(incomingTransitionTimerRef.current);
      switchTimersRef.current.delete(incomingTransitionTimerRef.current);
    }
    incomingTransitionTimerRef.current = null;
    const transitionToken = ++incomingTransitionTokenRef.current;
    const source = handCardElement(card.id);
    const sourceBounds = source?.getBoundingClientRect();
    const preview = previewElementRef.current;
    if (sourceBounds && preview) {
      animateSwitchOut(current.card.id, current.x, current.y);
      preview.style.transition = "none";
      preview.style.translate = `${sourceBounds.left + sourceBounds.width / 2}px ${sourceBounds.top + sourceBounds.height / 2}px`;
      preview.getBoundingClientRect();
    }
    const nextDrag: ActiveBattleDrag = {
      ...current,
      card,
      cards: [card],
      source: { type: "hand" },
      moved: true,
      keyboard: true,
    };
    dragRef.current = nextDrag;
    setDragging(nextDrag);
    setDragOverDropTarget(null);
    const hoveredId = handCardAtPointer(nextDrag.x, nextDrag.y, card.id);
    const target = getDropZoneAtPoint(nextDrag.x, nextDrag.y) ?? null;
    setHoveredHandCardId(hoveredId);
    setDragOverDropTarget(target);
    updatePileAutoScroll(nextDrag.x);
    if (sourceBounds && preview) {
      switchAnimationFrameRef.current = window.requestAnimationFrame(() => {
        switchAnimationFrameRef.current = null;
        const latest = dragRef.current;
        if (
          transitionToken !== incomingTransitionTokenRef.current
          || !latest?.keyboard
          || latest.card.id !== card.id
          || previewElementRef.current !== preview
        ) return;
        preview.style.transition = "translate 190ms cubic-bezier(.2,.75,.25,1)";
        preview.style.translate = `${latest.x}px ${latest.y}px`;
        const timer = window.setTimeout(() => {
          switchTimersRef.current.delete(timer);
          if (
            transitionToken === incomingTransitionTokenRef.current
            && dragRef.current?.card.id === card.id
            && previewElementRef.current === preview
          ) {
            preview.style.transition = "none";
            incomingTransitionTimerRef.current = null;
          }
        }, 210);
        switchTimersRef.current.add(timer);
        incomingTransitionTimerRef.current = timer;
      });
    }
    return true;
  };

  const getDropZoneAtPoint = (clientX: number, clientY: number) => {
    const pointedTarget = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-drop-target]")
      ?.dataset.dropTarget;
    if (pointedTarget?.startsWith("enemy:") || pointedTarget?.startsWith("pile:")) return pointedTarget;
    const centerDropZone = centerDropZoneRef.current;
    if (centerDropZone) {
      const bounds = centerDropZone.getBoundingClientRect();
      const horizontalReach = Math.min(180, bounds.width * 0.25);
      if (
        clientX >= bounds.left - horizontalReach
        && clientX <= bounds.right + horizontalReach
        && clientY >= bounds.top
        && clientY <= bounds.bottom
      ) return "defend";
    }
    return pointedTarget;
  };

  const moveDragAtPoint = (clientX: number, clientY: number) => {
    const current = dragRef.current;
    if (!current) return;
    if (current.keyboard && (clientX !== current.x || clientY !== current.y)) {
      if (keyboardIntroFrameRef.current !== null) window.cancelAnimationFrame(keyboardIntroFrameRef.current);
      keyboardIntroFrameRef.current = null;
      if (incomingTransitionTimerRef.current !== null) {
        window.clearTimeout(incomingTransitionTimerRef.current);
        switchTimersRef.current.delete(incomingTransitionTimerRef.current);
      }
      incomingTransitionTimerRef.current = null;
      incomingTransitionTokenRef.current += 1;
      if (previewElementRef.current) previewElementRef.current.style.transition = "none";
    }
    const moved = current.moved || Math.hypot(clientX - current.startX, clientY - current.startY) > 7;
    const nextDrag = { ...current, x: clientX, y: clientY, moved };
    dragRef.current = nextDrag;
    if (moved !== current.moved) setDragging(nextDrag);
    if (pointerFrameRef.current !== null) return;
    pointerFrameRef.current = window.requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      const latest = dragRef.current;
      if (!latest) return;
      const hoveredId = handCardAtPointer(latest.x, latest.y, latest.moved ? latest.card.id : null);
      const target = latest.moved ? getDropZoneAtPoint(latest.x, latest.y) ?? null : null;
      setHoveredHandCardId(previous => previous === hoveredId ? previous : hoveredId);
      setDragOverDropTarget(previous => previous === target ? previous : target);
      if (previewElementRef.current) previewElementRef.current.style.translate = `${latest.x}px ${latest.y}px`;
      if (latest.moved) updatePileAutoScroll(latest.x);
      else stopPileAutoScroll();
    });
  };
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    moveDragAtPoint(event.clientX, event.clientY);
  };

  const finishDragAtPoint = (clientX: number, clientY: number) => {
    const current = dragRef.current;
    if (!current) return;
    keyboardDragRef.current = false;
    if (keyboardIntroFrameRef.current !== null) window.cancelAnimationFrame(keyboardIntroFrameRef.current);
    keyboardIntroFrameRef.current = null;
    if (previewElementRef.current) previewElementRef.current.style.transition = "none";
    stopPointerFrame();
    stopPileAutoScroll();
    setDragOverDropTarget(null);
    setHoveredHandCardId(handCardAtPointer(clientX, clientY));
    if (current.moved) {
      const dropZone = getDropZoneAtPoint(clientX, clientY);
      const targetPileIndex = dropZone?.startsWith("pile:") ? Number(dropZone.slice(5)) : undefined;

      if (dropZone === "hand" && current.source.type === "pile") {
        const sourcePile = game.piles[current.source.pileIndex];
        const isTopCard = current.cards.length === 1
          && current.source.cardIndex === (sourcePile?.length ?? 0) - 1;
        if (isTopCard && hasSticker(current.card, "bluebird") && game.pendingResearchDraw === null) {
          onRetrieveBluebirdFromPile(current.source.pileIndex);
        } else if (isTopCard) onResearchDraw(current.source.pileIndex, true);
        else setGame((state) => ({ ...state, message: "파일 맨 위 카드만 손패로 가져올 수 있습니다." }));
        dragRef.current = null;
        setDragging(null);
        return;
      }

      if (targetPileIndex !== undefined && Number.isInteger(targetPileIndex)) {
        onMoveCardToPile(current, targetPileIndex);
        dragRef.current = null;
        setDragging(null);
        return;
      }

      const isTargetedAttack = canTargetEnemy(current.card);
      const target = current.source.type === "hand" ? cardDropTarget(current.card, dropZone) : null;
      if (target) onPlayCard(current.card, target.targetEnemyId);
      else {
        setGame((state) => ({
          ...state,
          message: current.source.type === "pile"
            ? "앞면 카드 묶음은 다른 파일 위에 놓아주세요."
            : isTargetedAttack
              ? "대상 카드는 적용할 적이나 파일 위에 놓아주세요."
              : "이 카드는 중앙 영역이나 파일 위에 놓아주세요.",
        }));
      }
    }
    dragRef.current = null;
    setDragging(null);
  };
  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    finishDragAtPoint(event.clientX, event.clientY);
  };

  const cancelDrag = () => {
    keyboardDragRef.current = false;
    releasePointerIdRef.current = null;
    keyboardIntroOriginRef.current = null;
    if (keyboardIntroFrameRef.current !== null) window.cancelAnimationFrame(keyboardIntroFrameRef.current);
    keyboardIntroFrameRef.current = null;
    if (previewElementRef.current) previewElementRef.current.style.transition = "none";
    stopPointerFrame();
    stopPileAutoScroll();
    dragRef.current = null;
    setDragging(null);
    setDragOverDropTarget(null);
    setHoveredHandCardId(null);
  };

  useEffect(() => {
    gameRef.current = game;
    moveDragAtPointRef.current = moveDragAtPoint;
    finishDragAtPointRef.current = finishDragAtPoint;
    cancelDragRef.current = cancelDrag;
    selectKeyboardDragCardRef.current = selectKeyboardDragCard;
  });

  useEffect(() => {
    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (keyboardDragRef.current) moveDragAtPointRef.current(event.clientX, event.clientY);
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!keyboardDragRef.current || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      releasePointerIdRef.current = event.pointerId;
      const current = dragRef.current;
      const cardElement = (event.target as HTMLElement | null)?.closest<HTMLElement>(".hand-track [data-card-id]");
      const cardId = Number(cardElement?.dataset.cardId);
      const handCard = gameRef.current.hand.find((card) => card.id === cardId);
      if (current && handCard) {
        if (handCard.id !== current.card.id) selectKeyboardDragCardRef.current(handCard);
        return;
      }
      finishDragAtPointRef.current(event.clientX, event.clientY);
    };
    const onPointerUp = (event: globalThis.PointerEvent) => {
      if (releasePointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      releasePointerIdRef.current = null;
    };
    const onPointerCancel = (event: globalThis.PointerEvent) => {
      if (releasePointerIdRef.current !== event.pointerId) return;
      releasePointerIdRef.current = null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!keyboardDragRef.current || event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      cancelDragRef.current();
    };
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerCancel, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerCancel, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return { beginDrag, beginKeyboardDrag, selectKeyboardDragCard, moveDrag, finishDrag, cancelDrag, dragPreviewRef };
}
