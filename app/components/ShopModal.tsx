import { CardVisual } from "./CardVisual";
import { ConsumableVisual } from "./ConsumableVisual";
import type { Dispatch, SetStateAction } from "react";
import type { Card } from "../game/cards";
import type { Consumable, ShopOffer } from "../game/rewards";
import { ConsumableCardPreview } from "./ConsumableCardPreview";

type Props = {
  open: boolean;
  gold: number;
  playerHp: number;
  offers: ShopOffer[];
  onClose: () => void;
  onBuy: (offerId: string) => void;
  showCardKeywordOnly: (card: Card, right: number, top: number) => void;
  setHoveredDeckCard: Dispatch<SetStateAction<Card | null>>;
  clearCardKeywordHover: () => void;
  consumableDescription: (consumable: Consumable) => string;
  showConsumablePreview: (consumable: Consumable, right: number, top: number) => void;
  setHoveredConsumable: Dispatch<SetStateAction<Consumable | null>>;
  hoveredConsumable: Consumable | null;
  consumableDragActive: boolean;
  deckPreviewPosition: { x: number; y: number };
};

export function ShopModal({
  open,
  gold,
  playerHp,
  offers,
  onClose,
  onBuy,
  showCardKeywordOnly,
  setHoveredDeckCard,
  clearCardKeywordHover,
  consumableDescription,
  showConsumablePreview,
  setHoveredConsumable,
  hoveredConsumable,
  consumableDragActive,
  deckPreviewPosition,
}: Props) {
  if (!open) return null;
  const bloodShop = offers.some(offer => offer.currency === "hp");
  return (
    <div className="shop-overlay" role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <section className={`shop-panel ${bloodShop ? "is-blood-shop" : ""}`}>
        <header>
          <div><h2 id="shop-title">{bloodShop ? "피의 상점" : "여행 상점"}</h2></div>
          <div className="shop-header-status">
            <strong>{bloodShop ? `♥ ${playerHp}` : `🪙 ${gold}`}</strong>
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
              disabled={offer.sold || (offer.currency === "hp" && playerHp <= offer.price)}
            >
              {offer.card ? (
                <CardVisual
                  card={offer.card}
                  className="shop-card"
                  onMouseEnter={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showCardKeywordOnly(offer.card!, bounds.right, bounds.top);
                  }}
                  onMouseMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showCardKeywordOnly(offer.card!, bounds.right, bounds.top);
                  }}
                  onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
                />
              ) : offer.consumable ? (
                <ConsumableVisual
                  item={offer.consumable}
                  variant="full"
                  description={consumableDescription(offer.consumable)}
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
                />
              ) : null}
              <span className={`shop-price ${offer.currency === "hp" ? "is-hp" : ""}`}>{offer.sold ? "판매 완료" : `${offer.currency === "hp" ? "♥" : "🪙"} ${offer.price}`}</span>
            </button>
          ))}
        </div>
      </section>
      {hoveredConsumable && !consumableDragActive && (
        <ConsumableCardPreview item={hoveredConsumable} position={deckPreviewPosition}
          description={consumableDescription(hoveredConsumable)} />
      )}
    </div>
  );
}
