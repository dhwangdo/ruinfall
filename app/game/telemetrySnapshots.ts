import { cardForgeCount } from "./cardEffects.ts";
import type { Card } from "./cards.ts";
import type { EnemyState } from "./enemies.ts";
import type { Consumable, DeckCase } from "./rewards.ts";
import type {
  TelemetryCardSnapshot,
  TelemetryConsumableSnapshot,
  TelemetryDeckSnapshot,
  TelemetryEnemySnapshot,
} from "./telemetry.ts";

export function telemetryCardSnapshot(card: Card): TelemetryCardSnapshot {
  return {
    id: card.id,
    name: card.name,
    effect: card.effect,
    rarity: card.rarity,
    cost: card.cost ?? null,
    forgeCount: cardForgeCount(card),
  };
}

export function telemetryDeckSnapshot(deck: DeckCase): TelemetryDeckSnapshot {
  return {
    id: deck.id,
    name: deck.name,
    capacity: deck.capacity,
    editions: [...deck.editions],
    cards: deck.cards.map(telemetryCardSnapshot),
  };
}

export function telemetryConsumableSnapshot(consumable: Consumable): TelemetryConsumableSnapshot {
  return {
    id: consumable.id,
    type: consumable.type,
    name: consumable.name,
  };
}

export function telemetryEnemySnapshot(enemy: EnemyState): TelemetryEnemySnapshot {
  return {
    id: enemy.id,
    name: enemy.name,
    variant: enemy.variant,
    maxHp: enemy.maxHp,
    hp: enemy.hp,
    isBoss: enemy.isBoss === true,
  };
}
