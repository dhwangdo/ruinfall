import { useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  ALL_CARD_BLUEPRINTS,
  CARD_POOL_DEFENSE_EFFECTS,
  CARD_POOL_DRAW_EFFECTS,
  CARD_POOL_ENERGY_EFFECTS,
  CARD_POOL_STAR_EFFECTS,
  CARD_POOL_STATUS_EFFECTS,
  CARD_RARITY_SORT_RANK,
  DEBUG_CARD_RARITIES,
  cardGivesMagicDefense,
  cardGivesPhysicalDefense,
  isAttackCard,
  type CardBlueprint,
} from "../game/cards";
import { cardPoolCost, cardPoolShare } from "../game/cardEffects";
import { DeckEditorCardIcon } from "./DeckEditorCardIcon";

type CardPoolStatHover = {
  label: string;
  cards: CardBlueprint[];
  x: number;
  y: number;
};

export function CardPoolStatsPanel({ onClose }: { onClose: () => void }) {
  const [hover, setHover] = useState<CardPoolStatHover | null>(null);
  const cards = ALL_CARD_BLUEPRINTS.filter((card) => !card.enemyToken);
  const total = cards.length;
  const rarityStats = DEBUG_CARD_RARITIES.map(({ rarity, label }) => ({
    label,
    cards: cards.filter((card) => card.rarity === rarity),
  }));
  const kindStats = [
    { label: "공격 카드", match: (card: CardBlueprint) => isAttackCard(card) },
    {
      label: "방어를 주는 카드",
      match: (card: CardBlueprint) => cardGivesPhysicalDefense(card) && !cardGivesMagicDefense(card),
    },
    {
      label: "마법 방어를 주는 카드",
      match: (card: CardBlueprint) => cardGivesMagicDefense(card) && !cardGivesPhysicalDefense(card),
    },
    {
      label: "방어·마법 방어를 모두 주는 카드",
      match: (card: CardBlueprint) => cardGivesPhysicalDefense(card) && cardGivesMagicDefense(card),
    },
  ].map(({ label, match }) => ({
    label,
    cards: cards.filter(match),
  }));
  const costStats = Array.from(new Set(cards.map(cardPoolCost)))
    .sort((left, right) => left - right)
    .map((cost) => ({
      label: cost === -1 ? "사용 불가" : `${cost} 코스트`,
      cards: cards.filter((card) => cardPoolCost(card) === cost),
    }));
  const keywordStats = [
    { label: "드로우", match: (card: CardBlueprint) => card.draw > 0 || CARD_POOL_DRAW_EFFECTS.has(card.effect) },
    { label: "에너지 생성", match: (card: CardBlueprint) => CARD_POOL_ENERGY_EFFECTS.has(card.effect) },
    { label: "방어 효과", match: (card: CardBlueprint) => CARD_POOL_DEFENSE_EFFECTS.has(card.effect) },
    { label: "★ 획득", match: (card: CardBlueprint) => CARD_POOL_STAR_EFFECTS.has(card.effect) },
    { label: "상태 효과", match: (card: CardBlueprint) => CARD_POOL_STATUS_EFFECTS.has(card.effect) },
    { label: "룰", match: (card: CardBlueprint) => Boolean(card.rule) },
    { label: "재련", match: (card: CardBlueprint) => card.effect === "obsidianDagger" || card.effect === "odinSpear" || card.forgeCost !== undefined || Boolean(card.forgeCosts?.length) || Boolean(card.forgeTargetName) || Boolean(card.forgeAny) },
    { label: "소멸", match: (card: CardBlueprint) => Boolean(card.exhaust) },
  ].map(({ label, match }) => ({
    label,
    cards: cards.filter(match),
  }));
  const sortedCards = (groupCards: CardBlueprint[]) => [...groupCards].sort((left, right) => (
    CARD_RARITY_SORT_RANK[left.rarity] - CARD_RARITY_SORT_RANK[right.rarity]
    || cardPoolCost(left) - cardPoolCost(right)
    || left.name.localeCompare(right.name, "ko")
  ));
  const showHover = (event: ReactMouseEvent<HTMLElement>, label: string, groupCards: CardBlueprint[]) => {
    const width = Math.min(420, Math.max(240, window.innerWidth - 24));
    const x = Math.min(event.clientX + 16, Math.max(12, window.innerWidth - width - 12));
    const y = Math.min(event.clientY + 12, Math.max(12, window.innerHeight - 300));
    setHover({ label, cards: sortedCards(groupCards), x, y });
  };
  const close = () => {
    setHover(null);
    onClose();
  };

  return (
    <div
      className="card-pool-stats-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-pool-stats-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section className="card-pool-stats-panel" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>DEBUG · CARD POOL</p>
            <h2 id="card-pool-stats-title">카드 풀 통계</h2>
            <span>대상 {total}장 · 적 토큰 제외</span>
          </div>
          <button type="button" onClick={close}>닫기</button>
        </header>
        <div className="card-pool-stats-grid">
          {[
            { title: "희귀도", rows: rarityStats },
            { title: "카드 유형", rows: kindStats },
            { title: "코스트", rows: costStats },
            { title: "키워드·기능", rows: keywordStats },
          ].map(({ title, rows }) => (
            <section className="card-pool-stat-group" key={title}>
              <h3>{title}</h3>
              <ul>
                {rows.map(({ label, cards: groupCards }) => {
                  const count = groupCards.length;
                  const percent = total === 0 ? 0 : count / total * 100;
                  return (
                    <li
                      key={label}
                      tabIndex={0}
                      onMouseEnter={(event) => showHover(event, label, groupCards)}
                      onMouseMove={(event) => showHover(event, label, groupCards)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={(event) => {
                        const bounds = event.currentTarget.getBoundingClientRect();
                        setHover({ label, cards: sortedCards(groupCards), x: bounds.right + 16, y: bounds.top });
                      }}
                      onBlur={() => setHover(null)}
                    >
                      <span>
                        <strong>{label}</strong>
                        <small>{count}장 · {cardPoolShare(count, total)}</small>
                      </span>
                      <i style={{ width: `${percent}%` }} aria-hidden="true" />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </section>
      {hover && (
        <aside
          className="card-pool-stat-popover"
          role="tooltip"
          aria-label={`${hover.label} 카드 목록`}
          style={{ left: hover.x, top: hover.y }}
        >
          <strong>{hover.label}</strong>
          <div className="card-pool-stat-popover-cards">
            {hover.cards.map((card, index) => (
              <span
                className={`deck-editor-card rarity-${card.rarity} ${card.rarity === "legendary" ? "is-painted" : ""}`}
                key={`${card.name}-${card.effect}-${index}`}
              >
                <DeckEditorCardIcon card={card} />
              </span>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}
