import type { Card } from "../game/cards";
import { cardForgeCount } from "../game/cardEffects.ts";

const FORGE_BURST_DURATION_MS = 700;

/** A cost change (such as Odin's discount) is not itself a forge. */
export function newlyForgedCardIds(previous: readonly Card[], current: readonly Card[]) {
  const before = new Map(previous.map(card => [card.id, cardForgeCount(card)]));
  return [...new Set(current.filter(card => cardForgeCount(card) > (before.get(card.id) ?? 0))
    .map(card => card.id))];
}

/** One short, non-blocking ring; tracked and cancelled like other battle effects. */
export function animateForgeBurst(card: HTMLElement): Animation | null {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  const host = card.closest<HTMLElement>(".battlefield");
  if (!host) return null;
  const bounds = card.getBoundingClientRect(), frame = host.getBoundingClientRect();
  if (!bounds.width || !bounds.height || !frame.width || !frame.height) return null;
  const scaleX = frame.width / host.offsetWidth, scaleY = frame.height / host.offsetHeight;
  const width = bounds.width / scaleX, height = bounds.height / scaleY;
  const diameter = Math.max(width, height) * 1.14;
  const burst = document.createElement("div");
  burst.className = "forge-star-burst";
  burst.style.setProperty("--forge-burst-duration", `${FORGE_BURST_DURATION_MS}ms`);
  burst.setAttribute("aria-hidden", "true");
  const ring = document.createElement("div");
  ring.className = "forge-burst-ring";
  burst.appendChild(ring);
  Object.assign(burst.style, {
    left: `${(bounds.left - frame.left) / scaleX - host.clientLeft + (width - diameter) / 2}px`,
    top: `${(bounds.top - frame.top) / scaleY - host.clientTop + (height - diameter) / 2}px`,
    width: `${diameter}px`, height: `${diameter}px`,
    fontSize: `${Math.min(20, Math.max(13, width * .13))}px`,
  });
  for (let index = 0; index < 16; index += 1) {
    const angle = index * Math.PI / 8;
    const star = document.createElement("span");
    star.className = "forge-burst-star";
    star.textContent = "★";
    star.style.left = `${50 + Math.cos(angle) * 50}%`;
    star.style.top = `${50 + Math.sin(angle) * 50}%`;
    ring.appendChild(star);
  }
  host.appendChild(burst);
  const animation = burst.animate([
    { transform: "scale(.7)" },
    { transform: "scale(1)" },
  ], { duration: FORGE_BURST_DURATION_MS, easing: "cubic-bezier(.22,.55,.45,.9)", fill: "both" });
  const cleanup = () => burst.remove();
  animation.addEventListener("finish", cleanup, { once: true });
  animation.addEventListener("cancel", cleanup, { once: true });
  return animation;
}
