import type { Card } from "../game/cards";
import type { DeckEdition } from "../game/rewards";

export type CardKeywordPopoverState = {
  card: Card;
  x: number;
  y: number;
  anchorTop: number;
};

export type DeckEditionTooltipState = {
  edition: DeckEdition;
  x: number;
  y: number;
  width: number;
};

export type BlessingTooltipState = {
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
};
