import type { Dispatch, DragEvent, SetStateAction } from "react";
import type { Card } from "../game/cards";
import type { ShrineCardConversionResult } from "../game/shrineRules";
import { DeckEditorCardIcon } from "./DeckEditorCardIcon";

type ShrineMode = "transform" | "combination";

type CardConversionShrineModalProps = {
  mode: ShrineMode;
  open: boolean;
  inventoryCards: Card[];
  selectedCardIds: number[];
  setSelectedCardIds: Dispatch<SetStateAction<number[]>>;
  draggedCardId: number | null;
  setDraggedCardId: Dispatch<SetStateAction<number | null>>;
  dropActive: boolean;
  setDropActive: Dispatch<SetStateAction<boolean>>;
  result: ShrineCardConversionResult | null;
  setResult: Dispatch<SetStateAction<ShrineCardConversionResult | null>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
  onConfirm: () => void;
};

const SHRINE_COPY = {
  transform: {
    title: "변환의 성소",
    description: "인벤토리에서 카드 2장을 선택해 변환합니다. 사용하면 변환의 성소는 붕괴합니다.",
    selectionLabel: "변환할 카드",
    inventoryLabel: "인벤토리",
    resultTitle: "변환 결과",
    confirmLabel: "변환",
    maxCards: 2,
    prefix: "transform",
    eligible: (card: Card) => card.rarity !== "legendary",
  },
  combination: {
    title: "조합의 성소",
    description: "인벤토리의 특별 카드 5장을 무작위 희귀 카드 1장으로 바꿉니다.",
    selectionLabel: "조합할 특별 카드",
    inventoryLabel: "특별 카드",
    resultTitle: "조합 결과",
    confirmLabel: "조합",
    maxCards: 5,
    prefix: "combination",
    eligible: (card: Card) => card.rarity === "special",
  },
} satisfies Record<ShrineMode, {
  title: string;
  description: string;
  selectionLabel: string;
  inventoryLabel: string;
  resultTitle: string;
  confirmLabel: string;
  maxCards: number;
  prefix: ShrineMode;
  eligible: (card: Card) => boolean;
}>;

export function CardConversionShrineModal({
  mode,
  open,
  inventoryCards,
  selectedCardIds,
  setSelectedCardIds,
  draggedCardId,
  setDraggedCardId,
  dropActive,
  setDropActive,
  result,
  setResult,
  setOpen,
  onConfirm,
}: CardConversionShrineModalProps) {
  if (!open) return null;

  const copy = SHRINE_COPY[mode];
  const eligibleCards = inventoryCards.filter(copy.eligible);
  const sourceCards = mode === "combination" ? eligibleCards : inventoryCards;
  const close = () => {
    setOpen(false);
    setResult(null);
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
      <section className="shop-panel shrine-panel shrine-selection-panel">
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
                <div className={`deck-editor-card shrine-result-compact-card rarity-${card.rarity}`} key={`${mode}-before-${card.id}`}>
                  <DeckEditorCardIcon card={card} />
                </div>
              ))}
              <span className="shrine-result-symbol" aria-hidden="true">→</span>
              {result.after.map((card) => (
                <div className={`deck-editor-card shrine-result-compact-card rarity-${card.rarity}`} key={`${mode}-after-${card.id}`}>
                  <DeckEditorCardIcon card={card} />
                </div>
              ))}
            </div>
            <small>
              {mode === "combination" && result.destination === "floor"
                ? "인벤토리가 가득 차 결과 카드를 바닥에 놓았습니다. "
                : ""}
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
                  <div
                    className={`deck-editor-card shrine-conversion-card rarity-${card.rarity} ${selectedCardIds.includes(card.id) ? "is-selected" : ""}`}
                    key={`${mode}-shrine-${card.id}`}
                    draggable={copy.eligible(card)}
                    aria-disabled={!copy.eligible(card)}
                    onDragStart={(event) => {
                      if (!copy.eligible(card)) return;
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
                  >
                    <DeckEditorCardIcon card={card} />
                  </div>
                ))}
              </div>
            </section>
            <div className="shrine-transfer-arrow">
              <span className="shrine-arrow-icon" aria-hidden="true" />
              <div className="shrine-collapse-live" role="status" aria-live="polite">
                <span>선택</span>
                <strong>{selectedCardIds.length} / {copy.maxCards}</strong>
              </div>
            </div>
            <div className="shrine-conversion-target">
              <div
                className={`shrine-conversion-dropzone ${mode === "combination" ? "is-combination-dropzone" : ""} ${dropActive ? "is-drop-active" : ""} ${selectedCardIds.length > 0 ? "has-cards" : ""}`}
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
                  <div
                    className={`deck-editor-card shrine-conversion-card shrine-conversion-pending-card rarity-${card.rarity}`}
                    key={`${mode}-pending-${card.id}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", `${copy.prefix}-pending:${card.id}`);
                      setDraggedCardId(card.id);
                    }}
                    onDragEnd={() => setDraggedCardId(null)}
                    onClick={() => setSelectedCardIds((current) => current.filter((id) => id !== card.id))}
                  >
                    <DeckEditorCardIcon card={card} />
                  </div>
                ))}
                {selectedCardIds.length === 0 && <span>카드를 끌어놓으세요</span>}
              </div>
              <button
                className="shrine-confirm-extract"
                type="button"
                disabled={selectedCardIds.length !== copy.maxCards}
                onClick={onConfirm}
              >
                {copy.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
