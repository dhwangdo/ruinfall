import type { CSSProperties } from "react";

/** Shared by the real battlefield and mechanic demonstrations. */
export function BattleResources({ energy, maximumEnergy, stars }: {
  energy: number; maximumEnergy: number; stars: number;
}) {
  return <div className="energy-star-system center-resource"
    aria-label={`에너지 ${energy} 중 ${maximumEnergy}, 별 ${stars}개`}
    title={`별 ${stars}개`}
    style={{ "--energy-fill": `${Math.min(100, Math.max(0, energy / maximumEnergy * 100))}%` } as CSSProperties}>
    <div className="energy-orb"><span>{energy}</span><small>/ {maximumEnergy}</small></div>
    <div className="energy-stars" aria-hidden="true">
      {stars > 6 ? <><span>★</span><small>x{stars}</small></>
        : Array.from({ length: stars }, (_, index) => <span key={index}>★</span>)}
    </div>
  </div>;
}
