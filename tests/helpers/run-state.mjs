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
    roomDrops: {}, roomConsumableDrops: {}, roomDeckDrops: {}, roomShops: {}, gold: 1000,
  })) field(inventory, name, value);
  inventory.inventoryConsumablesRef = { current: [] };
  inventory.nextCardIdRef = { current: 1000 };
  inventory.nextConsumableIdRef = { current: 1000 };
  inventory.nextConsumable = type => createConsumable(type, `consumable-${inventory.nextConsumableIdRef.current++}`);
  inventory.deckDropChanceRef = { current: .25 };
  inventory.rareCardDropChanceRef = { current: .05 };
  inventory.deckPityBattlesRemainingRef = { current: 3 };
  const world = { roomType: "empty" };
  for (const [name, value] of Object.entries({
    mapPosition: MAP_START, mapSeed: 1, mapEnemyWorld: { enemies: [] }, seenRooms: new Set(),
    safeAreaEntrySeenRooms: null, defeatedBossRegions: new Set(), usedHealRooms: new Set(),
    usedBlessingRooms: new Set(), collapsedShrineRooms: new Set(), collapsedRecoveryShrineRooms: new Set(),
    collapsedVitalityShrineRooms: new Set(), collapsedMindEyeShrineRooms: new Set(),
    collapsedTransformShrineRooms: new Set(), collapsedCombinationShrineRooms: new Set(),
    collapsedTreasureChestRooms: new Set(),
  })) field(world, name, value);
  world.effectiveRoomType = () => world.roomType;
  const player = {};
  for (const [name, value] of Object.entries({
    blessings: [], runPlayerHp: 40, godsLamentCharges: 3, vitalityShrineMaxHpBonus: 0,
    mindEyeMovesRemaining: 0, blessingOffers: [], blessingSeenOfferIds: new Set(),
    blessingRerollCost: 5, oneUpUsed: false,
  })) field(player, name, value);
  player.runPlayerHpRef = { current: 40 };
  player.godsLamentChargesRef = { current: 3 };
  player.mindEyeMovesRemainingRef = { current: 0 };
  player.oneUpUsedRef = { current: false };
  const battle = {};
  for (const [name, value] of Object.entries({
    screen: "map", game: waitingState(40, []), phase: "playing", activeMapEnemyIds: [], activeBattleRoom: null,
    pendingBattleStart: null, battleDeckCheckEnabled: true, battleDeckPreviewId: null,
    battleRewards: [], battleRewardDecks: [], battleRewardConsumables: [], battleRewardGold: 0,
    battleCardView: null, dyingEnemyIds: new Set(), animatedEnemyHp: {}, attackingEnemyId: null, damagePopup: null,
  })) field(battle, name, value);
  for (const [name, value] of Object.entries({
    mapBattleQueueRef: [], previousBattleDeckIdRef: "starter", telemetryPreviousGameRef: null,
    battleRewardRegionRef: 1, battleRewardIsBossRef: false, battleRewardIsOutOfDepthRef: false,
    rewardGrantedRef: false, pendingEnemyTokenIdsRef: new Set(), pendingPileTokenSourcesRef: new Map(),
  })) battle[name] = { current: value };
  battle.getGame = () => battle.game;
  const scheduled = [];
  battle.later = (callback, delay) => { scheduled.push({ callback, delay }); return scheduled.length; };
  battle.clearBattleTimers = () => { scheduled.length = 0; };
  const dialogs = {};
  for (const [name, value] of Object.entries({
    shopOpen: false, activeShopRoom: null, shopMessage: "", openedCardPack: null, blessingOpen: false,
    shrineOpen: false, transformShrineOpen: false, combinationShrineOpen: false, treasureChestReward: null,
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
