import type { CSSProperties } from "react";
import { DeckName } from "./DeckName";
import type { DeckCase } from "../game/rewards";
import { useMapDeckSelectorDrag } from "../hooks/useMapDeckSelectorDrag";

type MapDeckSelectorProps = {
  ownedDecks: DeckCase[];
  maxOwnedDecks: number;
  activeDeck: DeckCase | undefined;
  open: boolean;
  closing: boolean;
  closingDeckId: string | null;
  onToggle: () => void;
  onSelectDeck: (deck: DeckCase) => void;
};

export function MapDeckSelector({
  ownedDecks,
  maxOwnedDecks,
  activeDeck,
  open,
  closing,
  closingDeckId,
  onToggle,
  onSelectDeck,
}: MapDeckSelectorProps) {
  const { selectorRef, triggerRef, offset, dragging, onPointerDown, onPointerMove, onPointerEnd, allowClick } = useMapDeckSelectorDrag();
  const slotCount = Math.max(maxOwnedDecks, ownedDecks.length);
  const centerIndex = (slotCount - 1) / 2;
  return (
    <div
      ref={selectorRef}
      className={`map-deck-selector ${dragging ? "is-dragging" : ""}`}
      style={{ translate: `${offset.x}px ${offset.y}px` }}
    >
      <div onPointerDown={(event) => event.stopPropagation()}>
        {open && (
          <div
            className={`map-deck-selector-menu ${closing ? "is-closing" : "is-opening"}`}
            style={{ "--deck-stagger": `${140 / Math.max(1, slotCount - 1)}ms` } as CSSProperties}
            role="menu"
            aria-label="전투에 사용할 덱"
          >
            {Array.from({ length: slotCount }, (_, index) => {
              const deck = ownedDecks[index];
              const itemStyle = {
                "--deck-offset": index - centerIndex,
                "--deck-arc-inset": Math.abs(index - centerIndex),
                "--deck-angle": `${Math.max(-30, Math.min(30, (index - centerIndex) * 15))}deg`,
                "--deck-index": index,
                "--deck-reverse-index": slotCount - 1 - index,
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
                  <strong><DeckName deck={deck} showEditions={false} showGenerationDebug={false} /></strong>
                  <small>{deck.cards.length} / {deck.capacity}</small>
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          ref={triggerRef}
          className={`map-deck-selector-trigger ${open && !closing ? "is-open" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onLostPointerCapture={onPointerEnd}
          onClick={(event) => { if (allowClick(event)) onToggle(); }}
          title="클릭하여 덱 선택 · 드래그하여 위치 이동"
          aria-expanded={open && !closing}
          aria-label={`전투 덱 선택. 현재 ${activeDeck?.name ?? "없음"}`}
        >
          <span className="deck-stack-icon" aria-hidden="true" />
          <strong>{activeDeck?.name
            ? <DeckName deck={activeDeck} showEditions={false} showGenerationDebug={false} />
            : "덱 준비 중"}</strong>
          <small>({activeDeck?.cards.length ?? 0}/{activeDeck?.capacity ?? 0})</small>
        </button>
      </div>
    </div>
  );
}
