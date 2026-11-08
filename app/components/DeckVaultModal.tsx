import { occupiedDeckSpace } from "../game/stickers";
import { useRef } from "react";
import type { DeckCase } from "../game/rewards";
import { DeckVaultUnlockButton } from "./DeckVaultUnlockButton";
import { DeckVaultCards } from "./DeckVaultCards";
import { DeckName } from "./DeckName";
import { DeckEditorPreviews } from "./DeckEditorPreviews";
import { useDeckEditorPreviews } from "../hooks/useDeckEditorPreviews";

export function DeckVaultModal({ deck, keys, onClose, onUnlock }: {
  deck: DeckCase; keys: number; onClose: () => void; onUnlock: () => void;
}) {
  const previews = useDeckEditorPreviews();
  const panelRef = useRef<HTMLElement>(null);
  const showHoldProgress = (progress: number) => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.setProperty("--vault-charge", String(progress));
    const phase = progress >= .25 ? "charged" : progress > 0 ? "holding" : "idle";
    if (panel.dataset.unlockPhase !== phase) panel.dataset.unlockPhase = phase;
    if (progress === 0) {
      panel.style.removeProperty("--vault-shake-x");
      panel.style.removeProperty("--vault-shake-y");
      panel.style.removeProperty("--vault-shake-angle");
    } else if (progress >= .25) {
      const ramp = Math.min(1, (progress - .25) / .75) ** 1.6;
      panel.style.setProperty("--vault-shake-x", `${.5 + 2.2 * ramp}px`);
      panel.style.setProperty("--vault-shake-y", `${.35 + 1.9 * ramp}px`);
      panel.style.setProperty("--vault-shake-angle", `${.04 + .2 * ramp}deg`);
    }
  };
  return (
    <div className="shop-overlay shrine-overlay deck-vault-overlay" role="dialog" aria-modal="true"
      aria-labelledby="deck-vault-title" onClick={onClose}>
      <section ref={panelRef} className="deck-vault-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 id="deck-vault-title"><DeckName deck={deck} /></h2>
            <p>{occupiedDeckSpace(deck.cards)} / {deck.capacity}장</p>
          </div>
          <button type="button" onClick={onClose}>나가기</button>
        </header>
        <DeckVaultCards deck={deck} onCardHover={previews.actions.moveDeckCardPreview}
          onCardLeave={previews.actions.clearCardPreview} />
        <footer>
          <span className="map-currency-count map-key-count">보유 열쇠 {keys}개</span>
          <DeckVaultUnlockButton key={deck.id} keys={keys} onUnlock={onUnlock} onHoldProgress={showHoldProgress} />
        </footer>
      </section>
      <DeckEditorPreviews controlsRef={previews.controlsRef} suppressed={false} />
    </div>
  );
}
