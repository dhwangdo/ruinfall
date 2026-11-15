import type { CardKeywordInfo } from "../game/cardEffects";

// A 136 × 191 card, with 10px padding and a 2px border on each side.
export const CARD_PREVIEW_FRAME_WIDTH = 160;
export const CARD_PREVIEW_FRAME_HEIGHT = 215;
export const CONSUMABLE_PREVIEW_FRAME_WIDTH = CARD_PREVIEW_FRAME_WIDTH;
export const CONSUMABLE_PREVIEW_FRAME_HEIGHT = CARD_PREVIEW_FRAME_HEIGHT;
export const CARD_KEYWORD_TEXT_WIDTH = 310;
export const CARD_KEYWORD_HOVER_DELAY_MS = 245;
export const CARD_MECHANIC_HOVER_DELAY_MS = 3000;

export function cardKeywordPopoverWidth(keywords: readonly CardKeywordInfo[]) {
  return keywords.some((keyword) => !keyword.preview)
    ? CARD_KEYWORD_TEXT_WIDTH
    : CARD_PREVIEW_FRAME_WIDTH;
}
