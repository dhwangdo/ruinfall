import { useEffect, useRef, useState } from "react";
import { useDeckEditorSession } from "./useDeckEditorSession";
import type { Card } from "../game/cards";

/** Edit-session state and card origins, shared by movement and ticket actions. */
export function useRunDeckEditor() {
  const {
    isOpen: deckEditorOpen,
    snapshot: deckEditorSnapshot,
    beginSession: beginDeckEditorSession,
    finishSession: finishDeckEditorSession,
  } = useDeckEditorSession();
  const deckEditorHighRarityInsertionOriginsRef = useRef<Record<number, "inventory" | "floor">>({});

  const [deckEditorDeckId, setDeckEditorDeckId] = useState("");

  const [pendingRemovedCards, setPendingRemovedCards] = useState<Card[]>([]);

  const [pendingRemovedCardAreas, setPendingRemovedCardAreas] = useState<Record<number, "inventory" | "floor">>({});

  const [deckEditorReleasedCardIds, setDeckEditorReleasedCardIds] = useState<Set<number>>(() => new Set());

  const [pendingRemovalBlinkDim, setPendingRemovalBlinkDim] = useState(false);

  const [pendingPaintTicketId, setPendingPaintTicketId] = useState<string | null>(null);

  const [pendingCloneTicketId, setPendingCloneTicketId] = useState<string | null>(null);

  const [pendingExtractTicketId, setPendingExtractTicketId] = useState<string | null>(null);

  const [pendingTransformTicketId, setPendingTransformTicketId] = useState<string | null>(null);

  const [armedBombTicketIds, setArmedBombTicketIds] = useState<Set<string>>(() => new Set());

  const [deckEditorMessage, setDeckEditorMessage] = useState("휴식 구역에서는 카드를 바닥으로 추출하고, 일반 구역에서는 제거 예정 상태로 만듭니다.");

  const [transformedCardNewIds, setTransformedCardNewIds] = useState<Set<number>>(() => new Set());

  const [deckEditorSort, setDeckEditorSort] = useState<"cost" | "rarity">("rarity");

  const originalDeckIdForCard = (cardId: number) => {
    return deckEditorSnapshot?.originDeckIdsByCardId[cardId] ?? null;
  };

  const effectiveOriginDeckIdForCard = (cardId: number) => deckEditorReleasedCardIds.has(cardId)
    ? null
    : originalDeckIdForCard(cardId);

  useEffect(() => {
    if (!deckEditorOpen) return;
    const blinkTimer = window.setInterval(() => {
      setPendingRemovalBlinkDim((current) => !current);
    }, 525);
    return () => window.clearInterval(blinkTimer);
  }, [deckEditorOpen]);

  return {
    deckEditorOpen, deckEditorSnapshot, beginDeckEditorSession, finishDeckEditorSession,
    deckEditorHighRarityInsertionOriginsRef, deckEditorDeckId, setDeckEditorDeckId,
    pendingRemovedCards, setPendingRemovedCards, pendingRemovedCardAreas,
    setPendingRemovedCardAreas, deckEditorReleasedCardIds, setDeckEditorReleasedCardIds,
    pendingRemovalBlinkDim, setPendingRemovalBlinkDim, pendingPaintTicketId,
    setPendingPaintTicketId, pendingCloneTicketId, setPendingCloneTicketId, pendingExtractTicketId,
    setPendingExtractTicketId, pendingTransformTicketId, setPendingTransformTicketId,
    armedBombTicketIds, setArmedBombTicketIds, deckEditorMessage, setDeckEditorMessage,
    transformedCardNewIds, setTransformedCardNewIds, deckEditorSort, setDeckEditorSort,
    originalDeckIdForCard, effectiveOriginDeckIdForCard,
  };
}
export type RunDeckEditor = ReturnType<typeof useRunDeckEditor>;
