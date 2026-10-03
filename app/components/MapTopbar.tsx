import type { CSSProperties } from "react";
import { MAX_PLAYER_HP } from "../game/battleState";

type MapTopbarProps = {
  runPlayerHp: number;
  maxPlayerHp: number;
  gold: number;
  deckCardCount: number;
  mapTraveling: boolean;
  canEditDeck: boolean;
  onGoldDebugClick: () => void;
  onOpenDeckViewer: () => void;
  onWait: () => void;
  onEditDeck: () => void;
};

export function MapTopbar({
  runPlayerHp,
  maxPlayerHp,
  gold,
  deckCardCount,
  mapTraveling,
  canEditDeck,
  onGoldDebugClick,
  onOpenDeckViewer,
  onWait,
  onEditDeck,
}: MapTopbarProps) {
  return (
    <header className="topbar map-topbar">
      <div className="map-top-actions">
        <div className="map-run-stats">
          <div
            className="healthbar map-health"
            aria-label={`체력 ${runPlayerHp} 중 ${maxPlayerHp}`}
            style={{ "--map-health-width": `${165 * Math.min(2, Math.max(1, maxPlayerHp / MAX_PLAYER_HP))}px` } as CSSProperties}
          >
            <i style={{ width: `${(runPlayerHp / maxPlayerHp) * 100}%` }} />
            <span>{runPlayerHp} / {maxPlayerHp}</span>
          </div>
          <button
            type="button"
            className="map-gold map-gold-debug-trigger"
            onClick={onGoldDebugClick}
            aria-label={`골드 ${gold}`}
          >
            <strong>$ {gold}</strong>
          </button>
        </div>
        <button
          type="button"
          className="deck-viewer-trigger"
          onClick={onOpenDeckViewer}
          aria-label={`덱 보기, 현재 ${deckCardCount}장`}
        >
          <span className="deck-stack-icon" aria-hidden="true" />
          <span>덱 보기</span>
        </button>
        <button
          type="button"
          className="map-wait-trigger"
          onClick={onWait}
          disabled={mapTraveling}
          aria-label="한 턴 쉬기: 현재 칸에 머물며 적만 행동하게 합니다"
        >
          한 턴 쉼
        </button>
        {canEditDeck && (
          <button
            type="button"
            className="deck-editor-trigger"
            onClick={onEditDeck}
            aria-label={`덱 편집, 현재 ${deckCardCount}장`}
          >
            <span className="deck-stack-icon" aria-hidden="true" />
            <span>덱 편집</span>
          </button>
        )}
      </div>
    </header>
  );
}
