import type { ComponentType, Dispatch, SetStateAction } from "react";
import type { Card } from "../game/cards";
import type { Consumable, ShopOffer } from "../game/rewards";
import type { CardFaceProps } from "./CardFace";

type Props = {
  open: boolean;
  gold: number;
  offers: ShopOffer[];
  onClose: () => void;
  onBuy: (offerId: string) => void;
  CardFace: ComponentType<CardFaceProps>;
  showCardKeywordOnly: (card: Card, right: number, top: number) => void;
  setHoveredDeckCard: Dispatch<SetStateAction<Card | null>>;
  clearCardKeywordHover: () => void;
  consumableDescription: (consumable: Consumable) => string;
  showConsumablePreview: (consumable: Consumable, right: number, top: number) => void;
  setHoveredConsumable: Dispatch<SetStateAction<Consumable | null>>;
  hoveredConsumable: Consumable | null;
  consumableDrag: { id: string; source: "inventory" | "floor" } | null;
  deckPreviewPosition: { x: number; y: number };
};

export function ShopModal({
  open,
  gold,
  offers,
  onClose,
  onBuy,
  CardFace: RenderCardFace,
  showCardKeywordOnly,
  setHoveredDeckCard,
  clearCardKeywordHover,
  consumableDescription,
  showConsumablePreview,
  setHoveredConsumable,
  hoveredConsumable,
  consumableDrag,
  deckPreviewPosition,
}: Props) {
  if (!open) return null;

  return (
    <div className="shop-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <section className="shop-panel">
        <header>
          <div><h2 id="shop-title">여행 상점</h2></div>
          <div className="shop-header-status">
            <strong>🪙 {gold}</strong>
            <button type="button" onClick={onClose}>나가기</button>
          </div>
        </header>
        <div className="shop-stock">
          {offers.map((offer) => (
            <button
              type="button"
              className={`shop-offer ${offer.sold ? "is-sold" : ""}`}
              key={offer.id}
              onClick={() => onBuy(offer.id)}
              disabled={offer.sold}
            >
              {offer.card ? (
                <div
                  className={`shop-card card-face ${offer.card.kind} ${offer.card.damageType}`}
                  onMouseEnter={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showCardKeywordOnly(offer.card!, bounds.right, bounds.top);
                  }}
                  onMouseMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showCardKeywordOnly(offer.card!, bounds.right, bounds.top);
                  }}
                  onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                >
                  <RenderCardFace card={offer.card} />
                </div>
              ) : offer.consumable ? (
                <div
                  className={`consumable-ticket ${offer.consumable.type}`}
                  aria-label={`${offer.consumable.name}: ${consumableDescription(offer.consumable)}`}
                  onMouseEnter={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showConsumablePreview(offer.consumable!, bounds.right, bounds.top);
                  }}
                  onMouseMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showConsumablePreview(offer.consumable!, bounds.right, bounds.top);
                  }}
                  onMouseLeave={() => setHoveredConsumable(null)}
                  onFocus={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showConsumablePreview(offer.consumable!, bounds.right, bounds.top);
                  }}
                  onBlur={() => setHoveredConsumable(null)}
                >
                  <strong>{offer.consumable.name}</strong>
                  <small>{consumableDescription(offer.consumable)}</small>
                </div>
              ) : null}
              <span className="shop-price">{offer.sold ? "판매 완료" : `🪙 ${offer.price}`}</span>
            </button>
          ))}
        </div>
      </section>
      {hoveredConsumable && !consumableDrag && (
        <aside
          className={`deck-consumable-preview-floating ${hoveredConsumable.type}`}
          style={{ left: deckPreviewPosition.x, top: deckPreviewPosition.y }}
          aria-live="polite"
        >
          <strong>{hoveredConsumable.name}</strong>
          <p>{consumableDescription(hoveredConsumable)}</p>
        </aside>
      )}
    </div>
  );
}
