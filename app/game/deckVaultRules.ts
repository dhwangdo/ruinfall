export const DECK_VAULT_KEY_COST = 3;

export function canUnlockDeckVault(keys: number, opened: boolean) {
  return !opened && keys >= DECK_VAULT_KEY_COST;
}
