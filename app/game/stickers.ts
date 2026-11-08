import { UNPLAYABLE_CARD_EFFECTS, type Card } from "./cards.ts";

export const STICKERS = {
  moonstone: { name: "월석 스티커", description: "이 카드의 비용이 1 감소합니다." },
  clockwork: { name: "태엽장치 스티커", description: "이 카드를 손패에서 파일로 옮기면 비용이 1 감소합니다. 전투마다 한 번만 발동합니다." },
  bookmark: { name: "책갈피 스티커", description: "이 카드가 보존을 얻습니다." },
  kite: { name: "연 스티커", description: "전투 시작 시 이 카드를 파일 맨 위에 놓습니다." },
  anchor: { name: "닻 스티커", description: "전투 시작 시 이 카드를 파일 맨 밑에 놓습니다." },
  glowDinosaur: { name: "야광공룡 스티커", description: "셔플할 때 이 카드를 항상 앞면으로 놓습니다." },
  bluebird: { name: "파랑새 스티커", description: "이 카드는 ★★를 소모하고 파일에서 손패로 옮길 수 있습니다." },
  hook: { name: "갈고리 스티커", description: "이 카드를 뽑을 때 같은 파일의 다음 카드도 1장 가져옵니다." },
  parachute: { name: "낙하산 스티커", description: "버려질 때 빈 파일이 있다면 그곳으로 대신 이동합니다." },
  comet: { name: "혜성 스티커", description: "전투 시작 시 이 카드를 손패로 가져옵니다." },
} as const;
export type StickerId = keyof typeof STICKERS;
export const STICKER_IDS = Object.keys(STICKERS) as StickerId[];
export const BLUEBIRD_RETRIEVAL_STAR_COST = 2;
export function isStickerId(value: unknown): value is StickerId {
  return typeof value === "string" && Object.hasOwn(STICKERS, value);
}

export function cardStickerIds(card: Pick<Card, "sticker" | "stickers">): StickerId[] {
  const saved = card.stickers?.length ? card.stickers : card.sticker ? [card.sticker] : [];
  return [...new Set(saved.filter(isStickerId))];
}

export function hasSticker(card: Pick<Card, "sticker" | "stickers">, sticker: StickerId) {
  return cardStickerIds(card).includes(sticker);
}

export function maxCardStickerCount(card: Pick<Card, "effect">) {
  return card.effect === "diy" ? 3 : 1;
}

export function withCardStickers<T extends Card>(card: T, stickers: readonly StickerId[]): T {
  const normalized = { ...card };
  delete normalized.sticker;
  const unique = [...new Set(stickers)];
  if (unique.length === 0) {
    delete normalized.stickers;
    return normalized as T;
  }
  return { ...normalized, stickers: unique } as T;
}

/** Filter only mechanically ineffective combinations, then choose uniformly. */
export function compatibleStickers(card: Card): StickerId[] {
  const existing = cardStickerIds(card);
  if (existing.length >= maxCardStickerCount(card)) return [];
  return STICKER_IDS.filter(sticker => {
    if (existing.includes(sticker)) return false;
    if (sticker === "moonstone" || sticker === "clockwork") return card.cost !== undefined && !UNPLAYABLE_CARD_EFFECTS.has(card.effect);
    if (sticker === "bookmark") return !card.retain;
    return true;
  });
}

export function withRandomSticker(card: Card, chance: number, random = Math.random): Card {
  if (cardStickerIds(card).length > 0 || random() >= chance) return card;
  const candidates = compatibleStickers(card);
  const sticker = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  return sticker ? withCardStickers(card, [sticker]) : card;
}

export function retainsCard(card: Pick<Card, "retain" | "sticker" | "stickers">) {
  return Boolean(card.retain || hasSticker(card, "bookmark"));
}
export function occupiedDeckSpace(cards: readonly unknown[]) {
  return cards.length;
}
/** Mutates only the caller's copied pile; each hook consumes a card, so chains terminate. */
export function takePileCards(pile: Card[], drawSlot?: number, drawSlotCount?: number): Card[] {
  const hand: Card[] = [];
  let next = true;
  while (next && pile.length > 0) {
    const card = pile.pop()!;
    hand.push({ ...card, revealed: true, ...(drawSlot === undefined ? {} : { drawSlot, drawSlotCount }) });
    next = hasSticker(card, "hook");
  }
  if (pile.length > 0) pile[pile.length - 1] = { ...pile[pile.length - 1], revealed: true };
  return hand;
}

/** Replacement for hand discards, never for card use or exhaust. */
export function parachuteDiscards(cards: readonly Card[], piles: Card[][], random = Math.random) {
  const nextPiles = piles.map(pile => [...pile]);
  const discarded: Card[] = [];
  for (const card of cards) {
    const empty = nextPiles.flatMap((pile, index) => pile.length === 0 ? [index] : []);
    if (hasSticker(card, "parachute") && empty.length > 0) {
      nextPiles[empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))]].push({ ...card, revealed: true });
    } else discarded.push(card);
  }
  return { piles: nextPiles, discarded };
}

export function placeStartingStickers(piles: Card[][], random = Math.random, randomFaceUpChance = 0) {
  const placement = new Map<number, StickerId>();
  for (const card of piles.flat()) {
    const sticker = cardStickerIds(card).reverse().find(item => item === "comet" || item === "kite" || item === "anchor");
    if (sticker) placement.set(card.id, sticker);
  }
  const startingHand = piles.flat().filter(card => placement.get(card.id) === "comet").map(card => ({ ...card, revealed: true }));
  const special = piles.flat().filter(card => placement.get(card.id) === "kite" || placement.get(card.id) === "anchor");
  const movedIds = new Set(placement.keys());
  const next = piles.map(pile => pile.filter(card => !movedIds.has(card.id)));
  for (const sticker of ["anchor", "kite"] as const) {
    let available: number[] = [];
    for (const card of special.filter(card => placement.get(card.id) === sticker)) {
      if (available.length === 0) available = next.map((_, index) => index);
      if (available.length === 0) { next.push([]); available = [0]; }
      const index = available.splice(Math.min(available.length - 1, Math.floor(random() * available.length)), 1)[0];
      if (sticker === "anchor") next[index].unshift({ ...card, revealed: card.revealed });
      else next[index].push({ ...card, revealed: true });
    }
  }
  for (const pile of next) {
    for (let index = 0; index < pile.length; index++) {
      pile[index] = { ...pile[index], revealed: hasSticker(pile[index], "glowDinosaur")
        || (randomFaceUpChance > 0 && random() < randomFaceUpChance) || index === pile.length - 1 };
    }
  }
  return { piles: next, hand: startingHand };
}
