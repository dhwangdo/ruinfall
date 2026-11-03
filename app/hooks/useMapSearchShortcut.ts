import { useEffect } from "react";

/** Capture before map/UI handlers and cancel the browser's native Find action. */
export function useMapSearchShortcut(enabled: boolean, openSearch: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.code !== "KeyF") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) openSearch();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, openSearch]);
}
