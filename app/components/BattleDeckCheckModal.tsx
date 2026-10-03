import type { MouseEvent as ReactMouseEvent } from "react";
import { DeckEditorCardIcon } from "./DeckEditorCardIcon";
import { DeckName } from "./DeckName";
import { deckEditorCardStackStyle } from "./deckEditorCardStackStyle";
import { groupAndSortDeckEditorCards } from "../game/deckEditorViews";
import type { DeckCase, DeckEdition } from "../game/rewards";

export function BattleDeckCheckModal({
  decks,
  activeDeckId,
  previewDeckId,
  sort,
  transformedCardNewIds,
  onSelectDeck,
  onEditionTooltipHover,
  onEditionTooltipLeave,
  onConfirm,
}: {
  decks: DeckCase[];
  activeDeckId: string | undefined;
  previewDeckId: string | null;
  sort: "cost" | "rarity";
  transformedCardNewIds: Set<number>;
  onSelectDeck: (deckId: string) => void;
  onEditionTooltipHover: (event: ReactMouseEvent<HTMLElement>, edition: DeckEdition) => void;
  onEditionTooltipLeave: () => void;
  onConfirm: (deckId: string) => void;
}) {
  const selectedDeck = decks.find((deck) => deck.id === previewDeckId)
    ?? decks.find((deck) => deck.id === activeDeckId)
    ?? decks[0];
  const cardGroups = selectedDeck
    ? groupAndSortDeckEditorCards(selectedDeck.cards, sort, transformedCardNewIds)
    : [];

  return (
    <div className="battle-deck-check-overlay" role="dialog" aria-modal="true" aria-labelledby="battle-deck-check-title">
      <section className="battle-deck-check-panel">
        <h2 id="battle-deck-check-title">잠깐! 올바른 덱을 선택하셨나요?</h2>
        <span>이번 전투에서 사용할 덱을 선택하세요.</span>
        <div className="battle-deck-check-options">
          {decks.map((deck) => (
            <button
              type="button"
              key={`battle-deck-check-${deck.id}`}
              className={deck.id === selectedDeck?.id ? "is-selected" : ""}
              onClick={() => onSelectDeck(deck.id)}
            >
              <strong>
                <DeckName
                  deck={deck}
                  onEditionTooltipHover={onEditionTooltipHover}
                  onEditionTooltipLeave={onEditionTooltipLeave}
                />
              </strong>
              <small>{deck.cards.length} / {deck.capacity}</small>
            </button>
          ))}
        </div>
        {selectedDeck && (
          <div className="battle-deck-check-composition">
            <h3><DeckName deck={selectedDeck} showEditions={false} /> 구성</h3>
            <div className="battle-deck-check-cards">
              {cardGroups.map(({ card, cardIds }) => (
                <div
                  className={`deck-editor-card rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""}`}
                  key={`${card.id}-${card.name}`}
                  style={deckEditorCardStackStyle(cardIds.length)}
                >
                  <DeckEditorCardIcon card={card} count={cardIds.length} />
                </div>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          className="battle-deck-check-confirm"
          disabled={!selectedDeck}
          onClick={() => selectedDeck && onConfirm(selectedDeck.id)}
        >
          이 덱으로 전투 시작
        </button>
      </section>
    </div>
  );
}
