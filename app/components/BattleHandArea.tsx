"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Dispatch, type RefObject, type SetStateAction } from "react";
import { CardFace } from "./CardFace";
import { HAND_PASSIVE_EFFECTS, UNPLAYABLE_CARD_EFFECTS, type Card } from "../game/cards";
import { cardEnergyCost } from "../game/cardEffects";
import type { GameState } from "../game/battleState";
import type { DragState, Phase } from "../game/battleUiTypes";
import type { useBattlePointerInput } from "../hooks/useBattlePointerInput";
import { handCardAtPointer } from "./handHitTest";

type BattleDragHandlers = Pick<
  ReturnType<typeof useBattlePointerInput>,
  "beginDrag" | "moveDrag" | "finishDrag" | "cancelDrag"
>;

type BattleHandAreaProps = {
  game: GameState;
  phase: Phase;
  dragging: DragState | null;
  selectedHandCardId: number | null;
  hoveredHandCardId: number | null;
  setHoveredHandCardId: Dispatch<SetStateAction<number | null>>;
  setSelectedHandCardId: Dispatch<SetStateAction<number | null>>;
  controlsLocked: boolean;
  backToBasicsBonus: (card: Card) => number;
  combatManualBonus: number;
  lawResearchCount: number;
  canUseNecromancyResearch: boolean;
  handCardRefs: RefObject<Map<number, HTMLButtonElement>>;
  dragHandlers: BattleDragHandlers;
  onClearResearchDrag: () => void;
  onRetrieveNecromancyResearchCard: (cardId: number, allowAutoPay?: boolean) => void;
  onDiscardSelectedCard: (cardId: number) => void;
  onPlayHandCardOnDoubleClick: (card: Card) => void;
  onSortHand: () => void;
  onEndTurn: () => void;
  onShowCardKeywordOnly: (card: Card, right: number, top: number) => void;
  onClearCardHover: () => void;
};

const HAND_CARD_STEP = 100;
const HAND_ARC_RADIUS = 1700;
const HAND_ANGLE_STEP = 3.4;
const HAND_WHEEL_STEP = 70;
const HAND_WHEEL_MIN_CARDS = 9;
const HAND_EDGE_MARGIN = 12;

export function BattleHandArea({
  game,
  phase,
  dragging,
  selectedHandCardId,
  hoveredHandCardId,
  setHoveredHandCardId,
  setSelectedHandCardId,
  controlsLocked,
  backToBasicsBonus,
  combatManualBonus,
  lawResearchCount,
  canUseNecromancyResearch,
  handCardRefs,
  dragHandlers,
  onClearResearchDrag,
  onRetrieveNecromancyResearchCard,
  onDiscardSelectedCard,
  onPlayHandCardOnDoubleClick,
  onSortHand,
  onEndTurn,
  onShowCardKeywordOnly,
  onClearCardHover,
}: BattleHandAreaProps) {
  const displayedHand = useDisplayedHand(game, phase);
  const handRef = useRef<HTMLDivElement>(null);
  const wheelRemainderRef = useRef(0);
  const wheelSpringFrameRef = useRef<number | null>(null);
  const windowStartRef = useRef(0);
  const clearCardHoverRef = useRef(onClearCardHover);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [handMetrics, setHandMetrics] = useState({ width: 600, cardWidth: 136, cardHeight: 191 });
  const [windowStart, setWindowStart] = useState(0);
  const fittingCardCount = [9, 7, 5, 3, 1].find((count) => {
    const angle = (count - 1) / 2 * HAND_ANGLE_STEP * Math.PI / 180;
    const outerEdge = HAND_ARC_RADIUS * Math.sin(angle)
      + handMetrics.cardWidth / 2 * Math.cos(angle)
      + handMetrics.cardHeight * Math.sin(angle);
    return outerEdge * 2 + HAND_EDGE_MARGIN * 2 <= handMetrics.width;
  }) ?? 1;
  const visibleCardCount = Math.min(
    displayedHand.length,
    fittingCardCount,
  );
  const maxWindowStart = Math.max(0, displayedHand.length - visibleCardCount);
  const overscrollLimit = Math.max(0, Math.floor((visibleCardCount - 1) / 2));
  const clampedWindowStart = Math.max(-overscrollLimit, Math.min(windowStart, maxWindowStart + overscrollLimit));
  const leftHiddenCount = displayedHand.slice(0, Math.max(0, clampedWindowStart)).filter(Boolean).length;
  const rightHiddenCount = displayedHand.slice(clampedWindowStart + visibleCardCount).filter(Boolean).length;
  const handCenterIndex = clampedWindowStart + Math.max(0, (visibleCardCount - 1) / 2);
  const trackCenterOffset = handMetrics.cardWidth / 2 + handCenterIndex * HAND_CARD_STEP;
  const edgeDistance = Math.max(0, (visibleCardCount - 1) / 2);
  const edgeAngle = edgeDistance * HAND_ANGLE_STEP * Math.PI / 180;
  const handBottomClearance = Math.max(52, Math.ceil(
    HAND_ARC_RADIUS * (1 - Math.cos(edgeAngle))
    + handMetrics.cardWidth / 2 * Math.sin(edgeAngle)
    + 16,
  ));
  const selectedHandIndex = selectedHandCardId === null
    ? -1
    : displayedHand.findIndex((card) => card?.id === selectedHandCardId);

  useLayoutEffect(() => {
    windowStartRef.current = windowStart;
  }, [windowStart]);

  useLayoutEffect(() => {
    clearCardHoverRef.current = onClearCardHover;
  }, [onClearCardHover]);

  useEffect(() => {
    const hand = handRef.current;
    if (!hand) return;
    const updateMetrics = () => {
      const style = getComputedStyle(hand);
      const width = hand.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
      const cardWidth = Number.parseFloat(style.getPropertyValue("--card-w")) || 136;
      const cardHeight = Number.parseFloat(style.getPropertyValue("--card-h")) || 191;
      setHandMetrics((current) => current.width === width && current.cardWidth === cardWidth && current.cardHeight === cardHeight
        ? current
        : { width, cardWidth, cardHeight });
    };
    updateMetrics();
    const observer = new ResizeObserver(updateMetrics);
    observer.observe(hand);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selectedHandIndex < 0 || maxWindowStart === 0) return;
    const frame = window.requestAnimationFrame(() => {
      setWindowStart((current) => {
        const start = Math.min(current, maxWindowStart);
        if (selectedHandIndex < start) return selectedHandIndex;
        if (selectedHandIndex >= start + visibleCardCount) {
          return Math.min(maxWindowStart, selectedHandIndex - visibleCardCount + 1);
        }
        return start;
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedHandIndex, visibleCardCount, maxWindowStart]);

  useEffect(() => {
    const hand = handRef.current;
    if (!hand) return;
    if (displayedHand.length < HAND_WHEEL_MIN_CARDS) {
      wheelRemainderRef.current = 0;
      const frame = window.requestAnimationFrame(() => setWindowStart(0));
      return () => window.cancelAnimationFrame(frame);
    }

    let previousFrameTime = 0;
    let springTravel = 0;
    let lastWheelTime = -Infinity;
    const springFrame = (now: number) => {
      const current = windowStartRef.current;
      const distance = current < 0 ? -current : Math.max(0, current - maxWindowStart);
      if (distance === 0) {
        wheelSpringFrameRef.current = null;
        return;
      }
      const elapsed = previousFrameTime === 0 ? 16 : Math.min(50, now - previousFrameTime);
      previousFrameTime = now;
      const wheelIsActive = now - lastWheelTime < 160;
      const returnSpeed = wheelIsActive ? 1.05 + distance * 1.4 : 7.2 + distance * 7.2;
      springTravel += elapsed * returnSpeed / 1000;
      if (springTravel >= 1) {
        springTravel -= 1;
        const next = current + (current < 0 ? 1 : -1);
        windowStartRef.current = next;
        setWindowStart(next);
      }
      wheelSpringFrameRef.current = window.requestAnimationFrame(springFrame);
    };
    const startSpring = () => {
      if (wheelSpringFrameRef.current !== null) return;
      previousFrameTime = 0;
      springTravel = 0;
      wheelSpringFrameRef.current = window.requestAnimationFrame(springFrame);
    };
    if (windowStartRef.current < 0 || windowStartRef.current > maxWindowStart) startSpring();

    const handleWheel = (event: WheelEvent) => {
      if (dragging || event.ctrlKey || visibleCardCount <= 1) return;
      const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (rawDelta === 0) return;
      event.preventDefault();
      lastWheelTime = performance.now();
      const delta = rawDelta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? hand.clientHeight : 1);
      if (Math.sign(delta) !== Math.sign(wheelRemainderRef.current)) wheelRemainderRef.current = 0;
      wheelRemainderRef.current += delta;
      const current = windowStartRef.current;
      const pullingPastEdge = delta < 0 && current <= 0
        ? -current
        : delta > 0 && current >= maxWindowStart ? current - maxWindowStart : 0;
      if (Math.abs(wheelRemainderRef.current) < HAND_WHEEL_STEP * (1 + pullingPastEdge * 0.35)) return;
      wheelRemainderRef.current = 0;
      const next = Math.max(-overscrollLimit, Math.min(maxWindowStart + overscrollLimit, current + Math.sign(delta)));
      if (next === current) return;
      windowStartRef.current = next;
      setWindowStart(next);
      if (next < 0 || next > maxWindowStart) startSpring();
      setSelectedHandCardId(null);
      setHoveredHandCardId(null);
      clearCardHoverRef.current();
    };
    hand.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      hand.removeEventListener("wheel", handleWheel);
      if (wheelSpringFrameRef.current !== null) window.cancelAnimationFrame(wheelSpringFrameRef.current);
      wheelSpringFrameRef.current = null;
    };
  }, [dragging, displayedHand.length, maxWindowStart, overscrollLimit, setHoveredHandCardId, setSelectedHandCardId, visibleCardCount]);

  const updateHandHoverAtPoint = useCallback((clientX: number, clientY: number, refreshDetails = false) => {
    const cardId = handCardAtPointer(clientX, clientY);
    if (cardId === hoveredHandCardId && !refreshDetails) return;
    if (cardId !== hoveredHandCardId) setHoveredHandCardId(cardId);
    if (cardId === null) {
      if (hoveredHandCardId !== null) onClearCardHover();
      return;
    }
    if (selectedHandCardId !== null && selectedHandCardId !== cardId) setSelectedHandCardId(null);
    const card = game.hand.find((item) => item.id === cardId);
    const element = handCardRefs.current.get(cardId);
    if (!card || !element) return;
    const bounds = element.getBoundingClientRect();
    onShowCardKeywordOnly(card, bounds.right, bounds.top);
  }, [game.hand, handCardRefs, hoveredHandCardId, onClearCardHover, onShowCardKeywordOnly, selectedHandCardId, setHoveredHandCardId, setSelectedHandCardId]);
  const updateHandHoverRef = useRef(updateHandHoverAtPoint);
  useLayoutEffect(() => {
    updateHandHoverRef.current = updateHandHoverAtPoint;
  }, [updateHandHoverAtPoint]);

  useEffect(() => {
    const updateHandHover = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "touch") {
        lastPointerRef.current = null;
        return;
      }
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      if (dragging || event.buttons !== 0) return;
      updateHandHoverAtPoint(event.clientX, event.clientY);
    };
    window.addEventListener("pointermove", updateHandHover, true);
    window.addEventListener("pointerup", updateHandHover, true);
    return () => {
      window.removeEventListener("pointermove", updateHandHover, true);
      window.removeEventListener("pointerup", updateHandHover, true);
    };
  }, [dragging, updateHandHoverAtPoint]);

  useLayoutEffect(() => {
    if (dragging) return;
    const pointer = lastPointerRef.current;
    if (!pointer) return;
    updateHandHoverRef.current(pointer.x, pointer.y, true);
    const startedAt = performance.now();
    let frame = 0;
    const followMovingHand = () => {
      const latestPointer = lastPointerRef.current;
      if (latestPointer) updateHandHoverRef.current(latestPointer.x, latestPointer.y);
      if (performance.now() - startedAt < 320) {
        frame = window.requestAnimationFrame(followMovingHand);
      }
    };
    frame = window.requestAnimationFrame(followMovingHand);
    return () => window.cancelAnimationFrame(frame);
  }, [dragging, game.hand, phase, controlsLocked, clampedWindowStart, visibleCardCount]);

  useEffect(() => {
    const track = handRef.current?.querySelector<HTMLElement>(".hand-track");
    if (!track) return;
    const updateAfterFanMoves = (event: TransitionEvent) => {
      if (dragging || event.target !== track || event.propertyName !== "transform") return;
      const pointer = lastPointerRef.current;
      if (pointer) updateHandHoverRef.current(pointer.x, pointer.y, true);
    };
    track.addEventListener("transitionend", updateAfterFanMoves);
    return () => track.removeEventListener("transitionend", updateAfterFanMoves);
  }, [dragging]);

  useEffect(() => {
    const handleHandKey = (event: KeyboardEvent) => {
      if (phase !== "playing" || game.status !== "playing" || dragging || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.code === "Space") {
        event.preventDefault();
        onSortHand();
        setWindowStart(0);
        setSelectedHandCardId(null);
        return;
      }
      const activateSelectedCard = (card: Card) => {
        setSelectedHandCardId(null);
        onPlayHandCardOnDoubleClick(card);
      };
      if (event.key === "Enter" && selectedHandCardId !== null) {
        const card = game.hand.find((item) => item.id === selectedHandCardId);
        if (!card) return;
        event.preventDefault();
        activateSelectedCard(card);
        return;
      }
      if (!/^[1-9]$/.test(event.key)) return;
      const visibleIndex = Number(event.key) - 1;
      if (visibleIndex >= visibleCardCount) return;
      const card = displayedHand[clampedWindowStart + visibleIndex];
      if (!card) return;
      event.preventDefault();
      if (selectedHandCardId === card.id) activateSelectedCard(card);
      else setSelectedHandCardId(card.id);
    };
    window.addEventListener("keydown", handleHandKey);
    return () => window.removeEventListener("keydown", handleHandKey);
  }, [clampedWindowStart, displayedHand, dragging, game.hand, game.status, onClearCardHover, onPlayHandCardOnDoubleClick, onSortHand, phase, selectedHandCardId, setHoveredHandCardId, setSelectedHandCardId, visibleCardCount]);

  const handFanStyle = (index: number) => {
    const distanceFromCenter = index - handCenterIndex;
    const angle = distanceFromCenter * HAND_ANGLE_STEP * Math.PI / 180;
    const xOffset = HAND_ARC_RADIUS * Math.sin(angle) - distanceFromCenter * HAND_CARD_STEP;
    return {
      "--hand-x": `${xOffset}px`,
      "--hand-angle": `${distanceFromCenter * HAND_ANGLE_STEP}deg`,
      "--hand-y": `${HAND_ARC_RADIUS * (1 - Math.cos(angle))}px`,
    } as CSSProperties;
  };

  return (
    <>
      <div
        ref={handRef}
        className={`hand ${phase === "discarding" && !game.preserveHandOnTurnEnd ? "is-discarding" : ""} ${phase === "drawing" ? "is-drawing" : ""} ${game.pendingDiscards > 0 ? "is-discard-choice" : ""} ${dragging ? "is-pointer-dragging" : ""}`}
        style={{ "--hand-bottom-clearance": `${handBottomClearance}px` } as CSSProperties}
        data-drop-target="hand"
        aria-label="손패"
        onDragOver={(event) => {
          if (game.pendingResearchDraw === "necromancy" || canUseNecromancyResearch) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }
        }}
        onDrop={(event) => {
          const payload = event.dataTransfer.getData("text/plain");
          if (!payload.startsWith("research-discard:")) return;
          event.preventDefault();
          const cardId = Number(payload.slice("research-discard:".length));
          if (Number.isInteger(cardId)) {
            onClearResearchDrag();
            onRetrieveNecromancyResearchCard(cardId, true);
          }
        }}
      >
        <div
          className="hand-track"
          style={{ "--hand-card-step": `${HAND_CARD_STEP}px`, transform: `translateX(-${trackCenterOffset}px)` } as CSSProperties}
        >
          {displayedHand.map((card, index) => card ? (
            <button
              className={`game-card card-face ${card.kind} ${card.damageType} ${HAND_PASSIVE_EFFECTS.has(card.effect) ? "has-hand-aura" : card.effect === "slime" ? "has-danger-aura is-toxic-slime" : ""} ${dragging?.card.id === card.id ? "is-dragging" : ""} ${hoveredHandCardId === card.id ? "is-pointer-hovered" : ""} ${selectedHandCardId === card.id ? "is-keyboard-selected" : ""} ${index < clampedWindowStart || index >= clampedWindowStart + visibleCardCount ? "is-outside-window" : ""}`}
              key={card.id}
              data-card-id={card.id}
              ref={(element) => {
                if (element) handCardRefs.current.set(card.id, element);
                else handCardRefs.current.delete(card.id);
              }}
              style={{ "--card-index": index, ...handFanStyle(index) } as CSSProperties}
              tabIndex={index >= clampedWindowStart && index < clampedWindowStart + visibleCardCount ? 0 : -1}
              aria-hidden={index < clampedWindowStart || index >= clampedWindowStart + visibleCardCount}
              onPointerDown={(event) => {
                if (handCardAtPointer(event.clientX, event.clientY) !== card.id) return;
                setSelectedHandCardId(null);
                dragHandlers.beginDrag(event, card, { type: "hand" });
              }}
              onPointerMove={dragHandlers.moveDrag}
              onPointerUp={dragHandlers.finishDrag}
              onPointerCancel={dragHandlers.cancelDrag}
              onBlur={onClearCardHover}
              onClick={(event) => {
                if (game.pendingDiscards > 0 && handCardAtPointer(event.clientX, event.clientY) === card.id) {
                  onDiscardSelectedCard(card.id);
                }
              }}
              onDoubleClick={(event) => {
                if (handCardAtPointer(event.clientX, event.clientY) === card.id) onPlayHandCardOnDoubleClick(card);
              }}
              disabled={controlsLocked && game.pendingDiscards === 0}
              aria-label={UNPLAYABLE_CARD_EFFECTS.has(card.effect) ? `${card.name}, 비용 -, 사용 불가` : `${card.name}, 에너지 ${cardEnergyCost(card, lawResearchCount, game.forgeCount)}`}
            >
              <CardFace
                card={card}
                starsSpent={game.starsSpent}
                strength={game.strength + combatManualBonus + backToBasicsBonus(card)}
                agility={game.agility + combatManualBonus + backToBasicsBonus(card)}
                defenseMultiplier={game.defenseMultiplier}
                ruleCostReduction={lawResearchCount}
                forgeCount={game.forgeCount}
                radiancePlayedThisTurn={game.radiancePlayedThisTurn}
              />
            </button>
          ) : <div className={`hand-card-placeholder ${index < clampedWindowStart || index >= clampedWindowStart + visibleCardCount ? "is-outside-window" : ""}`} aria-hidden="true" key={`clear-slot-${index}`} style={handFanStyle(index)} />)}
        </div>
        {leftHiddenCount > 0 && (
          <div className="hand-overflow-card is-left" role="status" aria-label={`왼쪽에 카드 ${leftHiddenCount}장 더 있음`}>
            <span aria-hidden="true">+{leftHiddenCount}</span>
          </div>
        )}
        {rightHiddenCount > 0 && (
          <div className="hand-overflow-card is-right" role="status" aria-label={`오른쪽에 카드 ${rightHiddenCount}장 더 있음`}>
            <span aria-hidden="true">+{rightHiddenCount}</span>
          </div>
        )}
        {game.hand.length === 0 && phase === "playing" && game.status === "playing" && (
          <div className="empty-hand">사용할 카드가 없습니다</div>
        )}
      </div>
      <div className="controls">
        <button className="end-turn" onClick={onEndTurn} disabled={controlsLocked}>
          턴 종료 (E) <span>→</span>
        </button>
      </div>
    </>
  );
}

function useDisplayedHand(game: GameState, phase: Phase): Array<Card | null> {
  const hasClearHandSlots = game.hand.some((card) => card.drawSlot !== undefined);
  const usesClearHandSlots = phase !== "playing" && hasClearHandSlots && !game.preserveHandOnTurnEnd;
  const clearHandSlotCount = usesClearHandSlots
    ? Math.max(...game.hand.map((card) => card.drawSlotCount ?? 0), game.hand.length)
    : game.hand.length;
  return usesClearHandSlots
    ? [
      ...Array.from({ length: clearHandSlotCount }, (_, slot) =>
        game.hand.find((card) => card.drawSlot === slot) ?? null),
      ...game.hand.filter((card) => card.drawSlot === undefined),
    ]
    : hasClearHandSlots
      ? [
        ...game.hand
          .filter((card) => card.drawSlot !== undefined)
          .sort((left, right) => left.drawSlot! - right.drawSlot!),
        ...game.hand.filter((card) => card.drawSlot === undefined),
      ]
      : game.hand;
}
