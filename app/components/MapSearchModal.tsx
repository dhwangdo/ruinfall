"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { buildMapSearchEntries, filterMapSearchEntries, type MapSearchData, type MapSearchKind } from "../game/mapSearch";
import type { MapPosition } from "../game/mapRules";
import { DeckName } from "./DeckName";
import { DeckVaultCards } from "./DeckVaultCards";
import { CardVisual } from "./CardVisual";
import { ConsumableVisual } from "./ConsumableVisual";
import { useDeckEditorPreviews } from "../hooks/useDeckEditorPreviews";
import { cardSearchText } from "./cardSearchText";
import { DeckEditorPreviews } from "./DeckEditorPreviews";

export function MapSearchModal({ data, currentRegion, onClose, onLocate }: {
  data: MapSearchData; currentRegion: number; onClose: () => void; onLocate: (position: MapPosition) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null), inputRef = useRef<HTMLInputElement>(null);
  const [entries] = useState(() => buildMapSearchEntries(data, cardSearchText));
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<MapSearchKind | "all">("vault");
  const [region, setRegion] = useState<number | "all">(currentRegion);
  const [includeOpened, setIncludeOpened] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { controlsRef, actions } = useDeckEditorPreviews();
  const results = useMemo(() => filterMapSearchEntries(entries, { query, kind, region, includeOpened }),
    [entries, query, kind, region, includeOpened]);
  const selected = results.find(entry => entry.id === selectedId) ?? results[0];
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
      <header><h2 id="map-search-title">지도 검색</h2><button type="button" onClick={onClose}>닫기</button></header>
      <div className="map-search-tools">
        <input ref={inputRef} type="search" className="map-search-input" placeholder="덱 · 카드 이름과 효과 · 에디션 · 장소 검색"
          aria-label="지도 검색어" value={query} onChange={event => { actions.clearCardPreview(); setQuery(event.target.value); }} />
        <div className="map-search-filters">
          <div aria-label="검색 종류">{([["vault", "금고"], ["item", "아이템"], ["place", "특수 장소"], ["all", "전체"]] as const)
            .map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value}
              onClick={() => { actions.clearCardPreview(); setKind(value); }}>{label}</button>)}</div>
          <select aria-label="검색 지역" value={region} onChange={event => { actions.clearCardPreview(); setRegion(event.target.value === "all" ? "all" : Number(event.target.value)); }}>
            <option value="all">모든 지역</option>{regions.map(value => <option key={value} value={value}>{value}지역</option>)}
          </select>
          <label><input type="checkbox" checked={includeOpened} onChange={event => { actions.clearCardPreview(); setIncludeOpened(event.target.checked); }} />개방한 금고 포함</label>
        </div>
      </div>
      <div className="map-search-content">
        <nav className="map-search-results" aria-label={`검색 결과 ${results.length}개`}>
          <p>{results.length}개 발견</p>
          {results.map(entry => <button type="button" key={entry.id} aria-pressed={selected?.id === entry.id}
            onClick={() => { actions.clearCardPreview(); setSelectedId(entry.id); }}>
            <strong>{entry.deck ? <DeckName deck={entry.deck} onEditionTooltipHover={actions.editionTooltip.show} onEditionTooltipLeave={actions.editionTooltip.clear} /> : entry.label}</strong>
            <small>{entry.region}지역{entry.deck ? ` · ${entry.deck.cards.length}/${entry.deck.capacity}장` : ""}
              {(entry.count ?? 0) > 1 ? ` · x${entry.count}` : ""}{entry.kind === "vault" ? entry.opened ? " · 개방 완료" : " · 미개방" : ""}</small>
            {entry.containerLabel && <small>{entry.containerLabel}</small>}
          </button>)}
          {results.length === 0 && <p className="map-search-empty">발견한 장소나 물품 중 일치하는 결과가 없습니다.</p>}
        </nav>
        <section className="map-search-detail" aria-label="선택한 검색 결과">
          {selected ? <>
            <header><h3>{selected.deck ? <DeckName deck={selected.deck} onEditionTooltipHover={actions.editionTooltip.show} onEditionTooltipLeave={actions.editionTooltip.clear} /> : selected.label}</h3>
              <button type="button" onClick={() => onLocate(selected.position)}>위치 보기</button></header>
            {selected.containerLabel && <p className="map-search-container-label">{selected.containerLabel}</p>}
            {selected.deck ? <DeckVaultCards deck={selected.deck} onCardHover={actions.moveDeckCardPreview} onCardLeave={actions.clearCardPreview} />
              : <div className="map-search-item-preview">{selected.card ? <CardVisual card={selected.card} onMouseMove={event => actions.moveDeckCardPreview(event, selected.card!)} onMouseLeave={actions.clearCardPreview} />
                : selected.consumable ? <ConsumableVisual item={selected.consumable} variant="full" />
                  : <p>{selected.region}지역에서 발견한 {selected.label}</p>}</div>}
          </> : <p className="map-search-empty">검색어와 필터를 바꿔 보세요.</p>}
        </section>
      </div>
    </section>
    <DeckEditorPreviews controlsRef={controlsRef} suppressed={false} />
  </dialog>;
}
