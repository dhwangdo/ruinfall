import { useCallback, useEffect, useRef, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from "react";
import { canTargetEnemy, type Card } from "../game/cards";
import { cardDropTarget } from "../game/cardTargetRules.ts";
import type { DragState, Phase } from "../game/battleUiTypes";
import type { GameState } from "../game/battleState";
import type { ActiveBattleDrag } from "./useBattleInteractionState";
import { useBattleInteractionState } from "./useBattleInteractionState";
import { handCardAtPointer } from "../components/handHitTest";

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
}: BattlePointerInputOptions) {
  const {
    centerDropZoneRef,
    setDragOverDropTarget,
    setDragging,
    setHoveredHandCardId,
  } = interaction;
  const dragRef = useRef<ActiveBattleDrag | null>(null);
  const previewElementRef = useRef<HTMLDivElement | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const pileAutoScrollRef = useRef<{ pointerX: number; frame: number | null }>({ pointerX: 0, frame: null });

  // Pointer coordinates are presentation only; they must not rerender the battle.
  const dragPreviewRef = useCallback((element: HTMLDivElement | null) => {
    previewElementRef.current = element;
    const current = dragRef.current;
    if (element && current) element.style.translate = `${current.x}px ${current.y}px`;
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
  }, []);

  useEffect(() => {
    if (interaction.dragging !== null && phase === "playing" && game.status === "playing") return;
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
    };
    dragRef.current = nextDrag;
    setDragging(nextDrag);
    setHoveredHandCardId(source.type === "hand" ? card.id : null);
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

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const current = dragRef.current;
    if (!current) return;
    const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 7;
    const nextDrag = { ...current, x: event.clientX, y: event.clientY, moved };
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

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    const current = dragRef.current;
    if (!current) return;
    stopPointerFrame();
    stopPileAutoScroll();
    setDragOverDropTarget(null);
    setHoveredHandCardId(handCardAtPointer(event.clientX, event.clientY));
    if (current.moved) {
      const dropZone = getDropZoneAtPoint(event.clientX, event.clientY);
      const targetPileIndex = dropZone?.startsWith("pile:") ? Number(dropZone.slice(5)) : undefined;

      if (dropZone === "hand" && current.source.type === "pile") {
        const sourcePile = game.piles[current.source.pileIndex];
        const isTopCard = current.cards.length === 1
          && current.source.cardIndex === (sourcePile?.length ?? 0) - 1;
        if (isTopCard) onResearchDraw(current.source.pileIndex, true);
        else setGame((state) => ({ ...state, message: "연구 드로우는 파일 맨 위 카드만 손패로 가져올 수 있습니다." }));
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

  const cancelDrag = () => {
    stopPointerFrame();
    stopPileAutoScroll();
    dragRef.current = null;
    setDragging(null);
    setDragOverDropTarget(null);
    setHoveredHandCardId(null);
  };

  return { beginDrag, moveDrag, finishDrag, cancelDrag, dragPreviewRef };
}
