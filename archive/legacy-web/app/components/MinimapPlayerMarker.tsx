import type { CSSProperties } from "react";
import { minimapPlayerMarkerSize, type MinimapPlayerMarkerId } from "../game/minimapPlayerMarkers";
import { MINIMAP_COLORS } from "../game/mapMinimap";

export function MinimapPlayerMarker({ marker, tilePixels, style }: {
  marker: MinimapPlayerMarkerId;
  tilePixels: number;
  style?: CSSProperties;
}) {
  const size = minimapPlayerMarkerSize(marker, tilePixels);
  return <span className={`minimap-player-marker is-${marker}`} aria-hidden="true"
    style={{ ...style, width: size, height: size }}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {marker === "dot" ? <circle cx="12" cy="12" r="9" fill={MINIMAP_COLORS.player} stroke={MINIMAP_COLORS.background} strokeWidth="4" />
        : marker === "outline" ? <>
          <rect x="4" y="4" width="16" height="16" stroke={MINIMAP_COLORS.background} strokeWidth="6" />
          <rect x="4" y="4" width="16" height="16" stroke={MINIMAP_COLORS.player} strokeWidth="2.5" />
        </> : marker === "cross" ? <>
          <path d="M12 2v20M2 12h20" stroke={MINIMAP_COLORS.background} strokeWidth="7" />
          <path d="M12 2v20M2 12h20" stroke={MINIMAP_COLORS.player} strokeWidth="3" />
        </> : <rect width="24" height="24" fill={MINIMAP_COLORS.player} />}
    </svg>
  </span>;
}
