import type { RunInventory } from "../hooks/useRunInventory";
import type { RunWorld } from "../hooks/useRunWorld";
import type { RunPlayer } from "../hooks/useRunPlayer";
import type { LocationDialogs } from "../hooks/useLocationDialogs";
import type { createTelemetryRecorder } from "../game/telemetry";
import type { Dispatch, SetStateAction } from "react";
import { RUN_SAVE_POLICY } from "../game/saveGame.ts";
import {
  recordTelemetryCardAcquired,
  recordTelemetryConsumableAcquired,
  recordTelemetryDeckAcquired,
} from "../game/telemetry.ts";
import {
  telemetryCardSnapshot,
  telemetryConsumableSnapshot,
  telemetryDeckSnapshot,
} from "../game/telemetrySnapshots.ts";
import type { Card } from "../game/cards";
import type { DeckCase, Consumable } from "../game/rewards";
import type { ShrineCardConversionResult } from "../game/shrineRules";
import type { MapPosition } from "../game/mapRules";
import type { useRunMapContent } from "../hooks/useRunMapContent";
import { RARE_CARD_POOL, SPECIAL_CARD_POOL } from "../game/cards.ts";
import { createRegionDeck } from "../game/rewards.ts";
import { TICKET_TYPES } from "../game/shopRules.ts";
import { shouldPreserveTicket } from "../game/blessingRules.ts";
import { transformedCard } from "../game/cardTransforms.ts";
import {
  chebyshevDistance,
  MAP_PLAYER_VISION_HORIZONTAL_RADIUS,
  MAP_PLAYER_VISION_VERTICAL_RADIUS,
} from "../game/mapEnemies.ts";
import {
  mapRoomKey,
  getRegionNumber,
  visibleMapRoomKeys,
  parseMapRoomKey,
} from "../game/mapRules.ts";
import { createPortalActions } from "./portalActions.ts";

type Options = {
  inventory: RunInventory; world: RunWorld; player: RunPlayer; dialogs: LocationDialogs;
  telemetry: ReturnType<typeof createTelemetryRecorder>; ensureTelemetryRun: () => void;
  queueRunSave: (delay?: number) => void;
  maxPlayerHp: number; blessingVisionBonus: number;
  setMapMessage: Dispatch<SetStateAction<string>>; showMapMessage: (message: string) => void;
  isSafeAreaSealed: (region: number) => boolean;
  focusMapOn: (position: MapPosition) => void;
  materializeMapContent: ReturnType<typeof useRunMapContent>["materializeMapContent"];
  materializeVisibleMapContent: ReturnType<typeof useRunMapContent>["materializeVisibleMapContent"];
  rememberPlayerVision: ReturnType<typeof useRunMapContent>["rememberPlayerVision"];
};
export function createLocationActions({
  inventory, world, player, dialogs, telemetry, ensureTelemetryRun, queueRunSave, maxPlayerHp, blessingVisionBonus, setMapMessage, showMapMessage, isSafeAreaSealed, focusMapOn, materializeMapContent, materializeVisibleMapContent, rememberPlayerVision,
}: Options) {
  const {
    ownedDecks, setOwnedDecks, inventoryCards, setInventoryCards,
    setRoomDrops, setRoomConsumableDrops, setRoomDeckDrops, nextCardIdRef, nextConsumable,
  } = inventory;
  const {
    mapPosition, mapSeed, mapEnemyWorld, setMapEnemyWorld, effectiveRoomType, setUsedHealRooms,
    setCollapsedRecoveryShrineRooms, setCollapsedVitalityShrineRooms,
    setCollapsedMindEyeShrineRooms, setCollapsedTransformShrineRooms,
    setCollapsedTreasureChestRooms, setCollapsedExtractionShrineRooms,
  } = world;
  const {
    blessings, runPlayerHpRef, setRunPlayerHp,
    setVitalityShrineMaxHpBonus, setMindEyeMovesRemaining, mindEyeMovesRemainingRef,
  } = player;
  const { setTreasureChestReward, setExtractionShrineOpen, setTransformShrineOpen } = dialogs;
  function randomItem<T>(items: readonly T[]): T { return items[Math.floor(Math.random() * items.length)]; }
  const randomGameRoll = () => Math.random();
  const { useCurrentPortal, confirmPortalTravel } = createPortalActions({
    inventory, world, player, dialogs, isSafeAreaSealed, focusMapOn,
    materializeVisibleMapContent, rememberPlayerVision, queueRunSave,
  });

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

  const raiseNearbyEnemiesBySound = (center: MapPosition) => {
    setMapEnemyWorld((current) => ({
      ...current,
      enemies: current.enemies.map((enemy) => {
        if (enemy.isBoss || enemy.permanentSleep || chebyshevDistance(enemy.position, center) > 5) return enemy;
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

  const openExtractionShrine = () => {
    if (effectiveRoomType(mapPosition) !== "extractionShrine") return;
    setExtractionShrineOpen(true);
  };

  const extractCardsAtExtractionShrine = (deckId: string, cardIds: number[]) => {
    if (effectiveRoomType(mapPosition) !== "extractionShrine") return null;
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
    const preserved = shouldPreserveTicket(blessings.includes("archaeologist"));
    if (!preserved) setCollapsedExtractionShrineRooms((current) => new Set(current).add(roomKey));
    setMapMessage(`${selectedCards.map((card) => card.name).join(", ")} 추출 완료. 추출의 성소가 ${preserved ? "보존되었습니다." : "붕괴했습니다."}`);
    queueRunSave(RUN_SAVE_POLICY.stateChangeDelayMs);
    return selectedCards;
  };

  return { useCurrentPortal, confirmPortalTravel, useCurrentHeal, useCurrentRecoveryShrine, useCurrentVitalityShrine, activateMindEye, useCurrentMindEyeShrine, openTransformShrine, transformCardsAtShrine, openTreasureChest, openExtractionShrine, extractCardsAtExtractionShrine };
}
