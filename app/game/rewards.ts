import { rollFilledRareSlots } from "./rareSlotRules.ts";
import { rollRegionDeckShape, rollRegionFillerKind, type RegionDeckShape } from "./regionDeckRules.ts";
export { rollRegionDeckShape } from "./regionDeckRules.ts";
export type { RegionDeckShape } from "./regionDeckRules.ts";
import {
  BASIC_CARD_POOL,
  ALL_CARD_BLUEPRINTS,
  DEBUG_ALL_CARD_BLUEPRINTS,
  RARE_CARD_POOL,
  SPECIAL_CARD_POOL,
  STARTER_CARD_POOL,
  createRadianceCard,
  createRelicCard,
  createRockCard,
  createSlimeCard,
  createSoilCard,
  type Card,
  type CardBlueprint,
} from "./cards.ts";
import { createDeckName } from "./randomNames.ts";
import { TICKET_TIERS, TICKET_TYPES, type TicketType } from "./shopRules.ts";
import { STICKER_IDS, compatibleStickers, withRandomSticker } from "./stickers.ts";

export type DeckEdition =
  | "clever"
  | "roomy"
  | "lively"
  | "fantastic"
  | "rampaging"
  | "quickHammer"
  | "drawPlus"
  | "starPlus"
  | "energyPlus"
  | "persistentDraw"
  | "frugalPlus"
  | "defensiveStance"
  | "resistance"
  | "giant"
  | "whiteSpace"
  | "invincible"
  | "hammering"
  | "deckHighlander"
  | "starFive"
  | "energyThree"
  | "starThree";

export type DeckCase = {
  id: string;
  name: string;
  capacity: number;
  rareSlotCapacity: number;
  cards: Card[];
  editions: DeckEdition[];
  editionColors: Partial<Record<DeckEdition, string>>;
  /** Original generation rolls; kept when cards, capacity, or editions are edited. */
  generation?: Pick<RegionDeckShape, "x" | "y" | "z"> & { k: number; s: RegionDeckShape["sum"] };
};

export type ConsumableType =
  | "mindEyeTicket"
  | "darkTicket"
  | "bombTicket"
  | "cloneTicket"
  | "expandTicket"
  | "extractTicket"
  | "transformTicket"
  | "cardPack";

export type Consumable = {
  id: string;
  type: ConsumableType;
  name: string;
  description: string;
  armedMovesRemaining?: number;
};

export type ShopOffer = {
  id: string;
  price: number;
  currency?: "gold" | "hp";
  card?: Card;
  consumable?: Consumable;
  sold: boolean;
};

const STARTER_CARD_COPIES = 6;
export const STARTING_DECK_SIZE = STARTER_CARD_POOL.length * STARTER_CARD_COPIES + BASIC_CARD_POOL.length;
export const STARTER_DECK_CAPACITY = 25;
export const STARTER_DECK_RARE_SLOT_CAPACITY = 1;
export const DEBUG_ALL_CARDS_DECK_ID = "debug-all-cards";
export const DEBUG_STICKER_DECK_ID = "debug-sticker-catalog";

export const CONSUMABLE_TYPES: TicketType[] = [...TICKET_TYPES];

export function consumableTypeFromRoll(roll: number) {
  const weightedTypes = CONSUMABLE_TYPES.map((type) => ({
    type,
    weight: (1 / 3) ** (TICKET_TIERS[type] - 1),
  }));
  const totalWeight = weightedTypes.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.max(0, Math.min(.999999999, roll)) * totalWeight;
  for (const item of weightedTypes) {
    cursor -= item.weight;
    if (cursor < 0) return item.type;
  }
  return weightedTypes.at(-1)!.type;
}

export function createBattleRewardCard(id: number, rareChance: number): Card {
  const roll = Math.random();
  if (roll < rareChance) {
    const selected = RARE_CARD_POOL[Math.floor(Math.random() * RARE_CARD_POOL.length)];
    return { ...selected, id, revealed: false };
  }
  const nonRareRoll = Math.random();
  const pool = nonRareRoll < 0.3 / 0.95 ? BASIC_CARD_POOL : SPECIAL_CARD_POOL;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  return { ...selected, id, revealed: false };
}

export function createDeck(): Card[] {
  const make = (
    count: number,
    blueprint: CardBlueprint,
  ) => Array.from({ length: count }, () => ({ ...blueprint }));
  const blueprints: CardBlueprint[] = [
    ...STARTER_CARD_POOL,
    ...BASIC_CARD_POOL,
    ...STARTER_CARD_POOL.flatMap(blueprint => make(STARTER_CARD_COPIES - 1, blueprint)),
  ];
  if (blueprints.length !== STARTING_DECK_SIZE) {
    throw new Error(`Starting deck must contain ${STARTING_DECK_SIZE} cards.`);
  }
  return blueprints.map((card, id) => ({ ...card, id, revealed: false }));
}

export function createDebugAllCardsDeck(startId: number): { deck: DeckCase; nextCardId: number } {
  let nextCardId = startId;
  const cards = [
    ...DEBUG_ALL_CARD_BLUEPRINTS.map((blueprint) => ({ ...blueprint, id: nextCardId++, revealed: false })),
    createRadianceCard(nextCardId++),
    createSlimeCard(nextCardId++),
    createSoilCard(nextCardId++),
    createRockCard(nextCardId++),
    createRelicCard(nextCardId++),
  ];
  return {
    deck: {
      id: DEBUG_ALL_CARDS_DECK_ID,
      name: "ALL",
      capacity: cards.length,
      rareSlotCapacity: cards.filter((card) => card.rarity === "rare" || card.rarity === "legendary").length,
      cards,
      editions: [],
      editionColors: {},
    },
    nextCardId,
  };
}

export function createDebugStickerDeck(startId: number): { deck: DeckCase; nextCardId: number } {
  let nextCardId = startId;
  const availableBlueprints = [...ALL_CARD_BLUEPRINTS];
  const cards = STICKER_IDS.map((sticker) => {
    const blueprintIndex = availableBlueprints.findIndex((blueprint) => (
      compatibleStickers({ ...blueprint, id: -1, revealed: false }).includes(sticker)
    ));
    if (blueprintIndex < 0) {
      throw new Error(`No compatible debug card found for sticker: ${sticker}`);
    }
    const [blueprint] = availableBlueprints.splice(blueprintIndex, 1);
    return { ...blueprint, id: nextCardId++, revealed: false, sticker };
  });
  return {
    deck: {
      id: DEBUG_STICKER_DECK_ID,
      name: "스티커 도감",
      capacity: cards.length,
      rareSlotCapacity: cards.filter((card) => card.rarity === "rare" || card.rarity === "legendary").length,
      cards,
      editions: [],
      editionColors: {},
    },
    nextCardId,
  };
}

export const DECK_EDITION_INFO: Record<DeckEdition, { name: string; description: string }> = {
  clever: { name: "별++", description: "전투 시작 시 ★ 2개를 획득합니다." },
  roomy: { name: "추가 파일", description: "전투 시작 시 빈 파일을 1개 추가합니다." },
  lively: { name: "아드레날린", description: "전투 시작 시 아드레날린 카드를 1장 획득합니다." },
  fantastic: { name: "압축", description: "파일을 4장씩 쌓습니다." },
  rampaging: { name: "지속 에너지", description: "최대 에너지가 1 증가합니다." },
  quickHammer: { name: "빠른 망치", description: "전투 시작 시 덱의 재련 가능한 무작위 카드 1장을 재련합니다. 치환 합금과 흑요석 단검은 제외합니다." },
  drawPlus: { name: "드로우+", description: "전투 시작 시 무작위 파일에서 카드 1장을 뽑습니다." },
  starPlus: { name: "별+", description: "전투 시작 시 ★ 1개를 획득합니다." },
  energyPlus: { name: "에너지+", description: "전투 시작 시 에너지가 1 증가합니다." },
  persistentDraw: { name: "지속 드로우", description: "매 턴 시작 시 무작위 파일에서 카드 1장을 뽑습니다." },
  frugalPlus: { name: "재활용+", description: "턴 종료 시 남은 에너지 1당 ★ 2개를 획득합니다." },
  defensiveStance: { name: "방호 태세", description: "전투 시작 시 방어도 5를 획득합니다." },
  resistance: { name: "저항", description: "전투 시작 시 저항 2를 획득합니다." },
  giant: { name: "거인", description: "전투 시작 시 힘 3과 강인함 3을 획득합니다." },
  whiteSpace: { name: "여백의 미", description: "현재 빈 파일 하나당 힘 2를 획득합니다." },
  invincible: { name: "무적", description: "전투 시작 시 무적 1을 획득합니다." },
  hammering: { name: "망치질", description: "카드를 재련할 때마다 ★ 1개를 획득합니다." },
  deckHighlander: { name: "하이랜더", description: "전투 시작 시 중복 카드 없이 덱이 가득 차 있으면 최대 에너지가 1 증가합니다." },
  starFive: { name: "별+++++", description: "전투 시작 시 ★ 5개를 획득합니다." },
  energyThree: { name: "에너지+++", description: "전투 시작 시 에너지가 3 증가합니다." },
  starThree: { name: "별+++", description: "전투 시작 시 ★ 3개를 획득합니다." },
};

export const DECK_EDITION_SCORES: Record<DeckEdition, number> = {
  clever: 10,
  roomy: 5,
  lively: 50,
  fantastic: 60,
  rampaging: 50,
  quickHammer: 10,
  drawPlus: 5,
  starPlus: 5,
  energyPlus: 10,
  persistentDraw: 40,
  frugalPlus: 40,
  defensiveStance: 5,
  resistance: 30,
  giant: 50,
  whiteSpace: 30,
  invincible: 100,
  hammering: 30,
  deckHighlander: 30,
  starFive: 40,
  energyThree: 40,
  starThree: 20,
};

const EDITION_COLORS: Record<DeckEdition, string> = {
  clever: "#ef4444",
  roomy: "#f97316",
  lively: "#eab308",
  fantastic: "#84cc16",
  rampaging: "#06b6d4",
  quickHammer: "#e29842",
  drawPlus: "#6366f1",
  starPlus: "#8b5cf6",
  energyPlus: "#a855f7",
  persistentDraw: "#d946ef",
  frugalPlus: "#ec4899",
  defensiveStance: "#f43f5e",
  resistance: "#64748b",
  giant: "#7c3aed",
  whiteSpace: "#115e59",
  invincible: "#be123c",
  hammering: "#c2410c",
  deckHighlander: "#a16207",
  starFive: "#15803d",
  energyThree: "#0f766e",
  starThree: "#d4a017",
};

export function getDeckEditionColor(edition: DeckEdition) {
  return EDITION_COLORS[edition];
}

export function isDeckEdition(value: string): value is DeckEdition {
  return Object.hasOwn(DECK_EDITION_INFO, value);
}

export function getAvailableDeckEditions(selected: readonly DeckEdition[]): DeckEdition[] {
  const selectedSet = new Set(selected);
  return (Object.keys(DECK_EDITION_INFO) as DeckEdition[]).filter((edition) => (
    !selectedSet.has(edition)
  ));
}

export function createEditionColors(editions: DeckEdition[]) {
  return Object.fromEntries(editions.map((edition) => [
    edition,
    EDITION_COLORS[edition],
  ])) as Partial<Record<DeckEdition, string>>;
}

export function createStarterDeck(): DeckCase {
  return {
    id: "starter",
    name: "",
    capacity: STARTER_DECK_CAPACITY,
    rareSlotCapacity: STARTER_DECK_RARE_SLOT_CAPACITY,
    cards: createDeck(),
    editions: [],
    editionColors: {},
  };
}

export type DeckScoreBreakdown = {
  editionScore: number;
  cardScore: number;
  capacityScore: number;
  total: number;
};

export function calculateDeckCapacityScore(capacity: number) {
  const fiveCardSteps = Math.max(0, Math.floor((capacity - 15) / 5));
  return fiveCardSteps * 13;
}

export function calculateDeckScore(deck: Pick<DeckCase, "capacity" | "cards" | "editions">): DeckScoreBreakdown {
  const editionScore = deck.editions.reduce(
    (total, edition) => total + DECK_EDITION_SCORES[edition],
    0,
  );
  const cardScore = deck.cards.reduce((total, card) => (
    total + (card.rarity === "rare" ? 8 : 0)
  ), 0);
  const capacityScore = calculateDeckCapacityScore(deck.capacity);
  return {
    editionScore,
    cardScore,
    capacityScore,
    total: editionScore + cardScore + capacityScore,
  };
}

function randomItem<T>(pool: T[], random: () => number) {
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999999, random())) * pool.length));
  return pool[index];
}

function takeRandomBagItem<T>(bag: T[], random: () => number) {
  const index = Math.min(bag.length - 1, Math.floor(Math.max(0, Math.min(0.999999999, random())) * bag.length));
  return bag.splice(index, 1)[0];
}

function chooseWeightedEdition(editions: DeckEdition[], random: () => number) {
  const totalWeight = editions.reduce((total, edition) => total + DECK_EDITION_SCORES[edition] ** 1.2, 0);
  let cursor = Math.max(0, Math.min(0.999999999, random())) * totalWeight;
  for (const edition of editions) {
    cursor -= DECK_EDITION_SCORES[edition] ** 1.2;
    if (cursor < 0) return edition;
  }
  return editions.at(-1)!;
}

function addRegionDeckCard(cards: Card[], blueprint: CardBlueprint, nextCardId: number) {
  cards.push({ ...blueprint, id: nextCardId, revealed: false });
  return nextCardId + 1;
}

function generateRegionDeck(
  regionNumber: number,
  startCardId: number,
  random: () => number,
): { deck: DeckCase; nextCardId: number } {
  const shape = rollRegionDeckShape(regionNumber, random);
  const { capacity, rareSlotCapacity, editionBudget } = shape;
  const rareCount = rollFilledRareSlots(rareSlotCapacity, random);
  const cards: Card[] = [];
  let nextCardId = startCardId;
  let rareBag = [...RARE_CARD_POOL];
  for (let index = 0; index < rareCount; index += 1) {
    if (rareBag.length === 0) rareBag = [...RARE_CARD_POOL];
    nextCardId = addRegionDeckCard(cards, takeRandomBagItem(rareBag, random), nextCardId);
  }

  let remainingScore = editionBudget;
  const editions: DeckEdition[] = [];
  while (remainingScore >= 0) {
    const availableEditions = getAvailableDeckEditions(editions)
      .filter((edition) => DECK_EDITION_SCORES[edition] <= remainingScore);
    if (availableEditions.length === 0) break;
    const edition = chooseWeightedEdition(availableEditions, random);
    editions.push(edition);
    remainingScore -= DECK_EDITION_SCORES[edition];
  }

  const remainingSlots = capacity - rareSlotCapacity;
  for (let slot = 0; slot < remainingSlots; slot++) {
    const kind = rollRegionFillerKind(random);
    if (kind === "empty") continue;
    const pool = kind === "starter" ? STARTER_CARD_POOL : kind === "basic" ? BASIC_CARD_POOL : SPECIAL_CARD_POOL;
    nextCardId = addRegionDeckCard(cards, randomItem(pool, random), nextCardId);
  }

  return {
    nextCardId,
    deck: {
      id: `region-${regionNumber}-${startCardId}`,
      name: createDeckName(capacity),
      capacity,
      rareSlotCapacity,
      cards,
      editions,
      editionColors: createEditionColors(editions),
      generation: { k: Math.max(1, Math.floor(regionNumber)), s: shape.sum, x: shape.x, y: shape.y, z: shape.z },
    },
  };
}

export function createRegionDeck(
  regionNumber: number,
  startId: number,
  capacityBonus = 0,
  random: () => number = Math.random,
  stickerChance = 0,
): DeckCase {
  const { deck } = generateRegionDeck(regionNumber, startId, random);
  return {
    ...deck,
    cards: stickerChance > 0 ? deck.cards.map(card => withRandomSticker(card, stickerChance, random)) : deck.cards,
    id: `found-r${regionNumber}-${startId}-${Math.random().toString(36).slice(2, 8)}`,
    capacity: deck.capacity + capacityBonus,
  };
}

export function createConsumable(type: ConsumableType, id: string): Consumable {
  if (type === "mindEyeTicket") {
    return { id, type, name: "심안 티켓", description: "20번 이동하는 동안 시야 거리 +2를 얻습니다." };
  }
  if (type === "darkTicket") {
    return { id, type, name: "어둠 티켓", description: "20턴 동안 적의 인식 거리가 1 감소합니다." };
  }
  if (type === "bombTicket") {
    return { id, type, name: "폭탄 티켓", description: "점화한 뒤 바닥에 내려놓으면 3번 이동 후 폭발합니다." };
  }
  if (type === "cloneTicket") {
    return { id, type, name: "복제 티켓", description: "카드나 티켓 하나를 복제합니다." };
  }
  if (type === "expandTicket") {
    return { id, type, name: "확장 티켓", description: "덱에 드래그해 희귀 슬롯을 1 늘립니다." };
  }
  if (type === "extractTicket") {
    return { id, type, name: "추출 티켓", description: "덱에서 희귀도를 가리지 않고 카드 1장을 추출합니다." };
  }
  if (type === "transformTicket") {
    return { id, type, name: "변환 티켓", description: "카드는 같은 희귀도의 다른 카드로, 티켓은 티어와 관계없이 다른 무작위 티켓으로 바꿉니다." };
  }
  if (type === "cardPack") {
    return { id, type, name: "카드 팩", description: "카드 5개를 얻습니다." };
  }
  throw new Error(`Unknown consumable: ${type}`);
}

export function createBattleReward(
  regionNumber: number,
  nextCardId: number,
  capacityBonus = 0,
  rareCardChance = 0.05,
  forceDeck = false,
) {
  const decks = forceDeck
    ? [createRegionDeck(regionNumber, nextCardId, capacityBonus)]
    : [];
  return {
    keys: 1,
    cards: decks.length > 0 ? [] : [withRandomSticker(createBattleRewardCard(nextCardId, rareCardChance), 0.05)],
    decks,
    consumableType: null,
    consumableTypes: [],
  };
}

export function createBossBattleReward(
  nextCardId: number,
  bonusDeckRegion?: number,
  capacityBonus = 0,
) {
  const decks = bonusDeckRegion === undefined
    ? []
    : [createRegionDeck(bonusDeckRegion, nextCardId + 2, capacityBonus)];
  return {
    keys: 0,
    cards: [0, 1].map(offset => withRandomSticker(createBattleRewardCard(nextCardId + offset, 1), 1)),
    decks,
    consumableType: null,
    consumableTypes: [],
  };
}
