"use client";
import { occupiedDeckSpace, STICKERS } from "../game/stickers";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildMapSearchEntries, filterMapSearchEntries, type MapSearchData, type MapSearchEntry, type MapSearchKind } from "../game/mapSearch";
import type { MapPosition } from "../game/mapRules";
import { DeckName } from "./DeckName";
import { DeckVaultCards } from "./DeckVaultCards";
import { CardVisual } from "./CardVisual";
import { ConsumableVisual } from "./ConsumableVisual";
import { useDeckEditorPreviews } from "../hooks/useDeckEditorPreviews";
import { cardSearchText } from "./cardSearchText";
import { DeckEditorPreviews } from "./DeckEditorPreviews";
import { CardStickerMark } from "./CardStickerMark";
import { MapRoomTileVisual } from "./MapRoomButton";
import { SearchRegionMinimap } from "./SearchRegionMinimap";

function SearchTilePreview({ entry, data, className = "" }: {
  entry: MapSearchEntry; data: MapSearchData; className?: string;
}) {
  const roomType = data.roomTypeAt(entry.position);
  return <div className={`map-search-result-tile-frame ${className}`} role="img"
    aria-label={`${entry.deck?.name ?? entry.label} 타일`}>
    <MapRoomTileVisual mapSeed={data.seed} position={entry.position} roomType={roomType} dungeonRegionIndex={entry.region - 1}
      deckName={entry.deck?.name} floorDeck={entry.kind === "deck" && roomType === "empty" ? entry.deck : undefined} />
  </div>;
}

export function MapSearchModal({ data, currentRegion, pingPosition, onClose, onPing }: {
  data: MapSearchData; currentRegion: number; pingPosition: MapPosition | null;
  onClose: () => void; onPing: (position: MapPosition, label: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null), inputRef = useRef<HTMLInputElement>(null);
  const [entries] = useState(() => buildMapSearchEntries(data, cardSearchText));
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<MapSearchKind>("deck");
  const [region, setRegion] = useState<number | "all">(currentRegion);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { controlsRef, actions } = useDeckEditorPreviews();
  const results = useMemo(() => filterMapSearchEntries(entries, { query, kind, region, includeOpened: false }),
    [entries, query, kind, region]);
  const selected = results.find(entry => entry.id === selectedId) ?? results[0];
  const selectedPingLabel = selected?.deck?.name ?? selected?.label ?? "";
  const regions = [...new Set([currentRegion, ...entries.map(entry => entry.region)])].sort((a,b) => a-b);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    inputRef.current?.focus();
    return () => dialog?.close();
  }, []);

  return <dialog className="map-search-dialog" ref={dialogRef} aria-labelledby="map-search-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    onKeyDown={event => {
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyF") {
        event.preventDefault(); inputRef.current?.focus(); inputRef.current?.select();
      }
      event.stopPropagation();
    }}>
    <section className="map-search-panel">
      <header><h2 id="map-search-title">지도 검색</h2>
        <input ref={inputRef} type="search" className="map-search-input" placeholder="덱 · 카드 이름과 효과 · 에디션 · 장소 검색"
          aria-label="지도 검색어" value={query} onChange={event => { actions.clearCardPreview(); setQuery(event.target.value); }} />
        <button type="button" onClick={onClose}>닫기</button>
      </header>
      <div className="map-search-tools">
        <div className="map-search-filters">
          <div aria-label="검색 종류">{([["deck", "덱"], ["item", "아이템"], ["place", "특수 장소"]] as const)
            .map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value}
              onClick={() => { actions.clearCardPreview(); setKind(value); }}>{label}</button>)}</div>
          <select aria-label="검색 지역" value={region} onChange={event => { actions.clearCardPreview(); setRegion(event.target.value === "all" ? "all" : Number(event.target.value)); }}>
            <option value="all">모든 지역</option>{regions.map(value => <option key={value} value={value}>{value}지역</option>)}
          </select>
        </div>
      </div>
      <div className="map-search-content">
        <nav className="map-search-results" aria-label={`검색 결과 ${results.length}개`}>
          <p>{results.length}개 발견</p>
          {results.map(entry => <button type="button" key={entry.id} aria-pressed={selected?.id === entry.id}
            onClick={() => { actions.clearCardPreview(); setSelectedId(entry.id); }}>
            <span className="map-search-result-copy">
              <strong>{entry.deck ? <DeckName deck={entry.deck} nameAnnotation={` - ${entry.region}지역`} nameSuffix={`${occupiedDeckSpace(entry.deck.cards)} / ${entry.deck.capacity}장`} onEditionTooltipHover={actions.editionTooltip.show} onEditionTooltipLeave={actions.editionTooltip.clear} />
                : entry.label}</strong>
              {!entry.deck && <small>{entry.region}지역{(entry.count ?? 0) > 1 ? ` · x${entry.count}` : ""}</small>}
              {entry.containerLabel && <small>{entry.containerLabel}</small>}
            </span>
            {entry.card && <CardVisual card={entry.card} variant="compact" className="map-search-result-card"
              disableStickerTooltips aria-hidden="true" />}
            {!entry.card && (entry.kind === "deck" || entry.kind === "place") && <SearchTilePreview entry={entry} data={data} />}
          </button>)}
          {results.length === 0 && <p className="map-search-empty">발견한 장소나 물품 중 일치하는 결과가 없습니다.</p>}
        </nav>
        <section className="map-search-detail" aria-label="선택한 검색 결과">
          {selected ? <>
            <div className={`map-search-summary${selected.deck ? " is-deck" : ""}`}>
              <div className="map-search-selection">
              <div className="map-search-title-row">
              <h3>{selected.deck ? <DeckName deck={selected.deck} nameSuffix={`${occupiedDeckSpace(selected.deck.cards)} / ${selected.deck.capacity}장`}
                onEditionTooltipHover={actions.editionTooltip.show} onEditionTooltipLeave={actions.editionTooltip.clear} />
              : selected.label}</h3>
                <div className="map-search-detail-actions">
                  <button type="button" onClick={() => onPing(selected.position, selectedPingLabel)}>
                    {pingPosition?.x === selected.position.x && pingPosition?.y === selected.position.y ? "핑 해제" : "핑 찍기"}
                  </button>
                </div>
              </div>
              {!selected.deck && <p className="map-search-selection-meta">{selected.region}지역</p>}
              {selected.kind === "place" && selected.sticker && <p className="map-search-sticker-description">
                <CardStickerMark sticker={selected.sticker} disableTooltip />
                <span><strong>{STICKERS[selected.sticker].name}</strong> - {STICKERS[selected.sticker].description}</span>
              </p>}
              {selected.containerLabel && <p className="map-search-container-label">{selected.containerLabel}</p>}
              {selected.card || selected.consumable ? <div className="map-search-item-preview">
                {selected.card ? <CardVisual card={selected.card} onMouseMove={event => actions.moveDeckCardPreview(event, selected.card!)} onMouseLeave={actions.clearCardPreview} />
                  : selected.consumable && <ConsumableVisual item={selected.consumable} variant="full" />}
              </div> : !selected.deck && selected.kind !== "place" && <SearchTilePreview entry={selected} data={data} className="map-search-selection-tile" />}
              </div>
              <div className="map-search-location">
                <SearchRegionMinimap data={data} region={selected.region} target={selected.position} />
              </div>
            </div>
            {selected.deck ? <div className="map-search-deck-detail">
                <DeckVaultCards deck={selected.deck}
                  onCardHover={actions.moveDeckCardPreview} onCardLeave={actions.clearCardPreview} />
              </div> : null}
          </> : <p className="map-search-empty">검색어와 필터를 바꿔 보세요.</p>}
        </section>
      </div>
    </section>
    <DeckEditorPreviews controlsRef={controlsRef} suppressed={false} />
  </dialog>;
}
