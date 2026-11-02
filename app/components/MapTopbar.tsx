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
          <button
            type="button"
            className="map-gold map-gold-debug-trigger"
            onClick={onGoldDebugClick}
            aria-label={`골드 ${gold}`}
          >
            <strong>$ {gold}</strong>
          </button>
          <span className="map-key-count" aria-label={`열쇠 ${keys}개`}>열쇠 {keys}</span>
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
      </div>
    </header>
  );
}
