import { cardBoxPosition } from "./cardFlightGeometry.ts";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function cardPose(card: HTMLElement) {
  const rect = card.getBoundingClientRect();
  const style = window.getComputedStyle(card);
  const width = Number.parseFloat(style.width) || rect.width;
  const height = Number.parseFloat(style.height) || rect.height;
  const [originX, originY] = style.transformOrigin.split(" ").map(Number.parseFloat);
  const origin = { x: originX || 0, y: originY || 0 };
  const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
  return { rect, style, width, height, origin, transform: matrix.toString(),
    ...cardBoxPosition(rect, width, height, origin, matrix) };
}

/** Place a transform's visual centre at a viewport point, retaining its own origin. */
function atCenter(pose: ReturnType<typeof cardPose>, x: number, y: number, transform: string) {
  const matrix = new DOMMatrixReadOnly(transform);
  const cx = pose.width / 2 - pose.origin.x, cy = pose.height / 2 - pose.origin.y;
  const actualX = pose.left + pose.origin.x + matrix.a * cx + matrix.c * cy + matrix.e;
  const actualY = pose.top + pose.origin.y + matrix.b * cx + matrix.d * cy + matrix.f;
  return `translate(${x - actualX}px, ${y - actualY}px) ${transform}`;
}

function flyCard(card: HTMLElement, pose: ReturnType<typeof cardPose>, frames: Keyframe[],
  options: KeyframeAnimationOptions, className: string, hideOriginal = false, outgoing = false) {
  const ghost = card.cloneNode(true) as HTMLElement;
  const visibility = card.style.visibility;
  ghost.classList.add(className);
  ghost.removeAttribute("data-card-id");
  ghost.removeAttribute("data-top-card-id");
  ghost.removeAttribute("id");
  ghost.setAttribute("aria-hidden", "true");
  ghost.inert = true;
  Object.assign(ghost.style, {
    position: "fixed", zIndex: "110", left: `${pose.left}px`, top: `${pose.top}px`,
    width: `${pose.width}px`, height: `${pose.height}px`, margin: "0", pointerEvents: "none",
    visibility: "visible", opacity: "1", transition: "none", animation: "none",
    transform: pose.transform, transformOrigin: `${pose.origin.x}px ${pose.origin.y}px`,
    borderWidth: pose.style.borderWidth, outline: pose.style.outline,
  });
  (card.closest<HTMLElement>(".battlefield") ?? document.body).appendChild(ghost);
  if (hideOriginal) card.style.visibility = "hidden";
  const animation = ghost.animate(frames, { fill: "both", ...options });
  const cleanup = (restore: boolean) => {
    ghost.remove();
    if (hideOriginal && restore) card.style.visibility = visibility;
  };
  // Outgoing originals stay hidden until the whole group has committed its state change.
  animation.addEventListener("finish", () => cleanup(!outgoing), { once: true });
  animation.addEventListener("cancel", () => cleanup(true), { once: true });
  return animation;
}

export function animateDrawnCardToHand(target: HTMLElement, source: DOMRect, delay = 0, enemyToken = false) {
  if (reducedMotion() || getComputedStyle(target).visibility === "hidden") return null;
  const pose = cardPose(target);
  const x = source.left + source.width / 2, y = source.top + source.height / 2;
  const start = atCenter(pose, x, y, "rotate(-3deg) scale(.94)");
  const frames: Keyframe[] = [{ transform: start, opacity: .8 }];
  if (enemyToken) {
    frames.push({ offset: .18, transform: start, opacity: .92 }, {
      offset: .64,
      transform: atCenter(pose, x * .42 + (pose.rect.left + pose.rect.width / 2) * .58,
        y * .42 + (pose.rect.top + pose.rect.height / 2) * .58 - 90, "rotate(7deg)"), opacity: 1,
    });
  }
  frames.push({ transform: pose.transform, opacity: 1 });
  return flyCard(target, pose, frames, {
    duration: enemyToken ? 820 : 300, delay, easing: "cubic-bezier(.2,.72,.25,1)",
  }, "enemy-card-flight", true);
}

export function animateEnemyCardDelivery(target: HTMLElement, source: DOMRect, delay = 0) {
  return animateDrawnCardToHand(target, source, delay, true);
}

export function animateCardToPlayer(sourceCard: HTMLElement, target: HTMLElement, delay = 0, duration = 820) {
  if (reducedMotion()) return null;
  const pose = cardPose(sourceCard), destination = target.getBoundingClientRect();
  return flyCard(sourceCard, pose, [
    { transform: pose.transform, opacity: .92 },
    { transform: atCenter(pose, destination.left + destination.width / 2,
      destination.top + destination.height / 2, "rotate(0deg)"), opacity: 1 },
  ], { duration, delay, easing: "cubic-bezier(.18,.72,.2,1)" }, "enemy-card-flight");
}

export function animatePlayedCardToCenter(sourceCard: HTMLElement) {
  if (reducedMotion()) return null;
  const pose = cardPose(sourceCard);
  const host = (sourceCard.closest<HTMLElement>(".battlefield") ?? document.body).getBoundingClientRect();
  return flyCard(sourceCard, pose, [
    { transform: pose.transform, opacity: 1 },
    { transform: atCenter(pose, host.left + host.width / 2, host.top + host.height / 2,
      "rotate(-4deg) scale(.78)"), opacity: 0 },
  ], { duration: 170, easing: "cubic-bezier(.24,.78,.3,1)" }, "played-card-flight", true, true);
}

export function animateDiscardedCards(cards: HTMLElement[]) {
  if (reducedMotion()) return [];
  // Capture every pose before hiding anything or changing the hand's phase.
  const visible = cards.filter(card => getComputedStyle(card).visibility !== "hidden")
    .map(card => ({ card, pose: cardPose(card) }));
  return visible.map(({ card, pose }, index) => flyCard(card, pose, [
    { transform: pose.transform, opacity: 1 },
    { transform: `translate(${window.innerWidth * .78}px, -24px) ${pose.transform} rotate(14deg)`, opacity: 0 },
  ], { duration: 320, delay: index * 42, easing: "cubic-bezier(.55,.05,.82,.38)" }, "discard-card-flight", true, true));
}
