import { occupiedDeckSpace } from "../game/stickers";
import { CardVisual } from "./CardVisual";
import { ConsumableVisual } from "./ConsumableVisual";
import type { Dispatch, SetStateAction } from "react";
import type { Card } from "../game/cards";
import type { Consumable, DeckCase } from "../game/rewards";
import { DeckName } from "./DeckName";

type TreasureChestReward = {
  cards: Card[];
  consumables: Consumable[];
  decks: DeckCase[];
  rolls: number;
  bonusRolls: number;
};

type Props = {
  reward: TreasureChestReward | null;
  onClose: () => void;
  showCardKeywordOnly: (card: Card, right: number, top: number) => void;
  setHoveredDeckCard: Dispatch<SetStateAction<Card | null>>;
  clearCardKeywordHover: () => void;
  consumableDescription: (consumable: Consumable) => string;
  showConsumablePreview: (consumable: Consumable, right: number, top: number) => void;
  setHoveredConsumable: Dispatch<SetStateAction<Consumable | null>>;
};

export function TreasureChestRewardModal({
  reward,
  onClose,
  showCardKeywordOnly,
  setHoveredDeckCard,
  clearCardKeywordHover,
  consumableDescription,
  showConsumablePreview,
  setHoveredConsumable,
}: Props) {
  if (!reward) return null;

  return (
    <div className="shop-overlay shrine-overlay treasure-chest-overlay" role="dialog" aria-modal="true" aria-labelledby="treasure-chest-reward-title">
      <section className="shop-panel shrine-panel treasure-chest-panel">
        <header>
          <div>
            <h2 id="treasure-chest-reward-title">보물 상자 보상</h2>
            <span>총 {reward.rolls}회 굴렸습니다.</span>
          </div>
          <div className="shop-header-status">
            <button type="button" onClick={onClose}>확인</button>
          </div>
        </header>
        <div className="treasure-chest-reward-body">
          <div className="treasure-chest-reward-items">
            {reward.decks.map((deck) => (
              <div className="battle-reward-deck treasure-chest-reward-deck" key={`treasure-deck-${deck.id}`}>
                <span className="floor-deck-icon" aria-hidden="true" />
                <strong><DeckName deck={deck} /></strong>
                <span>{occupiedDeckSpace(deck.cards)} / {deck.capacity}</span>
              </div>
            ))}
            {reward.cards.map((card) => (
              <CardVisual
                card={card}
                className="battle-reward-card"
                key={`treasure-card-${card.id}`}
                onMouseEnter={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  showCardKeywordOnly(card, bounds.right, bounds.top);
                }}
                onMouseMove={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  showCardKeywordOnly(card, bounds.right, bounds.top);
                }}
                onMouseLeave={() => { setHoveredDeckCard(null); clearCardKeywordHover(); }}
              />
            ))}
            {reward.consumables.map((item) => (
              <ConsumableVisual
                item={item}
                variant="full"
                description={consumableDescription(item)}
                className="battle-reward-consumable treasure-chest-reward-consumable"
                key={`treasure-consumable-${item.id}`}
                aria-label={`${item.name}: ${consumableDescription(item)}`}
                onMouseEnter={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  showConsumablePreview(item, bounds.right, bounds.top);
                }}
                onMouseMove={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  showConsumablePreview(item, bounds.right, bounds.top);
                }}
                onMouseLeave={() => setHoveredConsumable(null)}
              />
            ))}
            {reward.cards.length === 0 && reward.decks.length === 0
              && reward.consumables.length === 0 && (
                <div className="treasure-chest-empty-reward">보상이 없습니다.</div>
              )}
          </div>
        </div>
      </section>
    </div>
  );
}
