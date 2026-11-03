import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { MAX_PLAYER_HP } from "../game/battleState";
import type { RunResetHoldControls } from "../hooks/useRunKeyboardControls";

type MapTopbarProps = {
  runPlayerHp: number;
  maxPlayerHp: number;
  gold: number;
  keys: number;
  deckCardCount: number;
  mapTraveling: boolean;
  canEditDeck: boolean;
  onGoldDebugClick: () => void;
  onWait: () => void;
  onEditDeck: () => void;
  onOpenSettings: () => void;
  restartHold: RunResetHoldControls;
};

export function MapTopbar({
  runPlayerHp,
  maxPlayerHp,
  gold,
  keys,
  deckCardCount,
  mapTraveling,
  canEditDeck,
  onGoldDebugClick,
  onWait,
  onEditDeck,
  onOpenSettings,
  restartHold,
}: MapTopbarProps) {
  const handleRestartPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    restartHold.start("pointer");
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer may already have ended on older mobile browsers.
    }
  };

  const handleRestartKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) restartHold.start("buttonKeyboard");
  };

  const restartButtonStyle = { "--restart-hold-progress": restartHold.progress } as CSSProperties;

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
          <span className="map-currencies">
            <button
              type="button"
              className="map-currency-count map-gold map-gold-debug-trigger"
              onClick={onGoldDebugClick}
              aria-label={`골드 ${gold}`}
            >
              $ {gold}
            </button>
            <span className="map-currency-count map-key-count" aria-label={`열쇠 ${keys}개`}>열쇠 {keys}</span>
          </span>
        </div>
        <button
          type="button"
          className="map-wait-trigger"
          onClick={onWait}
          disabled={mapTraveling}
          aria-label="한 턴 쉬기: 현재 칸에 머물며 적만 행동하게 합니다"
        >
          한 턴 쉼
        </button>
        <button
          type="button"
          className="map-restart-trigger"
          style={restartButtonStyle}
          title="버튼 또는 R키를 1초간 눌러 다시하기 · 현재 진행을 초기화합니다"
          aria-label="버튼 또는 R키를 길게 눌러 다시하기. 현재 진행을 초기화합니다"
          onPointerDown={handleRestartPointerDown}
          onPointerUp={() => restartHold.stop("pointer")}
          onPointerCancel={() => restartHold.stop("pointer")}
          onPointerLeave={() => restartHold.stop("pointer")}
          onLostPointerCapture={() => restartHold.stop("pointer")}
          onKeyDown={handleRestartKeyDown}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") restartHold.stop("buttonKeyboard");
          }}
          onBlur={() => {
            restartHold.stop("pointer");
            restartHold.stop("buttonKeyboard");
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <span className="map-restart-progress" aria-hidden="true" />
          <span className="map-restart-label">다시하기</span>
        </button>
        {canEditDeck && (
          <button
            type="button"
            className="deck-editor-trigger"
            onClick={onEditDeck}
            aria-label={`인벤토리 열기, 현재 덱 ${deckCardCount}장`}
          >
            <span className="deck-stack-icon" aria-hidden="true" />
            <span>인벤토리</span>
          </button>
        )}
        <button type="button" className="map-settings-trigger" onClick={onOpenSettings} disabled={mapTraveling} aria-haspopup="dialog">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
            <polygon points="9.82,4.82 11.02,2.05 12.98,2.05 14.18,4.82 15.54,5.39 18.34,4.27 19.73,5.66 18.61,8.46 19.18,9.82 21.95,11.02 21.95,12.98 19.18,14.18 18.61,15.54 19.73,18.34 18.34,19.73 15.54,18.61 14.18,19.18 12.98,21.95 11.02,21.95 9.82,19.18 8.46,18.61 5.66,19.73 4.27,18.34 5.39,15.54 4.82,14.18 2.05,12.98 2.05,11.02 4.82,9.82 5.39,8.46 4.27,5.66 5.66,4.27 8.46,5.39" />
            <circle cx="12" cy="12" r="3.2" />
          </svg>
          <span>설정</span>
        </button>
      </div>
    </header>
  );
}
