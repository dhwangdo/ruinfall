import { isValidElement, type ReactNode } from "react";
import type { Card } from "../game/cards";
import { getCardKeywordInfos } from "../game/cardEffects";
import { cardEffectDescription } from "./cardEffectDescription";

function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join(" ");
  return isValidElement<{ children?: ReactNode }>(node) ? text(node.props.children) : "";
}
export function cardSearchText(card: Card) {
  return [card.name, text(cardEffectDescription(card, card.value, card.value)),
    ...getCardKeywordInfos(card).map(info => info.name)].join(" ");
}
