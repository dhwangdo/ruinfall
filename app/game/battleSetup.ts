import type { DeckCase } from "./rewards";
import type { BlessingId } from "./blessingRules";
import type { BattleEncounter } from "./runTypes";
import { dealtState } from "./battleState.ts";
import { createAdrenalineCard } from "./cards.ts";
import { applyPlayerTurnStart, createSewerEncounterByIndex } from "./enemies.ts";
import { hasUniqueCardEffects } from "./blessingRules.ts";
import { enemyEnergyRecoveryPenalty } from "./enemyPassives.ts";
import { resolveEnemyDeathStuns } from "./enemyDefeatRules.ts";

/** Prepares the game data for an encounter, independently of UI and telemetry. */
export function prepareBattleStart({
  encounters, playerHp, battleDeck, blessings, godsLamentCharges, nextCardId: firstId,
}: {
  encounters: BattleEncounter[]; playerHp: number; battleDeck?: DeckCase;
  blessings: readonly BlessingId[]; godsLamentCharges: number; nextCardId: number;
}) {
  let nextCardId = firstId;
  const godsLamentApplies = godsLamentCharges > 0;
  const remainingGodsLamentCharges = Math.max(
    0,
    godsLamentCharges - (godsLamentApplies ? 1 : 0),
  );
  const battleEnemies = resolveEnemyDeathStuns(encounters.flatMap((encounter) =>
    createSewerEncounterByIndex(encounter.encounterIndex).map((enemy) => {
      const currentHp = Math.max(0, enemy.hp - (encounter.damageTaken ?? 0));
      return {
        ...enemy,
        isBoss: encounter.isBoss,
        hp: godsLamentApplies ? Math.floor(currentHp * 0.7) : currentHp,
        strength: blessings.includes("absorption") ? enemy.strength - 1 : enemy.strength,
      };
    })));
  const absorptionStrength = blessings.includes("absorption")
    ? battleEnemies.filter((enemy) => enemy.hp > 0).length
    : 0;

  if (!battleDeck) {
    return {
      game: {
        ...dealtState(0, [], battleEnemies.map(applyPlayerTurnStart)),
        playerHp: 0, status: "lost" as const, message: "사용할 덱이 없어 쓰러졌습니다."
      },
      battleEnemies, nextCardId, remainingGodsLamentCharges, defeatedByBomb: false, relicSource: null,
    };
  }
  const wolfTalismanStrength = battleDeck.cards.reduce(
    (total, card) => total + (card.effect === "wolfTalisman" ? card.value : 0), 0,
  );
  const turtleTalismanAgility = battleDeck.cards.reduce(
    (total, card) => total + (card.effect === "turtleTalisman" ? card.value : 0), 0,
  );
  const dealtGame = dealtState(
    playerHp,
    battleDeck.cards,
    battleEnemies.map(applyPlayerTurnStart),
    battleDeck.editions,
    blessings.includes("clairvoyance") ? .25 : 0,
  );
  const highlanderActive = blessings.includes("highlander") && hasUniqueCardEffects(battleDeck.cards);
  const deckHighlanderActive = battleDeck.editions.includes("deckHighlander")
    && battleDeck.cards.length >= battleDeck.capacity
    && hasUniqueCardEffects(battleDeck.cards);
  const startingResistance = !blessings.includes("glassCannon") && battleDeck.editions.includes("resistance") ? 1 : 0;
  const nextGame = {
    ...dealtGame,
    hand: blessings.includes("ninja") && encounters.some((encounter) => encounter.awareness === "sleeping")
      ? [...dealtGame.hand, { ...createAdrenalineCard(), id: nextCardId++ }]
      : dealtGame.hand,
    strength: dealtGame.strength
      + (blessings.includes("swordShield") ? 1 : 0)
      + (battleDeck.editions.includes("giant") ? 3 : 0)
      + wolfTalismanStrength
      + absorptionStrength,
    agility: dealtGame.agility
      + (blessings.includes("swordShield") ? 1 : 0)
      + (battleDeck.editions.includes("giant") ? 3 : 0)
      + turtleTalismanAgility,
    playerResistance: dealtGame.playerResistance + startingResistance,
    invulnerable: battleDeck.editions.includes("invincible"),
    stars: dealtGame.stars + (blessings.includes("binaryStars") ? 2 : 0) + (highlanderActive ? 1 : 0),
    energy: dealtGame.energy
      + (blessings.includes("glassCannon") ? 1 : 0)
      + (deckHighlanderActive ? 1 : 0) - enemyEnergyRecoveryPenalty(battleEnemies),
    playerPhysicalBlock: dealtGame.playerPhysicalBlock,
    playerThorns: blessings.includes("thornCoat") ? 5 : 0,
    highlanderActive,
    deckHighlanderActive,
    clairvoyanceActive: blessings.includes("clairvoyance"),
  };
  const goblin = battleEnemies.find((enemy) => enemy.variant === "goblin");
  const goblinRelic = nextGame.piles[0]?.find((card) => card.effect === "relic" && card.enemyToken);
  const relicSource = goblin && goblinRelic ? { cardId: goblinRelic.id, enemyId: goblin.id } : null;
  const defeatedByBomb = battleEnemies.every((enemy) => enemy.hp === 0);
  const battleStartState = defeatedByBomb
    ? { ...nextGame, status: "won" as const, message: "폭발 피해로 모든 적이 쓰러졌습니다." }
    : nextGame;

  return { game: battleStartState, battleEnemies, nextCardId, remainingGodsLamentCharges, defeatedByBomb, relicSource };
}
