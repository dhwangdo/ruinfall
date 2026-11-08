import type { GameState } from "./battleState";
import type { BlessingId } from "./blessingRules";
import type { Card } from "./cards";
import type { Phase } from "./battleUiTypes";
import {
  RARE_CARD_POOL, UNPLAYABLE_CARD_EFFECTS, cardGivesMagicDefense, cardGivesPhysicalDefense,
  createRadianceCard, isAttackCard, canTargetEnemy
} from "./cards.ts";
import { resolveEnemyHitAgainstPlayer } from "./enemies.ts";
import { canPayEnergyCost } from "./combatEconomy.ts";
import { cardEnergyCost } from "./cardEffects.ts";
import { DEFENSE_LABEL, calculateDefenseGain } from "./defenseRules.ts";
import { addResistance } from "./statuses.ts";
import { resolveLethalDamage } from "./blessingRules.ts";
import { drawFromFirstPile, drawFromPiles, drawRandomFromPiles } from "./battleState.ts";
import { resolveCardAttack, type CardHit } from "./cardAttackResolution.ts";
import { blockedPileIndexes } from "./enemyPassives.ts";
import { resolveEnemyDefeats } from "./enemyDefeatRules.ts";
import { applyCardStatuses, resolveAmplificationThresholdEffects } from "./cardStatusEffects.ts";

export type CardPlayRequest = { card: Card; targetEnemyId?: string; discardCostPaid?: boolean };
export type CardPlayOptions = {
  phase: Phase; blessings: readonly BlessingId[]; maxPlayerHp: number;
  nextCardId: number; oneUpUsed: boolean; randomRolls: readonly number[];
};
export type CardPlayResolution = {
  state: GameState; played: boolean; nextCardId: number; oneUpUsed: boolean;
  automaticDrawnCards: Card[]; hitPopups: CardHit[]; defeatedEnemyIds: string[];
  victoryDelay: number | null;
};

/** Computes a card's complete result; no refs, React updates, timers, DOM, or random calls. */
export function resolveCardPlay(
  current: GameState,
  { card, targetEnemyId, discardCostPaid = false }: CardPlayRequest,
  { phase, blessings, maxPlayerHp, randomRolls, ...identity }: CardPlayOptions,
): CardPlayResolution {
  let { nextCardId, oneUpUsed } = identity;
  const unchanged = (state: GameState): CardPlayResolution => ({
    state, played: false, nextCardId, oneUpUsed, automaticDrawnCards: [],
    hitPopups: [], defeatedEnemyIds: [], victoryDelay: null,
  });
  if (UNPLAYABLE_CARD_EFFECTS.has(card.effect)) {
    return unchanged({ ...current, message: `${card.name}은(는) 사용할 수 없습니다. 파일 위로 옮겨 길을 만들어 보세요.` });
  }
  // Attack targeting and secondary card effects use separate parts of the supplied random tape.
  let effectRollIndex = Math.max(18, card.effect === "meteor" ? current.stars * 2 : current.starsSpent * 2);
  const effectRandom = () => randomRolls[effectRollIndex++] ?? 0;
  if (
    current.status !== "playing" ||
    current.pendingDraws > 0 ||
    current.pendingPileDrawCount > 0 ||
    current.pendingDiscards > 0 ||
    current.pendingResearchDraw !== null ||
    current.pendingSweep ||
    phase !== "playing"
  ) return unchanged(current);
  const energyCost = cardEnergyCost(
    card,
    current.activeRuleCards.filter((ruleCard) => ruleCard.effect === "lawResearch").length,
    current.forgeCount,
  );
  if (energyCost === undefined) {
    return unchanged({ ...current, message: `${card.name}은(는) 에너지 비용이 없는 카드입니다.` });
  }
  const discardCost = card.discardCost ?? 0;
  if (canTargetEnemy(card) && !current.enemies.some(enemy => enemy.hp > 0 && enemy.id === targetEnemyId)) {
    return unchanged({ ...current, message: `${card.name}: 적용할 적을 선택하세요.` });
  }
  const economicsResearchCount = current.activeRuleCards.filter((ruleCard) => ruleCard.effect === "economicsResearch").length;
  if (!canPayEnergyCost(current.energy, energyCost, economicsResearchCount)) {
    return unchanged({ ...current, message: `${card.name}: 에너지가 ${energyCost} 필요합니다.` });
  }
  if (discardCost > 0 && !discardCostPaid) {
    const enoughCards = current.hand.filter((item) => item.id !== card.id).length >= discardCost;
    return unchanged({
      ...current,
      message: enoughCards
        ? `${card.name}: 버릴 카드 ${discardCost}장을 먼저 선택해야 합니다.`
        : `${card.name}: 버릴 카드 ${discardCost}장이 필요합니다.`,
    });
  }
  if (card.effect === "endStart" && current.piles.some((pile) => pile.length > 0)) {
    return unchanged({ ...current, message: "끝의 시작은 모든 파일이 비어 있을 때만 사용할 수 있습니다." });
  }
  if (card.effect === "supernova" && current.stars < 3) {
    return unchanged({ ...current, message: "초신성: ★★★가 필요합니다." });
  }
  const isIronRampage = card.effect === "ironRampage";
  const isShockwave = card.effect === "shockwave";
  const isMagicStrike = card.effect === "magicStrike";
  const isSweepAttack = card.effect === "sweep";
  const isMeteor = card.effect === "meteor";
  const meteorStars = isMeteor ? current.stars : 0;
  const isHydra = card.effect === "hydra";
  const isRadiance = card.effect === "radiance";
  const isSuppression = card.effect === "suppression";
  const isStarArk = card.effect === "starArk";
  const isOdinSpear = card.effect === "odinSpear";
  const isPlateArmorDefense = card.effect === "plateArmorDefense";
  const isMassDeal = card.effect === "massDeal";
  const isSturdyStance = card.effect === "sturdyStance";
  const nextInvulnerabilityTurns = current.invulnerabilityTurns + (card.effect === "transcend" ? card.value : 0);
  const isDamageCard = isAttackCard(card);
  const isBlockCard = cardGivesPhysicalDefense(card) || cardGivesMagicDefense(card);
  const isWave = card.effect === "ironWave" || card.effect === "waterWave";
  const attack = resolveCardAttack(current, card, targetEnemyId, blessings, randomRolls, { maxPlayerHp, oneUpUsed });
  if (!attack) return unchanged(current);
  current = { ...current, playerHp: attack.sideEffects.playerHp,
    playerPhysicalBlock: attack.sideEffects.playerPhysicalBlock, hand: attack.sideEffects.hand };
  oneUpUsed = attack.oneUpUsed;
  const { targetEnemy, repetitions, combatManualBonus, damage, nextEnemies } = attack;
  const grimoireBonus = current.hand.filter((item) => item.effect === "grimoire").length;
  const incomingThornHits = attack.thornHits;
  const hitPopups = attack.hitPopups;
  let defeatedEnemyIds = current.enemies
    .filter(enemy => enemy.hp > 0 && nextEnemies.some(next => next.id === enemy.id && next.hp === 0))
    .map(enemy => enemy.id);
  const waitForLethalHitPopups = isDamageCard && nextEnemies.every(enemy => enemy.hp === 0);
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
      isAttack: false,
      damageTakenMultiplier: current.damageTakenMultiplier,
      invulnerable: current.invulnerable || nextInvulnerabilityTurns > 0,
    });
    thornsPhysicalBlock = resolvedHit.remainingBlock;
    thornsDamageTaken += resolvedHit.damageTaken;
  });
  const nextPhysicalBlock = card.effect === "mirrorImage" ? rawNextMagicBlock : thornsPhysicalBlock;
  const nextMagicBlock = card.effect === "mirrorImage" ? rawNextPhysicalBlock : rawNextMagicBlock;
  const nextResistance = isPlateArmorDefense
    ? addResistance(current.playerResistance, card.forged ? 2 : 1, blessings.includes("glassCannon"))
    : current.playerResistance;
  const won = nextEnemies.every((enemy) => enemy.hp === 0);
  const thornLife = resolveLethalDamage(
    current.playerHp,
    thornsDamageTaken,
    maxPlayerHp,
    blessings.includes("oneUp") && !oneUpUsed,
  );
  if (thornLife.usedOneUp) {
    oneUpUsed = true;
  }
  const selfDamageLife = resolveLethalDamage(
    thornLife.hp,
    card.effect === "adrenaline" ? 3 : 0,
    maxPlayerHp,
    blessings.includes("oneUp") && !oneUpUsed,
  );
  if (selfDamageLife.usedOneUp) {
    oneUpUsed = true;
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
      isAttack: false,
      damageTakenMultiplier: current.damageTakenMultiplier,
      invulnerable: current.invulnerable || nextInvulnerabilityTurns > 0,
    });
    grimoireMagicBlock = resolvedHit.remainingBlock;
    grimoireDamageTaken += resolvedHit.damageTaken;
    const grimoireLife = resolveLethalDamage(
      resolvedPlayerHp,
      resolvedHit.damageTaken,
      maxPlayerHp,
      blessings.includes("oneUp") && !oneUpUsed,
    );
    resolvedPlayerHp = grimoireLife.hp;
    if (grimoireLife.usedOneUp) {
      oneUpUsed = true;
    }
  }
  const blocked = blockedPileIndexes(nextEnemies);
  const canDraw = current.piles.some((pile, index) => pile.length > 0 && !blocked.includes(index));
  const drawEachPileResult = card.effect === "drawEachPile" || (card.effect === "fileDraw" && card.forged)
    ? drawFromPiles(current.piles, blocked)
    : null;
  const availableCardCount = current.piles.reduce((total, pile, index) => total + (blocked.includes(index) ? 0 : pile.length), 0);
  const pommelDrawResult = card.effect === "pommel"
    ? drawFromFirstPile(current.piles, blocked)
    : null;
  const dashRandomCount = card.effect === "dash" && canDraw
    ? card.forged ? 3 : 2
    : 0;
  const dashRandomResult = dashRandomCount > 0
    ? drawRandomFromPiles(current.piles, dashRandomCount, effectRandom, blocked)
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

  const pendingPileDrawCount = card.effect === "fileDraw" && !card.forged && canDraw
    ? Math.min(card.draw, availableCardCount)
    : 0;
  const pendingDashRandomDraws = 0;
  const drawsAdded = card.effect !== "foresight" && !won && availableCardCount > 0 && !drawEachPileResult && pendingPileDrawCount === 0
    ? Math.min(card.draw * repetitions, availableCardCount)
    : 0;
  const remainingHand = current.hand.filter((item) => item.id !== card.id);
  const radianceCount = card.effect === "lightCluster" || card.effect === "nebula"
    ? 1
    : card.effect === "largePrism" ? 3 : 0;
  const generatedRadiances = Array.from(
    { length: radianceCount },
    () => createRadianceCard(nextCardId++),
  );
  const generatedParallelRadiances = card.effect === "parallelMirror"
    ? remainingHand.filter((item) => item.effect === "radiance")
      .map((radiance) => ({ ...radiance, id: nextCardId++, revealed: true }))
    : [];
  const generatedWishCards: Card[] = card.effect === "wish"
    ? Array.from({ length: card.value }, () => ({
      ...RARE_CARD_POOL[Math.floor(effectRandom() * RARE_CARD_POOL.length)],
      id: nextCardId++, revealed: true, token: true,
    })) : [];
  const pendingDiscards = discardCostPaid ? 0 : card.discardCost ?? (card.effect === "prepare"
    ? (canDraw || remainingHand.length > 0 ? 1 : 0)
    : card.effect === "focus" && remainingHand.length > 0 ? 1 : 0);
  const discardPileTop = card.discardPileTop || (card.effect === "boomerang" && card.name === "정리 타격");
  const pendingSweep = !won && (discardPileTop || card.effect === "boomerang") && current.piles.some(pile => pile.length > 0);
  const pendingPileOperation = pendingSweep
    ? discardPileTop ? "discardTop" as const : "moveTopToBottom" as const
    : null;
  const action = (() => {
    if (isShockwave || isSweepAttack) return `${card.name}: 적 전체 공격`;
    if (isOdinSpear) return `오딘의 창: 적 전체에게 피해 ${damage} · 방어 ${blockGained}`;
    if (card.effect === "photonCannon") return `${targetEnemy?.name}에게 총 피해 ${damage} (${repetitions}회 공격)`;
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
    if (card.effect === "beastification") return `힘 ${card.value * (card.forged ? 2 : 1)} 획득`;
    if (card.effect === "metalization") return `강인함 ${card.value * (card.forged ? 2 : 1)} 획득`;
    if (card.effect === "sandToss") return `${targetEnemy?.name}에게 약화 ${card.value} 부여`;
    if (card.effect === "saeongjima") return "버리기 X 효과를 기다립니다.";
    if (card.effect === "ironSong") return `방어 ${blockGained} 획득 · 다음 2턴 시작 시 반복`;
    if (card.effect === "atField") return `방어 ${blockGained} · 증폭 2 획득`;
    if (card.effect === "overcharge") return "과충전 룰 활성화";
    if (card.effect === "criticalReaction") return "임계 반응 룰 활성화";
    if (card.effect === "foresight") return `다음 턴 시작 시 카드 ${card.draw}장 드로우`;
    if (card.effect === "steelStorm") return `방어 ${blockGained} 획득 · 강철의 폭풍 발동`;
    if (card.effect === "parallelMirror") return `광채 ${generatedParallelRadiances.length}장 복사`;
    if (card.effect === "economicsResearch") return "경제학 연구: 에너지 하한 -3 추가";
    if (card.effect === "opticsResearch") return "광학 연구: 턴 시작마다 광채 생성";
    if (card.effect === "lightCluster") return "빛무리: 광채 1장 획득";
    if (card.effect === "largePrism") return "대형 프리즘: 광채 3장 획득";
    if (card.effect === "nebula") return "성운: 광채 1장 획득 · ★★ 획득";
    if (card.effect === "lightTravelTime") return `광행시간: 다다음 턴 시작 시 광채 ${card.value}장 획득`;
    if (card.effect === "radiance") return `${targetEnemy?.name}에게 광채 피해 ${damage}`;
    if (card.effect === "lawResearch") return "법학 연구: 룰 카드 비용 감소";
    if (card.effect === "mirrorImage") return `${card.name}: 방어와 마법 방어 교환`;
    if (isPlateArmorDefense) return `방어 ${blockGained} 획득 · 저항 ${card.forged ? 2 : 1} 획득`;
    if (card.effect === "silverSword") return `${targetEnemy?.name}에게 피해 ${damage} · 마법 방어 ${blockGained} 획득`;
    if (card.effect === "fourHit") return `${targetEnemy?.name}에게 총 피해 ${damage} (${repetitions}회 공격)`;
    if (card.kind === "strike") return `${targetEnemy?.name}에게 피해 ${damage}${repetitions > 1 ? " (2회 발동)" : ""}`;
    if (isBlockCard) return `${DEFENSE_LABEL[card.damageType]} ${blockGained} 획득`;
    if (card.effect === "battlePlan") return `★ ${card.value}개 획득 · 드로우 ${card.draw}`;
    if (card.effect === "prepare") return canDraw ? "드로우할 파일을 선택하세요." : "버릴 카드를 선택하세요.";
    if (card.effect === "focus") return "에너지를 1 얻습니다 · 버릴 카드를 선택하세요.";
    if (card.effect === "pruning") return `과감한 결단: 에너지 ${card.discardEnergyGain ?? card.value} 획득`;
    if (card.effect === "adrenaline") return `체력 3 감소 · 에너지 ${card.value} 획득 · 카드 ${card.draw}장 드로우`;
    if (card.effect === "sweep") return canDraw ? "가져올 파일을 선택하세요." : "가져올 카드가 없습니다.";
    if (card.effect === "drawEachPile") return `모든 파일에서 ${drawEachPileResult?.hand.length ?? 0}장 뽑음`;
    if (card.effect === "wish") return `소원: 무작위 희귀 카드 ${generatedWishCards.length}장 획득`;
    if (card.effect === "dash") return `질주: 카드를 무작위로 ${dashRandomResult?.hand.length ?? 0}장 뽑음`;
    if (card.effect === "transcend") return `무적 ${card.value} 획득`;
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
  const drawMessage = pendingSweep
    ? " · 효과를 적용할 파일을 선택하세요."
    : card.draw > 0 && card.effect !== "foresight"
    ? canDraw
      ? " · 드로우할 파일을 선택하세요."
      : " · 드로우할 카드가 없습니다."
    : "";
  let state: GameState = {
    ...current,
    hand: [...remainingHand, ...(automaticDrawnCards ?? []), ...generatedRadiances, ...generatedWishCards, ...generatedParallelRadiances],
    // 강화는 사용 후에도 다음 셔플 전까지 유지된다. 셔플 때 prepareDeckForPiles가 해제한다.
    discard: card.exhaust || card.token
      ? current.discard
      : [...current.discard, card],
    removedFromReshuffleIds: [...new Set([
      ...current.removedFromReshuffleIds,
      ...(card.exhaust ? [card.id] : []),
    ])],
    energy: current.energy - energyCost + (card.effect === "aries" ? 5 : card.effect === "plateArmor" ? (card.forged ? 3 : 1) : card.effect === "fermentedSlime" || card.effect === "focus" || card.effect === "adrenaline" || card.effect === "charge" || card.effect === "endStart" || card.effect === "supernova" ? card.value : card.effect === "flood" ? 2 : card.effect === "ventilate" ? card.value : 0) + (discardCostPaid ? (card.discardEnergyGain ?? 0) : 0),
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
    pendingDiscardIsDiscardX: pendingDiscards > 0 && !discardCostPaid && card.discardCost !== undefined,
    pendingSaeongjimaTriggers: pendingDiscards > 0 && !discardCostPaid ? 0 : current.pendingSaeongjimaTriggers,
    pendingForesightDraws: current.pendingForesightDraws + (card.effect === "foresight" ? card.draw : 0),
    pendingIronSong: card.effect === "ironSong"
      ? [...current.pendingIronSong, { turns: 2, amount: card.value }]
      : current.pendingIronSong,
    pendingSweep,
    pendingPileOperation,
    enemies: nextEnemies,
    playerPhysicalBlock: nextPhysicalBlock,
    playerMagicBlock: grimoireMagicBlock,
    playerResistance: nextResistance,
    strength: current.strength + (card.effect === "orion" ? 10 : card.effect === "evolutionTheory" ? 1 : card.effect === "warmUp" ? card.value + 1 : card.effect === "augment" || card.effect === "weaponSharpen" || card.effect === "strategyBook" ? card.value : card.effect === "beastification" ? card.value * (card.forged ? 2 : 1) : 0),
    temporaryStrength: current.temporaryStrength + (card.effect === "warmUp" ? card.value : 0),
    agility: current.agility + (card.effect === "evolutionTheory" ? 1 : card.effect === "augment" || card.effect === "armorSharpen" || card.effect === "strategyBook" ? card.value : card.effect === "metalization" ? card.value * (card.forged ? 2 : 1) : 0),
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
    invulnerabilityTurns: nextInvulnerabilityTurns,
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
  if (!["shatter", "kneeStrike", "demolish"].includes(card.effect)) {
    state = applyCardStatuses(state, card, targetEnemyId, blessings.includes("glassCannon"));
  }
  const thresholdEffects = resolveAmplificationThresholdEffects(current, state);
  state = thresholdEffects.state;
  let thresholdDrawnCards: Card[] = [];
  if (thresholdEffects.randomDrawCount > 0) {
    const thresholdDraw = drawRandomFromPiles(
      state.piles,
      thresholdEffects.randomDrawCount,
      effectRandom,
      blockedPileIndexes(state.enemies),
    );
    thresholdDrawnCards = thresholdDraw.hand;
    state = { ...state, piles: thresholdDraw.piles, hand: [...state.hand, ...thresholdDraw.hand] };
  }
  const thresholdMessages = [
    thresholdEffects.overchargeTriggered && `과충전: 카드를 무작위로 ${thresholdDrawnCards.length}장 뽑음`,
    thresholdEffects.criticalReactionTriggered && "임계 반응: 에너지 2 획득",
  ].filter(Boolean);
  if (thresholdMessages.length > 0) state = { ...state, message: `${state.message} · ${thresholdMessages.join(" · ")}` };
  const deaths = resolveEnemyDefeats(state, { blessings, maxPlayerHp, oneUpUsed });
  state = deaths.state;
  oneUpUsed = deaths.oneUpUsed;
  defeatedEnemyIds = current.enemies.filter(enemy => enemy.hp > 0
    && state.enemies.some(next => next.id === enemy.id && next.hp === 0)).map(enemy => enemy.id);
  if (state.playerHp === 0) state = { ...state, status: "lost", message: "폭발 피해로 쓰러졌습니다." };
  else if (state.enemies.every(enemy => enemy.hp === 0) && !waitForLethalHitPopups) state = { ...state, status: "won" };
  return {
    state, played: true, nextCardId, oneUpUsed, automaticDrawnCards: [...automaticDrawnCards, ...thresholdDrawnCards], hitPopups, defeatedEnemyIds,
    victoryDelay: state.playerHp > 0 && waitForLethalHitPopups ? Math.max(500, (hitPopups.length - 1) * 220 + 500) : null,
  };

}
