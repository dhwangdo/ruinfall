export const MINIMAP_PLAYER_MARKERS = [
  { id: "dot", label: "작은 점", description: "작은 흰 점과 검은 테두리로 표시합니다." },
  { id: "outline", label: "빈 사각형", description: "가운데 지형이 보이는 흰 테두리입니다." },
  { id: "cross", label: "십자", description: "흰 십자로 위치를 강조합니다." },
  { id: "solid", label: "큰 사각형", description: "기존처럼 주변 3×3칸을 흰색으로 채웁니다." },
] as const;

export type MinimapPlayerMarkerId = typeof MINIMAP_PLAYER_MARKERS[number]["id"];
export const DEFAULT_MINIMAP_PLAYER_MARKER: MinimapPlayerMarkerId = "outline";

export function isMinimapPlayerMarker(value: unknown): value is MinimapPlayerMarkerId {
  return MINIMAP_PLAYER_MARKERS.some(marker => marker.id === value);
}

export function minimapPlayerMarkerSize(marker: MinimapPlayerMarkerId, tilePixels: number) {
  const tile = Number.isFinite(tilePixels) && tilePixels > 0 ? tilePixels : 3;
  if (marker === "solid") return tile * 3;
  if (marker === "dot") return Math.max(5, Math.min(10, tile));
  if (marker === "cross") return Math.max(12, Math.min(20, tile * 2));
  return Math.max(10, Math.min(18, tile * 2));
}
