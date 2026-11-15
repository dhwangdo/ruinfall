import { Fragment, cloneElement, createElement, isValidElement, type ReactNode } from "react";

type TextPiece = { node: ReactNode; endsSentence: boolean };

// Split the text leaves, then rebuild their original inline styles around each piece.
function sentencePieces(node: ReactNode): TextPiece[] {
  if (typeof node === "string") {
    const pieces: TextPiece[] = [];
    let start = 0;
    for (const match of node.matchAll(/[.!?][\])}]?(?=\s|$)/g)) {
      let end = (match.index ?? 0) + match[0].length;
      const trailingParenthetical = node.slice(end).match(/^\s*\([^)]*\)/);
      if (trailingParenthetical) end += trailingParenthetical[0].length;
      pieces.push({ node: node.slice(start, end), endsSentence: true });
      start = end;
      while (start < node.length && /\s/.test(node[start])) start += 1;
    }
    if (start < node.length) pieces.push({ node: node.slice(start), endsSentence: false });
    return pieces;
  }
  if (typeof node === "number") return [{ node, endsSentence: false }];
  if (Array.isArray(node)) return node.flatMap(sentencePieces);
  if (isValidElement<{ children?: ReactNode }>(node)) {
    if (node.props.children === undefined) return [{ node, endsSentence: false }];
    return sentencePieces(node.props.children).map((piece) => ({
      node: cloneElement(node, undefined, piece.node),
      endsSentence: piece.endsSentence,
    }));
  }
  return [];
}

function trimLeadingWhitespace(node: ReactNode): ReactNode {
  if (typeof node === "string") return node.trimStart();
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    return cloneElement(node, undefined, trimLeadingWhitespace(node.props.children));
  }
  return node;
}

export function splitEffectSentences(node: ReactNode): ReactNode[][] {
  const sentences: ReactNode[][] = [];
  let current: ReactNode[] = [];
  for (const piece of sentencePieces(node)) {
    const content = current.length === 0 ? trimLeadingWhitespace(piece.node) : piece.node;
    if (content !== "") {
      current.push(createElement(Fragment, { key: current.length }, content));
    }
    if (piece.endsSentence && current.length > 0) {
      sentences.push(current);
      current = [];
    }
  }
  if (current.length > 0) sentences.push(current);
  return sentences;
}

export type EffectSentenceFit = { scale: number; letterSpacing: number };

// Preserve font size first, then use subtle negative tracking, then shrink the
// font. If the sentence still cannot fit at the font floor, leave it unchanged.
export function fittedEffectSentenceStyle(
  width: number,
  availableWidth: number,
  minimumScale: number,
  measureWidth: (scale: number, letterSpacing: number) => number,
  maxLetterSpacingReduction = 0.12,
): EffectSentenceFit {
  const unchanged: EffectSentenceFit = { scale: 1, letterSpacing: 0 };
  if (availableWidth <= 0 || width <= availableWidth) return unchanged;

  const tightLetterSpacing = -Math.max(0, maxLetterSpacingReduction);
  if (measureWidth(minimumScale, tightLetterSpacing) > availableWidth) return unchanged;

  let scale = 1;
  if (measureWidth(scale, tightLetterSpacing) > availableWidth) {
    let fittingScale = minimumScale;
    let overflowingScale = 1;
    for (let step = 0; step < 12; step += 1) {
      const middle = (fittingScale + overflowingScale) / 2;
      if (measureWidth(middle, tightLetterSpacing) <= availableWidth) fittingScale = middle;
      else overflowingScale = middle;
    }
    scale = fittingScale;
  }

  if (measureWidth(scale, 0) <= availableWidth) return { scale, letterSpacing: 0 };
  let fittingLetterSpacing = tightLetterSpacing;
  let overflowingLetterSpacing = 0;
  for (let step = 0; step < 12; step += 1) {
    const middle = (fittingLetterSpacing + overflowingLetterSpacing) / 2;
    if (measureWidth(scale, middle) <= availableWidth) fittingLetterSpacing = middle;
    else overflowingLetterSpacing = middle;
  }
  return { scale, letterSpacing: fittingLetterSpacing };
}
