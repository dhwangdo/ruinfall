export type ReshuffleCard = {
  id: number;
  token?: boolean;
};

export function cardsForNextShuffle<T extends ReshuffleCard>(
  cards: T[],
  removedCardIds: ReadonlySet<number>,
  cardsStillInPlayIds: ReadonlySet<number>,
) {
  return cards.filter((card) =>
    !card.token
    && !removedCardIds.has(card.id)
    && !cardsStillInPlayIds.has(card.id));
}
