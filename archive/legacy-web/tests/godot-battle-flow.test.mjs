import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { ALL_CARD_BLUEPRINTS } from "../app/game/cards.ts";
import { waitingState, dealtState, drawFromPiles } from "../app/game/battleState.ts";
import { prepareBattleStart } from "../app/game/battleSetup.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";
import { resolveEnemyTurn } from "../app/game/enemyTurnResolution.ts";
import { createStarterDeck } from "../app/game/rewards.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const bundled = path.join(root,"work/godot-tools/4.7.2/Godot_v4.7.2-stable_win64_console.exe");
const engine = process.env.GODOT_BIN || (fs.existsSync(bundled) ? bundled : undefined);
const fixedRandom = callback => {
  const original = Math.random;
  Math.random = () => .99;
  try { return callback(); } finally { Math.random = original; }
};
const card = (name,id,extra = {}) => {
  const blueprint = ALL_CARD_BLUEPRINTS.find(entry=>entry.name === name);
  assert.ok(blueprint,`Missing web card ${name}`);
  return {...blueprint,id,revealed:true,...extra};
};
const snake = value=>value.replace(/[A-Z]/g,letter=>`_${letter.toLowerCase()}`);
function toPort(value) {
  if(Array.isArray(value)) return value.map(toPort);
  if(!value || typeof value !== "object") return value;
  const result = {};
  for(const [key,entry] of Object.entries(value)) {
    if(entry === undefined) continue;
    const target = key === "playerPhysicalBlock" ? "player_block" : key === "intentIndex" ? "action_index" : snake(key);
    result[target] = key === "effect" ? snake(entry) : toPort(entry);
    if(key === "pendingPileOperation" && entry === null) result[target] = "";
    if(key === "actions") result[target] = entry.map(action=>({ ...toPort(action),
      damage:action.attacks[0]?.value ?? 0,damage_type:action.attacks[0]?.type ?? "physical",hits:action.attacks[0]?.hits ?? 1 }));
  }
  return result;
}
const cases = [];
const starter = createStarterDeck();
function enemySummary(enemies) {
  return enemies.map(enemy=>({hp:enemy.hp,maxHp:enemy.max_hp,strength:enemy.strength,
    karma:enemy.karma_stage ?? 0,summon:enemy.summon_hp_multiplier ?? null}));
}
for(const index of [19,5,20]) for(const stage of [0,3]) for(const charges of [0,3]) {
  const raw = fixedRandom(()=>createSewerEncounterByIndex(index));
  const expected = fixedRandom(()=>prepareBattleStart({encounters:[{encounterIndex:index,isBoss:false}],
    playerHp:50,battleDeck:starter,blessings:[],godsLamentCharges:charges,nextCardId:1000,karmaStage:stage}));
  cases.push({label:`start bonuses: encounter ${index}, karma ${stage}, charges ${charges}`,action:"setup",
    encounter:raw.length === 1 ? toPort(raw[0]) : {enemies:toPort(raw)},stage,charges,
    expected:{enemies:enemySummary(toPort(expected.battleEnemies)),charges:expected.remainingGodsLamentCharges},
    summarize:result=>({enemies:enemySummary(result.encounter.enemies),charges:result.remaining_lament_charges})});
}
function dealSummary(state) {
  const cards = [...state.hand,...state.piles.flat()];
  return {cards:cards.map(entry=>entry.id).sort((a,b)=>a-b),hand:state.hand.length,
    piles:state.piles.map(pile=>pile.length).sort((a,b)=>a-b),energy:state.energy,stars:state.stars,
    hp:state.player_hp,discard:state.discard.length,
    revealed:state.piles.map(pile=>pile.filter(entry=>entry.revealed).length).sort((a,b)=>a-b)};
}
for(const editions of [[],["roomy"],["fantastic"],["drawPlus"],["roomy","starPlus"]]) {
  const expected = fixedRandom(()=>{
    const state = dealtState(50,starter.cards,[],editions);
    const drawn = drawFromPiles(state.piles);
    return {...state,piles:drawn.piles,hand:[...state.hand,...drawn.hand]};
  });
  cases.push({label:`initial deal ${editions.join() || "ordinary"}`,action:"start",deck:toPort(starter.cards),
    encounter:{name:"검증 적",hp:100,max_hp:100,actions:[{name:"대기",damage:0,cycle:true}]},editions,
    expected:dealSummary(toPort(expected)),summarize:dealSummary});
}
function combatSummary(state) {
  return {hp:state.player_hp,block:state.player_block,magicBlock:state.player_magic_block,energy:state.energy,
    stars:state.stars,enemies:state.enemies.map(enemy=>({hp:enemy.hp,block:enemy.physical_block})),
    hand:state.hand.map(entry=>entry.id),discard:state.discard.map(entry=>entry.id),status:state.status};
}
for(const [label,extra] of [["ordinary",{}],["strength",{strength:2}],["enemy defense",{defense:true}],["dead target",{dead:true}]]) {
  let enemies = fixedRandom(()=>createSewerEncounterByIndex(5));
  if(extra.defense) enemies = enemies.map(enemy=>({...enemy,physicalBlock:3}));
  if(extra.dead) enemies[0] = {...enemies[0],hp:0};
  const sweep = card("휩쓸기",1000);
  const state = {...waitingState(50,enemies),hand:[sweep],initialDeck:[sweep],strength:extra.strength ?? 0};
  const expected = resolveCardPlay(state,{card:sweep}, {phase:"playing",blessings:[],maxPlayerHp:50,oneUpUsed:false,nextCardId:1001,randomRolls:[]});
  cases.push({label:`all-enemy attack ${label}`,action:"play",state:toPort(state),card_id:1000,
    expected:combatSummary(toPort(expected.state)),summarize:combatSummary});
}
const pendingDiscardCard = (name, id) => card(name, id);
const discardPlayState = (played, candidates) => ({
  ...waitingState(50, fixedRandom(() => createSewerEncounterByIndex(5))),
  energy: 3, hand: [played, ...candidates], piles: [[], []],
});
for (const [label, played, candidates, verify] of [
  ["forced one-card discard resolves play", pendingDiscardCard("몸 사리기", 1100), [card("타격", 1101)], state => {
    assert.equal(state.pending_play_card_id, -1);
    assert.equal(state.pending_discard_count, 0);
    assert.ok(state.discard.some(entry => entry.id === 1101));
    assert.ok(!state.hand.some(entry => entry.id === 1100));
  }],
  ["real discard choice remains pending", pendingDiscardCard("몸 사리기", 1110), [card("타격", 1111), card("방어", 1112)], state => {
    assert.equal(state.pending_play_card_id, 1110);
    assert.equal(state.pending_discard_count, 1);
    assert.deepEqual(state.discard.map(entry => entry.id), []);
    assert.ok(state.hand.some(entry => entry.id === 1110));
  }],
  ["forced two-card discard completes card continuation", pendingDiscardCard("과감한 회피", 1120), [card("타격", 1121), card("방어", 1122)], state => {
    assert.equal(state.pending_play_card_id, -1);
    assert.equal(state.pending_discard_count, 0);
    assert.deepEqual(state.discard.filter(entry => [1121, 1122].includes(entry.id)).map(entry => entry.id).sort(), [1121, 1122]);
    assert.ok(!state.hand.some(entry => entry.id === 1120));
  }],
]) {
  cases.push({label, action:"play", state:toPort(discardPlayState(played, candidates)), card_id:played.id,
    expected:null, summarize:state=>state, verify});
}
cases.push({label:"zero eligible hand cards clear stale discard selection", action:"auto_discard",
  state:toPort({...waitingState(50, []), hand:[], pending_play_card_id:1190, pending_discard_count:1}),
  expected:null, summarize:state=>state, verify:state=>{
    assert.equal(state.pending_play_card_id, -1);
    assert.equal(state.pending_discard_count, 0);
  }});
const forcedAttack = card("돌진", 1150);
cases.push({label:"forced discard attack preserves hit presentation", action:"play",
  state:toPort(discardPlayState(forcedAttack, [card("타격", 1151)])), card_id:forcedAttack.id,
  expected:null, summarize:state=>state,
  verify:state=>{
    assert.equal(state.pending_play_card_id, -1);
    assert.ok(!state.hand.some(entry=>entry.id===forcedAttack.id));
  }, verifyResult:result=>assert.ok(result.play_view.hits.length > 0)});
for (const [label, piles, expectedPending] of [
  ["single eligible file auto discards top", [[card("타격", 1131)], []], ""],
  ["multiple eligible files preserve file choice", [[card("타격", 1141)], [card("방어", 1142)]], "discardTop"],
]) {
  const played = card("기회 창출", expectedPending === "" ? 1130 : 1140);
  const state = {...waitingState(50, fixedRandom(() => createSewerEncounterByIndex(5))), energy:3,
    hand:[played], piles};
  cases.push({label, action:"play", state:toPort(state), card_id:played.id, expected:null, summarize:result=>result,
    verify:result=>{
      assert.equal(result.pending_pile_operation, expectedPending);
      if (expectedPending === "") assert.ok(result.discard.some(entry=>entry.id===1131));
    }});
}
cases.push({label:"zero eligible files clear stale file discard selection", action:"auto_pile_discard",
  state:toPort({...waitingState(50, []), piles:[[], []], pending_pile_operation:"discardTop", pending_sweep:true}),
  expected:null, summarize:state=>state, verify:state=>{
    assert.equal(state.pending_pile_operation, "");
    assert.equal(state.pending_sweep, false);
  }});
for(const block of [0,5,20]) {
  const enemies = fixedRandom(()=>createSewerEncounterByIndex(5));
  const state = {...waitingState(50,enemies),energy:1,playerPhysicalBlock:block,
    hand:[card("방어",1)],piles:[[card("타격",2),card("타격",3)],[card("방어",4),card("방어",5)]]};
  const resolved = resolveEnemyTurn(state,{blessings:[],maxPlayerHp:50,oneUpUsed:false,randomRolls:[]});
  const drawn = drawFromPiles(resolved.pilesAfterSlime);
  const expected = {hp:resolved.remainingHp,block:0,energy:3,stars:state.stars,turn:2,
    hand:[...resolved.retainedHand,...drawn.hand].map(entry=>entry.id),
    discard:resolved.discarded.map(entry=>entry.id),piles:drawn.piles.map(pile=>pile.map(entry=>entry.id))};
  cases.push({label:`enemy turn and next draw with block ${block}`,action:"turn",state:toPort(state),expected,
    summarize:next=>({hp:next.player_hp,block:next.player_block,energy:next.energy,stars:next.stars,turn:next.turn,
      hand:next.hand.map(entry=>entry.id),discard:next.discard.map(entry=>entry.id),piles:next.piles.map(pile=>pile.map(entry=>entry.id))})});
}
const drawCard = (id, extra = {}) => ({ id, name: `c${id}`, revealed: false, ...extra });
const drawState = ({ piles, discard = [], hand = [], enemies = [], exhausted = [] }) => ({
  status: "playing", turn: 1, piles, discard, hand, enemies, exhausted,
  active_rule_cards: [], cards_per_file: 5, battle_seed: 77,
});
const drawSummary = state => ({
  hand: state.hand.map(entry => entry.id),
  piles: state.piles.map(pile => pile.map(entry => entry.id)),
  discard: state.discard.map(entry => entry.id), status: state.status,
});
for (const [label, state, verify] of [
  ["last layer keeps old draw in hand and rebuilds at turn start",
    drawState({ piles: [[drawCard(1)]], discard: [drawCard(2)], hand: [drawCard(9)] }),
    next => assert.deepEqual(drawSummary(next), { hand: [9, 1], piles: [[2]], discard: [], status: "playing" })],
  ["empty files reshuffle despite retained hand",
    drawState({ piles: [[], []], discard: [drawCard(2)], hand: [drawCard(9)] }),
    next => { assert.deepEqual(next.hand.map(entry => entry.id), [9, 2]); assert.equal(next.piles.flat().length, 0); }],
  ["mixed empty and final file redraws only the previously empty file",
    drawState({ piles: [[], [drawCard(1)]], discard: Array.from({ length: 6 }, (_, i) => drawCard(i + 10)), hand: [drawCard(9)] }),
    next => { assert.deepEqual(next.hand.slice(0, 2).map(entry => entry.id), [9, 1]); assert.equal(next.hand.length, 3); assert.equal(next.piles.length, 2); assert.equal(next.piles[1].length, 1); }],
  ["Roomy file count survives reshuffle",
    drawState({ piles: [[], [], []], discard: Array.from({ length: 6 }, (_, i) => drawCard(i + 10)) }),
    next => { assert.equal(next.piles.length, 3); assert.equal(next.hand.length, 2); }],
  ["fully sealed files do not reshuffle",
    drawState({ piles: [[drawCard(1)]], discard: [drawCard(2)], hand: [drawCard(9)], enemies: [{ hp: 5, seals_pile: true, sealed_turn: 1, sealed_pile_index: 0 }] }),
    next => { assert.deepEqual(next.piles[0].map(entry => entry.id), [1]); assert.deepEqual(next.discard.map(entry => entry.id), [2]); }],
  ["empty source leaves battle playing instead of falsely winning",
    drawState({ piles: [[]] }),
    next => assert.equal(next.status, "playing")],
  ["token and exhausted cards stay out of reshuffle",
    drawState({ piles: [[]], discard: [drawCard(2, { token: true }), drawCard(3), drawCard(4)], exhausted: [drawCard(4)] }),
    next => assert.deepEqual(next.hand.map(entry => entry.id), [3])],
]) {
  cases.push({ label, action: "draw", state: toPort(state), expected: null, summarize: result => result });
  cases.at(-1).verify = verify;
}

test("Godot battle start, all-enemy attack and next turn match current web rules",{skip:!engine && "Set GODOT_BIN to a Godot 4 executable"},async t=>{
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),"ruinfall-battle-flow-"));
  const input=path.join(temporary,"cases.json");
  try {
    fs.writeFileSync(input,JSON.stringify(cases));
    const result=spawnSync(engine,["--headless","--path",path.join(root,"godot"),"--script","res://tests/battle_flow_probe.gd","--",input],
      {encoding:"utf8",timeout:30000});
    assert.ifError(result.error);
    assert.equal(result.status,0,result.stderr || result.stdout);
    assert.doesNotMatch(result.stderr,/SCRIPT ERROR|Parse Error|Failed to load script/);
    const line=result.stdout.split(/\r?\n/).find(entry=>entry.startsWith("BATTLE_FLOW_RESULT="));
    assert.ok(line,`${result.stdout}\n${result.stderr}`);
    const results=JSON.parse(line.slice("BATTLE_FLOW_RESULT=".length));
    assert.equal(results.length,cases.length);
    for(const [index,entry] of cases.entries()) await t.test(entry.label,()=>{
      assert.ok(results[index].input_unchanged,"Input state changed");
      if (entry.verify) entry.verify(results[index].state);
      else assert.deepEqual(entry.summarize(results[index].state),entry.expected);
      if (entry.verifyResult) entry.verifyResult(results[index]);
    });
  } finally {
    if(fs.existsSync(input)) fs.unlinkSync(input);
    fs.rmdirSync(temporary);
  }
});
