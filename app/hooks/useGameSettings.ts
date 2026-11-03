"use client";

import { useSyncExternalStore } from "react";

type GameSettings = { battleDeckCheckEnabled: boolean; animationTooltipsEnabled: boolean };
const DEFAULT_SETTINGS: GameSettings = { battleDeckCheckEnabled: true, animationTooltipsEnabled: true };
const STORAGE_KEY = "ruinfall:settings:v1";
const listeners = new Set<() => void>();
let settings = DEFAULT_SETTINGS;
let initialized = false;

function getSettings() {
  if (!initialized && typeof window !== "undefined") {
    initialized = true;
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
      settings = {
        battleDeckCheckEnabled: typeof saved?.battleDeckCheckEnabled === "boolean" ? saved.battleDeckCheckEnabled : true,
        animationTooltipsEnabled: typeof saved?.animationTooltipsEnabled === "boolean" ? saved.animationTooltipsEnabled : true,
      };
    } catch { settings = DEFAULT_SETTINGS; }
  }
  return settings;
}

function refreshSettings(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  initialized = false;
  listeners.forEach(notify => notify());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", refreshSettings);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", refreshSettings);
  };
}

function updateSettings(update: Partial<GameSettings>) {
  settings = { ...getSettings(), ...update };
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* Keep in memory. */ }
  listeners.forEach(notify => notify());
}

const getServerSettings = () => DEFAULT_SETTINGS;
const setBattleDeckCheckEnabled = (enabled: boolean) => updateSettings({ battleDeckCheckEnabled: enabled });
const setAnimationTooltipsEnabled = (enabled: boolean) => updateSettings({ animationTooltipsEnabled: enabled });

/** Preferences are independent of run saves and shared by every card preview. */
export function useGameSettings() {
  const snapshot = useSyncExternalStore(subscribe, getSettings, getServerSettings);
  return { ...snapshot, setBattleDeckCheckEnabled, setAnimationTooltipsEnabled };
}
