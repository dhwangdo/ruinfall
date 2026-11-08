import { STARTER_CARD_POOL, BASIC_CARD_POOL, SPECIAL_CARD_POOL, RARE_CARD_POOL, LEGENDARY_CARD_POOL, type Card } from "./cards.ts";
import { STICKERS, STICKER_IDS, cardStickerIds, compatibleStickers, maxCardStickerCount, withCardStickers, type StickerId } from "./stickers.ts";
import { seededRoll, type MapPosition, type RoomType } from "./mapRules.ts";

export const STICKER_PRICES: Record<StickerId, number> = {
  moonstone: 200, comet: 200,
  clockwork: 100, bookmark: 100, kite: 100, bluebird: 100, hook: 100,
  parachute: 50, anchor: 50, glowDinosaur: 50,
};
export const STICKER_SERVICE_NAMES = {
  stickerAltar: "제단", tinkerer: "땜장이", cardTransmuter: "변환기",
} as const;
export type StickerServiceKind = keyof typeof STICKER_SERVICE_NAMES;
export type StickerServiceSite = {
  kind: StickerServiceKind; roomKey: string; uses: number;
  fixedSticker: StickerId | null; price: number;
};

export function isStickerServiceKind(type: RoomType): type is StickerServiceKind {
  return Object.hasOwn(STICKER_SERVICE_NAMES, type);
}

/** Site identity is derived from the map seed, so revisiting or reloading cannot reroll it. */
export function tinkererStickerAt(position: MapPosition, seed: number): StickerId {
  return STICKER_IDS[Math.min(STICKER_IDS.length - 1, Math.floor(seededRoll(position, seed, 81402) * STICKER_IDS.length))];
}

export function stickerServicePrice(kind: StickerServiceKind, uses: number, fixedSticker: StickerId | null = null) {
  const base = kind === "tinkerer" && fixedSticker ? STICKER_PRICES[fixedSticker] : 40;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(base * 1.5 ** Math.max(0, Math.floor(uses))));
}

export function normalizeRoomServiceUses(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, uses]) =>
    typeof uses === "number" && Number.isFinite(uses) && uses >= 0 ? [[key, Math.floor(uses)]] : []));
}

/** A chosen operation has a stable preview and produces the same result when confirmed. */
export function stickerServiceRandom(roomKey: string, uses: number, cardId: number): () => number {
  let seed = 2166136261;
  for (const character of `${roomKey}:${uses}:${cardId}`) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

const TRANSFORM_POOL = [...STARTER_CARD_POOL, ...BASIC_CARD_POOL, ...SPECIAL_CARD_POOL, ...RARE_CARD_POOL, ...LEGENDARY_CARD_POOL];
export function serviceTransformCandidates(card: Card) {
  return TRANSFORM_POOL.filter(candidate => candidate.rarity === card.rarity && candidate.name !== card.name);
}

export function serviceCardProblem(kind: StickerServiceKind, card: Card, fixedSticker: StickerId | null): string | null {
  if (kind === "stickerAltar") {
    const stickers = cardStickerIds(card);
    if (stickers.length > 1) return "스티커가 여러 개인 카드는 제물로 낼 수 없습니다.";
    return stickers.length ? null : "옮길 스티커가 없는 카드입니다.";
  }
  if (kind === "cardTransmuter") return serviceTransformCandidates(card).length ? null : "같은 희귀도의 다른 카드가 없습니다.";
  if (!fixedSticker) return "이 땜장이의 스티커가 정해지지 않았습니다.";
  const current = cardStickerIds(card);
  if (current.length >= maxCardStickerCount(card)) return "스티커를 더 붙일 수 없습니다.";
  if (current.includes(fixedSticker)) return "같은 스티커는 중복해서 붙일 수 없습니다.";
  return compatibleStickers(card).includes(fixedSticker) ? null : "이 카드에는 해당 스티커를 붙일 수 없습니다.";
}

export function transferStickerProblem(donor: Card | undefined, target: Card): string | null {
  if (!donor) return "먼저 파괴할 카드를 선택하세요.";
  const stickers = cardStickerIds(donor);
  if (!stickers.length) return "먼저 파괴할 카드를 선택하세요.";
  if (stickers.length > 1) return "스티커가 여러 개인 카드는 제물로 낼 수 없습니다.";
  if (donor.id === target.id) return "서로 다른 카드 두 장을 선택하세요.";
  if (cardStickerIds(target).includes(stickers[0])) return "같은 스티커는 중복해서 붙일 수 없습니다.";
  return compatibleStickers(target).includes(stickers[0]) ? null : "이 카드에는 해당 스티커를 붙일 수 없습니다.";
}

export type StickerServiceResult = {
  ok: true; price: number; before: Card; after: Card; destroyedCardId?: number; message: string;
} | { ok: false; message: string };

/** Validate the whole operation before returning any card or currency mutation. */
export function resolveStickerService({ kind, cards, primaryCardId, secondaryCardId, gold, uses, fixedSticker = null, random = Math.random }: {
  kind: StickerServiceKind; cards: readonly Card[]; primaryCardId: number; secondaryCardId?: number;
  gold: number; uses: number; fixedSticker?: StickerId | null; random?: () => number;
}): StickerServiceResult {
  const primary = cards.find(card => card.id === primaryCardId);
  if (!primary) return { ok: false, message: "카드를 다시 선택하세요." };
  const problem = serviceCardProblem(kind, primary, fixedSticker);
  if (problem) return { ok: false, message: problem };
  const price = stickerServicePrice(kind, uses, fixedSticker);
  if (gold < price) return { ok: false, message: `$${price - gold}가 부족합니다.` };
  const pick = <T,>(items: readonly T[]) => items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  let before = primary, after: Card, destroyedCardId: number | undefined, attachedSticker: StickerId | undefined;
  if (kind === "stickerAltar") {
    const target = cards.find(card => card.id === secondaryCardId);
    if (!target) return { ok: false, message: "스티커를 받을 카드를 선택하세요." };
    const targetProblem = transferStickerProblem(primary, target);
    if (targetProblem) return { ok: false, message: targetProblem };
    before = target;
    attachedSticker = cardStickerIds(primary)[0];
    after = withCardStickers(target, [...cardStickerIds(target), attachedSticker]);
    destroyedCardId = primary.id;
  } else if (kind === "tinkerer") {
    attachedSticker = fixedSticker!;
    after = withCardStickers(primary, [...cardStickerIds(primary), attachedSticker]);
  } else {
    after = { ...pick(serviceTransformCandidates(primary)), id: primary.id, revealed: primary.revealed };
    const existingStickers = cardStickerIds(primary);
    if (existingStickers.length) {
      const stickerToTransform = existingStickers.at(-1)!;
      const choices = compatibleStickers(after).filter(sticker => sticker !== stickerToTransform);
      if (!choices.length) return { ok: false, message: "변환할 수 있는 다른 스티커가 없습니다." };
      attachedSticker = pick(choices);
      after = withCardStickers(after, [attachedSticker]);
    }
  }
  delete after.clockworkTriggered;
  delete after.bluebirdUsedTurn;
  const message = kind === "cardTransmuter" ? `${before.name} → ${after.name} 변환 완료.`
    : `${after.name}에 ${STICKERS[attachedSticker!].name}를 붙였습니다.${destroyedCardId === undefined ? "" : ` ${primary.name} 카드는 파괴되었습니다.`}`;
  return { ok: true, price, before, after, destroyedCardId, message };
}

export function applyStickerServiceCards(cards: readonly Card[], result: Extract<StickerServiceResult, { ok: true }>): Card[] {
  return cards.filter(card => card.id !== result.destroyedCardId).map(card => card.id === result.after.id ? result.after : card);
}
