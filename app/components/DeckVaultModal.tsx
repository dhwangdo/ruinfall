import type { DeckCase } from "../game/rewards";
import { canUnlockDeckVault, DECK_VAULT_KEY_COST } from "../game/deckVaultRules";
import { DeckVaultCards } from "./DeckVaultCards";
import { DeckName } from "./DeckName";
import { DeckEditorPreviews } from "./DeckEditorPreviews";
import { useDeckEditorPreviews } from "../hooks/useDeckEditorPreviews";

export function DeckVaultModal({ deck, keys, onClose, onUnlock }: {
  deck: DeckCase; keys: number; onClose: () => void; onUnlock: () => void;
}) {
  const previews = useDeckEditorPreviews();
  return (
    <div className="shop-overlay shrine-overlay deck-vault-overlay" role="dialog" aria-modal="true"
      aria-labelledby="deck-vault-title" onClick={onClose}>
      <section className="deck-vault-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <h2 id="deck-vault-title"><DeckName deck={deck} /></h2>
            <p>{deck.cards.length} / {deck.capacity}장</p>
          </div>
          <button type="button" onClick={onClose}>나가기</button>
        </header>
        <DeckVaultCards deck={deck} onCardHover={previews.actions.moveDeckCardPreview}
          onCardLeave={previews.actions.clearCardPreview} />
        <footer>
          <span className="map-currency-count map-key-count">보유 열쇠 {keys}개</span>
          <button type="button" disabled={!canUnlockDeckVault(keys, false)} onClick={onUnlock}>
            열쇠 {DECK_VAULT_KEY_COST}개로 개방
          </button>
        </footer>
      </section>
      <DeckEditorPreviews controlsRef={previews.controlsRef} suppressed={false} />
    </div>
  );
}
