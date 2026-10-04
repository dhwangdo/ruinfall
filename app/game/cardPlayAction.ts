import type { Dispatch, RefObject, SetStateAction } from "react";
import type { BlessingId } from "./blessingRules";
import type { GameState } from "./battleState";
import type { EnemyState } from "./enemies";
import type { Card } from "./cards";
import type { Phase } from "./battleUiTypes";
import { UNPLAYABLE_CARD_EFFECTS, cardGivesMagicDefense, cardGivesPhysicalDefense, createRadianceCard, isAttackCard } from "./cards";
import { playerAttackThornHits, applyPlayerAttack, resolveEnemyHitAgainstPlayer } from "./enemies";
import { canPayEnergyCost, calculateCardDamage } from "./combatEconomy";
import { IRON_WALL_RESISTANCE, cardEnergyCost } from "./cardEffects";
import { calculateDefenseGain } from "./defenseRules";
import { addResistance, addVulnerability } from "./statuses";
import { resolveLethalDamage } from "./blessingRules";
import { buildPiles, drawFromFirstPile, drawFromPiles, drawRandomFromPiles, prepareDeckForPiles } from "./battleState";
import { DEFENSE_LABEL } from "../components/CardFace";

type ResolvePlayedCardContext = {
  setGame: Dispatch<SetStateAction<GameState>>;
  game: GameState;
  phase: Phase;
  blessings: BlessingId[];
  setAnimatedEnemyHp: Dispatch<SetStateAction<Record<string, number>>>;
  later: (callback: () => void, delay: number) => number;
  showEnemyPopup: (enemyId: string, text: string, kind?: "damage" | "buff") => void;
  setDyingEnemyIds: Dispatch<SetStateAction<Set<string>>>;
  setPhase: Dispatch<SetStateAction<Phase>>;
  grantBattleReward: (regionNumber: number) => void;
  battleRewardRegionRef: RefObject<number>;
  maxPlayerHp: number;
  oneUpUsedRef: RefObject<boolean>;
  setOneUpUsed: Dispatch<SetStateAction<boolean>>;
  captureDrawOrigins: (cards: Card[]) => number;
  nextCardIdRef: RefObject<number>;
  lowestHealthEnemy: (enemies: EnemyState[]) => EnemyState | undefined;
  isStarterOrBasicCard: (card: Pick<Card, "rarity">) => boolean;
};

export function createResolvePlayedCard(context: ResolvePlayedCardContext) {
  const {
    setGame,
    game,
    phase,
    blessings,
    setAnimatedEnemyHp,
    later,
    showEnemyPopup,
    setDyingEnemyIds,
    setPhase,
    grantBattleReward,
    battleRewardRegionRef,
    maxPlayerHp,
    oneUpUsedRef,
    setOneUpUsed,
    captureDrawOrigins,
    nextCardIdRef,
    lowestHealthEnemy,
    isStarterOrBasicCard,
  } = context;
  return (card: Card, targetEnemyId?: string) => {
    if (UNPLAYABLE_CARD_EFFECTS.has(card.effect)) {
      setGame((current) => ({ ...current, message: `${card.name}은(는) 사용할 수 없습니다. 파일 위로 옮겨 길을 만들어 보세요.` }));
      return;
    }
    const isRewardAttack = isAttackCard(card);
    const isRewardAttackAll = card.effect === "ironRampage" || card.effect === "shockwave" || card.effect === "sweep" || card.effect === "odinSpear";
    const rewardTarget = card.effect === "magicStrike"
      ? lowestHealthEnemy(game.enemies)
      : card.effect === "meteor" || card.effect === "hydra"
        ? game.enemies.find((enemy) => enemy.hp > 0)
        : game.enemies.find((enemy) => enemy.id === targetEnemyId);
    const randomTargetRolls = Array.from({ length: Math.max(18, card.effect === "meteor" ? game.stars * 2 : game.starsSpent * 2) }, () => Math.random());
    let resolvedEnemiesAfterAttack: EnemyState[] | null = null;
    let waitForLethalHitPopups = false;
    const thornHits: number[] = [];
    const canResolveRewardAttack = isRewardAttack
      && game.status === "playing"
      && phase === "playing"
      && game.pendingDraws === 0
      && game.pendingPileDrawCount === 0
      && game.pendingDiscards === 0
      && game.pendingResearchDraw === null
      && !game.pendingSweep
      && canPayEnergyCost(
        game.energy,
        cardEnergyCost(card, game.activeRuleCards.filter((ruleCard) => ruleCard.effect === "lawResearch").length, game.forgeCount) ?? Infinity,
        game.activeRuleCards.filter((ruleCard) => ruleCard.effect === "economicsResearch").length,
      )
      && (isRewardAttackAll || Boolean(rewardTarget && rewardTarget.hp > 0));
    if (canResolveRewardAttack) {
      const repetitions = (
        card.effect === "hydra" ? 9
          : card.effect === "meteor" ? game.stars
            : card.effect === "fourHit" ? 5
              : card.effect === "doubleHit" && card.forged ? 2 : 1
      ) * (game.doubleNextAttack ? 2 : 1);
      const combatManualBonus = game.hand
        .filter((item) => item.effect === "combatManual")
        .reduce((total, item) => total + item.value, 0)
        + (blessings.includes("backToBasics") && isStarterOrBasicCard(card) ? 4 : 0);
      const damage = calculateCardDamage(
        card,
        game.strength,
        combatManualBonus,
        game.radiancePlayedThisTurn,
      );
      let enemiesAfterAttack = game.enemies;
      const hitPopups: Array<{ enemyId: string; damage: number; remainingHp: number }> = [];
      const hitEnemy = (enemyId: string) => {
        enemiesAfterAttack = enemiesAfterAttack.map((enemy) => {
          if (enemy.id !== enemyId) return enemy;
          const effectiveDamage = enemy.isBoss && blessings.includes("bossSlayer") ? damage * 2 : damage;
          thornHits.push(...playerAttackThornHits(enemy, effectiveDamage, 1));
          // 플레이어 공격은 모두 무속성이다. 적의 중립 방어가 모든 공격을 막는다.
          const nextEnemy = applyPlayerAttack(enemy, effectiveDamage, 1);
          const dealtDamage = enemy.hp - nextEnemy.hp;
          if (dealtDamage > 0) hitPopups.push({ enemyId, damage: dealtDamage, remainingHp: nextEnemy.hp });
          return nextEnemy;
        });
      };
      if (card.effect === "hydra" || card.effect === "meteor") {
        for (let hit = 0; hit < repetitions; hit += 1) {
          const living = enemiesAfterAttack.filter((enemy) => enemy.hp > 0);
          if (living.length === 0) break;
          const target = living[Math.floor(randomTargetRolls[hit] * living.length)];
          hitEnemy(target.id);
        }
      } else if (isRewardAttackAll) {
        game.enemies.filter((enemy) => enemy.hp > 0).forEach((enemy) => {
          for (let hit = 0; hit < repetitions; hit += 1) hitEnemy(enemy.id);
        });
      } else if (rewardTarget) {
        for (let hit = 0; hit < repetitions; hit += 1) hitEnemy(rewardTarget.id);
      } else {
        enemiesAfterAttack = game.enemies;
      }
      resolvedEnemiesAfterAttack = enemiesAfterAttack;
      if (hitPopups.length > 0) {
        setAnimatedEnemyHp((current) => {
          const next = { ...current };
          hitPopups.forEach(({ enemyId }) => {
            if (next[enemyId] !== undefined) return;
            const enemyBeforeHit = game.enemies.find((enemy) => enemy.id === enemyId);
            if (enemyBeforeHit) next[enemyId] = enemyBeforeHit.hp;
          });
          return next;
        });
      }
      hitPopups.forEach((popup, index) => {
        later(() => {
          showEnemyPopup(popup.enemyId, `-${popup.damage}`);
          setAnimatedEnemyHp((current) => ({ ...current, [popup.enemyId]: popup.remainingHp }));
        }, index * 220);
      });
      const lastPopupIndexByEnemy = new Map<string, number>();
      hitPopups.forEach((popup, index) => lastPopupIndexByEnemy.set(popup.enemyId, index));
      lastPopupIndexByEnemy.forEach((lastPopupIndex, enemyId) => {
        later(() => setAnimatedEnemyHp((current) => {
          const next = { ...current };
          delete next[enemyId];
          return next;
        }), lastPopupIndex * 220 + 240);
      });
      const newlyDefeatedEnemyIds = game.enemies
        .filter((enemy) => enemy.hp > 0 && enemiesAfterAttack.some((nextEnemy) => nextEnemy.id === enemy.id && nextEnemy.hp === 0))
        .map((enemy) => enemy.id);
      if (newlyDefeatedEnemyIds.length > 0) {
        setDyingEnemyIds((current) => new Set([...current, ...newlyDefeatedEnemyIds]));
        newlyDefeatedEnemyIds.forEach((enemyId) => {
          const lastPopupIndex = hitPopups.reduce((last, popup, index) => popup.enemyId === enemyId ? index : last, 0);
          later(() => setDyingEnemyIds((current) => {
            const next = new Set(current);
            next.delete(enemyId);
            return next;
          }), lastPopupIndex * 220 + 500);
        });
      }
      if (enemiesAfterAttack.every((enemy) => enemy.hp === 0)) {
        waitForLethalHitPopups = true;
        setPhase("resolving");
        later(() => {
          setGame((current) => current.status !== "playing" ? current : {
            ...current,
            status: "won",
            message: "승리! 모든 적을 쓰러뜨렸습니다.",
          });
          setPhase("playing");
          grantBattleReward(battleRewardRegionRef.current);
        }, Math.max(500, (hitPopups.length - 1) * 220 + 500));
      }
    }

    setGame((current) => {
      if (
        current.status !== "playing" ||
        current.pendingDraws > 0 ||
        current.pendingPileDrawCount > 0 ||
        current.pendingDiscards > 0 ||
        current.pendingResearchDraw !== null ||
        current.pendingSweep ||
        phase !== "playing"
      ) return current;
      const energyCost = cardEnergyCost(
        card,
        current.activeRuleCards.filter((ruleCard) => ruleCard.effect === "lawResearch").length,
        current.forgeCount,
      );
      if (energyCost === undefined) {
        return { ...current, message: `${card.name}은(는) 에너지 비용이 없는 카드입니다.` };
      }
      const economicsResearchCount = current.activeRuleCards.filter((ruleCard) => ruleCard.effect === "economicsResearch").length;
      if (!canPayEnergyCost(current.energy, energyCost, economicsResearchCount)) {
        return { ...current, message: `${card.name}: 에너지가 ${energyCost} 필요합니다.` };
      }
      if (card.effect === "endStart" && current.piles.some((pile) => pile.length > 0)) {
        return { ...current, message: "끝의 시작은 모든 파일이 비어 있을 때만 사용할 수 있습니다." };
      }
      if (card.effect === "supernova" && current.stars < 3) {
        return { ...current, message: "초신성: ★★★가 필요합니다." };
      }
      const isIronRampage = card.effect === "ironRampage";
      const isShockwave = card.effect === "shockwave";
      const isMagicStrike = card.effect === "magicStrike";
      const isSweepAttack = card.effect === "sweep";
      const isMeteor = card.effect === "meteor";
      const isHydra = card.effect === "hydra";
      const isDoubleHit = card.effect === "doubleHit";
      const isRadiance = card.effect === "radiance";
      const isSuppression = card.effect === "suppression";
      const isStarArk = card.effect === "starArk";
      const isOdinSpear = card.effect === "odinSpear";
      const isIronWall = card.effect === "ironWall";
      const isPlateArmorDefense = card.effect === "plateArmorDefense";
      const isMassDeal = card.effect === "massDeal";
      const isSturdyStance = card.effect === "sturdyStance";
      const isDamageCard = isAttackCard(card);
      const isBlockCard = cardGivesPhysicalDefense(card) || cardGivesMagicDefense(card);
      const isAttackAll = isIronRampage || isShockwave || isSweepAttack || isOdinSpear;
      const isWave = card.effect === "ironWave" || card.effect === "waterWave";
      if (isDamageCard && !isAttackAll && !isMagicStrike && !isMeteor && !isHydra && !targetEnemyId) return current;
      const targetEnemy = isMagicStrike
        ? lowestHealthEnemy(current.enemies)
        : isMeteor || isHydra
          ? current.enemies.filter((enemy) => enemy.hp > 0)[Math.floor(Math.random() * current.enemies.filter((enemy) => enemy.hp > 0).length)]
        : current.enemies.find((enemy) => enemy.id === targetEnemyId);
      if (isDamageCard && !isAttackAll && (!targetEnemy || targetEnemy.hp === 0)) return current;
      const meteorStars = isMeteor ? current.stars : 0;
      const repetitions = (isHydra ? 9 : isMeteor ? meteorStars : card.effect === "fourHit" ? 5 : isDoubleHit && card.forged ? 2 : 1) * (isDamageCard && current.doubleNextAttack ? 2 : 1);
      const combatManualBonus = current.hand
        .filter((item) => item.effect === "combatManual")
        .reduce((total, item) => total + item.value, 0)
        + (blessings.includes("backToBasics") && isStarterOrBasicCard(card) ? 4 : 0);
      const grimoireBonus = current.hand.filter((item) => item.effect === "grimoire").length;
      const damagePerHit = isDamageCard
        ? calculateCardDamage(card, current.strength, combatManualBonus, current.radiancePlayedThisTurn)
        : 0;
      const damage = damagePerHit * repetitions;
      const thornTargets = isDamageCard
        ? isAttackAll
          ? current.enemies.filter((enemy) => enemy.hp > 0)
          : targetEnemy && targetEnemy.hp > 0 ? [targetEnemy] : []
        : [];
      const normalThornHits = resolvedEnemiesAfterAttack === null && damagePerHit > 0
        ? thornTargets.flatMap((enemy) => playerAttackThornHits(
          enemy,
          enemy.isBoss && blessings.includes("bossSlayer") ? damagePerHit * 2 : damagePerHit,
          repetitions,
        ))
        : [];
      const incomingThornHits = resolvedEnemiesAfterAttack === null ? normalThornHits : thornHits;
      const nextEnemies = isDamageCard && resolvedEnemiesAfterAttack
        ? resolvedEnemiesAfterAttack
        : isDamageCard
        ? current.enemies.map((enemy) => isAttackAll || enemy.id === targetEnemy?.id
          ? applyPlayerAttack(
            enemy,
            enemy.isBoss && blessings.includes("bossSlayer") ? damagePerHit * 2 : damagePerHit,
            repetitions,
          )
          : enemy)
        : card.effect === "relic"
          ? current.enemies.map((enemy) => enemy.variant === "goblin"
            ? { ...enemy, strength: enemy.strength - card.value }
            : enemy)
          : current.enemies;
      const suppressionDamageDealt = isSuppression && targetEnemy
        ? Math.max(0, targetEnemy.hp - (nextEnemies.find((enemy) => enemy.id === targetEnemy.id)?.hp ?? targetEnemy.hp))
        : 0;
      const blockGained = calculateDefenseGain(card, {
        agility: current.agility + combatManualBonus,
        baseValue: isSuppression ? suppressionDamageDealt : undefined,
        defenseMultiplier: current.defenseMultiplier,
        repetitions,
      });
      const rawNextPhysicalBlock = cardGivesPhysicalDefense(card)
        ? current.playerPhysicalBlock + blockGained
        : current.playerPhysicalBlock;
      const rawNextMagicBlock = cardGivesMagicDefense(card)
        ? current.playerMagicBlock + blockGained
        : current.playerMagicBlock;
      let thornsPhysicalBlock = rawNextPhysicalBlock;
      let thornsDamageTaken = 0;
      incomingThornHits.forEach((rawDamage) => {
        const resolvedHit = resolveEnemyHitAgainstPlayer({
          damage: rawDamage,
          damageType: "physical",
          block: thornsPhysicalBlock,
          physicalResistance: current.playerPhysicalResistance,
          magicResistance: current.playerMagicResistance,
          vulnerability: current.playerPhysicalVulnerability,
          damageTakenMultiplier: current.damageTakenMultiplier,
          invulnerable: current.invulnerable,
          vulnerabilityMultiplier: blessings.includes("vulnerabilityInsurance") ? 1.5 : 2,
        });
        thornsPhysicalBlock = resolvedHit.remainingBlock;
        thornsDamageTaken += resolvedHit.damageTaken;
      });
      const nextPhysicalBlock = card.effect === "mirrorImage" ? rawNextMagicBlock : thornsPhysicalBlock;
      const nextMagicBlock = card.effect === "mirrorImage" ? rawNextPhysicalBlock : rawNextMagicBlock;
      const nextPhysicalStatus = card.effect === "berserk"
          ? addVulnerability({ resistance: current.playerPhysicalResistance, vulnerability: current.playerPhysicalVulnerability }, 2)
          : !blessings.includes("glassCannon") && isPlateArmorDefense && card.forged
            ? addResistance({ resistance: current.playerPhysicalResistance, vulnerability: current.playerPhysicalVulnerability }, 1)
          : !blessings.includes("glassCannon") && isIronWall
            ? addResistance({ resistance: current.playerPhysicalResistance, vulnerability: current.playerPhysicalVulnerability }, IRON_WALL_RESISTANCE)
            : { resistance: current.playerPhysicalResistance, vulnerability: current.playerPhysicalVulnerability };
      const nextMagicStatus = !blessings.includes("glassCannon") && card.effect === "blessing"
          ? addResistance({ resistance: current.playerMagicResistance, vulnerability: current.playerMagicVulnerability }, card.forged ? 2 : 1)
        : { resistance: current.playerMagicResistance, vulnerability: current.playerMagicVulnerability };
      const won = nextEnemies.every((enemy) => enemy.hp === 0);
      const thornLife = resolveLethalDamage(
        current.playerHp,
        thornsDamageTaken,
        maxPlayerHp,
        blessings.includes("oneUp") && !oneUpUsedRef.current,
      );
      if (thornLife.usedOneUp) {
        oneUpUsedRef.current = true;
        setOneUpUsed(true);
      }
      const selfDamageLife = resolveLethalDamage(
        thornLife.hp,
        card.effect === "adrenaline" ? 2 : 0,
        maxPlayerHp,
        blessings.includes("oneUp") && !oneUpUsedRef.current,
      );
      if (selfDamageLife.usedOneUp) {
        oneUpUsedRef.current = true;
        setOneUpUsed(true);
      }
      const nextPlayerHp = card.effect === "ophiuchus"
        ? Math.min(maxPlayerHp, current.playerHp + 5)
        : selfDamageLife.hp;
      let grimoireMagicBlock = nextMagicBlock;
      let grimoireDamageTaken = 0;
      let resolvedPlayerHp = nextPlayerHp;
      for (let hit = 0; hit < grimoireBonus; hit += 1) {
        const resolvedHit = resolveEnemyHitAgainstPlayer({
          damage: 1,
          damageType: "magic",
          block: grimoireMagicBlock,
          physicalResistance: nextPhysicalStatus.resistance,
          magicResistance: nextMagicStatus.resistance,
          vulnerability: nextMagicStatus.vulnerability,
          damageTakenMultiplier: current.damageTakenMultiplier,
          invulnerable: current.invulnerable,
          vulnerabilityMultiplier: blessings.includes("vulnerabilityInsurance") ? 1.5 : 2,
        });
        grimoireMagicBlock = resolvedHit.remainingBlock;
        grimoireDamageTaken += resolvedHit.damageTaken;
        const grimoireLife = resolveLethalDamage(
          resolvedPlayerHp,
          resolvedHit.damageTaken,
          maxPlayerHp,
          blessings.includes("oneUp") && !oneUpUsedRef.current,
        );
        resolvedPlayerHp = grimoireLife.hp;
        if (grimoireLife.usedOneUp) {
          oneUpUsedRef.current = true;
          setOneUpUsed(true);
        }
      }
      const canDraw = current.piles.some((pile) => pile.length > 0);
      const drawEachPileResult = card.effect === "drawEachPile" || (card.effect === "fileDraw" && card.forged)
        ? drawFromPiles(current.piles)
        : null;
      const availableCardCount = current.piles.reduce((total, pile) => total + pile.length, 0);
      const pommelDrawResult = card.effect === "pommel"
        ? drawFromFirstPile(current.piles)
        : null;
      const dashRandomCount = card.effect === "dash" && canDraw
        ? card.forged ? 3 : 2
        : 0;
      const dashRandomResult = dashRandomCount > 0
        ? drawRandomFromPiles(current.piles, dashRandomCount)
        : null;
      const pilesAfterCardDraw = drawEachPileResult?.piles
        ?? pommelDrawResult?.piles
        ?? dashRandomResult?.piles
        ?? current.piles;
      const massDealPiles = isMassDeal
        ? [...current.piles.map((pile) => [...pile]), []]
        : pilesAfterCardDraw;
      const automaticDrawnCards = drawEachPileResult?.hand
        ?? pommelDrawResult?.hand
        ?? dashRandomResult?.hand
        ?? [];
      if (automaticDrawnCards.length > 0 && captureDrawOrigins(automaticDrawnCards) > 0) setPhase("drawing");
      const pendingPileDrawCount = card.effect === "fileDraw" && !card.forged && canDraw
          ? Math.min(card.draw, availableCardCount)
          : 0;
      const pendingDashRandomDraws = 0;
      const drawsAdded = !won && availableCardCount > 0 && !drawEachPileResult && pendingPileDrawCount === 0
        ? Math.min(card.draw * repetitions, availableCardCount)
        : 0;
      const remainingHand = current.hand.filter((item) => item.id !== card.id);
      const radianceCount = card.effect === "lightCluster" || card.effect === "nebula"
        ? 1
        : card.effect === "largePrism" ? 3 : 0;
      const generatedRadiances = Array.from(
        { length: radianceCount },
        () => createRadianceCard(nextCardIdRef.current++),
      );
      const pruningAutoDiscard = card.effect === "pruning" && remainingHand.length <= 2
        ? remainingHand
        : [];
      const handAfterPruning = pruningAutoDiscard.length > 0
        ? remainingHand.filter((item) => !pruningAutoDiscard.some((discarded) => discarded.id === item.id))
        : remainingHand;
      const pendingDiscards = card.effect === "pruning"
        ? remainingHand.length <= 2 ? 0 : 2
        : card.effect === "prepare"
        ? (canDraw || remainingHand.length > 0 ? 1 : 0)
        : card.effect === "focus" && remainingHand.length > 0 ? 1 : 0;
      const pendingSweep = card.effect === "boomerang" && canDraw;
      const pendingPileOperation = card.effect === "boomerang"
        ? card.name === "정리 타격" ? "discardTop" as const : "moveTopToBottom" as const
        : null;
      const action = (() => {
        if (isShockwave || isSweepAttack) return `${card.name}: 적 전체 공격`;
        if (isOdinSpear) return `오딘의 창: 적 전체에게 피해 ${damage} · 방어 ${blockGained}`;
        if (isMeteor) return `${card.name}: ★를 모두 소모해 무작위 공격`;
        if (isHydra) return `${card.name}: 무작위 공격 ${repetitions}회`;
        if (isMagicStrike) return "마법 타격 발동";
        if (isIronRampage) return `적 전체에게 피해 ${damage} · 방어 ${blockGained}${repetitions > 1 ? " (2회 발동)" : ""}`;
        if (isWave) return `${targetEnemy?.name}에게 피해 ${damage} · ${DEFENSE_LABEL[card.damageType]} ${blockGained}${repetitions > 1 ? " (2회 발동)" : ""}`;
        if (isSuppression) return `${targetEnemy?.name}에게 피해 ${damage} · 방어 ${blockGained} 획득`;
        if (isStarArk) return `방어 ${blockGained} · 마법 방어 ${blockGained} · ★ 획득`;
        if (isMassDeal) return "대분배: 빈 파일을 추가";
        if (isSturdyStance) return "견고한 태세: 턴 종료 시 방어 절반 보존";
        if (card.effect === "astronomyResearch") return "천문학 연구: ★★로 파일 드로우";
        if (card.effect === "necromancyResearch") return "강령학 연구: ★★★로 버린 카드 드로우";
        if (card.effect === "metallurgyResearch") return "금속학 연구: 재련된 카드 가져옴";
        if (card.effect === "economicsResearch") return "경제학 연구: 에너지 하한 -3 추가";
        if (card.effect === "opticsResearch") return "광학 연구: 턴 시작마다 광채 생성";
        if (card.effect === "lightCluster") return "빛무리: 광채 1장 획득";
        if (card.effect === "largePrism") return "대형 프리즘: 광채 3장 획득";
        if (card.effect === "nebula") return "성운: 광채 1장 획득 · ★★ 획득";
        if (card.effect === "lightTravelTime") return `광행시간: 다다음 턴 시작 시 광채 ${card.value}장 획득`;
        if (card.effect === "radiance") return `${targetEnemy?.name}에게 광채 피해 ${damage}`;
        if (card.effect === "lawResearch") return "법학 연구: 룰 카드 비용 감소";
        if (card.effect === "mirrorImage") return "거울상: 방어와 마법 방어 교환";
        if (card.effect === "blessing") return `가호: 마법 저항 ${card.forged ? 2 : 1} 획득`;
        if (isPlateArmorDefense) return `방어 ${blockGained} 획득${card.forged ? " · 물리 저항 1 획득" : ""}`;
        if (isIronWall) return `철벽: 물리 저항 ${IRON_WALL_RESISTANCE} 획득`;
        if (card.effect === "silverSword") return `${targetEnemy?.name}에게 피해 ${damage} · 마법 방어 ${blockGained} 획득`;
        if (card.effect === "fourHit") return `${targetEnemy?.name}에게 총 피해 ${damage} (${repetitions}회 공격)`;
        if (card.kind === "strike") return `${targetEnemy?.name}에게 피해 ${damage}${repetitions > 1 ? " (2회 발동)" : ""}`;
        if (isBlockCard) return `${DEFENSE_LABEL[card.damageType]} ${blockGained} 획득`;
        if (card.effect === "battlePlan") return `★ ${card.value}개 획득 · 드로우 ${card.draw}`;
        if (card.effect === "prepare") return canDraw ? "드로우할 파일을 선택하세요." : "버릴 카드를 선택하세요.";
        if (card.effect === "focus") return "에너지를 1 얻습니다 · 버릴 카드를 선택하세요.";
        if (card.effect === "pruning") return remainingHand.length <= 2
          ? `가지치기: 카드 ${pruningAutoDiscard.length}장 버림 · 에너지 2 획득`
          : "가지치기: 버릴 카드 2장을 선택하세요.";
        if (card.effect === "adrenaline") return `체력 2 감소 · 에너지 ${card.value} 획득 · 카드 ${card.draw}장 드로우`;
        if (card.effect === "sweep") return canDraw ? "가져올 파일을 선택하세요." : "가져올 카드가 없습니다.";
        if (card.effect === "drawEachPile") return `모든 파일에서 ${drawEachPileResult?.hand.length ?? 0}장 뽑음`;
        if (card.effect === "dash") return `질주: 무작위 파일에서 ${dashRandomResult?.hand.length ?? 0}장 뽑음`;
        if (card.effect === "berserk") return "에너지를 2 얻습니다 · 물리 취약 2 획득";
        if (card.effect === "transcend") return "이번 턴 피해 면역 · 힘 5 획득";
        if (card.effect === "rapidFire") return "다음 공격 카드가 2회 발동";
        if (card.effect === "ventilate") return "환기: 에너지 획득";
        if (card.effect === "fileDraw") return card.forged ? "모든 파일에서 1장씩 뽑음" : "드로우할 파일을 선택하세요.";
        if (card.effect === "starGuard") return "별의 장막: 방어와 ★ 획득";
        if (card.effect === "charge") return "충전: 에너지 획득";
        if (card.effect === "plateArmor") return `낡은 노심: 에너지 ${card.forged ? 3 : 1} 획득`;
        if (card.effect === "warmUp") return "준비 운동: 이번 턴 힘 획득";
        if (card.effect === "doubleHit") return `청동 철퇴: ${card.forged ? 2 : 1}회 공격`;
        if (card.effect === "starlight") return "별빛: ★ 획득";
        if (card.effect === "augment") return "증강: 힘과 강인함 획득";
        if (card.effect === "relic") return "유물: 도깨비의 힘 -4";
        if (card.effect === "supernova") return "★★★를 잃습니다 · 에너지를 3 얻습니다";
        return card.name;
      })();
      const drawMessage = card.draw > 0
        ? canDraw
          ? " · 드로우할 파일을 선택하세요."
          : " · 드로우할 카드가 없습니다."
        : "";
      return {
        ...current,
        hand: [...handAfterPruning, ...(automaticDrawnCards ?? []), ...generatedRadiances],
        // 강화는 사용 후에도 다음 셔플 전까지 유지된다. 셔플 때 prepareDeckForPiles가 해제한다.
        discard: card.exhaust || card.token
          ? current.discard
          : [...current.discard, card, ...pruningAutoDiscard],
        removedFromReshuffleIds: [...new Set([
          ...current.removedFromReshuffleIds,
          ...(card.exhaust ? [card.id] : []),
        ])],
        energy: current.energy - energyCost + (card.effect === "aries" ? 5 : card.effect === "berserk" ? 2 : card.effect === "plateArmor" ? (card.forged ? 3 : 1) : card.effect === "focus" || card.effect === "adrenaline" || card.effect === "pruning" || card.effect === "charge" || card.effect === "endStart" || card.effect === "supernova" ? card.value : card.effect === "flood" ? 2 : card.effect === "ventilate" ? card.value : 0),
        radiancePlayedThisTurn: current.radiancePlayedThisTurn + (isRadiance ? 1 : 0),
        stars: current.stars + (
          card.effect === "battlePlan"
              ? card.value
            : card.effect === "rulerCompass"
              ? repetitions
              : card.effect === "starlight"
                ? card.value
            : card.effect === "nebula"
              ? 2
            : card.effect === "starGuard"
                ? 1
              : card.effect === "starArk"
                ? 1
                : card.effect === "superStrategist"
                  ? card.value
                  : card.effect === "aries"
                    ? 5
              : card.effect === "flood"
                    ? 2
              : 0
        ) + grimoireBonus - (card.effect === "supernova" ? 3 : 0) - meteorStars,
        pendingDraws: drawsAdded,
        pendingPileDrawCount,
        pendingDashRandomDraws,
        pendingRadiance: card.effect === "lightTravelTime"
          ? [...current.pendingRadiance, { turns: 2, count: card.value }]
          : current.pendingRadiance,
        pendingDiscards,
        pendingSweep,
        pendingPileOperation,
        enemies: nextEnemies,
        playerPhysicalBlock: nextPhysicalBlock,
        playerMagicBlock: grimoireMagicBlock,
        playerPhysicalResistance: nextPhysicalStatus.resistance,
        playerPhysicalVulnerability: nextPhysicalStatus.vulnerability,
        playerMagicResistance: nextMagicStatus.resistance,
        playerMagicVulnerability: nextMagicStatus.vulnerability,
        strength: current.strength + (card.effect === "orion" ? 10 : card.effect === "warmUp" ? card.value + 1 : card.effect === "augment" || card.effect === "weaponSharpen" ? card.value : 0),
        temporaryStrength: current.temporaryStrength + (card.effect === "warmUp" ? card.value : 0),
        agility: current.agility + (card.effect === "augment" || card.effect === "armorSharpen" ? card.value : 0),
        piles: massDealPiles,
        reflectDamage: card.effect === "counter" ? 1 : current.reflectDamage,
        defenseMultiplier: current.defenseMultiplier,
        evenDealOnReshuffle: current.evenDealOnReshuffle || isMassDeal,
        preserveDefenseOnTurnEnd: current.preserveDefenseOnTurnEnd || isSturdyStance,
        activeRuleCards: card.rule
          ? [...current.activeRuleCards, { ...card }]
          : current.activeRuleCards,
        damageTakenMultiplier: current.damageTakenMultiplier,
        invulnerable: current.invulnerable,
        extraTurns: current.extraTurns + (card.effect === "horologium" ? 1 : 0),
        playerHp: resolvedPlayerHp,
        doubleNextAttack: card.effect === "rapidFire"
          ? true
          : isDamageCard
            ? false
            : current.doubleNextAttack,
        status: resolvedPlayerHp === 0 ? "lost" : won && !waitForLethalHitPopups ? "won" : current.status,
        message: resolvedPlayerHp === 0
          ? card.effect === "adrenaline" && selfDamageLife.hp === 0
            ? "아드레날린의 대가로 쓰러졌습니다."
            : grimoireDamageTaken > 0 && nextPlayerHp > 0
              ? "마도서의 마법 피해로 쓰러졌습니다."
              : "가시에 찔려 쓰러졌습니다."
          : won && !waitForLethalHitPopups
            ? "승리! 모든 적을 쓰러뜨렸습니다."
            : `${action}${thornsDamageTaken > 0 ? ` · 가시 피해 ${thornsDamageTaken}` : ""}${grimoireDamageTaken > 0 ? ` · 마도서 마법 피해 ${grimoireDamageTaken}` : ""}${card.effect === "prepare" || card.effect === "focus" ? "" : drawMessage}`,
      };
    });
  };
}
