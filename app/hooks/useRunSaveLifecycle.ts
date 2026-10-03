import { useCallback, useEffect, useRef } from "react";
import { RUN_SAVE_POLICY, writeRunSave } from "../game/saveGame";
import type { SavedRunState } from "../game/runTypes";

export function useRunSaveLifecycle() {
  const latestSaveStateRef = useRef<SavedRunState | null>(null);
  const saveDirtyRef = useRef(false);
  const saveAllowedRef = useRef(false);
  const queuedSaveTimerRef = useRef<number | null>(null);

  const saveRunNow = useCallback((force = false) => {
    if ((!saveAllowedRef.current && !force) || !latestSaveStateRef.current) return false;
    writeRunSave(latestSaveStateRef.current);
    saveDirtyRef.current = false;
    return true;
  }, []);

  const queueRunSave = useCallback((delay = RUN_SAVE_POLICY.stateChangeDelayMs) => {
    if (queuedSaveTimerRef.current !== null) {
      window.clearTimeout(queuedSaveTimerRef.current);
    }
    queuedSaveTimerRef.current = window.setTimeout(() => {
      queuedSaveTimerRef.current = null;
      saveRunNow();
    }, delay);
  }, [saveRunNow]);

  const cancelQueuedSave = useCallback(() => {
    if (queuedSaveTimerRef.current === null) return;
    window.clearTimeout(queuedSaveTimerRef.current);
    queuedSaveTimerRef.current = null;
  }, []);

  const updateSaveSnapshot = useCallback((snapshot: SavedRunState, allowed: boolean) => {
    latestSaveStateRef.current = snapshot;
    saveAllowedRef.current = allowed;
    saveDirtyRef.current = true;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (saveDirtyRef.current && saveAllowedRef.current && latestSaveStateRef.current) {
        writeRunSave(latestSaveStateRef.current);
        saveDirtyRef.current = false;
      }
    }, RUN_SAVE_POLICY.roamingIntervalMs);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => cancelQueuedSave, [cancelQueuedSave]);

  return { saveRunNow, queueRunSave, cancelQueuedSave, updateSaveSnapshot };
}
