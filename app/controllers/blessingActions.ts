import type { RunInventory } from "../hooks/useRunInventory";
import type { RunWorld } from "../hooks/useRunWorld";
import type { RunPlayer } from "../hooks/useRunPlayer";
import type { BattleSession } from "../hooks/useBattleSession";
import type { LocationDialogs } from "../hooks/useLocationDialogs";
import type { createTelemetryRecorder } from "../game/telemetry";
import type { Dispatch, SetStateAction } from "react";
import { RUN_SAVE_POLICY } from "../game/saveGame.ts";
import {
  recordTelemetryConsumableAcquired,
  recordTelemetryDeckAcquired,
  recordTelemetryGoldAcquired,
  finishTelemetryRun,
} from "../game/telemetry.ts";
import { telemetryConsumableSnapshot, telemetryDeckSnapshot } from "../game/telemetrySnapshots.ts";
import type { ConsumableType } from "../game/rewards";
import type { BlessingId, BlessingOfferId } from "../game/blessingRules";
import type { TelemetryAcquisitionSource } from "../game/telemetry";
import type { useRunMapContent } from "../hooks/useRunMapContent";
import { createRegionDeck } from "../game/rewards.ts";
import {
  resolveLethalDamage,
  rollBlessingOffers as createBlessingOffers,
  rollGamblingBlessings,
} from "../game/blessingRules.ts";
import { waitingState } from "../game/battleState.ts";
import { getRegionNumber, mapRoomKey, visibleMapRoomKeys, parseMapRoomKey } from "../game/mapRules.ts";
import { MAP_PLAYER_VISION_HORIZONTAL_RADIUS, MAP_PLAYER_VISION_VERTICAL_RADIUS } from "../game/mapEnemies.ts";
type Options = {
  inventory: RunInventory; world: RunWorld; player: RunPlayer; battle: BattleSession; dialogs: LocationDialogs;
  telemetry: ReturnType<typeof createTelemetryRecorder>; ensureTelemetryRun: () => void;
  queueRunSave: (delay?: number) => void;
  maxPlayerHp: number; inventoryCapacity: number;
  materializeMapContent: ReturnType<typeof useRunMapContent>["materializeMapContent"];
  setMapMessage: Dispatch<SetStateAction<string>>;
};
export function createBlessingActions({
  inventory, world, player, battle, dialogs, telemetry, ensureTelemetryRun, queueRunSave, maxPlayerHp, inventoryCapacity, materializeMapContent, setMapMessage,
}: Options) {
  const {
    setOwnedDecks, inventoryCards, setInventoryConsumables, inventoryConsumablesRef,
    setRoomConsumableDrops, setRoomDeckDrops, setGold, nextCardIdRef, nextConsumable,
  } = inventory;
  const { mapPosition, mapSeed, mapEnemyWorld, setMapEnemyWorld, setUsedBlessingRooms } = world;
  const {
    blessings, setBlessings, runPlayerHpRef, setRunPlayerHp, blessingOffers, setBlessingOffers,
    blessingSeenOfferIds, setBlessingSeenOfferIds, blessingRerollCost, setBlessingRerollCost,
    oneUpUsedRef, setOneUpUsed,
  } = player;
  const { setGame, setPhase, setScreen } = battle;
  const { setBlessingOpen } = dialogs;
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

  return { grantConsumables, applyAcquiredBlessing, openBlessings, chooseBlessing, rerollBlessings };
}
