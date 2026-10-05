import {
  ALL_CARD_BLUEPRINTS,
  DEBUG_CARD_RARITIES,
  createAdrenalineCard,
} from "../game/cards";
import { CONSUMABLE_TYPES, createConsumable } from "../game/rewards";
import { REGION_COUNT } from "../game/mapRules";
import { DebugEnemyCodex } from "./DebugEnemyCodex";

type MapDebugToolbarProps = {
  spawnSelection: string;
  deckRegion: string;
  deckCount: string;
  onSpawnSelectionChange: (value: string) => void;
  onDeckRegionChange: (value: string) => void;
  onDeckCountChange: (value: string) => void;
  onSpawnItem: () => void;
  onGenerateDecks: () => void;
  onOpenCardStats: () => void;
};

export function MapDebugToolbar({
  spawnSelection,
  deckRegion,
  deckCount,
  onSpawnSelectionChange,
  onDeckRegionChange,
  onDeckCountChange,
  onSpawnItem,
  onGenerateDecks,
  onOpenCardStats,
}: MapDebugToolbarProps) {
  return (
    <div className="map-toolbar">
      <div className="debug-spawn-controls">
        <select
          aria-label="바닥에 생성할 아이템"
          value={spawnSelection}
          onChange={(event) => onSpawnSelectionChange(event.target.value)}
        >
          {DEBUG_CARD_RARITIES.map(({ rarity, label }) => {
            const cards = ALL_CARD_BLUEPRINTS.filter((card) => card.rarity === rarity);
            return (
              <optgroup label={label} key={rarity}>
                {cards.map((card, index) => (
                  <option key={`${rarity}-${card.effect}-${index}`} value={`card:${rarity}:${index}`}>
                    {card.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
          <optgroup label="기타 카드">
            <option value="card:adrenaline">{createAdrenalineCard().name}</option>
          </optgroup>
          <optgroup label="티켓">
            <option value="consumable:allTickets">모든 티켓 1개씩</option>
            {CONSUMABLE_TYPES.map((type) => (
              <option key={type} value={`consumable:${type}`}>
                {createConsumable(type, `debug-preview-${type}`).name}
              </option>
            ))}
          </optgroup>
          <optgroup label="덱">
            <option value="deck:random">현재 지역 티어 무작위 덱</option>
          </optgroup>
        </select>
        <button type="button" onClick={onSpawnItem}>바닥에 생성</button>
      </div>
      <div className="debug-score-controls">
        <label>
          지역
          <input
            type="number"
            min="1"
            max={REGION_COUNT}
            step="1"
            value={deckRegion}
            onChange={(event) => onDeckRegionChange(event.target.value)}
          />
        </label>
        <label>
          생성 개수
          <input
            type="number"
            min="1"
            step="1"
            value={deckCount}
            onChange={(event) => onDeckCountChange(event.target.value)}
          />
        </label>
        <button type="button" onClick={onGenerateDecks}>지역 덱 생성</button>
      </div>
      <button type="button" className="debug-card-stats-trigger" onClick={onOpenCardStats}>
        카드 풀 통계
      </button>
      <DebugEnemyCodex />
    </div>
  );
}
