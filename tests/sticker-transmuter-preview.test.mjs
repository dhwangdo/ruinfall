import assert from "node:assert/strict";
import test from "node:test";
import { STARTER_CARD_POOL } from "../app/game/cards.ts";
import { cardStickerIds, withCardStickers } from "../app/game/stickers.ts";
import { createStickerTransmuterPreview, resolveStickerService, serviceTransformCandidates } from "../app/game/stickerServices.ts";

test("transmuter preview cycles to a different card of the same rarity", () => {
  const source = { ...STARTER_CARD_POOL[0], id: 42, revealed: true };
  const preview = createStickerTransmuterPreview(source, () => 0);
  assert.ok(preview);
  assert.equal(preview.id, source.id);
  assert.equal(preview.revealed, source.revealed);
  assert.equal(preview.rarity, source.rarity);
  assert.notEqual(preview.name, source.name);
  assert.ok(serviceTransformCandidates(source).some(card => card.name === preview.name));
});

test("stickered preview shows one valid replacement sticker without mutating its source", () => {
  const source = withCardStickers({ ...STARTER_CARD_POOL[0], id: 7, revealed: false }, ["moonstone"]);
  for (const value of [0, 0.5, 0.999]) {
    const preview = createStickerTransmuterPreview(source, () => value);
    assert.ok(preview);
    assert.equal(preview.id, source.id);
    assert.equal(preview.revealed, false);
    assert.equal(preview.rarity, source.rarity);
    assert.notEqual(preview.name, source.name);
    assert.equal(cardStickerIds(preview).length, 1);
    assert.notEqual(cardStickerIds(preview)[0], "moonstone");
  }
  const firstPreview = createStickerTransmuterPreview(source, () => 0);
  const nextPreview = createStickerTransmuterPreview(source, () => 0, firstPreview);
  assert.notDeepEqual(cardStickerIds(nextPreview), cardStickerIds(firstPreview));
  assert.deepEqual(cardStickerIds(source), ["moonstone"]);

  const result = resolveStickerService({ kind: "cardTransmuter", cards: [source], primaryCardId: source.id,
    gold: 40, uses: 0, random: () => 0 });
  assert.equal(result.ok, true);
  assert.equal(cardStickerIds(result.after).length, 1);
  assert.notEqual(cardStickerIds(result.after)[0], "moonstone");
});
