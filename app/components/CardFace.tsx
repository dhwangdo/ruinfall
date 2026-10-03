import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  IRON_WALL_RESISTANCE,
  cardEnergyCost,
  cardForgeCount,
  forgeConditionText,
} from "../game/cardEffects";
import { calculateDefenseGain, getDefenseBaseValue } from "../game/defenseRules";
import { calculateCardDamage } from "../game/combatEconomy";
import { obsidianDaggerForgesRemaining } from "../game/forgeRules";
import {
  UNPLAYABLE_CARD_EFFECTS,
  isAttackCard,
  type Card,
  type CardEffect,
  type DamageType,
} from "../game/cards";
import { fittedEffectSentenceStyle, splitEffectSentences } from "../cardTextLayout";
import { cardNameConstellationImage } from "../cardConstellations";

export const DEFENSE_LABEL: Record<DamageType, string> = {
  physical: "방어",
  magic: "마법 방어",
};

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

function starIcons(amount: number) {
  return <span className="effect-star">{"★".repeat(Math.max(0, amount))}</span>;
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
};

export function CardFace(props: CardFaceProps) {
  return (
    <CardFaceView
      {...props}
      cardNameWatermarkImage={cardNameConstellationImage(props.card.name)}
    />
  );
}

type CardFaceRendererProps = CardFaceProps & {
  cardNameWatermarkImage: string;
};

export function CardFaceView({
  card,
  starsSpent = 0,
  strength = 0,
  agility = 0,
  defenseMultiplier = 1,
  ruleCostReduction = 0,
  forgeCount = 0,
  radiancePlayedThisTurn = 0,
  cardNameWatermarkImage,
}: CardFaceRendererProps) {
  const cardEffectRef = useRef<HTMLSpanElement | null>(null);
  const displayedCost = UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    ? "-"
    : cardEnergyCost(card, ruleCostReduction, forgeCount);
  const damageValue = calculateCardDamage(card, strength, 0, radiancePlayedThisTurn);
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
  useLayoutEffect(() => {
    const effect = cardEffectRef.current;
    const cardFace = effect?.parentElement;
    const copy = effect?.querySelector<HTMLElement>(".card-effect-copy");
    if (!effect || !cardFace || !copy) return;
    let active = true;
    const fitEffectText = () => {
      if (!active) return;
      const sentences = Array.from(copy.querySelectorAll<HTMLElement>(".effect-sentence"));
      sentences.forEach((sentence) => {
        sentence.style.removeProperty("--effect-sentence-scale");
        sentence.style.removeProperty("letter-spacing");
        sentence.classList.remove("is-wrapped");
      });
      const availableWidth = copy.getBoundingClientRect().width;
      if (availableWidth <= 0) return;
      const minimumScale = Number.parseFloat(getComputedStyle(copy).getPropertyValue("--card-effect-minimum-scale"));
      const segments = Array.from(effect.querySelectorAll<HTMLElement>(".forge-rule"));
      const getLineCount = (element: HTMLElement) => {
        const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
        return Number.isFinite(lineHeight) && lineHeight > 0
          ? Math.max(1, Math.round(element.getBoundingClientRect().height / lineHeight))
          : 0;
      };
      const hasCopyText = Boolean(copy.textContent?.trim());
      sentences.forEach((sentence) => {
        sentence.style.setProperty("display", "inline");
        sentence.style.setProperty("white-space", "normal");
      });
      const baseCopyLineCount = hasCopyText ? getLineCount(copy) : 0;
      const baseLineCount = baseCopyLineCount + segments.reduce((total, segment) => total + getLineCount(segment), 0);
      sentences.forEach((sentence) => {
        sentence.style.removeProperty("display");
        sentence.style.removeProperty("white-space");
        });
        const maxLetterSpacingReduction = baseLineCount >= 4 ? 0.12 : 0;
        const widths = sentences.map((sentence) => sentence.getBoundingClientRect().width);
        const fits = sentences.map((sentence, index) => fittedEffectSentenceStyle(widths[index], availableWidth, minimumScale, (scale, letterSpacing) => {
            sentence.style.setProperty("--effect-sentence-scale", String(scale));
            sentence.style.letterSpacing = `${letterSpacing}px`;
            return sentence.getBoundingClientRect().width;
          }, maxLetterSpacingReduction));
        const sharedScale = fits.length > 0 ? Math.min(...fits.map((fit) => fit.scale)) : 1;
        sentences.forEach((sentence, index) => {
          const fit = fits[index];
          const letterSpacing = fit.scale === sharedScale ? fit.letterSpacing : 0;
          sentence.style.setProperty("--effect-sentence-scale", String(sharedScale));
          if (letterSpacing === 0) sentence.style.removeProperty("letter-spacing");
          else sentence.style.letterSpacing = `${letterSpacing}px`;
          sentence.classList.toggle("is-wrapped", sentence.getBoundingClientRect().width > availableWidth);
        });
      const copyLineHeight = Number.parseFloat(getComputedStyle(copy).lineHeight);
      if (!Number.isFinite(copyLineHeight) || copyLineHeight <= 0) return;
      const lineCount = (copy.textContent?.trim() ? Math.max(1, Math.round(copy.getBoundingClientRect().height / copyLineHeight)) : 0)
        + segments.reduce((total, segment) => {
          const lineHeight = Number.parseFloat(getComputedStyle(segment).lineHeight);
          return total + Math.max(1, Math.round(segment.getBoundingClientRect().height / lineHeight));
        }, 0);
      const shift = Math.min(8, Math.max(0, lineCount - 1) * 1.2);
      effect.style.setProperty("--card-effect-shift", `${shift}px`);
    };
    fitEffectText();
    const observer = new ResizeObserver(fitEffectText);
    observer.observe(cardFace);
    document.fonts.ready.then(fitEffectText);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [card, starsSpent, strength, agility, defenseMultiplier, ruleCostReduction, forgeCount, radiancePlayedThisTurn]);
  const effectText = (() => {
    switch (card.effect) {
      case "strike":
        return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>{card.draw > 0 && <span>카드를 {card.draw}장 뽑습니다.</span>}</>;
      case "pommel":
        return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span>첫 번째 파일에서 카드를 1장 뽑습니다.</span></>;
      case "defend":
        return <span><span className={`effect-type ${card.damageType}`}>{DEFENSE_LABEL[card.damageType]}</span>를 {defenseNumber} 얻습니다.</span>;
      case "deflect":
        return <><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span>카드를 1장 뽑습니다.</span></>;
      case "steelHeart":
        return <span><strong className="effect-keyword">물리 저항</strong>과 <strong className="effect-keyword">마법 저항</strong>을 {card.value} 얻습니다.</span>;
      case "battlePlan":
        return <>{card.value > 0 && <span>{starIcons(card.value)}을 얻습니다.</span>}{card.draw > 0 && <span>카드를 {card.draw}장 뽑습니다.</span>}</>;
      case "prepare":
        return <span>카드를 1장 뽑고 1장 버립니다.</span>;
      case "focus":
        return <span><strong className="effect-keyword">에너지</strong>를 1 얻습니다. 카드를 1장 버립니다.</span>;
      case "pruning":
        return <span>카드를 2장 버립니다. <strong className="effect-keyword">에너지</strong>를 2 얻습니다.</span>;
      case "adrenaline":
        return <span><strong className="effect-keyword">체력</strong>을 2 잃습니다. <strong className="effect-keyword">에너지</strong>를 {card.value} 얻습니다. 카드를 {card.draw}장 뽑습니다.</span>;
      case "sweep":
        return <span>모든 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>;
      case "drawEachPile":
        return <span>모든 파일에서 카드를 1장씩 뽑습니다.</span>;
      case "dash":
        return <span>무작위 파일에서 카드를 1장씩 {card.forged ? 3 : "2[3]"}번 뽑습니다.</span>;
      case "quickStep":
        return <span>카드를 {card.draw}장 뽑습니다.</span>;
      case "rulerCompass":
        return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span><span className="effect-star">★</span>을 얻습니다.</span></>;
      case "suppression":
        return <><span><span className="effect-type damage">피해</span>를 13 줍니다.</span><span>막히지 않은 피해만큼 <span className="effect-type physical">방어</span>를 얻습니다.</span></>;
      case "berserk":
        return <span><strong className="effect-keyword">에너지</strong>를 2 얻습니다. <strong className="effect-keyword">물리 취약</strong>을 2 얻습니다.</span>;
      case "transcend":
        return <span>이번 턴 피해에 <strong className="effect-keyword">면역</strong>이 됩니다. <strong className="effect-keyword">힘</strong>을 5 얻습니다.</span>;
      case "rapidFire":
        return <span>다음에 사용하는 공격 카드가 2번 발동합니다.</span>;
      case "delay":
        return <span>이번 턴 종료 시 손패의 카드를 버리지 않습니다.</span>;
      case "boneArmor":
        return <span><strong className="effect-keyword">강인함</strong>을 5 얻습니다. <strong className="effect-keyword">물리 저항</strong>을 1 얻습니다.</span>;
      case "magicCrystal":
        return <span>[밑패와 합쳐 다음 단계의 마력 결정이 됩니다.]</span>;
      case "sacrifice":
        return null;
      case "iceShield":
        return <span><span className="effect-type magic">마법 방어</span>를 {defenseNumber} 얻습니다.</span>;
      case "magicStrike":
        return <span>체력이 가장 낮은 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>;
      case "shockwave":
        return <span>모든 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>;
      case "ventilate":
        return <><span><strong className="effect-keyword">에너지</strong>를 {card.value} 얻습니다.</span><span>카드를 {card.draw}장 뽑습니다.</span></>;
      case "plateArmor":
        return <span><strong className="effect-keyword">에너지</strong>를 {card.forged ? 3 : "1[3]"} 얻습니다.</span>;
      case "plateArmorDefense":
        return <><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span>{card.forged ? <span><strong className="effect-keyword">물리 저항</strong>을 1 얻습니다.</span> : <span>[<strong className="effect-keyword">물리 저항</strong>을 1 얻습니다.]</span>}</>;
      case "warmUp":
        return <span><strong className="effect-keyword">힘</strong>을 1 얻습니다. 이번 턴 <strong className="effect-keyword">힘</strong>을 {card.value} 추가로 얻습니다.</span>;
      case "ironWall":
        return <span><strong className="effect-keyword">물리 저항</strong>을 {IRON_WALL_RESISTANCE} 얻습니다.</span>;
      case "fourHit":
        return <span><span className="effect-type damage">피해</span>를 {damageNumber}씩 4번 줍니다.</span>;
      case "doubleHit":
        return <span><span className="effect-type damage">피해</span>를 {damageNumber}씩 {card.forged ? 2 : "1[2]"}번 줍니다.</span>;
      case "starlight":
        return <span>{starIcons(card.value)}을 얻습니다.</span>;
      case "augment":
        return <span><strong className="effect-keyword">힘</strong>과 <strong className="effect-keyword">강인함</strong>을 {card.value} 얻습니다.</span>;
      case "fileDraw":
        return <span>{card.forged ? "모든 파일에서 카드를 1장씩 뽑습니다." : "파일 하나를 선택해 위에서부터 카드를 3장 뽑습니다."}</span>;
      case "starGuard":
        return <><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span><span className="effect-star">★</span>을 얻습니다.</span></>;
      case "starArk":
        return <><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span><span className="effect-type magic">마법 방어</span>를 {defenseNumber} 얻습니다.</span><span><span className="effect-star">★</span>을 얻습니다.</span></>;
      case "obsidianDagger":
        return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span>[밑패를 <strong className="effect-keyword">소멸</strong>시키고 피해량을 이 카드에 추가합니다.]</span></>;
      case "astronomyResearch":
        return <span><span className="effect-star">★★</span>을 지불하고 원하는 파일의 맨 위 카드를 가져올 수 있습니다. (한 턴에 한 번)</span>;
      case "necromancyResearch":
        return <span><span className="effect-star">★★★</span>을 지불하고 버린 카드 더미에서 원하는 카드 1장을 가져올 수 있습니다. (한 턴에 한 번)</span>;
      case "metallurgyResearch":
        return <span>카드를 <strong className="effect-keyword">재련</strong>할 때마다 <strong className="effect-keyword">재련</strong>된 카드를 가져옵니다.</span>;
      case "economicsResearch":
        return <span>에너지가 -3이 될 때까지 카드를 사용할 수 있습니다. 이 효과는 중첩됩니다.</span>;
      case "opticsResearch":
        return <span>매 플레이어 턴 시작 시 <strong className="effect-keyword">광채</strong>를 1장 가져옵니다.</span>;
      case "radiance":
        return <span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다. 이번 턴 동안 <strong className="effect-keyword">광채</strong>의 피해량이 4 증가합니다.</span>;
      case "lightCluster":
        return <span><strong className="effect-keyword">광채</strong>를 1장 가져옵니다.</span>;
      case "largePrism":
        return <span><strong className="effect-keyword">광채</strong>를 3장 가져옵니다.</span>;
      case "nebula":
        return <><span><strong className="effect-keyword">광채</strong>를 1장 가져옵니다.</span><span><span className="effect-star">★★</span>를 얻습니다.</span></>;
      case "lightTravelTime":
        return <span>다다음 턴 시작 시 <strong className="effect-keyword">광채</strong>를 {card.value}장 가져옵니다.</span>;
      case "wolfTalisman":
        return <span>지니고 있는 동안 <strong className="effect-keyword">힘</strong>을 1 얻습니다. (중복 불가)</span>;
      case "turtleTalisman":
        return <span>지니고 있는 동안 <strong className="effect-keyword">강인함</strong>을 1 얻습니다. (중복 불가)</span>;
      case "lawResearch":
        return <span>내 <strong className="effect-keyword">룰</strong> 카드의 비용이 1 감소합니다. 비용은 0보다 낮아지지 않습니다.</span>;
      case "mirrorImage":
        return <span>내 <span className="effect-type physical">방어</span>와 <span className="effect-type magic">마법 방어</span> 수치를 서로 바꿉니다.</span>;
      case "blessing":
        return <span><strong className="effect-keyword">마법 저항</strong>을 {card.forged ? 2 : "1[2]"} 얻습니다.</span>;
      case "odinSpear":
        return <><span>모든 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span><span>다른 카드를 <strong className="effect-keyword">재련</strong>할 때마다 비용이 1 감소합니다.</span></>;
      case "massDeal":
        return <><span>빈 파일을 하나 만듭니다.</span><span>카드를 섞을 때마다 각 파일의 카드 수가 최대한 같도록 놓습니다.</span><span>{card.forged ? "즉시 파일을 다시 섞습니다." : "[즉시 파일을 다시 섞습니다.]"}</span></>;
      case "sturdyStance":
        return <span>턴 종료 시 방어와 마법 방어를 절반 보존합니다.</span>;
      case "charge":
        return <span><strong className="effect-keyword">에너지</strong>를 {card.value} 얻습니다.</span>;
      case "weaponSharpen":
        return <span><strong className="effect-keyword">힘</strong>을 {card.value} 얻습니다.</span>;
      case "armorSharpen":
        return <span><strong className="effect-keyword">강인함</strong>을 {card.value} 얻습니다.</span>;
      case "boomerang":
        return card.name === "정리 타격"
          ? <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span>파일 하나의 맨 위 카드를 버립니다.</span></>
          : <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span>파일 하나의 맨 위 카드를 맨 밑으로 보냅니다.</span></>;
      case "meteor":
        return <span><span className="effect-star">★</span>를 모두 소모하고, 소모한 <span className="effect-star">★</span>마다 무작위 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span>;
      case "counter":
        return <span>이번 턴 막은 피해를 반사합니다.</span>;
      case "exchange":
        return <span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다. [밑패와 비용을 교환합니다.]</span>;
      case "flood":
        return <span>피라미드(4-3-2-1). <strong className="effect-keyword">에너지</strong>를 2 얻습니다. 카드를 2장 뽑습니다. <span className="effect-star">★★</span>을 얻습니다.</span>;
      case "endStart":
        return <span>모든 파일이 비어 있어야 사용할 수 있습니다. <strong className="effect-keyword">에너지</strong>를 {card.value} 얻습니다.</span>;
      case "superStrategist":
        return <span><span className="effect-star">★★★★★</span>을 얻습니다.</span>;
      case "slime":
        return <span>턴 종료 시 손패에 있다면 <span className="effect-type magic">마법 피해</span>를 12 받습니다.</span>;
      case "relic":
        return <span>도깨비의 <strong className="effect-keyword">힘</strong>을 4 잃게 합니다.</span>;
      case "soil":
        return null;
      case "rock":
        return null;
      case "supernova":
        return <span><span className="effect-star">★★</span>를 잃습니다. <strong className="effect-keyword">에너지</strong>를 3 얻습니다.</span>;
      case "combatManual":
        return <span>손패에 있는 동안 <strong className="effect-keyword">힘</strong>과 <strong className="effect-keyword">강인함</strong>을 2 얻습니다.</span>;
      case "grimoire":
        return <span>손패에 있는 동안 카드를 낼 때마다 <span className="effect-star">★</span>을 얻습니다. <span className="effect-star">★</span>가 7개 이상이면 전부 잃고 <strong className="effect-keyword">체력</strong>을 5 잃습니다.</span>;
      case "horologium":
        return <span>추가 턴을 얻습니다.</span>;
      case "ophiuchus":
        return <span>체력을 5 회복합니다.</span>;
      case "aries":
        return <span><strong className="effect-keyword">에너지</strong>를 5 얻습니다. <span className="effect-star">★★★★★</span>을 얻습니다.</span>;
      case "hydra":
        return <span>무작위 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다. 9번 반복합니다.</span>;
      case "orion":
        return <span><strong className="effect-keyword">힘</strong>을 10 얻습니다.</span>;
      case "cassiopeia":
        return null;
      case "ironWave":
        return <><span><span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span></>;
      case "waterWave":
        return <><span><span className="effect-type magic">마법 방어</span>를 {defenseNumber} 얻습니다.</span><span>카드를 {card.draw}장 뽑습니다.</span></>;
      case "ironRampage":
        return <><span>모든 적에게 <span className="effect-type damage">피해</span>를 {damageNumber} 줍니다.</span><span><span className="effect-type physical">방어</span>를 {defenseNumber} 얻습니다.</span></>;
    }
  })();
  const effectSentences = splitEffectSentences(effectText);
  const unplayableLabel = ["slime", "soil", "rock", "combatManual", "grimoire"].includes(card.effect)
    ? <><strong className="effect-keyword">사용 불가</strong>.</>
    : ["wolfTalisman", "turtleTalisman", "sacrifice", "magicCrystal"].includes(card.effect)
      ? <strong className="effect-keyword">사용불가.</strong>
      : null;
  const effectPrefix = <>
    {card.rule && card.effect !== "massDeal" && <strong className="solitaire-rule effect-keyword rule-keyword">룰.</strong>}
    {card.solitaireRule && <strong className="solitaire-rule solitaire-keyword">{card.solitaireRule === "top" ? "윗패" : card.solitaireRule === "bottom" ? "밑패" : "주문"}</strong>}
    {card.ritualCost && <strong className="solitaire-rule effect-keyword">의식 {card.ritualCost}.</strong>}
    {card.spellRank && <strong className="solitaire-rule effect-keyword">{card.spellRank}위계 마법.</strong>}
    {unplayableLabel}
    {unplayableLabel && effectSentences.length > 0 ? " " : null}
  </>;
  const effectSuffix = <>
    {card.token && <strong className="solitaire-rule token-rule effect-keyword">토큰.</strong>}
    {card.exhaust && !card.rule && <strong className="solitaire-rule effect-keyword">소멸.</strong>}
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
        {card.name}{card.effect === "obsidianDagger" && cardForgeCount(card) > 0 ? ` +${cardForgeCount(card)}` : card.forged && !["astronomyResearch", "necromancyResearch"].includes(card.effect) ? "+" : ""}
      </strong>
      <span ref={cardEffectRef} className="card-effect">{emphasizeEffectNumbers(<>
        <span className="card-effect-copy">
          {effectSentences.length === 0 && <>{effectPrefix}{effectSuffix}</>}
          {effectSentences.map((sentence, index) => <Fragment key={index}>
            <span className="effect-sentence">
              {index === 0 && effectPrefix}
              {index === 1 && card.effect === "massDeal" && card.rule && <strong className="solitaire-rule effect-keyword rule-keyword">룰.</strong>}
              {sentence}
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
          : card.forged && card.effect !== "massDeal" && !["astronomyResearch", "necromancyResearch"].includes(card.effect)
            ? <strong className="solitaire-rule forge-rule effect-keyword">재련됨.</strong>
            : !(card.forged && card.effect === "massDeal") && !["astronomyResearch", "necromancyResearch"].includes(card.effect)
              && (card.forgeCost !== undefined || card.forgeCosts || card.forgeTargetName || card.forgeAny)
              && <strong className="solitaire-rule forge-rule"><span className="effect-keyword">재련</span>: {forgeConditionText(card)}</strong>}
      </>)}</span>
    </>
  );
}
