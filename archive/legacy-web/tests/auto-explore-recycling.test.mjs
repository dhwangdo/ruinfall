import assert from "node:assert/strict";
import test from "node:test";
import { createAutoExploreBlockedRooms, createAutoExploreProgress,
  findAutoExploreRoute } from "../app/game/mapAutoExplore.ts";
import { EIGHT_DIRECTIONS } from "../app/game/mapEnemies.ts";
import { DUNGEON_MIN_X, DUNGEON_MAX_X, REGION_HEIGHT, ROCK_BARRIER_HEIGHT,
  getRoomType, MAP_START, mapRoomKey, visibleMapRoomKeys } from "../app/game/mapRules.ts";
import { waitingState } from "../app/game/battleState.ts";
import { createSewerEncounterByIndex } from "../app/game/enemies.ts";
import { ALL_CARD_BLUEPRINTS } from "../app/game/cards.ts";
import { discardHandCard } from "../app/game/discardRules.ts";
import { resolvePendingPileOperation } from "../app/game/pileActions.ts";
import { resolveCardPlay } from "../app/game/cardPlayResolution.ts";

const key = (x, y) => mapRoomKey({ x, y });
const card = (effect, id) => ({ ...ALL_CARD_BLUEPRINTS.find(card => card.effect === effect), id, revealed: true });
const options = { phase: "playing", blessings: [], maxPlayerHp: 50, nextCardId: 100,
  oneUpUsed: false, randomRolls: Array(64).fill(.5) };

test("auto exploration reaches a known viewpoint instead of stepping onto unseen terrain", () => {
  const cells = new Set([key(0,0), key(1,0), key(2,0), key(3,0)]);
  const known = new Set([key(0,0), key(1,0), key(2,0)]);
  const terrain = position => cells.has(mapRoomKey(position)) ? "empty" : "rock";
  const view = { horizontalRadius: 1, verticalRadius: 0, bounds: { minX: 0, maxX: 3, minY: 0, maxY: 0 } };
  assert.deepEqual(findAutoExploreRoute({ x: 0, y: 0 }, known, terrain, view), [0,1,2].map(x => ({ x, y: 0 })));
  assert.equal(findAutoExploreRoute({ x: 0, y: 0 }, new Set([...known, key(3,0)]), terrain, view), null);
});

const rectangle = (minX, maxX, minY, maxY) => new Set(
  Array.from({ length: maxY - minY + 1 }, (_, y) =>
    Array.from({ length: maxX - minX + 1 }, (_, x) => key(minX + x, minY + y))).flat(),
);
const mapEnemy = (overrides = {}) => ({ id: "enemy", encounterIndex: 0,
  position: { x: 0, y: 0 }, awareness: "sleeping", ...overrides });

test("enemy avoidance uses traversable distance, including diagonal detection and darkness", () => {
  const known = rectangle(-6, 6, -6, 6);
  const open = createAutoExploreBlockedRooms([mapEnemy()], known, () => "empty");
  assert.equal(open.has(key(2,2)), true);
  assert.equal(open.has(key(3,0)), false);
  const dark = createAutoExploreBlockedRooms([mapEnemy()], known, () => "empty", 1);
  assert.equal(dark.has(key(1,1)), true);
  assert.equal(dark.has(key(2,0)), false);
  const behindWall = createAutoExploreBlockedRooms([mapEnemy()], known,
    position => position.x === 1 ? "rock" : "empty");
  assert.equal(behindWall.has(key(2,0)), false);
  assert.equal(behindWall.has(key(1,0)), false);
});

test("moving enemies get a one-step margin and alerted enemies keep their pursuit range", () => {
  const known = rectangle(-6, 6, -6, 6);
  const awake = createAutoExploreBlockedRooms([mapEnemy({ awareness: "awake" })], known, () => "empty");
  assert.equal(awake.has(key(3,0)), true);
  assert.equal(awake.has(key(4,0)), false);
  const alerted = createAutoExploreBlockedRooms([mapEnemy({ awareness: "alerted" })], known, () => "empty", 1);
  assert.equal(alerted.has(key(4,0)), true);
  assert.equal(alerted.has(key(5,0)), false);
});

test("permanently sleeping enemies and bosses only block their occupied cell", () => {
  for (const extra of [{ permanentSleep: true }, { isBoss: true }]) {
    const blocked = createAutoExploreBlockedRooms([mapEnemy(extra)], rectangle(-3, 3, -3, 3), () => "empty");
    assert.deepEqual([...blocked], [key(0,0)]);
  }
});

test("enemy detection can reach a safe-area endpoint without crossing its interior", () => {
  const known = rectangle(-2, 4, -2, 2);
  const blocked = createAutoExploreBlockedRooms([mapEnemy()], known,
    position => position.y === 0 && position.x >= 0 && position.x <= 4 ? "empty" : "rock",
    0, position => position.x !== 1);
  assert.equal(blocked.has(key(1,0)), true);
  assert.equal(blocked.has(key(2,0)), false);
});

test("auto exploration detours around a visible enemy and stops if it seals the only passage", () => {
  const bounds = { minX: 0, maxX: 12, minY: 0, maxY: 8 };
  const known = rectangle(0, 11, 0, 8);
  const enemy = mapEnemy({ position: { x: 6, y: 4 } });
  const blockedRooms = createAutoExploreBlockedRooms([enemy], known, () => "empty");
  const route = findAutoExploreRoute({ x: 2, y: 4 }, known, () => "empty",
    { bounds, blockedRooms, horizontalRadius: 1, verticalRadius: 1 });
  assert.ok(route);
  assert.equal(route.at(-1).x, 11);
  assert.ok(route.every(position => known.has(mapRoomKey(position)) && !blockedRooms.has(mapRoomKey(position))));

  const passage = rectangle(0, 11, 4, 4);
  const terrain = position => position.y === 4 ? "empty" : "rock";
  const sealed = createAutoExploreBlockedRooms([enemy], rectangle(0, 12, 0, 8), terrain);
  assert.equal(findAutoExploreRoute({ x: 2, y: 4 }, passage, terrain,
    { bounds: { ...bounds, minY: 4, maxY: 4 }, blockedRooms: sealed, horizontalRadius: 1, verticalRadius: 0 }), null);
  assert.equal(findAutoExploreRoute({ x: 4, y: 4 }, known, () => "empty", { blockedRooms }), null);
});

test("equally close viewpoints favor more discoveries without querying hidden terrain", () => {
  const known = rectangle(0, 4, 0, 4);
  [key(0,1), key(4,1), key(4,2), key(4,3)].forEach(key => known.delete(key));
  const terrain = position => {
    assert.ok(known.has(mapRoomKey(position)), "planner queried hidden terrain");
    return "empty";
  };
  const route = findAutoExploreRoute({ x: 2, y: 2 }, known, terrain,
    { bounds: { minX: 0, maxX: 4, minY: 0, maxY: 4 }, horizontalRadius: 1, verticalRadius: 1 });
  assert.deepEqual(route, [{ x: 2, y: 2 }, { x: 3, y: 2 }]);
});

test("threat estimates do not query hidden terrain or hidden safe-area geometry", () => {
  const known = new Set([key(0,0)]);
  const observedTerrain = position => {
    assert.ok(known.has(mapRoomKey(position)), "threat estimate queried hidden terrain");
    return "empty";
  };
  const blocked = createAutoExploreBlockedRooms([mapEnemy()], known, observedTerrain, 0, position => {
    assert.ok(known.has(mapRoomKey(position)), "threat estimate queried hidden safe-area geometry");
    return true;
  });
  assert.equal(blocked.has(key(2,2)), true);
});

test("the viewpoint gets closer to a frontier when temporary vision expires", () => {
  const known = rectangle(0, 6, 0, 0);
  const view = { bounds: { minX: 0, maxX: 8, minY: 0, maxY: 0 }, verticalRadius: 0 };
  const plan = horizontalRadius => findAutoExploreRoute({ x: 0, y: 0 }, known, () => "empty",
    { ...view, horizontalRadius });
  assert.equal(plan(4).at(-1).x, 3);
  assert.equal(plan(2).at(-1).x, 5);
});

test("replanning responds to moved enemies and an expired darkness ticket", () => {
  const known = rectangle(2, 7, 0, 0);
  const terrain = position => position.y === 0 ? "empty" : "rock";
  const enemy = mapEnemy({ position: { x: 5, y: 0 } });
  const view = { bounds: { minX: 0, maxX: 8, minY: 0, maxY: 0 }, horizontalRadius: 1, verticalRadius: 0 };
  const plan = (enemy, darkness) => findAutoExploreRoute({ x: 3, y: 0 }, known, terrain,
    { ...view, blockedRooms: createAutoExploreBlockedRooms([enemy], known, terrain, darkness) });
  assert.deepEqual(plan(enemy, 1), [{ x: 3, y: 0 }, { x: 2, y: 0 }]);
  assert.equal(plan(enemy, 0), null); // The current tile becomes unsafe when darkness expires.
  assert.equal(plan({ ...enemy, position: { x: 0, y: 0 } }, 0).at(-1).x, 7);
});

test("known viewpoints actually reveal new cells on generated maps", () => {
  const seed = 20261108;
  let position = MAP_START;
  const known = new Set(visibleMapRoomKeys(position, seed));
  for (let turn = 0; turn < 12; turn++) {
    const route = findAutoExploreRoute(position, known, candidate => getRoomType(candidate, seed));
    assert.ok(route);
    assert.ok(route.every(candidate => known.has(mapRoomKey(candidate))));
    const previousSize = known.size;
    for (const step of route.slice(1)) {
      visibleMapRoomKeys(step, seed).forEach(key => known.add(key));
    }
    assert.ok(known.size > previousSize, "a completed route must make exploration progress");
    position = route.at(-1);
  }
});

test("an unproductive frontier is surveyed once, then other reachable branches are finished", () => {
  const known = rectangle(-3, 5, 0, 0);
  const progress = createAutoExploreProgress();
  const bounds = { minX: -4, maxX: 6, minY: 0, maxY: 0 };
  const view = { bounds, horizontalRadius: 1, verticalRadius: 0, progress };
  let position = { x: 0, y: 0 };
  const trace = [position.x];
  // The left boundary cannot actually reveal its predicted cell (for example, it is void).
  // The right boundary does reveal a new floor. Both branches must be handled, not just halted.
  for (let step = 0; step < 40; step++) {
    const route = findAutoExploreRoute(position, known, () => "empty", view);
    if (!route) break;
    position = route[1];
    trace.push(position.x);
    if (position.x === 5) known.add(key(6,0));
  }
  assert.deepEqual(trace, [0,-1,-2,-3,-2,-1,0,1,2,3,4,5]);
  assert.equal(known.has(key(6,0)), true);
  assert.equal(progress.targetKey, null);
  assert.equal(trace.filter(x => x === -3).length, 1);
  assert.equal(trace.filter(x => x === -2).length, 2, "surveyed cells must remain valid transit cells");
});

test("a newly unsafe goal is postponed while another reachable frontier is explored", () => {
  const known = rectangle(-3, 5, 0, 0);
  const progress = createAutoExploreProgress();
  const view = { bounds: { minX: -4, maxX: 6, minY: 0, maxY: 0 },
    horizontalRadius: 1, verticalRadius: 0, progress };
  const start = { x: 0, y: 0 };
  assert.equal(findAutoExploreRoute(start, known, () => "empty", view).at(-1).x, -3);
  const rerouted = findAutoExploreRoute(start, known, () => "empty",
    { ...view, blockedRooms: new Set([key(-2,0)]) });
  assert.equal(rerouted.at(-1).x, 5);
  assert.ok(rerouted.every(position => position.x !== -2));
  assert.equal(progress.surveyedRooms.has(key(-3,0)), false, "an unreachable goal is not a completed survey");
});

test("alternating safe detours cannot keep reversing travel toward the same reachable goal", () => {
  const bounds = { minX: 0, maxX: 7, minY: 0, maxY: 4 };
  const known = rectangle(0, 7, 0, 4);
  known.delete(key(7,2));
  const terrain = position => position.x === 0 || position.x === 6 || position.y === 0 || position.y === 4
    ? "empty" : "rock";
  const progress = createAutoExploreProgress();
  let position = { x: 0, y: 2 };
  const trace = [];
  let finished = false;
  for (let step = 0; step < 40; step++) {
    // Both routes still reach the same goal individually. Changing which one looks safe
    // used to make every-step shortest-path planning walk up and down the left corridor.
    const blockedRooms = new Set(step === 0 ? [] : [key(3, position.y === 1 ? 0 : 4)]);
    const route = findAutoExploreRoute(position, known, terrain,
      { bounds, progress, blockedRooms, horizontalRadius: 1, verticalRadius: 1 });
    if (!route) { finished = true; break; }
    position = route[1];
    trace.push(mapRoomKey(position));
  }
  assert.ok(finished, `never exhausted safe exploration: ${trace.join(" -> ")}`);
});

function exhaustExploration({ start, terrain, visibleAt, bounds, blockedRooms = new Set(),
  blockedAt = () => blockedRooms, horizontalRadius = 4, verticalRadius = 4, expectedStop = "complete" }) {
  const inside = position => position.x >= bounds.minX && position.x <= bounds.maxX
    && position.y >= bounds.minY && position.y <= bounds.maxY;
  const known = new Set([...visibleAt(start)].filter(cell => inside(cell)).map(mapRoomKey));
  const progress = createAutoExploreProgress();
  const seenStates = new Set();
  const area = (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
  let position = start;
  let steps = 0;
  while (true) {
    const route = findAutoExploreRoute(position, known, terrain,
      { bounds, blockedRooms: blockedAt(position, known), horizontalRadius, verticalRadius, progress });
    if (!route) break;
    const state = JSON.stringify([position, known.size, progress.surveyedRooms.size,
      progress.avoidedRooms.size, progress.targetKey, progress.route]);
    assert.equal(seenStates.has(state), false, "single-step replanning repeated the same exploration state");
    seenStates.add(state);
    assert.ok(++steps <= area * area, "exploration did not finish its finite set of viewpoints");
    position = route[1];
    assert.equal(progress.avoidedRooms.has(mapRoomKey(position)), false);
    assert.ok(known.has(mapRoomKey(position)));
    for (const cell of visibleAt(position)) if (inside(cell)) known.add(mapRoomKey(cell));
  }
  assert.equal(progress.stopReason, expectedStop);

  // Verify exhaustion independently: every cell visible from every safely reachable floor is known.
  const reachable = [start];
  const visited = new Set([mapRoomKey(start)]);
  for (let index = 0; index < reachable.length; index++) {
    const current = reachable[index];
    for (const cell of visibleAt(current)) {
      if (inside(cell)) assert.ok(known.has(mapRoomKey(cell)), "stopped before exhausting a safe viewpoint");
    }
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const cellKey = mapRoomKey(next);
      if (!inside(next) || visited.has(cellKey) || progress.avoidedRooms.has(cellKey)
        || ["rock", "void"].includes(terrain(next))) continue;
      visited.add(cellKey);
      reachable.push(next);
    }
  }
  return { known, steps, progress };
}

function boundedVisibleAt(center, terrain, bounds) {
  const visible = new Map([[mapRoomKey(center), center]]);
  const traversed = new Set([mapRoomKey(center)]);
  const queue = [{ position: center, distance: 0 }];
  for (let index = 0; index < queue.length; index++) {
    const { position, distance } = queue[index];
    if (distance === 4) continue;
    for (const direction of EIGHT_DIRECTIONS) {
      const next = { x: position.x + direction.x, y: position.y + direction.y };
      const cellKey = mapRoomKey(next);
      if (next.x < bounds.minX || next.x > bounds.maxX || next.y < bounds.minY || next.y > bounds.maxY
        || Math.abs(next.x - center.x) > 4 || Math.abs(next.y - center.y) > 4) continue;
      const type = terrain(next);
      if (type === "void") continue;
      visible.set(cellKey, next);
      if (type === "rock" || traversed.has(cellKey)) continue;
      traversed.add(cellKey);
      queue.push({ position: next, distance: distance + 1 });
    }
  }
  return [...visible.values()];
}

test("single-step auto exploration exhausts the safe reachable region on multiple generated maps", () => {
  const bounds = { minX: -12, maxX: 12, minY: 0, maxY: 12 };
  for (const seed of [1, 7, 20261108]) {
    const terrain = position => getRoomType(position, seed);
    exhaustExploration({ start: MAP_START, bounds, terrain,
      visibleAt: position => boundedVisibleAt(position, terrain, bounds) });
  }
});

test("exploration finishes every safe branch while leaving an enemy-blocked passage unexplored", () => {
  const bounds = { minX: 0, maxX: 12, minY: 0, maxY: 0 };
  const result = exhaustExploration({ start: { x: 1, y: 0 }, bounds,
    terrain: () => "empty", horizontalRadius: 1, verticalRadius: 0,
    blockedRooms: new Set([key(5,0)]),
    expectedStop: "blocked",
    visibleAt: position => [-1,0,1].map(offset => ({ x: position.x + offset, y: 0 })) });
  assert.ok(result.steps > 0);
  assert.equal(result.known.has(key(5,0)), true);
  assert.equal(result.known.has(key(6,0)), false);
});

test("complete generated regions finish and cover every reachable viewpoint", () => {
  for (const seed of [1, 7, 20261108]) {
    exhaustExploration({ start: MAP_START,
      bounds: { minX: DUNGEON_MIN_X, maxX: DUNGEON_MAX_X, minY: -ROCK_BARRIER_HEIGHT, maxY: REGION_HEIGHT - 1 },
      terrain: position => getRoomType(position, seed),
      visibleAt: position => [...visibleMapRoomKeys(position, seed)].map(cell => {
        const [x, y] = cell.split(":").map(Number);
        return { x, y };
      }) });
  }
});

test("safe viewpoints are exhausted around a stationary sleeping enemy that enters and leaves vision", () => {
  const bounds = { minX: 0, maxX: 16, minY: 0, maxY: 8 };
  const terrain = () => "empty";
  const enemy = mapEnemy({ position: { x: 8, y: 4 } });
  const visibleAt = position => boundedVisibleAt(position, terrain, bounds);
  const result = exhaustExploration({ start: { x: 1, y: 4 }, bounds, terrain, visibleAt,
    blockedAt: (position, known) => {
      const visible = new Set(visibleAt(position).map(mapRoomKey));
      return createAutoExploreBlockedRooms(visible.has(mapRoomKey(enemy.position)) ? [enemy] : [], known, terrain);
    } });
  assert.ok(result.steps > 0);
  assert.equal(result.progress.avoidedRooms.has(mapRoomKey(enemy.position)), true);
});

test("fully explored safe terrain stops immediately with a completed reason", () => {
  const progress = createAutoExploreProgress();
  assert.equal(findAutoExploreRoute({ x: 2, y: 0 }, rectangle(0, 6, 0, 0), () => "empty",
    { progress, bounds: { minX: 0, maxX: 6, minY: 0, maxY: 0 } }), null);
  assert.equal(progress.stopReason, "complete");
  assert.deepEqual(progress.route, []);
});

test("revealing the last frontier en route ends exploration without walking to a stale goal", () => {
  const known = rectangle(0, 5, 0, 0);
  const progress = createAutoExploreProgress();
  const view = { progress, bounds: { minX: 0, maxX: 6, minY: 0, maxY: 0 },
    horizontalRadius: 1, verticalRadius: 0 };
  const route = findAutoExploreRoute({ x: 0, y: 0 }, known, () => "empty", view);
  assert.equal(route.at(-1).x, 5);
  known.add(key(6,0));
  assert.equal(findAutoExploreRoute(route[1], known, () => "empty", view), null);
  assert.equal(progress.stopReason, "complete");
});

test("a sleeping enemy leaving vision does not reopen its observed dangerous corridor", () => {
  const known = rectangle(0, 8, 0, 0);
  known.delete(key(8,0));
  const terrain = position => position.y === 0 ? "empty" : "rock";
  const progress = createAutoExploreProgress();
  const view = { progress, bounds: { minX: 0, maxX: 8, minY: 0, maxY: 0 },
    horizontalRadius: 1, verticalRadius: 0 };
  const route = findAutoExploreRoute({ x: 0, y: 0 }, known, terrain, view);
  const blockedRooms = createAutoExploreBlockedRooms([mapEnemy({ position: { x: 6, y: 0 } })], known, terrain);
  assert.equal(findAutoExploreRoute(route[1], known, terrain, { ...view, blockedRooms }), null);
  assert.equal(findAutoExploreRoute(route[1], known, terrain, view), null);
  assert.equal(progress.avoidedRooms.has(key(4,0)), true);
  assert.equal(progress.stopReason, "blocked");
});

test("a newly unsafe player position reports danger instead of falsely claiming exploration completed", () => {
  const progress = createAutoExploreProgress();
  assert.equal(findAutoExploreRoute({ x: 0, y: 0 }, rectangle(0, 4, 0, 0), () => "empty",
    { progress, blockedRooms: new Set([key(0,0)]) }), null);
  assert.equal(progress.stopReason, "unsafe");
});

test("an existing safe route remains committed when a shorter passage opens", () => {
  const known = rectangle(0, 7, 0, 4);
  known.delete(key(7,2));
  let opened = false;
  const terrain = position => position.x === 0 || position.x === 6 || position.y === 0 || position.y === 4
    || (opened && position.y === 1) ? "empty" : "rock";
  const progress = createAutoExploreProgress();
  const view = { progress, bounds: { minX: 0, maxX: 7, minY: 0, maxY: 4 },
    horizontalRadius: 1, verticalRadius: 1 };
  const original = findAutoExploreRoute({ x: 0, y: 2 }, known, terrain, view);
  opened = true;
  assert.deepEqual(findAutoExploreRoute(original[1], known, terrain, view), original.slice(1));
});

test("recycling activates as a one-cost rule; playing cards does not count as discarding", () => {
  const recycling = card("recycling", 1);
  assert.equal(recycling.rarity, "special");
  assert.equal(recycling.cost, 1);
  assert.equal(recycling.rule, true);
  const before = { ...waitingState(50, createSewerEncounterByIndex(2)), hand: [recycling], energy: 3, stars: 0 };
  const active = resolveCardPlay(before, { card: recycling }, options).state;
  assert.equal(active.energy, 2);
  assert.deepEqual(active.activeRuleCards.map(card => card.effect), ["recycling"]);
  assert.equal(active.stars, 0);
  const defense = card("defend", 3);
  const played = resolveCardPlay({ ...active, hand: [defense] }, { card: defense }, options);
  assert.equal(played.played, true);
  assert.equal(played.state.stars, 0);
});

test("direct hand discards gain one star per rule without repeating invalid selections", () => {
  const target = card("strike", 3);
  const state = { ...waitingState(50, []), hand: [target], pendingDiscards: 1, stars: 0,
    activeRuleCards: [card("recycling", 1), card("recycling", 2)] };
  const result = discardHandCard(state, target.id);
  assert.equal(result.stars, 2);
  assert.equal(result.pendingDiscards, 0);
  assert.equal(result.hand.length, 0);
  assert.equal(result.discard.at(-1).id, target.id);
  assert.equal(discardHandCard(result, target.id), result);
  assert.equal(discardHandCard({ ...state, pendingDiscards: 0 }, target.id).stars, 0);
});

test("discarding a file top triggers recycling, while rotating it does not", () => {
  const top = card("strike", 3), bottom = card("defend", 4);
  const state = { ...waitingState(50, []), piles: [[bottom, top]], pendingSweep: true,
    pendingPileOperation: "discardTop", stars: 0, activeRuleCards: [card("recycling", 1)] };
  const discarded = resolvePendingPileOperation(state, 0);
  assert.equal(discarded.stars, 1);
  assert.equal(discarded.discard.at(-1).id, top.id);
  assert.equal(resolvePendingPileOperation({ ...state, pendingPileOperation: "rotateTop" }, 0).stars, 0);
});
