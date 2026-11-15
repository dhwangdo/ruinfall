import { memo, type CSSProperties } from "react";
import { tinkererStickerAt } from "../game/stickerServices";
import { CardStickerMark } from "./CardStickerMark";
import type { MapPosition, RoomType } from "../game/mapRules";
import { mapTileColor } from "./mapTileAppearance";
import { MapFloorItem, type MapFloorItemProps } from "./MapFloorItem";
import { MAP_ROOM_LABELS as ROOM_LABELS } from "../game/mapRoomLabels";

type MapRoomButtonProps = {
  mapSeed: number;
  position: MapPosition;
  roomType: RoomType;
  dungeonRegionIndex: number | null;
  current: boolean;
  interactable?: boolean;
  inVision: boolean;
  adjacent: boolean;
  reachable: boolean;
  walkable: boolean;
  mapTraveling: boolean;
  pinged?: boolean;
  bloodstained?: boolean;
  wallEdges?: string;
  itemCount: number;
  floorDeck?: MapFloorItemProps["deck"];
  floorCard?: MapFloorItemProps["card"];
  floorTicket?: MapFloorItemProps["ticket"];
  floorGold?: MapFloorItemProps["gold"];
  roomItemsTitle?: string;
  deckName?: string;
  onPreview?: (element: HTMLElement, position: MapPosition) => void;
  onClearPreview?: (nextTarget: EventTarget | null, pointerLeave: boolean) => void;
  gridColumn: number;
  gridRow: number;
  onClick: (position: MapPosition, pickUpItems?: boolean) => void;
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
  stickerAltar: "제단",
  tinkerer: "땜장이",
  cardTransmuter: "변환기",
  boss: "보스",
  blessing: "축복",
  portal: "포탈",
  heal: "회복",
  partialHeal: "회복 30%",
  safePortal: "포탈",
};

type MapRoomAppearanceProps = Pick<MapRoomButtonProps,
  "position" | "roomType" | "dungeonRegionIndex" | "current" | "interactable" | "inVision"
  | "adjacent" | "reachable" | "pinged" | "wallEdges"> & {
    gridColumn?: number;
    gridRow?: number;
    hasFloorItems: boolean;
  };

function mapRoomClassName({ roomType, dungeonRegionIndex, current, interactable, inVision, adjacent, reachable, pinged, hasFloorItems }: MapRoomAppearanceProps) {
  return [
    "map-room",
    `is-${roomType}`,
    hasFloorItems && "has-floor-items",
    dungeonRegionIndex === null ? "" : `is-region-${dungeonRegionIndex + 1}`,
    current && "is-current",
    interactable && "is-interactable",
    inVision ? "is-in-vision" : "is-out-of-vision",
    adjacent && "is-adjacent",
    reachable && "is-reachable",
    pinged && "is-pinged",
  ].filter(Boolean).join(" ");
}

function mapRoomStyle({ position, roomType, dungeonRegionIndex, current, wallEdges, gridColumn, gridRow }: MapRoomAppearanceProps): CSSProperties {
  return {
    ...(gridColumn === undefined ? {} : { gridColumn, gridRow }),
    "--map-wall-edges": wallEdges || "none",
    "--map-tile-color": current ? undefined : mapTileColor(position, roomType, dungeonRegionIndex),
  } as CSSProperties;
}

function MapRoomBadge({ roomType, position, mapSeed }: Pick<MapRoomButtonProps, "roomType" | "position" | "mapSeed">) {
  if (roomType === "deckVault") return <svg className="map-deck-vault-symbol" viewBox="0 0 100 100" aria-hidden="true"
    fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="butt" strokeLinejoin="miter">
    <path d="M29 23V76H70 M41 19H72V63H41Z" />
  </svg>;
  if (roomType === "tinkerer") return <div className="map-tinkerer-sticker">
    <CardStickerMark sticker={tinkererStickerAt(position, mapSeed)} disableTooltip />
  </div>;
  const label = ROOM_BADGES[roomType];
  if (!label) return null;
  return <span className="map-room-label">{label}</span>;
}

export function MapRoomTileVisual({ position, roomType, dungeonRegionIndex, floorDeck, mapSeed }: Pick<MapRoomButtonProps,
  "position" | "roomType" | "dungeonRegionIndex" | "deckName" | "floorDeck" | "mapSeed">) {
  const appearance: MapRoomAppearanceProps = {
    position, roomType, dungeonRegionIndex, current: false, interactable: false, inVision: true,
    adjacent: false, reachable: false, pinged: false, hasFloorItems: !!floorDeck,
  };
  return <div aria-hidden="true" className={mapRoomClassName(appearance)} style={mapRoomStyle(appearance)}>
    {floorDeck && <MapFloorItem deck={floorDeck} />}
    <MapRoomBadge roomType={roomType} position={position} mapSeed={mapSeed} />
  </div>;
}

function MapRoomButtonView({
  mapSeed,
  position,
  roomType,
  dungeonRegionIndex,
  current,
  interactable = false,
  inVision,
  adjacent,
  reachable,
  walkable,
  mapTraveling,
  pinged = false,
  bloodstained = false,
  wallEdges,
  itemCount,
  floorDeck,
  floorCard,
  floorTicket,
  floorGold,
  roomItemsTitle,
  deckName,
  onPreview,
  onClearPreview,
  gridColumn,
  gridRow,
  onClick,
}: MapRoomButtonProps) {
  const roomLabel = current ? "현재 위치" : deckName ?? ROOM_LABELS[roomType];
  const appearance: MapRoomAppearanceProps = {
    position, roomType, dungeonRegionIndex, current, interactable, inVision, adjacent, reachable, pinged,
    wallEdges, gridColumn, gridRow, hasFloorItems: itemCount > 0,
  };

  return (
    <button
      type="button"
      className={mapRoomClassName(appearance)}
      style={mapRoomStyle(appearance)}
      tabIndex={adjacent || reachable || interactable ? 0 : -1}
      aria-disabled={!walkable || mapTraveling || (!adjacent && !reachable && !interactable)}
      title={roomItemsTitle ?? (roomType === "rock" ? ROOM_LABELS.rock : undefined)}
      aria-describedby={onPreview ? "map-deck-vault-preview" : undefined}
      aria-label={`${roomLabel}${pinged ? ", 핑 위치" : ""}, 좌표 ${position.x + 1}, 깊이 ${position.y}${roomItemsTitle ? `, ${roomItemsTitle}` : ""}`}
      onClick={(event) => onClick(position, current && itemCount > 0
        && event.target instanceof Element && !!event.target.closest(".map-floor-item"))}
      onMouseEnter={onPreview ? (event) => {
        if (event.buttons === 0) onPreview(event.currentTarget, position);
      } : undefined}
      onMouseLeave={(event) => onClearPreview?.(event.relatedTarget, true)}
      onFocus={onPreview ? (event) => onPreview(event.currentTarget, position) : undefined}
      onBlur={(event) => onClearPreview?.(event.relatedTarget, false)}
    >
      {bloodstained && !current && roomType === "empty" && <i className="map-bloodstain" aria-hidden="true"
        style={{ transform: `rotate(${((position.x * 13 + position.y * 7) % 8) * 45}deg)` }} />}
      {itemCount > 0 && <MapFloorItem deck={floorDeck} card={floorCard} ticket={floorTicket} gold={floorGold} />}
      <MapRoomBadge roomType={roomType} position={position} mapSeed={mapSeed} />
      {pinged && <div className="map-room-ping" aria-hidden="true" />}
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
