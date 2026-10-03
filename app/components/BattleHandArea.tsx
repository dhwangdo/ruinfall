"use client";

import type { CSSProperties, Dispatch, RefObject, SetStateAction } from "react";
import { CardFace } from "./CardFace";
import { HAND_PASSIVE_EFFECTS, UNPLAYABLE_CARD_EFFECTS, type Card } from "../game/cards";
import { cardEnergyCost } from "../game/cardEffects";
import type { GameState } from "../game/battleState";
import type { DragState, Phase } from "../game/battleUiTypes";
import type { useBattlePointerInput } from "../hooks/useBattlePointerInput";

type BattleDragHandlers = Pick<
  ReturnType<typeof useBattlePointerInput>,
  "beginDrag" | "moveDrag" | "finishDrag" | "cancelDrag"
>;

type BattleHandAreaProps = {
  game: GameState;
  phase: Phase;
  dragging: DragState | null;
  selectedHandCardId: number | null;
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
  onEndTurn: () => void;
  onShowCardKeywordOnly: (card: Card, right: number, top: number) => void;
  onClearCardHover: () => void;
};

export function BattleHandArea({
  game,
  phase,
  dragging,
  selectedHandCardId,
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
  onEndTurn,
  onShowCardKeywordOnly,
  onClearCardHover,
}: BattleHandAreaProps) {
  const displayedHand = useDisplayedHand(game, phase);
  const handCenterIndex = (displayedHand.length - 1) / 2;
  const handFanStyle = (index: number) => {
    const distanceFromCenter = index - handCenterIndex;
    return {
      "--hand-angle": `${distanceFromCenter * 3.5}deg`,
      "--hand-y": `${Math.min(28, Math.pow(Math.abs(distanceFromCenter), 1.55) * 5)}px`,
    } as CSSProperties;
  };

  return (
    <>
      <div
        className={`hand ${phase === "discarding" ? "is-discarding" : ""} ${game.pendingDiscards > 0 ? "is-discard-choice" : ""} ${displayedHand.length >= 5 ? "is-crowded" : ""}`}
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
        {displayedHand.map((card, index) => card ? (
          <button
            className={`game-card card-face ${card.kind} ${card.damageType} ${HAND_PASSIVE_EFFECTS.has(card.effect) ? "has-hand-aura" : card.effect === "slime" ? "has-danger-aura is-toxic-slime" : ""} ${dragging?.card.id === card.id ? "is-dragging" : ""} ${selectedHandCardId === card.id ? "is-keyboard-selected" : ""}`}
            key={card.id}
            ref={(element) => {
              if (element) handCardRefs.current.set(card.id, element);
              else handCardRefs.current.delete(card.id);
            }}
            style={{ "--card-index": index, ...handFanStyle(index) } as CSSProperties}
            onPointerDown={(event) => {
              setSelectedHandCardId(null);
              dragHandlers.beginDrag(event, card, { type: "hand" });
            }}
            onPointerMove={dragHandlers.moveDrag}
            onPointerUp={dragHandlers.finishDrag}
            onPointerCancel={dragHandlers.cancelDrag}
            onMouseEnter={(event) => {
              if (selectedHandCardId !== null && selectedHandCardId !== card.id) {
                setSelectedHandCardId(null);
              }
              const bounds = event.currentTarget.getBoundingClientRect();
              onShowCardKeywordOnly(card, bounds.right, bounds.top);
            }}
            onMouseMove={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect();
              onShowCardKeywordOnly(card, bounds.right, bounds.top);
            }}
            onMouseLeave={onClearCardHover}
            onBlur={onClearCardHover}
            onClick={() => game.pendingDiscards > 0 && onDiscardSelectedCard(card.id)}
            onDoubleClick={() => onPlayHandCardOnDoubleClick(card)}
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
        ) : <div className="hand-card-placeholder" aria-hidden="true" key={`clear-slot-${index}`} style={handFanStyle(index)} />)}
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
  const usesClearHandSlots = phase !== "playing" && hasClearHandSlots;
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
