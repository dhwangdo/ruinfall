import type { CSSProperties } from "react";
import { DeckName } from "./DeckName";
import type { DeckCase } from "../game/rewards";

type MapDeckSelectorProps = {
  ownedDecks: DeckCase[];
  activeDeck: DeckCase | undefined;
  noticeVisible: boolean;
  open: boolean;
  closing: boolean;
  closingDeckId: string | null;
  selectionAttention: boolean;
  onToggle: () => void;
  onSelectDeck: (deck: DeckCase) => void;
};

export function MapDeckSelector({
  ownedDecks,
  activeDeck,
  noticeVisible,
  open,
  closing,
  closingDeckId,
  selectionAttention,
  onToggle,
  onSelectDeck,
}: MapDeckSelectorProps) {
  return (
    <div className={`map-deck-selector ${noticeVisible ? "is-notice-visible" : ""}`}>
      <div onPointerDown={(event) => event.stopPropagation()}>
        {open && (
          <div className={`map-deck-selector-menu ${closing ? "is-closing" : "is-opening"}`} role="menu" aria-label="전투에 사용할 덱">
            {Array.from({ length: 3 }, (_, index) => {
              const deck = ownedDecks[index];
              const itemStyle = {
                "--deck-offset": index - 1,
                "--deck-arc-inset": Math.abs(index - 1),
              } as CSSProperties;
              if (!deck) {
                return <span className="map-deck-empty-slot" key={`empty-deck-${index}`} style={itemStyle}>빈 덱 슬롯</span>;
              }
              return (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={deck.id === activeDeck?.id}
                  className={`${deck.id === activeDeck?.id ? "is-selected" : ""} ${closingDeckId === deck.id ? "is-picked" : ""}`}
                  key={deck.id}
                  style={itemStyle}
                  onClick={() => onSelectDeck(deck)}
                >
                  <strong><DeckName deck={deck} showEditions={false} /></strong>
                  <small>{deck.cards.length} / {deck.capacity}</small>
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          className={`map-deck-selector-trigger ${open && !closing ? "is-open" : ""}`}
          onClick={onToggle}
          aria-expanded={open && !closing}
          aria-label={`전투 덱 선택. 현재 ${activeDeck?.name ?? "없음"}`}
        >
          <span className="deck-stack-icon" aria-hidden="true" />
          <strong>{activeDeck?.name ? `덱 '${activeDeck.name}'` : "덱 준비 중"}</strong>
          <small>({activeDeck?.cards.length ?? 0}/{activeDeck?.capacity ?? 0})</small>
        </button>
        {selectionAttention && <span className="map-deck-selector-attention" aria-label="덱 변경 후 전투 덱을 확인하세요">!</span>}
      </div>
    </div>
  );
}
