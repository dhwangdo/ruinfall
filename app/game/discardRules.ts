import type { GameState } from "./battleState";

/** Only explicit player discards call this; playing cards and end-turn cleanup do not. */
export function recyclingStars(game: Pick<GameState, "activeRuleCards">, count = 1) {
  return count * game.activeRuleCards.filter(card => card.effect === "recycling").length;
}

export function discardHandCard(current: GameState, cardId: number): GameState {
  if (current.status !== "playing" || current.pendingDiscards < 1 || current.pendingResearchDraw !== null) return current;
  const card = current.hand.find(item => item.id === cardId);
  if (!card) return current;
  const remaining = current.pendingDiscards - 1;
  return { ...current,
    hand: current.hand.filter(item => item.id !== cardId),
    discard: [...current.discard, card],
    stars: current.stars + recyclingStars(current),
    pendingDiscards: remaining,
    message: `${card.name} 버림${remaining > 0 ? ` · ${remaining}장 더 선택하세요.` : ""}`,
  };
}
