export function DeckSlotPlaceholder({ kind }: {
  kind: "rare-slot" | "normal-slot" | "divider";
}) {
  if (kind === "rare-slot") {
    return <div className="deck-editor-rare-slot is-empty" role="img" aria-label="빈 희귀 슬롯" />;
  }
  if (kind === "divider") {
    return <div className="deck-editor-slot-divider" role="separator" aria-label="희귀 슬롯과 일반 슬롯 구분" />;
  }
  return <span className="deck-editor-empty-card-slot" role="img" aria-label="빈 일반 슬롯" />;
}
