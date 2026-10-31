import assert from "node:assert/strict";
import test from "node:test";

import { addResistance, decayStatus, calculateAttackDamage } from "../app/game/statuses.ts";

test("signed durations cancel and move one step toward zero without crossing it", () => {
  assert.equal(addResistance(3, -5), -2);
  assert.deepEqual([3, 1, 0, -1, -3].map(decayStatus), [2, 0, 0, 0, -2]);
  assert.equal(addResistance(-3, 2, true), -3);
  assert.equal(addResistance(0, -2, true), -2);
  assert.equal(decayStatus(-3), -2);
});

test("attack modifiers use only the duration's sign and round after every multiplier", () => {
  assert.equal(calculateAttackDamage(6, { amplification: 1, resistance: -1 }), 10);
  assert.equal(calculateAttackDamage(6, { amplification: 8, resistance: -8 }), 10);
  assert.equal(calculateAttackDamage(6, { amplification: 1, resistance: -1, multiplier: 2 }), 20);
  assert.equal(calculateAttackDamage(10, { amplification: 1, resistance: 1 }), 9);
  assert.equal(calculateAttackDamage(10, { amplification: -1, resistance: 1 }), 4);
  assert.equal(calculateAttackDamage(10, { resistance: -2, ignoreNegativeResistance: true }), 10);
  assert.equal(calculateAttackDamage(10, { resistance: 2, ignoreNegativeResistance: true }), 7);
  assert.equal(calculateAttackDamage(1, { resistance: 1 }), 0);
});
