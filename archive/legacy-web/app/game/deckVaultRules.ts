export const DECK_VAULT_KEY_COST = 3;
export const DECK_VAULT_UNLOCK_HOLD_MS = 2_000;

export function deckVaultUnlockHold(elapsedMs: number, keys: number) {
  const enabled = canUnlockDeckVault(keys, false);
  const elapsedProgress = Math.max(0, elapsedMs) / DECK_VAULT_UNLOCK_HOLD_MS;
  return {
    progress: enabled ? Math.min(1, elapsedProgress) : 0,
    complete: enabled && elapsedProgress >= 1,
  };
}

export function canUnlockDeckVault(keys: number, opened: boolean) {
  return !opened && keys >= DECK_VAULT_KEY_COST;
}
