import { useContext, type MouseEvent as ReactMouseEvent } from "react";
import { DebugModeContext } from "./debugModeContext";
import {
  DECK_EDITION_INFO,
  DECK_EDITION_SCORES,
  getDeckEditionColor,
  type DeckCase,
  type DeckEdition,
} from "../game/rewards";

type DeckNameProps = {
  deck: DeckCase;
  showEditions?: boolean;
  showEditionTooltips?: boolean;
  showGenerationDebug?: boolean;
  onEditionTooltipHover?: (event: ReactMouseEvent<HTMLElement>, edition: DeckEdition) => void;
  onEditionTooltipLeave?: () => void;
};

export function DeckName({
  deck,
  showEditions = true,
  showEditionTooltips = true,
  showGenerationDebug = true,
  onEditionTooltipHover,
  onEditionTooltipLeave,
}: DeckNameProps) {
  const debugMode = useContext(DebugModeContext);
  const generationText = deck.generation
    ? `s=${deck.generation.s} · x=${deck.generation.x} · y=${deck.generation.y} · z=${deck.generation.z}`
    : "생성값 기록 없음";
  const editions = showEditions
    ? deck.editions
      .filter((edition) => DECK_EDITION_INFO[edition] !== undefined)
      .sort((left, right) => DECK_EDITION_SCORES[right] - DECK_EDITION_SCORES[left])
    : [];

  return (
    <span className="deck-name-with-editions" title={debugMode ? generationText : undefined}>
      <span className="deck-name-label">{`덱 「${deck.name}」`}</span>
      {editions.length > 0 && " "}
      {editions.length > 0 && (
        <span className="deck-name-editions">
          {editions.map((edition) => (
            <span
              className="deck-edition-name"
              key={edition}
              style={{ color: getDeckEditionColor(edition) }}
              onMouseEnter={showEditionTooltips && onEditionTooltipHover
                ? (event) => onEditionTooltipHover(event, edition)
                : undefined}
              onMouseMove={showEditionTooltips && onEditionTooltipHover
                ? (event) => onEditionTooltipHover(event, edition)
                : undefined}
              onMouseLeave={showEditionTooltips && onEditionTooltipLeave ? onEditionTooltipLeave : undefined}
            >
              {`[${DECK_EDITION_INFO[edition].name}]`}
              {showEditionTooltips && !onEditionTooltipHover && (
                <span className="deck-edition-tooltip" role="tooltip">
                  <strong>{DECK_EDITION_INFO[edition].name}</strong>
                  <span>{DECK_EDITION_INFO[edition].description}</span>
                </span>
              )}{" "}
            </span>
          ))}
        </span>
      )}
      {debugMode && showGenerationDebug && <span className="deck-generation-debug">{generationText}</span>}
    </span>
  );
}
