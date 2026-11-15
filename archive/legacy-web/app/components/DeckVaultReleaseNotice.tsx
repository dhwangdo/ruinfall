import type { DeckCase } from "../game/rewards";

export function DeckVaultReleaseNotice({ deck }: { deck: DeckCase }) {
  const lastSyllable = deck.name.charCodeAt(deck.name.length - 1) - 0xac00;
  const particle = lastSyllable >= 0 && lastSyllable <= 11171 && lastSyllable % 28 === 0 ? "를" : "을";

  return <div className="deck-vault-release" role="status" aria-live="polite">
    <div className="deck-vault-release-notice">
      <span className="deck-vault-release-emblem" aria-hidden="true">
        <span className="deck-stack-icon" />
      </span>
      <p>덱 <strong>「{deck.name}」</strong>{particle} 해방했습니다!</p>
    </div>
  </div>;
}
