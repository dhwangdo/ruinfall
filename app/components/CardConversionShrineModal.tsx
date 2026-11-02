import { CardVisual } from "./CardVisual";
import { useState, type DragEvent, type MouseEvent } from "react";
import type { Card } from "../game/cards";
import type { ShrineCardConversionResult } from "../game/shrineRules";
import { DeckEditorPreviews } from "./DeckEditorPreviews";
import { useDeckEditorPreviews } from "../hooks/useDeckEditorPreviews";

type CardConversionShrineModalProps = {
  open: boolean;
  inventoryCards: Card[];
  onClose: () => void;
  onConfirm: (selectedCardIds: number[]) => ShrineCardConversionResult | null;
};

const TRANSFORM_COPY = {
  title: "변환의 성소",
  description: "인벤토리에서 카드 2장을 선택해 변환합니다. 사용하면 변환의 성소는 붕괴합니다.",
  selectionLabel: "변환할 카드",
  inventoryLabel: "인벤토리",
  resultTitle: "변환 결과",
  confirmLabel: "변환",
  maxCards: 2,
  prefix: "transform",
  eligible: (card: Card) => card.rarity !== "legendary",
};

export function CardConversionShrineModal({
  open,
  inventoryCards,
  onClose,
  onConfirm,
}: CardConversionShrineModalProps) {
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [result, setResult] = useState<ShrineCardConversionResult | null>(null);
  const previews = useDeckEditorPreviews();
  const cardPreviewProps = (card: Card) => ({
    onMouseEnter: (event: MouseEvent<HTMLDivElement>) => previews.actions.moveDeckCardPreview(event, card),
    onMouseMove: (event: MouseEvent<HTMLDivElement>) => previews.actions.moveDeckCardPreview(event, card),
    onMouseLeave: previews.actions.clearCardPreview,
  });

  if (!open) return null;

  const mode = "transform";
  const copy = TRANSFORM_COPY;
  const eligibleCards = inventoryCards.filter(copy.eligible);
  const sourceCards = inventoryCards;
  const close = () => {
    onClose();
    setResult(null);
    setSelectedCardIds([]);
    setDraggedCardId(null);
    setDropActive(false);
  };
  const confirm = () => {
    const nextResult = onConfirm(selectedCardIds);
    if (nextResult) {
      setSelectedCardIds([]);
      setDraggedCardId(null);
      setDropActive(false);
      setResult(nextResult);
    }
  };
  const handleSourceDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData("text/plain");
    const pendingPrefix = `${copy.prefix}-pending:`;
    if (payload.startsWith(pendingPrefix)) {
      const cardId = Number(payload.slice(pendingPrefix.length));
      setSelectedCardIds((current) => current.filter((id) => id !== cardId));
    }
  };
  const handleTargetDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData("text/plain");
    const cardPrefix = `${copy.prefix}:`;
    const pendingPrefix = `${copy.prefix}-pending:`;
    const transferredId = payload.startsWith(cardPrefix)
      ? Number(payload.slice(cardPrefix.length))
      : payload.startsWith(pendingPrefix)
        ? Number(payload.slice(pendingPrefix.length))
        : draggedCardId;
    setDropActive(false);
    if (transferredId !== null && Number.isFinite(transferredId)
      && eligibleCards.some((card) => card.id === transferredId)) {
      setSelectedCardIds((current) => current.includes(transferredId) || current.length >= copy.maxCards
        ? current
        : [...current, transferredId]);
    }
  };

  return (
    <div className="shop-overlay shrine-overlay" role="dialog" aria-modal="true" aria-labelledby={`${mode}-shrine-title`}>
      <section className="shop-panel shrine-panel shrine-selection-panel shrine-workspace-panel">
        <header>
          <div>
            <h2 id={`${mode}-shrine-title`}>{copy.title}</h2>
            <span>{copy.description}</span>
          </div>
          <div className="shop-header-status">
            <button type="button" onClick={close}>나가기</button>
          </div>
        </header>
        {result ? (
          <div className={`shrine-result shrine-card-conversion-result ${result.collapsed ? "is-collapsed" : "is-intact"}`}>
            <h3>{copy.resultTitle}</h3>
            <div className="shrine-result-cards">
              {result.before.map((card) => (
                <CardVisual
                  card={card}
                  variant="compact"
                  className="shrine-result-compact-card"
                  key={`${mode}-before-${card.id}`}
                  {...cardPreviewProps(card)}
                />
              ))}
              <span className="shrine-result-symbol" aria-hidden="true">→</span>
              {result.after.map((card) => (
                <CardVisual
                  card={card}
                  variant="compact"
                  className="shrine-result-compact-card"
                  key={`${mode}-after-${card.id}`}
                  {...cardPreviewProps(card)}
                />
              ))}
            </div>
            <small>
              {copy.title}는 {result.collapsed ? "붕괴했습니다." : "보존되었습니다."}
            </small>
            <button type="button" onClick={close}>확인</button>
          </div>
        ) : (
          <div className="shrine-transfer shrine-conversion-transfer">
            <section
              className="shrine-deck-column shrine-conversion-source"
              aria-label={copy.selectionLabel}
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleSourceDrop}
            >
              <header><strong>{copy.inventoryLabel}</strong><small>{eligibleCards.length}장</small></header>
              <div className="shrine-conversion-cards">
                {sourceCards.map((card) => (
                  <CardVisual
                    card={card}
                    variant="compact"
                    className={`shrine-conversion-card ${selectedCardIds.includes(card.id) ? "is-selected" : ""}`}
                    key={`${mode}-shrine-${card.id}`}
                    {...cardPreviewProps(card)}
                    draggable={copy.eligible(card)}
                    aria-disabled={!copy.eligible(card)}
                    onDragStart={(event) => {
                      if (!copy.eligible(card)) return;
                      previews.actions.clearCardPreview();
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", `${copy.prefix}:${card.id}`);
                      setDraggedCardId(card.id);
                    }}
                    onDragEnd={() => setDraggedCardId(null)}
                    onClick={() => {
                      if (!copy.eligible(card)) return;
                      setSelectedCardIds((current) => current.includes(card.id)
                        ? current.filter((id) => id !== card.id)
                        : current.length < copy.maxCards ? [...current, card.id] : current);
                    }}
                  />
                ))}
              </div>
            </section>
            <div className="shrine-conversion-target">
              <header className="shrine-target-heading"><strong>{copy.selectionLabel}</strong><small>{selectedCardIds.length} / {copy.maxCards}</small></header>
              <div
                className={`shrine-conversion-dropzone ${dropActive ? "is-drop-active" : ""} ${selectedCardIds.length > 0 ? "has-cards" : ""}`}
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
                onDrop={handleTargetDrop}
              >
                {eligibleCards.filter((card) => selectedCardIds.includes(card.id)).map((card) => (
                  <CardVisual
                    card={card}
                    variant="compact"
                    className="shrine-conversion-card shrine-conversion-pending-card"
                    key={`${mode}-pending-${card.id}`}
                    {...cardPreviewProps(card)}
                    draggable
                    onDragStart={(event) => {
                      previews.actions.clearCardPreview();
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", `${copy.prefix}-pending:${card.id}`);
                      setDraggedCardId(card.id);
                    }}
                    onDragEnd={() => setDraggedCardId(null)}
                    onClick={() => setSelectedCardIds((current) => current.filter((id) => id !== card.id))}
                  />
                ))}
                {selectedCardIds.length === 0 && <span className="shrine-drop-hint">카드를 선택하거나 끌어놓으세요</span>}
              </div>
              <button
                className="shrine-confirm-extract"
                type="button"
                disabled={selectedCardIds.length !== copy.maxCards}
                onClick={confirm}
              >
                {copy.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </section>
      <DeckEditorPreviews controlsRef={previews.controlsRef} suppressed={draggedCardId !== null} />
    </div>
  );
}
