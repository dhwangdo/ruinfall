import type { Dispatch, RefObject, SetStateAction } from "react";
import type { BlessingId } from "./blessingRules";
import type { GameState } from "./battleState";
import { createRadianceCard, createRockCard, createSlimeCard, createSoilCard, type Card } from "./cards";
import { drawFromPiles, drawRandomFromPiles } from "./battleState";

const CARD_RARITY_PRIORITY: Record<Card["rarity"], number> = {
  status: 0,
  starter: 1,
  basic: 2,
  special: 3,
  rare: 4,
  legendary: 5,
};

function prioritizeTopRarityPiles(piles: Card[][], pileIndexes: number[]) {
  let highestRarity = -1;
  const highestRarityPileIndexes: number[] = [];
  for (const index of pileIndexes) {
    const topCard = piles[index]?.at(-1);
    const priority = topCard ? CARD_RARITY_PRIORITY[topCard.rarity] : -1;
    if (priority > highestRarity) {
      highestRarity = priority;
      highestRarityPileIndexes.length = 0;
    }
    if (priority === highestRarity) highestRarityPileIndexes.push(index);
  }
  return highestRarityPileIndexes;
}

type BattlePhase = "drawing" | "playing" | "discarding" | "enemy-turn";

type DrawCardsContext = {
  pendingOriginsRef: RefObject<Map<number, DOMRect>>;
  pendingPileTokenSourcesRef: RefObject<Map<number, string>>;
  pendingEnemyTokenIdsRef: RefObject<Set<number>>;
  nextCardIdRef: RefObject<number>;
  blessings: BlessingId[];
  setPhase: (phase: BattlePhase) => void;
  setGame: Dispatch<SetStateAction<GameState>>;
  setPileClearNotice: Dispatch<SetStateAction<boolean>>;
  later: (callback: () => void, delay: number) => number;
  pickRandom: <T>(items: T[]) => T;
};

export function createDrawCards(context: DrawCardsContext) {
  const {
    pendingOriginsRef,
    pendingPileTokenSourcesRef,
    pendingEnemyTokenIdsRef,
    nextCardIdRef,
    blessings,
    setPhase,
    setGame,
    setPileClearNotice,
    later,
    pickRandom,
  } = context;
  return () => {
    const origins = new Map<number, DOMRect>();
    document.querySelectorAll<HTMLElement>("[data-top-card-id]").forEach((element) => {
      const cardId = Number(element.dataset.topCardId);
      origins.set(cardId, element.getBoundingClientRect());
    });
    pendingOriginsRef.current = origins;
    setPhase("drawing");
    setGame((current) => {
      // 현재 화면에 보이는 의도가 흙이면, 적 행동을 기다리지 않고
      // 이번 턴 드로우 직후 각 파일에 흙을 놓는다.
      const soilSourceEnemyIds = current.enemies.flatMap((enemy) => {
        if (enemy.hp <= 0) return [];
        return Array.from(
          { length: enemy.actions[enemy.intentIndex]?.soilCount ?? 0 },
          () => enemy.id,
        );
      });
      const rockSourceEnemyIds = current.enemies.flatMap((enemy) => {
        if (enemy.hp <= 0) return [];
        const action = enemy.actions[enemy.intentIndex];
        const count = enemy.firstActionCompleted
          ? action?.rockCount ?? 0
          : action?.firstActionRockCount ?? action?.rockCount ?? 0;
        return Array.from({ length: count }, () => enemy.id);
      });
      const soilCount = soilSourceEnemyIds.length;
      const rockCount = rockSourceEnemyIds.length;
      const soilCardsByPile = Array.from({ length: current.piles.length }, () =>
        Array.from({ length: soilCount }, (_, soilIndex) => {
          const card = {
            ...createSoilCard(nextCardIdRef.current++),
            revealed: true,
          };
          const sourceEnemyId = soilSourceEnemyIds[soilIndex];
          if (sourceEnemyId) pendingPileTokenSourcesRef.current.set(card.id, sourceEnemyId);
          return card;
        })
      );
      const rockCardsByPile = Array.from({ length: current.piles.length }, () =>
        Array.from({ length: rockCount }, (_, rockIndex) => {
          const card = {
            ...createRockCard(nextCardIdRef.current++),
            revealed: true,
          };
          const sourceEnemyId = rockSourceEnemyIds[rockIndex];
          if (sourceEnemyId) pendingPileTokenSourcesRef.current.set(card.id, sourceEnemyId);
          return card;
        })
      );
      const soilCardsForDeck = soilCardsByPile.flat().map((card) => ({ ...card, revealed: false }));
      const rockCardsForDeck = rockCardsByPile.flat().map((card) => ({ ...card, revealed: false }));
      const draw = drawFromPiles(current.piles);
      const clearPlan = current.clearPlan;
      const clearedAllPiles = clearPlan !== null;
      const turnStartExtraDrawCount = (current.deckEditions.includes("persistentDraw") ? 1 : 0)
        + (blessings.includes("starlessAge") ? 1 : 0);
      const additionalStartDraw = !clearedAllPiles && turnStartExtraDrawCount > 0
        ? drawRandomFromPiles(draw.piles, turnStartExtraDrawCount)
        : { piles: draw.piles, hand: [] as Card[] };
      const drawPiles = additionalStartDraw.piles;
      const topSlotByCardId = new Map<number, number>();
      current.piles.forEach((pile, index) => {
        const top = pile.at(-1);
        if (top) topSlotByCardId.set(top.id, index);
      });
      const initialDraw = clearedAllPiles
        ? draw.hand.map((card) => ({
          ...card,
          drawSlot: topSlotByCardId.get(card.id),
          drawSlotCount: current.piles.length,
        }))
        : [...draw.hand, ...additionalStartDraw.hand];
      if (clearPlan) {
        setPileClearNotice(true);
        later(() => {
          setGame((latest) => {
            if (!latest.clearPlan) return latest;
            return { ...latest, piles: latest.clearPlan.pilesBeforeDraw, discard: [], message: "CLEAR! 새 파일을 배치했습니다." };
          });
          setPileClearNotice(false);
          let missingOriginFrames = 0;
          const drawFromNewPiles = () => {
            const plannedHandIds = new Set(clearPlan.hand.map((card) => card.id));
            const origins = new Map<number, DOMRect>();
            document.querySelectorAll<HTMLElement>("[data-top-card-id]").forEach((element) => {
              const cardId = Number(element.dataset.topCardId);
              if (plannedHandIds.has(cardId)) {
                origins.set(cardId, element.getBoundingClientRect());
              }
            });

            // 렌더가 늦을 때만 잠시 기다린다. 좌표를 끝내 못 찾더라도
            // 애니메이션을 생략하고 진행해야 전투가 drawing 상태에 고정되지 않는다.
            if (origins.size !== plannedHandIds.size && missingOriginFrames < 12) {
              missingOriginFrames += 1;
              window.requestAnimationFrame(drawFromNewPiles);
              return;
            }

            pendingOriginsRef.current = origins;
            setGame((latest) => {
              if (!latest.clearPlan) return latest;
              const planned = latest.clearPlan;
              const existingHandIds = new Set(latest.hand.map((card) => card.id));
              const uniquePlannedHand = planned.hand.filter((card) => !existingHandIds.has(card.id));
              return {
                ...latest,
                piles: planned.pilesAfterDraw.map((pile, index) => [
                  ...pile,
                  ...(soilCardsByPile[index] ?? []),
                  ...(rockCardsByPile[index] ?? []),
                ]),
                hand: [...latest.hand, ...uniquePlannedHand],
                clearPlan: null,
                message: `새 파일에서 ${uniquePlannedHand.length}장을 가져왔습니다.`,
              };
            });
            if (origins.size === 0) {
              window.requestAnimationFrame(() => setPhase("playing"));
            }
          };

          // React가 새 파일을 화면에 그린 뒤 두 프레임을 기다린다.
          // 이후에는 모든 리셔플 드로우가 같은 파일→손패 모션을 사용한다.
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(drawFromNewPiles);
          });
        }, 900);
      }
      const nonEmptyPileIndexes = drawPiles
        .map((pile, index) => pile.length > 0 ? index : -1)
        .filter((index) => index >= 0);
      const discardPileCandidates = nonEmptyPileIndexes.length > 0
        ? nonEmptyPileIndexes
        : drawPiles.map((_, index) => index);
      const enemiesAfterDiscardTargeting = current.enemies.map((enemy) => {
        const intent = enemy.actions[enemy.intentIndex];
        const discardCandidates = intent.discardPriority === "rarity" && nonEmptyPileIndexes.length > 0
          ? prioritizeTopRarityPiles(drawPiles, nonEmptyPileIndexes)
          : discardPileCandidates;
        return intent.discardCount
          ? { ...enemy, discardPileIndex: discardCandidates.length > 0 ? pickRandom(discardCandidates) : undefined }
          : { ...enemy, discardPileIndex: undefined };
      });
      const toxicSlimeSources = current.enemies.flatMap((enemy) => enemy.givesToxicSlime
        ? Array.from({ length: enemy.toxicSlimeCount ?? 1 }, () => enemy)
        : []);
      const toxicSlimes = current.toxicSlimeAdded
        ? []
        : toxicSlimeSources.map(() => createSlimeCard(nextCardIdRef.current++));
      toxicSlimes.forEach((card, index) => {
        const sourceEnemy = toxicSlimeSources[index];
        const source = sourceEnemy
          ? document.querySelector<HTMLElement>(`[data-enemy-id="${sourceEnemy.id}"]`)?.getBoundingClientRect()
          : undefined;
        if (!source) return;
        origins.set(card.id, source);
        pendingEnemyTokenIdsRef.current.add(card.id);
      });
      const pendingRadianceAfterTurn = current.pendingRadiance.map((radiance) => ({
        ...radiance,
        turns: radiance.turns - 1,
      }));
      const radianceArrivingThisTurn = pendingRadianceAfterTurn
        .filter((radiance) => radiance.turns <= 0)
        .reduce((total, radiance) => total + radiance.count, 0);
      const opticalResearchCount = current.activeRuleCards.filter((card) => card.effect === "opticsResearch").length;
      const osirisSunStarCount = current.activeRuleCards.filter((card) => card.effect === "osirisSun").length;
      const evolutionTheoryCount = current.activeRuleCards.filter((card) => card.effect === "evolutionTheory").length;
      const lightLightLightCount = blessings.includes("lightLightLight") && current.turn === 3 ? 2 : 0;
      const nextTurnRadianceCount = opticalResearchCount + radianceArrivingThisTurn + lightLightLightCount;
      const opticalRadiances = Array.from(
        { length: nextTurnRadianceCount },
        () => createRadianceCard(nextCardIdRef.current++),
      );
      return {
        ...current,
        piles: clearedAllPiles
          ? drawPiles
          : drawPiles.map((pile, index) => [
            ...pile,
            ...(soilCardsByPile[index] ?? []),
            ...(rockCardsByPile[index] ?? []),
          ]),
        enemies: enemiesAfterDiscardTargeting,
        hand: [...current.hand, ...initialDraw, ...toxicSlimes, ...opticalRadiances],
        initialDeck: [
          ...current.initialDeck,
          ...toxicSlimes.map((card) => ({ ...card, revealed: false })),
          ...soilCardsForDeck,
          ...rockCardsForDeck,
        ],
        pendingDraws: 0,
        pendingPileDrawCount: 0,
        pendingDashRandomDraws: 0,
        pendingRadiance: pendingRadianceAfterTurn.filter((radiance) => radiance.turns > 0),
        pendingResearchDraw: null,
        pendingDiscards: 0,
        pendingDiscardEnergy: 0,
        pendingSweep: false,
        playerPhysicalBlock: current.preserveDefenseOnTurnEnd
          ? current.playerPhysicalBlock
          : current.turn === 1 && current.deckEditions.includes("defensiveStance")
            ? 5
            : 0,
        playerMagicBlock: current.preserveDefenseOnTurnEnd ? current.playerMagicBlock : 0,
        energy: current.energy
          + (blessings.includes("starlessAge") ? 1 : 0)
          + (blessings.includes("bloodConversion") && current.playerHp > 1 ? 1 : 0),
        stars: current.stars + osirisSunStarCount,
        strength: current.strength + evolutionTheoryCount,
        agility: current.agility + evolutionTheoryCount,
        playerHp: blessings.includes("bloodConversion") && current.playerHp > 1
          ? current.playerHp - 1
          : current.playerHp,
        defenseMultiplier: 1,
        damageTakenMultiplier: 1,
        invulnerable: current.turn === 1 && current.deckEditions.includes("invincible"),
        toxicSlimeAdded: current.toxicSlimeAdded || toxicSlimes.length > 0,
        message: clearedAllPiles ? "CLEAR! 새 파일을 배치합니다."
          : toxicSlimes.length > 0
          ? `${draw.hand.length}장을 가져왔습니다. 주황 슬라임이 유독성 점액을 손패에 넣었습니다.`
          : `${draw.hand.length}장을 각 파일에서 가져왔습니다.`,
      };
    });
  };
}
