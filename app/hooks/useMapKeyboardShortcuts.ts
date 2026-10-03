import { useEffect } from "react";

type EscapeTarget = { open: boolean; close: () => void };

export function useMapKeyboardShortcuts({
  playerNameSetupOpen,
  deckEditorOpen,
  confirmDeckEditor,
  escapeTargets,
  screen,
  mapTraveling,
  deckViewerOpen,
  handleGoldDebugClick,
  openDeckEditor,
  quickPickUpFloorItems,
  waitOnMap,
  roomType,
  roomActions,
  changeMapZoom,
  resetMapZoom,
  handleMapMovementKeyDown,
  handleMapMovementKeyUp,
  clearMapKeyboardMovement,
}: {
  playerNameSetupOpen: boolean;
  deckEditorOpen: boolean;
  confirmDeckEditor: () => void;
  escapeTargets: EscapeTarget[];
  screen: "map" | "battle";
  mapTraveling: boolean;
  deckViewerOpen: boolean;
  handleGoldDebugClick: () => void;
  openDeckEditor: (message: string) => void;
  quickPickUpFloorItems: () => void;
  waitOnMap: () => void;
  roomType: string;
  roomActions: Record<string, (() => void) | undefined>;
  changeMapZoom: (delta: number) => void;
  resetMapZoom: () => void;
  handleMapMovementKeyDown: (event: KeyboardEvent) => boolean;
  handleMapMovementKeyUp: (event: KeyboardEvent) => void;
  clearMapKeyboardMovement: () => void;
}) {
  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (playerNameSetupOpen) {
        if (event.key === "Enter") {
          event.preventDefault();
          document.querySelector<HTMLFormElement>(".player-name-dialog")?.requestSubmit();
        }
        return;
      }
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

      if (deckEditorOpen && (event.key === "Escape" || event.key === "Enter" || event.key === "Tab" || event.key.toLowerCase() === "i")) {
        event.preventDefault();
        confirmDeckEditor();
        return;
      }

      if (event.key === "Escape") {
        const target = escapeTargets.find((item) => item.open);
        if (target) {
          event.preventDefault();
          target.close();
        }
        return;
      }

      if (screen !== "map" || mapTraveling || deckEditorOpen || deckViewerOpen) return;
      if (event.code === "KeyB" && !event.repeat) {
        event.preventDefault();
        handleGoldDebugClick();
        return;
      }
      if (event.key === "Tab" || event.key.toLowerCase() === "i") {
        event.preventDefault();
        openDeckEditor("덱 편집");
        return;
      }
      if (event.key.toLowerCase() === "g") {
        event.preventDefault();
        quickPickUpFloorItems();
        return;
      }
      if (event.key === "5" || event.code === "Numpad5") {
        event.preventDefault();
        waitOnMap();
        return;
      }
      if (event.key.toLowerCase() === "e" || event.key === ">" || (event.code === "Period" && event.shiftKey)) {
        const roomAction = roomActions[roomType];
        if (roomAction) {
          event.preventDefault();
          roomAction();
        }
        return;
      }
      if (event.key === "+" || (event.code === "Equal" && event.shiftKey) || event.code === "NumpadAdd") {
        event.preventDefault();
        changeMapZoom(1);
        return;
      }
      if (event.key === "-" || event.key === "_" || event.code === "NumpadSubtract") {
        event.preventDefault();
        changeMapZoom(-1);
        return;
      }
      if (event.key === "0" || event.code === "Numpad0") {
        event.preventDefault();
        resetMapZoom();
        return;
      }

      if (handleMapMovementKeyDown(event)) return;
    };

    window.addEventListener("keydown", handleKeyboard);
    window.addEventListener("keyup", handleMapMovementKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyboard);
      window.removeEventListener("keyup", handleMapMovementKeyUp);
      clearMapKeyboardMovement();
    };
  }, [
    playerNameSetupOpen,
    deckEditorOpen,
    confirmDeckEditor,
    escapeTargets,
    screen,
    mapTraveling,
    deckViewerOpen,
    handleGoldDebugClick,
    openDeckEditor,
    quickPickUpFloorItems,
    waitOnMap,
    roomType,
    roomActions,
    changeMapZoom,
    resetMapZoom,
    handleMapMovementKeyDown,
    handleMapMovementKeyUp,
    clearMapKeyboardMovement,
  ]);
}
