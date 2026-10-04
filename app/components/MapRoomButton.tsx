import type { CSSProperties } from "react";
import type { MapPosition, RoomType } from "../game/mapRules";

type MapRoomButtonProps = {
  position: MapPosition;
  roomType: RoomType;
  dungeonRegionIndex: number | null;
  current: boolean;
  inVision: boolean;
  adjacent: boolean;
  reachable: boolean;
  walkable: boolean;
  mapTraveling: boolean;
  hasItems: boolean;
  roomItemsTitle?: string;
  gridColumn: number;
  gridRow: number;
  onClick: () => void;
};

const ROOM_LABELS: Record<RoomType, string> = {
  void: "먼 공간",
  rock: "단단한 바위",
  empty: "방",
  blessing: "축복",
  shop: "상점",
  shrine: "추출의 성소",
  recoveryShrine: "회복의 성소",
  vitalityShrine: "건강의 성소",
  mindEyeShrine: "심안의 성소",
  transformShrine: "변환의 성소",
  combinationShrine: "조합의 성소",
  treasureChest: "보물 상자",
  boss: "보스",
  portal: "안전 지역 포탈",
  heal: "회복 노드",
  safePortal: "다음 지역 포탈",
};

const ROOM_BADGES: Partial<Record<RoomType, string>> = {
  shop: "상점",
  shrine: "추출의 성소",
  recoveryShrine: "회복의 성소",
  vitalityShrine: "건강의 성소",
  mindEyeShrine: "심안의 성소",
  transformShrine: "변환의 성소",
  combinationShrine: "조합의 성소",
  treasureChest: "보물 상자",
  boss: "보스",
  blessing: "축복",
  portal: "포탈",
  heal: "회복",
  safePortal: "포탈",
};

export function MapRoomButton({
  position,
  roomType,
  dungeonRegionIndex,
  current,
  inVision,
  adjacent,
  reachable,
  walkable,
  mapTraveling,
  hasItems,
  roomItemsTitle,
  gridColumn,
  gridRow,
  onClick,
}: MapRoomButtonProps) {
  const roomLabel = current ? "현재 위치" : ROOM_LABELS[roomType];

  return (
    <button
      type="button"
      className={`map-room is-${roomType} ${dungeonRegionIndex === null ? "" : `is-region-${dungeonRegionIndex + 1}`} ${current ? "is-current" : ""} ${inVision ? "is-in-vision" : "is-out-of-vision"} ${adjacent ? "is-adjacent" : ""} ${reachable ? "is-reachable" : ""}`}
      style={{ gridColumn, gridRow } as CSSProperties}
      tabIndex={adjacent || reachable ? 0 : -1}
      aria-disabled={!walkable || mapTraveling || (!adjacent && !reachable)}
      title={roomItemsTitle}
      aria-label={`${roomLabel}, 좌표 ${position.x + 1}, 깊이 ${position.y}${roomItemsTitle ? `, ${roomItemsTitle}` : ""}`}
      onClick={onClick}
    >
      {ROOM_BADGES[roomType] && <span>{ROOM_BADGES[roomType]}</span>}
      {roomType === "rock" && <span className="rock-label">단단한 돌</span>}
      {hasItems && <span className="room-item-indicator" aria-label="아이템 있음" />}
    </button>
  );
}
