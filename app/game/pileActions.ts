import type { Dispatch, RefObject, SetStateAction } from "react";
import type { BlessingId } from "./blessingRules";
import type { GameState } from "./battleState";
import type { EnemyState } from "./enemies";
import type { Card } from "./cards";
import type { DragState, Phase } from "./battleUiTypes";
import { cardEnergyCost, canForgeCardOnto, canPlaceBySolitaireRule, cardForgeCount, getFloodPyramid, getSpellStraight } from "./cardEffects";
import { cardCostAfterForgePlacement } from "./forgeRules";
import { applyPlayerAttack } from "./enemies";
import { drawRandomFromPiles } from "./battleState";

type ResearchDrawKind = "astronomy" | "necromancy";

type MoveCardToPileContext = {
  setGame: Dispatch<SetStateAction<GameState>>;
  phase: Phase;
  blessings: BlessingId[];
  grantBattleReward: (regionNumber: number) => void;
  battleRewardRegionRef: RefObject<number>;
  lowestHealthEnemy: (enemies: EnemyState[]) => EnemyState | undefined;
};
type DrawSelectedPileContext = {
  game: GameState;
  phase: Phase;
  setGame: Dispatch<SetStateAction<GameState>>;
  pendingOriginsRef: RefObject<Map<number, DOMRect>>;
  setPhase: Dispatch<SetStateAction<Phase>>;
};
type DrawAstronomyResearchCardContext = {
  game: GameState;
  phase: Phase;
  setGame: Dispatch<SetStateAction<GameState>>;
  captureDrawOrigins: (cards: Card[]) => number;
  setPhase: Dispatch<SetStateAction<Phase>>;
  canUseResearchDraw: (state: GameState, research: ResearchDrawKind) => boolean;
};

export function createMoveCardToPile(context: MoveCardToPileContext) {
  const { setGame, phase, blessings, grantBattleReward, battleRewardRegionRef, lowestHealthEnemy } = context;
  return (drag: DragState, targetPileIndex: number) => {
    setGame((current) => {
      if (
        current.status !== "playing" ||
        current.pendingDraws > 0 ||
        current.pendingPileDrawCount > 0 ||
        current.pendingDiscards > 0 ||
        current.pendingSweep ||
        current.pendingResearchDraw !== null ||
        phase !== "playing"
      ) return current;
      if (blessings.includes("starlessAge")) {
        return { ...current, message: "별이 없는 시대: 솔리테어 행동을 할 수 없습니다." };
      }
      if (!current.piles[targetPileIndex]) return current;
      if (drag.source.type === "pile" && drag.source.pileIndex === targetPileIndex) return current;
      const targetCard = current.piles[targetPileIndex].at(-1);
      const lawResearchCount = current.activeRuleCards.filter((card) => card.effect === "lawResearch").length;
      const effectiveTargetCost = targetCard === undefined
        ? undefined
        : cardEnergyCost(targetCard, lawResearchCount, current.forgeCount);
      if (!canPlaceBySolitaireRule(drag.card, targetCard)) {
        return {
          ...current,
          message: drag.card.solitaireRule === "top"
            ? "윗패는 밑패 위에만 놓을 수 있습니다."
            : "주문은 비용이 1 높은 주문 카드 위에만 놓을 수 있습니다.",
        };
      }
      if (current.stars < 1) {
        return { ...current, message: "솔리테어 행동에 필요한 ★가 없습니다." };
      }
      const forgeResults = drag.cards.map((card) => {
        const obsidian = card.effect === "obsidianDagger"
          && canForgeCardOnto(card, targetCard, lawResearchCount, current.forgeCount);
        const exchange = card.effect === "exchange"
          && !card.forged
          && Boolean(targetCard)
          && card.cost !== undefined
          && targetCard?.cost !== undefined;
        const regular = !obsidian
          && !exchange
          && card.effect !== "exchange"
          && !card.forged
          && canForgeCardOnto(card, targetCard, lawResearchCount, current.forgeCount);
        return { obsidian, exchange, regular, applied: obsidian || exchange || regular };
      });
      const forgeAppliedCount = forgeResults.filter((result) => result.applied).length;
      const obsidianForgeCount = forgeResults.filter((result) => result.obsidian).length;
      const forgeApplied = forgeAppliedCount > 0;

      const nextPiles = current.piles.map((pile) => [...pile]);
      if (drag.source.type === "pile") {
        const sourcePile = nextPiles[drag.source.pileIndex];
        const movingCards = sourcePile.slice(drag.source.cardIndex);
        if (
          movingCards.length !== drag.cards.length ||
          movingCards.some((card, index) => card.id !== drag.cards[index].id)
        ) return current;
        sourcePile.splice(drag.source.cardIndex);
        if (sourcePile.length > 0) {
          sourcePile[sourcePile.length - 1] = { ...sourcePile[sourcePile.length - 1], revealed: true };
        }
      } else if (!current.hand.some((card) => card.id === drag.card.id)) {
        return current;
      }

      if (obsidianForgeCount > 0 && targetCard) {
        const consumed = nextPiles[targetPileIndex].pop();
        if (!consumed || consumed.id !== targetCard.id) return current;
        if (nextPiles[targetPileIndex].length > 0) {
          const topIndex = nextPiles[targetPileIndex].length - 1;
          nextPiles[targetPileIndex][topIndex] = { ...nextPiles[targetPileIndex][topIndex], revealed: true };
        }
      }

      const battleLongCardUpdates = new Map<number, Card>();
      const topmostExchangeIndex = forgeResults.findLastIndex((result) => result.exchange);
      if (topmostExchangeIndex >= 0 && targetCard && obsidianForgeCount === 0) {
        const targetIndex = nextPiles[targetPileIndex].length - 1;
        const exchangeCard = drag.cards[topmostExchangeIndex];
        nextPiles[targetPileIndex][targetIndex] = {
          ...targetCard,
          baseCost: targetCard.baseCost ?? targetCard.cost,
          cost: cardEnergyCost(exchangeCard, lawResearchCount, current.forgeCount),
        };
        battleLongCardUpdates.set(targetCard.id, nextPiles[targetPileIndex][targetIndex]);
      }
      const placedCards = drag.cards.map((card, index) => {
        const forgeResult = forgeResults[index];
        const daggerForgeApplied = forgeResult.obsidian;
        const exchangeForgeApplied = forgeResult.exchange;
        const becomesForged = forgeResult.applied;
        const nextForgeCostsCompleted = !daggerForgeApplied
          ? card.forgeCostsCompleted
          : Array.from({ length: cardForgeCount(card) + 1 }, (_, forgeIndex) => forgeIndex + 1);
        const baseCost = exchangeForgeApplied
          ? (card.baseCost ?? card.cost)
          : card.baseCost;
        const placedCard = {
          ...card,
          baseCost,
          cost: cardCostAfterForgePlacement(
            card,
            exchangeForgeApplied && targetCard
              ? effectiveTargetCost ?? targetCard.cost
              : undefined,
          ),
          value: daggerForgeApplied ? card.value + targetCard!.value : card.value,
          forgeCostsCompleted: nextForgeCostsCompleted,
          revealed: drag.source.type === "hand" ? true : card.revealed,
          forged: card.forged || becomesForged,
        };
        if (placedCard.forged) battleLongCardUpdates.set(placedCard.id, placedCard);
        return placedCard;
      });
      nextPiles[targetPileIndex].push(...placedCards);
      const metallurgyResearchCount = forgeApplied
        ? current.activeRuleCards.filter((card) => card.effect === "metallurgyResearch").length
        : 0;
      const forgedCardsToRetrieve = metallurgyResearchCount > 0
        ? placedCards.filter((_, index) => forgeResults[index].applied)
        : [];
      if (forgedCardsToRetrieve.length > 0) {
        const retrievedIds = new Set(forgedCardsToRetrieve.map((card) => card.id));
        nextPiles[targetPileIndex] = nextPiles[targetPileIndex].filter((card) => !retrievedIds.has(card.id));
        if (nextPiles[targetPileIndex].length > 0) {
          const topIndex = nextPiles[targetPileIndex].length - 1;
          nextPiles[targetPileIndex][topIndex] = { ...nextPiles[targetPileIndex][topIndex], revealed: true };
        }
      }
      const nextInitialDeck = battleLongCardUpdates.size > 0
        ? current.initialDeck.map((card) => battleLongCardUpdates.get(card.id) ?? card)
        : current.initialDeck;
      const spellStraight = getSpellStraight(nextPiles[targetPileIndex]);
      const floodPyramid = spellStraight ? null : getFloodPyramid(nextPiles[targetPileIndex]);
      let nextEnemies = current.enemies;
      let nextEnergy = current.energy;
      let nextStars = current.stars - 1;
      const blacksmithTriggered = forgeApplied && blessings.includes("blacksmith") && !current.blacksmithForgeUsedThisTurn;
      const hammeringTriggered = forgeApplied && current.deckEditions.includes("hammering");
      if (blacksmithTriggered) nextStars += 1;
      if (hammeringTriggered) nextStars += 1;
      let autoDiscard: Card[] = [];
      let autoDraws = 0;
      if (spellStraight) {
        nextPiles[targetPileIndex].splice(-3);
        if (nextPiles[targetPileIndex].length > 0) {
          const topIndex = nextPiles[targetPileIndex].length - 1;
          nextPiles[targetPileIndex][topIndex] = { ...nextPiles[targetPileIndex][topIndex], revealed: true };
        }
        autoDiscard = spellStraight;
        for (const spell of spellStraight) {
          if (spell.effect === "magicStrike") {
            const target = lowestHealthEnemy(nextEnemies);
            if (target) {
              nextEnemies = nextEnemies.map((enemy) => enemy.id === target.id
                ? applyPlayerAttack(
                  enemy,
                  enemy.isBoss && blessings.includes("bossSlayer") ? (spell.value + current.strength) * 2 : spell.value + current.strength,
                  1,
                )
                : enemy);
            }
          } else if (spell.effect === "shockwave") {
            nextEnemies = nextEnemies.map((enemy) => enemy.hp > 0
              ? applyPlayerAttack(
                enemy,
                enemy.isBoss && blessings.includes("bossSlayer") ? (spell.value + current.strength) * 2 : spell.value + current.strength,
                1,
              )
              : enemy);
          } else if (spell.effect === "ventilate") {
            nextEnergy += spell.value;
          } else if (spell.effect === "starlight") {
            nextStars += spell.value;
          }
        }
        if (nextEnemies.every((enemy) => enemy.hp === 0)) {
          grantBattleReward(battleRewardRegionRef.current);
        }
      } else if (floodPyramid) {
        nextPiles[targetPileIndex].splice(-4);
        if (nextPiles[targetPileIndex].length > 0) {
          const topIndex = nextPiles[targetPileIndex].length - 1;
          nextPiles[targetPileIndex][topIndex] = { ...nextPiles[targetPileIndex][topIndex], revealed: true };
        }
        autoDiscard = floodPyramid;
        nextEnergy += 2;
        nextStars += 2;
        autoDraws = Math.min(2, nextPiles.reduce((total, pile) => total + pile.length, 0));
      }
      const cardLabel = drag.cards.length > 1 ? `${drag.cards.length}장` : drag.card.name;
      const action = drag.source.type === "hand"
        ? `${drag.card.name} 카드를 손패에서 ${targetPileIndex + 1}번 파일로 이동`
        : `${drag.source.pileIndex + 1}번 파일의 ${cardLabel}을(를) ${targetPileIndex + 1}번 파일로 이동`;
      const forgeAction = forgeAppliedCount > 0
        ? `${action} · ${forgeAppliedCount}장 재련${obsidianForgeCount > 0 && targetCard ? `: ${targetCard.name} 소멸` : ""}`
        : action;
      const finalAction = forgedCardsToRetrieve.length > 0
        ? `${forgeAction} · 금속학 연구: 재련된 카드 ${forgedCardsToRetrieve.length}장 가져옴`
        : forgeAction;

      let nextHand = drag.source.type === "hand"
        ? current.hand.filter((card) => card.id !== drag.card.id)
        : current.hand;
      if (forgedCardsToRetrieve.length > 0) {
        nextHand = [
          ...nextHand,
          ...forgedCardsToRetrieve.map((card) => ({ ...card, revealed: true })),
        ];
      }

      return {
        ...current,
        piles: nextPiles,
        initialDeck: nextInitialDeck,
        hand: nextHand,
        discard: spellStraight || floodPyramid ? [...current.discard, ...autoDiscard] : current.discard,
        enemies: nextEnemies,
        energy: nextEnergy,
        stars: nextStars,
        forgeCount: current.forgeCount + forgeAppliedCount,
        blacksmithForgeUsedThisTurn: current.blacksmithForgeUsedThisTurn || blacksmithTriggered,
        removedFromReshuffleIds: obsidianForgeCount > 0 && targetCard
          ? [...new Set([...current.removedFromReshuffleIds, targetCard.id])]
          : current.removedFromReshuffleIds,
        pendingDraws: floodPyramid ? current.pendingDraws + autoDraws : current.pendingDraws,
        starsSpent: current.starsSpent + 1,
        status: spellStraight && nextEnemies.every((enemy) => enemy.hp === 0) ? "won" : current.status,
        message: spellStraight ? "주문 스트레이트 발동!" : floodPyramid ? "범람 피라미드 발동!" : finalAction,
      };
    });
  }
}

export function createDrawSelectedPile(context: DrawSelectedPileContext) {
  const { game, phase, setGame, pendingOriginsRef, setPhase } = context;
  return (pileIndex: number) => {
    if ((game.pendingDraws < 1 && game.pendingPileDrawCount < 1) || game.pendingResearchDraw !== null || phase !== "playing" || game.status !== "playing") return;
    if (game.piles.every((pile) => pile.length === 0)) {
      setGame((current) => ({
        ...current,
        pendingDraws: 0,
        pendingPileDrawCount: 0,
        pendingDashRandomDraws: 0,
        message: "드로우할 카드가 없습니다.",
      }));
      return;
    }
    const pile = game.piles[pileIndex];
    const card = pile?.at(-1);
    if (!card) {
      // 빈 파일을 눌러도 드로우 선택 상태를 망가뜨리지 않는다.
      // 다른 파일을 선택할 수 있도록 현재 단계는 유지한다.
      setGame((current) => ({
        ...current,
        message: "이 파일은 비어 있습니다. 카드가 있는 파일을 선택하세요.",
      }));
      return;
    }

    const drawCount = game.pendingPileDrawCount || 1;
    const dashRandomCount = game.pendingDashRandomDraws;
    let dashRandomResult: ReturnType<typeof drawRandomFromPiles> | null = null;
    if (dashRandomCount > 0) {
      const previewPiles = game.piles.map((currentPile) => [...currentPile]);
      for (let index = 0; index < drawCount; index += 1) previewPiles[pileIndex]?.pop();
      dashRandomResult = drawRandomFromPiles(previewPiles, dashRandomCount);
    }
    const originIds = new Set([card.id, ...(dashRandomResult?.hand.map((drawnCard) => drawnCard.id) ?? [])]);
    const origins = new Map<number, DOMRect>();
    document.querySelectorAll<HTMLElement>("[data-top-card-id]").forEach((element) => {
      const cardId = Number(element.dataset.topCardId);
      if (originIds.has(cardId)) origins.set(cardId, element.getBoundingClientRect());
    });
    if (origins.size > 0) {
      pendingOriginsRef.current = origins;
      setPhase("drawing");
    }

    setGame((current) => {
      if (current.pendingDraws < 1 && current.pendingPileDrawCount < 1 || current.pendingResearchDraw !== null) return current;
      if (current.piles[pileIndex]?.at(-1)?.id !== card.id) {
        const hasCards = current.piles.some((currentPile) => currentPile.length > 0);
        // 렌더 사이에 파일이 바뀌었으면 애니메이션 단계에 고정되지 않게 한다.
        setPhase("playing");
        return hasCards
          ? current
          : {
              ...current,
              pendingDraws: 0,
              pendingPileDrawCount: 0,
              pendingDashRandomDraws: 0,
              message: "드로우할 카드가 없습니다.",
            };
      }
      const nextPiles = current.piles.map((currentPile) => [...currentPile]);
      const drawCount = current.pendingPileDrawCount || 1;
      const drawnCards: Card[] = [];
      for (let index = 0; index < drawCount; index += 1) {
        const drawnCard = nextPiles[pileIndex].pop();
        if (!drawnCard) break;
        drawnCards.push({ ...drawnCard, revealed: true });
      }
      if (drawnCards.length === 0) {
        return {
          ...current,
          pendingDraws: 0,
          pendingPileDrawCount: 0,
          pendingDashRandomDraws: 0,
          message: "드로우할 카드를 선택할 수 없습니다.",
        };
      }
      if (nextPiles[pileIndex].length > 0) {
        const nextTopIndex = nextPiles[pileIndex].length - 1;
        nextPiles[pileIndex][nextTopIndex] = {
          ...nextPiles[pileIndex][nextTopIndex],
          revealed: true,
        };
      }
      const isDashDraw = current.pendingDashRandomDraws > 0;
      const randomDrawnCards = isDashDraw ? (dashRandomResult?.hand ?? []) : [];
      const allDrawnCards = [...drawnCards, ...randomDrawnCards];
      // 선택 파일 드로우와 무작위 추가 드로우가 서로 다른 복사본에서
      // 계산되므로, 결과를 합친 뒤 모든 파일의 맨 위 카드가 앞면인지 보장한다.
      const finalPiles = (isDashDraw && dashRandomResult ? dashRandomResult.piles : nextPiles).map((currentPile) => {
        if (currentPile.length === 0) return currentPile;
        const topIndex = currentPile.length - 1;
        const topCard = currentPile[topIndex];
        return topCard.revealed
          ? currentPile
          : [...currentPile.slice(0, topIndex), { ...topCard, revealed: true }];
      });
      const action = isDashDraw
        ? `${pileIndex + 1}번 파일에서 ${drawnCards.length}장 드로우 · 무작위 파일에서 ${randomDrawnCards.length}장 추가 드로우`
        : `${pileIndex + 1}번 파일에서 ${drawnCards.length}장 드로우`;
      const remainingCardCount = finalPiles.reduce((total, currentPile) => total + currentPile.length, 0);
      const nextPendingDraws = isDashDraw
        ? 0
        : current.pendingPileDrawCount > 0
          ? current.pendingDraws
          : Math.min(Math.max(0, current.pendingDraws - 1), remainingCardCount);
      return {
        ...current,
        piles: finalPiles,
        hand: [...current.hand, ...allDrawnCards],
        pendingDraws: nextPendingDraws,
        pendingPileDrawCount: 0,
        pendingDashRandomDraws: 0,
        message: current.pendingPileDrawCount > 0
          ? action
          : nextPendingDraws > 0
          ? "다음 드로우 파일을 선택하세요."
          : current.pendingDiscards > 0
            ? `손에서 버릴 카드 ${current.pendingDiscards}장을 클릭하세요.`
            : action,
      };
    });
  }
}

export function createDrawAstronomyResearchCard(context: DrawAstronomyResearchCardContext) {
  const { game, phase, setGame, captureDrawOrigins, setPhase, canUseResearchDraw } = context;
  return (pileIndex: number, allowAutoPay = false) => {
    const canDrawDirectly = allowAutoPay && game.pendingResearchDraw === null;
    if ((game.pendingResearchDraw !== "astronomy" && !canDrawDirectly) || phase !== "playing" || game.status !== "playing") return;
    const expectedCardId = game.piles[pileIndex]?.at(-1)?.id;
    if (expectedCardId === undefined) {
      setGame((current) => ({ ...current, message: "이 파일은 비어 있습니다. 카드가 있는 파일을 선택하세요." }));
      return;
    }
    const expectedCard = game.piles[pileIndex]?.at(-1);
    if (expectedCard && captureDrawOrigins([expectedCard]) > 0) setPhase("drawing");
    setGame((current) => {
      const isPendingResearch = current.pendingResearchDraw === "astronomy";
      const isDirectResearch = allowAutoPay && current.pendingResearchDraw === null;
      if (!isPendingResearch && !isDirectResearch) {
        setPhase("playing");
        return current;
      }
      if (isDirectResearch && !canUseResearchDraw(current, "astronomy")) {
        setPhase("playing");
        return {
          ...current,
          message: current.activeRuleCards.some((card) => card.effect === "astronomyResearch")
            ? current.stars < 2
              ? "천문학 연구: ★★가 필요합니다."
              : current.astronomyResearchUses >= current.activeRuleCards.filter((card) => card.effect === "astronomyResearch").length
                ? "천문학 연구는 이번 턴에 더 사용할 수 없습니다."
                : "파일에 뽑을 카드가 없습니다."
            : "천문학 연구 룰을 먼저 사용하세요.",
        };
      }
      if (current.piles[pileIndex]?.at(-1)?.id !== expectedCardId) {
        setPhase("playing");
        return current;
      }
      const nextPiles = current.piles.map((pile) => [...pile]);
      const card = nextPiles[pileIndex]?.pop();
      if (!card) return current;
      if (nextPiles[pileIndex].length > 0) {
        const topIndex = nextPiles[pileIndex].length - 1;
        nextPiles[pileIndex][topIndex] = { ...nextPiles[pileIndex][topIndex], revealed: true };
      }
      const action = `천문학 연구: ${card.name} 드로우`;
      return {
        ...current,
        piles: nextPiles,
        hand: [...current.hand, { ...card, revealed: true }],
        stars: current.stars - (isDirectResearch ? 2 : 0),
        pendingResearchDraw: null,
        astronomyResearchUses: current.astronomyResearchUses + 1,
        message: action,
      };
    });
  }
}
