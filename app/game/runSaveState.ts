import type { BlessingId } from "./blessingRules";
import type { SavedRunState } from "./runTypes";

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
  | "collapsedAltarRooms"
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
  collapsedAltarRooms: ReadonlySet<string>;
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
    collapsedAltarRooms: [...source.collapsedAltarRooms],
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
  | "collapsedAltarRooms"
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
    collapsedRecoveryShrineRooms: state.collapsedRecoveryShrineRooms ?? legacyCollapsedHealthShrineRooms,
    collapsedVitalityShrineRooms: state.collapsedVitalityShrineRooms ?? legacyCollapsedHealthShrineRooms,
    collapsedMindEyeShrineRooms: state.collapsedMindEyeShrineRooms ?? [],
    collapsedTransformShrineRooms: state.collapsedTransformShrineRooms ?? [],
    collapsedCombinationShrineRooms: state.collapsedCombinationShrineRooms ?? [],
    collapsedTreasureChestRooms: state.collapsedTreasureChestRooms ?? [],
    collapsedAltarRooms: state.collapsedAltarRooms ?? [],
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
