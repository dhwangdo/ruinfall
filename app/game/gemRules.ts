import type { Card, CardBlueprint, GemColor, GemRequirementSize } from "./cards";

export const GEM_COLORS: readonly GemColor[] = ["white", "blue", "black", "red", "green"];

export const GEM_COLOR_LABELS: Record<GemColor, string> = {
  white: "백",
  blue: "청",
  black: "흑",
  red: "적",
  green: "녹",
};

export const GEM_FORMULAS: Record<GemRequirementSize, readonly (readonly GemColor[])[]> = {
  1: GEM_COLORS.map((color) => [color]),
  2: [
    ["white", "blue"], ["blue", "black"], ["black", "red"], ["red", "green"], ["green", "white"],
    ["blue", "white"], ["black", "blue"], ["red", "black"], ["green", "red"], ["white", "green"],
  ],
  3: [
    ["white", "blue", "black"], ["white", "black", "green"], ["white", "red", "blue"], ["white", "green", "red"],
    ["blue", "white", "green"], ["blue", "black", "red"], ["blue", "red", "white"], ["blue", "green", "black"],
    ["black", "white", "red"], ["black", "blue", "white"], ["black", "red", "green"], ["black", "green", "blue"],
    ["red", "white", "black"], ["red", "blue", "green"], ["red", "black", "blue"], ["red", "green", "white"],
    ["green", "white", "blue"], ["green", "blue", "red"], ["green", "black", "white"], ["green", "red", "black"],
  ],
};

function boundedRandomIndex(length: number, random: () => number) {
  return Math.min(length - 1, Math.floor(Math.max(0, Math.min(0.999999999, random())) * length));
}

export function randomGemFormula(size: GemRequirementSize, random: () => number = Math.random): GemColor[] {
  return [...GEM_FORMULAS[size][boundedRandomIndex(GEM_FORMULAS[size].length, random)]];
}

function deterministicGemFormula(size: GemRequirementSize, seed: number): GemColor[] {
  const formulas = GEM_FORMULAS[size];
  const normalizedSeed = Math.abs(Math.imul(seed || 1, 2654435761));
  return [...formulas[normalizedSeed % formulas.length]];
}

export function cardGemFormula(card: Pick<Card, "id" | "gemRequirementSize" | "gemFormula">): GemColor[] {
  if (card.gemFormula?.length) return [...card.gemFormula];
  return card.gemRequirementSize ? deterministicGemFormula(card.gemRequirementSize, card.id) : [];
}

export function isGemCard(card: Pick<CardBlueprint, "gemRequirementSize" | "gemFormula">) {
  return Boolean(card.gemRequirementSize || card.gemFormula?.length);
}

export function instantiateCardBlueprint(
  blueprint: CardBlueprint,
  id: number,
  revealed = false,
  random: () => number = Math.random,
): Card {
  return {
    ...blueprint,
    id,
    revealed,
    gemFormula: blueprint.gemRequirementSize
      ? randomGemFormula(blueprint.gemRequirementSize, random)
      : blueprint.gemFormula ? [...blueprint.gemFormula] : undefined,
    attachedGem: undefined,
  };
}

export function instantiateCardBlueprintForDeck(
  blueprint: CardBlueprint,
  id: number,
  revealed: boolean,
  cards: readonly Card[],
  ignoreLimit = false,
  random: () => number = Math.random,
): Card | null {
  if (!blueprint.gemRequirementSize || ignoreLimit) {
    return instantiateCardBlueprint(blueprint, id, revealed, random);
  }
  const compatibleFormulas = GEM_FORMULAS[blueprint.gemRequirementSize]
    .filter((formula) => cards.filter(isGemCard)
      .every((other) => !gemFormulasConflict(formula, cardGemFormula(other))));
  if (compatibleFormulas.length === 0) return null;
  return {
    ...blueprint,
    id,
    revealed,
    gemFormula: [...compatibleFormulas[boundedRandomIndex(compatibleFormulas.length, random)]],
    attachedGem: undefined,
  };
}

function isSubset(left: readonly GemColor[], right: readonly GemColor[]) {
  const rightSet = new Set(right);
  return left.every((color) => rightSet.has(color));
}

export function gemFormulasConflict(left: readonly GemColor[], right: readonly GemColor[]) {
  if (left.length === 0 || right.length === 0) return false;
  return isSubset(left, right) || isSubset(right, left);
}

export function deckHasGemFormulaConflict(cards: readonly Card[]) {
  const formulas = cards.filter(isGemCard).map(cardGemFormula);
  return formulas.some((formula, index) => formulas.slice(index + 1).some((other) => gemFormulasConflict(formula, other)));
}

export function canAddGemCardToDeck(card: Card, cards: readonly Card[], ignoreLimit = false) {
  if (ignoreLimit || !isGemCard(card)) return true;
  const formula = cardGemFormula(card);
  return cards.filter(isGemCard).every((other) => !gemFormulasConflict(formula, cardGemFormula(other)));
}

function shuffle<T>(values: readonly T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = boundedRandomIndex(index + 1, random);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function attachBattleGems(deck: readonly Card[], random: () => number = Math.random): Card[] {
  const requiredColors = [...new Set(deck.filter(isGemCard).flatMap(cardGemFormula))];
  const carrierIds = shuffle(deck.filter((card) => !isGemCard(card)).map((card) => card.id), random);
  const colors = shuffle(requiredColors, random).slice(0, carrierIds.length);
  const gemByCardId = new Map(carrierIds.slice(0, colors.length).map((id, index) => [id, colors[index]]));
  return deck.map((card) => ({ ...card, attachedGem: gemByCardId.get(card.id) }));
}

export function availableGemColors(hand: readonly Card[], piles: readonly Card[][]) {
  return new Set([...hand, ...piles.flat()].flatMap((card) => card.attachedGem ? [card.attachedGem] : []));
}

export function canPayGemFormula(formula: readonly GemColor[], hand: readonly Card[], piles: readonly Card[][]) {
  const available = availableGemColors(hand, piles);
  return formula.every((color) => available.has(color));
}

export function removeConsumedGems(cards: readonly Card[], colors: ReadonlySet<GemColor>): Card[] {
  return cards.map((card) => card.attachedGem && colors.has(card.attachedGem)
    ? { ...card, attachedGem: undefined }
    : card);
}

export function removeConsumedGemsFromPiles(piles: readonly Card[][], colors: ReadonlySet<GemColor>): Card[][] {
  return piles.map((pile) => removeConsumedGems(pile, colors));
}

export function pileContainsGemFormula(pile: readonly Card[], formula: readonly GemColor[]) {
  if (formula.length === 0) return false;
  const sequence = pile.flatMap((card) => card.attachedGem ? [card.attachedGem] : []);
  return sequence.some((_, start) => formula.every((color, offset) => sequence[start + offset] === color));
}
