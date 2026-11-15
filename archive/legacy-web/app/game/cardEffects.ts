import {
  CARD_POOL_ENERGY_EFFECTS,
  CARD_POOL_STAR_EFFECTS,
  UNPLAYABLE_CARD_EFFECTS,
  isAttackCard,
  type Card,
  type CardBlueprint,
} from "./cards.ts";
import { obsidianDaggerForgesRemaining } from "./forgeRules.ts";
import { STICKERS, cardStickerIds, retainsCard } from "./stickers.ts";


export type CardKeywordInfo = {
  name: string;
  description?: string;
  preview?: "radiance";
};

export function cardForgeCount(card: Pick<Card, "forged" | "forgeCostsCompleted">) {
  return card.forgeCostsCompleted?.length ?? (card.forged ? 1 : 0);
}

export function forgeConditionText(card: Pick<Card, "forgeCost" | "forgeCosts" | "forgeTargetName" | "forgeAny">) {
  if (card.forgeTargetName) return `[${card.forgeTargetName}]`;
  if (card.forgeAny) return "[아무거나]";
  const costs = card.forgeCosts ?? (card.forgeCost === undefined ? [] : [card.forgeCost]);
  if (costs.length <= 1) return `[${costs[0]}코스트]`;
  return `[${costs.slice(0, -1).join(", ")} 또는 ${costs[costs.length - 1]}코스트]`;
}

export function cardEnergyCost(
  card: Pick<Card, "effect" | "cost" | "rule" | "sticker" | "stickers" | "clockworkTriggered">,
  lawResearchCount = 0,
  forgeCount = 0,
): number | undefined {
  const baseCost = card.cost;
  if (baseCost === undefined) return undefined;
  const ruleReduction = card.rule ? lawResearchCount : 0;
  const forgeReduction = card.effect === "odinSpear" ? forgeCount : 0;
  const stickers = cardStickerIds(card);
  const stickerReduction = Number(stickers.includes("moonstone"))
    + Number(stickers.includes("clockwork") && card.clockworkTriggered === true);
  const adjustedCost = baseCost - ruleReduction - forgeReduction - stickerReduction;
  // 룰 연구·재련·월석 할인은 비용 0 아래까지 적용하며, 음수 비용은 사용 시 에너지를 돌려준다.
  return adjustedCost;
}

export function cardPoolCost(card: CardBlueprint) {
  return UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    ? -1
    : cardEnergyCost(card) ?? -1;
}

export function cardPoolShare(count: number, total: number) {
  return total === 0 ? "0.0%" : `${(count / total * 100).toFixed(1)}%`;
}

const CARD_KEYWORD_DESCRIPTIONS: Record<string, string> = {
  "룰": "사용하면 카드가 소멸하고, 그 효과는 이번 전투 동안 지속됩니다.",
  "소멸": "사용 시 이번 전투 동안 사라집니다.",
  "보존": "턴이 끝나도 손패에서 버려지지 않습니다.",
  "토큰": "전투 중 생성되는 임시 카드입니다. 사용하거나 버리면 사라집니다.",
  "재련": "이 카드를 조건에 맞는 카드 위에 놓으면 이 카드가 강화됩니다. 재련: [조건]은 아래 카드가 만족해야 하는 조건을 나타냅니다. 효과 설명 속 [ ]는 재련 후 적용되는 수치나 효과를 나타냅니다.",
  "사용 불가": "손패에서 사용할 수 없습니다. 옮길 수는 있습니다.",
  "★": "솔리테어 행동 자원입니다. 사용하여 손패에서 파일로, 혹은 파일에서 다른 파일로 카드를 옮길 수 있습니다. 턴이 끝나도 사라지지 않습니다.",
  "에너지": "카드를 사용할 때 소모하는 자원입니다. 턴 시작 시 기본적으로 최대 에너지만큼 회복합니다. 이 회복으로는 최대 에너지를 넘지 않습니다.",
  "버리기 X": "사용 시 손패의 다른 카드 X장을 버립니다. 버릴 카드가 X장보다 적으면 사용할 수 없습니다.",
  "힘 X": "공격의 각 타격에 피해를 X만큼 추가합니다. 직접 카드를 낼 때만 적용됩니다.",
  "강인함 X": "방어 또는 마법 방어를 얻을 때 X만큼 추가로 얻습니다. 직접 카드를 낼 때만 적용됩니다.",
  "저항 X": "적에게 받는 공격 피해가 30% 감소합니다. 취약과 서로 상쇄됩니다.",
  "취약 X": "적에게 받는 공격 피해가 30% 증가합니다. 저항과 서로 상쇄됩니다.",
  "증폭 X": "내 공격 피해가 30% 증가합니다. 약화와 서로 상쇄됩니다.",
  "약화 X": "내 공격 피해가 30% 감소합니다. 증폭과 서로 상쇄됩니다.",
  "무적": "피해를 받지 않습니다.",
};

const CARD_KEYWORD_PREVIEWS: Record<string, CardKeywordInfo["preview"]> = {
  "광채": "radiance",
};

export function getCardKeywordInfos(card: Card): CardKeywordInfo[] {
  const keywords: string[] = [];
  const add = (keyword: string) => {
    if (!keywords.includes(keyword)) keywords.push(keyword);
  };
  if (card.rule) add("룰");
  if (card.exhaust && !card.rule) add("소멸");
  if (card.token) add("토큰");
  if (retainsCard(card)) add("보존");
  if (card.effect === "fermentedSlime") add("에너지");
  if (card.effect === "wish") add("토큰");
  if (["obsidianDagger", "odinSpear", "metallurgyResearch"].includes(card.effect) || (
    !["astronomyResearch", "necromancyResearch", "massDeal"].includes(card.effect)
    && (card.forgeCost !== undefined || card.forgeCosts?.length || card.forgeTargetName || card.forgeAny)
  )) add("재련");
  if (UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    || (!card.forged && card.forgeTargetName === "사용 불가 카드")) add("사용 불가");
  // 흙은 생성 경로와 무관하게 두 키워드를 항상 노출한다.
  if (card.effect === "soil") {
    add("사용 불가");
    add("토큰");
  }
  if (CARD_POOL_ENERGY_EFFECTS.has(card.effect)) add("에너지");
  if (card.discardCost !== undefined || card.effect === "saeongjima") add("버리기 X");
  if (card.effect === "obsidianDagger") add("소멸");
  if (card.effect === "plateArmorDefense") add("저항 X");
  if (["resistanceWard", "fourSeasons", "unyielding"].includes(card.effect)) add("저항 X");
  if (["battleCry", "battlePreparation", "fourSeasons", "atField", "photonCannon", "overcharge", "criticalReaction"].includes(card.effect)) add("증폭 X");
  if (["shatter", "fourSeasons", "demolish"].includes(card.effect)) add("취약 X");
  if (["kneeStrike", "scaleArmor", "fourSeasons", "demolish"].includes(card.effect)) add("약화 X");
  if (card.effect === "transcend") add("무적");
  if (CARD_POOL_STAR_EFFECTS.has(card.effect) || ["grimoire", "meteor", "supernova", "osirisSun"].includes(card.effect)) add("★");
  if (["warmUp", "weaponSharpen", "augment", "orion", "combatManual", "relic", "evolutionTheory", "strategyBook", "beastification", "wolfTalisman"].includes(card.effect)) add("힘 X");
  if (["augment", "armorSharpen", "combatManual", "evolutionTheory", "strategyBook", "metalization", "turtleTalisman"].includes(card.effect)) add("강인함 X");
  if (card.effect === "sandToss") add("약화 X");
  if (["radiance", "lightCluster", "largePrism", "opticsResearch", "nebula", "lightTravelTime", "parallelMirror"].includes(card.effect)) add("광채");
  return keywords
    .map((name) => ({
      name,
      description: CARD_KEYWORD_DESCRIPTIONS[name],
      preview: CARD_KEYWORD_PREVIEWS[name],
    }))
    .filter((keyword) => Boolean(keyword.description || keyword.preview))
    .concat(cardStickerIds(card).map(sticker => ({
      name: STICKERS[sticker].name, description: STICKERS[sticker].description, preview: undefined,
    })));
}

export function isRuleMatchedPlacement(movingCard: Card, targetCard?: Card) {
  if (movingCard.solitaireRule === "top") return targetCard?.solitaireRule === "bottom";
  if (movingCard.solitaireRule === "spell") {
    return movingCard.cost !== undefined
      && targetCard?.solitaireRule === "spell"
      && targetCard.cost === movingCard.cost + 1;
  }
  return false;
}

export function canPlaceBySolitaireRule(movingCard: Card, targetCard?: Card) {
  if (movingCard.solitaireRule === "top" || movingCard.solitaireRule === "spell") {
    return isRuleMatchedPlacement(movingCard, targetCard);
  }
  return true;
}

export function canForgeCardOnto(movingCard: Card, targetCard?: Card, lawResearchCount = 0, forgeCount = 0) {
  if (["astronomyResearch", "necromancyResearch", "massDeal"].includes(movingCard.effect)) return false;
  if (!targetCard) return false;
  if (movingCard.effect === "obsidianDagger") {
    return obsidianDaggerForgesRemaining(cardForgeCount(movingCard)) > 0 && isAttackCard(targetCard);
  }
  const targetCost = cardEnergyCost(targetCard, lawResearchCount, forgeCount);
  if (movingCard.forged) return false;
  const forgeTargetMatches = movingCard.forgeTargetName === "소멸 카드"
    ? targetCard.exhaust === true
    : movingCard.forgeTargetName === "사용 불가 카드"
      ? UNPLAYABLE_CARD_EFFECTS.has(targetCard.effect)
      : movingCard.forgeTargetName === targetCard.name;
  return (targetCost !== undefined && movingCard.forgeCost !== undefined && movingCard.forgeCost === targetCost)
    || (targetCost !== undefined && movingCard.forgeCosts?.includes(targetCost))
    || movingCard.forgeAny === true
    || forgeTargetMatches;
}

// A spell straight is read from the top of a pile: X, X+1, X+2.
// The array is returned in firing order (top card first).
export function getSpellStraight(pile: Card[]) {
  if (pile.length < 3) return null;
  const cards = pile.slice(-3).reverse();
  const [topCard, middleCard, bottomCard] = cards;
  if (!topCard || !middleCard || !bottomCard) return null;
  if (![topCard, middleCard, bottomCard].every((card) => card.solitaireRule === "spell")) return null;
  if (topCard.cost === undefined || middleCard.cost === undefined || bottomCard.cost === undefined) return null;
  if (middleCard.cost !== topCard.cost + 1) return null;
  if (bottomCard.cost !== middleCard.cost + 1) return null;
  return cards;
}

// 범람(4) 위에 3, 2, 1코스트가 차례로 쌓인 피라미드.
export function getFloodPyramid(pile: Card[]) {
  if (pile.length < 4) return null;
  const cards = pile.slice(-4);
  if (cards[0].effect !== "flood" || cards[0].cost !== 4) return null;
  return cards[1].cost === 3 && cards[2].cost === 2 && cards[3].cost === 1 ? cards : null;
}
