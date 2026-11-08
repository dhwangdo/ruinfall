import { occupiedDeckSpace } from "../game/stickers";
import { cardEnergyCost } from "../game/cardEffects";
import { CardVisual } from "./CardVisual";
import { useState, type ComponentProps, type MouseEvent } from "react";
import { DeckName } from "./DeckName";
import { DeckEditorPreviews } from "./DeckEditorPreviews";
import { useDeckEditorPreviews } from "../hooks/useDeckEditorPreviews";
import { RarityText } from "./RarityText";
import type { Card } from "../game/cards";
import { CARD_RARITY_SORT_RANK, UNPLAYABLE_CARD_EFFECTS } from "../game/cards";
import type { DeckCase } from "../game/rewards";
import type { ExtractionShrineResult } from "../game/runTypes";

type EditionTooltipHoverHandler = ComponentProps<typeof DeckName>["onEditionTooltipHover"];

type ExtractionShrineModalProps = {
  decks: DeckCase[];
  initialDeckId: string;
  onClose: () => void;
  onExtract: (deckId: string, cardIds: number[]) => Card[] | null;
  onEditionTooltipHover?: EditionTooltipHoverHandler;
  onEditionTooltipLeave?: () => void;
};

export function ExtractionShrineModal({
  decks,
  initialDeckId,
  onClose,
  onExtract,
  onEditionTooltipHover,
  onEditionTooltipLeave,
}: ExtractionShrineModalProps) {
  const [deckId, setDeckId] = useState(initialDeckId);
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);
  const [pendingCardIds, setPendingCardIds] = useState<number[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [result, setResult] = useState<ExtractionShrineResult | null>(null);
  const previews = useDeckEditorPreviews();
  const cardPreviewProps = (card: Card) => ({
    onMouseEnter: (event: MouseEvent<HTMLDivElement>) => previews.actions.moveDeckCardPreview(event, card),
    onMouseMove: (event: MouseEvent<HTMLDivElement>) => previews.actions.moveDeckCardPreview(event, card),
    onMouseLeave: previews.actions.clearCardPreview,
  });

  const deck = decks.find((item) => item.id === deckId) ?? decks[0];
  const pendingCards = deck?.cards.filter((card) => pendingCardIds.includes(card.id)) ?? [];
  const cardRarityRank = (card: Card) => CARD_RARITY_SORT_RANK[card.rarity];
  const cardSortCost = (card: Card) => UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    ? -1
    : cardEnergyCost(card) ?? -1;
  const deckCards = [...(deck?.cards ?? [])].sort((left, right) => {
    const primary = cardRarityRank(left) - cardRarityRank(right);
    const secondary = cardSortCost(left) - cardSortCost(right);
    return primary || secondary || left.name.localeCompare(right.name, "ko");
  });

  const confirmExtraction = () => {
    const extractedCards = onExtract(deck?.id ?? deckId, pendingCardIds);
    if (extractedCards?.length) setResult({ cards: extractedCards });
  };

  return (
    <div className="shop-overlay shrine-overlay" role="dialog" aria-modal="true" aria-labelledby="extraction-shrine-title">
      <section className="shop-panel shrine-panel shrine-workspace-panel">
        <header>
          <div>
            <h2 id="extraction-shrine-title">추출의 성소</h2>
            <span><RarityText>희귀 카드를 제외하고 최대 2장 추출합니다. 사용하면 추출의 성소는 붕괴합니다.</RarityText></span>
          </div>
          <div className="shop-header-status">
            <button type="button" onClick={onClose}>나가기</button>
          </div>
        </header>
        {result ? (
          <div className="shrine-result is-collapsed">
            <span className="shrine-result-symbol" aria-hidden="true">✦</span>
            <h3>추출의 성소가 붕괴했습니다</h3>
            <div className="shrine-result-cards">
              {result.cards.map((card) => (
                <CardVisual
                  card={card}
                  variant="compact"
                  className="shrine-result-compact-card"
                  key={`shrine-result-${card.id}`}
                  {...cardPreviewProps(card)}
                />
              ))}
            </div>
            <button type="button" onClick={onClose}>확인</button>
          </div>
        ) : (
          <div className="shrine-transfer">
            <section
              className="shrine-deck-column"
              aria-label={`${deck?.name ?? "선택한 덱"} 카드`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const payload = event.dataTransfer.getData("text/plain");
                if (payload.startsWith("extraction-shrine-pending:")) {
                  const cardId = Number(payload.slice("extraction-shrine-pending:".length));
                  setPendingCardIds((current) => current.filter((id) => id !== cardId));
                }
              }}
            >
              <nav className="shrine-deck-tabs" aria-label="추출할 덱 선택">
                {decks.map((item) => (
                  <button
                    type="button"
                    className={item.id === deck?.id ? "is-active" : ""}
                    key={`shrine-deck-${item.id}`}
                    onClick={() => {
                      setDeckId(item.id);
                      setDraggedCardId(null);
                      setPendingCardIds([]);
                      setDropActive(false);
                    }}
                  >
                    <strong><DeckName deck={item} onEditionTooltipHover={onEditionTooltipHover}
                      onEditionTooltipLeave={onEditionTooltipLeave} /></strong>
                    <small>{occupiedDeckSpace(item.cards)} / {item.capacity}</small>
                  </button>
                ))}
              </nav>
              <div className="shrine-deck-cards">
                {deckCards.map((card) => (
                  <CardVisual
                    card={card}
                    variant="compact"
                    className={`shrine-deck-card ${card.rarity === "rare" ? "is-extraction-locked" : ""} ${draggedCardId === card.id ? "is-dragging" : ""} ${pendingCardIds.includes(card.id) ? "is-selected" : ""}`}
                    key={`shrine-${card.id}`}
                    {...cardPreviewProps(card)}
                    draggable={card.rarity !== "rare" && Boolean(deck?.cards.length)}
                    onDragStart={(event) => {
                      if (card.rarity === "rare") return;
                      previews.actions.clearCardPreview();
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(card.id));
                      setDraggedCardId(card.id);
                    }}
                    onDragEnd={() => {
                      setDraggedCardId(null);
                      setDropActive(false);
                    }}
                    onClick={() => card.rarity !== "rare" && setPendingCardIds((current) => current.includes(card.id)
                      ? current.filter((id) => id !== card.id)
                      : current.length < 2 ? [...current, card.id] : current)}
                  />
                ))}
              </div>
            </section>
            <div className="shrine-extract-column">
              <header className="shrine-target-heading"><strong>추출할 카드</strong><small>{pendingCards.length} / 2</small></header>
              <div
                className={`shrine-extract-slot ${dropActive ? "is-drop-active" : ""} ${pendingCards.length > 0 ? "has-card" : ""}`}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDropActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropActive(true);
                }}
                onDragLeave={() => setDropActive(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  const transferredId = event.dataTransfer.getData("text/plain");
                  const cardId = transferredId ? Number(transferredId) : draggedCardId;
                  setDropActive(false);
                  if (cardId !== null && Number.isFinite(cardId) && deck?.cards.some((card) => card.id === cardId && card.rarity !== "rare")) {
                    setPendingCardIds((current) => current.includes(cardId) || current.length >= 2
                      ? current
                      : [...current, cardId]);
                  }
                }}
              >
                {pendingCards.map((card) => (
                  <CardVisual
                    card={card}
                    variant="compact"
                    className="shrine-pending-card"
                    key={`shrine-pending-${card.id}`}
                    {...cardPreviewProps(card)}
                    draggable
                    onDragStart={(event) => {
                      previews.actions.clearCardPreview();
                      setDraggedCardId(card.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", `extraction-shrine-pending:${card.id}`);
                    }}
                    onDragEnd={() => setDraggedCardId(null)}
                    onClick={() => setPendingCardIds((current) => current.filter((id) => id !== card.id))}
                  />
                ))}
                {pendingCards.length === 0 && <span className="shrine-drop-hint">카드를 선택하거나 끌어놓으세요</span>}
              </div>
              <button
                type="button"
                className="shrine-confirm-extract"
                disabled={pendingCards.length === 0}
                onClick={confirmExtraction}
              >
                {pendingCards.length > 0 ? `${pendingCards.length}장 추출` : "확정"}
              </button>
            </div>
          </div>
        )}
      </section>
      <DeckEditorPreviews controlsRef={previews.controlsRef} suppressed={draggedCardId !== null} />
    </div>
  );
}
