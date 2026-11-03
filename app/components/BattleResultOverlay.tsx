import { CardVisual } from "./CardVisual";
import { ConsumableVisual } from "./ConsumableVisual";
import type { Dispatch, SetStateAction } from "react";
import type { Card } from "../game/cards";
import type { Consumable, DeckCase } from "../game/rewards";
import { DeckName } from "./DeckName";
import { BattleRewardRoulette } from "./BattleRewardRoulette";
import type { BattleRewardRoulette as RouletteState } from "../game/rewardRoulette";

type BattleResultStatus = "won" | "lost";

type BattleResultOverlayProps = {
  status: BattleResultStatus;
  turn: number;
  rewardGold: number;
  rewardKeys: number;
  rewardCards: Card[];
  rewardDecks: DeckCase[];
  rewardConsumables: Consumable[];
  roulette: RouletteState | null;
  onSpin: () => void;
  onSpinFinish: () => void;
  consumableDescription: (item: Consumable) => string;
  showCardKeywordOnly: (card: Card, right: number, top: number) => void;
  setHoveredDeckCard: Dispatch<SetStateAction<Card | null>>;
  clearCardKeywordHover: () => void;
  showConsumablePreview: (item: Consumable, right: number, top: number) => void;
  setHoveredConsumable: Dispatch<SetStateAction<Consumable | null>>;
  onContinue: () => void;
};

export function BattleResultOverlay({
  status,
  turn,
  rewardGold,
  rewardKeys,
  rewardCards,
  rewardDecks,
  rewardConsumables,
  roulette,
  onSpin,
  onSpinFinish,
  consumableDescription,
  showCardKeywordOnly,
  setHoveredDeckCard,
  clearCardKeywordHover,
  showConsumablePreview,
  setHoveredConsumable,
  onContinue,
}: BattleResultOverlayProps) {
  const won = status === "won";

  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className={`result-card ${won ? "has-rewards" : ""} ${won && roulette ? "has-roulette" : ""}`}>
        {!won && <p>RUN ENDED</p>}
        <h2 id="result-title">{won ? "승리" : "패배"}</h2>
        {!won && <span>{turn}턴에서 탐험이 끝났습니다.</span>}
        {won && (
          <div className="battle-reward-section">
            <div className="battle-gold-reward">골드 +{rewardGold}{rewardKeys > 0 && <span className="battle-key-reward"> · 열쇠 +{rewardKeys}</span>}</div>
            <div className="battle-reward-layout">
            {roulette && <BattleRewardRoulette roulette={roulette} onSpin={onSpin} onFinish={onSpinFinish} />}
            <div className="battle-reward-cards">
              {roulette && roulette.phase !== "empty" && !rewardCards.length && !rewardConsumables.length && (
                roulette.phase === "settled" ? <span className="roulette-gold-prize">$</span>
                  : <span className="roulette-prize-placeholder" aria-hidden="true">?</span>
              )}
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
                  onMouseEnter={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showConsumablePreview(item, bounds.right, bounds.top);
                  }}
                  onMouseMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showConsumablePreview(item, bounds.right, bounds.top);
                  }}
                  onMouseLeave={() => setHoveredConsumable(null)}
                  onFocus={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    showConsumablePreview(item, bounds.right, bounds.top);
                  }}
                  onBlur={() => setHoveredConsumable(null)}
                />
              ))}
            </div>
            </div>
          </div>
        )}
        <button onClick={onContinue} disabled={won && (roulette?.phase === "ready" || roulette?.phase === "spinning")}>{won ? "다음" : "새 탐험 시작"}</button>
      </div>
    </div>
  );
}
