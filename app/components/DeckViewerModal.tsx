import type { MouseEvent as ReactMouseEvent, RefObject } from "react";
import { CardFaceView } from "./CardFace";
import { DeckName } from "./DeckName";
import { cardNameConstellationImage } from "../cardConstellations";
import type { Card } from "../game/cards";
import type { DeckCase, DeckEdition } from "../game/rewards";

type DeckSort = "cost" | "rarity";

type DeckViewerModalProps = {
  viewedDeck: DeckCase | undefined;
  ownedDecks: DeckCase[];
  maxOwnedDecks: number;
  sort: DeckSort;
  cards: Card[];
  gridRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSelectDeck: (deckId: string) => void;
  onSortChange: (sort: DeckSort) => void;
  onEditionTooltipHover: (event: ReactMouseEvent<HTMLElement>, edition: DeckEdition) => void;
  onEditionTooltipLeave: () => void;
  onCardKeywordHover: (card: Card, right: number, top: number) => void;
  onClearCardKeywordHover: () => void;
};

export function DeckViewerModal({
  viewedDeck,
  ownedDecks,
  maxOwnedDecks,
  sort,
  cards,
  gridRef,
  onClose,
  onSelectDeck,
  onSortChange,
  onEditionTooltipHover,
  onEditionTooltipLeave,
  onCardKeywordHover,
  onClearCardKeywordHover,
}: DeckViewerModalProps) {
  return (
    <div className="deck-viewer-overlay" role="dialog" aria-modal="true" aria-labelledby="deck-viewer-title">
      <section className="deck-viewer-panel">
        <header>
          <div>
            <p>DECK</p>
            <h2 id="deck-viewer-title">{viewedDeck?.name ?? "덱 보기"}</h2>
            <span>{viewedDeck?.cards.length ?? 0} / {viewedDeck?.capacity ?? 0}장</span>
          </div>
          <button type="button" onClick={onClose}>닫기</button>
        </header>
        <nav className="deck-viewer-tabs" aria-label="볼 덱 선택">
          {ownedDecks.map((deck) => (
            <button
              type="button"
              className={deck.id === viewedDeck?.id ? "is-active" : ""}
              key={`viewer-tab-${deck.id}`}
              onClick={() => onSelectDeck(deck.id)}
            >
              <strong>
                <DeckName
                  deck={deck}
                  onEditionTooltipHover={onEditionTooltipHover}
                  onEditionTooltipLeave={onEditionTooltipLeave}
                />
              </strong>
              <span>{deck.cards.length} / {deck.capacity}</span>
            </button>
          ))}
          {Array.from({ length: maxOwnedDecks - ownedDecks.length }, (_, index) => (
            <span className="is-empty" key={`viewer-empty-${index}`}>빈 덱 칸</span>
          ))}
        </nav>
        <div className="deck-viewer-sort deck-editor-sort" aria-label="카드 정렬 방식">
          <button type="button" className={sort === "cost" ? "is-active" : ""} onClick={() => onSortChange("cost")}>코스트 순</button>
          <button type="button" className={sort === "rarity" ? "is-active" : ""} onClick={() => onSortChange("rarity")}>희귀도 순</button>
        </div>
        <div className="deck-viewer-grid" ref={gridRef}>
          {cards.map((card) => (
            <div
              className="deck-viewer-card"
              key={`viewer-${card.id}`}
              onMouseEnter={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                onCardKeywordHover(card, bounds.right, bounds.top);
              }}
              onMouseMove={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                onCardKeywordHover(card, bounds.right, bounds.top);
              }}
              onMouseLeave={onClearCardKeywordHover}
            >
              <div className={`card-face ${card.kind} ${card.damageType}`}>
                <CardFaceView card={card} cardNameWatermarkImage={cardNameConstellationImage(card.name)} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
