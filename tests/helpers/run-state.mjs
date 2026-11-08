import { createStarterDeck, createConsumable } from "../../app/game/rewards.ts";
import { waitingState } from "../../app/game/battleState.ts";
import { MAP_START } from "../../app/game/mapRules.ts";
import { createTelemetryRecorder } from "../../app/game/telemetry.ts";

export const noop = () => {};
export function field(owner, name, initial) {
  let value = initial;
  Object.defineProperty(owner, name, { get: () => value });
  owner[`set${name[0].toUpperCase()}${name.slice(1)}`] = update => {
    value = typeof update === "function" ? update(value) : update;
  };
}
export function makeRunFixture() {
  const inventory = {};
  for (const [name, value] of Object.entries({
    ownedDecks: [createStarterDeck()], activeDeckId: "starter", inventoryCards: [], inventoryConsumables: [],
    roomDrops: {}, roomConsumableDrops: {}, roomDeckDrops: {}, roomDeckVaults: {}, roomShops: {}, gold: 1000, keys: 0, skipPortalKeyWarning: false,
  })) field(inventory, name, value);
  inventory.inventoryConsumablesRef = { current: [] };
  inventory.nextCardIdRef = { current: 1000 };
  inventory.nextConsumableIdRef = { current: 1000 };
  inventory.nextConsumable = type => createConsumable(type, `consumable-${inventory.nextConsumableIdRef.current++}`);
  inventory.rareCardDropChanceRef = { current: .05 };
  inventory.keysRef = { get current() { return inventory.keys; } };
  inventory.roomDeckVaultsRef = { get current() { return inventory.roomDeckVaults; } };
  inventory.ensureDeckVault = key => inventory.roomDeckVaults[key];
  const world = { roomType: "empty" };
  for (const [name, value] of Object.entries({
    mapPosition: MAP_START, mapSeed: 1, mapEnemyWorld: { enemies: [] }, mapEnemyCellMemory: {}, seenRooms: new Set(),
    safeAreaEntrySeenRooms: null, defeatedBossRegions: new Set(), usedHealRooms: new Set(),
    usedBlessingRooms: new Set(), collapsedExtractionShrineRooms: new Set(), collapsedRecoveryShrineRooms: new Set(),
    collapsedVitalityShrineRooms: new Set(), collapsedMindEyeShrineRooms: new Set(),
    collapsedTransformShrineRooms: new Set(),
    collapsedTreasureChestRooms: new Set(), openedDeckVaultRooms: new Set(), bloodstainedRooms: new Set(),
  })) field(world, name, value);
  world.openedDeckVaultRoomsRef = { get current() { return world.openedDeckVaultRooms; } };
  world.mapEnemyCellMemoryRef = { get current() { return world.mapEnemyCellMemory; } };
  world.effectiveRoomType = () => world.roomType;
  const player = {};
  for (const [name, value] of Object.entries({
    blessings: [], runPlayerHp: 40, godsLamentCharges: 3, regionBattleWins: 0, vitalityShrineMaxHpBonus: 0,
    mindEyeMovesRemaining: 0, blessingOffers: [], blessingSeenOfferIds: new Set(),
    blessingRerollCost: 5, oneUpUsed: false,
  })) field(player, name, value);
  player.runPlayerHpRef = { current: 40 };
  player.godsLamentChargesRef = { current: 3 };
  player.regionBattleWinsRef = { get current() { return player.regionBattleWins; } };
  player.mindEyeMovesRemainingRef = { current: 0 };
  player.oneUpUsedRef = { current: false };
  const battle = {};
  for (const [name, value] of Object.entries({
    screen: "map", game: waitingState(40, []), phase: "playing", activeMapEnemyIds: [], activeBattleRoom: null,
    pendingBattleStart: null, battleDeckCheckEnabled: true, battleDeckPreviewId: null,
    battleRewards: [], battleRewardDecks: [], battleRewardConsumables: [], battleRewardKeys: 0,
    battleCardView: null, dyingEnemyIds: new Set(), animatedEnemyHp: {}, attackingEnemyId: null, damagePopup: null,
  })) field(battle, name, value);
  for (const [name, value] of Object.entries({
    mapBattleQueueRef: [], previousBattleDeckIdRef: "starter", telemetryPreviousGameRef: null,
    battleRewardRegionRef: 1, battleRewardIsBossRef: false, battleRewardIsOutOfDepthRef: false,
    rewardGrantedRef: false, rewardCollectedRef: false, pendingEnemyTokenIdsRef: new Set(), pendingPileTokenSourcesRef: new Map(),
  })) battle[name] = { current: value };
  battle.getGame = () => battle.game;
  const scheduled = [];
  battle.later = (callback, delay) => { scheduled.push({ callback, delay }); return scheduled.length; };
  battle.clearBattleTimers = () => { scheduled.length = 0; };
  const dialogs = {};
  for (const [name, value] of Object.entries({
    shopOpen: false, activeShopRoom: null, shopMessage: "", openedCardPack: null, blessingOpen: false,
    extractionShrineOpen: false, transformShrineOpen: false, treasureChestReward: null, deckVaultRoom: null, portalKeyWarningRoom: null,
  })) field(dialogs, name, value);
  const editor = { setDeckEditorMessage: noop };
  const telemetry = createTelemetryRecorder();
  const options = (extra = {}) => ({
    inventory, world, player, battle, dialogs, editor, telemetry, scheduled,
    interaction: { setPileClearNotice: noop, setDragging: noop, setSelectedHandCardId: noop },
    ensureTelemetryRun: noop, clearMapTravel: noop, closeMapOverlays: noop, clearCardPreview: noop,
    drawCards: noop, rememberPlayerVision: noop, queueRunSave: noop,
    materializeMapContent: (_positions, _seed, existing) => existing ?? world.mapEnemyWorld,
    materializeVisibleMapContent: (_position, _seed, existing) => existing ?? world.mapEnemyWorld,
    focusMapOn: noop, isSafeAreaSealed: () => false, setMapMessage: noop, showMapMessage: noop,
    maxPlayerHp: 50, blessingVisionBonus: 0, inventoryCapacity: 2,
    inventoryItemCount: inventory.inventoryCards.length + inventory.inventoryConsumables.length,
    ...extra,
  });
  return { inventory, world, player, battle, dialogs, editor, options, scheduled };
}
