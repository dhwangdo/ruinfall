import type { BlessingId } from "./blessingRules";
import { RARE_CARD_POOL, type Card } from "./cards.ts";
import type { SavedRunState } from "./runTypes";

const REMOVED_EFFECTS = new Set(["sacrifice", "magicCrystal", "delay", "boneArmor"]);
const REMOVED_CARD_NAMES = new Set(["불티", "잔바위", "유예", "뼈 갑옷", "환기"]);
const RESTORED_EFFECTS = new Set([
  "steelHeart", "rapidFire", "supernova", "meteor", "sturdyStance", "economicsResearch", "lightTravelTime",
]);

function restoreLegacyCard(card: Card): Card | null {
  if (REMOVED_EFFECTS.has(card.effect) || REMOVED_CARD_NAMES.has(card.name)) return null;
  const restored = { ...card } as Card & { ritualCost?: number; spellRank?: number; magicCrystalStage?: number };
  delete restored.ritualCost;
  delete restored.spellRank;
  delete restored.magicCrystalStage;
  if (RESTORED_EFFECTS.has(restored.effect)) {
    const blueprint = RARE_CARD_POOL.find((item) => item.effect === restored.effect);
    if (blueprint) {
      restored.name = blueprint.name;
      restored.cost = blueprint.cost;
      restored.value = blueprint.value;
    }
  }
  return restored;
}

function restoreLegacyCards(cards: Card[]): Card[] {
  return cards.flatMap((card) => restoreLegacyCard(card) ?? []);
}

type SetBackedRunStateFields =
  | "seenRooms"
  | "safeAreaEntrySeenRooms"
  | "defeatedBossRegions"
  | "destroyedShopRooms"
  | "collapsedShrineRooms"
  | "collapsedRecoveryShrineRooms"
  | "collapsedVitalityShrineRooms"
  | "collapsedMindEyeShrineRooms"
  | "collapsedTransformShrineRooms"
  | "collapsedCombinationShrineRooms"
  | "collapsedTreasureChestRooms"
  | "usedHealRooms"
  | "usedBlessingRooms"
  | "blessingSeenOfferIds";

export type RunSaveSnapshotSource = Omit<SavedRunState, SetBackedRunStateFields> & {
  seenRooms: ReadonlySet<string>;
  safeAreaEntrySeenRooms: ReadonlySet<string> | null;
  defeatedBossRegions: ReadonlySet<number>;
  destroyedShopRooms: ReadonlySet<string>;
  collapsedShrineRooms: ReadonlySet<string>;
  collapsedRecoveryShrineRooms: ReadonlySet<string>;
  collapsedVitalityShrineRooms: ReadonlySet<string>;
  collapsedMindEyeShrineRooms: ReadonlySet<string>;
  collapsedTransformShrineRooms: ReadonlySet<string>;
  collapsedCombinationShrineRooms: ReadonlySet<string>;
  collapsedTreasureChestRooms: ReadonlySet<string>;
  usedHealRooms: ReadonlySet<string>;
  usedBlessingRooms: ReadonlySet<string>;
  blessingSeenOfferIds: ReadonlySet<BlessingId>;
};

export function createRunSaveSnapshot(source: RunSaveSnapshotSource): SavedRunState {
  return {
    ...source,
    seenRooms: [...source.seenRooms],
    safeAreaEntrySeenRooms: source.safeAreaEntrySeenRooms
      ? [...source.safeAreaEntrySeenRooms]
      : null,
    defeatedBossRegions: [...source.defeatedBossRegions],
    destroyedShopRooms: [...source.destroyedShopRooms],
    collapsedShrineRooms: [...source.collapsedShrineRooms],
    collapsedRecoveryShrineRooms: [...source.collapsedRecoveryShrineRooms],
    collapsedVitalityShrineRooms: [...source.collapsedVitalityShrineRooms],
    collapsedMindEyeShrineRooms: [...source.collapsedMindEyeShrineRooms],
    collapsedTransformShrineRooms: [...source.collapsedTransformShrineRooms],
    collapsedCombinationShrineRooms: [...source.collapsedCombinationShrineRooms],
    collapsedTreasureChestRooms: [...source.collapsedTreasureChestRooms],
    usedHealRooms: [...source.usedHealRooms],
    usedBlessingRooms: [...source.usedBlessingRooms],
    blessingSeenOfferIds: [...source.blessingSeenOfferIds],
  };
}

type NormalizedRunRestoreFields =
  | "collapsedRecoveryShrineRooms"
  | "collapsedVitalityShrineRooms"
  | "collapsedMindEyeShrineRooms"
  | "collapsedTransformShrineRooms"
  | "collapsedCombinationShrineRooms"
  | "collapsedTreasureChestRooms"
  | "vitalityShrineMaxHpBonus"
  | "godsLamentCharges"
  | "darkTicketTurnsRemaining"
  | "blessingOffers"
  | "blessingSeenOfferIds"
  | "blessingRerollCost"
  | "blessings"
  | "oneUpUsed"
  | "deckPityBattlesRemaining";

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
    ownedDecks: (state.ownedDecks ?? []).map((deck) => ({ ...deck, cards: restoreLegacyCards(deck.cards) })),
    inventoryCards: restoreLegacyCards(state.inventoryCards ?? []),
    roomDrops: Object.fromEntries(Object.entries(state.roomDrops ?? {}).map(([key, cards]) => [key, restoreLegacyCards(cards)])),
    roomDeckDrops: Object.fromEntries(Object.entries(state.roomDeckDrops ?? {}).map(([key, decks]) => [
      key, decks.map((deck) => ({ ...deck, cards: restoreLegacyCards(deck.cards) })),
    ])),
    roomShops: Object.fromEntries(Object.entries(state.roomShops ?? {}).map(([key, offers]) => [
      key, offers.flatMap((offer) => {
        if (!offer.card) return [offer];
        const card = restoreLegacyCard(offer.card);
        return card ? [{ ...offer, card }] : [];
      }),
    ])),
    collapsedRecoveryShrineRooms: state.collapsedRecoveryShrineRooms ?? legacyCollapsedHealthShrineRooms,
    collapsedVitalityShrineRooms: state.collapsedVitalityShrineRooms ?? legacyCollapsedHealthShrineRooms,
    collapsedMindEyeShrineRooms: state.collapsedMindEyeShrineRooms ?? [],
    collapsedTransformShrineRooms: state.collapsedTransformShrineRooms ?? [],
    collapsedCombinationShrineRooms: state.collapsedCombinationShrineRooms ?? [],
    collapsedTreasureChestRooms: state.collapsedTreasureChestRooms ?? [],
    vitalityShrineMaxHpBonus: state.vitalityShrineMaxHpBonus ?? state.healthShrineMaxHpBonus ?? 0,
    godsLamentCharges,
    darkTicketTurnsRemaining: state.darkTicketTurnsRemaining ?? 0,
    blessingOffers: state.blessingOffers ?? [],
    blessingSeenOfferIds: state.blessingSeenOfferIds ?? [],
    blessings: state.blessings.filter((id) => (id as string) !== "luck"),
    blessingRerollCost: 5 + 2 * Math.ceil((savedBlessingRerollCost - 5) / 2),
    oneUpUsed: state.oneUpUsed ?? false,
    deckPityBattlesRemaining: Math.max(0, Math.min(3, state.deckPityBattlesRemaining ?? 3)),
  };
}
