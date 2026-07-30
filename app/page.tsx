"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  actionSummary,
  applyPlayerAttack,
  chooseNextIntent,
  createSewerEncounter,
  createSewerEncounterByIndex,
  getSewerEncounterLabel,
  SEWER_ENCOUNTER_COUNT,
  type EnemyAction,
  type EnemyState,
} from "./game/enemies";
import {
  advanceMapEnemies,
  awarenessSymbol,
  chebyshevDistance,
  EIGHT_DIRECTIONS,
  isInPlayerVision,
  MAP_PLAYER_VISION_HORIZONTAL_RADIUS,
  MAP_PLAYER_VISION_VERTICAL_RADIUS,
  createMapEnemyWorld,
  type MapEnemyWorld,
} from "./game/mapEnemies";

type CardKind = "strike" | "defend" | "skill";
type DamageType = "physical" | "magic";
type CardRarity = "basic" | "special" | "rare";
type CardEffect =
  | "strike"
  | "pommel"
  | "defend"
  | "deflect"
  | "steelHeart"
  | "battlePlan"
  | "prepare"
  | "sweep"
  | "drawEachPile"
  | "focus"
  | "rulerCompass"
  | "berserk"
  | "transcend"
  | "rapidFire"
  | "iceShield"
  | "ironWave"
  | "waterWave"
  | "ironRampage";
type Phase = "drawing" | "playing" | "discarding" | "enemy-turn";
type Screen = "map" | "battle";
type MapPosition = { x: number; y: number };
type RoomType =
  | "void"
  | "rock"
  | "empty"
  | "shop"
  | "portal"
  | "heal"
  | "safePortal";
type DeckEditorArea = "deck" | "inventory" | "floor" | "trash";
type DeckSortMode = "cost" | "rarity";
type DeckCase = { id: string; name: string; capacity: number; cards: Card[] };
type PendingRemovedCard = { card: Card; deckId: string };
type ConsumableType = "extractTicket" | "swiftTicket" | "paintTicket";
type Consumable = {
  id: string;
  type: ConsumableType;
  name: string;
  description: string;
};
type ConsumableArea = "inventory" | "floor";
type ShopOffer = {
  id: string;
  price: number;
  card?: Card;
  consumable?: Consumable;
  sold: boolean;
};

type Card = {
  id: number;
  kind: CardKind;
  effect: CardEffect;
  rarity: CardRarity;
  name: string;
  cost: number;
  value: number;
  draw: number;
  damageType: DamageType;
  revealed: boolean;
  colored?: boolean;
};

type DeckEditorSnapshot = {
  roomKey: string;
  decks: DeckCase[];
  activeDeckId: string;
  inventory: Card[];
  consumables: Consumable[];
  floorCards: Card[];
  floorConsumables: Consumable[];
  floorDecks: DeckCase[];
};

type GameState = {
  piles: Card[][];
  hand: Card[];
  discard: Card[];
  energy: number;
  stars: number;
  pendingDraws: number;
  pendingDiscards: number;
  pendingSweep: boolean;
  turn: number;
  playerHp: number;
  playerPhysicalBlock: number;
  playerMagicBlock: number;
  strength: number;
  defenseMultiplier: number;
  damageTakenMultiplier: number;
  invulnerable: boolean;
  doubleNextAttack: boolean;
  enemies: EnemyState[];
  status: "playing" | "won" | "lost";
  message: string;
  history: string[];
};

type DragState = {
  card: Card;
  cards: Card[];
  source: { type: "hand" } | { type: "pile"; pileIndex: number; cardIndex: number };
  x: number;
  y: number;
  moved: boolean;
};

type DamagePopup = {
  key: string;
  text: string;
};

const MAX_PLAYER_HP = 30;
const STARTING_DECK_SIZE = 16;
const INVENTORY_CAPACITY = 20;
const MAX_OWNED_DECKS = 3;
const STARTER_DECK_CAPACITY = 20;
const REGION_COUNT = 7;
const REGION_NAMES = [
  "하수구",
  "이름 미정 지역",
  "이름 미정 지역",
  "이름 미정 지역",
  "이름 미정 지역",
  "이름 미정 지역",
  "이름 미정 지역",
] as const;
const ROCK_BARRIER_HEIGHT = 5;
const SHOP_NODE_CHANCE = 0.005;
const PORTAL_NODE_CHANCE = 0.05;
const ROCK_CLUSTER_CHANCE = 0.03;
const ROCK_CLUSTER_EDGE_CHANCE = 0.05;
const FLOOR_CARD_DROP_CHANCE = 0.01;
const DUNGEON_MIN_X = -80;
const DUNGEON_MAX_X = 80;
const SAFE_AREA_START_X = 60;
const SAFE_AREA_ENTRY_X = SAFE_AREA_START_X + 1;
const SAFE_AREA_HEAL_X = SAFE_AREA_START_X + 2;
const SAFE_AREA_PORTAL_X = SAFE_AREA_START_X + 3;
const MAP_COLUMNS = DUNGEON_MAX_X - DUNGEON_MIN_X + 1;
const MAP_ROWS = (REGION_COUNT * (REGION_COUNT + 1) / 2) * 10
  + (REGION_COUNT - 1) * ROCK_BARRIER_HEIGHT;
const MAP_WORLD_MARGIN_X = 5;
const MAP_WORLD_MARGIN_Y = 5;
const MAP_RENDER_COLUMNS = MAP_COLUMNS + MAP_WORLD_MARGIN_X * 2;
const MAP_RENDER_ROWS = MAP_ROWS + MAP_WORLD_MARGIN_Y * 2;
const MAP_ROOM_WIDTH = 204;
const MAP_ROOM_HEIGHT = 136;
const MAP_CELL_GAP = 20;
const MAP_PADDING = 42;
const MAP_MIN_ZOOM = 0.45;
const MAP_MAX_ZOOM = 1.35;
const MAP_ZOOM_STEP = 0.1;
const MAP_TRAVEL_STEP_MS = 140;
const MAP_COLLISION_OVERLAP_MS = 280;
const MAP_BATTLE_FLASH_MS = 1000;
const MAP_START: MapPosition = { x: 0, y: 0 };
const CARD_HEIGHT = 144;
const PILE_HEIGHT = 226;
const DEFAULT_STACK_OFFSET = 18;
const MAX_STACK_TRAVEL = PILE_HEIGHT - CARD_HEIGHT;

function getStackOffset(cardCount: number) {
  if (cardCount <= 1) return DEFAULT_STACK_OFFSET;
  return Math.min(DEFAULT_STACK_OFFSET, MAX_STACK_TRAVEL / (cardCount - 1));
}

function mapRoomKey(position: MapPosition) {
  return `${position.x}:${position.y}`;
}

function parseMapRoomKey(roomKey: string): MapPosition {
  const [x, y] = roomKey.split(":").map(Number);
  return { x, y };
}

function seededRoll(position: MapPosition, seed: number, salt = 0) {
  let hash = Math.imul(position.x + 17 + salt, 374761393)
    ^ Math.imul(position.y + 29, 668265263)
    ^ Math.imul(seed + 11, 1442695041);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

function createRandomMapSeed() {
  const randomValue = new Uint32Array(1);
  globalThis.crypto.getRandomValues(randomValue);
  return (randomValue[0] ^ Date.now()) >>> 0;
}

function regionStartY(regionIndex: number) {
  return (regionIndex * (regionIndex + 1) / 2) * 10
    + regionIndex * ROCK_BARRIER_HEIGHT;
}

function regionHeight(regionIndex: number) {
  return (regionIndex + 1) * 10;
}

function getDungeonRegionIndex(position: MapPosition) {
  if (
    position.x < DUNGEON_MIN_X
    || position.x > DUNGEON_MAX_X
    || position.y < 0
  ) return null;
  for (let regionIndex = 0; regionIndex < REGION_COUNT; regionIndex += 1) {
    const startY = regionStartY(regionIndex);
    if (position.y >= startY && position.y < startY + regionHeight(regionIndex)) {
      return regionIndex;
    }
  }
  return null;
}

function safeAreaCenterY(regionIndex: number) {
  return regionStartY(regionIndex) + Math.floor(regionHeight(regionIndex) / 2);
}

function getSafeAreaRegionIndex(position: MapPosition) {
  for (let regionIndex = 0; regionIndex < REGION_COUNT; regionIndex += 1) {
    const centerY = safeAreaCenterY(regionIndex);
    if (
      position.y === centerY
      && position.x >= SAFE_AREA_ENTRY_X
      && position.x <= SAFE_AREA_PORTAL_X
    ) return regionIndex;
  }
  return null;
}

function isSafeAreaPosition(position: MapPosition) {
  return getSafeAreaRegionIndex(position) !== null;
}

function safeAreaEntry(regionIndex: number): MapPosition {
  return { x: SAFE_AREA_ENTRY_X, y: safeAreaCenterY(regionIndex) };
}

function nextRegionEntry(regionIndex: number): MapPosition {
  return {
    x: 0,
    y: regionStartY(Math.min(REGION_COUNT - 1, regionIndex + 1)),
  };
}

function isPortalColumn(x: number, regionIndex: number, seed: number) {
  const bottomY = regionStartY(regionIndex) + regionHeight(regionIndex) - 1;
  const candidates = Array.from(
    { length: DUNGEON_MAX_X - DUNGEON_MIN_X + 1 },
    (_, index) => DUNGEON_MIN_X + index,
  )
    .filter((column) =>
      seededRoll({ x: column, y: bottomY }, seed, regionIndex + 101) < PORTAL_NODE_CHANCE);
  if (candidates.length > 0) return candidates.includes(x);
  const fallback = DUNGEON_MIN_X + Math.floor(
    seededRoll({ x: regionIndex, y: bottomY }, seed, 911)
      * (DUNGEON_MAX_X - DUNGEON_MIN_X + 1),
  );
  return x === fallback;
}

function isNormalDungeonFloor(position: MapPosition, seed: number) {
  const regionIndex = getDungeonRegionIndex(position);
  if (regionIndex === null || chebyshevDistance(position, MAP_START) <= 1) return false;
  const localY = position.y - regionStartY(regionIndex);
  if (localY === 0 && position.x === 0) return false;
  if (localY === regionHeight(regionIndex) - 1 && isPortalColumn(position.x, regionIndex, seed)) {
    return false;
  }
  const portalEligible = localY === regionHeight(regionIndex) - 1;
  const availableChance = portalEligible ? 1 - PORTAL_NODE_CHANCE : 1;
  return seededRoll(position, seed) >= SHOP_NODE_CHANCE / availableChance;
}

function isRockClusterCell(position: MapPosition, seed: number) {
  for (let anchorY = position.y - 1; anchorY <= position.y + 1; anchorY += 1) {
    for (let anchorX = position.x - 1; anchorX <= position.x + 1; anchorX += 1) {
      const anchor = { x: anchorX, y: anchorY };
      const regionIndex = getDungeonRegionIndex(anchor);
      if (regionIndex === null) continue;
      const localY = anchor.y - regionStartY(regionIndex);
      const nearRegionEdge = localY < regionHeight(regionIndex) / 3
        || localY >= regionHeight(regionIndex) * 2 / 3;
      const chance = nearRegionEdge ? ROCK_CLUSTER_EDGE_CHANCE : ROCK_CLUSTER_CHANCE;
      if (seededRoll(anchor, seed, 7101) >= chance) continue;

      const neighborOffsets = EIGHT_DIRECTIONS
        .map((offset) => ({ ...offset }))
        .sort((left, right) =>
          seededRoll({ x: anchor.x + left.x, y: anchor.y + left.y }, seed, 7103)
          - seededRoll({ x: anchor.x + right.x, y: anchor.y + right.y }, seed, 7103));
      const clusterSize = 1 + Math.floor(seededRoll(anchor, seed, 7102) * 7);
      const clusterCells = [anchor, ...neighborOffsets.slice(0, clusterSize - 1).map((offset) => ({
        x: anchor.x + offset.x,
        y: anchor.y + offset.y,
      }))];
      const containsPosition = clusterCells.some((cell) =>
        cell.x === position.x && cell.y === position.y);
      if (!containsPosition) continue;
      if (clusterCells.every((cell) => isNormalDungeonFloor(cell, seed))) return true;
    }
  }
  return false;
}

function getRoomType(position: MapPosition, seed: number): RoomType {
  if (position.x === MAP_START.x && position.y === MAP_START.y) return "empty";
  const safeRegion = getSafeAreaRegionIndex(position);
  if (safeRegion !== null) {
    if (position.x === SAFE_AREA_ENTRY_X) return "shop";
    if (position.x === SAFE_AREA_HEAL_X) return "heal";
    return "safePortal";
  }
  for (let regionIndex = 0; regionIndex < REGION_COUNT; regionIndex += 1) {
    const centerY = safeAreaCenterY(regionIndex);
    const inSafeWall =
      position.x >= SAFE_AREA_START_X - 1
      && position.x <= SAFE_AREA_PORTAL_X + 2
      && position.y >= centerY - 1
      && position.y <= centerY + 1;
    if (inSafeWall) return "rock";
  }
  if (
    position.x >= DUNGEON_MIN_X
    && position.x <= DUNGEON_MAX_X
  ) {
    if (position.y >= -ROCK_BARRIER_HEIGHT && position.y < 0) return "rock";
    const regionIndex = getDungeonRegionIndex(position);
    if (regionIndex !== null) {
      const localY = position.y - regionStartY(regionIndex);
      if (localY === 0 && position.x === 0) return "empty";
      if (
        localY === regionHeight(regionIndex) - 1
        && isPortalColumn(position.x, regionIndex, seed)
      ) return "portal";
      const portalEligible = localY === regionHeight(regionIndex) - 1;
      const availableChance = portalEligible ? 1 - PORTAL_NODE_CHANCE : 1;
      const roll = seededRoll(position, seed);
      if (roll < SHOP_NODE_CHANCE / availableChance) return "shop";
      if (isRockClusterCell(position, seed)) return "rock";
      return "empty";
    }
    for (let regionIndex = 0; regionIndex < REGION_COUNT - 1; regionIndex += 1) {
      const barrierStart = regionStartY(regionIndex) + regionHeight(regionIndex);
      if (
        position.y >= barrierStart
        && position.y < barrierStart + ROCK_BARRIER_HEIGHT
      ) return "rock";
    }
  }
  return "void";
}

function isWalkableRoom(type: RoomType) {
  return type !== "rock" && type !== "void";
}

function visibleMapRoomKeys(center: MapPosition, seed: number) {
  const keys = new Set<string>();
  for (let offsetY = -MAP_PLAYER_VISION_VERTICAL_RADIUS; offsetY <= MAP_PLAYER_VISION_VERTICAL_RADIUS; offsetY += 1) {
    for (let offsetX = -MAP_PLAYER_VISION_HORIZONTAL_RADIUS; offsetX <= MAP_PLAYER_VISION_HORIZONTAL_RADIUS; offsetX += 1) {
      const position = { x: center.x + offsetX, y: center.y + offsetY };
      if (getRoomType(position, seed) !== "void") keys.add(mapRoomKey(position));
    }
  }
  return keys;
}

function isMapEnemySpawnCell(position: MapPosition, seed: number) {
  return chebyshevDistance(position, MAP_START) > 1
    && getDungeonRegionIndex(position) !== null
    && getRoomType(position, seed) === "empty";
}

function createPreGeneratedMapEnemyWorld(seed: number) {
  const spawnCells: MapPosition[] = [];
  for (let y = 0; y < MAP_ROWS; y += 1) {
    for (let x = DUNGEON_MIN_X; x <= DUNGEON_MAX_X; x += 1) {
      const position = { x, y };
      if (isMapEnemySpawnCell(position, seed)) spawnCells.push(position);
    }
  }
  return createMapEnemyWorld(spawnCells, seed, SEWER_ENCOUNTER_COUNT);
}

function createPreGeneratedMapFloorDrops(seed: number) {
  const cards: Record<string, Card[]> = {};
  const consumables: Record<string, Consumable[]> = {};
  let cardIndex = 0;
  for (let y = 0; y < MAP_ROWS; y += 1) {
    for (let x = DUNGEON_MIN_X; x <= DUNGEON_MAX_X; x += 1) {
      const position = { x, y };
      if (getRoomType(position, seed) !== "empty") continue;
      if (seededRoll(position, seed, 7201) >= FLOOR_CARD_DROP_CHANCE) continue;
      const roomKey = mapRoomKey(position);
      if (seededRoll(position, seed, 7202) < 0.3) {
        const weightedPool = [...SPECIAL_CARD_POOL, ...RARE_CARD_POOL, ...RARE_CARD_POOL];
        const blueprint = weightedPool[Math.floor(seededRoll(position, seed, 7203) * weightedPool.length)];
        cards[roomKey] = [{ ...blueprint, id: 100_000 + cardIndex, revealed: false }];
        cardIndex += 1;
      } else {
        const ticketRoll = seededRoll(position, seed, 7203);
        const type: ConsumableType = ticketRoll < 1 / 3
          ? "extractTicket"
          : ticketRoll < 2 / 3 ? "swiftTicket" : "paintTicket";
        consumables[roomKey] = [createConsumable(type, `map-ticket-${position.x}-${position.y}`)];
      }
    }
  }
  return { cards, consumables };
}

function buildKnownRoomRoutes(
  start: MapPosition,
  knownRooms: Set<string>,
  seed: number,
) {
  const startKey = mapRoomKey(start);
  const previous = new Map<string, string | null>([[startKey, null]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = mapRoomKey(next);
      if (previous.has(nextKey) || !knownRooms.has(nextKey)) continue;
      if (!isWalkableRoom(getRoomType(next, seed))) continue;
      previous.set(nextKey, mapRoomKey(current));
      queue.push(next);
    }
  }
  return previous;
}

function routeToRoom(target: MapPosition, routes: Map<string, string | null>) {
  const targetKey = mapRoomKey(target);
  if (!routes.has(targetKey)) return null;
  const reversed: MapPosition[] = [];
  let cursor: string | null = targetKey;
  while (cursor) {
    reversed.push(parseMapRoomKey(cursor));
    cursor = routes.get(cursor) ?? null;
  }
  return reversed.reverse();
}

function getRegionNumber(position: MapPosition) {
  const dungeonRegion = getDungeonRegionIndex(position);
  if (dungeonRegion !== null) return dungeonRegion + 1;
  const safeRegion = getSafeAreaRegionIndex(position);
  return (safeRegion ?? 0) + 1;
}

const ATTACK_LABEL: Record<DamageType, string> = {
  physical: "공격",
  magic: "마법 공격",
};
const DEFENSE_LABEL: Record<DamageType, string> = {
  physical: "방어",
  magic: "마법 방어",
};

function getRegionName(position: MapPosition) {
  const dungeonRegion = getDungeonRegionIndex(position);
  if (dungeonRegion !== null) return REGION_NAMES[dungeonRegion];
  const safeRegion = getSafeAreaRegionIndex(position);
  return REGION_NAMES[safeRegion ?? 0];
}

type CardBlueprint = Omit<Card, "id" | "revealed">;

const BASIC_CARD_POOL: CardBlueprint[] = [
  { kind: "strike", effect: "strike", rarity: "basic", name: "타격", cost: 1, value: 6, draw: 0, damageType: "physical" },
  { kind: "defend", effect: "defend", rarity: "basic", name: "방어", cost: 1, value: 5, draw: 0, damageType: "physical" },
  { kind: "defend", effect: "defend", rarity: "basic", name: "마법 방어", cost: 1, value: 5, draw: 0, damageType: "magic" },
];

const SPECIAL_CARD_POOL: CardBlueprint[] = [
  { kind: "strike", effect: "pommel", rarity: "special", name: "폼멜 타격", cost: 1, value: 6, draw: 1, damageType: "physical" },
  { kind: "defend", effect: "deflect", rarity: "special", name: "흘려보내기", cost: 1, value: 5, draw: 1, damageType: "physical" },
  { kind: "skill", effect: "battlePlan", rarity: "special", name: "전투 설계", cost: 1, value: 0, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "prepare", rarity: "special", name: "예비", cost: 0, value: 0, draw: 1, damageType: "physical" },
  { kind: "skill", effect: "sweep", rarity: "special", name: "뽑아내기", cost: 1, value: 0, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "drawEachPile", rarity: "special", name: "걷어내기", cost: 1, value: 0, draw: 0, damageType: "physical" },
  { kind: "strike", effect: "rulerCompass", rarity: "special", name: "자와 컴퍼스", cost: 1, value: 6, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "berserk", rarity: "special", name: "광폭화", cost: 0, value: 0, draw: 0, damageType: "physical" },
  { kind: "defend", effect: "iceShield", rarity: "special", name: "얼음 방패", cost: 1, value: 8, draw: 0, damageType: "magic" },
  { kind: "strike", effect: "ironWave", rarity: "special", name: "철의 파동", cost: 1, value: 5, draw: 0, damageType: "physical" },
  { kind: "strike", effect: "waterWave", rarity: "special", name: "물의 파동", cost: 1, value: 5, draw: 0, damageType: "magic" },
  { kind: "strike", effect: "ironRampage", rarity: "special", name: "무쇠 난동", cost: 2, value: 8, draw: 0, damageType: "physical" },
  { kind: "strike", effect: "strike", rarity: "special", name: "몽둥이질", cost: 3, value: 30, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "focus", rarity: "special", name: "집중", cost: 0, value: 0, draw: 0, damageType: "physical" },
];

const RARE_CARD_POOL: CardBlueprint[] = [
  { kind: "skill", effect: "steelHeart", rarity: "rare", name: "강철심장", cost: 1, value: 0, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "transcend", rarity: "rare", name: "초월", cost: 4, value: 0, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "rapidFire", rarity: "rare", name: "연사", cost: 1, value: 0, draw: 0, damageType: "physical" },
];

function createBattleRewardCard(id: number): Card {
  const weightedPool = [
    ...SPECIAL_CARD_POOL.map((card) => ({ card, weight: 1 })),
    ...RARE_CARD_POOL.map((card) => ({ card, weight: 0.5 })),
  ];
  const totalWeight = weightedPool.reduce((total, entry) => total + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  const selected = weightedPool.find((entry) => {
    roll -= entry.weight;
    return roll < 0;
  }) ?? weightedPool.at(-1)!;
  return { ...selected.card, id, revealed: false };
}

function createDeck(): Card[] {
  const make = (
    count: number,
    blueprint: CardBlueprint,
  ) => Array.from({ length: count }, () => ({ ...blueprint }));
  const blueprints: CardBlueprint[] = [
    ...make(8, BASIC_CARD_POOL[0]),
    ...make(6, BASIC_CARD_POOL[1]),
    ...make(2, BASIC_CARD_POOL[2]),
  ];
  if (blueprints.length !== STARTING_DECK_SIZE) {
    throw new Error(`Starting deck must contain ${STARTING_DECK_SIZE} cards.`);
  }
  return blueprints.map((card, id) => ({ ...card, id, revealed: false }));
}

function createStarterDeck(): DeckCase {
  return { id: "starter", name: "시작 덱 케이스", capacity: STARTER_DECK_CAPACITY, cards: createDeck() };
}

function rollDeckTier(regionNumber: number) {
  const roll = Math.random();
  const offset = roll < 0.25 ? -1 : roll < 0.75 ? 0 : roll < 0.95 ? 1 : 2;
  return Math.max(0, regionNumber - 1 + offset);
}

function createRandomDeck(regionNumber: number, startId: number): DeckCase {
  const tier = rollDeckTier(regionNumber);
  const capacity = 20 + tier * 5;
  const cards: Card[] = [];
  let nextId = startId;
  for (let slot = 0; slot < capacity; slot += 1) {
    const roll = Math.random();
    let pool: CardBlueprint[] | null = null;
    if (roll < 0.5) pool = null;
    else if (roll < 0.75) pool = BASIC_CARD_POOL;
    else if (roll < 0.95) pool = SPECIAL_CARD_POOL;
    else pool = RARE_CARD_POOL;
    if (!pool) continue;
    const blueprint = pool[Math.floor(Math.random() * pool.length)];
    cards.push({ ...blueprint, id: nextId, revealed: false });
    nextId += 1;
  }
  return {
    id: `found-r${regionNumber}-${startId}-${Math.random().toString(36).slice(2, 8)}`,
    name: "발견한 덱 케이스",
    capacity,
    cards,
  };
}

function createConsumable(type: ConsumableType, id: string): Consumable {
  return type === "extractTicket"
    ? {
        id,
        type,
        name: "추출 티켓",
        description: "덱의 카드 1장을 추출하여 인벤토리로 되돌립니다.",
      }
    : type === "paintTicket"
      ? {
        id,
        type,
        name: "색칠 티켓",
        description: "덱의 카드 1장을 색칠합니다.",
      }
      : {
        id,
        type,
        name: "신속 티켓",
        description: "에너지 1을 소모하여 카드 1장을 드로우합니다.",
      };
}

function createBattleReward(
  regionNumber: number,
  nextCardId: number,
  deckDropChance: number,
) {
  const gold = 1 + Math.floor(Math.random() * Math.max(1, regionNumber));
  const decks = Math.random() < deckDropChance
    ? [createRandomDeck(regionNumber, nextCardId)]
    : [];
  return {
    gold,
    cards: decks.length > 0 ? [] : [createBattleRewardCard(nextCardId), createBattleRewardCard(nextCardId + 1)],
    decks,
    consumableType: Math.random() < 0.5
      ? (["extractTicket", "swiftTicket", "paintTicket"] as const)[Math.floor(Math.random() * 3)]
      : null,
  };
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function buildPiles(cards: Card[]): Card[][] {
  const piles: Card[][] = [];
  for (let index = 0; index < cards.length; index += 5) {
    const pile = cards.slice(index, index + 5).map((card) => ({ ...card, revealed: false }));
    if (pile.length > 0) pile[pile.length - 1].revealed = true;
    piles.push(pile);
  }
  return piles;
}

function drawFromPiles(piles: Card[][]) {
  const nextPiles = piles.map((pile) => [...pile]);
  const hand: Card[] = [];
  nextPiles.forEach((pile) => {
    const card = pile.pop();
    if (card) hand.push({ ...card, revealed: true });
    if (pile.length > 0) {
      pile[pile.length - 1] = { ...pile[pile.length - 1], revealed: true };
    }
  });
  return { piles: nextPiles, hand };
}

function waitingState(
  playerHp = MAX_PLAYER_HP,
  enemies: EnemyState[] = createSewerEncounter(),
): GameState {
  return {
    piles: [],
    hand: [],
    discard: [],
    energy: 3,
    stars: 2,
    pendingDraws: 0,
    pendingDiscards: 0,
    pendingSweep: false,
    turn: 1,
    playerHp,
    playerPhysicalBlock: 0,
    playerMagicBlock: 0,
    strength: 0,
    defenseMultiplier: 1,
    damageTakenMultiplier: 1,
    invulnerable: false,
    doubleNextAttack: false,
    enemies,
    status: "playing",
    message: "카드를 준비하고 있습니다.",
    history: [],
  };
}

function dealtState(
  playerHp = MAX_PLAYER_HP,
  deck = createDeck(),
  enemies: EnemyState[] = createSewerEncounter(),
): GameState {
  return {
    ...waitingState(playerHp, enemies),
    piles: buildPiles(shuffle(deck.map((card) => ({ ...card, revealed: false })))),
    message: "파일 배치 완료 — 맨 위 카드를 가져옵니다.",
  };
}

function CardFace({ card }: { card: Card }) {
  const effectText = (() => {
    switch (card.effect) {
      case "strike":
        return <span className="effect-type damage">피해 {card.value}</span>;
      case "pommel":
        return <><span className="effect-type damage">피해 {card.value}</span><span>1 드로우</span></>;
      case "defend":
        return <span className={`effect-type ${card.damageType}`}>{DEFENSE_LABEL[card.damageType]} {card.value}</span>;
      case "deflect":
        return <><span className="effect-type physical">방어 {card.value}</span><span>1 드로우</span></>;
      case "steelHeart":
        return <span>이번 턴 동안 얻는<br /><span className="effect-type physical">방어</span>/<span className="effect-type magic">마법 방어</span> 3배</span>;
      case "battlePlan":
        return <span>★★★를 얻습니다</span>;
      case "prepare":
        return <span>1장 뽑고<br />1장 버립니다</span>;
      case "focus":
        return <span>에너지 1 획득<br />카드 1장 버림</span>;
      case "sweep":
        return <span>파일 하나를 전부<br />손으로 가져옵니다</span>;
      case "drawEachPile":
        return <span>모든 파일에서<br />1장씩 뽑습니다</span>;
      case "rulerCompass":
        return <><span className="effect-type damage">피해 {card.value}</span><span>★를 얻습니다</span></>;
      case "berserk":
        return <span>에너지 2 획득<br />이번 턴 받는 피해 2배</span>;
      case "transcend":
        return <span>이번 턴 피해 면역<br />힘 5를 얻습니다</span>;
      case "rapidFire":
        return <span>다음 공격 카드가<br />한 번 더 발동</span>;
      case "iceShield":
        return <><span className="effect-type magic">마법 방어 {card.value}</span><span>★를 얻습니다</span></>;
      case "ironWave":
        return <><span className="effect-type damage">피해 {card.value}</span><span className="effect-type physical">방어 5</span></>;
      case "waterWave":
        return <><span className="effect-type damage">피해 {card.value}</span><span className="effect-type magic">마법 방어 5</span></>;
      case "ironRampage":
        return <><span className="effect-type damage">적 전체 피해 {card.value}</span><span className="effect-type physical">방어 5</span></>;
    }
  })();
  return (
    <>
      <span className="card-cost">{card.cost}</span>
      <strong className={`card-name rarity-${card.rarity} ${card.colored ? "is-painted" : ""} ${card.name.length >= 6 ? "is-long" : ""}`}>{card.name}</strong>
      <span className="card-effect">{effectText}</span>
    </>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("map");
  const [runPlayerHp, setRunPlayerHp] = useState(MAX_PLAYER_HP);
  const [mapSeed, setMapSeed] = useState(1);
  const [mapPosition, setMapPosition] = useState<MapPosition>(MAP_START);
  const [seenRooms, setSeenRooms] = useState<Set<string>>(
    () => new Set([mapRoomKey(MAP_START)]),
  );
  const [mapEnemyWorld, setMapEnemyWorld] = useState<MapEnemyWorld>(() => ({
    enemies: [],
  }));
  const [activeMapEnemyIds, setActiveMapEnemyIds] = useState<string[]>([]);
  const [activeBattleRoom, setActiveBattleRoom] = useState<string | null>(null);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [mapZoom, setMapZoom] = useState(1);
  const [mapTraveling, setMapTraveling] = useState(false);
  const [mapTravelStepMs, setMapTravelStepMs] = useState(MAP_TRAVEL_STEP_MS);
  const [mapCollisionEnemyIds, setMapCollisionEnemyIds] = useState<string[]>([]);
  const [mapBattleFlash, setMapBattleFlash] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [mapMessage, setMapMessage] = useState("");
  const [mapMessageNonce, setMapMessageNonce] = useState(0);
  const [ownedDecks, setOwnedDecks] = useState<DeckCase[]>(() => [createStarterDeck()]);
  const [activeDeckId, setActiveDeckId] = useState("starter");
  const [inventoryCards, setInventoryCards] = useState<Card[]>([]);
  const [inventoryConsumables, setInventoryConsumables] = useState<Consumable[]>([]);
  const [roomDrops, setRoomDrops] = useState<Record<string, Card[]>>({});
  const [roomConsumableDrops, setRoomConsumableDrops] = useState<Record<string, Consumable[]>>({});
  const [roomDeckDrops, setRoomDeckDrops] = useState<Record<string, DeckCase[]>>({});
  const [roomShops, setRoomShops] = useState<Record<string, ShopOffer[]>>({});
  const [shopOpen, setShopOpen] = useState(false);
  const [activeShopRoom, setActiveShopRoom] = useState<string | null>(null);
  const [shopMessage, setShopMessage] = useState("필요한 물건을 골라보세요.");
  const [gold, setGold] = useState(0);
  const [battleRewards, setBattleRewards] = useState<Card[]>([]);
  const [battleRewardDecks, setBattleRewardDecks] = useState<DeckCase[]>([]);
  const [battleRewardConsumables, setBattleRewardConsumables] = useState<Consumable[]>([]);
  const [battleRewardGold, setBattleRewardGold] = useState(0);
  const [deckEditorOpen, setDeckEditorOpen] = useState(false);
  const [deckViewerOpen, setDeckViewerOpen] = useState(false);
  const [deckViewerDeckId, setDeckViewerDeckId] = useState("");
  const [deckEditorDrag, setDeckEditorDrag] = useState<{ cardId: number; source: DeckEditorArea } | null>(null);
  const deckEditorDragRef = useRef<{ cardId: number; source: DeckEditorArea } | null>(null);
  const [deckEditorDropTarget, setDeckEditorDropTarget] = useState<DeckEditorArea | null>(null);
  const [consumableDrag, setConsumableDrag] = useState<{ id: string; source: ConsumableArea } | null>(null);
  const consumableDragRef = useRef<{ id: string; source: ConsumableArea } | null>(null);
  const [pendingExtractionTicketId, setPendingExtractionTicketId] = useState<string | null>(null);
  const [pendingPaintTicketId, setPendingPaintTicketId] = useState<string | null>(null);
  const [deckCaseDrag, setDeckCaseDrag] = useState<{ deckId: string; source: "floor" | "owned" } | null>(null);
  const deckCaseDragRef = useRef<{ deckId: string; source: "floor" | "owned" } | null>(null);
  const [deckCaseDropSlot, setDeckCaseDropSlot] = useState<number | null>(null);
  const [deckSortMode, setDeckSortMode] = useState<DeckSortMode>("cost");
  const [, setDeckEditorMessage] = useState("바닥 카드는 좌클릭으로 인벤토리와 덱으로 옮길 수 있습니다. 원래 덱 카드는 휴지통에서만 제거합니다.");
  const [deckEditorSnapshot, setDeckEditorSnapshot] = useState<DeckEditorSnapshot | null>(null);
  const [pendingRemovedCards, setPendingRemovedCards] = useState<PendingRemovedCard[]>([]);
  const [hoveredDeckCard, setHoveredDeckCard] = useState<Card | null>(null);
  const [game, setGame] = useState<GameState>(waitingState);
  const [phase, setPhase] = useState<Phase>("drawing");
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [lockedEnemyId, setLockedEnemyId] = useState<string | null>(null);
  const [attackingEnemyId, setAttackingEnemyId] = useState<string | null>(null);
  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);
  const nextCardIdRef = useRef(STARTING_DECK_SIZE);
  const nextConsumableIdRef = useRef(1);
  const deckDropChanceRef = useRef(0.25);
  const activeDeck = ownedDecks.find((deck) => deck.id === activeDeckId) ?? ownedDecks[0];
  const deckCards = activeDeck?.cards ?? [];
  const showMapMessage = (message: string) => {
    setMapMessage(message);
    setMapMessageNonce((current) => current + 1);
  };
  const toggleDebugMode = () => {
    if (debugMode) {
      setDebugMode(false);
      return;
    }
    if (window.prompt("디버그 비밀번호") === "6384") setDebugMode(true);
  };
  const updateActiveDeckCards = (updater: Card[] | ((cards: Card[]) => Card[])) => {
    setOwnedDecks((current) => current.map((deck) => {
      if (deck.id !== activeDeckId) return deck;
      const cards = typeof updater === "function" ? updater(deck.cards) : updater;
      return { ...deck, cards };
    }));
  };
  const inventoryItemCount = inventoryCards.length + inventoryConsumables.length;

  const nextConsumable = (type: ConsumableType) => {
    const id = `consumable-${nextConsumableIdRef.current}`;
    nextConsumableIdRef.current += 1;
    return createConsumable(type, id);
  };
  const grantBattleReward = (regionNumber: number) => {
    const reward = createBattleReward(regionNumber, nextCardIdRef.current, deckDropChanceRef.current);
    const generatedCardCount = reward.cards.length + reward.decks.reduce((total, deck) => total + deck.cards.length, 0);
    nextCardIdRef.current += generatedCardCount;
    deckDropChanceRef.current = reward.decks.length > 0
      ? 0.25
      : Math.min(1, deckDropChanceRef.current + 0.05);
    setBattleRewardGold(reward.gold);
    setBattleRewards(reward.cards);
    setBattleRewardDecks(reward.decks);
    setBattleRewardConsumables(reward.consumableType ? [nextConsumable(reward.consumableType)] : []);
  };

  const createShopStock = (depth: number): ShopOffer[] => {
    const makeCardOffer = (rarity: "special" | "rare", slot: number): ShopOffer => {
      const pool = rarity === "rare" ? RARE_CARD_POOL : SPECIAL_CARD_POOL;
      const blueprint = pool[Math.floor(Math.random() * pool.length)];
      const card = { ...blueprint, id: nextCardIdRef.current, revealed: false };
      nextCardIdRef.current += 1;
      return {
        id: `shop-card-${depth}-${slot}-${card.id}`,
        price: rarity === "rare" ? 9 + Math.floor(depth / 5) : 5 + Math.floor(depth / 8),
        card,
        sold: false,
      };
    };
    const consumables = Array.from({ length: 2 }, (_, slot) => {
      const ticketRoll = Math.random();
      const type: ConsumableType = ticketRoll < 1 / 3
        ? "extractTicket"
        : ticketRoll < 2 / 3 ? "swiftTicket" : "paintTicket";
      const consumable = nextConsumable(type);
      return {
        id: `shop-item-${depth}-${slot}-${consumable.id}`,
        price: type === "extractTicket" ? 5 : type === "paintTicket" ? 4 : 3,
        consumable,
        sold: false,
      };
    });
    return [
      ...consumables,
      makeCardOffer("special", 2),
      makeCardOffer("special", 3),
      makeCardOffer("rare", 4),
    ];
  };

  const openShop = (roomKey: string, depth: number) => {
    if (!roomShops[roomKey]) {
      const stock = createShopStock(depth);
      setRoomShops((current) => ({ ...current, [roomKey]: stock }));
    }
    setActiveShopRoom(roomKey);
    setShopMessage("필요한 물건을 골라보세요.");
    setShopOpen(true);
  };

  const buyShopOffer = (offerId: string) => {
    if (!activeShopRoom) return;
    const offer = (roomShops[activeShopRoom] ?? []).find((item) => item.id === offerId);
    if (!offer || offer.sold) return;
    if (inventoryItemCount >= INVENTORY_CAPACITY) {
      setShopMessage(`인벤토리가 가득 찼습니다. 카드와 소모품을 합쳐 ${INVENTORY_CAPACITY}개까지 보관할 수 있습니다.`);
      return;
    }
    if (gold < offer.price) {
      setShopMessage(`${offer.price - gold}G가 부족합니다.`);
      return;
    }
    setGold((current) => current - offer.price);
    if (offer.card) setInventoryCards((current) => [...current, offer.card!]);
    if (offer.consumable) setInventoryConsumables((current) => [...current, offer.consumable!]);
    setRoomShops((current) => ({
      ...current,
      [activeShopRoom]: (current[activeShopRoom] ?? []).map((item) =>
        item.id === offerId ? { ...item, sold: true } : item),
    }));
    setShopMessage(`${offer.card?.name ?? offer.consumable?.name}을(를) 구매했습니다.`);
  };
  const pendingOriginsRef = useRef(new Map<number, DOMRect>());
  const handCardRefs = useRef(new Map<number, HTMLButtonElement>());
  const dragRef = useRef<DragState & { startX: number; startY: number } | null>(null);
  const timersRef = useRef<number[]>([]);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const mapTravelTimerRef = useRef<number | null>(null);
  const mapDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const mapWasDraggedRef = useRef(false);

  const later = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  };

  const drawCards = () => {
    const origins = new Map<number, DOMRect>();
    document.querySelectorAll<HTMLElement>("[data-top-card-id]").forEach((element) => {
      const cardId = Number(element.dataset.topCardId);
      origins.set(cardId, element.getBoundingClientRect());
    });
    pendingOriginsRef.current = origins;
    setPhase("drawing");
    setGame((current) => {
      const draw = drawFromPiles(current.piles);
      return {
        ...current,
        piles: draw.piles,
        hand: draw.hand,
        energy: 3,
        pendingDraws: 0,
        pendingDiscards: 0,
        pendingSweep: false,
        playerPhysicalBlock: 0,
        playerMagicBlock: 0,
        defenseMultiplier: 1,
        damageTakenMultiplier: 1,
        invulnerable: false,
        message: `${draw.hand.length}장을 각 파일에서 가져왔습니다.`,
        history: [`${current.turn}턴: ${draw.hand.length}장 드로우`, ...current.history].slice(0, 5),
      };
    });
  };

  const clearBattleTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const clearMapTravel = () => {
    if (mapTravelTimerRef.current !== null) {
      window.clearTimeout(mapTravelTimerRef.current);
      mapTravelTimerRef.current = null;
    }
    setMapCollisionEnemyIds([]);
    setMapBattleFlash(false);
    setMapTraveling(false);
  };

  const rememberPlayerVision = (position: MapPosition, seed = mapSeed) => {
    const visibleKeys = visibleMapRoomKeys(position, seed);
    setSeenRooms((current) => new Set([...current, ...visibleKeys]));
  };

  const startBattle = (
    encounterIndexes: number[],
    playerHp = runPlayerHp,
  ) => {
    clearBattleTimers();
    clearMapTravel();
    setDeckEditorOpen(false);
    setDeckViewerOpen(false);
    setDragging(null);
    setLockedEnemyId(null);
    setAttackingEnemyId(null);
    setDamagePopup(null);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    setPhase("drawing");
    setGame(dealtState(
      playerHp,
      deckCards,
      encounterIndexes.flatMap((encounterIndex) => createSewerEncounterByIndex(encounterIndex)),
    ));
    setScreen("battle");
    later(drawCards, 360);
  };

  useEffect(() => {
    const seedTimer = window.setTimeout(() => {
      const nextSeed = createRandomMapSeed();
      setMapSeed(nextSeed);
      setMapEnemyWorld(createPreGeneratedMapEnemyWorld(nextSeed));
      const floorDrops = createPreGeneratedMapFloorDrops(nextSeed);
      setRoomDrops(floorDrops.cards);
      setRoomConsumableDrops(floorDrops.consumables);
      setSeenRooms(visibleMapRoomKeys(MAP_START, nextSeed));
    }, 0);
    return () => {
      window.clearTimeout(seedTimer);
      clearBattleTimers();
      if (mapTravelTimerRef.current !== null) window.clearTimeout(mapTravelTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mapMessage) return;
    const messageTimer = window.setTimeout(() => setMapMessage(""), 1300);
    return () => window.clearTimeout(messageTimer);
  }, [mapMessage, mapMessageNonce]);

  const centerMapOn = (position: MapPosition) => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    const roomCenterX = MAP_PADDING
      + (position.x - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X) * (MAP_ROOM_WIDTH + MAP_CELL_GAP)
      + MAP_ROOM_WIDTH / 2;
    const roomCenterY = MAP_PADDING
      + (position.y + MAP_WORLD_MARGIN_Y) * (MAP_ROOM_HEIGHT + MAP_CELL_GAP)
      + MAP_ROOM_HEIGHT / 2;
    setMapPan({
      x: viewport.clientWidth / 2 - roomCenterX * mapZoom,
      y: viewport.clientHeight / 2 - roomCenterY * mapZoom,
    });
  };

  const focusMapOn = (position: MapPosition) => {
    window.requestAnimationFrame(() => centerMapOn(position));
  };

  const activateRoomFeature = (position: MapPosition) => {
    const roomType = getRoomType(position, mapSeed);
    if (roomType === "heal") {
      setRunPlayerHp(MAX_PLAYER_HP);
    }
  };

  const useCurrentPortal = () => {
    const roomType = getRoomType(mapPosition, mapSeed);
    if (roomType === "portal") {
      const regionIndex = getDungeonRegionIndex(mapPosition);
      if (regionIndex === null) return;
      const destination = safeAreaEntry(regionIndex);
      setMapPosition(destination);
      rememberPlayerVision(destination);
      focusMapOn(destination);
      return;
    }
    if (roomType !== "safePortal") return;
    const regionIndex = getSafeAreaRegionIndex(mapPosition);
    if (regionIndex === null) return;
    if (regionIndex >= REGION_COUNT - 1) return;
    const destination = nextRegionEntry(regionIndex);
    setMapPosition(destination);
    rememberPlayerVision(destination);
    focusMapOn(destination);
  };

  const resolveMapStep = (
    currentPosition: MapPosition,
    nextPosition: MapPosition,
    world: MapEnemyWorld,
  ) => {
    const roomKey = mapRoomKey(nextPosition);
    const playerCollisions = world.enemies.filter((enemy) =>
      mapRoomKey(enemy.position) === roomKey);
    if (playerCollisions.length > 0) {
      return { world, collisionEnemies: playerCollisions };
    }

    const enemyTurn = advanceMapEnemies(
      world.enemies,
      currentPosition,
      nextPosition,
      (position) => isWalkableRoom(getRoomType(position, mapSeed)),
    );
    const nextWorld = {
      ...world,
      enemies: enemyTurn.enemies,
    };
    const collisionEnemies = enemyTurn.enemies.filter((enemy) =>
      enemyTurn.collisionEnemyIds.includes(enemy.id));
    return { world: nextWorld, collisionEnemies };
  };

  const beginMapEnemyBattle = (enemies: { id: string; encounterIndex: number }[], roomKey: string) => {
    setActiveMapEnemyIds(enemies.map((enemy) => enemy.id));
    setActiveBattleRoom(roomKey);
    startBattle(enemies.map((enemy) => enemy.encounterIndex), runPlayerHp);
  };

  const animateMapCollision = (enemies: { id: string; encounterIndex: number }[], roomKey: string) => {
    setMapCollisionEnemyIds(enemies.map((enemy) => enemy.id));
    setMapTraveling(true);
    mapTravelTimerRef.current = window.setTimeout(() => {
      setMapBattleFlash(true);
      mapTravelTimerRef.current = window.setTimeout(() => {
        mapTravelTimerRef.current = null;
        setMapBattleFlash(false);
        setMapCollisionEnemyIds([]);
        beginMapEnemyBattle(enemies, roomKey);
      }, MAP_BATTLE_FLASH_MS);
    }, MAP_COLLISION_OVERLAP_MS);
  };

  const moveOnMap = (deltaX: number, deltaY: number) => {
    if (screen !== "map" || mapTraveling) return;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) !== 1) return;
    const nextPosition = {
      x: mapPosition.x + deltaX,
      y: mapPosition.y + deltaY,
    };
    if (!isWalkableRoom(getRoomType(nextPosition, mapSeed))) return;
    const roomKey = mapRoomKey(nextPosition);
    const result = resolveMapStep(mapPosition, nextPosition, mapEnemyWorld);
    setMapPosition(nextPosition);
    rememberPlayerVision(nextPosition);
    setMapEnemyWorld(result.world);
    if (result.collisionEnemies.length > 0) {
      animateMapCollision(result.collisionEnemies, roomKey);
      return;
    }
    activateRoomFeature(nextPosition);
  };

  const spendMapTurn = () => {
    if (screen !== "map" || mapTraveling) return;
    const roomKey = mapRoomKey(mapPosition);
    const result = resolveMapStep(mapPosition, mapPosition, mapEnemyWorld);
    setMapEnemyWorld(result.world);
    if (result.collisionEnemies.length > 0) {
      animateMapCollision(result.collisionEnemies, roomKey);
      return;
    }
  };

  const waitOnMap = () => {
    spendMapTurn();
  };

  const travelSafePath = (path: MapPosition[]) => {
    if (screen !== "map" || mapTraveling || path.length < 2) return;
    if (mapEnemyWorld.enemies.some((enemy) =>
      isInPlayerVision(enemy.position, mapPosition))) {
      showMapMessage("적이 시야 안에 있습니다! (빠른 이동 불가)");
      return;
    }

    const stepDuration = Math.max(70, Math.round(MAP_TRAVEL_STEP_MS / Math.sqrt(path.length - 1)));
    setMapTravelStepMs(stepDuration);
    setMapTraveling(true);
    let currentPosition = mapPosition;
    let currentWorld = mapEnemyWorld;
    let stepIndex = 1;
    const advance = () => {
      const nextPosition = path[stepIndex];
      const roomKey = mapRoomKey(nextPosition);
      const result = resolveMapStep(currentPosition, nextPosition, currentWorld);
      currentPosition = nextPosition;
      currentWorld = result.world;
      setMapPosition(nextPosition);
      rememberPlayerVision(nextPosition);
      setMapEnemyWorld(result.world);

      if (result.collisionEnemies.length > 0) {
        mapTravelTimerRef.current = null;
        animateMapCollision(result.collisionEnemies, roomKey);
        return;
      }
      if (result.world.enemies.some((enemy) =>
        isInPlayerVision(enemy.position, nextPosition))) {
        mapTravelTimerRef.current = null;
        setMapTraveling(false);
        showMapMessage("적을 발견해 빠른 이동이 중지 되었습니다.");
        return;
      }

      stepIndex += 1;
      if (stepIndex < path.length) {
        mapTravelTimerRef.current = window.setTimeout(advance, stepDuration);
      } else {
        mapTravelTimerRef.current = null;
        setMapTraveling(false);
        activateRoomFeature(nextPosition);
      }
    };
    advance();
  };

  const returnToMap = () => {
    const battleRoom = activeBattleRoom;
    if (battleRoom) {
      const landingDrops = [...(roomDrops[battleRoom] ?? []), ...battleRewards];
      setRoomDrops((current) => ({
        ...current,
        [battleRoom]: landingDrops,
      }));
      setGold((current) => current + battleRewardGold);
    }
    if (activeMapEnemyIds.length > 0 && battleRoom) {
      setMapEnemyWorld((current) => ({
        ...current,
        enemies: current.enemies.filter((enemy) => !activeMapEnemyIds.includes(enemy.id)),
      }));
      if (battleRewardDecks.length > 0) setRoomDeckDrops((current) => ({
        ...current,
        [battleRoom]: [...(current[battleRoom] ?? []), ...battleRewardDecks],
      }));
      if (battleRewardConsumables.length > 0) setRoomConsumableDrops((current) => ({
        ...current,
        [battleRoom]: [...(current[battleRoom] ?? []), ...battleRewardConsumables],
      }));
    }
    const roomType = getRoomType(mapPosition, mapSeed);
    setRunPlayerHp(roomType === "heal" ? MAX_PLAYER_HP : game.playerHp);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    setActiveMapEnemyIds([]);
    setActiveBattleRoom(null);
    setScreen("map");
  };

  const startNewRun = () => {
    clearBattleTimers();
    clearMapTravel();
    const nextSeed = createRandomMapSeed();
    const starterDeck = createStarterDeck();
    setRunPlayerHp(MAX_PLAYER_HP);
    setMapSeed(nextSeed);
    setMapPosition(MAP_START);
    setMapMessage("");
    setSeenRooms(visibleMapRoomKeys(MAP_START, nextSeed));
    setMapEnemyWorld(createPreGeneratedMapEnemyWorld(nextSeed));
    setActiveMapEnemyIds([]);
    setActiveBattleRoom(null);
    setOwnedDecks([starterDeck]);
    setActiveDeckId(starterDeck.id);
    setInventoryCards([]);
    setInventoryConsumables([]);
    const floorDrops = createPreGeneratedMapFloorDrops(nextSeed);
    setRoomDrops(floorDrops.cards);
    setRoomConsumableDrops(floorDrops.consumables);
    setRoomDeckDrops({});
    setRoomShops({});
    setShopOpen(false);
    setActiveShopRoom(null);
    setGold(0);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    deckDropChanceRef.current = 0.25;
    setDeckEditorOpen(false);
    setDeckViewerOpen(false);
    setDeckEditorSnapshot(null);
    setPendingRemovedCards([]);
    setHoveredDeckCard(null);
    setPendingExtractionTicketId(null);
    nextCardIdRef.current = STARTING_DECK_SIZE;
    nextConsumableIdRef.current = 1;
    setGame(waitingState());
    setPhase("drawing");
    setScreen("map");
  };

  const originalDeckIdForCard = (cardId: number) => {
    for (const deck of deckEditorSnapshot?.decks ?? []) {
      if (deck.cards.some((card) => card.id === cardId)) return deck.id;
    }
    for (const deck of deckEditorSnapshot?.floorDecks ?? []) {
      if (deck.cards.some((card) => card.id === cardId)) return deck.id;
    }
    return null;
  };

  const moveDeckCardToTrash = (cardId: number) => {
    const originalDeckId = originalDeckIdForCard(cardId);
    if (!originalDeckId) {
      setDeckEditorMessage("편집 중 덱에 넣은 카드는 휴지통이 아니라 인벤토리나 바닥으로 돌릴 수 있습니다.");
      return;
    }
    if (deckCards.length <= 1) {
      setDeckEditorMessage("덱에는 반드시 카드가 1장 이상 있어야 합니다.");
      return;
    }
    const card = deckCards.find((item) => item.id === cardId);
    if (!card || !activeDeck) return;
    updateActiveDeckCards((current) => current.filter((item) => item.id !== cardId));
    setPendingRemovedCards((current) => [...current, { card, deckId: originalDeckId }]);
    setHoveredDeckCard(null);
    setDeckEditorMessage(`${card.name}을(를) 휴지통에 넣었습니다. 편집 확인 시 영구 제거됩니다.`);
  };

  const restoreRemovedCard = (cardId: number) => {
    const pending = pendingRemovedCards.find((item) => item.card.id === cardId);
    if (!pending) return;
    const targetDeck = ownedDecks.find((deck) => deck.id === pending.deckId);
    if (!targetDeck || targetDeck.cards.length >= targetDeck.capacity) {
      setDeckEditorMessage("해당 덱에 빈 칸이 없어 제거를 취소할 수 없습니다.");
      return;
    }
    setPendingRemovedCards((current) => current.filter((item) => item.card.id !== cardId));
    setOwnedDecks((current) => current.map((deck) => deck.id === pending.deckId
      ? { ...deck, cards: [...deck.cards, pending.card] }
      : deck));
    setActiveDeckId(pending.deckId);
    setDeckEditorMessage(`${pending.card.name} 제거를 취소하고 덱으로 돌렸습니다.`);
  };

  const moveDeckCardToInventory = (cardId: number) => {
    if (originalDeckIdForCard(cardId) && !isSafeAreaPosition(mapPosition)) {
      setDeckEditorMessage("편집 시작 때 덱에 있던 카드는 휴지통으로만 옮길 수 있습니다.");
      return;
    }
    if (deckCards.length <= 1) {
      setDeckEditorMessage("덱에는 반드시 카드가 1장 이상 있어야 합니다.");
      return;
    }
    const card = deckCards.find((item) => item.id === cardId);
    if (!card) return;
    updateActiveDeckCards((current) => current.filter((item) => item.id !== cardId));
    setInventoryCards((current) => [...current, card]);
    setDeckEditorMessage(`${card.name}을(를) 인벤토리로 돌렸습니다.`);
  };

  const moveDeckCardToFloor = (cardId: number) => {
    if (originalDeckIdForCard(cardId) && !isSafeAreaPosition(mapPosition)) {
      setDeckEditorMessage("편집 시작 때 덱에 있던 카드는 휴지통으로만 옮길 수 있습니다.");
      return;
    }
    if (deckCards.length <= 1) {
      setDeckEditorMessage("덱에는 반드시 카드가 1장 이상 있어야 합니다.");
      return;
    }
    const card = deckCards.find((item) => item.id === cardId);
    if (!card) return;
    const roomKey = mapRoomKey(mapPosition);
    updateActiveDeckCards((current) => current.filter((item) => item.id !== cardId));
    setRoomDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), card],
    }));
    setDeckEditorMessage(`${card.name}을(를) 방 바닥으로 돌렸습니다.`);
  };

  const moveInventoryCardToDeck = (cardId: number) => {
    if (!activeDeck || deckCards.length >= activeDeck.capacity) {
      setDeckEditorMessage(`${activeDeck?.name ?? "현재 덱"}에는 더 이상 카드를 넣을 수 없습니다.`);
      return;
    }
    const card = inventoryCards.find((item) => item.id === cardId);
    if (!card) return;
    setInventoryCards((current) => current.filter((item) => item.id !== cardId));
    updateActiveDeckCards((current) => [...current, card]);
    setDeckEditorMessage(`${card.name}을(를) 덱에 넣었습니다.`);
  };

  const moveInventoryCardToFloor = (cardId: number) => {
    const card = inventoryCards.find((item) => item.id === cardId);
    if (!card) return;
    const roomKey = mapRoomKey(mapPosition);
    setInventoryCards((current) => current.filter((item) => item.id !== cardId));
    setRoomDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), card],
    }));
    setDeckEditorMessage(`${card.name}을(를) 바닥에 놓았습니다.`);
  };

  const moveFloorCardToInventory = (cardId: number) => {
    const roomKey = mapRoomKey(mapPosition);
    const card = (roomDrops[roomKey] ?? []).find((item) => item.id === cardId);
    if (!card) return;
    setRoomDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).filter((item) => item.id !== cardId),
    }));
    setInventoryCards((current) => [...current, card]);
    setDeckEditorMessage(`${card.name}을(를) 인벤토리에 주웠습니다.`);
  };

  const moveFloorCardToDeck = (cardId: number) => {
    if (!activeDeck || deckCards.length >= activeDeck.capacity) {
      setDeckEditorMessage(`${activeDeck?.name ?? "현재 덱"}에는 더 이상 카드를 넣을 수 없습니다.`);
      return;
    }
    const roomKey = mapRoomKey(mapPosition);
    const card = (roomDrops[roomKey] ?? []).find((item) => item.id === cardId);
    if (!card) return;
    setRoomDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).filter((item) => item.id !== cardId),
    }));
    updateActiveDeckCards((current) => [...current, card]);
    setDeckEditorMessage(`${card.name}을(를) 바닥에서 덱에 넣었습니다.`);
  };

  const moveFloorConsumableToInventory = (consumableId: string) => {
    const roomKey = mapRoomKey(mapPosition);
    const consumable = (roomConsumableDrops[roomKey] ?? []).find((item) => item.id === consumableId);
    if (!consumable) return;
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).filter((item) => item.id !== consumableId),
    }));
    setInventoryConsumables((current) => [...current, consumable]);
    setDeckEditorMessage(`${consumable.name}을(를) 인벤토리에 주웠습니다.`);
  };

  const moveInventoryConsumableToFloor = (consumableId: string) => {
    const consumable = inventoryConsumables.find((item) => item.id === consumableId);
    if (!consumable) return;
    const roomKey = mapRoomKey(mapPosition);
    setInventoryConsumables((current) => current.filter((item) => item.id !== consumableId));
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), consumable],
    }));
    if (pendingExtractionTicketId === consumableId) setPendingExtractionTicketId(null);
    setDeckEditorMessage(`${consumable.name}을(를) 바닥에 놓았습니다.`);
  };

  const beginConsumableDrag = (
    event: ReactDragEvent<HTMLElement>,
    id: string,
    source: ConsumableArea,
  ) => {
    const drag = { id, source };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `consumable:${source}:${id}`);
    consumableDragRef.current = drag;
    setConsumableDrag(drag);
  };

  const finishConsumableDrag = () => {
    consumableDragRef.current = null;
    setConsumableDrag(null);
  };

  const dropConsumable = (event: ReactDragEvent<HTMLElement>, target: ConsumableArea) => {
    const drag = consumableDragRef.current ?? consumableDrag;
    if (!drag || drag.source === target) return;
    event.preventDefault();
    event.stopPropagation();
    if (drag.source === "floor" && target === "inventory") moveFloorConsumableToInventory(drag.id);
    if (drag.source === "inventory" && target === "floor") moveInventoryConsumableToFloor(drag.id);
    finishConsumableDrag();
  };

  const selectExtractionTicket = (consumable: Consumable) => {
    if (consumable.type === "paintTicket") {
      setPendingPaintTicketId((current) => current === consumable.id ? null : consumable.id);
      setPendingExtractionTicketId(null);
      setDeckEditorMessage(
        pendingPaintTicketId === consumable.id ? "색칠을 취소했습니다." : "색칠할 덱 카드 1장을 클릭하세요.",
      );
      return;
    }
    if (consumable.type !== "extractTicket") {
      setDeckEditorMessage("신속 티켓은 전투 중에 사용할 수 있습니다.");
      return;
    }
    setPendingExtractionTicketId((current) => current === consumable.id ? null : consumable.id);
    setPendingPaintTicketId(null);
    setDeckEditorMessage(
      pendingExtractionTicketId === consumable.id
        ? "추출을 취소했습니다."
        : "추출할 덱 카드 1장을 클릭하세요.",
    );
  };

  const extractDeckCard = (cardId: number) => {
    if (!pendingExtractionTicketId) return;
    if (deckCards.length <= 1) {
      setDeckEditorMessage("덱에는 반드시 카드가 1장 이상 있어야 합니다.");
      return;
    }
    const card = deckCards.find((item) => item.id === cardId);
    if (!card) return;
    setInventoryConsumables((current) =>
      current.filter((item) => item.id !== pendingExtractionTicketId));
    updateActiveDeckCards((current) => current.filter((item) => item.id !== cardId));
    setInventoryCards((current) => [...current, card]);
    setPendingExtractionTicketId(null);
    setDeckEditorMessage(`${card.name}을(를) 추출하여 인벤토리로 되돌렸습니다.`);
  };

  const consumeSwiftTicket = (consumableId: string) => {
    const ticket = inventoryConsumables.find((item) =>
      item.id === consumableId && item.type === "swiftTicket");
    if (!ticket || phase !== "playing" || game.status !== "playing") return;
    if (game.energy < 1) {
      setGame((current) => ({ ...current, message: "신속 티켓을 사용하려면 에너지 1이 필요합니다." }));
      return;
    }
    if (game.piles.every((pile) => pile.length === 0)) {
      setGame((current) => ({ ...current, message: "드로우할 파일 카드가 없습니다." }));
      return;
    }
    setInventoryConsumables((current) => current.filter((item) => item.id !== consumableId));
    setGame((current) => ({
      ...current,
      energy: current.energy - 1,
      pendingDraws: current.pendingDraws + 1,
      message: "신속 티켓 사용: 드로우할 파일을 선택하세요.",
      history: ["신속 티켓 사용", ...current.history].slice(0, 5),
    }));
  };

  const pickUpFloorDeck = (deckId: string) => {
    if (ownedDecks.length >= MAX_OWNED_DECKS) {
      setDeckEditorMessage(`덱은 최대 ${MAX_OWNED_DECKS}개까지 보유할 수 있습니다.`);
      return;
    }
    const roomKey = mapRoomKey(mapPosition);
    const deck = (roomDeckDrops[roomKey] ?? []).find((item) => item.id === deckId);
    if (!deck) return;
    setRoomDeckDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).filter((item) => item.id !== deckId),
    }));
    setOwnedDecks((current) => [...current, deck]);
    setDeckEditorMessage(`${deck.name}을(를) 주웠습니다. 보유 덱 ${ownedDecks.length + 1} / ${MAX_OWNED_DECKS}`);
  };

  const paintDeckCard = (cardId: number) => {
    if (!pendingPaintTicketId) return;
    const card = deckCards.find((item) => item.id === cardId);
    if (!card) return;
    setInventoryConsumables((current) => current.filter((item) => item.id !== pendingPaintTicketId));
    updateActiveDeckCards((current) => current.map((item) => item.id === cardId ? { ...item, colored: true } : item));
    setPendingPaintTicketId(null);
    setDeckEditorMessage(`${card.name}을(를) 색칠했습니다.`);
  };

  const quickPickUpFloorItems = () => {
    const roomKey = mapRoomKey(mapPosition);
    const floorCards = roomDrops[roomKey] ?? [];
    const floorConsumables = roomConsumableDrops[roomKey] ?? [];
    const floorDecks = roomDeckDrops[roomKey] ?? [];
    const freeItemSlots = Math.max(0, INVENTORY_CAPACITY - inventoryItemCount);
    const pickedCards = floorCards.slice(0, freeItemSlots);
    const pickedConsumables = floorConsumables.slice(0, freeItemSlots - pickedCards.length);
    const pickedDecks = floorDecks.slice(0, Math.max(0, MAX_OWNED_DECKS - ownedDecks.length));
    if (pickedCards.length > 0) {
      setRoomDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).filter((card) => !pickedCards.some((item) => item.id === card.id)),
      }));
      setInventoryCards((current) => [...current, ...pickedCards]);
    }
    if (pickedConsumables.length > 0) {
      setRoomConsumableDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).filter((item) => !pickedConsumables.some((picked) => picked.id === item.id)),
      }));
      setInventoryConsumables((current) => [...current, ...pickedConsumables]);
    }
    if (pickedDecks.length > 0) {
      setRoomDeckDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).filter((deck) => !pickedDecks.some((picked) => picked.id === deck.id)),
      }));
      setOwnedDecks((current) => [...current, ...pickedDecks]);
    }
    const pickedCount = pickedCards.length + pickedConsumables.length + pickedDecks.length;
    if (pickedCount > 0) {
      spendMapTurn();
    }
  };

  const dropOwnedDeck = (deckId: string) => {
    if (ownedDecks.length <= 1) {
      setDeckEditorMessage("마지막 덱은 바닥에 놓을 수 없습니다.");
      return;
    }
    if (pendingRemovedCards.some((item) => item.deckId === deckId)) {
      setDeckEditorMessage("제거 예정 카드를 먼저 복구하거나 편집을 확인한 뒤 이 덱을 내려놓으세요.");
      return;
    }
    const deck = ownedDecks.find((item) => item.id === deckId);
    if (!deck) return;
    const remainingDecks = ownedDecks.filter((item) => item.id !== deckId);
    const roomKey = mapRoomKey(mapPosition);
    setOwnedDecks(remainingDecks);
    setRoomDeckDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), deck],
    }));
    if (activeDeckId === deckId) setActiveDeckId(remainingDecks[0].id);
    setHoveredDeckCard(null);
    setDeckEditorMessage(`${deck.name}을(를) 방 바닥에 놓았습니다.`);
  };

  const beginDeckEditorDrag = (
    event: ReactDragEvent<HTMLElement>,
    cardId: number,
    source: DeckEditorArea,
  ) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${source}:${cardId}`);
    deckEditorDragRef.current = { cardId, source };
    setDeckEditorDrag({ cardId, source });
    setDeckEditorDropTarget(null);
  };

  const dropDeckEditorCard = (event: ReactDragEvent<HTMLElement>, target: DeckEditorArea) => {
    event.preventDefault();
    const [payloadSource, payloadId] = event.dataTransfer.getData("text/plain").split(":");
    const source = deckEditorDragRef.current?.source ?? deckEditorDrag?.source ?? (payloadSource as DeckEditorArea);
    const cardId = deckEditorDragRef.current?.cardId ?? deckEditorDrag?.cardId ?? Number(payloadId);
    if (source !== target && Number.isInteger(cardId)) {
      if (source === "inventory" && target === "deck") moveInventoryCardToDeck(cardId);
      else if (source === "inventory" && target === "floor") moveInventoryCardToFloor(cardId);
      else if (source === "floor" && target === "inventory") moveFloorCardToInventory(cardId);
      else if (source === "floor" && target === "deck") moveFloorCardToDeck(cardId);
      else if (source === "deck" && target === "inventory") moveDeckCardToInventory(cardId);
      else if (source === "deck" && target === "floor") moveDeckCardToFloor(cardId);
      else if (source === "deck" && target === "trash") moveDeckCardToTrash(cardId);
      else if (source === "trash" && target === "deck") restoreRemovedCard(cardId);
    }
    deckEditorDragRef.current = null;
    setDeckEditorDrag(null);
    setDeckEditorDropTarget(null);
  };

  const finishDeckEditorDrag = () => {
    deckEditorDragRef.current = null;
    setDeckEditorDrag(null);
    setDeckEditorDropTarget(null);
  };

  const beginDeckCaseDrag = (
    event: ReactDragEvent<HTMLElement>,
    deckId: string,
    source: "floor" | "owned",
  ) => {
    const drag = { deckId, source };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `deck-case:${source}:${deckId}`);
    deckCaseDragRef.current = drag;
    setDeckCaseDrag(drag);
    setDeckCaseDropSlot(null);
  };

  const finishDeckCaseDrag = () => {
    deckCaseDragRef.current = null;
    setDeckCaseDrag(null);
    setDeckCaseDropSlot(null);
  };

  const openDeckEditor = (message: string) => {
    const roomKey = mapRoomKey(mapPosition);
    finishDeckEditorDrag();
    finishConsumableDrag();
    setPendingExtractionTicketId(null);
    setPendingPaintTicketId(null);
    setPendingRemovedCards([]);
    setHoveredDeckCard(null);
    setDeckEditorSnapshot({
      roomKey,
      decks: ownedDecks.map((deck) => ({ ...deck, cards: [...deck.cards] })),
      activeDeckId,
      inventory: [...inventoryCards],
      consumables: [...inventoryConsumables],
      floorCards: [...(roomDrops[roomKey] ?? [])],
      floorConsumables: [...(roomConsumableDrops[roomKey] ?? [])],
      floorDecks: [...(roomDeckDrops[roomKey] ?? [])],
    });
    setDeckEditorMessage(message);
    setDeckEditorOpen(true);
  };

  const confirmDeckEditor = () => {
    if (inventoryItemCount > INVENTORY_CAPACITY) {
      setDeckEditorMessage(`카드와 소모품을 합쳐 ${INVENTORY_CAPACITY}개 이하로 줄여야 편집을 확인할 수 있습니다.`);
      return;
    }
    setDeckEditorSnapshot(null);
    setPendingRemovedCards([]);
    setHoveredDeckCard(null);
    setPendingExtractionTicketId(null);
    setPendingPaintTicketId(null);
    finishConsumableDrag();
    finishDeckEditorDrag();
    setDeckEditorOpen(false);
    spendMapTurn();
  };

  const cancelDeckEditor = () => {
    if (deckEditorSnapshot) {
      setOwnedDecks(deckEditorSnapshot.decks);
      setActiveDeckId(deckEditorSnapshot.activeDeckId);
      setInventoryCards(deckEditorSnapshot.inventory);
      setInventoryConsumables(deckEditorSnapshot.consumables);
      setRoomDrops((current) => ({
        ...current,
        [deckEditorSnapshot.roomKey]: deckEditorSnapshot.floorCards,
      }));
      setRoomConsumableDrops((current) => ({
        ...current,
        [deckEditorSnapshot.roomKey]: deckEditorSnapshot.floorConsumables,
      }));
      setRoomDeckDrops((current) => ({
        ...current,
        [deckEditorSnapshot.roomKey]: deckEditorSnapshot.floorDecks,
      }));
    }
    setDeckEditorSnapshot(null);
    setPendingRemovedCards([]);
    setHoveredDeckCard(null);
    setPendingExtractionTicketId(null);
    setPendingPaintTicketId(null);
    finishConsumableDrag();
    finishDeckEditorDrag();
    setDeckEditorOpen(false);
  };

  const beginMapDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || mapTraveling) return;
    mapWasDraggedRef.current = false;
    mapDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: mapPan.x,
      originY: mapPan.y,
      moved: false,
    };
  };

  const moveMapDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = mapDragRef.current;
    if (!drag) return;
    const offsetX = event.clientX - drag.startX;
    const offsetY = event.clientY - drag.startY;
    const moved = drag.moved || Math.hypot(offsetX, offsetY) > 6;
    mapDragRef.current = { ...drag, moved };
    mapWasDraggedRef.current = moved;
    setMapPan({
      x: drag.originX + offsetX,
      y: drag.originY + offsetY,
    });
  };

  const finishMapDrag = () => {
    mapDragRef.current = null;
  };

  const zoomMap = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (mapTraveling) return;
    const viewport = mapViewportRef.current;
    if (!viewport) return;
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextZoom = Math.min(
      MAP_MAX_ZOOM,
      Math.max(MAP_MIN_ZOOM, Number((mapZoom + direction * MAP_ZOOM_STEP).toFixed(2))),
    );
    if (nextZoom === mapZoom) return;

    const bounds = viewport.getBoundingClientRect();
    const pointerX = event.clientX - bounds.left;
    const pointerY = event.clientY - bounds.top;
    const mapX = (pointerX - mapPan.x) / mapZoom;
    const mapY = (pointerY - mapPan.y) / mapZoom;
    setMapPan({
      x: pointerX - mapX * nextZoom,
      y: pointerY - mapY * nextZoom,
    });
    setMapZoom(nextZoom);
  };

  useLayoutEffect(() => {
    if (screen !== "map") return;
    const frame = window.requestAnimationFrame(() => centerMapOn(mapPosition));
    return () => window.cancelAnimationFrame(frame);
  }, [screen, mapPosition]);

  useLayoutEffect(() => {
    const origins = pendingOriginsRef.current;
    if (origins.size === 0 || game.hand.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      origins.clear();
      const frame = window.requestAnimationFrame(() => setPhase("playing"));
      return () => window.cancelAnimationFrame(frame);
    }

    game.hand.forEach((card, index) => {
      const source = origins.get(card.id);
      const target = handCardRefs.current.get(card.id);
      if (!source || !target) return;
      const targetRect = target.getBoundingClientRect();
      target.style.zIndex = String(20 + index);
      target.animate(
        [
          {
            transform: `translate(${source.left - targetRect.left}px, ${source.top - targetRect.top}px)`,
            boxShadow: "0 2px 4px rgba(0,0,0,.28)",
          },
          {
            transform: "translate(0, 0)",
            boxShadow: "0 7px 14px rgba(0,0,0,.3)",
          },
        ],
        {
          duration: 480,
          delay: index * 65,
          easing: "cubic-bezier(.2,.72,.25,1)",
          fill: "backwards",
        },
      );
    });

    origins.clear();
    const finishDelay = 500 + Math.max(0, game.hand.length - 1) * 65;
    const timer = window.setTimeout(() => {
      handCardRefs.current.forEach((element) => { element.style.zIndex = ""; });
      setPhase("playing");
    }, finishDelay);
    return () => window.clearTimeout(timer);
  }, [game.hand]);

  useEffect(() => {
    if (!lockedEnemyId) return;
    const target = game.enemies.find((enemy) => enemy.id === lockedEnemyId);
    if (!target || target.hp === 0) {
      const frame = window.requestAnimationFrame(() => setLockedEnemyId(null));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [game.enemies, lockedEnemyId]);

  const defeatEnemiesForDebug = () => {
    if (!debugMode || game.status !== "playing") return;
    clearBattleTimers();
    const regionNumber = getRegionNumber(mapPosition);
    grantBattleReward(regionNumber);
    setLockedEnemyId(null);
    setPhase("playing");
    setGame((current) => current.status !== "playing"
      ? current
      : {
          ...current,
          enemies: current.enemies.map((enemy) => ({ ...enemy, hp: 0 })),
          pendingDraws: 0,
          pendingDiscards: 0,
          pendingSweep: false,
          status: "won",
          message: "디버그 모드: 적을 즉시 처치했습니다.",
          history: ["디버그: 적 즉시 처치", ...current.history].slice(0, 5),
        });
  };

  const playCard = (card: Card, targetEnemyId?: string) => {
    const isRewardAttack = card.kind === "strike";
    const isRewardAttackAll = card.effect === "ironRampage";
    const rewardTarget = game.enemies.find((enemy) => enemy.id === targetEnemyId);
    const canResolveRewardAttack = isRewardAttack
      && game.status === "playing"
      && phase === "playing"
      && game.pendingDraws === 0
      && game.pendingDiscards === 0
      && !game.pendingSweep
      && game.energy >= card.cost
      && (isRewardAttackAll || Boolean(rewardTarget && rewardTarget.hp > 0));
    if (canResolveRewardAttack) {
      const repetitions = game.doubleNextAttack ? 2 : 1;
      const damage = card.value + game.strength;
      const enemiesAfterAttack = game.enemies.map((enemy) => isRewardAttackAll || enemy.id === targetEnemyId
        ? applyPlayerAttack(enemy, damage, repetitions)
        : enemy);
      if (enemiesAfterAttack.every((enemy) => enemy.hp === 0)) {
        const regionNumber = getRegionNumber(mapPosition);
        grantBattleReward(regionNumber);
      }
    }

    setGame((current) => {
      if (
        current.status !== "playing" ||
        current.pendingDraws > 0 ||
        current.pendingDiscards > 0 ||
        current.pendingSweep ||
        phase !== "playing"
      ) return current;
      if (current.energy < card.cost) {
        return { ...current, message: `${card.name}: 에너지가 ${card.cost} 필요합니다.` };
      }
      const isIronRampage = card.effect === "ironRampage";
      const isWave = card.effect === "ironWave" || card.effect === "waterWave";
      if (card.kind === "strike" && !isIronRampage && !targetEnemyId) return current;
      const targetEnemy = current.enemies.find((enemy) => enemy.id === targetEnemyId);
      if (card.kind === "strike" && !isIronRampage && (!targetEnemy || targetEnemy.hp === 0)) return current;
      const repetitions = card.kind === "strike" && current.doubleNextAttack ? 2 : 1;
      const damagePerHit = card.kind === "strike" ? card.value + current.strength : 0;
      const damage = damagePerHit * repetitions;
      const nextEnemies = card.kind === "strike"
        ? current.enemies.map((enemy) => isIronRampage || enemy.id === targetEnemyId
          ? applyPlayerAttack(enemy, damagePerHit, repetitions)
          : enemy)
        : current.enemies;
      const blockGained = card.kind === "defend"
        ? card.value * current.defenseMultiplier
        : isIronRampage || isWave
          ? 5 * repetitions * current.defenseMultiplier
          : 0;
      const nextPhysicalBlock = (card.kind === "defend" && card.damageType === "physical")
        || isIronRampage
        || (isWave && card.damageType === "physical")
        ? current.playerPhysicalBlock + blockGained
        : current.playerPhysicalBlock;
      const nextMagicBlock = (card.kind === "defend" && card.damageType === "magic")
        || (isWave && card.damageType === "magic")
        ? current.playerMagicBlock + blockGained
        : current.playerMagicBlock;
      const won = nextEnemies.every((enemy) => enemy.hp === 0);
      const canDraw = current.piles.some((pile) => pile.length > 0);
      const drawEachPileResult = card.effect === "drawEachPile"
        ? drawFromPiles(current.piles)
        : null;
      const drawsAdded = !won && canDraw ? card.draw * repetitions : 0;
      const remainingHand = current.hand.filter((item) => item.id !== card.id);
      const pendingDiscards = card.effect === "prepare"
        ? (canDraw || remainingHand.length > 0 ? 1 : 0)
        : card.effect === "focus" && remainingHand.length > 0 ? 1 : 0;
      const pendingSweep = card.effect === "sweep" && canDraw;
      const action = (() => {
        if (isIronRampage) return `적 전체에게 피해 ${damage} · 방어 ${blockGained}${repetitions > 1 ? " (2회 발동)" : ""}`;
        if (isWave) return `${targetEnemy?.name}에게 피해 ${damage} · ${DEFENSE_LABEL[card.damageType]} ${blockGained}${repetitions > 1 ? " (2회 발동)" : ""}`;
        if (card.kind === "strike") return `${targetEnemy?.name}에게 피해 ${damage}${repetitions > 1 ? " (2회 발동)" : ""}`;
        if (card.kind === "defend") return `${DEFENSE_LABEL[card.damageType]} ${blockGained} 획득`;
        if (card.effect === "steelHeart") return "이번 턴 방어와 마법 방어 획득량 3배";
        if (card.effect === "battlePlan") return "★ 3개 획득";
        if (card.effect === "prepare") return canDraw ? "드로우할 파일을 선택하세요." : "버릴 카드를 선택하세요.";
        if (card.effect === "focus") return "에너지 1 획득 · 버릴 카드를 선택하세요.";
        if (card.effect === "sweep") return canDraw ? "가져올 파일을 선택하세요." : "가져올 카드가 없습니다.";
        if (card.effect === "drawEachPile") return `모든 파일에서 ${drawEachPileResult?.hand.length ?? 0}장 뽑음`;
        if (card.effect === "berserk") return "에너지 2 획득 · 이번 턴 받는 피해 2배";
        if (card.effect === "transcend") return "이번 턴 피해 면역 · 힘 5 획득";
        if (card.effect === "rapidFire") return "다음 공격 카드가 2회 발동";
        return card.name;
      })();
      const drawMessage = card.draw > 0
        ? canDraw
          ? " · 드로우할 파일을 선택하세요."
          : " · 드로우할 카드가 없습니다."
        : "";
      return {
        ...current,
        hand: [...remainingHand, ...(drawEachPileResult?.hand ?? [])],
        discard: [...current.discard, card],
        piles: drawEachPileResult?.piles ?? current.piles,
        energy: current.energy - card.cost + (card.effect === "berserk" ? 2 : card.effect === "focus" ? 1 : 0),
        stars: current.stars + (
          card.effect === "battlePlan"
            ? 3
            : card.effect === "rulerCompass"
              ? repetitions
              : card.effect === "iceShield"
                ? 1
                : 0
        ),
        pendingDraws: drawsAdded,
        pendingDiscards,
        pendingSweep,
        enemies: nextEnemies,
        playerPhysicalBlock: nextPhysicalBlock,
        playerMagicBlock: nextMagicBlock,
        strength: current.strength + (card.effect === "transcend" ? 5 : 0),
        defenseMultiplier: card.effect === "steelHeart" ? 3 : current.defenseMultiplier,
        damageTakenMultiplier: card.effect === "berserk" ? 2 : current.damageTakenMultiplier,
        invulnerable: card.effect === "transcend" || current.invulnerable,
        doubleNextAttack: card.effect === "rapidFire"
          ? true
          : card.kind === "strike"
            ? false
            : current.doubleNextAttack,
        status: won ? "won" : current.status,
        message: won ? "승리! 모든 적을 쓰러뜨렸습니다." : `${action}${card.effect === "prepare" || card.effect === "focus" ? "" : drawMessage}`,
        history: [action, ...current.history].slice(0, 5),
      };
    });
  };

  const drawSelectedPile = (pileIndex: number) => {
    if (game.pendingDraws < 1 || phase !== "playing" || game.status !== "playing") return;
    const pile = game.piles[pileIndex];
    const card = pile?.at(-1);
    if (!card) return;

    const source = document.querySelector<HTMLElement>(`[data-top-card-id="${card.id}"]`);
    if (source) {
      pendingOriginsRef.current = new Map([[card.id, source.getBoundingClientRect()]]);
      setPhase("drawing");
    }

    setGame((current) => {
      if (current.pendingDraws < 1 || current.piles[pileIndex]?.at(-1)?.id !== card.id) return current;
      const nextPiles = current.piles.map((currentPile) => [...currentPile]);
      const drawnCard = nextPiles[pileIndex].pop();
      if (!drawnCard) return current;
      const revealedCard = { ...drawnCard, revealed: true };
      if (nextPiles[pileIndex].length > 0) {
        const nextTopIndex = nextPiles[pileIndex].length - 1;
        nextPiles[pileIndex][nextTopIndex] = {
          ...nextPiles[pileIndex][nextTopIndex],
          revealed: true,
        };
      }
      const action = `${pileIndex + 1}번 파일에서 ${revealedCard.name} 드로우`;
      return {
        ...current,
        piles: nextPiles,
        hand: [...current.hand, revealedCard],
        pendingDraws: current.pendingDraws - 1,
        message: current.pendingDraws > 1
          ? "다음 드로우 파일을 선택하세요."
          : current.pendingDiscards > 0
            ? "손에서 버릴 카드 1장을 클릭하세요."
            : action,
        history: [action, ...current.history].slice(0, 5),
      };
    });
  };

  const discardSelectedCard = (cardId: number) => {
    setGame((current) => {
      if (current.pendingDiscards < 1 || phase !== "playing") return current;
      const card = current.hand.find((item) => item.id === cardId);
      if (!card) return current;
      const action = `${card.name} 버림`;
      return {
        ...current,
        hand: current.hand.filter((item) => item.id !== cardId),
        discard: [...current.discard, card],
        pendingDiscards: current.pendingDiscards - 1,
        message: action,
        history: [action, ...current.history].slice(0, 5),
      };
    });
  };

  const takeSelectedPile = (pileIndex: number) => {
    if (!game.pendingSweep || phase !== "playing" || game.status !== "playing") return;
    const pile = game.piles[pileIndex];
    if (!pile?.length) return;
    const origins = new Map<number, DOMRect>();
    document.querySelectorAll<HTMLElement>(`[data-pile-index="${pileIndex}"] [data-card-id]`).forEach((element) => {
      origins.set(Number(element.dataset.cardId), element.getBoundingClientRect());
    });
    pendingOriginsRef.current = origins;
    setPhase("drawing");
    setGame((current) => {
      if (!current.pendingSweep || !current.piles[pileIndex]?.length) return current;
      const nextPiles = current.piles.map((currentPile) => [...currentPile]);
      const cards = nextPiles[pileIndex].map((card) => ({ ...card, revealed: true }));
      nextPiles[pileIndex] = [];
      const action = `${pileIndex + 1}번 파일 ${cards.length}장을 손으로 가져옴`;
      return {
        ...current,
        piles: nextPiles,
        hand: [...current.hand, ...cards],
        pendingSweep: false,
        message: action,
        history: [action, ...current.history].slice(0, 5),
      };
    });
  };

  const beginDrag = (
    event: ReactPointerEvent<HTMLElement>,
    card: Card,
    source: DragState["source"] = { type: "hand" },
    cards: Card[] = [card],
  ) => {
    if (
      game.status !== "playing" ||
      game.pendingDraws > 0 ||
      game.pendingDiscards > 0 ||
      game.pendingSweep ||
      phase !== "playing"
    ) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const nextDrag = {
      card,
      cards,
      source,
      x: event.clientX,
      y: event.clientY,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    dragRef.current = nextDrag;
    setDragging(nextDrag);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const current = dragRef.current;
    if (!current) return;
    const moved = current.moved || Math.hypot(event.clientX - current.startX, event.clientY - current.startY) > 7;
    const nextDrag = { ...current, x: event.clientX, y: event.clientY, moved };
    dragRef.current = nextDrag;
    setDragging(nextDrag);
  };

  const moveCardToPile = (drag: DragState, targetPileIndex: number) => {
    setGame((current) => {
      if (
        current.status !== "playing" ||
        current.pendingDraws > 0 ||
        current.pendingDiscards > 0 ||
        current.pendingSweep ||
        phase !== "playing"
      ) return current;
      if (!current.piles[targetPileIndex]) return current;
      if (drag.source.type === "pile" && drag.source.pileIndex === targetPileIndex) return current;
      if (current.stars < 1) {
        return { ...current, message: "솔리테어 행동에 필요한 ★가 없습니다." };
      }

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

      nextPiles[targetPileIndex].push(...drag.cards.map((card) => ({
        ...card,
        revealed: drag.source.type === "hand" ? true : card.revealed,
      })));
      const cardLabel = drag.cards.length > 1 ? `${drag.cards.length}장` : drag.card.name;
      const action = drag.source.type === "hand"
        ? `${drag.card.name} 카드를 손패에서 ${targetPileIndex + 1}번 파일로 이동`
        : `${drag.source.pileIndex + 1}번 파일의 ${cardLabel}을(를) ${targetPileIndex + 1}번 파일로 이동`;

      return {
        ...current,
        piles: nextPiles,
        hand: drag.source.type === "hand"
          ? current.hand.filter((card) => card.id !== drag.card.id)
          : current.hand,
        stars: current.stars - 1,
        message: action,
        history: [action, ...current.history].slice(0, 5),
      };
    });
  };

  const finishDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const current = dragRef.current;
    if (!current) return;
    if (current.moved) {
      const dropZone = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-drop-target]")
        ?.dataset.dropTarget;
      const targetEnemyId = dropZone?.startsWith("enemy:") ? dropZone.slice(6) : undefined;
      const targetPileIndex = dropZone?.startsWith("pile:") ? Number(dropZone.slice(5)) : undefined;

      if (dropZone === "hand" && current.source.type === "pile") {
        setGame((state) => ({
          ...state,
          message: "★★로 파일 카드를 가져오는 기능은 현재 사용할 수 없습니다.",
        }));
        dragRef.current = null;
        setDragging(null);
        return;
      }

      if (targetPileIndex !== undefined && Number.isInteger(targetPileIndex)) {
        moveCardToPile(current, targetPileIndex);
        dragRef.current = null;
        setDragging(null);
        return;
      }

      const resolvedTargetEnemyId = targetEnemyId
        ?? (current.card.kind === "strike" && dropZone === "defend" ? lockedEnemyId ?? undefined : undefined);
      const validDrop =
        current.source.type === "hand" && (
          (current.card.kind === "strike" && Boolean(resolvedTargetEnemyId)) ||
          (current.card.effect === "ironRampage" && dropZone === "defend") ||
          (current.card.kind !== "strike" && dropZone === "defend")
        );
      if (validDrop) {
        playCard(current.card, resolvedTargetEnemyId);
      } else {
        setGame((state) => ({
          ...state,
          message: current.source.type === "pile"
            ? "앞면 카드 묶음은 다른 파일 위에 놓아주세요."
            : current.card.kind === "strike"
              ? "타격 카드는 적이나 파일 위에 놓아주세요."
              : "이 카드는 중앙 영역이나 파일 위에 놓아주세요.",
        }));
      }
    }
    dragRef.current = null;
    setDragging(null);
  };

  const cancelDrag = () => {
    dragRef.current = null;
    setDragging(null);
  };

  const toggleLock = (enemy: EnemyState) => {
    if (
      phase !== "playing" ||
      game.pendingDraws > 0 ||
      game.pendingDiscards > 0 ||
      game.pendingSweep ||
      enemy.hp === 0
    ) return;
    setLockedEnemyId((current) => current === enemy.id ? null : enemy.id);
  };

  const endTurn = () => {
    if (
      game.status !== "playing" ||
      game.pendingDraws > 0 ||
      game.pendingDiscards > 0 ||
      game.pendingSweep ||
      phase !== "playing"
    ) return;
    setPhase("discarding");
    setDragging(null);

    const discardDelay = 340 + Math.max(0, game.hand.length - 1) * 42;
    later(() => {
      const livingEnemies = game.enemies.filter((enemy) => enemy.hp > 0);
      const discarded = [...game.discard, ...game.hand];
      let remainingPhysicalBlock = game.playerPhysicalBlock;
      let remainingMagicBlock = game.playerMagicBlock;
      let remainingHp = game.playerHp;
      const steps: Array<{
        enemy: EnemyState;
        action: EnemyAction;
        attack: EnemyAction["attacks"][number] | null;
        damage: number;
        hpAfter: number;
        physicalBlockAfter: number;
        magicBlockAfter: number;
      }> = [];
      const actedEnemyIds = new Set<string>();

      for (const enemy of livingEnemies) {
        if (remainingHp === 0) break;
        const action = enemy.actions[enemy.intentIndex];
        actedEnemyIds.add(enemy.id);
        for (const attack of action.attacks) {
          const resolvedAttack = enemy.nextAttackMagic
            ? { ...attack, type: "magic" as const }
            : attack;
          const attackValue = attack.value + enemy.strength;
          for (let hit = 0; hit < (attack.hits ?? 1); hit += 1) {
            if (remainingHp === 0) break;
            const matchingBlock = resolvedAttack.type === "physical" ? remainingPhysicalBlock : remainingMagicBlock;
            const blocked = game.invulnerable ? 0 : Math.min(attackValue, matchingBlock);
            const damage = game.invulnerable
              ? 0
              : (attackValue - blocked) * game.damageTakenMultiplier;
            if (!game.invulnerable && resolvedAttack.type === "physical") remainingPhysicalBlock -= blocked;
            else if (!game.invulnerable) remainingMagicBlock -= blocked;
            remainingHp = Math.max(0, remainingHp - damage);
            steps.push({
              enemy,
              action,
              attack: resolvedAttack,
              damage,
              hpAfter: remainingHp,
              physicalBlockAfter: remainingPhysicalBlock,
              magicBlockAfter: remainingMagicBlock,
            });
          }
        }
        if (action.strengthGain) {
          steps.push({
            enemy,
            action,
            attack: null,
            damage: 0,
            hpAfter: remainingHp,
            physicalBlockAfter: remainingPhysicalBlock,
            magicBlockAfter: remainingMagicBlock,
          });
        }
      }

      const nextEnemies = game.enemies.map((enemy) => {
        if (enemy.hp === 0 || !actedEnemyIds.has(enemy.id)) return enemy;
        const action = enemy.actions[enemy.intentIndex];
        return {
          ...enemy,
          strength: enemy.strength + (action.strengthGain ?? 0),
          intentIndex: chooseNextIntent(enemy.actions, enemy.intentIndex),
          quicknessReady: enemy.variant === "snake",
          nextAttackMagic: action.nextAttackMagic
            ? true
            : enemy.nextAttackMagic && action.attacks.length === 0,
        };
      });

      setGame({
        ...game,
        hand: [],
        discard: discarded,
        message: "적들이 움직이기 시작합니다.",
      });
      setPhase("enemy-turn");

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const stepDuration = reducedMotion ? 160 : 820;
      const hitAt = reducedMotion ? 40 : 390;
      const clearAt = reducedMotion ? 100 : 720;

      steps.forEach((step, index) => {
        const base = index * stepDuration;
        later(() => setAttackingEnemyId(step.enemy.id), base);
        later(() => {
          setDamagePopup({
            key: `${step.enemy.id}-${Date.now()}`,
            text: step.attack
              ? step.damage > 0 ? `-${step.damage}` : "막음"
              : `힘 +${step.action.strengthGain ?? 0}`,
          });
          setGame((current) => ({
            ...current,
            playerHp: step.hpAfter,
            playerPhysicalBlock: step.physicalBlockAfter,
            playerMagicBlock: step.magicBlockAfter,
            message: step.attack
              ? step.damage > 0
                ? `${step.enemy.name}의 ${ATTACK_LABEL[step.attack.type]} — ${step.damage} 피해`
                : `${step.enemy.name}의 ${ATTACK_LABEL[step.attack.type]}을 막았습니다.`
              : `${step.enemy.name}이 힘 ${step.action.strengthGain ?? 0}을 얻었습니다.`,
          }));
        }, base + hitAt);
        later(() => setAttackingEnemyId(null), base + clearAt);
      });

      later(() => {
        setDamagePopup(null);
        setAttackingEnemyId(null);
        const attackHistory = livingEnemies
          .filter((enemy) => actedEnemyIds.has(enemy.id))
          .map((enemy) => {
            const action = enemy.actions[enemy.intentIndex];
            return `${enemy.name}: ${actionSummary(
              action,
              enemy.strength,
              enemy.nextAttackMagic,
            )}`;
          });

        if (remainingHp === 0) {
          setGame({
            ...game,
            hand: [],
            discard: discarded,
            playerHp: 0,
            playerPhysicalBlock: remainingPhysicalBlock,
            playerMagicBlock: remainingMagicBlock,
            enemies: nextEnemies,
            status: "lost",
            message: "적의 공격을 받고 쓰러졌습니다.",
            history: [...attackHistory, ...game.history].slice(0, 5),
          });
          setPhase("playing");
          return;
        }

        const allPilesEmpty = game.piles.every((pile) => pile.length === 0);
        const sourcePiles = allPilesEmpty ? buildPiles(shuffle(discarded)) : game.piles;
        setGame({
          ...game,
          piles: sourcePiles,
          hand: [],
          discard: allPilesEmpty ? [] : discarded,
          energy: 3,
          turn: game.turn + 1,
          playerHp: remainingHp,
          playerPhysicalBlock: 0,
          playerMagicBlock: 0,
          defenseMultiplier: 1,
          damageTakenMultiplier: 1,
          invulnerable: false,
          enemies: nextEnemies,
          message: allPilesEmpty ? "전체 덱을 다시 섞었습니다." : "적의 턴이 끝났습니다.",
          history: [...attackHistory, ...game.history].slice(0, 5),
        });
        setPhase("drawing");
        later(drawCards, allPilesEmpty ? 330 : 120);
      }, steps.length * stepDuration + 80);
    }, discardDelay);
  };

  const controlsLocked =
    phase !== "playing" ||
    game.status !== "playing" ||
    game.pendingDraws > 0 ||
    game.pendingDiscards > 0 ||
    game.pendingSweep;

  if (screen === "map") {
    const currentRoomKey = mapRoomKey(mapPosition);
    const currentRoomType = getRoomType(mapPosition, mapSeed);
    const inSafeArea = isSafeAreaPosition(mapPosition);
    const canEditDeck = true;
    const viewedDeck = ownedDecks.find((deck) => deck.id === deckViewerDeckId) ?? activeDeck;
    const rarityOrder: Record<CardRarity, number> = { rare: 0, special: 1, basic: 2 };
    const deckGroups = Array.from(deckCards.reduce((groups, card) => {
      const groupKey = `${card.effect}:${card.damageType}:${card.name}`;
      const current = groups.get(groupKey);
      if (current) current.cardIds.push(card.id);
      else groups.set(groupKey, { card, cardIds: [card.id] });
      return groups;
    }, new Map<string, { card: Card; cardIds: number[] }>()).values()).sort((left, right) =>
      deckSortMode === "cost"
        ? left.card.cost - right.card.cost
          || rarityOrder[left.card.rarity] - rarityOrder[right.card.rarity]
          || left.card.name.localeCompare(right.card.name, "ko")
        : rarityOrder[left.card.rarity] - rarityOrder[right.card.rarity]
          || left.card.cost - right.card.cost
          || left.card.name.localeCompare(right.card.name, "ko"));
    const inventoryGroups = Array.from(inventoryCards.reduce((groups, card) => {
      const groupKey = `${card.effect}:${card.damageType}:${card.name}`;
      const current = groups.get(groupKey);
      if (current) current.cardIds.push(card.id);
      else groups.set(groupKey, { card, cardIds: [card.id] });
      return groups;
    }, new Map<string, { card: Card; cardIds: number[] }>()).values()).sort((left, right) =>
      left.card.cost - right.card.cost || left.card.name.localeCompare(right.card.name, "ko"));
    const currentFloorCards = roomDrops[currentRoomKey] ?? [];
    const currentFloorConsumables = roomConsumableDrops[currentRoomKey] ?? [];
    const currentFloorDecks = roomDeckDrops[currentRoomKey] ?? [];
    const floorItemNames = [
      ...currentFloorCards.map((card) => card.name),
      ...currentFloorConsumables.map((consumable) => consumable.name),
      ...currentFloorDecks.map((deck) => deck.name),
    ];
    const quickPickUpLabel = floorItemNames.length === 1
      ? `${floorItemNames[0]} 줍기`
      : `떨어진 물건 ${floorItemNames.length}개 줍기`;
    const activeShopOffers = activeShopRoom ? roomShops[activeShopRoom] ?? [] : [];
    const knownRoomRoutes = buildKnownRoomRoutes(mapPosition, seenRooms, mapSeed);
    const pendingRemovedGroups = Array.from(pendingRemovedCards.reduce((groups, { card }) => {
      const groupKey = `${card.effect}:${card.damageType}:${card.name}`;
      const current = groups.get(groupKey);
      if (current) current.cardIds.push(card.id);
      else groups.set(groupKey, { card, cardIds: [card.id] });
      return groups;
    }, new Map<string, { card: Card; cardIds: number[] }>()).values());
    const floorGroups = Array.from(currentFloorCards.reduce((groups, card) => {
      const groupKey = `${card.effect}:${card.damageType}:${card.name}`;
      const current = groups.get(groupKey);
      if (current) current.cardIds.push(card.id);
      else groups.set(groupKey, { card, cardIds: [card.id] });
      return groups;
    }, new Map<string, { card: Card; cardIds: number[] }>()).values()).sort((left, right) =>
      left.card.cost - right.card.cost || left.card.name.localeCompare(right.card.name, "ko"));
    const mapWidth = MAP_PADDING * 2
      + MAP_RENDER_COLUMNS * MAP_ROOM_WIDTH
      + (MAP_RENDER_COLUMNS - 1) * MAP_CELL_GAP;
    const mapHeight = MAP_PADDING * 2
      + MAP_RENDER_ROWS * MAP_ROOM_HEIGHT
      + (MAP_RENDER_ROWS - 1) * MAP_CELL_GAP;
    const debugViewportWidth = mapViewportRef.current?.clientWidth ?? 1200;
    const debugViewportHeight = mapViewportRef.current?.clientHeight ?? 620;
    const mapStrideX = MAP_ROOM_WIDTH + MAP_CELL_GAP;
    const mapStrideY = MAP_ROOM_HEIGHT + MAP_CELL_GAP;
    const debugMinX = Math.max(
      DUNGEON_MIN_X,
      DUNGEON_MIN_X - MAP_WORLD_MARGIN_X
        + Math.floor((-mapPan.x / mapZoom - MAP_PADDING) / mapStrideX) - 2,
    );
    const debugMaxX = Math.min(
      DUNGEON_MAX_X,
      DUNGEON_MIN_X - MAP_WORLD_MARGIN_X
        + Math.ceil(((debugViewportWidth - mapPan.x) / mapZoom - MAP_PADDING) / mapStrideX) + 2,
    );
    const debugMinY = Math.max(
      0,
      Math.floor((-mapPan.y / mapZoom - MAP_PADDING) / mapStrideY) - MAP_WORLD_MARGIN_Y - 2,
    );
    const debugMaxY = Math.min(
      MAP_ROWS - 1,
      Math.ceil(((debugViewportHeight - mapPan.y) / mapZoom - MAP_PADDING) / mapStrideY)
        - MAP_WORLD_MARGIN_Y + 2,
    );
    const mapCellMap = new Map<string, MapPosition>();
    seenRooms.forEach((seenRoomKey) => {
      const position = parseMapRoomKey(seenRoomKey);
      mapCellMap.set(seenRoomKey, position);
    });
    for (let offsetY = -MAP_PLAYER_VISION_VERTICAL_RADIUS; offsetY <= MAP_PLAYER_VISION_VERTICAL_RADIUS; offsetY += 1) {
      for (let offsetX = -MAP_PLAYER_VISION_HORIZONTAL_RADIUS; offsetX <= MAP_PLAYER_VISION_HORIZONTAL_RADIUS; offsetX += 1) {
        const position = {
          x: mapPosition.x + offsetX,
          y: mapPosition.y + offsetY,
        };
        if (getRoomType(position, mapSeed) !== "void") {
          mapCellMap.set(mapRoomKey(position), position);
        }
      }
    }
    if (debugMode) {
      for (let y = debugMinY; y <= debugMaxY; y += 1) {
        for (let x = debugMinX; x <= debugMaxX; x += 1) {
          const position = { x, y };
          if (getRoomType(position, mapSeed) !== "void") {
            mapCellMap.set(mapRoomKey(position), position);
          }
        }
      }
    }
    const mapCells = Array.from(mapCellMap.values());
    const renderedMapCellKeys = new Set(mapCells.map(mapRoomKey));
    const visibleMapEnemies = debugMode
      ? mapEnemyWorld.enemies.filter((enemy) => renderedMapCellKeys.has(mapRoomKey(enemy.position)))
      : mapEnemyWorld.enemies.filter((enemy) => isInPlayerVision(enemy.position, mapPosition));

    return (
      <main className="game-shell map-shell">
        <header className="topbar map-topbar">
          <div>
            <h1>{getRegionName(mapPosition)}</h1>
          </div>
          <div className="map-top-actions">
            <div className="map-run-stats">
              <div className="map-health" aria-label={`체력 ${runPlayerHp} 중 ${MAX_PLAYER_HP}`}>
                <strong>❤️ {runPlayerHp} / {MAX_PLAYER_HP}</strong>
              </div>
              <div className="map-gold" aria-label={`골드 ${gold}`}>
                <strong>🪙 {gold}</strong>
              </div>
            </div>
            <button
              type="button"
              className="deck-viewer-trigger"
              onClick={() => {
                setDeckViewerDeckId(activeDeckId);
                setDeckViewerOpen(true);
              }}
              aria-label={`덱 보기, 현재 ${deckCards.length}장`}
            >
              <span className="deck-stack-icon" aria-hidden="true" />
              <span>덱 보기</span>
            </button>
            <button
              type="button"
              className="map-wait-trigger"
              onClick={waitOnMap}
              disabled={mapTraveling}
              aria-label="한 턴 쉬기: 현재 칸에 머물며 적만 행동하게 합니다"
            >
              한 턴 쉼
            </button>
            <button
              type="button"
              className={`debug-toggle ${debugMode ? "is-active" : ""}`}
              onClick={toggleDebugMode}
              aria-pressed={debugMode}
            >
              디버그 {debugMode ? "ON" : "OFF"}
            </button>
            {canEditDeck && (
              <button
                type="button"
                className="deck-editor-trigger"
                onClick={() => openDeckEditor(inSafeArea
                  ? "안전 지역입니다. 덱 카드를 우클릭하거나 드래그해 인벤토리로 자유롭게 꺼낼 수 있습니다."
                  : "좌클릭: 바닥 → 인벤토리 → 덱. 원래 덱 카드는 우클릭하거나 드래그하여 휴지통으로 옮깁니다.")}
                aria-label={`덱 편집, 현재 ${deckCards.length}장`}
              >
                <span className="deck-stack-icon" aria-hidden="true" />
                <span>덱 편집</span>
              </button>
            )}
          </div>
        </header>

        <section className="map-board" aria-label="탐험 지도">
          <div className="map-toolbar">
            <div className="map-toolbar-actions">
              <span className="map-zoom-value" aria-label={`지도 배율 ${Math.round(mapZoom * 100)}퍼센트`}>
                {Math.round(mapZoom * 100)}%
              </span>
              <button type="button" className="recenter-map" onClick={() => centerMapOn(mapPosition)}>
                현재 위치로
              </button>
            </div>
          </div>

          <div
            className="map-viewport"
            ref={mapViewportRef}
            onPointerDown={beginMapDrag}
            onPointerMove={moveMapDrag}
            onPointerUp={finishMapDrag}
            onPointerCancel={finishMapDrag}
            onPointerLeave={finishMapDrag}
            onWheel={zoomMap}
          >
            <div
              className={`map-canvas ${mapTraveling ? "is-traveling" : ""}`}
              style={{
                width: mapWidth,
                height: mapHeight,
                padding: MAP_PADDING,
                gap: MAP_CELL_GAP,
                gridTemplateColumns: `repeat(${MAP_RENDER_COLUMNS}, ${MAP_ROOM_WIDTH}px)`,
                gridAutoRows: `${MAP_ROOM_HEIGHT}px`,
                transform: `translate3d(${mapPan.x}px, ${mapPan.y}px, 0) scale(${mapZoom})`,
                transformOrigin: "0 0",
                "--map-travel-step": `${mapTravelStepMs}ms`,
              } as CSSProperties}
            >
              {mapCells.map((position) => {
                const roomKey = mapRoomKey(position);
                const roomType = getRoomType(position, mapSeed);
                const current = position.x === mapPosition.x && position.y === mapPosition.y;
                const inVision = debugMode || isInPlayerVision(position, mapPosition);
                const distance = chebyshevDistance(position, mapPosition);
                const walkable = isWalkableRoom(roomType);
                const adjacent = distance === 1 && walkable;
                const reachable = !current && knownRoomRoutes.has(roomKey);
                const hasItems = (roomDrops[roomKey]?.length ?? 0) > 0
                  || (roomConsumableDrops[roomKey]?.length ?? 0) > 0
                  || (roomDeckDrops[roomKey]?.length ?? 0) > 0;
                const roomState = roomType === "rock" || roomType === "void"
                  ? roomType
                  : roomType;
                const roomLabel = current
                  ? "현재 위치"
                  : roomType === "rock"
                    ? "단단한 바위"
                    : roomType === "void"
                      ? "먼 공간"
                      : roomType === "shop"
                        ? "상점"
                        : roomType === "portal"
                          ? "안전 지역 포탈"
                          : roomType === "heal"
                            ? "회복 노드"
                            : roomType === "safePortal"
                              ? "다음 지역 포탈"
                        : "방";
                return (
                  <button
                    type="button"
                    className={`map-room is-${roomState} ${current ? "is-current" : ""} ${inVision ? "is-in-vision" : "is-out-of-vision"} ${adjacent ? "is-adjacent" : ""} ${reachable ? "is-reachable" : ""}`}
                    key={roomKey}
                    style={{
                      gridColumn: position.x - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X + 1,
                      gridRow: position.y + MAP_WORLD_MARGIN_Y + 1,
                    }}
                    tabIndex={adjacent || reachable ? 0 : -1}
                    aria-disabled={!walkable || mapTraveling || (!adjacent && !reachable)}
                    aria-label={`${roomLabel}, 좌표 ${position.x + 1}, 깊이 ${position.y}`}
                    onClick={() => {
                      if (mapWasDraggedRef.current) {
                        mapWasDraggedRef.current = false;
                        return;
                      }
                      if (mapTraveling) return;
                      setMapMessage("");
                      if (adjacent) {
                        moveOnMap(position.x - mapPosition.x, position.y - mapPosition.y);
                        return;
                      }
                      const safePath = routeToRoom(position, knownRoomRoutes);
                      if (safePath && safePath.length > 1) {
                        travelSafePath(safePath);
                        return;
                      }
                    }}
                  >
                    {roomType === "shop"
                          ? <span>상점</span>
                          : roomType === "portal"
                            ? <span>포탈</span>
                            : roomType === "heal"
                              ? <span>회복</span>
                              : roomType === "safePortal"
                                ? <span>포탈</span>
                        : null}
                    {roomType === "rock" && <span className="rock-label">단단한 돌</span>}
                    {hasItems && <span className="room-item-indicator" aria-label="아이템 있음" />}
                  </button>
                );
              })}
              {visibleMapEnemies.map((enemy) => (
                <span
                  className={`map-enemy is-${enemy.awareness} ${mapCollisionEnemyIds.includes(enemy.id) ? "is-colliding" : ""}`}
                  key={enemy.id}
                  style={{
                    left: MAP_PADDING + (enemy.position.x - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X) * (MAP_ROOM_WIDTH + MAP_CELL_GAP) + MAP_ROOM_WIDTH / 2,
                    top: MAP_PADDING + (enemy.position.y + MAP_WORLD_MARGIN_Y) * (MAP_ROOM_HEIGHT + MAP_CELL_GAP) + MAP_ROOM_HEIGHT / 2,
                  }}
                  title={`${getSewerEncounterLabel(enemy.encounterIndex)} · ${awarenessSymbol(enemy.awareness)}`}
                  aria-label={`${getSewerEncounterLabel(enemy.encounterIndex)}, 상태 ${awarenessSymbol(enemy.awareness)}`}
                >
                  <strong>{awarenessSymbol(enemy.awareness)}</strong>
                  <small>{getSewerEncounterLabel(enemy.encounterIndex)}</small>
                </span>
              ))}
              {mapBattleFlash && (
                <span
                  className="map-battle-flash"
                  style={{
                    left: MAP_PADDING + (mapPosition.x - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X) * (MAP_ROOM_WIDTH + MAP_CELL_GAP) + MAP_ROOM_WIDTH / 2,
                    top: MAP_PADDING + (mapPosition.y + MAP_WORLD_MARGIN_Y) * (MAP_ROOM_HEIGHT + MAP_CELL_GAP) + MAP_ROOM_HEIGHT / 2,
                  }}
                  aria-live="assertive"
                >전투!</span>
              )}
              <span
                className="map-player map-player-marker"
                style={{
                  left: MAP_PADDING + (mapPosition.x - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X) * (MAP_ROOM_WIDTH + MAP_CELL_GAP) + MAP_ROOM_WIDTH / 2,
                  top: MAP_PADDING + (mapPosition.y + MAP_WORLD_MARGIN_Y) * (MAP_ROOM_HEIGHT + MAP_CELL_GAP) + MAP_ROOM_HEIGHT / 2,
                }}
                aria-hidden="true"
              >P</span>
            </div>
            <div className="map-depth-fade" aria-hidden="true" />
          </div>
          <div className="room-action-notices">
            {mapMessage && <p key={mapMessageNonce} className="map-message" role="status" aria-live="polite">{mapMessage}</p>}
            {currentRoomType === "shop" && (
              <button
                type="button"
                className="room-floor-notice room-action-notice is-shop"
                onClick={() => openShop(currentRoomKey, getRegionNumber(mapPosition))}
              >
                <span>상점</span>
                <strong>상점 들어가기</strong>
                <small>열기</small>
              </button>
            )}
            {(currentRoomType === "portal" || currentRoomType === "safePortal") && (
              <button
                type="button"
                className="room-floor-notice room-action-notice is-portal"
                onClick={useCurrentPortal}
              >
                <span>포탈</span>
                <strong>포탈 이용하기</strong>
                <small>이동</small>
              </button>
            )}
            {(currentFloorCards.length > 0 || currentFloorConsumables.length > 0 || currentFloorDecks.length > 0) && canEditDeck && (
              <button
                type="button"
                className="room-floor-notice"
                onClick={quickPickUpFloorItems}
              >
                <span>방 바닥</span>
                <strong>{quickPickUpLabel}</strong>
                <small>줍기</small>
              </button>
            )}
          </div>
        </section>

        {shopOpen && (
          <div className="shop-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-title">
            <section className="shop-panel">
              <header>
                <div>
                  <p>TRAVELING MERCHANT</p>
                  <h2 id="shop-title">여행 상점</h2>
                  <span>카드와 소모품은 같은 인벤토리 공간을 사용합니다.</span>
                </div>
                <div className="shop-header-status">
                  <strong>{gold}G</strong>
                  <span className={inventoryItemCount >= INVENTORY_CAPACITY ? "is-full" : ""}>
                    인벤토리 {inventoryItemCount} / {INVENTORY_CAPACITY}
                  </span>
                  <button type="button" onClick={() => setShopOpen(false)}>나가기</button>
                </div>
              </header>
              <div className="shop-stock">
                {activeShopOffers.map((offer) => (
                  <button
                    type="button"
                    className={`shop-offer ${offer.sold ? "is-sold" : ""}`}
                    key={offer.id}
                    onClick={() => buyShopOffer(offer.id)}
                    disabled={offer.sold}
                  >
                    {offer.card ? (
                      <div className={`shop-card card-face ${offer.card.kind} ${offer.card.damageType}`}>
                        <CardFace card={offer.card} />
                      </div>
                    ) : offer.consumable ? (
                      <div className={`consumable-ticket ${offer.consumable.type}`}>
                        <span className="ticket-mark" aria-hidden="true">T</span>
                        <strong>{offer.consumable.name}</strong>
                        <small>{offer.consumable.description}</small>
                      </div>
                    ) : null}
                    <span className="shop-price">{offer.sold ? "판매 완료" : `${offer.price}G`}</span>
                  </button>
                ))}
              </div>
              <footer>{shopMessage}</footer>
            </section>
          </div>
        )}

        {deckEditorOpen && (
          <div className="deck-editor-overlay" role="dialog" aria-modal="true" aria-labelledby="deck-editor-title">
            <div className="deck-editor-stage">
              <section className="deck-editor-panel" onClick={(event) => event.stopPropagation()}>
              <header className="deck-editor-header">
                <div>
                  <p>LOADOUT</p>
                  <h2 id="deck-editor-title">덱 편집</h2>
                </div>
              </header>

              <div className="deck-editor-columns">
                <section
                  className={`deck-editor-column inventory-column ${deckEditorDropTarget === "inventory" ? "is-drop-target" : ""}`}
                  onDragOver={(event) => {
                    const itemDrag = consumableDragRef.current ?? consumableDrag;
                    if (itemDrag?.source === "floor") {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      return;
                    }
                    const drag = deckEditorDragRef.current ?? deckEditorDrag;
                    const source = drag?.source;
                    const temporaryDeckCard = source === "deck"
                      && drag
                      && (inSafeArea || !originalDeckIdForCard(drag.cardId));
                    if (source !== "floor" && !temporaryDeckCard) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDeckEditorDropTarget("inventory");
                  }}
                  onDrop={(event) => {
                    if ((consumableDragRef.current ?? consumableDrag)?.source === "floor") {
                      dropConsumable(event, "inventory");
                      return;
                    }
                    dropDeckEditorCard(event, "inventory");
                  }}
                >
                  <div className="deck-editor-column-title">
                    <h3>인벤토리</h3>
                    <strong className={inventoryItemCount > INVENTORY_CAPACITY ? "is-full" : ""}>
                      {inventoryItemCount} / {INVENTORY_CAPACITY}
                    </strong>
                  </div>
                  <div className="deck-editor-card-list">
                    {inventoryConsumables.map((consumable) => (
                      <button
                        type="button"
                        className={`consumable-ticket inventory-ticket ${consumable.type} ${pendingExtractionTicketId === consumable.id || pendingPaintTicketId === consumable.id ? "is-selected" : ""}`}
                        key={consumable.id}
                        draggable
                        onDragStart={(event) => beginConsumableDrag(event, consumable.id, "inventory")}
                        onDragEnd={finishConsumableDrag}
                        onClick={() => selectExtractionTicket(consumable)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          moveInventoryConsumableToFloor(consumable.id);
                        }}
                      >
                        <span className="ticket-mark" aria-hidden="true">T</span>
                        <strong>{consumable.name}</strong>
                        <small>{consumable.description}</small>
                      </button>
                    ))}
                    {inventoryGroups.map(({ card, cardIds }) => (
                      <button
                        type="button"
                        className={`deck-editor-card card-face ${card.kind} ${card.damageType} ${deckEditorDrag?.cardId === cardIds.at(-1) ? "is-dragging" : ""}`}
                        key={`${card.effect}:${card.damageType}:${card.name}`}
                        draggable
                        onDragStart={(event) => beginDeckEditorDrag(event, cardIds.at(-1)!, "inventory")}
                        onDragEnd={finishDeckEditorDrag}
                        onClick={() => moveInventoryCardToDeck(cardIds.at(-1)!)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          moveInventoryCardToFloor(cardIds.at(-1)!);
                        }}
                        aria-label={`${card.name} ${cardIds.length}장, 좌클릭하면 덱으로 이동, 우클릭하면 바닥으로 이동`}
                      >
                        <CardFace card={card} />
                        {cardIds.length > 1 && <span className="inventory-card-count">x{cardIds.length}</span>}
                      </button>
                    ))}
                    {inventoryItemCount === 0 && (
                      <div className="deck-editor-empty">바닥의 카드·소모품을 줍거나 보상을 획득하면 이곳에 보관됩니다.</div>
                    )}
                  </div>
                </section>

                <section
                  className={`deck-editor-column deck-list-column ${deckEditorDropTarget === "deck" ? "is-drop-target" : ""}`}
                  onDragOver={(event) => {
                    const source = (deckEditorDragRef.current ?? deckEditorDrag)?.source;
                    const restoringTrash = source === "trash";
                    const addingCard = source === "inventory" || source === "floor";
                    if (!restoringTrash && (!addingCard || !activeDeck || deckCards.length >= activeDeck.capacity)) {
                      event.dataTransfer.dropEffect = "none";
                      setDeckEditorDropTarget(null);
                      return;
                    }
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDeckEditorDropTarget("deck");
                  }}
                  onDrop={(event) => dropDeckEditorCard(event, "deck")}
                >
                  <div className="deck-editor-column-title">
                    <h3>{activeDeck?.name ?? "덱 없음"}</h3>
                    <strong className={activeDeck && deckCards.length >= activeDeck.capacity ? "is-full" : ""}>
                      {deckCards.length} / {activeDeck?.capacity ?? 0}
                    </strong>
                  </div>
                  <div className="owned-deck-tabs" aria-label="보유 덱">
                    {ownedDecks.map((deck, index) => (
                      <button
                        type="button"
                        className={deck.id === activeDeckId ? "is-active" : ""}
                        key={deck.id}
                        draggable
                        onDragStart={(event) => beginDeckCaseDrag(event, deck.id, "owned")}
                        onDragEnd={finishDeckCaseDrag}
                        onClick={() => {
                          setActiveDeckId(deck.id);
                          setHoveredDeckCard(null);
                          setDeckEditorMessage(`${deck.name}을(를) 전투 덱으로 선택했습니다.`);
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          dropOwnedDeck(deck.id);
                        }}
                        aria-label={`${index + 1}번째 덱, ${deck.cards.length}/${deck.capacity}. 좌클릭 선택, 우클릭 바닥에 놓기`}
                      >
                        <strong>덱 {index + 1} <span>({deck.cards.length}/{deck.capacity})</span></strong>
                      </button>
                    ))}
                    {Array.from({ length: MAX_OWNED_DECKS - ownedDecks.length }, (_, index) => (
                      <div
                        className={`empty-deck-slot ${deckCaseDropSlot === index ? "is-deck-drop-target" : ""}`}
                        key={`empty-deck-${index}`}
                        onDragOver={(event) => {
                          const drag = deckCaseDragRef.current ?? deckCaseDrag;
                          if (drag?.source !== "floor") return;
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "move";
                          setDeckCaseDropSlot(index);
                        }}
                        onDragLeave={() => setDeckCaseDropSlot((current) => current === index ? null : current)}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const drag = deckCaseDragRef.current ?? deckCaseDrag;
                          if (drag?.source === "floor") pickUpFloorDeck(drag.deckId);
                          finishDeckCaseDrag();
                        }}
                      >
                        {deckCaseDrag?.source === "floor" ? "여기에 덱 놓기" : "빈 덱 칸"}
                      </div>
                    ))}
                  </div>
                  <div className="deck-editor-deck-body">
                    <div className="deck-editor-deck-list">
                      {deckGroups.map(({ card, cardIds }) => {
                        const cardId = cardIds.at(-1)!;
                        const isTemporary = !originalDeckIdForCard(cardId);
                        return (
                          <button
                            type="button"
                            className={`deck-list-entry rarity-${card.rarity} ${isTemporary ? "is-temporary" : ""}`}
                            key={`${card.effect}:${card.damageType}:${card.name}`}
                            draggable
                            onDragStart={(event) => beginDeckEditorDrag(event, cardId, "deck")}
                            onDragEnd={finishDeckEditorDrag}
                            onMouseEnter={() => setHoveredDeckCard(card)}
                            onMouseLeave={() => setHoveredDeckCard(null)}
                            onFocus={() => setHoveredDeckCard(card)}
                            onBlur={() => setHoveredDeckCard(null)}
                            onClick={() => {
                              if (pendingExtractionTicketId) extractDeckCard(cardId);
                              else if (pendingPaintTicketId) paintDeckCard(cardId);
                            }}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              if (isTemporary || inSafeArea) moveDeckCardToInventory(cardId);
                              else moveDeckCardToTrash(cardId);
                            }}
                            aria-label={pendingExtractionTicketId
                              ? `${card.name} ${cardIds.length}장, 클릭하면 한 장 추출`
                              : pendingPaintTicketId
                                ? `${card.name} ${cardIds.length}장, 클릭하면 한 장 색칠`
                              : inSafeArea
                                ? `${card.name} ${cardIds.length}장, 우클릭하면 한 장을 인벤토리로 이동`
                              : isTemporary
                              ? `${card.name} ${cardIds.length}장, 편집 중 추가됨. 우클릭하면 한 장을 인벤토리로 이동`
                              : `${card.name} ${cardIds.length}장, 우클릭하면 한 장을 휴지통으로 이동`}
                          >
                            <span className="deck-list-cost">{card.cost}</span>
                            <strong>
                              {card.name}
                              {isTemporary && <em className="deck-card-new">NEW!</em>}
                            </strong>
                            <span className="deck-list-count">x{cardIds.length}</span>
                          </button>
                        );
                      })}
                    </div>
                    <aside className="deck-tools-column">
                      <div className="deck-sort-controls" aria-label="덱 정렬">
                        <button
                          type="button"
                          className={deckSortMode === "cost" ? "is-active" : ""}
                          onClick={() => setDeckSortMode("cost")}
                        >
                          비용순
                        </button>
                        <button
                          type="button"
                          className={deckSortMode === "rarity" ? "is-active" : ""}
                          onClick={() => setDeckSortMode("rarity")}
                        >
                          희귀도순
                        </button>
                      </div>
                      <div
                        className={`trash-slot ${deckEditorDropTarget === "trash" ? "is-drop-target" : ""} ${pendingRemovedCards.length > 0 ? "has-cards" : ""}`}
                        onDragOver={(event) => {
                          event.stopPropagation();
                          const drag = deckEditorDragRef.current ?? deckEditorDrag;
                          if (
                            drag?.source !== "deck"
                            || !originalDeckIdForCard(drag.cardId)
                          ) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDeckEditorDropTarget("trash");
                        }}
                        onDrop={(event) => {
                          event.stopPropagation();
                          dropDeckEditorCard(event, "trash");
                        }}
                      >
                        {pendingRemovedCards.length > 0 ? (
                          <>
                            <div className="trash-card-list">
                              {pendingRemovedGroups.map(({ card, cardIds }) => (
                                <button
                                  type="button"
                                  key={`trash-${card.effect}-${card.damageType}-${card.name}`}
                                  draggable
                                  onDragStart={(event) => beginDeckEditorDrag(event, cardIds.at(-1)!, "trash")}
                                  onDragEnd={finishDeckEditorDrag}
                                  onMouseEnter={() => setHoveredDeckCard(card)}
                                  onMouseLeave={() => setHoveredDeckCard(null)}
                                  onFocus={() => setHoveredDeckCard(card)}
                                  onBlur={() => setHoveredDeckCard(null)}
                                  onClick={() => restoreRemovedCard(cardIds.at(-1)!)}
                                  aria-label={`${card.name} ${cardIds.length}장 제거 예정. 누르거나 덱으로 드래그하면 한 장 복구`}
                                >
                                  <span>{card.cost}</span>
                                  <strong>{card.name}</strong>
                                  {cardIds.length > 1 && <b>x{cardIds.length}</b>}
                                </button>
                              ))}
                            </div>
                            <small className="trash-warning">
                              총 {pendingRemovedCards.length}장의 카드가 버려집니다
                            </small>
                          </>
                        ) : (
                          <span className="trash-icon" aria-label="휴지통" />
                        )}
                      </div>
                    </aside>
                    <span className="area-flow-arrow deck-to-trash" aria-hidden="true" />
                  </div>
                </section>
                <div className="area-flow-arrow inventory-deck-flow" aria-hidden="true">
                  <span />
                </div>
              </div>

              <section className="deck-editor-floor-section">
                <div className="area-flow-arrow floor-inventory-flow" aria-hidden="true">
                  <span />
                  <span />
                </div>
                <div className="deck-editor-floor-heading">
                  <div><strong>방 바닥</strong><span>카드 {currentFloorCards.length}장 · 소모품 {currentFloorConsumables.length}개 · 덱 {currentFloorDecks.length}개</span></div>
                </div>
                <div className="deck-editor-floor-layout">
                  <div
                    className={`deck-editor-floor-cards ${deckEditorDropTarget === "floor" ? "is-drop-target" : ""} ${deckCaseDrag?.source === "owned" ? "is-deck-drop-target" : ""}`}
                    onDragOver={(event) => {
                      const deckDrag = deckCaseDragRef.current ?? deckCaseDrag;
                      if (deckDrag?.source === "owned") {
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = "move";
                        return;
                      }
                      const itemDrag = consumableDragRef.current ?? consumableDrag;
                      if (itemDrag?.source === "inventory") {
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = "move";
                        return;
                      }
                      const drag = deckEditorDragRef.current ?? deckEditorDrag;
                      const source = drag?.source;
                      const temporaryDeckCard = source === "deck"
                        && drag
                        && (inSafeArea || !originalDeckIdForCard(drag.cardId));
                      if (source !== "inventory" && !temporaryDeckCard) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDeckEditorDropTarget("floor");
                    }}
                    onDrop={(event) => {
                      const deckDrag = deckCaseDragRef.current ?? deckCaseDrag;
                      if (deckDrag?.source === "owned") {
                        event.preventDefault();
                        event.stopPropagation();
                        dropOwnedDeck(deckDrag.deckId);
                        finishDeckCaseDrag();
                        return;
                      }
                      if ((consumableDragRef.current ?? consumableDrag)?.source === "inventory") {
                        dropConsumable(event, "floor");
                        return;
                      }
                      dropDeckEditorCard(event, "floor");
                    }}
                  >
                    {currentFloorDecks.map((deck) => (
                      <button
                        type="button"
                        className="floor-deck-item"
                        key={deck.id}
                        draggable
                        onDragStart={(event) => beginDeckCaseDrag(event, deck.id, "floor")}
                        onDragEnd={finishDeckCaseDrag}
                        onClick={() => pickUpFloorDeck(deck.id)}
                        aria-label={`${deck.name}, 카드 ${deck.cards.length}장, 용량 ${deck.capacity}. 누르면 줍기`}
                      >
                        <span className="floor-deck-icon" aria-hidden="true" />
                        <strong>{deck.name}</strong>
                        <span>{deck.cards.length} / {deck.capacity}</span>
                        <small>눌러서 줍기</small>
                      </button>
                    ))}
                    {currentFloorConsumables.map((consumable) => (
                      <button
                        type="button"
                        className={`consumable-ticket floor-ticket ${consumable.type}`}
                        key={consumable.id}
                        draggable
                        onDragStart={(event) => beginConsumableDrag(event, consumable.id, "floor")}
                        onDragEnd={finishConsumableDrag}
                        onClick={() => moveFloorConsumableToInventory(consumable.id)}
                      >
                        <span className="ticket-mark" aria-hidden="true">T</span>
                        <strong>{consumable.name}</strong>
                        <small>{consumable.description}</small>
                      </button>
                    ))}
                    {floorGroups.map(({ card, cardIds }) => (
                      <button
                        type="button"
                        className={`deck-editor-card card-face ${card.kind} ${card.damageType} ${deckEditorDrag?.cardId === cardIds.at(-1) ? "is-dragging" : ""}`}
                        key={`${card.effect}:${card.damageType}:${card.name}`}
                        draggable
                        onDragStart={(event) => beginDeckEditorDrag(event, cardIds.at(-1)!, "floor")}
                        onDragEnd={finishDeckEditorDrag}
                        onClick={() => moveFloorCardToInventory(cardIds.at(-1)!)}
                        aria-label={`${card.name} ${cardIds.length}장, 한 장을 인벤토리에 줍기`}
                      >
                        <CardFace card={card} />
                        {cardIds.length > 1 && <span className="inventory-card-count">x{cardIds.length}</span>}
                      </button>
                    ))}
                    {currentFloorCards.length === 0 && currentFloorConsumables.length === 0 && currentFloorDecks.length === 0 && (
                      <span className="floor-empty-copy">바닥에 물품이 없습니다</span>
                    )}
                  </div>
                </div>
              </section>

              <footer className="deck-editor-footer">
                <div className="deck-editor-footer-actions">
                  <button type="button" className="cancel" onClick={cancelDeckEditor}>취소</button>
                  <button
                    type="button"
                    className="confirm"
                    onClick={confirmDeckEditor}
                    disabled={inventoryItemCount > INVENTORY_CAPACITY}
                  >편집 확인</button>
                </div>
              </footer>
              </section>
              {hoveredDeckCard && (
                <aside className="deck-card-preview-floating" aria-live="polite">
                  <div className={`card-face ${hoveredDeckCard.kind} ${hoveredDeckCard.damageType}`}>
                    <CardFace card={hoveredDeckCard} />
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {deckViewerOpen && (
          <div className="deck-viewer-overlay" role="dialog" aria-modal="true" aria-labelledby="deck-viewer-title">
            <section className="deck-viewer-panel">
              <header>
                <div>
                  <p>DECK</p>
                  <h2 id="deck-viewer-title">{viewedDeck?.name ?? "덱 보기"}</h2>
                  <span>{viewedDeck?.cards.length ?? 0} / {viewedDeck?.capacity ?? 0}장</span>
                </div>
                <button type="button" onClick={() => setDeckViewerOpen(false)}>닫기</button>
              </header>
              <nav className="deck-viewer-tabs" aria-label="볼 덱 선택">
                {ownedDecks.map((deck, index) => (
                  <button
                    type="button"
                    className={deck.id === viewedDeck?.id ? "is-active" : ""}
                    key={`viewer-tab-${deck.id}`}
                    onClick={() => setDeckViewerDeckId(deck.id)}
                  >
                    <strong>덱 {index + 1}</strong>
                    <span>{deck.cards.length} / {deck.capacity}</span>
                  </button>
                ))}
                {Array.from({ length: MAX_OWNED_DECKS - ownedDecks.length }, (_, index) => (
                  <span className="is-empty" key={`viewer-empty-${index}`}>빈 덱 칸</span>
                ))}
              </nav>
              <div className="deck-viewer-grid">
                {(viewedDeck?.cards ?? []).map((card) => (
                  <div className="deck-viewer-card" key={`viewer-${card.id}`}>
                    <div className={`card-face ${card.kind} ${card.damageType}`}>
                      <CardFace card={card} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SOLITAIRE DECKBATTLE · PROTOTYPE</p>
          <h1>카드 파일 전투</h1>
        </div>
        <div className="turn-badge" aria-label={`현재 ${game.turn}턴`}>
          <span>TURN</span><strong>{game.turn}</strong>
        </div>
        {debugMode && game.status === "playing" && (
          <button type="button" className="debug-defeat-trigger" onClick={defeatEnemiesForDebug}>
            적 즉시 처치
          </button>
        )}
      </header>

      <section
        className={`battlefield ${dragging ? `${dragging.source.type === "hand" ? `dragging-${dragging.card.kind}` : "dragging-from-pile"} dragging-solitaire` : ""} ${lockedEnemyId ? "has-lock" : ""}`}
        aria-label="전투 화면"
      >
        <div className="enemy-zone">
          <div className={`enemies-row ${game.enemies.length > 2 ? "is-crowded" : ""}`}>
            {game.enemies.map((enemy) => {
              const defeated = enemy.hp === 0;
              const intent = enemy.actions[enemy.intentIndex];
              const intentType = enemy.nextAttackMagic
                ? "magic"
                : intent.attacks[0]?.type ?? "buff";
              return (
                <button
                  type="button"
                  className={`enemy-unit ${enemy.variant} ${defeated ? "is-defeated" : ""} ${lockedEnemyId === enemy.id ? "is-locked" : ""} ${attackingEnemyId === enemy.id ? "is-attacking" : ""}`}
                  data-drop-target={defeated ? undefined : `enemy:${enemy.id}`}
                  key={enemy.id}
                  onClick={() => toggleLock(enemy)}
                  disabled={defeated}
                  aria-pressed={lockedEnemyId === enemy.id}
                  aria-label={`${enemy.name}${defeated ? ", 격파됨" : lockedEnemyId === enemy.id ? ", 록온됨" : ", 클릭하여 록온"}`}
                >
                  {lockedEnemyId === enemy.id && <span className="lock-badge">LOCK ON</span>}
                  {!defeated && <div className="drop-prompt attack-prompt">이 적을 공격</div>}
                  <div className={`intent intent-card ${defeated ? "is-defeated" : intentType}`}>
                    <span>{defeated ? "상태" : "다음 행동"}</span>
                    {defeated ? (
                      <strong>격파</strong>
                    ) : (
                      <>
                        <strong>{intent.name}</strong>
                        <small>{actionSummary(
                          intent,
                          enemy.strength,
                          enemy.nextAttackMagic,
                        )}</small>
                      </>
                    )}
                  </div>
                  <div className="monster" aria-label={enemy.name}>
                    <div className="monster-horns"><i /><i /></div>
                    <div className="monster-face"><b /><b /><span /></div>
                  </div>
                  <div className="unit-stats enemy-stats">
                    <strong>{enemy.name}</strong>
                    <div className="healthbar enemy-health">
                      <i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                      <span>{enemy.hp} / {enemy.maxHp}</span>
                    </div>
                    <div className="enemy-effects">
                      {enemy.strength > 0 && <span>힘 {enemy.strength}</span>}
                      {enemy.sturdyThreshold > 0 && <span>단단함 ≤{enemy.sturdyThreshold}</span>}
                      {enemy.quicknessReady && <span>재빠름 준비</span>}
                      {enemy.nextAttackMagic && <span>다음 공격 마법</span>}
                      {enemy.trait && <small>{enemy.trait}</small>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pile-zone">
          <div className="section-label">
            <span>{game.pendingSweep ? "가져올 파일 선택" : game.pendingDraws > 0 ? "드로우할 파일 선택" : "파일"}</span>
            <small>{game.pendingSweep
              ? "원하는 파일을 클릭해 모든 카드를 손으로 가져오세요"
              : game.pendingDraws > 0
                ? "원하는 파일을 클릭해 맨 위 카드를 가져오세요"
                : "각 파일의 맨 위 카드를 턴 시작에 가져옵니다"}</small>
          </div>
          <div className="piles" aria-label="카드 파일들">
            {game.piles.map((pile, index) => {
              const stackOffset = getStackOffset(pile.length);
              return (
                <div
                  className={`solitaire-pile ${game.pendingDraws > 0 || game.pendingSweep ? pile.length > 0 ? "is-draw-choice" : "is-draw-empty" : ""}`}
                  key={index}
                  data-pile-index={index}
                  data-drop-target={`pile:${index}`}
                  aria-label={`${index + 1}번 파일, ${pile.length}장`}
                  onClick={() => game.pendingSweep ? takeSelectedPile(index) : drawSelectedPile(index)}
                >
                {pile.length === 0 && <div className="empty-slot" aria-hidden="true" />}
                {pile.map((card, cardIndex) => {
                  const isTop = cardIndex === pile.length - 1;
                  const faceUp = card.revealed;
                  const isMoving = dragging?.source.type === "pile"
                    && dragging.source.pileIndex === index
                    && cardIndex >= dragging.source.cardIndex;
                  return (
                    <div
                      className={`stacked-card ${faceUp ? `card-face face-up pile-draggable-card ${card.kind} ${card.damageType}` : "face-down"} ${isMoving ? "is-dragging" : ""}`}
                      style={{
                        top: `${cardIndex * stackOffset}px`,
                        "--stack-index": cardIndex,
                      } as CSSProperties}
                      key={card.id}
                      data-card-id={card.id}
                      data-top-card-id={isTop ? card.id : undefined}
                      aria-hidden={!faceUp}
                      role={faceUp ? "button" : undefined}
                      tabIndex={faceUp ? 0 : undefined}
                      onPointerDown={faceUp ? (event) => beginDrag(
                        event,
                        card,
                        { type: "pile", pileIndex: index, cardIndex },
                        pile.slice(cardIndex),
                      ) : undefined}
                      onPointerMove={faceUp ? moveDrag : undefined}
                      onPointerUp={faceUp ? finishDrag : undefined}
                      onPointerCancel={faceUp ? cancelDrag : undefined}
                    >
                      {faceUp ? <CardFace card={card} /> : <span className={`card-back-pattern ${card.colored ? "is-painted" : ""}`} />}
                    </div>
                  );
                })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="center-drop-zone" data-drop-target="defend">
          <div className="drop-prompt defend-prompt">
            {dragging?.card.kind === "strike" && dragging.card.effect !== "ironRampage" && lockedEnemyId
              ? `록온 공격: ${game.enemies.find((enemy) => enemy.id === lockedEnemyId)?.name}`
              : dragging?.card.effect === "ironRampage"
                ? "여기에 놓아 전체 공격"
              : dragging?.card.kind === "defend"
                ? `여기에 놓아 ${DEFENSE_LABEL[dragging.card.damageType]}`
                : dragging?.card.kind === "skill"
                  ? "여기에 놓아 사용"
                  : "여기에 놓아 수비"}
          </div>
          <div className="defense-shields" aria-label="현재 방어도">
            <div className="defense-shield physical" aria-label={`방어 ${game.playerPhysicalBlock}`}>
              <span>방어</span>
              <strong>{game.playerPhysicalBlock}</strong>
            </div>
            <div className="defense-shield magic" aria-label={`마법 방어 ${game.playerMagicBlock}`}>
              <span>마법 방어</span>
              <strong>{game.playerMagicBlock}</strong>
            </div>
          </div>
          <div className="combat-buffs" aria-label="현재 강화 효과">
            <span>힘 {game.strength}</span>
            {game.defenseMultiplier > 1 && <span>방어 ×{game.defenseMultiplier}</span>}
            {game.damageTakenMultiplier > 1 && <span>받는 피해 ×{game.damageTakenMultiplier}</span>}
            {game.invulnerable && <span>피해 면역</span>}
            {game.doubleNextAttack && <span>다음 공격 2회</span>}
          </div>
          <div className="status-strip" role="status" aria-live="polite">{game.message}</div>
        </div>

        <div className="player-zone">
          {damagePopup && (
            <div className={`damage-popup ${damagePopup.text === "막음" ? "is-blocked" : ""}`} key={damagePopup.key}>
              {damagePopup.text}
            </div>
          )}
          <div className="player-panel">
            <div className="player-avatar">P</div>
            <div className="player-details">
              <strong>방랑자</strong>
              <div className="healthbar player-health">
                <i style={{ width: `${(game.playerHp / MAX_PLAYER_HP) * 100}%` }} />
                <span>{game.playerHp} / {MAX_PLAYER_HP}</span>
              </div>
              {inventoryConsumables.length > 0 && (
                <div className="battle-consumables" aria-label="보유 소모품">
                  {inventoryConsumables.map((consumable) => (
                    <button
                      type="button"
                      className={consumable.type}
                      key={consumable.id}
                      onClick={() => consumable.type === "swiftTicket" && consumeSwiftTicket(consumable.id)}
                      disabled={consumable.type !== "swiftTicket" || controlsLocked || game.energy < 1}
                      title={consumable.description}
                    >
                      <span>T</span>
                      <strong>{consumable.name}</strong>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            className={`hand ${phase === "discarding" ? "is-discarding" : ""} ${game.pendingDiscards > 0 ? "is-discard-choice" : ""}`}
            data-drop-target="hand"
            aria-label="손패"
          >
            {game.hand.map((card, index) => (
              <button
                className={`game-card card-face ${card.kind} ${card.damageType} ${dragging?.card.id === card.id ? "is-dragging" : ""}`}
                key={card.id}
                ref={(element) => {
                  if (element) handCardRefs.current.set(card.id, element);
                  else handCardRefs.current.delete(card.id);
                }}
                style={{ "--card-index": index } as CSSProperties}
                onPointerDown={(event) => beginDrag(event, card, { type: "hand" })}
                onPointerMove={moveDrag}
                onPointerUp={finishDrag}
                onPointerCancel={cancelDrag}
                onClick={() => game.pendingDiscards > 0 && discardSelectedCard(card.id)}
                disabled={controlsLocked && game.pendingDiscards === 0}
                aria-label={`${card.name}, 에너지 ${card.cost}`}
              >
                <CardFace card={card} />
              </button>
            ))}
            {game.hand.length === 0 && phase === "playing" && game.status === "playing" && (
              <div className="empty-hand">사용할 카드가 없습니다</div>
            )}
          </div>

          <div className="controls">
            {game.stars > 0 && (
              <div
                className="solitaire-resource"
                aria-label={`솔리테어 행동 자원 ${game.stars}개 남음`}
                title="솔리테어 행동 자원"
              >
                {Array.from({ length: game.stars }, (_, slot) => <span key={slot}>★</span>)}
              </div>
            )}
            <div className="energy-orb" aria-label={`에너지 ${game.energy} 중 3`}>
              <span>{game.energy}</span><small>/ 3</small>
            </div>
            <button className="end-turn" onClick={endTurn} disabled={controlsLocked}>
              턴 종료 <span>→</span>
            </button>
          </div>
        </div>

        {game.status !== "playing" && (
          <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
            <div className={`result-card ${game.status === "won" ? "has-rewards" : ""}`}>
              <p>{game.status === "won" ? "BATTLE CLEARED" : "RUN ENDED"}</p>
              <h2 id="result-title">{game.status === "won" ? "승리" : "패배"}</h2>
              <span>{game.status === "won"
                ? `${game.playerHp} 체력으로 전투를 마쳤습니다.`
                : `${game.turn}턴에서 탐험이 끝났습니다.`}</span>
              {game.status === "won" && (
                <div className="battle-reward-section">
                  <strong>전투 보상</strong>
                  <small>골드는 획득하고, 추가 보상은 이 방 바닥에 떨어집니다.</small>
                  <div className="battle-gold-reward">골드 +{battleRewardGold}</div>
                  <div className="battle-reward-cards">
                    {battleRewards.map((card) => (
                      <div
                        className={`battle-reward-card card-face ${card.kind} ${card.damageType}`}
                        key={card.id}
                      >
                        <CardFace card={card} />
                      </div>
                    ))}
                  </div>
                  {battleRewardDecks.map((deck) => <div className="battle-gold-reward" key={deck.id}>덱 케이스: {deck.cards.length}장</div>)}
                  {battleRewardConsumables.map((item) => <div className="battle-gold-reward" key={item.id}>{item.name}</div>)}
                </div>
              )}
              <button
                onClick={game.status === "won" ? returnToMap : startNewRun}
                disabled={game.status === "won" && battleRewardGold < 1}
              >
                {game.status === "won" ? "다음" : "새 탐험 시작"}
              </button>
            </div>
          </div>
        )}

        {dragging?.moved && (
          <div
            className="drag-stack-preview"
            style={{
              left: dragging.x,
              top: dragging.y,
              height: `${CARD_HEIGHT + Math.max(0, dragging.cards.length - 1) * getStackOffset(dragging.cards.length)}px`,
            }}
            aria-hidden="true"
          >
            {dragging.cards.map((card, index) => (
              <div
                className={`drag-card-preview card-face ${card.kind} ${card.damageType}`}
                style={{ top: `${index * getStackOffset(dragging.cards.length)}px` }}
                key={card.id}
              >
                <CardFace card={card} />
              </div>
            ))}
          </div>
        )}
      </section>

      <aside className="combat-log" aria-label="최근 전투 기록">
        <strong>전투 기록</strong>
        {game.history.map((entry, index) => <span key={`${entry}-${index}`}>{entry}</span>)}
      </aside>
    </main>
  );
}
