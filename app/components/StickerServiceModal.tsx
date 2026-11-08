import type { DragEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { Card } from "../game/cards";
import type { DeckCase } from "../game/rewards";
import { createStickerTransmuterPreview, resolveStickerService, serviceCardProblem, stickerAltarPlacementProblem, stickerServiceRandom, STICKER_SERVICE_NAMES, type StickerServiceResult, type StickerServiceSite } from "../game/stickerServices";
import { cardStickerIds } from "../game/stickers";
import { CardStickerMark } from "./CardStickerMark";
import { CardVisual } from "./CardVisual";

type Props = {
  site: StickerServiceSite; gold: number; inventoryCards: Card[]; decks: DeckCase[];
  onClose: () => void;
  onSubmit: (primaryCardId: number, secondaryCardId?: number) => StickerServiceResult | null;
};
type CardDrag = { source: "collection" } | { source: "selected"; slot: number };
const CARD_DRAG_TYPE = "application/x-ruinfall-service-card";

function beginCardDrag(event: DragEvent, cardId: number, source: CardDrag) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(CARD_DRAG_TYPE, JSON.stringify({ cardId, ...source }));
}
function readCardDrag(event: DragEvent): (CardDrag & { cardId: number }) | null {
  try {
    const value = JSON.parse(event.dataTransfer.getData(CARD_DRAG_TYPE));
    return typeof value.cardId === "number" && (value.source === "collection" || value.source === "selected") ? value : null;
  } catch { return null; }
}
function ServiceArrow() {
  return <svg className="service-result-arrow" viewBox="0 0 128 64" aria-hidden="true">
    <path d="M0 21h78V0l50 32-50 32V43H0z" fill="currentColor" />
  </svg>;
}
function ServicePlus() {
  return <svg className="service-altar-plus" viewBox="0 0 64 64" aria-hidden="true">
    <path d="M22 0h20v22h22v20H42v22H22V42H0V22h22z" fill="currentColor" />
  </svg>;
}

export function StickerServiceModal({ site, gold, inventoryCards, decks, onClose, onSubmit }: Props) {
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [secondaryId, setSecondaryId] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState(0);
  const [draggedCardId, setDraggedCardId] = useState<number | null>(null);
  const draggedCardIdRef = useRef<number | null>(null);
  const [result, setResult] = useState<Extract<StickerServiceResult, { ok: true }> | null>(null);
  const [transmuterPreview, setTransmuterPreview] = useState<{ sourceCardId: number; card: Card } | null>(null);
  const previousTransmuterPreviewRef = useRef<Card | null>(null);
  const allCards = [...inventoryCards, ...decks.flatMap(deck => deck.cards)];
  const primary = allCards.find(card => card.id === primaryId);
  const secondary = allCards.find(card => card.id === secondaryId);
  const altar = site.kind === "stickerAltar";
  const currentSlot = altar ? activeSlot : 0;
  const problemAt = (card: Card, slot: number) => {
    if (!altar) return serviceCardProblem(site.kind, card, site.fixedSticker);
    const other = slot === 0 ? secondary : primary;
    return stickerAltarPlacementProblem(card, slot === 0 ? "donor" : "target",
      other?.id === card.id ? undefined : other);
  };
  const draggedCard = allCards.find(card => card.id === draggedCardId);
  const previewResult = primary ? resolveStickerService({ ...site, cards: allCards, primaryCardId: primary.id,
    secondaryCardId: secondary?.id, gold: Number.MAX_SAFE_INTEGER,
    random: stickerServiceRandom(site.roomKey, site.uses, primary.id) }) : null;
  const ready = previewResult?.ok === true && gold >= site.price;
  useEffect(() => {
    if (site.kind !== "cardTransmuter" || !primary || result) return;
    previousTransmuterPreviewRef.current = null;
    const updatePreview = () => {
      const card = createStickerTransmuterPreview(primary, Math.random, previousTransmuterPreviewRef.current ?? undefined);
      if (card) {
        previousTransmuterPreviewRef.current = card;
        setTransmuterPreview({ sourceCardId: primary.id, card });
      }
    };
    const initialTimer = window.setTimeout(updatePreview, 0);
    const interval = window.setInterval(updatePreview, 100);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, [site.kind, site.roomKey, site.uses, primary, result]);
  const transmuterPreviewCard = transmuterPreview && primary && transmuterPreview.sourceCardId === primary.id
    ? transmuterPreview.card
    : previewResult?.ok ? previewResult.after : undefined;
  const sources = [{ label: "인벤토리", cards: inventoryCards }, ...decks.map(deck => ({ label: `덱 「${deck.name}」`, cards: deck.cards }))]
    .filter(source => source.cards.length > 0);

  const assign = (card: Card, slot: number) => {
    if (problemAt(card, slot)) return;
    setResult(null);
    if (slot === 0) {
      setPrimaryId(card.id);
      if (secondary?.id === card.id) setSecondaryId(null);
      if (altar) setActiveSlot(1);
    } else {
      setSecondaryId(card.id);
      if (primary?.id === card.id) setPrimaryId(null);
      setActiveSlot(primary && primary.id !== card.id ? 1 : 0);
    }
  };
  const select = (card: Card) => {
    if (primary?.id === card.id) {
      removeSlot(0);
      return;
    }
    if (secondary?.id === card.id) {
      removeSlot(1);
      return;
    }
    assign(card, currentSlot);
  };
  const removeSlot = (slot: number) => {
    if (slot === 0) { setPrimaryId(null); setActiveSlot(0); }
    else { setSecondaryId(null); setActiveSlot(1); }
    setResult(null);
  };
  const dragCard = (event: DragEvent, cardId: number, source: CardDrag) => {
    draggedCardIdRef.current = cardId;
    setDraggedCardId(cardId);
    beginCardDrag(event, cardId, source);
  };
  const endCardDrag = () => {
    draggedCardIdRef.current = null;
    setDraggedCardId(null);
  };
  const cancelCardSelection = (event: MouseEvent, cardId: number) => {
    event.preventDefault();
    const slot = primaryId === cardId ? 0 : secondaryId === cardId ? 1 : null;
    if (slot !== null) { removeSlot(slot); setResult(null); }
  };
  const dropIntoSlot = (event: DragEvent, slot: number) => {
    event.preventDefault();
    const drag = readCardDrag(event);
    const card = drag && allCards.find(item => item.id === drag.cardId);
    if (card) assign(card, slot);
    endCardDrag();
  };
  const dropToRemove = (event: DragEvent) => {
    event.preventDefault();
    const drag = readCardDrag(event);
    if (drag?.source === "selected") removeSlot(drag.slot);
    endCardDrag();
  };
  const submit = () => {
    if (!ready || primaryId === null) return;
    const next = onSubmit(primaryId, secondaryId ?? undefined);
    if (next?.ok) setResult(next);
  };
  const pendingSticker = site.kind === "tinkerer" && previewResult?.ok
    ? previewResult.after.stickers?.at(-1) ?? previewResult.after.sticker
    : site.kind === "stickerAltar" && primary && cardStickerIds(primary).length === 1
      ? cardStickerIds(primary)[0]
      : undefined;
  const stickerIcon = site.fixedSticker ?? (primary ? pendingSticker : undefined);
  const renderCardSlot = (card: Card | undefined, slot: number, showPendingSticker = false) => (
    <div className={`service-card-slot ${altar && slot === 0 ? "service-altar-donor" : ""} ${draggedCard && !problemAt(draggedCard, slot) ? "is-drop-allowed" : ""}`}
      key={slot} role="group" aria-label={altar ? slot === 0 ? "제물 카드" : "숙주 카드" : "대상 카드"}
      tabIndex={altar ? 0 : undefined} onFocus={() => setActiveSlot(slot)} onClick={() => setActiveSlot(slot)}
      onDragOver={event => {
        const currentDrag = allCards.find(item => item.id === draggedCardIdRef.current);
        if (!currentDrag || problemAt(currentDrag, slot)) { event.dataTransfer.dropEffect = "none"; return; }
        event.preventDefault(); event.dataTransfer.dropEffect = "move";
      }}
      onDrop={event => dropIntoSlot(event, slot)}>
      {card ? <CardVisual card={card} variant="full" stickerPreview={showPendingSticker ? pendingSticker : undefined} draggable
        onContextMenu={event => cancelCardSelection(event, card.id)}
        onDragStart={event => dragCard(event, card.id, { source: "selected", slot })}
        onDragEnd={endCardDrag} />
        : <div className="service-empty-slot" aria-hidden="true">＋</div>}
    </div>
  );

  if (result) return <div className="shop-overlay shrine-overlay sticker-service-overlay" role="dialog" aria-modal="true"
    aria-label="스티커 작업 결과" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="deck-vault-panel sticker-service-panel sticker-service-result-panel">
      <div className="service-result-cards">
        <CardVisual card={result.before} variant="full" />
        <ServiceArrow />
        <CardVisual card={result.after} variant="full" />
      </div>
    </section>
  </div>;

  return <div className="shop-overlay shrine-overlay sticker-service-overlay" role="dialog" aria-modal="true"
    aria-labelledby="sticker-service-title" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`deck-vault-panel sticker-service-panel ${altar ? "is-altar" : ""} ${site.kind === "cardTransmuter" ? "is-transmuter" : ""}`}>
      <header className="sticker-service-header">
        <div className="sticker-service-heading">
          <h2 id="sticker-service-title">{STICKER_SERVICE_NAMES[site.kind]}</h2>
          {site.kind === "tinkerer" && <p className="service-description">
            $를 소모하여 카드 하나에 {stickerIcon
              ? <><span className="service-description-sticker"><CardStickerMark sticker={stickerIcon} /></span>을</>
              : "스티커를"} 부여합니다.
          </p>}
        </div>
        <div className="service-header-actions">
          <strong className="service-gold">${gold}<span className="service-owned-label">보유</span></strong>
          <button type="button" className="service-close" onClick={onClose}>나가기</button>
        </div>
      </header>
      <div className="service-workspace">
        <div className="service-card-sources" onDragOver={event => {
          const id = draggedCardIdRef.current;
          if (id !== null && (id === primaryId || id === secondaryId)) {
            event.preventDefault(); event.dataTransfer.dropEffect = "move";
          }
        }} onDrop={dropToRemove}>
          {sources.map((source, index) => <section key={index}>
            <h3>{source.label}</h3>
            <div className="service-card-list">{source.cards.map(card => {
              const problem = altar ? problemAt(card, 0) && problemAt(card, 1) : problemAt(card, 0);
              const selected = primaryId === card.id || secondaryId === card.id;
              return <CardVisual as="button" type="button" variant="compact" card={card} key={card.id}
                draggable={!problem} aria-disabled={Boolean(problem)} aria-pressed={selected}
                aria-label={`${card.name}${problem ? `, ${problem}` : ""}`}
                className={`service-choice ${selected ? "is-selected" : ""}`}
                onClick={() => select(card)}
                onContextMenu={event => cancelCardSelection(event, card.id)}
                onDragEnd={endCardDrag}
                onDragStart={event => dragCard(event, card.id, selected
                  ? { source: "selected", slot: primaryId === card.id ? 0 : 1 }
                  : { source: "collection" })} />;
            })}</div>
          </section>)}
        </div>
        <div className="service-operation">
          {altar ? <div className="service-altar-preview"><div className="service-altar-equation">
            {renderCardSlot(primary, 0)}
            <ServicePlus />
            {renderCardSlot(secondary, 1)}
            <ServiceArrow />
            <div className="service-card-slot service-altar-result" role="group" aria-label="결과 미리보기">
              {previewResult?.ok ? <CardVisual card={previewResult.after} variant="full" stickerPreview={pendingSticker} />
                : <div className="service-empty-slot" aria-hidden="true">＋</div>}
            </div>
          </div></div> : site.kind === "cardTransmuter" ? <div className="service-card-pair is-transmuter">
            {renderCardSlot(primary, 0)}
            <ServiceArrow />
            <div className="service-card-slot service-transmuter-result" role="group" aria-label="변환 결과 예시">
              {transmuterPreviewCard
                ? <CardVisual card={transmuterPreviewCard} variant="full" disableStickerTooltips />
                : <div className="service-empty-slot" aria-hidden="true">＋</div>}
            </div>
          </div> : <div className="service-card-pair">
            {renderCardSlot(previewResult?.ok ? previewResult.after : primary, 0, site.kind === "tinkerer" && previewResult?.ok)}
          </div>}
          <div className="service-action-row">
            <button type="button" className="service-confirm" aria-label={`$${site.price} 소모`}
              disabled={!ready} onClick={submit}>${site.price}</button>
          </div>
        </div>
      </div>
    </section>
  </div>;
}
