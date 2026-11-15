import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fittedEffectSentenceStyle, splitEffectSentences } from "../app/cardTextLayout.ts";

test("effect sentences keep inline emphasis while splitting at sentence boundaries", () => {
  const copy = createElement(Fragment, null,
    createElement("span", null,
      createElement("strong", { className: "magic" }, "마법 방어"), "를 ", 10,
      " 얻습니다. ★을 얻습니다."),
    createElement("span", null, "카드를 1장 뽑습니다."),
  );
  const sentences = splitEffectSentences(copy).map((parts) =>
    renderToStaticMarkup(createElement(Fragment, null, ...parts)));

  assert.deepEqual(sentences.map((sentence) => sentence.replace(/<[^>]*>/g, "")), [
    "마법 방어를 10 얻습니다.",
    "★을 얻습니다.",
    "카드를 1장 뽑습니다.",
  ]);
  assert.match(sentences[0], /<strong class="magic">마법 방어<\/strong>/);
});

test("bracketed instructions remain a complete sentence", () => {
  const sentences = splitEffectSentences(createElement("span", null,
    "피해를 1 줍니다. [밑패를 소멸시키고 피해량을 추가합니다.]"));
  assert.equal(sentences.length, 2);
  assert.match(renderToStaticMarkup(createElement(Fragment, null, ...sentences[1])), /\[밑패를 소멸시키고 피해량을 추가합니다\.\]/);
});

test("a new sentence does not inherit space after a styled sentence", () => {
  const sentences = splitEffectSentences(createElement("span", null,
    createElement("strong", null, "힘을 얻습니다."), " 방어를 얻습니다."));
  assert.equal(sentences.length, 2);
  assert.equal(renderToStaticMarkup(createElement(Fragment, null, ...sentences[1])).replace(/<[^>]*>/g, ""),
    "방어를 얻습니다.");
});

test("fitting uses light tracking before reducing font size", () => {
  const fit = fittedEffectSentenceStyle(102.2, 100, 0.8,
    (scale, tracking) => 102.2 * scale + 20 * tracking);
  assert.equal(fit.scale, 1);
  assert.ok(fit.letterSpacing < 0 && fit.letterSpacing >= -0.12);
  assert.ok(102.2 + 20 * fit.letterSpacing <= 100);
});

test("font size only shrinks when the sentence can fit on one line", () => {
  const fit = fittedEffectSentenceStyle(115, 100, 0.8,
    (scale, tracking) => 115 * scale + 20 * tracking);
  assert.ok(fit.scale >= 0.8 && fit.scale < 1);
  assert.ok(fit.letterSpacing < 0);
  assert.ok(115 * fit.scale + 20 * fit.letterSpacing <= 100);

  const cannotFit = fittedEffectSentenceStyle(125, 100, 0.8,
    (scale, tracking) => 120 * scale + 20 * tracking + 10);
  assert.deepEqual(cannotFit, { scale: 1, letterSpacing: 0 });
  assert.deepEqual(fittedEffectSentenceStyle(80, 100, 0.8, () => 80), { scale: 1, letterSpacing: 0 });
});
