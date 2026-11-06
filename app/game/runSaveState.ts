import type { BlessingId } from "./blessingRules";
import { ALL_CARD_BLUEPRINTS, RARE_CARD_POOL, SPECIAL_CARD_POOL, type Card } from "./cards.ts";
import { countRareSlotCards } from "./deckEditorRules.ts";
import type { Consumable, DeckCase } from "./rewards.ts";
import { createConsumable, STARTER_DECK_CAPACITY, STARTER_DECK_RARE_SLOT_CAPACITY, isDeckEdition, getDeckEditionColor } from "./rewards.ts";
import type { SavedRunState } from "./runTypes";
import { isEncounterAvailable, normalizeEncounterIndex } from "./enemies.ts";
import { normalizeBattleWins } from "./karmaRules.ts";
import { TEMPORARILY_DISABLED_TICKETS } from "./shopRules.ts";

const REMOVED_EFFECTS = new Set(["sacrifice", "magicCrystal", "delay", "boneArmor", "steelHeart", "ironWall", "blessing", "berserk"]);
const REMOVED_CARD_NAMES = new Set(["불티", "잔바위", "유예", "뼈 갑옷", "환기"]);
const UPDATED_CARD_NAMES = new Set(["몸 사리기", "기회 창출", "기회 포착", "정리 타격", "과감한 회피", "싸움 준비", "대전략가"]);
const RENAMED_CARD_NAMES: Readonly<Record<string, string>> = {
  "비늘 갑옷": "위압",
  "갈라치기": "돌파구",
  "오시리스 선": "별의 샘",
  "거울상": "반전",
  "전술가": "대전략가",
};
const RESTORED_EFFECTS = new Set([
  "rapidFire", "supernova", "meteor", "wish", "sturdyStance", "lawResearch", "economicsResearch", "lightTravelTime", "wolfTalisman", "turtleTalisman", "obsidianDagger", "plateArmorDefense",
]);

function restoreLegacyCard(card: Card): Card | null {
  if (REMOVED_EFFECTS.has(card.effect) || REMOVED_CARD_NAMES.has(card.name)) return null;
  const restored = { ...card } as Card & { ritualCost?: number; spellRank?: number; magicCrystalStage?: number };
  restored.name = RENAMED_CARD_NAMES[restored.name] ?? restored.name;
  delete restored.ritualCost;
  delete restored.spellRank;
  delete restored.magicCrystalStage;
  if (restored.effect === "slime") restored.damageType = "physical";
  if (UPDATED_CARD_NAMES.has(restored.name)) {
    const blueprint = ALL_CARD_BLUEPRINTS.find(item => item.name === restored.name && item.effect === restored.effect);
    if (blueprint) {
      restored.rarity = blueprint.rarity;
      restored.cost = blueprint.cost;
      restored.value = blueprint.value;
      restored.draw = blueprint.draw;
      restored.discardPileTop = blueprint.discardPileTop;
      restored.discardCost = blueprint.discardCost;
    }
  }
  if (RESTORED_EFFECTS.has(restored.effect)) {
    const blueprint = [...SPECIAL_CARD_POOL, ...RARE_CARD_POOL].find((item) => item.effect === restored.effect);
    if (blueprint) {
      restored.name = blueprint.name;
      restored.rarity = blueprint.rarity;
      restored.cost = blueprint.cost;
      restored.value = blueprint.value;
      restored.exhaust = blueprint.exhaust;
      restored.rule = blueprint.rule;
    }
  }
  return restored;
}

function restoreLegacyCards(cards: Card[]): Card[] {
  return cards.flatMap((card) => restoreLegacyCard(card) ?? []);
}

function restoreLegacyDeck(deck: DeckCase): DeckCase {
  const cards = restoreLegacyCards(deck.cards ?? []);
  const editions = (deck.editions ?? []).filter(isDeckEdition);
  const savedRareSlots = Number(deck.rareSlotCapacity);
  const minimumRareSlots = Math.max(countRareSlotCards(cards),
    deck.id === "starter" ? STARTER_DECK_RARE_SLOT_CAPACITY : 0);
  return {
    ...deck,
    capacity: deck.id === "starter" ? Math.max(STARTER_DECK_CAPACITY, deck.capacity) : deck.capacity,
    cards,
    editions,
    editionColors: Object.fromEntries(editions.map(edition => [edition, deck.editionColors?.[edition] ?? getDeckEditionColor(edition)])),
    rareSlotCapacity: Math.max(minimumRareSlots, Number.isFinite(savedRareSlots) ? Math.floor(savedRareSlots) : 0),
  };
}

function isDeletedConsumable(consumable: Consumable) {
  return (consumable as { type: string }).type === "swapTicket"
    || TEMPORARILY_DISABLED_TICKETS.has(consumable.type);
}

function removeDeletedTickets(consumables: readonly Consumable[] = []) {
  return consumables.filter((consumable) => !isDeletedConsumable(consumable)).map(item =>
    item.type === "extractTicket" ? { ...item, ...createConsumable(item.type, item.id) } : item);
}

type SetBackedRunStateFields =
  | "seenRooms"
  | "bloodstainedRooms"
  | "safeAreaEntrySeenRooms"
  | "defeatedBossRegions"
  | "destroyedShopRooms"
  | "collapsedExtractionShrineRooms"
  | "collapsedRecoveryShrineRooms"
  | "collapsedVitalityShrineRooms"
  | "collapsedMindEyeShrineRooms"
  | "collapsedTransformShrineRooms"
  | "collapsedTreasureChestRooms"
  | "openedDeckVaultRooms"
  | "usedHealRooms"
  | "usedBlessingRooms"
  | "blessingSeenOfferIds";

export type RunSaveSnapshotSource = Omit<SavedRunState, SetBackedRunStateFields> & {
  seenRooms: ReadonlySet<string>;
  bloodstainedRooms?: ReadonlySet<string>;
  safeAreaEntrySeenRooms: ReadonlySet<string> | null;
  defeatedBossRegions: ReadonlySet<number>;
  destroyedShopRooms: ReadonlySet<string>;
  collapsedExtractionShrineRooms: ReadonlySet<string>;
  collapsedRecoveryShrineRooms: ReadonlySet<string>;
  collapsedVitalityShrineRooms: ReadonlySet<string>;
  collapsedMindEyeShrineRooms: ReadonlySet<string>;
  collapsedTransformShrineRooms: ReadonlySet<string>;
  collapsedTreasureChestRooms: ReadonlySet<string>;
  openedDeckVaultRooms?: ReadonlySet<string>;
  usedHealRooms: ReadonlySet<string>;
  usedBlessingRooms: ReadonlySet<string>;
  blessingSeenOfferIds: ReadonlySet<BlessingId>;
};

export function createRunSaveSnapshot(source: RunSaveSnapshotSource): SavedRunState {
  return {
    ...source,
    seenRooms: [...source.seenRooms],
    bloodstainedRooms: [...(source.bloodstainedRooms ?? [])],
    safeAreaEntrySeenRooms: source.safeAreaEntrySeenRooms
      ? [...source.safeAreaEntrySeenRooms]
      : null,
    defeatedBossRegions: [...source.defeatedBossRegions],
    destroyedShopRooms: [...source.destroyedShopRooms],
    collapsedExtractionShrineRooms: [...source.collapsedExtractionShrineRooms],
    collapsedRecoveryShrineRooms: [...source.collapsedRecoveryShrineRooms],
    collapsedVitalityShrineRooms: [...source.collapsedVitalityShrineRooms],
    collapsedMindEyeShrineRooms: [...source.collapsedMindEyeShrineRooms],
    collapsedTransformShrineRooms: [...source.collapsedTransformShrineRooms],
    collapsedTreasureChestRooms: [...source.collapsedTreasureChestRooms],
    openedDeckVaultRooms: [...(source.openedDeckVaultRooms ?? [])],
    usedHealRooms: [...source.usedHealRooms],
    usedBlessingRooms: [...source.usedBlessingRooms],
    blessingSeenOfferIds: [...source.blessingSeenOfferIds],
  };
}

type NormalizedRunRestoreFields =
  | "collapsedExtractionShrineRooms"
  | "collapsedRecoveryShrineRooms"
  | "collapsedVitalityShrineRooms"
  | "collapsedMindEyeShrineRooms"
  | "collapsedTransformShrineRooms"
  | "collapsedTreasureChestRooms"
  | "vitalityShrineMaxHpBonus"
  | "godsLamentCharges"
  | "regionBattleWins"
  | "bloodstainedRooms"
  | "darkTicketTurnsRemaining"
  | "blessingOffers"
  | "blessingSeenOfferIds"
  | "blessingRerollCost"
  | "blessings"
  | "oneUpUsed"
  | "openedDeckVaultRooms"
  | "roomDeckVaults"
  | "keys"
  | "skipPortalKeyWarning";

export type PreparedRunRestore = Omit<SavedRunState, NormalizedRunRestoreFields> & Required<Pick<
  SavedRunState,
  NormalizedRunRestoreFields
>>;

export function prepareRunRestore(
  state: SavedRunState,
  isSafeArea: (position: SavedRunState["mapPosition"], seed: number) => boolean,
): PreparedRunRestore {
  const legacyCollapsedHealthShrineRooms = state.collapsedHealthShrineRooms ?? [];
  const savedBlessingRerollCost = Math.max(5, Number(state.blessingRerollCost) || 5);
  const godsLamentCharges = isSafeArea(state.mapPosition, state.mapSeed)
    ? 0
    : Math.max(0, Math.min(3, Number(state.godsLamentCharges ?? 3) || 0));

  return {
    ...state,
    mapEnemyWorld: {
      enemies: (state.mapEnemyWorld?.enemies ?? [])
        .map(enemy => ({ ...enemy, encounterIndex: normalizeEncounterIndex(enemy.encounterIndex) }))
        .filter((enemy) => isEncounterAvailable(enemy.encounterIndex)),
    },
    mapEnemyCellMemory: Object.fromEntries(Object.entries(state.mapEnemyCellMemory ?? {})
      .map(([key, memory]) => [key, { ...memory, encounterIndex: normalizeEncounterIndex(memory.encounterIndex) }] as const)
      .filter(([, memory]) => isEncounterAvailable(memory.encounterIndex))),
    ownedDecks: (state.ownedDecks ?? []).map(restoreLegacyDeck),
    inventoryCards: restoreLegacyCards(state.inventoryCards ?? []),
    inventoryConsumables: removeDeletedTickets(state.inventoryConsumables ?? []),
    roomDrops: Object.fromEntries(Object.entries(state.roomDrops ?? {}).map(([key, cards]) => [key, restoreLegacyCards(cards)])),
    roomDeckDrops: Object.fromEntries(Object.entries(state.roomDeckDrops ?? {}).map(([key, decks]) => [
      key, decks.map(restoreLegacyDeck),
    ])),
    roomConsumableDrops: Object.fromEntries(Object.entries(state.roomConsumableDrops ?? {}).map(([key, consumables]) => [
      key, removeDeletedTickets(consumables),
    ])),
    roomShops: {},
    gold: undefined,
    collapsedExtractionShrineRooms: state.collapsedExtractionShrineRooms ?? state.collapsedShrineRooms ?? [],
    collapsedRecoveryShrineRooms: state.collapsedRecoveryShrineRooms ?? legacyCollapsedHealthShrineRooms,
    collapsedVitalityShrineRooms: state.collapsedVitalityShrineRooms ?? legacyCollapsedHealthShrineRooms,
    collapsedMindEyeShrineRooms: state.collapsedMindEyeShrineRooms ?? [],
    collapsedTransformShrineRooms: state.collapsedTransformShrineRooms ?? [],
    collapsedTreasureChestRooms: state.collapsedTreasureChestRooms ?? [],
    openedDeckVaultRooms: state.openedDeckVaultRooms ?? [],
    roomDeckVaults: Object.fromEntries(Object.entries(state.roomDeckVaults ?? {}).map(([key, deck]) => [key, restoreLegacyDeck(deck)])),
    keys: Number.isFinite(state.keys) ? Math.max(0, Math.floor(state.keys!)) : 0,
    skipPortalKeyWarning: state.skipPortalKeyWarning === true,
    vitalityShrineMaxHpBonus: state.vitalityShrineMaxHpBonus ?? state.healthShrineMaxHpBonus ?? 0,
    godsLamentCharges,
    regionBattleWins: normalizeBattleWins(state.regionBattleWins),
    bloodstainedRooms: state.bloodstainedRooms ?? [],
    darkTicketTurnsRemaining: 0,
    blessingOffers: (state.blessingOffers ?? []).filter(id => !["greed", "goldRush"].includes(id)),
    blessingSeenOfferIds: state.blessingSeenOfferIds ?? [],
    blessings: state.blessings.filter((id) => !["luck", "greed", "goldRush"].includes(id as string)),
    blessingRerollCost: 5 + 2 * Math.ceil((savedBlessingRerollCost - 5) / 2),
    oneUpUsed: state.oneUpUsed ?? false,
  };
}
