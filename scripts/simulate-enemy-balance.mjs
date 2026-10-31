import fs from "node:fs";
import path from "node:path";
import { createStarterDeck, createRegionDeck } from "../app/game/rewards.ts";
import { ALL_CARD_BLUEPRINTS, isAttackCard, UNPLAYABLE_CARD_EFFECTS } from "../app/game/cards.ts";
import { prepareBattleStart } from "../app/game/battleSetup.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";
import { resolveEnemyTurn } from "../app/game/enemyTurnResolution.ts";
import { createEndTurn } from "../app/game/endTurnAction.ts";
import { createDrawCards } from "../app/game/drawCards.ts";
import { createMoveCardToPile, createDrawSelectedPile, createDrawAstronomyResearchCard } from "../app/game/pileActions.ts";
import { createTelemetryRecorder } from "../app/game/telemetry.ts";
import { getEnemyCodexEntries } from "../app/game/enemies.ts";
import { blockedPileIndexes } from "../app/game/enemyPassives.ts";
import { maximumBattleEnergy } from "../app/game/combatEconomy.ts";
import { cardEnergyCost, canPlaceBySolitaireRule } from "../app/game/cardEffects.ts";

const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, "").split("=")));
const runs = Number(args.runs ?? 120), bankSize = Number(args.decks ?? 12), maxTurns = Number(args.turns ?? 40);
const out = args.out ?? "outputs/enemy-balance-2026-11-01";
const seed = Number(args.seed ?? 20261101);
function generator(initial) {
  let value = initial >>> 0;
  return () => { value += 0x6D2B79F5; let n = value; n = Math.imul(n ^ n >>> 15, n | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
function seeded(initial, fn) { const previous = Math.random; Math.random = generator(initial); try { return fn(); } finally { Math.random = previous; } }
const blueprint = name => { const found = ALL_CARD_BLUEPRINTS.find(card => card.name === name); if (!found) throw new Error(name); return found; };
function strengthen(deck, names, id) {
  deck = structuredClone(deck);
  for (const name of names) {
    const card = { ...blueprint(name), id: id++, revealed: false };
    if (deck.cards.length < deck.capacity) deck.cards.push(card);
    else {
      const index = deck.cards.findIndex(card => card.rarity === "starter" && card.kind === "strike");
      const fallback = deck.cards.findIndex(card => card.rarity === "starter");
      deck.cards[index >= 0 ? index : fallback >= 0 ? fallback : deck.cards.length - 1] = card;
    }
  }
  return deck;
}
const banks = [ [createStarterDeck()],
  Array.from({ length: bankSize }, (_, i) => seeded(seed + 1000 + i, () => strengthen(
    createRegionDeck(1, 10000 + i * 100, 0), ["백스텝", "파쇄", "비늘 갑옷"], 50000 + i * 100))),
  Array.from({ length: bankSize }, (_, i) => seeded(seed + 2000 + i, () => strengthen(
    createRegionDeck(2, 20000 + i * 100, 0), args.build === "offense"
      ? ["무릎차기", "파쇄", "청동 철퇴", "백스텝"] : ["무릎차기", "가호", "비늘 갑옷", "퀵스텝"], 60000 + i * 100))),
];
const scenarios = [
  { name: "시작덱·비탄·1지역", region: 1, lament: true, bank: banks[0] },
  { name: "1지역 드롭덱+특별 3장·비탄 없음", region: 1, lament: false, bank: banks[1] },
  { name: "2지역 드롭덱+특별 4장·비탄 없음", region: 2, lament: false, bank: banks[2] },
];
const emptyElements = [];
globalThis.document = { querySelectorAll: () => emptyElements, querySelector: () => null };
let frame = () => 0;
globalThis.window = { matchMedia: () => ({ matches: true }), requestAnimationFrame: callback => frame(callback), cancelAnimationFrame() {} };

function quality(card) {
  if (!card) return 0;
  if (!card.revealed) return 2; // Never inspect the identity of a hidden card.
  if (card.effect === "slime" || card.effect === "soil" || card.effect === "rock") return -5;
  if (card.effect === "combatManual" || card.effect === "strategyBook") return 9;
  if (UNPLAYABLE_CARD_EFFECTS.has(card.effect)) return 0;
  const cost = cardEnergyCost(card) ?? 0;
  return Math.max(.5, (isAttackCard(card) ? card.value * .35 : card.value * .25) + card.draw * 1.5
    + (card.rarity === "rare" ? 2 : 0) - cost * .7 + (card.forged ? 2 : 0));
}
function finishStatus(state) {
  state = derivedState(state);
  if (state.playerHp <= 0) return { ...state, status: "lost" };
  if (state.enemies.every(enemy => enemy.hp <= 0)) return { ...state, status: "won" };
  return state;
}
function derivedState(state) {
  const bonus = state.deckEditions.includes("whiteSpace") ? state.piles.filter(pile => pile.length === 0).length * 2 : 0;
  return bonus === state.whiteSpaceStrengthBonus ? state : { ...state,
    strength: state.strength - state.whiteSpaceStrengthBonus + bonus, whiteSpaceStrengthBonus: bonus };
}
function simulate(deck, encounter, trialSeed, lament, policy) {
  return seeded(trialSeed, () => {
    let state = prepareBattleStart({ encounters: [{ encounterIndex: encounter.encounterIndex,
      isBoss: encounter.enemies.some(group => group.enemy.isBoss), awareness: "awake" }], playerHp: 50,
      battleDeck: deck, blessings: [], godsLamentCharges: lament ? 1 : 0, nextCardId: 100000 }).game;
    const identity = { current: 100000 }, oneUpUsed = { current: false };
    let time = 0, scheduled = [], serial = 0, steps = 0, moves = 0;
    const trace = [];
    const setGame = update => { state = derivedState(typeof update === "function" ? update(state) : update); };
    const later = (callback, delay = 0) => { scheduled.push({ callback, at: time + delay, id: ++serial }); return serial; };
    frame = callback => later(callback, 1);
    const flush = () => { let count = 0; while (scheduled.length) { if (++count > 10000) throw new Error("timer loop");
      scheduled.sort((a, b) => a.at - b.at || a.id - b.id); const item = scheduled.shift(); time = item.at; item.callback(); } };
    const draw = createDrawCards({ pendingOriginsRef: { current: new Map() }, pendingPileTokenSourcesRef: { current: new Map() },
      pendingEnemyTokenIdsRef: { current: new Set() }, nextCardIdRef: identity, blessings: [], setPhase() {}, setGame,
      setPileClearNotice() {}, later, pickRandom: items => items[Math.floor(Math.random() * items.length)] });
    const forecast = game => resolveEnemyTurn(game, { blessings: [], maxPlayerHp: 50, oneUpUsed: oneUpUsed.current,
      randomRolls: game.enemies.map(() => .5) });
    function value(game) {
      game = derivedState(game);
      if (game.playerHp <= 0) return -100000;
      if (game.enemies.every(enemy => enemy.hp <= 0)) return 100000 + game.playerHp;
      const next = forecast(game);
      const weight = policy === "balanced" ? 2 : 1;
      let result = game.playerHp * 2 + next.remainingHp * weight + game.energy * 1.7;
      for (const enemy of game.enemies.filter(enemy => enemy.hp > 0)) {
        result -= enemy.hp * .75 + (enemy.armor ?? 0) * .4 + enemy.physicalBlock * .25 + 8;
        result -= Math.max(0, enemy.strength) * .7;
        result += Math.sign(-(enemy.resistance ?? 0)) * Math.min(3, Math.abs(enemy.resistance ?? 0)) * 2;
        result += Math.sign(-(enemy.amplification ?? 0)) * Math.min(3, Math.abs(enemy.amplification ?? 0)) * 3;
        if (enemy.solitaireHitBonusReady) result += 2;
      }
      result += game.strength * 4.5 + game.agility * 4;
      result += Math.sign(game.playerAmplification) * (Math.min(3, Math.abs(game.playerAmplification)) * 2 + (game.energy > 0 ? 2 : 0));
      result += Math.sign(next.nextPlayerResistance) * Math.min(3, Math.abs(next.nextPlayerResistance)) * 2;
      result += (game.pendingBattlePreparation ?? 0) * 4 + game.extraTurns * 10;
      result += game.activeRuleCards.length * 4;
      result += game.hand.length * .4 + (game.pendingDraws + game.pendingPileDrawCount) * 2.5;
      return result;
    }
    const bestDiscard = (hand, count) => [...hand].sort((a, b) => quality(a) - quality(b)).slice(0, count);
    function request(game, card, target, rolls) {
      const needed = card.discardCost ?? 0;
      if (needed > 0) {
        const others = game.hand.filter(item => item.id !== card.id);
        if (others.length < needed) return null;
        const ids = new Set(bestDiscard(others, needed).map(card => card.id));
        game = { ...game, hand: game.hand.filter(item => !ids.has(item.id)),
          discard: [...game.discard, ...others.filter(item => ids.has(item.id))] };
      }
      const result = resolveCardPlay(game, { card, targetEnemyId: target, discardCostPaid: needed > 0 },
        { phase: "playing", blessings: [], maxPlayerHp: 50, nextCardId: identity.current,
          oneUpUsed: oneUpUsed.current, randomRolls: rolls });
      return result.played ? result : null;
    }
    function settle() {
      let guard = 0;
      while (state.status === "playing" && ++guard < 100) {
        const blocked = blockedPileIndexes(state.enemies);
        if (state.pendingDraws > 0 || state.pendingPileDrawCount > 0) {
          const candidates = state.piles.flatMap((pile, index) => pile.length && !blocked.includes(index) ? [index] : []);
          candidates.sort((a, b) => quality(state.piles[b].at(-1)) - quality(state.piles[a].at(-1)));
          createDrawSelectedPile({ game: state, phase: "playing", setGame,
            pendingOriginsRef: { current: new Map() }, setPhase() {} })(candidates[0] ?? 0);
        } else if (state.pendingDiscards > 0) {
          const dropped = bestDiscard(state.hand, state.pendingDiscards), ids = new Set(dropped.map(card => card.id));
          state = { ...state, hand: state.hand.filter(card => !ids.has(card.id)), discard: [...state.discard, ...dropped], pendingDiscards: 0 };
        } else if (state.pendingSweep) {
          const candidates = state.piles.flatMap((pile, i) => pile.length ? [i] : []);
          candidates.sort((a, b) => quality(state.piles[a].at(-1)) - quality(state.piles[b].at(-1)));
          const piles = state.piles.map(pile => [...pile]), index = candidates[0], top = piles[index]?.pop();
          if (top && state.pendingPileOperation !== "discardTop") piles[index].unshift(top);
          if (piles[index]?.length) piles[index][piles[index].length - 1] = { ...piles[index].at(-1), revealed: true };
          state = { ...state, piles, pendingSweep: false, pendingPileOperation: null,
            discard: top && state.pendingPileOperation === "discardTop" ? [...state.discard, top] : state.discard };
        } else break;
      }
      if (guard >= 100) throw new Error("pending action loop");
      flush(); state = finishStatus(state);
    }
    draw(); flush();
    while (state.status === "playing" && state.turn <= maxTurns) {
      const seenMoves = new Set();
      for (let action = 0; action < 50 && state.status === "playing"; action++) {
        settle(); if (state.status !== "playing") break;
        const base = value(state);
        let best = null, bestScore = .05;
        for (const card of state.hand) {
          if (UNPLAYABLE_CARD_EFFECTS.has(card.effect)) continue;
          const targets = isAttackCard(card) || card.effect === "scaleArmor"
            ? state.enemies.filter(enemy => enemy.hp > 0).map(enemy => enemy.id) : [undefined];
          for (const target of targets) {
            const result = request(state, card, target, Array(160).fill(.5));
            if (!result) continue;
            const score = value(finishStatus(result.state)) - base;
            if (score > bestScore) { best = { kind: "play", card, target }; bestScore = score; }
          }
        }
        const research = state.activeRuleCards.filter(card => card.effect === "astronomyResearch").length;
        if (state.stars >= 2 && state.astronomyResearchUses < research) {
          const blocked = blockedPileIndexes(state.enemies);
          const indexes = state.piles.flatMap((pile, i) => pile.length && !blocked.includes(i) ? [i] : []);
          indexes.sort((a, b) => quality(state.piles[b].at(-1)) - quality(state.piles[a].at(-1)));
          if (indexes.length && quality(state.piles[indexes[0]].at(-1)) > 2.5 && bestScore < 2) best = { kind: "research", index: indexes[0] };
        }
        const necromancy = state.activeRuleCards.filter(card => card.effect === "necromancyResearch").length;
        if (state.stars >= 3 && state.necromancyResearchUses < necromancy && state.energy > 0 && bestScore < 2) {
          const cards = [...state.discard].sort((a, b) => quality(b) - quality(a));
          if (cards.length && quality(cards[0]) > 3.5) best = { kind: "necromancy", card: cards[0] };
        }
        if (state.stars >= 1) {
          const sources = [ ...state.hand.map(card => ({ card, cards: [card], source: { type: "hand" } })),
            ...state.piles.flatMap((pile, pileIndex) => pile.flatMap((card, cardIndex) => card.revealed
              ? [{ card, cards: pile.slice(cardIndex), source: { type: "pile", pileIndex, cardIndex } }] : [])) ];
          for (const source of sources) for (let index = 0; index < state.piles.length; index++) {
            if (source.source.type === "pile" && source.source.pileIndex === index) continue;
            if (!canPlaceBySolitaireRule(source.card, state.piles[index].at(-1))) continue;
            let moved = state;
            createMoveCardToPile({ phase: "playing", blessings: [], maxPlayerHp: 50, oneUpUsedRef: oneUpUsed,
              setGame: update => { moved = update(moved); }, grantBattleReward() {}, battleRewardRegionRef: { current: 1 },
              lowestHealthEnemy: enemies => enemies.filter(enemy => enemy.hp > 0).sort((a, b) => a.hp - b.hp)[0] })(source, index);
            if (moved.stars >= state.stars) continue;
            const fingerprint = JSON.stringify([moved.piles.map(pile => pile.map(card => card.id)), moved.hand.map(card => card.id)]);
            if (seenMoves.has(fingerprint)) continue;
            const visibleChange = moved.piles.reduce((sum, pile) => sum + quality(pile.at(-1)), 0)
              - state.piles.reduce((sum, pile) => sum + quality(pile.at(-1)), 0);
            const forged = moved.forgeCount - state.forgeCount;
            const score = value(finishStatus(moved)) - base + visibleChange * .6 + forged * 3 - 2;
            if (score > bestScore) { best = { kind: "move", source, index, fingerprint }; bestScore = score; }
          }
        }
        if (!best) break;
        if (best.kind === "play") {
          const result = request(state, best.card, best.target, Array.from({ length: 160 }, () => Math.random()));
          state = finishStatus(result.state); identity.current = result.nextCardId; oneUpUsed.current = result.oneUpUsed;
          steps++; if (trace.length < 150) trace.push({ turn: state.turn, action: best.card.name, hp: state.playerHp });
        } else if (best.kind === "research") {
          createDrawAstronomyResearchCard({ game: state, phase: "playing", setGame, setPhase() {}, captureDrawOrigins: () => 0,
            canUseResearchDraw: () => true })(best.index, true);
        } else if (best.kind === "necromancy") {
          state = { ...state, stars: state.stars - 3, discard: state.discard.filter(card => card.id !== best.card.id),
            hand: [...state.hand, { ...best.card, revealed: true }], necromancyResearchUses: state.necromancyResearchUses + 1 };
        } else {
          createMoveCardToPile({ phase: "playing", blessings: [], maxPlayerHp: 50, oneUpUsedRef: oneUpUsed,
            setGame, grantBattleReward() {}, battleRewardRegionRef: { current: encounter.regions[0] },
            lowestHealthEnemy: enemies => enemies.filter(enemy => enemy.hp > 0).sort((a, b) => a.hp - b.hp)[0] })(best.source, best.index);
          seenMoves.add(best.fingerprint); moves++; state = finishStatus(state);
        }
      }
      if (state.status !== "playing") break;
      trace.push({ turn: state.turn, hp: state.playerHp, action: "end", enemyHp: state.enemies.reduce((n, e) => n + e.hp, 0) });
      createEndTurn({ game: state, phase: "playing", handCardRefs: { current: new Map() }, setPhase() {}, setDragging() {}, later,
        blessings: [], oneUpUsedRef: oneUpUsed, maxPlayerHp: 50, setOneUpUsed() {}, setGame, drawCards: draw,
        telemetry: createTelemetryRecorder(), setDamagePopup() {}, setAttackingEnemyId() {}, grantBattleReward() {},
        battleRewardRegionRef: { current: encounter.regions[0] },
        maximumEnergyForGame: game => maximumBattleEnergy(game.deckEditions.includes("rampaging"), game.deckHighlanderActive ? 1 : 0),
        animateCardToPlayer: () => null })();
      flush(); state = finishStatus(state);
    }
    return { won: state.status === "won", timeout: state.status === "playing", hpLoss: 50 - state.playerHp,
      turns: state.turn, steps, moves, trace };
  });
}

const entries = getEnemyCodexEntries();
const results = [], raw = [];
for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {
  if (args.scenario && scenarioIndex !== Number(args.scenario) - 1) continue;
  const scenario = scenarios[scenarioIndex];
  for (const encounter of entries.filter(entry => entry.regions.includes(scenario.region))) {
    for (const policy of ["balanced", "aggressive"]) {
      const trials = Array.from({ length: runs }, (_, trial) => {
        const result = simulate(scenario.bank[trial % scenario.bank.length], encounter,
          seed + scenarioIndex * 1000000 + trial * 1009, scenario.lament, policy);
        raw.push({ scenario: scenario.name, encounter: encounter.label, policy, trial, ...result });
        return result;
      });
      const wins = trials.filter(trial => trial.won), average = (items, key) => items.length ? items.reduce((n, item) => n + item[key], 0) / items.length : null;
      const result = { scenario: scenario.name, encounter: encounter.label, boss: encounter.enemies.some(group => group.enemy.isBoss),
        policy, runs, wins: wins.length, winRate: wins.length / runs, meanLoss: average(trials, "hpLoss"),
        winMeanLoss: average(wins, "hpLoss"), winMeanTurns: average(wins, "turns"), meanMoves: average(trials, "moves"),
        timeouts: trials.filter(trial => trial.timeout).length };
      results.push(result);
      console.log(`${scenarioIndex + 1} ${encounter.label} ${policy}: ${wins.length}/${runs}, loss=${result.meanLoss.toFixed(1)}`);
    }
  }
}
fs.mkdirSync(out, { recursive: true });
if (args.resume && args.scenario) {
  const selected = scenarios[Number(args.scenario) - 1].name;
  const previous = JSON.parse(fs.readFileSync(path.join(out, "summary.json")));
  results.push(...previous.results.filter(result => result.scenario !== selected));
  raw.push(...JSON.parse(fs.readFileSync(path.join(out, "trials.json"))).filter(result => result.scenario !== selected));
}
const manifest = { revision: args.revision ?? "unspecified", build: args.build ?? "balanced", seed, runs, bankSize, maxTurns,
  assumptions: ["50 HP fresh per encounter; no blessings or tickets", "Actual engine, real deck generator, actual HP rolls and Gods Lament",
    "Greedy visible-information policies; no access to hidden card identities or future random enemy intents", "No manual enemy stat changes",
    "Astronomy and necromancy are used by simple fixed heuristics", "Not human win rates or an optimal-play bound"],
  decks: scenarios.map(scenario => ({ name: scenario.name, decks: scenario.bank.map(deck => ({ capacity: deck.capacity, editions: deck.editions,
    cards: Object.fromEntries([...new Set(deck.cards.map(card => card.name))].map(name => [name, deck.cards.filter(card => card.name === name).length])) })) })), results };
fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(out, "trials.json"), JSON.stringify(raw));
console.log(`Saved ${raw.length} battles to ${out}`);
