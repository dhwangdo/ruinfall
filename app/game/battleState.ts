import { dealCardsEvenlyToPiles, dealCardsToFixedPiles } from "./cardRules.ts";
import { createAdrenalineCard, createRelicCard, type Card } from "./cards.ts";
import { createSewerEncounter, type EnemyState } from "./enemies.ts";
import { createDeck, type DeckEdition } from "./rewards.ts";
import { blockedPileIndexes, preparePileSeals, confiscatePileCards } from "./enemyPassives.ts";
import { forgeRandomStartingCard } from "./startingForge.ts";
import { hasSticker, placeStartingStickers, takePileCards } from "./stickers.ts";

export const MAX_PLAYER_HP = 50;

export type ClearPlan = { pilesBeforeDraw: Card[][]; pilesAfterDraw: Card[][]; hand: Card[]; pendingDraws?: number };

export type GameState = {
  piles: Card[][];
  hand: Card[];
  discard: Card[];
  /** Canonical cards for rebuilding files; token cards are kept here only until the reshuffle filter runs. */
  initialDeck: Card[];
  /** Used exhaust cards that must not return on the next reshuffle. */
  removedFromReshuffleIds: number[];
  clearPlan: ClearPlan | null;
  energy: number;
  radiancePlayedThisTurn: number;
  stars: number;
  pendingDraws: number;
  /** A one-time chosen-file draw. */
  pendingPileDrawCount: number;
  /** 질주가 사용한 무작위 파일 드로우 수. */
  pendingDashRandomDraws: number;
  /** 광행시간: 생성까지 남은 턴과 도착할 광채 수를 카드별로 저장한다. */
  pendingRadiance: Array<{ turns: number; count: number }>;
  /** Amplification and extra energy waiting for the next player turn. */
  pendingBattlePreparation: number;
  /** Whether the amplification threshold rules have already triggered this player turn. */
  overchargeTriggeredThisTurn: boolean;
  criticalReactionTriggeredThisTurn: boolean;
  /** 연구 룰 카드의 추가 드로우 선택 상태. */
  pendingResearchDraw: "astronomy" | "necromancy" | null;
  astronomyResearchUses: number;
  necromancyResearchUses: number;
  pendingDiscards: number;
  /** Whether the current discard selection comes from a "discard X" card keyword. */
  pendingDiscardIsDiscardX: boolean;
  /** Saeongjima cards queued to trigger after the full discard-X selection resolves. */
  pendingSaeongjimaTriggers: number;
  /** Cards scheduled to be drawn at the next player turn start. */
  pendingForesightDraws: number;
  /** Iron Song's remaining turn-start defense repetitions. */
  pendingIronSong: Array<{ turns: number; amount: number }>;
  pendingSweep: boolean;
  pendingPileOperation: "discardTop" | "moveTopToBottom" | null;
  turn: number;
  playerHp: number;
  playerPhysicalBlock: number;
  playerMagicBlock: number;
  playerResistance: number;
  playerAmplification: number;
  strength: number;
  /** 여백의 미가 현재 빈 파일 수에 따라 제공 중인 힘 보너스. */
  whiteSpaceStrengthBonus: number;
  temporaryStrength: number;
  agility: number;
  defenseMultiplier: number;
  /** 대분배: 다음 리셔플부터 파일을 라운드 로빈으로 분배한다. */
  evenDealOnReshuffle: boolean;
  /** 견고한 태세: 적 턴 피해 처리 후 남은 방어를 절반(내림) 보존한다. */
  preserveDefenseOnTurnEnd: boolean;
  /** 현재 전투에서 활성화된 룰 카드. 버프 배지의 호버 미리보기에 사용한다. */
  activeRuleCards: Card[];
  /** 이번 전투에서 발생한 재련 횟수. 오딘의 창 비용에 반영한다. */
  forgeCount: number;
  damageTakenMultiplier: number;
  invulnerable: boolean;
  invulnerabilityTurns: number;
  doubleNextAttack: boolean;
  starsSpent: number;
  reflectDamage: number;
  playerThorns: number;
  highlanderActive: boolean;
  deckHighlanderActive: boolean;
  blacksmithForgeUsedThisTurn: boolean;
  clairvoyanceActive: boolean;
  toxicSlimeAdded: boolean;
  extraTurns: number;
  deckEditions: DeckEdition[];
  enemies: EnemyState[];
  status: "playing" | "won" | "lost";
  message: string;
};

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function buildPiles(
  cards: Card[],
  cardsPerPile = 5,
  firstPileFaceUp = false,
  extraEmptyPiles = 0,
  rareCardsFaceUp = false,
  fixedPileCount?: number,
  evenDeal = false,
  randomFaceUpChance = 0,
): Card[][] {
  const pileCount = fixedPileCount ?? Math.ceil(cards.length / cardsPerPile) + extraEmptyPiles;
  const dealtPiles = evenDeal
    ? dealCardsEvenlyToPiles(cards, pileCount)
    : dealCardsToFixedPiles(cards, pileCount, cardsPerPile);
  return dealtPiles.map((sourcePile, pileIndex) => {
    const pile = sourcePile.map((card) => ({
      ...card,
      revealed: hasSticker(card, "glowDinosaur") || (firstPileFaceUp && pileIndex === 0) || (rareCardsFaceUp && card.rarity === "rare") || Math.random() < randomFaceUpChance,
    }));
    if (pile.length > 0) pile[pile.length - 1].revealed = true;
    return pile;
  });
}

export function prepareDeckForPiles(deck: Card[]) {
  return shuffle(deck.map((card) => ({ ...card, revealed: false })));
}

export function drawFromPiles(piles: Card[][], blocked: readonly number[] = []) {
  const nextPiles = piles.map((pile) => [...pile]);
  const hand: Card[] = [];
  nextPiles.forEach((pile, index) => {
    if (blocked.includes(index)) return;
    hand.push(...takePileCards(pile));
  });
  return { piles: nextPiles, hand };
}

export function drawFromPileIndexes(piles: Card[][], indexes: number[], blocked: readonly number[] = []) {
  const nextPiles = piles.map((pile) => [...pile]);
  const hand: Card[] = [];
  for (const index of indexes) {
    if (blocked.includes(index)) continue;
    const pile = nextPiles[index];
    if (!pile) continue;
    hand.push(...takePileCards(pile, index, piles.length));
  }
  return { piles: nextPiles, hand };
}

export function drawFromFirstPile(piles: Card[][], blocked: readonly number[] = []) {
  const nextPiles = piles.map((pile) => [...pile]);
  const pile = nextPiles[0];
  return { piles: nextPiles, hand: !pile || blocked.includes(0) ? [] : takePileCards(pile) };
}

export function drawOneFromPiles(piles: Card[][]) {
  const nextPiles = piles.map((pile) => [...pile]);
  const pile = nextPiles.find((candidate) => candidate.length > 0);
  if (!pile) return { piles: nextPiles, hand: [] as Card[] };
  return { piles: nextPiles, hand: takePileCards(pile) };
}

export function drawRandomFromPiles(piles: Card[][], count: number, random = Math.random, blocked: readonly number[] = []) {
  const nextPiles = piles.map((pile) => [...pile]);
  const hand: Card[] = [];
  for (let draw = 0; draw < count; draw += 1) {
    const availableIndexes = nextPiles
      .map((pile, index) => pile.length > 0 && !blocked.includes(index) ? index : -1)
      .filter((index) => index >= 0);
    if (availableIndexes.length === 0) break;
    const pileIndex = availableIndexes[Math.floor(random() * availableIndexes.length)];
    const pile = nextPiles[pileIndex];
    hand.push(...takePileCards(pile));
  }
  return { piles: nextPiles, hand };
}

export function waitingState(
  playerHp = MAX_PLAYER_HP,
  enemies: EnemyState[] = createSewerEncounter(),
): GameState {
  return {
    piles: [],
    hand: [],
    discard: [],
    initialDeck: [],
    removedFromReshuffleIds: [],
    clearPlan: null,
    energy: 3,
    radiancePlayedThisTurn: 0,
    stars: 2,
    pendingDraws: 0,
    pendingPileDrawCount: 0,
    pendingDashRandomDraws: 0,
    pendingRadiance: [],
    pendingBattlePreparation: 0,
    overchargeTriggeredThisTurn: false,
    criticalReactionTriggeredThisTurn: false,
    pendingResearchDraw: null,
    astronomyResearchUses: 0,
    necromancyResearchUses: 0,
    pendingDiscards: 0,
    pendingDiscardIsDiscardX: false,
    pendingSaeongjimaTriggers: 0,
    pendingForesightDraws: 0,
    pendingIronSong: [],
    pendingSweep: false,
    pendingPileOperation: null,
    turn: 1,
    playerHp,
    playerPhysicalBlock: 0,
    playerMagicBlock: 0,
    playerResistance: 0,
    playerAmplification: 0,
    strength: 0,
    whiteSpaceStrengthBonus: 0,
    temporaryStrength: 0,
    agility: 0,
    defenseMultiplier: 1,
    evenDealOnReshuffle: false,
    preserveDefenseOnTurnEnd: false,
    activeRuleCards: [],
    forgeCount: 0,
    damageTakenMultiplier: 1,
    invulnerable: false,
    invulnerabilityTurns: 0,
    doubleNextAttack: false,
    starsSpent: 0,
    reflectDamage: 0,
    playerThorns: 0,
    highlanderActive: false,
    deckHighlanderActive: false,
    blacksmithForgeUsedThisTurn: false,
    clairvoyanceActive: false,
    toxicSlimeAdded: false,
    extraTurns: 0,
    deckEditions: [],
    enemies,
    status: "playing",
    message: "카드를 준비하고 있습니다.",
  };
}

export function dealtState(
  playerHp = MAX_PLAYER_HP,
  deck = createDeck(),
  enemies: EnemyState[] = createSewerEncounter(),
  deckEditions: DeckEdition[] = [],
  randomFaceUpChance = 0,
): GameState {
  deck = deck.map(card => ({ ...card, clockworkTriggered: false, bluebirdUsedTurn: undefined }));
  const startingForge = deckEditions.includes("quickHammer")
    ? forgeRandomStartingCard(deck) : { cards: deck, forged: false };
  const preparedDeck = prepareDeckForPiles(startingForge.cards);
  const initialPlacement = placeStartingStickers(buildPiles(
    preparedDeck,
    deckEditions.includes("fantastic") ? 4 : 5,
    false,
    deckEditions.includes("roomy") ? 1 : 0,
    false,
    undefined,
    false,
    0,
  ), Math.random, randomFaceUpChance);
  const initialPiles = initialPlacement.piles;
  const encounterTokens = enemies.some((enemy) => enemy.variant === "goblin")
    ? [createRelicCard(-10000)]
    : [];
  if (encounterTokens.length > 0) initialPiles[0].unshift(encounterTokens[0]);
  const confiscation = confiscatePileCards(enemies, initialPiles);
  enemies = preparePileSeals(confiscation.enemies, confiscation.piles, 1);
  const startingDraw = deckEditions.includes("drawPlus")
    ? drawRandomFromPiles(confiscation.piles, 1, Math.random, blockedPileIndexes(enemies))
    : { piles: confiscation.piles, hand: [] as Card[] };
  return {
    ...waitingState(playerHp, enemies),
    piles: startingDraw.piles,
    hand: [
      ...initialPlacement.hand,
      ...startingDraw.hand,
      ...(deckEditions.includes("lively") ? [createAdrenalineCard()] : []),
    ],
    initialDeck: [...startingForge.cards, ...encounterTokens].map((card) => ({ ...card, revealed: false })),
    forgeCount: startingForge.forged ? 1 : 0,
    energy: (deckEditions.includes("rampaging") ? 4 : 3)
      + (deckEditions.includes("energyPlus") ? 1 : 0)
      + (deckEditions.includes("energyThree") ? 3 : 0),
    stars: (deckEditions.includes("clever") ? 4 : 2)
      + (deckEditions.includes("starPlus") ? 1 : 0)
      + (deckEditions.includes("starThree") ? 3 : 0)
      + (deckEditions.includes("starFive") ? 5 : 0)
      + (startingForge.forged && deckEditions.includes("hammering") ? 1 : 0),
    deckEditions,
    evenDealOnReshuffle: false,
    preserveDefenseOnTurnEnd: false,
    activeRuleCards: [],
    message: "파일 배치 완료 — 맨 위 카드를 가져옵니다.",
  };
}
