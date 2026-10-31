"use client";

import { blockedPileIndexes } from "./game/enemyPassives.ts";

import { useLocationDialogs } from "./hooks/useLocationDialogs";
import { createShopActions } from "./controllers/shopActions";
import { createBlessingActions } from "./controllers/blessingActions";
import { createLocationActions } from "./controllers/locationActions";

import { createBattleSessionActions } from "./controllers/battleSessionActions";
import { useBattleSession, useBattleRewardFallback } from "./hooks/useBattleSession";

import { useRunInventory } from "./hooks/useRunInventory";
import { useRunWorld } from "./hooks/useRunWorld";
import { useRunPlayer } from "./hooks/useRunPlayer";

import {
  animateCardToPlayer,
  animateEnemyCardDelivery,
  animatePlayedCardToCenter,
} from "./components/cardAnimations";
import {
  createDrawAstronomyResearchCard,
  createDrawSelectedPile,
  createMoveCardToPile,
} from "./game/pileActions";
import { createResolvePlayedCard } from "./game/cardPlayAction";
import type { DragState } from "./game/battleUiTypes";
import { createEndTurn } from "./game/endTurnAction";
import { createDrawCards } from "./game/drawCards";
import {
  Fragment,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { CardFace } from "./components/CardFace";
import { CardKeywordPopover } from "./components/CardKeywordPopover";
import { DeckName } from "./components/DeckName";
import {
  BattleThemeControls,
  DEFAULT_BATTLE_THEME_COLORS,
  type BattleThemeColors,
  type CardWatermarkStyle,
  type StarOrbitStyle,
} from "./components/BattleThemeControls";
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
import { useMapCamera } from "./hooks/useMapCamera";
import { useMapKeyboardMovement } from "./hooks/useMapKeyboardMovement";
import { useMapKeyboardShortcuts } from "./hooks/useMapKeyboardShortcuts";
import { RESET_HOLD_DURATION_MS, useRunKeyboardControls } from "./hooks/useRunKeyboardControls";
import { useRunMapContent } from "./hooks/useRunMapContent";
import { createTicketActions } from "./controllers/ticketActions";
import { createDeckEditorMoves } from "./controllers/deckEditorMoves";
import { useRunDeckEditor } from "./hooks/useRunDeckEditor";
import { useFloatingPreviews } from "./hooks/useFloatingPreviews";
import { useBattleInteractionState } from "./hooks/useBattleInteractionState";
import { useBattlePointerInput } from "./hooks/useBattlePointerInput";
import { useRunPersistence } from "./hooks/useRunPersistence";
import { CONSTELLATION_PRESETS, constellationPresetCssImage } from "./cardConstellations";
import { MapTopbar } from "./components/MapTopbar";
import {
  ALL_CARD_BLUEPRINTS,
  DEBUG_CARD_RARITIES,
  UNPLAYABLE_CARD_EFFECTS,
  createAdrenalineCard,
  isAttackCard,
  canTargetEnemy,
  type Card,
  type CardBlueprint,
} from "./game/cards";
import { canPlaceBySolitaireRule, cardEnergyCost } from "./game/cardEffects";
import { canPayEnergyCost, maximumBattleEnergy } from "./game/combatEconomy";
import { MAX_PLAYER_HP, waitingState, type GameState } from "./game/battleState";
import { sortBattleHandByCost } from "./game/battleHandRules";
import { attackPreview } from "./game/attackPreview";
import {
  CONSUMABLE_TYPES,
  DEBUG_ALL_CARDS_DECK_ID,
  DECK_EDITION_INFO,
  createConsumable,
  createDebugAllCardsDeck,
  createRegionDeck,
  createStarterDeck,
  type Consumable,
  type ConsumableType,
} from "./game/rewards";
import { type TicketType } from "./game/shopRules";
import { groupConsumables, sortConsumableGroupsByTier } from "./game/ticketRules";
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
  getRegionNumber,
  getRoomType,
  getSafeAreaRegionIndex,
  isSafeAreaBoundaryPosition,
  isSafeAreaEditAllowed,
  isSafeAreaPosition,
  isWalkableRoom,
  mapRoomKey,
  parseMapRoomKey,
  safeAreaCenterX,
  safeAreaCenterY,
  visibleMapRoomKeys,
  type MapPosition,
} from "./game/mapRules";
import { type EnemyState } from "./game/enemies";
import {
  chebyshevDistance,
  MAP_ENEMY_DISTANCE_FIELD_RADIUS,
  MAP_PLAYER_VISION_HORIZONTAL_RADIUS,
  MAP_PLAYER_VISION_VERTICAL_RADIUS,
  type MapEnemyWorld,
} from "./game/mapEnemies";
import { resolveMapTurn as resolveMapTurnRules } from "./game/mapTurn";
import { advanceBombs, applyBombDamage, positionsInSquare, type MapBomb } from "./game/mapEffects";
import { RUN_SAVE_POLICY, clearRunSave } from "./game/saveGame";
import { countRareSlotCards } from "./game/deckEditorRules";
import { groupAndSortDeckEditorCards } from "./game/deckEditorViews";
import { BLESSING_INFO, resolveLethalDamage, shouldPreserveTicket } from "./game/blessingRules";
import {
  beginTelemetryRun,
  createTelemetryRecorder,
  flushTelemetry,
  finishTelemetryBattle,
  finishTelemetryRun,
  hasActiveTelemetryRun,
  recordTelemetryCardAcquired,
  recordTelemetryCardPlayed,
  recordTelemetryConsumableAcquired,
  recordTelemetryDeckAcquired,
  resetTelemetryRecorder,
} from "./game/telemetry";
import {
  telemetryCardSnapshot,
  telemetryConsumableSnapshot,
  telemetryDeckSnapshot,
} from "./game/telemetrySnapshots";

const DEBUG_PLAYER_HP = 999;
const GAME_VERSION = "v0.1.2";
const COMMIT_HASH = process.env.NEXT_PUBLIC_COMMIT_HASH ?? "dev";
const COMMIT_DATE = process.env.NEXT_PUBLIC_COMMIT_DATE ?? "unknown";
const INVENTORY_CAPACITY = 15;
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
    ? state.piles.some((pile, index) => pile.length > 0 && !blockedPileIndexes(state.enemies).includes(index))
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
  const world = useRunWorld();
  const {
    mapSeed, setMapSeed, mapPosition, setMapPosition, seenRooms, setSeenRooms,
    setSafeAreaEntrySeenRooms, mapEnemyWorld, setMapEnemyWorld,
    defeatedBossRegions, setDefeatedBossRegions, mapEnemyCellMemory, setMapEnemyCellMemory,
    mapBombs, mapBombsRef, setDestroyedShopRooms, setCollapsedShrineRooms,
    setCollapsedRecoveryShrineRooms, setCollapsedVitalityShrineRooms,
    setCollapsedMindEyeShrineRooms, setCollapsedTransformShrineRooms,
    setCollapsedCombinationShrineRooms, setCollapsedTreasureChestRooms, setUsedHealRooms,
    setUsedBlessingRooms, setRockBombHits, generatedMapRoomKeysRef, setMapBombsSynced,
    effectiveRoomType,
  } = world;
  const player = useRunPlayer();
  const {
    playerName, setPlayerName, playerNameSetupOpen, setPlayerNameSetupOpen, runPlayerHp,
    setRunPlayerHp, runPlayerHpRef, mindEyeMovesRemaining, setMindEyeMovesRemaining,
    mindEyeMovesRemainingRef, godsLamentCharges, setGodsLamentCharges, godsLamentChargesRef,
    darkTicketTurnsRemaining, setDarkTicketTurnsRemaining, darkTicketTurnsRemainingRef,
    vitalityShrineMaxHpBonus, setVitalityShrineMaxHpBonus, blessingOffers, setBlessingOffers,
    setBlessingSeenOfferIds, blessings, setBlessings, blessingRerollCost,
    setBlessingRerollCost, oneUpUsed, setOneUpUsed, oneUpUsedRef,
  } = player;
  const inventory = useRunInventory();
  const { ownedDecks, setOwnedDecks, activeDeckId, setActiveDeckId,
    inventoryCards, setInventoryCards, inventoryConsumables, setInventoryConsumables, inventoryConsumablesRef,
    roomDrops, setRoomDrops, roomConsumableDrops, setRoomConsumableDrops,
    roomDeckDrops, setRoomDeckDrops, roomShops, setRoomShops, gold, setGold,
    nextCardIdRef, nextConsumableIdRef, nextConsumable,
    deckDropChanceRef, rareCardDropChanceRef, deckPityBattlesRemainingRef } = inventory;
  const dialogs = useLocationDialogs();
  const {
    treasureChestReward,
    setTreasureChestReward,
    shrineOpen,
    setShrineOpen,
    transformShrineOpen,
    setTransformShrineOpen,
    combinationShrineOpen,
    setCombinationShrineOpen,
    shopOpen,
    setShopOpen,
    blessingOpen,
    setBlessingOpen,
    activeShopRoom,
    setActiveShopRoom,
    openedCardPack,
    setOpenedCardPack,
    } = dialogs;
  const battle = useBattleSession();
  const {
    screen, setScreen, setActiveMapEnemyIds, setActiveBattleRoom, mapBattleQueueRef, previousBattleDeckIdRef, pendingBattleStart,
    setPendingBattleStart, battleDeckCheckEnabled, setBattleDeckCheckEnabled, battleDeckPreviewId,
    setBattleDeckPreviewId, battleRewards, setBattleRewards, battleRewardDecks,
    setBattleRewardDecks, battleRewardConsumables, setBattleRewardConsumables, battleRewardGold,
    setBattleRewardGold, game, setGame, telemetryPreviousGameRef, phase, setPhase,
    attackingEnemyId, setAttackingEnemyId, damagePopup, setDamagePopup, enemyPopups,
    animatedEnemyHp, setAnimatedEnemyHp, battleRewardRegionRef,
    battleRewardIsBossRef, battleRewardIsOutOfDepthRef, dyingEnemyIds, setDyingEnemyIds,
    battleCardView, setBattleCardView, pendingOriginsRef, pendingEnemyTokenIdsRef,
    pendingPileTokenSourcesRef, handCardRefs, pendingDiscardPlay, setPendingDiscardPlay, getGame, later, clearBattleTimers, showEnemyPopup,
  } = battle;
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
  const [deckSelectorOpen, setDeckSelectorOpen] = useState(false);
  const [deckSelectorClosing, setDeckSelectorClosing] = useState(false);
  const [deckSelectorClosingDeckId, setDeckSelectorClosingDeckId] = useState<string | null>(null);
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
  const editor = useRunDeckEditor();
  const {
    deckEditorOpen, beginDeckEditorSession, finishDeckEditorSession,
    deckEditorHighRarityInsertionOriginsRef, deckEditorDeckId, setDeckEditorDeckId,
    pendingRemovedCards, setPendingRemovedCards, pendingRemovedCardAreas,
    setPendingRemovedCardAreas, setDeckEditorReleasedCardIds, pendingRemovalBlinkDim,
    pendingPaintTicketId, setPendingPaintTicketId, pendingCloneTicketId, setPendingCloneTicketId,
    pendingExtractTicketId, setPendingExtractTicketId, pendingTransformTicketId,
    setPendingTransformTicketId, setArmedBombTicketIds, deckEditorMessage, setDeckEditorMessage,
    transformedCardNewIds, setTransformedCardNewIds, deckEditorSort, setDeckEditorSort,
    effectiveOriginDeckIdForCard,
  } = editor;
  const cardKeywordPopoverRef = useRef<HTMLElement | null>(null);
  const [consumableDragActive, setConsumableDragActive] = useState(false);
  const [researchDragPreview, setResearchDragPreview] = useState<{
    card: Card;
    count: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
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
  }, [game.piles, game.deckEditions, game.whiteSpaceStrengthBonus, setGame]);
  const [telemetry] = useState(() => createTelemetryRecorder());
  const debugGoldClicksRef = useRef<number[]>([]);
  const debugPreviousActiveDeckIdRef = useRef<string | null>(null);
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
      setRunPlayerHp(maxPlayerHp);
    } else if (runPlayerHpRef.current > maxPlayerHp) {
      runPlayerHpRef.current = maxPlayerHp;
    }
    if (game.playerHp > maxPlayerHp) {
      // Clamp battle HP immediately when a blessing changes the maximum.
      setGame((current) => current.playerHp > maxPlayerHp
        ? { ...current, playerHp: maxPlayerHp }
        : current);
    }
  }, [game.playerHp, maxPlayerHp, runPlayerHp, runPlayerHpRef, setRunPlayerHp, setGame]);
  const blessingVisionBonus = (blessings.includes("vision") ? 1 : 0) + (blessings.includes("bioluminescence") ? 2 : 0);
  const mindEyeVisionBonus = mindEyeMovesRemaining > 0 ? 2 : 0;
  const visionHorizontalRadius = MAP_PLAYER_VISION_HORIZONTAL_RADIUS + blessingVisionBonus + mindEyeVisionBonus;
  const visionVerticalRadius = MAP_PLAYER_VISION_VERTICAL_RADIUS + blessingVisionBonus + mindEyeVisionBonus;
  const editingDeck = ownedDecks.find((deck) => deck.id === deckEditorDeckId) ?? activeDeck;

  const { materializeMapContent, materializeVisibleMapContent, rememberPlayerVision, initializeMap } = useRunMapContent({
    world, inventory, player, visionHorizontalRadius, visionVerticalRadius,
  });

  const { saveReady, saveRunNow, queueRunSave, cancelQueuedSave } = useRunPersistence({
    world, inventory, player,
    allowed: !playerNameSetupOpen && screen === "map" && !mapTraveling && !deckEditorOpen,
    status: game.status,
    onInitialize: initializeMap,
    counters: { deckDropChanceRef, rareCardDropChanceRef, deckPityBattlesRemainingRef },
    onRestore: (state) => {
      player.restorePlayer(state);
      world.restoreWorld(state);
      inventory.restoreInventory(state);
      setMapEnemyWorld(materializeMapContent(
        positionsInSquare(state.mapPosition, 5), state.mapSeed, state.mapEnemyWorld, [],
      ));
      nextCardIdRef.current = state.nextCardId;
      nextConsumableIdRef.current = state.nextConsumableId;
      deckDropChanceRef.current = state.deckDropChance;
      rareCardDropChanceRef.current = state.rareCardDropChance;
      deckPityBattlesRemainingRef.current = state.deckPityBattlesRemaining;
      setGame(waitingState());
      setPhase("drawing");
      setScreen("map");
    },
  });

  const ensureTelemetryRun = () => {
    if (hasActiveTelemetryRun(telemetry)) return;
    beginTelemetryRun(telemetry, {
      playerName: playerName.trim() || "이름 없음",
      mapSeed: String(mapSeed),
      startingDecks: ownedDecks.map(telemetryDeckSnapshot),
      activeDeckId,
    });
  };

  useEffect(() => {
    const flush = () => flushTelemetry(telemetry);
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, [telemetry]);

  useEffect(() => {
    const previous = telemetryPreviousGameRef.current;
    if (previous && screen === "battle" && hasActiveTelemetryRun(telemetry)
      && previous.status === "playing" && game.status !== "playing") {
      finishTelemetryBattle(telemetry, game.status === "won" ? "won" : "lost", game.turn, game.playerHp);
    }
    telemetryPreviousGameRef.current = game;
  }, [game, screen, telemetry, telemetryPreviousGameRef]);
  useEffect(() => {
    if (!ownedDecks.some((deck) => deck.id === "starter" && deck.name === "")) return;
    const timer = window.setTimeout(() => setOwnedDecks((current) => current.map((deck) => deck.id === "starter" && deck.name === ""
      ? { ...deck, name: createDeckName() }
      : deck)), 0);
    return () => window.clearTimeout(timer);
  }, [ownedDecks, setOwnedDecks]);
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
  const inventoryItemCount = inventoryCards.length + inventoryConsumables.filter((item) =>
    !blessings.includes("lightTicket") || item.type === "cardPack").length;
  const pendingInventoryCardCount = pendingRemovedCards.filter((card) => pendingRemovedCardAreas[card.id] === "inventory").length;
  const deckEditorInventoryItemCount = inventoryItemCount + pendingInventoryCardCount;
  const deckEditorErrorMessage = /불가능|가득|더 이상|반드시|이하로 줄여야/.test(deckEditorMessage)
    ? deckEditorMessage
    : null;

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
  const { grantBattleReward, confirmBattleDeck, returnToMap, beginMapEnemyBattle } = createBattleSessionActions({
    battle, inventory, world, player, interaction: battleInteraction, telemetry, ensureTelemetryRun,
    clearMapTravel: () => clearMapTravel(),
    closeMapOverlays: () => {
      finishDeckEditorSession();
      setDeckSelectorOpen(false);
    },
    clearCardPreview: () => {
      setHoveredDeckCard(null);
      clearCardKeywordHover();
    },
    drawCards: () => drawCards(),
    rememberPlayerVision,
    queueRunSave,
  });
  useBattleRewardFallback(battle, grantBattleReward);

  const { openShop, buyShopOffer, openCardPack } = createShopActions({
    inventory, world, player, editor, dialogs, telemetry, ensureTelemetryRun, inventoryCapacity, inventoryItemCount, queueRunSave,
  });
  const { grantConsumables, openBlessings, chooseBlessing, rerollBlessings } = createBlessingActions({
    inventory, world, player, battle, dialogs, telemetry, ensureTelemetryRun,
    maxPlayerHp, inventoryCapacity, queueRunSave, materializeMapContent, setMapMessage,
  });
  const {
    useCurrentPortal, useCurrentHeal, useCurrentRecoveryShrine, useCurrentVitalityShrine,
    activateMindEye, useCurrentMindEyeShrine, openTransformShrine, transformCardsAtShrine,
    openCombinationShrine, combineCardsAtShrine, openTreasureChest, openShrine, extractCardsAtShrine,
  } = createLocationActions({
    inventory, world, player, dialogs, telemetry, ensureTelemetryRun, maxPlayerHp,
    inventoryCapacity, blessingVisionBonus, queueRunSave, setMapMessage, showMapMessage,
    isSafeAreaSealed, focusMapOn, materializeMapContent, materializeVisibleMapContent, rememberPlayerVision,
  });

  const researchDragImageRef = useRef<HTMLCanvasElement | null>(null);
  const researchDragActiveRef = useRef(false);
  const clearResearchDrag = () => {
    researchDragActiveRef.current = false;
    researchDragImageRef.current?.remove();
    researchDragImageRef.current = null;
    setResearchDragPreview(null);
  };
  const mapTravelTimerRef = useRef<number | null>(null);
  const pileScrollRef = useRef<HTMLDivElement | null>(null);

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
  }, [game.hand, game.stars, game.status, screen, setGame]);

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

  useEffect(() => () => {
    if (mapTravelTimerRef.current !== null) window.clearTimeout(mapTravelTimerRef.current);
  }, []);

  useEffect(() => {
    if (!mapMessage) return;
    const messageTimer = window.setTimeout(() => setMapMessage(""), 1300);
    return () => window.clearTimeout(messageTimer);
  }, [mapMessage, mapMessageNonce]);

  const activateRoomFeature = (position: MapPosition) => {
    void position;
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

  const restartHold = useRunKeyboardControls({
    playerNameSetupOpen,
    saveRunNow,
    showMapMessage,
    clearRunSave,
    startNewRun,
  });

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

  const { moveDeckEditorCard } = createDeckEditorMoves({
    inventory, world, player, editor, inventoryCapacity, deckEditorInventoryItemCount,
    onFloorCardAcquired: (card) => {
      ensureTelemetryRun();
      recordTelemetryCardAcquired(telemetry, telemetryCardSnapshot(card), "floor");
    },
    clearCardPreview: () => {
      setHoveredDeckCard(null);
      clearCardKeywordHover();
    },
  });

  // This factory creates event callbacks; refs are read only when a callback runs.
  const ticketActions = createTicketActions({
    inventory, world, player, editor, inventoryCapacity, inventoryItemCount, deckEditorInventoryItemCount,
    maxPlayerHp, editingDeck, moveDeckEditorCard, queueRunSave, showMapMessage,
    activateMindEye, grantConsumables, openCardPack, materializeMapContent, startMapTicketCameraTour,
    clearCardPreview: () => {
      setHoveredDeckCard(null);
      clearCardKeywordHover();
    },
  });
  const {
    moveFloorConsumableToInventory, moveInventoryConsumableToFloor,
    findTicketById, canApplyTicketToCard, applyTicketToCard,
    canApplyTicketToDeck, applyTicketToDeck, installArmedFloorBombs,
    selectExtractionTicket,
    applySelectedCardTicket, canApplyTicketToConsumable, applyTicketToConsumable,
  } = ticketActions;

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
    setDeckEditorMessage(`덱 '${deck.name}'을(를) 주웠습니다. 보유 덱 ${ownedDecks.length + 1} / ${maxOwnedDecks}`);
    queueRunSave();
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
    clearFloatingTooltips();
    setDeckEditorMessage(`${deck.name}을(를) 바닥에 놓았습니다.`);
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
    if (!ownedDecks.some((deck) => deck.id === activeDeckId)) {
      setActiveDeckId(ownedDecks[0]?.id ?? "");
    }
    installArmedFloorBombs();
    deckEditorHighRarityInsertionOriginsRef.current = {};
    finishDeckEditorSession();
    setPendingRemovedCards([]);
    setPendingRemovedCardAreas({});
    setDeckEditorReleasedCardIds(new Set());
    setTransformedCardNewIds(new Set());
    clearFloatingTooltips();
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

  const centerCurrentMap = useEffectEvent(() => centerMapOn(mapPosition));
  useLayoutEffect(() => {
    if (screen !== "map") return;
    const frame = window.requestAnimationFrame(() => centerCurrentMap());
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
  }, [game.hand, game.clearPlan, handCardRefs, pendingEnemyTokenIdsRef, pendingOriginsRef, setPhase]);

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
  }, [screen, game.piles, pendingPileTokenSourcesRef]);

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

  const resolvePlayedCard = (card: Card, targetEnemyId?: string, discardCostPaid = false) => createResolvePlayedCard({
    setGame,
    game,
    getGame,
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
  })(card, targetEnemyId, discardCostPaid);

  const playCard = (card: Card, targetEnemyId?: string, discardCostPaid = false) => {
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
    if (!shouldAnimate) {
      resolvePlayedCard(card, targetEnemyId, discardCostPaid);
      return;
    }
    if (!discardCostPaid && (game.pendingDiscards > 0 || pendingDiscardPlay)) return;
    const discardCost = card.discardCost ?? 0;
    if (discardCost > 0 && !discardCostPaid) {
      const hasEnoughCards = game.hand.filter((item) => item.id !== card.id).length >= discardCost;
      if (!hasEnoughCards) {
        resolvePlayedCard(card, targetEnemyId);
        return;
      }
      if (card.effect === "strike" && !game.enemies.some((enemy) => enemy.id === targetEnemyId && enemy.hp > 0)) {
        setGame((current) => ({ ...current, message: `${card.name}: 공격할 적을 선택하세요.` }));
        return;
      }
      setPendingDiscardPlay({ card, targetEnemyId });
      setSelectedHandCardId(null);
      setGame((current) => ({
        ...current,
        pendingDiscards: discardCost,
        message: `${card.name}: 버릴 카드 ${discardCost}장을 선택하세요.`,
      }));
      return;
    }
    const canLogPlayedCard = shouldAnimate
      && game.pendingDraws === 0
      && game.pendingPileDrawCount === 0
      && (game.pendingDiscards === 0 || discardCostPaid)
      && game.pendingResearchDraw === null
      && !game.pendingSweep
      && game.hand.some((item) => item.id === card.id);
    if (canLogPlayedCard) recordTelemetryCardPlayed(telemetry, telemetryCardSnapshot(card));
    const flightDuration = animatePlayedCardToCenter(sourceCard);
    if (flightDuration === 0) {
      resolvePlayedCard(card, targetEnemyId, discardCostPaid);
      return;
    }
    setSelectedHandCardId(null);
    setPhase("resolving");
    later(() => {
      setPhase("playing");
      resolvePlayedCard(card, targetEnemyId, discardCostPaid);
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
      && (research === "astronomy" ? game.piles.some((pile, index) => pile.length > 0 && !blockedPileIndexes(game.enemies).includes(index)) : game.discard.length > 0);
    setGame((current) => {
      if (current.status !== "playing" || current.pendingResearchDraw !== null) return current;
      const effect = researchEffect;
      const availableUses = current.activeRuleCards.filter((card) => card.effect === effect).length;
      const usedUses = research === "astronomy" ? current.astronomyResearchUses : current.necromancyResearchUses;
      const cost = research === "astronomy" ? 2 : 3;
      const hasCards = research === "astronomy"
        ? current.piles.some((pile, index) => pile.length > 0 && !blockedPileIndexes(current.enemies).includes(index))
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
    const targetEnemy = canTargetEnemy(card)
      ? game.enemies.find((enemy) => enemy.hp > 0)
      : undefined;
    playCard(card, targetEnemy?.id);
  };

  const canUseCardOnCenter = (card: Card | undefined) => Boolean(
    card
    && card.kind !== "strike"
    && card.effect !== "doubleHit"
    && !UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    && !["slime", "combatManual", "grimoire", "scaleArmor"].includes(card.effect)
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
    if (!card || !canTargetEnemy(card)) return;
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
    if (pendingDiscardPlay?.card.id === cardId) return;
    if (!game.hand.some((card) => card.id === cardId)) return;
    const resumePlay = game.pendingDiscards === 1 ? pendingDiscardPlay : null;
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
        pendingDiscards: remainingDiscards,
        message: action,
      };
    });
    if (resumePlay) {
      setPendingDiscardPlay(null);
      playCard(resumePlay.card, resumePlay.targetEnemyId, true);
    }
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
    maxPlayerHp,
    oneUpUsedRef,
    setOneUpUsed,
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

  const endTurnFromKeyboard = useEffectEvent(() => endTurn());
  useEffect(() => {
    const endTurnWithKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (screen !== "battle" || event.key.toLowerCase() !== "e") return;
      event.preventDefault();
      endTurnFromKeyboard();
    };
    window.addEventListener("keydown", endTurnWithKey);
    return () => window.removeEventListener("keydown", endTurnWithKey);
  }, [screen]);

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
    .filter((card) => card.effect === "combatManual" || card.effect === "strategyBook")
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
    const currentFloorCards = roomDrops[currentRoomKey] ?? [];
    const currentFloorConsumables = roomConsumableDrops[currentRoomKey] ?? [];
    const currentFloorDecks = roomDeckDrops[currentRoomKey] ?? [];
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
          onWait={waitOnMap}
          restartHold={restartHold}
          onEditDeck={() => openDeckEditor(usesSafeAreaDeckRules
            ? "덱 카드를 인벤토리로 회수할 수 있습니다. 희귀도에 따라 골드를 냅니다."
            : "좌클릭: 바닥 → 인벤토리 → 덱. 덱 카드 우클릭·바닥 드래그: 제거 예정 상태")}
        />
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
            maxOwnedDecks={maxOwnedDecks}
            activeDeck={activeDeck}
            open={deckSelectorOpen}
            closing={deckSelectorClosing}
            closingDeckId={deckSelectorClosingDeckId}
            onToggle={toggleDeckSelector}
            onSelectDeck={(deck) => {
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
            onSelectActiveDeck: setActiveDeckId,
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
            canApplyTicketToConsumable,
            applyTicketToConsumable,
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
      {restartHold.progress > 0 && (
        <div className="save-reset-hold" role="status">
          <strong>새 탐험 초기화</strong>
          <span>R을 계속 누르세요 · {Math.ceil(RESET_HOLD_DURATION_MS / 1000 * (1 - restartHold.progress))}초</span>
          <i style={{ width: `${restartHold.progress * 100}%` }} />
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
                      // eslint-disable-next-line react-hooks/refs -- This is the dragstart handler.
                      researchDragImageRef.current = dragImage;
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
              <CardFace card={hoveredDeckCard} {...attackPreview(game.playerAmplification)} strength={game.strength + combatManualBonus + backToBasicsBonus(hoveredDeckCard)} agility={game.agility + combatManualBonus + backToBasicsBonus(hoveredDeckCard)} defenseMultiplier={game.defenseMultiplier} radiancePlayedThisTurn={game.radiancePlayedThisTurn} ruleCostReduction={lawResearchCount} forgeCount={game.forgeCount} />
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
                  playerEnergy={game.energy}
                  playerHandCount={game.hand.length}
                  dying={dying}
                  defeated={defeated}
                  displayedHp={animatedEnemyHp[enemy.id] ?? enemy.hp}
                  popup={enemyPopups[enemy.id]}
                  attacking={attackingEnemyId === enemy.id}
                  resistance={game.playerResistance}
                  ignoreNegativeResistance={blessings.includes("vulnerabilityInsurance")}
                  onSelect={playSelectedHandCardOnEnemy}
                />
              );
            })}
          </div>
        </div>

        <BattlePileZone
          game={game}
          attackTarget={game.enemies.find(enemy => enemy.hp > 0 && dragOverDropTarget === `enemy:${enemy.id}`)}
          bossSlayer={blessings.includes("bossSlayer")}
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
              ignoreNegativeResistance={blessings.includes("vulnerabilityInsurance")}
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
            attackTarget={game.enemies.find(enemy => enemy.hp > 0 && dragOverDropTarget === `enemy:${enemy.id}`)}
            bossSlayer={blessings.includes("bossSlayer")}
            phase={phase}
            dragging={dragging}
            selectedHandCardId={selectedHandCardId}
            pendingDiscardCardId={pendingDiscardPlay?.card.id ?? null}
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
                <CardFace card={card} {...attackPreview(game.playerAmplification, game.enemies.find(enemy => enemy.hp > 0 && dragOverDropTarget === `enemy:${enemy.id}`), blessings.includes("bossSlayer"))} strength={game.strength + combatManualBonus + backToBasicsBonus(card)} agility={game.agility + combatManualBonus + backToBasicsBonus(card)} defenseMultiplier={game.defenseMultiplier} ruleCostReduction={lawResearchCount} forgeCount={game.forgeCount} radiancePlayedThisTurn={game.radiancePlayedThisTurn} />
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
