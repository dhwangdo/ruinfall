import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { ALL_CARD_BLUEPRINTS } from "../app/game/cards.ts";
import { waitingState } from "../app/game/battleState.ts";
import { createMoveCardToPile } from "../app/game/pileActions.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const bundledEngine = path.join(root, "work/godot-tools/4.7.2/Godot_v4.7.2-stable_win64_console.exe");
const engine = process.env.GODOT_BIN || (fs.existsSync(bundledEngine) ? bundledEngine : undefined);
const card = (name, id, extra = {}) => {
  const blueprint = ALL_CARD_BLUEPRINTS.find(entry => entry.name === name);
  assert.ok(blueprint, `Missing web blueprint: ${name}`);
  return { ...blueprint, id, revealed: true, ...extra };
};
const strike = (id, extra) => card("타격", id, extra);
const snake = value => value.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toPort = value => {
  if (Array.isArray(value)) return value.map(toPort);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .map(([key, entry]) => [snake(key), key === "effect" ? snake(entry) : toPort(entry)]));
  return value;
};
const cases = [];
function scenario(label, piles, hand = [], source = { type: "pile", pileIndex: 0, cardIndex: 1 }, extra = {}, target = 1) {
  const initial = { ...waitingState(50, []), status: "playing", stars: 3, hand, piles,
    initialDeck: [...piles.flat(), ...hand], exhausted: [], ...extra };
  const moving = source.type === "hand" ? [hand[0]] : piles[source.pileIndex].slice(source.cardIndex);
  const payload = source.type === "hand" ? { source: "hand", card_id: moving[0].id }
    : { source: "file", source_index: source.pileIndex, card_index: source.cardIndex,
      card_id: moving[0].id, card_ids: moving.map(entry => entry.id) };
  let expected = initial;
  createMoveCardToPile({ setGame: update => { expected = update(expected); }, phase: "playing", blessings: [],
    grantBattleReward() {}, battleRewardRegionRef: { current: 1 }, lowestHealthEnemy: enemies => enemies[0] })(
    { card: moving[0], cards: moving, source }, target);
  const state = toPort(initial);
  // Godot uses an empty string/-1 where the web state uses null.
  state.pending_pile_operation ??= "";
  state.pending_play_card_id ??= -1;
  cases.push({ label, state, payload, target, expected: normalize(toPort(expected)) });
}
function normalize(state) {
  const cards = entries => entries.map(entry => ({ id: entry.id, cost: entry.cost ?? null,
    value: entry.value, forged: Boolean(entry.forged), revealed: Boolean(entry.revealed),
    completed: entry.forge_costs_completed ?? [], clockwork: Boolean(entry.clockwork_triggered),
    baseCost: entry.base_cost ?? null }));
  return { piles: state.piles.map(cards), hand: cards(state.hand), stars: state.stars,
    forgeCount: state.forge_count, energy: state.energy, status: state.status };
}

scenario("hand to empty file", [[], []], [strike(1)], { type: "hand" });
scenario("hand forges onto occupied file", [[], [strike(2)]], [strike(1, { forgeCost: 1 })], { type: "hand" });
scenario("hand move rejects insufficient stars", [[], []], [strike(1)], { type: "hand" }, { stars: 0 });
scenario("hand obeys placement restriction", [[], [strike(2)]], [strike(1, { solitaireRule: "top" })], { type: "hand" });
scenario("two-card suffix to occupied file", [[strike(1), strike(2), strike(3)], [strike(4)]]);
scenario("entire file to empty file", [[strike(1), strike(2)], []], [], { type: "pile", pileIndex: 0, cardIndex: 0 });
scenario("new source top is revealed", [[strike(1, { revealed: false }), strike(2), strike(3)], []]);
scenario("bundle preserves a hidden card above the grabbed face-up card", [[strike(1), strike(2, { revealed: false }), strike(3)], []], [], { type: "pile", pileIndex: 0, cardIndex: 0 });
scenario("insufficient stars", [[strike(1), strike(2), strike(3)], []], [], undefined, { stars: 0 });
scenario("own file rejected", [[strike(1), strike(2), strike(3)], []], [], undefined, {}, 0);
scenario("bluebird on leading card makes bundle free", [[strike(1), strike(2, { sticker: "bluebird" }), strike(3)], []], [], undefined, { stars: 0 });
scenario("bluebird on trailing card does not make bundle free", [[strike(1), strike(2), strike(3, { sticker: "bluebird" })], []], [], undefined, { stars: 0 });
scenario("free hand move", [[], []], [strike(1, { sticker: "bluebird" })], { type: "hand" }, { stars: 0 });
scenario("invalid destination", [[strike(1), strike(2)], []], [], undefined, {}, 9);
scenario("draw selection blocks moves", [[strike(1), strike(2)], []], [], undefined, { pendingDraws: 1 });
scenario("file selection blocks moves", [[strike(1), strike(2)], []], [], undefined, { pendingPileDrawCount: 1 });
scenario("discard selection blocks moves", [[strike(1), strike(2)], []], [], undefined, { pendingDiscards: 1, pendingDiscardCount: 1 });
scenario("won battle blocks moves", [[strike(1), strike(2)], []], [], undefined, { status: "won" });
scenario("lost battle blocks moves", [[strike(1), strike(2)], []], [], undefined, { status: "lost" });
scenario("two cards forge against original destination", [[strike(1), strike(2, { forgeCost: 1 }), strike(3, { forgeCost: 1 })], [strike(4)]], [], undefined, { deckEditions: ["hammering"] });
scenario("mixed forged and ordinary suffix", [[strike(1), strike(2, { forgeCost: 1 }), strike(3, { forgeCost: 2 })], [strike(4)]]);
scenario("exchange cards share original target cost", [[strike(1), card("치환 합금", 2), card("치환 합금", 3, { cost: 4 })], [card("오딘의 창", 4)]], [], undefined, { forgeCount: 2 });
scenario("two daggers consume original target once", [[strike(1), card("흑요석 단검", 2), card("흑요석 단검", 3)], [strike(4)]]);
scenario("dagger and exchange use pre-move target", [[strike(1), card("흑요석 단검", 2), card("치환 합금", 3)], [strike(4)]]);
scenario("metallurgy retrieves only forged cards", [[strike(1), strike(2, { forgeCost: 1 }), strike(3)], [strike(4)]], [], undefined,
  { activeRuleCards: [card("금속학 연구", 5)] });
scenario("sealed file permits move but blocks metallurgy retrieval", [[strike(1), strike(2, { forgeCost: 1 }), strike(3)], [strike(4)]], [], undefined,
  { activeRuleCards: [card("금속학 연구", 5)], enemies: [{ id: "seal", hp: 10, sealsPile: true, sealedPileIndex: 1, sealedTurn: 1 }] });
scenario("clockwork activates on hand move", [[], []], [strike(1, { sticker: "clockwork" })], { type: "hand" });
scenario("clockwork does not activate on file move", [[strike(1), strike(2, { sticker: "clockwork" })], []]);
scenario("missing target cost cannot match zero-cost forge", [[strike(1), strike(2, { forgeCost: 0 })], [{ id: 3, name: "비용 없음", kind: "skill", effect: "soil", value: 0, revealed: true }]]);
scenario("top rule rejects ordinary destination", [[strike(1), strike(2, { solitaireRule: "top" })], [strike(3)]]);
scenario("top rule accepts bottom destination", [[strike(1), strike(2, { solitaireRule: "top" })], [strike(3, { solitaireRule: "bottom" })]]);
scenario("spell rule rejects empty file", [[strike(1), strike(2, { solitaireRule: "spell" })], []]);
scenario("spell uses printed costs rather than sticker discount", [[strike(1), strike(2, { solitaireRule: "spell", sticker: "moonstone" })], [strike(3, { cost: 2, solitaireRule: "spell" })]]);
scenario("ordinary card accepts empty file", [[strike(1), strike(2)], []]);

// Invalid/stale GUI payloads must be rejected before paying or modifying cards.
for (const [label, change] of [
  ["stale leading ID", entry => { entry.payload.card_id = 999; }],
  ["stale suffix ID", entry => { entry.payload.card_ids[1] = 999; }],
  ["stale suffix length", entry => { entry.payload.card_ids.pop(); }],
  ["face-down leading card", entry => { entry.state.piles[0][1].revealed = false; }],
  ["pending card play", entry => { entry.state.pending_play_card_id = 2; }],
  ["pending file operation", entry => { entry.state.pending_pile_operation = "discardTop"; }],
]) {
  const entry = structuredClone(cases.find(entry => entry.label === "two-card suffix to occupied file"));
  entry.label = label;
  change(entry);
  entry.expected = normalize(entry.state);
  entry.mustReject = true;
  cases.push(entry);
}

test("Godot solitaire moves match the current web rules and reject stale input", { skip: !engine && "Set GODOT_BIN to a Godot 4 executable" }, async t => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "ruinfall-solitaire-"));
  try {
    const input = path.join(temporary, "cases.json");
    fs.writeFileSync(input, JSON.stringify(cases));
    const result = spawnSync(engine, ["--headless", "--path", path.join(root, "godot"),
      "--script", "res://tests/solitaire_probe.gd", "--", input], { encoding: "utf8", timeout: 30000 });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.doesNotMatch(result.stderr, /SCRIPT ERROR|Parse Error|Failed to load script/, result.stderr);
    const line = result.stdout.split(/\r?\n/).find(entry => entry.startsWith("SOLITAIRE_RESULT="));
    assert.ok(line, `${result.stdout}\n${result.stderr}`);
    const results = JSON.parse(line.slice("SOLITAIRE_RESULT=".length));
    assert.equal(results.length, cases.length);
    for (const [index, entry] of cases.entries()) await t.test(entry.label, () => {
      assert.ok(results[index].source_unchanged, "Move mutated its input state");
      assert.deepEqual(normalize(results[index].state), entry.expected);
      if (entry.mustReject) assert.equal(results[index].accepted, false);
    });
  } finally {
    const input = path.join(temporary, "cases.json");
    if (fs.existsSync(input)) fs.unlinkSync(input);
    fs.rmdirSync(temporary);
  }
});
