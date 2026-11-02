import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  memo,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  cardEnergyCost,
  cardForgeCount,
  forgeConditionText,
} from "../game/cardEffects";
import { calculateDefenseGain, getDefenseBaseValue } from "../game/defenseRules";
import { calculateCardDamage } from "../game/combatEconomy";
import { calculateAttackDamage, type AttackModifiers } from "../game/statuses";
import { obsidianDaggerForgesRemaining } from "../game/forgeRules";
import {
  UNPLAYABLE_CARD_EFFECTS,
  isAttackCard,
  type Card,
  type CardEffect,
} from "../game/cards";
import { splitEffectSentences } from "../cardTextLayout";
import { useCardEffectLayout } from "../hooks/useCardEffectLayout";
import { cardEffectDescription } from "./cardEffectDescription";
import { emphasizeRarityText } from "./RarityText";
import { cardNameConstellationImage } from "../cardConstellations";

export { DEFENSE_LABEL } from "../game/defenseRules";

function emphasizeEffectNumbers(node: ReactNode): ReactNode {
  if (typeof node === "number") return <span className="effect-number">{node}</span>;
  if (typeof node === "string") {
    return node.split(/(\d+(?:\.\d+)?)/g).map((part, index) =>
      /^\d/.test(part) ? <span className="effect-number" key={`${part}-${index}`}>{part}</span> : part);
  }
  if (Array.isArray(node)) return Children.map(node, emphasizeEffectNumbers);
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    return cloneElement(node, undefined, emphasizeEffectNumbers(node.props.children));
  }
  return node;
}

function changedNumber(value: number, baseValue: number) {
  const change = value - baseValue;
  const direction = change === 0 ? "" : change > 0 ? "is-positive" : "is-negative";
  return <span className={`number-delta ${direction}`}>{value}</span>;
}

const DEFENSE_WATERMARK_EFFECTS = new Set<CardEffect>([
  "defend",
  "deflect",
  "iceShield",
  "waterWave",
  "plateArmorDefense",
  "starGuard",
  "starArk",
]);

function cardWatermarkCategory(card: Card) {
  if (isAttackCard(card)) return "attack";
  if (DEFENSE_WATERMARK_EFFECTS.has(card.effect)) return "defense";
  return "skill";
}

export type CardFaceProps = {
  card: Card;
  starsSpent?: number;
  strength?: number;
  agility?: number;
  defenseMultiplier?: number;
  ruleCostReduction?: number;
  forgeCount?: number;
  radiancePlayedThisTurn?: number;
  attackModifiers?: AttackModifiers;
};

export const CardFace = memo(function CardFace(props: CardFaceProps) {
  return (
    <CardFaceView
      {...props}
      cardNameWatermarkImage={cardNameConstellationImage(props.card.name)}
    />
  );
});

type CardFaceRendererProps = CardFaceProps & {
  cardNameWatermarkImage: string;
};

export const CardFaceView = memo(function CardFaceView({
  card,
  starsSpent = 0,
  strength = 0,
  agility = 0,
  defenseMultiplier = 1,
  ruleCostReduction = 0,
  forgeCount = 0,
  radiancePlayedThisTurn = 0,
  attackModifiers,
  cardNameWatermarkImage,
}: CardFaceRendererProps) {
  const displayedCost = UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    ? "-"
    : cardEnergyCost(card, ruleCostReduction, forgeCount);
  const damageValue = calculateAttackDamage(calculateCardDamage(card, strength, 0, radiancePlayedThisTurn), attackModifiers);
  const cardEffectRef = useCardEffectLayout({ card, starsSpent, strength, agility, defenseMultiplier,
    ruleCostReduction, forgeCount, radiancePlayedThisTurn, damageValue });
  const defenseValue = calculateDefenseGain(card, { agility, defenseMultiplier });
  const defenseBaseValue = getDefenseBaseValue(card);
  const damageNumber = changedNumber(damageValue, card.value);
  const defenseNumber = changedNumber(defenseValue, defenseBaseValue);
  const costChangeClass = displayedCost !== "-" && typeof displayedCost === "number"
    && card.cost !== undefined && displayedCost < card.cost ? "is-positive" : card.baseCost === undefined
      ? ""
      : card.cost === undefined
        ? ""
        : card.cost < card.baseCost ? "is-positive" : card.cost > card.baseCost ? "is-negative" : "";
  const effectText = emphasizeRarityText(cardEffectDescription(card, damageNumber, defenseNumber));
  const effectSentences = splitEffectSentences(effectText);
  const unplayableLabel = ["slime", "soil", "rock", "combatManual", "grimoire"].includes(card.effect)
    ? <span className="effect-keyword-unit"><strong className="effect-keyword">사용 불가</strong>.</span>
      : ["wolfTalisman", "turtleTalisman"].includes(card.effect)
        ? <span className="effect-keyword-unit"><strong className="effect-keyword">사용 불가.</strong></span>
        : null;
  const effectPrefix = <>
    {card.rule && card.effect !== "massDeal" && <><span className="effect-keyword-unit"><strong className="solitaire-rule effect-prefix effect-keyword rule-keyword">룰.</strong></span>{" "}</>}
    {card.solitaireRule && <><span className="effect-keyword-unit"><strong className="solitaire-rule effect-prefix solitaire-keyword">{card.solitaireRule === "top" ? "윗패" : card.solitaireRule === "bottom" ? "밑패" : "주문"}</strong></span>{" "}</>}
    {unplayableLabel}
    {unplayableLabel && effectSentences.length > 0 ? " " : null}
  </>;
  const effectSuffix = <>
    {card.token && <span className="effect-keyword-unit"><strong className="solitaire-rule token-rule effect-keyword">토큰.</strong></span>}
    {card.retain && <span className="effect-keyword-unit"><strong className="solitaire-rule effect-keyword">보존.</strong></span>}
    {card.exhaust && !card.rule && <span className="effect-keyword-unit"><strong className="solitaire-rule effect-keyword">소멸.</strong></span>}
  </>;
  return (
    <>
      {!card.enemyToken && (
        <span
          className="card-watermark"
          aria-hidden="true"
          style={{ "--card-name-watermark-image": cardNameWatermarkImage } as CSSProperties}
        />
      )}
      {!UNPLAYABLE_CARD_EFFECTS.has(card.effect) && <span className={`card-cost ${costChangeClass}`}>{displayedCost}</span>}
      <strong className={`card-name rarity-${card.rarity} watermark-category-${cardWatermarkCategory(card)} ${UNPLAYABLE_CARD_EFFECTS.has(card.effect) ? "is-unplayable" : ""} ${card.rarity === "legendary" ? "is-painted is-legendary" : ""}`}>
        {card.name}{card.effect === "obsidianDagger" && cardForgeCount(card) > 0 ? ` +${cardForgeCount(card)}` : card.forged && !["astronomyResearch", "necromancyResearch", "massDeal"].includes(card.effect) ? "+" : ""}
      </strong>
      <span ref={cardEffectRef} className="card-effect">{emphasizeEffectNumbers(<>
        <span className="card-effect-copy">
          {effectSentences.length === 0 && <span className="effect-sentence">{effectPrefix}{effectSuffix}</span>}
          {effectSentences.map((sentence, index) => <Fragment key={index}>
            <span className="effect-sentence">
              {index === 0 && effectPrefix}
              {index === 1 && card.effect === "massDeal" && card.rule && <span className="effect-keyword-unit"><strong className="solitaire-rule effect-keyword rule-keyword">룰.</strong></span>}
              <span className="effect-sentence-body">{sentence}</span>
              {index === effectSentences.length - 1 && effectSuffix}
            </span>
            {index < effectSentences.length - 1 ? " " : null}
          </Fragment>)}
        </span>
        {card.effect === "obsidianDagger"
          ? <>
            {cardForgeCount(card) > 0 && <strong className="solitaire-rule forge-rule effect-keyword">재련됨.</strong>}
            <strong className="solitaire-rule forge-rule"><span className="effect-keyword">재련</span> x{obsidianDaggerForgesRemaining(cardForgeCount(card))}: [공격]</strong>
          </>
          : card.forged && !["astronomyResearch", "necromancyResearch", "massDeal"].includes(card.effect)
            ? <strong className="solitaire-rule forge-rule effect-keyword">재련됨.</strong>
            : card.effect !== "massDeal" && !["astronomyResearch", "necromancyResearch"].includes(card.effect)
              && (card.forgeCost !== undefined || card.forgeCosts || card.forgeTargetName || card.forgeAny)
              && <strong className="solitaire-rule forge-rule"><span className="effect-keyword">재련</span>: {forgeConditionText(card)}</strong>}
      </>)}</span>
    </>
  );
});
