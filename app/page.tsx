"use client";

import { animateCardToPlayer, animateEnemyCardDelivery, animatePlayedCardToCenter } from "./components/cardAnimations";
import { createDrawAstronomyResearchCard, createDrawSelectedPile, createMoveCardToPile } from "./game/pileActions";
import { createResolvePlayedCard } from "./game/cardPlayAction";
import type { DamagePopup, DragState, Phase } from "./game/battleUiTypes";
import { createEndTurn } from "./game/endTurnAction";
import { createDrawCards } from "./game/drawCards";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { CardFace } from "./components/CardFace";
import { CardKeywordPopover } from "./components/CardKeywordPopover";
import { DeckName } from "./components/DeckName";
import { BattleThemeControls, DEFAULT_BATTLE_THEME_COLORS, type BattleThemeColors, type CardWatermarkStyle, type StarOrbitStyle } from "./components/BattleThemeControls";
import { BattleEnemyUnit } from "./components/BattleEnemyUnit";
import { BattleHandArea } from "./components/BattleHandArea";
import { BattleDeckCheckModal } from "./components/BattleDeckCheckModal";
import { BattlePileZone } from "./components/BattlePileZone";
import { BattlePlayerPanel } from "./components/BattlePlayerPanel";
import { BattleResultOverlay } from "./components/BattleResultOverlay";
import { DeckEditorCardIcon } from "./components/DeckEditorCardIcon";
import { CardConversionShrineModal } from "./components/CardConversionShrineModal";
import { ExtractionShrineModal } from "./components/ExtractionShrineModal";
import { DeckEditorModal } from "./components/DeckEditorModal";
import { TreasureChestRewardModal } from "./components/TreasureChestRewardModal";
import { ShopModal } from "./components/ShopModal";
import { BlessingModal } from "./components/BlessingModal";
import { CardPoolStatsPanel } from "./components/CardPoolStatsPanel";
import { MapBoard } from "./components/MapBoard";
import { MapDeckSelector } from "./components/MapDeckSelector";
import { MapRoomActions } from "./components/MapRoomActions";
import { DeckViewerModal } from "./components/DeckViewerModal";
import {
  useMapCamera,
} from "./hooks/useMapCamera";
import { useMapKeyboardMovement } from "./hooks/useMapKeyboardMovement";
import { useMapKeyboardShortcuts } from "./hooks/useMapKeyboardShortcuts";
import { RESET_HOLD_DURATION_MS, useRunKeyboardControls } from "./hooks/useRunKeyboardControls";
import { useDeckEditorSession } from "./hooks/useDeckEditorSession";
import { useFloatingPreviews } from "./hooks/useFloatingPreviews";
import { useBattleInteractionState } from "./hooks/useBattleInteractionState";
import { useBattlePointerInput } from "./hooks/useBattlePointerInput";
import { useRunSaveLifecycle } from "./hooks/useRunSaveLifecycle";
import type { ShrineCardConversionResult } from "./game/shrineRules";
import {
  CONSTELLATION_PRESETS,
  constellationPresetCssImage,
} from "./cardConstellations";
import { MapTopbar } from "./components/MapTopbar";
import {
  ALL_CARD_BLUEPRINTS,
  BASIC_CARD_POOL,
  CARD_RARITY_SORT_RANK,
  DEBUG_CARD_RARITIES,
  RARE_CARD_POOL,
  SPECIAL_CARD_POOL,
  STARTER_CARD_POOL,
  UNPLAYABLE_CARD_EFFECTS,
  createAdrenalineCard,
  isAttackCard,
  type Card,
  type CardBlueprint,
} from "./game/cards";
import {
  IRON_WALL_COST,
  canPlaceBySolitaireRule,
  cardEnergyCost,
} from "./game/cardEffects";
import { canPayEnergyCost, maximumBattleEnergy } from "./game/combatEconomy";
import {
  MAX_PLAYER_HP,
  dealtState,
  waitingState,
  type GameState,
} from "./game/battleState";
import { sortBattleHandByCost } from "./game/battleHandRules";
import {
  CONSUMABLE_TYPES,
  DEBUG_ALL_CARDS_DECK_ID,
  DECK_EDITION_INFO,
  STARTING_DECK_SIZE,
  createBossBattleReward,
  createBattleReward,
  createBattleRewardCard,
  createConsumable,
  createDebugAllCardsDeck,
  createRegionDeck,
  createStarterDeck,
  getDeckEditionColor,
  type Consumable,
  type ConsumableType,
  type DeckCase,
  type ShopOffer,
} from "./game/rewards";
import { nextRareCardDropChance } from "./game/rewardRules";
import { TICKET_TYPES, ticketBasePrice, type TicketType } from "./game/shopRules";
import {
  consumeTicketById as consumeTicketFromAreas,
  findTicketById as findTicketInAreas,
  groupConsumables,
  sortConsumableGroupsByTier,
  setBombTicketArmed,
} from "./game/ticketRules";
import {
  createDeckName,
  createRandomPlayerName,
  createRandomSeed as createRandomMapSeed,
} from "./game/randomNames";
import {
  DUNGEON_MAX_X,
  DUNGEON_MIN_X,
  MAP_ROWS,
  MAP_START,
  REGION_COUNT,
  SAFE_AREA_LAYOUT_MAX_OFFSET_X,
  SAFE_AREA_LAYOUT_MIN_OFFSET_X,
  createMapEnemyWorldForPositions,
  createMapFloorDropsForPositions,
  getDungeonRegionIndex,
  getRegionNumber,
  getRoomType,
  getSafeAreaRegionIndex,
  isHigherRegionMapEnemy,
  isSafeAreaBoundaryPosition,
  isSafeAreaEditAllowed,
  isSafeAreaPosition,
  isWalkableRoom,
  mapRoomKey,
  nextRegionEntry,
  parseMapRoomKey,
  regionHeight,
  regionStartY,
  safeAreaCenterX,
  safeAreaCenterY,
  safeAreaEntry,
  visibleMapRoomKeys,
  type MapPosition,
} from "./game/mapRules";
import {
  applyPlayerTurnStart,
  createSewerEncounterByIndex,
  getEncounterRegionNumber,
  type EnemyState,
} from "./game/enemies";
import {
  chebyshevDistance,
  clearMapEnemiesNear,
  MAP_ENEMY_DISTANCE_FIELD_RADIUS,
  MAP_PLAYER_VISION_HORIZONTAL_RADIUS,
  MAP_PLAYER_VISION_VERTICAL_RADIUS,
  updateEnemyCellMemory,
  type MapEnemyCellMemory,
  type MapEnemyWorld,
} from "./game/mapEnemies";
import { resolveMapTurn as resolveMapTurnRules } from "./game/mapTurn";
import {
  advanceBombs,
  applyBombDamage,
  positionsInSquare,
  type MapBomb,
} from "./game/mapEffects";
import { RUN_SAVE_POLICY, clearRunSave, readRunSave } from "./game/saveGame";
import { createRunSaveSnapshot, prepareRunRestore } from "./game/runSaveState";
import {
  countRareSlotCards,
  usesRareCardSlot,
  validateDeckEditorCardMove,
  type DeckEditorCardLocation,
  type DeckEditorMoveBlockReason,
} from "./game/deckEditorRules";
import { transitionDeckEditorCardCollections } from "./game/deckEditorTransitions";
import { groupAndSortDeckEditorCards } from "./game/deckEditorViews";
import {
  BLESSING_INFO,
  hasUniqueCardEffects,
  resolveLethalDamage,
  rollBlessingOffers as createBlessingOffers,
  rollGamblingBlessings,
  shouldPreserveTicket,
  type BlessingId,
  type BlessingOfferId,
} from "./game/blessingRules";
import {
  beginTelemetryBattle,
  beginTelemetryRun,
  createTelemetryRecorder,
  exportTelemetryText,
  finishTelemetryBattle,
  finishTelemetryRun,
  hasActiveTelemetryRun,
  recordTelemetryCardAcquired,
  recordTelemetryCardPlayed,
  recordTelemetryConsumableAcquired,
  recordTelemetryDeckAcquired,
  recordTelemetryGoldAcquired,
  resetTelemetryRecorder,
  type TelemetryAcquisitionSource,
} from "./game/telemetry";
import {
  telemetryCardSnapshot,
  telemetryConsumableSnapshot,
  telemetryDeckSnapshot,
  telemetryEnemySnapshot,
} from "./game/telemetrySnapshots";
import type {
  BattleEncounter,
  MapBattleEnemy,
  PendingBattleStart,
  SavedRunState,
  TreasureChestReward,
} from "./game/runTypes";

type Screen = "map" | "battle";
type TicketDropArea = "deck" | "inventory" | "floor";
const REMOVED_DECK_EDITIONS = new Set(["transparent", "golden", "debug", "firepower", "growth"]);

function removeDeletedDeckEditions(deck: DeckCase): DeckCase {
  const editions = deck.editions.filter((edition) => !REMOVED_DECK_EDITIONS.has(edition as string));
  return {
    ...deck,
    editions,
    editionColors: Object.fromEntries(editions.map((edition) => [
      edition,
      deck.editionColors[edition] ?? getDeckEditionColor(edition),
    ])),
  };
}
function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomGameRoll() {
  return Math.random();
}

 

 







const DEBUG_PLAYER_HP = 999;
const GAME_VERSION = "v0.1.2";
const COMMIT_HASH = process.env.NEXT_PUBLIC_COMMIT_HASH ?? "dev";
const COMMIT_DATE = process.env.NEXT_PUBLIC_COMMIT_DATE ?? "unknown";
const INVENTORY_CAPACITY = 18;
const MAX_OWNED_DECKS = 3;
const DEBUG_MAX_OWNED_DECKS = 10;
const MAP_TRAVEL_STEP_MS = 140;
const MAP_COLLISION_OVERLAP_MS = 280;
const MAP_BATTLE_FLASH_MS = 600;
const CARD_HEIGHT = 170;
const DEFAULT_STACK_OFFSET = 27;

type ResearchDrawKind = "astronomy" | "necromancy";

function canUseResearchDraw(state: GameState, research: ResearchDrawKind) {
  if (state.pendingResearchDraw !== null) return false;
  const effect = research === "astronomy" ? "astronomyResearch" : "necromancyResearch";
  const uses = research === "astronomy" ? state.astronomyResearchUses : state.necromancyResearchUses;
  const cost = research === "astronomy" ? 2 : 3;
  const hasCards = research === "astronomy"
    ? state.piles.some((pile) => pile.length > 0)
    : state.discard.length > 0;
  return state.activeRuleCards.filter((card) => card.effect === effect).length > uses
    && state.stars >= cost
    && hasCards;
}

function getStackOffset() {
  return DEFAULT_STACK_OFFSET;
}

function maximumEnergyForGame(game: Pick<GameState, "deckEditions" | "deckHighlanderActive">, glassCannon = false) {
  return maximumBattleEnergy(
    game.deckEditions.includes("rampaging"),
    (game.deckHighlanderActive ? 1 : 0) + (glassCannon ? 1 : 0),
  );
}

function pickRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function lowestHealthEnemy(enemies: EnemyState[]) {
  return enemies
    .filter((enemy) => enemy.hp > 0)
    .reduce<EnemyState | undefined>((lowest, enemy) => !lowest || enemy.hp < lowest.hp ? enemy : lowest, undefined);
}



function isStarterOrBasicCard(card: Pick<Card, "rarity">) {
  return card.rarity === "starter" || card.rarity === "basic";
}


export default function Home() {
  const [screen, setScreen] = useState<Screen>("map");
  const [playerName, setPlayerName] = useState(createRandomPlayerName);
  const [playerNameSetupOpen, setPlayerNameSetupOpen] = useState(true);
  const [runPlayerHp, setRunPlayerHp] = useState(MAX_PLAYER_HP);
  const runPlayerHpRef = useRef(MAX_PLAYER_HP);
  const [mapSeed, setMapSeed] = useState(1);
  const [mapPosition, setMapPosition] = useState<MapPosition>(MAP_START);
  const [seenRooms, setSeenRooms] = useState<Set<string>>(
    () => new Set([mapRoomKey(MAP_START)]),
  );
  const [safeAreaEntrySeenRooms, setSafeAreaEntrySeenRooms] = useState<Set<string> | null>(null);
  const [mapEnemyWorld, setMapEnemyWorld] = useState<MapEnemyWorld>(() => ({
    enemies: [],
  }));
  const [defeatedBossRegions, setDefeatedBossRegions] = useState<Set<number>>(() => new Set());
  const [mapEnemyCellMemory, setMapEnemyCellMemory] = useState<MapEnemyCellMemory>({});
  const [mapBombs, setMapBombs] = useState<MapBomb[]>([]);
  const mapBombsRef = useRef<MapBomb[]>([]);
  const [destroyedShopRooms, setDestroyedShopRooms] = useState<Set<string>>(() => new Set());
  const [collapsedShrineRooms, setCollapsedShrineRooms] = useState<Set<string>>(() => new Set());
  const [collapsedRecoveryShrineRooms, setCollapsedRecoveryShrineRooms] = useState<Set<string>>(() => new Set());
  const [collapsedVitalityShrineRooms, setCollapsedVitalityShrineRooms] = useState<Set<string>>(() => new Set());
  const [collapsedMindEyeShrineRooms, setCollapsedMindEyeShrineRooms] = useState<Set<string>>(() => new Set());
  const [collapsedTransformShrineRooms, setCollapsedTransformShrineRooms] = useState<Set<string>>(() => new Set());
  const [collapsedCombinationShrineRooms, setCollapsedCombinationShrineRooms] = useState<Set<string>>(() => new Set());
  const [collapsedTreasureChestRooms, setCollapsedTreasureChestRooms] = useState<Set<string>>(() => new Set());
  const [treasureChestReward, setTreasureChestReward] = useState<TreasureChestReward | null>(null);
  const [vitalityShrineMaxHpBonus, setVitalityShrineMaxHpBonus] = useState(0);
  const [shrineOpen, setShrineOpen] = useState(false);
  const [transformShrineOpen, setTransformShrineOpen] = useState(false);
  const [combinationShrineOpen, setCombinationShrineOpen] = useState(false);
  const [usedHealRooms, setUsedHealRooms] = useState<Set<string>>(() => new Set());
  const [usedBlessingRooms, setUsedBlessingRooms] = useState<Set<string>>(() => new Set());
  const [rockBombHits, setRockBombHits] = useState<Record<string, number>>({});
  const [activeMapEnemyIds, setActiveMapEnemyIds] = useState<string[]>([]);
  const [activeBattleRoom, setActiveBattleRoom] = useState<string | null>(null);
  const mapBattleQueueRef = useRef<MapBattleEnemy[]>([]);
  const [mapTraveling, setMapTraveling] = useState(false);
  const mapCamera = useMapCamera({ enabled: screen === "map", position: mapPosition, travelLocked: mapTraveling });
  const {
    isFocusing: mapCameraFocusing,
    centerOn: centerMapOn,
    focusOn: focusMapOn,
    startTicketCameraTour: startMapTicketCameraTour,
    changeZoom: changeMapZoom,
    resetZoom: resetMapZoom,
    stopFocus: stopMapCameraFocus,
  } = mapCamera;
  const [mindEyeMovesRemaining, setMindEyeMovesRemaining] = useState(0);
  const mindEyeMovesRemainingRef = useRef(0);
  const [godsLamentCharges, setGodsLamentCharges] = useState(3);
  const godsLamentChargesRef = useRef(3);
  const [darkTicketTurnsRemaining, setDarkTicketTurnsRemaining] = useState(0);
  const darkTicketTurnsRemainingRef = useRef(0);
  const [mapTravelStepMs, setMapTravelStepMs] = useState(MAP_TRAVEL_STEP_MS);
  const [mapCollisionEnemyIds, setMapCollisionEnemyIds] = useState<string[]>([]);
  const [mapBattleFlash, setMapBattleFlash] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [cardPoolStatsOpen, setCardPoolStatsOpen] = useState(false);
  const [debugSpawnSelection, setDebugSpawnSelection] = useState("card:basic:0");
  const [debugDeckRegion, setDebugDeckRegion] = useState("1");
  const [debugDeckCount, setDebugDeckCount] = useState("1");
  const [battleThemeColors, setBattleThemeColors] = useState<BattleThemeColors>(DEFAULT_BATTLE_THEME_COLORS);
  const [battleThemeDrafts, setBattleThemeDrafts] = useState<BattleThemeColors>(DEFAULT_BATTLE_THEME_COLORS);
  const [starOrbitStyle, setStarOrbitStyle] = useState<StarOrbitStyle>("saturn");
  const [starOrbitSpeed, setStarOrbitSpeed] = useState(1.3);
  const [starPlaneSpeed, setStarPlaneSpeed] = useState(1);
  const [cardWatermarkStyle, setCardWatermarkStyle] = useState<CardWatermarkStyle>("stars");
  const [cardWatermarkOpacity, setCardWatermarkOpacity] = useState(.45);
  const [cardWatermarkSize, setCardWatermarkSize] = useState(100);
  const [cardWatermarkX, setCardWatermarkX] = useState(50);
  const [cardWatermarkY, setCardWatermarkY] = useState(100);
  const [constellationPreviewIndex, setConstellationPreviewIndex] = useState<number | null>(null);
  const [mapMessage, setMapMessage] = useState("");
  const [mapMessageNonce, setMapMessageNonce] = useState(0);
  const [mapWaitNoticeNonce, setMapWaitNoticeNonce] = useState(0);
  const [ownedDecks, setOwnedDecks] = useState<DeckCase[]>(() => [createStarterDeck()]);
  const [activeDeckId, setActiveDeckId] = useState("starter");
  const previousBattleDeckIdRef = useRef<string | null>(null);
  const [pendingBattleStart, setPendingBattleStart] = useState<PendingBattleStart | null>(null);
  const [battleDeckCheckEnabled, setBattleDeckCheckEnabled] = useState(true);
  const [battleDeckPreviewId, setBattleDeckPreviewId] = useState<string | null>(null);
  const [deckSelectorOpen, setDeckSelectorOpen] = useState(false);
  const [deckSelectorClosing, setDeckSelectorClosing] = useState(false);
  const [deckSelectorClosingDeckId, setDeckSelectorClosingDeckId] = useState<string | null>(null);
  const [deckSelectionAttention, setDeckSelectionAttention] = useState(false);
  const [inventoryCards, setInventoryCards] = useState<Card[]>([]);
  const [inventoryConsumables, setInventoryConsumables] = useState<Consumable[]>(() => [
    createConsumable("extractTicket", "starter-extract"),
  ]);
  const inventoryConsumablesRef = useRef<Consumable[]>([]);
  const [roomDrops, setRoomDrops] = useState<Record<string, Card[]>>({});
  const [roomConsumableDrops, setRoomConsumableDrops] = useState<Record<string, Consumable[]>>({});
  const [roomDeckDrops, setRoomDeckDrops] = useState<Record<string, DeckCase[]>>({});
  const [roomShops, setRoomShops] = useState<Record<string, ShopOffer[]>>({});
  const generatedMapRoomKeysRef = useRef<Set<string>>(new Set([mapRoomKey(MAP_START)]));

  useEffect(() => {
    if (debugMode && screen === "battle") {
      document.body.style.backgroundColor = battleThemeColors.outer;
    } else {
      document.body.style.removeProperty("background-color");
    }
    return () => {
      document.body.style.removeProperty("background-color");
    };
  }, [battleThemeColors.outer, debugMode, screen]);
  const [shopOpen, setShopOpen] = useState(false);
  const [blessingOpen, setBlessingOpen] = useState(false);
  const [blessingOffers, setBlessingOffers] = useState<BlessingOfferId[]>([]);
  const [blessingSeenOfferIds, setBlessingSeenOfferIds] = useState<Set<BlessingId>>(() => new Set());
  const [blessings, setBlessings] = useState<BlessingId[]>([]);
  const [blessingRerollCost, setBlessingRerollCost] = useState(5);
  const [oneUpUsed, setOneUpUsed] = useState(false);
  const oneUpUsedRef = useRef(false);
  const [activeShopRoom, setActiveShopRoom] = useState<string | null>(null);
  const [shopMessage, setShopMessage] = useState("필요한 물건을 골라보세요.");
  const [gold, setGold] = useState(0);
  const [battleRewards, setBattleRewards] = useState<Card[]>([]);
  const [battleRewardDecks, setBattleRewardDecks] = useState<DeckCase[]>([]);
  const [battleRewardConsumables, setBattleRewardConsumables] = useState<Consumable[]>([]);
  const [battleRewardGold, setBattleRewardGold] = useState(0);
  const {
    isOpen: deckEditorOpen,
    snapshot: deckEditorSnapshot,
    beginSession: beginDeckEditorSession,
    finishSession: finishDeckEditorSession,
  } = useDeckEditorSession();
  const deckEditorHighRarityInsertionOriginsRef = useRef<Record<number, "inventory" | "floor">>({});
  const [deckEditorDeckId, setDeckEditorDeckId] = useState("");
  const [deckViewerOpen, setDeckViewerOpen] = useState(false);
  const [deckViewerDeckId, setDeckViewerDeckId] = useState("");
  const deckViewerGridRef = useRef<HTMLDivElement | null>(null);
  const cardKeywordPopoverRef = useRef<HTMLElement | null>(null);
  const [pendingRemovedCards, setPendingRemovedCards] = useState<Card[]>([]);
  const [pendingRemovedCardAreas, setPendingRemovedCardAreas] = useState<Record<number, "inventory" | "floor">>({});
  const [deckEditorReleasedCardIds, setDeckEditorReleasedCardIds] = useState<Set<number>>(() => new Set());
  const [pendingRemovalBlinkDim, setPendingRemovalBlinkDim] = useState(false);
  const [consumableDragActive, setConsumableDragActive] = useState(false);
  const [pendingPaintTicketId, setPendingPaintTicketId] = useState<string | null>(null);
  const [pendingCloneTicketId, setPendingCloneTicketId] = useState<string | null>(null);
  const [pendingExtractTicketId, setPendingExtractTicketId] = useState<string | null>(null);
  const [pendingTransformTicketId, setPendingTransformTicketId] = useState<string | null>(null);
  const [armedBombTicketIds, setArmedBombTicketIds] = useState<Set<string>>(() => new Set());
  const [deckEditorMessage, setDeckEditorMessage] = useState("휴식 구역에서는 카드를 바닥으로 추출하고, 일반 구역에서는 제거 예정 상태로 만듭니다.");
  const [openedCardPack, setOpenedCardPack] = useState<Card[] | null>(null);
  const [battleCardView, setBattleCardView] = useState<"deck" | "piles" | "discard" | null>(null);
  const [researchDragPreview, setResearchDragPreview] = useState<{
    card: Card;
    count: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [dyingEnemyIds, setDyingEnemyIds] = useState<Set<string>>(() => new Set());
  const [transformedCardNewIds, setTransformedCardNewIds] = useState<Set<number>>(() => new Set());
  const [deckEditorSort, setDeckEditorSort] = useState<"cost" | "rarity">("rarity");
  const [deckViewerSort, setDeckViewerSort] = useState<"cost" | "rarity">("rarity");
  const [game, setGame] = useState<GameState>(waitingState);
  const battleInteraction = useBattleInteractionState();
  const {
    selectedHandCardId,
    setSelectedHandCardId,
    hoveredHandCardId,
    setHoveredHandCardId,
    dragging,
    setDragging,
    dragOverDropTarget,
    centerDropPointerHover,
    setCenterDropPointerHover,
    pileClearNotice,
    setPileClearNotice,
    centerDropZoneRef,
  } = battleInteraction;

  useLayoutEffect(() => {
    // 의도적인 파생 전투 상태 동기화: 빈 파일 수가 바뀌면 여백의 미 힘을 즉시 반영한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame((current) => {
      const nextBonus = current.deckEditions.includes("whiteSpace")
        ? current.piles.filter((pile) => pile.length === 0).length * 2
        : 0;
      if (current.whiteSpaceStrengthBonus === nextBonus) return current;
      return {
        ...current,
        strength: current.strength - current.whiteSpaceStrengthBonus + nextBonus,
        whiteSpaceStrengthBonus: nextBonus,
      };
    });
  }, [game.piles, game.deckEditions, game.whiteSpaceStrengthBonus]);
  const [telemetry] = useState(() => createTelemetryRecorder());
  const telemetryPreviousGameRef = useRef<GameState | null>(null);
  const [telemetryMessage, setTelemetryMessage] = useState("");
  const [phase, setPhase] = useState<Phase>("drawing");
  const [attackingEnemyId, setAttackingEnemyId] = useState<string | null>(null);
  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);
  const [enemyPopups, setEnemyPopups] = useState<Record<string, DamagePopup>>({});
  const [animatedEnemyHp, setAnimatedEnemyHp] = useState<Record<string, number>>({});
  const enemyPopupKeyRef = useRef(0);
  const nextCardIdRef = useRef(STARTING_DECK_SIZE);
  const battleRewardRegionRef = useRef(1);
  const battleRewardIsBossRef = useRef(false);
  const battleRewardIsOutOfDepthRef = useRef(false);
  const deckPityBattlesRemainingRef = useRef(3);
  const debugGoldClicksRef = useRef<number[]>([]);
  const debugPreviousActiveDeckIdRef = useRef<string | null>(null);
  const nextConsumableIdRef = useRef(1);
  const deckSelectorCloseTimerRef = useRef<number | null>(null);
  const [deckPreviewSuppressed, setDeckPreviewSuppressed] = useState(false);
  const {
    hoveredDeckCard,
    setHoveredDeckCard,
    hoveredCardKeywords,
    hoveredDeckEditionTooltip,
    setHoveredDeckEditionTooltip,
    hoveredBlessingTooltip,
    setHoveredBlessingTooltip,
    hoveredConsumable,
    setHoveredConsumable,
    deckPreviewPosition,
    clearCardKeywordHover,
    clearFloatingTooltips,
    showCardKeywordOnly,
    showDeckCardPreview,
    showConsumablePreview,
    moveDeckCardPreview,
    showDeckEditionTooltip,
    showBlessingTooltip,
  } = useFloatingPreviews({
    deckCardPreviewsSuppressed: deckPreviewSuppressed || dragging !== null,
    consumablePreviewSuppressed: dragging !== null,
    cardKeywordPopoverRef,
  });
  const deckDropChanceRef = useRef(0.25);
  const rareCardDropChanceRef = useRef(0.05);
  const [saveReady, setSaveReady] = useState(false);
  const { saveRunNow, queueRunSave, cancelQueuedSave, updateSaveSnapshot } = useRunSaveLifecycle();

  const activeDeck = ownedDecks.find((deck) => deck.id === activeDeckId) ?? ownedDecks[0];
  const consumableDescription = (consumable: Consumable) => consumable.type === "mapTicket" && blessings.includes("cartographer")
    ? "같은 지역에서 아직 드러나지 않은 특수 지형 4곳을 밝힙니다."
    : consumable.description;
  const deckCards = activeDeck?.cards ?? [];
  const inventoryCapacity = INVENTORY_CAPACITY + (blessings.includes("bag") ? 18 : 0);
  const maxOwnedDecks = debugMode
    ? DEBUG_MAX_OWNED_DECKS
    : MAX_OWNED_DECKS + (blessings.includes("bag") ? 2 : 0);
  const calculatedMaxPlayerHp = debugMode
    ? DEBUG_PLAYER_HP
    : MAX_PLAYER_HP + (blessings.includes("sturdy") ? 20 : 0) + vitalityShrineMaxHpBonus;
  const maxPlayerHp = blessings.includes("forbiddenKnowledge") ? 20 : calculatedMaxPlayerHp;
  useEffect(() => {
    if (runPlayerHp > maxPlayerHp) {
      runPlayerHpRef.current = maxPlayerHp;
      // This state correction must happen immediately when the maximum decreases.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRunPlayerHp(maxPlayerHp);
    } else if (runPlayerHpRef.current > maxPlayerHp) {
      runPlayerHpRef.current = maxPlayerHp;
    }
    if (game.playerHp > maxPlayerHp) {
      setGame((current) => current.playerHp > maxPlayerHp
        ? { ...current, playerHp: maxPlayerHp }
        : current);
    }
  }, [game.playerHp, maxPlayerHp, runPlayerHp]);
  const blessingVisionBonus = (blessings.includes("vision") ? 1 : 0) + (blessings.includes("bioluminescence") ? 2 : 0);
  const mindEyeVisionBonus = mindEyeMovesRemaining > 0 ? 2 : 0;
  const visionHorizontalRadius = MAP_PLAYER_VISION_HORIZONTAL_RADIUS + blessingVisionBonus + mindEyeVisionBonus;
  const visionVerticalRadius = MAP_PLAYER_VISION_VERTICAL_RADIUS + blessingVisionBonus + mindEyeVisionBonus;
  const editingDeck = ownedDecks.find((deck) => deck.id === deckEditorDeckId) ?? activeDeck;

  const ensureTelemetryRun = () => {
    if (hasActiveTelemetryRun(telemetry)) return;
    beginTelemetryRun(telemetry, {
      playerName: playerName.trim() || "이름 없음",
      mapSeed: String(mapSeed),
      startingDecks: ownedDecks.map(telemetryDeckSnapshot),
      activeDeckId,
    });
  };

  const exportTelemetryLog = () => {
    const blob = new Blob([exportTelemetryText(telemetry)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ruinfall-damage-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setTelemetryMessage(`적별 피해 기록을 TXT로 저장했습니다. (탐험 ${telemetry.store.runs.length}개)`);
  };

  useEffect(() => {
    const previous = telemetryPreviousGameRef.current;
    if (previous && screen === "battle" && hasActiveTelemetryRun(telemetry)
      && previous.status === "playing" && game.status !== "playing") {
      finishTelemetryBattle(telemetry, game.status === "won" ? "won" : "lost", game.turn, game.playerHp);
    }
    telemetryPreviousGameRef.current = game;
  }, [game, screen, telemetry]);
  useLayoutEffect(() => {
    if (!deckViewerOpen) return;
    deckViewerGridRef.current?.scrollTo({ top: 0, left: 0 });
  }, [deckViewerDeckId, deckViewerOpen, deckViewerSort]);
  useEffect(() => {
    if (!ownedDecks.some((deck) => deck.id === "starter" && deck.name === "")) return;
    const timer = window.setTimeout(() => setOwnedDecks((current) => current.map((deck) => deck.id === "starter" && deck.name === ""
      ? { ...deck, name: createDeckName() }
      : deck)), 0);
    return () => window.clearTimeout(timer);
  }, [ownedDecks]);
  useEffect(() => {
    inventoryConsumablesRef.current = inventoryConsumables;
  }, [inventoryConsumables]);
  useEffect(() => {
    if (!deckEditorOpen) return;
    const blinkTimer = window.setInterval(() => {
      setPendingRemovalBlinkDim((current) => !current);
    }, 525);
    return () => window.clearInterval(blinkTimer);
  }, [deckEditorOpen]);
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
    const safeRegion = getSafeAreaRegionIndex(position, mapSeed);
    if (baseType === "boss" && safeRegion !== null && defeatedBossRegions.has(safeRegion)) return "empty";
    if (baseType === "shop" && destroyedShopRooms.has(roomKey)) return "empty";
    if (baseType === "shrine" && collapsedShrineRooms.has(roomKey)) return "empty";
    if (baseType === "recoveryShrine" && collapsedRecoveryShrineRooms.has(roomKey)) return "empty";
    if (baseType === "vitalityShrine" && collapsedVitalityShrineRooms.has(roomKey)) return "empty";
    if (baseType === "mindEyeShrine" && collapsedMindEyeShrineRooms.has(roomKey)) return "empty";
    if (baseType === "transformShrine" && collapsedTransformShrineRooms.has(roomKey)) return "empty";
    if (baseType === "combinationShrine" && collapsedCombinationShrineRooms.has(roomKey)) return "empty";
    if (baseType === "treasureChest" && collapsedTreasureChestRooms.has(roomKey)) return "empty";
    if (baseType === "heal" && usedHealRooms.has(roomKey)) return "empty";
    if (baseType === "blessing" && usedBlessingRooms.has(roomKey)) return "empty";
    if (baseType === "rock" && (rockBombHits[roomKey] ?? 0) >= 3) return "empty";
    return baseType;
  };
  const isSafeAreaSealed = (regionIndex: number) => {
    const centerX = safeAreaCenterX(regionIndex, mapSeed);
    const centerY = safeAreaCenterY(regionIndex, mapSeed);
    for (let y = centerY - 2; y <= centerY + 2; y += 1) {
      for (let x = centerX + SAFE_AREA_LAYOUT_MIN_OFFSET_X; x <= centerX + SAFE_AREA_LAYOUT_MAX_OFFSET_X; x += 1) {
        const position = { x, y };
        if (isSafeAreaBoundaryPosition(position, regionIndex, mapSeed)
          && effectiveRoomType(position) !== "rock") {
          return false;
        }
      }
    }
    return true;
  };
  const enterDebugMode = () => {
    if (debugMode) return;
    runPlayerHpRef.current = DEBUG_PLAYER_HP;
    setRunPlayerHp(DEBUG_PLAYER_HP);
    debugPreviousActiveDeckIdRef.current = activeDeck?.id ?? null;
    const { deck, nextCardId } = createDebugAllCardsDeck(nextCardIdRef.current);
    nextCardIdRef.current = nextCardId;
    setOwnedDecks((current) => [
      deck,
      ...current.filter((currentDeck) => currentDeck.id !== DEBUG_ALL_CARDS_DECK_ID),
    ]);
    setActiveDeckId(deck.id);
    setDeckSelectionAttention(true);
    setMapMessage(`디버그 덱 ALL 생성: 모든 카드 ${deck.cards.length}장`);
    setDebugMode(true);
  };
  const exitDebugMode = () => {
    if (!debugMode) return;
    const previousDeckId = debugPreviousActiveDeckIdRef.current;
    const restoredDeck = ownedDecks.find((deck) => deck.id === previousDeckId && deck.id !== DEBUG_ALL_CARDS_DECK_ID)
      ?? ownedDecks.find((deck) => deck.id !== DEBUG_ALL_CARDS_DECK_ID);
    setOwnedDecks((current) => current.filter((deck) => deck.id !== DEBUG_ALL_CARDS_DECK_ID));
    setActiveDeckId(restoredDeck?.id ?? "");
    setDeckSelectionAttention(false);
    setCardPoolStatsOpen(false);
    debugPreviousActiveDeckIdRef.current = null;
    debugGoldClicksRef.current = [];
    setDebugMode(false);
    setMapMessage("디버그 모드를 종료했습니다.");
  };
  const handleGoldDebugClick = () => {
    const now = window.performance.now();
    const recentClicks = [...debugGoldClicksRef.current, now].filter((time) => now - time <= 1200);
    debugGoldClicksRef.current = recentClicks;
    if (recentClicks.length < 5) return;
    debugGoldClicksRef.current = [];
    if (debugMode) exitDebugMode();
    else enterDebugMode();
  };
  const updateActiveDeckCards = (updater: Card[] | ((cards: Card[]) => Card[])) => {
    setOwnedDecks((current) => current.map((deck) => {
      if (deck.id !== activeDeck?.id) return deck;
      const cards = typeof updater === "function" ? updater(deck.cards) : updater;
      return { ...deck, cards };
    }));
  };
  const inventoryItemCount = inventoryCards.length + inventoryConsumables.filter((item) =>
    !blessings.includes("lightTicket") || item.type === "cardPack").length;
  const pendingInventoryCardCount = pendingRemovedCards.filter((card) => pendingRemovedCardAreas[card.id] === "inventory").length;
  const deckEditorInventoryItemCount = inventoryItemCount + pendingInventoryCardCount;
  const deckEditorErrorMessage = /불가능|가득|더 이상|반드시|이하로 줄여야/.test(deckEditorMessage)
    ? deckEditorMessage
    : null;

  const nextConsumable = (type: ConsumableType) => {
    const id = `consumable-${nextConsumableIdRef.current}`;
    nextConsumableIdRef.current += 1;
    return createConsumable(type, id);
  };
  const spawnDebugItemOnFloor = () => {
    if (!debugMode) return;
    const roomKey = mapRoomKey(mapPosition);

    if (debugSpawnSelection === "deck:random") {
      const deck = createRegionDeck(getRegionNumber(mapPosition, mapSeed), nextCardIdRef.current, blessings.includes("deckSize") ? 5 : 0);
      nextCardIdRef.current += deck.cards.length;
      setRoomDeckDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), deck],
      }));
      return;
    }

    if (debugSpawnSelection === "consumable:allTickets") {
      const tickets = CONSUMABLE_TYPES.map((type) => nextConsumable(type));
      setRoomConsumableDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), ...tickets],
      }));
      return;
    }

    if (debugSpawnSelection.startsWith("consumable:")) {
      const type = debugSpawnSelection.slice("consumable:".length) as ConsumableType;
      if (type !== "cardPack" && !CONSUMABLE_TYPES.includes(type as TicketType)) return;
      const consumable = nextConsumable(type);
      setRoomConsumableDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), consumable],
      }));
      return;
    }

    const [, rarity, rawIndex] = debugSpawnSelection.split(":");
    let blueprint: CardBlueprint | undefined;
    if (DEBUG_CARD_RARITIES.some((group) => group.rarity === rarity)) {
      blueprint = ALL_CARD_BLUEPRINTS.filter((card) => card.rarity === rarity)[Number(rawIndex)];
    }

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
  const generateDebugRegionDecksOnFloor = () => {
    if (!debugMode) return;
    const regionNumber = Number(debugDeckRegion);
    const deckCount = Number(debugDeckCount);
    if (![regionNumber, deckCount].every(Number.isFinite)
      || !Number.isInteger(regionNumber)
      || !Number.isInteger(deckCount)
      || regionNumber < 1
      || regionNumber > REGION_COUNT
      || deckCount < 1) {
      setMapMessage("지역·생성 개수를 올바르게 입력하세요.");
      return;
    }

    const decks = Array.from({ length: deckCount }, () => {
      const deck = createRegionDeck(
        regionNumber,
        nextCardIdRef.current,
        blessings.includes("deckSize") ? 5 : 0,
      );
      nextCardIdRef.current += deck.cards.length;
      return deck;
    });
    if (decks.length > 0) {
      const roomKey = mapRoomKey(mapPosition);
      setRoomDeckDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), ...decks],
      }));
    }
    setMapMessage(`디버그 ${regionNumber}지역 덱 ${decks.length}개를 바닥에 생성했습니다.`);
  };
  const updateDeckCards = (deckId: string | undefined, updater: Card[] | ((cards: Card[]) => Card[])) => {
    if (!deckId) return;
    setOwnedDecks((current) => current.map((deck) => {
      if (deck.id !== deckId) return deck;
      const cards = typeof updater === "function" ? updater(deck.cards) : updater;
      return { ...deck, cards };
    }));
  };
  const grantBattleReward = (regionNumber: number) => {
    ensureTelemetryRun();
    const rewardDeck = ownedDecks.find((deck) => deck.id === previousBattleDeckIdRef.current) ?? activeDeck;
    const isEligibleForDeckPity = !battleRewardIsBossRef.current;
    const pityForcesDeck = isEligibleForDeckPity && deckPityBattlesRemainingRef.current === 1;
    const reward = battleRewardIsBossRef.current
      ? createBossBattleReward(
        nextCardIdRef.current,
        blessings.includes("bossSlayer") ? regionNumber + 1 : undefined,
        blessings.includes("deckSize") ? 5 : 0,
      )
      : createBattleReward(
        regionNumber,
        nextCardIdRef.current,
        deckDropChanceRef.current,
        blessings.includes("deckSize") ? 5 : 0,
        rareCardDropChanceRef.current,
        battleRewardIsOutOfDepthRef.current || pityForcesDeck,
      );
    [...reward.cards, ...reward.decks.flatMap((deck) => deck.cards)].forEach((card) => {
      recordTelemetryCardAcquired(telemetry, telemetryCardSnapshot(card), "battle-reward");
    });
    const rewardConsumables = reward.consumableTypes.map((type) => nextConsumable(type));
    const generatedCardCount = reward.cards.length + reward.decks.reduce((total, deck) => total + deck.cards.length, 0);
    nextCardIdRef.current += generatedCardCount;
    if (!battleRewardIsBossRef.current) {
      deckPityBattlesRemainingRef.current = reward.decks.length > 0
        ? 0
        : Math.max(0, deckPityBattlesRemainingRef.current - 1);
      deckDropChanceRef.current = reward.decks.length > 0
        ? 0.25
        : Math.min(1, deckDropChanceRef.current + 0.1);
      rareCardDropChanceRef.current = nextRareCardDropChance(
        rareCardDropChanceRef.current,
        reward.cards,
      );
    }
    const rewardGold = reward.gold * (rewardDeck?.editions.includes("greedy") ? 2 : 1) * (blessings.includes("greed") ? 2 : 1);
    setBattleRewardGold(rewardGold);
    setBattleRewards(reward.cards);
    setBattleRewardDecks(reward.decks);
    setBattleRewardConsumables(rewardConsumables);
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
      grantBattleReward(battleRewardRegionRef.current);
    }
  }, [screen, game.status, battleRewardGold, battleRewards.length, battleRewardDecks.length, battleRewardConsumables.length, mapPosition]);

  const createShopStock = (depth: number): ShopOffer[] => {
    const regionPriceMultiplier = 1.3 ** Math.max(0, depth - 1);
    const variedPrice = (basePrice: number) => Math.floor(basePrice * (0.8 + Math.random() * 0.4) * regionPriceMultiplier);
    const specialBlueprints = [...SPECIAL_CARD_POOL];
    const specialCards = Array.from({ length: 3 }, (_, slot) => {
      const blueprintIndex = Math.floor(Math.random() * specialBlueprints.length);
      const blueprint = specialBlueprints.splice(blueprintIndex, 1)[0];
      const card = { ...blueprint, id: nextCardIdRef.current, revealed: false };
      nextCardIdRef.current += 1;
      return {
        id: `shop-special-${depth}-${slot}-${card.id}`,
        price: variedPrice(50),
        card,
        sold: false,
      };
    });
    const makeRareCardOffer = (slot: number): ShopOffer => {
      const blueprint = RARE_CARD_POOL[Math.floor(Math.random() * RARE_CARD_POOL.length)];
      const card = { ...blueprint, id: nextCardIdRef.current, revealed: false };
      nextCardIdRef.current += 1;
      return {
        id: `shop-card-${depth}-${slot}-${card.id}`,
        price: variedPrice(160),
        card,
        sold: false,
      };
    };
    const extractTicket = nextConsumable("extractTicket");
    const extractPlusTicket = nextConsumable("extractPlusTicket");
    const ticketTypes = CONSUMABLE_TYPES.filter((type) => type !== "extractTicket" && type !== "extractPlusTicket") as TicketType[];
    const randomTickets = Array.from({ length: 2 }, (_, slot) => {
      const typeIndex = Math.floor(Math.random() * ticketTypes.length);
      const type = ticketTypes.splice(typeIndex, 1)[0];
      const consumable = nextConsumable(type);
      return {
        id: `shop-ticket-${depth}-${slot}-${consumable.id}`,
        price: variedPrice(ticketBasePrice(type)),
        consumable,
        sold: false,
      };
    });
    const cardPack = nextConsumable("cardPack");
    return [
      ...specialCards,
      {
        id: `shop-ticket-${depth}-extract-${extractTicket.id}`,
        price: variedPrice(ticketBasePrice("extractTicket")),
        consumable: extractTicket,
        sold: false,
      },
      {
        id: `shop-ticket-${depth}-extract-plus-${extractPlusTicket.id}`,
        price: variedPrice(ticketBasePrice("extractPlusTicket")),
        consumable: extractPlusTicket,
        sold: false,
      },
      ...randomTickets,
      { id: `shop-pack-${depth}-${cardPack.id}`, price: variedPrice(120), consumable: cardPack, sold: false },
      makeRareCardOffer(7),
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
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const buyShopOffer = (offerId: string) => {
    if (!activeShopRoom) return;
    const offer = (roomShops[activeShopRoom] ?? []).find((item) => item.id === offerId);
    if (!offer || offer.sold) return;
    if (gold < offer.price) {
      setShopMessage(`🪙 ${offer.price - gold}이 부족합니다.`);
      return;
    }
    setGold((current) => current - offer.price);
    const inventoryFull = inventoryItemCount >= inventoryCapacity;
    if (offer.card) {
      ensureTelemetryRun();
      recordTelemetryCardAcquired(telemetry, telemetryCardSnapshot(offer.card), "shop");
      if (inventoryFull) setRoomDrops((current) => ({ ...current, [activeShopRoom]: [...(current[activeShopRoom] ?? []), offer.card!] }));
      else setInventoryCards((current) => [...current, offer.card!]);
    }
    if (offer.consumable) {
      ensureTelemetryRun();
      recordTelemetryConsumableAcquired(telemetry, telemetryConsumableSnapshot(offer.consumable), "shop");
      if (inventoryFull) setRoomConsumableDrops((current) => ({ ...current, [activeShopRoom]: [...(current[activeShopRoom] ?? []), offer.consumable!] }));
      else setInventoryConsumables((current) => [...current, offer.consumable!]);
    }
    setRoomShops((current) => ({
      ...current,
      [activeShopRoom]: (current[activeShopRoom] ?? []).map((item) =>
        item.id === offerId ? { ...item, sold: true } : item),
    }));
    setShopMessage(`${offer.card?.name ?? offer.consumable?.name}을(를) 구매했습니다.${inventoryFull ? " 인벤토리가 가득 차 바닥에 놓았습니다." : ""}`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const openCardPack = (packId: string) => {
    const pack = inventoryConsumables.find((item) => item.id === packId && item.type === "cardPack");
    if (!pack) return;
    let rareChance = rareCardDropChanceRef.current;
    const cards = Array.from({ length: 5 }, () => {
      const card = createBattleRewardCard(nextCardIdRef.current, rareChance);
      nextCardIdRef.current += 1;
      rareChance = card.rarity === "rare"
        ? 0.05
        : Math.min(1, rareChance + 0.02);
      return card;
    });
    if (blessings.includes("packInsurance") && !cards.some((card) => card.rarity === "rare")) {
      const last = cards.at(-1)!;
      cards[cards.length - 1] = { ...randomItem(RARE_CARD_POOL), id: last.id, revealed: false };
      rareChance = .05;
    }
    ensureTelemetryRun();
    cards.forEach((card) => recordTelemetryCardAcquired(telemetry, telemetryCardSnapshot(card), "card-pack"));
    rareCardDropChanceRef.current = rareChance;
    const freeSlotsAfterPack = Math.max(0, inventoryCapacity - (inventoryItemCount - 1));
    const inventoryCardsFromPack = cards.slice(0, freeSlotsAfterPack);
    const floorCardsFromPack = cards.slice(freeSlotsAfterPack);
    setInventoryConsumables((current) => current.filter((item) => item.id !== packId));
    setInventoryCards((current) => [...current, ...inventoryCardsFromPack]);
    if (floorCardsFromPack.length > 0) {
      const roomKey = mapRoomKey(mapPosition);
      setRoomDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), ...floorCardsFromPack],
      }));
      setDeckEditorMessage(`인벤토리에 들어가지 못한 카드 ${floorCardsFromPack.length}장을 바닥에 놓았습니다.`);
    }
    setOpenedCardPack(cards);
  };
  const pendingOriginsRef = useRef(new Map<number, DOMRect>());
  const pendingEnemyTokenIdsRef = useRef(new Set<number>());
  const pendingPileTokenSourcesRef = useRef(new Map<number, string>());
  const researchDragImageRef = useRef<HTMLCanvasElement | null>(null);
  const researchDragActiveRef = useRef(false);
  const clearResearchDrag = () => {
    researchDragActiveRef.current = false;
    researchDragImageRef.current?.remove();
    researchDragImageRef.current = null;
    setResearchDragPreview(null);
  };
  const handCardRefs = useRef(new Map<number, HTMLButtonElement>());
  const timersRef = useRef<number[]>([]);
  const mapTravelTimerRef = useRef<number | null>(null);
  const pileScrollRef = useRef<HTMLDivElement | null>(null);

  const later = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
    return timer;
  };

  const captureDrawOrigins = (cards: Card[]) => {
    const drawnIds = new Set(cards.map((card) => card.id));
    const origins = new Map<number, DOMRect>();
    document.querySelectorAll<HTMLElement>("[data-top-card-id]").forEach((element) => {
      const cardId = Number(element.dataset.topCardId);
      if (drawnIds.has(cardId)) origins.set(cardId, element.getBoundingClientRect());
    });
    pendingOriginsRef.current = origins;
    return origins.size;
  };

  const drawCards = () => createDrawCards({
    pendingOriginsRef,
    setPhase,
    setGame,
    nextCardIdRef,
    pendingPileTokenSourcesRef,
    blessings,
    setPileClearNotice,
    later,
    pendingEnemyTokenIdsRef,
    pickRandom,
  })();

  useEffect(() => {
    if (
      screen !== "battle"
      || game.status !== "playing"
      || game.stars < 7
      || !game.hand.some((card) => card.effect === "grimoire")
    ) return;
    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (
          current.status !== "playing"
          || current.stars < 7
          || !current.hand.some((card) => card.effect === "grimoire")
        ) return current;
        const nextPlayerHp = Math.max(0, current.playerHp - 5);
        return {
          ...current,
          stars: 0,
          playerHp: nextPlayerHp,
          status: nextPlayerHp === 0 ? "lost" : current.status,
          message: nextPlayerHp === 0
            ? "마도서의 대가로 쓰러졌습니다."
            : "마도서: ★를 모두 잃고 체력 5 감소",
        };
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [game.hand, game.stars, game.status, screen]);

  const clearBattleTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };

  const clearMapTravel = () => {
    if (mapTravelTimerRef.current !== null) {
      window.clearTimeout(mapTravelTimerRef.current);
      mapTravelTimerRef.current = null;
    }
    stopMapCameraFocus();
    setMapCollisionEnemyIds([]);
    setMapBattleFlash(false);
    setMapTraveling(false);
  };

  const materializeMapContent = (
    positions: readonly MapPosition[],
    seed = mapSeed,
    world: MapEnemyWorld = mapEnemyWorld,
    seenPositions: readonly MapPosition[] = positions,
  ) => {
    const uniquePositions = [...new Map(positions.map((position) => [mapRoomKey(position), position])).values()];
    const freshPositions = uniquePositions.filter((position) => !generatedMapRoomKeysRef.current.has(mapRoomKey(position)));
    const seenRoomKeys = seenPositions.map(mapRoomKey);
    if (seenRoomKeys.length > 0) {
      setSeenRooms((current) => new Set([...current, ...seenRoomKeys]));
    }
    if (freshPositions.length === 0) return world;

    const freshRoomKeys = freshPositions.map(mapRoomKey);
    freshRoomKeys.forEach((roomKey) => generatedMapRoomKeysRef.current.add(roomKey));
    const generatedEnemies = createMapEnemyWorldForPositions(seed, freshPositions);
    const existingEnemyIds = new Set(world.enemies.map((enemy) => enemy.id));
    const nextWorld = {
      ...world,
      enemies: [
        ...world.enemies,
        ...generatedEnemies.enemies.filter((enemy) => !existingEnemyIds.has(enemy.id)),
      ],
    };
    const floorDrops = createMapFloorDropsForPositions(seed, freshPositions);
    if (Object.keys(floorDrops.cards).length > 0) {
      setRoomDrops((current) => {
        const next = { ...current };
        Object.entries(floorDrops.cards).forEach(([roomKey, cards]) => {
          next[roomKey] = [...(next[roomKey] ?? []), ...cards];
        });
        return next;
      });
    }
    if (Object.keys(floorDrops.consumables).length > 0) {
      setRoomConsumableDrops((current) => {
        const next = { ...current };
        Object.entries(floorDrops.consumables).forEach(([roomKey, consumables]) => {
          next[roomKey] = [...(next[roomKey] ?? []), ...consumables];
        });
        return next;
      });
    }
    return nextWorld;
  };

  const materializeVisibleMapContent = (
    position: MapPosition,
    seed = mapSeed,
    world: MapEnemyWorld = mapEnemyWorld,
    horizontalRadius = visionHorizontalRadius,
    verticalRadius = visionVerticalRadius,
  ) => {
    const visibleKeys = visibleMapRoomKeys(position, seed, horizontalRadius, verticalRadius);
    const visiblePositions = [...visibleKeys].map(parseMapRoomKey);
    return materializeMapContent(
      [...visiblePositions, ...positionsInSquare(position, 5)],
      seed,
      world,
      visiblePositions,
    );
  };

  const rememberPlayerVision = (
    position: MapPosition,
    seed = mapSeed,
    enemies = mapEnemyWorld.enemies,
    previousEnemies: typeof mapEnemyWorld.enemies = [],
    baseSeenRooms?: ReadonlySet<string> | null,
  ) => {
    const blessingBonus = (blessings.includes("vision") ? 1 : 0) + (blessings.includes("bioluminescence") ? 2 : 0);
    const mindEyeBonus = mindEyeMovesRemainingRef.current > 0 ? 2 : 0;
    const horizontalRadius = MAP_PLAYER_VISION_HORIZONTAL_RADIUS + blessingBonus + mindEyeBonus;
    const verticalRadius = MAP_PLAYER_VISION_VERTICAL_RADIUS + blessingBonus + mindEyeBonus;
    const visibleKeys = visibleMapRoomKeys(position, seed, horizontalRadius, verticalRadius);
    setSeenRooms((current) => new Set([...(baseSeenRooms ?? current), ...visibleKeys]));
    setMapEnemyCellMemory((current) => updateEnemyCellMemory(current, enemies, visibleKeys, previousEnemies));
  };

  const showEnemyPopup = (enemyId: string, text: string, kind: "damage" | "buff" = "damage") => {
    enemyPopupKeyRef.current += 1;
    const popup = { key: `${enemyId}-${enemyPopupKeyRef.current}`, text, kind };
    setEnemyPopups((current) => ({ ...current, [enemyId]: popup }));
    later(() => setEnemyPopups((current) => {
      if (current[enemyId]?.key !== popup.key) return current;
      const { [enemyId]: _, ...remaining } = current;
      return remaining;
    }), 1150);
  };

  const startBattleNow = (
    encounters: BattleEncounter[],
    playerHp: number,
    battleDeckId: string,
  ) => {
    const battleDeck = ownedDecks.find((deck) => deck.id === battleDeckId) ?? activeDeck;
    ensureTelemetryRun();
    previousBattleDeckIdRef.current = battleDeck?.id ?? null;
    setPendingBattleStart(null);
    setBattleDeckPreviewId(null);
    battleRewardRegionRef.current = Math.max(
      1,
      ...encounters.map((encounter) => getEncounterRegionNumber(encounter.encounterIndex)),
    );
    clearBattleTimers();
    setPileClearNotice(false);
    clearMapTravel();
    finishDeckEditorSession();
    setDeckViewerOpen(false);
    setDeckSelectorOpen(false);
    setDragging(null);
    setBattleCardView(null);
    setSelectedHandCardId(null);
    setDyingEnemyIds(new Set());
    setAnimatedEnemyHp({});
    setHoveredDeckCard(null);
    clearCardKeywordHover();
    setAttackingEnemyId(null);
    setDamagePopup(null);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    pendingEnemyTokenIdsRef.current.clear();
    pendingPileTokenSourcesRef.current.clear();
    const godsLamentApplies = godsLamentChargesRef.current > 0;
    const remainingGodsLamentCharges = Math.max(
      0,
      godsLamentChargesRef.current - (godsLamentApplies ? 1 : 0),
    );
    const battleEnemies = encounters.flatMap((encounter) =>
      createSewerEncounterByIndex(encounter.encounterIndex).map((enemy) => {
        const currentHp = Math.max(0, enemy.hp - (encounter.damageTaken ?? 0));
        return {
          ...enemy,
          isBoss: encounter.isBoss,
          hp: godsLamentApplies ? Math.floor(currentHp * 0.7) : currentHp,
          strength: blessings.includes("absorption") ? enemy.strength - 1 : enemy.strength,
        };
      }));
    godsLamentChargesRef.current = remainingGodsLamentCharges;
    setGodsLamentCharges(remainingGodsLamentCharges);
    const absorptionStrength = blessings.includes("absorption")
      ? battleEnemies.filter((enemy) => enemy.hp > 0).length
      : 0;
    if (!battleDeck) {
      const noDeckGame = {
        ...dealtState(0, [], battleEnemies.map(applyPlayerTurnStart)),
        playerHp: 0,
        status: "lost" as const,
        message: "사용할 덱이 없어 쓰러졌습니다.",
      };
      telemetryPreviousGameRef.current = noDeckGame;
      setPhase("playing");
      setGame(noDeckGame);
      setScreen("battle");
      return;
    }
    const wolfTalismanCount = battleDeck.cards.filter((card) => card.effect === "wolfTalisman").length;
    const turtleTalismanCount = battleDeck.cards.filter((card) => card.effect === "turtleTalisman").length;
    const dealtGame = dealtState(
      playerHp,
      battleDeck.cards,
      battleEnemies.map(applyPlayerTurnStart),
      battleDeck.editions,
      blessings.includes("clairvoyance") ? .25 : 0,
    );
    const highlanderActive = blessings.includes("highlander") && hasUniqueCardEffects(battleDeck.cards);
    const deckHighlanderActive = battleDeck.editions.includes("deckHighlander")
      && battleDeck.cards.length >= battleDeck.capacity
      && hasUniqueCardEffects(battleDeck.cards);
    const startingResistance = !blessings.includes("glassCannon") && battleDeck.editions.includes("resistance") ? 1 : 0;
    const nextGame = {
      ...dealtGame,
      hand: blessings.includes("ninja") && encounters.some((encounter) => encounter.awareness === "sleeping")
        ? [...dealtGame.hand, { ...createAdrenalineCard(), id: nextCardIdRef.current++ }]
        : dealtGame.hand,
      strength: dealtGame.strength
        + (blessings.includes("swordShield") ? 1 : 0)
        + (battleDeck.editions.includes("giant") ? 3 : 0)
        + wolfTalismanCount
        + absorptionStrength,
      agility: dealtGame.agility
        + (blessings.includes("swordShield") ? 1 : 0)
        + (battleDeck.editions.includes("giant") ? 3 : 0)
        + turtleTalismanCount,
      playerPhysicalResistance: dealtGame.playerPhysicalResistance + startingResistance,
      playerMagicResistance: dealtGame.playerMagicResistance + startingResistance,
      invulnerable: battleDeck.editions.includes("invincible"),
      stars: dealtGame.stars + (blessings.includes("binaryStars") ? 2 : 0) + (highlanderActive ? 1 : 0),
      energy: dealtGame.energy
        + (blessings.includes("glassCannon") ? 1 : 0)
        + (deckHighlanderActive ? 1 : 0),
      playerPhysicalBlock: dealtGame.playerPhysicalBlock,
      playerThorns: blessings.includes("thornCoat") ? 5 : 0,
      highlanderActive,
      deckHighlanderActive,
      clairvoyanceActive: blessings.includes("clairvoyance"),
    };
    const goblin = battleEnemies.find((enemy) => enemy.variant === "goblin");
    const goblinRelic = nextGame.piles[0]?.find((card) => card.effect === "relic" && card.enemyToken);
    if (goblin && goblinRelic) pendingPileTokenSourcesRef.current.set(goblinRelic.id, goblin.id);
    const defeatedByBomb = battleEnemies.every((enemy) => enemy.hp === 0);
    const battleStartState = defeatedByBomb
      ? { ...nextGame, status: "won" as const, message: "폭발 피해로 모든 적이 쓰러졌습니다." }
      : nextGame;
    beginTelemetryBattle(telemetry, {
      region: battleRewardRegionRef.current,
      deck: telemetryDeckSnapshot(battleDeck),
      enemies: battleEnemies.map(telemetryEnemySnapshot),
      startingPlayerHp: playerHp,
    });
    if (defeatedByBomb) finishTelemetryBattle(telemetry, "won", battleStartState.turn, battleStartState.playerHp);
    telemetryPreviousGameRef.current = battleStartState;
    setPhase(defeatedByBomb ? "playing" : "drawing");
    setGame(battleStartState);
    setScreen("battle");
    if (defeatedByBomb) grantBattleReward(battleRewardRegionRef.current);
    else later(drawCards, 360);
  };

  const startBattle = (
    encounters: BattleEncounter[],
    playerHp = runPlayerHp,
  ) => {
    battleRewardIsBossRef.current = encounters.some((encounter) => encounter.isBoss === true);
    battleRewardIsOutOfDepthRef.current = encounters.some((encounter) =>
      encounter.isBoss !== true && isHigherRegionMapEnemy(encounter.encounterIndex, mapPosition, mapSeed));
    if (battleDeckCheckEnabled && ownedDecks.length >= 2) {
      setDeckSelectionAttention(true);
      setPendingBattleStart({ encounters, playerHp });
      setBattleDeckPreviewId(activeDeckId);
      return;
    }
    startBattleNow(encounters, playerHp, activeDeckId);
  };

  const confirmBattleDeck = (battleDeckId: string) => {
    if (!pendingBattleStart) return;
    const battleDeck = ownedDecks.find((deck) => deck.id === battleDeckId);
    if (!battleDeck) return;
    setActiveDeckId(battleDeckId);
    startBattleNow(pendingBattleStart.encounters, pendingBattleStart.playerHp, battleDeckId);
  };

  useEffect(() => {
    const seedTimer = window.setTimeout(() => {
      const nextSeed = createRandomMapSeed();
      const initialVisibleKeys = visibleMapRoomKeys(MAP_START, nextSeed);
      const initialVisiblePositions = [...initialVisibleKeys].map(parseMapRoomKey);
      generatedMapRoomKeysRef.current = new Set();
      const initialWorld = materializeMapContent(
        [...initialVisiblePositions, ...positionsInSquare(MAP_START, 5)],
        nextSeed,
        { enemies: [] },
        initialVisiblePositions,
      );
      setMapSeed(nextSeed);
      setMapEnemyWorld(initialWorld);
      setMapEnemyCellMemory({});
      setSeenRooms(initialVisibleKeys);
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

  const activateRoomFeature = (position: MapPosition) => {
    void position;
  };

  const rollBlessingOffers = (owned = blessings, excluded: readonly BlessingId[] = []) =>
    createBlessingOffers(owned, 3, Math.random, excluded);
  const grantConsumables = (
    type: ConsumableType,
    count: number,
    ticketsAreFree = blessings.includes("lightTicket"),
    source: TelemetryAcquisitionSource = "other",
  ) => {
    const items = Array.from({ length: count }, () => nextConsumable(type));
    ensureTelemetryRun();
    items.forEach((item) => recordTelemetryConsumableAcquired(
      telemetry,
      telemetryConsumableSnapshot(item),
      source,
    ));
    const usedSlots = inventoryCards.length + inventoryConsumablesRef.current.filter((item) =>
      !ticketsAreFree || item.type === "cardPack").length;
    const inventoryCount = ticketsAreFree && type !== "cardPack"
      ? items.length
      : Math.min(items.length, Math.max(0, inventoryCapacity - usedSlots));
    const inventoryItems = items.slice(0, inventoryCount);
    const floorItems = items.slice(inventoryCount);
    if (inventoryItems.length > 0) {
      const nextInventory = [...inventoryConsumablesRef.current, ...inventoryItems];
      inventoryConsumablesRef.current = nextInventory;
      setInventoryConsumables(nextInventory);
    }
    if (floorItems.length > 0) {
      const roomKey = mapRoomKey(mapPosition);
      setRoomConsumableDrops((current) => ({ ...current, [roomKey]: [...(current[roomKey] ?? []), ...floorItems] }));
    }
  };
  const applyAcquiredBlessing = (blessing: BlessingId, acquiredTogether: readonly BlessingId[] = []) => {
    if (blessing === "sturdy") {
      const nextHp = blessings.includes("forbiddenKnowledge") || acquiredTogether.includes("forbiddenKnowledge")
        ? Math.min(20, runPlayerHpRef.current)
        : runPlayerHpRef.current + 20;
      runPlayerHpRef.current = nextHp;
      setRunPlayerHp(nextHp);
    }
    if (blessing === "forbiddenKnowledge") {
      runPlayerHpRef.current = Math.min(20, runPlayerHpRef.current);
      setRunPlayerHp((current) => Math.min(20, current));
    }
    if (blessing === "vision" || blessing === "bioluminescence") {
      const allOwned = new Set([...blessings, ...acquiredTogether, blessing]);
      const bonus = (allOwned.has("vision") ? 1 : 0) + (allOwned.has("bioluminescence") ? 2 : 0);
      const revealedWorld = materializeMapContent([...visibleMapRoomKeys(
        mapPosition, mapSeed,
        MAP_PLAYER_VISION_HORIZONTAL_RADIUS + bonus,
        MAP_PLAYER_VISION_VERTICAL_RADIUS + bonus,
      )].map(parseMapRoomKey), mapSeed, mapEnemyWorld);
      setMapEnemyWorld(revealedWorld);
    }
    if (blessing === "deckSize") setOwnedDecks((current) => current.map((deck) => ({ ...deck, capacity: deck.capacity + 5 })));
    if (blessing === "oparts") {
      const currentRegion = getRegionNumber(mapPosition, mapSeed);
      const futureDeck = createRegionDeck(
        currentRegion + 2,
        nextCardIdRef.current,
        blessings.includes("deckSize") || acquiredTogether.includes("deckSize") ? 5 : 0,
      );
      nextCardIdRef.current += futureDeck.cards.length;
      ensureTelemetryRun();
      recordTelemetryDeckAcquired(telemetry, telemetryDeckSnapshot(futureDeck), "blessing");
      const roomKey = mapRoomKey(mapPosition);
      setRoomDeckDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), futureDeck],
      }));
      setMapMessage(`오파츠의 힘으로 ${currentRegion + 2}지역 덱이 바닥에 나타났습니다.`);
    }
    const ticketsAreFree = blessings.includes("lightTicket") || acquiredTogether.includes("lightTicket");
    if (blessing === "cartographer") grantConsumables("mapTicket", 2, ticketsAreFree, "blessing");
    if (blessing === "bombardier") grantConsumables("bombTicket", 8, ticketsAreFree, "blessing");
    if (blessing === "transformer") grantConsumables("transformTicket", 4, ticketsAreFree, "blessing");
    if (blessing === "mirror") grantConsumables("cloneTicket", 2, ticketsAreFree, "blessing");
    if (blessing === "goldRush") {
      ensureTelemetryRun();
      recordTelemetryGoldAcquired(telemetry, 300, "blessing");
      setGold((current) => current + 300);
    }
  };
  const openBlessings = () => {
    if (blessingOffers.length === 0) {
      const next = rollBlessingOffers();
      setBlessingOffers(next);
      setBlessingSeenOfferIds(new Set(next.filter((id): id is BlessingId => id !== "empty")));
    }
    setBlessingOpen(true);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };
  const chooseBlessing = (blessing: BlessingOfferId) => {
    if (!blessingOffers.includes(blessing)) return;
    if (blessing !== "empty" && blessings.includes(blessing)) return;
    if (blessing !== "empty") {
      const acquired: BlessingId[] = [blessing];
      if (blessing === "gambling") {
        acquired.push(...rollGamblingBlessings([...blessings, blessing]).filter((id): id is BlessingId => id !== "empty"));
      }
      setBlessings((current) => [...current, ...acquired.filter((id) => !current.includes(id))]);
      acquired.forEach((id) => applyAcquiredBlessing(id, acquired));
    }
    setUsedBlessingRooms((current) => new Set(current).add(mapRoomKey(mapPosition)));
    setBlessingOffers([]);
    setBlessingSeenOfferIds(new Set());
    setBlessingOpen(false);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };
  const rerollBlessings = () => {
    if (runPlayerHpRef.current < blessingRerollCost) return;
    const lethal = resolveLethalDamage(
      runPlayerHpRef.current,
      blessingRerollCost,
      maxPlayerHp,
      blessings.includes("oneUp") && !oneUpUsedRef.current,
    );
    runPlayerHpRef.current = lethal.hp;
    setRunPlayerHp(lethal.hp);
    if (lethal.usedOneUp) {
      oneUpUsedRef.current = true;
      setOneUpUsed(true);
    }
    if (lethal.hp === 0) {
      finishTelemetryRun(telemetry, "lost");
      setBlessingOpen(false);
      setGame({ ...waitingState(0, []), status: "lost", message: "축복 리롤의 대가로 쓰러졌습니다." });
      setPhase("playing");
      setScreen("battle");
      return;
    }
    setBlessingRerollCost((current) => current + 2);
    const nextOffers = rollBlessingOffers(blessings, [...blessingSeenOfferIds]);
    setBlessingOffers(nextOffers);
    setBlessingSeenOfferIds((current) => new Set([
      ...current,
      ...nextOffers.filter((id): id is BlessingId => id !== "empty"),
    ]));
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };
  const consumeMindEyeMove = () => {
    setMindEyeMovesRemaining((current) => {
      const next = Math.max(0, current - 1);
      mindEyeMovesRemainingRef.current = next;
      return next;
    });
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
          ticketId: consumable.id,
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
    if (blessings.includes("healingMileage")) {
      const nextHp = Math.min(maxPlayerHp, runPlayerHpRef.current + explosions.length * 2);
      runPlayerHpRef.current = nextHp;
      setRunPlayerHp(nextHp);
    }
    if (blessings.includes("oneMore")) {
      const retained = explosions.filter(() => shouldPreserveTicket(true));
      if (retained.length > 0) {
        setRoomConsumableDrops((current) => {
          const next = { ...current };
          retained.forEach((bomb) => {
            const roomKey = mapRoomKey(bomb.position);
            const ticket = createConsumable("bombTicket", bomb.ticketId ?? `bomb-retained-${nextConsumableIdRef.current++}`);
            next[roomKey] = [...(next[roomKey] ?? []), ticket];
          });
          return next;
        });
      }
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
    if (playerHitCount > 0 && !blessings.includes("bombardier")) {
      const life = resolveLethalDamage(runPlayerHpRef.current, 20 * playerHitCount, maxPlayerHp,
        blessings.includes("oneUp") && !oneUpUsedRef.current);
      const nextHp = life.hp;
      if (life.usedOneUp) {
        oneUpUsedRef.current = true;
        setOneUpUsed(true);
      }
      runPlayerHpRef.current = nextHp;
      setRunPlayerHp(nextHp);
      playerDefeated = nextHp === 0;
      if (playerDefeated) {
        finishTelemetryRun(telemetry, "lost");
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
      const destination = safeAreaEntry(regionIndex, mapSeed);
      const revealedWorld = materializeVisibleMapContent(destination, mapSeed, mapEnemyWorld);
      const nextWorld = clearMapEnemiesNear(revealedWorld, destination);
      setSafeAreaEntrySeenRooms(new Set(seenRooms));
      godsLamentChargesRef.current = 0;
      setGodsLamentCharges(0);
      setMapPosition(destination);
      rememberPlayerVision(destination, mapSeed, nextWorld.enemies, revealedWorld.enemies);
      setMapEnemyWorld(nextWorld);
      focusMapOn(destination);
      return;
    }
    if (roomType !== "safePortal") return;
    const regionIndex = getSafeAreaRegionIndex(mapPosition, mapSeed);
    if (regionIndex === null) return;
    if (regionIndex >= REGION_COUNT - 1) return;
    const destination = nextRegionEntry(regionIndex);
    const revealedWorld = materializeVisibleMapContent(destination, mapSeed, mapEnemyWorld);
    const nextWorld = clearMapEnemiesNear(revealedWorld, destination);
    const discardSafeAreaMemory = safeAreaEntrySeenRooms !== null && isSafeAreaSealed(regionIndex);
    const baseSeenRooms = discardSafeAreaMemory ? safeAreaEntrySeenRooms : null;
    godsLamentChargesRef.current = 3;
    setGodsLamentCharges(3);
    setMapPosition(destination);
    rememberPlayerVision(destination, mapSeed, nextWorld.enemies, revealedWorld.enemies, baseSeenRooms);
    setSafeAreaEntrySeenRooms(null);
    setMapEnemyWorld(nextWorld);
    focusMapOn(destination);
  };

  const resolveMapStep = (
    currentPosition: MapPosition,
    nextPosition: MapPosition,
    world: MapEnemyWorld,
  ) => {
    const result = resolveMapTurnRules({
      currentPosition,
      nextPosition,
      world,
      isWalkable: (position) => isWalkableRoom(effectiveRoomType(position))
        && !isSafeAreaPosition(position, mapSeed),
      detectionMultiplier: (blessings.includes("lightStep") ? 0.5 : 1)
        * (blessings.includes("bioluminescence") ? 1.5 : 1),
      movementBounds: {
        minX: Math.max(DUNGEON_MIN_X, nextPosition.x - MAP_ENEMY_DISTANCE_FIELD_RADIUS),
        maxX: Math.min(DUNGEON_MAX_X, nextPosition.x + MAP_ENEMY_DISTANCE_FIELD_RADIUS),
        minY: Math.max(0, nextPosition.y - MAP_ENEMY_DISTANCE_FIELD_RADIUS),
        maxY: Math.min(MAP_ROWS - 1, nextPosition.y + MAP_ENEMY_DISTANCE_FIELD_RADIUS),
      },
      detectionDistanceReduction: darkTicketTurnsRemainingRef.current > 0 ? 1 : 0,
    });
    setDarkTicketTurnsRemaining((current) => {
      const next = Math.max(0, current - 1);
      darkTicketTurnsRemainingRef.current = next;
      return next;
    });
    return result;
  };

  const beginMapEnemyBattle = (
    enemies: MapBattleEnemy[],
    roomKey: string,
  ) => {
    const [firstEnemy, ...remainingEnemies] = enemies;
    if (!firstEnemy) return;
    mapBattleQueueRef.current = remainingEnemies;
    setActiveMapEnemyIds(enemies.map((enemy) => enemy.id));
    setActiveBattleRoom(roomKey);
    startBattle([firstEnemy], runPlayerHpRef.current);
  };

  const useCurrentHeal = () => {
    if (effectiveRoomType(mapPosition) !== "heal") return;
    const roomKey = mapRoomKey(mapPosition);
    runPlayerHpRef.current = maxPlayerHp;
    setRunPlayerHp(maxPlayerHp);
    setUsedHealRooms((current) => new Set(current).add(roomKey));
  };

  const applyShrinePilgrimBonus = () => {
    if (!blessings.includes("shrinePilgrim")) return;
    if (!blessings.includes("forbiddenKnowledge")) {
      setVitalityShrineMaxHpBonus((current) => current + 2);
    }
    const nextMaxHp = blessings.includes("forbiddenKnowledge") ? 20 : maxPlayerHp + 2;
    const nextHp = Math.min(nextMaxHp, runPlayerHpRef.current + 2);
    runPlayerHpRef.current = nextHp;
    setRunPlayerHp(nextHp);
  };

  const useCurrentRecoveryShrine = () => {
    if (effectiveRoomType(mapPosition) !== "recoveryShrine") return;
    const roomKey = mapRoomKey(mapPosition);
    const healAmount = blessings.includes("forbiddenKnowledge") ? 0 : Math.floor(maxPlayerHp * 0.3);
    const previousHp = runPlayerHpRef.current;
    const nextHp = Math.min(maxPlayerHp, previousHp + healAmount);
    runPlayerHpRef.current = nextHp;
    setRunPlayerHp(nextHp);
    applyShrinePilgrimBonus();
    const preserved = shouldPreserveTicket(blessings.includes("archaeologist"));
    if (!preserved) setCollapsedRecoveryShrineRooms((current) => new Set(current).add(roomKey));
    showMapMessage(`체력을 ${nextHp - previousHp} 회복했습니다. 회복의 성소가 ${preserved ? "보존되었습니다." : "붕괴했습니다."}`);
    queueRunSave();
  };

  const useCurrentVitalityShrine = () => {
    if (effectiveRoomType(mapPosition) !== "vitalityShrine") return;
    const roomKey = mapRoomKey(mapPosition);
    setVitalityShrineMaxHpBonus((current) => current + 5);
    applyShrinePilgrimBonus();
    const preserved = shouldPreserveTicket(blessings.includes("archaeologist"));
    if (!preserved) setCollapsedVitalityShrineRooms((current) => new Set(current).add(roomKey));
    showMapMessage(`최대 체력이 5 증가했습니다. 현재 체력은 변하지 않습니다. 건강의 성소가 ${preserved ? "보존되었습니다." : "붕괴했습니다."}`);
    queueRunSave();
  };

  const activateMindEye = () => {
    setMindEyeMovesRemaining((current) => {
      const next = current + 20;
      mindEyeMovesRemainingRef.current = next;
      return next;
    });
    const revealedWorld = materializeMapContent([...visibleMapRoomKeys(
      mapPosition, mapSeed,
      MAP_PLAYER_VISION_HORIZONTAL_RADIUS + blessingVisionBonus + 2,
      MAP_PLAYER_VISION_VERTICAL_RADIUS + blessingVisionBonus + 2,
    )].map(parseMapRoomKey), mapSeed, mapEnemyWorld);
    setMapEnemyWorld(revealedWorld);
  };

  const useCurrentMindEyeShrine = () => {
    if (effectiveRoomType(mapPosition) !== "mindEyeShrine") return;
    const roomKey = mapRoomKey(mapPosition);
    activateMindEye();
    applyShrinePilgrimBonus();
    const preserved = shouldPreserveTicket(blessings.includes("archaeologist"));
    if (!preserved) setCollapsedMindEyeShrineRooms((current) => new Set(current).add(roomKey));
    showMapMessage(`심안: 20번 이동 동안 시야 거리 +2를 얻었습니다. 심안의 성소가 ${preserved ? "보존되었습니다." : "붕괴했습니다."}`);
    queueRunSave();
  };

  const openTransformShrine = () => {
    if (effectiveRoomType(mapPosition) !== "transformShrine") return;
    setTransformShrineOpen(true);
  };

  const transformCardsAtShrine = (selectedCardIds: number[]): ShrineCardConversionResult | null => {
    if (effectiveRoomType(mapPosition) !== "transformShrine") return null;
    const selectedCards = inventoryCards.filter((card) => selectedCardIds.includes(card.id));
    if (selectedCards.length !== 2) return null;
    const transformedCards = selectedCards.map((card) => transformedCard(card));
    if (transformedCards.some((card) => !card)) {
      setMapMessage("전설 카드는 변환할 수 없습니다.");
      return null;
    }
    const convertedCards = transformedCards.map((card) => card!);
    const transformedById = new Map(selectedCards.map((card, index) => [card.id, convertedCards[index]]));
    setInventoryCards((current) => current.map((card) => transformedById.get(card.id) ?? card));
    const roomKey = mapRoomKey(mapPosition);
    applyShrinePilgrimBonus();
    const preserved = shouldPreserveTicket(blessings.includes("archaeologist"));
    const collapsed = !preserved;
    if (collapsed) setCollapsedTransformShrineRooms((current) => new Set(current).add(roomKey));
    setMapMessage(`카드 2장을 변환했습니다. 변환의 성소가 ${preserved ? "보존되었습니다." : "붕괴했습니다."}`);
    queueRunSave();
    return { before: selectedCards, after: convertedCards, collapsed };
  };

  const openCombinationShrine = () => {
    if (effectiveRoomType(mapPosition) !== "combinationShrine") return;
    setCombinationShrineOpen(true);
  };

  const combineCardsAtShrine = (selectedCardIds: number[]): ShrineCardConversionResult | null => {
    if (effectiveRoomType(mapPosition) !== "combinationShrine") return null;
    const selectedCards = inventoryCards.filter((card) => selectedCardIds.includes(card.id));
    if (selectedCards.length !== 5 || selectedCards.some((card) => card.rarity !== "special")) return null;
    const selectedIds = new Set(selectedCards.map((card) => card.id));
    const remainingCards = inventoryCards.filter((card) => !selectedIds.has(card.id));
    const rareCard: Card = {
      ...randomItem(RARE_CARD_POOL),
      id: nextCardIdRef.current,
      revealed: false,
    };
    nextCardIdRef.current += 1;
    const usedSlots = remainingCards.length + inventoryConsumablesRef.current.filter((item) =>
      !blessings.includes("lightTicket") || item.type === "cardPack").length;
    const roomKey = mapRoomKey(mapPosition);
    applyShrinePilgrimBonus();
    const destination = usedSlots < inventoryCapacity ? "inventory" : "floor";
    if (destination === "inventory") {
      setInventoryCards([...remainingCards, rareCard]);
    } else {
      setInventoryCards(remainingCards);
      setRoomDrops((current) => ({
        ...current,
        [roomKey]: [...(current[roomKey] ?? []), rareCard],
      }));
    }
    const preserved = shouldPreserveTicket(blessings.includes("archaeologist"));
    const collapsed = !preserved && randomGameRoll() < 0.5;
    if (collapsed) setCollapsedCombinationShrineRooms((current) => new Set(current).add(roomKey));
    setMapMessage(`특별 카드 5장을 ${rareCard.name}(으)로 조합했습니다.${destination === "floor" ? " 인벤토리가 가득 차 바닥에 놓았습니다." : ""} 조합의 성소는 ${collapsed ? "붕괴했습니다." : "보존되었습니다."}`);
    queueRunSave();
    return { before: selectedCards, after: [rareCard], collapsed, destination };
  };

  const raiseNearbyEnemiesBySound = (center: MapPosition) => {
    setMapEnemyWorld((current) => ({
      ...current,
      enemies: current.enemies.map((enemy) => {
        if (enemy.isBoss || chebyshevDistance(enemy.position, center) > 5) return enemy;
        return {
          ...enemy,
          awareness: enemy.awareness === "sleeping" ? "awake" : "alerted",
        };
      }),
    }));
  };

  const openTreasureChest = () => {
    if (effectiveRoomType(mapPosition) !== "treasureChest") return;
    const roomKey = mapRoomKey(mapPosition);
    const regionNumber = getRegionNumber(mapPosition, mapSeed);
    const rewardCards: Card[] = [];
    const rewardConsumables: Consumable[] = [];
    const rewardDecks: DeckCase[] = [];
    let remainingRolls = 3;
    let rolls = 0;
    let bonusRolls = 0;
    while (remainingRolls > 0) {
      remainingRolls -= 1;
      rolls += 1;
      const roll = randomGameRoll();
      if (roll < 0.2) {
        const deck = createRegionDeck(regionNumber, nextCardIdRef.current, blessings.includes("deckSize") ? 5 : 0);
        nextCardIdRef.current += deck.cards.length;
        rewardDecks.push(deck);
      } else if (roll < 0.4) {
        rewardCards.push({ ...randomItem(SPECIAL_CARD_POOL), id: nextCardIdRef.current, revealed: false });
        nextCardIdRef.current += 1;
      } else if (roll < 0.6) {
        rewardCards.push({ ...randomItem(RARE_CARD_POOL), id: nextCardIdRef.current, revealed: false });
        nextCardIdRef.current += 1;
      } else if (roll < 0.9) {
        rewardConsumables.push(nextConsumable(randomItem(TICKET_TYPES)));
      } else if (roll < 0.99) {
        remainingRolls += 2;
        bonusRolls += 2;
      } else {
        remainingRolls += 5;
        bonusRolls += 5;
      }
    }
    ensureTelemetryRun();
    rewardCards.forEach((card) => recordTelemetryCardAcquired(
      telemetry,
      telemetryCardSnapshot(card),
      "treasure-chest",
    ));
    rewardConsumables.forEach((consumable) => recordTelemetryConsumableAcquired(
      telemetry,
      telemetryConsumableSnapshot(consumable),
      "treasure-chest",
    ));
    rewardDecks.forEach((deck) => recordTelemetryDeckAcquired(
      telemetry,
      telemetryDeckSnapshot(deck),
      "treasure-chest",
    ));
    if (rewardCards.length > 0) setRoomDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), ...rewardCards],
    }));
    if (rewardConsumables.length > 0) setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), ...rewardConsumables],
    }));
    if (rewardDecks.length > 0) setRoomDeckDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), ...rewardDecks],
    }));
    setCollapsedTreasureChestRooms((current) => new Set(current).add(roomKey));
    setTreasureChestReward({
      cards: rewardCards,
      consumables: rewardConsumables,
      decks: rewardDecks,
      rolls,
      bonusRolls,
    });
    raiseNearbyEnemiesBySound(mapPosition);
    setMapMessage("");
    queueRunSave();
  };

  const openShrine = () => {
    if (effectiveRoomType(mapPosition) !== "shrine") return;
    setShrineOpen(true);
  };

  const extractCardsAtShrine = (deckId: string, cardIds: number[]) => {
    if (effectiveRoomType(mapPosition) !== "shrine") return null;
    const sourceDeck = ownedDecks.find((deck) => deck.id === deckId);
    if (!sourceDeck) return null;
    const selectedIds = new Set(cardIds);
    const selectedCards = sourceDeck.cards.filter((card) => selectedIds.has(card.id));
    if (selectedCards.length === 0 || selectedCards.some((card) => card.rarity === "rare")) return null;
    const roomKey = mapRoomKey(mapPosition);
    const extractedIds = new Set(selectedCards.map((card) => card.id));
    setOwnedDecks((current) => current.map((deck) => deck.id === sourceDeck.id
      ? { ...deck, cards: deck.cards.filter((item) => !extractedIds.has(item.id)) }
      : deck));
    setRoomDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), ...selectedCards],
    }));
    applyShrinePilgrimBonus();
    setDeckSelectionAttention(true);
    const preserved = shouldPreserveTicket(blessings.includes("archaeologist"));
    if (!preserved) setCollapsedShrineRooms((current) => new Set(current).add(roomKey));
    setMapMessage(`${selectedCards.map((card) => card.name).join(", ")} 추출 완료. 추출의 성소가 ${preserved ? "보존되었습니다." : "붕괴했습니다."}`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
    return selectedCards;
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
    if (screen !== "map" || playerNameSetupOpen || mapTraveling) return;
    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) !== 1) return;
    const nextPosition = {
      x: mapPosition.x + deltaX,
      y: mapPosition.y + deltaY,
    };
    if (!isWalkableRoom(effectiveRoomType(nextPosition))) return;
    const roomKey = mapRoomKey(nextPosition);
    const revealedWorld = materializeVisibleMapContent(nextPosition, mapSeed, mapEnemyWorld);
    const result = resolveMapStep(mapPosition, nextPosition, revealedWorld);
    const bombResult = advanceBombsAfterMovement(nextPosition, result.world);
    const bombWorld = bombResult.world;
    const collisionIds = new Set(result.collisionEnemies.map((enemy) => enemy.id));
    const collisionEnemies = bombWorld.enemies.filter((enemy) => collisionIds.has(enemy.id));
    setMapPosition(nextPosition);
    rememberPlayerVision(nextPosition, mapSeed, bombWorld.enemies, revealedWorld.enemies);
    consumeMindEyeMove();
    setMapEnemyWorld(bombWorld);
    if (RUN_SAVE_POLICY.afterEveryMapMove) queueRunSave(RUN_SAVE_POLICY.mapMoveDelayMs);
    if (bombResult.playerDefeated) return;
    if (collisionEnemies.length > 0) {
      animateMapCollision(collisionEnemies, roomKey);
      return;
    }
    activateRoomFeature(nextPosition);
  };

  const {
    handleKeyDown: handleMapMovementKeyDown,
    handleKeyUp: handleMapMovementKeyUp,
    clearPendingMovement: clearMapKeyboardMovement,
  } = useMapKeyboardMovement(moveOnMap);

  const spendMapTurn = () => {
    if (screen !== "map" || playerNameSetupOpen || mapTraveling) return;
    centerMapOn(mapPosition);
    setMapWaitNoticeNonce((current) => current + 1);
    const roomKey = mapRoomKey(mapPosition);
    const revealedWorld = materializeVisibleMapContent(mapPosition, mapSeed, mapEnemyWorld);
    const result = resolveMapStep(mapPosition, mapPosition, revealedWorld);
    const bombResult = advanceBombsAfterMovement(mapPosition, result.world);
    const collisionIds = new Set(result.collisionEnemies.map((enemy) => enemy.id));
    const collisionEnemies = bombResult.world.enemies.filter((enemy) => collisionIds.has(enemy.id));
    rememberPlayerVision(mapPosition, mapSeed, bombResult.world.enemies, revealedWorld.enemies);
    setMapEnemyWorld(bombResult.world);
    if (bombResult.playerDefeated) return;
    if (collisionEnemies.length > 0) {
      animateMapCollision(collisionEnemies, roomKey);
      return;
    }
  };

  const waitOnMap = () => {
    spendMapTurn();
  };

  const travelSafePath = (path: MapPosition[]) => {
    if (screen !== "map" || playerNameSetupOpen || mapTraveling || path.length < 2) return;
    if (debugMode) {
      const destination = path.at(-1)!;
      clearMapTravel();
      const revealedWorld = materializeVisibleMapContent(destination, mapSeed, mapEnemyWorld);
      setMapPosition(destination);
      setMapEnemyWorld(revealedWorld);
      rememberPlayerVision(destination, mapSeed, revealedWorld.enemies, mapEnemyWorld.enemies);
      focusMapOn(destination);
      activateRoomFeature(destination);
      return;
    }
    const currentVisibleRoomKeys = visibleMapRoomKeys(
      mapPosition,
      mapSeed,
      visionHorizontalRadius,
      visionVerticalRadius,
    );
    if (mapEnemyWorld.enemies.some((enemy) =>
      currentVisibleRoomKeys.has(mapRoomKey(enemy.position)))) {
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
      const previousWorld = currentWorld;
      const revealedWorld = materializeVisibleMapContent(nextPosition, mapSeed, currentWorld);
      const result = resolveMapStep(currentPosition, nextPosition, revealedWorld);
      const bombResult = advanceBombsAfterMovement(nextPosition, result.world);
      const bombWorld = bombResult.world;
      const collisionIds = new Set(result.collisionEnemies.map((enemy) => enemy.id));
      const collisionEnemies = bombWorld.enemies.filter((enemy) => collisionIds.has(enemy.id));
      currentPosition = nextPosition;
      currentWorld = bombWorld;
      setMapPosition(nextPosition);
      rememberPlayerVision(nextPosition, mapSeed, bombWorld.enemies, previousWorld.enemies);
      consumeMindEyeMove();
      setMapEnemyWorld(bombWorld);
      if (RUN_SAVE_POLICY.afterEveryMapMove) queueRunSave(RUN_SAVE_POLICY.mapMoveDelayMs);
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
      const visibleRoomKeys = visibleMapRoomKeys(
        nextPosition,
        mapSeed,
        visionHorizontalRadius,
        visionVerticalRadius,
      );
      if (bombWorld.enemies.some((enemy) =>
        visibleRoomKeys.has(mapRoomKey(enemy.position)))) {
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
      ensureTelemetryRun();
      recordTelemetryGoldAcquired(telemetry, battleRewardGold, "battle-reward");
      battleRewardDecks.forEach((deck) => recordTelemetryDeckAcquired(
        telemetry,
        telemetryDeckSnapshot(deck),
        "battle-reward",
      ));
      battleRewardConsumables.forEach((consumable) => recordTelemetryConsumableAcquired(
        telemetry,
        telemetryConsumableSnapshot(consumable),
        "battle-reward",
      ));
      setGold((current) => current + battleRewardGold);
      if (battleRewardDecks.length > 0) setRoomDeckDrops((current) => ({
        ...current,
        [battleRoom]: [...(current[battleRoom] ?? []), ...battleRewardDecks],
      }));
      if (battleRewardConsumables.length > 0) setRoomConsumableDrops((current) => ({
        ...current,
        [battleRoom]: [...(current[battleRoom] ?? []), ...battleRewardConsumables],
      }));
    }

    const nextEnemy = mapBattleQueueRef.current.shift();
    if (nextEnemy && battleRoom) {
      const nextPlayerHp = game.playerHp;
      runPlayerHpRef.current = nextPlayerHp;
      setRunPlayerHp(nextPlayerHp);
      setBattleRewards([]);
      setBattleRewardDecks([]);
      setBattleRewardConsumables([]);
      setBattleRewardGold(0);
      battleRewardIsBossRef.current = nextEnemy.isBoss === true;
      battleRewardIsOutOfDepthRef.current = nextEnemy.isBoss !== true
        && isHigherRegionMapEnemy(nextEnemy.encounterIndex, mapPosition, mapSeed);
      startBattleNow(
        [nextEnemy],
        nextPlayerHp,
        previousBattleDeckIdRef.current ?? activeDeckId,
      );
      return;
    }

    if (activeMapEnemyIds.length > 0 && battleRoom) {
      const defeatedBossRegionIndices = mapEnemyWorld.enemies
        .filter((enemy) => activeMapEnemyIds.includes(enemy.id) && enemy.isBoss)
        .map((enemy) => getEncounterRegionNumber(enemy.encounterIndex) - 1);
      if (defeatedBossRegionIndices.length > 0) {
        setDefeatedBossRegions((current) => new Set([...current, ...defeatedBossRegionIndices]));
      }
      const remainingEnemies = mapEnemyWorld.enemies.filter((enemy) => !activeMapEnemyIds.includes(enemy.id));
      setMapEnemyWorld({ ...mapEnemyWorld, enemies: remainingEnemies });
      rememberPlayerVision(mapPosition, mapSeed, remainingEnemies);
    }
    runPlayerHpRef.current = game.playerHp;
    setRunPlayerHp(game.playerHp);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    setActiveMapEnemyIds([]);
    setActiveBattleRoom(null);
    mapBattleQueueRef.current = [];
    setScreen("map");
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const startNewRun = () => {
    cancelQueuedSave();
    clearBattleTimers();
    clearMapTravel();
    resetTelemetryRecorder(telemetry);
    mapBattleQueueRef.current = [];
    setDebugMode(false);
    const nextSeed = createRandomMapSeed();
    const starterDeck = createStarterDeck();
    setPlayerName(createRandomPlayerName());
    setPlayerNameSetupOpen(true);
    runPlayerHpRef.current = MAX_PLAYER_HP;
    setRunPlayerHp(MAX_PLAYER_HP);
    setMapSeed(nextSeed);
    setMapPosition(MAP_START);
    setMapMessage("");
    setMindEyeMovesRemaining(0);
    mindEyeMovesRemainingRef.current = 0;
    setGodsLamentCharges(3);
    godsLamentChargesRef.current = 3;
    setDarkTicketTurnsRemaining(0);
    darkTicketTurnsRemainingRef.current = 0;
    const initialVisibleKeys = visibleMapRoomKeys(MAP_START, nextSeed);
    const initialVisiblePositions = [...initialVisibleKeys].map(parseMapRoomKey);
    generatedMapRoomKeysRef.current = new Set();
    setRoomDrops({});
    setRoomConsumableDrops({});
    const initialWorld = materializeMapContent(
      [...initialVisiblePositions, ...positionsInSquare(MAP_START, 5)],
      nextSeed,
      { enemies: [] },
      initialVisiblePositions,
    );
    setSeenRooms(initialVisibleKeys);
    setSafeAreaEntrySeenRooms(null);
    setMapEnemyWorld(initialWorld);
    setDefeatedBossRegions(new Set());
    setMapEnemyCellMemory({});
    setMapBombsSynced([]);
    setDestroyedShopRooms(new Set());
    setCollapsedShrineRooms(new Set());
    setCollapsedRecoveryShrineRooms(new Set());
    setCollapsedVitalityShrineRooms(new Set());
    setCollapsedMindEyeShrineRooms(new Set());
    setCollapsedTransformShrineRooms(new Set());
    setCollapsedCombinationShrineRooms(new Set());
    setCollapsedTreasureChestRooms(new Set());
    setTreasureChestReward(null);
    setVitalityShrineMaxHpBonus(0);
    setShrineOpen(false);
    setTransformShrineOpen(false);
    setCombinationShrineOpen(false);
    setUsedHealRooms(new Set());
    setUsedBlessingRooms(new Set());
    setRockBombHits({});
    setActiveMapEnemyIds([]);
    setActiveBattleRoom(null);
    mapBattleQueueRef.current = [];
    previousBattleDeckIdRef.current = null;
    battleRewardIsBossRef.current = false;
    battleRewardIsOutOfDepthRef.current = false;
    setPendingBattleStart(null);
    setBattleDeckPreviewId(null);
    setOwnedDecks([starterDeck]);
    setActiveDeckId(starterDeck.id);
    setDeckSelectionAttention(false);
    setInventoryCards([]);
    nextConsumableIdRef.current = 1;
    setInventoryConsumables([nextConsumable("extractTicket")]);
    setRoomDeckDrops({});
    setRoomShops({});
    setShopOpen(false);
    setBlessingOpen(false);
    setBlessingOffers([]);
    setBlessingSeenOfferIds(new Set());
    setBlessings([]);
    setBlessingRerollCost(5);
    setOneUpUsed(false);
    oneUpUsedRef.current = false;
    setActiveShopRoom(null);
    setGold(0);
    setBattleRewards([]);
    setBattleRewardDecks([]);
    setBattleRewardConsumables([]);
    setBattleRewardGold(0);
    deckDropChanceRef.current = 0.25;
    rareCardDropChanceRef.current = 0.05;
    deckPityBattlesRemainingRef.current = 3;
    finishDeckEditorSession();
    setDeckViewerOpen(false);
    setHoveredDeckCard(null);
    clearCardKeywordHover();
    setPendingPaintTicketId(null);
    setPendingCloneTicketId(null);
    setPendingExtractTicketId(null);
    setPendingTransformTicketId(null);
      setArmedBombTicketIds(new Set());
      nextCardIdRef.current = starterDeck.cards.length;
      setGame(waitingState());
    setPhase("drawing");
    setScreen("map");
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readRunSave<SavedRunState>();
      if (saved) {
      const state = prepareRunRestore(saved.state, isSafeAreaPosition);
      setPlayerName(state.playerName);
      setPlayerNameSetupOpen(false);
      setRunPlayerHp(state.runPlayerHp);
      runPlayerHpRef.current = state.runPlayerHp;
      setMapSeed(state.mapSeed);
      setMapPosition(state.mapPosition);
      setSeenRooms(new Set(state.seenRooms));
      generatedMapRoomKeysRef.current = new Set([
        ...state.seenRooms,
        ...Object.keys(state.roomDrops),
        ...Object.keys(state.roomConsumableDrops),
      ]);
      setSafeAreaEntrySeenRooms(state.safeAreaEntrySeenRooms ? new Set(state.safeAreaEntrySeenRooms) : null);
      setDefeatedBossRegions(new Set(state.defeatedBossRegions));
      setMapEnemyCellMemory(state.mapEnemyCellMemory);
      setMapBombs(state.mapBombs);
      mapBombsRef.current = state.mapBombs;
      setDestroyedShopRooms(new Set(state.destroyedShopRooms));
      setCollapsedShrineRooms(new Set(state.collapsedShrineRooms));
      setCollapsedRecoveryShrineRooms(new Set(state.collapsedRecoveryShrineRooms));
      setCollapsedVitalityShrineRooms(new Set(state.collapsedVitalityShrineRooms));
      setCollapsedMindEyeShrineRooms(new Set(state.collapsedMindEyeShrineRooms));
      setCollapsedTransformShrineRooms(new Set(state.collapsedTransformShrineRooms));
      setCollapsedCombinationShrineRooms(new Set(state.collapsedCombinationShrineRooms));
      setCollapsedTreasureChestRooms(new Set(state.collapsedTreasureChestRooms));
      setVitalityShrineMaxHpBonus(state.vitalityShrineMaxHpBonus);
      setUsedHealRooms(new Set(state.usedHealRooms));
      setUsedBlessingRooms(new Set(state.usedBlessingRooms));
      setRockBombHits(state.rockBombHits);
      setMindEyeMovesRemaining(state.mindEyeMovesRemaining);
      mindEyeMovesRemainingRef.current = state.mindEyeMovesRemaining;
      setGodsLamentCharges(state.godsLamentCharges);
      godsLamentChargesRef.current = state.godsLamentCharges;
      setDarkTicketTurnsRemaining(state.darkTicketTurnsRemaining);
      darkTicketTurnsRemainingRef.current = state.darkTicketTurnsRemaining;
      const savedOwnedDecks = state.ownedDecks.map(removeDeletedDeckEditions);
      const savedRoomDeckDrops = Object.fromEntries(Object.entries(state.roomDeckDrops).map(([roomKey, decks]) => [
        roomKey,
        decks.map(removeDeletedDeckEditions),
      ]));
      setOwnedDecks(savedOwnedDecks);
      setActiveDeckId(state.activeDeckId);
      setInventoryCards(state.inventoryCards);
      setInventoryConsumables(state.inventoryConsumables);
      inventoryConsumablesRef.current = state.inventoryConsumables;
      setRoomDrops(state.roomDrops);
      setRoomConsumableDrops(state.roomConsumableDrops);
      const restoredWorld = materializeMapContent(
        positionsInSquare(state.mapPosition, 5),
        state.mapSeed,
        state.mapEnemyWorld,
        [],
      );
      setMapEnemyWorld(restoredWorld);
      setRoomDeckDrops(savedRoomDeckDrops);
      setRoomShops(state.roomShops);
      setBlessingOffers(state.blessingOffers);
      setBlessingSeenOfferIds(new Set(state.blessingSeenOfferIds));
      setBlessings(state.blessings);
      setBlessingRerollCost(state.blessingRerollCost);
      setOneUpUsed(state.oneUpUsed);
      oneUpUsedRef.current = state.oneUpUsed;
      setGold(state.gold);
      nextCardIdRef.current = state.nextCardId;
      nextConsumableIdRef.current = state.nextConsumableId;
      deckDropChanceRef.current = state.deckDropChance;
      rareCardDropChanceRef.current = state.rareCardDropChance;
      deckPityBattlesRemainingRef.current = state.deckPityBattlesRemaining;
      setGame(waitingState());
      setPhase("drawing");
        setScreen("map");
      }
      setSaveReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    updateSaveSnapshot(createRunSaveSnapshot({
      playerName,
      runPlayerHp,
      mapSeed,
      mapPosition,
      seenRooms,
      safeAreaEntrySeenRooms,
      mapEnemyWorld,
      defeatedBossRegions,
      mapEnemyCellMemory,
      mapBombs,
      destroyedShopRooms,
      collapsedShrineRooms,
      collapsedRecoveryShrineRooms,
      collapsedVitalityShrineRooms,
      collapsedMindEyeShrineRooms,
      collapsedTransformShrineRooms,
      collapsedCombinationShrineRooms,
      collapsedTreasureChestRooms,
      vitalityShrineMaxHpBonus,
      usedHealRooms,
      usedBlessingRooms,
      rockBombHits,
      mindEyeMovesRemaining,
      godsLamentCharges,
      darkTicketTurnsRemaining,
      ownedDecks,
      activeDeckId,
      inventoryCards,
      inventoryConsumables,
      roomDrops,
      roomConsumableDrops,
      roomDeckDrops,
      roomShops,
      blessingOffers,
      blessingSeenOfferIds,
      blessings,
      blessingRerollCost,
      oneUpUsed,
      gold,
      nextCardId: nextCardIdRef.current,
      nextConsumableId: nextConsumableIdRef.current,
      deckDropChance: deckDropChanceRef.current,
      rareCardDropChance: rareCardDropChanceRef.current,
      deckPityBattlesRemaining: deckPityBattlesRemainingRef.current,
    }), saveReady && !playerNameSetupOpen && screen === "map" && !mapTraveling && !deckEditorOpen);
  }, [
    activeDeckId, blessingRerollCost, blessings,
    collapsedCombinationShrineRooms, collapsedMindEyeShrineRooms, collapsedRecoveryShrineRooms,
    collapsedShrineRooms, collapsedTransformShrineRooms, collapsedTreasureChestRooms,
    collapsedVitalityShrineRooms,
    deckEditorOpen, defeatedBossRegions,
    destroyedShopRooms, gold, inventoryCards, inventoryConsumables, vitalityShrineMaxHpBonus,
    mapBombs, mapEnemyCellMemory, mapEnemyWorld, mapPosition, mapSeed, mapTraveling,
    darkTicketTurnsRemaining, godsLamentCharges, mindEyeMovesRemaining, ownedDecks, playerName, playerNameSetupOpen, rockBombHits,
    blessingOffers, blessingSeenOfferIds, roomConsumableDrops, roomDeckDrops, roomDrops, roomShops, runPlayerHp,
    oneUpUsed, safeAreaEntrySeenRooms, saveReady, screen, seenRooms, updateSaveSnapshot, usedBlessingRooms, usedHealRooms,
  ]);

  useEffect(() => {
    if (game.status === "lost") clearRunSave();
  }, [game.status]);

  const resetHoldProgress = useRunKeyboardControls({
    playerNameSetupOpen,
    saveRunNow,
    showMapMessage,
    clearRunSave,
    startNewRun,
  });

  const originalDeckIdForCard = (cardId: number) => {
    return deckEditorSnapshot?.originDeckIdsByCardId[cardId] ?? null;
  };

  const effectiveOriginDeckIdForCard = (cardId: number) => deckEditorReleasedCardIds.has(cardId)
    ? null
    : originalDeckIdForCard(cardId);

  useEffect(() => {
    const frame = window.requestAnimationFrame(clearFloatingTooltips);
    return () => window.cancelAnimationFrame(frame);
  }, [
    clearFloatingTooltips,
    screen,
    playerNameSetupOpen,
    pendingBattleStart,
    shopOpen,
    blessingOpen,
    shrineOpen,
    transformShrineOpen,
    combinationShrineOpen,
    deckSelectorOpen,
    deckEditorOpen,
    deckViewerOpen,
    openedCardPack,
    battleCardView,
    cardPoolStatsOpen,
    constellationPreviewIndex,
    mapTraveling,
    mapCameraFocusing,
    battleRewards.length,
    battleRewardDecks.length,
    battleRewardConsumables.length,
  ]);

  const scrollDeckEditorCardsHorizontally = (event: ReactWheelEvent<HTMLDivElement>) => {
    const row = event.currentTarget;
    event.preventDefault();
    event.stopPropagation();
    if (row.scrollWidth <= row.clientWidth) return;
    const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
    if (delta === 0) return;
    row.scrollLeft += delta * 1.5;
  };

  const deckEditorMoveErrorMessage = (reason: DeckEditorMoveBlockReason, targetDeck?: DeckCase) => {
    if (reason === "rare-locked") return "희귀·전설 카드는 덱끼리 직접 옮기거나 일반 이동으로 꺼낼 수 없습니다. 덱에 넣을 때는 인벤토리·바닥에서 옮기고, 추출할 때는 추출 티켓+를 사용하세요.";
    if (reason === "inventory-full") return "인벤토리가 가득 찼습니다.";
    if (reason === "deck-full") return `${targetDeck?.name ?? "현재 덱"}에는 더 이상 카드를 넣을 수 없습니다.`;
    if (reason === "rare-slots-full") return `${targetDeck?.name ?? "현재 덱"}의 희귀·전설 슬롯이 가득 찼습니다.`;
    if (reason === "extract-original-only") return "추출 티켓은 편집 시작 당시 덱에 있던 카드에만 사용할 수 있습니다.";
    if (reason === "origin-locked") return "현재 위치에서는 편집 시작 당시의 원래 덱으로만 되돌릴 수 있습니다.";
    return "이미 같은 위치에 있습니다.";
  };

  const moveDeckEditorCard = ({
    cardId,
    source,
    target: requestedTarget,
    viaExtractionTicket = false,
    allowsRareExtraction = false,
    inventorySlotsFreed = 0,
    beforeCommit,
  }: {
    cardId: number;
    source: DeckEditorCardLocation;
    target: DeckEditorCardLocation;
    viaExtractionTicket?: boolean;
    allowsRareExtraction?: boolean;
    inventorySlotsFreed?: number;
    beforeCommit?: () => boolean;
  }) => {
    const roomKey = mapRoomKey(mapPosition);
    const collections = {
      ownedDecks,
      inventoryCards,
      floorCards: roomDrops[roomKey] ?? [],
      pendingRemovedCards,
      pendingRemovedCardAreas,
    };
    const previewTransition = transitionDeckEditorCardCollections(collections, {
      cardId, source, target: requestedTarget, action: "move",
    });
    const card = previewTransition?.card;
    if (!card) return false;
    let target = requestedTarget;
    const temporaryRareReturnArea = deckEditorHighRarityInsertionOriginsRef.current[cardId];
    if (!viaExtractionTicket && usesRareCardSlot(card) && source.area === "deck"
      && target.area === "floor" && temporaryRareReturnArea) {
      target = temporaryRareReturnArea === "inventory" && deckEditorInventoryItemCount >= inventoryCapacity
        ? { area: "floor" }
        : { area: temporaryRareReturnArea };
    }
    const sourceDeck = source.area === "deck"
      ? ownedDecks.find((deck) => deck.id === source.deckId)
      : undefined;
    const targetDeck = target.area === "deck"
      ? ownedDecks.find((deck) => deck.id === target.deckId)
      : undefined;
    if (source.area === "deck" && !sourceDeck) return false;
    if (target.area === "deck" && !targetDeck) return false;
    const targetDeckRareCardCount = targetDeck
      ? countRareSlotCards(targetDeck.cards)
      : 0;
    const positionIsSafeArea = isSafeAreaPosition(mapPosition, mapSeed);
    const safeArea = positionIsSafeArea
      ? isSafeAreaEditAllowed(mapPosition, mapSeed, defeatedBossRegions)
      : blessings.includes("forbiddenKnowledge");
    const validation = validateDeckEditorCardMove({
      source,
      target,
      safeArea,
      originalOriginDeckId: originalDeckIdForCard(cardId),
      effectiveOriginDeckId: effectiveOriginDeckIdForCard(cardId),
      targetDeckCardCount: targetDeck?.cards.length,
      targetDeckCapacity: targetDeck?.capacity,
      targetDeckRareCardCount,
      targetDeckRareSlotCapacity: targetDeck
        ? Math.max(targetDeck.rareSlotCapacity ?? 0, countRareSlotCards(targetDeck.cards))
        : 0,
      inventoryItemCount: deckEditorInventoryItemCount,
      inventoryCapacity,
      inventorySlotsFreed,
      viaExtractionTicket,
      allowsRareExtraction,
      temporaryRareReturnArea: source.area === "deck" ? temporaryRareReturnArea : undefined,
      isRare: usesRareCardSlot(card),
    });
    if (!validation.allowed) {
      if (validation.reason !== "same-location") {
        setDeckEditorMessage(deckEditorMoveErrorMessage(validation.reason, targetDeck));
      }
      return false;
    }
    if (beforeCommit && !beforeCommit()) return false;

    const committedTransition = transitionDeckEditorCardCollections(collections, {
      cardId, source, target, action: validation.action,
    });
    if (!committedTransition) return false;
    const nextCollections = committedTransition.collections;
    if (source.area === "floor") {
      ensureTelemetryRun();
      recordTelemetryCardAcquired(telemetry, telemetryCardSnapshot(card), "floor");
    }
    setOwnedDecks(nextCollections.ownedDecks);
    setInventoryCards(nextCollections.inventoryCards);
    setRoomDrops((current) => ({ ...current, [roomKey]: nextCollections.floorCards }));
    setPendingRemovedCards(nextCollections.pendingRemovedCards);
    setPendingRemovedCardAreas(nextCollections.pendingRemovedCardAreas);

    if (usesRareCardSlot(card)) {
      if ((source.area === "inventory" || source.area === "floor") && target.area === "deck") {
        deckEditorHighRarityInsertionOriginsRef.current[cardId] = source.area;
      } else if (source.area === "deck" && (target.area === "inventory" || target.area === "floor")) {
        delete deckEditorHighRarityInsertionOriginsRef.current[cardId];
      }
    }

    if (validation.action === "schedule-removal") {
      setDeckEditorMessage(`${card.name}을(를) 제거 예정 상태로 만들었습니다.`);
    } else if (target.area === "deck") {
      setDeckEditorDeckId(target.deckId!);
      setDeckEditorMessage(validation.action === "restore-removal"
        ? `${card.name} 제거를 취소하고 ${targetDeck!.name}(으)로 되돌렸습니다.`
        : `${card.name}을(를) ${targetDeck!.name}(으)로 옮겼습니다.`);
    } else if (target.area === "inventory") {
      setDeckEditorMessage(`${card.name}을(를) 인벤토리로 옮겼습니다.`);
    } else {
      setDeckEditorMessage(`${card.name}을(를) 실제 바닥으로 옮겼습니다.`);
    }
    setHoveredDeckCard(null);
    clearCardKeywordHover();
    return true;
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
    if (pendingExtractTicketId === consumableId) setPendingExtractTicketId(null);
    if (pendingTransformTicketId === consumableId) setPendingTransformTicketId(null);
    setArmedBombTicketIds((current) => {
      const next = new Set(current);
      next.delete(consumableId);
      return next;
    });
    setDeckEditorMessage(`${consumable.name}을(를) 바닥에 놓았습니다.`);
  };

  const findTicketById = (ticketId: string, type?: ConsumableType) => {
    const roomKey = mapRoomKey(mapPosition);
    return findTicketInAreas(ticketId, type, {
      inventory: inventoryConsumablesRef.current,
      floor: roomConsumableDrops[roomKey] ?? [],
    });
  };

  const consumeTicketById = (ticketId: string, type: ConsumableType) => {
    const roomKey = mapRoomKey(mapPosition);
    const consumed = consumeTicketFromAreas(ticketId, type, {
      inventory: inventoryConsumablesRef.current,
      floor: roomConsumableDrops[roomKey] ?? [],
    });
    if (!consumed) return false;
    const preserved = shouldPreserveTicket(blessings.includes("oneMore"));
    if (blessings.includes("healingMileage")) {
      const nextHp = Math.min(maxPlayerHp, runPlayerHpRef.current + 2);
      runPlayerHpRef.current = nextHp;
      setRunPlayerHp(nextHp);
    }
    if (!preserved) {
      const nextInventory = [...consumed.inventory];
      inventoryConsumablesRef.current = nextInventory;
      setInventoryConsumables(nextInventory);
      setRoomConsumableDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).filter((item) => item.id !== ticketId),
      }));
    }
    return true;
  };

  const extractionTicketFreesInventorySlot = (ticket: Consumable | null) => Boolean(
    (ticket?.type === "extractTicket" || ticket?.type === "extractPlusTicket")
    && inventoryConsumablesRef.current.some((item) => item.id === ticket.id)
    && !blessings.includes("lightTicket")
    && !blessings.includes("oneMore"),
  );

  const canApplyTicketToCard = (
    ticket: Consumable | null,
    card: Card,
    area: TicketDropArea,
    deck?: DeckCase,
  ) => {
    if (!ticket || !["paintTicket", "cloneTicket", "extractTicket", "extractPlusTicket", "transformTicket"].includes(ticket.type)) return false;
    if (ticket.type === "paintTicket") return area === "deck";
    if (ticket.type === "extractTicket" || ticket.type === "extractPlusTicket") return area === "deck" && Boolean(
      deck
      && (ticket.type === "extractPlusTicket" || !usesRareCardSlot(card))
      && originalDeckIdForCard(card.id) !== null
      && effectiveOriginDeckIdForCard(card.id) !== null
      && deck.cards.some((item) => item.id === card.id),
    );
    return card.rarity !== "legendary";
  };

  const applyTicketToCard = (
    ticketId: string,
    card: Card,
    area: TicketDropArea,
    deck?: DeckCase,
    targetCardId = card.id,
  ) => {
    const ticket = findTicketById(ticketId);
    if (!ticket || !canApplyTicketToCard(ticket, card, area, deck)) return;
    const targetCard = card.id === targetCardId ? card : { ...card, id: targetCardId };
    if (ticket.type === "paintTicket" && area === "deck" && deck) {
      paintDeckCard(targetCardId, ticket.id, deck.id);
    } else if (ticket.type === "cloneTicket") {
      cloneCardWithTicket(targetCard, ticket.id);
    } else if ((ticket.type === "extractTicket" || ticket.type === "extractPlusTicket") && area === "deck" && deck) {
      extractDeckCardWithTicket(targetCardId, deck.id, ticket.id);
    } else if (ticket.type === "transformTicket") {
      transformCardWithTicket(targetCard, area, deck?.id, ticket.id);
    }
  };

  const canApplyTicketToDeck = (ticketId: string, deck: DeckCase) => {
    const ticket = findTicketById(ticketId);
    return ticket?.type === "expandTicket" && ownedDecks.some((ownedDeck) => ownedDeck.id === deck.id);
  };

  const applyTicketToDeck = (ticketId: string, deck: DeckCase) => {
    const ticket = findTicketById(ticketId, "expandTicket");
    const targetDeck = ownedDecks.find((ownedDeck) => ownedDeck.id === deck.id);
    if (!ticket || !targetDeck || !consumeTicketById(ticket.id, "expandTicket")) return;
    setOwnedDecks((current) => current.map((ownedDeck) => ownedDeck.id !== targetDeck.id
      ? ownedDeck
      : {
        ...ownedDeck,
        rareSlotCapacity: Math.max(ownedDeck.rareSlotCapacity ?? 0, countRareSlotCards(ownedDeck.cards)) + 1,
      }));
    setDeckEditorMessage(`${targetDeck.name}의 희귀 슬롯이 1 늘었습니다.`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const closeDeckEditorAfterMapTicket = () => {
    finishDeckEditorSession();
    setPendingRemovedCards([]);
    setPendingRemovedCardAreas({});
    setDeckEditorReleasedCardIds(new Set());
    setHoveredDeckCard(null);
    clearCardKeywordHover();
    setPendingPaintTicketId(null);
    setPendingCloneTicketId(null);
    setPendingExtractTicketId(null);
    setPendingTransformTicketId(null);
    deckEditorHighRarityInsertionOriginsRef.current = {};
    setArmedBombTicketIds(new Set());
  };

  const consumeMindEyeTicket = (consumableId: string) => {
    const ticket = findTicketById(consumableId, "mindEyeTicket");
    if (!ticket || !consumeTicketById(ticket.id, "mindEyeTicket")) return;
    closeDeckEditorAfterMapTicket();
    activateMindEye();
    showMapMessage("심안: 20번 이동 동안 시야 거리 +2를 얻었습니다.");
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const consumeDarkTicket = (consumableId: string) => {
    const ticket = findTicketById(consumableId, "darkTicket");
    if (!ticket || !consumeTicketById(ticket.id, "darkTicket")) return;
    closeDeckEditorAfterMapTicket();
    setDarkTicketTurnsRemaining((current) => {
      const next = current + 20;
      darkTicketTurnsRemainingRef.current = next;
      return next;
    });
    showMapMessage("어둠: 20턴 동안 적의 인식 거리가 1 감소합니다.");
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
        ticketId: bomb.id,
        position: { ...mapPosition },
        movesRemaining: bomb.armedMovesRemaining!,
      })),
    ]);
  };

  const findCardByIdForTicket = (cardId: number) => {
    const roomKey = mapRoomKey(mapPosition);
    return ownedDecks.flatMap((deck) => deck.cards).find((card) => card.id === cardId)
      ?? inventoryCards.find((card) => card.id === cardId)
      ?? (roomDrops[roomKey] ?? []).find((card) => card.id === cardId);
  };

  const grantCardToInventoryOrFloor = (card: Card) => {
    const usedSlots = inventoryCards.length + inventoryConsumablesRef.current.filter((item) =>
      !blessings.includes("lightTicket") || item.type === "cardPack").length;
    if (usedSlots < inventoryCapacity) {
      setInventoryCards((current) => [...current, card]);
      return "inventory" as const;
    }
    const roomKey = mapRoomKey(mapPosition);
    setRoomDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), card],
    }));
    return "floor" as const;
  };

  const cloneCardWithTicket = (card: Card, ticketId = pendingCloneTicketId) => {
    if (!ticketId) return;
    const ticket = findTicketById(ticketId, "cloneTicket");
    const targetCard = findCardByIdForTicket(card.id);
    if (!ticket || !targetCard) return;
    if (targetCard.rarity === "legendary") {
      setDeckEditorMessage("전설 카드는 복제할 수 없습니다.");
      return;
    }
    if (!consumeTicketById(ticket.id, "cloneTicket")) return;
    const clone = { ...targetCard, id: nextCardIdRef.current, revealed: false };
    nextCardIdRef.current += 1;
    const destination = grantCardToInventoryOrFloor(clone);
    setPendingCloneTicketId(null);
    setDeckEditorMessage(`${targetCard.name}을(를) 복제했습니다.${destination === "floor" ? " 인벤토리가 가득 차 바닥에 놓았습니다." : ""}`);
  };

  const cloneConsumableWithTicket = (targetId: string) => {
    if (!pendingCloneTicketId) return;
    const sourceTicket = findTicketById(pendingCloneTicketId, "cloneTicket");
    const target = findTicketById(targetId);
    if (!sourceTicket || !target || target.id === sourceTicket.id || target.type === "cloneTicket") return;
    if (!consumeTicketById(sourceTicket.id, "cloneTicket")) return;
    grantConsumables(target.type, 1);
    setPendingCloneTicketId(null);
    setDeckEditorMessage(`${target.name}을(를) 복제했습니다.`);
  };

  const selectExtractionTicket = (consumable: Consumable) => {
    if (pendingTransformTicketId && consumable.id !== pendingTransformTicketId) {
      transformConsumableWithTicket(consumable.id);
      return;
    }
    if (pendingCloneTicketId && consumable.id !== pendingCloneTicketId) {
      cloneConsumableWithTicket(consumable.id);
      return;
    }
    if (consumable.type === "cardPack") {
      openCardPack(consumable.id);
      return;
    }
    if (consumable.type === "expandTicket") {
      setDeckEditorMessage("확장 티켓은 원하는 덱에 드래그해 사용합니다.");
      return;
    }
    if (consumable.type === "mindEyeTicket") {
      consumeMindEyeTicket(consumable.id);
      return;
    }
    if (consumable.type === "darkTicket") {
      consumeDarkTicket(consumable.id);
      return;
    }
    if (consumable.type === "bombTicket") {
      const cancelling = consumable.armedMovesRemaining !== undefined;
      const roomKey = mapRoomKey(mapPosition);
      const nextBombState = setBombTicketArmed(consumable.id, !cancelling, {
        inventory: inventoryConsumablesRef.current,
        floor: roomConsumableDrops[roomKey] ?? [],
      });
      setArmedBombTicketIds((current) => {
        const next = new Set(current);
        if (cancelling) next.delete(consumable.id);
        else next.add(consumable.id);
        return next;
      });
      inventoryConsumablesRef.current = nextBombState.inventory;
      setInventoryConsumables(nextBombState.inventory);
      setRoomConsumableDrops((current) => ({
        ...current,
        [roomKey]: setBombTicketArmed(consumable.id, !cancelling, {
          inventory: inventoryConsumablesRef.current,
          floor: current[roomKey] ?? [],
        }).floor,
      }));
      setPendingPaintTicketId(null);
      setPendingCloneTicketId(null);
      setPendingExtractTicketId(null);
      setPendingTransformTicketId(null);
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
      setPendingExtractTicketId(null);
      setPendingTransformTicketId(null);
      setDeckEditorMessage(cancelling ? "복제를 취소했습니다." : "복제할 카드나 티켓을 클릭하세요.");
      return;
    }
    if (consumable.type === "paintTicket") {
      setArmedBombTicketIds(new Set());
      setPendingPaintTicketId((current) => current === consumable.id ? null : consumable.id);
      setPendingCloneTicketId(null);
      setPendingExtractTicketId(null);
      setPendingTransformTicketId(null);
      setDeckEditorMessage(
        pendingPaintTicketId === consumable.id ? "색칠을 취소했습니다." : "색칠할 덱 카드 1장을 클릭하세요.",
      );
      return;
    }
    if (consumable.type === "extractTicket" || consumable.type === "extractPlusTicket") {
      const cancelling = pendingExtractTicketId === consumable.id;
      setPendingExtractTicketId(cancelling ? null : consumable.id);
      setPendingPaintTicketId(null);
      setPendingCloneTicketId(null);
      setPendingTransformTicketId(null);
      setDeckEditorMessage(cancelling ? "추출을 취소했습니다." : `${consumable.name}을(를) 사용할 덱 카드를 클릭하세요.`);
      return;
    }
    if (consumable.type === "transformTicket") {
      const cancelling = pendingTransformTicketId === consumable.id;
      setPendingTransformTicketId(cancelling ? null : consumable.id);
      setPendingPaintTicketId(null);
      setPendingCloneTicketId(null);
      setPendingExtractTicketId(null);
      setDeckEditorMessage(cancelling ? "변환을 취소했습니다." : "변환할 카드나 티켓을 클릭하세요.");
      return;
    }
    if (consumable.type === "mapTicket") {
      if (isSafeAreaPosition(mapPosition, mapSeed)) {
        setDeckEditorMessage("안전 구역에서는 지도 티켓을 사용할 수 없습니다.");
        return;
      }
      const regionIndex = getDungeonRegionIndex(mapPosition);
      if (regionIndex === null) {
        setDeckEditorMessage("던전 지역 안에서만 사용할 수 있습니다.");
        return;
      }
      const candidates: MapPosition[] = [];
      const specialRoomTypes = new Set([
        "shop",
        "shrine",
        "vitalityShrine",
        "mindEyeShrine",
        "transformShrine",
        "combinationShrine",
        "treasureChest",
        "blessing",
      ]);
      for (let y = regionStartY(regionIndex); y < regionStartY(regionIndex) + regionHeight(regionIndex); y += 1) {
        for (let x = DUNGEON_MIN_X; x <= DUNGEON_MAX_X; x += 1) {
          const position = { x, y };
          const type = effectiveRoomType(position);
          if (specialRoomTypes.has(type) && !seenRooms.has(mapRoomKey(position))) candidates.push(position);
        }
      }
      candidates.sort((left, right) => chebyshevDistance(left, mapPosition) - chebyshevDistance(right, mapPosition));
      const revealed = candidates.slice(0, blessings.includes("cartographer") ? 4 : 2);
      const nearest = revealed[0];
      if (!nearest) {
        setDeckEditorMessage("같은 지역에 아직 밝히지 않은 특수 지형이 없습니다.");
        return;
      }
      const mapTicket = findTicketById(consumable.id, "mapTicket");
      if (!mapTicket || !consumeTicketById(mapTicket.id, "mapTicket")) return;
      closeDeckEditorAfterMapTicket();
      const revealedWorld = materializeMapContent(revealed, mapSeed, mapEnemyWorld);
      setMapEnemyWorld(revealedWorld);
      startMapTicketCameraTour(mapPosition, revealed);
      const revealedNames = revealed.map((position) => {
        const type = effectiveRoomType(position);
        if (type === "shop") return "상점";
        if (type === "shrine") return "추출의 성소";
        if (type === "vitalityShrine") return "건강의 성소";
        if (type === "mindEyeShrine") return "심안의 성소";
        if (type === "transformShrine") return "변환의 성소";
        if (type === "combinationShrine") return "조합의 성소";
        if (type === "treasureChest") return "보물 상자";
        return "축복";
      });
      setDeckEditorMessage(`${revealedNames.join(", ")} ${revealed.length}곳의 위치를 밝혔습니다.`);
      queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
      return;
    }
  };

  const pickUpFloorDeck = (deckId: string) => {
    if (ownedDecks.length >= maxOwnedDecks) {
      setDeckEditorMessage(`덱은 최대 ${maxOwnedDecks}개까지 보유할 수 있습니다.`);
      return;
    }
    const roomKey = mapRoomKey(mapPosition);
    const deck = (roomDeckDrops[roomKey] ?? []).find((item) => item.id === deckId);
    if (!deck) return;
    setRoomDeckDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).filter((item) => item.id !== deckId),
    }));
    ensureTelemetryRun();
    recordTelemetryDeckAcquired(telemetry, telemetryDeckSnapshot(deck), "floor");
    setOwnedDecks((current) => [...current, deck]);
    setDeckSelectionAttention(true);
    setDeckEditorMessage(`덱 '${deck.name}'을(를) 주웠습니다. 보유 덱 ${ownedDecks.length + 1} / ${maxOwnedDecks}`);
    queueRunSave();
  };

  const paintDeckCard = (cardId: number, ticketId = pendingPaintTicketId, deckId = editingDeck?.id) => {
    if (!ticketId) return;
    const deck = ownedDecks.find((item) => item.id === deckId);
    const card = deck?.cards.find((item) => item.id === cardId);
    if (!card) return;
    const ticket = findTicketById(ticketId, "paintTicket");
    if (!ticket) return;
    if (!consumeTicketById(ticket.id, "paintTicket")) return;
    updateDeckCards(deck?.id, (current) => current.map((item) => item.id === cardId ? { ...item, colored: true } : item));
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
    if (pickedCards.length + pickedConsumables.length + pickedDecks.length > 0) ensureTelemetryRun();
    if (pickedCards.length > 0) {
      pickedCards.forEach((card) => recordTelemetryCardAcquired(telemetry, telemetryCardSnapshot(card), "floor"));
      setRoomDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).filter((card) => !pickedCards.some((item) => item.id === card.id)),
      }));
      setInventoryCards((current) => [...current, ...pickedCards]);
    }
    if (pickedConsumables.length > 0) {
      pickedConsumables.forEach((consumable) => recordTelemetryConsumableAcquired(
        telemetry,
        telemetryConsumableSnapshot(consumable),
        "floor",
      ));
      setRoomConsumableDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).filter((item) => !pickedConsumables.some((picked) => picked.id === item.id)),
      }));
      setInventoryConsumables((current) => [...current, ...pickedConsumables]);
    }
    if (pickedDecks.length > 0) {
      pickedDecks.forEach((deck) => recordTelemetryDeckAcquired(telemetry, telemetryDeckSnapshot(deck), "floor"));
      setRoomDeckDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).filter((deck) => !pickedDecks.some((picked) => picked.id === deck.id)),
      }));
      setOwnedDecks((current) => [...current, ...pickedDecks]);
      setDeckSelectionAttention(true);
    }
    if (floorCards.length + floorConsumables.length > freeItemSlots) {
      showMapMessage("인벤토리가 가득찼습니다!");
    }
    if (pickedCards.length + pickedConsumables.length + pickedDecks.length > 0) queueRunSave();
  };

  const dropOwnedDeck = (deckId: string) => {
    const deck = ownedDecks.find((item) => item.id === deckId);
    if (!deck) return;
    const remainingDecks = ownedDecks.filter((item) => item.id !== deckId);
    const roomKey = mapRoomKey(mapPosition);
    setOwnedDecks(remainingDecks);
    setRoomDeckDrops((current) => ({
      ...current,
      [roomKey]: [...(current[roomKey] ?? []), deck],
    }));
    if (activeDeckId === deckId) setActiveDeckId(remainingDecks[0]?.id ?? "");
    setHoveredDeckCard(null);
    setDeckEditorMessage(`${deck.name}을(를) 바닥에 놓았습니다.`);
  };

  const extractDeckCardWithTicket = (cardId: number, deckId: string, ticketId = pendingExtractTicketId) => {
    if (!ticketId) return;
    const deck = ownedDecks.find((item) => item.id === deckId);
    const card = deck?.cards.find((item) => item.id === cardId);
    if (!deck || !card) return;
    const ticket = findTicketById(ticketId);
    if (!ticket || (ticket.type !== "extractTicket" && ticket.type !== "extractPlusTicket")) return;
    const ticketFreesInventorySlot = extractionTicketFreesInventorySlot(ticket);
    const targetArea = deckEditorInventoryItemCount - (ticketFreesInventorySlot ? 1 : 0) < inventoryCapacity
      ? "inventory"
      : "floor";
    const moved = moveDeckEditorCard({
      cardId,
      source: { area: "deck", deckId },
      target: { area: targetArea },
      viaExtractionTicket: true,
      allowsRareExtraction: ticket.type === "extractPlusTicket",
      inventorySlotsFreed: ticketFreesInventorySlot ? 1 : 0,
      beforeCommit: () => consumeTicketById(ticket.id, ticket.type),
    });
    if (!moved) return;
    setDeckEditorReleasedCardIds((current) => new Set(current).add(cardId));
    setPendingExtractTicketId(null);
    setDeckEditorMessage(`${card.name}을(를) 덱에서 추출했습니다.${targetArea === "floor" ? " 인벤토리가 가득 차 바닥에 놓았습니다." : ""}`);
  };

  const transformedCard = (card: Card) => {
    if (card.rarity === "legendary") return null;
    const pool = card.rarity === "starter"
      ? STARTER_CARD_POOL
      : card.rarity === "basic" ? BASIC_CARD_POOL : card.rarity === "special" ? SPECIAL_CARD_POOL : RARE_CARD_POOL;
    const candidates = pool.filter((blueprint) => blueprint.name !== card.name);
    if (candidates.length === 0) return null;
    const blueprint = randomItem(candidates);
    return { ...blueprint, id: card.id, revealed: card.revealed } as Card;
  };

  const transformCardWithTicket = (card: Card, area: "deck" | "inventory" | "floor", deckId?: string, ticketId = pendingTransformTicketId) => {
    if (!ticketId) return;
    const ticket = findTicketById(ticketId, "transformTicket");
    const roomKey = mapRoomKey(mapPosition);
    const targetCard = area === "deck" && deckId
      ? ownedDecks.find((deck) => deck.id === deckId)?.cards.find((item) => item.id === card.id)
      : area === "inventory"
        ? inventoryCards.find((item) => item.id === card.id)
        : (roomDrops[roomKey] ?? []).find((item) => item.id === card.id);
    if (!ticket || !targetCard) return;
    const transformed = transformedCard(targetCard);
    if (!transformed) {
      setDeckEditorMessage(targetCard.rarity === "legendary" ? "전설 카드는 변화시킬 수 없습니다." : "변환할 다른 카드가 없습니다.");
      return;
    }
    if (!consumeTicketById(ticket.id, "transformTicket")) return;
    if (area === "deck" && deckId) {
      updateDeckCards(deckId, (current) => current.map((item) => item.id === targetCard.id ? transformed : item));
    } else if (area === "inventory") {
      setInventoryCards((current) => current.map((item) => item.id === targetCard.id ? transformed : item));
    } else {
      setRoomDrops((current) => ({
        ...current,
        [roomKey]: (current[roomKey] ?? []).map((item) => item.id === targetCard.id ? transformed : item),
      }));
    }
    setTransformedCardNewIds((current) => new Set(current).add(targetCard.id));
    setPendingTransformTicketId(null);
    setDeckEditorMessage(`${targetCard.name}을(를) ${transformed.name}(으)로 변환했습니다.`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
  };

  const applySelectedCardTicket = (
    card: Card,
    area: "inventory" | "floor" | "deck",
    deckId?: string,
    targetCardId = card.id,
  ) => {
    if (pendingCloneTicketId) {
      cloneCardWithTicket(card);
      return true;
    }
    if (pendingPaintTicketId && area === "deck" && deckId) {
      paintDeckCard(targetCardId, pendingPaintTicketId, deckId);
      return true;
    }
    if (pendingExtractTicketId && area === "deck" && deckId) {
      extractDeckCardWithTicket(targetCardId, deckId, pendingExtractTicketId);
      return true;
    }
    if (pendingTransformTicketId) {
      transformCardWithTicket(card, area, deckId);
      return true;
    }
    return false;
  };

  const transformConsumableWithTicket = (targetId: string) => {
    if (!pendingTransformTicketId || targetId === pendingTransformTicketId) return;
    const sourceTicket = findTicketById(pendingTransformTicketId, "transformTicket");
    const target = findTicketById(targetId);
    if (!sourceTicket || !target || target.id === sourceTicket.id || target.type === "cardPack") return;
    const candidates = CONSUMABLE_TYPES.filter((type) => type !== target.type);
    const transformed = nextConsumable(randomItem(candidates));
    if (!consumeTicketById(sourceTicket.id, "transformTicket")) return;
    if (inventoryConsumablesRef.current.some((item) => item.id === targetId)) {
      const nextInventory = inventoryConsumablesRef.current.map((item) => item.id === targetId ? transformed : item);
      inventoryConsumablesRef.current = nextInventory;
      setInventoryConsumables(nextInventory);
    }
    const roomKey = mapRoomKey(mapPosition);
    setRoomConsumableDrops((current) => ({
      ...current,
      [roomKey]: (current[roomKey] ?? []).map((item) => item.id === targetId ? transformed : item),
    }));
    setPendingTransformTicketId(null);
    setDeckEditorMessage(`${target.name}을(를) ${transformed.name}(으)로 변환했습니다.`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
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
    deckEditorHighRarityInsertionOriginsRef.current = {};
    setPendingPaintTicketId(null);
    setPendingCloneTicketId(null);
    setPendingExtractTicketId(null);
    setPendingTransformTicketId(null);
    setArmedBombTicketIds(new Set());
    setPendingRemovedCards([]);
    setPendingRemovedCardAreas({});
    setDeckEditorReleasedCardIds(new Set());
    setTransformedCardNewIds(new Set());
    setHoveredDeckCard(null);
    clearCardKeywordHover();
    setDeckEditorDeckId(activeDeck?.id ?? "");
    beginDeckEditorSession({
      roomKey,
      decks: ownedDecks,
      activeDeckId,
      inventory: inventoryCards,
      consumables: inventoryConsumables,
      floorCards: roomDrops[roomKey] ?? [],
      floorConsumables: roomConsumableDrops[roomKey] ?? [],
      floorDecks: roomDeckDrops[roomKey] ?? [],
    });
    setDeckEditorMessage(message);
  };

  const confirmDeckEditor = () => {
    if (deckEditorInventoryItemCount > inventoryCapacity) {
      setDeckEditorMessage(`카드와 소모품을 합쳐 ${inventoryCapacity}개 이하로 줄여야 편집을 확인할 수 있습니다.`);
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
    deckEditorHighRarityInsertionOriginsRef.current = {};
    finishDeckEditorSession();
    setPendingRemovedCards([]);
    setPendingRemovedCardAreas({});
    setDeckEditorReleasedCardIds(new Set());
    setTransformedCardNewIds(new Set());
    setHoveredDeckCard(null);
    clearCardKeywordHover();
    setPendingPaintTicketId(null);
    setPendingCloneTicketId(null);
    setPendingExtractTicketId(null);
    setPendingTransformTicketId(null);
    setArmedBombTicketIds(new Set());
    queueRunSave();
  };

  useMapKeyboardShortcuts({
    playerNameSetupOpen,
    deckEditorOpen,
    confirmDeckEditor,
    escapeTargets: [
      { open: cardPoolStatsOpen, close: () => setCardPoolStatsOpen(false) },
      { open: deckViewerOpen, close: () => setDeckViewerOpen(false) },
      { open: treasureChestReward !== null, close: () => setTreasureChestReward(null) },
      { open: shrineOpen, close: () => setShrineOpen(false) },
      { open: transformShrineOpen, close: () => setTransformShrineOpen(false) },
      { open: combinationShrineOpen, close: () => setCombinationShrineOpen(false) },
      { open: blessingOpen, close: () => setBlessingOpen(false) },
      { open: shopOpen, close: () => setShopOpen(false) },
      { open: openedCardPack !== null, close: () => setOpenedCardPack(null) },
    ],
    screen,
    mapTraveling,
    deckViewerOpen,
    handleGoldDebugClick,
    openDeckEditor,
    quickPickUpFloorItems,
    waitOnMap,
    roomType: effectiveRoomType(mapPosition),
    roomActions: {
      shop: () => openShop(mapRoomKey(mapPosition), getRegionNumber(mapPosition, mapSeed)),
      shrine: openShrine,
      recoveryShrine: useCurrentRecoveryShrine,
      vitalityShrine: useCurrentVitalityShrine,
      mindEyeShrine: useCurrentMindEyeShrine,
      transformShrine: openTransformShrine,
      combinationShrine: openCombinationShrine,
      treasureChest: openTreasureChest,
      blessing: openBlessings,
      portal: useCurrentPortal,
      safePortal: useCurrentPortal,
      heal: useCurrentHeal,
    },
    changeMapZoom,
    resetMapZoom,
    handleMapMovementKeyDown,
    handleMapMovementKeyUp,
    clearMapKeyboardMovement,
  });

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

    const cardsToAnimate = game.hand
      .filter((card) => origins.has(card.id) && handCardRefs.current.has(card.id))
      .slice(0, 9);
    let finishDelay = 0;
    cardsToAnimate.forEach((card, index) => {
      const source = origins.get(card.id)!;
      const target = handCardRefs.current.get(card.id)!;
      const delay = index * 50;
      if (pendingEnemyTokenIdsRef.current.has(card.id)) {
        target.style.zIndex = String(20 + index);
        animateEnemyCardDelivery(target, source, delay);
        finishDelay = Math.max(finishDelay, 860 + delay);
        return;
      }
      finishDelay = Math.max(finishDelay, 320 + delay);
      const targetRect = target.getBoundingClientRect();
      target.style.zIndex = String(20 + index);
      target.animate(
        [
          {
            transform: `translate(${source.left - targetRect.left}px, ${source.top - targetRect.top}px) rotate(-3deg) scale(.94)`,
            opacity: .72,
            boxShadow: "0 2px 4px rgba(0,0,0,.28)",
          },
          {
            transform: "translate(0, 0) rotate(0deg) scale(1)",
            opacity: 1,
            boxShadow: "0 7px 14px rgba(0,0,0,.3)",
          },
        ],
        {
          duration: 300,
          delay,
          easing: "cubic-bezier(.2,.72,.25,1)",
          fill: "backwards",
        },
      );
    });

    origins.clear();
    pendingEnemyTokenIdsRef.current.clear();
    const timer = window.setTimeout(() => {
      handCardRefs.current.forEach((element) => { element.style.zIndex = ""; });
      if (!game.clearPlan) setPhase("playing");
    }, finishDelay);
    return () => window.clearTimeout(timer);
  }, [game.hand, game.clearPlan]);

  useLayoutEffect(() => {
    if (screen !== "battle" || pendingPileTokenSourcesRef.current.size === 0) return;
    pendingPileTokenSourcesRef.current.forEach((enemyId, cardId) => {
      const source = document.querySelector<HTMLElement>(`[data-enemy-id="${enemyId}"]`);
      const target = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
      if (!source || !target) return;
      target.style.zIndex = "60";
      const animation = animateEnemyCardDelivery(target, source.getBoundingClientRect());
      if (animation) {
        animation.finished.then(
          () => { target.style.zIndex = ""; },
          () => { target.style.zIndex = ""; },
        );
      } else {
        target.style.zIndex = "";
      }
      pendingPileTokenSourcesRef.current.delete(cardId);
    });
  }, [screen, game.piles]);

  const defeatEnemiesForDebug = () => {
    if (!debugMode || game.status !== "playing") return;
    clearBattleTimers();
    grantBattleReward(battleRewardRegionRef.current);
    setPhase("playing");
    setGame((current) => current.status !== "playing"
      ? current
      : {
          ...current,
          enemies: current.enemies.map((enemy) => ({ ...enemy, hp: 0 })),
          pendingDraws: 0,
          pendingPileDrawCount: 0,
          pendingDashRandomDraws: 0,
          pendingResearchDraw: null,
          astronomyResearchUses: 0,
          necromancyResearchUses: 0,
          pendingDiscards: 0,
          pendingSweep: false,
          status: "won",
          message: "디버그 모드: 적을 즉시 처치했습니다.",
        });
  };

  const resolvePlayedCard = (card: Card, targetEnemyId?: string) => createResolvePlayedCard({
    setGame,
    game,
    phase,
    blessings,
    setAnimatedEnemyHp,
    later,
    showEnemyPopup,
    setDyingEnemyIds,
    setPhase,
    grantBattleReward,
    battleRewardRegionRef,
    maxPlayerHp,
    oneUpUsedRef,
    setOneUpUsed,
    captureDrawOrigins,
    nextCardIdRef,
    lowestHealthEnemy,
    isStarterOrBasicCard,
  })(card, targetEnemyId);

  const playCard = (card: Card, targetEnemyId?: string) => {
    const sourceCard = handCardRefs.current.get(card.id);
    const energyCost = cardEnergyCost(
      card,
      game.activeRuleCards.filter((ruleCard) => ruleCard.effect === "lawResearch").length,
      game.forgeCount,
    );
    const shouldAnimate = sourceCard
      && screen === "battle"
      && phase === "playing"
      && game.status === "playing"
      && !UNPLAYABLE_CARD_EFFECTS.has(card.effect)
      && energyCost !== undefined
      && canPayEnergyCost(
        game.energy,
        energyCost,
        game.activeRuleCards.filter((ruleCard) => ruleCard.effect === "economicsResearch").length,
      );
    const canLogPlayedCard = shouldAnimate
      && game.pendingDraws === 0
      && game.pendingPileDrawCount === 0
      && game.pendingDiscards === 0
      && game.pendingResearchDraw === null
      && !game.pendingSweep
      && game.hand.some((item) => item.id === card.id);
    if (canLogPlayedCard) recordTelemetryCardPlayed(telemetry, telemetryCardSnapshot(card));
    if (!shouldAnimate) {
      resolvePlayedCard(card, targetEnemyId);
      return;
    }
    const flightDuration = animatePlayedCardToCenter(sourceCard);
    if (flightDuration === 0) {
      resolvePlayedCard(card, targetEnemyId);
      return;
    }
    setSelectedHandCardId(null);
    setPhase("resolving");
    later(() => {
      setPhase("playing");
      resolvePlayedCard(card, targetEnemyId);
    }, flightDuration);
  };

  const startResearchDraw = (research: "astronomy" | "necromancy") => {
    if (phase !== "playing" || game.status !== "playing") return;
    const researchEffect = research === "astronomy" ? "astronomyResearch" : "necromancyResearch";
    const researchCost = research === "astronomy" ? 2 : 3;
    const canOpenResearch = game.pendingResearchDraw === null
      && game.activeRuleCards.filter((card) => card.effect === researchEffect).length
        > (research === "astronomy" ? game.astronomyResearchUses : game.necromancyResearchUses)
      && game.stars >= researchCost
      && (research === "astronomy" ? game.piles.some((pile) => pile.length > 0) : game.discard.length > 0);
    setGame((current) => {
      if (current.status !== "playing" || current.pendingResearchDraw !== null) return current;
      const effect = researchEffect;
      const availableUses = current.activeRuleCards.filter((card) => card.effect === effect).length;
      const usedUses = research === "astronomy" ? current.astronomyResearchUses : current.necromancyResearchUses;
      const cost = research === "astronomy" ? 2 : 3;
      const hasCards = research === "astronomy"
        ? current.piles.some((pile) => pile.length > 0)
        : current.discard.length > 0;
      if (availableUses <= usedUses) {
        return { ...current, message: "이 연구 룰은 이번 턴에 더 사용할 수 없습니다." };
      }
      if (current.stars < cost) {
        return { ...current, message: `${research === "astronomy" ? "천문학" : "강령학"} 연구: ★${cost}가 필요합니다.` };
      }
      if (!hasCards) {
        return { ...current, message: research === "astronomy" ? "파일에 뽑을 카드가 없습니다." : "버린 카드가 없습니다." };
      }
      return {
        ...current,
        stars: current.stars - cost,
        pendingResearchDraw: research,
        message: research === "astronomy"
          ? "천문학 연구: 드로우할 파일을 선택하세요."
          : "강령학 연구: 버린 카드에서 카드를 손패로 드래그하세요.",
      };
    });
    if (canOpenResearch) setBattleCardView(research === "necromancy" ? "discard" : null);
  };

  const drawAstronomyResearchCard = (pileIndex: number, allowAutoPay = false) => createDrawAstronomyResearchCard({
    game,
    phase,
    setGame,
    captureDrawOrigins,
    setPhase,
    canUseResearchDraw,
  })(pileIndex, allowAutoPay);

  const retrieveNecromancyResearchCard = (cardId: number, allowAutoPay = false) => {
    setGame((current) => {
      const isPendingResearch = current.pendingResearchDraw === "necromancy";
      const isDirectResearch = allowAutoPay && current.pendingResearchDraw === null;
      if ((!isPendingResearch && !isDirectResearch) || phase !== "playing" || current.status !== "playing") return current;
      if (isDirectResearch && !canUseResearchDraw(current, "necromancy")) {
        return {
          ...current,
          message: current.activeRuleCards.some((card) => card.effect === "necromancyResearch")
            ? current.stars < 3
              ? "강령학 연구: ★★★가 필요합니다."
              : current.necromancyResearchUses >= current.activeRuleCards.filter((card) => card.effect === "necromancyResearch").length
                ? "강령학 연구는 이번 턴에 더 사용할 수 없습니다."
                : "버린 카드가 없습니다."
            : "강령학 연구 룰을 먼저 사용하세요.",
        };
      }
      const card = current.discard.find((item) => item.id === cardId);
      if (!card) return current;
      const action = `강령학 연구: ${card.name} 드로우`;
      return {
        ...current,
        stars: current.stars - (isDirectResearch ? 3 : 0),
        discard: current.discard.filter((item) => item.id !== cardId),
        hand: [...current.hand, { ...card, revealed: true }],
        pendingResearchDraw: null,
        necromancyResearchUses: current.necromancyResearchUses + 1,
        message: action,
      };
    });
    setBattleCardView(null);
  };

  const playHandCardOnDoubleClick = (card: Card) => {
    // During a forced discard, the ordinary click is the card-selection input.
    if (game.pendingDiscards > 0) return;
    const targetEnemy = isAttackCard(card)
      ? game.enemies.find((enemy) => enemy.hp > 0)
      : undefined;
    playCard(card, targetEnemy?.id);
  };

  const canUseCardOnCenter = (card: Card | undefined) => Boolean(
    card
    && card.kind !== "strike"
    && card.effect !== "doubleHit"
    && !UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    && !["slime", "combatManual", "grimoire"].includes(card.effect)
  );

  const playSelectedHandCardOnCenter = () => {
    if (
      screen !== "battle"
      || phase !== "playing"
      || game.status !== "playing"
      || selectedHandCardId === null
      || game.pendingDraws > 0
      || game.pendingPileDrawCount > 0
      || game.pendingDiscards > 0
      || game.pendingSweep
      || game.pendingResearchDraw !== null
    ) return;
    const card = game.hand.find((item) => item.id === selectedHandCardId);
    if (!card || !canUseCardOnCenter(card)) return;
    setSelectedHandCardId(null);
    playCard(card);
  };

  const playSelectedHandCardOnEnemy = (enemyId: string) => {
    if (screen !== "battle" || phase !== "playing" || game.status !== "playing" || selectedHandCardId === null) return;
    const card = game.hand.find((item) => item.id === selectedHandCardId);
    if (!card || !isAttackCard(card)) return;
    setSelectedHandCardId(null);
    playCard(card, enemyId);
  };

  const drawSelectedPile = (pileIndex: number) => createDrawSelectedPile({
    game,
    phase,
    setGame,
    pendingOriginsRef,
    setPhase,
  })(pileIndex);

  const discardSelectedCard = (cardId: number) => {
    setGame((current) => {
      if (current.pendingDiscards < 1 || current.pendingResearchDraw !== null || phase !== "playing") return current;
      const card = current.hand.find((item) => item.id === cardId);
      if (!card) return current;
      const remainingDiscards = current.pendingDiscards - 1;
      const action = remainingDiscards > 0
        ? `${card.name} 버림 · ${remainingDiscards}장 더 선택하세요.`
        : `${card.name} 버림`;
      return {
        ...current,
        hand: current.hand.filter((item) => item.id !== cardId),
        discard: [...current.discard, card],
        pendingDiscards: current.pendingDiscards - 1,
        message: action,
      };
    });
  };

  const takeSelectedPile = (pileIndex: number) => {
    if (!game.pendingSweep || game.pendingResearchDraw !== null || phase !== "playing" || game.status !== "playing") return;
    const pile = game.piles[pileIndex];
    if (!pile?.length) return;
    setGame((current) => {
      const currentPile = current.piles[pileIndex] ?? [];
      if (!current.pendingSweep || current.pendingResearchDraw !== null || !currentPile.length) return current;
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
      };
    });
  };

  const moveCardToPile = (drag: DragState, targetPileIndex: number) => createMoveCardToPile({
    setGame,
    phase,
    blessings,
    grantBattleReward,
    battleRewardRegionRef,
    lowestHealthEnemy,
  })(drag, targetPileIndex);

  const moveSelectedHandCardToPile = (targetPileIndex: number) => {
    if (
      selectedHandCardId === null ||
      game.status !== "playing" ||
      game.pendingDraws > 0 ||
      game.pendingPileDrawCount > 0 ||
      game.pendingDiscards > 0 ||
      game.pendingSweep ||
      game.pendingResearchDraw !== null ||
      phase !== "playing"
    ) return false;
    const card = game.hand.find((item) => item.id === selectedHandCardId);
    if (!card) return false;
    const targetCard = game.piles[targetPileIndex]?.at(-1);
    const canPlace = Boolean(game.piles[targetPileIndex])
      && !blessings.includes("starlessAge")
      && game.stars >= 1
      && canPlaceBySolitaireRule(card, targetCard);
    const selectedDrag: DragState = {
      card,
      cards: [card],
      source: { type: "hand" },
      x: 0,
      y: 0,
      moved: true,
    };
    moveCardToPile(selectedDrag, targetPileIndex);
    if (canPlace) setSelectedHandCardId(null);
    return true;
  };

  const { beginDrag, moveDrag, finishDrag, cancelDrag } = useBattlePointerInput({
    interaction: battleInteraction,
    game,
    phase,
    pileScrollRef,
    setGame,
    onClearPreviews: () => {
      clearCardKeywordHover();
      setHoveredDeckCard(null);
      setHoveredConsumable(null);
      setHoveredDeckEditionTooltip(null);
    },
    onMoveCardToPile: moveCardToPile,
    onPlayCard: playCard,
    onResearchDraw: drawAstronomyResearchCard,
  });

  const endTurn = () => createEndTurn({
    game,
    phase,
    handCardRefs,
    setPhase,
    setDragging,
    later,
    blessings,
    oneUpUsedRef,
    maxPlayerHp,
    setOneUpUsed,
    setGame,
    drawCards,
    telemetry,
    setDamagePopup,
    setAttackingEnemyId,
    grantBattleReward,
    battleRewardRegionRef,
    maximumEnergyForGame,
    animateCardToPlayer,
  })();

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
    game.pendingSweep ||
    game.pendingResearchDraw !== null;
  const cardWatermarkVariables = {
    "--battle-card-color": battleThemeColors.card,
    "--battle-card-text-color": battleThemeColors.cardText,
    "--battle-card-border-color": battleThemeColors.cardBorder,
    "--battle-cost-color": battleThemeColors.cost,
    "--battle-cost-text-color": battleThemeColors.costText,
    "--battle-basic-band-color": battleThemeColors.basicBand,
    "--battle-special-band-color": battleThemeColors.specialBand,
    "--battle-physical-color": battleThemeColors.physical,
    "--battle-magic-color": battleThemeColors.magic,
    "--card-watermark-opacity": cardWatermarkOpacity,
    "--card-watermark-size": `${cardWatermarkSize}%`,
    "--card-watermark-x": `${cardWatermarkX}%`,
    "--card-watermark-y": `${cardWatermarkY}%`,
    ...(constellationPreviewIndex === null ? {} : {
      "--card-watermark-preview-image": constellationPresetCssImage(
        CONSTELLATION_PRESETS[constellationPreviewIndex],
        battleThemeColors.card,
      ),
    }),
  } as CSSProperties;
  const combatManualBonus = game.hand
    .filter((card) => card.effect === "combatManual")
    .reduce((total, card) => total + card.value, 0);
  const backToBasicsBonus = (card: Card) => blessings.includes("backToBasics") && isStarterOrBasicCard(card) ? 4 : 0;
  const lawResearchCount = game.activeRuleCards
    .filter((card) => card.effect === "lawResearch")
    .length;

  if (screen === "map") {
    const currentRoomKey = mapRoomKey(mapPosition);
    const currentRoomType = effectiveRoomType(mapPosition);
    const inSafeArea = isSafeAreaPosition(mapPosition, mapSeed);
    const usesSafeAreaDeckRules = inSafeArea
      ? isSafeAreaEditAllowed(mapPosition, mapSeed, defeatedBossRegions)
      : blessings.includes("forbiddenKnowledge");
    const safeAreaRegionIndex = inSafeArea ? getSafeAreaRegionIndex(mapPosition, mapSeed) : null;
    const safeAreaMemoryRestricted = safeAreaRegionIndex !== null && isSafeAreaSealed(safeAreaRegionIndex);
    const canEditDeck = true;
    const viewedDeck = ownedDecks.find((deck) => deck.id === deckViewerDeckId) ?? activeDeck;
    const currentFloorCards = roomDrops[currentRoomKey] ?? [];
    const currentFloorConsumables = roomConsumableDrops[currentRoomKey] ?? [];
    const currentFloorDecks = roomDeckDrops[currentRoomKey] ?? [];
    const hasRoomActionNotice = Boolean(mapMessage && !deckEditorOpen)
      || ["shop", "shrine", "recoveryShrine", "vitalityShrine", "mindEyeShrine", "transformShrine", "combinationShrine", "treasureChest", "boss", "blessing", "portal", "safePortal", "heal"].includes(currentRoomType)
      || currentFloorCards.length > 0
      || currentFloorConsumables.length > 0
      || currentFloorDecks.length > 0;
    const cardRarityRank = (card: Card) => CARD_RARITY_SORT_RANK[card.rarity];
    const cardSortCost = (card: Card) => UNPLAYABLE_CARD_EFFECTS.has(card.effect)
      ? -1
      : card.effect === "ironWall" ? IRON_WALL_COST : card.cost ?? -1;
    const inventoryCardGroups = groupAndSortDeckEditorCards(inventoryCards, deckEditorSort, transformedCardNewIds);
    const floorCardGroups = groupAndSortDeckEditorCards(currentFloorCards, deckEditorSort, transformedCardNewIds);
    const removedInventoryCardGroups = groupAndSortDeckEditorCards(
      pendingRemovedCards.filter((card) => pendingRemovedCardAreas[card.id] === "inventory"),
      deckEditorSort,
      transformedCardNewIds,
    );
    const removedFloorCardGroups = groupAndSortDeckEditorCards(
      pendingRemovedCards.filter((card) => pendingRemovedCardAreas[card.id] !== "inventory"),
      deckEditorSort,
      transformedCardNewIds,
    );
    const isConsumableSelected = (consumable: Consumable) => (
      pendingPaintTicketId === consumable.id
      || pendingCloneTicketId === consumable.id
      || pendingExtractTicketId === consumable.id
      || pendingTransformTicketId === consumable.id
      || consumable.armedMovesRemaining !== undefined
    );
    const inventoryConsumableGroups = sortConsumableGroupsByTier(groupConsumables(inventoryConsumables));
    const floorConsumableGroups = groupConsumables(currentFloorConsumables);
    const deckViewerCards = [...(viewedDeck?.cards ?? [])].sort((left, right) => {
      const primary = deckViewerSort === "cost"
        ? cardSortCost(left) - cardSortCost(right)
        : cardRarityRank(left) - cardRarityRank(right);
      const secondary = deckViewerSort === "cost"
        ? cardRarityRank(left) - cardRarityRank(right)
        : cardSortCost(left) - cardSortCost(right);
      return primary || secondary || left.name.localeCompare(right.name, "ko");
    });
    const floorItemNames = [
      ...currentFloorCards.map((card) => card.name),
      ...currentFloorConsumables.map((consumable) => consumable.name),
      ...currentFloorDecks.map((deck) => `덱 '${deck.name}'`),
    ];
    const quickPickUpFirstCard = currentFloorCards[0];
    const quickPickUpFirstName = floorItemNames[0] ?? "물건";
    const activeShopOffers = activeShopRoom ? roomShops[activeShopRoom] ?? [] : [];
    return (
      <main
        className={`game-shell map-shell card-style-simple watermark-${cardWatermarkStyle} ${constellationPreviewIndex === null ? "" : "is-previewing-constellation"}`}
        style={cardWatermarkVariables}
      >
        <span
          className="game-version"
          aria-label={`게임 버전 ${GAME_VERSION}, 커밋 ${COMMIT_HASH}, 커밋 시각 ${COMMIT_DATE}`}
        >
          {GAME_VERSION} · {COMMIT_HASH} · {COMMIT_DATE}
        </span>
        {hoveredDeckEditionTooltip && (
          <aside
            className="deck-edition-tooltip-floating"
            style={{
              left: hoveredDeckEditionTooltip.x,
              top: hoveredDeckEditionTooltip.y,
              width: hoveredDeckEditionTooltip.width,
            }}
            role="tooltip"
          >
            <strong>{DECK_EDITION_INFO[hoveredDeckEditionTooltip.edition].name}</strong>
            <span>{DECK_EDITION_INFO[hoveredDeckEditionTooltip.edition].description}</span>
          </aside>
        )}
        {hoveredBlessingTooltip && (
          <aside
            className="deck-edition-tooltip-floating blessing-tooltip-floating"
            style={{
              left: hoveredBlessingTooltip.x,
              top: hoveredBlessingTooltip.y,
              width: hoveredBlessingTooltip.width,
            }}
            role="tooltip"
          >
            <strong>{hoveredBlessingTooltip.name}</strong>
            <span>{hoveredBlessingTooltip.description}</span>
          </aside>
        )}
        {resetHoldProgress > 0 && (
          <div className="save-reset-hold" role="status">
            <strong>새 탐험 초기화</strong>
            <span>R을 계속 누르세요 · {Math.ceil(RESET_HOLD_DURATION_MS / 1000 * (1 - resetHoldProgress))}초</span>
            <i style={{ width: `${resetHoldProgress * 100}%` }} />
          </div>
        )}
        {!saveReady && (
          <div className="player-name-overlay save-loading-overlay" role="status" aria-live="polite">
            <div className="save-loading-dialog">탐험을 불러오는 중...</div>
          </div>
        )}
        {saveReady && playerNameSetupOpen && (
          <div className="player-name-overlay" role="dialog" aria-modal="true" aria-labelledby="player-name-title">
            <form
              className="player-name-dialog"
              onSubmit={(event) => {
                event.preventDefault();
                if (!playerName.trim()) return;
                const trimmedPlayerName = playerName.trim();
                setPlayerName(trimmedPlayerName);
                setOwnedDecks((current) => current.map((deck) => deck.id === "starter" && !deck.name
                  ? { ...deck, name: createDeckName() }
                  : deck));
                beginTelemetryRun(telemetry, {
                  playerName: trimmedPlayerName,
                  mapSeed: String(mapSeed),
                  startingDecks: ownedDecks.map(telemetryDeckSnapshot),
                  activeDeckId,
                });
                setPlayerNameSetupOpen(false);
              }}
            >
              <p>새 탐험</p>
              <h2 id="player-name-title">이름을 정하세요</h2>
              <input
                type="text"
                value={playerName}
                maxLength={16}
                onChange={(event) => setPlayerName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                aria-label="플레이어 이름"
              />
              <button
                type="button"
                className="player-name-reroll"
                onClick={() => setPlayerName(createRandomPlayerName())}
              >
                ↻ 랜덤 이름 리롤
              </button>
              <button type="submit" disabled={!playerName.trim()}>탐험 시작</button>
            </form>
          </div>
        )}
        {pendingBattleStart && (
          <BattleDeckCheckModal
            decks={ownedDecks}
            activeDeckId={activeDeck?.id}
            previewDeckId={battleDeckPreviewId}
            sort={deckEditorSort}
            transformedCardNewIds={transformedCardNewIds}
            onSelectDeck={setBattleDeckPreviewId}
            onEditionTooltipHover={showDeckEditionTooltip}
            onEditionTooltipLeave={() => setHoveredDeckEditionTooltip(null)}
            onConfirm={confirmBattleDeck}
          />
        )}
        <CardKeywordPopover popover={hoveredCardKeywords} popoverRef={cardKeywordPopoverRef} />
        <MapTopbar
          runPlayerHp={runPlayerHp}
          maxPlayerHp={maxPlayerHp}
          gold={gold}
          deckCardCount={deckCards.length}
          mapTraveling={mapTraveling}
          canEditDeck={canEditDeck}
          onGoldDebugClick={handleGoldDebugClick}
          onOpenDeckViewer={() => {
            setDeckViewerDeckId(activeDeck?.id ?? "");
            setDeckViewerOpen(true);
          }}
          onWait={waitOnMap}
          onEditDeck={() => openDeckEditor(usesSafeAreaDeckRules
            ? "덱 카드를 인벤토리로 회수할 수 있습니다. 희귀도에 따라 골드를 냅니다."
            : "좌클릭: 바닥 → 인벤토리 → 덱. 덱 카드 우클릭·바닥 드래그: 제거 예정 상태")}
        />
        {telemetryMessage && <span className="telemetry-status" role="status" aria-live="polite">{telemetryMessage}</span>}
        {(blessings.length > 0 || mindEyeMovesRemaining > 0 || godsLamentCharges > 0 || darkTicketTurnsRemaining > 0) && (
          <aside className="map-blessing-list" aria-label="획득한 축복">
            {blessings.map((blessing) => (
              <span
                key={blessing}
                tabIndex={0}
                onMouseEnter={(event) => showBlessingTooltip(event, blessing)}
                onMouseMove={(event) => showBlessingTooltip(event, blessing)}
                onMouseLeave={() => setHoveredBlessingTooltip(null)}
                onFocus={(event) => showBlessingTooltip(event, blessing)}
                onBlur={() => setHoveredBlessingTooltip(null)}
                aria-label={`${BLESSING_INFO[blessing].name}: ${BLESSING_INFO[blessing].description}`}
              >
                {BLESSING_INFO[blessing].name}{blessing === "oneUp" && oneUpUsed ? " (비활성)" : ""}
              </span>
            ))}
            {mindEyeMovesRemaining > 0 && (
              <span key="mind-eye" aria-label={`심안, ${mindEyeMovesRemaining}`}>
                심안({mindEyeMovesRemaining})
              </span>
            )}
            {godsLamentCharges > 0 && (
              <span
                key="gods-lament"
                tabIndex={0}
                onMouseEnter={(event) => showBlessingTooltip(event, {
                  name: "신들의 비탄",
                  description: "다음 전투하는 모든 적의 체력을 30% 감소시킵니다. 전투마다 1회 소모됩니다.",
                })}
                onMouseMove={(event) => showBlessingTooltip(event, {
                  name: "신들의 비탄",
                  description: "다음 전투하는 모든 적의 체력을 30% 감소시킵니다. 전투마다 1회 소모됩니다.",
                })}
                onMouseLeave={() => setHoveredBlessingTooltip(null)}
                onFocus={(event) => showBlessingTooltip(event, {
                  name: "신들의 비탄",
                  description: "다음 전투하는 모든 적의 체력을 30% 감소시킵니다. 전투마다 1회 소모됩니다.",
                })}
                onBlur={() => setHoveredBlessingTooltip(null)}
                aria-label={`신들의 비탄, ${godsLamentCharges}: 다음 전투하는 모든 적의 체력을 30% 감소시킵니다. 전투마다 1회 소모됩니다.`}
              >
                신들의 비탄({godsLamentCharges})
              </span>
            )}
            {darkTicketTurnsRemaining > 0 && (
              <span key="dark-ticket" aria-label={`어둠, ${darkTicketTurnsRemaining}`}>
                어둠({darkTicketTurnsRemaining})
              </span>
            )}
          </aside>
        )}

        <MapBoard
          world={{
            position: mapPosition,
            seed: mapSeed,
            seenRooms,
            enemyWorld: mapEnemyWorld,
            enemyCellMemory: mapEnemyCellMemory,
            bombs: mapBombs,
            collisionEnemyIds: mapCollisionEnemyIds,
            battleFlash: mapBattleFlash,
            waitNoticeNonce: mapWaitNoticeNonce,
            travelLocked: mapTraveling,
            travelStepMs: mapTravelStepMs,
            debugMode,
            safeAreaRegionIndex,
            safeAreaMemoryRestricted,
            visionHorizontalRadius,
            visionVerticalRadius,
            roomDrops,
            roomConsumableDrops,
            roomDeckDrops,
          }}
          camera={mapCamera}
          debugTools={{
            spawnSelection: debugSpawnSelection,
            deckRegion: debugDeckRegion,
            deckCount: debugDeckCount,
            onSpawnSelectionChange: setDebugSpawnSelection,
            onDeckRegionChange: setDebugDeckRegion,
            onDeckCountChange: setDebugDeckCount,
            onSpawnItem: spawnDebugItemOnFloor,
            onGenerateDecks: generateDebugRegionDecksOnFloor,
            onOpenCardStats: () => setCardPoolStatsOpen(true),
          }}
          effectiveRoomType={effectiveRoomType}
          onClearMessage={() => setMapMessage("")}
          onMove={moveOnMap}
          onDebugTeleport={(position) => {
            setMapPosition(position);
            const revealedWorld = materializeVisibleMapContent(position, mapSeed, mapEnemyWorld);
            setMapEnemyWorld(revealedWorld);
            rememberPlayerVision(position, mapSeed, revealedWorld.enemies, mapEnemyWorld.enemies);
            focusMapOn(position);
            activateRoomFeature(position);
          }}
          onTravel={travelSafePath}
        >
          {cardPoolStatsOpen && <CardPoolStatsPanel onClose={() => setCardPoolStatsOpen(false)} />}
          <MapDeckSelector
            ownedDecks={ownedDecks}
            activeDeck={activeDeck}
            noticeVisible={hasRoomActionNotice}
            open={deckSelectorOpen}
            closing={deckSelectorClosing}
            closingDeckId={deckSelectorClosingDeckId}
            selectionAttention={deckSelectionAttention}
            onToggle={() => {
              setDeckSelectionAttention(false);
              toggleDeckSelector();
            }}
            onSelectDeck={(deck) => {
              if (deck.id !== activeDeck?.id) setDeckSelectionAttention(true);
              setActiveDeckId(deck.id);
              closeDeckSelector(deck.id);
            }}
          />
          <MapRoomActions
            roomType={currentRoomType}
            message={mapMessage && !deckEditorOpen ? mapMessage : ""}
            messageNonce={mapMessageNonce}
            quickPickup={(currentFloorCards.length > 0 || currentFloorConsumables.length > 0 || currentFloorDecks.length > 0) && canEditDeck
              ? {
                firstCard: quickPickUpFirstCard,
                firstName: quickPickUpFirstName,
                itemCount: floorItemNames.length,
              }
              : null}
            onEnterShop={() => openShop(mapRoomKey(mapPosition), getRegionNumber(mapPosition, mapSeed))}
            onOpenShrine={openShrine}
            onUseRecoveryShrine={useCurrentRecoveryShrine}
            onUseVitalityShrine={useCurrentVitalityShrine}
            onUseMindEyeShrine={useCurrentMindEyeShrine}
            onOpenTransformShrine={openTransformShrine}
            onOpenCombinationShrine={openCombinationShrine}
            onOpenTreasureChest={openTreasureChest}
            onOpenBlessings={openBlessings}
            onUsePortal={useCurrentPortal}
            onUseHeal={useCurrentHeal}
            onQuickPickup={quickPickUpFloorItems}
          />
          <button
            type="button"
            className="telemetry-export-trigger map-telemetry-trigger"
            onClick={exportTelemetryLog}
            title="적별 피해 기록을 TXT 파일로 저장"
            aria-label="적별 피해 기록 TXT 저장"
          >
            <span aria-hidden="true">⇩</span>
            <span>기록 저장</span>
          </button>
          <label className="map-battle-check-toggle">
            <input
              type="checkbox"
              checked={battleDeckCheckEnabled}
              onChange={(event) => {
                const enabled = event.target.checked;
                setBattleDeckCheckEnabled(enabled);
                if (!enabled) {
                  setPendingBattleStart(null);
                  setBattleDeckPreviewId(null);
                  setDeckSelectionAttention(false);
                }
              }}
            />
            <span>잠깐!</span>
          </label>
        </MapBoard>

        <TreasureChestRewardModal
          reward={treasureChestReward}
          onClose={() => setTreasureChestReward(null)}
          CardFace={CardFace}
          showCardKeywordOnly={showCardKeywordOnly}
          setHoveredDeckCard={setHoveredDeckCard}
          clearCardKeywordHover={clearCardKeywordHover}
          consumableDescription={consumableDescription}
          showConsumablePreview={showConsumablePreview}
          setHoveredConsumable={setHoveredConsumable}
        />
        {shrineOpen && (
          <ExtractionShrineModal
            decks={ownedDecks}
            initialDeckId={activeDeck?.id ?? ""}
            onClose={() => setShrineOpen(false)}
            onExtract={extractCardsAtShrine}
            onEditionTooltipHover={showDeckEditionTooltip}
            onEditionTooltipLeave={() => setHoveredDeckEditionTooltip(null)}
          />
        )}

        <CardConversionShrineModal
          key={`transform-${transformShrineOpen}`}
          mode="transform"
          open={transformShrineOpen}
          inventoryCards={inventoryCards}
          onClose={() => setTransformShrineOpen(false)}
          onConfirm={transformCardsAtShrine}
        />
        <CardConversionShrineModal
          key={`combination-${combinationShrineOpen}`}
          mode="combination"
          open={combinationShrineOpen}
          inventoryCards={inventoryCards}
          onClose={() => setCombinationShrineOpen(false)}
          onConfirm={combineCardsAtShrine}
        />
        <BlessingModal
          open={blessingOpen}
          offers={blessingOffers}
          playerHp={runPlayerHp}
          maxPlayerHp={maxPlayerHp}
          rerollCost={blessingRerollCost}
          onClose={() => setBlessingOpen(false)}
          onChoose={chooseBlessing}
          onReroll={rerollBlessings}
        />
        <ShopModal
          open={shopOpen}
          gold={gold}
          offers={activeShopOffers}
          onClose={() => setShopOpen(false)}
          onBuy={buyShopOffer}
          CardFace={CardFace}
          showCardKeywordOnly={showCardKeywordOnly}
          setHoveredDeckCard={setHoveredDeckCard}
          clearCardKeywordHover={clearCardKeywordHover}
          consumableDescription={consumableDescription}
          showConsumablePreview={showConsumablePreview}
          setHoveredConsumable={setHoveredConsumable}
          hoveredConsumable={hoveredConsumable}
          consumableDragActive={consumableDragActive}
          deckPreviewPosition={deckPreviewPosition}
        />
        {deckEditorOpen && <DeckEditorModal
          header={{
            deckEditorErrorMessage,
            deckEditorSort,
            setDeckEditorSort,
            mapFeedback: { message: mapMessage, nonce: mapMessageNonce },
          }}
          inventoryArea={{
            deckEditorInventoryItemCount,
            inventoryCapacity,
            inventoryConsumableGroups,
            inventoryCardGroups: [
              ...removedInventoryCardGroups.map((group) => ({ ...group, pendingRemoval: true })),
              ...inventoryCardGroups,
            ],
            moveInventoryConsumableToFloor,
          }}
          deckArea={{
            maxOwnedDecks,
            ownedDecks,
            activeDeckId: activeDeck?.id,
            deckEditorDeckId,
            setDeckEditorDeckId,
            pickUpFloorDeck,
            swapOwnedDecks,
            dropOwnedDeck,
            rareSlotCountForDeck: (deck) => countRareSlotCards(deck.cards),
            canMoveDeckCardToInventory: isSafeAreaPosition(mapPosition, mapSeed)
              && isSafeAreaEditAllowed(mapPosition, mapSeed, defeatedBossRegions),
          }}
          floorArea={{
            currentFloorDecks,
            floorConsumableGroups,
            floorCardGroups: [
              ...removedFloorCardGroups.map((group) => ({ ...group, pendingRemoval: true })),
              ...floorCardGroups,
            ],
            moveFloorConsumableToInventory,
          }}
          ticketActions={{
            isConsumableSelected,
            consumableDescription,
            selectExtractionTicket,
            applySelectedCardTicket,
            canApplyTicketToCard: (ticketId, card, area, deck) =>
              canApplyTicketToCard(findTicketById(ticketId) ?? null, card, area, deck),
            applyTicketToCard,
            canApplyTicketToDeck,
            applyTicketToDeck,
          }}
          cardPreview={{
            hoveredDeckCard,
            deckPreviewPosition,
            consumablePreview: {
              hovered: hoveredConsumable,
              show: showConsumablePreview,
              clear: () => setHoveredConsumable(null),
            },
            moveDeckCardPreview,
            clearCardPreview: () => { setHoveredDeckCard(null); clearCardKeywordHover(); },
            editionTooltip: {
              show: showDeckEditionTooltip,
              clear: () => setHoveredDeckEditionTooltip(null),
            },
            showDeckCardPreview,
          }}
          behavior={{
            pendingRemovalBlinkDim,
            transformedCardNewIds,
            effectiveOriginDeckIdForCard,
            scrollDeckEditorCardsHorizontally,
            onMoveCard: moveDeckEditorCard,
            onEditorDragActivityChange: (kind, active) => {
              if (kind === "card") setDeckPreviewSuppressed(active);
              if (kind === "consumable") {
                setConsumableDragActive(active);
                if (active) clearFloatingTooltips();
              }
            },
            confirmDeckEditor,
          }}
        />}
        {openedCardPack && (
          <div className="shop-overlay" role="dialog" aria-modal="true" aria-label="카드 팩 개봉">
            <section className="card-pack-result">
              <header><div><p>CARD PACK</p><h2>카드 팩 개봉</h2></div><button type="button" onClick={() => setOpenedCardPack(null)}>확인</button></header>
              <div className="card-pack-cards">
                {openedCardPack.map((card) => (
                  <div
                    className={`card-face ${card.kind} ${card.damageType}`}
                    key={card.id}
                    onMouseEnter={(event) => {
                      const bounds = event.currentTarget.getBoundingClientRect();
                      showCardKeywordOnly(card, bounds.right, bounds.top);
                    }}
                    onMouseMove={(event) => {
                      const bounds = event.currentTarget.getBoundingClientRect();
                      showCardKeywordOnly(card, bounds.right, bounds.top);
                    }}
                    onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                  >
                    <CardFace card={card} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {deckViewerOpen && (
          <DeckViewerModal
            viewedDeck={viewedDeck}
            ownedDecks={ownedDecks}
            maxOwnedDecks={maxOwnedDecks}
            sort={deckViewerSort}
            cards={deckViewerCards}
            gridRef={deckViewerGridRef}
            onClose={() => setDeckViewerOpen(false)}
            onSelectDeck={setDeckViewerDeckId}
            onSortChange={setDeckViewerSort}
            onEditionTooltipHover={showDeckEditionTooltip}
            onEditionTooltipLeave={() => setHoveredDeckEditionTooltip(null)}
            onCardKeywordHover={showCardKeywordOnly}
            onClearCardKeywordHover={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
          />
        )}
      </main>
    );
  }

  const battleCardCollections = {
    deck: deckCards,
    piles: game.piles.flat(),
    discard: game.discard,
  };
  const battleCardViewCards = battleCardView ? battleCardCollections[battleCardView] : [];
  const battleCardViewGroups = Array.from(battleCardViewCards.reduce((groups, card) => {
    const key = `${card.name}:${card.effect}:${card.value}:${card.forgeCostsCompleted?.join(",") ?? ""}:${card.forged ? "forged" : "normal"}:${card.colored ? "colored" : "plain"}`;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
      current.cardIds.push(card.id);
    } else groups.set(key, { card, count: 1, cardIds: [card.id] });
    return groups;
  }, new Map<string, { card: Card; count: number; cardIds: number[] }>()).values());
  const draggedCard = dragging?.card;
  const selectedCenterCard = selectedHandCardId === null
    ? undefined
    : game.hand.find((card) => card.id === selectedHandCardId);
  const canShowSelectedCenterDrop = Boolean(
    screen === "battle"
    && phase === "playing"
    && game.status === "playing"
    && game.pendingDraws === 0
    && game.pendingPileDrawCount === 0
    && game.pendingDiscards === 0
    && !game.pendingSweep
    && game.pendingResearchDraw === null
    && canUseCardOnCenter(selectedCenterCard)
  );
  const canDropDraggedCardOnCenter = Boolean(
    dragging?.moved
    && dragging.source.type === "hand"
    && draggedCard
    && !UNPLAYABLE_CARD_EFFECTS.has(draggedCard.effect)
    && !["slime", "combatManual", "grimoire"].includes(draggedCard.effect)
    && (
      ((draggedCard.kind === "strike" || draggedCard.effect === "doubleHit")
        && game.enemies.some((enemy) => enemy.hp > 0))
      || draggedCard.effect === "ironRampage"
      || draggedCard.effect === "odinSpear"
      || draggedCard.kind !== "strike"
    )
  );
  const isCenterDropHover = (
    (canDropDraggedCardOnCenter && dragOverDropTarget === "defend")
    || (canShowSelectedCenterDrop && centerDropPointerHover)
  );

  return (
    <main
      className={`game-shell card-style-simple watermark-${cardWatermarkStyle} ${constellationPreviewIndex === null ? "" : "is-previewing-constellation"}`}
      style={cardWatermarkVariables}
    >
      <span
        className="game-version"
        aria-label={`게임 버전 ${GAME_VERSION}, 커밋 ${COMMIT_HASH}, 커밋 시각 ${COMMIT_DATE}`}
      >
        {GAME_VERSION} · {COMMIT_HASH} · {COMMIT_DATE}
      </span>
      {resetHoldProgress > 0 && (
        <div className="save-reset-hold" role="status">
          <strong>새 탐험 초기화</strong>
          <span>R을 계속 누르세요 · {Math.ceil(RESET_HOLD_DURATION_MS / 1000 * (1 - resetHoldProgress))}초</span>
          <i style={{ width: `${resetHoldProgress * 100}%` }} />
        </div>
      )}
      <section
        className={`battlefield ${dragging ? `${dragging.source.type === "hand" ? `dragging-${dragging.card.kind}` : "dragging-from-pile"} dragging-solitaire` : ""} ${canShowSelectedCenterDrop ? "has-keyboard-center-drop" : ""} ${isCenterDropHover ? "is-center-drop-hover" : ""}`}
        aria-label="전투 화면"
        onDragOver={(event) => {
          if (!researchDragActiveRef.current) return;
          // 연구 카드 드래그 중에는 전장을 유효한 이동 영역으로 유지해
          // 브라우저의 금지 커서가 나타나지 않게 한다. 실제 drop은 손패만 처리한다.
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setResearchDragPreview((current) => current
            ? { ...current, x: event.clientX, y: event.clientY }
            : current);
        }}
        style={{
          "--battle-board-color": battleThemeColors.board,
          "--battle-card-color": battleThemeColors.card,
          "--battle-card-text-color": battleThemeColors.cardText,
          "--battle-card-border-color": battleThemeColors.cardBorder,
          "--battle-card-back-color": battleThemeColors.cardBack,
          "--battle-cost-color": battleThemeColors.cost,
          "--battle-cost-text-color": battleThemeColors.costText,
          "--battle-energy-color": battleThemeColors.energy,
          "--battle-energy-empty-color": battleThemeColors.energyEmpty,
          "--battle-basic-band-color": battleThemeColors.basicBand,
          "--battle-special-band-color": battleThemeColors.specialBand,
          "--battle-physical-color": battleThemeColors.physical,
          "--battle-magic-color": battleThemeColors.magic,
        } as CSSProperties}
      >
        {researchDragPreview && (
          <div
            className="research-drag-preview"
            style={{
              left: researchDragPreview.x,
              top: researchDragPreview.y,
              width: researchDragPreview.width,
              height: researchDragPreview.height,
            }}
            aria-hidden="true"
          >
            <div
              className={`deck-editor-card battle-ledger-card rarity-${researchDragPreview.card.rarity} ${researchDragPreview.card.rarity === "legendary" ? "is-painted" : ""}`}
              style={{ width: "74px", height: "76px", margin: 0 }}
            >
              <DeckEditorCardIcon card={researchDragPreview.card} count={researchDragPreview.count} />
            </div>
          </div>
        )}
        <BattleThemeControls
          visible={debugMode}
          battleThemeColors={battleThemeColors}
          setBattleThemeColors={setBattleThemeColors}
          battleThemeDrafts={battleThemeDrafts}
          setBattleThemeDrafts={setBattleThemeDrafts}
          starOrbitStyle={starOrbitStyle}
          setStarOrbitStyle={setStarOrbitStyle}
          starOrbitSpeed={starOrbitSpeed}
          setStarOrbitSpeed={setStarOrbitSpeed}
          starPlaneSpeed={starPlaneSpeed}
          setStarPlaneSpeed={setStarPlaneSpeed}
          cardWatermarkStyle={cardWatermarkStyle}
          setCardWatermarkStyle={setCardWatermarkStyle}
          cardWatermarkOpacity={cardWatermarkOpacity}
          setCardWatermarkOpacity={setCardWatermarkOpacity}
          cardWatermarkSize={cardWatermarkSize}
          setCardWatermarkSize={setCardWatermarkSize}
          cardWatermarkX={cardWatermarkX}
          setCardWatermarkX={setCardWatermarkX}
          cardWatermarkY={cardWatermarkY}
          setCardWatermarkY={setCardWatermarkY}
          constellationPreviewIndex={constellationPreviewIndex}
          setConstellationPreviewIndex={setConstellationPreviewIndex}
        />
        <header className="battle-topbar">
          <div className="turn-badge" aria-label={`현재 ${game.turn}턴`}>
            <span>TURN</span><strong>{game.turn}</strong>
          </div>
          {debugMode && game.status === "playing" && (
            <button type="button" className="debug-defeat-trigger" onClick={defeatEnemiesForDebug}>
              적 즉시 처치
            </button>
          )}
        </header>
        <nav className="battle-card-ledger" aria-label="전투 카드 현황">
          <button type="button" className={battleCardView === "deck" ? "is-active" : ""} onClick={() => setBattleCardView((current) => current === "deck" ? null : "deck")}>
            <strong>{activeDeck ? <DeckName deck={activeDeck} showEditions={false} /> : "현재 덱"}</strong><span>{deckCards.length}장</span>
          </button>
          <button type="button" className={battleCardView === "piles" ? "is-active" : ""} onClick={() => setBattleCardView((current) => current === "piles" ? null : "piles")}>
            <strong>파일</strong><span>{game.piles.flat().length}장</span>
          </button>
          <button type="button" className={battleCardView === "discard" ? "is-active" : ""} onClick={() => setBattleCardView((current) => game.pendingResearchDraw === "necromancy" ? "discard" : current === "discard" ? null : "discard")}>
            <strong>버린 카드</strong><span>{game.discard.length}장</span>
          </button>
        </nav>
        {battleCardView && (
          <aside className="battle-card-ledger-panel" aria-live="polite">
            <header>
              <strong>{battleCardView === "deck" ? "현재 덱" : battleCardView === "piles" ? "파일에 존재하는 카드" : "버린 카드"}</strong>
              <button type="button" onClick={() => setBattleCardView(null)} disabled={game.pendingResearchDraw === "necromancy"}>닫기</button>
            </header>
            <div className="battle-card-ledger-cards">
              {battleCardViewGroups.length > 0
                ? battleCardViewGroups.map(({ card, count, cardIds }) => (
                  <div
                    className={`battle-ledger-card-stack rarity-${card.rarity}`}
                    key={`${battleCardView}-${card.id}`}
                    aria-label={`${card.name} ${count}장`}
                    style={{ width: 74 + Math.min(5, count - 1) * 7 }}
                  >
                    {Array.from({ length: Math.min(5, count - 1) }, (_, layer) => (
                      <span className="battle-ledger-stack-layer" key={`${card.id}-layer-${layer}`} style={{ left: layer * 7 }} />
                    ))}
                  <div
                    className={`deck-editor-card battle-ledger-card rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""}`}
                    style={{ marginLeft: Math.min(5, count - 1) * 7 }}
                    draggable={battleCardView === "discard"
                      && (game.pendingResearchDraw === "necromancy" || canUseResearchDraw(game, "necromancy"))}
                    onDragStart={(event) => {
                      const cardId = cardIds.at(-1);
                      if (cardId === undefined) return;
                      // Ref mutations happen only after the browser dispatches dragstart.
                      // eslint-disable-next-line react-hooks/refs
                      clearResearchDrag();
                      const source = event.currentTarget;
                      const bounds = source.getBoundingClientRect();
                      const dragImage = document.createElement("canvas");
                      dragImage.width = 1;
                      dragImage.height = 1;
                      Object.assign(dragImage.style, {
                        position: "fixed",
                        left: "-10000px",
                        top: "-10000px",
                        pointerEvents: "none",
                      });
                      document.body.appendChild(dragImage);
                      // eslint-disable-next-line react-hooks/refs
                      researchDragImageRef.current = dragImage;
                      // eslint-disable-next-line react-hooks/refs
                      researchDragActiveRef.current = true;
                      setResearchDragPreview({
                        card,
                        count,
                        x: bounds.left + bounds.width / 2,
                        y: bounds.top + bounds.height / 2,
                        width: bounds.width,
                        height: bounds.height,
                      });
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setDragImage(dragImage, 0, 0);
                      event.dataTransfer.setData("text/plain", `research-discard:${cardId}`);
                    }}
                    onDragEnd={clearResearchDrag}
                    onMouseEnter={(event) => moveDeckCardPreview(event, card)}
                    onMouseMove={(event) => moveDeckCardPreview(event, card)}
                    onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                  >
                    <DeckEditorCardIcon card={card} count={count} />
                  </div>
                  </div>
                ))
                : <em>카드 없음</em>}
            </div>
          </aside>
        )}
        {hoveredDeckCard && (
          <aside
            className="deck-card-preview-floating battle-card-preview-floating"
            style={{ left: deckPreviewPosition.x, top: deckPreviewPosition.y }}
            aria-live="polite"
          >
            <div className={`card-face ${hoveredDeckCard.kind} ${hoveredDeckCard.damageType}`}>
              <CardFace card={hoveredDeckCard} ruleCostReduction={lawResearchCount} forgeCount={game.forgeCount} />
            </div>
          </aside>
        )}
        {hoveredDeckEditionTooltip && (
          <aside
            className="deck-edition-tooltip-floating"
            style={{
              left: hoveredDeckEditionTooltip.x,
              top: hoveredDeckEditionTooltip.y,
              width: hoveredDeckEditionTooltip.width,
            }}
            role="tooltip"
          >
            <strong>{DECK_EDITION_INFO[hoveredDeckEditionTooltip.edition].name}</strong>
            <span>{DECK_EDITION_INFO[hoveredDeckEditionTooltip.edition].description}</span>
          </aside>
        )}
        <CardKeywordPopover popover={hoveredCardKeywords} popoverRef={cardKeywordPopoverRef} />
        <div className="enemy-zone">
          <div className={`enemies-row ${game.enemies.length > 2 ? "is-crowded" : ""}`}>
            {game.enemies.filter((enemy) => enemy.hp > 0 || dyingEnemyIds.has(enemy.id)).map((enemy) => {
              const dying = enemy.hp === 0 && dyingEnemyIds.has(enemy.id);
              const defeated = enemy.hp === 0 && !dying;
              return (
                <BattleEnemyUnit
                  key={enemy.id}
                  enemy={enemy}
                  dying={dying}
                  defeated={defeated}
                  displayedHp={animatedEnemyHp[enemy.id] ?? enemy.hp}
                  popup={enemyPopups[enemy.id]}
                  attacking={attackingEnemyId === enemy.id}
                  physicalResistance={game.playerPhysicalResistance}
                  magicResistance={game.playerMagicResistance}
                  physicalVulnerability={game.playerPhysicalVulnerability}
                  magicVulnerability={game.playerMagicVulnerability}
                  vulnerabilityMultiplier={blessings.includes("vulnerabilityInsurance") ? 1.5 : 2}
                  onSelect={playSelectedHandCardOnEnemy}
                />
              );
            })}
          </div>
        </div>

        <BattlePileZone
          game={game}
          dragging={dragging}
          dragOverDropTarget={dragOverDropTarget}
          pileClearNotice={pileClearNotice}
          pileScrollRef={pileScrollRef}
          combatManualBonus={combatManualBonus}
          backToBasicsBonus={backToBasicsBonus}
          dragHandlers={{ beginDrag, moveDrag, finishDrag, cancelDrag }}
          onDrawAstronomyResearchCard={drawAstronomyResearchCard}
          onTakeSelectedPile={takeSelectedPile}
          onDrawSelectedPile={drawSelectedPile}
          onMoveSelectedHandCardToPile={moveSelectedHandCardToPile}
          onShowCardKeywordOnly={showCardKeywordOnly}
          onClearCardHover={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
        />

        <div
          className="center-drop-zone"
          ref={centerDropZoneRef}
          data-drop-target="defend"
          onClick={playSelectedHandCardOnCenter}
          onMouseEnter={() => setCenterDropPointerHover(true)}
          onMouseLeave={() => setCenterDropPointerHover(false)}
        >
          {(game.pendingResearchDraw === "astronomy" || game.pendingSweep || game.pendingDraws > 0 || game.pendingPileDrawCount > 0 || game.pendingDiscards > 0) && (
            <div className="center-choice-prompt" role="status" aria-live="polite">
              <strong>{game.pendingResearchDraw === "astronomy"
                ? "파일 선택"
                : game.pendingSweep
                ? game.pendingPileOperation === "discardTop" ? "버릴 파일 선택" : "효과 적용 파일 선택"
                : game.pendingDiscards > 0
                ? "버릴 카드 선택"
                : "드로우할 파일 선택"}</strong>
            </div>
          )}
          <div
            className="energy-star-system center-resource"
            aria-label={`에너지 ${game.energy} 중 ${maximumEnergyForGame(game, blessings.includes("glassCannon"))}, 별 ${game.stars}개`}
            title={`별 ${game.stars}개`}
            style={{
              "--energy-fill": `${Math.min(100, Math.max(0, game.energy / maximumEnergyForGame(game, blessings.includes("glassCannon")) * 100))}%`,
            } as CSSProperties}
          >
            <div className="energy-orb">
              <span>{game.energy}</span><small>/ {maximumEnergyForGame(game, blessings.includes("glassCannon"))}</small>
            </div>
            <div className="energy-stars" aria-hidden="true">
              {game.stars > 6 ? (
                <><span>★</span><small>x{game.stars}</small></>
              ) : Array.from({ length: game.stars }, (_, index) => <span key={index}>★</span>)}
            </div>
          </div>
          <div className="drop-prompt defend-prompt">
            여기에 놓아 사용
          </div>
          <div className="status-strip" role="status" aria-live="polite">{game.message}</div>
        </div>

        <div className="player-zone">
          <div className="player-status-column">
            <BattlePlayerPanel
              game={game}
              playerName={playerName}
              maxPlayerHp={maxPlayerHp}
              combatManualBonus={combatManualBonus}
              damagePopup={damagePopup ?? undefined}
              onMoveDeckCardPreview={moveDeckCardPreview}
              onClearCardPreview={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
              onStartResearchDraw={startResearchDraw}
              onShowDeckCardPreview={(card, right, top) => showDeckCardPreview(card, right, top)}
              onShowDeckEditionTooltip={showDeckEditionTooltip}
              onClearDeckEditionTooltip={() => setHoveredDeckEditionTooltip(null)}
            />
          </div>

          <BattleHandArea
            game={game}
            phase={phase}
            dragging={dragging}
            selectedHandCardId={selectedHandCardId}
            hoveredHandCardId={hoveredHandCardId}
            setHoveredHandCardId={setHoveredHandCardId}
            setSelectedHandCardId={setSelectedHandCardId}
            controlsLocked={controlsLocked}
            backToBasicsBonus={backToBasicsBonus}
            combatManualBonus={combatManualBonus}
            lawResearchCount={lawResearchCount}
            canUseNecromancyResearch={canUseResearchDraw(game, "necromancy")}
            handCardRefs={handCardRefs}
            dragHandlers={{ beginDrag, moveDrag, finishDrag, cancelDrag }}
            onClearResearchDrag={clearResearchDrag}
            onRetrieveNecromancyResearchCard={retrieveNecromancyResearchCard}
            onDiscardSelectedCard={discardSelectedCard}
            onPlayHandCardOnDoubleClick={playHandCardOnDoubleClick}
            onSortHand={() => setGame((current) => ({
              ...current,
              hand: sortBattleHandByCost(current.hand, lawResearchCount, current.forgeCount),
            }))}
            onEndTurn={endTurn}
            onShowCardKeywordOnly={showCardKeywordOnly}
            onClearCardHover={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
          />
        </div>

        {game.status !== "playing" && (
          <BattleResultOverlay
            status={game.status}
            playerHp={game.playerHp}
            turn={game.turn}
            rewardGold={battleRewardGold}
            rewardCards={battleRewards}
            rewardDecks={battleRewardDecks}
            rewardConsumables={battleRewardConsumables}
            CardFace={CardFace}
            consumableDescription={consumableDescription}
            showCardKeywordOnly={showCardKeywordOnly}
            setHoveredDeckCard={setHoveredDeckCard}
            clearCardKeywordHover={clearCardKeywordHover}
            showConsumablePreview={showConsumablePreview}
            setHoveredConsumable={setHoveredConsumable}
            onContinue={game.status === "won" ? returnToMap : startNewRun}
            onExportTelemetry={exportTelemetryLog}
          />
        )}

        {hoveredConsumable && !consumableDragActive && (
          <aside
            className={`deck-consumable-preview-floating ${hoveredConsumable.type}`}
            style={{ left: deckPreviewPosition.x, top: deckPreviewPosition.y }}
            aria-live="polite"
          >
            <strong>{hoveredConsumable.name}</strong>
            <p>{hoveredConsumable.description}</p>
          </aside>
        )}

        {dragging?.moved && (
          <div
            className="drag-stack-preview"
            style={{
              left: dragging.x,
              top: dragging.y,
              height: `${CARD_HEIGHT + Math.max(0, dragging.cards.length - 1) * getStackOffset()}px`,
            }}
            aria-hidden="true"
          >
            {dragging.cards.map((card, index) => (
              <div
                className={`drag-card-preview card-face ${card.kind} ${card.damageType}`}
                style={{
                  top: `${index * getStackOffset()}px`,
                  zIndex: index + 1,
                }}
                key={card.id}
              >
                <CardFace card={card} strength={game.strength + combatManualBonus + backToBasicsBonus(card)} agility={game.agility + combatManualBonus + backToBasicsBonus(card)} defenseMultiplier={game.defenseMultiplier} ruleCostReduction={lawResearchCount} forgeCount={game.forgeCount} radiancePlayedThisTurn={game.radiancePlayedThisTurn} />
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
