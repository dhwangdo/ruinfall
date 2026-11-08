import type { GameState } from "./battleState";
import { drawRandomFromPiles } from "./battleState.ts";
import { blockedPileIndexes } from "./enemyPassives.ts";
import { parachuteDiscards } from "./stickers.ts";

/** Only explicit player discards call this; playing cards and end-turn cleanup do not. */
export function recyclingStars(game: Pick<GameState, "activeRuleCards">, count = 1) {
  return count * game.activeRuleCards.filter(card => card.effect === "recycling").length;
}

export function discardHandCard(current: GameState, cardId: number): GameState {
  if (current.status !== "playing" || current.pendingDiscards < 1 || current.pendingResearchDraw !== null) return current;
  const card = current.hand.find(item => item.id === cardId);
  if (!card) return current;
  const remaining = current.pendingDiscards - 1;
  const replacement = parachuteDiscards([card], current.piles);
  const wasDiscarded = replacement.discarded.length > 0;
  const saengongjimaTriggers = current.pendingSaeongjimaTriggers
    + (wasDiscarded && current.pendingDiscardIsDiscardX && card.effect === "saeongjima" ? 1 : 0);
  const drawCount = remaining === 0 ? saengongjimaTriggers * 2 : 0;
  const draw = drawCount > 0
    ? drawRandomFromPiles(replacement.piles, drawCount, Math.random, blockedPileIndexes(current.enemies))
    : { piles: replacement.piles, hand: [] as typeof current.hand };
  return { ...current,
    hand: [...current.hand.filter(item => item.id !== cardId), ...draw.hand],
    discard: [...current.discard, ...replacement.discarded],
    piles: draw.piles,
    stars: current.stars + recyclingStars(current, replacement.discarded.length),
    pendingDiscards: remaining,
    pendingDiscardIsDiscardX: remaining > 0 && current.pendingDiscardIsDiscardX,
    pendingSaeongjimaTriggers: remaining > 0 ? saengongjimaTriggers : 0,
    message: `${card.name}${wasDiscarded ? " 버림" : " · 낙하산: 빈 파일로 이동"}${remaining > 0 ? ` · ${remaining}장 더 선택하세요.` : drawCount > 0 ? ` · 새옹지마: 카드를 무작위로 ${draw.hand.length}장 뽑음` : ""}`,
  };
}
