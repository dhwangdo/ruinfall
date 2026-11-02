import { useEffect, useEffectEvent, useState, type RefObject } from "react";
import { useRunSaveLifecycle } from "./useRunSaveLifecycle";
import type { RunInventory } from "./useRunInventory";
import type { RunPlayer } from "./useRunPlayer";
import type { RunWorld } from "./useRunWorld";
import type { GameState } from "../game/battleState";
import { isSafeAreaPosition } from "../game/mapRules";
import { clearRunSave, readRunSave } from "../game/saveGame";
import { createRunSaveSnapshot, prepareRunRestore, type PreparedRunRestore } from "../game/runSaveState";
import type { SavedRunState } from "../game/runTypes";

type Options = {
  world: RunWorld;
  inventory: RunInventory;
  player: RunPlayer;
  allowed: boolean;
  status: GameState["status"];
  counters: {
    rareCardDropChanceRef: RefObject<number>;
  };
  onInitialize: () => void;
  onRestore: (state: PreparedRunRestore) => void;
};

/** Coordinates persistence without making the page track every saved field separately. */
export function useRunPersistence({ world, inventory, player, allowed, status, counters, onInitialize, onRestore }: Options) {
  const [saveReady, setSaveReady] = useState(false);
  const { saveRunNow, queueRunSave, cancelQueuedSave, updateSaveSnapshot } = useRunSaveLifecycle();
  const initialize = useEffectEvent(onInitialize);
  const restore = useEffectEvent(onRestore);
  const { saveState: worldState } = world;
  const { saveState: inventoryState, nextCardIdRef, nextConsumableIdRef } = inventory;
  const { saveState: playerState } = player;
  const { rareCardDropChanceRef } = counters;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      initialize();
      const saved = readRunSave<SavedRunState>();
      if (saved) restore(prepareRunRestore(saved.state, isSafeAreaPosition));
      setSaveReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    updateSaveSnapshot(createRunSaveSnapshot({
      ...worldState, ...inventoryState, ...playerState,
      nextCardId: nextCardIdRef.current,
      nextConsumableId: nextConsumableIdRef.current,
      rareCardDropChance: rareCardDropChanceRef.current,
    }), saveReady && allowed);
  }, [worldState, inventoryState, playerState, nextCardIdRef, nextConsumableIdRef,
    rareCardDropChanceRef, saveReady, allowed, updateSaveSnapshot]);

  useEffect(() => {
    if (status === "lost") clearRunSave();
  }, [status]);

  return { saveReady, saveRunNow, queueRunSave, cancelQueuedSave };
}
