"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
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
import {
  advanceBombs,
  applyBombDamage,
  positionsInSquare,
  type MapBomb,
} from "./game/mapEffects";

type CardKind = "strike" | "defend" | "skill" | "power";
type DamageType = "physical" | "magic";
type CardRarity = "basic" | "special" | "rare";
type SolitaireRule = "top" | "bottom" | "spell";
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
  | "adrenaline"
  | "rulerCompass"
  | "berserk"
  | "transcend"
  | "rapidFire"
  | "iceShield"
  | "ironWave"
  | "waterWave"
  | "ironRampage"
  | "magicStrike"
  | "shockwave"
  | "ventilate"
  | "plateArmor"
  | "warmUp"
  | "ironWall"
  | "fourHit"
  | "doubleHit"
  | "starlight"
  | "augment"
  | "fileDraw"
  | "starGuard"
  | "charge"
  | "weaponSharpen"
  | "armorSharpen"
  | "boomerang"
  | "meteor"
  | "counter"
  | "exchange"
  | "flood"
  | "endStart"
  | "superStrategist"
  | "pioneer"
  | "slime"
  | "relic"
  | "soil"
  | "supernova"
  | "combatManual"
  | "grimoire";
type Phase = "drawing" | "playing" | "discarding" | "enemy-turn";
type Screen = "map" | "battle";
type MapPosition = { x: number; y: number };
type RoomType =
  | "void"
  | "rock"
  | "empty"
  | "blessing"
  | "shop"
  | "portal"
  | "heal"
  | "safePortal";
type DeckEditorArea = "deck" | "inventory" | "floor" | "trash";
type BlessingId = "vision" | "lightStep" | "sturdy" | "greed" | "bag" | "athlete" | "luck" | "deckSize" | "ninja";
type DeckEdition =
  | "clever"
  | "roomy"
  | "lively"
  | "fantastic"
  | "transparent"
  | "golden"
  | "rampaging"
  | "greedy"
  | "frugal";
type DeckCase = {
  id: string;
  name: string;
  capacity: number;
  cards: Card[];
  editions: DeckEdition[];
  editionColors: Partial<Record<DeckEdition, string>>;
};
type ConsumableType =
  | "swiftTicket"
  | "paintTicket"
  | "teleportTicket"
  | "bombTicket"
  | "cloneTicket"
  | "cardPack";
const CONSUMABLE_TYPES: ConsumableType[] = [
  "swiftTicket",
  "paintTicket",
  "teleportTicket",
  "bombTicket",
  "cloneTicket",
];

function consumableTypeFromRoll(roll: number) {
  return CONSUMABLE_TYPES[Math.min(
    CONSUMABLE_TYPES.length - 1,
    Math.floor(roll * CONSUMABLE_TYPES.length),
  )];
}
type Consumable = {
  id: string;
  type: ConsumableType;
  name: string;
  description: string;
  armedMovesRemaining?: number;
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
  /** The printed cost.  Temporary cost swaps always revert to this on shuffle. */
  baseCost?: number;
  value: number;
  draw: number;
  damageType: DamageType;
  revealed: boolean;
  drawSlot?: number;
  drawSlotCount?: number;
  colored?: boolean;
  solitaireRule?: SolitaireRule;
  forgeCost?: number;
  forgeTargetName?: string;
  forgeAny?: boolean;
  forged?: boolean;
  exhaust?: boolean;
  /** Power cards leave this battle's deck once they have been used. */
  power?: boolean;
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

type ClearPlan = { pilesBeforeDraw: Card[][]; pilesAfterDraw: Card[][]; hand: Card[] };

type GameState = {
  piles: Card[][];
  hand: Card[];
  discard: Card[];
  /** The player's deck at the beginning of this battle, excluding encounter-only cards. */
  initialDeck: Card[];
  /** Used exhaust and power cards that must not return on the next reshuffle. */
  removedFromReshuffleIds: number[];
  clearPlan: ClearPlan | null;
  energy: number;
  stars: number;
  pendingDraws: number;
  /** A one-time chosen-file draw (used by 뽑아내기). */
  pendingPileDrawCount: number;
  pendingDiscards: number;
  pendingSweep: boolean;
  pendingPileOperation: "discardTop" | "moveTopToBottom" | null;
  turn: number;
  playerHp: number;
  playerPhysicalBlock: number;
  playerMagicBlock: number;
  strength: number;
  temporaryStrength: number;
  agility: number;
  defenseMultiplier: number;
  damageTakenMultiplier: number;
  invulnerable: boolean;
  doubleNextAttack: boolean;
  starsSpent: number;
  reflectDamage: number;
  toxicSlimeAdded: boolean;
  deckEditions: DeckEdition[];
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

const MAX_PLAYER_HP = 50;
const GAME_VERSION = "v0.1.1";
const STARTING_DECK_SIZE = 16;
const INVENTORY_CAPACITY = 12;
const MAX_OWNED_DECKS = 3;
const BLESSING_INFO: Record<BlessingId, { name: string; description: string }> = {
  vision: { name: "시야 확장", description: "시야가 5×5가 됩니다." },
  lightStep: { name: "가벼운 걸음", description: "적의 인식 확률이 절반이 됩니다." },
  sturdy: { name: "튼튼함", description: "최대 체력이 20 증가합니다." },
  greed: { name: "탐욕스러움", description: "골드 획득량이 2배가 됩니다." },
  bag: { name: "가방 업그레이드", description: "인벤토리 +12칸, 덱 슬롯 +1" },
  athlete: { name: "운동선수", description: "30턴마다 이동 1회가 턴을 소모하지 않습니다." },
  luck: { name: "행운", description: "덱·티켓·에디션 확률 +10%p" },
  deckSize: { name: "덱 크기 +5", description: "모든 덱 최대 장수 +5" },
  ninja: { name: "닌자", description: "잠든 적과 전투 시 아드레날린 1장을 얻습니다." },
};
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
// The former 60% view is the comfortable baseline, so present it as 100%.
const MAP_DEFAULT_ZOOM = 0.6;
const MAP_MIN_ZOOM = 0.3;
const MAP_MAX_ZOOM = 0.9;
const MAP_ZOOM_STEP = 0.06;
const MAP_TRAVEL_STEP_MS = 140;
const MAP_COLLISION_OVERLAP_MS = 280;
const MAP_BATTLE_FLASH_MS = 600;
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
    const isCenterRow = position.y === centerY
      && position.x >= SAFE_AREA_ENTRY_X
      && position.x <= SAFE_AREA_PORTAL_X;
    const isVerticalArm = position.x === SAFE_AREA_HEAL_X
      && Math.abs(position.y - centerY) === 1;
    if (isCenterRow || isVerticalArm) return regionIndex;
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
    if (position.y !== safeAreaCenterY(safeRegion)) return "empty";
    if (position.x === SAFE_AREA_ENTRY_X) return "blessing";
    if (position.x === SAFE_AREA_HEAL_X) return "heal";
    return "safePortal";
  }
  for (let regionIndex = 0; regionIndex < REGION_COUNT; regionIndex += 1) {
    const centerY = safeAreaCenterY(regionIndex);
    const originalSafeWall =
      position.x >= SAFE_AREA_START_X - 1
      && position.x <= SAFE_AREA_PORTAL_X + 2
      && position.y >= centerY - 1
      && position.y <= centerY + 1;
    const addedTopBottomWall =
      position.x >= SAFE_AREA_ENTRY_X - 1
      && position.x <= SAFE_AREA_PORTAL_X + 1
      && Math.abs(position.y - centerY) === 2;
    const inSafeWall = originalSafeWall || addedTopBottomWall;
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

function visibleMapRoomKeys(center: MapPosition, seed: number, verticalRadius = MAP_PLAYER_VISION_VERTICAL_RADIUS) {
  const keys = new Set<string>();
  for (let offsetY = -verticalRadius; offsetY <= verticalRadius; offsetY += 1) {
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
    && !isSafeAreaPosition(position)
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
        const type = consumableTypeFromRoll(ticketRoll);
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
  roomTypeAt: (position: MapPosition) => RoomType = (position) => getRoomType(position, seed),
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
      if (!isWalkableRoom(roomTypeAt(next))) continue;
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
];

const LEGACY_SPECIAL_CARD_POOL: CardBlueprint[] = [
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

const LEGACY_RARE_CARD_POOL: CardBlueprint[] = [
  { kind: "skill", effect: "steelHeart", rarity: "rare", name: "강철심장", cost: 0, value: 0, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "transcend", rarity: "rare", name: "초월", cost: 4, value: 0, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "rapidFire", rarity: "rare", name: "연사", cost: 1, value: 0, draw: 0, damageType: "physical" },
];

// 현재 플레이에 등장하는 추가 카드는 이 목록만 사용합니다.
// 위의 LEGACY 목록은 이전 실행 중인 브라우저 상태를 안전하게 읽기 위한
// 호환용 데이터이며, 보상·상점·새 덱에는 더 이상 쓰지 않습니다.
const SPECIAL_CARD_POOL: CardBlueprint[] = [
  { kind: "strike", effect: "strike", rarity: "special", name: "잽", cost: 0, value: 6, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "warmUp", rarity: "special", name: "준비 운동", cost: 0, value: 4, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "starlight", rarity: "special", name: "별빛", cost: 0, value: 2, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "sweep", rarity: "special", name: "휩쓸기", cost: 1, value: 7, draw: 0, damageType: "physical" },
  { kind: "strike", effect: "strike", rarity: "special", name: "기회 포착", cost: 1, value: 6, draw: 1, damageType: "physical" },
  { kind: "skill", effect: "deflect", rarity: "special", name: "기회 창출", cost: 1, value: 5, draw: 1, damageType: "physical" },
  { kind: "strike", effect: "rulerCompass", rarity: "special", name: "자와 컴퍼스", cost: 1, value: 9, draw: 0, damageType: "physical" },
  { kind: "strike", effect: "fourHit", rarity: "special", name: "4연격", cost: 1, value: 2, draw: 0, damageType: "physical" },
  { kind: "strike", effect: "boomerang", rarity: "special", name: "정리 타격", cost: 1, value: 9, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "battlePlan", rarity: "special", name: "전략가", cost: 1, value: 2, draw: 1, damageType: "physical" },
  { kind: "skill", effect: "plateArmor", rarity: "special", name: "판금 갑옷", cost: 1, value: 9, draw: 0, damageType: "physical", forgeCost: 2 },
  { kind: "power", effect: "weaponSharpen", rarity: "special", name: "무기 연마", cost: 1, value: 2, draw: 0, damageType: "physical", power: true },
  { kind: "power", effect: "armorSharpen", rarity: "special", name: "방어구 연마", cost: 1, value: 2, draw: 0, damageType: "physical", power: true },
  { kind: "strike", effect: "meteor", rarity: "special", name: "유성우", cost: 2, value: 9, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "starGuard", rarity: "special", name: "별의 장막", cost: 2, value: 12, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "counter", rarity: "special", name: "응수", cost: 0, value: 0, draw: 0, damageType: "physical" },
  { kind: "strike", effect: "strike", rarity: "special", name: "묵직한 한 방", cost: 3, value: 30, draw: 0, damageType: "physical" },
  { kind: "strike", effect: "exchange", rarity: "special", name: "치환 합금", cost: 3, value: 15, draw: 0, damageType: "physical", forgeAny: true },
  { kind: "skill", effect: "doubleHit", rarity: "special", name: "청동 철퇴", cost: 2, value: 15, draw: 0, damageType: "physical", forgeCost: 3 },
  { kind: "skill", effect: "ironWall", rarity: "special", name: "철벽", cost: 3, value: 20, draw: 0, damageType: "physical", exhaust: true },
  { kind: "skill", effect: "combatManual", rarity: "special", name: "전투 교본", cost: 0, value: 2, draw: 0, damageType: "physical" },
];

const RARE_CARD_POOL: CardBlueprint[] = [
  { kind: "skill", effect: "superStrategist", rarity: "rare", name: "전술가", cost: 1, value: 5, draw: 0, damageType: "physical", exhaust: true },
  { kind: "power", effect: "pioneer", rarity: "rare", name: "개척하기", cost: 1, value: 0, draw: 0, damageType: "physical", power: true },
  { kind: "skill", effect: "grimoire", rarity: "rare", name: "마도서", cost: 0, value: 1, draw: 0, damageType: "physical" },
  { kind: "skill", effect: "supernova", rarity: "rare", name: "초신성", cost: 0, value: 3, draw: 0, damageType: "physical", exhaust: true },
];

function createBattleRewardCard(id: number, rareChance: number): Card {
  const pool = Math.random() < rareChance ? RARE_CARD_POOL : SPECIAL_CARD_POOL;
  const selected = pool[Math.floor(Math.random() * pool.length)];
  return { ...selected, id, revealed: false };
}

function createDeck(): Card[] {
  const make = (
    count: number,
    blueprint: CardBlueprint,
  ) => Array.from({ length: count }, () => ({ ...blueprint }));
  const starterSpecialNames = ["전투 교본", "자와 컴퍼스", "기회 창출", "별의 장막"];
  const starterSpecialCards = starterSpecialNames.map((name) => {
    const blueprint = SPECIAL_CARD_POOL.find((card) => card.name === name);
    if (!blueprint) throw new Error(`Missing starting card: ${name}`);
    return blueprint;
  });
  const blueprints: CardBlueprint[] = [
    ...make(6, BASIC_CARD_POOL[0]),
    ...make(6, BASIC_CARD_POOL[1]),
    ...starterSpecialCards,
  ];
  if (blueprints.length !== STARTING_DECK_SIZE) {
    throw new Error(`Starting deck must contain ${STARTING_DECK_SIZE} cards.`);
  }
  return blueprints.map((card, id) => ({ ...card, id, revealed: false }));
}

function createAdrenalineCard(): Card {
  return {
    id: -1,
    kind: "skill",
    effect: "adrenaline",
    rarity: "rare",
    name: "아드레날린",
    cost: 0,
    value: 1,
    draw: 1,
    damageType: "physical",
    revealed: true,
  };
}

function createSlimeCard(id: number): Card {
  return {
    id,
    kind: "skill",
    effect: "slime",
    rarity: "basic",
    name: "유독성 점액",
    cost: 0,
    value: 1,
    draw: 0,
    damageType: "physical",
    revealed: true,
  };
}

function createGoblinStarterPile(): Card[] {
  const soil = (id: number): Card => ({
    id,
    kind: "skill",
    effect: "soil",
    rarity: "basic",
    name: "흙",
    cost: 1,
    value: 0,
    draw: 1,
    damageType: "physical",
    revealed: false,
  });
  return [
    {
      id: -10000,
      kind: "skill",
      effect: "relic",
      rarity: "rare",
      name: "유물",
      cost: 0,
      value: 4,
      draw: 0,
      damageType: "physical",
      revealed: true,
    },
    soil(-10004),
    soil(-10003),
    soil(-10002),
    soil(-10001),
  ];
}

function createDeckName() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

const DECK_EDITION_INFO: Record<DeckEdition, { name: string; description: string }> = {
  clever: { name: "똑똑한", description: "전투 시작 시 ★를 추가로 2개 얻습니다." },
  roomy: { name: "널널한", description: "전투 시작 시 빈 파일을 추가로 하나 가집니다." },
  lively: { name: "활발한", description: "전투 시작 시 아드레날린 카드를 손에 넣습니다." },
  fantastic: { name: "환상적인", description: "파일을 4장씩 쌓고, 덱 최대 장수가 10% 줄어듭니다." },
  transparent: { name: "투명한", description: "파일 생성 시 첫 번째 파일의 카드를 모두 앞면으로 놓습니다." },
  golden: { name: "황금의", description: "모든 희귀 카드를 앞면으로 놓습니다." },
  rampaging: { name: "폭주하는", description: "턴 시작 에너지가 1 증가하고, 덱 최대 장수가 20% 줄어듭니다." },
  greedy: { name: "탐욕스러운", description: "전투 보상으로 얻는 골드가 3배가 됩니다." },
  frugal: { name: "알뜰한", description: "턴 종료 시 남은 에너지를 ★로 전환합니다." },
};
const EDITION_COLORS = ["#c63f3f", "#ba741d", "#4378c7", "#7650ae", "#21825f", "#bd3f7a"];

function rollDeckEditions(initialChance = 0.5): DeckEdition[] {
  const remaining = Object.keys(DECK_EDITION_INFO) as DeckEdition[];
  const editions: DeckEdition[] = [];
  let chance = initialChance;
  while (remaining.length > 0 && Math.random() < chance) {
    const index = Math.floor(Math.random() * remaining.length);
    editions.push(remaining.splice(index, 1)[0]);
    chance -= 0.2;
  }
  return editions;
}

function createEditionColors(editions: DeckEdition[]) {
  return Object.fromEntries(editions.map((edition) => [
    edition,
    EDITION_COLORS[Math.floor(Math.random() * EDITION_COLORS.length)],
  ])) as Partial<Record<DeckEdition, string>>;
}

function DeckName({ deck, showEditions = true }: { deck: DeckCase; showEditions?: boolean }) {
  return (
    <span className="deck-name-with-editions">
      {showEditions && deck.editions.map((edition) => (
        <span
          className="deck-edition-name"
          key={edition}
          style={{ color: deck.editionColors[edition] }}
        >
          {DECK_EDITION_INFO[edition].name}
          <span className="deck-edition-tooltip" role="tooltip">
            <b>{DECK_EDITION_INFO[edition].name}</b> — {DECK_EDITION_INFO[edition].description}
          </span>{" "}
        </span>
      ))}덱 {deck.name}
    </span>
  );
}

function createStarterDeck(): DeckCase {
  return { id: "starter", name: "", capacity: STARTER_DECK_CAPACITY, cards: createDeck(), editions: [], editionColors: {} };
}

function rollDeckTier(regionNumber: number) {
  return regionNumber;
}

function createRandomDeck(regionNumber: number, startId: number, editionBonus = 0, capacityBonus = 0): DeckCase {
  const tier = rollDeckTier(regionNumber);
  const editions = rollDeckEditions(Math.min(1, 0.5 + editionBonus));
  const capacityReduction = (editions.includes("fantastic") ? 0.1 : 0)
    + (editions.includes("rampaging") ? 0.2 : 0);
  const capacity = Math.round((20 + tier * 5) * (1 - capacityReduction)) + capacityBonus;
  const cards: Card[] = [];
  let nextId = startId;
  for (let slot = 0; slot < capacity; slot += 1) {
    const roll = Math.random();
    let pool: CardBlueprint[] | null = null;
    if (roll < 0.4) pool = null;
    else if (roll < 0.6) pool = BASIC_CARD_POOL;
    else if (roll < 0.98) pool = SPECIAL_CARD_POOL;
    else pool = RARE_CARD_POOL;
    if (!pool) continue;
    const blueprint = pool[Math.floor(Math.random() * pool.length)];
    cards.push({ ...blueprint, id: nextId, revealed: false });
    nextId += 1;
  }
  return {
    id: `found-r${regionNumber}-${startId}-${Math.random().toString(36).slice(2, 8)}`,
    name: createDeckName(),
    capacity,
    cards,
    editions,
    editionColors: createEditionColors(editions),
  };
}

function createConsumable(type: ConsumableType, id: string): Consumable {
  if (type === "teleportTicket") {
    return {
      id,
      type,
      name: "순간이동 티켓",
      description: "주변 9×9 범위의 안전한 무작위 칸으로 이동합니다.",
    };
  }
  if (type === "bombTicket") {
    return {
      id,
      type,
      name: "폭탄 티켓",
      description: "점화한 뒤 바닥에 내려놓으면 3번 이동 후 폭발합니다.",
    };
  }
  if (type === "cloneTicket") {
    return {
      id,
      type,
      name: "복제 티켓",
      description: "카드나 티켓 하나를 복제합니다.",
    };
  }
  if (type === "cardPack") {
    return { id, type, name: "카드 팩", description: "특별·희귀 카드 5장이 들어 있습니다." };
  }
  return type === "paintTicket"
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
        description: "무료로 카드 1장을 드로우합니다.",
      };
}

function createBattleReward(
  regionNumber: number,
  nextCardId: number,
  deckDropChance: number,
  ticketBonus = 0,
  editionBonus = 0,
  capacityBonus = 0,
  rareCardChance = 0.05,
) {
  const gold = 15 + Math.floor(Math.random() * 16);
  const decks = Math.random() < deckDropChance
    ? [createRandomDeck(regionNumber, nextCardId, editionBonus, capacityBonus)]
    : [];
  return {
    gold,
    cards: decks.length > 0 ? [] : [createBattleRewardCard(nextCardId, rareCardChance)],
    decks,
    consumableType: Math.random() < Math.min(1, 0.5 + ticketBonus)
      ? consumableTypeFromRoll(Math.random())
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

function buildPiles(
  cards: Card[],
  cardsPerPile = 5,
  firstPileFaceUp = false,
  extraEmptyPiles = 0,
  rareCardsFaceUp = false,
): Card[][] {
  const piles: Card[][] = [];
  for (let index = 0; index < cards.length; index += cardsPerPile) {
    const pile = cards.slice(index, index + cardsPerPile).map((card) => ({
      ...card,
      revealed: (firstPileFaceUp && index === 0) || (rareCardsFaceUp && card.rarity === "rare"),
    }));
    if (pile.length > 0) pile[pile.length - 1].revealed = true;
    piles.push(pile);
  }
  for (let index = 0; index < extraEmptyPiles; index += 1) piles.push([]);
  return piles;
}

function prepareDeckForPiles(deck: Card[]) {
  return shuffle(deck.map((card) => ({
    ...card,
    cost: card.baseCost ?? card.cost,
    baseCost: undefined,
    revealed: false,
    forged: false,
  })));
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

function drawFromPileIndexes(piles: Card[][], indexes: number[]) {
  const nextPiles = piles.map((pile) => [...pile]);
  const hand: Card[] = [];
  for (const index of indexes) {
    const pile = nextPiles[index];
    if (!pile) continue;
    const card = pile.pop();
    if (card) hand.push({ ...card, revealed: true, drawSlot: index, drawSlotCount: piles.length });
    if (pile.length > 0) pile[pile.length - 1] = { ...pile[pile.length - 1], revealed: true };
  }
  return { piles: nextPiles, hand };
}

function drawFromFirstPile(piles: Card[][]) {
  const nextPiles = piles.map((pile) => [...pile]);
  const pile = nextPiles[0];
  const card = pile?.pop();
  if (!card) return { piles: nextPiles, hand: [] as Card[] };
  if (pile.length > 0) pile[pile.length - 1] = { ...pile[pile.length - 1], revealed: true };
  return { piles: nextPiles, hand: [{ ...card, revealed: true }] };
}

function drawOneFromPiles(piles: Card[][]) {
  const nextPiles = piles.map((pile) => [...pile]);
  const pile = nextPiles.find((candidate) => candidate.length > 0);
  if (!pile) return { piles: nextPiles, hand: [] as Card[] };
  const card = pile.pop();
  if (!card) return { piles: nextPiles, hand: [] as Card[] };
  if (pile.length > 0) pile[pile.length - 1] = { ...pile[pile.length - 1], revealed: true };
  return { piles: nextPiles, hand: [{ ...card, revealed: true }] };
}

function waitingState(
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
    stars: 2,
    pendingDraws: 0,
    pendingPileDrawCount: 0,
    pendingDiscards: 0,
    pendingSweep: false,
    pendingPileOperation: null,
    turn: 1,
    playerHp,
    playerPhysicalBlock: 0,
    playerMagicBlock: 0,
    strength: 0,
    temporaryStrength: 0,
    agility: 0,
    defenseMultiplier: 1,
    damageTakenMultiplier: 1,
    invulnerable: false,
    doubleNextAttack: false,
    starsSpent: 0,
    reflectDamage: 0,
    toxicSlimeAdded: false,
    deckEditions: [],
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
  deckEditions: DeckEdition[] = [],
): GameState {
  const preparedDeck = prepareDeckForPiles(deck);
  const initialPiles = buildPiles(
    preparedDeck,
    deckEditions.includes("fantastic") ? 4 : 5,
    deckEditions.includes("transparent"),
    deckEditions.includes("roomy") ? 1 : 0,
    deckEditions.includes("golden"),
  );
  if (enemies.some((enemy) => enemy.variant === "goblin")) initialPiles.push(createGoblinStarterPile());
  return {
    ...waitingState(playerHp, enemies),
    piles: initialPiles,
    hand: deckEditions.includes("lively") ? [createAdrenalineCard()] : [],
    initialDeck: deck.map((card) => ({ ...card, revealed: false })),
    energy: deckEditions.includes("rampaging") ? 4 : 3,
    stars: deckEditions.includes("clever") ? 4 : 2,
    deckEditions,
    message: "파일 배치 완료 — 맨 위 카드를 가져옵니다.",
  };
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function lowestHealthEnemy(enemies: EnemyState[]) {
  return enemies
    .filter((enemy) => enemy.hp > 0)
    .reduce<EnemyState | undefined>((lowest, enemy) => !lowest || enemy.hp < lowest.hp ? enemy : lowest, undefined);
}

function CardFace({ card, starsSpent = 0, strength = 0, agility = 0 }: { card: Card; starsSpent?: number; strength?: number; agility?: number }) {
  const damageValue = card.value + strength;
  const defenseValue = card.value + agility;
  const effectText = (() => {
    switch (card.effect) {
      case "strike":
        return <><span className="effect-type damage">피해 {damageValue}</span>{card.draw > 0 && <span>드로우 {card.draw}</span>}</>;
      case "pommel":
        return <><span className="effect-type damage">피해 {damageValue}</span><span>첫 번째 파일에서 드로우 1</span></>;
      case "defend":
        return <span className={`effect-type ${card.damageType}`}>{DEFENSE_LABEL[card.damageType]} {defenseValue}</span>;
      case "deflect":
        return <><span className="effect-type physical">방어 {defenseValue}</span><span>1 드로우</span></>;
      case "steelHeart":
        return <span>이번 턴 동안 얻는<br /><span className="effect-type physical">방어</span>/<span className="effect-type magic">마법 방어</span> 2배</span>;
      case "battlePlan":
        return <><span>★ {card.value} 획득</span><span>드로우 {card.draw}</span></>;
      case "prepare":
        return <span>1장 뽑고<br />1장 버립니다</span>;
      case "focus":
        return <span>에너지 1 획득<br />카드 1장 버림</span>;
      case "adrenaline":
        return <span>에너지 1 획득<br />1 드로우</span>;
      case "sweep":
        return <span className="effect-type damage">모든 적에게 피해 {damageValue}</span>;
      case "drawEachPile":
        return <span>모든 파일에서<br />1장씩 뽑습니다</span>;
      case "rulerCompass":
        return <><span className="effect-type damage">피해 {damageValue}</span><span>★를 얻습니다</span></>;
      case "berserk":
        return <span>에너지 2 획득<br />이번 턴 받는 피해 2배</span>;
      case "transcend":
        return <span>이번 턴 피해 면역<br />힘 5를 얻습니다</span>;
      case "rapidFire":
        return <span>다음 공격 카드가<br />한 번 더 발동</span>;
      case "iceShield":
        return <span className="effect-type magic">마법 방어 {defenseValue}</span>;
        return <><span className="effect-type magic">마법 방어 {card.value}</span><span>★를 얻습니다</span></>;
      case "magicStrike":
        return <span className="effect-type damage">체력이 가장 낮은 적에게 피해 {damageValue}</span>;
      case "shockwave":
        return <span className="effect-type damage">적 전체 피해 {damageValue}</span>;
      case "ventilate":
        return <span>에너지 {card.value} 획득</span>;
      case "plateArmor":
        return <><span className="effect-type physical">방어 {defenseValue}</span>{!card.forged && <span>제련 후 비용 1 감소</span>}</>;
      case "warmUp":
        return <span>이번 턴 힘 {card.value}</span>;
      case "ironWall":
        return <span className="effect-type physical">방어 {defenseValue}</span>;
      case "fourHit":
        return <span className="effect-type damage">피해 {damageValue} × 4</span>;
      case "doubleHit":
        return <span className="effect-type damage">피해 {damageValue} × {card.forged ? 2 : "1(2)"}번</span>;
      case "starlight":
        return <span>★ {card.value} 획득</span>;
      case "augment":
        return <span>힘과 강인함 {card.value} 획득</span>;
      case "fileDraw":
        return <span>{card.forged ? "모든 파일에서 1장씩 드로우" : "파일 하나 선택, 위에서부터 3장 드로우"}</span>;
      case "starGuard":
        return <><span className="effect-type physical">방어 {defenseValue}</span><span>★ 2 획득</span></>;
      case "charge":
        return <span>에너지 {card.value} 획득</span>;
      case "weaponSharpen":
        return <span>힘 +{card.value}</span>;
      case "armorSharpen":
        return <span>강인함 +{card.value}</span>;
      case "boomerang":
        return card.name === "정리 타격"
          ? <><span className="effect-type damage">피해 {damageValue}</span><span>파일 하나의 맨 위 카드를 버림</span></>
          : <><span className="effect-type damage">피해 {damageValue}</span><span>파일 하나의 맨 위 카드를 맨 밑으로 보냄</span></>;
      case "meteor":
        return <span className="effect-type damage">이번 턴 사용한 ★당 무작위 적에게 피해 {damageValue} ({starsSpent}번)</span>;
      case "counter":
        return <span>이번 턴 막은 피해를 반사</span>;
      case "exchange":
        return <span className="effect-type damage">피해 {damageValue}. 재련 시 밑패와 비용 교환</span>;
      case "flood":
        return <span>피라미드(4-3-2-1). 에너지 +2, 드로우 2, ★ +2</span>;
      case "endStart":
        return <span>에너지 +{card.value}. 모든 파일이 비어있어야 사용 가능</span>;
      case "superStrategist":
        return <span>★ +5. 소멸</span>;
      case "pioneer":
        return <span>빈 파일 하나 생성</span>;
      case "slime":
        return <span>턴 종료 시 손패에 있다면 피해 12.<br />사용 불가.</span>;
      case "relic":
        return <span>도깨비의 힘 -4</span>;
      case "soil":
        return <span>드로우 1</span>;
      case "supernova":
        return <span>★ 3개 소모<br />에너지 +3</span>;
      case "combatManual":
        return <span>사용 불가.<br />손에 있는 동안 힘 +2, 강인함 +2</span>;
      case "grimoire":
        return <span>사용 불가.<br />손에 있는 동안 카드를 낼 때마다 ★ +1</span>;
      case "ironWave":
        return <><span className="effect-type damage">피해 {damageValue}</span><span className="effect-type physical">방어 5</span></>;
      case "waterWave":
        return <><span className="effect-type damage">피해 {damageValue}</span><span className="effect-type magic">마법 방어 5</span></>;
      case "ironRampage":
        return <><span className="effect-type damage">적 전체 피해 {damageValue}</span><span className="effect-type physical">방어 5</span></>;
    }
  })();
  return (
    <>
      {card.effect !== "slime" && <span className="card-cost">{card.cost}</span>}
      <strong className={`card-name rarity-${card.rarity} ${card.colored ? "is-painted" : ""} ${card.name.length >= 6 ? "is-long" : ""}`}>{card.name}{card.forged ? "+" : ""}</strong>
      <span className="card-effect">{card.solitaireRule && <strong className="solitaire-rule solitaire-keyword">{card.solitaireRule === "top" ? "윗패" : card.solitaireRule === "bottom" ? "밑패" : "주문"}</strong>}{effectText}{card.forged ? <strong className="solitaire-rule">재련됨.</strong> : (card.forgeCost !== undefined || card.forgeTargetName || card.forgeAny) && <strong className="solitaire-rule">제련: {card.forgeTargetName ? `[${card.forgeTargetName}]` : card.forgeAny ? "[아무거나]" : `[${card.forgeCost}코스트]`}</strong>}{card.exhaust && <strong className="solitaire-rule">소멸</strong>}{card.power && <strong className="solitaire-rule">파워</strong>}</span>
    </>
  );
}

function isRuleMatchedPlacement(movingCard: Card, targetCard?: Card) {
  if (movingCard.solitaireRule === "top") return targetCard?.solitaireRule === "bottom";
  if (movingCard.solitaireRule === "spell") {
    return targetCard?.solitaireRule === "spell" && targetCard.cost === movingCard.cost + 1;
  }
  return false;
}

function canPlaceBySolitaireRule(movingCard: Card, targetCard?: Card) {
  if (movingCard.solitaireRule === "top" || movingCard.solitaireRule === "spell") {
    return isRuleMatchedPlacement(movingCard, targetCard);
  }
  return true;
}

// A spell straight is read from the top of a pile: X, X+1, X+2.
// The array is returned in firing order (top card first).
function getSpellStraight(pile: Card[]) {
  if (pile.length < 3) return null;
  const cards = pile.slice(-3).reverse();
  if (!cards.every((card) => card.solitaireRule === "spell")) return null;
  if (cards[1].cost !== cards[0].cost + 1) return null;
  if (cards[2].cost !== cards[1].cost + 1) return null;
  return cards;
}

// 범람(4) 위에 3, 2, 1코스트가 차례로 쌓인 피라미드.
function getFloodPyramid(pile: Card[]) {
  if (pile.length < 4) return null;
  const cards = pile.slice(-4);
  if (cards[0].effect !== "flood" || cards[0].cost !== 4) return null;
  return cards[1].cost === 3 && cards[2].cost === 2 && cards[3].cost === 1 ? cards : null;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("map");
  const [runPlayerHp, setRunPlayerHp] = useState(MAX_PLAYER_HP);
  const runPlayerHpRef = useRef(MAX_PLAYER_HP);
  const [mapSeed, setMapSeed] = useState(1);
  const [mapPosition, setMapPosition] = useState<MapPosition>(MAP_START);
  const [seenRooms, setSeenRooms] = useState<Set<string>>(
    () => new Set([mapRoomKey(MAP_START)]),
  );
  const [mapEnemyWorld, setMapEnemyWorld] = useState<MapEnemyWorld>(() => ({
    enemies: [],
  }));
  const [mapBombs, setMapBombs] = useState<MapBomb[]>([]);
  const mapBombsRef = useRef<MapBomb[]>([]);
  const [destroyedShopRooms, setDestroyedShopRooms] = useState<Set<string>>(() => new Set());
  const [usedHealRooms, setUsedHealRooms] = useState<Set<string>>(() => new Set());
  const [usedBlessingRooms, setUsedBlessingRooms] = useState<Set<string>>(() => new Set());
  const [rockBombHits, setRockBombHits] = useState<Record<string, number>>({});
  const [activeMapEnemyIds, setActiveMapEnemyIds] = useState<string[]>([]);
  const [activeBattleRoom, setActiveBattleRoom] = useState<string | null>(null);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [mapZoom, setMapZoom] = useState(MAP_DEFAULT_ZOOM);
  const [mapTraveling, setMapTraveling] = useState(false);
  const [mapTravelStepMs, setMapTravelStepMs] = useState(MAP_TRAVEL_STEP_MS);
  const [mapCollisionEnemyIds, setMapCollisionEnemyIds] = useState<string[]>([]);
  const [mapBattleFlash, setMapBattleFlash] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugPasswordOpen, setDebugPasswordOpen] = useState(false);
  const [debugPassword, setDebugPassword] = useState("");
  const [debugSpawnSelection, setDebugSpawnSelection] = useState("card:basic:0");
  const [mapMessage, setMapMessage] = useState("");
  const [mapMessageNonce, setMapMessageNonce] = useState(0);
  const [ownedDecks, setOwnedDecks] = useState<DeckCase[]>(() => [createStarterDeck()]);
  const [activeDeckId, setActiveDeckId] = useState("starter");
  const [deckSelectorOpen, setDeckSelectorOpen] = useState(false);
  const [deckSelectorClosing, setDeckSelectorClosing] = useState(false);
  const [deckSelectorClosingDeckId, setDeckSelectorClosingDeckId] = useState<string | null>(null);
  const [deckSelectionAttention, setDeckSelectionAttention] = useState(false);
  const [inventoryCards, setInventoryCards] = useState<Card[]>([]);
  const [inventoryConsumables, setInventoryConsumables] = useState<Consumable[]>([]);
  const inventoryConsumablesRef = useRef<Consumable[]>([]);
  const [roomDrops, setRoomDrops] = useState<Record<string, Card[]>>({});
  const [roomConsumableDrops, setRoomConsumableDrops] = useState<Record<string, Consumable[]>>({});
  const [roomDeckDrops, setRoomDeckDrops] = useState<Record<string, DeckCase[]>>({});
  const [roomShops, setRoomShops] = useState<Record<string, ShopOffer[]>>({});
  const [shopOpen, setShopOpen] = useState(false);
  const [blessingOpen, setBlessingOpen] = useState(false);
  const [blessingOffers, setBlessingOffers] = useState<BlessingId[]>([]);
  const [blessings, setBlessings] = useState<BlessingId[]>([]);
  const [blessingRerollCost, setBlessingRerollCost] = useState(50);
  const [athleteCooldown, setAthleteCooldown] = useState(0);
  const [athletePrepared, setAthletePrepared] = useState(false);
  const [activeShopRoom, setActiveShopRoom] = useState<string | null>(null);
  const [shopMessage, setShopMessage] = useState("필요한 물건을 골라보세요.");
  const [gold, setGold] = useState(0);
  const [battleRewards, setBattleRewards] = useState<Card[]>([]);
  const [battleRewardDecks, setBattleRewardDecks] = useState<DeckCase[]>([]);
  const [battleRewardConsumables, setBattleRewardConsumables] = useState<Consumable[]>([]);
  const [battleRewardGold, setBattleRewardGold] = useState(0);
  const [deckEditorOpen, setDeckEditorOpen] = useState(false);
  const [deckEditorDeckId, setDeckEditorDeckId] = useState("");
  const [deckViewerOpen, setDeckViewerOpen] = useState(false);
  const [deckViewerDeckId, setDeckViewerDeckId] = useState("");
  const [deckEditorDrag, setDeckEditorDrag] = useState<{ cardId: number; source: DeckEditorArea } | null>(null);
  const deckEditorDragRef = useRef<{ cardId: number; source: DeckEditorArea } | null>(null);
  const [deckEditorDropTarget, setDeckEditorDropTarget] = useState<DeckEditorArea | null>(null);
  const [consumableDrag, setConsumableDrag] = useState<{ id: string; source: ConsumableArea } | null>(null);
  const consumableDragRef = useRef<{ id: string; source: ConsumableArea } | null>(null);
  const [pendingPaintTicketId, setPendingPaintTicketId] = useState<string | null>(null);
  const [pendingCloneTicketId, setPendingCloneTicketId] = useState<string | null>(null);
  const [armedBombTicketIds, setArmedBombTicketIds] = useState<Set<string>>(() => new Set());
  const [deckCaseDrag, setDeckCaseDrag] = useState<{ deckId: string; source: "floor" | "owned" } | null>(null);
  const deckCaseDragRef = useRef<{ deckId: string; source: "floor" | "owned" } | null>(null);
  const [deckCaseDropSlot, setDeckCaseDropSlot] = useState<number | null>(null);
  const [, setDeckEditorMessage] = useState("안전 구역에서는 카드를 자유롭게 옮길 수 있습니다. 다른 곳에서는 덱 카드를 휴지통으로 제거할 수 있습니다.");
  const [deckEditorSnapshot, setDeckEditorSnapshot] = useState<DeckEditorSnapshot | null>(null);
  const [openedCardPack, setOpenedCardPack] = useState<Card[] | null>(null);
  const [hoveredDeckCard, setHoveredDeckCard] = useState<Card | null>(null);
  const [deckPreviewPosition, setDeckPreviewPosition] = useState({ x: 0, y: 0 });
  const [game, setGame] = useState<GameState>(waitingState);
  const [phase, setPhase] = useState<Phase>("drawing");
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [lockedEnemyId, setLockedEnemyId] = useState<string | null>(null);
  const [attackingEnemyId, setAttackingEnemyId] = useState<string | null>(null);
  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);
  const [pileClearNotice, setPileClearNotice] = useState(false);
  const nextCardIdRef = useRef(STARTING_DECK_SIZE);
  const nextConsumableIdRef = useRef(1);
  const deckSelectorCloseTimerRef = useRef<number | null>(null);
  const deckDropChanceRef = useRef(0.25);
  const rareCardDropChanceRef = useRef(0.05);
  const activeDeck = ownedDecks.find((deck) => deck.id === activeDeckId) ?? ownedDecks[0];
  const deckCards = activeDeck?.cards ?? [];
  const inventoryCapacity = INVENTORY_CAPACITY + (blessings.includes("bag") ? 12 : 0);
  const maxOwnedDecks = MAX_OWNED_DECKS + (blessings.includes("bag") ? 1 : 0);
  const maxPlayerHp = MAX_PLAYER_HP + (blessings.includes("sturdy") ? 20 : 0);
  const visionVerticalRadius = blessings.includes("vision") ? 2 : MAP_PLAYER_VISION_VERTICAL_RADIUS;
  const editingDeck = ownedDecks.find((deck) => deck.id === deckEditorDeckId) ?? activeDeck;
  const editingDeckCards = editingDeck?.cards ?? [];
  useEffect(() => {
    if (!ownedDecks.some((deck) => deck.id === "starter" && deck.name === "")) return;
    setOwnedDecks((current) => current.map((deck) => deck.id === "starter" && deck.name === ""
      ? { ...deck, name: createDeckName() }
      : deck));
  }, [ownedDecks]);
  useEffect(() => {
    inventoryConsumablesRef.current = inventoryConsumables;
  }, [inventoryConsumables]);
  useEffect(() => () => {
    if (deckSelectorCloseTimerRef.current !== null) {
      window.clearTimeout(deckSelectorCloseTimerRef.current);
    }
  }, []);
  const showMapMessage = (message: string) => {
    setMapMessage(message);
    setMapMessageNonce((current) => current + 1);
  };
  const openDeckSelector = () => {
    if (deckSelectorCloseTimerRef.current !== null) {
      window.clearTimeout(deckSelectorCloseTimerRef.current);
      deckSelectorCloseTimerRef.current = null;
    }
    setDeckSelectorClosing(false);
    setDeckSelectorClosingDeckId(null);
    setDeckSelectorOpen(true);
  };
  const closeDeckSelector = (selectedDeckId?: string) => {
    if (!deckSelectorOpen || deckSelectorClosing) return;
    setDeckSelectorClosing(true);
    setDeckSelectorClosingDeckId(selectedDeckId ?? null);
    if (deckSelectorCloseTimerRef.current !== null) {
      window.clearTimeout(deckSelectorCloseTimerRef.current);
    }
    deckSelectorCloseTimerRef.current = window.setTimeout(() => {
      setDeckSelectorOpen(false);
      setDeckSelectorClosing(false);
      setDeckSelectorClosingDeckId(null);
      deckSelectorCloseTimerRef.current = null;
    }, selectedDeckId ? 700 : 360);
  };
  const toggleDeckSelector = () => {
    if (deckSelectorOpen && !deckSelectorClosing) {
      closeDeckSelector();
      return;
    }
    openDeckSelector();
  };
  const setMapBombsSynced = (bombs: MapBomb[]) => {
    mapBombsRef.current = bombs;
    setMapBombs(bombs);
  };
  const effectiveRoomType = (position: MapPosition) => {
    const baseType = getRoomType(position, mapSeed);
    const roomKey = mapRoomKey(position);
    if (baseType === "shop" && destroyedShopRooms.has(roomKey)) return "empty";
    if (baseType === "heal" && usedHealRooms.has(roomKey)) return "empty";
    if (baseType === "blessing" && usedBlessingRooms.has(roomKey)) return "empty";
    if (baseType === "rock" && (rockBombHits[roomKey] ?? 0) >= 3) return "empty";
    return baseType;
  };
  const toggleDebugMode = () => {
    if (debugMode) {
      setDebugMode(false);
      return;
    }
    setDebugPassword("");
    setDebugPasswordOpen(true);
  };
  const submitDebugPassword = () => {
    if (debugPassword === "6384") {
      setDebugMode(true);
      setDebugPasswordOpen(false);
    }
  };
  const updateActiveDeckCards = (updater: Card[] | ((cards: Card[]) => Card[])) => {
    setOwnedDecks((current) => current.map((deck) => {
      if (deck.id !== activeDeck?.id) return deck;
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
  const spawnDebugItemOnFloor = () => {
    if (!debugMode) return;
    const roomKey = mapRoomKey(mapPosition);

    if (debugSpawnSelection === "deck:random") {
      const deck = createRandomDeck(getRegionNumber(mapPosition), nextCardIdRef.current, blessings.includes("luck") ? .1 : 0, blessings.includes("deckSize") ? 5 : 0);
      nextCardIdRef.current += deck.cards.length;
      setRoomDeckDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), deck],
      }));
      return;
    }

    if (debugSpawnSelection.startsWith("consumable:")) {
      const type = debugSpawnSelection.slice("consumable:".length) as ConsumableType;
      if (!CONSUMABLE_TYPES.includes(type)) return;
      const consumable = nextConsumable(type);
      setRoomConsumableDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), consumable],
      }));
      return;
    }

    const [, rarity, rawIndex] = debugSpawnSelection.split(":");
    let blueprint: CardBlueprint | undefined;
    if (rarity === "basic") blueprint = BASIC_CARD_POOL[Number(rawIndex)];
    if (rarity === "special") blueprint = SPECIAL_CARD_POOL[Number(rawIndex)];
    if (rarity === "rare") blueprint = RARE_CARD_POOL[Number(rawIndex)];

    const card = rarity === "adrenaline"
      ? { ...createAdrenalineCard(), id: nextCardIdRef.current, revealed: false }
      : blueprint
        ? { ...blueprint, id: nextCardIdRef.current, revealed: false }
        : null;
    if (!card) return;
    nextCardIdRef.current += 1;
    setRoomDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), card],
    }));
  };
  const updateEditingDeckCards = (updater: Card[] | ((cards: Card[]) => Card[])) => {
    setOwnedDecks((current) => current.map((deck) => {
      if (deck.id !== editingDeck?.id) return deck;
      const cards = typeof updater === "function" ? updater(deck.cards) : updater;
      return { ...deck, cards };
    }));
  };
  const grantBattleReward = (regionNumber: number) => {
    const reward = createBattleReward(regionNumber, nextCardIdRef.current, Math.min(1, deckDropChanceRef.current + (blessings.includes("luck") ? .1 : 0)), blessings.includes("luck") ? .1 : 0, blessings.includes("luck") ? .1 : 0, blessings.includes("deckSize") ? 5 : 0, rareCardDropChanceRef.current);
    const generatedCardCount = reward.cards.length + reward.decks.reduce((total, deck) => total + deck.cards.length, 0);
    nextCardIdRef.current += generatedCardCount;
    deckDropChanceRef.current = reward.decks.length > 0
      ? 0.25
      : Math.min(1, deckDropChanceRef.current + 0.1);
    if (reward.cards.length > 0) {
      rareCardDropChanceRef.current = reward.cards[0].rarity === "rare"
        ? 0.05
        : Math.min(1, rareCardDropChanceRef.current + 0.02);
    }
    setBattleRewardGold(reward.gold * (activeDeck?.editions.includes("greedy") ? 3 : 1) * (blessings.includes("greed") ? 2 : 1));
    setBattleRewards(reward.cards);
    setBattleRewardDecks(reward.decks);
    setBattleRewardConsumables(reward.consumableType ? [nextConsumable(reward.consumableType)] : []);
  };

  // 전투 승리 상태가 먼저 반영되는 경로에서도 보상이 비어 있지 않도록 보완한다.
  useEffect(() => {
    if (
      screen === "battle"
      && game.status === "won"
      && battleRewardGold === 0
      && battleRewards.length === 0
      && battleRewardDecks.length === 0
      && battleRewardConsumables.length === 0
    ) {
      grantBattleReward(getRegionNumber(mapPosition));
    }
  }, [screen, game.status, battleRewardGold, battleRewards.length, battleRewardDecks.length, battleRewardConsumables.length, mapPosition]);

  const createShopStock = (depth: number): ShopOffer[] => {
    const variedPrice = (basePrice: number) => Math.round(basePrice * (0.8 + Math.random() * 0.4));
    const makeRareCardOffer = (slot: number): ShopOffer => {
      const blueprint = RARE_CARD_POOL[Math.floor(Math.random() * RARE_CARD_POOL.length)];
      const card = { ...blueprint, id: nextCardIdRef.current, revealed: false };
      nextCardIdRef.current += 1;
      return {
        id: `shop-card-${depth}-${slot}-${card.id}`,
        price: variedPrice(150),
        card,
        sold: false,
      };
    };
    const consumables = Array.from({ length: 2 }, (_, slot) => {
      const ticketRoll = Math.random();
      const type = consumableTypeFromRoll(ticketRoll);
      const consumable = nextConsumable(type);
      const basePrice = type === "cloneTicket" ? 100 : 20;
      return {
        id: `shop-item-${depth}-${slot}-${consumable.id}`,
        price: variedPrice(basePrice),
        consumable,
        sold: false,
      };
    });
    const cardPacks = Array.from({ length: 2 }, (_, slot) => {
      const consumable = nextConsumable("cardPack");
      return { id: `shop-pack-${depth}-${slot}-${consumable.id}`, price: variedPrice(80), consumable, sold: false };
    });
    return [
      ...consumables,
      ...cardPacks,
      makeRareCardOffer(4),
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
      setShopMessage(`🪙 ${offer.price - gold}이 부족합니다.`);
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

  const openCardPack = (packId: string) => {
    if (inventoryItemCount + 4 > inventoryCapacity) {
      setDeckEditorMessage("카드 팩을 열려면 인벤토리 빈칸이 4개 더 필요합니다.");
      return;
    }
    const pack = inventoryConsumables.find((item) => item.id === packId && item.type === "cardPack");
    if (!pack) return;
    const pool = [...SPECIAL_CARD_POOL, ...RARE_CARD_POOL];
    const cards = Array.from({ length: 5 }, () => {
      const blueprint = pool[Math.floor(Math.random() * pool.length)];
      const card = { ...blueprint, id: nextCardIdRef.current, revealed: false };
      nextCardIdRef.current += 1;
      return card;
    });
    setInventoryConsumables((current) => current.filter((item) => item.id !== packId));
    setInventoryCards((current) => [...current, ...cards]);
    setOpenedCardPack(cards);
  };
  const pendingOriginsRef = useRef(new Map<number, DOMRect>());
  const handCardRefs = useRef(new Map<number, HTMLButtonElement>());
  const dragRef = useRef<DragState & { startX: number; startY: number } | null>(null);
  const timersRef = useRef<number[]>([]);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const mapTravelTimerRef = useRef<number | null>(null);
  const mapMovementKeysRef = useRef(new Set<string>());
  const mapMovementTimerRef = useRef<number | null>(null);
  const numpadMovementKeysRef = useRef(new Set<string>());
  const numpadMovementTimerRef = useRef<number | null>(null);
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
      const clearPlan = current.clearPlan;
      const clearedAllPiles = clearPlan !== null;
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
        : draw.hand;
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
                piles: planned.pilesAfterDraw,
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
      const nonEmptyPileIndexes = draw.piles
        .map((pile, index) => pile.length > 0 ? index : -1)
        .filter((index) => index >= 0);
      const enemiesAfterDiscardTargeting = current.enemies.map((enemy) => {
        const intent = enemy.actions[enemy.intentIndex];
        return intent.discardCount
          ? { ...enemy, discardPileIndex: nonEmptyPileIndexes.length > 0 ? pickRandom(nonEmptyPileIndexes) : undefined }
          : { ...enemy, discardPileIndex: undefined };
      });
      const slimeCardCount = current.enemies.filter((enemy) => enemy.variant === "slime").length;
      const toxicSlimes = current.toxicSlimeAdded
        ? []
        : Array.from({ length: slimeCardCount }, () => createSlimeCard(nextCardIdRef.current++));
      return {
        ...current,
        piles: draw.piles,
        enemies: enemiesAfterDiscardTargeting,
        hand: [...current.hand, ...initialDraw, ...toxicSlimes],
        energy: current.deckEditions.includes("rampaging") ? 4 : 3,
        pendingDraws: 0,
        pendingPileDrawCount: 0,
        pendingDiscards: 0,
        pendingSweep: false,
        playerPhysicalBlock: 0,
        playerMagicBlock: 0,
        defenseMultiplier: 1,
        damageTakenMultiplier: 1,
        invulnerable: false,
        toxicSlimeAdded: current.toxicSlimeAdded || toxicSlimes.length > 0,
        message: clearedAllPiles ? "CLEAR! 새 파일을 배치합니다."
          : toxicSlimes.length > 0
          ? `${draw.hand.length}장을 가져왔습니다. 주황 슬라임이 유독성 점액을 손패에 넣었습니다.`
          : `${draw.hand.length}장을 각 파일에서 가져왔습니다.`,
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
    const visibleKeys = visibleMapRoomKeys(position, seed, visionVerticalRadius);
    setSeenRooms((current) => new Set([...current, ...visibleKeys]));
  };

  const startBattle = (
    encounters: { encounterIndex: number; damageTaken?: number; awareness?: "sleeping" | "awake" | "alerted" }[],
    playerHp = runPlayerHp,
  ) => {
    clearBattleTimers();
    clearMapTravel();
    setDeckEditorOpen(false);
    setDeckViewerOpen(false);
    setDeckSelectorOpen(false);
    setDragging(null);
    setLockedEnemyId(null);
    setAttackingEnemyId(null);
    setDamagePopup(null);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    const battleEnemies = encounters.flatMap((encounter) =>
      createSewerEncounterByIndex(encounter.encounterIndex).map((enemy) => ({
        ...enemy,
        hp: Math.max(0, enemy.hp - (encounter.damageTaken ?? 0)),
      })));
    const dealtGame = dealtState(
      playerHp,
      deckCards,
      battleEnemies,
      activeDeck?.editions ?? [],
    );
    const nextGame = blessings.includes("ninja") && encounters.some((encounter) => encounter.awareness === "sleeping")
      ? { ...dealtGame, hand: [...dealtGame.hand, { ...createAdrenalineCard(), id: nextCardIdRef.current++ }] }
      : dealtGame;
    const defeatedByBomb = battleEnemies.every((enemy) => enemy.hp === 0);
    setPhase(defeatedByBomb ? "playing" : "drawing");
    setGame(defeatedByBomb
      ? { ...nextGame, status: "won", message: "폭발 피해로 모든 적이 쓰러졌습니다." }
      : nextGame);
    setScreen("battle");
    if (defeatedByBomb) grantBattleReward(getRegionNumber(mapPosition));
    else later(drawCards, 360);
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
    void position;
  };

  const rollBlessingOffers = (owned = blessings) => {
    const available = (Object.keys(BLESSING_INFO) as BlessingId[]).filter((id) => !owned.includes(id));
    return [...available].sort(() => Math.random() - .5).slice(0, 3);
  };
  const openBlessings = () => {
    setBlessingOffers((current) => current.length > 0 ? current : rollBlessingOffers());
    setBlessingOpen(true);
  };
  const chooseBlessing = (blessing: BlessingId) => {
    if (!blessingOffers.includes(blessing) || blessings.includes(blessing)) return;
    setBlessings((current) => [...current, blessing]);
    if (blessing === "sturdy") {
      runPlayerHpRef.current += 20;
      setRunPlayerHp((current) => current + 20);
    }
    if (blessing === "vision") {
      setSeenRooms((current) => new Set([...current, ...visibleMapRoomKeys(mapPosition, mapSeed, 2)]));
    }
    if (blessing === "deckSize") setOwnedDecks((current) => current.map((deck) => ({ ...deck, capacity: deck.capacity + 5 })));
    setUsedBlessingRooms((current) => new Set(current).add(mapRoomKey(mapPosition)));
    setBlessingOffers([]);
    setBlessingOpen(false);
  };
  const rerollBlessings = () => {
    if (gold < blessingRerollCost) return;
    setGold((current) => current - blessingRerollCost);
    setBlessingRerollCost((current) => current + 10);
    setBlessingOffers(rollBlessingOffers());
  };
  const activateAthlete = () => {
    if (!blessings.includes("athlete") || athleteCooldown > 0) return;
    setAthletePrepared((current) => !current);
  };

  const advanceBombsAfterMovement = (
    playerPosition: MapPosition,
    world: MapEnemyWorld,
  ) => {
    const bombStep = advanceBombs(mapBombsRef.current);
    setMapBombsSynced(bombStep.bombs);
    const carriedBombExplosions: MapBomb[] = [];
    const nextInventoryConsumables = inventoryConsumablesRef.current.flatMap((consumable) => {
      if (consumable.type !== "bombTicket" || consumable.armedMovesRemaining === undefined) {
        return [consumable];
      }
      if (consumable.armedMovesRemaining <= 1) {
        carriedBombExplosions.push({
          id: `carried-bomb-${consumable.id}`,
          position: { ...playerPosition },
          movesRemaining: 0,
        });
        return [];
      }
      return [{ ...consumable, armedMovesRemaining: consumable.armedMovesRemaining - 1 }];
    });
    if (carriedBombExplosions.length > 0 || nextInventoryConsumables.some((item, index) =>
      item !== inventoryConsumablesRef.current[index])) {
      inventoryConsumablesRef.current = nextInventoryConsumables;
      setInventoryConsumables(nextInventoryConsumables);
    }
    const explosions = [...bombStep.explosions, ...carriedBombExplosions];
    if (explosions.length === 0) {
      return { world, playerDefeated: false };
    }

    const affectedPositions = explosions.flatMap((bomb) =>
      positionsInSquare(bomb.position, 1));
    setDestroyedShopRooms((current) => {
      const next = new Set(current);
      affectedPositions.forEach((position) => {
        if (getRoomType(position, mapSeed) === "shop") next.add(mapRoomKey(position));
      });
      return next;
    });
    setRockBombHits((current) => {
      const next = { ...current };
      affectedPositions.forEach((position) => {
        if (getRoomType(position, mapSeed) !== "rock") return;
        const roomKey = mapRoomKey(position);
        next[roomKey] = Math.min(3, (next[roomKey] ?? 0) + 1);
      });
      return next;
    });

    const playerHitCount = explosions.filter((bomb) =>
      chebyshevDistance(bomb.position, playerPosition) <= 1).length;
    let playerDefeated = false;
    if (playerHitCount > 0) {
      const nextHp = Math.max(0, runPlayerHpRef.current - 20 * playerHitCount);
      runPlayerHpRef.current = nextHp;
      setRunPlayerHp(nextHp);
      playerDefeated = nextHp === 0;
      if (playerDefeated) {
        clearMapTravel();
        setGame({
          ...waitingState(0, []),
          status: "lost",
          message: "폭탄에 휘말려 쓰러졌습니다.",
        });
        setPhase("playing");
        setScreen("battle");
      }
    }
    return {
      world: {
        ...world,
        enemies: applyBombDamage(world.enemies, explosions),
      },
      playerDefeated,
    };
  };

  const useCurrentPortal = () => {
    const roomType = effectiveRoomType(mapPosition);
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
    if (athleteCooldown > 0) setAthleteCooldown((current) => Math.max(0, current - 1));
    const roomKey = mapRoomKey(nextPosition);
    // A player stepping onto an enemy still starts a battle, but never cancels
    // the rest of the enemy phase.  Remember that contact before everyone acts.
    const playerCollisionIds = new Set(world.enemies
      .filter((enemy) => mapRoomKey(enemy.position) === roomKey)
      .map((enemy) => enemy.id));

    const enemyTurn = advanceMapEnemies(
      world.enemies,
      currentPosition,
      nextPosition,
      (position) => isWalkableRoom(effectiveRoomType(position)) && !isSafeAreaPosition(position),
      Math.random,
      playerCollisionIds,
      blessings.includes("lightStep") ? 0.5 : 1,
    );
    const nextWorld = {
      ...world,
      enemies: enemyTurn.enemies,
    };
    const collisionEnemyIds = new Set([
      ...playerCollisionIds,
      ...enemyTurn.collisionEnemyIds,
    ]);
    const collisionEnemies = enemyTurn.enemies.filter((enemy) =>
      collisionEnemyIds.has(enemy.id));
    return { world: nextWorld, collisionEnemies };
  };

  const beginMapEnemyBattle = (
    enemies: { id: string; encounterIndex: number; damageTaken?: number; awareness?: "sleeping" | "awake" | "alerted" }[],
    roomKey: string,
  ) => {
    setActiveMapEnemyIds(enemies.map((enemy) => enemy.id));
    setActiveBattleRoom(roomKey);
    startBattle(enemies, runPlayerHpRef.current);
  };

  const useCurrentHeal = () => {
    if (effectiveRoomType(mapPosition) !== "heal") return;
    const roomKey = mapRoomKey(mapPosition);
    runPlayerHpRef.current = maxPlayerHp;
    setRunPlayerHp(maxPlayerHp);
    setUsedHealRooms((current) => new Set(current).add(roomKey));
  };

  const animateMapCollision = (
    enemies: { id: string; encounterIndex: number; damageTaken?: number }[],
    roomKey: string,
  ) => {
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
    if (!isWalkableRoom(effectiveRoomType(nextPosition))) return;
    if (athletePrepared) {
      const bombResult = advanceBombsAfterMovement(nextPosition, mapEnemyWorld);
      setMapPosition(nextPosition);
      rememberPlayerVision(nextPosition);
      setMapEnemyWorld(bombResult.world);
      setAthleteCooldown(30);
      setAthletePrepared(false);
      if (!bombResult.playerDefeated) activateRoomFeature(nextPosition);
      return;
    }
    const roomKey = mapRoomKey(nextPosition);
    const result = resolveMapStep(mapPosition, nextPosition, mapEnemyWorld);
    const bombResult = advanceBombsAfterMovement(nextPosition, result.world);
    const bombWorld = bombResult.world;
    const collisionIds = new Set(result.collisionEnemies.map((enemy) => enemy.id));
    const collisionEnemies = bombWorld.enemies.filter((enemy) => collisionIds.has(enemy.id));
    setMapPosition(nextPosition);
    rememberPlayerVision(nextPosition);
    setMapEnemyWorld(bombWorld);
    if (bombResult.playerDefeated) return;
    if (collisionEnemies.length > 0) {
      animateMapCollision(collisionEnemies, roomKey);
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
    if (debugMode) {
      const destination = path.at(-1)!;
      clearMapTravel();
      setMapPosition(destination);
      rememberPlayerVision(destination);
      focusMapOn(destination);
      activateRoomFeature(destination);
      return;
    }
    if (mapEnemyWorld.enemies.some((enemy) =>
      isInPlayerVision(enemy.position, mapPosition, MAP_PLAYER_VISION_HORIZONTAL_RADIUS, visionVerticalRadius))) {
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
      const bombResult = advanceBombsAfterMovement(nextPosition, result.world);
      const bombWorld = bombResult.world;
      const collisionIds = new Set(result.collisionEnemies.map((enemy) => enemy.id));
      const collisionEnemies = bombWorld.enemies.filter((enemy) => collisionIds.has(enemy.id));
      currentPosition = nextPosition;
      currentWorld = bombWorld;
      setMapPosition(nextPosition);
      rememberPlayerVision(nextPosition);
      setMapEnemyWorld(bombWorld);
      if (bombResult.playerDefeated) {
        mapTravelTimerRef.current = null;
        setMapTraveling(false);
        return;
      }

      if (collisionEnemies.length > 0) {
        mapTravelTimerRef.current = null;
        animateMapCollision(collisionEnemies, roomKey);
        return;
      }
      if (bombWorld.enemies.some((enemy) =>
        isInPlayerVision(enemy.position, nextPosition, MAP_PLAYER_VISION_HORIZONTAL_RADIUS, visionVerticalRadius))) {
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
    runPlayerHpRef.current = game.playerHp;
    setRunPlayerHp(game.playerHp);
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
    runPlayerHpRef.current = MAX_PLAYER_HP;
    setRunPlayerHp(MAX_PLAYER_HP);
    setMapSeed(nextSeed);
    setMapPosition(MAP_START);
    setMapMessage("");
    setSeenRooms(visibleMapRoomKeys(MAP_START, nextSeed));
    setMapEnemyWorld(createPreGeneratedMapEnemyWorld(nextSeed));
    setMapBombsSynced([]);
    setDestroyedShopRooms(new Set());
    setUsedHealRooms(new Set());
    setUsedBlessingRooms(new Set());
    setRockBombHits({});
    setActiveMapEnemyIds([]);
    setActiveBattleRoom(null);
    setOwnedDecks([starterDeck]);
    setActiveDeckId(starterDeck.id);
    setDeckSelectionAttention(false);
    setInventoryCards([]);
    setInventoryConsumables([]);
    const floorDrops = createPreGeneratedMapFloorDrops(nextSeed);
    setRoomDrops(floorDrops.cards);
    setRoomConsumableDrops(floorDrops.consumables);
    setRoomDeckDrops({});
    setRoomShops({});
    setShopOpen(false);
    setBlessingOpen(false);
    setBlessingOffers([]);
    setBlessings([]);
    setBlessingRerollCost(50);
    setAthleteCooldown(0);
    setAthletePrepared(false);
    setActiveShopRoom(null);
    setGold(0);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    deckDropChanceRef.current = 0.25;
    rareCardDropChanceRef.current = 0.05;
    setDeckEditorOpen(false);
    setDeckViewerOpen(false);
    setDeckEditorSnapshot(null);
    setHoveredDeckCard(null);
    setPendingPaintTicketId(null);
    setPendingCloneTicketId(null);
    setArmedBombTicketIds(new Set());
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

  const showDeckCardPreview = (
    card: Card,
    clientX: number,
    clientY: number,
  ) => {
    const margin = 12;
    const offset = 18;
    const previewWidth = 104;
    const previewHeight = 146;
    setHoveredDeckCard(card);
    setDeckPreviewPosition({
      x: Math.max(margin, Math.min(clientX + offset, window.innerWidth - previewWidth - margin)),
      y: Math.max(margin, Math.min(clientY + offset, window.innerHeight - previewHeight - margin)),
    });
  };

  const moveDeckCardPreview = (event: ReactMouseEvent<HTMLElement>, card: Card) => {
    showDeckCardPreview(card, event.clientX, event.clientY);
  };

  const moveDeckCardToInventory = (cardId: number) => {
    if (!isSafeAreaPosition(mapPosition)) {
      setDeckEditorMessage("안전 구역 밖에서는 덱의 카드를 꺼낼 수 없습니다. 필요 없는 카드는 휴지통으로 제거하세요.");
      return;
    }
    if (editingDeckCards.length <= 1) {
      setDeckEditorMessage("덱에는 반드시 카드가 1장 이상 있어야 합니다.");
      return;
    }
    if (inventoryItemCount >= inventoryCapacity) {
      setDeckEditorMessage("인벤토리가 가득 찼습니다.");
      return;
    }
    const card = editingDeckCards.find((item) => item.id === cardId);
    if (!card) return;
    updateEditingDeckCards((current) => current.filter((item) => item.id !== cardId));
    setInventoryCards((current) => [...current, card]);
    setDeckEditorMessage(`${card.name}을(를) 인벤토리로 옮겼습니다.`);
  };

  const removeDeckCard = (cardId: number) => {
    if (editingDeckCards.length <= 1) {
      setDeckEditorMessage("덱에는 반드시 카드가 1장 이상 있어야 합니다.");
      return;
    }
    const card = editingDeckCards.find((item) => item.id === cardId);
    if (!card) return;
    updateEditingDeckCards((current) => current.filter((item) => item.id !== cardId));
    setHoveredDeckCard(null);
    setDeckEditorMessage(`${card.name}을(를) 덱에서 제거했습니다. 취소하면 되돌릴 수 있습니다.`);
  };

  const moveInventoryCardToDeck = (cardId: number) => {
    if (!editingDeck || editingDeckCards.length >= editingDeck.capacity) {
      setDeckEditorMessage(`${activeDeck?.name ?? "현재 덱"}에는 더 이상 카드를 넣을 수 없습니다.`);
      return;
    }
    const card = inventoryCards.find((item) => item.id === cardId);
    if (!card) return;
    setInventoryCards((current) => current.filter((item) => item.id !== cardId));
    updateEditingDeckCards((current) => [...current, card]);
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
    if (inventoryItemCount >= inventoryCapacity) {
      showMapMessage("인벤토리가 가득찼습니다!");
      return;
    }
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
    if (!editingDeck || editingDeckCards.length >= editingDeck.capacity) {
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
    updateEditingDeckCards((current) => [...current, card]);
    setDeckEditorMessage(`${card.name}을(를) 바닥에서 덱에 넣었습니다.`);
  };

  const moveFloorConsumableToInventory = (consumableId: string) => {
    if (inventoryItemCount >= inventoryCapacity) {
      showMapMessage("인벤토리가 가득찼습니다!");
      return;
    }
    const roomKey = mapRoomKey(mapPosition);
    const consumable = (roomConsumableDrops[roomKey] ?? []).find((item) => item.id === consumableId);
    if (!consumable) return;
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).filter((item) => item.id !== consumableId),
    }));
    setInventoryConsumables((current) => {
      const next = current.some((item) => item.id === consumable.id)
        ? current
        : [...current, consumable];
      inventoryConsumablesRef.current = next;
      return next;
    });
    setDeckEditorMessage(`${consumable.name}을(를) 인벤토리에 주웠습니다.`);
  };

  const moveInventoryConsumableToFloor = (consumableId: string) => {
    const consumable = inventoryConsumablesRef.current.find((item) => item.id === consumableId)
      ?? inventoryConsumables.find((item) => item.id === consumableId);
    if (!consumable) return;
    const roomKey = mapRoomKey(mapPosition);
    setInventoryConsumables((current) => {
      const next = current.filter((item) => item.id !== consumableId);
      inventoryConsumablesRef.current = next;
      return next;
    });
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), consumable],
    }));
    if (pendingPaintTicketId === consumableId) setPendingPaintTicketId(null);
    if (pendingCloneTicketId === consumableId) setPendingCloneTicketId(null);
    setArmedBombTicketIds((current) => {
      const next = new Set(current);
      next.delete(consumableId);
      return next;
    });
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

  const closeDeckEditorAfterMapTicket = () => {
    setDeckEditorSnapshot(null);
    setHoveredDeckCard(null);
    setPendingPaintTicketId(null);
    setPendingCloneTicketId(null);
    setArmedBombTicketIds(new Set());
    finishConsumableDrag();
    finishDeckEditorDrag();
    setDeckEditorOpen(false);
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

  const consumeTeleportTicket = (consumableId: string) => {
    const ticket = inventoryConsumables.find((item) =>
      item.id === consumableId && item.type === "teleportTicket");
    if (!ticket) return;
    const candidates = positionsInSquare(mapPosition, 4).filter((position) => {
      if (chebyshevDistance(position, mapPosition) <= 2) return false;
      const roomType = effectiveRoomType(position);
      return roomType !== "rock"
        && isWalkableRoom(roomType)
        && !mapEnemyWorld.enemies.some((enemy) => mapRoomKey(enemy.position) === mapRoomKey(position));
    });
    if (candidates.length === 0) {
      setDeckEditorMessage("순간이동할 수 있는 안전한 칸이 없습니다.");
      return;
    }
    const destination = candidates[Math.floor(Math.random() * candidates.length)];
    setInventoryConsumables((current) => current.filter((item) => item.id !== consumableId));
    closeDeckEditorAfterMapTicket();
    const bombResult = advanceBombsAfterMovement(destination, mapEnemyWorld);
    setMapEnemyWorld(bombResult.world);
    setMapPosition(destination);
    rememberPlayerVision(destination);
    focusMapOn(destination);
    if (!bombResult.playerDefeated) {
      activateRoomFeature(destination);
    }
  };

  const installArmedFloorBombs = () => {
    const roomKey = mapRoomKey(mapPosition);
    const armedBombs = (roomConsumableDrops[roomKey] ?? []).filter((item) =>
      item.type === "bombTicket" && item.armedMovesRemaining !== undefined);
    if (armedBombs.length === 0) return;
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).filter((item) => !armedBombs.some((bomb) => bomb.id === item.id)),
    }));
    setMapBombsSynced([
      ...mapBombsRef.current,
      ...armedBombs.map((bomb) => ({
        id: `bomb-${bomb.id}`,
        position: { ...mapPosition },
        movesRemaining: bomb.armedMovesRemaining!,
      })),
    ]);
  };

  const cloneCardWithTicket = (card: Card) => {
    if (!pendingCloneTicketId) return;
    const ticket = inventoryConsumables.find((item) =>
      item.id === pendingCloneTicketId && item.type === "cloneTicket");
    if (!ticket) return;
    const clone = { ...card, id: nextCardIdRef.current, revealed: false };
    nextCardIdRef.current += 1;
    setInventoryConsumables((current) =>
      current.filter((item) => item.id !== pendingCloneTicketId));
    setInventoryCards((current) => [...current, clone]);
    setPendingCloneTicketId(null);
    setDeckEditorMessage(`${card.name}을(를) 복제했습니다.`);
  };

  const cloneConsumableWithTicket = (targetId: string) => {
    if (!pendingCloneTicketId) return;
    const sourceTicket = inventoryConsumables.find((item) =>
      item.id === pendingCloneTicketId && item.type === "cloneTicket");
    const target = inventoryConsumables.find((item) => item.id === targetId);
    if (!sourceTicket || !target) return;
    const clone = nextConsumable(target.type);
    setInventoryConsumables((current) => [
      ...current.filter((item) => item.id !== pendingCloneTicketId),
      clone,
    ]);
    setPendingCloneTicketId(null);
    setDeckEditorMessage(`${target.name}을(를) 복제했습니다.`);
  };

  const selectExtractionTicket = (consumable: Consumable) => {
    if (pendingCloneTicketId && consumable.id !== pendingCloneTicketId) {
      cloneConsumableWithTicket(consumable.id);
      return;
    }
    if (consumable.type === "cardPack") {
      openCardPack(consumable.id);
      return;
    }
    if (consumable.type === "teleportTicket") {
      consumeTeleportTicket(consumable.id);
      return;
    }
    if (consumable.type === "bombTicket") {
      const cancelling = consumable.armedMovesRemaining !== undefined;
      setArmedBombTicketIds((current) => {
        const next = new Set(current);
        if (cancelling) next.delete(consumable.id);
        else next.add(consumable.id);
        return next;
      });
      setInventoryConsumables((current) => {
        const next = current.map((item) => item.id === consumable.id
          ? { ...item, armedMovesRemaining: cancelling ? undefined : 3 }
          : item);
        inventoryConsumablesRef.current = next;
        return next;
      });
      setPendingPaintTicketId(null);
      setPendingCloneTicketId(null);
      setDeckEditorMessage(cancelling
        ? "폭탄 점화를 취소했습니다."
        : "폭탄을 점화했습니다. 바닥에 내려놓고 편집을 확인하면 설치됩니다.");
      return;
    }
    if (consumable.type === "cloneTicket") {
      setArmedBombTicketIds(new Set());
      const cancelling = pendingCloneTicketId === consumable.id;
      setPendingCloneTicketId(cancelling ? null : consumable.id);
      setPendingPaintTicketId(null);
      setDeckEditorMessage(cancelling ? "복제를 취소했습니다." : "복제할 카드나 티켓을 클릭하세요.");
      return;
    }
    if (consumable.type === "paintTicket") {
      setArmedBombTicketIds(new Set());
      setPendingPaintTicketId((current) => current === consumable.id ? null : consumable.id);
      setPendingCloneTicketId(null);
      setDeckEditorMessage(
        pendingPaintTicketId === consumable.id ? "색칠을 취소했습니다." : "색칠할 덱 카드 1장을 클릭하세요.",
      );
      return;
    }
    setDeckEditorMessage("신속 티켓은 전투 중에 사용할 수 있습니다.");
  };

  const consumeSwiftTicket = (consumableId: string) => {
    const ticket = inventoryConsumables.find((item) =>
      item.id === consumableId && item.type === "swiftTicket");
    if (!ticket || phase !== "playing" || game.status !== "playing") return;
    if (game.piles.every((pile) => pile.length === 0)) {
      setGame((current) => ({ ...current, message: "드로우할 파일 카드가 없습니다." }));
      return;
    }
    setInventoryConsumables((current) => current.filter((item) => item.id !== consumableId));
    setGame((current) => ({
      ...current,
      pendingDraws: current.pendingDraws + 1,
      message: "신속 티켓 사용: 드로우할 파일을 선택하세요.",
      history: ["신속 티켓 사용", ...current.history].slice(0, 5),
    }));
  };

  const pickUpFloorDeck = (deckId: string) => {
    if (ownedDecks.length >= maxOwnedDecks) {
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

  const paintDeckCard = (cardId: number, ticketId = pendingPaintTicketId) => {
    if (!ticketId) return;
    const card = editingDeckCards.find((item) => item.id === cardId);
    if (!card) return;
    const ticket = inventoryConsumables.find((item) => item.id === ticketId && item.type === "paintTicket");
    if (!ticket) return;
    setInventoryConsumables((current) => current.filter((item) => item.id !== ticketId));
    updateEditingDeckCards((current) => current.map((item) => item.id === cardId ? { ...item, colored: true } : item));
    setPendingPaintTicketId(null);
    setDeckEditorMessage(`${card.name}을(를) 색칠했습니다.`);
  };

  const quickPickUpFloorItems = () => {
    const roomKey = mapRoomKey(mapPosition);
    const floorCards = roomDrops[roomKey] ?? [];
    const floorConsumables = roomConsumableDrops[roomKey] ?? [];
    const floorDecks = roomDeckDrops[roomKey] ?? [];
    const freeItemSlots = Math.max(0, inventoryCapacity - inventoryItemCount);
    const pickedCards = floorCards.slice(0, freeItemSlots);
    const pickedConsumables = floorConsumables.slice(0, freeItemSlots - pickedCards.length);
    const pickedDecks = floorDecks.slice(0, Math.max(0, maxOwnedDecks - ownedDecks.length));
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
    if (floorCards.length + floorConsumables.length > freeItemSlots) {
      showMapMessage("인벤토리가 가득찼습니다!");
    }
  };

  const dropOwnedDeck = (deckId: string) => {
    if (ownedDecks.length <= 1) {
      setDeckEditorMessage("마지막 덱은 바닥에 놓을 수 없습니다.");
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
      else if (source === "deck" && target === "trash") removeDeckCard(cardId);
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

  const swapOwnedDecks = (draggedDeckId: string, targetDeckId: string) => {
    if (draggedDeckId === targetDeckId) return;
    setOwnedDecks((current) => {
      const draggedIndex = current.findIndex((deck) => deck.id === draggedDeckId);
      const targetIndex = current.findIndex((deck) => deck.id === targetDeckId);
      if (draggedIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      [next[draggedIndex], next[targetIndex]] = [next[targetIndex], next[draggedIndex]];
      return next;
    });
    setDeckEditorMessage("덱 순서를 바꿨습니다.");
  };

  const openDeckEditor = (message: string) => {
    const roomKey = mapRoomKey(mapPosition);
    finishDeckEditorDrag();
    finishConsumableDrag();
    setPendingPaintTicketId(null);
    setPendingCloneTicketId(null);
    setArmedBombTicketIds(new Set());
    setHoveredDeckCard(null);
    setDeckEditorDeckId(activeDeck?.id ?? "");
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
    const deckWasEdited = deckEditorSnapshot !== null
      && JSON.stringify(deckEditorSnapshot.decks) !== JSON.stringify(ownedDecks);
    const nextActiveDeckId = ownedDecks.some((deck) => deck.id === deckEditorDeckId)
      ? deckEditorDeckId
      : ownedDecks[0]?.id;
    if (nextActiveDeckId) setActiveDeckId(nextActiveDeckId);
    if (deckWasEdited) setDeckSelectionAttention(true);
    installArmedFloorBombs();
    setDeckEditorSnapshot(null);
    setHoveredDeckCard(null);
    setPendingPaintTicketId(null);
    setPendingCloneTicketId(null);
    setArmedBombTicketIds(new Set());
    finishConsumableDrag();
    finishDeckEditorDrag();
    setDeckEditorOpen(false);
  };

  const cancelDeckEditor = () => {
    if (deckEditorSnapshot) {
      setOwnedDecks(deckEditorSnapshot.decks);
      const nextActiveDeckId = deckEditorSnapshot.decks.some((deck) => deck.id === deckEditorDeckId)
        ? deckEditorDeckId
        : deckEditorSnapshot.activeDeckId;
      setActiveDeckId(nextActiveDeckId);
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
    setHoveredDeckCard(null);
    setPendingPaintTicketId(null);
    setPendingCloneTicketId(null);
    setArmedBombTicketIds(new Set());
    finishConsumableDrag();
    finishDeckEditorDrag();
    setDeckEditorOpen(false);
  };

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      if (deckEditorOpen && (event.key === "Escape" || event.key.toLowerCase() === "i")) {
        event.preventDefault();
        cancelDeckEditor();
        return;
      }

      if (event.key === "Escape") {
        if (deckViewerOpen) {
          event.preventDefault();
          setDeckViewerOpen(false);
        } else if (blessingOpen) {
          event.preventDefault();
          setBlessingOpen(false);
        } else if (shopOpen) {
          event.preventDefault();
          setShopOpen(false);
        }
        return;
      }

      if (screen !== "map" || mapTraveling || deckEditorOpen || deckViewerOpen) return;
      if (event.key.toLowerCase() === "i" || event.key.toLowerCase() === "e") {
        event.preventDefault();
        openDeckEditor("덱 편집");
        return;
      }
      if (event.key.toLowerCase() === "g") {
        event.preventDefault();
        quickPickUpFloorItems();
        return;
      }
      if (event.key === "5" || event.code === "Numpad5") {
        event.preventDefault();
        waitOnMap();
        return;
      }

      const keyboardMoves: Record<string, [number, number]> = {
        KeyW: [0, -1], ArrowUp: [0, -1],
        KeyA: [-1, 0], ArrowLeft: [-1, 0],
        KeyS: [0, 1], ArrowDown: [0, 1],
        KeyD: [1, 0], ArrowRight: [1, 0],
      };
      const keyboardMove = keyboardMoves[event.code];
      if (keyboardMove) {
        event.preventDefault();
        mapMovementKeysRef.current.add(event.code);
        if (mapMovementTimerRef.current === null) {
          mapMovementTimerRef.current = window.setTimeout(() => {
            mapMovementTimerRef.current = null;
            const heldMove = [...mapMovementKeysRef.current]
              .map((code) => keyboardMoves[code])
              .reduce<[number, number]>((total, move) => [total[0] + move[0], total[1] + move[1]], [0, 0]);
            const deltaX = Math.sign(heldMove[0]);
            const deltaY = Math.sign(heldMove[1]);
            if (deltaX !== 0 || deltaY !== 0) moveOnMap(deltaX, deltaY);
          }, 45);
        }
        return;
      }

      const numpadMoves: Record<string, [number, number]> = {
        Numpad7: [-1, -1], Numpad8: [0, -1], Numpad9: [1, -1],
        Numpad4: [-1, 0], Numpad6: [1, 0],
        Numpad1: [-1, 1], Numpad2: [0, 1], Numpad3: [1, 1],
      };
      const move = numpadMoves[event.code];
      if (!move) return;
      event.preventDefault();
      numpadMovementKeysRef.current.add(event.code);
      if (numpadMovementTimerRef.current === null) {
        numpadMovementTimerRef.current = window.setTimeout(() => {
          numpadMovementTimerRef.current = null;
          const pressedKeys = [...numpadMovementKeysRef.current];
          // The numpad is for one explicit direction at a time: never chain
          // simultaneous presses into two map turns.
          if (pressedKeys.length !== 1) return;
          const pressedMove = numpadMoves[pressedKeys[0]];
          if (pressedMove) moveOnMap(...pressedMove);
        }, 45);
      }
    };

    const releaseKeyboardMove = (event: KeyboardEvent) => {
      mapMovementKeysRef.current.delete(event.code);
      numpadMovementKeysRef.current.delete(event.code);
    };

    window.addEventListener("keydown", handleKeyboard);
    window.addEventListener("keyup", releaseKeyboardMove);
    return () => {
      window.removeEventListener("keydown", handleKeyboard);
      window.removeEventListener("keyup", releaseKeyboardMove);
      if (mapMovementTimerRef.current !== null) {
        window.clearTimeout(mapMovementTimerRef.current);
        mapMovementTimerRef.current = null;
      }
      if (numpadMovementTimerRef.current !== null) {
        window.clearTimeout(numpadMovementTimerRef.current);
        numpadMovementTimerRef.current = null;
      }
      mapMovementKeysRef.current.clear();
      numpadMovementKeysRef.current.clear();
    };
  }, [
    blessingOpen, cancelDeckEditor, deckEditorOpen, deckViewerOpen, mapTraveling,
    moveOnMap, openDeckEditor, quickPickUpFloorItems, screen, shopOpen, waitOnMap,
  ]);

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
      const frame = window.requestAnimationFrame(() => {
        if (!game.clearPlan) setPhase("playing");
      });
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
      if (!game.clearPlan) setPhase("playing");
    }, finishDelay);
    return () => window.clearTimeout(timer);
  }, [game.hand, game.clearPlan]);

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
          pendingPileDrawCount: 0,
          pendingDiscards: 0,
          pendingSweep: false,
          status: "won",
          message: "디버그 모드: 적을 즉시 처치했습니다.",
          history: ["디버그: 적 즉시 처치", ...current.history].slice(0, 5),
        });
  };

  const playCard = (card: Card, targetEnemyId?: string) => {
    if (card.effect === "slime" || card.effect === "combatManual" || card.effect === "grimoire") {
      setGame((current) => ({ ...current, message: `${card.name}은(는) 사용할 수 없습니다. 파일 위로 옮겨 길을 만들어 보세요.` }));
      return;
    }
    const isRewardAttack = card.kind === "strike" || card.effect === "doubleHit" || card.effect === "ironRampage" || card.effect === "magicStrike" || card.effect === "shockwave" || card.effect === "sweep" || card.effect === "meteor";
    const isRewardAttackAll = card.effect === "ironRampage" || card.effect === "shockwave" || card.effect === "sweep";
    const rewardTarget = card.effect === "magicStrike"
      ? lowestHealthEnemy(game.enemies)
      : card.effect === "meteor"
        ? game.enemies.find((enemy) => enemy.hp > 0)
        : game.enemies.find((enemy) => enemy.id === targetEnemyId);
    const canResolveRewardAttack = isRewardAttack
      && game.status === "playing"
      && phase === "playing"
      && game.pendingDraws === 0
      && game.pendingPileDrawCount === 0
      && game.pendingDiscards === 0
      && !game.pendingSweep
      && game.energy >= card.cost
      && (isRewardAttackAll || Boolean(rewardTarget && rewardTarget.hp > 0));
    if (canResolveRewardAttack) {
      const repetitions = (card.effect === "doubleHit" && card.forged ? 2 : 1) * (game.doubleNextAttack ? 2 : 1);
      const combatManualBonus = game.hand
        .filter((item) => item.effect === "combatManual")
        .reduce((total, item) => total + item.value, 0);
      const damage = card.value + game.strength + combatManualBonus;
      const enemiesAfterAttack = game.enemies.map((enemy) => isRewardAttackAll || enemy.id === rewardTarget?.id
        ? applyPlayerAttack(enemy, damage, repetitions, card.damageType)
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
        current.pendingPileDrawCount > 0 ||
        current.pendingDiscards > 0 ||
        current.pendingSweep ||
        phase !== "playing"
      ) return current;
      if (current.energy < card.cost) {
        return { ...current, message: `${card.name}: 에너지가 ${card.cost} 필요합니다.` };
      }
      if (card.effect === "endStart" && current.piles.some((pile) => pile.length > 0)) {
        return { ...current, message: "끝의 시작은 모든 파일이 비어 있을 때만 사용할 수 있습니다." };
      }
      if (card.effect === "supernova" && current.stars < 3) {
        return { ...current, message: "초신성: ★ 3개가 필요합니다." };
      }
      const isIronRampage = card.effect === "ironRampage";
      const isShockwave = card.effect === "shockwave";
      const isMagicStrike = card.effect === "magicStrike";
      const isSweepAttack = card.effect === "sweep";
      const isMeteor = card.effect === "meteor";
      const isDoubleHit = card.effect === "doubleHit";
      const isDamageCard = card.kind === "strike" || isDoubleHit || isIronRampage || isShockwave || isMagicStrike || isSweepAttack || isMeteor;
      const isAttackAll = isIronRampage || isShockwave || isSweepAttack;
      const isWave = card.effect === "ironWave" || card.effect === "waterWave";
      if (isDamageCard && !isAttackAll && !isMagicStrike && !isMeteor && !targetEnemyId) return current;
      const targetEnemy = isMagicStrike
        ? lowestHealthEnemy(current.enemies)
        : isMeteor
          ? current.enemies.filter((enemy) => enemy.hp > 0)[Math.floor(Math.random() * current.enemies.filter((enemy) => enemy.hp > 0).length)]
        : current.enemies.find((enemy) => enemy.id === targetEnemyId);
      if (isDamageCard && !isAttackAll && (!targetEnemy || targetEnemy.hp === 0)) return current;
      const repetitions = (isMeteor ? current.starsSpent : card.effect === "fourHit" ? 4 : isDoubleHit && card.forged ? 2 : 1) * (isDamageCard && current.doubleNextAttack ? 2 : 1);
      const combatManualBonus = current.hand
        .filter((item) => item.effect === "combatManual")
        .reduce((total, item) => total + item.value, 0);
      const grimoireBonus = current.hand.filter((item) => item.effect === "grimoire").length;
      const damagePerHit = isDamageCard ? card.value + current.strength + combatManualBonus : 0;
      const damage = damagePerHit * repetitions;
      const nextEnemies = isDamageCard
        ? current.enemies.map((enemy) => isAttackAll || enemy.id === targetEnemy?.id
          ? applyPlayerAttack(enemy, damagePerHit, repetitions, card.damageType)
          : enemy)
        : card.effect === "relic"
          ? current.enemies.map((enemy) => enemy.variant === "goblin"
            ? { ...enemy, strength: enemy.strength - card.value }
            : enemy)
          : current.enemies;
      const isBlockCard = card.kind === "defend"
        || card.effect === "plateArmor"
        || card.effect === "ironWall"
        || card.effect === "starGuard";
      const defenseValue = card.value;
      const blockGained = isBlockCard
        ? (defenseValue + current.agility + combatManualBonus) * current.defenseMultiplier
        : isIronRampage || isWave
          ? 5 * repetitions * current.defenseMultiplier
          : 0;
      const nextPhysicalBlock = (isBlockCard && card.damageType === "physical")
        || isIronRampage
        || (isWave && card.damageType === "physical")
        ? current.playerPhysicalBlock + blockGained
        : current.playerPhysicalBlock;
      const nextMagicBlock = (isBlockCard && card.damageType === "magic")
        || (isWave && card.damageType === "magic")
        ? current.playerMagicBlock + blockGained
        : current.playerMagicBlock;
      const won = nextEnemies.every((enemy) => enemy.hp === 0);
      const canDraw = current.piles.some((pile) => pile.length > 0);
      const drawEachPileResult = card.effect === "drawEachPile" || (card.effect === "fileDraw" && card.forged)
        ? drawFromPiles(current.piles)
        : null;
      const pommelDrawResult = card.effect === "pommel"
        ? drawFromFirstPile(current.piles)
        : null;
      const pendingPileDrawCount = card.effect === "fileDraw" && !card.forged && canDraw
        ? card.draw
        : 0;
      const drawsAdded = !won && canDraw && !drawEachPileResult && pendingPileDrawCount === 0
        ? card.draw * repetitions
        : 0;
      const remainingHand = current.hand.filter((item) => item.id !== card.id);
      const pendingDiscards = card.effect === "prepare"
        ? (canDraw || remainingHand.length > 0 ? 1 : 0)
        : card.effect === "focus" && remainingHand.length > 0 ? 1 : 0;
      const pendingSweep = card.effect === "boomerang" && canDraw;
      const pendingPileOperation = card.effect === "boomerang"
        ? card.name === "정리 타격" ? "discardTop" as const : "moveTopToBottom" as const
        : null;
      const action = (() => {
        if (isShockwave || isSweepAttack) return `${card.name}: 적 전체 공격`;
        if (isMeteor) return `${card.name}: 사용한 ★ ${current.starsSpent}개만큼 무작위 공격`;
        if (isMagicStrike) return "마법 타격 발동";
        if (isIronRampage) return `적 전체에게 피해 ${damage} · 방어 ${blockGained}${repetitions > 1 ? " (2회 발동)" : ""}`;
        if (isWave) return `${targetEnemy?.name}에게 피해 ${damage} · ${DEFENSE_LABEL[card.damageType]} ${blockGained}${repetitions > 1 ? " (2회 발동)" : ""}`;
        if (card.kind === "strike") return `${targetEnemy?.name}에게 피해 ${damage}${repetitions > 1 ? " (2회 발동)" : ""}`;
        if (isBlockCard) return `${DEFENSE_LABEL[card.damageType]} ${blockGained} 획득`;
        if (card.effect === "steelHeart") return "이번 턴 방어와 마법 방어 획득량 2배";
        if (card.effect === "battlePlan") return `★ ${card.value}개 획득 · 드로우 ${card.draw}`;
        if (card.effect === "prepare") return canDraw ? "드로우할 파일을 선택하세요." : "버릴 카드를 선택하세요.";
        if (card.effect === "focus") return "에너지 1 획득 · 버릴 카드를 선택하세요.";
        if (card.effect === "adrenaline") return "에너지 1 획득 · 드로우할 파일을 선택하세요.";
        if (card.effect === "sweep") return canDraw ? "가져올 파일을 선택하세요." : "가져올 카드가 없습니다.";
        if (card.effect === "drawEachPile") return `모든 파일에서 ${drawEachPileResult?.hand.length ?? 0}장 뽑음`;
        if (card.effect === "berserk") return "에너지 2 획득 · 이번 턴 받는 피해 2배";
        if (card.effect === "transcend") return "이번 턴 피해 면역 · 힘 5 획득";
        if (card.effect === "rapidFire") return "다음 공격 카드가 2회 발동";
        if (card.effect === "ventilate") return "환기: 에너지 획득";
        if (card.effect === "fileDraw") return card.forged ? "모든 파일에서 1장씩 뽑음" : "드로우할 파일을 선택하세요.";
        if (card.effect === "starGuard") return "별의 장막: 방어와 ★ 획득";
        if (card.effect === "charge") return "충전: 에너지 획득";
        if (card.effect === "plateArmor") return "판금 갑옷 사용";
        if (card.effect === "warmUp") return "준비 운동: 이번 턴 힘 획득";
        if (card.effect === "ironWall") return "철벽: 방어 획득";
        if (card.effect === "fourHit") return "4연격";
        if (card.effect === "doubleHit") return `청동 철퇴: ${card.forged ? 2 : 1}회 공격`;
        if (card.effect === "starlight") return "별빛: ★ 획득";
        if (card.effect === "augment") return "증강: 힘과 강인함 획득";
        if (card.effect === "relic") return "유물: 도깨비의 힘 -4";
        if (card.effect === "supernova") return "★ 3개 소모 · 에너지 +3";
        return card.name;
      })();
      const drawMessage = card.draw > 0
        ? canDraw
          ? " · 드로우할 파일을 선택하세요."
          : " · 드로우할 카드가 없습니다."
        : "";
      return {
        ...current,
        hand: [...remainingHand, ...(drawEachPileResult?.hand ?? pommelDrawResult?.hand ?? [])],
        // 강화는 사용 후에도 다음 셔플 전까지 유지된다. 셔플 때 prepareDeckForPiles가 해제한다.
        discard: card.exhaust || card.power
          ? current.discard
          : [...current.discard, card],
        removedFromReshuffleIds: card.exhaust || card.power
          ? [...current.removedFromReshuffleIds, card.id]
          : current.removedFromReshuffleIds,
        energy: current.energy - card.cost + (card.effect === "berserk" ? 2 : card.effect === "focus" || card.effect === "adrenaline" || card.effect === "charge" || card.effect === "endStart" || card.effect === "supernova" ? card.value : card.effect === "flood" ? 2 : card.effect === "ventilate" ? card.value : 0),
        stars: current.stars + (
          card.effect === "battlePlan"
              ? card.value
            : card.effect === "rulerCompass"
              ? repetitions
              : card.effect === "starlight"
                ? card.value
              : card.effect === "starGuard"
                ? 2
                : card.effect === "superStrategist"
                  ? card.value
                  : card.effect === "flood"
                    ? 2
              : 0
        ) + grimoireBonus - (card.effect === "supernova" ? 3 : 0),
        pendingDraws: drawsAdded,
        pendingPileDrawCount,
        pendingDiscards,
        pendingSweep,
        pendingPileOperation,
        enemies: nextEnemies,
        playerPhysicalBlock: nextPhysicalBlock,
        playerMagicBlock: nextMagicBlock,
        strength: current.strength + (card.effect === "transcend" ? 5 : card.effect === "warmUp" || card.effect === "augment" || card.effect === "weaponSharpen" ? card.value : 0),
        temporaryStrength: current.temporaryStrength + (card.effect === "transcend" ? 5 : card.effect === "warmUp" ? card.value : 0),
        agility: current.agility + (card.effect === "augment" || card.effect === "armorSharpen" ? card.value : 0),
        piles: card.effect === "pioneer" ? [...(drawEachPileResult?.piles ?? pommelDrawResult?.piles ?? current.piles), []] : (drawEachPileResult?.piles ?? pommelDrawResult?.piles ?? current.piles),
        reflectDamage: card.effect === "counter" ? 1 : current.reflectDamage,
        defenseMultiplier: card.effect === "steelHeart" ? 2 : current.defenseMultiplier,
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

  const playHandCardOnDoubleClick = (card: Card) => {
    // During a forced discard, the ordinary click is the card-selection input.
    if (game.pendingDiscards > 0) return;
    const targetEnemy = (card.kind === "strike" || card.effect === "doubleHit")
      ? game.enemies.find((enemy) => enemy.id === lockedEnemyId && enemy.hp > 0)
        ?? game.enemies.find((enemy) => enemy.hp > 0)
      : undefined;
    playCard(card, targetEnemy?.id);
  };

  const drawSelectedPile = (pileIndex: number) => {
    if ((game.pendingDraws < 1 && game.pendingPileDrawCount < 1) || phase !== "playing" || game.status !== "playing") return;
    const pile = game.piles[pileIndex];
    const card = pile?.at(-1);
    if (!card) return;

    const source = document.querySelector<HTMLElement>(`[data-top-card-id="${card.id}"]`);
    if (source) {
      pendingOriginsRef.current = new Map([[card.id, source.getBoundingClientRect()]]);
      setPhase("drawing");
    }

    setGame((current) => {
      if ((current.pendingDraws < 1 && current.pendingPileDrawCount < 1) || current.piles[pileIndex]?.at(-1)?.id !== card.id) return current;
      const nextPiles = current.piles.map((currentPile) => [...currentPile]);
      const drawCount = current.pendingPileDrawCount || 1;
      const drawnCards: Card[] = [];
      for (let index = 0; index < drawCount; index += 1) {
        const drawnCard = nextPiles[pileIndex].pop();
        if (!drawnCard) break;
        drawnCards.push({ ...drawnCard, revealed: true });
      }
      if (drawnCards.length === 0) return current;
      if (nextPiles[pileIndex].length > 0) {
        const nextTopIndex = nextPiles[pileIndex].length - 1;
        nextPiles[pileIndex][nextTopIndex] = {
          ...nextPiles[pileIndex][nextTopIndex],
          revealed: true,
        };
      }
      const action = `${pileIndex + 1}번 파일에서 ${drawnCards.length}장 드로우`;
      return {
        ...current,
        piles: nextPiles,
        hand: [...current.hand, ...drawnCards],
        pendingDraws: current.pendingPileDrawCount > 0 ? current.pendingDraws : current.pendingDraws - 1,
        pendingPileDrawCount: 0,
        message: current.pendingPileDrawCount > 0
          ? action
          : current.pendingDraws > 1
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
    setGame((current) => {
      if (!current.pendingSweep || !current.piles[pileIndex]?.length) return current;
      const nextPiles = current.piles.map((currentPile) => [...currentPile]);
      const top = nextPiles[pileIndex].pop();
      if (!top) return current;
      const cards = [top];
      if (current.pendingPileOperation !== "discardTop") {
        nextPiles[pileIndex].unshift({ ...top, revealed: true });
      }
      if (nextPiles[pileIndex].length > 0) {
        nextPiles[pileIndex][nextPiles[pileIndex].length - 1] = { ...nextPiles[pileIndex].at(-1)!, revealed: true };
      }
      const action = `${pileIndex + 1}번 파일 ${cards.length}장을 손으로 가져옴`;
      return {
        ...current,
        piles: nextPiles,
        discard: current.pendingPileOperation === "discardTop" ? [...current.discard, top] : current.discard,
        pendingSweep: false,
        pendingPileOperation: null,
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
      game.pendingPileDrawCount > 0 ||
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
        current.pendingPileDrawCount > 0 ||
        current.pendingDiscards > 0 ||
        current.pendingSweep ||
        phase !== "playing"
      ) return current;
      if (!current.piles[targetPileIndex]) return current;
      if (drag.source.type === "pile" && drag.source.pileIndex === targetPileIndex) return current;
      const targetCard = current.piles[targetPileIndex].at(-1);
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

      const isExchangeForge = drag.cards.length === 1
        && drag.card.effect === "exchange"
        && !drag.card.forged
        && Boolean(targetCard);
      if (isExchangeForge && targetCard) {
        const targetIndex = nextPiles[targetPileIndex].length - 1;
        nextPiles[targetPileIndex][targetIndex] = {
          ...targetCard,
          baseCost: targetCard.baseCost ?? targetCard.cost,
          cost: drag.card.cost,
        };
      }
      nextPiles[targetPileIndex].push(...drag.cards.map((card, index) => {
        const becomesForged = !card.forged && index === 0 && (
          (card.forgeCost !== undefined && card.forgeCost === targetCard?.cost)
          || (card.forgeAny === true && Boolean(targetCard))
          || (card.forgeTargetName !== undefined && card.forgeTargetName === targetCard?.name)
        );
        const isPlateArmorForge = becomesForged && card.effect === "plateArmor";
        const baseCost = isExchangeForge && index === 0
          ? (card.baseCost ?? card.cost)
          : isPlateArmorForge
            ? (card.baseCost ?? card.cost)
            : card.baseCost;
        return {
          ...card,
          baseCost,
          cost: isExchangeForge && index === 0 && targetCard
            ? targetCard.cost
            : isPlateArmorForge
              ? Math.max(0, (card.baseCost ?? card.cost) - 1)
              : card.cost,
          revealed: drag.source.type === "hand" ? true : card.revealed,
          forged: card.forged || becomesForged,
        };
      }));
      const spellStraight = getSpellStraight(nextPiles[targetPileIndex]);
      const floodPyramid = spellStraight ? null : getFloodPyramid(nextPiles[targetPileIndex]);
      let nextEnemies = current.enemies;
      let nextEnergy = current.energy;
      let nextStars = current.stars - 1;
      let autoDiscard: Card[] = [];
      let autoDraws = 0;
      if (spellStraight) {
        nextPiles[targetPileIndex].splice(-3);
        if (nextPiles[targetPileIndex].length > 0) {
          const topIndex = nextPiles[targetPileIndex].length - 1;
          nextPiles[targetPileIndex][topIndex] = { ...nextPiles[targetPileIndex][topIndex], revealed: true };
        }
        autoDiscard = spellStraight.map((card) => ({ ...card, forged: false }));
        for (const spell of spellStraight) {
          if (spell.effect === "magicStrike") {
            const target = lowestHealthEnemy(nextEnemies);
            if (target) {
              nextEnemies = nextEnemies.map((enemy) => enemy.id === target.id
                ? applyPlayerAttack(enemy, spell.value + current.strength, 1, spell.damageType)
                : enemy);
            }
          } else if (spell.effect === "shockwave") {
            nextEnemies = nextEnemies.map((enemy) => enemy.hp > 0
              ? applyPlayerAttack(enemy, spell.value + current.strength, 1, spell.damageType)
              : enemy);
          } else if (spell.effect === "ventilate") {
            nextEnergy += spell.value;
          } else if (spell.effect === "starlight") {
            nextStars += spell.value;
          }
        }
        if (nextEnemies.every((enemy) => enemy.hp === 0)) {
          grantBattleReward(getRegionNumber(mapPosition));
        }
      } else if (floodPyramid) {
        nextPiles[targetPileIndex].splice(-4);
        if (nextPiles[targetPileIndex].length > 0) {
          const topIndex = nextPiles[targetPileIndex].length - 1;
          nextPiles[targetPileIndex][topIndex] = { ...nextPiles[targetPileIndex][topIndex], revealed: true };
        }
        autoDiscard = floodPyramid.map((card) => ({ ...card, forged: false }));
        nextEnergy += 2;
        nextStars += 2;
        autoDraws = 2;
      }
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
        discard: spellStraight || floodPyramid ? [...current.discard, ...autoDiscard] : current.discard,
        enemies: nextEnemies,
        energy: nextEnergy,
        stars: nextStars,
        pendingDraws: floodPyramid ? current.pendingDraws + autoDraws : current.pendingDraws,
        starsSpent: current.starsSpent + 1,
        status: spellStraight && nextEnemies.every((enemy) => enemy.hp === 0) ? "won" : current.status,
        message: spellStraight ? "주문 스트레이트 발동!" : floodPyramid ? "범람 피라미드 발동!" : action,
        history: [spellStraight ? "주문 스트레이트" : floodPyramid ? "범람 피라미드" : action, ...current.history].slice(0, 5),
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

      const isTargetedAttack = current.card.kind === "strike" || current.card.effect === "doubleHit";
      const resolvedTargetEnemyId = targetEnemyId
        ?? (isTargetedAttack && dropZone === "defend" ? lockedEnemyId ?? undefined : undefined);
      const validDrop =
        current.source.type === "hand" && !["slime", "combatManual", "grimoire"].includes(current.card.effect) && (
          (isTargetedAttack && Boolean(resolvedTargetEnemyId)) ||
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
            : isTargetedAttack
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
      game.pendingPileDrawCount > 0 ||
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
      game.pendingPileDrawCount > 0 ||
      game.pendingDiscards > 0 ||
      game.pendingSweep ||
      phase !== "playing"
    ) return;
    setPhase("discarding");
    setDragging(null);

    const discardDelay = 340 + Math.max(0, game.hand.length - 1) * 42;
    later(() => {
      const enemiesAfterBlockDecay = game.enemies.map((enemy) => ({ ...enemy, physicalBlock: 0 }));
      const livingEnemies = enemiesAfterBlockDecay.filter((enemy) => enemy.hp > 0);
      const toxicSlimeDamage = game.hand.filter((card) => card.effect === "slime").length * 12;
      const discarded = [
        ...game.discard,
        ...game.hand,
      ];
      const pilesAfterSlime = game.piles.map((pile) => [...pile]);
      let remainingPhysicalBlock = game.playerPhysicalBlock;
      let remainingMagicBlock = game.playerMagicBlock;
      const toxicSlimeBlocked = game.invulnerable ? 0 : Math.min(toxicSlimeDamage, remainingPhysicalBlock);
      const toxicSlimeDamageTaken = game.invulnerable ? 0 : toxicSlimeDamage - toxicSlimeBlocked;
      remainingPhysicalBlock -= toxicSlimeBlocked;
      let remainingHp = Math.max(0, game.playerHp - toxicSlimeDamageTaken);
      const steps: Array<{
        enemy: EnemyState;
        action: EnemyAction;
        attack: EnemyAction["attacks"][number] | null;
        damage: number;
        hpAfter: number;
        physicalBlockAfter: number;
        magicBlockAfter: number;
        message?: string;
      }> = [];
      const actedEnemyIds = new Set<string>();
      const reflectedDamage = new Map<string, number>();

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
            if (game.reflectDamage > 0 && blocked > 0) {
              reflectedDamage.set(enemy.id, (reflectedDamage.get(enemy.id) ?? 0) + blocked * game.reflectDamage);
            }
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
        if (action.discardCount && enemy.discardPileIndex !== undefined) {
          const pileIndex = enemy.discardPileIndex % Math.max(1, pilesAfterSlime.length);
          const pile = pilesAfterSlime[pileIndex];
          const discardedCard = pile?.pop();
          if (discardedCard) {
            discarded.push(discardedCard);
            if (pile.length > 0) pile[pile.length - 1] = { ...pile[pile.length - 1], revealed: true };
          }
          steps.push({
            enemy,
            action,
            attack: null,
            damage: 0,
            hpAfter: remainingHp,
            physicalBlockAfter: remainingPhysicalBlock,
            magicBlockAfter: remainingMagicBlock,
            message: discardedCard ? `${pileIndex + 1}번 파일: ${discardedCard.name} 버림` : `${pileIndex + 1}번 파일은 비어 있음`,
          });
        }
        if (action.strengthGain || action.blockGain) {
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

      let nextEnemies = enemiesAfterBlockDecay.map((enemy) => {
        if (enemy.hp === 0 || !actedEnemyIds.has(enemy.id)) return enemy;
        const action = enemy.actions[enemy.intentIndex];
        const nextIntentIndex = chooseNextIntent(enemy.actions, enemy.intentIndex);
        return {
          ...enemy,
          strength: enemy.strength + (action.strengthGain ?? 0),
          physicalBlock: enemy.physicalBlock + (action.blockGain ?? 0),
          intentIndex: nextIntentIndex,
          discardPileIndex: undefined,
          quicknessReady: false,
          nextAttackMagic: action.nextAttackMagic
            ? true
            : enemy.nextAttackMagic && action.attacks.length === 0,
        };
      });
      nextEnemies = nextEnemies.map((enemy) => {
        const reflected = reflectedDamage.get(enemy.id) ?? 0;
        return reflected > 0 ? applyPlayerAttack(enemy, reflected, 1) : enemy;
      });

      setGame({
        ...game,
        piles: pilesAfterSlime,
        hand: [],
        discard: discarded,
        enemies: nextEnemies,
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
            text: step.message ?? (step.attack
              ? step.damage > 0 ? `-${step.damage}` : "막음"
              : actionSummary(step.action, 0)),
          });
          setGame((current) => ({
            ...current,
            playerHp: step.hpAfter,
            playerPhysicalBlock: step.physicalBlockAfter,
            playerMagicBlock: step.magicBlockAfter,
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
            piles: pilesAfterSlime,
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

        const willClearAfterNextDraw = pilesAfterSlime.every((pile) => pile.length <= 1);
        const clearPlan = willClearAfterNextDraw
          ? (() => {
            const emptyIndexes = pilesAfterSlime.map((pile, index) => pile.length === 0 ? index : -1).filter((index) => index >= 0);
            const cardsDrawnBeforeClear = new Set(pilesAfterSlime.flatMap((pile) => pile.map((card) => card.id)));
            const cards = game.initialDeck.filter((card) =>
              !game.removedFromReshuffleIds.includes(card.id)
              && !cardsDrawnBeforeClear.has(card.id));
            const rebuilt = buildPiles(prepareDeckForPiles(cards), game.deckEditions.includes("fantastic") ? 4 : 5, game.deckEditions.includes("transparent"), game.deckEditions.includes("roomy") ? 1 : 0, game.deckEditions.includes("golden"));
            const redraw = drawFromPileIndexes(rebuilt, emptyIndexes);
            return { pilesBeforeDraw: rebuilt, pilesAfterDraw: redraw.piles, hand: redraw.hand };
          })()
          : null;
        setGame({
          ...game,
          piles: pilesAfterSlime,
          clearPlan,
          hand: [],
          discard: discarded,
          energy: game.deckEditions.includes("rampaging") ? 4 : 3,
          stars: game.stars + (game.deckEditions.includes("frugal") ? game.energy : 0),
          starsSpent: 0,
          reflectDamage: 0,
          turn: game.turn + 1,
          playerHp: remainingHp,
          playerPhysicalBlock: 0,
          playerMagicBlock: 0,
          strength: Math.max(0, game.strength - game.temporaryStrength),
          temporaryStrength: 0,
          defenseMultiplier: 1,
          damageTakenMultiplier: 1,
          invulnerable: false,
          enemies: nextEnemies,
          message: "적의 턴이 끝났습니다.",
          history: [...attackHistory, ...game.history].slice(0, 5),
        });
        setPhase("drawing");
        later(drawCards, 120);
      }, steps.length * stepDuration + 80);
    }, discardDelay);
  };

  useEffect(() => {
    const endTurnWithKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (screen !== "battle" || event.key.toLowerCase() !== "e") return;
      event.preventDefault();
      endTurn();
    };
    window.addEventListener("keydown", endTurnWithKey);
    return () => window.removeEventListener("keydown", endTurnWithKey);
  }, [endTurn, screen]);

  const controlsLocked =
    phase !== "playing" ||
    game.status !== "playing" ||
    game.pendingDraws > 0 ||
    game.pendingPileDrawCount > 0 ||
    game.pendingDiscards > 0 ||
    game.pendingSweep;
  const combatManualBonus = game.hand
    .filter((card) => card.effect === "combatManual")
    .reduce((total, card) => total + card.value, 0);
  const hasClearHandSlots = game.hand.some((card) => card.drawSlot !== undefined);
  const usesClearHandSlots = phase !== "playing" && hasClearHandSlots;
  const clearHandSlotCount = usesClearHandSlots
    ? Math.max(...game.hand.map((card) => card.drawSlotCount ?? 0), game.hand.length)
    : game.hand.length;
  const displayedHand: Array<Card | null> = usesClearHandSlots
    ? [
      ...Array.from({ length: clearHandSlotCount }, (_, slot) =>
        game.hand.find((card) => card.drawSlot === slot) ?? null),
      ...game.hand.filter((card) => card.drawSlot === undefined),
    ]
    : hasClearHandSlots
      ? [
        ...game.hand
          .filter((card) => card.drawSlot !== undefined)
          .sort((left, right) => left.drawSlot! - right.drawSlot!),
        ...game.hand.filter((card) => card.drawSlot === undefined),
      ]
      : game.hand;
  const discardPileCounts = game.enemies.reduce((counts, enemy) => {
    const intent = enemy.actions[enemy.intentIndex];
    if (enemy.hp > 0 && intent.discardCount && enemy.discardPileIndex !== undefined) {
      counts.set(enemy.discardPileIndex, (counts.get(enemy.discardPileIndex) ?? 0) + intent.discardCount);
    }
    return counts;
  }, new Map<number, number>());

  if (screen === "map") {
    const currentRoomKey = mapRoomKey(mapPosition);
    const currentRoomType = effectiveRoomType(mapPosition);
    const inSafeArea = isSafeAreaPosition(mapPosition);
    const canEditDeck = true;
    const viewedDeck = ownedDecks.find((deck) => deck.id === deckViewerDeckId) ?? activeDeck;
    const rarityOrder: Record<CardRarity, number> = { rare: 0, special: 1, basic: 2 };
    const deckGroups = Array.from(editingDeckCards.reduce((groups, card) => {
      const groupKey = `${card.effect}:${card.damageType}:${card.name}:${card.colored ? "painted" : "plain"}`;
      const current = groups.get(groupKey);
      if (current) current.cardIds.push(card.id);
      else groups.set(groupKey, { card, cardIds: [card.id] });
      return groups;
    }, new Map<string, { card: Card; cardIds: number[] }>()).values()).sort((left, right) =>
      left.card.cost - right.card.cost
      || rarityOrder[left.card.rarity] - rarityOrder[right.card.rarity]
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
    const deckEditorHasChanges = deckEditorSnapshot !== null && JSON.stringify({
      decks: deckEditorSnapshot.decks,
      inventory: deckEditorSnapshot.inventory,
      consumables: deckEditorSnapshot.consumables,
      floorCards: deckEditorSnapshot.floorCards,
      floorConsumables: deckEditorSnapshot.floorConsumables,
      floorDecks: deckEditorSnapshot.floorDecks,
    }) !== JSON.stringify({
      decks: ownedDecks,
      inventory: inventoryCards,
      consumables: inventoryConsumables,
      floorCards: currentFloorCards,
      floorConsumables: currentFloorConsumables,
      floorDecks: currentFloorDecks,
    });
    const floorItemNames = [
      ...currentFloorCards.map((card) => card.name),
      ...currentFloorConsumables.map((consumable) => consumable.name),
      ...currentFloorDecks.map((deck) => deck.name),
    ];
    const quickPickUpLabel = floorItemNames.length === 1
      ? `${floorItemNames[0]} 줍기`
      : `떨어진 물건 ${floorItemNames.length}개 줍기`;
    const activeShopOffers = activeShopRoom ? roomShops[activeShopRoom] ?? [] : [];
    const knownRoomRoutes = buildKnownRoomRoutes(mapPosition, seenRooms, mapSeed, effectiveRoomType);
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
    for (let offsetY = -visionVerticalRadius; offsetY <= visionVerticalRadius; offsetY += 1) {
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
      : mapEnemyWorld.enemies.filter((enemy) => isInPlayerVision(enemy.position, mapPosition, MAP_PLAYER_VISION_HORIZONTAL_RADIUS, visionVerticalRadius));

    return (
      <main className="game-shell map-shell">
        <span className="game-version" aria-label={`게임 버전 ${GAME_VERSION}`}>{GAME_VERSION}</span>
        <header className="topbar map-topbar">
          <div>
            <h1>{getRegionName(mapPosition)}</h1>
          </div>
          <div className="map-top-actions">
            <div className="map-run-stats">
              <div className="map-health" aria-label={`체력 ${runPlayerHp} 중 ${maxPlayerHp}`}>
                <strong>❤️ {runPlayerHp} / {maxPlayerHp}</strong>
              </div>
              <div className="map-gold" aria-label={`골드 ${gold}`}>
                <strong>🪙 {gold}</strong>
              </div>
            </div>
            <button
              type="button"
              className="deck-viewer-trigger"
              onClick={() => {
                setDeckViewerDeckId(activeDeck?.id ?? "");
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
                  ? "덱 카드를 인벤토리로 회수할 수 있습니다. 희귀도에 따라 골드를 냅니다."
                  : "좌클릭: 바닥 → 인벤토리 → 덱. 덱 카드는 우클릭하거나 인벤토리로 드래그해 골드로 회수합니다.")}
                aria-label={`덱 편집, 현재 ${deckCards.length}장`}
              >
                <span className="deck-stack-icon" aria-hidden="true" />
                <span>덱 편집</span>
              </button>
            )}
          </div>
        </header>
        {blessings.length > 0 && (
          <aside className="map-blessing-list" aria-label="획득한 축복">
            {blessings.map((blessing) => blessing === "athlete" ? (
              <button type="button" key={blessing} className={athletePrepared ? "is-prepared" : ""} onClick={activateAthlete} disabled={athleteCooldown > 0}>
                <strong>운동선수</strong>
                <small>{athleteCooldown > 0 ? `쿨타임 ${athleteCooldown}턴` : athletePrepared ? "준비됨 · 다음 이동 무료" : "눌러서 다음 이동 무료"}</small>
              </button>
            ) : <span key={blessing}>{BLESSING_INFO[blessing].name}</span>)}
          </aside>
        )}

        <section className="map-board" aria-label="탐험 지도">
          <div className="map-toolbar">
            <div className="map-toolbar-actions">
              <span className="map-zoom-value" aria-label={`지도 배율 ${Math.round((mapZoom / MAP_DEFAULT_ZOOM) * 100)}퍼센트`}>
                {Math.round((mapZoom / MAP_DEFAULT_ZOOM) * 100)}%
              </span>
              <button type="button" className="recenter-map" onClick={() => centerMapOn(mapPosition)}>
                현재 위치로
              </button>
            </div>
            {debugMode && (
              <div className="debug-spawn-controls">
                <select
                  aria-label="바닥에 생성할 아이템"
                  value={debugSpawnSelection}
                  onChange={(event) => setDebugSpawnSelection(event.target.value)}
                >
                  <optgroup label="기본 카드">
                    {BASIC_CARD_POOL.map((card, index) => (
                      <option key={`basic-${card.effect}-${index}`} value={`card:basic:${index}`}>
                        {card.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="특별 카드">
                    {SPECIAL_CARD_POOL.map((card, index) => (
                      <option key={`special-${card.effect}-${index}`} value={`card:special:${index}`}>
                        {card.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="희귀 카드">
                    {RARE_CARD_POOL.map((card, index) => (
                      <option key={`rare-${card.effect}-${index}`} value={`card:rare:${index}`}>
                        {card.name}
                      </option>
                    ))}
                    <option value="card:adrenaline">{createAdrenalineCard().name}</option>
                  </optgroup>
                  <optgroup label="티켓">
                    {CONSUMABLE_TYPES.map((type) => (
                      <option key={type} value={`consumable:${type}`}>
                        {createConsumable(type, `debug-preview-${type}`).name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="덱">
                    <option value="deck:random">현재 지역 티어 무작위 덱</option>
                  </optgroup>
                </select>
                <button type="button" onClick={spawnDebugItemOnFloor}>
                  바닥에 생성
                </button>
              </div>
            )}
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
                const roomType = effectiveRoomType(position);
                const current = position.x === mapPosition.x && position.y === mapPosition.y;
                const inVision = debugMode || isInPlayerVision(position, mapPosition, MAP_PLAYER_VISION_HORIZONTAL_RADIUS, visionVerticalRadius);
                const distance = chebyshevDistance(position, mapPosition);
                const walkable = isWalkableRoom(roomType);
                const adjacent = distance === 1 && walkable;
                const reachable = !current && (debugMode ? walkable : knownRoomRoutes.has(roomKey));
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
                        : roomType === "blessing"
                        ? "축복"
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
                      if (debugMode && walkable && !current) {
                        if (adjacent) {
                          moveOnMap(position.x - mapPosition.x, position.y - mapPosition.y);
                          return;
                        }
                        setMapPosition(position);
                        rememberPlayerVision(position);
                        focusMapOn(position);
                        activateRoomFeature(position);
                        return;
                      }
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
                          : roomType === "blessing"
                          ? <span>축복</span>
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
              {mapBombs.map((bomb) => (
                <span
                  className="map-bomb"
                  key={bomb.id}
                  style={{
                    left: MAP_PADDING + (bomb.position.x - DUNGEON_MIN_X + MAP_WORLD_MARGIN_X) * (MAP_ROOM_WIDTH + MAP_CELL_GAP) + MAP_ROOM_WIDTH / 2,
                    top: MAP_PADDING + (bomb.position.y + MAP_WORLD_MARGIN_Y) * (MAP_ROOM_HEIGHT + MAP_CELL_GAP) + MAP_ROOM_HEIGHT / 2,
                  }}
                  title={`${bomb.movesRemaining}번 이동 후 폭발`}
                  aria-label={`폭탄, ${bomb.movesRemaining}번 이동 후 폭발`}
                >
                  <strong>●</strong>
                  <small>{bomb.movesRemaining}</small>
                </span>
              ))}
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
          <div className="map-deck-selector">
            <div onPointerDown={(event) => event.stopPropagation()}>
              {deckSelectorOpen && (
                <div className={`map-deck-selector-menu ${deckSelectorClosing ? "is-closing" : "is-opening"}`} role="menu" aria-label="전투에 사용할 덱">
                  {Array.from({ length: 3 }, (_, index) => {
                    const deck = ownedDecks[index];
                    if (!deck) {
                      return <span className="map-deck-empty-slot" key={`empty-deck-${index}`} style={{ "--deck-offset": index - 1, "--deck-arc-inset": Math.abs(index - 1) } as CSSProperties}>빈 덱 슬롯</span>;
                    }
                    return (
                      <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={deck.id === activeDeck?.id}
                      className={`${deck.id === activeDeck?.id ? "is-selected" : ""} ${deckSelectorClosingDeckId === deck.id ? "is-picked" : ""}`}
                      key={deck.id}
                      style={{ "--deck-offset": index - 1, "--deck-arc-inset": Math.abs(index - 1) } as CSSProperties}
                      onClick={() => {
                        setActiveDeckId(deck.id);
                        closeDeckSelector(deck.id);
                      }}
                    >
                      <strong><DeckName deck={deck} showEditions={false} /></strong>
                      <small>{deck.cards.length} / {deck.capacity}</small>
                    </button>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                className={`map-deck-selector-trigger ${deckSelectorOpen && !deckSelectorClosing ? "is-open" : ""}`}
                onClick={() => {
                  setDeckSelectionAttention(false);
                  toggleDeckSelector();
                }}
                aria-expanded={deckSelectorOpen && !deckSelectorClosing}
                aria-label={`전투 덱 선택. 현재 ${activeDeck?.name ?? "없음"}`}
              >
                <span className="deck-stack-icon" aria-hidden="true" />
                <strong>덱 {activeDeck?.name || "준비 중"}</strong>
                <small>({deckCards.length}/{activeDeck?.capacity ?? 0})</small>
              </button>
              {deckSelectionAttention && <span className="map-deck-selector-attention" aria-label="덱 편집 후 전투 덱을 확인하세요">!</span>}
            </div>
          </div>
          <div className="room-action-notices">
            {mapMessage && <p key={mapMessageNonce} className="map-message" role="status" aria-live="polite">{mapMessage}</p>}
            {currentRoomType === "shop" && (
              <button
                type="button"
                className="room-floor-notice room-action-notice is-shop simple-room-action-notice"
                onClick={() => openShop(mapRoomKey(mapPosition), (getDungeonRegionIndex(mapPosition) ?? 0) + 1)}
              >
                <strong>상점 들어가기</strong>
              </button>
            )}
            {currentRoomType === "blessing" && (
              <button
                type="button"
                className="room-floor-notice room-action-notice is-shop simple-room-action-notice"
                onClick={openBlessings}
              >
                <strong>축복 받기</strong>
              </button>
            )}
            {(currentRoomType === "portal" || currentRoomType === "safePortal") && (
              <button
                type="button"
                className="room-floor-notice room-action-notice is-portal simple-room-action-notice"
                onClick={useCurrentPortal}
              >
                <strong>포탈 이용하기</strong>
              </button>
            )}
            {currentRoomType === "heal" && (
              <button
                type="button"
                className="room-floor-notice room-action-notice simple-room-action-notice"
                onClick={useCurrentHeal}
              >
                <strong>회복하기</strong>
              </button>
            )}
            {(currentFloorCards.length > 0 || currentFloorConsumables.length > 0 || currentFloorDecks.length > 0) && canEditDeck && (
              <button
                type="button"
                className="room-floor-notice quick-pickup-notice"
                onClick={quickPickUpFloorItems}
              >
                <strong>{quickPickUpLabel}</strong>
              </button>
            )}
          </div>
        </section>

        {debugPasswordOpen && (
          <div className="debug-password-overlay" role="dialog" aria-modal="true" aria-labelledby="debug-password-title">
            <form className="debug-password-dialog" onSubmit={(event) => { event.preventDefault(); submitDebugPassword(); }}>
              <h2 id="debug-password-title">디버그 비밀번호</h2>
              <input autoFocus type="password" inputMode="numeric" value={debugPassword} onChange={(event) => setDebugPassword(event.target.value)} />
              <div><button type="button" onClick={() => setDebugPasswordOpen(false)}>취소</button><button type="submit">확인</button></div>
            </form>
          </div>
        )}

        {blessingOpen && (
          <div className="shop-overlay blessing-overlay" role="dialog" aria-modal="true" aria-labelledby="blessing-title">
            <section className="shop-panel blessing-panel">
              <header>
                <div><h2 id="blessing-title">축복</h2></div>
                <div className="shop-header-status">
                  <strong>🪙 {gold}</strong>
                  <button type="button" onClick={() => setBlessingOpen(false)}>나가기</button>
                </div>
              </header>
              {blessingOffers.length > 0 ? (
                <div className="blessing-options">
                  {blessingOffers.map((blessing) => (
                    <button type="button" key={blessing} onClick={() => chooseBlessing(blessing)}>
                      <strong>{BLESSING_INFO[blessing].name}</strong>
                      <span>{BLESSING_INFO[blessing].description}</span>
                    </button>
                  ))}
                </div>
              ) : <p className="blessing-empty">받을 수 있는 축복을 모두 얻었습니다.</p>}
              {blessingOffers.length > 0 && (
                <footer><button type="button" className="blessing-reroll" onClick={rerollBlessings} disabled={gold < blessingRerollCost}>🪙 {blessingRerollCost} 리롤</button></footer>
              )}
            </section>
          </div>
        )}

        {shopOpen && (
          <div className="shop-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-title">
            <section className="shop-panel">
              <header>
                <div>
                  <h2 id="shop-title">여행 상점</h2>
                </div>
                <div className="shop-header-status">
                  <strong>🪙 {gold}</strong>
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
                        <strong>{offer.consumable.name}</strong>
                        <small>{offer.consumable.description}</small>
                      </div>
                    ) : null}
                    <span className="shop-price">{offer.sold ? "판매 완료" : `🪙 ${offer.price}`}</span>
                  </button>
                ))}
              </div>
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
                <div className="deck-editor-header-costs">
                  <strong>🪙 {gold}</strong>
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
                    if (source !== "floor" && !(source === "deck" && inSafeArea)) return;
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
                    <strong className={inventoryItemCount > inventoryCapacity ? "is-full" : ""}>
                      {inventoryItemCount} / {inventoryCapacity}
                    </strong>
                  </div>
                  <div className="deck-editor-card-list">
                    {inventoryConsumables.map((consumable) => (
                      <button
                        type="button"
                        className={`consumable-ticket inventory-ticket ${consumable.type} ${pendingPaintTicketId === consumable.id || pendingCloneTicketId === consumable.id || consumable.armedMovesRemaining !== undefined ? "is-selected" : ""}`}
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
                        onClick={() => {
                          if (pendingCloneTicketId) cloneCardWithTicket(card);
                          else moveInventoryCardToDeck(cardIds.at(-1)!);
                        }}
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
                    const addingCard = source === "inventory" || source === "floor";
                    if (!addingCard || !editingDeck || editingDeckCards.length >= editingDeck.capacity) {
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
                    <h3>{editingDeck ? <DeckName deck={editingDeck} /> : "덱 없음"}</h3>
                    <strong className={editingDeck && editingDeckCards.length >= editingDeck.capacity ? "is-full" : ""}>
                      {editingDeckCards.length} / {editingDeck?.capacity ?? 0}
                    </strong>
                  </div>
                  <div className="owned-deck-tabs" aria-label="보유 덱">
                    {ownedDecks.map((deck, index) => (
                      <button
                        type="button"
                        className={`${deck.id === editingDeck?.id ? "is-active" : ""} ${deckCaseDropSlot === index ? "is-deck-drop-target" : ""}`}
                        key={deck.id}
                        draggable
                        onDragStart={(event) => beginDeckCaseDrag(event, deck.id, "owned")}
                        onDragEnd={finishDeckCaseDrag}
                        onDragOver={(event) => {
                          const drag = deckCaseDragRef.current ?? deckCaseDrag;
                          if (drag?.source !== "owned" || drag.deckId === deck.id) return;
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
                          if (drag?.source === "owned") swapOwnedDecks(drag.deckId, deck.id);
                          finishDeckCaseDrag();
                        }}
                        onClick={() => {
                          setHoveredDeckCard(null);
                          setDeckEditorDeckId(deck.id);
                          setDeckEditorMessage("지도 오른쪽 아래의 덱 아이콘에서 전투에 사용할 덱을 고릅니다.");
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          dropOwnedDeck(deck.id);
                        }}
                        aria-label={`덱 ${deck.name}, ${deck.cards.length}/${deck.capacity}.${deck.id === activeDeck?.id ? " 현재 전투 덱입니다." : " 예비 덱입니다."} 우클릭 바닥에 놓기`}
                      >
                        <strong><DeckName deck={deck} showEditions={false} /> <span>({deck.cards.length}/{deck.capacity})</span></strong>
                      </button>
                    ))}
                    {Array.from({ length: maxOwnedDecks - ownedDecks.length }, (_, index) => (
                      <div
                        className={`empty-deck-slot ${deckCaseDrag?.source === "floor" && deckCaseDropSlot === index ? "is-deck-drop-target" : ""}`}
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
                            className={`deck-list-entry rarity-${card.rarity} ${card.colored ? "is-painted" : ""} ${isTemporary ? "is-temporary" : ""}`}
                            key={`${card.effect}:${card.damageType}:${card.name}`}
                            draggable
                            onDragStart={(event) => beginDeckEditorDrag(event, cardId, "deck")}
                            onDragEnd={finishDeckEditorDrag}
                            onDragOver={(event) => {
                              const ticketDrag = consumableDragRef.current ?? consumableDrag;
                              if (ticketDrag?.source !== "inventory") return;
                              const ticket = inventoryConsumables.find((item) => item.id === ticketDrag.id);
                              if (ticket?.type !== "paintTicket") return;
                              event.preventDefault();
                              event.stopPropagation();
                              event.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(event) => {
                              const ticketDrag = consumableDragRef.current ?? consumableDrag;
                              if (ticketDrag?.source !== "inventory") return;
                              const ticket = inventoryConsumables.find((item) => item.id === ticketDrag.id);
                              if (ticket?.type !== "paintTicket") return;
                              event.preventDefault();
                              event.stopPropagation();
                              paintDeckCard(cardId, ticketDrag.id);
                              finishConsumableDrag();
                            }}
                            onMouseEnter={(event) => moveDeckCardPreview(event, card)}
                            onMouseMove={(event) => moveDeckCardPreview(event, card)}
                            onMouseLeave={() => setHoveredDeckCard(null)}
                            onFocus={(event) => {
                              const bounds = event.currentTarget.getBoundingClientRect();
                              showDeckCardPreview(card, bounds.right, bounds.bottom);
                            }}
                            onBlur={() => setHoveredDeckCard(null)}
                            onClick={() => {
                              if (pendingCloneTicketId) cloneCardWithTicket(card);
                              else if (pendingPaintTicketId) paintDeckCard(cardId);
                            }}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              moveDeckCardToInventory(cardId);
                            }}
                            aria-label={pendingPaintTicketId
                                ? `${card.name} ${cardIds.length}장, 클릭하면 한 장 색칠`
                              : inSafeArea
                                ? `${card.name} ${cardIds.length}장, 우클릭하거나 인벤토리로 드래그하면 한 장 회수`
                                : `${card.name} ${cardIds.length}장, 휴지통으로 드래그하면 한 장 제거`}
                          >
                            <span className="deck-list-cost">{card.cost}</span>
                            <strong>
                              {card.name}
                              {card.colored && <em className="deck-card-painted">색칠</em>}
                              {isTemporary && <em className="deck-card-new">NEW!</em>}
                            </strong>
                            <span className="deck-list-count">x{cardIds.length}</span>
                          </button>
                        );
                      })}
                    </div>
                    <aside className="deck-tools-column">
                      <div
                        className={`trash-slot ${deckEditorDropTarget === "trash" ? "is-drop-target" : ""}`}
                        onDragOver={(event) => {
                          if ((deckEditorDragRef.current ?? deckEditorDrag)?.source !== "deck") return;
                          event.preventDefault();
                          event.stopPropagation();
                          event.dataTransfer.dropEffect = "move";
                          setDeckEditorDropTarget("trash");
                        }}
                        onDragLeave={(event) => {
                          event.stopPropagation();
                          setDeckEditorDropTarget((current) => current === "trash" ? null : current);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          dropDeckEditorCard(event, "trash");
                        }}
                        aria-label="덱 카드 제거 휴지통"
                      >
                        <span className="trash-icon" aria-hidden="true" />
                        <strong>휴지통</strong>
                        <small>덱 카드를 여기에 놓으면 제거됩니다.</small>
                      </div>
                    </aside>
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
                      if (source !== "inventory") return;
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
                        <strong><DeckName deck={deck} /></strong>
                        <span>{deck.cards.length} / {deck.capacity}</span>
                        <small>눌러서 줍기</small>
                      </button>
                    ))}
                    {currentFloorConsumables.map((consumable) => (
                      <button
                        type="button"
                        className={`consumable-ticket floor-ticket ${consumable.type} ${consumable.armedMovesRemaining !== undefined ? "is-selected" : ""}`}
                        key={consumable.id}
                        draggable
                        onDragStart={(event) => beginConsumableDrag(event, consumable.id, "floor")}
                        onDragEnd={finishConsumableDrag}
                        onClick={() => moveFloorConsumableToInventory(consumable.id)}
                      >
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
                        onClick={() => {
                          if (pendingCloneTicketId) cloneCardWithTicket(card);
                          else moveFloorCardToInventory(cardIds.at(-1)!);
                        }}
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
                    className={`confirm ${deckEditorHasChanges ? "" : "is-hidden"}`}
                    onClick={confirmDeckEditor}
                    disabled={inventoryItemCount > inventoryCapacity}
                  >편집 확인</button>
                </div>
              </footer>
              </section>
              {hoveredDeckCard && (
                <aside
                  className="deck-card-preview-floating"
                  style={{ left: deckPreviewPosition.x, top: deckPreviewPosition.y }}
                  aria-live="polite"
                >
                  <div className={`card-face ${hoveredDeckCard.kind} ${hoveredDeckCard.damageType}`}>
                    <CardFace card={hoveredDeckCard} />
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {openedCardPack && (
          <div className="shop-overlay" role="dialog" aria-modal="true" aria-label="카드 팩 개봉">
            <section className="card-pack-result">
              <header><div><p>CARD PACK</p><h2>카드 팩 개봉</h2></div><button type="button" onClick={() => setOpenedCardPack(null)}>확인</button></header>
              <div className="card-pack-cards">
                {openedCardPack.map((card) => <div className={`card-face ${card.kind} ${card.damageType}`} key={card.id}><CardFace card={card} /></div>)}
              </div>
            </section>
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
                    <strong><DeckName deck={deck} /></strong>
                    <span>{deck.cards.length} / {deck.capacity}</span>
                  </button>
                ))}
                {Array.from({ length: maxOwnedDecks - ownedDecks.length }, (_, index) => (
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
      <span className="game-version" aria-label={`게임 버전 ${GAME_VERSION}`}>{GAME_VERSION}</span>
      <header className="topbar">
        <div>
          <h1>Ruinfall</h1>
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
            {game.enemies.filter((enemy) => enemy.hp > 0).map((enemy) => {
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
                    <span>{defeated ? "상태" : "패턴"}</span>
                    {defeated ? (
                      <strong>격파</strong>
                    ) : (
                      <small>{actionSummary(
                          intent,
                          enemy.strength,
                          enemy.nextAttackMagic,
                        )}</small>
                    )}
                  </div>
                  <div className="monster" aria-label={enemy.name}>
                    <div className="monster-horns"><i /><i /></div>
                    <div className="monster-face"><b /><b /><span /></div>
                    {enemy.physicalBlock > 0 && (
                      <div className="defense-shield physical enemy-defense-shield" aria-label={`방어 ${enemy.physicalBlock}`}>
                        <span>방어</span><strong>{enemy.physicalBlock}</strong>
                      </div>
                    )}
                  </div>
                  <div className="unit-stats enemy-stats">
                    <strong>{enemy.name}</strong>
                    <div className="healthbar enemy-health">
                      <i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                      <span>{enemy.hp} / {enemy.maxHp}</span>
                    </div>
                    <div className="enemy-effects">
                      {enemy.strength !== 0 && <span>힘 {enemy.strength}</span>}
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
          {pileClearNotice && <div className="pile-clear-notice">CLEAR!</div>}
          <div className="section-label">
            <span>{game.pendingSweep ? "효과를 적용할 파일 선택" : game.pendingDraws > 0 || game.pendingPileDrawCount > 0 ? "드로우할 파일 선택" : "파일"}</span>
            <small>{game.pendingSweep
              ? "원하는 파일을 클릭해 모든 카드를 손으로 가져오세요"
              : game.pendingDraws > 0 || game.pendingPileDrawCount > 0
                ? "원하는 파일을 클릭해 맨 위 카드를 가져오세요"
                : "각 파일의 맨 위 카드를 턴 시작에 가져옵니다"}</small>
          </div>
          <div className="piles" aria-label="카드 파일들">
            {game.piles.map((pile, index) => {
              const stackOffset = getStackOffset(pile.length);
              const discardCount = discardPileCounts.get(index) ?? 0;
              return (
                <div
                  className={`solitaire-pile ${discardCount > 0 ? "is-discard-target" : ""} ${game.pendingDraws > 0 || game.pendingPileDrawCount > 0 || game.pendingSweep ? pile.length > 0 ? "is-draw-choice" : "is-draw-empty" : ""}`}
                  key={index}
                  data-pile-index={index}
                  data-drop-target={`pile:${index}`}
                  aria-label={`${index + 1}번 파일, ${pile.length}장`}
                  onClick={() => game.pendingSweep ? takeSelectedPile(index) : drawSelectedPile(index)}
                >
                {pile.length === 0 && <div className="empty-slot" aria-hidden="true" />}
                {discardCount > 0 && <span className="discard-target-label">버리기 {discardCount}</span>}
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
                      {faceUp ? <CardFace card={card} strength={game.strength + combatManualBonus} agility={game.agility + combatManualBonus} /> : <span className={`card-back-pattern ${card.colored ? "is-painted" : ""}`} />}
                    </div>
                  );
                })}
                </div>
              );
            })}
            {game.stars > 0 && (
              <div
                className="solitaire-resource pile-resource"
                aria-label={`솔리테어 행동 자원 ${game.stars}개 남음`}
                title="솔리테어 행동 자원"
              >
                {Array.from({ length: game.stars }, (_, slot) => <span key={slot}>★</span>)}
              </div>
            )}
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
                  : dragging?.card.kind === "power"
                    ? "여기에 놓아 파워 사용"
                  : "여기에 놓아 수비"}
          </div>
          <div className="status-strip" role="status" aria-live="polite">{game.message}</div>
        </div>

        <div className="player-zone">
          {damagePopup && (
            <div className={`damage-popup ${damagePopup.text === "막음" ? "is-blocked" : ""}`} key={damagePopup.key}>
              {damagePopup.text}
            </div>
          )}
          <div className="player-status-column">
            <div className="player-panel">
              <div className="player-avatar">P</div>
              <div className="player-details">
                <strong>방랑자</strong>
                <div className="healthbar player-health">
                  <i style={{ width: `${(game.playerHp / MAX_PLAYER_HP) * 100}%` }} />
                  <span>{game.playerHp} / {MAX_PLAYER_HP}</span>
                </div>
                <div className="combat-buffs" aria-label="현재 강화 효과">
                  {game.strength + combatManualBonus > 0 && <span>힘 {game.strength + combatManualBonus}</span>}
                  {game.agility + combatManualBonus > 0 && <span>강인함 {game.agility + combatManualBonus}</span>}
                  {game.defenseMultiplier > 1 && <span>방어 ×{game.defenseMultiplier}</span>}
                  {game.damageTakenMultiplier > 1 && <span>받는 피해 ×{game.damageTakenMultiplier}</span>}
                  {game.invulnerable && <span>피해 면역</span>}
                  {game.doubleNextAttack && <span>다음 공격 2회</span>}
                </div>
                {inventoryConsumables.length > 0 && (
                  <div className="battle-consumables" aria-label="보유 소모품">
                    {inventoryConsumables.filter((consumable) => consumable.type === "swiftTicket").map((consumable) => (
                      <button
                        type="button"
                        className={consumable.type}
                        key={consumable.id}
                        onClick={() => consumable.type === "swiftTicket" && consumeSwiftTicket(consumable.id)}
                        disabled={controlsLocked}
                        title={consumable.description}
                      >
                        <strong>{consumable.name}</strong>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {(game.playerPhysicalBlock > 0 || game.playerMagicBlock > 0) && (
              <div className="defense-shields" aria-label="현재 방어도">
                {game.playerPhysicalBlock > 0 && (
                  <div className="defense-shield physical" aria-label={`방어 ${game.playerPhysicalBlock}`}>
                    <span>방어</span>
                    <strong>{game.playerPhysicalBlock}</strong>
                  </div>
                )}
                {game.playerMagicBlock > 0 && (
                  <div className="defense-shield magic" aria-label={`마법 방어 ${game.playerMagicBlock}`}>
                    <span>마법 방어</span>
                    <strong>{game.playerMagicBlock}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={`hand ${phase === "discarding" ? "is-discarding" : ""} ${game.pendingDiscards > 0 ? "is-discard-choice" : ""}`}
            data-drop-target="hand"
            aria-label="손패"
          >
            {displayedHand.map((card, index) => card ? (
              <button
                className={`game-card card-face ${card.kind} ${card.damageType} ${dragging?.card.id === card.id ? "is-dragging" : ""}`}
                key={card.id}
                ref={(element) => {
                  if (element) handCardRefs.current.set(card.id, element);
                  else handCardRefs.current.delete(card.id);
                }}
                style={{
                  "--card-index": index,
                  "--fan-angle": `${(index - (displayedHand.length - 1) / 2) * 3.5}deg`,
                  "--fan-y": `${Math.abs(index - (displayedHand.length - 1) / 2) * 5}px`,
                } as CSSProperties}
                onPointerDown={(event) => beginDrag(event, card, { type: "hand" })}
                onPointerMove={moveDrag}
                onPointerUp={finishDrag}
                onPointerCancel={cancelDrag}
                onClick={() => game.pendingDiscards > 0 && discardSelectedCard(card.id)}
                onDoubleClick={() => playHandCardOnDoubleClick(card)}
                disabled={controlsLocked && game.pendingDiscards === 0}
                aria-label={["slime", "combatManual", "grimoire"].includes(card.effect) ? `${card.name}, 비용 없음, 사용 불가` : `${card.name}, 에너지 ${card.cost}`}
              >
                <CardFace card={card} starsSpent={game.starsSpent} strength={game.strength + combatManualBonus} agility={game.agility + combatManualBonus} />
              </button>
            ) : <div className="hand-card-placeholder" aria-hidden="true" key={`clear-slot-${index}`} />)}
            {game.hand.length === 0 && phase === "playing" && game.status === "playing" && (
              <div className="empty-hand">사용할 카드가 없습니다</div>
            )}
          </div>

          <div className="controls">
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
                    {battleRewardDecks.map((deck) => (
                      <div className="battle-reward-deck" key={deck.id}>
                        <span className="floor-deck-icon" aria-hidden="true" />
                        <strong><DeckName deck={deck} /></strong>
                        <span>{deck.cards.length} / {deck.capacity}</span>
                      </div>
                    ))}
                    {battleRewardConsumables.map((item) => (
                      <div className={`battle-reward-consumable consumable-ticket ${item.type}`} key={item.id}>
                        <strong>{item.name}</strong>
                        <small>{item.description}</small>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={game.status === "won" ? returnToMap : startNewRun}
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

    </main>
  );
}
