import assert from "node:assert/strict";
import test from "node:test";

import { addResistance, addVulnerability, vulnerabilityMultiplier } from "../app/game/statuses.ts";

test("resistance and vulnerability immediately cancel each other", () => {
  assert.deepEqual(addVulnerability({ resistance: 4, vulnerability: 0 }, 3), { resistance: 1, vulnerability: 0 });
  assert.deepEqual(addVulnerability({ resistance: 1, vulnerability: 0 }, 3), { resistance: 0, vulnerability: 2 });
  assert.deepEqual(addVulnerability({ resistance: 2, vulnerability: 0 }, 2), { resistance: 0, vulnerability: 0 });
  assert.deepEqual(addResistance({ resistance: 0, vulnerability: 3 }, 1), { resistance: 0, vulnerability: 2 });
  assert.equal(vulnerabilityMultiplier(0), 1);
  assert.equal(vulnerabilityMultiplier(1), 2);
});
