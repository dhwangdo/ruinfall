import type { Card } from "./cards";
import type { BlessingId, BlessingOfferId } from "./blessingRules";
import type { MapEnemyCellMemory, MapEnemyWorld } from "./mapEnemies";
import type { MapBomb } from "./mapEffects";
import type { MapPosition } from "./mapRules";
import type { Consumable, DeckCase, ShopOffer } from "./rewards";

export type SavedRunState = {
  playerName: string;
  runPlayerHp: number;
  mapSeed: number;
  mapPosition: MapPosition;
  seenRooms: string[];
  safeAreaEntrySeenRooms: string[] | null;
  mapEnemyWorld: MapEnemyWorld;
  defeatedBossRegions: number[];
  mapEnemyCellMemory: MapEnemyCellMemory;
  mapBombs: MapBomb[];
  destroyedShopRooms: string[];
  collapsedShrineRooms: string[];
  collapsedRecoveryShrineRooms?: string[];
  collapsedVitalityShrineRooms?: string[];
  collapsedMindEyeShrineRooms?: string[];
  collapsedTransformShrineRooms?: string[];
  collapsedCombinationShrineRooms?: string[];
  collapsedTreasureChestRooms?: string[];
  vitalityShrineMaxHpBonus?: number;
  collapsedHealthShrineRooms?: string[];
  healthShrineMaxHpBonus?: number;
  usedHealRooms: string[];
  usedBlessingRooms: string[];
  rockBombHits: Record<string, number>;
  mindEyeMovesRemaining: number;
  godsLamentCharges?: number;
  darkTicketTurnsRemaining?: number;
  ownedDecks: DeckCase[];
  activeDeckId: string;
  inventoryCards: Card[];
  inventoryConsumables: Consumable[];
  roomDrops: Record<string, Card[]>;
  roomConsumableDrops: Record<string, Consumable[]>;
  roomDeckDrops: Record<string, DeckCase[]>;
  roomShops: Record<string, ShopOffer[]>;
  blessingOffers?: BlessingOfferId[];
  blessingSeenOfferIds?: BlessingId[];
  blessings: BlessingId[];
  blessingRerollCost: number;
  oneUpUsed: boolean;
  gold: number;
  nextCardId: number;
  nextConsumableId: number;
  deckDropChance: number;
  rareCardDropChance: number;
  deckPityBattlesRemaining?: number;
};

export type ShrineResult = { cards: Card[] };

export type TreasureChestReward = {
  cards: Card[];
  consumables: Consumable[];
  decks: DeckCase[];
  rolls: number;
  bonusRolls: number;
};

export type BattleEncounter = {
  encounterIndex: number;
  damageTaken?: number;
  awareness?: "sleeping" | "awake" | "alerted";
  isBoss?: boolean;
};

export type PendingBattleStart = {
  encounters: BattleEncounter[];
  playerHp: number;
};

export type MapBattleEnemy = BattleEncounter & { id: string };
