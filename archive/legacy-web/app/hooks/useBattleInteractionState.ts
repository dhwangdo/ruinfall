import { useRef, useState } from "react";
import type { DragState } from "../game/battleUiTypes";

export type ActiveBattleDrag = DragState & { startX: number; startY: number };

export function useBattleInteractionState() {
  const [selectedHandCardId, setSelectedHandCardId] = useState<number | null>(null);
  const [hoveredHandCardId, setHoveredHandCardId] = useState<number | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dragOverDropTarget, setDragOverDropTarget] = useState<string | null>(null);
  const [centerDropPointerHover, setCenterDropPointerHover] = useState(false);
  const [pileClearNotice, setPileClearNotice] = useState(false);
  const centerDropZoneRef = useRef<HTMLDivElement | null>(null);

  return {
    selectedHandCardId,
    setSelectedHandCardId,
    hoveredHandCardId,
    setHoveredHandCardId,
    dragging,
    setDragging,
    dragOverDropTarget,
    setDragOverDropTarget,
    centerDropPointerHover,
    setCenterDropPointerHover,
    pileClearNotice,
    setPileClearNotice,
    centerDropZoneRef,
  };
}
