import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { DECK_VAULT_KEY_COST, canUnlockDeckVault, deckVaultUnlockHold } from "../game/deckVaultRules";

type HoldSource = "pointer" | "keyboard";

/** Only an enabled button can complete a continuous 2-second hold. */
export function DeckVaultUnlockButton({ keys, onUnlock, onHoldProgress }: {
  keys: number; onUnlock: () => void; onHoldProgress: (progress: number) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<number | null>(null);
  const sourcesRef = useRef(new Set<HoldSource>());
  const phaseRef = useRef<"idle" | "holding" | "complete">("idle");
  const optionsRef = useRef({ keys, onUnlock, onHoldProgress });
  const disabled = !canUnlockDeckVault(keys, false);
  useLayoutEffect(() => { optionsRef.current = { keys, onUnlock, onHoldProgress }; }, [keys, onUnlock, onHoldProgress]);

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }, []);
  const reset = useCallback(() => {
    cancelFrame();
    sourcesRef.current.clear();
    phaseRef.current = "idle";
    buttonRef.current?.style.setProperty("--vault-unlock-progress", "0");
    buttonRef.current?.removeAttribute("data-holding");
    optionsRef.current.onHoldProgress(0);
  }, [cancelFrame]);
  const stop = (source: HoldSource) => {
    sourcesRef.current.delete(source);
    if (!sourcesRef.current.size) reset();
  };
  const start = (source: HoldSource) => {
    if (!canUnlockDeckVault(optionsRef.current.keys, false)) return;
    sourcesRef.current.add(source);
    if (phaseRef.current !== "idle") return;
    phaseRef.current = "holding";
    buttonRef.current?.setAttribute("data-holding", "true");
    const startedAt = performance.now();
    const tick = () => {
      if (!canUnlockDeckVault(optionsRef.current.keys, false)) { reset(); return; }
      const hold = deckVaultUnlockHold(performance.now() - startedAt, optionsRef.current.keys);
      buttonRef.current?.style.setProperty("--vault-unlock-progress", String(hold.progress));
      optionsRef.current.onHoldProgress(hold.progress);
      if (hold.complete) {
        frameRef.current = null;
        phaseRef.current = "complete";
        optionsRef.current.onUnlock();
      } else frameRef.current = window.requestAnimationFrame(tick);
    };
    tick();
  };

  useEffect(() => {
    const visibility = () => { if (document.hidden) reset(); };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", visibility);
      cancelFrame();
      optionsRef.current.onHoldProgress(0);
    };
  }, [reset, cancelFrame]);

  return <button ref={buttonRef} type="button" className="deck-vault-unlock"
    disabled={disabled}
    title={disabled ? `열쇠 ${DECK_VAULT_KEY_COST}개가 필요합니다` : "2초간 눌러 개방"}
    aria-label={disabled ? `열쇠 ${DECK_VAULT_KEY_COST}개로 개방: 열쇠 부족`
      : `열쇠 ${DECK_VAULT_KEY_COST}개로 개방: 2초간 누르기`}
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault();
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Input may already have ended. */ }
      start("pointer");
    }}
    onPointerUp={() => stop("pointer")}
    onPointerCancel={() => stop("pointer")}
    onPointerLeave={() => stop("pointer")}
    onLostPointerCapture={() => stop("pointer")}
    onKeyDown={event => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (!event.repeat) start("keyboard");
    }}
    onKeyUp={event => {
      if (event.key === " " || event.key === "Enter") { event.preventDefault(); stop("keyboard"); }
    }}
    onBlur={reset}
    onClick={event => event.preventDefault()}
    onContextMenu={event => event.preventDefault()}>
    <span className="deck-vault-unlock-fill" aria-hidden="true" />
    <span className="deck-vault-unlock-label">열쇠 {DECK_VAULT_KEY_COST}개로 개방</span>
  </button>;
}
