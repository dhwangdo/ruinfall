import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import type { CardRarity } from "../game/cards";

const RARITY_LABELS: Record<string, CardRarity> = {
  상태: "status", 시작: "starter", 일반: "basic", 특별: "special", 희귀: "rare", 전설: "legendary",
};
// Match actual grade references, not generic 희귀도 or phrases such as 턴 시작 시.
const RARITY_WORD = /(?<![가-힣])(상태|시작|일반|특별|희귀|전설)(?=\s*(?:카드|슬롯|등급|이하|이상|[·ㆍ/]))/g;

export function emphasizeRarityText(node: ReactNode): ReactNode {
  if (typeof node === "string") {
    return node.split(RARITY_WORD).map((part, index) => index % 2
      ? <b key={index} className={`rarity-word rarity-${RARITY_LABELS[part]}`}>{part}</b>
      : part);
  }
  if (Array.isArray(node)) return Children.map(node, emphasizeRarityText);
  if (isValidElement<{ children?: ReactNode; className?: string }>(node)
    && node.props.children !== undefined && !node.props.className?.split(" ").includes("rarity-word")) {
    return cloneElement(node, undefined, emphasizeRarityText(node.props.children));
  }
  return node;
}

export function RarityText({ children }: { children: ReactNode }) {
  return emphasizeRarityText(children);
}
