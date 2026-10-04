import { useState, type ComponentProps } from "react";
import { CardFace } from "./CardFace";
import { DeckName } from "./DeckName";
import type { Card } from "../game/cards";
import { IRON_WALL_COST } from "../game/cardEffects";
import { CARD_RARITY_SORT_RANK, UNPLAYABLE_CARD_EFFECTS } from "../game/cards";
import type { DeckCase } from "../game/rewards";
import type { ShrineResult } from "../game/runTypes";

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
  const [result, setResult] = useState<ShrineResult | null>(null);
  const [sort, setSort] = useState<"cost" | "rarity">("rarity");

  const deck = decks.find((item) => item.id === deckId) ?? decks[0];
  const pendingCards = deck?.cards.filter((card) => pendingCardIds.includes(card.id)) ?? [];
  const cardRarityRank = (card: Card) => CARD_RARITY_SORT_RANK[card.rarity];
  const cardSortCost = (card: Card) => UNPLAYABLE_CARD_EFFECTS.has(card.effect)
    ? -1
    : card.effect === "ironWall" ? IRON_WALL_COST : card.cost ?? -1;
  const deckCards = [...(deck?.cards ?? [])].sort((left, right) => {
    const primary = sort === "cost"
      ? cardSortCost(left) - cardSortCost(right)
      : cardRarityRank(left) - cardRarityRank(right);
    const secondary = sort === "cost"
      ? cardRarityRank(left) - cardRarityRank(right)
      : cardSortCost(left) - cardSortCost(right);
    return primary || secondary || left.name.localeCompare(right.name, "ko");
  });

  const confirmExtraction = () => {
    const extractedCards = onExtract(deck?.id ?? deckId, pendingCardIds);
    if (extractedCards?.length) setResult({ cards: extractedCards });
  };

  return (
    <div className="shop-overlay shrine-overlay" role="dialog" aria-modal="true" aria-labelledby="shrine-title">
      <section className="shop-panel shrine-panel">
        <header>
          <div>
            <h2 id="shrine-title">추출의 성소</h2>
            <span>희귀 카드를 제외하고 최대 2장 추출합니다. 사용하면 추출의 성소는 붕괴합니다.</span>
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
                <div className={`shrine-result-card card-face ${card.kind} ${card.damageType}`} key={`shrine-result-${card.id}`}>
                  <CardFace card={card} />
                </div>
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
                if (payload.startsWith("shrine-pending:")) {
                  const cardId = Number(payload.slice("shrine-pending:".length));
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
                    {`덱 '${item.name}'`}
                  </button>
                ))}
              </nav>
              <header className="shrine-deck-header">
                <strong>{deck ? (
                  <DeckName
                    deck={deck}
                    onEditionTooltipHover={onEditionTooltipHover}
                    onEditionTooltipLeave={onEditionTooltipLeave}
                  />
                ) : "선택한 덱"}</strong>
                <div className="shrine-deck-header-tools">
                  <div className="shrine-card-sort deck-editor-sort" aria-label="추출성소 카드 정렬 방식">
                    <button type="button" className={sort === "rarity" ? "is-active" : ""} onClick={() => setSort("rarity")}>희귀도 순</button>
                    <button type="button" className={sort === "cost" ? "is-active" : ""} onClick={() => setSort("cost")}>코스트 순</button>
                  </div>
                  <small>{deck?.cards.length ?? 0}장</small>
                </div>
              </header>
              <div className="shrine-deck-cards">
                {deckCards.map((card) => (
                  <div
                    className={`shrine-deck-card card-face ${card.kind} ${card.damageType} ${card.rarity === "rare" ? "is-extraction-locked" : ""} ${draggedCardId === card.id ? "is-dragging" : ""} ${pendingCardIds.includes(card.id) ? "is-selected" : ""}`}
                    key={`shrine-${card.id}`}
                    draggable={card.rarity !== "rare" && Boolean(deck?.cards.length)}
                    onDragStart={(event) => {
                      if (card.rarity === "rare") return;
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
                  >
                    <CardFace card={card} />
                  </div>
                ))}
              </div>
            </section>
            <div className="shrine-transfer-arrow">
              <span className="shrine-arrow-icon" aria-hidden="true" />
              <div className="shrine-collapse-live" role="status" aria-live="polite">
                <span>선택</span>
                <strong>{pendingCards.length} / 2</strong>
              </div>
            </div>
            <div className="shrine-extract-column">
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
                  <div
                    className={`shrine-pending-card card-face ${card.kind} ${card.damageType}`}
                    key={`shrine-pending-${card.id}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", `shrine-pending:${card.id}`);
                    }}
                    onClick={() => setPendingCardIds((current) => current.filter((id) => id !== card.id))}
                  >
                    <CardFace card={card} />
                  </div>
                ))}
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
    </div>
  );
}
