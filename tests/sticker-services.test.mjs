import assert from "node:assert/strict";
import test from "node:test";
import { STARTER_CARD_POOL, SPECIAL_CARD_POOL, LEGENDARY_CARD_POOL } from "../app/game/cards.ts";
import { cardEnergyCost, cardPoolCost } from "../app/game/cardEffects.ts";
import { STICKER_IDS, cardStickerIds, compatibleStickers } from "../app/game/stickers.ts";
import { applyStickerServiceCards, normalizeRoomServiceUses, resolveStickerService, STICKER_PRICES, stickerServicePrice, tinkererStickerAt } from "../app/game/stickerServices.ts";
import { prepareRunRestore } from "../app/game/runSaveState.ts";

const card = (id, sticker, blueprint = STARTER_CARD_POOL[0]) => ({ ...blueprint, id, sticker, revealed: false });
const use = options => resolveStickerService({ kind: "tinkerer", cards: [card(1)], primaryCardId: 1, gold: 1000, uses: 0, random: () => 0, ...options });

test("the ten agreed stickers have prices and moonstone costs display outside battle without mutating base cost", () => {
  assert.deepEqual(Object.keys(STICKER_PRICES).sort(), [...STICKER_IDS].sort());
  assert.equal(STICKER_PRICES.moonstone, 200);
  assert.equal(STICKER_PRICES.comet, 200);
  assert.equal(STICKER_PRICES.glowDinosaur, 50);
  const c = card(1, "moonstone", { ...STARTER_CARD_POOL[0], cost: 0 });
  assert.equal(cardEnergyCost(c), -1);
  assert.equal(cardPoolCost(c), -1);
  assert.equal(cardEnergyCost({ ...c, revealed: true }), -1);
  assert.equal(c.cost, 0);
});

test("prices compound from the base per site and round up after multiplying", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(uses => stickerServicePrice("stickerAltar", uses)), [50, 75, 113, 169, 254, 380]);
  assert.equal(stickerServicePrice("tinkerer", 2, "moonstone"), 450);
  assert.equal(stickerServicePrice("tinkerer", 0, null), 40);
  assert.equal(stickerServicePrice("cardTransmuter", 3), 135);
});

test("tinkerers have stable identities and include all ten specialists", () => {
  const found = new Map();
  for (let x = 0; x < 3000; x++) {
    const result = tinkererStickerAt({ x, y: 12 }, 178);
    assert.equal(tinkererStickerAt({ x, y: 12 }, 178), result);
    found.set(result, (found.get(result) ?? 0) + 1);
  }
  assert.deepEqual([...found.keys()].sort(), [...STICKER_IDS].sort());
});

test("tinkerers reject existing stickers, incompatible cards, and insufficient gold before charging", () => {
  assert.equal(use({ cards: [card(1, "anchor")], fixedSticker: "moonstone" }).ok, false);
  const unplayable = SPECIAL_CARD_POOL.find(c => c.effect === "saeongjima");
  assert.equal(use({ cards: [card(1, undefined, unplayable)], fixedSticker: "moonstone" }).ok, false);
  assert.equal(use({ fixedSticker: "moonstone", gold: 199 }).ok, false);
  const result = use({ fixedSticker: "moonstone" });
  assert.equal(result.ok, true);
  assert.deepEqual(cardStickerIds(result.after), ["moonstone"]);
  assert.equal(result.price, 200);
  assert.equal(cardEnergyCost(result.after), result.after.cost - 1);
  assert.equal(use({ fixedSticker: null }).ok, false);
});

test("the altar consumes only the donor and adds its sticker to the host across card collections", () => {
  const donor = card(1, "moonstone"), target = card(2), other = card(3);
  const result = use({ kind: "stickerAltar", cards: [donor, target, other], primaryCardId: 1, secondaryCardId: 2 });
  assert.equal(result.ok, true);
  assert.equal(result.destroyedCardId, 1);
  assert.deepEqual(cardStickerIds(result.after), ["moonstone"]);
  assert.deepEqual(applyStickerServiceCards([donor, other], result).map(c => c.id), [3]);
  assert.deepEqual(applyStickerServiceCards([target], result).map(c => cardStickerIds(c)), [["moonstone"]]);
  assert.equal(donor.sticker, "moonstone");
  assert.equal(cardStickerIds(target).length, 0);
  assert.equal(use({ kind: "stickerAltar", cards: [donor], secondaryCardId: 1 }).ok, false);
  const invalid = card(2, undefined, SPECIAL_CARD_POOL.find(c => c.effect === "saeongjima"));
  assert.equal(use({ kind: "stickerAltar", cards: [donor, invalid], secondaryCardId: 2 }).ok, false);
});

test("transmuters preserve identity and rarity, reroll only an existing sticker, and support legendary cards", () => {
  for (const blueprint of [STARTER_CARD_POOL[0], SPECIAL_CARD_POOL[0], LEGENDARY_CARD_POOL[0]]) {
    const original = { ...card(9, "moonstone", blueprint), forged: true, clockworkTriggered: true };
    const result = use({ kind: "cardTransmuter", cards: [original], primaryCardId: 9 });
    assert.equal(result.ok, true);
    assert.equal(result.after.id, 9);
    assert.equal(result.after.rarity, original.rarity);
    assert.notEqual(result.after.name, original.name);
    const sticker = cardStickerIds(result.after)[0];
    assert.notEqual(sticker, original.sticker);
    assert.equal(cardStickerIds(result.after).length, 1);
    assert.ok(compatibleStickers({ ...result.after, sticker: undefined, stickers: undefined }).includes(sticker));
    assert.equal(result.after.clockworkTriggered, undefined);
  }
  const plain = use({ kind: "cardTransmuter" });
  assert.equal(plain.ok, true);
  assert.deepEqual(cardStickerIds(plain.after), []);
});

test("per-place usage counters survive JSON save restore and ignore malformed values", () => {
  const uses = { "1:2": 4, "3:4": 1, bad: -1, invalid: "3", infinite: Infinity };
  assert.deepEqual(normalizeRoomServiceUses(uses), { "1:2": 4, "3:4": 1 });
  const restored = prepareRunRestore(JSON.parse(JSON.stringify({ mapSeed: 1, mapPosition: { x: 1, y: 2 }, blessings: [], roomServiceUses: uses })), () => false);
  assert.deepEqual(restored.roomServiceUses, { "1:2": 4, "3:4": 1 });
  assert.equal(stickerServicePrice("tinkerer", restored.roomServiceUses["1:2"], "comet"), 1013);
  assert.deepEqual(prepareRunRestore({ mapSeed: 1, mapPosition: { x: 1, y: 2 }, blessings: [] }, () => false).roomServiceUses, {});
});
