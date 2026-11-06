import { CardVisual } from "./CardVisual";
import { ConsumableVisual } from "./ConsumableVisual";
import type { Dispatch, SetStateAction } from "react";
import type { Card } from "../game/cards";
import type { Consumable, DeckCase } from "../game/rewards";
import { DeckName } from "./DeckName";

type BattleResultStatus = "won" | "lost";

type BattleResultOverlayProps = {
  status: BattleResultStatus;
  turn: number;
  rewardKeys: number;
  rewardCards: Card[];
  rewardDecks: DeckCase[];
  rewardConsumables: Consumable[];
  consumableDescription: (item: Consumable) => string;
  showCardKeywordOnly: (card: Card, right: number, top: number) => void;
  setHoveredDeckCard: Dispatch<SetStateAction<Card | null>>;
  clearCardKeywordHover: () => void;
  onContinue: () => void;
};

export function BattleResultOverlay({
  status,
  turn,
  rewardKeys,
  rewardCards,
  rewardDecks,
  rewardConsumables,
  consumableDescription,
  showCardKeywordOnly,
  setHoveredDeckCard,
  clearCardKeywordHover,
  onContinue,
}: BattleResultOverlayProps) {
  const won = status === "won";

  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className={`result-card currency-on-light ${won ? "has-rewards" : ""}`}>
        {!won && <p>RUN ENDED</p>}
        <h2 id="result-title">{won ? "승리!" : "패배"}</h2>
        {!won && <span>{turn}턴에서 탐험이 끝났습니다.</span>}
        {won && (
          <div className="battle-reward-section">
            <div className="battle-reward-currencies">
              {rewardKeys > 0 && <>
                <span className="currency-amount currency-keys">열쇠 +{rewardKeys}</span>
              </>}
            </div>
            <div className="battle-reward-cards" role="status" aria-live="polite">
              {rewardCards.map((card) => (
                <CardVisual
                  card={card}
                  className="battle-reward-card"
                  key={card.id}
                  onMouseEnter={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showCardKeywordOnly(card, bounds.right, bounds.top);
                  }}
                  onMouseMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showCardKeywordOnly(card, bounds.right, bounds.top);
                  }}
                  onMouseLeave={() => {
                    setHoveredDeckCard(null);
                    clearCardKeywordHover();
                  }}
                />
              ))}
              {rewardDecks.map((deck) => (
                <div className="battle-reward-deck" key={deck.id}>
                  <span className="floor-deck-icon" aria-hidden="true" />
                  <strong><DeckName deck={deck} /></strong>
                  <span>{deck.cards.length} / {deck.capacity}</span>
                </div>
              ))}
              {rewardConsumables.map((item) => (
                <ConsumableVisual
                  item={item}
                  variant="full"
                  description={consumableDescription(item)}
                  className="battle-reward-consumable"
                  key={item.id}
                  aria-label={`${item.name}: ${consumableDescription(item)}`}
                />
              ))}
            </div>
          </div>
        )}
        <button onClick={onContinue}>
          {won ? "다음" : "새 탐험 시작"}
        </button>
      </div>
    </div>
  );
}
