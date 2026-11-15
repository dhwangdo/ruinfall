import { ALL_CARD_BLUEPRINTS, type Card, type CardBlueprint } from "../game/cards.ts";
import { canForgeCardOnto, canPlaceBySolitaireRule, cardEnergyCost, getCardKeywordInfos } from "../game/cardEffects.ts";
import { cardCostAfterForgePlacement } from "../game/forgeRules.ts";

/** Real cards and legal placements, used only by the isolated animation board. */
export type CardMechanicExample = {
  id: "forge" | "forge-discount" | "solitaire";
  kind: "forge" | "star";
  moving: Card;
  left: Card;
  middle: Card;
  right: Card;
  result?: Card;
  targetResult?: Card;
  observer?: Card;
  consumesTarget?: boolean;
};

const demoCard = (card: CardBlueprint | Card, id: number): Card => ({
  ...card, id, forged: false, forgeCostsCompleted: undefined, revealed: true,
});
const candidates = () => ALL_CARD_BLUEPRINTS.map((card, index) => demoCard(card, -1000 - index));

function forgeExample(card: Card): CardMechanicExample | undefined {
  const observer = card.effect === "odinSpear" ? card : undefined;
  const blueprint = observer
    ? ALL_CARD_BLUEPRINTS.find(item => item.name === "낡은 노심")
      ?? ALL_CARD_BLUEPRINTS.find(item => item.forgeCost !== undefined)
    : ALL_CARD_BLUEPRINTS.find(item => item.effect === card.effect && item.name === card.name) ?? card;
  if (!blueprint) return;
  const moving = demoCard(blueprint, -10);
  const available = candidates();
  const right = available.find(target => canPlaceBySolitaireRule(moving, target) && canForgeCardOnto(moving, target)
    && (moving.effect !== "exchange" || (target.cost !== undefined && target.cost !== moving.cost)));
  if (!right) return;
  const dagger = moving.effect === "obsidianDagger";
  const exchange = moving.effect === "exchange";
  return {
    id: observer ? "forge-discount" : "forge", kind: "forge", moving,
    left: available.find(target => target.effect === "defend") ?? available[0],
    middle: observer ? demoCard(observer, -11) : available.find(target => target.effect === "strike") ?? available[0],
    right,
    result: {
      ...moving, forged: true,
      baseCost: exchange ? moving.cost : moving.baseCost,
      cost: cardCostAfterForgePlacement(moving, exchange ? cardEnergyCost(right) : undefined),
      value: dagger ? moving.value + right.value : moving.value,
      forgeCostsCompleted: dagger ? [1] : undefined,
    },
    observer: observer ? demoCard(observer, -11) : undefined,
    targetResult: exchange ? { ...right, baseCost: right.baseCost ?? right.cost, cost: cardEnergyCost(moving) } : undefined,
    consumesTarget: dagger,
  };
}

export function getCardMechanicExamples(card: Card): CardMechanicExample[] {
  // These cards refer to other cards being forged; their dedicated examples are pending.
  if (["metallurgyResearch", "odinSpear"].includes(card.effect)) return [];
  const keywords = new Set(getCardKeywordInfos(card).map(keyword => keyword.name));
  const examples: CardMechanicExample[] = [];
  if (keywords.has("재련")) {
    const example = forgeExample(card);
    if (example) examples.push(example);
  }
  if (keywords.has("★")) {
    const moving = demoCard(ALL_CARD_BLUEPRINTS.find(candidate => candidate.effect === "strike")!, -20);
    const targets = candidates().filter(target => canPlaceBySolitaireRule(moving, target) && !canForgeCardOnto(moving, target));
    if (targets.length) examples.push({
      id: "solitaire", kind: "star", moving,
      left: targets.find(target => target.effect === "defend") ?? targets[0],
      middle: targets.find(target => target.name === "잽") ?? targets[1] ?? targets[0],
      right: targets.find(target => target.name === "기회 포착") ?? targets[2] ?? targets[0],
    });
  }
  return examples;
}
