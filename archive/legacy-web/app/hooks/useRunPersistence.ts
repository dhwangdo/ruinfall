import { useCallback, useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { useRunSaveLifecycle } from "./useRunSaveLifecycle";
import type { RunInventory } from "./useRunInventory";
import type { RunPlayer } from "./useRunPlayer";
import type { RunWorld } from "./useRunWorld";
import type { GameState } from "../game/battleState";
import { isSafeAreaPosition, REGION_COUNT } from "../game/mapRules";
import { clearRunSave, readRunSave } from "../game/saveGame";
import { createRunSaveSnapshot, prepareRunRestore, type PreparedRunRestore } from "../game/runSaveState";
import type { SavedRunState } from "../game/runTypes";
import { prepareMapRegions } from "../game/mapPreparation";
import { createRandomSeed } from "../game/randomNames";
import { mapPreparationFrame } from "./mapPreparationFrame";

type Options = {
  world: RunWorld;
  inventory: RunInventory;
  player: RunPlayer;
  allowed: boolean;
  status: GameState["status"];
  counters: {
    rareCardDropChanceRef: RefObject<number>;
  };
  onInitialize: (seed?: number) => void;
  onRestore: (state: PreparedRunRestore) => void;
};

/** Coordinates persistence without making the page track every saved field separately. */
export function useRunPersistence({ world, inventory, player, allowed, status, counters, onInitialize, onRestore }: Options) {
  const [saveReady, setSaveReady] = useState(false);
  const [preparingMap, setPreparingMap] = useState(true);
  const [mapProgress, setMapProgress] = useState({ completed: 0, total: REGION_COUNT });
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const preparationTokenRef = useRef(0);
  const prepareMap = useCallback(async (seed: number, cancelled: () => boolean = () => false) => {
    const token = ++preparationTokenRef.current;
    setPreparingMap(true);
    setPreparationError(null);
    try {
      const completed = await prepareMapRegions(seed, mapPreparationFrame,
        (completed, total) => setMapProgress({ completed, total }),
        () => cancelled() || preparationTokenRef.current !== token);
      if (completed) setPreparingMap(false);
      return completed;
    } catch (error) {
      if (!cancelled() && preparationTokenRef.current === token) {
        setPreparationError(error instanceof Error ? error.message : String(error));
      }
      return false;
    }
  }, []);
  const { saveRunNow, queueRunSave, cancelQueuedSave, updateSaveSnapshot } = useRunSaveLifecycle();
  const initialize = useEffectEvent(onInitialize);
  const restore = useEffectEvent(onRestore);
  const { saveState: worldState } = world;
  const { saveState: inventoryState, nextCardIdRef, nextConsumableIdRef } = inventory;
  const { saveState: playerState } = player;
  const { rareCardDropChanceRef } = counters;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const saved = readRunSave<SavedRunState>();
      const seed = saved?.state.mapSeed ?? createRandomSeed();
      if (!await prepareMap(seed, () => cancelled)) return;
      if (saved) restore(prepareRunRestore(saved.state, isSafeAreaPosition));
      else initialize(seed);
      setSaveReady(true);
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [prepareMap]);

  useEffect(() => {
    updateSaveSnapshot(createRunSaveSnapshot({
      ...worldState, ...inventoryState, ...playerState,
      nextCardId: nextCardIdRef.current,
      nextConsumableId: nextConsumableIdRef.current,
      rareCardDropChance: rareCardDropChanceRef.current,
    }), saveReady && allowed && !preparingMap);
  }, [worldState, inventoryState, playerState, nextCardIdRef, nextConsumableIdRef,
    rareCardDropChanceRef, saveReady, allowed, preparingMap, updateSaveSnapshot]);

  useEffect(() => {
    if (status === "lost") clearRunSave();
  }, [status]);

  return { saveReady, preparingMap, mapProgress, preparationError, prepareMap,
    saveRunNow, queueRunSave, cancelQueuedSave };
}
