import { useLayoutEffect, useRef } from "react";
import type { Card } from "../game/cards";
import { fittedEffectSentenceStyle, type EffectSentenceFit } from "../cardTextLayout";

type CardEffectLayoutInputs = {
  card: Card;
  starsSpent: number;
  strength: number;
  agility: number;
  defenseMultiplier: number;
  ruleCostReduction: number;
  forgeCount: number;
  radiancePlayedThisTurn: number;
  damageValue: number;
};

// Measurements are shared by duplicate cards and bounded to avoid retaining old runs.
const effectFitCache = new Map<string, EffectSentenceFit>();

export function useCardEffectLayout({ card, starsSpent, strength, agility, defenseMultiplier,
  ruleCostReduction, forgeCount, radiancePlayedThisTurn, damageValue }: CardEffectLayoutInputs) {
  const cardEffectRef = useRef<HTMLSpanElement | null>(null);
  const previousFitRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    const effect = cardEffectRef.current;
    const cardFace = effect?.parentElement;
    const copy = effect?.querySelector<HTMLElement>(".card-effect-copy");
    if (!effect || !cardFace || !copy) return;
    let active = true;
    let pendingFrame: number | null = null;
    const fitEffectText = (force = false) => {
      if (!active) return;
      const availableWidth = copy.clientWidth;
      if (availableWidth <= 0) return;
      const copyStyle = getComputedStyle(copy);
      const minimumScale = Number.parseFloat(copyStyle.getPropertyValue("--card-effect-minimum-scale"));
      const signature = JSON.stringify([effect.textContent, availableWidth, copyStyle.font,
        copyStyle.lineHeight, copyStyle.letterSpacing, minimumScale]);
      if (!force && previousFitRef.current === signature) return;
      previousFitRef.current = signature;
      const sentences = Array.from(copy.querySelectorAll<HTMLElement>(".effect-sentence"));
      const keywordUnits = Array.from(copy.querySelectorAll<HTMLElement>(".effect-keyword-unit"));
      const keywordFitTargets = Array.from(copy.querySelectorAll<HTMLElement>(".effect-keyword-unit, .effect-sentence-body"));
      const allFitTargets = Array.from(copy.querySelectorAll<HTMLElement>(".effect-sentence, .effect-keyword-unit, .effect-sentence-body"));
      copy.classList.remove("is-keyword-separated");
      allFitTargets.forEach((target) => {
        target.style.removeProperty("--effect-sentence-scale");
        target.style.removeProperty("letter-spacing");
        target.classList.remove("is-wrapped");
      });
      // Layout dimensions stay stable while the hand rotates or enlarges cards.
      const segments = Array.from(effect.querySelectorAll<HTMLElement>(".forge-rule"));
      const getLineCount = (element: HTMLElement) => {
        const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
        return Number.isFinite(lineHeight) && lineHeight > 0
          ? Math.max(1, Math.round(element.offsetHeight / lineHeight))
          : 0;
      };
      const hasCopyText = Boolean(copy.textContent?.trim());
      let baseCopyLineCount = 0;
      if (keywordUnits.length > 0) {
        copy.classList.add("is-keyword-separated");
        keywordFitTargets.forEach((target) => target.classList.toggle("is-wrapped", target.offsetWidth > availableWidth));
        baseCopyLineCount = hasCopyText ? getLineCount(copy) : 0;
        copy.classList.remove("is-keyword-separated");
        keywordFitTargets.forEach((target) => target.classList.remove("is-wrapped"));
      } else {
        sentences.forEach((sentence) => {
          sentence.style.setProperty("display", "inline");
          sentence.style.setProperty("white-space", "normal");
        });
        baseCopyLineCount = hasCopyText ? getLineCount(copy) : 0;
        sentences.forEach((sentence) => {
          sentence.style.removeProperty("display");
          sentence.style.removeProperty("white-space");
        });
      }
      const baseLineCount = baseCopyLineCount + segments.reduce((total, segment) => total + getLineCount(segment), 0);
      const separateKeywords = keywordUnits.length > 0 && baseLineCount <= 4;
      copy.classList.toggle("is-keyword-separated", separateKeywords);
      const fitTargets = separateKeywords ? keywordFitTargets : sentences;
      const maxLetterSpacingReduction = baseLineCount >= 4 ? 0.12 : 0;
      const widths = fitTargets.map((target) => target.offsetWidth);
      const fits = fitTargets.map((target, index) => {
        const style = getComputedStyle(target);
        const key = JSON.stringify([target.innerHTML, widths[index], availableWidth, minimumScale,
          style.font, style.letterSpacing, maxLetterSpacingReduction]);
        const cached = !force && effectFitCache.get(key);
        if (cached) return cached;
        const fit = fittedEffectSentenceStyle(widths[index], availableWidth, minimumScale, (scale, letterSpacing) => {
          target.style.setProperty("--effect-sentence-scale", String(scale));
          target.style.letterSpacing = `${letterSpacing}px`;
          return target.offsetWidth;
        }, maxLetterSpacingReduction);
        if (effectFitCache.size >= 512) effectFitCache.delete(effectFitCache.keys().next().value!);
        effectFitCache.set(key, fit);
        return fit;
      });
      const sharedScale = fits.length > 0 ? Math.min(...fits.map((fit) => fit.scale)) : 1;
      fitTargets.forEach((target, index) => {
        const fit = fits[index];
        const letterSpacing = fit.scale === sharedScale ? fit.letterSpacing : 0;
        target.style.setProperty("--effect-sentence-scale", String(sharedScale));
        if (letterSpacing === 0) target.style.removeProperty("letter-spacing");
        else target.style.letterSpacing = `${letterSpacing}px`;
        target.classList.toggle("is-wrapped", target.offsetWidth > availableWidth);
      });
      const copyLineHeight = Number.parseFloat(getComputedStyle(copy).lineHeight);
      if (!Number.isFinite(copyLineHeight) || copyLineHeight <= 0) return;
      const lineCount = (copy.textContent?.trim() ? Math.max(1, Math.round(copy.offsetHeight / copyLineHeight)) : 0)
        + segments.reduce((total, segment) => {
          const lineHeight = Number.parseFloat(getComputedStyle(segment).lineHeight);
          return total + Math.max(1, Math.round(segment.offsetHeight / lineHeight));
        }, 0);
      const shift = Math.min(8, Math.max(0, lineCount - 1) * 1.2);
      effect.style.setProperty("--card-effect-shift", `${shift}px`);
    };
    fitEffectText();
    const observer = new ResizeObserver(() => {
      if (pendingFrame !== null) return;
      pendingFrame = window.requestAnimationFrame(() => {
        pendingFrame = null;
        fitEffectText();
      });
    });
    observer.observe(cardFace);
    if (document.fonts.status === "loading") document.fonts.ready.then(() => fitEffectText(true));
    return () => {
      active = false;
      if (pendingFrame !== null) window.cancelAnimationFrame(pendingFrame);
      observer.disconnect();
    };
  }, [card, starsSpent, strength, agility, defenseMultiplier, ruleCostReduction, forgeCount, radiancePlayedThisTurn, damageValue]);
  return cardEffectRef;
}
