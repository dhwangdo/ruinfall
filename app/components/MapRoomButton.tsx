import { memo, type CSSProperties } from "react";
import type { MapPosition, RoomType } from "../game/mapRules";
import { mapTileColor } from "./mapTileAppearance";
import { MapFloorItem, type MapFloorItemProps } from "./MapFloorItem";
import { MAP_ROOM_LABELS as ROOM_LABELS } from "../game/mapRoomLabels";

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
  searchHighlighted?: boolean;
  bloodstained?: boolean;
  itemCount: number;
  floorDeck?: MapFloorItemProps["deck"];
  floorCard?: MapFloorItemProps["card"];
  floorTicket?: MapFloorItemProps["ticket"];
  roomItemsTitle?: string;
  deckName?: string;
  onPreview?: (element: HTMLElement, position: MapPosition) => void;
  onClearPreview?: (nextTarget: EventTarget | null, pointerLeave: boolean) => void;
  gridColumn: number;
  gridRow: number;
  onClick: (position: MapPosition) => void;
};

const ROOM_BADGES: Partial<Record<RoomType, string>> = {
  shop: "상점",
  bloodShop: "피의 상점",
  extractionShrine: "추출의 성소",
  recoveryShrine: "회복의 성소",
  vitalityShrine: "건강의 성소",
  mindEyeShrine: "심안의 성소",
  transformShrine: "변환의 성소",
  treasureChest: "보물 상자",
  deckVault: "덱 보관소",
  boss: "보스",
  blessing: "축복",
  portal: "포탈",
  heal: "회복",
  safePortal: "포탈",
};

function MapRoomButtonView({
  position,
  roomType,
  dungeonRegionIndex,
  current,
  inVision,
  adjacent,
  reachable,
  walkable,
  mapTraveling,
  searchHighlighted = false,
  bloodstained = false,
  itemCount,
  floorDeck,
  floorCard,
  floorTicket,
  roomItemsTitle,
  deckName,
  onPreview,
  onClearPreview,
  gridColumn,
  gridRow,
  onClick,
}: MapRoomButtonProps) {
  const roomLabel = current ? "현재 위치" : deckName ?? ROOM_LABELS[roomType];

  return (
    <button
      type="button"
      data-search-highlight={searchHighlighted || undefined}
      className={`map-room is-${roomType} ${itemCount > 0 ? "has-floor-items" : ""} ${dungeonRegionIndex === null ? "" : `is-region-${dungeonRegionIndex + 1}`} ${current ? "is-current" : ""} ${inVision ? "is-in-vision" : "is-out-of-vision"} ${adjacent ? "is-adjacent" : ""} ${reachable ? "is-reachable" : ""}`}
      style={{ gridColumn, gridRow, "--map-tile-color": current ? undefined : mapTileColor(position, roomType, dungeonRegionIndex) } as CSSProperties}
      tabIndex={adjacent || reachable ? 0 : -1}
      aria-disabled={!walkable || mapTraveling || (!adjacent && !reachable)}
      title={roomItemsTitle ?? (roomType === "rock" ? ROOM_LABELS.rock : undefined)}
      aria-describedby={onPreview ? "map-deck-vault-preview" : undefined}
      aria-label={`${roomLabel}, 좌표 ${position.x + 1}, 깊이 ${position.y}${roomItemsTitle ? `, ${roomItemsTitle}` : ""}`}
      onClick={() => onClick(position)}
      onMouseEnter={onPreview ? (event) => {
        if (event.buttons === 0) onPreview(event.currentTarget, position);
      } : undefined}
      onMouseLeave={(event) => onClearPreview?.(event.relatedTarget, true)}
      onFocus={onPreview ? (event) => onPreview(event.currentTarget, position) : undefined}
      onBlur={(event) => onClearPreview?.(event.relatedTarget, false)}
    >
      {bloodstained && <i className="map-bloodstain" aria-hidden="true"
        style={{ transform: `rotate(${((position.x * 13 + position.y * 7) % 8) * 45}deg)` }} />}
      {itemCount > 0 && <MapFloorItem deck={floorDeck} card={floorCard} ticket={floorTicket} />}
      {ROOM_BADGES[roomType] && <span className="map-room-label">{roomType === "deckVault" ? deckName ?? ROOM_BADGES[roomType] : ROOM_BADGES[roomType]}</span>}
      {itemCount > 1 && <span className="room-item-indicator" aria-label="추가 아이템 있음" />}
    </button>
  );
}

const MemoMapRoomButton = memo(MapRoomButtonView, (previous, next) =>
  previous.position.x === next.position.x && previous.position.y === next.position.y
  && (Object.keys(next) as (keyof MapRoomButtonProps)[])
    .every(key => key === "position" || previous[key] === next[key]));

export function MapRoomButton(props: MapRoomButtonProps) {
  return <MemoMapRoomButton {...props} />;
}
