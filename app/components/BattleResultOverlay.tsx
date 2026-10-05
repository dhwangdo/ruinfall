import type { ComponentType, Dispatch, SetStateAction } from "react";
import type { Card } from "../game/cards";
import type { CardFaceProps } from "./CardFace";
import type { Consumable, DeckCase } from "../game/rewards";
import { DeckName } from "./DeckName";
import { ConsumableTicketTierMark, consumableTicketTierClassName } from "./ConsumableTicketTierMark";

type BattleResultStatus = "won" | "lost";

type BattleResultOverlayProps = {
  status: BattleResultStatus;
  playerHp: number;
  turn: number;
  rewardGold: number;
  rewardCards: Card[];
  rewardDecks: DeckCase[];
  rewardConsumables: Consumable[];
  CardFace: ComponentType<CardFaceProps>;
  consumableDescription: (item: Consumable) => string;
  showCardKeywordOnly: (card: Card, right: number, top: number) => void;
  setHoveredDeckCard: Dispatch<SetStateAction<Card | null>>;
  clearCardKeywordHover: () => void;
  showConsumablePreview: (item: Consumable, right: number, top: number) => void;
  setHoveredConsumable: Dispatch<SetStateAction<Consumable | null>>;
  onContinue: () => void;
  onExportTelemetry: () => void;
};

export function BattleResultOverlay({
  status,
  playerHp,
  turn,
  rewardGold,
  rewardCards,
  rewardDecks,
  rewardConsumables,
  CardFace,
  consumableDescription,
  showCardKeywordOnly,
  setHoveredDeckCard,
  clearCardKeywordHover,
  showConsumablePreview,
  setHoveredConsumable,
  onContinue,
  onExportTelemetry,
}: BattleResultOverlayProps) {
  const won = status === "won";

  return (
    <div className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className={`result-card ${won ? "has-rewards" : ""}`}>
        <p>{won ? "BATTLE CLEARED" : "RUN ENDED"}</p>
        <h2 id="result-title">{won ? "승리" : "패배"}</h2>
        <span>{won
          ? `${playerHp} 체력으로 전투를 마쳤습니다.`
          : `${turn}턴에서 탐험이 끝났습니다.`}</span>
        {won && (
          <div className="battle-reward-section">
            <strong>전투 보상</strong>
            <small>골드는 획득하고, 추가 보상은 이 바닥에 떨어집니다.</small>
            <div className="battle-gold-reward">골드 +{rewardGold}</div>
            <div className="battle-reward-cards">
              {rewardCards.map((card) => (
                <div
                  className={`battle-reward-card card-face ${card.kind} ${card.damageType}`}
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
                >
                  <CardFace card={card} />
                </div>
              ))}
              {rewardDecks.map((deck) => (
                <div className="battle-reward-deck" key={deck.id}>
                  <span className="floor-deck-icon" aria-hidden="true" />
                  <strong><DeckName deck={deck} /></strong>
                  <span>{deck.cards.length} / {deck.capacity}</span>
                </div>
              ))}
              {rewardConsumables.map((item) => (
                <div
                  className={`battle-reward-consumable consumable-ticket ${item.type} ${consumableTicketTierClassName(item.type)}`}
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
                >
                  <ConsumableTicketTierMark type={item.type} />
                  <strong>{item.name}</strong>
                  <small>{consumableDescription(item)}</small>
                </div>
              ))}
            </div>
          </div>
        )}
        <button onClick={onContinue}>{won ? "다음" : "새 탐험 시작"}</button>
        {!won && (
          <button
            type="button"
            className="telemetry-export-trigger result-telemetry-trigger"
            onClick={onExportTelemetry}
            title="적별 피해 기록을 TXT 파일로 저장"
            aria-label="적별 피해 기록 TXT 저장"
          >
            <span aria-hidden="true">⇩</span>
            <span>기록 저장</span>
          </button>
        )}
      </div>
    </div>
  );
}
