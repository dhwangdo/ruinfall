import { useEffect, useRef, type Dispatch, type PointerEvent, type RefObject, type SetStateAction } from "react";
import { isAttackCard, type Card } from "../game/cards";
import type { DragState, Phase } from "../game/battleUiTypes";
import type { GameState } from "../game/battleState";
import type { ActiveBattleDrag } from "./useBattleInteractionState";
import { useBattleInteractionState } from "./useBattleInteractionState";

type BattleInteractionState = ReturnType<typeof useBattleInteractionState>;

type BattlePointerInputOptions = {
  interaction: BattleInteractionState;
  game: GameState;
  phase: Phase;
  screen: "map" | "battle";
  pileScrollRef: RefObject<HTMLDivElement | null>;
  setGame: Dispatch<SetStateAction<GameState>>;
  onClearPreviews: () => void;
  onMoveCardToPile: (drag: DragState, targetPileIndex: number) => void;
  onPlayCard: (card: Card, targetEnemyId?: string) => void;
  onResearchDraw: (pileIndex: number, allowAutoPay?: boolean) => void;
  onPlayHandCardOnDoubleClick: (card: Card) => void;
};

export function useBattlePointerInput({
  interaction,
  game,
  phase,
  screen,
  pileScrollRef,
  setGame,
  onClearPreviews,
  onMoveCardToPile,
  onPlayCard,
  onResearchDraw,
  onPlayHandCardOnDoubleClick,
}: BattlePointerInputOptions) {
  const {
    centerDropZoneRef,
    setDragOverDropTarget,
    setDragging,
    selectedHandCardId,
    setSelectedHandCardId,
  } = interaction;
  const dragRef = useRef<ActiveBattleDrag | null>(null);
  const pileAutoScrollRef = useRef<{ pointerX: number; frame: number | null }>({ pointerX: 0, frame: null });

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
  }, []);

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
  };

  const getDropZoneAtPoint = (clientX: number, clientY: number) => {
    const centerDropZone = centerDropZoneRef.current;
    if (centerDropZone) {
      const bounds = centerDropZone.getBoundingClientRect();
      if (
        clientX >= bounds.left
        && clientX <= bounds.right
        && clientY >= bounds.top
        && clientY <= bounds.bottom
      ) return "defend";
    }
    return document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-drop-target]")
      ?.dataset.dropTarget;
  };

  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    const current = dragRef.current;
    if (!current) return;
    const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 7;
    const nextDrag = { ...current, x: event.clientX, y: event.clientY, moved };
    dragRef.current = nextDrag;
    setDragging(nextDrag);
    if (!moved) setDragOverDropTarget(null);
    else setDragOverDropTarget(getDropZoneAtPoint(event.clientX, event.clientY) ?? null);
    if (moved) updatePileAutoScroll(event.clientX);
    else stopPileAutoScroll();
  };

  const finishDrag = (event: PointerEvent<HTMLElement>) => {
    const current = dragRef.current;
    if (!current) return;
    stopPileAutoScroll();
    setDragOverDropTarget(null);
    if (current.moved) {
      const dropZone = getDropZoneAtPoint(event.clientX, event.clientY);
      const targetEnemyId = dropZone?.startsWith("enemy:") ? dropZone.slice(6) : undefined;
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

      const isTargetedAttack = isAttackCard(current.card);
      const resolvedTargetEnemyId = targetEnemyId
        ?? (isTargetedAttack && dropZone === "defend"
          ? game.enemies.find((enemy) => enemy.hp > 0)?.id
          : undefined);
      const validDrop = current.source.type === "hand"
        && !["slime", "combatManual", "grimoire"].includes(current.card.effect)
        && (
          (isTargetedAttack && Boolean(resolvedTargetEnemyId))
          || (current.card.effect === "ironRampage" && dropZone === "defend")
          || (current.card.effect === "odinSpear" && dropZone === "defend")
          || (current.card.kind !== "strike" && dropZone === "defend")
        );
      if (validDrop) onPlayCard(current.card, resolvedTargetEnemyId);
      else {
        setGame((state) => ({
          ...state,
          message: current.source.type === "pile"
            ? "앞면 카드 묶음은 다른 파일 위에 놓아주세요."
            : isTargetedAttack
              ? "타격 카드는 적이나 파일 위에 놓아주세요."
              : "이 카드는 중앙 영역이나 파일 위에 놓아주세요.",
        }));
      }
    }
    dragRef.current = null;
    setDragging(null);
  };

  const cancelDrag = () => {
    stopPileAutoScroll();
    dragRef.current = null;
    setDragging(null);
    setDragOverDropTarget(null);
  };

  useEffect(() => {
    const handleBattleCardKeyboard = (event: KeyboardEvent) => {
      if (screen !== "battle" || phase !== "playing" || game.status !== "playing" || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      const activateSelectedCard = (card: Card) => {
        setSelectedHandCardId(null);
        onPlayHandCardOnDoubleClick(card);
      };
      const selectedId = selectedHandCardId;
      if (event.key === "Enter" && selectedId !== null) {
        const card = game.hand.find((item) => item.id === selectedId);
        if (!card) return;
        event.preventDefault();
        activateSelectedCard(card);
        return;
      }
      if (!/^\d$/.test(event.key)) return;
      const handIndex = event.key === "0" ? 9 : Number(event.key) - 1;
      const keyboardHand = [
        ...game.hand.filter((card) => card.drawSlot !== undefined).sort((left, right) => left.drawSlot! - right.drawSlot!),
        ...game.hand.filter((card) => card.drawSlot === undefined),
      ];
      const card = keyboardHand[handIndex];
      if (!card) return;
      event.preventDefault();
      if (selectedId === card.id) activateSelectedCard(card);
      else setSelectedHandCardId(card.id);
    };
    window.addEventListener("keydown", handleBattleCardKeyboard);
    return () => window.removeEventListener("keydown", handleBattleCardKeyboard);
  }, [game.hand, game.status, onPlayHandCardOnDoubleClick, phase, screen, selectedHandCardId, setSelectedHandCardId]);

  return { beginDrag, moveDrag, finishDrag, cancelDrag };
}
