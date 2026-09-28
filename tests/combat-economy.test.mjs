import assert from "node:assert/strict";
import test from "node:test";

import {
  canPayEnergyCost,
  calculateCardDamage,
  economicResearchEnergyFloor,
  maximumBattleEnergy,
  radianceDamage,
  recoverBattleEnergy,
} from "../app/game/combatEconomy.ts";

test("economic research enables a non-stacking minus-five energy floor", () => {
  assert.equal(economicResearchEnergyFloor(0), 0);
  assert.equal(economicResearchEnergyFloor(1), -5);
  assert.equal(economicResearchEnergyFloor(2), -5);
  assert.equal(canPayEnergyCost(-4, 1, 1), true);
  assert.equal(canPayEnergyCost(-5, 0, 2), true);
  assert.equal(canPayEnergyCost(-5, 1, 1), false);
});

test("turn energy recovery adds the maximum before clamping", () => {
  assert.equal(maximumBattleEnergy(false), 3);
  assert.equal(maximumBattleEnergy(true), 4);
  assert.equal(recoverBattleEnergy(-2, 3), 1);
  assert.equal(recoverBattleEnergy(2, 3), 3);
});

test("radiance gains four damage per other radiance used this turn", () => {
  assert.deepEqual([0, 1, 2, 3].map(radianceDamage), [4, 8, 12, 16]);
});

test("card damage calculation matches strength and combat manual bonuses", () => {
  assert.equal(calculateCardDamage({ effect: "hydra", value: 9 }, 4, 2), 15);
  assert.equal(calculateCardDamage({ effect: "radiance", value: 4 }, 4, 2, 2), 18);
});
