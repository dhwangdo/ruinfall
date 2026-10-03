import { useEffect, useRef, useState } from "react";

export const RESET_HOLD_DURATION_MS = 1_000;

type RunKeyboardControlsOptions = {
  playerNameSetupOpen: boolean;
  saveRunNow: (force?: boolean) => boolean;
  showMapMessage: (message: string) => void;
  clearRunSave: () => void;
  startNewRun: () => void;
};

export function useRunKeyboardControls(options: RunKeyboardControlsOptions) {
  const [resetHoldProgress, setResetHoldProgress] = useState(0);
  const resetHoldStartedAtRef = useRef<number | null>(null);
  const resetHoldTimerRef = useRef<number | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const stopResetHold = () => {
      resetHoldStartedAtRef.current = null;
      if (resetHoldTimerRef.current !== null) window.clearInterval(resetHoldTimerRef.current);
      resetHoldTimerRef.current = null;
      setResetHoldProgress(0);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const currentOptions = optionsRef.current;
      const target = event.target as HTMLElement | null;
      if (event.code === "F8") {
        event.preventDefault();
        if (!currentOptions.playerNameSetupOpen && currentOptions.saveRunNow(true)) {
          currentOptions.showMapMessage("저장했습니다.");
        }
        return;
      }
      if (event.code !== "KeyR" || event.repeat || currentOptions.playerNameSetupOpen
        || target?.isContentEditable || target?.matches("input, textarea, select")) return;
      event.preventDefault();
      resetHoldStartedAtRef.current = performance.now();
      resetHoldTimerRef.current = window.setInterval(() => {
        const startedAt = resetHoldStartedAtRef.current;
        if (startedAt === null) return;
        const progress = Math.min(1, (performance.now() - startedAt) / RESET_HOLD_DURATION_MS);
        setResetHoldProgress(progress);
        if (progress < 1) return;
        stopResetHold();
        const latestOptions = optionsRef.current;
        latestOptions.clearRunSave();
        latestOptions.startNewRun();
      }, 50);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "KeyR") stopResetHold();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", stopResetHold);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", stopResetHold);
      stopResetHold();
    };
  }, [options.playerNameSetupOpen]);

  return resetHoldProgress;
}
