import type { Card } from "./cards";

export type Phase = "drawing" | "playing" | "discarding" | "enemy-turn" | "resolving";
export type DamagePopup = {
  key: string;
  text: string;
  kind?: "damage" | "buff" | "debuff";
};

export type DragState = {
  card: Card;
  cards: Card[];
  source: { type: "hand" } | { type: "pile"; pileIndex: number; cardIndex: number };
  x: number;
  y: number;
  moved: boolean;
};
