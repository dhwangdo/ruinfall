import type { GameState } from "./battleState";
import type { Card } from "./cards";
import type { EnemyState, EnemyAction } from "./enemies";
import type { BlessingId } from "./blessingRules";
import { resolveLethalDamage } from "./blessingRules.ts";
import { statusLabel, addResistance, decayStatus } from "./statuses.ts";
import { applyPlayerAttack, chooseNextIntent, resolveEnemyHitAgainstPlayer } from "./enemies.ts";
import { enemyTemporaryStrength, spawnEnemyMinions } from "./enemyPassives.ts";
import { resolveEnemyDefeats } from "./enemyDefeatRules.ts";

/** Enemy hits, status changes, reflection, and file discards calculated without presentation effects. */
export function resolveEnemyTurn(game: GameState, {
  blessings, maxPlayerHp, oneUpUsed: alreadyUsed, randomRolls,
}: { blessings: readonly BlessingId[]; maxPlayerHp: number; oneUpUsed: boolean; randomRolls: readonly number[] }) {
  let oneUpUsed = alreadyUsed;
  let rollIndex = 0;
  const enemiesAfterBlockDecay = game.enemies.map((enemy) => ({
    ...enemy, physicalBlock: 0,
    ...(enemy.solitaireHitBonus ? { solitaireHitBonusReady: false } : {}),
  }));
  const livingEnemies = enemiesAfterBlockDecay.filter((enemy) => enemy.hp > 0);
  const toxicSlimeDamage = game.hand.filter((card) => card.effect === "slime").length * 12;
  const discarded = [
    ...game.discard,
    ...game.hand.filter(card => !card.retain),
  ];
  let retainedHand = game.hand.filter(card => card.retain);
  const pilesAfterSlime = game.piles.map((pile) => [...pile]);
  let remainingPhysicalBlock = game.playerPhysicalBlock;
  let remainingMagicBlock = game.playerMagicBlock;
  let remainingStrength = Math.max(0, game.strength - game.temporaryStrength);
  let remainingAgility = game.agility;
  let nextTurnResistanceChange = 0;
  let nextTurnAmplificationChange = 0;
  const toxicSlimeHit = resolveEnemyHitAgainstPlayer({
    damage: toxicSlimeDamage,
    damageType: "physical",
    block: remainingPhysicalBlock,
    isAttack: false,
    invulnerable: game.invulnerable,
  });
  const toxicSlimeDamageTaken = toxicSlimeHit.damageTaken;
  remainingPhysicalBlock = toxicSlimeHit.remainingBlock;
  let oneUpAvailable = blessings.includes("oneUp") && !oneUpUsed;
  const toxicSlimeLife = resolveLethalDamage(game.playerHp, toxicSlimeDamageTaken, maxPlayerHp, oneUpAvailable);
  let remainingHp = toxicSlimeLife.hp;
  if (toxicSlimeLife.usedOneUp) {
    oneUpAvailable = false;
    oneUpUsed = true;
  }
  const hpAfterToxicSlime = remainingHp;
  const physicalBlockAfterToxicSlime = remainingPhysicalBlock;
  const magicBlockAfterToxicSlime = remainingMagicBlock;
  const steps: Array<{
    enemy: EnemyState;
    action: EnemyAction;
    attack: EnemyAction["attacks"][number] | null;
    damage: number;
    hpAfter: number;
    physicalBlockAfter: number;
    magicBlockAfter: number;
    message?: string;
  }> = [];
  const actedEnemyIds = new Set<string>();
  const skippedEnemyIds = new Set<string>();
  const summoningEnemyIds = new Set<string>();
  const reflectedDamage = new Map<string, number>();
  const enemyDamageTaken = new Map<string, number>();
  const blockedHammerIds = new Set<string>();

  let nextEnemies = enemiesAfterBlockDecay;
  if (game.extraTurns === 0) {
    for (const enemy of livingEnemies) {
      if (remainingHp === 0) break;
      const action = enemy.actions[enemy.intentIndex];
      if (enemy.stunned) {
        skippedEnemyIds.add(enemy.id);
        steps.push({ enemy, action, attack: null, damage: 0, hpAfter: remainingHp,
          physicalBlockAfter: remainingPhysicalBlock, magicBlockAfter: remainingMagicBlock,
          message: "갑옷 파괴: 행동 취소" });
        continue;
      }
      actedEnemyIds.add(enemy.id);
      if (action.summon) summoningEnemyIds.add(enemy.id);
      const temporaryStrength = enemyTemporaryStrength(enemy, game.energy, game.hand.length);
      let actionDamageTaken = 0;
      for (const attack of action.attacks) {
        const resolvedAttack = enemy.nextAttackMagic
          ? { ...attack, type: "magic" as const }
          : attack;
        for (let hit = 0; hit < (attack.hits ?? 1); hit += 1) {
          if (remainingHp === 0) break;
          const matchingBlock = resolvedAttack.type === "physical" ? remainingPhysicalBlock : remainingMagicBlock;
          const resolvedHit = resolveEnemyHitAgainstPlayer({
            damage: attack.value + enemy.strength + temporaryStrength,
            damageType: resolvedAttack.type,
            block: matchingBlock,
            resistance: game.playerResistance,
            amplification: enemy.amplification,
            damageTakenMultiplier: game.damageTakenMultiplier,
            invulnerable: game.invulnerable,
            ignoreNegativeResistance: blessings.includes("vulnerabilityInsurance"),
          });
          if (game.reflectDamage > 0 && resolvedHit.blocked > 0) {
            reflectedDamage.set(enemy.id, (reflectedDamage.get(enemy.id) ?? 0) + resolvedHit.blocked * game.reflectDamage);
          }
          const damage = resolvedHit.damageTaken;
          actionDamageTaken += damage;
          if (resolvedAttack.type === "physical") remainingPhysicalBlock = resolvedHit.remainingBlock;
          else remainingMagicBlock = resolvedHit.remainingBlock;
          const life = resolveLethalDamage(remainingHp, damage, maxPlayerHp, oneUpAvailable);
          remainingHp = life.hp;
          if (life.usedOneUp) {
            oneUpAvailable = false;
            oneUpUsed = true;
          }
          if (game.playerThorns > 0 && resolvedHit.transformedDamage > 0) {
            reflectedDamage.set(enemy.id, (reflectedDamage.get(enemy.id) ?? 0) + game.playerThorns);
          }
          if (damage > 0) enemyDamageTaken.set(enemy.id, (enemyDamageTaken.get(enemy.id) ?? 0) + damage);
          steps.push({
            enemy,
            action,
            attack: resolvedAttack,
            damage,
            hpAfter: remainingHp,
            physicalBlockAfter: remainingPhysicalBlock,
            magicBlockAfter: remainingMagicBlock,
          });
        }
      }
      if (enemy.restsWhenBlocked && action.attacks.length > 0 && actionDamageTaken === 0) blockedHammerIds.add(enemy.id);
      if (action.nextTurnPlayerResistanceChange) {
        nextTurnResistanceChange += action.nextTurnPlayerResistanceChange;
        steps.push({
          enemy,
          action,
          attack: null,
          damage: 0,
          hpAfter: remainingHp,
          physicalBlockAfter: remainingPhysicalBlock,
          magicBlockAfter: remainingMagicBlock,
          message: `다음 턴 ${statusLabel("resistance", action.nextTurnPlayerResistanceChange)}`,
        });
      }
      if (action.nextTurnPlayerAmplificationChange) {
        nextTurnAmplificationChange += action.nextTurnPlayerAmplificationChange;
        steps.push({
          enemy,
          action,
          attack: null,
          damage: 0,
          hpAfter: remainingHp,
          physicalBlockAfter: remainingPhysicalBlock,
          magicBlockAfter: remainingMagicBlock,
          message: `다음 턴 ${statusLabel("amplification", action.nextTurnPlayerAmplificationChange)}`,
        });
      }
      if (action.strengthLoss || action.agilityLoss) {
        remainingStrength = Math.max(0, remainingStrength - (action.strengthLoss ?? 0));
        remainingAgility = Math.max(0, remainingAgility - (action.agilityLoss ?? 0));
        steps.push({
          enemy,
          action,
          attack: null,
          damage: 0,
          hpAfter: remainingHp,
          physicalBlockAfter: remainingPhysicalBlock,
          magicBlockAfter: remainingMagicBlock,
          message: [
            action.strengthLoss ? `힘 ${action.strengthLoss} 감소` : "",
            action.agilityLoss ? `강인함 ${action.agilityLoss} 감소` : "",
          ].filter(Boolean).join(" · "),
        });
      }
      if (action.discardCount && enemy.discardPileIndex !== undefined) {
        const pileIndex = enemy.discardPileIndex % Math.max(1, pilesAfterSlime.length);
        const pile = pilesAfterSlime[pileIndex];
        const discardedCards = pile
          ? Array.from({ length: Math.min(action.discardCount, pile.length) }, () => pile.pop())
            .filter((card): card is Card => Boolean(card))
          : [];
        if (pile && discardedCards.length > 0) {
          discarded.push(...discardedCards);
          if (pile.length > 0) pile[pile.length - 1] = { ...pile[pile.length - 1], revealed: true };
        }
        steps.push({
          enemy,
          action,
          attack: null,
          damage: 0,
          hpAfter: remainingHp,
          physicalBlockAfter: remainingPhysicalBlock,
          magicBlockAfter: remainingMagicBlock,
          message: discardedCards.length > 0
            ? `${pileIndex + 1}번 파일: ${discardedCards.length}장 버림`
            : `${pileIndex + 1}번 파일은 비어 있음`,
        });
      }
      if (action.strengthGain || action.blockGain || action.healGain || action.resistanceGain || action.amplificationGain) {
        steps.push({
          enemy,
          action,
          attack: null,
          damage: 0,
          hpAfter: remainingHp,
          physicalBlockAfter: remainingPhysicalBlock,
          magicBlockAfter: remainingMagicBlock,
        });
      }
    }

    nextEnemies = enemiesAfterBlockDecay.map((enemy) => {
      if (enemy.hp === 0) return enemy;
      const status = { resistance: decayStatus(enemy.resistance), amplification: decayStatus(enemy.amplification) };
      if (!actedEnemyIds.has(enemy.id)) return { ...enemy, ...status };
      const action = enemy.actions[enemy.intentIndex];
      const nextIntentIndex = enemy.restsWhenBlocked && action.attacks.length > 0
        ? blockedHammerIds.has(enemy.id) ? 1 : 0
        : chooseNextIntent(enemy.actions, enemy.intentIndex, () => randomRolls[rollIndex++] ?? 0);
      return {
        ...enemy,
        resistance: status.resistance + (action.resistanceGain ?? 0),
        amplification: status.amplification + (action.amplificationGain ?? 0),
        hp: action.selfDestruct ? 0 : Math.min(enemy.maxHp, enemy.hp + (action.healGain ?? 0)),
        strength: enemy.strength + (action.strengthGain ?? 0) + (enemy.turnEndStrengthGain ?? 0),
        ...(enemy.powder !== undefined ? { powder: enemy.powder + (action.powderGain ?? 0) } : {}),
        physicalBlock: enemy.physicalBlock + (action.blockGain ?? 0),
        boon: (enemy.boon ?? 0) + (action.boonGain ?? 0),
        intentIndex: nextIntentIndex,
        discardPileIndex: undefined,
        firstActionCompleted: true,
        quicknessReady: false,
        nextAttackMagic: action.nextAttackMagic
          ? true
          : enemy.nextAttackMagic && action.attacks.length === 0,
      };
    });
    nextEnemies = nextEnemies.map((enemy) => {
      const allyBlock = enemiesAfterBlockDecay.reduce((total, source) => total
        + (source.id !== enemy.id && source.hp > 0 && actedEnemyIds.has(source.id)
          ? source.actions[source.intentIndex].allyBlockGain ?? 0 : 0), 0);
      if (allyBlock > 0 && enemy.hp > 0) enemy = { ...enemy, physicalBlock: enemy.physicalBlock + allyBlock };
      if (skippedEnemyIds.has(enemy.id)) return { ...enemy, stunned: false };
      const reflected = reflectedDamage.get(enemy.id) ?? 0;
      const effectiveReflected = enemy.isBoss && blessings.includes("bossSlayer") ? reflected * 2 : reflected;
      return effectiveReflected > 0 ? applyPlayerAttack(enemy, effectiveReflected, 1, undefined, { isAttack: false }) : enemy;
    });
    if (remainingHp > 0) nextEnemies = spawnEnemyMinions(nextEnemies, summoningEnemyIds);

  }

  const deaths = resolveEnemyDefeats({ ...game, enemies: nextEnemies, hand: retainedHand,
    playerHp: remainingHp, playerPhysicalBlock: remainingPhysicalBlock }, { blessings, maxPlayerHp, oneUpUsed });
  nextEnemies = deaths.state.enemies;
  retainedHand = deaths.state.hand;
  remainingHp = deaths.state.playerHp;
  remainingPhysicalBlock = deaths.state.playerPhysicalBlock;
  oneUpUsed = deaths.oneUpUsed;

  return {
    enemiesAfterBlockDecay,
    toxicSlimeDamage,
    discarded,
    retainedHand,
    pilesAfterSlime,
    remainingPhysicalBlock,
    remainingMagicBlock,
    nextPlayerResistance: game.extraTurns > 0 ? game.playerResistance
      : addResistance(decayStatus(game.playerResistance), nextTurnResistanceChange, blessings.includes("glassCannon")),
    nextPlayerAmplification: game.extraTurns > 0 ? game.playerAmplification
      : decayStatus(game.playerAmplification) + nextTurnAmplificationChange,
    remainingStrength,
    remainingAgility,
    toxicSlimeDamageTaken,
    hpAfterToxicSlime,
    physicalBlockAfterToxicSlime,
    magicBlockAfterToxicSlime,
    remainingHp,
    steps,
    enemyDamageTaken,
    nextEnemies,
    oneUpUsed,
  };
}
