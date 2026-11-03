import { useEffect, useEffectEvent, type CSSProperties } from "react";
import { REWARD_ROULETTE_SLOTS, type BattleRewardRoulette as RouletteState } from "../game/rewardRoulette";

type Props = { roulette: RouletteState; onSpin: () => void; onFinish: () => void };
const SLICE = 360 / REWARD_ROULETTE_SLOTS.length;

export function BattleRewardRoulette({ roulette, onSpin, onFinish }: Props) {
  const finish = useEffectEvent(onFinish);
  useEffect(() => {
    if (roulette.phase !== "spinning") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => finish(), reduced ? 0 : 2650);
    return () => window.clearTimeout(timer);
  }, [roulette.phase]);

  const selectedIndex = REWARD_ROULETTE_SLOTS.findIndex(slot => slot.id === roulette.selected);
  const selected = REWARD_ROULETTE_SLOTS[selectedIndex];
  const settled = roulette.phase === "settled";
  const activeSlots = new Set([...roulette.remaining,
    ...(roulette.phase === "spinning" && roulette.selected ? [roulette.selected] : [])]);
  const background = `conic-gradient(${REWARD_ROULETTE_SLOTS.map((slot, index) => {
    const active = activeSlots.has(slot.id);
    return `${active ? slot.color : "#414443"} ${index * SLICE}deg ${(index + 1) * SLICE - .65}deg, #c3bda8 ${(index + 1) * SLICE - .65}deg ${(index + 1) * SLICE}deg`;
  }).join(", ")})`;

  return (
    <section className="reward-roulette" aria-label={`보상 룰렛, 남은 보상 ${roulette.remaining.length}개`}>
      <div className="reward-roulette-shell">
        <span className="reward-roulette-pointer" aria-hidden="true" />
        <div className={`reward-roulette-disc ${roulette.phase === "spinning" ? "is-spinning" : ""}`}
          style={{ background, "--roulette-rotation": `${selectedIndex < 0 ? 0 : 1800 + 360 - (selectedIndex + .5) * SLICE}deg` } as CSSProperties}
          onTransitionEnd={event => {
            if (event.target === event.currentTarget && event.propertyName === "transform" && roulette.phase === "spinning") onFinish();
          }}>
          {REWARD_ROULETTE_SLOTS.map((slot, index) => (
            <span key={slot.id} data-slot-id={slot.id}
              className={`reward-roulette-label ${!activeSlots.has(slot.id) ? "is-used" : ""}`}
              style={{ "--wedge-angle": `${(index + .5) * SLICE}deg` } as CSSProperties}>
              {slot.shortLabel}
              {"jackpot" in slot && <small>당첨!</small>}
            </span>
          ))}
        </div>
        <button type="button" className="reward-roulette-spin" onClick={onSpin}
          disabled={roulette.phase !== "ready"} aria-label="룰렛 돌리기">
          {roulette.phase === "ready" ? "돌리기" : roulette.phase === "spinning" ? "…" : settled ? "획득" : "소진"}
        </button>
      </div>
      <p className="reward-roulette-result" role="status" aria-live="polite">
        {settled && selected ? <>{"jackpot" in selected && <strong>당첨! </strong>}{selected.label}</>
          : roulette.phase === "empty" ? "이번 구간의 룰렛 보상을 모두 받았습니다."
          : roulette.phase === "spinning" ? "돌아가는 중…" : "버튼을 눌러 보상을 뽑으세요."}
      </p>
      <span className="reward-roulette-remaining">남은 보상 {roulette.remaining.length} / 9 · 포탈 이용 시 초기화</span>
    </section>
  );
}
