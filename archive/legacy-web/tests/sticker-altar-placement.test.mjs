import assert from "node:assert/strict";
import test from "node:test";
import { STARTER_CARD_POOL, SPECIAL_CARD_POOL, RARE_CARD_POOL } from "../app/game/cards.ts";
import { cardStickerIds, withCardStickers } from "../app/game/stickers.ts";
import { resolveStickerService, stickerAltarPlacementProblem } from "../app/game/stickerServices.ts";

const card = (id, stickers = [], blueprint = STARTER_CARD_POOL[0]) =>
  withCardStickers({ ...blueprint, id }, stickers);

test("altar slots accept either input first and resolve the same transfer", () => {
  const donor = card(1, ["moonstone"]), target = card(2);
  for (const firstRole of ["donor", "target"]) {
    const first = firstRole === "donor" ? donor : target;
    const second = firstRole === "donor" ? target : donor;
    const secondRole = firstRole === "donor" ? "target" : "donor";
    assert.equal(stickerAltarPlacementProblem(first, firstRole), null);
    assert.equal(stickerAltarPlacementProblem(second, secondRole, first), null);
    const result = resolveStickerService({ kind: "stickerAltar", cards: [donor, target],
      primaryCardId: donor.id, secondaryCardId: target.id, gold: 50, uses: 0 });
    assert.equal(result.ok, true);
    assert.equal(result.price, 50);
    assert.equal(result.destroyedCardId, donor.id);
    assert.equal(result.after.id, target.id);
    assert.deepEqual(cardStickerIds(result.after), ["moonstone"]);
  }
  assert.deepEqual(cardStickerIds(target), []);
});

test("altar slots reject invalid donors, full hosts, and incompatible pairs in either order", () => {
  const donor = card(1, ["moonstone"]);
  const unplayable = card(2, [], SPECIAL_CARD_POOL.find(item => item.effect === "saeongjima"));
  assert.notEqual(stickerAltarPlacementProblem(card(3), "donor"), null);
  assert.notEqual(stickerAltarPlacementProblem(card(4, ["anchor"]), "target"), null);
  assert.equal(stickerAltarPlacementProblem(unplayable, "target"), null);
  assert.notEqual(stickerAltarPlacementProblem(donor, "donor", unplayable), null);
  assert.notEqual(stickerAltarPlacementProblem(unplayable, "target", donor), null);
  assert.notEqual(stickerAltarPlacementProblem(donor, "target", donor), null);
});

test("DIY hosts allow a new sticker while preserving capacity and duplicate restrictions", () => {
  const diy = RARE_CARD_POOL.find(item => item.effect === "diy");
  assert.ok(diy);
  const donor = card(1, ["moonstone"]);
  const target = card(2, ["anchor", "bookmark"], diy);
  assert.equal(stickerAltarPlacementProblem(target, "target"), null);
  assert.equal(stickerAltarPlacementProblem(donor, "donor", target), null);
  assert.notEqual(stickerAltarPlacementProblem(target, "donor"), null);
  assert.notEqual(stickerAltarPlacementProblem(card(3, ["moonstone"], diy), "target", donor), null);
  assert.notEqual(stickerAltarPlacementProblem(card(4, ["anchor", "bookmark", "kite"], diy), "target"), null);
});
