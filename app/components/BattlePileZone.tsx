"use client";

import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type RefObject, type WheelEvent as ReactWheelEvent } from "react";
import { CardFace } from "./CardFace";
import type { Card } from "../game/cards";
import { canForgeCardOnto, canPlaceBySolitaireRule } from "../game/cardEffects";
import type { GameState } from "../game/battleState";
import type { DragState } from "../game/battleUiTypes";
import type { useBattlePointerInput } from "../hooks/useBattlePointerInput";

type BattleDragHandlers = Pick<
  ReturnType<typeof useBattlePointerInput>,
  "beginDrag" | "moveDrag" | "finishDrag" | "cancelDrag"
>;

type BattlePileZoneProps = {
  game: GameState;
  dragging: DragState | null;
  dragOverDropTarget: string | null;
  pileClearNotice: boolean;
  pileScrollRef: RefObject<HTMLDivElement | null>;
  combatManualBonus: number;
  backToBasicsBonus: (card: Card) => number;
  dragHandlers: BattleDragHandlers;
  onDrawAstronomyResearchCard: (pileIndex: number) => void;
  onTakeSelectedPile: (pileIndex: number) => void;
  onDrawSelectedPile: (pileIndex: number) => void;
  onMoveSelectedHandCardToPile: (pileIndex: number) => void;
  onShowCardKeywordOnly: (card: Card, right: number, top: number) => void;
  onClearCardHover: () => void;
};

const CARD_HEIGHT = 170;
const DEFAULT_STACK_OFFSET = 27;

export function BattlePileZone({
  game,
  dragging,
  dragOverDropTarget,
  pileClearNotice,
  pileScrollRef,
  combatManualBonus,
  backToBasicsBonus,
  dragHandlers,
  onDrawAstronomyResearchCard,
  onTakeSelectedPile,
  onDrawSelectedPile,
  onMoveSelectedHandCardToPile,
  onShowCardKeywordOnly,
  onClearCardHover,
}: BattlePileZoneProps) {
  const pilePanRef = useRef<{ startX: number; scrollLeft: number } | null>(null);
  const [pilePanning, setPilePanning] = useState(false);
  const lawResearchCount = game.activeRuleCards.filter((card) => card.effect === "lawResearch").length;
  const discardPileCounts = game.enemies.reduce((counts, enemy) => {
    const intent = enemy.actions[enemy.intentIndex];
    if (enemy.hp > 0 && intent.discardCount && enemy.discardPileIndex !== undefined) {
      counts.set(enemy.discardPileIndex, (counts.get(enemy.discardPileIndex) ?? 0) + intent.discardCount);
    }
    return counts;
  }, new Map<number, number>());

  const scrollPilesHorizontally = (event: ReactWheelEvent<HTMLDivElement>) => {
    const viewport = event.currentTarget;
    event.preventDefault();
    event.stopPropagation();
    if (viewport.scrollWidth <= viewport.clientWidth) return;
    const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
    if (delta !== 0) viewport.scrollLeft += delta * 1.5;
  };

  const beginPilePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = pileScrollRef.current;
    if (
      event.button !== 0
      || !viewport
      || viewport.scrollWidth <= viewport.clientWidth
      || (event.target as HTMLElement).closest(".pile-draggable-card")
    ) return;
    pilePanRef.current = { startX: event.clientX, scrollLeft: viewport.scrollLeft };
    viewport.setPointerCapture(event.pointerId);
    setPilePanning(true);
    event.preventDefault();
  };

  const movePilePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = pileScrollRef.current;
    const pan = pilePanRef.current;
    if (!viewport || !pan) return;
    viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.startX);
    event.preventDefault();
  };

  const finishPilePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pilePanRef.current = null;
    setPilePanning(false);
  };

  return (
    <div className="pile-zone">
      {pileClearNotice && game.clearPlan && <div className="pile-clear-notice">CLEAR!</div>}
      <div
        className={`piles-scroll ${pilePanning ? "is-panning" : ""}`}
        ref={pileScrollRef}
        onWheel={scrollPilesHorizontally}
        onPointerDown={beginPilePan}
        onPointerMove={movePilePan}
        onPointerUp={finishPilePan}
        onPointerCancel={finishPilePan}
      >
        <div className="piles" aria-label="카드 파일들">
          {game.piles.map((pile, index) => {
            const stackOffset = DEFAULT_STACK_OFFSET;
            const discardCount = discardPileCounts.get(index) ?? 0;
            const targetCard = pile.at(-1);
            const activeDrag = dragging;
            const isValidSolitaireDrop = activeDrag !== null
              && game.stars >= 1
              && !(activeDrag.source.type === "pile" && activeDrag.source.pileIndex === index)
              && canPlaceBySolitaireRule(activeDrag.card, targetCard);
            const isForgeDrop = activeDrag !== null
              && isValidSolitaireDrop
              && targetCard !== undefined
              && canForgeCardOnto(activeDrag.card, targetCard, lawResearchCount, game.forgeCount);
            const isHoveredSolitaireDrop = isValidSolitaireDrop && dragOverDropTarget === `pile:${index}`;
            return (
              <div
                className={`solitaire-pile ${discardCount > 0 ? "is-discard-target" : ""} ${game.pendingDraws > 0 || game.pendingPileDrawCount > 0 || game.pendingSweep || game.pendingResearchDraw === "astronomy" ? pile.length > 0 ? "is-draw-choice" : "is-draw-empty" : ""}`}
                key={index}
                style={{ "--pile-stack-height": `${CARD_HEIGHT + Math.max(0, pile.length - 1) * stackOffset}px` } as CSSProperties}
                data-pile-index={index}
                data-drop-target={`pile:${index}`}
                aria-label={`${index + 1}번 파일, ${pile.length}장`}
                onClick={() => {
                  if (game.pendingResearchDraw === "astronomy") onDrawAstronomyResearchCard(index);
                  else if (game.pendingSweep) onTakeSelectedPile(index);
                  else if (game.pendingDraws > 0 || game.pendingPileDrawCount > 0) onDrawSelectedPile(index);
                  else onMoveSelectedHandCardToPile(index);
                }}
              >
                {pile.length === 0 && <div className={`empty-slot ${isValidSolitaireDrop ? isForgeDrop ? "is-forge-drop-target" : "is-solitaire-drop-target" : ""} ${isHoveredSolitaireDrop ? "is-hovered-solitaire-drop-target" : ""}`} aria-hidden="true" />}
                {discardCount > 0 && <span className="discard-target-label">버리기 {discardCount}</span>}
                {pile.map((card, cardIndex) => {
                  const isTop = cardIndex === pile.length - 1;
                  const faceUp = card.revealed;
                  const isMoving = dragging?.source.type === "pile"
                    && dragging.source.pileIndex === index
                    && cardIndex >= dragging.source.cardIndex;
                  return (
                    <div
                      className={`stacked-card ${faceUp ? `card-face face-up pile-draggable-card ${card.kind} ${card.damageType}` : "face-down"} ${isMoving ? "is-dragging" : ""} ${isTop && isValidSolitaireDrop ? isForgeDrop ? "is-forge-drop-target" : "is-solitaire-drop-target" : ""} ${isHoveredSolitaireDrop && isTop ? "is-hovered-solitaire-drop-target" : ""}`}
                      style={{
                        top: `${cardIndex * stackOffset}px`,
                        "--stack-index": cardIndex,
                        "--stack-exposure": `${stackOffset}px`,
                      } as CSSProperties}
                      key={card.id}
                      data-card-id={card.id}
                      data-top-card-id={isTop ? card.id : undefined}
                      aria-hidden={!faceUp}
                      role={faceUp ? "button" : undefined}
                      tabIndex={faceUp ? 0 : undefined}
                      onPointerDown={faceUp ? (event) => dragHandlers.beginDrag(
                        event,
                        card,
                        { type: "pile", pileIndex: index, cardIndex },
                        pile.slice(cardIndex),
                      ) : undefined}
                      onPointerMove={faceUp ? dragHandlers.moveDrag : undefined}
                      onPointerUp={faceUp ? dragHandlers.finishDrag : undefined}
                      onPointerCancel={faceUp ? dragHandlers.cancelDrag : undefined}
                      onMouseEnter={faceUp ? (event) => {
                        const bounds = event.currentTarget.getBoundingClientRect();
                        onShowCardKeywordOnly(card, bounds.right, bounds.top);
                      } : undefined}
                      onMouseMove={faceUp ? (event) => {
                        const bounds = event.currentTarget.getBoundingClientRect();
                        onShowCardKeywordOnly(card, bounds.right, bounds.top);
                      } : undefined}
                      onMouseLeave={faceUp ? onClearCardHover : undefined}
                      onBlur={faceUp ? onClearCardHover : undefined}
                    >
                      {faceUp
                        ? <CardFace card={card} strength={game.strength + combatManualBonus + backToBasicsBonus(card)} agility={game.agility + combatManualBonus + backToBasicsBonus(card)} defenseMultiplier={game.defenseMultiplier} ruleCostReduction={lawResearchCount} forgeCount={game.forgeCount} radiancePlayedThisTurn={game.radiancePlayedThisTurn} />
                        : <span className={`card-back-pattern ${card.colored ? "is-painted" : ""}`} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
