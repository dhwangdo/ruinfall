import type { DragEvent, MouseEvent } from "react";
import { useState } from "react";
import type { Card } from "../game/cards";
import type { DeckCase } from "../game/rewards";
import { resolveStickerService, serviceCardProblem, stickerServiceRandom, STICKER_SERVICE_NAMES, transferStickerProblem, type StickerServiceResult, type StickerServiceSite } from "../game/stickerServices";
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

export function StickerServiceModal({ site, gold, inventoryCards, decks, onClose, onSubmit }: Props) {
  const [primaryId, setPrimaryId] = useState<number | null>(null);
  const [secondaryId, setSecondaryId] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState(0);
  const [result, setResult] = useState<Extract<StickerServiceResult, { ok: true }> | null>(null);
  const allCards = [...inventoryCards, ...decks.flatMap(deck => deck.cards)];
  const primary = allCards.find(card => card.id === primaryId);
  const secondary = allCards.find(card => card.id === secondaryId);
  const altar = site.kind === "stickerAltar";
  const currentSlot = altar ? activeSlot : 0;
  const problemAt = (card: Card, slot: number) => altar && slot === 1
    ? transferStickerProblem(primary, card) : serviceCardProblem(site.kind, card, site.fixedSticker);
  const previewResult = primary ? resolveStickerService({ ...site, cards: allCards, primaryCardId: primary.id,
    secondaryCardId: secondary?.id, gold: Number.MAX_SAFE_INTEGER,
    random: stickerServiceRandom(site.roomKey, site.uses, primary.id) }) : null;
  const ready = previewResult?.ok === true && gold >= site.price;
  const sources = [{ label: "인벤토리", cards: inventoryCards }, ...decks.map(deck => ({ label: `덱 「${deck.name}」`, cards: deck.cards }))];

  const assign = (card: Card, slot: number) => {
    if (problemAt(card, slot)) return;
    setResult(null);
    if (slot === 0) {
      setPrimaryId(card.id);
      if (secondary?.id === card.id) setSecondaryId(null);
      if (altar) setActiveSlot(1);
    } else {
      setSecondaryId(card.id);
      setActiveSlot(1);
    }
  };
  const select = (card: Card) => {
    if (primary?.id === card.id) {
      setPrimaryId(null); setSecondaryId(null); setActiveSlot(0); setResult(null);
      return;
    }
    if (secondary?.id === card.id) {
      setSecondaryId(null); setActiveSlot(1); setResult(null);
      return;
    }
    assign(card, currentSlot);
  };
  const removeSlot = (slot: number) => {
    if (slot === 0) { setPrimaryId(null); setSecondaryId(null); setActiveSlot(0); }
    else { setSecondaryId(null); setActiveSlot(1); }
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
  };
  const dropToRemove = (event: DragEvent) => {
    event.preventDefault();
    const drag = readCardDrag(event);
    if (drag?.source === "selected") removeSlot(drag.slot);
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
    <div className="service-card-slot" key={slot} onDragOver={event => event.preventDefault()}
      onDrop={event => dropIntoSlot(event, slot)}>
      {card ? <CardVisual card={card} stickerPreview={showPendingSticker ? pendingSticker : undefined} draggable
        onContextMenu={event => cancelCardSelection(event, card.id)}
        onDragStart={event => beginCardDrag(event, card.id, { source: "selected", slot })} />
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
    <section className="deck-vault-panel sticker-service-panel">
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
        <div className="service-card-sources" onDragOver={event => event.preventDefault()} onDrop={dropToRemove}>
          {sources.map((source, index) => <section key={index}>
            <h3>{source.label}</h3>
            <div className="service-card-list">{source.cards.map(card => {
              const slot = altar && activeSlot === 1 ? 1 : 0;
              const problem = problemAt(card, slot);
              const selected = primaryId === card.id || secondaryId === card.id;
              return <CardVisual as="button" type="button" variant="compact" card={card} key={card.id}
                draggable={!problem} aria-disabled={Boolean(problem)} aria-pressed={selected}
                aria-label={`${card.name}${problem ? `, ${problem}` : ""}`}
                className={`service-choice ${selected ? "is-selected" : ""}`}
                onClick={() => select(card)}
                onContextMenu={event => cancelCardSelection(event, card.id)}
                onDragStart={event => beginCardDrag(event, card.id, selected
                  ? { source: "selected", slot: primaryId === card.id ? 0 : 1 }
                  : { source: "collection" })} />;
            })}</div>
          </section>)}
        </div>
        <div className="service-operation">
          <div className={`service-card-pair ${altar ? "is-altar" : ""}`}>
            {altar ? <>{renderCardSlot(primary, 0)}{renderCardSlot(secondary, 1, Boolean(secondary && pendingSticker))}</>
              : renderCardSlot(site.kind === "cardTransmuter" ? primary : previewResult?.ok ? previewResult.after : primary,
                0, site.kind === "tinkerer" && previewResult?.ok)}
          </div>
          <div className="service-action-row">
            <button type="button" className="service-confirm" aria-label={`$${site.price} 소모`}
              disabled={!ready} onClick={submit}>${site.price}</button>
          </div>
        </div>
      </div>
    </section>
  </div>;
}
